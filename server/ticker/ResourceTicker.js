import { WORKER_TYPES, TIMINGS, UPGRADE_TYPES } from '../config.js';
import { EVENTS } from '../events.js';

export class ResourceTicker {
  tick() {
    try {
      this.players.forEach(p => {
        const incomeMap = {};
        
        // Calculate worker income with productivity upgrades
        for (const [type, config] of Object.entries(WORKER_TYPES)) {
          const count = p.workers[type] || 0;
          if (!count) continue;
          const outputs = config.outputs || (config.output !== undefined ? { [config.resource || 'gold']: config.output } : {});
          
          // Apply worker productivity upgrade
          const productivityLevel = p.upgrades?.WORKER_PRODUCTIVITY || 0;
          const productivityMultiplier = this._getUpgradeEffect(UPGRADE_TYPES.WORKER_PRODUCTIVITY, productivityLevel, 'workerMultiplier', 1);
          
          // Apply cooperative bonus (3% per additional player)
          const playerCount = this.players.length;
          const coopBonus = 1 + ((playerCount - 1) * 0.03);
          
          for (const [res, amount] of Object.entries(outputs)) {
            const baseAmount = amount * productivityMultiplier * coopBonus;
            incomeMap[res] = (incomeMap[res] || 0) + count * baseAmount;
          }
        }
        
        // Apply income to player
        for (const [res, amt] of Object.entries(incomeMap)) {
          p[res] = (p[res] || 0) + amt;
        }
        
        // Prepare all players' resources for broadcasting
        const allPlayersResources = {};
        this.players.forEach(player => {
          allPlayersResources[player.name] = {
            gold: Math.floor(player.gold),
            food: Math.floor(player.food),
            workers: player.workers
          };
        });

        for (let [id, name] of this.socketToName.entries()) {
          if (name === p.name) {
            try {
              const socket = this.io.sockets.sockets.get(id);
              if (socket && socket.connected) {
                socket.emit(EVENTS.RESOURCE_UPDATE, {
                  gold: Math.floor(p.gold),
                  food: Math.floor(p.food),
                  workers: p.workers,
                  allPlayersResources: allPlayersResources
                });
              }
            } catch (emitError) {
              console.error(`Error emitting resource update to socket ${id}:`, emitError);
            }
            break;
          }
        }
      });
    } catch (err) {
      console.error('ResourceTicker error', err);
    }
  }
  constructor(io, socketToName, players) {
    this.io = io;
    this.socketToName = socketToName;
    this.players = players;
    this.intervalId = null;
  }

  start() {
    this.intervalId = setInterval(() => {
      try {
        this.players.forEach(p => {
          const incomeMap = {};
          
          // Calculate worker income with productivity upgrades
          for (const [type, config] of Object.entries(WORKER_TYPES)) {
            const count = p.workers[type] || 0;
            if (!count) continue;
            const outputs = config.outputs || (config.output !== undefined ? { [config.resource || 'gold']: config.output } : {});
            
            // Apply worker productivity upgrade
            const productivityLevel = p.upgrades?.WORKER_PRODUCTIVITY || 0;
            const productivityMultiplier = this._getUpgradeEffect(UPGRADE_TYPES.WORKER_PRODUCTIVITY, productivityLevel, 'workerMultiplier', 1);
            
                    // Apply cooperative bonus (3% per additional player)
        const playerCount = this.players.length;
        const coopBonus = 1 + ((playerCount - 1) * 0.03);
            
            for (const [res, amount] of Object.entries(outputs)) {
              const baseAmount = amount * productivityMultiplier * coopBonus;
              incomeMap[res] = (incomeMap[res] || 0) + count * baseAmount;
            }
          }
          
          // Apply income to player
          for (const [res, amt] of Object.entries(incomeMap)) {
            p[res] = (p[res] || 0) + amt;
          }
          
          // Prepare all players' resources for broadcasting
          const allPlayersResources = {};
          this.players.forEach(player => {
            allPlayersResources[player.name] = {
              gold: Math.floor(player.gold),
              food: Math.floor(player.food),
              workers: player.workers
            };
          });

          for (let [id, name] of this.socketToName.entries()) {
            if (name === p.name) {
              try {
                const socket = this.io.sockets.sockets.get(id);
                if (socket && socket.connected) {
                  socket.emit(EVENTS.RESOURCE_UPDATE, {
                    gold: Math.floor(p.gold),
                    food: Math.floor(p.food),
                    workers: p.workers,
                    allPlayersResources: allPlayersResources
                  });
                }
              } catch (emitError) {
                console.error(`Error emitting resource update to socket ${id}:`, emitError);
              }
              break;
            }
          }
        });
      } catch (err) {
        console.error('ResourceTicker error', err);
      }
    }, TIMINGS.WORKER_INTERVAL);
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

