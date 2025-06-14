// Movement.js - Handles movement of units on the grid each tick

function moveEnemyUnits(grid, onCastleHit) {
  // Traverse from bottom-up (rows-2 → 0) so a unit moved this tick isn't processed again
  for (let row = grid.rows - 2; row >= 0; row--) {
    for (let col = 0; col < grid.columns; col++) {
      const units = [...grid.getUnitsInCell(row, col).filter(u => u.type === 'enemy')];
      for (const unit of units) {
        if (unit.justSpawned) { unit.justSpawned = false; continue; }
        if (unit.inBattle) continue;
        if (grid.isCastleCell(unit.row)) continue;

        const nextRow = unit.row + 1;

        // If the next cell contains any player unit, stop here and let battle start
        const nextCellUnits = grid.getUnitsInCell(nextRow, col);
        if (nextCellUnits.some(u => u.type === 'player')) {
          continue; // stay in place; player will move into us
        }

        grid.removeUnitFromCell(unit.row, col, unit.id);

        if (grid.isCastleCell(nextRow)) {
          if (typeof onCastleHit === 'function') onCastleHit(unit, col);
        } else {
          unit.row = nextRow;
          grid.addUnitToCell(nextRow, col, unit);
        }
      }
    }
  }
}




function movePlayerUnits(grid, onPortalReached) {
  // Traverse from top (row 1) downwards, so a unit moved this tick isn't processed again.
  for (let row = 1; row < grid.rows; row++) {
    for (let col = 0; col < grid.columns; col++) {
      const units = [...grid.getUnitsInCell(row, col).filter(u => u.type === 'player')];
      for (const unit of units) {
        // Newly spawned units wait one tick
        if (unit.justSpawned) { unit.justSpawned = false; continue; }
        if (unit.inBattle) continue;

        const nextRow = unit.row - 1;

        // Already at portal row? (shouldn't happen; handled below)
        if (grid.isPortalCell(unit.row)) continue;

        // If the next cell contains an enemy, move into that cell to start battle.
        const nextCellUnits = grid.getUnitsInCell(nextRow, col);

        // Remove from current cell first
        grid.removeUnitFromCell(unit.row, col, unit.id);

        if (grid.isPortalCell(nextRow)) {
          if (typeof onPortalReached === 'function') onPortalReached(unit, col);
        } else {
          unit.row = nextRow;
          grid.addUnitToCell(nextRow, col, unit);
        }
      }
    }
  }
}






export { moveEnemyUnits, movePlayerUnits };

