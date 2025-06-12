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
  // Traverse from bottom up including castle row so newly spawned units will move next tick
  for (let row = grid.rows - 1; row > 0; row--) {
    for (let col = 0; col < grid.columns; col++) {
      const units = [...grid.getUnitsInCell(row, col).filter(u => u.type === 'player')];
      for (const unit of units) {
        if (unit.justSpawned) { unit.justSpawned = false; continue; }
        if (unit.inBattle) continue;
        if (grid.isPortalCell(unit.row)) continue;
        const nextRow = unit.row - 1;
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

