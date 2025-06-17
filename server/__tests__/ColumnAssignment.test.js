import GameState from '../game/GameState.js';

describe('Player-to-column assignment', () => {
  test('each player gets a unique, deterministic column index', () => {
    const players = ['Alice', 'Bob', 'Charlie', 'Dana'];
    const gs = new GameState(players, undefined, 100);

    // Grid should have exactly the same number of columns as players
    expect(gs.grid.columns).toBe(players.length);

    players.forEach((p, idx) => {
      expect(gs.playerToCol[p]).toBe(idx);
      expect(gs.colToPlayer[idx]).toBe(p);
    });
  });
}); 