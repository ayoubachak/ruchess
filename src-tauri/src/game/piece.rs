use serde::{Serialize, Deserialize};

use super::board::BOARD_SIZE;


#[derive(Serialize, Deserialize, Clone, Copy, Debug, PartialEq)]
pub enum PieceType {
    Pawn, Rook, Knight, Bishop, Queen, King,
}

impl PieceType {
    pub fn is_pawn(&self) -> bool {
        matches!(self, PieceType::Pawn)
    }
    
    pub fn to_string(&self) -> String {
        match self {
            PieceType::Pawn => "Pawn".to_string(),
            PieceType::Rook => "Rook".to_string(),
            PieceType::Knight => "Knight".to_string(),
            PieceType::Bishop => "Bishop".to_string(),
            PieceType::Queen => "Queen".to_string(),
            PieceType::King => "King".to_string(),
        }
    }
}

#[derive(Serialize, Deserialize, Clone, Copy, Debug, PartialEq)]
pub enum Color {
    White, Black,
}

impl Color {
    pub fn opposite(&self) -> Self {
        match self {
            Color::White => Color::Black,
            Color::Black => Color::White,
        }
    }
}

impl Default for Color {
    fn default() -> Self {
        Color::White
    }
}

#[derive(Serialize, Deserialize, Clone, Copy, Debug, PartialEq)]
pub struct Position {
    pub x: usize,
    pub y: usize,
}

impl Position {
    pub fn new(x: usize, y: usize) -> Self {
        Position { x, y }
    }
    
    /// Safely adds delta to the position coordinates, returns None if out of bounds
    pub fn apply_delta(&self, dx: i32, dy: i32) -> Option<Position> {
        let new_x = self.x as i32 + dx;
        let new_y = self.y as i32 + dy;
        
        if new_x >= 0 && new_x < BOARD_SIZE as i32 && new_y >= 0 && new_y < BOARD_SIZE as i32 {
            Some(Position::new(new_x as usize, new_y as usize))
        } else {
            None
        }
    }
}


#[derive(Serialize, Deserialize, Clone, Copy, Debug)]
pub struct Piece {
    pub piece_type: PieceType,
    pub color: Color,
}

impl Piece {
    pub fn new(piece_type: PieceType, color: Color) -> Self {
        Piece { piece_type, color }
    }
    
    // Get valid moves for this piece at the given position on the given board
    pub fn get_valid_moves(&self, position: Position, board: &super::board::ChessBoard) -> Vec<Position> {
        let mut positions = Vec::new();
        
        match self.piece_type {
            PieceType::Knight => {
                let knight_moves = [
                    (2, 1), (2, -1), (-2, 1), (-2, -1),
                    (1, 2), (1, -2), (-1, 2), (-1, -2),
                ];
                for (dx, dy) in knight_moves {
                    if let Some(new_pos) = position.apply_delta(dx, dy) {
                        // Can move to empty square or capture opponent's piece
                        match board.get_piece(new_pos) {
                            Some(piece) if piece.color != self.color => {
                                // Can capture
                                positions.push(new_pos);
                            },
                            None => {
                                // Empty square
                                positions.push(new_pos);
                            },
                            _ => {}
                        }
                    }
                }
            },
            PieceType::Pawn => {
                let direction = if self.color == Color::White { -1 } else { 1 };
                let start_row = if self.color == Color::White { 6 } else { 1 };
                
                // Forward moves (only empty squares)
                if let Some(new_pos) = position.apply_delta(0, direction) {
                    if board.get_piece(new_pos).is_none() {
                        positions.push(new_pos);
                        
                        // Double forward from starting position
                        if position.y == start_row {
                            if let Some(double_pos) = position.apply_delta(0, 2 * direction) {
                                if board.get_piece(double_pos).is_none() {
                                    positions.push(double_pos);
                                }
                            }
                        }
                    }
                }
                
                // Capture moves (diagonally)
                for dx in [-1, 1] {
                    if let Some(capture_pos) = position.apply_delta(dx, direction) {
                        if let Some(piece) = board.get_piece(capture_pos) {
                            if piece.color != self.color {
                                positions.push(capture_pos);
                            }
                        }
                    }
                }
            },
            PieceType::Rook => {
                add_line_moves(&[(0, 1), (1, 0), (0, -1), (-1, 0)], position, board, self.color, &mut positions);
            },
            PieceType::Bishop => {
                add_line_moves(&[(1, 1), (1, -1), (-1, -1), (-1, 1)], position, board, self.color, &mut positions);
            },
            PieceType::Queen => {
                add_line_moves(&[(1, 1), (1, 0), (1, -1), (0, 1), (0, -1), (-1, 1), (-1, 0), (-1, -1)], position, board, self.color, &mut positions);
            },
            PieceType::King => {
                let king_moves = [
                    (1, 1), (1, 0), (1, -1), (0, 1), (0, -1), (-1, 1), (-1, 0), (-1, -1),
                ];
                for (dx, dy) in king_moves {
                    if let Some(new_pos) = position.apply_delta(dx, dy) {
                        // Can move to empty square or capture opponent's piece
                        match board.get_piece(new_pos) {
                            Some(piece) if piece.color != self.color => {
                                // Can capture
                                positions.push(new_pos);
                            },
                            None => {
                                // Empty square
                                positions.push(new_pos);
                            },
                            _ => {}
                        }
                    }
                }
            },
        }

        positions
    }
}

// Helper function to add line moves (for rook, bishop, queen)
fn add_line_moves(directions: &[(i32, i32)], position: Position, board: &super::board::ChessBoard, color: Color, positions: &mut Vec<Position>) {
    for &(dx, dy) in directions {
        let mut step = 1;
        loop {
            let new_x = position.x as i32 + dx * step;
            let new_y = position.y as i32 + dy * step;
            
            // Check if out of bounds
            if new_x < 0 || new_x >= 8 || new_y < 0 || new_y >= 8 {
                break;
            }
            
            let new_pos = Position::new(new_x as usize, new_y as usize);
            
            match board.get_piece(new_pos) {
                Some(piece) => {
                    if piece.color != color {
                        // Can capture opponent's piece
                        positions.push(new_pos);
                    }
                    // Stop in either case (can't jump over pieces)
                    break;
                },
                None => {
                    // Empty square, add and continue
                    positions.push(new_pos);
                    step += 1;
                }
            }
        }
    }
}