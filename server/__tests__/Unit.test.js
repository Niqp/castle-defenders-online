import Unit from '../units/Unit.js';
import EnemyUnit from '../units/EnemyUnit.js';
import PlayerUnit from '../units/PlayerUnit.js';

describe('Unit System', () => {
  it('creates a Unit with correct initial properties', () => {
    const unit = new Unit({ type: 'enemy', maxHealth: 20, damage: 5, row: 1, col: 2 });
    expect(unit.type).toBe('enemy');
    expect(unit.maxHealth).toBe(20);
    expect(unit.health).toBe(20);
    expect(unit.damage).toBe(5);
    expect(unit.row).toBe(1);
    expect(unit.col).toBe(2);
    expect(unit.isAlive()).toBe(true);
  });

  it('takes damage and updates health', () => {
    const unit = new Unit({ type: 'enemy', maxHealth: 10, damage: 2, row: 0, col: 0 });
    unit.takeDamage(3);
    expect(unit.health).toBe(7);
    unit.takeDamage(10);
    expect(unit.health).toBe(0);
    expect(unit.isAlive()).toBe(false);
  });

  it('EnemyUnit and PlayerUnit inherit from Unit', () => {
    const enemy = new EnemyUnit({ maxHealth: 12, damage: 4, row: 1, col: 0 });
    expect(enemy.type).toBe('enemy');
    expect(enemy.maxHealth).toBe(12);
    expect(enemy.damage).toBe(4);
    expect(enemy.isAlive()).toBe(true);

    const player = new PlayerUnit({ maxHealth: 15, damage: 6, row: 10, col: 2 });
    expect(player.type).toBe('player');
    expect(player.maxHealth).toBe(15);
    expect(player.damage).toBe(6);
    expect(player.isAlive()).toBe(true);
  });
});
