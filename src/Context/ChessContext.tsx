import React, { createContext, useContext, useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/tauri';
import { listen } from '@tauri-apps/api/event';
import { Color, Square, PieceType, Piece, Position } from '../types';

// Game modes for future expansion
export enum GameMode {
  LOCAL = 'local',
  AI = 'ai',
  MULTIPLAYER = 'multiplayer'
}

// Game difficulty levels for AI mode
export enum Difficulty {
  EASY = 'easy',
  MEDIUM = 'medium',
  HARD = 'hard'
}

interface GameState {
    board: Square[][];
    current_player: Color;
    game_over: boolean;
    isCheck: boolean;
    gameOverMessage: string;
    moveHistory: string[]; // Store moves in algebraic notation for replay
    selectedSquare: Position | null;
    possibleMoves: Position[];
}

interface GameConfig {
    mode: GameMode;
    difficulty?: Difficulty;
    playerColor?: Color; // For AI games, which color the player controls
    gameId?: string; // For multiplayer games
}

// Default initial state with an 8x8 empty board
const initialState: GameState = {
    board: Array(8).fill(null).map((_, row) => 
        Array(8).fill(null).map((_, col) => ({
            x: col,
            y: row,
            piece: null,
            isPossibleMove: false
        }))
    ),
    current_player: Color.White,
    game_over: false,
    isCheck: false,
    gameOverMessage: '',
    moveHistory: [],
    selectedSquare: null,
    possibleMoves: []
};

// Default game configuration
const defaultConfig: GameConfig = {
    mode: GameMode.LOCAL
};

// Create a mock board with all pieces in starting positions for development mode
const createMockBoard = (): Square[][] => {
    // Start with empty board
    const board = Array(8).fill(null).map((_, row) => 
        Array(8).fill(null).map((_, col) => ({
            x: col,
            y: row,
            piece: null,
            isPossibleMove: false
        }))
    );
    
    // Set up pawns
    for (let col = 0; col < 8; col++) {
        // Black pawns on row 1
        board[1][col].piece = {
            piece_type: PieceType.Pawn,
            color: Color.Black
        };
        
        // White pawns on row 6
        board[6][col].piece = {
            piece_type: PieceType.Pawn,
            color: Color.White
        };
    }
    
    // Set up other pieces
    // Black pieces on row 0
    board[0][0].piece = { piece_type: PieceType.Rook, color: Color.Black };
    board[0][1].piece = { piece_type: PieceType.Knight, color: Color.Black };
    board[0][2].piece = { piece_type: PieceType.Bishop, color: Color.Black };
    board[0][3].piece = { piece_type: PieceType.Queen, color: Color.Black };
    board[0][4].piece = { piece_type: PieceType.King, color: Color.Black };
    board[0][5].piece = { piece_type: PieceType.Bishop, color: Color.Black };
    board[0][6].piece = { piece_type: PieceType.Knight, color: Color.Black };
    board[0][7].piece = { piece_type: PieceType.Rook, color: Color.Black };
    
    // White pieces on row 7
    board[7][0].piece = { piece_type: PieceType.Rook, color: Color.White };
    board[7][1].piece = { piece_type: PieceType.Knight, color: Color.White };
    board[7][2].piece = { piece_type: PieceType.Bishop, color: Color.White };
    board[7][3].piece = { piece_type: PieceType.Queen, color: Color.White };
    board[7][4].piece = { piece_type: PieceType.King, color: Color.White };
    board[7][5].piece = { piece_type: PieceType.Bishop, color: Color.White };
    board[7][6].piece = { piece_type: PieceType.Knight, color: Color.White };
    board[7][7].piece = { piece_type: PieceType.Rook, color: Color.White };
    
    return board;
};

interface ChessContextType {
    gameState: GameState;
    gameConfig: GameConfig;
    isLoading: boolean;
    isTauriAvailable: boolean;
    // Game actions
    selectSquare: (x: number, y: number) => void;
    movePiece: (fromX: number, fromY: number, toX: number, toY: number) => void;
    resetGame: () => void;
    startNewGame: (config: GameConfig) => void;
    undoMove: () => void;
}

const ChessContext = createContext<ChessContextType | undefined>(undefined);

interface Props {
    children: React.ReactNode;
}

export const ChessProvider: React.FC<Props> = ({ children }) => {
    const [gameState, setGameState] = useState<GameState>(initialState);
    const [gameConfig, setGameConfig] = useState<GameConfig>(defaultConfig);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [isTauriAvailable, setIsTauriAvailable] = useState<boolean>(false);
    
    // Function to initialize and set up event listeners
    useEffect(() => {
        setIsLoading(true);
        
        const initializeChessBoard = async () => {
            // More robust check for Tauri environment
            const checkTauriAvailable = () => {
                try {
                    // Check if window.__TAURI__ is available (more reliable than __TAURI_IPC__)
                    return window && typeof window.__TAURI__ !== 'undefined';
                } catch (e) {
                    console.error("Error checking Tauri availability:", e);
                    return false;
                }
            };
            
            const tauriAvailable = checkTauriAvailable();
            console.log("Tauri available:", tauriAvailable);
            setIsTauriAvailable(tauriAvailable);
            
            if (tauriAvailable) {
                try {
                    // If in Tauri environment, get game state from backend
                    console.log("Fetching game state from Tauri backend...");
                    const initialGameState = await invoke<GameState>('get_game_state');
                    console.log("Got initial game state from Tauri:", initialGameState);
                    
                    // First create a basic state with default values in case the returned state is incomplete
                    const defaultState = {
                        ...initialState,
                        board: createMockBoard()
                    };
                    
                    // Then merge in any valid data from the backend
                    const formattedGameState = {
                        ...defaultState,
                        ...initialGameState
                    };
                    
                    // Make sure the board is properly formatted
                    if (initialGameState.board) {
                        // Handle different possible formats from the backend
                        if (initialGameState.board.board) {
                            // If board is nested inside a board property (Rust struct serialization)
                            formattedGameState.board = formatBoardFromBackend(initialGameState.board.board);
                        } else if (Array.isArray(initialGameState.board)) {
                            if (initialGameState.board.length > 0 && Array.isArray(initialGameState.board[0])) {
                                formattedGameState.board = formatBoardFromBackend(initialGameState.board);
                            }
                        }
                    }
                    
                    setGameState(formattedGameState);
                    
                    // Set up event listeners for game state updates from Rust
                    await setupEventListeners();
                } catch (error) {
                    console.error('Failed to load initial game state from Tauri:', error);
                    fallbackToMockData();
                } finally {
                    setIsLoading(false);
                }
            } else {
                // If not in Tauri environment, use mock data for development
                fallbackToMockData();
            }
        };
        
        const fallbackToMockData = () => {
            console.log('Using mock data for development');
            // Create a mock chess board with pieces
            const mockBoard = createMockBoard();
            setGameState(prevState => ({
                ...prevState,
                board: mockBoard
            }));
            
            // Set a small timeout to simulate API call
            setTimeout(() => {
                setIsLoading(false);
            }, 300);
        };
        
        initializeChessBoard();
        
        // Cleanup function to remove event listeners
        return () => {
            // Cleanup code for event listeners would go here
        };
    }, []);
    
    // Setup event listeners for game updates from Rust backend
    const setupEventListeners = async () => {
        if (!isTauriAvailable) return;
        
        try {
            console.log("Setting up event listeners for Tauri events");
            
            // Listen for game state updates
            await listen('game-state-updated', (event) => {
                console.log("Received game-state-updated event:", event);
                const updatedState = event.payload as GameState;
                
                // Apply the same formatting as initial state to ensure consistency
                const formattedState = {
                    ...gameState,
                    ...updatedState,
                    board: updatedState.board && updatedState.board.board 
                        ? formatBoardFromBackend(updatedState.board.board)
                        : gameState.board
                };
                
                setGameState(formattedState);
            });
            
            // Listen for multiplayer events
            await listen('opponent-move', (event) => {
                console.log("Received opponent-move event:", event);
                const updatedState = event.payload as GameState;
                
                // Apply the same formatting as initial state to ensure consistency
                const formattedState = {
                    ...gameState,
                    ...updatedState,
                    board: updatedState.board && updatedState.board.board 
                        ? formatBoardFromBackend(updatedState.board.board)
                        : gameState.board
                };
                
                setGameState(formattedState);
            });
            
            // Listen for AI move events
            await listen('ai-move', (event) => {
                console.log("Received ai-move event:", event);
                const updatedState = event.payload as GameState;
                
                // Apply the same formatting as initial state to ensure consistency
                const formattedState = {
                    ...gameState,
                    ...updatedState,
                    board: updatedState.board && updatedState.board.board 
                        ? formatBoardFromBackend(updatedState.board.board)
                        : gameState.board
                };
                
                setGameState(formattedState);
            });
            
            console.log("Event listeners set up successfully");
        } catch (error) {
            console.error('Failed to set up event listeners:', error);
        }
    };
    
    // Function to select a square on the board
    const selectSquare = (x: number, y: number) => {
        if (gameState.game_over) return;
        
        // Process in Rust backend when available
        if (isTauriAvailable) {
            invoke<{board: any, possibleMoves: Position[]}>('select_square', { x, y })
                .then((response) => {
                    console.log("Select square response:", response);
                    // Update game state with formatted board data
                    let newBoardData;
                    if (response.board && response.board.board) {
                        newBoardData = formatBoardFromBackend(response.board.board);
                    } else {
                        // If the format is unexpected, keep current board but clear highlights
                        newBoardData = gameState.board.map(row =>
                            row.map(square => ({ ...square, isPossibleMove: false }))
                        );
                    }
                    
                    // Mark possible moves
                    if (Array.isArray(response.possibleMoves)) {
                        response.possibleMoves.forEach(move => {
                            if (move.x >= 0 && move.x < 8 && move.y >= 0 && move.y < 8) {
                                newBoardData[move.y][move.x].isPossibleMove = true;
                            }
                        });
                    }
                    
                    setGameState(prevState => ({
                        ...prevState,
                        board: newBoardData,
                        selectedSquare: { x, y },
                        possibleMoves: response.possibleMoves || []
                    }));
                })
                .catch(error => {
                    console.error('Error selecting square:', error);
                    // Fallback to client-side logic if backend call fails
                    handleClientSideSelection(x, y);
                });
            return;
        }
        
        // Fallback for development without Tauri
        handleClientSideSelection(x, y);
    };
    
    // Client-side square selection logic to use when Tauri is not available
    const handleClientSideSelection = (x: number, y: number) => {
        console.log(`Selecting square at (${x}, ${y})`);
        
        // If a square is already selected and the new click is a valid move
        if (gameState.selectedSquare) {
            // Check if clicked square is in possible moves
            const isValidMove = gameState.possibleMoves.some(
                move => move.x === x && move.y === y
            );
            
            // If clicking on a valid move square, move the piece
            if (isValidMove) {
                console.log(`Moving piece from (${gameState.selectedSquare.x}, ${gameState.selectedSquare.y}) to (${x}, ${y})`);
                movePiece(gameState.selectedSquare.x, gameState.selectedSquare.y, x, y);
                return;
            }
            
            // Clear selection if clicking the same square
            if (gameState.selectedSquare.x === x && gameState.selectedSquare.y === y) {
                console.log('Deselecting square');
                clearSelection();
                return;
            }
        }
        
        // Check if the square contains a piece of the current player
        const square = gameState.board[y][x];
        if (!square.piece || square.piece.color !== gameState.current_player) {
            console.log('Square is empty or has opponent piece, clearing selection');
            clearSelection();
            return;
        }
        
        console.log(`Piece found: ${square.piece.piece_type} (${square.piece.color}), calculating possible moves`);
        
        // Calculate possible moves locally for the selected piece
        const possibleMoves = calculatePieceMoves(gameState.board, x, y);
        console.log(`Found ${possibleMoves.length} possible moves`, possibleMoves);
        
        // Update board with possible moves highlighted
        const newBoard = gameState.board.map(row =>
            row.map(square => ({ ...square, isPossibleMove: false }))
        );
        
        possibleMoves.forEach(move => {
            if (move.x >= 0 && move.x < 8 && move.y >= 0 && move.y < 8) {
                newBoard[move.y][move.x].isPossibleMove = true;
            }
        });
        
        setGameState({
            ...gameState,
            board: newBoard,
            selectedSquare: { x, y },
            possibleMoves
        });
    };
    
    // Clear the current selection
    const clearSelection = () => {
        const newBoard = gameState.board.map(row =>
            row.map(square => ({ ...square, isPossibleMove: false }))
        );
        
        setGameState({
            ...gameState,
            board: newBoard,
            selectedSquare: null,
            possibleMoves: []
        });
    };
    
    // Move a piece on the board
    const movePiece = (fromX: number, fromY: number, toX: number, toY: number) => {
        if (gameState.game_over) return;
        
        // Process move in Rust backend when available
        if (isTauriAvailable) {
            invoke<GameState>('move_piece', { fromX, fromY, toX, toY })
                .then(updatedState => {
                    console.log("Move piece response:", updatedState);
                    
                    // Format the board data properly
                    const formattedGameState = {
                        ...updatedState,
                        board: updatedState.board && updatedState.board.board ? 
                            formatBoardFromBackend(updatedState.board.board) : 
                            gameState.board // Keep current board if response is malformed
                    };
                    
                    setGameState(formattedGameState);
                })
                .catch(error => {
                    console.error('Error moving piece:', error);
                    // Fallback to client-side move if backend call fails
                    handleClientSideMove(fromX, fromY, toX, toY);
                });
            return;
        }
        
        // Fallback move logic for development without Tauri
        handleClientSideMove(fromX, fromY, toX, toY);
    };
    
    // Client-side move logic to use when Tauri is not available
    const handleClientSideMove = (fromX: number, fromY: number, toX: number, toY: number) => {
        console.log(`Processing move from (${fromX}, ${fromY}) to (${toX}, ${toY})`);
        
        // Check if the move is valid
        const possibleMoves = calculatePieceMoves(gameState.board, fromX, fromY);
        const isValidMove = possibleMoves.some(move => move.x === toX && move.y === toY);
        
        if (!isValidMove) {
            console.error("Invalid move attempted");
            return;
        }
        
        // Deep clone the board to avoid mutation
        const newBoard = JSON.parse(JSON.stringify(gameState.board));
        
        // Store the captured piece (for detecting checkmate)
        const capturedPiece = newBoard[toY][toX].piece;
        
        // Get the moving piece
        const movingPiece = newBoard[fromY][fromX].piece;
        if (!movingPiece) {
            console.error("No piece found at source position");
            return;
        }
        
        // Move the piece
        newBoard[toY][toX].piece = movingPiece;
        newBoard[fromY][fromX].piece = null;
        
        // Clear possible moves highlights
        newBoard.forEach(row => row.forEach(square => square.isPossibleMove = false));
        
        // Switch player turn
        const newCurrentPlayer = gameState.current_player === Color.White ? Color.Black : Color.White;
        
        // Generate algebraic notation for the move
        const notation = generateMoveNotation(fromX, fromY, toX, toY, capturedPiece);
        
        // Check if this is a game-ending move (king capture)
        let gameOver = false;
        let gameOverMessage = '';
        
        if (capturedPiece && capturedPiece.piece_type === PieceType.King) {
            gameOver = true;
            gameOverMessage = `${gameState.current_player === Color.White ? 'White' : 'Black'} wins by capturing the king!`;
        }
        
        // Check if the opponent's king is in check
        const isInCheck = isKingInCheck(newBoard, newCurrentPlayer);
        
        console.log(`Move complete. New player: ${newCurrentPlayer}. Check: ${isInCheck}. Game over: ${gameOver}`);
        
        setGameState({
            ...gameState,
            board: newBoard,
            current_player: newCurrentPlayer,
            game_over: gameOver,
            isCheck: isInCheck,
            gameOverMessage: gameOverMessage,
            moveHistory: [...gameState.moveHistory, notation],
            selectedSquare: null,
            possibleMoves: []
        });
    };
    
    // Reset the game to initial state
    const resetGame = () => {
        // Process in Rust backend when available
        if (isTauriAvailable) {
            invoke<GameState>('reset_game')
                .then(initialState => {
                    setGameState(initialState);
                })
                .catch(error => {
                    console.error('Error resetting game:', error);
                });
            return;
        }
        
        // Fallback for development without Tauri
        const mockBoard = createMockBoard();
        setGameState({
            ...initialState,
            board: mockBoard
        });
    };
    
    // Start a new game with given configuration
    const startNewGame = (config: GameConfig) => {
        setGameConfig(config);
        
        // Process in Rust backend when available
        if (isTauriAvailable) {
            invoke<GameState>('start_new_game', { config })
                .then(newGameState => {
                    setGameState(newGameState);
                })
                .catch(error => {
                    console.error('Error starting new game:', error);
                });
            return;
        }
        
        // Fallback for development without Tauri
        resetGame();
    };
    
    // Undo the last move
    const undoMove = () => {
        // Process in Rust backend when available
        if (isTauriAvailable) {
            invoke<GameState>('undo_move')
                .then(previousState => {
                    setGameState(previousState);
                })
                .catch(error => {
                    console.error('Error undoing move:', error);
                });
            return;
        }
        
        // Simple fallback for development - not a full implementation
        console.log('Undo not implemented in development mode');
    };
    
    // Helper function to check if the king of a given color is in check (for development mode)
    const isKingInCheck = (board: Square[][], color: Color): boolean => {
        // Find the king
        let kingX = -1;
        let kingY = -1;
        
        for (let y = 0; y < 8; y++) {
            for (let x = 0; x < 8; x++) {
                const piece = board[y][x].piece;
                if (piece && piece.piece_type === PieceType.King && piece.color === color) {
                    kingX = x;
                    kingY = y;
                    break;
                }
            }
            if (kingX !== -1) break;
        }
        
        if (kingX === -1) return false;
        
        // Check if any opponent piece can attack the king
        // This is a simplified check for development mode
        const opponentColor = color === Color.White ? Color.Black : Color.White;
        
        for (let y = 0; y < 8; y++) {
            for (let x = 0; x < 8; x++) {
                const piece = board[y][x].piece;
                if (piece && piece.color === opponentColor) {
                    // Get possible moves for this opponent piece
                    const moves = calculatePieceMoves(board, x, y);
                    
                    // If any move can reach the king's position, the king is in check
                    if (moves.some(move => move.x === kingX && move.y === kingY)) {
                        return true;
                    }
                }
            }
        }
        
        return false;
    };
    
    // Calculate possible moves for a piece (simplified for development)
    const calculatePossibleMoves = (x: number, y: number): Position[] => {
        return calculatePieceMoves(gameState.board, x, y);
    };
    
    // Helper function to calculate moves for a piece at a specific position
    const calculatePieceMoves = (board: Square[][], x: number, y: number): Position[] => {
        const moves: Position[] = [];
        const square = board[y][x];
        
        if (!square || !square.piece) return [];
        
        const { piece_type, color } = square.piece;
        const isWhite = color === Color.White;
        
        // Check if a position is valid and either empty or has an opponent's piece
        const isValidTarget = (tx: number, ty: number): boolean => {
            // Check bounds
            if (tx < 0 || tx >= 8 || ty < 0 || ty >= 8) return false;
            
            const targetSquare = board[ty][tx];
            
            // Square is empty or has opponent's piece
            return !targetSquare.piece || targetSquare.piece.color !== color;
        };
        
        // Check if a position is valid for capture only (has opponent's piece)
        const isValidCapture = (tx: number, ty: number): boolean => {
            // Check bounds
            if (tx < 0 || tx >= 8 || ty < 0 || ty >= 8) return false;
            
            const targetSquare = board[ty][tx];
            
            // Square has opponent's piece
            return targetSquare.piece && targetSquare.piece.color !== color;
        };
        
        // Check if a position is valid for movement only (is empty)
        const isValidMove = (tx: number, ty: number): boolean => {
            // Check bounds
            if (tx < 0 || tx >= 8 || ty < 0 || ty >= 8) return false;
            
            const targetSquare = board[ty][tx];
            
            // Square is empty
            return !targetSquare.piece;
        };
        
        // Add position to moves if it's valid
        const addIfValid = (tx: number, ty: number): boolean => {
            if (isValidTarget(tx, ty)) {
                moves.push({ x: tx, y: ty });
                // Return true if the square is empty (can continue in this direction)
                return !board[ty][tx].piece;
            }
            return false; // Stop in this direction
        };
        
        switch (piece_type) {
            case PieceType.Pawn:
                // Pawns move differently based on color
                const direction = isWhite ? -1 : 1; // White moves up, Black moves down
                const startRow = isWhite ? 6 : 1;
                
                // Forward move (1 square)
                if (isValidMove(x, y + direction)) {
                    moves.push({ x, y: y + direction });
                    
                    // Initial 2-square move
                    if (y === startRow && isValidMove(x, y + 2 * direction)) {
                        moves.push({ x, y: y + 2 * direction });
                    }
                }
                
                // Captures (diagonally)
                if (isValidCapture(x - 1, y + direction)) {
                    moves.push({ x: x - 1, y: y + direction });
                }
                if (isValidCapture(x + 1, y + direction)) {
                    moves.push({ x: x + 1, y: y + direction });
                }
                
                break;
                
            case PieceType.Knight:
                // Knights move in L-shapes: 2 squares in one direction, 1 square perpendicular
                const knightMoves = [
                    { dx: 2, dy: 1 }, { dx: 2, dy: -1 },
                    { dx: -2, dy: 1 }, { dx: -2, dy: -1 },
                    { dx: 1, dy: 2 }, { dx: 1, dy: -2 },
                    { dx: -1, dy: 2 }, { dx: -1, dy: -2 }
                ];
                
                for (const move of knightMoves) {
                    const tx = x + move.dx;
                    const ty = y + move.dy;
                    if (isValidTarget(tx, ty)) {
                        moves.push({ x: tx, y: ty });
                    }
                }
                break;
                
            case PieceType.Bishop:
                // Bishops move diagonally
                // Check all four diagonal directions
                // Up-right
                for (let i = 1; i < 8; i++) {
                    if (!addIfValid(x + i, y - i)) break;
                }
                // Up-left
                for (let i = 1; i < 8; i++) {
                    if (!addIfValid(x - i, y - i)) break;
                }
                // Down-right
                for (let i = 1; i < 8; i++) {
                    if (!addIfValid(x + i, y + i)) break;
                }
                // Down-left
                for (let i = 1; i < 8; i++) {
                    if (!addIfValid(x - i, y + i)) break;
                }
                break;
                
            case PieceType.Rook:
                // Rooks move horizontally and vertically
                // Check all four directions
                // Right
                for (let i = 1; i < 8; i++) {
                    if (!addIfValid(x + i, y)) break;
                }
                // Left
                for (let i = 1; i < 8; i++) {
                    if (!addIfValid(x - i, y)) break;
                }
                // Down
                for (let i = 1; i < 8; i++) {
                    if (!addIfValid(x, y + i)) break;
                }
                // Up
                for (let i = 1; i < 8; i++) {
                    if (!addIfValid(x, y - i)) break;
                }
                break;
                
            case PieceType.Queen:
                // Queens move like both rooks and bishops
                // Diagonal moves (like Bishop)
                // Up-right
                for (let i = 1; i < 8; i++) {
                    if (!addIfValid(x + i, y - i)) break;
                }
                // Up-left
                for (let i = 1; i < 8; i++) {
                    if (!addIfValid(x - i, y - i)) break;
                }
                // Down-right
                for (let i = 1; i < 8; i++) {
                    if (!addIfValid(x + i, y + i)) break;
                }
                // Down-left
                for (let i = 1; i < 8; i++) {
                    if (!addIfValid(x - i, y + i)) break;
                }
                
                // Straight moves (like Rook)
                // Right
                for (let i = 1; i < 8; i++) {
                    if (!addIfValid(x + i, y)) break;
                }
                // Left
                for (let i = 1; i < 8; i++) {
                    if (!addIfValid(x - i, y)) break;
                }
                // Down
                for (let i = 1; i < 8; i++) {
                    if (!addIfValid(x, y + i)) break;
                }
                // Up
                for (let i = 1; i < 8; i++) {
                    if (!addIfValid(x, y - i)) break;
                }
                break;
                
            case PieceType.King:
                // Kings move one square in any direction
                const kingMoves = [
                    { dx: 1, dy: 0 }, { dx: 1, dy: 1 }, { dx: 0, dy: 1 }, { dx: -1, dy: 1 },
                    { dx: -1, dy: 0 }, { dx: -1, dy: -1 }, { dx: 0, dy: -1 }, { dx: 1, dy: -1 }
                ];
                
                for (const move of kingMoves) {
                    const tx = x + move.dx;
                    const ty = y + move.dy;
                    if (isValidTarget(tx, ty)) {
                        moves.push({ x: tx, y: ty });
                    }
                }
                break;
        }
        
        return moves;
    };
    
    // Generate algebraic notation for a move (simplified)
    const generateMoveNotation = (
        fromX: number, 
        fromY: number, 
        toX: number, 
        toY: number, 
        capturedPiece: Piece | null
    ): string => {
        const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
        const ranks = ['8', '7', '6', '5', '4', '3', '2', '1'];
        
        const piece = gameState.board[fromY][fromX].piece;
        if (!piece) return '';
        
        let notation = '';
        
        // Add piece symbol (except for pawns)
        if (piece.piece_type !== PieceType.Pawn) {
            const symbols: Record<number, string> = {
                [PieceType.Rook]: 'R',
                [PieceType.Knight]: 'N',
                [PieceType.Bishop]: 'B',
                [PieceType.Queen]: 'Q',
                [PieceType.King]: 'K'
            };
            notation += symbols[piece.piece_type];
        }
        
        // Add starting position
        notation += files[fromX] + ranks[fromY];
        
        // Add capture symbol if appropriate
        if (capturedPiece) {
            notation += 'x';
        } else {
            notation += '-';
        }
        
        // Add ending position
        notation += files[toX] + ranks[toY];
        
        return notation;
    };

    // Helper function to convert backend board format to frontend format
    const formatBoardFromBackend = (backendBoard: any[][]): Square[][] => {
        try {
            if (!Array.isArray(backendBoard) || backendBoard.length === 0) {
                console.error("Invalid backend board format:", backendBoard);
                return createMockBoard();
            }
            
            return backendBoard.map((row, y) => 
                row.map((cell, x) => ({
                    x: x,
                    y: y,
                    piece: cell || null,
                    isPossibleMove: false
                }))
            );
        } catch (e) {
            console.error("Error formatting board from backend:", e);
            return createMockBoard();
        }
    }

    return (
        <ChessContext.Provider 
            value={{ 
                gameState, 
                gameConfig,
                isLoading, 
                isTauriAvailable,
                selectSquare,
                movePiece,
                resetGame,
                startNewGame,
                undoMove
            }}
        >
            {children}
        </ChessContext.Provider>
    );
};

export const useChess = () => {
    const context = useContext(ChessContext);
    if (!context) {
        throw new Error('useChess must be used within a ChessProvider');
    }
    return context;
};
