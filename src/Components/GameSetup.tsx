import React, { useState, useEffect } from 'react';
import { useChess } from '../Context/ChessContext';
import { GameMode, Difficulty } from '../services/game/GameState';
import { Color } from '../types';

interface GameSetupProps {
    onClose: () => void;
    isTauriAvailable: boolean;
}

const GameSetup: React.FC<GameSetupProps> = ({ onClose, isTauriAvailable }) => {
    const { 
        startNewGame, 
        createMultiplayerGame, 
        joinMultiplayerGame,
        sessions,
        activeSessionId,
        switchSession,
        endSession,
        createSession
    } = useChess();
    
    const [selectedDifficulty, setSelectedDifficulty] = useState<Difficulty>(Difficulty.MEDIUM);
    const [selectedColor, setSelectedColor] = useState<Color>(Color.White);
    const [isClosing, setIsClosing] = useState(false);
    const [activeTab, setActiveTab] = useState<'local' | 'ai' | 'online' | 'sessions'>('local');
    
    // For multiplayer
    const [roomId, setRoomId] = useState<string>('');
    const [isCreatingRoom, setIsCreatingRoom] = useState<boolean>(false);
    const [isJoiningRoom, setIsJoiningRoom] = useState<boolean>(false);
    const [errorMessage, setErrorMessage] = useState<string>('');
    
    // Reset tab if AI tab is selected but Tauri is not available
    useEffect(() => {
        if (activeTab === 'ai' && !isTauriAvailable) {
            setActiveTab('local');
        }
    }, [activeTab, isTauriAvailable]);
    
    // Handle starting a new game with AI
    const handleStartAIGame = async () => {
        if (!isTauriAvailable) {
            setErrorMessage('AI mode requires the Tauri backend, which is not available in the web version.');
            return;
        }
        
        await startNewGame({
            mode: GameMode.AI,
            difficulty: selectedDifficulty,
            playerColor: selectedColor,
        });
        
        handleClose();
    };
    
    // Handle starting a new local game
    const handleStartLocalGame = async () => {
        await startNewGame({
            mode: GameMode.LOCAL,
        });
        
        handleClose();
    };
    
    // Handle creating a multiplayer game
    const handleCreateMultiplayerGame = async () => {
        try {
            setIsCreatingRoom(true);
            setErrorMessage('');
            
            const newRoomId = await createMultiplayerGame(selectedColor);
            setRoomId(newRoomId);
            
            // Display the room ID to the user
            navigator.clipboard.writeText(`${window.location.origin}/join/${newRoomId}`)
                .then(() => {
                    alert(`Room created! The link has been copied to your clipboard.\nShare this link with your opponent: ${window.location.origin}/join/${newRoomId}`);
                    handleClose();
                })
                .catch(err => {
                    alert(`Room created! Share this ID with your opponent: ${newRoomId}`);
                    handleClose();
                });
        } catch (error) {
            console.error('Error creating multiplayer game:', error);
            setErrorMessage('Failed to create game room. Please try again.');
        } finally {
            setIsCreatingRoom(false);
        }
    };
    
    // Handle joining a multiplayer game
    const handleJoinMultiplayerGame = () => {
        if (!roomId.trim()) {
            setErrorMessage('Please enter a valid room ID');
            return;
        }
        
        try {
            setIsJoiningRoom(true);
            setErrorMessage('');
            
            joinMultiplayerGame(roomId.trim());
            handleClose();
        } catch (error) {
            console.error('Error joining multiplayer game:', error);
            setErrorMessage('Failed to join game room. Please check the room ID and try again.');
        } finally {
            setIsJoiningRoom(false);
        }
    };
    
    // Handle creating a new game session
    const handleCreateSession = async (mode: GameMode) => {
        try {
            if (mode === GameMode.AI && !isTauriAvailable) {
                setErrorMessage('AI mode requires the Tauri backend, which is not available in the web version.');
                return;
            }
            
            const config = {
                mode,
                difficulty: mode === GameMode.AI ? selectedDifficulty : undefined,
                playerColor: mode === GameMode.AI ? selectedColor : undefined
            };
            
            await createSession(config);
            handleClose();
        } catch (error) {
            console.error('Error creating game session:', error);
            setErrorMessage('Failed to create game session. Please try again.');
        }
    };
    
    // Handle switching to a different game session
    const handleSwitchSession = (sessionId: string) => {
        switchSession(sessionId);
        handleClose();
    };
    
    // Handle deleting a game session
    const handleDeleteSession = (e: React.MouseEvent, sessionId: string) => {
        e.stopPropagation(); // Prevent triggering the parent click handler
        
        if (window.confirm('Are you sure you want to delete this game session?')) {
            endSession(sessionId);
        }
    };
    
    // Handle closing the panel with animation
    const handleClose = () => {
        setIsClosing(true);
        setTimeout(() => onClose(), 300);
    };
    
    // Format the session creation date
    const formatSessionDate = (date: Date) => {
        return new Date(date).toLocaleString();
    };
    
    // Get game mode display name
    const getGameModeDisplay = (mode: GameMode) => {
        switch (mode) {
            case GameMode.LOCAL:
                return 'Local Game';
            case GameMode.AI:
                return 'vs. AI';
            case GameMode.MULTIPLAYER:
                return 'Multiplayer';
            default:
                return mode;
        }
    };
    
    return (
        <div className={`game-options-panel ${isClosing ? 'fade-out' : ''}`}>
            <div className="panel-header">
                <h3>Chess Game Options</h3>
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
                    className={`tab ${activeTab === 'ai' ? 'active' : ''} ${!isTauriAvailable ? 'disabled-option' : ''}`}
                    onClick={() => isTauriAvailable ? setActiveTab('ai') : null}
                    title={!isTauriAvailable ? "AI mode requires the desktop version" : ""}
                >
                    VS AI {!isTauriAvailable && <span>(Desktop only)</span>}
                </button>
                <button 
                    className={`tab ${activeTab === 'online' ? 'active' : ''}`}
                    onClick={() => setActiveTab('online')}
                >
                    Online
                </button>
                <button 
                    className={`tab ${activeTab === 'sessions' ? 'active' : ''}`}
                    onClick={() => setActiveTab('sessions')}
                >
                    Sessions
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
                        {!isTauriAvailable ? (
                            <div className="tauri-unavailable-message">
                                <p>AI mode requires the desktop version of the app with Tauri backend.</p>
                                <p>Please download and install the desktop version to play against AI.</p>
                            </div>
                        ) : (
                            <>
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
                            </>
                        )}
                    </div>
                )}
                
                {activeTab === 'online' && (
                    <div className="tab-content">
                        <div className="multiplayer-options">
                            <div className="create-game-section">
                                <h4>Create a Game</h4>
                                <div className="option-group">
                                    <label>Play as:</label>
                                    <div className="color-options">
                                        <div 
                                            onClick={() => setSelectedColor(Color.White)}
                                            className={`color-option white ${selectedColor === Color.White ? 'selected' : ''}`}
                                        >
                                            White
                                        </div>
                                        <div 
                                            onClick={() => setSelectedColor(Color.Black)}
                                            className={`color-option black ${selectedColor === Color.Black ? 'selected' : ''}`}
                                        >
                                            Black
                                        </div>
                                    </div>
                                </div>
                                <button 
                                    className="primary-button"
                                    onClick={handleCreateMultiplayerGame}
                                    disabled={isCreatingRoom}
                                >
                                    {isCreatingRoom ? 'Creating...' : 'Create Game'}
                                </button>
                            </div>
                            
                            <div className="divider">OR</div>
                            
                            <div className="join-game-section">
                                <h4>Join a Game</h4>
                                <div className="option-group">
                                    <label>Room ID or Link:</label>
                                    <input 
                                        type="text" 
                                        placeholder="Enter room ID or paste link"
                                        value={roomId}
                                        onChange={(e) => {
                                            // Extract room ID from link if necessary
                                            const input = e.target.value;
                                            if (input.includes('/join/')) {
                                                const parts = input.split('/join/');
                                                setRoomId(parts[1]);
                                            } else {
                                                setRoomId(input);
                                            }
                                        }}
                                    />
                                </div>
                                <button 
                                    className="primary-button highlight"
                                    onClick={handleJoinMultiplayerGame}
                                    disabled={isJoiningRoom || !roomId.trim()}
                                >
                                    {isJoiningRoom ? 'Joining...' : 'Join Game'}
                                </button>
                            </div>
                        </div>
                        
                        {errorMessage && (
                            <div className="error-message">
                                {errorMessage}
                            </div>
                        )}
                    </div>
                )}
                
                {activeTab === 'sessions' && (
                    <div className="tab-content">
                        <h4>Game Sessions</h4>
                        <p>Manage your active game sessions. You can have multiple games running simultaneously.</p>
                        
                        <div className="session-list">
                            {sessions.length === 0 ? (
                                <p className="no-sessions">No active game sessions. Start a new game to create one.</p>
                            ) : (
                                sessions.map(session => (
                                    <div 
                                        key={session.id} 
                                        className={`session-item ${session.id === activeSessionId ? 'active' : ''}`}
                                        onClick={() => handleSwitchSession(session.id)}
                                    >
                                        <div className="session-info">
                                            <div className="session-mode">
                                                {getGameModeDisplay(session.config.mode)}
                                                {session.config.difficulty && ` (${session.config.difficulty})`}
                                            </div>
                                            <div className="session-date">
                                                Created: {formatSessionDate(session.createdAt)}
                                            </div>
                                        </div>
                                        <button 
                                            className="delete-session" 
                                            onClick={(e) => handleDeleteSession(e, session.id)}
                                            title="Delete session"
                                        >
                                            ×
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                        
                        <div className="new-session-options">
                            <h4>Create New Session</h4>
                            <div className="session-buttons">
                                <button 
                                    className="session-button" 
                                    onClick={() => handleCreateSession(GameMode.LOCAL)}
                                >
                                    Local Game
                                </button>
                                <button 
                                    className={`session-button ${!isTauriAvailable ? 'disabled-option' : ''}`}
                                    onClick={() => isTauriAvailable ? handleCreateSession(GameMode.AI) : null}
                                    title={!isTauriAvailable ? "AI mode requires the desktop version" : ""}
                                >
                                    AI Game {!isTauriAvailable && <span>(Desktop only)</span>}
                                </button>
                                <button 
                                    className="session-button" 
                                    onClick={() => setActiveTab('online')}
                                >
                                    Multiplayer Game
                                </button>
                            </div>
                        </div>
                        
                        {errorMessage && (
                            <div className="error-message">
                                {errorMessage}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default GameSetup;