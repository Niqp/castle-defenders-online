// GameState.js - Holds main game state, grid, and per-player castle health tracking
import Grid, { DEFAULT_ROWS } from '../grid/Grid.js';

class GameState {
  /**
   * @param {string[]} playerNames – Ordered list of players. Each gets a dedicated column.
   * @param {number} rows – Grid rows (default DEFAULT_ROWS)
   * @param {number} initialCastleHp – Starting HP for every castle
   */
  constructor(playerNames = [], rows = DEFAULT_ROWS, initialCastleHp = 100) {
    if (!Array.isArray(playerNames)) {
      throw new Error('GameState expects an array of playerNames');
    }
    this.playerNames = playerNames;
    this.playerCount = playerNames.length;

    // Grid columns match player count so each player has one lane
    this.grid = new Grid(this.playerCount, rows);

    // Per-player HP map
    this.castleHealth = Object.fromEntries(playerNames.map((n) => [n, initialCastleHp]));

    // Column ↔ player look-ups
    this.playerToCol = Object.fromEntries(playerNames.map((n, i) => [n, i]));
    this.colToPlayer = Object.fromEntries(playerNames.map((n, i) => [i, n]));

    // Global unit registry
    this.units = new Map();
  }

  /* ───────────── Unit helpers ───────────── */
  addUnit(unit) {
    this.units.set(unit.id, unit);
  }
  removeUnit(unit) {
    this.units.delete(unit.id);
    this.grid.removeUnitFromCell(unit.row, unit.col, unit.id);
  }

  /* ───────────── Castle HP ───────────── */
  applyCastleDamage(col, dmg) {
    const player = this.colToPlayer[col];
    if (!player) return;
    this.castleHealth[player] = Math.max(0, this.castleHealth[player] - dmg);
  }
  isPlayerAlive(name) {
    return (this.castleHealth[name] || 0) > 0;
  }
  areAnyCastlesAlive() {
    return Object.values(this.castleHealth).some((hp) => hp > 0);
  }
  getAliveColumns() {
    return Object.entries(this.colToPlayer)
      .filter(([col, name]) => this.isPlayerAlive(name))
      .map(([col]) => Number(col));
  }
}

export default GameState;
