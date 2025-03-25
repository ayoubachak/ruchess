use serde::{Deserialize, Serialize};

use super::board::ChessBoard;
use super::piece::{Color, Position};

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct GameState {
    pub board: ChessBoard,
    pub current_player: Color,
    pub selected_square: Option<Position>,
    pub possible_moves: Vec<Position>,
    pub game_over: bool,
    pub winner: Option<Color>,
}

impl GameState {
    pub fn new() -> GameState {
        GameState {
            board: ChessBoard::new(),
            current_player: Color::White,
            selected_square: None,
            possible_moves: Vec::new(),
            game_over: false,
            winner: None,
        }
    }
    
    /// Select a square on the board, calculating possible moves
    pub fn select_square(&mut self, pos: Position) -> Vec<Position> {
        self.selected_square = Some(pos);
        self.possible_moves = self.board.calculate_moves(pos);
        self.possible_moves.clone()
    }
    
    /// Move a piece from the selected square to the target position
    pub fn move_piece(&mut self, to: Position) -> Result<(), String> {
        let from = match self.selected_square {
            Some(pos) => pos,
            None => return Err("No square selected".to_string()),
        };
        
        // Check if the move is valid
        if !self.possible_moves.contains(&to) {
            return Err("Invalid move".to_string());
        }
        
        // Move the piece
        self.board.move_piece(from, to)?;
        
        // Switch player
        self.current_player = match self.current_player {
            Color::White => Color::Black,
            Color::Black => Color::White,
        };
        
        // Clear selection and possible moves
        self.selected_square = None;
        self.possible_moves.clear();
        
        Ok(())
    }
}


