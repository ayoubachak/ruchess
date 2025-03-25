const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { v4: uuidv4 } = require('uuid');
const cors = require('cors');

const app = express();
app.use(cors());
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", // In production you'd limit this
    methods: ["GET", "POST"]
  }
});

// Store active game rooms
const gameRooms = new Map();

// API endpoint to create a new game
app.get('/create-game', (req, res) => {
  const roomId = uuidv4();
  // Get creator's color preference (default to WHITE if not specified)
  const creatorColor = req.query.playerColor?.toUpperCase() || 'WHITE';
  
  gameRooms.set(roomId, {
    id: roomId,
    players: [],
    gameState: null,
    createdAt: Date.now(),
    creatorColor: creatorColor // Store the creator's color preference
  });
  
  console.log(`Created room ${roomId} with creator color preference: ${creatorColor}`);
  res.json({ roomId });
});

// Game room data validation middleware
const validateRoom = (socket, next) => {
  const roomId = socket.handshake.query.roomId;
  if (!roomId || !gameRooms.has(roomId)) {
    return next(new Error('Invalid room ID'));
  }
  socket.roomId = roomId;
  
  // Store color preference from client, if any
  if (socket.handshake.query.playerColor) {
    socket.playerColorPreference = socket.handshake.query.playerColor.toUpperCase();
  }
  
  next();
};

io.use(validateRoom);

io.on('connection', (socket) => {
  console.log(`Player connected: ${socket.id} to room: ${socket.roomId}`);
  
  const room = gameRooms.get(socket.roomId);
  
  // Determine player color based on room state and preferences
  let playerColor;
  
  if (room.players.length === 0) {
    // First player - use their preference or the creator's stored preference
    playerColor = socket.playerColorPreference || room.creatorColor || 'WHITE';
  } else if (room.players.length === 1) {
    // Second player - assign opposite color of the first player
    const firstPlayerColor = room.players[0].color;
    playerColor = firstPlayerColor === 'WHITE' ? 'BLACK' : 'WHITE';
  } else {
    // Spectator or additional player
    playerColor = 'SPECTATOR';
  }
  
  console.log(`Assigning color ${playerColor} to player ${socket.id}`);
  
  // Add player to room
  room.players.push({
    id: socket.id,
    color: playerColor
  });
  
  // Join socket room
  socket.join(socket.roomId);
  
  // Send current game state to the newly connected player
  socket.emit('game-state', {
    roomId: socket.roomId,
    gameState: room.gameState,
    playerColor,
    players: room.players.length,
    allPlayers: room.players.map(p => ({ id: p.id, color: p.color }))
  });
  
  // Notify room about new player
  io.to(socket.roomId).emit('player-joined', {
    playerId: socket.id,
    playerColor,
    players: room.players.length, 
    allPlayers: room.players.map(p => ({ id: p.id, color: p.color }))
  });
  
  // Handle game ready to start
  if (room.players.length === 2) {
    io.to(socket.roomId).emit('game-start', {
      message: 'Both players connected. Game starting!'
    });
  }
  
  // Handle player moves
  socket.on('move', (data) => {
    console.log(`Move from player ${socket.id}:`, data);
    
    // Validate move is from the correct player
    const player = room.players.find(p => p.id === socket.id);
    if (!player) {
      socket.emit('error', { message: 'Player not found in room' });
      return;
    }
    
    // Ensure this player's color matches the current player in the game
    const moveColor = data.playerColor?.toUpperCase();
    if (player.color !== moveColor) {
      socket.emit('error', { 
        message: `Not your turn. You are ${player.color}, current turn is for ${moveColor}` 
      });
      return;
    }
    
    // Update game state in the room
    room.gameState = data.gameState;
    
    // Toggle current player
    const nextPlayer = moveColor === 'WHITE' ? 'BLACK' : 'WHITE';
    
    // Broadcast the move to other players in the room
    socket.to(socket.roomId).emit('opponent-move', {
      from: data.from,
      to: data.to,
      notation: data.notation,
      gameState: data.gameState
    });
    
    // Inform all players about whose turn it is now
    io.to(socket.roomId).emit('turn-update', {
      currentPlayer: nextPlayer
    });
    
    console.log(`Move processed. Next turn: ${nextPlayer}`);
  });
  
  // Handle disconnection
  socket.on('disconnect', () => {
    console.log(`Player disconnected: ${socket.id}`);
    if (!room) return;
    
    // Remove player from room
    const playerIndex = room.players.findIndex(p => p.id === socket.id);
    if (playerIndex !== -1) {
      room.players.splice(playerIndex, 1);
    }
    
    // Notify remaining player
    io.to(socket.roomId).emit('player-left', {
      message: 'Opponent disconnected',
      players: room.players.length
    });
    
    // Clean up empty rooms after some time
    if (room.players.length === 0) {
      setTimeout(() => {
        if (gameRooms.has(socket.roomId) && gameRooms.get(socket.roomId).players.length === 0) {
          gameRooms.delete(socket.roomId);
          console.log(`Room ${socket.roomId} deleted due to inactivity`);
        }
      }, 60000); // 1 minute
    }
  });
});

// Clean up inactive rooms periodically
setInterval(() => {
  const now = Date.now();
  gameRooms.forEach((room, id) => {
    // Remove rooms inactive for more than 3 hours
    if (now - room.createdAt > 3 * 60 * 60 * 1000 && room.players.length === 0) {
      gameRooms.delete(id);
      console.log(`Room ${id} deleted due to expiration`);
    }
  });
}, 15 * 60 * 1000); // Check every 15 minutes

const PORT = process.env.PORT || 3002;
server.listen(PORT, () => {
  console.log(`Chess server running on port ${PORT}`);
});