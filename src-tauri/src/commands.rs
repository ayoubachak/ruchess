use crate::game::piece::{Position};
use crate::game::state::GameState;

// Store game state between commands
use std::sync::Mutex;
use std::sync::Arc;
use once_cell::sync::Lazy;

// Global game state that persists between commands
static GAME_STATE: Lazy<Arc<Mutex<GameState>>> = Lazy::new(|| {
    Arc::new(Mutex::new(GameState::new()))
});

#[tauri::command]
pub fn get_game_state() -> Result<GameState, String> {
    let state = GAME_STATE.lock().map_err(|_| "Failed to lock game state".to_string())?;
    Ok(state.clone())
}

#[tauri::command]
pub fn select_square(x: usize, y: usize) -> Result<Vec<Position>, String> {
    let mut state = GAME_STATE.lock().map_err(|_| "Failed to lock game state".to_string())?;
    let pos = Position::new(x, y);
    Ok(state.select_square(pos))
}

#[tauri::command]
pub fn move_piece(x: usize, y: usize) -> Result<GameState, String> {
    let mut state = GAME_STATE.lock().map_err(|_| "Failed to lock game state".to_string())?;
    let to = Position::new(x, y);
    state.move_piece(to)?;
    Ok(state.clone())
}

#[tauri::command]
pub fn reset_game() -> Result<GameState, String> {
    let mut state = GAME_STATE.lock().map_err(|_| "Failed to lock game state".to_string())?;
    *state = GameState::new();
    Ok(state.clone())
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

