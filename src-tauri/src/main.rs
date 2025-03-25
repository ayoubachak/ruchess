// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]
mod commands;
mod game;

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            commands::get_game_state,
            commands::select_square,
            commands::move_piece,
            commands::reset_game,
            commands::current_time,
            commands::greet
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
