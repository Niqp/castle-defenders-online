import GameState from '../game/GameState.js';
import EnemyUnit from '../units/EnemyUnit.js';
import * as Movement from '../game/Movement.js';

/** Utility that advances enemy units exactly one row and applies castle damage via the same
 *  callback logic used in CombatTicker. */
function advanceEnemyUnitsOneTick(gs) {
  Movement.moveEnemyUnits(gs.grid, (enemy, col) => {
    gs.applyCastleDamage(col, enemy.damage || 1);
    gs.removeUnit(enemy);
  });
}

describe('Row-specific castle damage', () => {
  it('applies damage to the correct player based on row', () => {
    const players = ['A', 'B'];
    const gs = new GameState(players, undefined, 100);
    
    // A owns row 0, B owns row 1
    expect(gs.castleHealth.A).toBe(100);
    expect(gs.castleHealth.B).toBe(100);
    
    gs.applyCastleDamage(0, 30); // row 0 belongs to player A
    expect(gs.castleHealth.A).toBe(70);
    expect(gs.castleHealth.B).toBe(100);
    
    gs.applyCastleDamage(1, 30); // row 1 belongs to player B
    expect(gs.castleHealth.A).toBe(70);
    expect(gs.castleHealth.B).toBe(70);
  });
}); 