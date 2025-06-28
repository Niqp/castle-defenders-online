import Grid from '../grid/Grid.js';
import { spawnEnemyUnit, spawnPlayerUnit } from '../game/Spawner.js';

describe('Spawner', () => {
  it('spawns enemy units in the portal column (rightmost) and places them correctly on the grid', () => {
    const grid = new Grid(3);
    const enemyConfig = { maxHealth: 10, damage: 2 };
    const enemy = spawnEnemyUnit(grid, enemyConfig);
    expect(enemy.type).toBe('enemy');
    expect(enemy.maxHealth).toBe(10);
    expect(enemy.damage).toBe(2);
    expect(enemy.col).toBe(grid.columns - 1); // portal column
    expect(enemy.row).toBeGreaterThanOrEqual(0);
    expect(enemy.row).toBeLessThan(grid.rows);
    expect(grid.getUnitsInCell(enemy.row, grid.columns - 1)).toContain(enemy);
  });

  it('spawns player units at the selected row in the castle column', () => {
    const grid = new Grid(4);
    const playerConfig = { maxHealth: 8, damage: 3 };
    const selectedRow = 2;
    const player = spawnPlayerUnit(grid, playerConfig, selectedRow);
    expect(player.type).toBe('player');
    expect(player.maxHealth).toBe(8);
    expect(player.damage).toBe(3);
    expect(player.col).toBe(0); // castle column
    expect(player.row).toBe(selectedRow);
    expect(grid.getUnitsInCell(selectedRow, 0)).toContain(player);
  });

  it('throws if player unit is spawned in an invalid row', () => {
    const grid = new Grid(3);
    const playerConfig = { maxHealth: 8, damage: 3 };
    expect(() => spawnPlayerUnit(grid, playerConfig, -1)).toThrow();
    expect(() => spawnPlayerUnit(grid, playerConfig, grid.rows)).toThrow(); // Use grid.rows which is out of bounds
  });
});
