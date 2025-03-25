import React from 'react';
import { Color, Piece, PieceType, Square } from '../types';
import { useChess } from '../Context/ChessContext';

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
    const { gameState } = useChess();
    
    const black = (square.x + square.y) % 2 === 0;
    
    // Base colors
    const lightSquare = '#eeeed2';
    const darkSquare = '#769656';
    
    // Selected colors (highlight)
    const selectedLightSquare = '#f7f769';
    const selectedDarkSquare = '#bbcb44';
    
    // Determine final color
    const fillColor = black 
        ? (isSelected ? selectedDarkSquare : darkSquare)
        : (isSelected ? selectedLightSquare : lightSquare);

    // Helper function to generate image path
    const getImage = (piece: Piece | null) => {
        if (!piece) return "";
        
        // Handle cases where piece might be serialized differently
        const pieceType = typeof piece.piece_type === 'number' ? piece.piece_type : 
                         (piece.piece_type as any === 'Pawn' ? PieceType.Pawn :
                          piece.piece_type as any === 'Rook' ? PieceType.Rook :
                          piece.piece_type as any === 'Knight' ? PieceType.Knight :
                          piece.piece_type as any === 'Bishop' ? PieceType.Bishop :
                          piece.piece_type as any === 'Queen' ? PieceType.Queen :
                          piece.piece_type as any === 'King' ? PieceType.King : PieceType.Pawn);
        
        const color = typeof piece.color === 'number' ? piece.color :
                     (piece.color as any === 'White' ? Color.White : Color.Black);
        
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
                console.log("Unknown piece:", piece);
                return "";
        }
    };
    
    return (
        <div 
            className={`chess-square ${isSelected ? 'selected' : ''}`}
            onClick={onClick} 
            style={{
                backgroundColor: fillColor,
                width: '100%',
                height: '100%',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                position: 'relative',  // Ensure that the positioning context is set
                cursor: 'pointer',
                transition: 'background-color 0.2s ease'
            }}
        >
            {square.piece && (
                <img 
                    src={getImage(square.piece)} 
                    alt={`Chess piece`}
                    style={{ 
                        maxWidth: '80%', 
                        maxHeight: '80%', 
                        zIndex: 1 
                    }} 
                />
            )}
            
            {square.isPossibleMove && 
                <div style={{ 
                    position: 'absolute', 
                    width: '16px', 
                    height: '16px', 
                    borderRadius: '50%', 
                    background: 'rgba(0, 0, 0, 0.3)', 
                    zIndex: 0 
                }} />
            }
        </div>
    );
};

export default BoardSquare;
