import React from 'react';

interface MultiplayerStatusProps {
    networkStatus: 'disconnected' | 'connecting' | 'connected';
    roomInfo: {
        id: string;
        players: number;
        isCreator: boolean;
    } | null;
}

const MultiplayerStatus: React.FC<MultiplayerStatusProps> = ({ networkStatus, roomInfo }) => {
    const copyRoomLink = () => {
        if (!roomInfo) return;
        
        const roomLink = `${window.location.origin}/join/${roomInfo.id}`;
        navigator.clipboard.writeText(roomLink)
            .then(() => {
                alert('Room link copied to clipboard!');
            })
            .catch(err => {
                console.error('Failed to copy room link:', err);
                alert(`Use this room ID to invite a friend: ${roomInfo.id}`);
            });
    };
    
    return (
        <div className="multiplayer-status">
            <div className={`network-status ${networkStatus}`}>
                {networkStatus === 'connected' ? 
                    '🟢 Connected' : 
                    (networkStatus === 'connecting' ? '🟠 Connecting...' : '🔴 Disconnected')}
            </div>
            
            {roomInfo && (
                <div className="room-info">
                    <div className="room-id">
                        Room: {roomInfo.id.substring(0, 8)}...
                        <button 
                            className="copy-button"
                            onClick={copyRoomLink}
                            title="Copy room link"
                        >
                            📋
                        </button>
                    </div>
                    <div className="player-count">
                        Players: {roomInfo.players}/2
                        {roomInfo.players < 2 && roomInfo.isCreator && (
                            <span className="waiting-message"> (Waiting for opponent)</span>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default MultiplayerStatus;