import { WaveSpawner } from '../ticker/WaveSpawner.js';
import GameState from '../game/GameState.js';

describe('WaveSpawner', () => {
  it('spawns correct number of enemies for a wave', () => {
    const io = { emit: jest.fn(), in: jest.fn(() => ({ emit: jest.fn() })) };
    const gameState = new GameState(['A','B']);
    gameState.wave = 2;
    const spawner = new WaveSpawner(io, 'room', gameState);
    const enemies = spawner.spawnWave();
    const expected = 3 + gameState.wave;
    expect(enemies.length).toBe(expected);
  });
  it('can be constructed', () => {
    const io = { emit: jest.fn(), in: jest.fn(() => ({ emit: jest.fn() })) };
    const gameState = { wave: 0, grid: { columns: 12, rows: 3, getAliveRows: () => [0,1,2] }, addUnit: jest.fn(), getAliveRows: () => [0,1,2] };
    const spawner = new WaveSpawner(io, 'room', gameState);
    expect(spawner).toBeDefined();
  });
});
