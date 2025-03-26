import React, { useEffect } from 'react';
import './styles.css';
import Chessboard from './Components/ChessBoard';
import { ChessProvider, useChess } from './Context/ChessContext';
import { BrowserRouter, Routes, Route, Navigate, useParams } from 'react-router-dom';

// Component for joining a multiplayer game via URL
const JoinGame = () => {
    const { roomId } = useParams<{ roomId: string }>();
    const { joinMultiplayerGame } = useChess();
    
    useEffect(() => {
        if (roomId) {
            joinMultiplayerGame(roomId);
        }
    }, [roomId]);
    
    return <Chessboard />;
};

// Main app component with routing
const App: React.FC = () => {
    return (
      <div className="app-container">
          <ChessProvider>
              <BrowserRouter>
                  <Routes>
                      <Route path="/" element={
                          <div className="w-full max-w-6xl mx-auto">
                              <h1 className="text-3xl font-bold text-center text-gray-800 dark:text-gray-100 my-6">
                                  RU Chess
                              </h1>
                              <Chessboard />
                          </div>
                      } />
                      <Route path="/join/:roomId" element={
                          <div className="w-full max-w-6xl mx-auto">
                              <h1 className="text-3xl font-bold text-center text-gray-800 dark:text-gray-100 my-6">
                                  RU Chess - Multiplayer
                              </h1>
                              <JoinGame />
                          </div>
                      } />
                      <Route path="*" element={<Navigate to="/" replace />} />
                  </Routes>
              </BrowserRouter>
          </ChessProvider>
      </div>
    );
};

export default App;