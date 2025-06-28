import GameState from '../game/GameState.js';
import { spawnPlayerUnit } from '../game/Spawner.js';

/** This is a more direct test of the logic inside GameService.spawnUnit; we re-implement its default-row
 *  behaviour here to keep the test lightweight and free of socket mocks. */
function spawnUnitDefault(gs, playerName, unitConfig) {
  const defaultRow = gs.playerToRow[playerName];
  return spawnPlayerUnit(gs.grid, unitConfig, defaultRow, playerName, 'TestUnit');
}

describe('Default unit spawn lane', () => {
  test('unit spawns in owner\'s row when not overridden', () => {
    const players = ['Alice', 'Bob'];
    const gs = new GameState(players, undefined, 100);

    const unitCfg = { maxHealth: 10, damage: 1 };
    const aliceUnit = spawnUnitDefault(gs, 'Alice', unitCfg);
    const bobUnit = spawnUnitDefault(gs, 'Bob', unitCfg);

    expect(aliceUnit.row).toBe(gs.playerToRow['Alice']);
    expect(bobUnit.row).toBe(gs.playerToRow['Bob']);
  });
}); 