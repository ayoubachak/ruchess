import { GameState, GameConfig, initialState, createMockBoard, cloneGameState, GameMode, Difficulty } from './GameState';
import { Color, Position } from '../../types';
import { invoke } from '@tauri-apps/api/tauri';
import { v4 as uuidv4 } from 'uuid';

/**
 * Interface representing a chess game session
 */
export interface GameSession {
  id: string;
  gameState: GameState;
  config: GameConfig;
  createdAt: Date;
  lastUpdated: Date;
}

/**
 * Manages multiple game sessions and allows switching between them
 */
export class GameSessionManager {
  private sessions: Map<string, GameSession> = new Map();
  private activeSessionId: string | null = null;
  private isTauriAvailable: boolean;

  constructor(isTauriAvailable: boolean) {
    this.isTauriAvailable = isTauriAvailable;
  }

  /**
   * Get all available game sessions
   */
  public getAllSessions(): GameSession[] {
    return Array.from(this.sessions.values());
  }

  /**
   * Get the currently active session, or null if none is active
   */
  public getActiveSession(): GameSession | null {
    if (!this.activeSessionId) return null;
    return this.sessions.get(this.activeSessionId) || null;
  }

  /**
   * Create a new game session with the given configuration
   */
  public async createSession(config: GameConfig): Promise<string> {
    // Generate a unique ID for the session
    const sessionId = uuidv4();
    console.log(`Creating new game session: ${sessionId}`, config);

    // If AI mode is requested but Tauri is not available, switch to LOCAL mode
    if (config.mode === GameMode.AI && !this.isTauriAvailable) {
      console.warn("AI mode requires Tauri, which is not available. Switching to LOCAL mode.");
      config = { ...config, mode: GameMode.LOCAL };
    }

    // Initialize game state based on config
    let gameState: GameState;

    if (this.isTauriAvailable && config.mode !== GameMode.MULTIPLAYER) {
      try {
        // Use Tauri backend to initialize game state
        console.log('Initializing game state with Tauri backend');
        gameState = await invoke<GameState>('start_new_game', { config });
        console.log('Game state initialized successfully with Tauri');
      } catch (error) {
        console.error('Failed to initialize game state with Tauri:', error);
        gameState = this.createFallbackGameState(config);
      }
    } else {
      console.log('Creating fallback game state (non-Tauri or multiplayer)');
      gameState = this.createFallbackGameState(config);
    }

    // Create new session
    const session: GameSession = {
      id: sessionId,
      gameState,
      config,
      createdAt: new Date(),
      lastUpdated: new Date()
    };

    // Store session
    this.sessions.set(sessionId, session);
    
    // Make this the active session
    this.activeSessionId = sessionId;

    return sessionId;
  }

  /**
   * Switch to an existing game session
   */
  public switchSession(sessionId: string): boolean {
    if (!this.sessions.has(sessionId)) {
      console.error(`Session not found: ${sessionId}`);
      return false;
    }

    console.log(`Switching to session: ${sessionId}`);
    this.activeSessionId = sessionId;
    return true;
  }

  /**
   * End and remove a game session
   */
  public endSession(sessionId: string): boolean {
    if (!this.sessions.has(sessionId)) {
      console.error(`Cannot end session, not found: ${sessionId}`);
      return false;
    }

    console.log(`Ending session: ${sessionId}`);
    this.sessions.delete(sessionId);

    // If this was the active session, clear active session
    if (this.activeSessionId === sessionId) {
      this.activeSessionId = null;
    }

    return true;
  }

  /**
   * Update a game session with new state
   */
  public updateSession(sessionId: string, gameState: GameState): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) {
      console.error(`Cannot update session, not found: ${sessionId}`);
      return false;
    }

    session.gameState = gameState;
    session.lastUpdated = new Date();
    return true;
  }

  /**
   * Reset a game session to its initial state
   */
  public async resetSession(sessionId: string): Promise<boolean> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      console.error(`Cannot reset session, not found: ${sessionId}`);
      return false;
    }

    if (this.isTauriAvailable) {
      try {
        // Use Tauri backend to reset game state
        const gameState = await invoke<GameState>('reset_game');
        session.gameState = gameState;
        session.lastUpdated = new Date();
        return true;
      } catch (error) {
        console.error('Failed to reset game with Tauri:', error);
        // Fall back to client-side reset
      }
    }

    // Client-side fallback
    session.gameState = this.createFallbackGameState(session.config);
    session.lastUpdated = new Date();
    return true;
  }

  /**
   * Create a fallback game state when Tauri is not available
   */
  private createFallbackGameState(config: GameConfig): GameState {
    console.log('Creating fallback game state', config);
    const gameState: GameState = {
      ...initialState,
      board: createMockBoard()
    };

    return gameState;
  }
}

// Create a singleton instance
export const createGameSessionManager = (isTauriAvailable: boolean) => new GameSessionManager(isTauriAvailable);
export default createGameSessionManager; 