import { UNIT_TYPES, TIMINGS } from '../config.js';
import { EVENTS } from '../events.js';
import { spawnPlayerUnit } from '../game/Spawner.js';

export class AutoSpawnTicker {
  constructor(io, gameState, gameService) {
    this.io = io;
    this.gameState = gameState;
    this.gameService = gameService;
    this.intervalId = null;
  }

  start() {
    this.intervalId = setInterval(() => {
      try {
        if (!this.gameState || !this.gameState.players) return;

        this.gameState.players.forEach(player => {
          if (!player.autoSpawn) return;
          
          // Check each unit type for auto-spawn
          Object.entries(player.autoSpawn).forEach(([unitType, settings]) => {
            if (!settings.enabled || settings.amount <= 0) return;
            
            const unitConfig = UNIT_TYPES[unitType];
            if (!unitConfig) return;
            
            // Apply unit cost reductions from upgrades
            const modifiedUnitConfig = this.gameService._getModifiedUnitCost(unitConfig, player);
            
            // Check if player can afford to spawn the requested amount
            let canSpawn = 0;
            for (let i = 0; i < settings.amount; i++) {
              let canAfford = true;
              for (const [resource, cost] of Object.entries(modifiedUnitConfig.costs)) {
                const totalCostForAmount = cost * (i + 1);
                if ((player[resource] || 0) < totalCostForAmount) {
                  canAfford = false;
                  break;
                }
              }
              if (canAfford) {
                canSpawn = i + 1;
              } else {
                break;
              }
            }
            
            // Spawn units if we can afford them
            if (canSpawn > 0) {
              // Find the player's row for spawning
              const playerRow = this.gameState?.playerToRow[player.name] ?? 0;
              
              for (let i = 0; i < canSpawn; i++) {
                // Deduct resources
                for (const [resource, cost] of Object.entries(modifiedUnitConfig.costs)) {
                  player[resource] = (player[resource] || 0) - cost;
                }
                
                // Increment unit count
                player.units[unitType] = (player.units[unitType] || 0) + 1;
                
                // Apply unit stat upgrades
                const modifiedStats = this.gameService._getModifiedUnitStats(unitConfig, player);
                
                                 // Spawn the unit
                 const playerConfig = {
                   maxHealth: modifiedStats.hp,
                   damage: modifiedStats.dmg
                 };
                 
                 const unit = spawnPlayerUnit(this.gameState.grid, playerConfig, playerRow, player.name, unitType);
                 this.gameState.addUnit(unit);
                 
                 // Emit unit spawn event
                 this.io.in(this.gameService.roomId).emit(EVENTS.UNIT_UPDATE, { unit });
              }
              
              // Find socket for this player and emit resource update
              for (let [socketId, playerName] of this.gameService.socketToName.entries()) {
                if (playerName === player.name) {
                  this.gameService._emitResourceUpdate({ id: socketId, emit: (event, data) => {
                    this.io.to(socketId).emit(event, data);
                  }}, player);
                  break;
                }
              }
            }
          });
        });
      } catch (err) {
        console.error('AutoSpawnTicker error', err);
      }
    }, TIMINGS.WORKER_INTERVAL); // Use same interval as resource generation (1 second)
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }
} 