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
        <div className={`fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 ${isClosing ? 'animate-fade-out' : 'animate-fade-in'}`}>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-lg overflow-hidden transform transition-all">
                <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white">Chess Game Options</h3>
                    <button 
                        className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300 focus:outline-none" 
                        onClick={handleClose}
                    >
                        <span className="text-2xl">&times;</span>
                    </button>
                </div>
                
                <div className="flex border-b border-gray-200 dark:border-gray-700">
                    <button 
                        className={`px-4 py-2 font-medium text-sm focus:outline-none ${
                            activeTab === 'local' 
                                ? 'text-blue-600 border-b-2 border-blue-600 dark:text-blue-400 dark:border-blue-400' 
                                : 'text-gray-600 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                        }`}
                        onClick={() => setActiveTab('local')}
                    >
                        Local Game
                    </button>
                    <button 
                        className={`px-4 py-2 font-medium text-sm focus:outline-none ${
                            !isTauriAvailable ? 'cursor-not-allowed opacity-50' : ''
                        } ${
                            activeTab === 'ai' 
                                ? 'text-blue-600 border-b-2 border-blue-600 dark:text-blue-400 dark:border-blue-400' 
                                : 'text-gray-600 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                        }`}
                        onClick={() => isTauriAvailable ? setActiveTab('ai') : null}
                        title={!isTauriAvailable ? "AI mode requires the desktop version" : ""}
                    >
                        VS AI {!isTauriAvailable && <span className="text-xs ml-1">(Desktop only)</span>}
                    </button>
                    <button 
                        className={`px-4 py-2 font-medium text-sm focus:outline-none ${
                            activeTab === 'online' 
                                ? 'text-blue-600 border-b-2 border-blue-600 dark:text-blue-400 dark:border-blue-400' 
                                : 'text-gray-600 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                        }`}
                        onClick={() => setActiveTab('online')}
                    >
                        Online
                    </button>
                    <button 
                        className={`px-4 py-2 font-medium text-sm focus:outline-none ${
                            activeTab === 'sessions' 
                                ? 'text-blue-600 border-b-2 border-blue-600 dark:text-blue-400 dark:border-blue-400' 
                                : 'text-gray-600 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                        }`}
                        onClick={() => setActiveTab('sessions')}
                    >
                        Sessions
                    </button>
                </div>
                
                <div className="p-4">
                    {activeTab === 'local' && (
                        <div>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">Play a local game against a friend on the same device.</p>
                            <button 
                                onClick={handleStartLocalGame} 
                                className="btn btn-primary w-full hover-effect"
                            >
                                Start Local Game
                            </button>
                        </div>
                    )}
                    
                    {activeTab === 'ai' && (
                        <div>
                            {!isTauriAvailable ? (
                                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-md p-4 mb-4">
                                    <p className="text-sm text-yellow-700 dark:text-yellow-500">AI mode requires the desktop version of the app with Tauri backend.</p>
                                    <p className="text-sm text-yellow-700 dark:text-yellow-500 mt-2">Please download and install the desktop version to play against AI.</p>
                                </div>
                            ) : (
                                <>
                                    <div className="mb-4">
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">AI Difficulty:</label>
                                        <div className="flex space-x-2">
                                            <button 
                                                onClick={() => setSelectedDifficulty(Difficulty.EASY)}
                                                className={`flex-1 py-2 px-3 rounded-md text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${
                                                    selectedDifficulty === Difficulty.EASY 
                                                        ? 'bg-blue-600 text-white' 
                                                        : 'bg-gray-100 hover:bg-gray-200 text-gray-800 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-gray-200'
                                                }`}
                                            >
                                                Easy
                                            </button>
                                            <button 
                                                onClick={() => setSelectedDifficulty(Difficulty.MEDIUM)}
                                                className={`flex-1 py-2 px-3 rounded-md text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${
                                                    selectedDifficulty === Difficulty.MEDIUM 
                                                        ? 'bg-blue-600 text-white' 
                                                        : 'bg-gray-100 hover:bg-gray-200 text-gray-800 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-gray-200'
                                                }`}
                                            >
                                                Medium
                                            </button>
                                            <button 
                                                onClick={() => setSelectedDifficulty(Difficulty.HARD)}
                                                className={`flex-1 py-2 px-3 rounded-md text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${
                                                    selectedDifficulty === Difficulty.HARD 
                                                        ? 'bg-blue-600 text-white' 
                                                        : 'bg-gray-100 hover:bg-gray-200 text-gray-800 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-gray-200'
                                                }`}
                                            >
                                                Hard
                                            </button>
                                        </div>
                                    </div>
                                    
                                    <div className="mb-4">
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Color Preference:</label>
                                        <div className="grid grid-cols-2 gap-2">
                                            <div 
                                                onClick={() => setSelectedColor(Color.White)}
                                                className={`cursor-pointer p-3 rounded-md text-center transition-colors ${
                                                    selectedColor === Color.White 
                                                        ? 'bg-gray-200 dark:bg-gray-600 border-2 border-blue-500' 
                                                        : 'bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 border-2 border-transparent'
                                                }`}
                                            >
                                                <div className="flex justify-center items-center space-x-2">
                                                    <div className="w-5 h-5 rounded-full bg-white border border-gray-300"></div>
                                                    <span className="text-sm font-medium text-gray-800 dark:text-gray-200">Play as White</span>
                                                </div>
                                            </div>
                                            <div 
                                                onClick={() => setSelectedColor(Color.Black)}
                                                className={`cursor-pointer p-3 rounded-md text-center transition-colors ${
                                                    selectedColor === Color.Black 
                                                        ? 'bg-gray-200 dark:bg-gray-600 border-2 border-blue-500' 
                                                        : 'bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 border-2 border-transparent'
                                                }`}
                                            >
                                                <div className="flex justify-center items-center space-x-2">
                                                    <div className="w-5 h-5 rounded-full bg-gray-800 border border-gray-300"></div>
                                                    <span className="text-sm font-medium text-gray-800 dark:text-gray-200">Play as Black</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <button 
                                        onClick={handleStartAIGame}
                                        className="btn btn-primary w-full hover-effect"
                                    >
                                        Start AI Game
                                    </button>
                                </>
                            )}
                        </div>
                    )}
                    
                    {activeTab === 'online' && (
                        <div>
                            <div className="space-y-6">
                                <div className="bg-gray-50 dark:bg-gray-700 rounded-md p-4">
                                    <h4 className="text-sm font-medium text-gray-800 dark:text-gray-200 mb-3">Create a Game</h4>
                                    <div className="mb-4">
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Play as:</label>
                                        <div className="grid grid-cols-2 gap-2">
                                            <div 
                                                onClick={() => setSelectedColor(Color.White)}
                                                className={`cursor-pointer p-2 rounded-md text-center transition-colors ${
                                                    selectedColor === Color.White 
                                                        ? 'bg-gray-200 dark:bg-gray-600 border-2 border-blue-500' 
                                                        : 'bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 border-2 border-transparent'
                                                }`}
                                            >
                                                <div className="flex justify-center items-center space-x-2">
                                                    <div className="w-4 h-4 rounded-full bg-white border border-gray-300"></div>
                                                    <span className="text-sm font-medium text-gray-800 dark:text-gray-200">White</span>
                                                </div>
                                            </div>
                                            <div 
                                                onClick={() => setSelectedColor(Color.Black)}
                                                className={`cursor-pointer p-2 rounded-md text-center transition-colors ${
                                                    selectedColor === Color.Black 
                                                        ? 'bg-gray-200 dark:bg-gray-600 border-2 border-blue-500' 
                                                        : 'bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 border-2 border-transparent'
                                                }`}
                                            >
                                                <div className="flex justify-center items-center space-x-2">
                                                    <div className="w-4 h-4 rounded-full bg-gray-800 border border-gray-300"></div>
                                                    <span className="text-sm font-medium text-gray-800 dark:text-gray-200">Black</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <button 
                                        className="btn btn-primary w-full hover-effect disabled:opacity-50 disabled:cursor-not-allowed"
                                        onClick={handleCreateMultiplayerGame}
                                        disabled={isCreatingRoom}
                                    >
                                        {isCreatingRoom ? 'Creating...' : 'Create Game'}
                                    </button>
                                </div>
                                
                                <div className="relative flex items-center py-2">
                                    <div className="flex-grow border-t border-gray-300 dark:border-gray-600"></div>
                                    <span className="flex-shrink mx-3 text-sm text-gray-500 dark:text-gray-400">OR</span>
                                    <div className="flex-grow border-t border-gray-300 dark:border-gray-600"></div>
                                </div>
                                
                                <div className="bg-gray-50 dark:bg-gray-700 rounded-md p-4">
                                    <h4 className="text-sm font-medium text-gray-800 dark:text-gray-200 mb-3">Join a Game</h4>
                                    <div className="mb-4">
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Room ID or Link:</label>
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
                                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:text-white text-sm"
                                        />
                                    </div>
                                    <button 
                                        className="btn btn-primary w-full hover-effect disabled:opacity-50 disabled:cursor-not-allowed"
                                        onClick={handleJoinMultiplayerGame}
                                        disabled={isJoiningRoom || !roomId.trim()}
                                    >
                                        {isJoiningRoom ? 'Joining...' : 'Join Game'}
                                    </button>
                                </div>
                            </div>
                            
                            {errorMessage && (
                                <div className="mt-4 p-3 bg-red-50 border border-red-200 text-red-600 dark:bg-red-900/20 dark:border-red-700 dark:text-red-400 rounded-md text-sm">
                                    {errorMessage}
                                </div>
                            )}
                        </div>
                    )}
                    
                    {activeTab === 'sessions' && (
                        <div>
                            <h4 className="text-sm font-medium text-gray-800 dark:text-gray-200 mb-2">Game Sessions</h4>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">Manage your active game sessions. You can have multiple games running simultaneously.</p>
                            
                            <div className="space-y-2 mb-6">
                                {sessions.length === 0 ? (
                                    <p className="text-sm text-gray-500 dark:text-gray-400 italic p-3 bg-gray-50 dark:bg-gray-700 rounded-md">No active game sessions. Start a new game to create one.</p>
                                ) : (
                                    sessions.map(session => (
                                        <div 
                                            key={session.id} 
                                            className={`flex justify-between items-center p-3 rounded-md cursor-pointer transition-colors ${
                                                session.id === activeSessionId 
                                                    ? 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800' 
                                                    : 'bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 border border-gray-200 dark:border-gray-600'
                                            }`}
                                            onClick={() => handleSwitchSession(session.id)}
                                        >
                                            <div>
                                                <div className="font-medium text-sm text-gray-800 dark:text-gray-200">
                                                    {getGameModeDisplay(session.config.mode)}
                                                    {session.config.difficulty && ` (${session.config.difficulty})`}
                                                </div>
                                                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                                    Created: {formatSessionDate(session.createdAt)}
                                                </div>
                                            </div>
                                            <button 
                                                className="p-1 text-gray-400 hover:text-red-500 dark:hover:text-red-400 focus:outline-none" 
                                                onClick={(e) => handleDeleteSession(e, session.id)}
                                                aria-label="Delete session"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                                </svg>
                                            </button>
                                        </div>
                                    ))
                                )}
                            </div>
                            
                            <div className="bg-gray-50 dark:bg-gray-700 rounded-md p-4">
                                <h4 className="text-sm font-medium text-gray-800 dark:text-gray-200 mb-3">Create New Session</h4>
                                <div className="grid grid-cols-3 gap-2">
                                    <button 
                                        className="btn btn-secondary hover-effect"
                                        onClick={() => handleCreateSession(GameMode.LOCAL)}
                                    >
                                        Local Game
                                    </button>
                                    <button 
                                        className={`btn btn-secondary hover-effect ${!isTauriAvailable ? 'opacity-50 cursor-not-allowed' : ''}`}
                                        onClick={() => isTauriAvailable ? handleCreateSession(GameMode.AI) : null}
                                        title={!isTauriAvailable ? "AI mode requires the desktop version" : ""}
                                    >
                                        AI Game {!isTauriAvailable && <span className="text-xs block mt-1">(Desktop only)</span>}
                                    </button>
                                    <button 
                                        className="btn btn-secondary hover-effect"
                                        onClick={() => setActiveTab('online')}
                                    >
                                        Multiplayer
                                    </button>
                                </div>
                            </div>
                            
                            {errorMessage && (
                                <div className="mt-4 p-3 bg-red-50 border border-red-200 text-red-600 dark:bg-red-900/20 dark:border-red-700 dark:text-red-400 rounded-md text-sm">
                                    {errorMessage}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default GameSetup;