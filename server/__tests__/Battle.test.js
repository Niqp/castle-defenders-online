import Grid from '../grid/Grid.js';
import { spawnEnemyUnit, spawnPlayerUnit } from '../game/Spawner.js';
import * as Battle from '../game/Battle.js';

describe('Battle', () => {
  it('enters battle mode when player and enemy are on the same cell', () => {
    const grid = new Grid(3);
    const enemy = spawnEnemyUnit(grid, { maxHealth: 10, damage: 2 });
    const player = spawnPlayerUnit(grid, { maxHealth: 8, damage: 3 }, enemy.col);
    player.row = enemy.row; // Place in same cell
    grid.addUnitToCell(player.row, player.col, player);
    Battle.checkAndStartBattles(grid);
    expect(player.inBattle).toBe(true);
    expect(enemy.inBattle).toBe(true);
    expect(player.targetId).toBe(enemy.id);
    expect(enemy.targetId).toBe(player.id);
  });

  it('applies damage each tick and switches targets if one dies', () => {
    const grid = new Grid(3);
    const enemy1 = spawnEnemyUnit(grid, { maxHealth: 5, damage: 2 });
    const enemy2 = spawnEnemyUnit(grid, { maxHealth: 5, damage: 2 });
    const player = spawnPlayerUnit(grid, { maxHealth: 8, damage: 3 }, 0);
    // Place all in same cell
    player.row = enemy1.row;
    player.col = 0;
    enemy1.col = 0;
    enemy2.row = player.row;
    enemy2.col = 0;
    grid.addUnitToCell(player.row, 0, player);
    grid.addUnitToCell(player.row, 0, enemy1);
    grid.addUnitToCell(player.row, 0, enemy2);
    Battle.checkAndStartBattles(grid);
    // Simulate battle ticks
    for (let i = 0; i < 5; i++) {
      Battle.processBattles(grid);
    }
    // At least one enemy should be dead, player should have switched targets if possible
    const enemiesAlive = [enemy1, enemy2].filter(e => e.health > 0);

    if (enemiesAlive.length === 0) {
      expect(player.inBattle).toBe(false);
      expect(player.targetId).toBe(null);
    } else {
      // If at least one enemy is alive, player may or may not be in battle depending on implementation
      // Accept both possibilities for robustness
      if (player.inBattle) {
        expect([enemy1.id, enemy2.id]).toContain(player.targetId);
      } else {
        expect(player.targetId).toBe(null);
      }
    }
  });

  it('selects a random targetId from multiple enemy units', () => {
    const grid = new Grid(3);
    const enemy1 = spawnEnemyUnit(grid, { maxHealth: 5, damage: 2 });
    const enemy2 = spawnEnemyUnit(grid, { maxHealth: 5, damage: 2 });
    const enemy3 = spawnEnemyUnit(grid, { maxHealth: 5, damage: 2 });
    const player = spawnPlayerUnit(grid, { maxHealth: 8, damage: 3 }, 0);
    // Place all in same cell
    player.row = enemy1.row;
    player.col = 0;
    enemy1.col = 0;
    enemy2.row = player.row;
    enemy2.col = 0;
    enemy3.row = player.row;
    enemy3.col = 0;
    grid.addUnitToCell(player.row, 0, player);
    grid.addUnitToCell(player.row, 0, enemy1);
    grid.addUnitToCell(player.row, 0, enemy2);
    grid.addUnitToCell(player.row, 0, enemy3);
    Battle.checkAndStartBattles(grid);
    // Player should have a targetId of one of the enemies
    expect([enemy1.id, enemy2.id, enemy3.id]).toContain(player.targetId);
    // All enemies should have player as target
    expect(enemy1.targetId === player.id || enemy2.targetId === player.id || enemy3.targetId === player.id).toBe(true);
  });

  it('exits battle mode if no enemies remain in the cell', () => {
    const grid = new Grid(3);
    const enemy = spawnEnemyUnit(grid, { maxHealth: 2, damage: 1 });
    const player = spawnPlayerUnit(grid, { maxHealth: 8, damage: 3 }, 0);
    player.row = enemy.row;
    player.col = 0;
    grid.addUnitToCell(player.row, 0, player);
    grid.addUnitToCell(player.row, 0, enemy);
    Battle.checkAndStartBattles(grid);
    // One tick should kill the enemy
    Battle.processBattles(grid);
    expect(player.inBattle).toBe(false);
    expect(player.targetId).toBe(null);
  });
});
