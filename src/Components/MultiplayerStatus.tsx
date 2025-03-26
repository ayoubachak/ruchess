import React from 'react';
import { Color } from '../types';
import { GameMode } from '../services/game/GameState';
import { useChess } from '../Context/ChessContext';

interface MultiplayerStatusProps {
    networkStatus: 'disconnected' | 'connecting' | 'connected';
    roomInfo: {
        id: string;
        players: number;
        isCreator: boolean;
        allPlayers: any[];
    } | null;
}

const MultiplayerStatus: React.FC<MultiplayerStatusProps> = ({ networkStatus, roomInfo }) => {
    const { gameState, gameConfig, copyRoomLink } = useChess();

    // Check if it's the current player's turn
    const isMyTurn = gameState.current_player === gameConfig.playerColor;
    
    const getStatusText = () => {
        switch (networkStatus) {
            case 'disconnected':
                return 'Disconnected from server';
            case 'connecting':
                return 'Connecting to game server...';
            case 'connected':
                if (!roomInfo) return 'Connected, but no room info';
                
                // If both players are connected
                if (roomInfo.players === 2) {
                    return `Game in progress - ${roomInfo.players} players connected`;
                }
                
                // If waiting for opponent
                return `Waiting for opponent to join - Room ID: ${roomInfo.id}`;
        }
    };
    
    const handleCopyRoomLink = async () => {
        try {
            await copyRoomLink();
            alert('Room link copied to clipboard!');
        } catch (error) {
            console.error('Failed to copy room link:', error);
            // Show the room ID as fallback
            if (roomInfo?.id) {
                alert(`Share this room ID with your opponent: ${roomInfo.id}`);
            }
        }
    };
    
    const getStatusClasses = () => {
        const baseClasses = "py-2 px-3 rounded-md font-medium text-center mb-2";
        
        switch (networkStatus) {
            case 'connected':
                return `${baseClasses} bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 border border-green-200 dark:border-green-800`;
            case 'connecting':
                return `${baseClasses} bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 border border-yellow-200 dark:border-yellow-800 animate-pulse`;
            case 'disconnected':
                return `${baseClasses} bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 border border-red-200 dark:border-red-800`;
            default:
                return baseClasses;
        }
    };
    
    return (
        <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-md mb-4 border border-gray-200 dark:border-gray-700 flex flex-col gap-2">
            <div className={getStatusClasses()}>
                {getStatusText()}
            </div>
            
            {networkStatus === 'connected' && roomInfo?.players === 1 && (
                <button 
                    className="btn btn-primary hover-effect"
                    onClick={handleCopyRoomLink}
                >
                    Copy Invite Link
                </button>
            )}
            
            {networkStatus === 'connected' && roomInfo?.players === 2 && (
                <div className={`p-2 rounded-md text-center font-semibold ${isMyTurn ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 border-l-4 border-green-500 animate-pulse' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-l-4 border-gray-500'}`}>
                    {isMyTurn ? 'Your turn' : 'Waiting for opponent...'}
                </div>
            )}
            
            <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-md text-sm text-center">
                You are playing as: <span className="font-bold">{gameConfig.playerColor === Color.White ? 'White' : 'Black'}</span>
            </div>
        </div>
    );
};

export default MultiplayerStatus;