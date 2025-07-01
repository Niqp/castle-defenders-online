import { TIMINGS, UPGRADE_TYPES, GAME_BALANCE } from '../config.js';
import { EVENTS } from '../events.js';

export class CastleRegenTicker {
  constructor(io, roomId, gameState) {
    this.io = io;
    this.roomId = roomId;
    this.gameState = gameState;
    this.intervalId = null;
  }

  start() {
    this.intervalId = setInterval(() => {
      try {
        let anyRegenOccurred = false;
        
        this.gameState.players.forEach(player => {
          const regenLevel = player.upgrades?.CASTLE_REPAIRS || 0;
          if (regenLevel === 0) return;
          
          const regenRate = this._getUpgradeEffect(UPGRADE_TYPES.CASTLE_REPAIRS, regenLevel, 'castleRegenRate', 0);
          if (regenRate === 0) return;
          
          const playerName = player.name;
          const currentHp = this.gameState.castleHealth[playerName] || 0;
          
          // Calculate max HP (base + fortification upgrades)
          const fortificationLevel = player.upgrades?.CASTLE_FORTIFICATION || 0;
          let maxHp = GAME_BALANCE.INITIAL_CASTLE_HP;
          if (fortificationLevel > 0) {
            const hpIncrease = this._getUpgradeEffect(UPGRADE_TYPES.CASTLE_FORTIFICATION, fortificationLevel, 'castleMaxHpIncrease', 0);
            maxHp += hpIncrease;
          }
          
          // Only regenerate if below max HP
          if (currentHp < maxHp) {
            const newHp = Math.min(maxHp, currentHp + regenRate);
            this.gameState.castleHealth[playerName] = newHp;
            anyRegenOccurred = true;
          }
        });
        
        // Emit updated castle health if any regeneration occurred
        if (anyRegenOccurred) {
          this.io.in(this.roomId).emit(EVENTS.STATE_UPDATE, {
            castleHp: this.gameState.castleHealth
          });
        }
      } catch (err) {
        console.error('CastleRegenTicker error', err);
      }
    }, TIMINGS.WORKER_INTERVAL); // Use same interval as worker ticker for consistency
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  // Helper method for upgrade effects
  _getUpgradeEffect(upgradeType, level, effectKey, defaultValue) {
    if (level === 0) return defaultValue;
    const levelData = upgradeType.levels.find(l => l.level === level);
    return levelData?.effect[effectKey] ?? defaultValue;
  }
} 