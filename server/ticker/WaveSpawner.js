import { TIMINGS, ENEMY_TYPES } from '../config.js';
import { EVENTS } from '../events.js';
import { spawnEnemyUnit, spawnPlayerUnit } from '../game/Spawner.js';

export class WaveSpawner {
  constructor(io, roomId, gameState) {
    this.io = io;
    this.roomId = roomId;
    this.gameState = gameState;
    this.intervalId = null;
  }

  // Called when timer hits 0
  spawnWave() {
    try {
      if (!this.gameState.addUnit) {
        this.gameState.addUnit = () => {};
      }
      this.gameState.wave = (this.gameState.wave || 0) + 1;
      const num = 3 + this.gameState.wave;
      const newEnemies = [];
      const enemyTypeKeys = Object.keys(ENEMY_TYPES);
      const enemyTypesArr = enemyTypeKeys.length ? enemyTypeKeys : ['basic'];
      const aliveRows = this.gameState.getAliveRows();
      if (!aliveRows.length) {
        // No living players – nothing to spawn
        return [];
      }
      for (let i = 0; i < num; i++) {
        const enemyType = enemyTypesArr[(this.gameState.wave + i) % enemyTypesArr.length];
        const def = ENEMY_TYPES[enemyType] || { baseHealth: 10, baseDamage: 2 };
        const enemyConfig = {
          maxHealth: def.baseHealth + this.gameState.wave * 2,
          damage: def.baseDamage + Math.floor(this.gameState.wave / 2),
          subtype: enemyType,
        };
        // Choose a random alive row to spawn this enemy
        const row = aliveRows[Math.floor(Math.random() * aliveRows.length)];
        const enemy = spawnEnemyUnit(this.gameState.grid, enemyConfig, row);
        this.gameState.addUnit(enemy);
        newEnemies.push(enemy);
      }
      this.io.in(this.roomId).emit(EVENTS.SPAWN_ENEMIES, { enemies: newEnemies });
      this.io.in(this.roomId).emit(EVENTS.STATE_UPDATE, { wave: this.gameState.wave });
      return newEnemies;
    } catch (err) {
      console.error('WaveSpawner error', err);
      return [];
    }
  }
}

