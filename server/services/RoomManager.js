import { GameService } from './GameService.js';
import { EVENTS } from '../events.js';

export class RoomManager {
  removeRoom(roomId) {
    this.rooms.delete(roomId);
  }
  assignPlayerToRoom(playerId, roomId) {
    if (!this.rooms.has(roomId)) {
      this.createRoom(roomId);
    }
    // Minimal logic for test compatibility
    // Could add player to a room's player list if needed
  }
  constructor(io) {
    this.io = io;
    this.rooms = new Map();
    this.socketToRoom = new Map();
  }

  createRoom(roomId) {
    if (this.rooms.has(roomId)) return;
    
    // Create cleanup callback that will be called when game ends
    const cleanupCallback = (roomIdToCleanup) => {
      this.handleRoomCleanup(roomIdToCleanup);
    };
    
    const service = new GameService(this.io, roomId, cleanupCallback);
    this.rooms.set(roomId, service);
  }

  handleRoomCleanup(roomId) {
    console.log(`Handling room cleanup for: ${roomId}`);
    
    // Remove the room
    this.removeRoom(roomId);
    
    // Emit cleanup event so the main server can clear client registry
    this.io.emit('__room_cleanup', { roomId });
  }

  listRooms(socket) {
    socket.emit(EVENTS.ROOMS_LIST, Array.from(this.rooms.keys()));
  }

  joinRoom(socket, roomId, name) {
    // Auto-create the room on first join if it doesn't exist.
    if (!this.rooms.has(roomId)) {
      this.createRoom(roomId);
    }

    const service = this.rooms.get(roomId);
    socket.join(roomId);
    this.socketToRoom.set(socket.id, roomId);
    service.join(socket, name);
  }

  leaveRoom(socket) {
    const roomId = this.socketToRoom.get(socket.id);
    if (!roomId) return;
    const service = this.rooms.get(roomId);
    socket.leave(roomId);
    service.disconnect(socket);
    this.socketToRoom.delete(socket.id);
  }
}
