import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/tauri';
import { listen } from '@tauri-apps/api/event';

// Import game state and services
import { 
  GameState, 
  GameConfig, 
  GameMode, 
  Difficulty, 
  initialState, 
  createMockBoard 
} from '../services/game/GameState';
import { 
  getLegalMoves, 
  isKingInCheck, 
  generateMoveNotation 
} from '../services/game/GameRules';
import { createChessAI, ChessAI } from '../services/ai/ChessAI';
import { 
  createGameSessionManager, 
  GameSessionManager, 
  GameSession 
} from '../services/game/GameSessionManager';
import socketService from '../services/SocketService';

// Import types
import { Color, Square, PieceType, Piece, Position } from '../types';

interface ChessContextType {
  gameState: GameState;
  gameConfig: GameConfig;
  isLoading: boolean;
  isTauriAvailable: boolean;
  networkStatus: 'disconnected' | 'connecting' | 'connected';
  roomInfo: {
    id: string;
    players: number;
    isCreator: boolean;
    allPlayers: string[];
  } | null;
  // Game actions
  selectSquare: (x: number | null, y: number | null) => void;
  movePiece: (fromX: number, fromY: number, toX: number, toY: number) => void;
  resetGame: () => void;
  startNewGame: (config: GameConfig) => void;
  undoMove: () => void;
  // Multiplayer actions
  createMultiplayerGame: (playerColor: Color) => Promise<string>;
  joinMultiplayerGame: (roomId: string, playerColor?: Color) => void;
  leaveMultiplayerGame: () => void;
  copyRoomLink: () => Promise<void>;
  // Session management
  sessions: GameSession[];
  activeSessionId: string | null;
  createSession: (config: GameConfig) => Promise<string>;
  switchSession: (sessionId: string) => void;
  endSession: (sessionId: string) => void;
}

const ChessContext = createContext<ChessContextType | undefined>(undefined);

interface Props {
  children: React.ReactNode;
}

export const ChessProvider: React.FC<Props> = ({ children }) => {
  // State
  const [gameState, setGameState] = useState<GameState>(initialState);
  const [gameConfig, setGameConfig] = useState<GameConfig>({ mode: GameMode.LOCAL });
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isTauriAvailable, setIsTauriAvailable] = useState<boolean>(false);
  const [networkStatus, setNetworkStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');
  const [roomInfo, setRoomInfo] = useState<{
    id: string;
    players: number;
    isCreator: boolean;
    allPlayers: string[];
  } | null>(null);
  
  // Sessions state
  const [sessions, setSessions] = useState<GameSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  
  // Services
  const [ai, setAI] = useState<ChessAI | null>(null);
  const [sessionManager, setSessionManager] = useState<GameSessionManager | null>(null);
  
  // Function to check if Tauri is available
  const checkTauriAvailable = useCallback(() => {
    try {
      return window && typeof window.__TAURI__ !== 'undefined';
    } catch (e) {
      console.error("Error checking Tauri availability:", e);
      return false;
    }
  }, []);
  
  // Initialize services
  useEffect(() => {
    const tauri = checkTauriAvailable();
    console.log("Tauri available:", tauri);
    setIsTauriAvailable(tauri);
    
    // Initialize AI service
    const aiService = createChessAI(tauri);
    setAI(aiService);
    
    // Initialize session manager
    const sessionMgr = createGameSessionManager(tauri);
    setSessionManager(sessionMgr);
    
    // Always initialize with a valid board structure regardless of Tauri availability
    const initialBoard = createMockBoard();
    console.log("Created initial board with size:", initialBoard.length);
    setGameState(prevState => ({
      ...prevState,
      board: initialBoard
    }));
    
    // Listen for AI moves
    if (tauri) {
      aiService.initialize((newGameState) => {
        console.log("AI move received", newGameState);
        // Ensure we have a valid board structure even from Tauri
        if (!newGameState.board || newGameState.board.length === 0) {
          console.warn("Received invalid board from Tauri, using fallback");
          newGameState.board = createMockBoard();
        }
        setGameState(newGameState);
        setIsLoading(false);
      }).catch(err => console.error("Failed to initialize AI service", err));
    }
    
    // Setup socket event listeners for multiplayer
    socketService.on('game-state', handleGameStateUpdate);
    socketService.on('player-joined', handlePlayerJoined);
    socketService.on('opponent-move', handleOpponentMove);
    socketService.on('player-left', handlePlayerLeft);
    socketService.on('connect', handleConnect);
    socketService.on('disconnect', handleDisconnect);
    socketService.on('turn-update', handleTurnUpdate);
    
    // Initialize game immediately to avoid "board not available" error
    clientSideResetGame();
    
    // Mark as loaded to remove loading screen
    setIsLoading(false);
    
    return () => {
      // Clean up listeners
      aiService.cleanup();
      
      // Clean up socket listeners
      socketService.off('game-state', handleGameStateUpdate);
      socketService.off('player-joined', handlePlayerJoined);
      socketService.off('opponent-move', handleOpponentMove);
      socketService.off('player-left', handlePlayerLeft);
      socketService.off('connect', handleConnect);
      socketService.off('disconnect', handleDisconnect);
      socketService.off('turn-update', handleTurnUpdate);
    };
  }, [checkTauriAvailable]);
  
  // Socket event handlers
  const handleConnect = useCallback(() => {
    console.log("Connected to game server");
    setNetworkStatus('connected');
  }, []);
  
  const handleDisconnect = useCallback(() => {
    console.log("Disconnected from game server");
    setNetworkStatus('disconnected');
    
    // Clear room info if we were in a room
    if (roomInfo) {
      setRoomInfo(null);
    }
  }, [roomInfo]);
  
  const handleGameStateUpdate = useCallback((data: any) => {
    console.log("Game state update received", data);
    
    // Update local game state based on server data
    if (data.gameState) {
      setGameState(prevState => {
        // Create a new board state from the server data
        const newBoard = prevState.board.map((row, y) => 
          row.map((square, x) => {
            const serverPiece = data.gameState.board?.[y]?.[x]?.piece;
            
            // If no piece on server, clear the square
            if (!serverPiece) {
              return {
                ...square,
                piece: null,
                isPossibleMove: false
              };
            }
            
            // Ensure piece color is properly converted to Color enum
            let pieceColor;
            if (typeof serverPiece.color === 'string') {
              pieceColor = serverPiece.color === 'WHITE' ? Color.White : Color.Black;
            } else {
              pieceColor = serverPiece.color;
            }
            
            // Return square with properly formatted piece
            return {
              ...square,
              piece: {
                ...serverPiece,
                color: pieceColor
              },
              isPossibleMove: false
            };
          })
        );
        
        return {
          ...prevState,
          board: newBoard,
          current_player: data.gameState.current_player === 'WHITE' ? Color.White : Color.Black,
          selectedSquare: null,
          possibleMoves: [],
          isCheck: data.gameState.isCheck || false,
          game_over: data.gameState.game_over || false
        };
      });
    }
    
    // Update game config with assigned player color from server
    if (data.playerColor) {
      const color = data.playerColor === 'WHITE' ? Color.White : Color.Black;
      console.log(`Server assigned player color: ${color}`)
      setGameConfig(prevConfig => ({
        ...prevConfig,
        playerColor: color
      }));
    }
    
    // Update room info
    if (data.roomId) {
      setRoomInfo(prevInfo => ({
        ...(prevInfo || { isCreator: false }),
        id: data.roomId,
        players: data.players || 0,
        allPlayers: data.allPlayers || []
      }));
    }
  }, []);
  
  const handlePlayerJoined = useCallback((data: any) => {
    console.log("Player joined", data);
    
    // Update room info with new player count
    if (data.players) {
      setRoomInfo(prevInfo => prevInfo ? {
        ...prevInfo,
        players: data.players
      } : null);
    }
  }, []);
  
  const handleOpponentMove = useCallback((data: any) => {
    console.log("Opponent move received", data);
    
    // Update the board with the opponent's move
    if (data.from && data.to) {
      // Apply the move to our local state
      setGameState(prevState => {
        let newState = { ...prevState };
        
        // If we have game state from server, use it to update the board
        if (data.gameState?.board) {
          newState.board = prevState.board.map((row, y) => 
            row.map((square, x) => {
              const serverPiece = data.gameState.board[y][x]?.piece;
              
              // If no piece on server, clear the square
              if (!serverPiece) {
                return {
                  ...square,
                  piece: null,
                  isPossibleMove: false
                };
              }
              
              // Ensure piece color is properly converted to Color enum
              let pieceColor;
              if (typeof serverPiece.color === 'string') {
                pieceColor = serverPiece.color === 'WHITE' ? Color.White : Color.Black;
              } else {
                pieceColor = serverPiece.color;
              }
              
              // Return square with properly formatted piece
              return {
                ...square,
                piece: {
                  ...serverPiece,
                  color: pieceColor
                },
                isPossibleMove: false
              };
            })
          );
        } else {
          // Otherwise just move the piece locally
          const fromX = data.from.x;
          const fromY = data.from.y;
          const toX = data.to.x;
          const toY = data.to.y;
          
          // Make sure the positions are valid
          if (
            fromX >= 0 && fromX < 8 && 
            fromY >= 0 && fromY < 8 && 
            toX >= 0 && toX < 8 && 
            toY >= 0 && toY < 8
          ) {
            // Create a deep copy of the board
            newState.board = newState.board.map(row => [...row]);
            
            // Get the piece to move
            const piece = newState.board[fromY][fromX].piece;
            if (piece) {
              // Move the piece
              newState.board[toY][toX].piece = { ...piece };
              newState.board[fromY][fromX].piece = null;
            }
          }
        }
        
        // Always toggle the current player after an opponent's move
        newState.current_player = prevState.current_player === Color.White ? Color.Black : Color.White;
        
        // Clear any selected square and possible moves
        newState.selectedSquare = null;
        newState.possibleMoves = [];
        
        // Update other game state properties
        newState.isCheck = data.gameState?.isCheck || false;
        newState.game_over = data.gameState?.game_over || false;
        
        // Add move to history if provided
        if (data.notation) {
          newState.moveHistory = [...prevState.moveHistory, data.notation];
        }
        
        // Update the session if necessary
        if (sessionManager && activeSessionId) {
          sessionManager.updateSession(activeSessionId, newState);
          refreshSessions();
        }
        
        return newState;
      });
    }
  }, [sessionManager, activeSessionId]);
  
  const handlePlayerLeft = useCallback((data: any) => {
    console.log("Player left", data);
    
    // Update room info with new player count
    if (data.players) {
      setRoomInfo(prevInfo => prevInfo ? {
        ...prevInfo,
        players: data.players
      } : null);
    }
    
    // If we're in a multiplayer game, handle the opponent leaving
    if (gameConfig.mode === GameMode.MULTIPLAYER) {
      // Show a message to the user
      const message = "Your opponent has left the game.";
      alert(message);
    }
  }, [gameConfig.mode]);
  
  // Handle turn updates from server
  const handleTurnUpdate = useCallback((data: any) => {
    console.log("Turn update received:", data);
    
    if (data.currentPlayer) {
      // Update the current player based on server data
      setGameState(prevState => ({
        ...prevState,
        current_player: data.currentPlayer === 'WHITE' ? Color.White : Color.Black
      }));
    }
  }, []);
  
  // Game actions
  const selectSquare = useCallback((x: number | null, y: number | null) => {
    if (isLoading) return;
    
    // If null coordinates are provided, clear the selection
    if (x === null || y === null) {
      setGameState(prevState => ({
        ...prevState,
        selectedSquare: null,
        possibleMoves: [],
        board: prevState.board.map(row => 
          row.map(square => ({
            ...square,
            isPossibleMove: false
          }))
        )
      }));
      return;
    }
    
    // Use Tauri backend when available
    if (isTauriAvailable) {
      setIsLoading(true);
      invoke<GameState>('select_square', { x, y })
        .then(newGameState => {
          setGameState(newGameState);
          setIsLoading(false);
        })
        .catch(error => {
          console.error('Error selecting square:', error);
          setIsLoading(false);
          // Fall back to client-side implementation
          clientSideSelectSquare(x, y);
        });
    } else {
      // Client-side implementation
      clientSideSelectSquare(x, y);
    }
  }, [isLoading, isTauriAvailable]);
  
  const clientSideSelectSquare = (x: number, y: number) => {
    setGameState(prevState => {
      const piece = prevState.board[y][x].piece;
      
      // If clicking on an empty square with no selection, do nothing
      if (!piece && !prevState.selectedSquare) {
        return prevState;
      }
      
      // If clicking on own piece, select it and show moves
      if (piece && piece.color === prevState.current_player) {
        // Calculate legal moves for this piece
        const possibleMoves = getLegalMoves(prevState, x, y);
        
        // Return new state with this square selected and possible moves highlighted
        return {
          ...prevState,
          selectedSquare: { x, y },
          possibleMoves,
          board: prevState.board.map((row, ry) => 
            row.map((square, rx) => ({
              ...square,
              isPossibleMove: possibleMoves.some(move => move.x === rx && move.y === ry)
            }))
          )
        };
      }
      
      // If clicking on a possible move destination with a piece selected, move the piece
      if (prevState.selectedSquare && prevState.possibleMoves.some(move => move.x === x && move.y === y)) {
        // This case is now handled in handleSquareClick in ChessBoard.tsx
        // which will call movePiece directly
        return prevState;
      }
      
      // If clicking on a non-possible move, clear selection
      return {
        ...prevState,
        selectedSquare: null,
        possibleMoves: [],
        board: prevState.board.map(row => 
          row.map(square => ({
            ...square,
            isPossibleMove: false
          }))
        )
      };
    });
  };
  
  const movePiece = useCallback((fromX: number, fromY: number, toX: number, toY: number) => {
    if (isLoading) return;
    
    // Handle multiplayer moves
    if (gameConfig.mode === GameMode.MULTIPLAYER) {
      // Make sure it's our turn
      if (gameState.current_player !== gameConfig.playerColor) {
        console.log("Not your turn");
        return;
      }
      
      // Generate simplified notation for the move
      const from = { x: fromX, y: fromY };
      const to = { x: toX, y: toY };
      const piece = gameState.board[fromY][fromX].piece;
      const isCapture = gameState.board[toY][toX].piece !== null;
      let notation = "";
      
      if (piece) {
        // Generate pieceSymbol with a safer approach
        let pieceSymbol = "";
        try {
          const pieceType = piece.piece_type;
          if (typeof pieceType === 'string') {
            pieceSymbol = pieceType === "Pawn" ? "" : pieceType.charAt(0);
          } else if (pieceType !== undefined) {
            // Handle numeric enum
            const typeNames = ["P", "R", "N", "B", "Q", "K"];
            pieceSymbol = typeNames[pieceType] || "";
          }
        } catch (e) {
          console.error("Error generating piece symbol:", e);
        }
        
        const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
        const ranks = ['8', '7', '6', '5', '4', '3', '2', '1'];
        notation = `${pieceSymbol}${files[fromX]}${ranks[fromY]}${isCapture ? 'x' : '-'}${files[toX]}${ranks[toY]}`;
      }
      
      // Make the move locally
      const newGameState = { ...gameState };
      
      // Move the piece
      newGameState.board = newGameState.board.map(row => [...row]);
      newGameState.board[toY][toX].piece = newGameState.board[fromY][fromX].piece;
      newGameState.board[fromY][fromX].piece = null;
      
      // Toggle current player
      newGameState.current_player = gameState.current_player === Color.White ? Color.Black : Color.White;
      
      // Clear selection
      newGameState.selectedSquare = null;
      newGameState.possibleMoves = [];
      
      // Update move history
      if (notation) {
        newGameState.moveHistory = [...gameState.moveHistory, notation];
      }
      
      // Update local state first for immediate feedback
      setGameState(newGameState);
      
      // Send move to the server
      socketService.emit('move', {
        from,
        to,
        notation,
        gameState: newGameState,
        playerColor: gameState.current_player
      });
      
      return;
    }
    
    // Use Tauri backend when available
    if (isTauriAvailable) {
      setIsLoading(true);
      invoke<GameState>('move_piece', { fromX, fromY, toX, toY })
        .then(newGameState => {
          setGameState(newGameState);
          setIsLoading(false);
          
          // If the session manager is available and we have an active session, update it
          if (sessionManager && activeSessionId) {
            sessionManager.updateSession(activeSessionId, newGameState);
            refreshSessions();
          }
        })
        .catch(error => {
          console.error('Error moving piece:', error);
          setIsLoading(false);
          // Fall back to client-side implementation
          clientSideMovePiece(fromX, fromY, toX, toY);
        });
    } else {
      // Client-side implementation
      clientSideMovePiece(fromX, fromY, toX, toY);
    }
  }, [isLoading, isTauriAvailable, gameConfig, gameState, sessionManager, activeSessionId]);
  
  const clientSideMovePiece = (fromX: number, fromY: number, toX: number, toY: number) => {
    const fromPiece = gameState.board[fromY][fromX].piece;
    
    // Don't allow moving if no piece at from location
    if (!fromPiece) {
      console.log('No piece at from location');
      return;
    }
    
    // Don't allow moving opponent's pieces
    if (fromPiece.color !== gameState.current_player) {
      console.log('Cannot move opponent pieces');
      return;
    }
    
    // Don't allow moves outside possible moves
    const isValidMove = gameState.possibleMoves.some(move => move.x === toX && move.y === toY);
    if (!isValidMove && gameState.selectedSquare) {
      console.log('Move is not in the list of valid moves');
      return;
    }
    
    setGameState(prevState => {
      // Create a copy of the board
      const newBoard = prevState.board.map(row => [...row]);
      
      // Move the piece
      newBoard[toY][toX].piece = { ...fromPiece };
      newBoard[fromY][fromX].piece = null;
      
      // Toggle current player
      const newCurrentPlayer = prevState.current_player === Color.White ? Color.Black : Color.White;
      
      // Clear selected square and possible moves
      newBoard.forEach(row => row.forEach(square => {
        square.isPossibleMove = false;
      }));
      
      // Generate move notation (simple format)
      const piece = fromPiece;
      const isCapture = prevState.board[toY][toX].piece !== null;
      const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
      const ranks = ['8', '7', '6', '5', '4', '3', '2', '1'];
      
      // Generate pieceSymbol with a safer approach
      let pieceSymbol = "";
      try {
        const pieceType = piece.piece_type;
        if (typeof pieceType === 'string') {
          pieceSymbol = pieceType === "Pawn" ? "" : pieceType.charAt(0);
        } else if (pieceType !== undefined) {
          // Handle numeric enum
          const typeNames = ["P", "R", "N", "B", "Q", "K"];
          pieceSymbol = typeNames[pieceType] || "";
        }
      } catch (e) {
        console.error("Error generating piece symbol:", e);
      }
      
      const notation = `${pieceSymbol}${files[fromX]}${ranks[fromY]}${isCapture ? 'x' : '-'}${files[toX]}${ranks[toY]}`;
      
      // Add the move to history
      const newMoveHistory = [...prevState.moveHistory, notation];
      
      // Check for check or checkmate (simplified)
      const newIsCheck = false; // Real implementation would check for this
      const newIsGameOver = false; // Real implementation would check for this
      
      // Update the session if necessary
      if (sessionManager && activeSessionId) {
        const newState = {
          ...prevState,
          board: newBoard,
          current_player: newCurrentPlayer,
          selectedSquare: null,
          possibleMoves: [],
          isCheck: newIsCheck,
          game_over: newIsGameOver,
          moveHistory: newMoveHistory
        };
        
        sessionManager.updateSession(activeSessionId, newState);
        refreshSessions();
      }
      
      // Return the new state
      return {
        ...prevState,
        board: newBoard,
        current_player: newCurrentPlayer,
        selectedSquare: null,
        possibleMoves: [],
        isCheck: newIsCheck,
        game_over: newIsGameOver,
        moveHistory: newMoveHistory
      };
    });
  };
  
  const makeAIMove = async (currentState: GameState) => {
    if (!ai || currentState.game_over) return;
    
    // Get the difficulty level
    const difficulty = currentState.config.difficulty || Difficulty.MEDIUM;
    
    try {
      // For Tauri, the AI move is handled by the backend and communicated through events
      if (!isTauriAvailable) {
        // Make the AI move in the client
        const move = await ai.makeMove(currentState, difficulty);
        
        if (move) {
          // Execute the move
          clientSideMovePiece(move.from.x, move.from.y, move.to.x, move.to.y);
        }
      }
    } catch (error) {
      console.error('Error making AI move:', error);
    }
  };
  
  const resetGame = useCallback(async () => {
    if (isLoading) return;
    
    // Process through Rust backend when available
    if (isTauriAvailable) {
      console.log("Resetting game via Tauri backend");
      try {
        const state = await invoke<GameState>('reset_game');
        
        // Validate board from Tauri backend
        if (!state || !state.board || state.board.length === 0) {
          console.warn("Received invalid board from Tauri reset_game, using client-side implementation");
          clientSideResetGame();
          return;
        }
        
        console.log("Game reset with Tauri, board size:", state.board.length);
        setGameState(state);
        
        // Update the session if necessary
        if (sessionManager && activeSessionId) {
          await sessionManager.updateSession(activeSessionId, state);
          refreshSessions();
        }
      } catch (error) {
        console.error("Error resetting game via Tauri:", error);
        // Fall back to client-side implementation
        console.log("Falling back to client-side reset");
        clientSideResetGame();
      }
    } else {
      // Client-side implementation
      console.log("Resetting game via client-side implementation");
      clientSideResetGame();
    }
  }, [isLoading, isTauriAvailable, sessionManager, activeSessionId]);
  
  const clientSideResetGame = () => {
    console.log("Executing client-side game reset");
    
    // Always create a fresh board with pieces in starting positions
    const board = createMockBoard();
    
    if (!board || board.length === 0) {
      console.error("Failed to create a valid board in clientSideResetGame");
      return;
    }
    
    console.log("Created new board with size:", board.length);
    
    const newGameState = {
      ...initialState,
      board: board,
      config: gameConfig,
      current_player: Color.White, // Reset to white's turn
      moveHistory: [], // Clear move history
      selectedSquare: null, // Clear selection
      possibleMoves: [], // Clear possible moves
      game_over: false, // Reset game over state
      isCheck: false // Reset check state
    };
    
    setGameState(newGameState);
    
    // Update the session if necessary
    if (sessionManager && activeSessionId) {
      sessionManager.updateSession(activeSessionId, newGameState);
      refreshSessions();
    }
  };
  
  const startNewGame = useCallback(async (config: GameConfig): Promise<void> => {
    // Validate configuration
    if (config.mode === GameMode.AI && !isTauriAvailable) {
        console.warn("AI mode requires Tauri, which is not available. Switching to LOCAL mode.");
        config.mode = GameMode.LOCAL;
    }
    
    setGameConfig(config);
    setIsLoading(true);
    
    // For multiplayer games, connect to the socket server
    if (config.mode === GameMode.MULTIPLAYER && config.gameId) {
        setNetworkStatus('connecting');
        socketService.connect(config.gameId);
    }
    
    // Process in Rust backend when available
    if (isTauriAvailable) {
        console.log("Starting new game with config:", config);
        
        try {
            const newGameState = await invoke<GameState>('start_new_game', { config });
            console.log("Received new game state:", newGameState);
            
            // Validate board from Tauri backend
            if (!newGameState || !newGameState.board || newGameState.board.length === 0) {
                console.error("Received invalid game state from backend, using client-side implementation");
                clientSideStartNewGame(config);
                return;
            }
            
            setGameState(newGameState);
            
            // Create a new session if session manager is available
            if (sessionManager) {
                const sessionId = await sessionManager.createSession(config);
                setActiveSessionId(sessionId);
                refreshSessions();
            }
        } catch (error) {
            console.error('Error starting new game:', error);
            clientSideStartNewGame(config);
        } finally {
            setIsLoading(false);
        }
    } else {
        // Client-side implementation
        clientSideStartNewGame(config);
        setIsLoading(false);
    }
}, [isTauriAvailable, sessionManager]);
  
  const clientSideStartNewGame = (config: GameConfig) => {
    console.log('Starting new game with client-side implementation', config);
    
    // Always create a new board with all pieces in the correct positions
    const board = createMockBoard();
    
    const newGameState = {
      ...initialState,
      board: board,
      config: config,
      current_player: Color.White, // Reset to white's turn
      moveHistory: [], // Clear move history
      selectedSquare: null, // Clear selection
      possibleMoves: [], // Clear possible moves
      game_over: false, // Reset game over state
      isCheck: false // Reset check state
    };
    
    console.log("Created new client-side game state with board:", newGameState.board.length);
    setGameState(newGameState);
    
    // Create a new session if session manager is available
    if (sessionManager) {
      sessionManager.createSession(config).then(sessionId => {
        setActiveSessionId(sessionId);
        refreshSessions();
      });
    }
  };
  
  const undoMove = useCallback(async () => {
    // Not allowed in multiplayer
    if (gameConfig.mode === GameMode.MULTIPLAYER) {
      console.log('Undo not available in multiplayer mode');
      return;
    }
    
    // Process in Rust backend when available
    if (isTauriAvailable) {
      try {
        const previousState = await invoke<GameState>('undo_move');
        setGameState(previousState);
        
        // Update the session if necessary
        if (sessionManager && activeSessionId) {
          sessionManager.updateSession(activeSessionId, previousState);
          refreshSessions();
        }
      } catch (error) {
        console.error('Error undoing move:', error);
        // No fallback for undo in client-side implementation
      }
    } else {
      // Client-side implementation would need a move history
      console.log('Undo not implemented in client-side mode');
    }
  }, [gameConfig.mode, isTauriAvailable, sessionManager, activeSessionId]);
  
  // Multiplayer actions
  const createMultiplayerGame = useCallback(async (playerColor: Color): Promise<string> => {
    try {
      setNetworkStatus('connecting');
      
      // Create a new room on the server with color preference
      const roomId = await socketService.createRoom(playerColor);
      
      // Set room info
      setRoomInfo({
        id: roomId,
        players: 1,
        isCreator: true,
        allPlayers: []
      });
      
      // Connect to the socket server with color preference
      socketService.connect(roomId, playerColor);
      
      // Update game config
      const config = {
        mode: GameMode.MULTIPLAYER,
        playerColor: playerColor,
        gameId: roomId
      };
      
      setGameConfig(config);
      
      // Start a new game with this configuration
      if (isTauriAvailable) {
        try {
          const newGameState = await invoke<GameState>('start_new_game', { config });
          setGameState(newGameState);
          
          // Create a new session for this multiplayer game
          if (sessionManager) {
            const sessionId = await sessionManager.createSession(config);
            setActiveSessionId(sessionId);
            refreshSessions();
          }
        } catch (error) {
          console.error('Error starting multiplayer game:', error);
          clientSideStartNewGame(config);
        }
      } else {
        // In development mode without Tauri, just create a new game
        clientSideStartNewGame(config);
      }
      
      return roomId;
    } catch (error) {
      console.error('Error creating multiplayer game:', error);
      setNetworkStatus('disconnected');
      throw error;
    }
  }, [isTauriAvailable, sessionManager]);
  
  const joinMultiplayerGame = useCallback((roomId: string, playerColor?: Color) => {
    try {
      setNetworkStatus('connecting');
      
      // Connect to the socket server with optional color preference
      // (server will assign the appropriate color, usually opposite of creator)
      socketService.connect(roomId, playerColor);
      
      // Set room info
      setRoomInfo({
        id: roomId,
        players: 0, // Will be updated when connected
        isCreator: false,
        allPlayers: []
      });
      
      // Update game config with temporary color
      // This will be updated with the correct color assigned by the server
      const config = {
        mode: GameMode.MULTIPLAYER,
        playerColor: playerColor, // This will be updated by server assignment
        gameId: roomId
      };
      
      setGameConfig(config);
      
      // Create a new session for this multiplayer game
      if (sessionManager) {
        sessionManager.createSession(config).then(sessionId => {
          setActiveSessionId(sessionId);
          refreshSessions();
        });
      }
      
      // The socket connection will handle receiving the game state
    } catch (error) {
      console.error('Error joining multiplayer game:', error);
      setNetworkStatus('disconnected');
    }
  }, [sessionManager]);
  
  const leaveMultiplayerGame = useCallback(() => {
    // Disconnect from the socket server
    socketService.disconnect();
    
    // Reset network status
    setNetworkStatus('disconnected');
    
    // Clear room info
    setRoomInfo(null);
    
    // Reset to local game mode
    const config = {
      mode: GameMode.LOCAL
    };
    
    setGameConfig(config);
    
    // Reset the game
    resetGame();
  }, [resetGame]);
  
  const copyRoomLink = useCallback(async (): Promise<void> => {
    if (!roomInfo) {
      throw new Error('No active room');
    }
    
    const roomLink = `${window.location.origin}/join/${roomInfo.id}`;
    
    try {
      await navigator.clipboard.writeText(roomLink);
      console.log('Room link copied to clipboard');
    } catch (error) {
      console.error('Error copying room link:', error);
      throw error;
    }
  }, [roomInfo]);
  
  // Session management
  const createSession = useCallback(async (config: GameConfig): Promise<string> => {
    if (!sessionManager) {
        throw new Error('Session manager not initialized');
    }
    
    // Validate configuration for non-Tauri environment
    if (config.mode === GameMode.AI && !isTauriAvailable) {
        console.warn("AI mode requires Tauri, which is not available. Switching to LOCAL mode.");
        config.mode = GameMode.LOCAL;
    }
    
    const sessionId = await sessionManager.createSession(config);
    setActiveSessionId(sessionId);
    refreshSessions();
    
    return sessionId;
}, [sessionManager, isTauriAvailable]);
  
  const switchSession = useCallback((sessionId: string) => {
    if (!sessionManager) {
      throw new Error('Session manager not initialized');
    }
    
    const success = sessionManager.switchSession(sessionId);
    if (success) {
      setActiveSessionId(sessionId);
      
      // Get the session and update our state
      const session = sessionManager.getActiveSession();
      if (session) {
        setGameState(session.gameState);
        setGameConfig(session.config);
      }
    }
  }, [sessionManager]);
  
  const endSession = useCallback((sessionId: string) => {
    if (!sessionManager) {
      throw new Error('Session manager not initialized');
    }
    
    const success = sessionManager.endSession(sessionId);
    if (success) {
      refreshSessions();
      
      // If this was the active session, get the new active session
      if (sessionId === activeSessionId) {
        const newActiveSession = sessionManager.getActiveSession();
        if (newActiveSession) {
          setActiveSessionId(newActiveSession.id);
          setGameState(newActiveSession.gameState);
          setGameConfig(newActiveSession.config);
        } else {
          setActiveSessionId(null);
          setGameState({
            ...initialState,
            board: createMockBoard()
          });
          setGameConfig({ mode: GameMode.LOCAL });
        }
      }
    }
  }, [sessionManager, activeSessionId]);
  
  // Helper function to refresh the sessions list
  const refreshSessions = useCallback(() => {
    if (!sessionManager) return;
    
    const allSessions = sessionManager.getAllSessions();
    setSessions(allSessions);
  }, [sessionManager]);
  
  // Initial setup
  useEffect(() => {
    // If sessionManager is available, refresh sessions
    if (sessionManager) {
      refreshSessions();
      
      // If there are no sessions, create a default local game session
      if (sessions.length === 0) {
        sessionManager.createSession({ mode: GameMode.LOCAL }).then(sessionId => {
          setActiveSessionId(sessionId);
          refreshSessions();
        });
      }
    }
  }, [sessionManager, sessions.length, refreshSessions]);
  
  // Update active session when it changes
  useEffect(() => {
    if (sessionManager && activeSessionId) {
      const session = sessionManager.getActiveSession();
      if (session) {
        setGameState(session.gameState);
        setGameConfig(session.config);
      }
    }
  }, [sessionManager, activeSessionId]);
  
  // Context value
  const value: ChessContextType = {
    gameState,
    gameConfig,
    isLoading,
    isTauriAvailable,
    networkStatus,
    roomInfo,
    // Game actions
    selectSquare,
    movePiece,
    resetGame,
    startNewGame,
    undoMove,
    // Multiplayer actions
    createMultiplayerGame,
    joinMultiplayerGame,
    leaveMultiplayerGame,
    copyRoomLink,
    // Session management
    sessions,
    activeSessionId,
    createSession,
    switchSession,
    endSession
  };
  
  return (
    <ChessContext.Provider value={value}>
      {children}
    </ChessContext.Provider>
  );
};

// Hook for using the chess context
export const useChess = () => {
  const context = useContext(ChessContext);
  if (context === undefined) {
    throw new Error('useChess must be used within a ChessProvider');
  }
  return context;
};

// Re-export types and enums
export { GameMode, Difficulty };