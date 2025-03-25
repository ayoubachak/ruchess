use serde::{Deserialize, Serialize};
use super::piece::{Color, Piece, PieceType, Position};

pub const BOARD_SIZE: usize = 8;

/// Represents a chess board with a 2D array of squares
#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct ChessBoard {
    pub board: [[Option<Piece>; 8]; 8],
    pub captured_pieces: Vec<Piece>,
}

impl ChessBoard {
    /// Creates a new chess board with pieces in their initial positions
    pub fn new() -> ChessBoard {
        let mut board = [[None; 8]; 8];
        
        // Setup pawns
        for i in 0..8 {
            board[1][i] = Some(Piece::new(PieceType::Pawn, Color::Black));
            board[6][i] = Some(Piece::new(PieceType::Pawn, Color::White));
        }
        
        // Setup other pieces
        // Black pieces
        board[0][0] = Some(Piece::new(PieceType::Rook, Color::Black));
        board[0][1] = Some(Piece::new(PieceType::Knight, Color::Black));
        board[0][2] = Some(Piece::new(PieceType::Bishop, Color::Black));
        board[0][3] = Some(Piece::new(PieceType::Queen, Color::Black));
        board[0][4] = Some(Piece::new(PieceType::King, Color::Black));
        board[0][5] = Some(Piece::new(PieceType::Bishop, Color::Black));
        board[0][6] = Some(Piece::new(PieceType::Knight, Color::Black));
        board[0][7] = Some(Piece::new(PieceType::Rook, Color::Black));
        
        // White pieces
        board[7][0] = Some(Piece::new(PieceType::Rook, Color::White));
        board[7][1] = Some(Piece::new(PieceType::Knight, Color::White));
        board[7][2] = Some(Piece::new(PieceType::Bishop, Color::White));
        board[7][3] = Some(Piece::new(PieceType::Queen, Color::White));
        board[7][4] = Some(Piece::new(PieceType::King, Color::White));
        board[7][5] = Some(Piece::new(PieceType::Bishop, Color::White));
        board[7][6] = Some(Piece::new(PieceType::Knight, Color::White));
        board[7][7] = Some(Piece::new(PieceType::Rook, Color::White));
        
        ChessBoard {
            board,
            captured_pieces: Vec::new(),
        }
    }
    
    /// Get a reference to the piece at the given position
    pub fn get_piece(&self, pos: Position) -> Option<Piece> {
        if pos.x >= 8 || pos.y >= 8 {
            return None;
        }
        self.board[pos.y][pos.x]
    }
    
    /// Get a reference to the captured pieces
    pub fn get_captured_pieces(&self) -> &Vec<Piece> {
        &self.captured_pieces
    }
    
    /// Calculate valid moves for a specific position
    pub fn calculate_moves_for(&self, pos: Position) -> Vec<Position> {
        // Check if there's a piece at this position
        let piece = match self.get_piece(pos) {
            Some(p) => p,
            None => return Vec::new(),
        };
        
        // Get valid moves for this piece
        piece.get_valid_moves(pos, self)
    }
    
    /// Move a piece from one position to another
    pub fn move_piece(&mut self, from: Position, to: Position) -> Result<(), String> {
        // Validate positions
        if from.x >= 8 || from.y >= 8 || to.x >= 8 || to.y >= 8 {
            return Err("Invalid position".to_string());
        }
        
        // Get the piece
        let piece = match self.board[from.y][from.x] {
            Some(p) => p,
            None => return Err("No piece at source position".to_string()),
        };
        
        // If there's a piece at the destination, capture it
        if let Some(captured) = self.board[to.y][to.x] {
            self.captured_pieces.push(captured);
        }
        
        // Move the piece
        self.board[to.y][to.x] = Some(piece);
        self.board[from.y][from.x] = None;
        
        Ok(())
    }
    
    /// Check if the king of a specific color is in check
    pub fn is_king_in_check(&self, color: Color) -> bool {
        // Find the king
        let mut king_pos = None;
        for y in 0..8 {
            for x in 0..8 {
                if let Some(piece) = self.board[y][x] {
                    if piece.piece_type == PieceType::King && piece.color == color {
                        king_pos = Some(Position::new(x, y));
                        break;
                    }
                }
            }
            if king_pos.is_some() {
                break;
            }
        }
        
        let king_pos = match king_pos {
            Some(pos) => pos,
            None => return false, // No king found
        };
        
        // Check if any opponent piece can attack the king
        for y in 0..8 {
            for x in 0..8 {
                if let Some(piece) = self.board[y][x] {
                    if piece.color != color {
                        let moves = piece.get_valid_moves(Position::new(x, y), self);
                        if moves.contains(&king_pos) {
                            return true; // King is in check
                        }
                    }
                }
            }
        }
        
        false // King is not in check
    }
}