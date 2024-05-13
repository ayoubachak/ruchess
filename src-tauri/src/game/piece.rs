use serde::{Serialize, Deserialize};

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


#[derive(Serialize, Deserialize, Clone, Debug)]
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
