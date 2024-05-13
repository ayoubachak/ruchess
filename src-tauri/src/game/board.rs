use super::{piece::{Piece, Square}, utils::initial_piece_setup};


pub const BOARD_SIZE: usize = 8;

fn create_board() -> [[Option<Piece>; BOARD_SIZE]; BOARD_SIZE] {
    let mut board = [[None; BOARD_SIZE]; BOARD_SIZE];

    // Initialize the board with empty squares
    for row in 0..BOARD_SIZE {
        for col in 0..BOARD_SIZE {
            board[row][col] = None;
        }
    }

    board
}
struct ChessBoard {
    board: [[Option<Square>; BOARD_SIZE]; BOARD_SIZE],
}

impl ChessBoard {
    fn new() -> Self {
        let mut board = [[None; BOARD_SIZE]; BOARD_SIZE];  // A 2D array of 8x8

        // Filling the board column by column
        for col in 0..BOARD_SIZE {
            for row in 0..BOARD_SIZE {
                board[row][col] = Some(Square::new(col, row, initial_piece_setup(col, row)));
            }
        }

        ChessBoard { board }
    }
}