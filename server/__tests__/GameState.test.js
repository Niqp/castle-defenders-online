import GameState from '../game/GameState.js';
import Grid from '../grid/Grid.js';
import EnemyUnit from '../units/EnemyUnit.js';
import PlayerUnit from '../units/PlayerUnit.js';

describe('GameState', () => {
  it('initializes with per-player castle HP and proper grid', () => {
    const players = ['Alice', 'Bob'];
    const gs = new GameState(players, 12, 200);
    expect(gs.grid).toBeInstanceOf(Grid);
    expect(gs.playerCount).toBe(players.length);
    players.forEach((p) => {
      expect(gs.castleHealth[p]).toBe(200);
    });
  });

  it('adds and removes units from the state', () => {
    const gs = new GameState(['P1','P2','P3']);
    const unit = new EnemyUnit({ maxHealth: 10, damage: 2, row: 1, col: 1 });
    gs.addUnit(unit);
    expect(gs.units.has(unit.id)).toBe(true);
    gs.removeUnit(unit);
    expect(gs.units.has(unit.id)).toBe(false);
  });

  it('applies row-specific castle damage and alive checks', () => {
    const players=['A','B'];
    const gs = new GameState(players, 12, 100);
    gs.applyCastleDamage(1,30); // row 1 belongs to player B
    expect(gs.castleHealth['B']).toBe(70);
    expect(gs.castleHealth['A']).toBe(100);
    gs.applyCastleDamage(1,100);
    expect(gs.castleHealth['B']).toBe(0);
    expect(gs.isPlayerAlive('B')).toBe(false);
    expect(gs.areAnyCastlesAlive()).toBe(true);
  });
});
