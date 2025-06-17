import { WaveSpawner } from '../ticker/WaveSpawner.js';
import GameState from '../game/GameState.js';

describe('WaveSpawner', () => {
  it('spawns correct number of enemies for a wave', () => {
    const io = { emit: jest.fn() };
    const gameState = new GameState(['A','B']);
    gameState.wave = 2;
    const spawner = new WaveSpawner(io, gameState);
    const enemies = spawner.spawnWave();
    const expected = 3 + gameState.wave;
    expect(enemies.length).toBe(expected);
  });
  it('can be constructed', () => {
    const io = { emit: jest.fn() };
    const gameState = { wave: 0, grid: { columns: 3, rows: 5 }, addUnit: jest.fn() };
    const spawner = new WaveSpawner(io, gameState);
    expect(spawner).toBeDefined();
  });
});
