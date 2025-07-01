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
   * @param {number} [params.healAmount] – Heal amount for Priests
   */
  constructor(params) {
    const { maxHealth, damage, row, col, owner, unitType } = params;
    super({ type: 'player', maxHealth, damage, row, col });
    this.owner = owner;
    this.unitType = unitType; // Used for UI counters
    
    // Store special abilities and other properties
    if (params.healAmount !== undefined) {
      this.healAmount = params.healAmount;
    }
    
    // Store any other special properties from the unit config
    const specialProps = { ...params };
    delete specialProps.maxHealth;
    delete specialProps.damage;
    delete specialProps.row;
    delete specialProps.col;
    delete specialProps.owner;
    delete specialProps.unitType;
    
    Object.assign(this, specialProps);
  }

  /**
   * Ensure that the extra metadata (owner + unitType) is sent to clients.
   */
  toJSON() {
    return {
      ...super.toJSON(),
      owner: this.owner,
      unitType: this.unitType,
      healAmount: this.healAmount,
      attacksAll: this.attacksAll
    };
  }
}

export default PlayerUnit;
