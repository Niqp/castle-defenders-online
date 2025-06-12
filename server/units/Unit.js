// Unit.js - Base class for all units
import { v4 as uuidv4 } from 'uuid';

class Unit {
  constructor({ type, maxHealth, damage, row, col }) {
    this.id = uuidv4();
    this.type = type; // 'enemy' or 'player'
    this.maxHealth = maxHealth;
    this.health = maxHealth;
    this.damage = damage;
    this.row = row;
    this.col = col;
    this.inBattle = false;
    this.targetId = null;
  }

  isAlive() {
    return this.health > 0;
  }

  takeDamage(amount) {
    this.health = Math.max(0, this.health - amount);
  }

  // Ensure clean serialisation across Socket.IO / JSON
  toJSON() {
    return {
      id: this.id,
      type: this.type,
      health: this.health,
      maxHealth: this.maxHealth,
      damage: this.damage,
      row: this.row,
      col: this.col,
    };
  }
}

export default Unit;
