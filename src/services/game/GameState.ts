import { Color, Square, Position, Piece, PieceType } from '../../types';

// Game modes for future expansion
export enum GameMode {
  LOCAL = 'LOCAL',
  AI = 'AI',
  MULTIPLAYER = 'MULTIPLAYER'
}

// Game difficulty levels for AI mode
export enum Difficulty {
  EASY = 'EASY',
  MEDIUM = 'MEDIUM',
  HARD = 'HARD'
}

export interface GameState {
  board: Square[][];
  current_player: Color;
  game_over: boolean;
  isCheck: boolean;
  gameOverMessage: string;
  moveHistory: string[]; // Store moves in algebraic notation for replay
  selectedSquare: Position | null;
  possibleMoves: Position[];
}

export interface GameConfig {
  mode: GameMode;
  difficulty?: Difficulty;
  playerColor?: Color; // For AI games, which color the player controls
  gameId?: string; // For multiplayer games
  isSpectator?: boolean; // For multiplayer games, true if just watching
}

// Default initial state with an 8x8 empty board
export const initialState: GameState = {
  board: Array(8).fill(null).map((_, row) => 
    Array(8).fill(null).map((_, col) => ({
      x: col,
      y: row,
      piece: null,
      isPossibleMove: false
    }))
  ),
  current_player: Color.White,
  game_over: false,
  isCheck: false,
  gameOverMessage: '',
  moveHistory: [],
  selectedSquare: null,
  possibleMoves: []
};

// Default game configuration
export const defaultConfig: GameConfig = {
  mode: GameMode.LOCAL
};

// Create a mock board with all pieces in starting positions
export const createMockBoard = (): Square[][] => {
  // Start with empty board
  const board = Array(8).fill(null).map((_, row) => 
    Array(8).fill(null).map((_, col) => ({
      x: col,
      y: row,
      piece: null,
      isPossibleMove: false
    }))
  );
  
  // Set up pawns
  for (let col = 0; col < 8; col++) {
    // Black pawns on row 1
    board[1][col].piece = {
      piece_type: PieceType.Pawn,
      color: Color.Black
    };
    
    // White pawns on row 6
    board[6][col].piece = {
      piece_type: PieceType.Pawn,
      color: Color.White
    };
  }
  
  // Set up other pieces
  // Black pieces on row 0
  board[0][0].piece = { piece_type: PieceType.Rook, color: Color.Black };
  board[0][1].piece = { piece_type: PieceType.Knight, color: Color.Black };
  board[0][2].piece = { piece_type: PieceType.Bishop, color: Color.Black };
  board[0][3].piece = { piece_type: PieceType.Queen, color: Color.Black };
  board[0][4].piece = { piece_type: PieceType.King, color: Color.Black };
  board[0][5].piece = { piece_type: PieceType.Bishop, color: Color.Black };
  board[0][6].piece = { piece_type: PieceType.Knight, color: Color.Black };
  board[0][7].piece = { piece_type: PieceType.Rook, color: Color.Black };
  
  // White pieces on row 7
  board[7][0].piece = { piece_type: PieceType.Rook, color: Color.White };
  board[7][1].piece = { piece_type: PieceType.Knight, color: Color.White };
  board[7][2].piece = { piece_type: PieceType.Bishop, color: Color.White };
  board[7][3].piece = { piece_type: PieceType.Queen, color: Color.White };
  board[7][4].piece = { piece_type: PieceType.King, color: Color.White };
  board[7][5].piece = { piece_type: PieceType.Bishop, color: Color.White };
  board[7][6].piece = { piece_type: PieceType.Knight, color: Color.White };
  board[7][7].piece = { piece_type: PieceType.Rook, color: Color.White };
  
  return board;
};

// Helper function to create a deep copy of a game state
export const cloneGameState = (state: GameState): GameState => {
  return {
    ...state,
    board: state.board.map(row => 
      row.map(square => ({
        ...square,
        piece: square.piece ? { ...square.piece } : null
      }))
    ),
    possibleMoves: [...state.possibleMoves],
    moveHistory: [...state.moveHistory],
    selectedSquare: state.selectedSquare ? { ...state.selectedSquare } : null
  };
};

// Helper function to format the board from backend formats
export const formatBoardFromBackend = (backendBoard: any[][]): Square[][] => {
  const formattedBoard: Square[][] = Array(8).fill(null).map((_, row) => 
    Array(8).fill(null).map((_, col) => ({
      x: col,
      y: row,
      piece: null,
      isPossibleMove: false
    }))
  );

  // Try to handle various possible formats
  for (let y = 0; y < Math.min(backendBoard.length, 8); y++) {
    for (let x = 0; x < Math.min(backendBoard[y].length, 8); x++) {
      const cell = backendBoard[y][x];
      
      if (cell && typeof cell === 'object') {
        // If the cell is an object with piece info
        if (cell.piece) {
          formattedBoard[y][x].piece = {
            piece_type: cell.piece.piece_type,
            color: cell.piece.color
          };
        }
        // Set coordinates
        formattedBoard[y][x].x = x;
        formattedBoard[y][x].y = y;
        // Set possible move indicator if available
        formattedBoard[y][x].isPossibleMove = !!cell.isPossibleMove;
      }
    }
  }
  
  return formattedBoard;
}; 