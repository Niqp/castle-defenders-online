// Grid.js
// Manages the game grid for castle defenders

import { GRID_CONFIG } from '../config.js';

const { DEFAULT_COLUMNS, MIN_ROWS } = GRID_CONFIG;

class Grid {
  constructor(playerCount = 1, columns = DEFAULT_COLUMNS) {
    this.columns = columns;
    this.rows = Math.max(MIN_ROWS, playerCount);
    // Initialize grid as 2D array: [row][col]
    this.cells = Array.from({ length: this.rows }, (_, rowIdx) => {
      // First column: Castle
      // Last column: Enemy Portal
      return Array(this.columns).fill(null);
    });
    
    // Set castle cells (leftmost column)
    for (let row = 0; row < this.rows; row++) {
      this.cells[row][0] = { type: 'castle' };
    }
    
    // Set portal cells (rightmost column) 
    for (let row = 0; row < this.rows; row++) {
      this.cells[row][this.columns - 1] = { type: 'portal' };
    }
  }

  // Returns true if the cell is in the castle column
  isCastleCell(col) {
    return col === 0;
  }

  // Returns true if the cell is in the portal column
  isPortalCell(col) {
    return col === this.columns - 1;
  }

  // Get all rows in the castle column
  getCastleCells() {
    return this.cells.map(row => row[0]);
  }

  // Get all rows in the portal column
  getPortalCells() {
    return this.cells.map(row => row[this.columns - 1]);
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
    // Don't treat castle/portal structural markers as units
    if (cell.type === 'castle' || cell.type === 'portal') {
      // Check if it has units array (new structure)
      return cell.units || [];
    }
    return [cell];
  }

  // Place a unit in a cell (supports multiple units per cell)
  addUnitToCell(row, col, unit) {
    if (!this.isValidCell(row, col)) return false;
    const cell = this.cells[row][col];
    
    // If it's a castle or portal cell, we need to preserve the marker
    if (cell && cell.type && (cell.type === 'castle' || cell.type === 'portal')) {
      if (cell.units) {
        // Already has units, just add to the array
        cell.units.push(unit);
      } else {
        // Convert to a special structure that preserves the marker
        this.cells[row][col] = {
          type: cell.type,
          units: [unit]
        };
      }
    } else if (Array.isArray(cell)) {
      // Regular cell with units
      cell.push(unit);
    } else {
      // Empty cell, create array
      this.cells[row][col] = [unit];
    }
    return true;
  }

  // Remove a unit from a cell
  removeUnitFromCell(row, col, unitId) {
    if (!this.isValidCell(row, col)) return false;
    let cell = this.cells[row][col];
    
    if (Array.isArray(cell)) {
      // Regular cell with units
      this.cells[row][col] = cell.filter(u => u.id !== unitId);
    } else if (cell && cell.type && cell.units) {
      // Castle/portal cell with units
      cell.units = cell.units.filter(u => u.id !== unitId);
      // If no units left, revert to simple marker
      if (cell.units.length === 0) {
        this.cells[row][col] = { type: cell.type };
      }
    } else {
      return false;
    }
    return true;
  }

  // Utility to scale rows if player count increases
  setPlayerCount(playerCount) {
    const newRows = Math.max(MIN_ROWS, playerCount);
    if (newRows !== this.rows) {
      if (newRows > this.rows) {
        // Add new rows
        for (let i = this.rows; i < newRows; i++) {
          const newRow = Array(this.columns).fill(null);
          // Set castle and portal cells for new row
          newRow[0] = { type: 'castle' };
          newRow[this.columns - 1] = { type: 'portal' };
          this.cells.push(newRow);
        }
      } else {
        // Remove extra rows
        this.cells.length = newRows;
      }
      this.rows = newRows;
    }
  }
}

export default Grid;
