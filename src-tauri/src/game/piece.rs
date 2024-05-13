use serde::{Serialize, Deserialize};

use super::board::BOARD_SIZE;


#[derive(Serialize, Deserialize, Clone, Copy, Debug)]
pub enum PieceType {
    Pawn, Rook, Knight, Bishop, Queen, King,
}

impl PieceType {
     pub fn is_pawn(&self) -> bool {
        match self {
            PieceType::Pawn => true,
            _ => false,
        }
    }
}

#[derive(Serialize, Deserialize, Clone, Copy, Debug)]
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

impl PartialEq for Color {
    fn eq(&self, other: &Self) -> bool {
        match (self, other) {
            (Color::White, Color::White) => true,
            (Color::Black, Color::Black) => true,
            _ => false,
        }
    }
}

#[derive(Serialize, Deserialize, Clone, Copy, Debug)]
pub struct Position {
    pub x: usize,
    pub y: usize,
}

impl Position {
    pub fn new(x: usize, y: usize) -> Self {
        Position { x, y }
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
    x: usize,
    y: usize,
    piece: Option<Piece>,
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
        if let Some(piece) = &self.piece {
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
                    let single_step = (0, direction);
                    let double_step = (0, 2 * direction);
                    let captures = [(-1, direction), (1, direction)];

                    self.add_moves(&[single_step], position, board, piece.color, &mut positions, true);
                    if position.y == start_row {
                        self.add_moves(&[double_step], position, board, piece.color, &mut positions, true);
                    }
                    self.add_moves(&captures, position, board, piece.color, &mut positions, false);
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
                _ => {}
            }
        }

        positions
    }

    fn add_moves(&self, moves: &[(i32, i32)], position: Position, board: &Vec<Vec<Option<Square>>>, color: Color, positions: &mut Vec<Position>, only_empty: bool) {
        for &(dx, dy) in moves {
            let new_x = (position.x as i32 + dx) as usize;
            let new_y = (position.y as i32 + dy) as usize;
            if new_x < BOARD_SIZE && new_y < BOARD_SIZE {
                match board.get(new_y).and_then(|row| row.get(new_x)) {
                    Some(Some(target_square)) if only_empty || target_square.piece.as_ref().map_or(false, |p| p.color != color) => positions.push(Position::new(new_x, new_y)),
                    Some(None) if only_empty => positions.push(Position::new(new_x, new_y)),
                    _ => {}
                }
            }
        }
    }
    

    fn add_line_moves(&self, directions: &[(i32, i32)], position: Position, board: &Vec<Vec<Option<Square>>>, color: Color, positions: &mut Vec<Position>) {
        for &(dx, dy) in directions {
            let mut step = 1;
            loop {
                let new_x = (position.x as i32 + dx * step).max(0) as usize;
                let new_y = (position.y as i32 + dy * step).max(0) as usize;
                if new_x >= BOARD_SIZE || new_y >= BOARD_SIZE { break; }
                match &board[new_x][new_y] {
                    Some(target_square) if target_square.piece.is_some() => {
                        if target_square.piece.as_ref().unwrap().color != color {
                            positions.push(Position::new(new_x, new_y));
                        }
                        break;
                    },
                    None => positions.push(Position::new(new_x, new_y)),
                    _ => break,
                }
                step += 1;
            }
        }
    }
}