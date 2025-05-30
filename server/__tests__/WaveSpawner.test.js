import { WaveSpawner } from '../ticker/WaveSpawner.js';

describe('WaveSpawner', () => {
  it('spawns correct number of enemies for a wave', () => {
    const io = { emit: jest.fn() };
    // Mock grid with addUnitToCell
    const grid = { columns: 5, addUnitToCell: jest.fn() };
    const gameState = { wave: 2, addUnit: jest.fn(), grid };
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
