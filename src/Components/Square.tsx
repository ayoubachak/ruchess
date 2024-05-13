import React from 'react';
import { isBlack, Piece, Square } from '../types';

interface SquareProps {
    square : Square
}

const BoardSquare: React.FC<SquareProps> = ({ square }) => {
    console.log(square);

    const black = (square.x + square.y) % 2 === 1;
    const fillColor = black ? '#769656' : '#eeeed2';
    

    return (
        <div style={{
            backgroundColor: fillColor,
            width: '100%',
            height: '100%',
        }}>
        </div>
    );
};

export default BoardSquare;
