jest.mock('../config.js', () => ({}));
jest.mock('../events.js', () => ({}));
import { RoomManager } from '../services/RoomManager.js';

describe('RoomManager', () => {
  it('can create and remove rooms', () => {
    const io = { emit: jest.fn() };
    const manager = new RoomManager(io);
    expect(() => manager.createRoom('room1')).not.toThrow();
    expect(() => manager.removeRoom('room1')).not.toThrow();
  });

  it('can assign player to a room', () => {
    const io = { emit: jest.fn() };
    const manager = new RoomManager(io);
    manager.createRoom('room2');
    expect(() => manager.assignPlayerToRoom('player1', 'room2')).not.toThrow();
  });
  it('can be constructed', () => {
    const io = { emit: jest.fn() };
    const manager = new RoomManager(io);
    expect(manager).toBeDefined();
  });
});
