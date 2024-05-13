import React from 'react';
import { Color, isBlack, Piece, PieceType, Position, Square } from '../types';

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
import { useChess } from '../Context/ChessContext';
import { invoke } from '@tauri-apps/api/tauri';


interface SquareProps {
    square : Square,
    onClick: () => void
}

const BoardSquare: React.FC<SquareProps> = ({ square, onClick }) => {
    const { piece } = square;
    const { gameState, setGameState } = useChess();
    
    const black = (square.x + square.y) % 2 === 0;
    const fillColor = black ? '#769656' : '#eeeed2';

    // Helper function to generate image path

    const getImage = (piece : Piece) => {
        if (!piece) return "";
        switch (`${piece.color}_${piece.piece_type}`) {
            case 'Black_Bishop': return BlackBishop;
            case 'Black_Knight': return BlackKnight;
            case 'Black_Queen': return BlackQueen;
            case 'Black_King': return BlackKing;
            case 'Black_Pawn': return BlackPawn;
            case 'Black_Rook': return BlackRook;
            case 'White_Bishop': return WhiteBishop;
            case 'White_Knight': return WhiteKnight;
            case 'White_Queen': return WhiteQueen;
            case 'White_King': return WhiteKing;
            case 'White_Pawn': return WhitePawn;
            case 'White_Rook': return WhiteRook;
            default: return "";
        }
    };
    
    return (
        <div onClick={onClick} style={{
            backgroundColor: fillColor,
            width: '100%',
            height: '100%',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            position: 'relative'  // Ensure that the positioning context is set
        }}>
            {piece && <img src={getImage(piece)} alt={`${piece.color} ${piece.piece_type}`} style={{ maxWidth: '100%', maxHeight: '100%' }} />}
            {square.isPossibleMove && <div style={{ position: 'absolute', width: '10px', height: '10px', borderRadius: '50%', background: 'gray', opacity: 0.5 }} />}
        </div>
    );
};

export default BoardSquare;
