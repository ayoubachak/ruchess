use super::piece::{Piece, PieceType, Color};

/// Returns the initial piece setup for a given position.
pub fn initial_piece_setup(col: usize, row: usize) -> Option<Piece> {
    let color = if row < 2 { Color::White } else { Color::Black };
    match (row, col) {
        // Pawns
        (1, _) | (6, _) => Some(Piece { piece_type: PieceType::Pawn, color }),
        // Rooks
        (0, 0) | (0, 7) | (7, 0) | (7, 7) => Some(Piece { piece_type: PieceType::Rook, color }),
        // Knights
        (0, 1) | (0, 6) | (7, 1) | (7, 6) => Some(Piece { piece_type: PieceType::Knight, color }),
        // Bishops
        (0, 2) | (0, 5) | (7, 2) | (7, 5) => Some(Piece { piece_type: PieceType::Bishop, color }),
        // Queens
        (0, 3) | (7, 3) => Some(Piece { piece_type: PieceType::Queen, color }),
        // Kings
        (0, 4) | (7, 4) => Some(Piece { piece_type: PieceType::King, color }),
        _ => None,
    }
}
