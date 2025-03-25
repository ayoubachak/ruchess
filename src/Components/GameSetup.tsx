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
    
    return (
        <div className={`game-options-panel ${isClosing ? 'fade-out' : ''}`}>
            <div className="panel-header">
                <h3>New Game Options</h3>
                <button className="close-button" onClick={handleClose}>×</button>
            </div>
            
            <div className="game-options">
                <button 
                    onClick={handleStartLocalGame} 
                    className="primary-button"
                >
                    Local Game (2 Players)
                </button>
                
                <div className="option-group">
                    <label>Play Against AI:</label>
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
                
                {isTauriAvailable && (
                    <div className="option-group">
                        <label>Online:</label>
                        <div className="disabled-option">
                            Multiplayer (Coming Soon)
                            <span className="tooltip">Online multiplayer will be available in a future update</span>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default GameSetup; 