import { GameService } from '../services/GameService.js';
jest.mock('../config.js', () => ({ TIMINGS: { WAVE_INTERVAL: 60000 } }));
jest.mock('../events.js', () => ({ EVENTS: { GAME_START: 'GAME_START' } }));

jest.useFakeTimers();

describe('GameService', () => {
  let service;

  afterEach(() => {
    if (service && typeof service.endGame === 'function') {
      service.endGame();
    }
    jest.runOnlyPendingTimers();
    service = undefined;
  });

  it('can start and end a game', () => {
    const io = { emit: jest.fn(), in: jest.fn(() => ({ emit: jest.fn() })) };
    service = new GameService(io, 'room1');
    expect(() => service.startGame()).not.toThrow();
    expect(() => service.endGame()).not.toThrow();
  });

  it('handles player join and leave logic', () => {
    const io = { emit: jest.fn(), in: jest.fn(() => ({ emit: jest.fn() })) };
    service = new GameService(io, 'room1');
    expect(() => service.addPlayer('player1')).not.toThrow();
    expect(() => service.removePlayer('player1')).not.toThrow();
  });
  it('can be constructed', () => {
    const io = { emit: jest.fn(), in: jest.fn(() => ({ emit: jest.fn() })) };
    service = new GameService(io, 'room1');
    expect(service).toBeDefined();
  });
});
