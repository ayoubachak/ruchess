use serde::{Serialize, Deserialize};
use super::{piece::{Piece, Square, Position}, utils::initial_piece_setup};

pub const BOARD_SIZE: usize = 8;

/// Represents a chess board with a 2D array of squares
#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct ChessBoard {
    pub squares: Vec<Vec<Square>>,
}

impl ChessBoard {
    /// Creates a new chess board with pieces in their initial positions
    pub fn new() -> Self {
        let mut squares = Vec::with_capacity(BOARD_SIZE);
        
        // Initialize the board with squares and pieces
        for y in 0..BOARD_SIZE {
            let mut row = Vec::with_capacity(BOARD_SIZE);
            for x in 0..BOARD_SIZE {
                row.push(Square::new(x, y, initial_piece_setup(x, y)));
            }
            squares.push(row);
        }
        
        ChessBoard { squares }
    }
    
    /// Get a reference to the square at the given position
    pub fn get_square(&self, pos: Position) -> Option<&Square> {
        self.squares.get(pos.y)?.get(pos.x)
    }
    
    /// Move a piece from one position to another
    pub fn move_piece(&mut self, from: Position, to: Position) -> Result<(), String> {
        // Validate positions
        if from.x >= BOARD_SIZE || from.y >= BOARD_SIZE {
            return Err("Invalid source position".to_string());
        }
        if to.x >= BOARD_SIZE || to.y >= BOARD_SIZE {
            return Err("Invalid destination position".to_string());
        }
        
        // Get the piece at the source
        let piece = self.squares[from.y][from.x].piece;
        
        if piece.is_none() {
            return Err("No piece at source position".to_string());
        }
        
        // Move the piece (clone the piece to avoid borrow issues)
        self.squares[from.y][from.x].piece = None;
        self.squares[to.y][to.x].piece = piece;
        
        Ok(())
    }
    
    /// Calculate all possible moves for a piece at the given position
    pub fn calculate_moves(&self, pos: Position) -> Vec<Position> {
        if pos.x >= BOARD_SIZE || pos.y >= BOARD_SIZE {
            return Vec::new();
        }
        
        let square = &self.squares[pos.y][pos.x];
        
        // Convert the board to the format expected by calculate_moves
        let board_representation = self.to_option_vec();
        square.calculate_moves(pos, &board_representation)
    }
    
    /// Convert the board to a Vec<Vec<Option<Square>>> format
    /// This is used to maintain compatibility with the existing calculate_moves function
    fn to_option_vec(&self) -> Vec<Vec<Option<Square>>> {
        self.squares.iter()
            .map(|row| row.iter().map(|square| Some(*square)).collect())
            .collect()
    }
}