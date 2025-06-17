// PlayerUnit.js - Extends Unit for player-specific logic
import Unit from './Unit.js';

class PlayerUnit extends Unit {
  /**
   * @param {Object} params
   * @param {number} params.maxHealth – Max HP for the unit
   * @param {number} params.damage – Damage per attack
   * @param {number} params.row – Initial grid row
   * @param {number} params.col – Initial grid column
   * @param {string} params.owner – Player name that spawned the unit
   * @param {string} params.unitType – Logical unit class (e.g. "Swordsman")
   */
  constructor({ maxHealth, damage, row, col, owner, unitType }) {
    super({ type: 'player', maxHealth, damage, row, col });
    this.owner = owner;
    this.unitType = unitType; // Used for UI counters
  }

  /**
   * Ensure that the extra metadata (owner + unitType) is sent to clients.
   */
  toJSON() {
    return {
      ...super.toJSON(),
      owner: this.owner,
      unitType: this.unitType,
    };
  }
}

export default PlayerUnit;
