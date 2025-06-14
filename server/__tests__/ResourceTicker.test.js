import { ResourceTicker } from '../ticker/ResourceTicker.js';

describe('ResourceTicker', () => {
  let ticker;
  afterEach(() => {
    if (ticker) ticker.stop();
    ticker = undefined;
  });
  it('increments resources for all players each tick', () => {
    const io = { to: jest.fn(() => ({ emit: jest.fn() })), emit: jest.fn() };
    const socketToName = new Map([[1, 'Alice'], [2, 'Bob']]);
    const players = [
      { name: 'Alice', gold: 0, food: 0, workers: { Farmer: 1 } },
      { name: 'Bob', gold: 5, food: 0, workers: { Farmer: 2 } }
    ];
    const ticker = new ResourceTicker(io, socketToName, players);
    ticker.tick();
    expect(players[0].food).toBeGreaterThan(0);
    expect(players[1].food).toBeGreaterThan(0);
    ticker.stop();
  });

  it('emits resource updates via io.to(id).emit', () => {
    const emitMock = jest.fn();
    const io = { to: jest.fn(() => ({ emit: emitMock })), emit: jest.fn() };
    const socketToName = new Map([[1, 'Alice']]);
    const players = [{ name: 'Alice', gold: 0, food: 0, workers: { Farmer: 1 } }];
    const ticker = new ResourceTicker(io, socketToName, players);
    ticker.tick();
    expect(emitMock).toHaveBeenCalled();
    ticker.stop();
  });

  it('can be stopped safely', () => {
    const io = { to: jest.fn(() => ({ emit: jest.fn() })), emit: jest.fn() };
    const socketToName = new Map();
    const players = [];
    const ticker = new ResourceTicker(io, socketToName, players);
    expect(() => ticker.stop()).not.toThrow();
  });
  it('can be constructed and stopped without error', () => {
    const io = { to: jest.fn(() => ({ emit: jest.fn() })), emit: jest.fn() };
    const socketToName = new Map();
    const players = [];
    const ticker = new ResourceTicker(io, socketToName, players);
    expect(ticker).toBeDefined();
    ticker.stop();
  });
});
