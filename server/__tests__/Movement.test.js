import Grid from '../grid/Grid.js';
import { spawnEnemyUnit, spawnPlayerUnit } from '../game/Spawner.js';
import * as Movement from '../game/Movement.js';

describe('Movement', () => {
  it('moves enemy units down the lane each tick until castle', () => {
    const grid = new Grid(3);
    const enemy = spawnEnemyUnit(grid, { maxHealth: 10, damage: 2 });
    let reachedCastle = false;
    Movement.moveEnemyUnits(grid, (unit, col) => {
      reachedCastle = true;
      expect(unit).toBe(enemy);
      expect(col).toBe(enemy.col);
    });
    // Move enemy down until castle
    for (let i = 1; i < grid.rows - 2; i++) {
      Movement.moveEnemyUnits(grid, () => {});
    }
    // Last move should trigger castle callback
    Movement.moveEnemyUnits(grid, (unit, col) => {
      expect(unit).toBe(enemy);
      expect(col).toBe(enemy.col);
      reachedCastle = true;
    });
    expect(reachedCastle).toBe(true);
  });

  it('moves player units up the lane each tick until portal', () => {
    const grid = new Grid(3);
    const player = spawnPlayerUnit(grid, { maxHealth: 8, damage: 3 }, 1);
    let reachedPortal = false;
    Movement.movePlayerUnits(grid, (unit, col) => {
      expect(unit).toBe(player);
      expect(col).toBe(player.col);
      reachedPortal = true;
    });
    // Move player up until portal
    for (let i = grid.rows - 2; i > 1; i--) {
      Movement.movePlayerUnits(grid, () => {});
    }
    // Last move should trigger portal callback
    Movement.movePlayerUnits(grid, (unit, col) => {
      expect(unit).toBe(player);
      expect(col).toBe(player.col);
      reachedPortal = true;
    });
    expect(reachedPortal).toBe(true);
  });

  it('does not move units in battle mode', () => {
    const grid = new Grid(3);
    const enemy = spawnEnemyUnit(grid, { maxHealth: 10, damage: 2 });
    enemy.inBattle = true;
    Movement.moveEnemyUnits(grid, () => {});
    expect(grid.getUnitsInCell(enemy.row, enemy.col)).toContain(enemy);
    const player = spawnPlayerUnit(grid, { maxHealth: 8, damage: 3 }, 1);
    player.inBattle = true;
    Movement.movePlayerUnits(grid, () => {});
    expect(grid.getUnitsInCell(player.row, player.col)).toContain(player);
  });
});
