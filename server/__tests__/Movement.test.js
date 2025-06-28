import Grid from '../grid/Grid.js';
import { spawnEnemyUnit, spawnPlayerUnit } from '../game/Spawner.js';
import * as Movement from '../game/Movement.js';

describe('Movement', () => {
  it('moves enemy units left until they hit the castle column', () => {
    const grid = new Grid(3);
    const enemy = spawnEnemyUnit(grid, { maxHealth: 10, damage: 2 });
    
    // Clear justSpawned flag so unit can move immediately
    enemy.justSpawned = false;

    let reachedCastle = false;

    // Iterate a safe number of ticks to ensure arrival
    for (let i = 0; i < grid.columns + 2; i++) {
      Movement.moveEnemyUnits(grid, (unit, row) => {
        reachedCastle = true;
        expect(unit).toBe(enemy);
        expect(row).toBe(enemy.row);
      });
      if (reachedCastle) break;
    }

    expect(reachedCastle).toBe(true);
  });

  it('moves player units right through the lane each tick until portal', () => {
    const grid = new Grid(3);
    const player = spawnPlayerUnit(grid, { maxHealth: 8, damage: 3 }, 1);
    
    // Clear justSpawned flag so unit can move immediately
    player.justSpawned = false;
    
    let reachedPortal = false;
    // Run enough ticks to reach portal
    for (let i = 0; i < grid.columns + 2; i++) {
      Movement.movePlayerUnits(grid, (unit, row) => {
        expect(unit).toBe(player);
        expect(row).toBe(player.row);
        reachedPortal = true;
      });
      if (reachedPortal) break;
    }
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
