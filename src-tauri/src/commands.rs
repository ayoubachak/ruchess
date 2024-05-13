use crate::game::{piece::{Piece, Position, Square}, state::GameState};
use crate::game::board::BOARD_SIZE;


#[tauri::command]
pub fn get_game_state() -> Result<GameState, String> {
    Ok(GameState::new()) // Assumes `GameState::new()` initializes the game state
}

#[tauri::command]
pub fn current_time() -> String {
    let now = chrono::Local::now();
    now.format("%Y-%m-%d %H:%M:%S").to_string()
}


#[tauri::command]
pub fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
pub fn get_possible_moves(x: usize, y: usize, board: Vec<Vec<Option<Square>>>) -> Vec<Position> {
    // Ensure the board is accessed correctly.
    if let Some(row) = board.get(y) {
        if let Some(Some(square)) = row.get(x) {
            println!("Square: {:?}", square);
            return square.calculate_moves(Position::new(x, y), &board);
        }
    }
    Vec::new() // Return an empty vector if coordinates are out of bounds or square is None.
}

