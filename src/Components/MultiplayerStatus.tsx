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
    
    return (
        <div className="multiplayer-status">
            <div className={`status-indicator ${networkStatus}`}>
                {getStatusText()}
            </div>
            
            {networkStatus === 'connected' && roomInfo?.players === 1 && (
                <button 
                    className="copy-link-button"
                    onClick={handleCopyRoomLink}
                >
                    Copy Invite Link
                </button>
            )}
            
            {networkStatus === 'connected' && roomInfo?.players === 2 && (
                <div className={`turn-indicator ${isMyTurn ? 'your-turn' : 'opponent-turn'}`}>
                    {isMyTurn ? 'Your turn' : 'Waiting for opponent...'}
                </div>
            )}
            
            <div className="player-info">
                You are playing as: {gameConfig.playerColor === Color.White ? 'White' : 'Black'}
            </div>
        </div>
    );
};

export default MultiplayerStatus;