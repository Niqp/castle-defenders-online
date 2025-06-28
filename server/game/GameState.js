// GameState.js - Holds main game state, grid, and per-player castle health tracking
import Grid, { DEFAULT_COLUMNS } from '../grid/Grid.js';

class GameState {
  /**
   * @param {string[]} playerNames – Ordered list of players. Each gets a dedicated row.
   * @param {number} columns – Grid columns (default DEFAULT_COLUMNS)
   * @param {number} initialCastleHp – Starting HP for every castle
   */
  constructor(playerNames = [], columns = DEFAULT_COLUMNS, initialCastleHp = 100) {
    if (!Array.isArray(playerNames)) {
      throw new Error('GameState expects an array of playerNames');
    }
    this.playerNames = playerNames;
    this.playerCount = playerNames.length;

    // Grid rows match player count so each player has one lane
    this.grid = new Grid(this.playerCount, columns);

    // Per-player HP map
    this.castleHealth = Object.fromEntries(playerNames.map((n) => [n, initialCastleHp]));

    // Row ↔ player look-ups
    this.playerToRow = Object.fromEntries(playerNames.map((n, i) => [n, i]));
    this.rowToPlayer = Object.fromEntries(playerNames.map((n, i) => [i, n]));

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
  applyCastleDamage(row, dmg) {
    const player = this.rowToPlayer[row];
    if (!player) return;
    this.castleHealth[player] = Math.max(0, this.castleHealth[player] - dmg);
  }
  isPlayerAlive(name) {
    return (this.castleHealth[name] || 0) > 0;
  }
  areAnyCastlesAlive() {
    return Object.values(this.castleHealth).some((hp) => hp > 0);
  }
  getAliveRows() {
    return Object.entries(this.rowToPlayer)
      .filter(([row, name]) => this.isPlayerAlive(name))
      .map(([row]) => Number(row));
  }

  /**
   * Dynamically adds a new player mid-game. A new row will be appended to the
   * bottom of the grid so that existing rows keep their indices.
   *
   * @param {string} name – Logical player name (must be unique).
   * @param {number} initialCastleHp – Starting HP for the new player.
   * @returns {number} The row index assigned to the new player or -1 if the
   *                   player already exists.
   */
  addPlayer(name, initialCastleHp = 1000) {
    if (this.playerNames.includes(name)) return -1;

    this.playerNames.push(name);
    this.playerCount = this.playerNames.length;

    // Expand the grid so every player still owns exactly one dedicated lane.
    this.grid.setPlayerCount(this.playerCount);

    // Assign the bottom-most row to the new player so existing lanes remain
    // unchanged (this avoids shifting units already on the battlefield).
    const newRow = this.playerCount - 1;

    this.playerToRow[name] = newRow;
    this.rowToPlayer[newRow] = name;

    // Track castle HP for the newcomer.
    this.castleHealth[name] = initialCastleHp;

    return newRow;
  }
}

export default GameState;
