import React from 'react';
import Square from './Square';
import { useChess } from '../Context/ChessContext';

const Chessboard: React.FC = () => {
    const {gameState, setGameState, isLoading} = useChess();
    console.log(gameState);
    const board : JSX.Element[] = [];
    const player = gameState.current_player;
    const game_over = gameState.game_over;
    console.log(board);
    
    
    if (isLoading) {
        return <div>Loading...</div>;
    }
    const rows = gameState.board.length;
    const cols = gameState.board[0].length;

    for (let i = 0; i < rows; i++) {
        for (let j = 0; j < cols; j++) {
            const square = gameState.board[i][j];             
            board.push(<Square key={`${i}-${j}`} square={square} />);
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
