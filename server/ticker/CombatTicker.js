import { TIMINGS } from '../config.js';
import { EVENTS } from '../events.js';
import * as Movement from '../game/Movement.js';
import * as Battle from '../game/Battle.js';

export class CombatTicker {
  constructor(io, roomId, gameState, gameService = null) {
    this.io = io;
    this.roomId = roomId;
    this.gameState = gameState;
    this.gameService = gameService;
    this.intervalId = null;
  }

  start() {
    const interval = TIMINGS.COUNTDOWN_INTERVAL;

    const tick = () => {
      try {
        /*
          ─── Phase 1 ───  (t = 0)
          Handle movement and assign battles.  Units visually start their "combat bounce" now.
        */
        Movement.moveEnemyUnits(this.gameState.grid, (enemy, row) => {
          // Enemy reached castle: apply damage to the owner of this row and remove unit
          this.gameState.applyCastleDamage(row, enemy.damage || 10);
          this.gameState.removeUnit(enemy);
        });
        Movement.movePlayerUnits(this.gameState.grid, (playerUnit, row) => {
          // Player reached portal: just remove unit
          this.gameState.removeUnit(playerUnit);
        });

        // Check & mark battles but DO NOT apply damage yet – that will occur halfway through the interval
        Battle.checkAndStartBattles(this.gameState.grid);

        // Emit current grid state (after movement & new spawns) so clients display units immediately.
        // HP values are still intact because damage hasn't been processed yet, so bars remain full until the
        // mid-tick damage pass.
        this.io.in(this.roomId).emit(EVENTS.STATE_UPDATE, {
          castleHp: this.gameState.castleHealth,
          grid: JSON.parse(JSON.stringify(this.gameState.grid.cells))
        });

        /*
          ─── Phase 2 ───  (t = interval / 2)
          Apply damage exactly when units visually "touch" (half-way through the bounce animation).
        */
        setTimeout(() => {
          try {
            Battle.processBattles(this.gameState.grid);

            // Remove dead units
            for (const unit of Array.from(this.gameState.units.values())) {
              if (!unit.isAlive()) {
                this.gameState.removeUnit(unit);
              }
            }

            // Emit updated state after damage has been applied
            this.io.in(this.roomId).emit(EVENTS.STATE_UPDATE, {
              castleHp: this.gameState.castleHealth,
              grid: JSON.parse(JSON.stringify(this.gameState.grid.cells))
            });

            // Game-over check (after damage)
            if (!this.gameState.areAnyCastlesAlive()) {
              // Calculate game statistics
              const gameStats = this._calculateGameStats();
              
              this.io.in(this.roomId).emit(EVENTS.GAME_OVER, { 
                message: 'All castles have fallen!', 
                stats: gameStats,
                roomId: this.roomId
              });
              
              // Trigger game service cleanup
              this._triggerGameCleanup();
              
              this.stop();
            }
          } catch (err) {
            console.error('CombatTicker damage phase error', err);
          }
        }, interval / 2);
      } catch (err) {
        console.error('CombatTicker movement phase error', err);
      }
    };

    // Run first tick immediately so game starts without delay
    tick();
    this.intervalId = setInterval(tick, interval);
  }

  stop() {
    clearInterval(this.intervalId);
  }

  _calculateGameStats() {
    // Calculate comprehensive game statistics
    const stats = {
      waves: this.gameState.wave || 1,
      totalPlayers: this.gameState.playerNames.length,
      gameEndTime: new Date().toISOString(),
      victory: false, // All players dead = defeat
    };

    // Calculate per-player statistics
    const playerStats = {};
    if (this.gameState.players) {
      this.gameState.players.forEach(player => {
        const totalUnitsHired = Object.values(player.units || {}).reduce((sum, count) => sum + count, 0);
        const totalWorkersHired = Object.values(player.workers || {}).reduce((sum, count) => sum + count, 0);
        
        playerStats[player.name] = {
          gold: Math.floor(player.gold || 0),
          food: Math.floor(player.food || 0),
          iron: Math.floor(player.iron || 0),
          jewels: Math.floor(player.jewels || 0),
          totalUnitsHired,
          totalWorkersHired,
          castleHpLeft: this.gameState.castleHealth[player.name] || 0
        };
      });
    }

    stats.playerStats = playerStats;
    return stats;
  }

  _triggerGameCleanup() {
    // Trigger cleanup through the game service
    if (this.gameService && typeof this.gameService.triggerRoomCleanup === 'function') {
      this.gameService.triggerRoomCleanup();
    }
  }
}
