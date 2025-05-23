import { TIMINGS, ENEMY_TYPES } from './config.js';
import { EVENTS } from './events.js';

export class WaveSpawner {
  constructor(io, gameState) {
    this.io = io;
    this.gameState = gameState;
    this.intervalId = null;
  }

  // Called when timer hits 0
  spawnWave() {
    try {
      this.gameState.wave++;
      const num = 3 + this.gameState.wave;
      // Spread enemies horizontally around the top center
      // Logical coordinates: x=0 is center, y=0 is top (portal), y=100 is castle
      const spread = 80; // Logical units, e.g. enemies spread from x=-40 to x=+40
      const newEnemies = Array.from({ length: num }, (_, i) => {
        // Spread x from -spread/2 to +spread/2
        const x = -spread / 2 + (spread * i) / (num - 1 || 1);
        return {
          id: `${this.gameState.wave}-${i}-${Date.now()}`,
          type: ENEMY_TYPES[(this.gameState.wave + i) % ENEMY_TYPES.length],
          hp: 10 + this.gameState.wave * 2,
          x,
          y: 0 + Math.random() * 2 // y=0 is top, small jitter
        };
      });
      this.gameState.enemies.push(...newEnemies);
      this.io.emit(EVENTS.SPAWN_ENEMIES, { enemies: this.gameState.enemies });
      this.io.emit(EVENTS.STATE_UPDATE, { wave: this.gameState.wave });
    } catch (err) {
      console.error('WaveSpawner error', err);
    }
  }
}
