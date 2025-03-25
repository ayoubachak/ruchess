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
}


#[derive(Serialize, Deserialize, Clone, Debug, Copy)]
pub struct Square {
    pub x: usize,
    pub y: usize,
    pub piece: Option<Piece>,
}

impl Square {
    pub fn new(x: usize, y: usize, piece: Option<Piece>) -> Self {
        Square { x, y, piece }
    }
}

impl Square {
    // Calculates the valid moves for the piece in this square
    pub fn calculate_moves(&self, position: Position, board: &Vec<Vec<Option<Square>>>) -> Vec<Position> {
        let mut positions = Vec::new();
        
        let Some(piece) = self.piece else { return positions };
        
        match piece.piece_type {
            PieceType::Knight => {
                let knight_moves = [
                    (2, 1), (2, -1), (-2, 1), (-2, -1),
                    (1, 2), (1, -2), (-1, 2), (-1, -2),
                ];
                self.add_moves(&knight_moves, position, board, piece.color, &mut positions, false);
            },
            PieceType::Pawn => {
                let direction = if piece.color == Color::White { -1 } else { 1 };
                let start_row = if piece.color == Color::White { 6 } else { 1 };
                
                // Forward moves (only empty squares)
                if let Some(new_pos) = position.apply_delta(0, direction) {
                    if self.is_empty_square(new_pos, board) {
                        positions.push(new_pos);
                        
                        // Double forward from starting position
                        if position.y == start_row {
                            if let Some(double_pos) = position.apply_delta(0, 2 * direction) {
                                if self.is_empty_square(double_pos, board) {
                                    positions.push(double_pos);
                                }
                            }
                        }
                    }
                }
                
                // Capture moves (diagonally)
                for dx in [-1, 1] {
                    if let Some(capture_pos) = position.apply_delta(dx, direction) {
                        if self.can_capture_at(capture_pos, board, piece.color) {
                            positions.push(capture_pos);
                        }
                    }
                }
            },
            PieceType::Rook => {
                self.add_line_moves(&[(0, 1), (1, 0), (0, -1), (-1, 0)], position, board, piece.color, &mut positions);
            },
            PieceType::Bishop => {
                self.add_line_moves(&[(1, 1), (1, -1), (-1, -1), (-1, 1)], position, board, piece.color, &mut positions);
            },
            PieceType::Queen => {
                self.add_line_moves(&[(1, 1), (1, 0), (1, -1), (0, 1), (0, -1), (-1, 1), (-1, 0), (-1, -1)], position, board, piece.color, &mut positions);
            },
            PieceType::King => {
                let king_moves = [
                    (1, 1), (1, 0), (1, -1), (0, 1), (0, -1), (-1, 1), (-1, 0), (-1, -1),
                ];
                self.add_moves(&king_moves, position, board, piece.color, &mut positions, false);
            },
        }

        positions
    }

    fn add_moves(&self, moves: &[(i32, i32)], position: Position, board: &Vec<Vec<Option<Square>>>, color: Color, positions: &mut Vec<Position>, only_empty: bool) {
        for &(dx, dy) in moves {
            if let Some(new_pos) = position.apply_delta(dx, dy) {
                if only_empty {
                    if self.is_empty_square(new_pos, board) {
                        positions.push(new_pos);
                    }
                } else {
                    if self.is_empty_square(new_pos, board) || self.can_capture_at(new_pos, board, color) {
                        positions.push(new_pos);
                    }
                }
            }
        }
    }
    
    fn is_empty_square(&self, pos: Position, board: &Vec<Vec<Option<Square>>>) -> bool {
        board.get(pos.y)
            .and_then(|row| row.get(pos.x))
            .and_then(|square| square.as_ref())
            .map_or(false, |square| square.piece.is_none())
    }
    
    fn can_capture_at(&self, pos: Position, board: &Vec<Vec<Option<Square>>>, color: Color) -> bool {
        board.get(pos.y)
            .and_then(|row| row.get(pos.x))
            .and_then(|square| square.as_ref())
            .and_then(|square| square.piece)
            .map_or(false, |piece| piece.color != color)
    }
    
    fn add_line_moves(&self, directions: &[(i32, i32)], position: Position, board: &Vec<Vec<Option<Square>>>, color: Color, positions: &mut Vec<Position>) {
        for &(dx, dy) in directions {
            let mut step = 1;
            loop {
                let new_x = position.x as i32 + dx * step;
                let new_y = position.y as i32 + dy * step;
                
                // Check if out of bounds
                if new_x < 0 || new_x >= BOARD_SIZE as i32 || new_y < 0 || new_y >= BOARD_SIZE as i32 {
                    break;
                }
                
                let new_pos = Position::new(new_x as usize, new_y as usize);
                
                // Check if square exists in board
                if let Some(row) = board.get(new_y as usize) {
                    if let Some(Some(target_square)) = row.get(new_x as usize) {
                        if let Some(piece) = target_square.piece {
                            // If we hit a piece of the same color, stop
                            if piece.color == color {
                                break;
                            }
                            // If we hit a piece of the opposite color, add it and stop
                            positions.push(new_pos);
                            break;
                        } else {
                            // Empty square, add and continue
                            positions.push(new_pos);
                        }
                    } else {
                        break;
                    }
                } else {
                    break;
                }
                
                step += 1;
            }
        }
    }
}