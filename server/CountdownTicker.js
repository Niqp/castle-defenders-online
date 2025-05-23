import { TIMINGS } from './config.js';
import { EVENTS } from './events.js';

export class CountdownTicker {
  constructor(io, gameState, onNextWave) {
    this.io = io;
    this.gameState = gameState;
    this.intervalId = null;
    this.onNextWave = onNextWave;
  }

  start() {
    let spawning = false;
    this.intervalId = setInterval(() => {
      try {
        if (spawning) return; // Prevent overlap
        this.gameState.nextWaveIn = Math.max(0, this.gameState.nextWaveIn - 1);
        this.io.emit(EVENTS.STATE_UPDATE, { nextWaveIn: this.gameState.nextWaveIn });
        if (this.gameState.nextWaveIn === 0 && typeof this.onNextWave === 'function') {
          spawning = true;
          console.log('[CountdownTicker] Spawning new wave...');
          this.onNextWave();
          setTimeout(() => {
            spawning = false;
            console.log('[CountdownTicker] Wave spawn complete, timer reset.');
          }, 10); // Small delay to ensure reset
        }
      } catch (err) {
        console.error('CountdownTicker error', err);
      }
    }, TIMINGS.COUNTDOWN_INTERVAL);
  }

  stop() {
    clearInterval(this.intervalId);
  }
}
