use crate::game::state::{GameState, Difficulty};
use crate::game::piece::{PieceType, Color, Position};
use rand::seq::SliceRandom;
use std::collections::HashMap;

// AI move evaluation function that returns a score
pub fn evaluate_position(state: &GameState, color: Color) -> i32 {
    let mut score = 0;
    
    // Piece values
    let piece_values: HashMap<PieceType, i32> = [
        (PieceType::Pawn, 100),
        (PieceType::Knight, 300),
        (PieceType::Bishop, 300),
        (PieceType::Rook, 500),
        (PieceType::Queen, 900),
        (PieceType::King, 10000)
    ].iter().cloned().collect();
    
    // Position bonuses for each piece type (center control, etc.)
    let pawn_position_bonus = [
        [0, 0, 0, 0, 0, 0, 0, 0],
        [50, 50, 50, 50, 50, 50, 50, 50],
        [10, 10, 20, 30, 30, 20, 10, 10],
        [5, 5, 10, 25, 25, 10, 5, 5],
        [0, 0, 0, 20, 20, 0, 0, 0],
        [5, -5, -10, 0, 0, -10, -5, 5],
        [5, 10, 10, -20, -20, 10, 10, 5],
        [0, 0, 0, 0, 0, 0, 0, 0]
    ];
    
    // Knight position bonuses
    let knight_position_bonus = [
        [-50, -40, -30, -30, -30, -30, -40, -50],
        [-40, -20, 0, 0, 0, 0, -20, -40],
        [-30, 0, 10, 15, 15, 10, 0, -30],
        [-30, 5, 15, 20, 20, 15, 5, -30],
        [-30, 0, 15, 20, 20, 15, 0, -30],
        [-30, 5, 10, 15, 15, 10, 5, -30],
        [-40, -20, 0, 5, 5, 0, -20, -40],
        [-50, -40, -30, -30, -30, -30, -40, -50]
    ];
    
    // Bishop position bonuses
    let bishop_position_bonus = [
        [-20, -10, -10, -10, -10, -10, -10, -20],
        [-10, 0, 0, 0, 0, 0, 0, -10],
        [-10, 0, 10, 10, 10, 10, 0, -10],
        [-10, 5, 5, 10, 10, 5, 5, -10],
        [-10, 0, 5, 10, 10, 5, 0, -10],
        [-10, 10, 10, 10, 10, 10, 10, -10],
        [-10, 5, 0, 0, 0, 0, 5, -10],
        [-20, -10, -10, -10, -10, -10, -10, -20]
    ];
    
    // Iterate through the board to calculate material and position score
    for y in 0..8 {
        for x in 0..8 {
            if let Some(piece) = state.board.get_piece(Position::new(x, y)) {
                let piece_value = *piece_values.get(&piece.piece_type).unwrap_or(&0);
                let mut position_bonus = 0;
                
                // Apply position bonuses based on piece type
                match piece.piece_type {
                    PieceType::Pawn => {
                        // For white pawns, read the position bonus table as is
                        // For black pawns, flip the table
                        if piece.color == Color::White {
                            position_bonus = pawn_position_bonus[y][x];
                        } else {
                            position_bonus = pawn_position_bonus[7 - y][x];
                        }
                    },
                    PieceType::Knight => {
                        if piece.color == Color::White {
                            position_bonus = knight_position_bonus[y][x];
                        } else {
                            position_bonus = knight_position_bonus[7 - y][x];
                        }
                    },
                    PieceType::Bishop => {
                        if piece.color == Color::White {
                            position_bonus = bishop_position_bonus[y][x];
                        } else {
                            position_bonus = bishop_position_bonus[7 - y][x];
                        }
                    },
                    _ => {} // No position bonus for other pieces in this simple implementation
                }
                
                // Add value to the score (positive for AI pieces, negative for opponent pieces)
                if piece.color == color {
                    score += piece_value + position_bonus;
                } else {
                    score -= piece_value + position_bonus;
                }
            }
        }
    }
    
    // Additional evaluation for king safety, mobility, etc. would go here
    // For example, penalize if king is in check
    if state.is_check && state.current_player == color {
        score -= 50; // Penalize being in check
    }
    
    score
}

// AI implementation based on difficulty level
pub fn make_ai_move(state: &mut GameState, difficulty: &Difficulty) -> Result<(), String> {
    match difficulty {
        Difficulty::EASY => make_random_move(state),
        Difficulty::MEDIUM => make_medium_ai_move(state),
        Difficulty::HARD => make_hard_ai_move(state)
    }
}

// Simple AI that makes random valid moves
fn make_random_move(state: &mut GameState) -> Result<(), String> {
    use rand::seq::SliceRandom;
    
    // Find all pieces of the current player
    let mut all_moves = Vec::new();
    
    for y in 0..8 {
        for x in 0..8 {
            let pos = Position::new(x, y);
            if let Some(piece) = state.board.get_piece(pos) {
                if piece.color == state.current_player {
                    // Calculate possible moves for this piece
                    let moves = state.board.calculate_moves_for(pos);
                    
                    for target_pos in moves {
                        all_moves.push((pos, target_pos));
                    }
                }
            }
        }
    }
    
    // If no moves are available, game is over
    if all_moves.is_empty() {
        return Err("No valid moves for AI".to_string());
    }
    
    // Choose a random move
    let (from, to) = all_moves.choose(&mut rand::thread_rng())
        .ok_or("Failed to select random move".to_string())?;
    
    // Execute the move
    state.move_piece_from(*from, *to)
}

// Medium difficulty AI that prioritizes captures and checks
fn make_medium_ai_move(state: &mut GameState) -> Result<(), String> {
    // Find all possible moves for AI pieces
    let mut all_moves = Vec::new();
    let mut capture_moves = Vec::new();
    let mut check_moves = Vec::new();
    
    for y in 0..8 {
        for x in 0..8 {
            let pos = Position::new(x, y);
            if let Some(piece) = state.board.get_piece(pos) {
                if piece.color == state.current_player {
                    // Calculate possible moves for this piece
                    let moves = state.board.calculate_moves_for(pos);
                    
                    for target_pos in moves {
                        // Store the move
                        all_moves.push((pos, target_pos));
                        
                        // Check if this is a capture move
                        if state.board.get_piece(target_pos).is_some() {
                            capture_moves.push((pos, target_pos));
                        }
                        
                        // Check if this move would put opponent in check
                        // This requires simulating the move and checking
                        let mut temp_state = state.clone();
                        if let Ok(()) = temp_state.move_piece_from(pos, target_pos) {
                            if temp_state.is_check {
                                check_moves.push((pos, target_pos));
                            }
                        }
                    }
                }
            }
        }
    }
    
    // If no moves are available, game is over
    if all_moves.is_empty() {
        return Err("No valid moves for AI".to_string());
    }
    
    // Prioritize moves: checks first, then captures, then random moves
    let (from, to) = if !check_moves.is_empty() {
        // Prioritize checking the opponent
        *check_moves.choose(&mut rand::thread_rng())
            .ok_or("Failed to select check move".to_string())?
    } else if !capture_moves.is_empty() {
        // Prioritize captures
        *capture_moves.choose(&mut rand::thread_rng())
            .ok_or("Failed to select capture move".to_string())?
    } else {
        // Make a random move
        *all_moves.choose(&mut rand::thread_rng())
            .ok_or("Failed to select random move".to_string())?
    };
    
    // Execute the move
    state.move_piece_from(from, to)
}

// Hard difficulty AI that uses a simple minimax algorithm
fn make_hard_ai_move(state: &mut GameState) -> Result<(), String> {
    // Find the best move using minimax with a depth of 3
    let (from, to) = find_best_move(state, 3)?;
    
    // Execute the move
    state.move_piece_from(from, to)
}

// Find the best move using minimax algorithm
fn find_best_move(state: &GameState, depth: i32) -> Result<(Position, Position), String> {
    let mut best_move: Option<(Position, Position)> = None;
    let mut best_score = i32::MIN;
    
    // Find all possible moves for AI pieces
    for y in 0..8 {
        for x in 0..8 {
            let pos = Position::new(x, y);
            if let Some(piece) = state.board.get_piece(pos) {
                if piece.color == state.current_player {
                    // Calculate possible moves for this piece
                    let moves = state.board.calculate_moves_for(pos);
                    
                    for target_pos in moves {
                        // Simulate the move
                        let mut temp_state = state.clone();
                        if let Ok(()) = temp_state.move_piece_from(pos, target_pos) {
                            // Evaluate the position after the move
                            let score = minimax(&temp_state, depth - 1, false, i32::MIN, i32::MAX);
                            
                            // Update best move if this is better
                            if score > best_score {
                                best_score = score;
                                best_move = Some((pos, target_pos));
                            }
                        }
                    }
                }
            }
        }
    }
    
    best_move.ok_or("No valid moves found".to_string())
}

// Minimax algorithm with alpha-beta pruning
fn minimax(state: &GameState, depth: i32, maximizing_player: bool, mut alpha: i32, mut beta: i32) -> i32 {
    // Base case: if depth is 0 or game is over, return the evaluation
    if depth == 0 || state.game_over {
        return evaluate_position(state, state.current_player);
    }
    
    if maximizing_player {
        let mut best_score = i32::MIN;
        
        // Generate all possible moves
        for y in 0..8 {
            for x in 0..8 {
                let pos = Position::new(x, y);
                if let Some(piece) = state.board.get_piece(pos) {
                    if piece.color == state.current_player {
                        // Calculate possible moves for this piece
                        let moves = state.board.calculate_moves_for(pos);
                        
                        for target_pos in moves {
                            // Simulate the move
                            let mut temp_state = state.clone();
                            if let Ok(()) = temp_state.move_piece_from(pos, target_pos) {
                                // Recursively evaluate the position
                                let score = minimax(&temp_state, depth - 1, false, alpha, beta);
                                best_score = std::cmp::max(best_score, score);
                                
                                // Alpha-beta pruning
                                alpha = std::cmp::max(alpha, best_score);
                                if beta <= alpha {
                                    break;
                                }
                            }
                        }
                    }
                }
            }
        }
        
        best_score
    } else {
        let mut best_score = i32::MAX;
        
        // Generate all possible moves
        for y in 0..8 {
            for x in 0..8 {
                let pos = Position::new(x, y);
                if let Some(piece) = state.board.get_piece(pos) {
                    if piece.color == state.current_player {
                        // Calculate possible moves for this piece
                        let moves = state.board.calculate_moves_for(pos);
                        
                        for target_pos in moves {
                            // Simulate the move
                            let mut temp_state = state.clone();
                            if let Ok(()) = temp_state.move_piece_from(pos, target_pos) {
                                // Recursively evaluate the position
                                let score = minimax(&temp_state, depth - 1, true, alpha, beta);
                                best_score = std::cmp::min(best_score, score);
                                
                                // Alpha-beta pruning
                                beta = std::cmp::min(beta, best_score);
                                if beta <= alpha {
                                    break;
                                }
                            }
                        }
                    }
                }
            }
        }
        
        best_score
    }
}