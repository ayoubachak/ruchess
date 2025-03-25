import { GameState, Difficulty, GameMode } from '../game/GameState';
import { Color, Position } from '../../types';
import { invoke } from '@tauri-apps/api/tauri';
import { listen } from '@tauri-apps/api/event';

/**
 * Chess AI service that handles AI move calculations
 * It uses the Rust backend for move calculation when available,
 * otherwise falls back to a simple implementation in TypeScript
 */
export class ChessAI {
  private isTauriAvailable: boolean;
  private aiMoveListener: (() => void) | null = null;

  constructor(isTauriAvailable: boolean) {
    this.isTauriAvailable = isTauriAvailable;
  }

  /**
   * Initialize the AI service, setting up event listeners
   */
  public async initialize(onAiMove: (gameState: GameState) => void): Promise<void> {
    if (this.isTauriAvailable) {
      try {
        // Set up listener for AI moves from Rust backend
        this.aiMoveListener = await listen<GameState>('ai-move', (event) => {
          console.log('AI move event received:', event);
          onAiMove(event.payload);
        });
        console.log('AI move listener initialized');
      } catch (error) {
        console.error('Failed to initialize AI move listener:', error);
      }
    }
  }

  /**
   * Clean up resources when the component unmounts
   */
  public cleanup(): void {
    if (this.aiMoveListener) {
      this.aiMoveListener(); // Unlisten
      this.aiMoveListener = null;
    }
  }

  /**
   * Make an AI move based on the current game state
   * This is only used as a fallback when Tauri is not available
   */
  public async makeMove(
    gameState: GameState,
    difficulty: Difficulty
  ): Promise<{ from: Position; to: Position } | null> {
    // If Tauri is available, the move will be made by the Rust backend
    // and communicated through the ai-move event
    if (this.isTauriAvailable) {
      console.log('Using Tauri for AI moves');
      return null;
    }

    console.log('Using fallback TypeScript AI implementation');
    return this.calculateMoveFallback(gameState, difficulty);
  }

  /**
   * Fallback implementation for AI move calculation when Tauri is not available
   */
  private calculateMoveFallback(
    gameState: GameState,
    difficulty: Difficulty
  ): { from: Position; to: Position } | null {
    const aiColor = gameState.current_player;
    const allMoves: { from: Position; to: Position }[] = [];
    const captureMoves: { from: Position; to: Position }[] = [];

    // Find all possible moves for the AI
    for (let y = 0; y < 8; y++) {
      for (let x = 0; x < 8; x++) {
        const piece = gameState.board[y][x].piece;
        if (piece && piece.color === aiColor) {
          // Create a copy of the current game state and simulate selecting this piece
          // This will calculate all valid moves for this piece
          const testState = { ...gameState };
          const from: Position = { x, y };

          // Get legal moves for this piece
          const legalMoves = this.getLegalMoves(gameState, from);

          for (const to of legalMoves) {
            allMoves.push({ from, to });

            // Check if this is a capture move
            if (gameState.board[to.y][to.x].piece) {
              captureMoves.push({ from, to });

              // Prioritize capturing high-value pieces
              const capturedPiece = gameState.board[to.y][to.x].piece!;
              const value = this.getPieceValue(capturedPiece);
              
              // For harder difficulties, prioritize high-value captures
              if (difficulty === Difficulty.HARD && value > 300) {
                // 80% chance to take the high-value piece
                if (Math.random() < 0.8) {
                  return { from, to };
                }
              }
            }
          }
        }
      }
    }

    // Strategy based on difficulty
    switch (difficulty) {
      case Difficulty.EASY:
        // For easy, just make a random move
        if (allMoves.length > 0) {
          return allMoves[Math.floor(Math.random() * allMoves.length)];
        }
        break;

      case Difficulty.MEDIUM:
        // For medium, prefer captures but sometimes make random moves
        if (captureMoves.length > 0 && Math.random() < 0.7) {
          return captureMoves[Math.floor(Math.random() * captureMoves.length)];
        } else if (allMoves.length > 0) {
          return allMoves[Math.floor(Math.random() * allMoves.length)];
        }
        break;

      case Difficulty.HARD:
        // For hard, almost always prefer captures
        if (captureMoves.length > 0) {
          return captureMoves[Math.floor(Math.random() * captureMoves.length)];
        } else if (allMoves.length > 0) {
          return allMoves[Math.floor(Math.random() * allMoves.length)];
        }
        break;
    }

    // No valid moves
    return null;
  }

  /**
   * Get legal moves for a piece, checking for checks
   * This is a simplified implementation for the fallback AI
   */
  private getLegalMoves(gameState: GameState, position: Position): Position[] {
    // This would need a more sophisticated implementation
    // For now, returning an empty array as this is just for failsafe purposes
    // The real implementation should use the `getLegalMoves` function from GameRules.ts
    return [];
  }

  /**
   * Get the value of a piece for AI evaluation
   */
  private getPieceValue(piece: any): number {
    const pieceValues: Record<string, number> = {
      'Pawn': 100,
      'Knight': 300,
      'Bishop': 300,
      'Rook': 500,
      'Queen': 900,
      'King': 10000
    };

    return pieceValues[piece.piece_type] || 0;
  }
}

// Export a singleton instance
export const createChessAI = (isTauriAvailable: boolean) => new ChessAI(isTauriAvailable);
export default createChessAI; 