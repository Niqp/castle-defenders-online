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
  cors: { origin: CORS_ORIGIN },
  // Add Socket.IO configuration for better disconnection handling
  pingTimeout: 60000,
  pingInterval: 25000,
  transports: ['websocket', 'polling']
});

app.use(cors());
app.use(express.json());

// Initialize room manager
const roomManager = new RoomManager(io);
const clientRegistry = new ClientRegistry();

// Global error handler for uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  // Don't exit the process, just log the error
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Don't exit the process, just log the error
});

// Handle room cleanup events
io.on('__room_cleanup', (data) => {
  try {
    const { roomId } = data;
    console.log(`Clearing client registry for room: ${roomId}`);
    
    // Clear client registry entries for all players in this room
    for (const [clientId, record] of clientRegistry.clients.entries()) {
      if (record.roomId === roomId) {
        clientRegistry.set(clientId, {}); // Clear the record but keep the clientId
      }
    }
  } catch (error) {
    console.error('Error during room cleanup:', error);
  }
});

// Socket event routing
io.on(EVENTS.CONNECTION, socket => {
  // Wrap entire connection handler in try-catch
  try {
    // ------------------------------
    // Identify logical client
    // ------------------------------
    const clientId = socket.handshake.auth?.clientId;
    socket.clientId = clientId; // cache for later convenience

    const registryRecord = clientId ? clientRegistry.get(clientId) : undefined;

    if (!clientId || !registryRecord) {
      // Unknown client – show welcome screen
      safeEmit(socket, EVENTS.SHOW_WELCOME);
    } else if (!registryRecord.roomId) {
      // Known client with no active room – welcome screen
      safeEmit(socket, EVENTS.SHOW_WELCOME);
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
          safeEmit(socket, EVENTS.RESTORE_LOBBY, { lobby: Object.assign({}, service.lobby, { ready: Object.fromEntries(service.lobby.ready) }), playerName: name });
        }
      } else {
        // Room no longer exists – reset registry and show welcome
        clientRegistry.set(clientId, {});
        safeEmit(socket, EVENTS.SHOW_WELCOME);
      }
    }

    console.log('New socket connected:', socket.id);
    
    // Add error event handler for this socket
    socket.on('error', (error) => {
      console.error(`Socket error for ${socket.id}:`, error);
    });
    
    // Room operations with error handling
    socket.on(EVENTS.CREATE_ROOM, (roomId) => {
      try {
        roomManager.createRoom(roomId);
      } catch (error) {
        console.error('Error creating room:', error);
        safeEmit(socket, 'error', { message: 'Failed to create room' });
      }
    });
    
    socket.on(EVENTS.LIST_ROOMS, () => {
      try {
        roomManager.listRooms(socket);
      } catch (error) {
        console.error('Error listing rooms:', error);
        safeEmit(socket, 'error', { message: 'Failed to list rooms' });
      }
    });
    
    socket.on(EVENTS.JOIN_ROOM, (roomId, name) => {
      try {
        roomManager.joinRoom(socket, roomId, name);
        if (socket.clientId) {
          clientRegistry.set(socket.clientId, { roomId, name });
        }
      } catch (error) {
        console.error('Error joining room:', error);
        safeEmit(socket, 'error', { message: 'Failed to join room' });
      }
    });
    
    socket.on(EVENTS.LEAVE_ROOM, () => {
      try {
        if (socket.clientId) clientRegistry.set(socket.clientId, {});
        roomManager.leaveRoom(socket);
      } catch (error) {
        console.error('Error leaving room:', error);
      }
    });

    // Handle ready toggle from client
    socket.on(EVENTS.SET_READY, (ready) => {
      try {
        const roomId = roomManager.socketToRoom.get(socket.id);
        if (!roomId) return;
        const service = roomManager.rooms.get(roomId);
        if (service && typeof service.setReady === 'function') {
          service.setReady(socket, ready);
        }
      } catch (error) {
        console.error('Error setting ready state:', error);
      }
    });

    // Handle mine gold button from client
    socket.on(EVENTS.MINE, () => {
      try {
        const roomId = roomManager.socketToRoom.get(socket.id);
        if (!roomId) return;
        const service = roomManager.rooms.get(roomId);
        if (service && typeof service.mine === 'function') {
          service.mine(socket);
        }
      } catch (error) {
        console.error('Error mining gold:', error);
      }
    });

    // Handle hire worker from client
    socket.on(EVENTS.HIRE_WORKER, (type) => {
      try {
        const roomId = roomManager.socketToRoom.get(socket.id);
        if (!roomId) return;
        const service = roomManager.rooms.get(roomId);
        if (service && typeof service.hireWorker === 'function') {
          service.hireWorker(socket, type);
        }
      } catch (error) {
        console.error('Error hiring worker:', error);
      }
    });

    // Handle spawn unit from client
    socket.on(EVENTS.SPAWN_UNIT, (type, col = 0) => {
      try {
        const roomId = roomManager.socketToRoom.get(socket.id);
        if (!roomId) return;
        const service = roomManager.rooms.get(roomId);
        if (service && typeof service.spawnUnit === 'function') {
          service.spawnUnit(socket, type, col);
        }
      } catch (error) {
        console.error('Error spawning unit:', error);
      }
    });

    // Handle purchase upgrade from client
    socket.on(EVENTS.PURCHASE_UPGRADE, (upgradeId) => {
      try {
        const roomId = roomManager.socketToRoom.get(socket.id);
        if (!roomId) return;
        const service = roomManager.rooms.get(roomId);
        if (service && typeof service.purchaseUpgrade === 'function') {
          service.purchaseUpgrade(socket, upgradeId);
        }
      } catch (error) {
        console.error('Error purchasing upgrade:', error);
      }
    });

    // Handle toggle auto-spawn from client
    socket.on(EVENTS.TOGGLE_AUTO_SPAWN, (unitType) => {
      try {
        const roomId = roomManager.socketToRoom.get(socket.id);
        if (!roomId) return;
        const service = roomManager.rooms.get(roomId);
        if (service && typeof service.toggleAutoSpawn === 'function') {
          service.toggleAutoSpawn(socket, unitType);
        }
      } catch (error) {
        console.error('Error toggling auto-spawn:', error);
      }
    });

    // Handle set auto-spawn amount from client
    socket.on(EVENTS.SET_AUTO_SPAWN_AMOUNT, (unitType, amount) => {
      try {
        const roomId = roomManager.socketToRoom.get(socket.id);
        if (!roomId) return;
        const service = roomManager.rooms.get(roomId);
        if (service && typeof service.setAutoSpawnAmount === 'function') {
          service.setAutoSpawnAmount(socket, unitType, amount);
        }
      } catch (error) {
        console.error('Error setting auto-spawn amount:', error);
      }
    });

    socket.on('disconnect', () => {
      try {
        console.log(`Socket disconnected: ${socket.id}`);
        const roomId = roomManager.socketToRoom.get(socket.id);
        if (!roomId) return;
        const service = roomManager.rooms.get(roomId);
        if (service && typeof service.disconnect === 'function') {
          service.disconnect(socket);
        }
        roomManager.socketToRoom.delete(socket.id);
      } catch (error) {
        console.error('Error handling disconnect:', error);
      }
    });
  } catch (error) {
    console.error('Error in connection handler:', error);
    safeEmit(socket, 'error', { message: 'Connection error occurred' });
  }
});

// Helper function to safely emit to a socket
function safeEmit(socket, event, ...args) {
  try {
    if (socket && socket.connected) {
      socket.emit(event, ...args);
    }
  } catch (error) {
    console.error(`Error emitting ${event} to socket ${socket?.id}:`, error);
  }
}

// Health check
app.get('/', (req, res) => {
  res.send('Castle Defenders Online Server Running');
});

// Start server
server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
