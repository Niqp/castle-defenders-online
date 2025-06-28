// Movement.js - Handles movement of units on the grid each tick

function moveEnemyUnits(grid, onCastleHit) {
  // Traverse from LEFT to RIGHT (1 → columns-1). This ensures that after a
  // unit moves one cell to the left it will not be evaluated again in the
  // same tick because its new column index has already been processed.
  for (let col = 1; col < grid.columns; col++) {
    for (let row = 0; row < grid.rows; row++) {
      const units = [...grid.getUnitsInCell(row, col).filter(u => u.type === 'enemy')];
      for (const unit of units) {
        if (unit.justSpawned) {
          // Enemy waits one tick after spawning
          unit.justSpawned = false;
          continue;
        }
        if (unit.inBattle) continue;
        if (grid.isCastleCell(unit.col)) continue;

        const nextCol = unit.col - 1;

        // If the next cell contains any player unit, stop here and let battle start
        const nextCellUnits = grid.getUnitsInCell(row, nextCol);
        if (nextCellUnits.some(u => u.type === 'player')) {
          continue; // stay in place; player will move into us
        }

        grid.removeUnitFromCell(row, col, unit.id);

        if (grid.isCastleCell(nextCol)) {
          // Update unit position before calling callback so GameState.removeUnit works correctly
          unit.col = nextCol;
          if (typeof onCastleHit === 'function') onCastleHit(unit, row);
        } else {
          unit.col = nextCol;
          grid.addUnitToCell(row, nextCol, unit);
        }
      }
    }
  }
}




function movePlayerUnits(grid, onPortalReached) {
  // Traverse from RIGHT to LEFT (columns-2 → 0). After a unit steps to the
  // right it lands on a column that has already been processed this tick,
  // preventing multiple moves per cycle.
  for (let col = grid.columns - 2; col >= 0; col--) {
    for (let row = 0; row < grid.rows; row++) {
      const units = [...grid.getUnitsInCell(row, col).filter(u => u.type === 'player')];
      for (const unit of units) {
        if (unit.justSpawned) {
          // Clear spawn flag so the unit moves on its first eligible tick
          unit.justSpawned = false;
        }
        if (unit.inBattle) continue;

        const nextCol = unit.col + 1;

        // Already at portal column? (shouldn't happen; handled below)
        if (grid.isPortalCell(unit.col)) continue;

        // If the next cell contains an enemy, move into that cell to start battle.
        const nextCellUnits = grid.getUnitsInCell(row, nextCol);

        // Remove from current cell first
        grid.removeUnitFromCell(row, col, unit.id);

        if (grid.isPortalCell(nextCol)) {
          // Update unit position before calling callback so GameState.removeUnit works correctly
          unit.col = nextCol;
          if (typeof onPortalReached === 'function') onPortalReached(unit, row);
        } else {
          unit.col = nextCol;
          grid.addUnitToCell(row, nextCol, unit);
        }
      }
    }
  }
}






export { moveEnemyUnits, movePlayerUnits };

