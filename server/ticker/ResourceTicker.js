import { WORKER_TYPES, TIMINGS } from '../config.js';
import { EVENTS } from '../events.js';

export class ResourceTicker {
  tick() {
    try {
      this.players.forEach(p => {
        const income = Object.entries(WORKER_TYPES)
          .reduce((sum, [k, v]) => sum + (p.workers && p.workers[k] ? p.workers[k] * v.output : 0), 0);
        const foodIncome = (p.workers && p.workers.Farmer ? p.workers.Farmer * WORKER_TYPES.Farmer.output : 0);
        p.gold = (p.gold || 0) + income;
        p.food = (p.food || 0) + foodIncome;
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
          const income = Object.entries(WORKER_TYPES)
            .reduce((sum, [k, v]) => sum + (p.workers[k] || 0) * v.output, 0);
          const foodIncome = (p.workers.Farmer || 0) * WORKER_TYPES.Farmer.output;
          p.gold += income;
          p.food += foodIncome;
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
