// GameState.js - Holds main game state, grid, and castle health
import Grid, { DEFAULT_ROWS, MIN_COLUMNS } from '../grid/Grid.js';

class GameState {
  constructor(playerCount = 1, rows = DEFAULT_ROWS, columns = MIN_COLUMNS, castleHealth = 100) {
    this.grid = new Grid(playerCount, rows);
    this.playerCount = playerCount;
    this.castleHealth = castleHealth;
    // Optionally, track units globally if needed
    this.units = new Map(); // id -> unit
  }

  addUnit(unit) {
    this.units.set(unit.id, unit);
  }

  removeUnit(unit) {
    this.units.delete(unit.id);
    this.grid.removeUnitFromCell(unit.row, unit.col, unit.id);
  }

  applyCastleDamage(amount) {
    this.castleHealth = Math.max(0, this.castleHealth - amount);
  }

  isCastleAlive() {
    return this.castleHealth > 0;
  }
}

export default GameState;
