// Spawner.js - Handles spawning of enemy and player units on the grid
import EnemyUnit from '../units/EnemyUnit.js';
import PlayerUnit from '../units/PlayerUnit.js';

// Spawns an enemy at a specified row (random if not provided) in the portal column.
function spawnEnemyUnit(grid, enemyConfig, specifiedRow = null) {
  const col = grid.columns - 1; // Portal column
  const row = specifiedRow !== null ? specifiedRow : Math.floor(Math.random() * grid.rows);
  const enemy = new EnemyUnit({ ...enemyConfig, row, col });
  enemy.justSpawned = true;
  grid.addUnitToCell(row, col, enemy);
  return enemy;
}

// Spawns a player unit at the selected row in the castle column
function spawnPlayerUnit(grid, playerConfig, selectedRow, owner, unitType) {
  const col = 0; // Castle column
  const row = selectedRow;
  if (row < 0 || row >= grid.rows) throw new Error('Invalid row for player spawn');
  const playerUnit = new PlayerUnit({ ...playerConfig, row, col, owner, unitType });
  playerUnit.justSpawned = true;
  grid.addUnitToCell(row, col, playerUnit);
  return playerUnit;
}

export { spawnEnemyUnit, spawnPlayerUnit };
