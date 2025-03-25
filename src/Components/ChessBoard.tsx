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
        undoMove
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
            selectSquare(x, y);
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

