import { TIMINGS, ENEMY_TYPES } from '../config.js';
import { EVENTS } from '../events.js';
import { spawnEnemyUnit, spawnPlayerUnit } from '../game/Spawner.js';

export class WaveSpawner {
  constructor(io, gameState) {
    this.io = io;
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
      let enemyTypesArr = Array.isArray(ENEMY_TYPES) && ENEMY_TYPES.length > 0 ? ENEMY_TYPES : ['basic'];
      for (let i = 0; i < num; i++) {
        const enemyType = enemyTypesArr[(this.gameState.wave + i) % enemyTypesArr.length];
        const enemyConfig = {
          maxHealth: 10 + this.gameState.wave * 2,
          damage: 2 + Math.floor(this.gameState.wave / 2),
          type: enemyType
        };
        const enemy = spawnEnemyUnit(this.gameState.grid, enemyConfig);
        this.gameState.addUnit(enemy);
        newEnemies.push(enemy);
      }
      this.io.emit(EVENTS.SPAWN_ENEMIES, { enemies: newEnemies });
      this.io.emit(EVENTS.STATE_UPDATE, { wave: this.gameState.wave });
      return newEnemies;
    } catch (err) {
      console.error('WaveSpawner error', err);
      return [];
    }
  }
}

