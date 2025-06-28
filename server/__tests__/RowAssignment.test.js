import GameState from '../game/GameState.js';
import { MIN_ROWS } from '../grid/Grid.js';

describe('Player-to-row assignment', () => {
  test('each player gets a unique, deterministic row index', () => {
    const players = ['Alice', 'Bob', 'Charlie', 'Dana'];
    const gs = new GameState(players, undefined, 100);

    // Grid should have at least MIN_ROWS or the number of players, whichever is larger
    expect(gs.grid.rows).toBe(Math.max(MIN_ROWS, players.length));

    players.forEach((p, idx) => {
      expect(gs.playerToRow[p]).toBe(idx);
      expect(gs.rowToPlayer[idx]).toBe(p);
    });
  });
}); 