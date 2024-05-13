use crate::game::state::GameState;



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