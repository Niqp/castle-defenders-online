import { TIMINGS } from '../config.js';
import { EVENTS } from '../events.js';

export class CountdownTicker {
  tick() {
    if (!this.gameState) return;
    if (!this.io) return;
    if (!this.onNextWave) return;
    if (this.gameState.nextWaveIn > 0) {
      this.gameState.nextWaveIn = Math.max(0, this.gameState.nextWaveIn - 1);
      this.io.in(this.roomId).emit(EVENTS.STATE_UPDATE, { nextWaveIn: this.gameState.nextWaveIn });
      if (this.gameState.nextWaveIn === 0 && typeof this.onNextWave === 'function') {
        this.onNextWave();
      }
    }
  }
  constructor(io, roomId, gameState, onNextWave) {
    this.io = io;
    this.roomId = roomId;
    this.gameState = gameState;
    this.intervalId = null;
    this.timeoutIds = [];
    this.onNextWave = onNextWave;
  }

  start() {
    let spawning = false;
    this.intervalId = setInterval(() => {
      try {
        if (spawning) return; // Prevent overlap
        this.gameState.nextWaveIn = Math.max(0, this.gameState.nextWaveIn - 1);
        this.io.in(this.roomId).emit(EVENTS.STATE_UPDATE, { nextWaveIn: this.gameState.nextWaveIn });
        if (this.gameState.nextWaveIn === 0 && typeof this.onNextWave === 'function') {
          spawning = true;
          console.log('[CountdownTicker] Spawning new wave...');
          this.onNextWave();
          const timeoutId = setTimeout(() => {
            spawning = false;
            console.log('[CountdownTicker] Wave spawn complete, timer reset.');
            // Remove this timeoutId from the array after execution
            this.timeoutIds = this.timeoutIds.filter(id => id !== timeoutId);
          }, 10); // Small delay to ensure reset
          this.timeoutIds.push(timeoutId);
        }
      } catch (err) {
        console.error('CountdownTicker error', err);
      }
    }, TIMINGS.COUNTDOWN_INTERVAL);
  }

  stop() {
    clearInterval(this.intervalId);
    // Clear all pending timeouts
    this.timeoutIds.forEach(timeoutId => clearTimeout(timeoutId));
    this.timeoutIds = [];
  }
}
