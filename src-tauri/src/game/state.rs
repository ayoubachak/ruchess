use serde::{Deserialize, Serialize};

use super::piece::{Color, Square};
use super::utils::initial_piece_setup;

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct GameState {
    board: Vec<Vec<Option<Square>>>,
    current_player: Color,
    game_over: bool,
}

impl GameState {
    pub fn new() -> GameState {
        let mut board = vec![vec![None; 8]; 8]; // Create an 8x8 grid of None
        for x in 0..8 {
            for y in 0..8 {
                board[x][y] = Some(Square::new(x, y, initial_piece_setup(x, y)));
            }
        }

        GameState {
            board,
            current_player: Color::White,
            game_over: false,
        }
    }
}


