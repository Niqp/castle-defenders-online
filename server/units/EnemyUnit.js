// EnemyUnit.js - Extends Unit for enemy-specific logic
import Unit from './Unit.js';

class EnemyUnit extends Unit {
  constructor({ maxHealth, damage, row, col, subtype }) {
    super({ type: 'enemy', maxHealth, damage, row, col });
    this.subtype = subtype; // e.g., 'goblin', 'orc', 'troll'
  }

  toJSON() {
    return {
      ...super.toJSON(),
      subtype: this.subtype,
    };
  }
}

export default EnemyUnit;
