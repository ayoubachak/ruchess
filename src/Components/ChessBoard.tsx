import React, { useState, useEffect } from 'react';
import Square from './Square';
import GameSetup from './GameSetup';
import { useChess } from '../Context/ChessContext';
import { Color, Position } from '../types';
import { GameMode, Difficulty } from '../services/game/GameState';
import MultiplayerStatus from './MultiplayerStatus';

const Chessboard: React.FC = () => {
    const { 
        gameState, 
        gameConfig,
        isLoading,
        isTauriAvailable,
        networkStatus,
        roomInfo,
        selectSquare,
        resetGame,
        startNewGame,
        undoMove,
        movePiece,
        leaveMultiplayerGame,
        sessions
    } = useChess();
    
    // Show game options on first load if no active game is in progress
    const [showNewGameOptions, setShowNewGameOptions] = useState(() => {
        // Show the options panel if no game sessions exist or only default one exists
        return sessions.length === 0;
    });
    const [isOverlayClosing, setIsOverlayClosing] = useState(false);
    const [boardElements, setBoardElements] = useState<JSX.Element[]>([]);
    
    // Show game setup when there are no sessions
    useEffect(() => {
        if (sessions.length === 0 && !showNewGameOptions && !isOverlayClosing) {
            setShowNewGameOptions(true);
        }
    }, [sessions, showNewGameOptions, isOverlayClosing]);
    
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
    
    // Check if current player is "me" in multiplayer mode
    const isMyTurn = gameConfig.mode !== GameMode.MULTIPLAYER || 
        (gameState.current_player === gameConfig.playerColor);
    
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
        // In multiplayer mode, prevent moves if it's not your turn
        if (gameConfig.mode === GameMode.MULTIPLAYER && !isMyTurn) {
            return; // Not your turn
        }
        
        if (!gameState) return;
        
        const clickedSquare = gameState.board[y][x];
        const isPossibleMove = gameState.possibleMoves.some(move => move.x === x && move.y === y);
        
        // Case 1: Clicking on a possible move destination - execute the move
        if (gameState.selectedSquare && isPossibleMove) {
            console.log("Moving piece to possible move destination");
            movePiece(
                gameState.selectedSquare.x, 
                gameState.selectedSquare.y, 
                x, 
                y
            );
            return;
        }
        
        // Case 2: Clicking on own piece - select it and show possible moves
        if (clickedSquare.piece && clickedSquare.piece.color === gameState.current_player) {
            console.log("Selecting piece and showing possible moves");
            selectSquare(x, y);
            return;
        }
        
        // Case 3: Clicking on an empty square or opponent's piece when no move is possible
        // Just clear the selection
        if (gameState.selectedSquare) {
            console.log("Clearing selection");
            selectSquare(null, null); // Send null to clear selection
            return;
        }
    };
    
    // Handle board orientation based on player color in multiplayer or AI mode
    const shouldFlipBoard = gameConfig.mode !== GameMode.LOCAL && 
        gameConfig.playerColor === Color.Black;
    
    // Get the board class with potential flip
    const boardClass = `chess-board ${shouldFlipBoard ? 'flipped' : ''}`;
    
    // Get the current player displayed text
    const currentPlayerText = (() => {
        let text = `Current player: ${gameState.current_player === Color.White ? 'White' : 'Black'}`;
        
        if (gameConfig.mode === GameMode.MULTIPLAYER) {
            text += isMyTurn ? ' (Your turn)' : ' (Opponent\'s turn)';
        }
        
        return text;
    })();

    return (
        <div className="chess-board-container">
            <div className="chess-game-info">
                <div className="current-player">
                    {currentPlayerText}
                    {gameState.isCheck && <span className="check-indicator"> - CHECK!</span>}
                </div>
                
                <div className="game-mode-indicator">
                    Mode: {gameConfig.mode === GameMode.AI ? 
                        `AI (${gameConfig.difficulty})` : 
                        (gameConfig.mode === GameMode.MULTIPLAYER ? 'Multiplayer' : 'Local')}
                </div>
                
                {gameConfig.mode === GameMode.MULTIPLAYER && (
                    <MultiplayerStatus 
                        networkStatus={networkStatus}
                        roomInfo={roomInfo}
                    />
                )}
                
                {isTauriAvailable ? (
                    <div className="tauri-status connected">Connected to Tauri backend</div>
                ) : (
                    <div className="tauri-status dev-mode">Development mode (no Tauri)</div>
                )}
            </div>
            
            <div className="game-controls">
                <button 
                    className="control-button"
                    onClick={() => setShowNewGameOptions(true)}
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
                    disabled={
                        gameConfig.mode === GameMode.MULTIPLAYER ||
                        !gameState.moveHistory || 
                        gameState.moveHistory.length === 0
                    }
                >
                    Undo
                </button>
                
                {gameConfig.mode === GameMode.MULTIPLAYER && (
                    <button 
                        className="control-button leave-game"
                        onClick={leaveMultiplayerGame}
                    >
                        Leave Game
                    </button>
                )}
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
                className={boardClass}
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
