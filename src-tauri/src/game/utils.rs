use super::piece::{Piece, PieceType, Color};

/// Returns the initial piece setup for a given position.
pub fn initial_piece_setup(x: usize, y: usize) -> Option<Piece> {
    match (x, y) {
        // Pawns
        (x, 1) => Some(Piece { piece_type: PieceType::Pawn, color: Color::White }),
        (x, 6) => Some(Piece { piece_type: PieceType::Pawn, color: Color::Black }),
        // Rooks
        (0, 0) | (7, 0) => Some(Piece { piece_type: PieceType::Rook, color: Color::White }),
        (0, 7) | (7, 7) => Some(Piece { piece_type: PieceType::Rook, color: Color::Black }),
        // Knights
        (1, 0) | (6, 0) => Some(Piece { piece_type: PieceType::Knight, color: Color::White }),
        (1, 7) | (6, 7) => Some(Piece { piece_type: PieceType::Knight, color: Color::Black }),
        // Bishops
        (2, 0) | (5, 0) => Some(Piece { piece_type: PieceType::Bishop, color: Color::White }),
        (2, 7) | (5, 7) => Some(Piece { piece_type: PieceType::Bishop, color: Color::Black }),
        // Queens
        (3, 0) => Some(Piece { piece_type: PieceType::Queen, color: Color::White }),
        (3, 7) => Some(Piece { piece_type: PieceType::Queen, color: Color::Black }),
        // Kings
        (4, 0) => Some(Piece { piece_type: PieceType::King, color: Color::White }),
        (4, 7) => Some(Piece { piece_type: PieceType::King, color: Color::Black }),
        _ => None,
    }
}