
const BOARD_SIZE: usize = 8;

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
    board: [[Option<Piece>; BOARD_SIZE]; BOARD_SIZE],
}

impl ChessBoard {
    fn new() -> Self {
        let mut board = [[None; BOARD_SIZE]; BOARD_SIZE];

        // Initialize the board with empty squares
        for row in 0..BOARD_SIZE {
            for col in 0..BOARD_SIZE {
                board[row][col] = None;
            }
        }

        ChessBoard { board }
    }
}