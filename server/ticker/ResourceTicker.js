import { WORKER_TYPES, TIMINGS } from '../config.js';
import { EVENTS } from '../events.js';

export class ResourceTicker {
  tick() {
    try {
      this.players.forEach(p => {
        const incomeMap = {};
        for (const [type, config] of Object.entries(WORKER_TYPES)) {
          const count = (p.workers && p.workers[type]) ? p.workers[type] : 0;
          if (!count) continue;
          // Support both new `outputs` object and legacy `output` + `resource` fields for backward compatibility
          const outputs = config.outputs || (config.output !== undefined ? { [config.resource || 'gold']: config.output } : {});
          for (const [res, amount] of Object.entries(outputs)) {
            incomeMap[res] = (incomeMap[res] || 0) + count * amount;
          }
        }
        // Apply incomes to player
        for (const [res, amount] of Object.entries(incomeMap)) {
          p[res] = (p[res] || 0) + amount;
        }
        for (let [id, name] of this.socketToName.entries()) {
          if (name === p.name) {
            this.io.to(id).emit(EVENTS.RESOURCE_UPDATE, {
              gold: Math.floor(p.gold),
              food: Math.floor(p.food),
              workers: p.workers
            });
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
          for (const [type, config] of Object.entries(WORKER_TYPES)) {
            const count = p.workers[type] || 0;
            if (!count) continue;
            const outputs = config.outputs || (config.output !== undefined ? { [config.resource || 'gold']: config.output } : {});
            for (const [res, amount] of Object.entries(outputs)) {
              incomeMap[res] = (incomeMap[res] || 0) + count * amount;
            }
          }
          for (const [res, amt] of Object.entries(incomeMap)) {
            p[res] = (p[res] || 0) + amt;
          }
          for (let [id, name] of this.socketToName.entries()) {
            if (name === p.name) {
              this.io.to(id).emit(EVENTS.RESOURCE_UPDATE, {
                gold: Math.floor(p.gold),
                food: Math.floor(p.food),
                workers: p.workers
              });
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
    clearInterval(this.intervalId);
  }
}

