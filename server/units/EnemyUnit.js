// EnemyUnit.js - Extends Unit for enemy-specific logic
import Unit from './Unit.js';

class EnemyUnit extends Unit {
  constructor(params) {
    const { maxHealth, damage, row, col, subtype } = params;
    super({ type: 'enemy', maxHealth, damage, row, col });
    this.subtype = subtype; // e.g., 'goblin', 'orc', 'troll', 'berserker', 'warlord'
    
    // Store any special properties from the enemy config
    const specialProps = { ...params };
    delete specialProps.maxHealth;
    delete specialProps.damage;
    delete specialProps.row;
    delete specialProps.col;
    delete specialProps.subtype;
    
    Object.assign(this, specialProps);
  }

  toJSON() {
    return {
      ...super.toJSON(),
      subtype: this.subtype,
      selfHealPercent: this.selfHealPercent,
      attacksAll: this.attacksAll
    };
  }
}

export default EnemyUnit;
