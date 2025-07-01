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

      // Calculate number of enemies based on active players with power curve
      const activePlayerCount = aliveRows.length;
      // Apply power curve to player count for better scaling
      const scaledPlayerCount = Math.pow(activePlayerCount, WAVE_CONFIG.PLAYER_COUNT_SCALING_CURVE || 1);
      const enemiesFromPlayerScaling = Math.floor(this.gameState.wave * scaledPlayerCount * WAVE_CONFIG.ENEMIES_PER_PLAYER_SCALING);
      const totalEnemies = WAVE_CONFIG.BASE_ENEMIES_PER_WAVE + enemiesFromPlayerScaling;
      
      // Apply per-lane cap for large games
      const maxEnemiesForLanes = aliveRows.length * (WAVE_CONFIG.MAX_ENEMIES_PER_LANE || 999);
      const cappedTotalEnemies = Math.min(totalEnemies, maxEnemiesForLanes);

      const newEnemies = [];
      const enemyTypeKeys = Object.keys(ENEMY_TYPES);
      const enemyTypesArr = enemyTypeKeys.length ? enemyTypeKeys : ['basic'];

      // Distribute enemies more fairly across lanes
      const enemyDistribution = this._distributeEnemiesAcrossLanes(cappedTotalEnemies, aliveRows);
      
      for (let row = 0; row < enemyDistribution.length; row++) {
        const enemiesForThisRow = enemyDistribution[row];
        
        for (let i = 0; i < enemiesForThisRow; i++) {
          // Select enemy type based on wave progression
          const enemyType = this._selectEnemyTypeByWave(enemyTypesArr, this.gameState.wave);
          const def = ENEMY_TYPES[enemyType] || WAVE_CONFIG.FALLBACK_ENEMY;
          
          // Use base stats without scaling
          const enemyConfig = {
            maxHealth: def.baseHealth,
            damage: def.baseDamage,
            subtype: enemyType,
          };
          
          const enemy = spawnEnemyUnit(this.gameState.grid, enemyConfig, aliveRows[row]);
          this.gameState.addUnit(enemy);
          newEnemies.push(enemy);
        }
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
   * Distributes enemies across lanes with smoothing to reduce RNG
   */
  _distributeEnemiesAcrossLanes(totalEnemies, aliveRows) {
    const laneCount = aliveRows.length;
    const distribution = new Array(laneCount).fill(0);
    
    // Base distribution (perfectly even)
    const basePerLane = Math.floor(totalEnemies / laneCount);
    const remainder = totalEnemies % laneCount;
    
    // Fill base amount
    for (let i = 0; i < laneCount; i++) {
      distribution[i] = basePerLane;
    }
    
    // Distribute remainder
    for (let i = 0; i < remainder; i++) {
      distribution[i]++;
    }
    
    // Apply smoothing factor (mix between perfect and random distribution)
    const smoothing = WAVE_CONFIG.LANE_DISTRIBUTION_SMOOTHING || 0;
    if (smoothing < 1) {
      // Add some randomness based on smoothing factor
      const randomFactor = 1 - smoothing;
      const redistribution = Math.floor(totalEnemies * randomFactor * 0.3); // Up to 30% can be redistributed
      
      for (let i = 0; i < redistribution; i++) {
        const from = Math.floor(Math.random() * laneCount);
        const to = Math.floor(Math.random() * laneCount);
        
        if (distribution[from] > 1) { // Don't leave lanes empty
          distribution[from]--;
          distribution[to]++;
        }
      }
    }
    
    // Ensure minimum enemies per lane if configured
    const minPerLane = WAVE_CONFIG.MIN_ENEMIES_PER_ACTIVE_LANE || 0;
    if (minPerLane > 0 && totalEnemies >= laneCount * minPerLane) {
      for (let i = 0; i < laneCount; i++) {
        if (distribution[i] < minPerLane) {
          // Take from lanes with excess
          for (let j = 0; j < laneCount; j++) {
            if (distribution[j] > minPerLane + 1) {
              const transfer = minPerLane - distribution[i];
              distribution[j] -= transfer;
              distribution[i] += transfer;
              break;
            }
          }
        }
      }
    }
    
    return distribution;
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

