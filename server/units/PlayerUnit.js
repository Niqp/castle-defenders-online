// PlayerUnit.js - Extends Unit for player-specific logic
import Unit from './Unit.js';

class PlayerUnit extends Unit {
  constructor({ maxHealth, damage, row, col }) {
    super({ type: 'player', maxHealth, damage, row, col });
  }
}

export default PlayerUnit;
