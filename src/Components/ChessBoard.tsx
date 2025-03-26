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
    
    // Auto-initialize the board if it's empty (fix for "board data not available" error)
    useEffect(() => {
        if (!isLoading && (!gameState.board || gameState.board.length === 0)) {
            console.log('Board data is not available, initializing game...');
            resetGame();
        }
    }, [isLoading, gameState.board, resetGame]);
    
    // Safely render the board when gameState updates
    useEffect(() => {
        if (!isLoading && gameState && gameState.board && gameState.board.length > 0) {
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
        return <div className="flex justify-center items-center p-10 text-lg font-medium text-gray-700 dark:text-gray-300 animate-pulse">Loading chessboard...</div>;
    }

    // Check if gameState is properly initialized
    if (!gameState || !gameState.board) {
        return (
            <div className="flex flex-col items-center justify-center p-10">
                <div className="bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 rounded-lg p-4 mb-4">
                    Error: Game state is not properly initialized
                </div>
                <button
                    className="btn btn-primary"
                    onClick={resetGame}
                >
                    Initialize Game
                </button>
            </div>
        );
    }

    // Safely access the board dimensions with fallbacks
    const rows = gameState.board.length || 0;
    if (rows === 0) {
        return (
            <div className="flex flex-col items-center justify-center p-10">
                <div className="bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 rounded-lg p-4 mb-4">
                    Error: Chess board data is not available
                </div>
                <button
                    className="btn btn-primary"
                    onClick={resetGame}
                >
                    Initialize Game
                </button>
            </div>
        );
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
            selectSquare(x, y);
            return;
        }
        
        // Case 3: Clicking on an empty square or opponent's piece when no move is possible
        // Just clear the selection
        if (gameState.selectedSquare) {
            selectSquare(null, null); // Send null to clear selection
            return;
        }
    };
    
    // Handle board orientation based on player color in multiplayer or AI mode
    const shouldFlipBoard = gameConfig.mode !== GameMode.LOCAL && 
        gameConfig.playerColor === Color.Black;
    
    // Get the current player displayed text
    const currentPlayerText = (() => {
        let text = `Current player: ${gameState.current_player === Color.White ? 'White' : 'Black'}`;
        
        if (gameConfig.mode === GameMode.MULTIPLAYER) {
            text += isMyTurn ? ' (Your turn)' : ' (Opponent\'s turn)';
        }
        
        return text;
    })();

    return (
        <div className="flex flex-col items-center w-full">
            <div className="w-full max-w-lg mb-4 px-4">
                <div className="flex justify-between items-center mb-2">
                    <div className="font-medium text-gray-800 dark:text-gray-200">
                        {currentPlayerText}
                        {gameState.isCheck && 
                            <span className="ml-2 text-red-600 dark:text-red-400 font-bold animate-pulse">CHECK!</span>
                        }
                    </div>
                    
                    <div className="py-1 px-3 bg-gray-100 dark:bg-gray-700 text-center rounded-md text-sm font-medium text-gray-800 dark:text-gray-200">
                        {gameConfig.mode === GameMode.AI ? 
                            `AI (${gameConfig.difficulty})` : 
                            (gameConfig.mode === GameMode.MULTIPLAYER ? 'Multiplayer' : 'Local')}
                    </div>
                </div>
                
                {gameConfig.mode === GameMode.MULTIPLAYER && (
                    <MultiplayerStatus 
                        networkStatus={networkStatus}
                        roomInfo={roomInfo}
                    />
                )}
                
                {isTauriAvailable ? (
                    <div className="mt-2 py-1 px-3 text-sm bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-400 rounded-md">
                        Connected to Tauri backend
                    </div>
                ) : (
                    <div className="mt-2 py-1 px-3 text-sm bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-400 rounded-md">
                        Development mode (no Tauri)
                    </div>
                )}
                
                <div className="flex gap-2 mt-4 mb-4">
                    <button 
                        className="btn btn-primary"
                        onClick={() => setShowNewGameOptions(true)}
                    >
                        New Game
                    </button>
                    <button 
                        className="btn btn-secondary"
                        onClick={resetGame}
                    >
                        Reset
                    </button>
                    <button 
                        className="btn btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
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
                            className="btn btn-danger ml-auto"
                            onClick={leaveMultiplayerGame}
                        >
                            Leave Game
                        </button>
                    )}
                </div>
            </div>
            
            {showNewGameOptions && (
                <GameSetup 
                    onClose={handleCloseOverlay}
                    isTauriAvailable={isTauriAvailable}
                />
            )}
            
            {gameState.game_over && (
                <div className="mb-4 py-3 px-4 bg-indigo-600 text-white rounded-md text-center text-lg font-bold shadow-lg">
                    {gameState.gameOverMessage || 'Game Over!'}
                </div>
            )}
            
            <div
                className={`grid gap-0 shadow-xl rounded-md overflow-hidden ${shouldFlipBoard ? 'transform rotate-180' : ''}`}
                style={{
                    gridTemplateColumns: `repeat(${cols}, minmax(40px, 60px))`,
                    gridTemplateRows: `repeat(${rows}, minmax(40px, 60px))`,
                    width: 'fit-content',
                    height: 'fit-content',
                }}
            >
                {boardElements}
            </div>

            {gameState.moveHistory && gameState.moveHistory.length > 0 && (
                <div className="w-full max-w-md mt-6 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 shadow-sm">
                    <h3 className="text-lg font-medium p-3 border-b border-gray-200 dark:border-gray-700 text-center text-gray-800 dark:text-gray-200">
                        Move History
                    </h3>
                    <div className="grid grid-cols-2 gap-1 p-2 max-h-44 overflow-y-auto">
                        {gameState.moveHistory.map((move, index) => (
                            <div 
                                key={index} 
                                className={`p-2 rounded text-sm font-mono ${
                                    index % 4 < 2 ? 'bg-gray-50 dark:bg-gray-700' : 'bg-white dark:bg-gray-800'
                                } text-gray-800 dark:text-gray-300`}
                            >
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
