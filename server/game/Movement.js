// Movement.js - Handles movement of units on the grid each tick

function moveEnemyUnits(grid, onCastleHit) {
  // Traverse from right to left (columns-1 → 1) so a unit moved this tick isn't processed again
  for (let col = grid.columns - 1; col >= 1; col--) {
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

        grid.removeUnitFromCell(unit.row, col, unit.id);

        if (grid.isCastleCell(nextCol)) {
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
  // Traverse from left to right (col 0 onwards), so a unit moved this tick isn't processed again.
  for (let col = 0; col < grid.columns - 1; col++) {
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
        grid.removeUnitFromCell(unit.row, col, unit.id);

        if (grid.isPortalCell(nextCol)) {
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

