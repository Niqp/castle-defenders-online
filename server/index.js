import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { PORT, CORS_ORIGIN } from './config.js';
import { EVENTS } from './events.js';
import { RoomManager } from './services/RoomManager.js';
import { ClientRegistry } from './services/ClientRegistry.js';

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: CORS_ORIGIN }
});

app.use(cors());
app.use(express.json());

// Initialize room manager
const roomManager = new RoomManager(io);
const clientRegistry = new ClientRegistry();

// Socket event routing
io.on(EVENTS.CONNECTION, socket => {
  // ------------------------------
  // Identify logical client
  // ------------------------------
  const clientId = socket.handshake.auth?.clientId;
  socket.clientId = clientId; // cache for later convenience

  const registryRecord = clientId ? clientRegistry.get(clientId) : undefined;

  if (!clientId || !registryRecord) {
    // Unknown client – show welcome screen
    socket.emit(EVENTS.SHOW_WELCOME);
  } else if (!registryRecord.roomId) {
    // Known client with no active room – welcome screen
    socket.emit(EVENTS.SHOW_WELCOME);
    // Update timestamp to keep registry fresh
    clientRegistry.set(clientId, registryRecord);
  } else {
    const { roomId, name } = registryRecord;
    // Touch timestamp so that active clients aren't pruned
    clientRegistry.set(clientId, registryRecord);
    if (roomManager.rooms.has(roomId)) {
      // Room still exists. Join it and restore state.
      const service = roomManager.rooms.get(roomId);
      socket.join(roomId);
      roomManager.socketToRoom.set(socket.id, roomId);

      if (service.gameState) {
        // Game in progress – sync full state
        service.syncState(socket, name);
      } else {
        // Still in lobby – treat as lobby join and send restore marker
        service.join(socket, name);
        socket.emit(EVENTS.RESTORE_LOBBY, { lobby: Object.assign({}, service.lobby, { ready: Object.fromEntries(service.lobby.ready) }), playerName: name });
      }
    } else {
      // Room no longer exists – reset registry and show welcome
      clientRegistry.set(clientId, {});
      socket.emit(EVENTS.SHOW_WELCOME);
    }
  }

  console.log('New socket connected:', socket.id);
  // Room operations
  socket.on(EVENTS.CREATE_ROOM, roomId => roomManager.createRoom(roomId));
  socket.on(EVENTS.LIST_ROOMS, () => roomManager.listRooms(socket));
  socket.on(EVENTS.JOIN_ROOM, (roomId, name) => {
    roomManager.joinRoom(socket, roomId, name);
    if (socket.clientId) {
      clientRegistry.set(socket.clientId, { roomId, name });
    }
  });
  socket.on(EVENTS.LEAVE_ROOM, () => {
    if (socket.clientId) clientRegistry.set(socket.clientId, {});
    roomManager.leaveRoom(socket);
  });

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
  socket.on(EVENTS.SPAWN_UNIT, (type, col = 0) => {
    const roomId = roomManager.socketToRoom.get(socket.id);
    if (!roomId) return;
    const service = roomManager.rooms.get(roomId);
    if (service && typeof service.spawnUnit === 'function') {
      service.spawnUnit(socket, type, col);
    }
  });

  socket.on('disconnect', () => {
    const roomId = roomManager.socketToRoom.get(socket.id);
    if (!roomId) return;
    const service = roomManager.rooms.get(roomId);
    if (service && typeof service.disconnect === 'function') {
      service.disconnect(socket);
    }
    roomManager.socketToRoom.delete(socket.id);
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
