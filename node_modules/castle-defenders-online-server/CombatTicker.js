import { TIMINGS } from './config.js';
import { EVENTS } from './events.js';

export class CombatTicker {
  constructor(io, gameState) {
    this.io = io;
    this.gameState = gameState;
    this.intervalId = null;
  }

  start() {
    this.intervalId = setInterval(() => {
      try {
        const { units, enemies } = this.gameState;
        units.forEach(u => { if (!u.engaged) u.y += u.speed; });
        // Enemies move forward toward the castle at y=100
        enemies.forEach(e => { if (!e.engaged) e.y += (e.speed || 1.5); });
        units.forEach(u => {
          if (u.hp <= 0) return;
          let closest = null, md = Infinity;
          enemies.forEach(e => {
            if (e.hp > 0) {
              const d = Math.abs(u.y - e.y);
              if (d <= u.range && d < md) { closest = e; md = d; }
            }
          });
          if (closest) {
            u.engaged = true;
            closest.engaged = true;
            closest.hp -= u.dmg;
            u.hp -= (closest.dmg || 5);
          } else u.engaged = false;
        });
        this.gameState.units = units.filter(u => u.hp > 0);
        enemies.forEach(e => { if (e.hp <= 0) e.engaged = false; });
        let dmg = 0;
        enemies.forEach(e => { if (e.hp > 0 && !e.engaged && e.y >= 100) { dmg += 10; e.hp = 0; } });
        this.gameState.enemies = enemies.filter(e => e.hp > 0);
        if (dmg > 0) this.gameState.castleHp = Math.max(0, this.gameState.castleHp - dmg);
        this.io.emit(EVENTS.SPAWN_ENEMIES, { enemies: this.gameState.enemies });
        this.io.emit(EVENTS.SPAWN_UNITS, { units: this.gameState.units });
        this.io.emit(EVENTS.STATE_UPDATE, { castleHp: this.gameState.castleHp });
        if (this.gameState.castleHp <= 0) {
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
