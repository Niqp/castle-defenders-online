import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { PORT, CORS_ORIGIN } from './config.js';
import { EVENTS } from './events.js';
import { RoomManager } from './RoomManager.js';

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: CORS_ORIGIN }
});

app.use(cors());
app.use(express.json());

// Initialize room manager
const roomManager = new RoomManager(io);

// Socket event routing
io.on(EVENTS.CONNECTION, socket => {
  console.log('New socket connected:', socket.id);
  // Room operations
  socket.on(EVENTS.CREATE_ROOM, roomId => roomManager.createRoom(roomId));
  socket.on(EVENTS.LIST_ROOMS, () => roomManager.listRooms(socket));
  socket.on(EVENTS.JOIN_ROOM, (roomId, name) => roomManager.joinRoom(socket, roomId, name));
  socket.on(EVENTS.LEAVE_ROOM, () => roomManager.leaveRoom(socket));

  // ADD: Handle ready toggle from client
  socket.on(EVENTS.SET_READY, (ready) => {
    const roomId = roomManager.socketToRoom.get(socket.id);
    if (!roomId) return;
    const service = roomManager.rooms.get(roomId);
    if (service && typeof service.setReady === 'function') {
      service.setReady(socket, ready);
    }
    });

  // ADD: Handle mine gold button from client
  socket.on(EVENTS.MINE, () => {
    const roomId = roomManager.socketToRoom.get(socket.id);
    if (!roomId) return;
    const service = roomManager.rooms.get(roomId);
    if (service && typeof service.mine === 'function') {
      service.mine(socket);
    }
  });

  // ADD: Handle hire worker from client
  socket.on(EVENTS.HIRE_WORKER, (type) => {
    const roomId = roomManager.socketToRoom.get(socket.id);
    if (!roomId) return;
    const service = roomManager.rooms.get(roomId);
    if (service && typeof service.hireWorker === 'function') {
      service.hireWorker(socket, type);
    }
  });

  // ADD: Handle spawn unit from client
  socket.on(EVENTS.SPAWN_UNIT, (type) => {
    const roomId = roomManager.socketToRoom.get(socket.id);
    if (!roomId) return;
    const service = roomManager.rooms.get(roomId);
    if (service && typeof service.spawnUnit === 'function') {
      service.spawnUnit(socket, type);
    }
  });
  
});

// Health check
app.get('/', (req, res) => {
  res.send('Castle Defenders Online Server Running');
});

// Start server
server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
