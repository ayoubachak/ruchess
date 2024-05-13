import React, { createContext, useContext, useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/tauri';
import { Color, Square } from '../types';

interface GameState {
    board: Square[][];
    current_player: Color;
    game_over: boolean;
}

const initialState: GameState = {
    board: [], // This would be initialized properly with the starting position
    current_player: Color.White,
    game_over: false,
};

interface ChessContextType {
    gameState: GameState;
    setGameState: React.Dispatch<React.SetStateAction<GameState>>;
    isLoading: boolean; // Loading state indicator
}

const ChessContext = createContext<ChessContextType | undefined>(undefined);

interface Props {
    children: React.ReactNode;
}
  export const ChessProvider: React.FC<Props> = ({ children }) => {
    const [gameState, setGameState] = useState<GameState>(initialState); // Initialize gameState with initialState
    const [isLoading, setIsLoading] = useState<boolean>(true);
    useEffect(() => {
        setIsLoading(true); // Set loading state to true when fetching game state
        invoke<GameState>('get_game_state')
            .then((initialState) => {
                setGameState(initialState);
                setIsLoading(false); // Set loading state to false after fetching game state
            })
            .catch((error) => {
                setIsLoading(false); // Set loading state to false if an error occurs
                console.error('Failed to load initial game state:', error);
            });
    }, []);

    return (
        <ChessContext.Provider value={{ gameState, setGameState, isLoading }}>
            {children}
        </ChessContext.Provider>
    );
};

export const useChess = () => {
    const context = useContext(ChessContext);
    if (!context) {
        throw new Error('useChess must be used within a ChessProvider');
    }
    return context;
};
