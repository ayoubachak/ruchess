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
    
    const isBlackSquare = (square.x + square.y) % 2 === 0;
    
    // Check if current player is "me" in multiplayer mode
    const isMyTurn = gameConfig.mode !== GameMode.MULTIPLAYER || 
        (gameState.current_player === gameConfig.playerColor);
    
    // Determine if the board is flipped (playing as black)
    const isFlipped = gameConfig.mode !== GameMode.LOCAL && 
        gameConfig.playerColor === Color.Black;
    
    // Determine classes for square based on state
    const squareClasses = () => {
        let baseClasses = "w-full h-full flex justify-center items-center relative transition-colors duration-200";
        
        // Base color classes
        let colorClass = isBlackSquare ? "bg-board-dark" : "bg-board-light";
        
        // Selected state
        if (isSelected) {
            colorClass = isBlackSquare ? "bg-board-dark-selected" : "bg-board-light-selected";
        }
        
        // Possible move highlight
        let overlayClass = "";
        if (square.isPossibleMove) {
            if (square.piece) {
                overlayClass = "possible-capture-overlay";
            } else {
                overlayClass = "possible-move-overlay";
            }
        }
        
        // Last move highlight
        if (square.isLastMove) {
            overlayClass += " animate-highlight-move";
        }
        
        // Cursor style based on game state
        let cursorClass = "";
        if (gameState.game_over) {
            cursorClass = "cursor-default";
        } else if (!isMyTurn) {
            cursorClass = "cursor-not-allowed";
        } else if (square.isPossibleMove) {
            cursorClass = square.piece ? "cursor-crosshair" : "cursor-pointer";
        } else if (square.piece && square.piece.color === gameState.current_player) {
            cursorClass = "cursor-grab active:cursor-grabbing";
        }
        
        return `${baseClasses} ${colorClass} ${overlayClass} ${cursorClass}`;
    };
    
    // Helper function to generate image path
    const getImage = (piece: Piece | null) => {
        if (!piece) return "";
        
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
                e.currentTarget.classList.add('opacity-50');
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
        e.currentTarget.classList.remove('opacity-50');
    };
    
    // Handle drag over - only allow dropping on valid move squares
    const handleDragOver = (e: React.DragEvent) => {
        if (square.isPossibleMove) {
            e.preventDefault(); // This is necessary to allow dropping
            e.currentTarget.classList.add('ring-2', 'ring-blue-400');
        }
    };
    
    // Handle drag leave
    const handleDragLeave = (e: React.DragEvent) => {
        e.currentTarget.classList.remove('ring-2', 'ring-blue-400');
    };
    
    // Handle drop - move the piece if the drop is on a valid square
    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.currentTarget.classList.remove('ring-2', 'ring-blue-400');
        
        // Only process drops on valid move squares
        if (square.isPossibleMove) {
            try {
                const fromCoords = e.dataTransfer.getData('text/plain').split(',');
                if (fromCoords.length === 2) {
                    const fromX = parseInt(fromCoords[0]);
                    const fromY = parseInt(fromCoords[1]);
                    
                    // Execute the move
                    movePiece(fromX, fromY, square.x, square.y);
                }
            } catch (err) {
                console.error("Error during drop:", err);
            }
        }
    };
    
    // Determine if this square should show a coordinate label
    // For flipped board, adjust the coordinate display
    const showFileLabel = isFlipped ? square.x === 7 : square.x === 0;
    const showRankLabel = isFlipped ? square.y === 0 : square.y === 7;
    
    const fileLabel = isFlipped ? 8 - square.y : 8 - square.y;
    const rankLabel = isFlipped ? 
        String.fromCharCode(104 - square.x) : // 'h' downwards when flipped
        String.fromCharCode(97 + square.x);   // 'a' onwards when normal
    
    // Create piece style with counter-rotation if board is flipped
    const pieceStyle = isFlipped ? {
        transform: 'rotate(180deg)', // Counter-rotate pieces when board is flipped
        maxWidth: '80%',
        maxHeight: '80%',
        zIndex: 10
    } : {};
    
    return (
        <div 
            className={squareClasses()}
            onClick={onClick} 
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
                    className="max-w-[80%] max-h-[80%] z-10 pointer-events-none transition-transform hover:scale-105"
                    style={pieceStyle}
                />
            )}
            
            {/* Highlight for empty possible move */}
            {square.isPossibleMove && !square.piece && (
                <div className="absolute w-[30%] h-[30%] rounded-full bg-black bg-opacity-30 z-[1] animate-pulse" />
            )}
            
            {/* Highlight for capture move */}
            {square.isPossibleMove && square.piece && (
                <div className="absolute inset-0 border-2 border-red-600 border-opacity-70 z-[1]" />
            )}
            
            {/* Coordinate labels - these should also be counter-rotated when board is flipped */}
            {showFileLabel && (
                <div 
                    className={`absolute left-1 top-0.5 text-xs font-medium ${isBlackSquare ? 'text-white text-opacity-75' : 'text-black text-opacity-75'} z-20`}
                    style={isFlipped ? { transform: 'rotate(180deg)' } : {}}
                >
                    {fileLabel}
                </div>
            )}
            
            {showRankLabel && (
                <div 
                    className={`absolute right-1 bottom-0.5 text-xs font-medium ${isBlackSquare ? 'text-white text-opacity-75' : 'text-black text-opacity-75'} z-20`}
                    style={isFlipped ? { transform: 'rotate(180deg)' } : {}}
                >
                    {rankLabel}
                </div>
            )}
        </div>
    );
};

export default BoardSquare;