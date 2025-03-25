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
  gameRooms.set(roomId, {
    id: roomId,
    players: [],
    gameState: null,
    createdAt: Date.now()
  });
  
  res.json({ roomId });
});

// Game room data validation middleware
const validateRoom = (socket, next) => {
  const roomId = socket.handshake.query.roomId;
  if (!roomId || !gameRooms.has(roomId)) {
    return next(new Error('Invalid room ID'));
  }
  socket.roomId = roomId;
  next();
};

io.use(validateRoom);

io.on('connection', (socket) => {
  console.log(`Player connected: ${socket.id} to room: ${socket.roomId}`);
  
  const room = gameRooms.get(socket.roomId);
  const playerColor = room.players.length === 0 ? 'WHITE' : 'BLACK';
  
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
    players: room.players.length
  });
  
  // Notify room about new player
  io.to(socket.roomId).emit('player-joined', {
    playerId: socket.id,
    playerColor,
    players: room.players.length
  });
  
  // Handle game ready to start
  if (room.players.length === 2) {
    io.to(socket.roomId).emit('game-start', {
      message: 'Both players connected. Game starting!'
    });
  }
  
  // Handle player moves
  socket.on('move', (data) => {
    // Validate move is from the correct player
    const player = room.players.find(p => p.id === socket.id);
    if (!player || player.color !== data.playerColor) {
      socket.emit('error', { message: 'Not your turn' });
      return;
    }
    
    // Update game state
    room.gameState = data.gameState;
    
    // Broadcast the move to other player
    socket.to(socket.roomId).emit('opponent-move', {
      from: data.from,
      to: data.to,
      gameState: data.gameState
    });
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