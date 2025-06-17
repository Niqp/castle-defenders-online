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

describe('Column-specific castle damage', () => {
  const PLAYERS = ['Alice', 'Bob', 'Charlie'];
  const INITIAL_HP = 100;

  let gs;
  beforeEach(() => {
    gs = new GameState([...PLAYERS], undefined, INITIAL_HP);
  });

  test('enemy reaching Bob\'s lane only hurts Bob\'s castle', () => {
    const colBob = gs.playerToCol['Bob'];
    const enemy = new EnemyUnit({ maxHealth: 10, damage: 7, row: gs.grid.rows - 2, col: colBob });
    gs.grid.addUnitToCell(enemy.row, enemy.col, enemy);
    gs.addUnit(enemy);

    // One tick should push the enemy into the castle row and trigger damage.
    advanceEnemyUnitsOneTick(gs);

    expect(gs.castleHealth['Bob']).toBe(INITIAL_HP - enemy.damage);
    expect(gs.castleHealth['Alice']).toBe(INITIAL_HP);
    expect(gs.castleHealth['Charlie']).toBe(INITIAL_HP);
  });
}); 