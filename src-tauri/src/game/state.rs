use serde::{Deserialize, Serialize};

use super::board::ChessBoard;
use super::piece::{Color, Position};

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq)]
pub enum GameMode {
    LOCAL,
    AI,
    MULTIPLAYER
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq)]
pub enum Difficulty {
    EASY,
    MEDIUM,
    HARD
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct GameConfig {
    pub mode: GameMode,
    pub difficulty: Option<Difficulty>,
    pub player_color: Option<Color>,
    pub game_id: Option<String>,
}

impl Default for GameConfig {
    fn default() -> Self {
        GameConfig {
            mode: GameMode::LOCAL,
            difficulty: None,
            player_color: None,
            game_id: None,
        }
    }
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct GameState {
    pub board: ChessBoard,
    pub current_player: Color,
    pub selected_square: Option<Position>,
    pub possible_moves: Vec<Position>,
    pub game_over: bool,
    pub winner: Option<Color>,
    pub is_check: bool,
    pub config: GameConfig,
    pub move_history: Vec<String>,
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
            is_check: false,
            config: GameConfig::default(),
            move_history: Vec::new(),
        }
    }
    
    pub fn new_with_config(config: GameConfig) -> GameState {
        let mut state = GameState::new();
        state.config = config;
        state
    }
    
    /// Select a square on the board, calculating possible moves
    pub fn select_square(&mut self, pos: Position) -> Vec<Position> {
        // Check if there's a piece at this position and it belongs to current player
        if let Some(piece) = self.board.get_piece(pos) {
            if piece.color == self.current_player {
                self.selected_square = Some(pos);
                self.possible_moves = self.board.calculate_moves_for(pos);
                return self.possible_moves.clone();
            }
        }
        
        // If no valid piece, clear selection
        self.selected_square = None;
        self.possible_moves.clear();
        Vec::new()
    }
    
    /// Move a piece from the selected square to the target position
    pub fn move_piece(&mut self, to: Position) -> Result<(), String> {
        let from = match self.selected_square {
            Some(pos) => pos,
            None => return Err("No square selected".to_string()),
        };
        
        self.move_piece_from(from, to)
    }
    
    /// Move a piece directly from one position to another
    pub fn move_piece_from(&mut self, from: Position, to: Position) -> Result<(), String> {
        // Check if the move is valid
        let moves = self.board.calculate_moves_for(from);
        if !moves.contains(&to) {
            return Err("Invalid move".to_string());
        }
        
        // Get the piece at the source position for move notation
        let source_piece = self.board.get_piece(from)
            .ok_or("No piece at source position".to_string())?;
        
        // Check if there's a piece at the target position (capture)
        let is_capture = self.board.get_piece(to).is_some();
        
        // Move the piece
        self.board.move_piece(from, to)?;
        
        // Generate move notation (simplified)
        let notation = self.generate_move_notation(source_piece.piece_type.to_string(), from, to, is_capture);
        self.move_history.push(notation);
        
        // Check if this is a winning move (king capture)
        if is_capture {
            // If we captured a king, game is over
            if let Some(captured) = self.board.get_captured_pieces().last() {
                if captured.piece_type.to_string().contains("King") {
                    self.game_over = true;
                    self.winner = Some(self.current_player);
                }
            }
        }
        
        // Check for check
        let opponent_color = if self.current_player == Color::White { Color::Black } else { Color::White };
        self.is_check = self.board.is_king_in_check(opponent_color);
        
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
    
    // Generate algebraic notation for a move
    fn generate_move_notation(&self, piece_name: String, from: Position, to: Position, is_capture: bool) -> String {
        // Convert position to algebraic notation (a1, b2, etc)
        let files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
        let ranks = ['8', '7', '6', '5', '4', '3', '2', '1'];
        
        // Get the piece symbol (except for pawns)
        let piece_symbol = if piece_name.contains("Pawn") {
            "".to_string()
        } else if piece_name.contains("Knight") {
            "N".to_string()
        } else {
            piece_name.chars().next().unwrap_or('P').to_string()
        };
        
        // Generate the notation
        let from_file = files[from.x];
        let from_rank = ranks[from.y];
        let to_file = files[to.x];
        let to_rank = ranks[to.y];
        let capture_symbol = if is_capture { "x" } else { "-" };
        
        format!("{}{}{}{}{}{}", piece_symbol, from_file, from_rank, capture_symbol, to_file, to_rank)
    }
}


