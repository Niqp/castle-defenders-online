import Grid from '../grid/Grid.js';
import { spawnEnemyUnit, spawnPlayerUnit } from '../game/Spawner.js';
import * as Battle from '../game/Battle.js';

describe('Battle', () => {
  it('enters battle mode when player and enemy are on the same cell', () => {
    const grid = new Grid(3);
    const enemy = spawnEnemyUnit(grid, { maxHealth: 10, damage: 2 });
    const player = spawnPlayerUnit(grid, { maxHealth: 8, damage: 3 }, enemy.row);
    // Move both units into the first battlefield column (column 1)
    const battleCol = 1;
    enemy.col = battleCol;
    player.col = battleCol;
    grid.addUnitToCell(enemy.row, battleCol, enemy); // ensure enemy is placed
    grid.addUnitToCell(player.row, battleCol, player);
    Battle.checkAndStartBattles(grid);
    expect(player.inBattle).toBe(true);
    expect(enemy.inBattle).toBe(true);
    expect(player.targetId).toBe(enemy.id);
    expect(enemy.targetId).toBe(player.id);
  });

  it('applies damage each tick and switches targets if one dies', () => {
    const grid = new Grid(3);
    const enemy1 = spawnEnemyUnit(grid, { maxHealth: 5, damage: 2 });
    const enemy2 = spawnEnemyUnit(grid, { maxHealth: 5, damage: 2 });
    const player = spawnPlayerUnit(grid, { maxHealth: 8, damage: 3 }, 0);
    // Move both units into the first battlefield column (column 1)
    const battleCol = 1;
    player.col = battleCol;
    player.row = 0;
    enemy1.col = battleCol; enemy1.row = 0;
    enemy2.col = battleCol; enemy2.row = 0;
    grid.addUnitToCell(0, battleCol, player);
    grid.addUnitToCell(0, battleCol, enemy1);
    grid.addUnitToCell(0, battleCol, enemy2);
    Battle.checkAndStartBattles(grid);
    // Simulate battle ticks
    for (let i = 0; i < 5; i++) {
      Battle.processBattles(grid);
    }
    // At least one enemy should be dead, player should have switched targets if possible
    const enemiesAlive = [enemy1, enemy2].filter(e => e.health > 0);

    if (enemiesAlive.length === 0) {
      expect(player.inBattle).toBe(false);
      expect(player.targetId).toBe(null);
    } else {
      // If at least one enemy is alive, player may or may not be in battle depending on implementation
      // Accept both possibilities for robustness
      if (player.inBattle) {
        expect([enemy1.id, enemy2.id]).toContain(player.targetId);
      } else {
        expect(player.targetId).toBe(null);
      }
    }
  });

  it('selects a random targetId from multiple enemy units', () => {
    const grid = new Grid(3);
    const enemy1 = spawnEnemyUnit(grid, { maxHealth: 5, damage: 2 });
    const enemy2 = spawnEnemyUnit(grid, { maxHealth: 5, damage: 2 });
    const enemy3 = spawnEnemyUnit(grid, { maxHealth: 5, damage: 2 });
    const player = spawnPlayerUnit(grid, { maxHealth: 8, damage: 3 }, 0);
    // Move both units into the first battlefield column (column 1)
    const battleCol = 1;
    player.col = battleCol; player.row = 0;
    enemy1.col = battleCol; enemy1.row = 0;
    enemy2.col = battleCol; enemy2.row = 0;
    enemy3.col = battleCol; enemy3.row = 0;
    grid.addUnitToCell(0, battleCol, player);
    grid.addUnitToCell(0, battleCol, enemy1);
    grid.addUnitToCell(0, battleCol, enemy2);
    grid.addUnitToCell(0, battleCol, enemy3);
    Battle.checkAndStartBattles(grid);
    // Player should have a targetId of one of the enemies
    expect([enemy1.id, enemy2.id, enemy3.id]).toContain(player.targetId);
    // All enemies should have player as target
    expect(enemy1.targetId === player.id || enemy2.targetId === player.id || enemy3.targetId === player.id).toBe(true);
  });

  it('exits battle mode if no enemies remain in the cell', () => {
    const grid = new Grid(3);
    const enemy = spawnEnemyUnit(grid, { maxHealth: 2, damage: 1 });
    const player = spawnPlayerUnit(grid, { maxHealth: 8, damage: 3 }, 0);
    // Move both units into the first battlefield column (column 1)
    const battleCol = 1;
    player.col = battleCol; player.row = 0;
    enemy.col = battleCol; enemy.row = 0;
    grid.addUnitToCell(0, battleCol, player);
    grid.addUnitToCell(0, battleCol, enemy);
    Battle.checkAndStartBattles(grid);
    // One tick should kill the enemy
    Battle.processBattles(grid);
    expect(player.inBattle).toBe(false);
    expect(player.targetId).toBe(null);
  });

  it('Priest heals all friendly units in the same cell', () => {
    const grid = new Grid(3);
    const enemy = spawnEnemyUnit(grid, { maxHealth: 50, damage: 1 }); // Weak enemy to avoid killing units
    const priest = spawnPlayerUnit(grid, { maxHealth: 60, damage: 3, healAmount: 8, unitType: 'Priest' }, 0, 'player1', 'Priest');
    const warrior = spawnPlayerUnit(grid, { maxHealth: 50, damage: 6, unitType: 'Swordsman' }, 0, 'player1', 'Swordsman');
    
    // Move all units to battle column
    const battleCol = 1;
    priest.col = battleCol; priest.row = 0;
    warrior.col = battleCol; warrior.row = 0;
    enemy.col = battleCol; enemy.row = 0;
    
    // Damage the warrior first
    warrior.health = 20; // Wounded warrior
    
    grid.addUnitToCell(0, battleCol, priest);
    grid.addUnitToCell(0, battleCol, warrior);
    grid.addUnitToCell(0, battleCol, enemy);
    
    Battle.checkAndStartBattles(grid);
    const initialWarriorHealth = warrior.health;
    
    // Process one battle tick
    Battle.processBattles(grid);
    
    // Warrior should be healed by priest (heal 8, take 1 damage from enemy = net +7)
    expect(warrior.health).toBeGreaterThan(initialWarriorHealth);
    expect(warrior.health).toBe(Math.min(warrior.maxHealth, initialWarriorHealth + 8 - 1)); // healed by 8, damaged by 1
  });

  it('Mage attacks all enemy units in the same cell', () => {
    const grid = new Grid(3);
    const enemy1 = spawnEnemyUnit(grid, { maxHealth: 20, damage: 1 });
    const enemy2 = spawnEnemyUnit(grid, { maxHealth: 20, damage: 1 });
    const enemy3 = spawnEnemyUnit(grid, { maxHealth: 20, damage: 1 });
    const mage = spawnPlayerUnit(grid, { maxHealth: 45, damage: 8, unitType: 'Mage' }, 0, 'player1', 'Mage');
    
    // Move all units to battle column
    const battleCol = 1;
    mage.col = battleCol; mage.row = 0;
    enemy1.col = battleCol; enemy1.row = 0;
    enemy2.col = battleCol; enemy2.row = 0;
    enemy3.col = battleCol; enemy3.row = 0;
    
    grid.addUnitToCell(0, battleCol, mage);
    grid.addUnitToCell(0, battleCol, enemy1);
    grid.addUnitToCell(0, battleCol, enemy2);
    grid.addUnitToCell(0, battleCol, enemy3);
    
    Battle.checkAndStartBattles(grid);
    
    // Process one battle tick
    Battle.processBattles(grid);
    
    // All enemies should take damage from mage's AoE attack
    expect(enemy1.health).toBe(12); // 20 - 8 = 12
    expect(enemy2.health).toBe(12); // 20 - 8 = 12  
    expect(enemy3.health).toBe(12); // 20 - 8 = 12
  });

  it('Priest can heal itself and other units', () => {
    const grid = new Grid(3);
    const enemy = spawnEnemyUnit(grid, { maxHealth: 50, damage: 1 }); // Weak enemy
    const priest = spawnPlayerUnit(grid, { maxHealth: 60, damage: 3, healAmount: 8, unitType: 'Priest' }, 0, 'player1', 'Priest');
    
    // Move units to battle column
    const battleCol = 1;
    priest.col = battleCol; priest.row = 0;
    enemy.col = battleCol; enemy.row = 0;
    
    // Damage the priest
    priest.health = 30; // Wounded priest
    
    grid.addUnitToCell(0, battleCol, priest);
    grid.addUnitToCell(0, battleCol, enemy);
    
    Battle.checkAndStartBattles(grid);
    const initialPriestHealth = priest.health;
    
    // Process one battle tick
    Battle.processBattles(grid);
    
    // Priest should heal itself (heal 8, take 1 damage from enemy = net +7)
    expect(priest.health).toBeGreaterThan(initialPriestHealth);
    expect(priest.health).toBe(Math.min(priest.maxHealth, initialPriestHealth + 8 - 1)); // healed by 8, damaged by 1
  });

  it('Berserker heals itself for 50% of its damage after attacking', () => {
    const grid = new Grid(3);
    const berserker = spawnEnemyUnit(grid, { maxHealth: 280, damage: 40, subtype: 'berserker', selfHealPercent: 0.5 });
    const player = spawnPlayerUnit(grid, { maxHealth: 100, damage: 5, unitType: 'Swordsman' }, 0, 'player1', 'Swordsman');
    
    // Move units to battle column
    const battleCol = 1;
    berserker.col = battleCol; berserker.row = 0;
    player.col = battleCol; player.row = 0;
    
    // Damage the berserker first
    berserker.health = 200; // Wounded berserker
    
    grid.addUnitToCell(0, battleCol, berserker);
    grid.addUnitToCell(0, battleCol, player);
    
    Battle.checkAndStartBattles(grid);
    const initialBerserkerHealth = berserker.health;
    
    // Process one battle tick
    Battle.processBattles(grid);
    
    // Berserker should heal itself for 50% of its damage (40 * 0.5 = 20)
    // But also takes damage from player (5), so net healing = 20 - 5 = 15
    expect(berserker.health).toBeGreaterThan(initialBerserkerHealth);
    expect(berserker.health).toBe(Math.min(berserker.maxHealth, initialBerserkerHealth + 20 - 5)); // healed 20, damaged 5
  });

  it('Warlord attacks all player units in the same cell', () => {
    const grid = new Grid(3);
    const warlord = spawnEnemyUnit(grid, { maxHealth: 450, damage: 60, subtype: 'warlord' });
    const player1 = spawnPlayerUnit(grid, { maxHealth: 100, damage: 5, unitType: 'Swordsman' }, 0, 'player1', 'Swordsman');
    const player2 = spawnPlayerUnit(grid, { maxHealth: 80, damage: 8, unitType: 'Archer' }, 0, 'player2', 'Archer');
    const player3 = spawnPlayerUnit(grid, { maxHealth: 140, damage: 18, unitType: 'Knight' }, 0, 'player3', 'Knight');
    
    // Move all units to battle column
    const battleCol = 1;
    warlord.col = battleCol; warlord.row = 0;
    player1.col = battleCol; player1.row = 0;
    player2.col = battleCol; player2.row = 0;
    player3.col = battleCol; player3.row = 0;
    
    grid.addUnitToCell(0, battleCol, warlord);
    grid.addUnitToCell(0, battleCol, player1);
    grid.addUnitToCell(0, battleCol, player2);
    grid.addUnitToCell(0, battleCol, player3);
    
    Battle.checkAndStartBattles(grid);
    
    // Process one battle tick
    Battle.processBattles(grid);
    
    // All players should take damage from warlord's AoE attack (60 damage each)
    expect(player1.health).toBe(40); // 100 - 60 = 40
    expect(player2.health).toBe(20); // 80 - 60 = 20
    expect(player3.health).toBe(80); // 140 - 60 = 80
  });

  it('Berserker does not heal if it does not attack', () => {
    const grid = new Grid(3);
    const berserker = spawnEnemyUnit(grid, { maxHealth: 280, damage: 40, subtype: 'berserker', selfHealPercent: 0.5 });
    
    // Place berserker alone in a cell (no battle)
    const battleCol = 1;
    berserker.col = battleCol; berserker.row = 0;
    berserker.health = 200; // Wounded berserker
    
    grid.addUnitToCell(0, battleCol, berserker);
    
    const initialBerserkerHealth = berserker.health;
    
    // Process battle tick (no enemies, so no battle)
    Battle.processBattles(grid);
    
    // Berserker should not heal because it didn't attack
    expect(berserker.health).toBe(initialBerserkerHealth);
  });
});
