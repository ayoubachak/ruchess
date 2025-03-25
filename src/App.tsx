import React, { useEffect } from 'react';
import './App.css';
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
      <div className="App">
          <ChessProvider>
              <BrowserRouter>
                  <Routes>
                      <Route path="/" element={
                          <header className="App-header">
                              <Chessboard />
                          </header>
                      } />
                      <Route path="/join/:roomId" element={
                          <header className="App-header">
                              <JoinGame />
                          </header>
                      } />
                      <Route path="*" element={<Navigate to="/" replace />} />
                  </Routes>
              </BrowserRouter>
          </ChessProvider>
      </div>
    );
};

export default App;