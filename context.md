## .\vite.config.ts

```typescript
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig(async () => ({
  plugins: [react()],

  // Vite options tailored for Tauri development and only applied in `tauri dev` or `tauri build`
  //
  // 1. prevent vite from obscuring rust errors
  clearScreen: false,
  // 2. tauri expects a fixed port, fail if that port is not available
  server: {
    port: 1420,
    strictPort: true,
    watch: {
      // 3. tell vite to ignore watching `src-tauri`
      ignored: ["**/src-tauri/**"],
    },
  },
}));

```

## .\src\App.tsx

```typescript
import React from 'react';
import './App.css';
import Chessboard from './Components/ChessBoard';
import { ChessProvider } from './Context/ChessContext';


const App: React.FC = () => {
    return (
      <div className="App">
          <ChessProvider>
              <header className="App-header">
                  <Chessboard />
              </header>
          </ChessProvider>
      </div>
    );
};

export default App;


```

## .\src\main.tsx

```typescript
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./styles.css";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

```

## .\src\vite-env.d.ts

```typescript
/// <reference types="vite/client" />

```

## .\src\Components\ChessBoard.tsx

```typescript
import React, { useState, useEffect } from 'react';
import Square from './Square';
import GameSetup from './GameSetup';
import { useChess } from '../Context/ChessContext';
import { Color, Position } from '../types';
import { GameMode, Difficulty } from '../Context/ChessContext';

const Chessboard: React.FC = () => {
    const { 
        gameState, 
        gameConfig,
        isLoading,
        isTauriAvailable,
        selectSquare,
        resetGame,
        startNewGame,
        undoMove,
        movePiece
    } = useChess();
    
    const [showNewGameOptions, setShowNewGameOptions] = useState(false);
    const [isOverlayClosing, setIsOverlayClosing] = useState(false);
    const [boardElements, setBoardElements] = useState<JSX.Element[]>([]);
    
    // Handle closing the overlay with animation
    const handleCloseOverlay = () => {
        setIsOverlayClosing(true);
        setTimeout(() => {
            setIsOverlayClosing(false);
            setShowNewGameOptions(false);
        }, 300);
    };
    
    // Safely render the board when gameState updates
    useEffect(() => {
        if (!isLoading && gameState && gameState.board) {
            const rows = gameState.board.length;
            const cols = rows > 0 ? gameState.board[0].length : 0;
            const newBoard: JSX.Element[] = [];
            
            for (let i = 0; i < rows; i++) {
                for (let j = 0; j < cols; j++) {
                    const square = gameState.board[i][j];
                    const isSelected = 
                        gameState.selectedSquare?.x === j && 
                        gameState.selectedSquare?.y === i;
                        
                    newBoard.push(
                        <Square
                            key={`${i}-${j}`}
                            square={square}
                            isSelected={isSelected}
                            onClick={() => handleSquareClick(j, i)}
                        />
                    );
                }
            }
            
            setBoardElements(newBoard);
        }
    }, [gameState, isLoading]);
    
    if (isLoading) {
        return <div className="loading-chess">Loading chessboard...</div>;
    }

    // Check if gameState is properly initialized
    if (!gameState || !gameState.board) {
        return <div className="error-chess">Error: Game state is not properly initialized</div>;
    }

    // Safely access the board dimensions with fallbacks
    const rows = gameState.board.length || 0;
    if (rows === 0) {
        return <div className="error-chess">Error: Chess board data is not available</div>;
    }
    
    const cols = gameState.board[0]?.length || 0;

    // Handle square clicks - now delegated to the context
    const handleSquareClick = (x: number, y: number) => {
        if (gameState && selectSquare) {
            // If a square is already selected and the new click is on a possible move square
            if (gameState.selectedSquare && gameState.possibleMoves.some(move => move.x === x && move.y === y)) {
                // Move the piece
                movePiece(
                    gameState.selectedSquare.x, 
                    gameState.selectedSquare.y, 
                    x, 
                    y
                );
            } else {
                // Otherwise just select the square (will calculate moves if needed)
                selectSquare(x, y);
            }
        }
    };
    
    // Handle starting a new game with AI
    const handleStartAIGame = (difficulty: Difficulty) => {
        startNewGame({
            mode: GameMode.AI,
            difficulty,
            playerColor: Color.White,
        });
        setShowNewGameOptions(false);
    };
    
    // Handle starting a new local game
    const handleStartLocalGame = () => {
        startNewGame({
            mode: GameMode.LOCAL,
        });
        setShowNewGameOptions(false);
    };

    return (
        <div className="chess-board-container">
            <div className="chess-game-info">
                <div className="current-player">
                    Current player: {gameState.current_player === Color.White ? 'White' : 'Black'}
                    {gameState.isCheck && <span className="check-indicator"> - CHECK!</span>}
                </div>
                
                <div className="game-mode-indicator">
                    Mode: {gameConfig.mode === GameMode.AI ? 
                        `AI (${gameConfig.difficulty})` : 
                        (gameConfig.mode === GameMode.MULTIPLAYER ? 'Multiplayer' : 'Local')}
                </div>
                
                {isTauriAvailable ? (
                    <div className="tauri-status connected">Connected to Tauri backend</div>
                ) : (
                    <div className="tauri-status dev-mode">Development mode (no Tauri)</div>
                )}
            </div>
            
            <div className="game-controls">
                <button 
                    className="control-button"
                    onClick={() => setShowNewGameOptions(!showNewGameOptions)}
                >
                    New Game
                </button>
                <button 
                    className="control-button"
                    onClick={resetGame}
                >
                    Reset
                </button>
                <button 
                    className="control-button"
                    onClick={undoMove}
                    disabled={!gameState.moveHistory || gameState.moveHistory.length === 0}
                >
                    Undo
                </button>
            </div>
            
            {showNewGameOptions && (
                <div className={`overlay ${isOverlayClosing ? 'fade-out' : ''}`}>
                    <GameSetup 
                        onClose={handleCloseOverlay}
                        isTauriAvailable={isTauriAvailable}
                    />
                </div>
            )}
            
            {gameState.game_over && (
                <div className="game-over-message">
                    {gameState.gameOverMessage || 'Game Over!'}
                </div>
            )}
            
            <div
                className="chess-board"
                style={{
                    display: 'grid',
                    gridTemplateColumns: `repeat(${cols}, 50px)`,
                    gridTemplateRows: `repeat(${rows}, 50px)`,
                    width: '400px',
                    height: '400px',
                    border: '2px solid black',
                }}
            >
                {boardElements}
            </div>

            {gameState.moveHistory && gameState.moveHistory.length > 0 && (
                <div className="move-history">
                    <h3>Move History</h3>
                    <div className="move-list">
                        {gameState.moveHistory.map((move, index) => (
                            <div key={index} className="move-entry">
                                {Math.floor(index / 2) + 1}.{index % 2 === 0 ? '' : '..'} {move}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default Chessboard;


```

## .\src\Components\GameSetup.tsx

```typescript
import React, { useState } from 'react';
import { useChess } from '../Context/ChessContext';
import { GameMode, Difficulty } from '../Context/ChessContext';
import { Color } from '../types';

interface GameSetupProps {
    onClose: () => void;
    isTauriAvailable: boolean;
}

const GameSetup: React.FC<GameSetupProps> = ({ onClose, isTauriAvailable }) => {
    const { startNewGame } = useChess();
    const [selectedDifficulty, setSelectedDifficulty] = useState<Difficulty>(Difficulty.MEDIUM);
    const [selectedColor, setSelectedColor] = useState<Color>(Color.White);
    const [isClosing, setIsClosing] = useState(false);
    const [activeTab, setActiveTab] = useState<'local' | 'ai' | 'online'>('local');
    
    // Handle starting a new game with AI
    const handleStartAIGame = () => {
        startNewGame({
            mode: GameMode.AI,
            difficulty: selectedDifficulty,
            playerColor: selectedColor,
        });
        handleClose();
    };
    
    // Handle starting a new local game
    const handleStartLocalGame = () => {
        startNewGame({
            mode: GameMode.LOCAL,
        });
        handleClose();
    };
    
    // Handle closing the panel with animation
    const handleClose = () => {
        setIsClosing(true);
        setTimeout(() => onClose(), 300);
    };
    
    // Handle multiplayer game (placeholder for now)
    const handleMultiplayerGame = () => {
        alert("Multiplayer is coming soon! Check the server-architecture.md file for our plans.");
    };
    
    return (
        <div className={`game-options-panel ${isClosing ? 'fade-out' : ''}`}>
            <div className="panel-header">
                <h3>New Game Options</h3>
                <button className="close-button" onClick={handleClose}>×</button>
            </div>
            
            <div className="game-mode-tabs">
                <button 
                    className={`tab ${activeTab === 'local' ? 'active' : ''}`}
                    onClick={() => setActiveTab('local')}
                >
                    Local Game
                </button>
                <button 
                    className={`tab ${activeTab === 'ai' ? 'active' : ''}`}
                    onClick={() => setActiveTab('ai')}
                >
                    VS AI
                </button>
                <button 
                    className={`tab ${activeTab === 'online' ? 'active' : ''}`}
                    onClick={() => setActiveTab('online')}
                >
                    Online
                </button>
            </div>
            
            <div className="game-options">
                {activeTab === 'local' && (
                    <div className="tab-content">
                        <p>Play a local game against a friend on the same device.</p>
                        <button 
                            onClick={handleStartLocalGame} 
                            className="primary-button"
                        >
                            Start Local Game
                        </button>
                    </div>
                )}
                
                {activeTab === 'ai' && (
                    <div className="tab-content">
                        <div className="option-group">
                            <label>AI Difficulty:</label>
                            <div className="ai-options">
                                <button 
                                    onClick={() => setSelectedDifficulty(Difficulty.EASY)}
                                    className={selectedDifficulty === Difficulty.EASY ? 'selected' : ''}
                                >
                                    Easy
                                </button>
                                <button 
                                    onClick={() => setSelectedDifficulty(Difficulty.MEDIUM)}
                                    className={selectedDifficulty === Difficulty.MEDIUM ? 'selected' : ''}
                                >
                                    Medium
                                </button>
                                <button 
                                    onClick={() => setSelectedDifficulty(Difficulty.HARD)}
                                    className={selectedDifficulty === Difficulty.HARD ? 'selected' : ''}
                                >
                                    Hard
                                </button>
                            </div>
                        </div>
                        
                        <div className="option-group">
                            <label>Color Preference:</label>
                            <div className="color-options">
                                <div 
                                    onClick={() => setSelectedColor(Color.White)}
                                    className={`color-option white ${selectedColor === Color.White ? 'selected' : ''}`}
                                >
                                    Play as White
                                </div>
                                <div 
                                    onClick={() => setSelectedColor(Color.Black)}
                                    className={`color-option black ${selectedColor === Color.Black ? 'selected' : ''}`}
                                >
                                    Play as Black
                                </div>
                            </div>
                        </div>
                        
                        <button 
                            onClick={handleStartAIGame}
                            className="primary-button highlight"
                        >
                            Start AI Game
                        </button>
                    </div>
                )}
                
                {activeTab === 'online' && (
                    <div className="tab-content">
                        <div className="coming-soon-panel">
                            <h4>Multiplayer Coming Soon!</h4>
                            <p>
                                Our team is working on an exciting multiplayer experience.
                                The multiplayer server architecture is being developed to support:
                            </p>
                            <ul className="features-list">
                                <li>Live games against players worldwide</li>
                                <li>Rating system and matchmaking</li>
                                <li>Game history and analysis</li>
                                <li>Tournaments and competitive play</li>
                            </ul>
                            <div className="placeholder-form">
                                <div className="form-group">
                                    <label>Username:</label>
                                    <input type="text" placeholder="Enter username" disabled />
                                </div>
                                <div className="form-group">
                                    <label>Game Type:</label>
                                    <select disabled>
                                        <option>Quick Match</option>
                                        <option>Ranked Game</option>
                                        <option>Friend Challenge</option>
                                    </select>
                                </div>
                                <button 
                                    className="primary-button disabled"
                                    onClick={handleMultiplayerGame}
                                >
                                    Join Game
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default GameSetup; 
```

## .\src\Components\Square.tsx

```typescript
import React from 'react';
import { Color, Piece, PieceType, Square } from '../types';
import { useChess } from '../Context/ChessContext';

// Import piece images
import BlackBishop from '../assets/Black_Bishop.png';
import BlackKnight from '../assets/Black_Knight.png'; 
import BlackQueen from '../assets/Black_Queen.png';
import BlackKing from '../assets/Black_King.png';
import BlackPawn from '../assets/Black_Pawn.png';
import BlackRook from '../assets/Black_Rook.png';
import WhiteBishop from '../assets/White_Bishop.png';
import WhiteKnight from '../assets/White_Knight.png';
import WhiteQueen from '../assets/White_Queen.png';
import WhiteKing from '../assets/White_King.png';
import WhitePawn from '../assets/White_Pawn.png';
import WhiteRook from '../assets/White_Rook.png';

interface SquareProps {
    square: Square;
    onClick: () => void;
    isSelected?: boolean;
}

const BoardSquare: React.FC<SquareProps> = ({ square, onClick, isSelected = false }) => {
    const { gameState, movePiece } = useChess();
    
    const black = (square.x + square.y) % 2 === 0;
    
    // Base colors
    const lightSquare = '#eeeed2';
    const darkSquare = '#769656';
    
    // Selected colors (highlight)
    const selectedLightSquare = '#f7f769';
    const selectedDarkSquare = '#bbcb44';
    
    // Determine final color
    const fillColor = black 
        ? (isSelected ? selectedDarkSquare : darkSquare)
        : (isSelected ? selectedLightSquare : lightSquare);

    // Helper function to generate image path
    const getImage = (piece: Piece | null) => {
        if (!piece) return "";
        
        // Handle cases where piece might be serialized differently
        const pieceType = typeof piece.piece_type === 'number' ? piece.piece_type : 
                         (piece.piece_type as any === 'Pawn' ? PieceType.Pawn :
                          piece.piece_type as any === 'Rook' ? PieceType.Rook :
                          piece.piece_type as any === 'Knight' ? PieceType.Knight :
                          piece.piece_type as any === 'Bishop' ? PieceType.Bishop :
                          piece.piece_type as any === 'Queen' ? PieceType.Queen :
                          piece.piece_type as any === 'King' ? PieceType.King : PieceType.Pawn);
        
        const color = typeof piece.color === 'number' ? piece.color :
                     (piece.color as any === 'White' ? Color.White : Color.Black);
        
        // Return the correct image based on piece type and color
        switch (`${color}_${pieceType}`) {
            case `${Color.Black}_${PieceType.Bishop}`: return BlackBishop;
            case `${Color.Black}_${PieceType.Knight}`: return BlackKnight;
            case `${Color.Black}_${PieceType.Queen}`: return BlackQueen;
            case `${Color.Black}_${PieceType.King}`: return BlackKing;
            case `${Color.Black}_${PieceType.Pawn}`: return BlackPawn;
            case `${Color.Black}_${PieceType.Rook}`: return BlackRook;
            case `${Color.White}_${PieceType.Bishop}`: return WhiteBishop;
            case `${Color.White}_${PieceType.Knight}`: return WhiteKnight;
            case `${Color.White}_${PieceType.Queen}`: return WhiteQueen;
            case `${Color.White}_${PieceType.King}`: return WhiteKing;
            case `${Color.White}_${PieceType.Pawn}`: return WhitePawn;
            case `${Color.White}_${PieceType.Rook}`: return WhiteRook;
            default: 
                console.log("Unknown piece:", piece);
                return "";
        }
    };
    
    // Handle drag start - only allow current player's pieces to be dragged
    const handleDragStart = (e: React.DragEvent) => {
        // Only allow dragging if the square has a piece and it's the current player's turn
        if (square.piece && square.piece.color === gameState.current_player) {
            // Set the data being dragged (the position of the piece)
            e.dataTransfer.setData('text/plain', `${square.x},${square.y}`);
            
            // Set the drag image (optional)
            const img = document.createElement('img');
            img.src = getImage(square.piece);
            e.dataTransfer.setDragImage(img, 25, 25);
            
            // Add a class for styling
            setTimeout(() => {
                e.currentTarget.classList.add('dragging');
            }, 0);
            
            // Also select the square to show possible moves
            onClick();
        } else {
            // Prevent dragging if not the current player's piece
            e.preventDefault();
        }
    };
    
    // Handle drag end
    const handleDragEnd = (e: React.DragEvent) => {
        e.currentTarget.classList.remove('dragging');
    };
    
    // Handle drag over - only allow dropping on valid move squares
    const handleDragOver = (e: React.DragEvent) => {
        if (square.isPossibleMove) {
            e.preventDefault(); // This is necessary to allow dropping
            e.currentTarget.classList.add('drag-over');
        }
    };
    
    // Handle drag leave
    const handleDragLeave = (e: React.DragEvent) => {
        e.currentTarget.classList.remove('drag-over');
    };
    
    // Handle drop - move the piece if the drop is on a valid square
    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.currentTarget.classList.remove('drag-over');
        
        // Only process drops on valid move squares
        if (square.isPossibleMove) {
            try {
                const fromCoords = e.dataTransfer.getData('text/plain').split(',');
                if (fromCoords.length === 2) {
                    const fromX = parseInt(fromCoords[0]);
                    const fromY = parseInt(fromCoords[1]);
                    
                    // Log move for debugging
                    console.log(`Moving piece from (${fromX},${fromY}) to (${square.x},${square.y})`);
                    
                    // Execute the move
                    movePiece(fromX, fromY, square.x, square.y);
                }
            } catch (err) {
                console.error("Error during drop:", err);
            }
        }
    };
    
    // Determine if this is a possible capture (has both isPossibleMove and a piece)
    const isPossibleCapture = square.isPossibleMove && square.piece;
    
    return (
        <div 
            className={`chess-square ${isSelected ? 'selected' : ''} ${square.isPossibleMove ? 'possible-move' : ''}`}
            onClick={onClick} 
            style={{
                backgroundColor: fillColor,
                width: '100%',
                height: '100%',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                position: 'relative',
                cursor: 'pointer',
                transition: 'background-color 0.2s ease'
            }}
            // Add drag-and-drop attributes for pieces
            draggable={!!square.piece}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
        >
            {square.piece && (
                <img 
                    src={getImage(square.piece)} 
                    alt={`Chess piece`}
                    style={{ 
                        maxWidth: '80%', 
                        maxHeight: '80%', 
                        zIndex: 2,
                        pointerEvents: "none" // This prevents the image from interfering with drag events
                    }} 
                />
            )}
            
            {/* Highlight for empty possible move */}
            {square.isPossibleMove && !square.piece && (
                <div className="move-indicator" style={{ 
                    position: 'absolute', 
                    width: '30%', 
                    height: '30%', 
                    borderRadius: '50%', 
                    background: 'rgba(0, 0, 0, 0.3)', 
                    zIndex: 1
                }} />
            )}
            
            {/* Highlight for capture move */}
            {isPossibleCapture && (
                <div className="capture-indicator" style={{ 
                    position: 'absolute', 
                    width: '100%', 
                    height: '100%', 
                    border: '4px solid rgba(255, 0, 0, 0.7)', 
                    boxSizing: 'border-box',
                    zIndex: 1
                }} />
            )}
            
            {/* Coordinate labels (optional) */}
            {square.x === 0 && (
                <div style={{
                    position: 'absolute',
                    left: '2px',
                    top: '2px',
                    fontSize: '10px',
                    color: black ? '#eeeed2' : '#769656',
                    zIndex: 3
                }}>
                    {8 - square.y}
                </div>
            )}
            
            {square.y === 7 && (
                <div style={{
                    position: 'absolute',
                    right: '2px',
                    bottom: '2px',
                    fontSize: '10px',
                    color: black ? '#eeeed2' : '#769656',
                    zIndex: 3
                }}>
                    {String.fromCharCode(97 + square.x)}
                </div>
            )}
        </div>
    );
};

export default BoardSquare;

```

## .\src\Context\ChessContext.tsx

```typescript
import React, { createContext, useContext, useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/tauri';
import { listen } from '@tauri-apps/api/event';
import { Color, Square, PieceType, Piece, Position } from '../types';

// Game modes for future expansion
export enum GameMode {
  LOCAL = 'LOCAL',
  AI = 'AI',
  MULTIPLAYER = 'MULTIPLAYER'
}

// Game difficulty levels for AI mode
export enum Difficulty {
  EASY = 'EASY',
  MEDIUM = 'MEDIUM',
  HARD = 'HARD'
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
                    console.log("Received reset game state:", initialState);
                    
                    // Format the board data properly just like in startNewGame
                    const formattedGameState = {
                        ...initialState,
                        board: initialState.board && (initialState.board.board || Array.isArray(initialState.board)) ? 
                            formatBoardFromBackend(initialState.board.board || initialState.board) : 
                            createMockBoard() // Use mock board if response is malformed
                    };
                    
                    setGameState(formattedGameState);
                })
                .catch(error => {
                    console.error('Error resetting game:', error);
                    // Fallback to client-side implementation if Tauri call fails
                    fallbackToMockData();
                });
            return;
        }
        
        // Fallback for development without Tauri
        fallbackToMockData();
    };
    
    // Start a new game with given configuration
    const startNewGame = (config: GameConfig) => {
        setGameConfig(config);
        setIsLoading(true);
        
        // Process in Rust backend when available
        if (isTauriAvailable) {
            console.log("Starting new game with config:", config);
            
            // Fix: Pass the config object as a single parameter instead of individual properties
            invoke<GameState>('start_new_game', { config })
                .then(newGameState => {
                    console.log("Received new game state:", newGameState);
                    
                    // Make sure we have a valid game state
                    if (!newGameState) {
                        console.error("Received empty game state from backend");
                        fallbackToMockData();
                        return;
                    }
                    
                    // Format the board data properly
                    const formattedGameState = {
                        ...initialState, // Start with a clean slate
                        ...newGameState, // Apply backend state properties
                        board: newGameState.board && (newGameState.board.board || Array.isArray(newGameState.board)) ? 
                            formatBoardFromBackend(newGameState.board.board || newGameState.board) : 
                            createMockBoard() // Use mock board if response is malformed
                    };
                    
                    setGameState(formattedGameState);
                    setIsLoading(false);
                })
                .catch(error => {
                    console.error('Error starting new game:', error);
                    // Fallback to client-side implementation if Tauri call fails
                    fallbackToMockData();
                });
            return;
        }
        
        // Fallback for development without Tauri
        fallbackToMockData();
    };
    
    // Helper function to create a fallback game state
    const fallbackToMockData = () => {
        console.log('Falling back to mock data for game state');
        // Create a mock chess board with pieces
        const mockBoard = createMockBoard();
        setGameState({
            ...initialState,
            board: mockBoard,
            current_player: Color.White,
            game_over: false,
            isCheck: false,
            gameOverMessage: '',
            moveHistory: [],
            selectedSquare: null,
            possibleMoves: []
        });
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
                row.map((cell, x) => {
                    // Check if cell is a piece object or null
                    let piece = null;
                    if (cell) {
                        if (typeof cell === 'object') {
                            // Extract piece information from cell object
                            if (cell.piece_type !== undefined && cell.color !== undefined) {
                                piece = {
                                    piece_type: cell.piece_type,
                                    color: cell.color
                                };
                            } else if (cell.type !== undefined && cell.color !== undefined) {
                                // Alternative naming that might be used in Rust
                                piece = {
                                    piece_type: cell.type,
                                    color: cell.color
                                };
                            }
                        }
                    }
                    
                    return {
                        x: x,
                        y: y,
                        piece: piece,
                        isPossibleMove: false
                    };
                })
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

```

## .\src\types\Color.tsx

```typescript
export enum Color {
    White = 'WHITE',
    Black = 'BLACK',
}

export function isWhite(color: Color | null): boolean {
    return color === Color.White;
}

export function isBlack(color: Color | null): boolean {
    return color === Color.Black;
}

export function oppositeColor(color: Color | null): Color {
    return isWhite(color) ? Color.Black : Color.White;
}
```

## .\src\types\index.tsx

```typescript

export * from "./PieceType";
export * from "./Piece";
export * from "./Color";
export * from "./Sqare";
export * from "./Position";
```

## .\src\types\Piece.tsx

```typescript
import { Color, PieceType } from ".";

export interface Piece {
    piece_type: PieceType;
    color: Color;
}


```

## .\src\types\PieceType.tsx

```typescript


export enum PieceType {
    Pawn, Rook, Knight, Bishop, Queen, King,
}

export function isPawn(pieceType: PieceType): boolean {
    return pieceType === PieceType.Pawn;
}
```

## .\src\types\Position.tsx

```typescript
export interface Position {
    x: number;
    y: number;
}
```

## .\src\types\Sqare.tsx

```typescript
import { Piece } from './Piece';

export interface Square {
    x: number;
    y: number;
    piece: Piece | null;
    isPossibleMove?: boolean; 
}
```

## .\src-tauri\build.rs

```
fn main() {
    tauri_build::build()
}

```

## .\src-tauri\src\commands.rs

```
use crate::game::piece::Position;
use crate::game::state::{GameState, GameConfig, GameMode, Difficulty};
use serde::{Deserialize, Serialize};
use tauri::Manager;

// Store game state between commands
use std::sync::Mutex;
use std::sync::Arc;
use once_cell::sync::Lazy;

// Global game state that persists between commands
static GAME_STATE: Lazy<Arc<Mutex<GameState>>> = Lazy::new(|| {
    Arc::new(Mutex::new(GameState::new()))
});

// Move history for undo functionality
static MOVE_HISTORY: Lazy<Arc<Mutex<Vec<GameState>>>> = Lazy::new(|| {
    Arc::new(Mutex::new(Vec::new()))
});

#[derive(Serialize, Deserialize)]
pub struct MoveResult {
    board: Vec<Vec<Position>>,
    possible_moves: Vec<Position>
}

#[tauri::command]
pub fn get_game_state() -> Result<GameState, String> {
    let state = GAME_STATE.lock().map_err(|_| "Failed to lock game state".to_string())?;
    Ok(state.clone())
}

#[tauri::command]
pub fn select_square(x: usize, y: usize) -> Result<GameState, String> {
    let mut state = GAME_STATE.lock().map_err(|_| "Failed to lock game state".to_string())?;
    let pos = Position::new(x, y);
    
    // Calculate possible moves and update game state
    let moves = state.select_square(pos);
    
    // Return the updated game state
    Ok(state.clone())
}

#[tauri::command]
pub fn move_piece(from_x: usize, from_y: usize, to_x: usize, to_y: usize, app_handle: tauri::AppHandle) -> Result<GameState, String> {
    // Save current state in history for undo
    {
        let current_state = GAME_STATE.lock().map_err(|_| "Failed to lock game state".to_string())?;
        let mut history = MOVE_HISTORY.lock().map_err(|_| "Failed to lock move history".to_string())?;
        history.push(current_state.clone());
        
        // Limit history size to prevent memory issues
        if history.len() > 50 {
            history.remove(0);
        }
    }
    
    // Make the move
    let mut state = GAME_STATE.lock().map_err(|_| "Failed to lock game state".to_string())?;
    let from = Position::new(from_x, from_y);
    let to = Position::new(to_x, to_y);
    
    // Execute the move
    state.move_piece_from(from, to)?;
    
    // Check if AI should make a move
    let should_make_ai_move = state.config.mode == GameMode::AI && 
                              state.current_player != state.config.player_color.unwrap_or_default();
    
    // Return the current state to the client
    let updated_state = state.clone();
    
    // If AI is enabled and it's AI's turn, make an AI move
    if should_make_ai_move {
        // Spawn a new thread for AI calculation to avoid blocking the UI
        let app_handle_clone = app_handle.clone();
        std::thread::spawn(move || {
            // Small delay to allow UI to update
            std::thread::sleep(std::time::Duration::from_millis(500));
            
            // Make AI move in a separate thread
            if let Ok(mut state) = GAME_STATE.lock() {
                match make_ai_move(&mut state) {
                    Ok(()) => {
                        // Notify frontend of AI move
                        let _ = app_handle_clone.emit_all("ai-move", state.clone());
                    },
                    Err(e) => {
                        eprintln!("AI move error: {}", e);
                    }
                }
            }
        });
    }
    
    // For multiplayer, we would handle opponent notification here
    if state.config.mode == GameMode::MULTIPLAYER && state.config.game_id.is_some() {
        // TODO: Send move to server in a real implementation
        // This would typically involve a REST API call or WebSocket message
    }
    
    Ok(updated_state)
}

#[tauri::command]
pub fn undo_move() -> Result<GameState, String> {
    // Get the last state from history
    let mut history = MOVE_HISTORY.lock().map_err(|_| "Failed to lock move history".to_string())?;
    
    if history.is_empty() {
        return Err("No moves to undo".to_string());
    }
    
    let previous_state = history.pop().unwrap();
    
    // Restore the previous state
    let mut state = GAME_STATE.lock().map_err(|_| "Failed to lock game state".to_string())?;
    *state = previous_state;
    
    Ok(state.clone())
}

#[tauri::command]
pub fn reset_game() -> Result<GameState, String> {
    let mut state = GAME_STATE.lock().map_err(|_| "Failed to lock game state".to_string())?;
    *state = GameState::new();
    
    // Clear move history
    let mut history = MOVE_HISTORY.lock().map_err(|_| "Failed to lock move history".to_string())?;
    history.clear();
    
    Ok(state.clone())
}

#[tauri::command]
pub fn start_new_game(config: GameConfig) -> Result<GameState, String> {
    let mut state = GAME_STATE.lock().map_err(|_| "Failed to lock game state".to_string())?;
    *state = GameState::new_with_config(config);
    
    // Clear move history
    let mut history = MOVE_HISTORY.lock().map_err(|_| "Failed to lock move history".to_string())?;
    history.clear();
    
    Ok(state.clone())
}

// Make an AI move based on the current difficulty level
fn make_ai_move(state: &mut GameState) -> Result<(), String> {
    // Simple AI implementation that makes random legal moves
    // In a real implementation, this would use proper chess algorithms
    
    match state.config.difficulty.as_ref() {
        Some(Difficulty::EASY) | None => make_random_move(state),
        Some(Difficulty::MEDIUM) => make_medium_ai_move(state),
        Some(Difficulty::HARD) => make_hard_ai_move(state),
    }
}

// Simple AI that makes random valid moves
fn make_random_move(state: &mut GameState) -> Result<(), String> {
    use rand::seq::SliceRandom;
    
    // Find all pieces of the current player
    let mut all_moves = Vec::new();
    
    for y in 0..8 {
        for x in 0..8 {
            let pos = Position::new(x, y);
            if let Some(piece) = state.board.get_piece(pos) {
                if piece.color == state.current_player {
                    // Calculate possible moves for this piece
                    let moves = state.board.calculate_moves_for(pos);
                    
                    for target_pos in moves {
                        all_moves.push((pos, target_pos));
                    }
                }
            }
        }
    }
    
    // If no moves are available, game is over
    if all_moves.is_empty() {
        return Err("No valid moves for AI".to_string());
    }
    
    // Choose a random move
    let (from, to) = all_moves.choose(&mut rand::thread_rng())
        .ok_or("Failed to select random move".to_string())?;
    
    // Execute the move
    state.move_piece_from(*from, *to)
}

// Medium difficulty AI that prioritizes captures and checks
fn make_medium_ai_move(state: &mut GameState) -> Result<(), String> {
    // For now, just use the random AI
    // This would be expanded in a real implementation
    make_random_move(state)
}

// Hard difficulty AI that uses a more sophisticated evaluation
fn make_hard_ai_move(state: &mut GameState) -> Result<(), String> {
    // For now, just use the random AI
    // This would be expanded in a real implementation
    make_random_move(state)
}

#[tauri::command]
pub fn current_time() -> String {
    let now = chrono::Local::now();
    now.format("%Y-%m-%d %H:%M:%S").to_string()
}

#[tauri::command]
pub fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}


```

## .\src-tauri\src\lib.rs

```

```

## .\src-tauri\src\main.rs

```
// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]
mod commands;
mod game;

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            commands::get_game_state,
            commands::select_square,
            commands::move_piece,
            commands::reset_game,
            commands::undo_move,
            commands::start_new_game,
            commands::current_time,
            commands::greet
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

```

## .\src-tauri\src\game\board.rs

```
use serde::{Deserialize, Serialize};
use super::piece::{Color, Piece, PieceType, Position};

pub const BOARD_SIZE: usize = 8;

/// Represents a chess board with a 2D array of squares
#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct ChessBoard {
    pub board: [[Option<Piece>; 8]; 8],
    pub captured_pieces: Vec<Piece>,
}

impl ChessBoard {
    /// Creates a new chess board with pieces in their initial positions
    pub fn new() -> ChessBoard {
        let mut board = [[None; 8]; 8];
        
        // Setup pawns
        for i in 0..8 {
            board[1][i] = Some(Piece::new(PieceType::Pawn, Color::Black));
            board[6][i] = Some(Piece::new(PieceType::Pawn, Color::White));
        }
        
        // Setup other pieces
        // Black pieces
        board[0][0] = Some(Piece::new(PieceType::Rook, Color::Black));
        board[0][1] = Some(Piece::new(PieceType::Knight, Color::Black));
        board[0][2] = Some(Piece::new(PieceType::Bishop, Color::Black));
        board[0][3] = Some(Piece::new(PieceType::Queen, Color::Black));
        board[0][4] = Some(Piece::new(PieceType::King, Color::Black));
        board[0][5] = Some(Piece::new(PieceType::Bishop, Color::Black));
        board[0][6] = Some(Piece::new(PieceType::Knight, Color::Black));
        board[0][7] = Some(Piece::new(PieceType::Rook, Color::Black));
        
        // White pieces
        board[7][0] = Some(Piece::new(PieceType::Rook, Color::White));
        board[7][1] = Some(Piece::new(PieceType::Knight, Color::White));
        board[7][2] = Some(Piece::new(PieceType::Bishop, Color::White));
        board[7][3] = Some(Piece::new(PieceType::Queen, Color::White));
        board[7][4] = Some(Piece::new(PieceType::King, Color::White));
        board[7][5] = Some(Piece::new(PieceType::Bishop, Color::White));
        board[7][6] = Some(Piece::new(PieceType::Knight, Color::White));
        board[7][7] = Some(Piece::new(PieceType::Rook, Color::White));
        
        ChessBoard {
            board,
            captured_pieces: Vec::new(),
        }
    }
    
    /// Get a reference to the piece at the given position
    pub fn get_piece(&self, pos: Position) -> Option<Piece> {
        if pos.x >= 8 || pos.y >= 8 {
            return None;
        }
        self.board[pos.y][pos.x]
    }
    
    /// Get a reference to the captured pieces
    pub fn get_captured_pieces(&self) -> &Vec<Piece> {
        &self.captured_pieces
    }
    
    /// Calculate valid moves for a specific position
    pub fn calculate_moves_for(&self, pos: Position) -> Vec<Position> {
        // Check if there's a piece at this position
        let piece = match self.get_piece(pos) {
            Some(p) => p,
            None => return Vec::new(),
        };
        
        // Get valid moves for this piece
        piece.get_valid_moves(pos, self)
    }
    
    /// Move a piece from one position to another
    pub fn move_piece(&mut self, from: Position, to: Position) -> Result<(), String> {
        // Validate positions
        if from.x >= 8 || from.y >= 8 || to.x >= 8 || to.y >= 8 {
            return Err("Invalid position".to_string());
        }
        
        // Get the piece
        let piece = match self.board[from.y][from.x] {
            Some(p) => p,
            None => return Err("No piece at source position".to_string()),
        };
        
        // If there's a piece at the destination, capture it
        if let Some(captured) = self.board[to.y][to.x] {
            self.captured_pieces.push(captured);
        }
        
        // Move the piece
        self.board[to.y][to.x] = Some(piece);
        self.board[from.y][from.x] = None;
        
        Ok(())
    }
    
    /// Check if the king of a specific color is in check
    pub fn is_king_in_check(&self, color: Color) -> bool {
        // Find the king
        let mut king_pos = None;
        for y in 0..8 {
            for x in 0..8 {
                if let Some(piece) = self.board[y][x] {
                    if piece.piece_type == PieceType::King && piece.color == color {
                        king_pos = Some(Position::new(x, y));
                        break;
                    }
                }
            }
            if king_pos.is_some() {
                break;
            }
        }
        
        let king_pos = match king_pos {
            Some(pos) => pos,
            None => return false, // No king found
        };
        
        // Check if any opponent piece can attack the king
        for y in 0..8 {
            for x in 0..8 {
                if let Some(piece) = self.board[y][x] {
                    if piece.color != color {
                        let moves = piece.get_valid_moves(Position::new(x, y), self);
                        if moves.contains(&king_pos) {
                            return true; // King is in check
                        }
                    }
                }
            }
        }
        
        false // King is not in check
    }
}
```

## .\src-tauri\src\game\mod.rs

```
pub mod board;
pub mod piece;
pub mod state;

```

## .\src-tauri\src\game\piece.rs

```
use serde::{Serialize, Deserialize};

use super::board::BOARD_SIZE;


#[derive(Serialize, Deserialize, Clone, Copy, Debug, PartialEq)]
pub enum PieceType {
    Pawn, Rook, Knight, Bishop, Queen, King,
}

impl PieceType {
    pub fn is_pawn(&self) -> bool {
        matches!(self, PieceType::Pawn)
    }
    
    pub fn to_string(&self) -> String {
        match self {
            PieceType::Pawn => "Pawn".to_string(),
            PieceType::Rook => "Rook".to_string(),
            PieceType::Knight => "Knight".to_string(),
            PieceType::Bishop => "Bishop".to_string(),
            PieceType::Queen => "Queen".to_string(),
            PieceType::King => "King".to_string(),
        }
    }
}

#[derive(Serialize, Deserialize, Clone, Copy, Debug, PartialEq)]
pub enum Color {
    White, Black,
}

impl Color {
    pub fn opposite(&self) -> Self {
        match self {
            Color::White => Color::Black,
            Color::Black => Color::White,
        }
    }
}

impl Default for Color {
    fn default() -> Self {
        Color::White
    }
}

#[derive(Serialize, Deserialize, Clone, Copy, Debug, PartialEq)]
pub struct Position {
    pub x: usize,
    pub y: usize,
}

impl Position {
    pub fn new(x: usize, y: usize) -> Self {
        Position { x, y }
    }
    
    /// Safely adds delta to the position coordinates, returns None if out of bounds
    pub fn apply_delta(&self, dx: i32, dy: i32) -> Option<Position> {
        let new_x = self.x as i32 + dx;
        let new_y = self.y as i32 + dy;
        
        if new_x >= 0 && new_x < BOARD_SIZE as i32 && new_y >= 0 && new_y < BOARD_SIZE as i32 {
            Some(Position::new(new_x as usize, new_y as usize))
        } else {
            None
        }
    }
}


#[derive(Serialize, Deserialize, Clone, Copy, Debug)]
pub struct Piece {
    pub piece_type: PieceType,
    pub color: Color,
}

impl Piece {
    pub fn new(piece_type: PieceType, color: Color) -> Self {
        Piece { piece_type, color }
    }
    
    // Get valid moves for this piece at the given position on the given board
    pub fn get_valid_moves(&self, position: Position, board: &super::board::ChessBoard) -> Vec<Position> {
        let mut positions = Vec::new();
        
        match self.piece_type {
            PieceType::Knight => {
                let knight_moves = [
                    (2, 1), (2, -1), (-2, 1), (-2, -1),
                    (1, 2), (1, -2), (-1, 2), (-1, -2),
                ];
                for (dx, dy) in knight_moves {
                    if let Some(new_pos) = position.apply_delta(dx, dy) {
                        // Can move to empty square or capture opponent's piece
                        match board.get_piece(new_pos) {
                            Some(piece) if piece.color != self.color => {
                                // Can capture
                                positions.push(new_pos);
                            },
                            None => {
                                // Empty square
                                positions.push(new_pos);
                            },
                            _ => {}
                        }
                    }
                }
            },
            PieceType::Pawn => {
                let direction = if self.color == Color::White { -1 } else { 1 };
                let start_row = if self.color == Color::White { 6 } else { 1 };
                
                // Forward moves (only empty squares)
                if let Some(new_pos) = position.apply_delta(0, direction) {
                    if board.get_piece(new_pos).is_none() {
                        positions.push(new_pos);
                        
                        // Double forward from starting position
                        if position.y == start_row {
                            if let Some(double_pos) = position.apply_delta(0, 2 * direction) {
                                if board.get_piece(double_pos).is_none() {
                                    positions.push(double_pos);
                                }
                            }
                        }
                    }
                }
                
                // Capture moves (diagonally)
                for dx in [-1, 1] {
                    if let Some(capture_pos) = position.apply_delta(dx, direction) {
                        if let Some(piece) = board.get_piece(capture_pos) {
                            if piece.color != self.color {
                                positions.push(capture_pos);
                            }
                        }
                    }
                }
            },
            PieceType::Rook => {
                add_line_moves(&[(0, 1), (1, 0), (0, -1), (-1, 0)], position, board, self.color, &mut positions);
            },
            PieceType::Bishop => {
                add_line_moves(&[(1, 1), (1, -1), (-1, -1), (-1, 1)], position, board, self.color, &mut positions);
            },
            PieceType::Queen => {
                add_line_moves(&[(1, 1), (1, 0), (1, -1), (0, 1), (0, -1), (-1, 1), (-1, 0), (-1, -1)], position, board, self.color, &mut positions);
            },
            PieceType::King => {
                let king_moves = [
                    (1, 1), (1, 0), (1, -1), (0, 1), (0, -1), (-1, 1), (-1, 0), (-1, -1),
                ];
                for (dx, dy) in king_moves {
                    if let Some(new_pos) = position.apply_delta(dx, dy) {
                        // Can move to empty square or capture opponent's piece
                        match board.get_piece(new_pos) {
                            Some(piece) if piece.color != self.color => {
                                // Can capture
                                positions.push(new_pos);
                            },
                            None => {
                                // Empty square
                                positions.push(new_pos);
                            },
                            _ => {}
                        }
                    }
                }
            },
        }

        positions
    }
}

// Helper function to add line moves (for rook, bishop, queen)
fn add_line_moves(directions: &[(i32, i32)], position: Position, board: &super::board::ChessBoard, color: Color, positions: &mut Vec<Position>) {
    for &(dx, dy) in directions {
        let mut step = 1;
        loop {
            let new_x = position.x as i32 + dx * step;
            let new_y = position.y as i32 + dy * step;
            
            // Check if out of bounds
            if new_x < 0 || new_x >= 8 || new_y < 0 || new_y >= 8 {
                break;
            }
            
            let new_pos = Position::new(new_x as usize, new_y as usize);
            
            match board.get_piece(new_pos) {
                Some(piece) => {
                    if piece.color != color {
                        // Can capture opponent's piece
                        positions.push(new_pos);
                    }
                    // Stop in either case (can't jump over pieces)
                    break;
                },
                None => {
                    // Empty square, add and continue
                    positions.push(new_pos);
                    step += 1;
                }
            }
        }
    }
}
```

## .\src-tauri\src\game\state.rs

```
use serde::{Deserialize, Serialize};

use super::board::ChessBoard;
use super::piece::{Color, Position};

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq)]
pub enum GameMode {
    LOCAL,
    AI,
    MULTIPLAYER
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq)]
pub enum Difficulty {
    EASY,
    MEDIUM,
    HARD
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct GameConfig {
    pub mode: GameMode,
    pub difficulty: Option<Difficulty>,
    pub player_color: Option<Color>,
    pub game_id: Option<String>,
}

impl Default for GameConfig {
    fn default() -> Self {
        GameConfig {
            mode: GameMode::LOCAL,
            difficulty: None,
            player_color: None,
            game_id: None,
        }
    }
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct GameState {
    pub board: ChessBoard,
    pub current_player: Color,
    pub selected_square: Option<Position>,
    pub possible_moves: Vec<Position>,
    pub game_over: bool,
    pub winner: Option<Color>,
    pub is_check: bool,
    pub config: GameConfig,
    pub move_history: Vec<String>,
}

impl GameState {
    pub fn new() -> GameState {
        GameState {
            board: ChessBoard::new(),
            current_player: Color::White,
            selected_square: None,
            possible_moves: Vec::new(),
            game_over: false,
            winner: None,
            is_check: false,
            config: GameConfig::default(),
            move_history: Vec::new(),
        }
    }
    
    pub fn new_with_config(config: GameConfig) -> GameState {
        let mut state = GameState::new();
        state.config = config;
        state
    }
    
    /// Select a square on the board, calculating possible moves
    pub fn select_square(&mut self, pos: Position) -> Vec<Position> {
        // Check if there's a piece at this position and it belongs to current player
        if let Some(piece) = self.board.get_piece(pos) {
            if piece.color == self.current_player {
                self.selected_square = Some(pos);
                self.possible_moves = self.board.calculate_moves_for(pos);
                return self.possible_moves.clone();
            }
        }
        
        // If no valid piece, clear selection
        self.selected_square = None;
        self.possible_moves.clear();
        Vec::new()
    }
    
    /// Move a piece from the selected square to the target position
    pub fn move_piece(&mut self, to: Position) -> Result<(), String> {
        let from = match self.selected_square {
            Some(pos) => pos,
            None => return Err("No square selected".to_string()),
        };
        
        self.move_piece_from(from, to)
    }
    
    /// Move a piece directly from one position to another
    pub fn move_piece_from(&mut self, from: Position, to: Position) -> Result<(), String> {
        // Check if the move is valid
        let moves = self.board.calculate_moves_for(from);
        if !moves.contains(&to) {
            return Err("Invalid move".to_string());
        }
        
        // Get the piece at the source position for move notation
        let source_piece = self.board.get_piece(from)
            .ok_or("No piece at source position".to_string())?;
        
        // Check if there's a piece at the target position (capture)
        let is_capture = self.board.get_piece(to).is_some();
        
        // Move the piece
        self.board.move_piece(from, to)?;
        
        // Generate move notation (simplified)
        let notation = self.generate_move_notation(source_piece.piece_type.to_string(), from, to, is_capture);
        self.move_history.push(notation);
        
        // Check if this is a winning move (king capture)
        if is_capture {
            // If we captured a king, game is over
            if let Some(captured) = self.board.get_captured_pieces().last() {
                if captured.piece_type.to_string().contains("King") {
                    self.game_over = true;
                    self.winner = Some(self.current_player);
                }
            }
        }
        
        // Check for check
        let opponent_color = if self.current_player == Color::White { Color::Black } else { Color::White };
        self.is_check = self.board.is_king_in_check(opponent_color);
        
        // Switch player
        self.current_player = match self.current_player {
            Color::White => Color::Black,
            Color::Black => Color::White,
        };
        
        // Clear selection and possible moves
        self.selected_square = None;
        self.possible_moves.clear();
        
        Ok(())
    }
    
    // Generate algebraic notation for a move
    fn generate_move_notation(&self, piece_name: String, from: Position, to: Position, is_capture: bool) -> String {
        // Convert position to algebraic notation (a1, b2, etc)
        let files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
        let ranks = ['8', '7', '6', '5', '4', '3', '2', '1'];
        
        // Get the piece symbol (except for pawns)
        let piece_symbol = if piece_name.contains("Pawn") {
            "".to_string()
        } else if piece_name.contains("Knight") {
            "N".to_string()
        } else {
            piece_name.chars().next().unwrap_or('P').to_string()
        };
        
        // Generate the notation
        let from_file = files[from.x];
        let from_rank = ranks[from.y];
        let to_file = files[to.x];
        let to_rank = ranks[to.y];
        let capture_symbol = if is_capture { "x" } else { "-" };
        
        format!("{}{}{}{}{}{}", piece_symbol, from_file, from_rank, capture_symbol, to_file, to_rank)
    }
}



```

## .\src-tauri\src\game\utils.rs

```
use super::piece::{Piece, PieceType, Color};

/// Returns the initial piece setup for a given position.
pub fn initial_piece_setup(col: usize, row: usize) -> Option<Piece> {
    let color = if row < 2 { Color::White } else { Color::Black };
    match (row, col) {
        // Pawns
        (1, _) | (6, _) => Some(Piece { piece_type: PieceType::Pawn, color }),
        // Rooks
        (0, 0) | (0, 7) | (7, 0) | (7, 7) => Some(Piece { piece_type: PieceType::Rook, color }),
        // Knights
        (0, 1) | (0, 6) | (7, 1) | (7, 6) => Some(Piece { piece_type: PieceType::Knight, color }),
        // Bishops
        (0, 2) | (0, 5) | (7, 2) | (7, 5) => Some(Piece { piece_type: PieceType::Bishop, color }),
        // Queens
        (0, 3) | (7, 3) => Some(Piece { piece_type: PieceType::Queen, color }),
        // Kings
        (0, 4) | (7, 4) => Some(Piece { piece_type: PieceType::King, color }),
        _ => None,
    }
}

```

