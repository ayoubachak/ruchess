import React from 'react';
import './App.css';
import Chessboard from './Components/ChessBoard';
import { ChessProvider } from './Context/ChessContext';


const App: React.FC = () => {
    return (
      <div className="App">
          <ChessProvider>
              <header className="App-header">
                  <Chessboard />
              </header>
          </ChessProvider>
      </div>
    );
};

export default App;

