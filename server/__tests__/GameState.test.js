import GameState from '../game/GameState.js';
import Grid from '../grid/Grid.js';
import EnemyUnit from '../units/EnemyUnit.js';
import PlayerUnit from '../units/PlayerUnit.js';

describe('GameState', () => {
  it('initializes with correct player count, grid, and castle health', () => {
    const gs = new GameState(4, 12, 4, 500);
    expect(gs.grid).toBeInstanceOf(Grid);
    expect(gs.playerCount).toBe(4);
    expect(gs.castleHealth).toBe(500);
    expect(gs.units.size).toBe(0);
  });

  it('adds and removes units from the state', () => {
    const gs = new GameState(3);
    const unit = new EnemyUnit({ maxHealth: 10, damage: 2, row: 1, col: 1 });
    gs.addUnit(unit);
    expect(gs.units.has(unit.id)).toBe(true);
    gs.removeUnit(unit);
    expect(gs.units.has(unit.id)).toBe(false);
  });

  it('applies castle damage and checks for alive state', () => {
    const gs = new GameState(2, 12, 2, 100);
    gs.applyCastleDamage(30);
    expect(gs.castleHealth).toBe(70);
    gs.applyCastleDamage(100);
    expect(gs.castleHealth).toBe(0);
    expect(gs.isCastleAlive()).toBe(false);
  });
});
