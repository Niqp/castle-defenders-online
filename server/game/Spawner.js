// Spawner.js - Handles spawning of enemy and player units on the grid
import EnemyUnit from '../units/EnemyUnit.js';
import PlayerUnit from '../units/PlayerUnit.js';

// Spawns an enemy in a random column at the second row from the top
function spawnEnemyUnit(grid, enemyConfig) {
  const row = 1; // Second from top (0 = portal)
  const col = Math.floor(Math.random() * grid.columns);
  const enemy = new EnemyUnit({ ...enemyConfig, row, col });
  grid.addUnitToCell(row, col, enemy);
  return enemy;
}

// Spawns a player unit at the selected column in the second row from the bottom
function spawnPlayerUnit(grid, playerConfig, selectedCol) {
  const row = grid.rows - 2; // Second from bottom (last = castle)
  const col = selectedCol;
  if (col < 0 || col >= grid.columns) throw new Error('Invalid column for player spawn');
  const playerUnit = new PlayerUnit({ ...playerConfig, row, col });
  grid.addUnitToCell(row, col, playerUnit);
  return playerUnit;
}

export { spawnEnemyUnit, spawnPlayerUnit };
