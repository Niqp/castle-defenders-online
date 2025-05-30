// EnemyUnit.js - Extends Unit for enemy-specific logic
import Unit from './Unit.js';

class EnemyUnit extends Unit {
  constructor({ maxHealth, damage, row, col }) {
    super({ type: 'enemy', maxHealth, damage, row, col });
  }
}

export default EnemyUnit;
