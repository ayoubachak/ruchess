import React from 'react';
import Square from './Square';
import { useChess } from '../Context/ChessContext';
import { invoke } from '@tauri-apps/api/tauri';
import { Position } from '../types/Position';

const Chessboard: React.FC = () => {
    const {gameState, setGameState, isLoading} = useChess();

    if (isLoading) {
        return <div>Loading...</div>;
    }

    const rows = gameState.board.length;
    const cols = gameState.board[0].length;
    const board: JSX.Element[] = [];

    // Handling clicks directly based on the actual x, y from the UI
    const handleSquareClick = (x: number, y: number) => {
        const fullBoard = gameState.board.map(row =>
            row.map(square => ({
                x: square.x,
                y: square.y,
                piece: square.piece ? {
                    piece_type: square.piece.piece_type,
                    color: square.piece.color
                } : null  // This should correctly serialize to None in Rust
            }))
        );
    
        invoke<Position[]>('get_possible_moves', { x, y, board: fullBoard })
            .then((moves: Position[]) => {
                const newBoard = gameState.board.map((row, rowIndex) =>
                    row.map((square, colIndex) => ({
                        ...square,
                        isPossibleMove: moves.some(move => move.x === colIndex && move.y === rowIndex)
                    }))
                );
                setGameState({ ...gameState, board: newBoard });
            })
            .catch(error => console.error('Error fetching moves:', error));
    };

    // Correct loop to render the board as per chess standards
    for (let i = 0; i < rows; i++) {
        for (let j = 0; j < cols; j++) {
            const square = gameState.board[i][j];
            board.push(
                <Square
                    key={`${i}-${j}`}
                    square={square}
                    onClick={() => handleSquareClick(j, i)}
                />
            );
        }
    }

    return (
        <div
            style={{
                display: 'grid',
                gridTemplateColumns: `repeat(${cols}, 50px)`,
                gridTemplateRows: `repeat(${rows}, 50px)`,
                width: '400px',
                height: '400px',
                border: '2px solid black',
            }}
        >
            {board}
        </div>
    );
};

export default Chessboard;

