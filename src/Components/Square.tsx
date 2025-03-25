import React from 'react';
import { Color, Piece, PieceType, Square } from '../types';
import { GameMode, useChess } from '../Context/ChessContext';

// Import piece images
import BlackBishop from '../assets/Black_Bishop.png';
import BlackKnight from '../assets/Black_Knight.png'; 
import BlackQueen from '../assets/Black_Queen.png';
import BlackKing from '../assets/Black_King.png';
import BlackPawn from '../assets/Black_Pawn.png';
import BlackRook from '../assets/Black_Rook.png';
import WhiteBishop from '../assets/White_Bishop.png';
import WhiteKnight from '../assets/White_Knight.png';
import WhiteQueen from '../assets/White_Queen.png';
import WhiteKing from '../assets/White_King.png';
import WhitePawn from '../assets/White_Pawn.png';
import WhiteRook from '../assets/White_Rook.png';

interface SquareProps {
    square: Square;
    onClick: () => void;
    isSelected?: boolean;
}

const BoardSquare: React.FC<SquareProps> = ({ square, onClick, isSelected = false }) => {
    const { gameState, gameConfig, movePiece } = useChess();
    
    const black = (square.x + square.y) % 2 === 0;
    
    // Base colors
    const lightSquare = '#eeeed2';
    const darkSquare = '#769656';
    
    // Selected colors (highlight)
    const selectedLightSquare = '#f7f769';
    const selectedDarkSquare = '#bbcb44';
    
    // Possible move indicators
    const possibleMoveLightSquare = '#e8f785';
    const possibleMoveDarkSquare = '#a7c757';
    
    // Check if current player is "me" in multiplayer mode
    const isMyTurn = gameConfig.mode !== GameMode.MULTIPLAYER || 
        (gameState.current_player === gameConfig.playerColor);
    
    // Determine final color based on state
    let fillColor;
    if (isSelected) {
        fillColor = black ? selectedDarkSquare : selectedLightSquare;
    } else if (square.isPossibleMove) {
        fillColor = black ? possibleMoveDarkSquare : possibleMoveLightSquare;
    } else {
        fillColor = black ? darkSquare : lightSquare;
    }

    // Helper function to generate image path
    const getImage = (piece: Piece | null) => {
        if (!piece) return "";
        
        console.log("Piece being rendered:", piece); // Debug log
        
        // Handle cases where piece might be serialized differently
        let pieceType;
        if (typeof piece.piece_type === 'number') {
            pieceType = piece.piece_type;
        } else if (typeof piece.piece_type === 'string') {
            // Handle string values like 'Pawn', 'Rook', etc.
            pieceType = 
                piece.piece_type === 'Pawn' ? PieceType.Pawn :
                piece.piece_type === 'Rook' ? PieceType.Rook :
                piece.piece_type === 'Knight' ? PieceType.Knight :
                piece.piece_type === 'Bishop' ? PieceType.Bishop :
                piece.piece_type === 'Queen' ? PieceType.Queen :
                piece.piece_type === 'King' ? PieceType.King : PieceType.Pawn;
        } else {
            // Fallback for other cases
            pieceType = PieceType.Pawn;
            console.error("Unknown piece type format:", piece.piece_type);
        }
        
        // Handle color values which can be string 'WHITE'/'BLACK' or Color enum
        let color;
        if (typeof piece.color === 'number') {
            color = piece.color;
        } else if (typeof piece.color === 'string') {
            // Handle string values 'WHITE' and 'BLACK'
            color = piece.color === 'WHITE' ? Color.White : Color.Black;
        } else {
            // Assume it's already a Color enum
            color = piece.color;
        }
        
        console.log(`Using color: ${color}, pieceType: ${pieceType}`); // Debug log
        
        // Return the correct image based on piece type and color
        switch (`${color}_${pieceType}`) {
            case `${Color.Black}_${PieceType.Bishop}`: return BlackBishop;
            case `${Color.Black}_${PieceType.Knight}`: return BlackKnight;
            case `${Color.Black}_${PieceType.Queen}`: return BlackQueen;
            case `${Color.Black}_${PieceType.King}`: return BlackKing;
            case `${Color.Black}_${PieceType.Pawn}`: return BlackPawn;
            case `${Color.Black}_${PieceType.Rook}`: return BlackRook;
            case `${Color.White}_${PieceType.Bishop}`: return WhiteBishop;
            case `${Color.White}_${PieceType.Knight}`: return WhiteKnight;
            case `${Color.White}_${PieceType.Queen}`: return WhiteQueen;
            case `${Color.White}_${PieceType.King}`: return WhiteKing;
            case `${Color.White}_${PieceType.Pawn}`: return WhitePawn;
            case `${Color.White}_${PieceType.Rook}`: return WhiteRook;
            default: 
                console.log("Unknown piece combination:", `${color}_${pieceType}`);
                // Fallback to default pieces based on color
                if (color === Color.White) {
                    return pieceType === PieceType.Pawn ? WhitePawn : WhiteKing;
                } else {
                    return pieceType === PieceType.Pawn ? BlackPawn : BlackKing;
                }
        }
    };
    
    // Handle drag start - only allow current player's pieces to be dragged
    const handleDragStart = (e: React.DragEvent) => {
        // Only allow dragging if the square has a piece, it's the current player's turn,
        // and it's their piece in multiplayer mode
        if (square.piece && 
            square.piece.color === gameState.current_player && 
            isMyTurn) {
            
            // Set the data being dragged (the position of the piece)
            e.dataTransfer.setData('text/plain', `${square.x},${square.y}`);
            
            // Set the drag image (optional)
            const img = document.createElement('img');
            img.src = getImage(square.piece);
            e.dataTransfer.setDragImage(img, 25, 25);
            
            // Add a class for styling
            setTimeout(() => {
                e.currentTarget.classList.add('dragging');
            }, 0);
            
            // Also select the square to show possible moves
            onClick();
        } else {
            // Prevent dragging if not the current player's piece
            e.preventDefault();
        }
    };
    
    // Handle drag end
    const handleDragEnd = (e: React.DragEvent) => {
        e.currentTarget.classList.remove('dragging');
    };
    
    // Handle drag over - only allow dropping on valid move squares
    const handleDragOver = (e: React.DragEvent) => {
        if (square.isPossibleMove) {
            e.preventDefault(); // This is necessary to allow dropping
            e.currentTarget.classList.add('drag-over');
        }
    };
    
    // Handle drag leave
    const handleDragLeave = (e: React.DragEvent) => {
        e.currentTarget.classList.remove('drag-over');
    };
    
    // Handle drop - move the piece if the drop is on a valid square
    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.currentTarget.classList.remove('drag-over');
        
        // Only process drops on valid move squares
        if (square.isPossibleMove) {
            try {
                const fromCoords = e.dataTransfer.getData('text/plain').split(',');
                if (fromCoords.length === 2) {
                    const fromX = parseInt(fromCoords[0]);
                    const fromY = parseInt(fromCoords[1]);
                    
                    // Log move for debugging
                    console.log(`Moving piece from (${fromX},${fromY}) to (${square.x},${square.y})`);
                    
                    // Execute the move
                    movePiece(fromX, fromY, square.x, square.y);
                }
            } catch (err) {
                console.error("Error during drop:", err);
            }
        }
    };
    
    // Determine if this is a possible capture (has both isPossibleMove and a piece)
    const isPossibleCapture = square.isPossibleMove && square.piece;
    
    // Determine cursor style based on game state
    const getCursorStyle = () => {
        if (gameState.game_over) {
            return 'default';
        }
        
        if (!isMyTurn) {
            return 'not-allowed';
        }
        
        if (square.isPossibleMove) {
            return isPossibleCapture ? 'crosshair' : 'pointer';
        }
        
        return square.piece && square.piece.color === gameState.current_player ? 
            'grab' : 'default';
    };
    
    // Determine if this square should show a coordinate label
    // For flipped board, adjust the coordinate display
    const isFlipped = gameConfig.mode !== GameMode.LOCAL && 
        gameConfig.playerColor === Color.Black;
        
    const showFileLabel = isFlipped ? square.x === 7 : square.x === 0;
    const showRankLabel = isFlipped ? square.y === 0 : square.y === 7;
    
    const fileLabel = isFlipped ? 8 - square.y : 8 - square.y;
    const rankLabel = isFlipped ? 
        String.fromCharCode(104 - square.x) : // 'h' downwards when flipped
        String.fromCharCode(97 + square.x);   // 'a' onwards when normal
    
    return (
        <div 
            className={`chess-square ${isSelected ? 'selected' : ''} ${square.isPossibleMove ? 'possible-move' : ''} ${isPossibleCapture ? 'possible-capture' : ''}`}
            onClick={onClick} 
            style={{
                backgroundColor: fillColor,
                width: '100%',
                height: '100%',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                position: 'relative',
                cursor: getCursorStyle(),
                transition: 'background-color 0.2s ease'
            }}
            // Add drag-and-drop attributes for pieces
            draggable={!!square.piece && isMyTurn && square.piece.color === gameState.current_player}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
        >
            {square.piece && (
                <img 
                    src={getImage(square.piece)} 
                    alt={`Chess piece`}
                    style={{ 
                        maxWidth: '80%', 
                        maxHeight: '80%', 
                        zIndex: 2,
                        pointerEvents: "none" // This prevents the image from interfering with drag events
                    }} 
                />
            )}
            
            {/* Highlight for empty possible move */}
            {square.isPossibleMove && !square.piece && (
                <div className="move-indicator" style={{ 
                    position: 'absolute', 
                    width: '30%', 
                    height: '30%', 
                    borderRadius: '50%', 
                    background: 'rgba(0, 0, 0, 0.3)', 
                    zIndex: 1
                }} />
            )}
            
            {/* Highlight for capture move */}
            {isPossibleCapture && (
                <div className="capture-indicator" style={{ 
                    position: 'absolute', 
                    width: '100%', 
                    height: '100%', 
                    border: '4px solid rgba(255, 0, 0, 0.7)', 
                    boxSizing: 'border-box',
                    zIndex: 1
                }} />
            )}
            
            {/* Coordinate labels */}
            {showFileLabel && (
                <div style={{
                    position: 'absolute',
                    left: '2px',
                    top: '2px',
                    fontSize: '10px',
                    color: black ? '#eeeed2' : '#769656',
                    zIndex: 3
                }}>
                    {fileLabel}
                </div>
            )}
            
            {showRankLabel && (
                <div style={{
                    position: 'absolute',
                    right: '2px',
                    bottom: '2px',
                    fontSize: '10px',
                    color: black ? '#eeeed2' : '#769656',
                    zIndex: 3
                }}>
                    {rankLabel}
                </div>
            )}
        </div>
    );
};

export default BoardSquare;