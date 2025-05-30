import Grid from '../grid/Grid.js';
import { spawnEnemyUnit, spawnPlayerUnit } from '../game/Spawner.js';

describe('Spawner', () => {
  it('spawns enemy units in a random column at the second row from the top', () => {
    const grid = new Grid(3);
    const enemyConfig = { maxHealth: 10, damage: 2 };
    const enemy = spawnEnemyUnit(grid, enemyConfig);
    expect(enemy.type).toBe('enemy');
    expect(enemy.maxHealth).toBe(10);
    expect(enemy.damage).toBe(2);
    expect(enemy.row).toBe(1); // second from top
    expect(enemy.col).toBeGreaterThanOrEqual(0);
    expect(enemy.col).toBeLessThan(grid.columns);
    expect(grid.getUnitsInCell(1, enemy.col)).toContain(enemy);
  });

  it('spawns player units at the selected column in the second row from the bottom', () => {
    const grid = new Grid(4);
    const playerConfig = { maxHealth: 8, damage: 3 };
    const selectedCol = 2;
    const player = spawnPlayerUnit(grid, playerConfig, selectedCol);
    expect(player.type).toBe('player');
    expect(player.maxHealth).toBe(8);
    expect(player.damage).toBe(3);
    expect(player.row).toBe(grid.rows - 2);
    expect(player.col).toBe(selectedCol);
    expect(grid.getUnitsInCell(grid.rows - 2, selectedCol)).toContain(player);
  });

  it('throws if player unit is spawned in an invalid column', () => {
    const grid = new Grid(3);
    const playerConfig = { maxHealth: 8, damage: 3 };
    expect(() => spawnPlayerUnit(grid, playerConfig, -1)).toThrow();
    expect(() => spawnPlayerUnit(grid, playerConfig, 5)).toThrow();
  });
});
