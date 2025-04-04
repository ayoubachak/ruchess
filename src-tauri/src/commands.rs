use crate::game::piece::Position;
use crate::game::state::{GameState, GameConfig, GameMode, Difficulty};
use crate::game::ai::make_ai_move; // Import the new AI module
use serde::{Deserialize, Serialize};
use tauri::Manager;

// Store game state between commands
use std::sync::Mutex;
use std::sync::Arc;
use once_cell::sync::Lazy;

// Global game state that persists between commands
static GAME_STATE: Lazy<Arc<Mutex<GameState>>> = Lazy::new(|| {
    Arc::new(Mutex::new(GameState::new()))
});

// Move history for undo functionality
static MOVE_HISTORY: Lazy<Arc<Mutex<Vec<GameState>>>> = Lazy::new(|| {
    Arc::new(Mutex::new(Vec::new()))
});

#[derive(Serialize, Deserialize)]
pub struct MoveResult {
    board: Vec<Vec<Position>>,
    possible_moves: Vec<Position>
}

#[tauri::command]
pub fn get_game_state() -> Result<GameState, String> {
    let state = GAME_STATE.lock().map_err(|_| "Failed to lock game state".to_string())?;
    Ok(state.clone())
}

#[tauri::command]
pub fn select_square(x: usize, y: usize) -> Result<GameState, String> {
    let mut state = GAME_STATE.lock().map_err(|_| "Failed to lock game state".to_string())?;
    
    // Handle multiplayer mode separately - selections are handled by the client
    if state.config.mode == GameMode::MULTIPLAYER {
        let pos = Position::new(x, y);
        let current_player = state.current_player.clone();
        
        // Check if this is the player's own piece
        if let Some(piece) = state.board.get_piece(pos) {
            if piece.color == current_player {
                // Calculate possible moves and update game state
                let moves = state.board.calculate_moves_for(pos);
                state.selected_square = Some(pos);
                state.possible_moves = moves;
            } else {
                // Clear selection if clicking on opponent's piece
                state.selected_square = None;
                state.possible_moves.clear();
            }
        } else {
            // Check if this is a possible move for the selected piece
            if let Some(selected) = state.selected_square {
                if state.possible_moves.contains(&pos) {
                    // Move the piece
                    let _ = state.move_piece_from(selected, pos);
                } else {
                    // Clear selection if clicking on an empty square that's not a possible move
                    state.selected_square = None;
                    state.possible_moves.clear();
                }
            }
        }
        
        return Ok(state.clone());
    }
    
    // For other modes, use the existing logic
    let pos = Position::new(x, y);
    
    // Calculate possible moves and update game state
    let moves = state.select_square(pos);
    
    // Return the updated game state
    Ok(state.clone())
}

#[tauri::command]
pub fn move_piece(from_x: usize, from_y: usize, to_x: usize, to_y: usize, app_handle: tauri::AppHandle) -> Result<GameState, String> {
    // Save current state in history for undo
    {
        let current_state = GAME_STATE.lock().map_err(|_| "Failed to lock game state".to_string())?;
        let mut history = MOVE_HISTORY.lock().map_err(|_| "Failed to lock move history".to_string())?;
        history.push(current_state.clone());
        
        // Limit history size to prevent memory issues
        if history.len() > 50 {
            history.remove(0);
        }
    }
    
    // Make the move
    let mut state = GAME_STATE.lock().map_err(|_| "Failed to lock game state".to_string())?;
    let from = Position::new(from_x, from_y);
    let to = Position::new(to_x, to_y);
    
    // Execute the move
    state.move_piece_from(from, to)?;
    
    // Check if AI should make a move
    let should_make_ai_move = state.config.mode == GameMode::AI && 
                              state.current_player != state.config.player_color.unwrap_or_default();
    
    // Return the current state to the client
    let updated_state = state.clone();
    
    // If AI is enabled and it's AI's turn, make an AI move
    if should_make_ai_move {
        // Spawn a new thread for AI calculation to avoid blocking the UI
        let app_handle_clone = app_handle.clone();
        std::thread::spawn(move || {
            // Small delay to allow UI to update
            std::thread::sleep(std::time::Duration::from_millis(500));
            
            // Make AI move in a separate thread
            if let Ok(mut state) = GAME_STATE.lock() {
                // Get the AI difficulty from the config
                let difficulty = state.config.difficulty.clone().unwrap_or(Difficulty::MEDIUM);
                
                match make_ai_move(&mut state, &difficulty) {
                    Ok(()) => {
                        // Notify frontend of AI move
                        let _ = app_handle_clone.emit_all("ai-move", state.clone());
                    },
                    Err(e) => {
                        eprintln!("AI move error: {}", e);
                    }
                }
            }
        });
    }
    
    // For multiplayer, we would handle opponent notification here
    if state.config.mode == GameMode::MULTIPLAYER && state.config.game_id.is_some() {
        // TODO: Send move to server in a real implementation
        // This would typically involve a REST API call or WebSocket message
    }
    
    Ok(updated_state)
}

#[tauri::command]
pub fn undo_move() -> Result<GameState, String> {
    // Get the last state from history
    let mut history = MOVE_HISTORY.lock().map_err(|_| "Failed to lock move history".to_string())?;
    
    if history.is_empty() {
        return Err("No moves to undo".to_string());
    }
    
    let previous_state = history.pop().unwrap();
    
    // Restore the previous state
    let mut state = GAME_STATE.lock().map_err(|_| "Failed to lock game state".to_string())?;
    *state = previous_state;
    
    Ok(state.clone())
}

#[tauri::command]
pub fn reset_game() -> Result<GameState, String> {
    let mut state = GAME_STATE.lock().map_err(|_| "Failed to lock game state".to_string())?;
    *state = GameState::new();
    
    // Clear move history
    let mut history = MOVE_HISTORY.lock().map_err(|_| "Failed to lock move history".to_string())?;
    history.clear();
    
    Ok(state.clone())
}

#[tauri::command]
pub fn start_new_game(config: GameConfig) -> Result<GameState, String> {
    let mut state = GAME_STATE.lock().map_err(|_| "Failed to lock game state".to_string())?;
    *state = GameState::new_with_config(config);
    
    // Clear move history
    let mut history = MOVE_HISTORY.lock().map_err(|_| "Failed to lock move history".to_string())?;
    history.clear();
    
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