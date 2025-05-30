import { TIMINGS } from '../config.js';
import { EVENTS } from '../events.js';
import * as Movement from '../game/Movement.js';
import * as Battle from '../game/Battle.js';

export class CombatTicker {
  constructor(io, gameState) {
    this.io = io;
    this.gameState = gameState;
    this.intervalId = null;
  }

  start() {
    this.intervalId = setInterval(() => {
      try {
        // Move units
        Movement.moveEnemyUnits(this.gameState.grid, (enemy, col) => {
          // Enemy reached castle: apply damage and remove unit
          this.gameState.applyCastleDamage(enemy.damage || 10);
          this.gameState.removeUnit(enemy);
        });
        Movement.movePlayerUnits(this.gameState.grid, (playerUnit, col) => {
          // Player reached portal: just remove unit
          this.gameState.removeUnit(playerUnit);
        });
        // Handle battles
        Battle.checkAndStartBattles(this.gameState.grid);
        Battle.processBattles(this.gameState.grid);
        // Remove dead units
        for (const unit of Array.from(this.gameState.units.values())) {
          if (!unit.isAlive()) {
            this.gameState.removeUnit(unit);
          }
        }
        // Emit updated state
        // Optionally, you can emit the full grid or just changed units
        this.io.emit(EVENTS.STATE_UPDATE, {
          castleHp: this.gameState.castleHealth,
          grid: this.gameState.grid.cells
        });
        // Game over check
        if (!this.gameState.isCastleAlive()) {
          this.io.emit(EVENTS.GAME_OVER, { message: 'The castle has fallen!', stats: { wave: this.gameState.wave } });
          this.stop();
        }
      } catch (err) {
        console.error('CombatTicker error', err);
      }
    }, TIMINGS.COUNTDOWN_INTERVAL);
  }

  stop() {
    clearInterval(this.intervalId);
  }
}
