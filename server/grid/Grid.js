// Grid.js
// Manages the game grid for castle defenders

const DEFAULT_ROWS = 12; // Can be changed later
const MIN_COLUMNS = 3; // Scales up with player count

class Grid {
  constructor(playerCount = 1, rows = DEFAULT_ROWS) {
    this.rows = rows;
    this.columns = Math.max(MIN_COLUMNS, playerCount);
    // Initialize grid as 2D array: [row][col]
    this.cells = Array.from({ length: this.rows }, (_, rowIdx) => {
      // Top row: Enemy Portal
      if (rowIdx === 0) return Array(this.columns).fill({ type: 'portal' });
      // Bottom row: Castle
      if (rowIdx === this.rows - 1) return Array(this.columns).fill({ type: 'castle' });
      // Other rows: empty
      return Array(this.columns).fill(null);
    });
  }

  // Returns true if the cell is in the portal row
  isPortalCell(row) {
    return row === 0;
  }

  // Returns true if the cell is in the castle row
  isCastleCell(row) {
    return row === this.rows - 1;
  }

  // Get all columns in the portal row
  getPortalCells() {
    return this.cells[0];
  }

  // Get all columns in the castle row
  getCastleCells() {
    return this.cells[this.rows - 1];
  }

  // Get contents of a cell
  getCell(row, col) {
    if (this.isValidCell(row, col)) {
      return this.cells[row][col];
    }
    return null;
  }

  // Set contents of a cell
  setCell(row, col, value) {
    if (this.isValidCell(row, col)) {
      this.cells[row][col] = value;
      return true;
    }
    return false;
  }

  // Clear a cell
  clearCell(row, col) {
    if (this.isValidCell(row, col)) {
      this.cells[row][col] = null;
      return true;
    }
    return false;
  }

  // Check if a cell is within bounds
  isValidCell(row, col) {
    return (
      row >= 0 && row < this.rows &&
      col >= 0 && col < this.columns
    );
  }

  // Get all units in a cell (if storing arrays)
  getUnitsInCell(row, col) {
    const cell = this.getCell(row, col);
    if (Array.isArray(cell)) return cell;
    if (cell == null) return [];
    return [cell];
  }

  // Place a unit in a cell (supports multiple units per cell)
  addUnitToCell(row, col, unit) {
    if (!this.isValidCell(row, col)) return false;
    if (!Array.isArray(this.cells[row][col])) {
      this.cells[row][col] = [];
    }
    this.cells[row][col].push(unit);
    return true;
  }

  // Remove a unit from a cell
  removeUnitFromCell(row, col, unitId) {
    if (!this.isValidCell(row, col)) return false;
    let cell = this.cells[row][col];
    if (!Array.isArray(cell)) return false;
    this.cells[row][col] = cell.filter(u => u.id !== unitId);
    return true;
  }

  // Utility to scale columns if player count increases
  setPlayerCount(playerCount) {
    const newColumns = Math.max(MIN_COLUMNS, playerCount);
    if (newColumns !== this.columns) {
      // Resize columns for each row
      for (let row = 0; row < this.rows; row++) {
        if (newColumns > this.columns) {
          // Add new columns
          this.cells[row].push(...Array(newColumns - this.columns).fill(null));
        } else {
          // Remove extra columns
          this.cells[row].length = newColumns;
        }
      }
      this.columns = newColumns;
    }
  }
}

export default Grid;
export { DEFAULT_ROWS, MIN_COLUMNS };
