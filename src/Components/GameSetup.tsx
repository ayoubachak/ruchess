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