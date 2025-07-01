import { TIMINGS, ENEMY_TYPES, WAVE_CONFIG } from '../config.js';
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
      
      const aliveRows = this.gameState.getAliveRows();
      if (!aliveRows.length) {
        // No living players – nothing to spawn
        return [];
      }

      // Calculate number of enemies based on active players
      const activePlayerCount = aliveRows.length;
      const enemiesFromPlayerScaling = Math.floor(this.gameState.wave * activePlayerCount * WAVE_CONFIG.ENEMIES_PER_PLAYER_SCALING);
      const totalEnemies = WAVE_CONFIG.BASE_ENEMIES_PER_WAVE + enemiesFromPlayerScaling;

      const newEnemies = [];
      const enemyTypeKeys = Object.keys(ENEMY_TYPES);
      const enemyTypesArr = enemyTypeKeys.length ? enemyTypeKeys : ['basic'];

      for (let i = 0; i < totalEnemies; i++) {
        // Select enemy type based on wave progression
        const enemyType = this._selectEnemyTypeByWave(enemyTypesArr, this.gameState.wave);
        const def = ENEMY_TYPES[enemyType] || WAVE_CONFIG.FALLBACK_ENEMY;
        
        // Use base stats without scaling
        const enemyConfig = {
          maxHealth: def.baseHealth,
          damage: def.baseDamage,
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

  /**
   * Selects enemy type based on wave progression.
   * Wave 1: 100% first enemy type, 0% others
   * Wave LAST_SCALING_WAVE: 0% first enemy type, 100% last enemy type
   * Linear progression in between
   */
  _selectEnemyTypeByWave(enemyTypes, wave) {
    if (enemyTypes.length <= 1) {
      return enemyTypes[0] || 'basic';
    }

    // Clamp wave to our scaling range
    const clampedWave = Math.min(wave, WAVE_CONFIG.LAST_SCALING_WAVE);
    
    // Calculate progression (0 to 1) from wave 1 to LAST_SCALING_WAVE
    const progression = (clampedWave - 1) / (WAVE_CONFIG.LAST_SCALING_WAVE - 1);
    
    // Calculate which enemy type should be most likely
    const targetIndex = progression * (enemyTypes.length - 1);
    const lowerIndex = Math.floor(targetIndex);
    const upperIndex = Math.min(lowerIndex + 1, enemyTypes.length - 1);
    const interpolation = targetIndex - lowerIndex;
    
    // Use weighted random selection
    const random = Math.random();
    
    // If we're close to a pure type (progression close to 0 or 1), use that type more often
    if (interpolation < 0.5) {
      // Favor the lower index
      return random < (1 - interpolation) ? enemyTypes[lowerIndex] : enemyTypes[upperIndex];
    } else {
      // Favor the upper index
      return random < interpolation ? enemyTypes[upperIndex] : enemyTypes[lowerIndex];
    }
  }
}

