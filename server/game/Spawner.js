// Spawner.js - Handles spawning of enemy and player units on the grid
import EnemyUnit from '../units/EnemyUnit.js';
import PlayerUnit from '../units/PlayerUnit.js';

// Spawns an enemy in a random column at the second row from the top
function spawnEnemyUnit(grid, enemyConfig) {
  const row = 0; // Portal row
  const col = Math.floor(Math.random() * grid.columns);
  const enemy = new EnemyUnit({ ...enemyConfig, row, col });
  enemy.justSpawned = true;
  grid.addUnitToCell(row, col, enemy);
  return enemy;
}

// Spawns a player unit at the selected column in the second row from the bottom
function spawnPlayerUnit(grid, playerConfig, selectedCol) {
  const row = grid.rows - 1; // Castle row
  const col = selectedCol;
  if (col < 0 || col >= grid.columns) throw new Error('Invalid column for player spawn');
  const playerUnit = new PlayerUnit({ ...playerConfig, row, col });
  playerUnit.justSpawned = true;
  grid.addUnitToCell(row, col, playerUnit);
  return playerUnit;
}

export { spawnEnemyUnit, spawnPlayerUnit };
