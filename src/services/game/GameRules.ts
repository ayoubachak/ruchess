import { Color, Square, Position, Piece, PieceType } from '../../types';
import { GameState, cloneGameState } from './GameState';

/**
 * Checks if a king is in check
 */
export const isKingInCheck = (board: Square[][], color: Color): boolean => {
  // Find the king's position
  let kingX = -1;
  let kingY = -1;
  
  // Find the king's position on the board
  for (let y = 0; y < 8; y++) {
    for (let x = 0; x < 8; x++) {
      const piece = board[y][x].piece;
      if (piece && piece.piece_type === PieceType.King && piece.color === color) {
        kingX = x;
        kingY = y;
        break;
      }
    }
    if (kingX !== -1) break;
  }
  
  // If king not found (shouldn't happen in a valid chess game), return false
  if (kingX === -1) return false;
  
  // Check if any opponent piece can attack the king
  const opponentColor = color === Color.White ? Color.Black : Color.White;
  
  for (let y = 0; y < 8; y++) {
    for (let x = 0; x < 8; x++) {
      const piece = board[y][x].piece;
      if (piece && piece.color === opponentColor) {
        const possibleMoves = calculatePieceMoves(board, x, y);
        // If any piece can move to the king's position, the king is in check
        if (possibleMoves.some(move => move.x === kingX && move.y === kingY)) {
          return true;
        }
      }
    }
  }
  
  return false;
};

/**
 * Calculate all possible moves for a piece at a specific position
 */
export const calculatePieceMoves = (board: Square[][], x: number, y: number): Position[] => {
  const piece = board[y][x].piece;
  if (!piece) return [];
  
  const moves: Position[] = [];
  
  // Helper functions for move validation
  const isValidTarget = (tx: number, ty: number): boolean => {
    return tx >= 0 && tx < 8 && ty >= 0 && ty < 8;
  };
  
  const isValidCapture = (tx: number, ty: number): boolean => {
    if (!isValidTarget(tx, ty)) return false;
    
    const targetPiece = board[ty][tx].piece;
    return targetPiece !== null && targetPiece.color !== piece.color;
  };
  
  const isValidMove = (tx: number, ty: number): boolean => {
    if (!isValidTarget(tx, ty)) return false;
    
    return board[ty][tx].piece === null;
  };
  
  // Helper function to add positions to the moves array if they're valid
  const addIfValid = (tx: number, ty: number): boolean => {
    if (isValidTarget(tx, ty)) {
      if (board[ty][tx].piece === null) {
        moves.push({ x: tx, y: ty });
        return true; // Can continue in the same direction
      } else if (board[ty][tx].piece.color !== piece.color) {
        moves.push({ x: tx, y: ty });
        return false; // Cannot continue past a capture
      } else {
        return false; // Cannot continue past a friendly piece
      }
    }
    return false; // Out of bounds
  };
  
  // Generate moves based on piece type
  switch (piece.piece_type) {
    case PieceType.Pawn: {
      const direction = piece.color === Color.White ? -1 : 1;
      const startingRow = piece.color === Color.White ? 6 : 1;
      
      // Forward move
      if (isValidMove(x, y + direction)) {
        moves.push({ x, y: y + direction });
        
        // Double forward from starting position
        if (y === startingRow && isValidMove(x, y + 2 * direction)) {
          moves.push({ x, y: y + 2 * direction });
        }
      }
      
      // Captures
      if (isValidCapture(x - 1, y + direction)) {
        moves.push({ x: x - 1, y: y + direction });
      }
      if (isValidCapture(x + 1, y + direction)) {
        moves.push({ x: x + 1, y: y + direction });
      }
      
      // TODO: en passant and promotion
      break;
    }
    
    case PieceType.Knight: {
      // 8 possible knight moves
      const knightMoves = [
        { dx: 1, dy: 2 }, { dx: 2, dy: 1 },
        { dx: 2, dy: -1 }, { dx: 1, dy: -2 },
        { dx: -1, dy: -2 }, { dx: -2, dy: -1 },
        { dx: -2, dy: 1 }, { dx: -1, dy: 2 }
      ];
      
      for (const move of knightMoves) {
        const tx = x + move.dx;
        const ty = y + move.dy;
        
        if (isValidTarget(tx, ty) && (isValidMove(tx, ty) || isValidCapture(tx, ty))) {
          moves.push({ x: tx, y: ty });
        }
      }
      break;
    }
    
    case PieceType.Bishop: {
      // Diagonal moves in four directions
      const directions = [
        { dx: 1, dy: 1 }, { dx: 1, dy: -1 },
        { dx: -1, dy: 1 }, { dx: -1, dy: -1 }
      ];
      
      for (const dir of directions) {
        for (let i = 1; i < 8; i++) {
          const tx = x + dir.dx * i;
          const ty = y + dir.dy * i;
          
          if (!addIfValid(tx, ty)) break;
        }
      }
      break;
    }
    
    case PieceType.Rook: {
      // Horizontal and vertical moves
      const directions = [
        { dx: 0, dy: 1 }, { dx: 1, dy: 0 },
        { dx: 0, dy: -1 }, { dx: -1, dy: 0 }
      ];
      
      for (const dir of directions) {
        for (let i = 1; i < 8; i++) {
          const tx = x + dir.dx * i;
          const ty = y + dir.dy * i;
          
          if (!addIfValid(tx, ty)) break;
        }
      }
      break;
    }
    
    case PieceType.Queen: {
      // Combination of rook and bishop moves
      const directions = [
        { dx: 0, dy: 1 }, { dx: 1, dy: 0 },
        { dx: 0, dy: -1 }, { dx: -1, dy: 0 },
        { dx: 1, dy: 1 }, { dx: 1, dy: -1 },
        { dx: -1, dy: 1 }, { dx: -1, dy: -1 }
      ];
      
      for (const dir of directions) {
        for (let i = 1; i < 8; i++) {
          const tx = x + dir.dx * i;
          const ty = y + dir.dy * i;
          
          if (!addIfValid(tx, ty)) break;
        }
      }
      break;
    }
    
    case PieceType.King: {
      // King can move one square in any direction
      const directions = [
        { dx: -1, dy: -1 }, { dx: 0, dy: -1 }, { dx: 1, dy: -1 },
        { dx: -1, dy: 0 }, { dx: 1, dy: 0 },
        { dx: -1, dy: 1 }, { dx: 0, dy: 1 }, { dx: 1, dy: 1 }
      ];
      
      for (const dir of directions) {
        const tx = x + dir.dx;
        const ty = y + dir.dy;
        
        if (isValidTarget(tx, ty) && (isValidMove(tx, ty) || isValidCapture(tx, ty))) {
          moves.push({ x: tx, y: ty });
        }
      }
      
      // TODO: castling
      break;
    }
  }
  
  return moves;
};

/**
 * Gets all legal moves for a piece, checking if each move would put the king in check
 */
export const getLegalMoves = (gameState: GameState, x: number, y: number): Position[] => {
  const piece = gameState.board[y][x].piece;
  if (!piece) return [];
  
  const possibleMoves = calculatePieceMoves(gameState.board, x, y);
  const legalMoves: Position[] = [];
  
  // Check each move to see if it would leave the king in check
  for (const move of possibleMoves) {
    // Create a clone of the game state
    const testState = cloneGameState(gameState);
    
    // Make the move on the cloned board
    testState.board[move.y][move.x].piece = testState.board[y][x].piece;
    testState.board[y][x].piece = null;
    
    // Check if the king is in check after the move
    if (!isKingInCheck(testState.board, piece.color)) {
      legalMoves.push(move);
    }
  }
  
  return legalMoves;
};

/**
 * Generates algebraic notation for a chess move
 */
export const generateMoveNotation = (
  board: Square[][],
  fromX: number, 
  fromY: number, 
  toX: number, 
  toY: number, 
  capturedPiece: Piece | null
): string => {
  const piece = board[fromY][fromX].piece;
  if (!piece) return '';
  
  // File letters (a-h) and rank numbers (1-8)
  const fileLetters = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
  const fromFile = fileLetters[fromX];
  const fromRank = 8 - fromY;
  const toFile = fileLetters[toX];
  const toRank = 8 - toY;
  
  let notation = '';
  
  // Add piece letter (except for pawns)
  if (piece.piece_type !== PieceType.Pawn) {
    const pieceLetters: Record<PieceType, string> = {
      [PieceType.Pawn]: '',
      [PieceType.Knight]: 'N',
      [PieceType.Bishop]: 'B',
      [PieceType.Rook]: 'R', 
      [PieceType.Queen]: 'Q',
      [PieceType.King]: 'K'
    };
    notation += pieceLetters[piece.piece_type];
  }
  
  // For non-pawn captures, add the source file for disambiguation
  if (piece.piece_type !== PieceType.Pawn) {
    notation += fromFile;
  }
  
  // Add capture symbol
  if (capturedPiece) {
    // For pawn captures, add the file of origin
    if (piece.piece_type === PieceType.Pawn) {
      notation += fromFile;
    }
    notation += 'x';
  }
  
  // Add destination
  notation += toFile + toRank;
  
  // TODO: Add check, checkmate, castling notation
  
  return notation;
}; 