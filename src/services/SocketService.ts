import { io, Socket } from 'socket.io-client';

type SocketCallback = (data: any) => void;

export interface SocketEvents {
  'connect': () => void;
  'disconnect': () => void;
  'game-state': (data: any) => void;
  'player-joined': (data: any) => void;
  'game-start': (data: any) => void;
  'opponent-move': (data: any) => void;
  'player-left': (data: any) => void;
  'error': (data: any) => void;
  'turn-update': (data: any) => void;
}

class SocketService {
  private socket: Socket | null = null;
  private callbacks: Map<string, SocketCallback[]> = new Map();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private serverUrl = 'http://localhost:3002';
  
  connect(roomId: string, playerColor?: Color): void {
    if (this.socket && this.socket.connected) {
      console.log('Already connected to socket server');
      return;
    }
    
    // Add playerColor to the query if specified
    const query: any = { roomId };
    if (playerColor) {
      query.playerColor = playerColor;
    }
    
    this.socket = io(this.serverUrl, {
      query: query
    });
    
    this.socket.on('connect', () => {
      console.log('Connected to chess server with roomId:', roomId, 'and color preference:', playerColor);
      this.reconnectAttempts = 0;
      this.triggerCallbacks('connect', {});
    });
    
    this.socket.on('disconnect', () => {
      console.log('Disconnected from chess server');
      this.triggerCallbacks('disconnect', {});
      this.attemptReconnect(roomId, playerColor);
    });
    
    // Register event handlers
    this.socket.on('game-state', (data: any) => {
      console.log('Received game state from server:', data);
      this.triggerCallbacks('game-state', data);
    });
    this.socket.on('player-joined', (data: any) => {
      console.log('Player joined event:', data);
      this.triggerCallbacks('player-joined', data);
    });
    this.socket.on('game-start', (data: any) => this.triggerCallbacks('game-start', data));
    this.socket.on('opponent-move', (data: any) => {
      console.log('Opponent move received:', data);
      this.triggerCallbacks('opponent-move', data);
    });
    this.socket.on('player-left', (data: any) => this.triggerCallbacks('player-left', data));
    this.socket.on('error', (data: any) => this.triggerCallbacks('error', data));
    this.socket.on('turn-update', (data: any) => {
      console.log('Turn update received:', data);
      this.triggerCallbacks('turn-update', data);
    });
  }
  
  private attemptReconnect(roomId: string, playerColor?: Color): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log('Max reconnect attempts reached');
      return;
    }
    
    this.reconnectAttempts++;
    console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
    
    setTimeout(() => {
      this.connect(roomId, playerColor);
    }, 2000 * this.reconnectAttempts); // Exponential backoff
  }
  
  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }
  
  on<K extends keyof SocketEvents>(event: K, callback: SocketEvents[K]): void {
    if (!this.callbacks.has(event as string)) {
      this.callbacks.set(event as string, []);
    }
    
    this.callbacks.get(event as string)!.push(callback as SocketCallback);
  }
  
  off<K extends keyof SocketEvents>(event: K, callback: SocketEvents[K]): void {
    if (!this.callbacks.has(event as string)) return;
    
    const callbacks = this.callbacks.get(event as string)!;
    const index = callbacks.indexOf(callback as SocketCallback);
    if (index !== -1) {
      callbacks.splice(index, 1);
    }
  }
  
  emit(event: string, data: any): void {
    if (!this.socket) {
      console.error('Socket not connected');
      return;
    }
    
    this.socket.emit(event, data);
  }
  
  private triggerCallbacks(event: string, data: any): void {
    if (!this.callbacks.has(event)) return;
    
    for (const callback of this.callbacks.get(event)!) {
      callback(data);
    }
  }
  
  isConnected(): boolean {
    return this.socket?.connected || false;
  }
  
  async createRoom(playerColor: Color): Promise<string> {
    try {
      // Include the creator's color preference in the request
      const response = await fetch(`${this.serverUrl}/create-game?playerColor=${playerColor}`);
      const data = await response.json();
      return data.roomId;
    } catch (error) {
      console.error('Error creating room:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const socketService = new SocketService();
export default socketService;