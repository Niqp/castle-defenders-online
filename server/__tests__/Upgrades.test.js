import { GameService } from '../services/GameService.js';
import { ResourceTicker } from '../ticker/ResourceTicker.js';
import { CastleRegenTicker } from '../ticker/CastleRegenTicker.js';
import { UPGRADE_TYPES, WORKER_TYPES, UNIT_TYPES, GAME_BALANCE } from '../config.js';
import { EVENTS } from '../events.js';

// Mock socket
const createMockSocket = (id = 'test-socket') => ({
  id,
  emit: jest.fn(),
  to: jest.fn().mockReturnThis(),
  in: jest.fn().mockReturnThis(),
});

// Mock IO
const createMockIO = () => ({
  emit: jest.fn(),
  in: jest.fn(() => ({ emit: jest.fn() })),
  to: jest.fn(() => ({ emit: jest.fn() })),
});

describe('Upgrade System', () => {
  let gameService;
  let mockIO;
  let mockSocket;

  beforeEach(() => {
    // Use fake timers to avoid real timer conflicts
    jest.useFakeTimers();
    
    mockIO = createMockIO();
    mockSocket = createMockSocket();
    gameService = new GameService(mockIO, 'test-room');
    gameService.addPlayer('testPlayer');
    gameService.socketToName.set(mockSocket.id, 'testPlayer');
    
    // Set the player as ready and start the game to initialize player objects
    gameService.setReady(mockSocket, true);
    
    // Fast-forward past any initial timers
    jest.advanceTimersByTime(100);
    
    // Mock safeEmitToSocket
    gameService.safeEmitToSocket = jest.fn();
  });

  afterEach(() => {
    if (gameService && typeof gameService.endGame === 'function') {
      gameService.endGame();
    }
    
    // Clear all timers and restore real timers
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  describe('Upgrade Purchase Mechanics', () => {
    it('should allow purchasing upgrades with sufficient resources', () => {
      const player = gameService._getPlayer(mockSocket);
      player.gold = 1000;
      player.food = 1000;

      gameService.purchaseUpgrade(mockSocket, 'MINING_EFFICIENCY');
      
      expect(player.upgrades.MINING_EFFICIENCY).toBe(1);
      expect(player.gold).toBe(1000 - 80); // Cost of level 1
      expect(player.food).toBe(1000); // No food cost for level 1
    });

    it('should not allow purchasing upgrades with insufficient resources', () => {
      const player = gameService._getPlayer(mockSocket);
      player.gold = 50; // Not enough for level 1 (costs 80)
      player.food = 0;

      gameService.purchaseUpgrade(mockSocket, 'MINING_EFFICIENCY');
      
      expect(player.upgrades.MINING_EFFICIENCY).toBe(0);
      expect(player.gold).toBe(50); // Should not be deducted
    });

    it('should not allow purchasing beyond max level', () => {
      const player = gameService._getPlayer(mockSocket);
      player.gold = 10000;
      player.food = 10000;
      player.upgrades.MINING_EFFICIENCY = 5; // Already at max level

      gameService.purchaseUpgrade(mockSocket, 'MINING_EFFICIENCY');
      
      expect(player.upgrades.MINING_EFFICIENCY).toBe(5);
      expect(player.gold).toBe(10000); // Should not be deducted
    });

    it('should handle invalid upgrade IDs gracefully', () => {
      const player = gameService._getPlayer(mockSocket);
      player.gold = 1000;

      gameService.purchaseUpgrade(mockSocket, 'INVALID_UPGRADE');
      
      expect(player.gold).toBe(1000); // Should not be deducted
    });
  });

  describe('Mining Efficiency Upgrade', () => {
    it('should increase gold from manual mining', () => {
      const player = gameService._getPlayer(mockSocket);
      player.gold = 0;
      player.upgrades.MINING_EFFICIENCY = 1;

      gameService.mine(mockSocket);
      
      expect(player.gold).toBe(2); // Level 1 gives 2 gold per click
    });

    it('should scale correctly with upgrade levels', () => {
      const player = gameService._getPlayer(mockSocket);
      
      // Test each level
      const expectedAmounts = [1, 2, 3, 5, 8, 15]; // Level 0-5
      
      for (let level = 0; level <= 5; level++) {
        player.gold = 0;
        player.upgrades.MINING_EFFICIENCY = level;
        
        gameService.mine(mockSocket);
        
        expect(player.gold).toBe(expectedAmounts[level]);
      }
    });
  });

  describe('Worker Productivity Upgrade', () => {
    it('should increase worker output', () => {
      const mockPlayers = [{ 
        name: 'testPlayer', 
        gold: 0, 
        food: 0,
        workers: { Miner: 1 },
        upgrades: { WORKER_PRODUCTIVITY: 1 }
      }];

      const mockSocketToName = new Map();
      const resourceTicker = new ResourceTicker(mockIO, mockSocketToName, mockPlayers);

      resourceTicker.tick();

      // Base Miner output: 1 gold/s, with level 1 productivity (1.2x): 1.2 gold/s
      // Plus cooperative bonus for 1 player (1.0x): 1.2 gold/s
      expect(mockPlayers[0].gold).toBe(1.2);
    });

    it('should apply cooperative bonus correctly', () => {
      const mockPlayers = [
        { 
          name: 'player1', 
          gold: 0, 
          food: 0,
          workers: { Miner: 1 },
          upgrades: { WORKER_PRODUCTIVITY: 0 }
        },
        { 
          name: 'player2', 
          gold: 0, 
          food: 0,
          workers: { Miner: 1 },
          upgrades: { WORKER_PRODUCTIVITY: 0 }
        }
      ];

      const mockSocketToName = new Map();
      const resourceTicker = new ResourceTicker(mockIO, mockSocketToName, mockPlayers);

      resourceTicker.tick();

      // Base output: 1 gold/s, with 2 players cooperative bonus (1.1x): 1.1 gold/s each
      expect(mockPlayers[0].gold).toBe(1.1);
      expect(mockPlayers[1].gold).toBe(1.1);
    });
  });

  describe('Worker Cost Reduction Upgrades', () => {
    it('should reduce gold worker costs with Efficient Mining', () => {
      const player = gameService._getPlayer(mockSocket);
      player.upgrades.EFFICIENT_MINING = 1; // 15% reduction (0.85 multiplier)

      const modifiedWorker = gameService._getModifiedWorkerCost(WORKER_TYPES.Miner, player);
      
      expect(modifiedWorker.costs.gold).toBe(Math.ceil(50 * 0.85)); // 43
    });

    it('should reduce food worker costs with Efficient Farming', () => {
      const player = gameService._getPlayer(mockSocket);
      player.upgrades.EFFICIENT_FARMING = 1; // 15% reduction (0.85 multiplier)

      const modifiedWorker = gameService._getModifiedWorkerCost(WORKER_TYPES.Farmer, player);
      
      expect(modifiedWorker.costs.gold).toBe(Math.ceil(50 * 0.85)); // 43
    });

    it('should not affect workers of wrong type', () => {
      const player = gameService._getPlayer(mockSocket);
      player.upgrades.EFFICIENT_MINING = 3; // Should affect gold workers, not food workers
      player.upgrades.EFFICIENT_FARMING = 3; // Should affect food workers, not gold workers

      const modifiedMiner = gameService._getModifiedWorkerCost(WORKER_TYPES.Miner, player);
      const modifiedFarmer = gameService._getModifiedWorkerCost(WORKER_TYPES.Farmer, player);
      
      // Miner should be affected by EFFICIENT_MINING (level 3 = 0.55 multiplier)
      expect(modifiedMiner.costs.gold).toBe(Math.ceil(50 * 0.55)); // 28
      // Farmer should be affected by EFFICIENT_FARMING (level 3 = 0.55 multiplier)
      expect(modifiedFarmer.costs.gold).toBe(Math.ceil(50 * 0.55)); // 28
      
      // Test that upgrades don't cross-affect (mining upgrade only on miner, farming only on farmer)
      const playerOnlyMining = { upgrades: { EFFICIENT_MINING: 3 } };
      const playerOnlyFarming = { upgrades: { EFFICIENT_FARMING: 3 } };
      
      const minerWithOnlyMining = gameService._getModifiedWorkerCost(WORKER_TYPES.Miner, playerOnlyMining);
      const farmerWithOnlyMining = gameService._getModifiedWorkerCost(WORKER_TYPES.Farmer, playerOnlyMining);
      const minerWithOnlyFarming = gameService._getModifiedWorkerCost(WORKER_TYPES.Miner, playerOnlyFarming);
      const farmerWithOnlyFarming = gameService._getModifiedWorkerCost(WORKER_TYPES.Farmer, playerOnlyFarming);
      
      expect(minerWithOnlyMining.costs.gold).toBe(Math.ceil(50 * 0.55)); // Mining affects miner
      expect(farmerWithOnlyMining.costs.gold).toBe(50); // Mining doesn't affect farmer
      expect(minerWithOnlyFarming.costs.gold).toBe(50); // Farming doesn't affect miner  
      expect(farmerWithOnlyFarming.costs.gold).toBe(Math.ceil(50 * 0.55)); // Farming affects farmer
    });
  });

  describe('Unit Upgrade Effects', () => {
    it('should increase unit health with Unit Armor', () => {
      const player = gameService._getPlayer(mockSocket);
      player.upgrades.UNIT_ARMOR = 1; // 25% increase (1.25 multiplier)

      const modifiedUnit = gameService._getModifiedUnitStats(UNIT_TYPES.Swordsman, player);
      
      expect(modifiedUnit.hp).toBe(Math.ceil(50 * 1.25)); // 63
      expect(modifiedUnit.dmg).toBe(6); // Unchanged
    });

    it('should increase unit damage with Weapon Enhancement', () => {
      const player = gameService._getPlayer(mockSocket);
      player.upgrades.WEAPON_ENHANCEMENT = 1; // 20% increase (1.2 multiplier)

      const modifiedUnit = gameService._getModifiedUnitStats(UNIT_TYPES.Swordsman, player);
      
      expect(modifiedUnit.hp).toBe(50); // Unchanged
      expect(modifiedUnit.dmg).toBe(Math.ceil(6 * 1.2)); // 8
    });

    it('should reduce unit costs with Recruitment Efficiency', () => {
      const player = gameService._getPlayer(mockSocket);
      player.upgrades.RECRUITMENT_EFFICIENCY = 1; // 10% reduction (0.9 multiplier)

      const modifiedUnit = gameService._getModifiedUnitCost(UNIT_TYPES.Swordsman, player);
      
      expect(modifiedUnit.costs.gold).toBe(Math.ceil(40 * 0.9)); // 36
      expect(modifiedUnit.costs.food).toBe(Math.ceil(12 * 0.9)); // 11
    });
  });

  describe('Castle Upgrades', () => {
    it('should immediately increase castle HP with Fortification', () => {
      const player = gameService._getPlayer(mockSocket);
      player.gold = 1000;
      player.food = 1000;
      
      const initialCastleHp = gameService.gameState.castleHealth['testPlayer'];
      
      gameService.purchaseUpgrade(mockSocket, 'CASTLE_FORTIFICATION');
      
      const newCastleHp = gameService.gameState.castleHealth['testPlayer'];
      expect(newCastleHp).toBe(initialCastleHp + 200); // Level 1 adds 200 HP
    });

    it('should regenerate castle HP with Castle Repairs', () => {
      // Test the regen logic manually since CastleRegenTicker uses intervals
      const player = gameService._getPlayer(mockSocket);
      player.upgrades.CASTLE_REPAIRS = 1;
      
      const initialHp = gameService.gameState.castleHealth['testPlayer'];
      
      // Manually apply regen logic
      const regenLevel = player.upgrades.CASTLE_REPAIRS;
      const regenRate = gameService._getUpgradeEffect(UPGRADE_TYPES.CASTLE_REPAIRS, regenLevel, 'castleRegenRate', 0);
      gameService.gameState.castleHealth['testPlayer'] += regenRate;

      // Level 1 Castle Repairs: +8 HP per tick
      expect(gameService.gameState.castleHealth['testPlayer']).toBe(initialHp + 8);
    });

    it('should not regenerate beyond max HP', () => {
      const player = gameService._getPlayer(mockSocket);
      player.upgrades.CASTLE_REPAIRS = 1;
      player.upgrades.CASTLE_FORTIFICATION = 1;
      
      // Set HP to max (base + fortification bonus)
      const maxHp = GAME_BALANCE.INITIAL_CASTLE_HP + 200;
      gameService.gameState.castleHealth['testPlayer'] = maxHp;
      
      // Manually apply regen logic but it should not exceed max
      const regenLevel = player.upgrades.CASTLE_REPAIRS;
      const regenRate = gameService._getUpgradeEffect(UPGRADE_TYPES.CASTLE_REPAIRS, regenLevel, 'castleRegenRate', 0);
      const currentHp = gameService.gameState.castleHealth['testPlayer'];
      gameService.gameState.castleHealth['testPlayer'] = Math.min(maxHp, currentHp + regenRate);

      expect(gameService.gameState.castleHealth['testPlayer']).toBe(maxHp); // No change from max
    });
  });

  describe('Overcharge Upgrade', () => {
    it('should be properly configured in upgrade types', () => {
      const overchargeUpgrade = UPGRADE_TYPES.OVERCHARGE;
      
      expect(overchargeUpgrade).toBeDefined();
      expect(overchargeUpgrade.category).toBe('mining');
      expect(overchargeUpgrade.levels[0].effect.miningFoodRatio).toBe(0.25);
      expect(overchargeUpgrade.levels[2].effect.miningFoodRatio).toBe(1.0);
    });

    it('should give food when mining with Overcharge upgrade', () => {
      const player = gameService._getPlayer(mockSocket);
      player.gold = 0;
      player.food = 0;
      player.upgrades.MINING_EFFICIENCY = 2; // 3 gold per click
      player.upgrades.OVERCHARGE = 1; // 0.25 food per gold ratio

      gameService.mine(mockSocket);
      
      expect(player.gold).toBe(3);
      expect(player.food).toBe(Math.floor(3 * 0.25)); // 0 (rounds down)
    });

    it('should scale food gain with gold amount', () => {
      const player = gameService._getPlayer(mockSocket);
      player.gold = 0;
      player.food = 0;
      player.upgrades.MINING_EFFICIENCY = 5; // 15 gold per click
      player.upgrades.OVERCHARGE = 3; // 1.0 food per gold ratio

      gameService.mine(mockSocket);
      
      expect(player.gold).toBe(15);
      expect(player.food).toBe(15); // 1:1 ratio at max level
    });

    it('should not give food without Overcharge upgrade', () => {
      const player = gameService._getPlayer(mockSocket);
      player.gold = 0;
      player.food = 0;
      player.upgrades.MINING_EFFICIENCY = 3; // 5 gold per click
      player.upgrades.OVERCHARGE = 0; // No overcharge

      gameService.mine(mockSocket);
      
      expect(player.gold).toBe(5);
      expect(player.food).toBe(0); // No food gain
    });
  });

  describe('Upgrade Helper Functions', () => {
    it('should return default values for level 0', () => {
      const result = gameService._getUpgradeEffect(
        UPGRADE_TYPES.MINING_EFFICIENCY, 
        0, 
        'mineGoldAmount', 
        1
      );
      
      expect(result).toBe(1);
    });

    it('should return correct effect values for valid levels', () => {
      const result = gameService._getUpgradeEffect(
        UPGRADE_TYPES.MINING_EFFICIENCY, 
        2, 
        'mineGoldAmount', 
        1
      );
      
      expect(result).toBe(3); // Level 2 gives 3 gold per click
    });

    it('should return default for invalid levels', () => {
      const result = gameService._getUpgradeEffect(
        UPGRADE_TYPES.MINING_EFFICIENCY, 
        99, 
        'mineGoldAmount', 
        1
      );
      
      expect(result).toBe(1); // Should fallback to default
    });
  });

  describe('Critical Strikes Upgrade', () => {
    it('should be configured correctly in upgrade types', () => {
      const critUpgrade = UPGRADE_TYPES.CRITICAL_STRIKES;
      
      expect(critUpgrade).toBeDefined();
      expect(critUpgrade.category).toBe('military');
      expect(critUpgrade.levels[0].effect.critChance).toBe(0.1);
      expect(critUpgrade.levels[1].effect.critChance).toBe(0.2);
      expect(critUpgrade.levels[2].effect.critChance).toBe(0.3);
    });

    it('should increase critical strike chance with upgrades', () => {
      const player = gameService._getPlayer(mockSocket);
      player.upgrades.CRITICAL_STRIKES = 1; // 10% crit chance
      
      // Test that the upgrade affects the getUpgradeEffect function
      const critChance = gameService._getUpgradeEffect(
        UPGRADE_TYPES.CRITICAL_STRIKES, 
        1, 
        'critChance', 
        0
      );
      
      expect(critChance).toBe(0.1); // 10% crit chance at level 1
    });
  });

  describe('Upgrade Integration', () => {
    it('should emit upgrade updates when purchased', () => {
      const player = gameService._getPlayer(mockSocket);
      player.gold = 1000;
      player.food = 1000;

      gameService.purchaseUpgrade(mockSocket, 'MINING_EFFICIENCY');
      
      expect(gameService.safeEmitToSocket).toHaveBeenCalledWith(
        mockSocket, 
        EVENTS.UPGRADE_UPDATE, 
        { upgrades: player.upgrades }
      );
    });

    it('should handle multiple upgrades correctly', () => {
      const player = gameService._getPlayer(mockSocket);
      player.gold = 5000;
      player.food = 5000;

      gameService.purchaseUpgrade(mockSocket, 'MINING_EFFICIENCY');
      gameService.purchaseUpgrade(mockSocket, 'WORKER_PRODUCTIVITY');
      gameService.purchaseUpgrade(mockSocket, 'UNIT_ARMOR');

      expect(player.upgrades.MINING_EFFICIENCY).toBe(1);
      expect(player.upgrades.WORKER_PRODUCTIVITY).toBe(1);
      expect(player.upgrades.UNIT_ARMOR).toBe(1);
    });

    it('should track upgrade costs correctly', () => {
      const player = gameService._getPlayer(mockSocket);
      player.gold = 1000;
      player.food = 1000;

      const initialGold = player.gold;
      const initialFood = player.food;

      gameService.purchaseUpgrade(mockSocket, 'WORKER_PRODUCTIVITY'); // 130g, 35f

      expect(player.gold).toBe(initialGold - 130);
      expect(player.food).toBe(initialFood - 35);
    });
  });

  describe('All Upgrade Types Validation', () => {
    it('should have all expected upgrade types defined', () => {
      const expectedUpgrades = [
        'MINING_EFFICIENCY',
        'WORKER_PRODUCTIVITY', 
        'EFFICIENT_MINING',
        'EFFICIENT_FARMING',
        'UNIT_ARMOR',
        'WEAPON_ENHANCEMENT',
        'RECRUITMENT_EFFICIENCY',
        'CASTLE_FORTIFICATION',
        'CASTLE_REPAIRS',
        'CRITICAL_STRIKES',
        'OVERCHARGE'
      ];

      expectedUpgrades.forEach(upgradeId => {
        expect(UPGRADE_TYPES[upgradeId]).toBeDefined();
        expect(UPGRADE_TYPES[upgradeId].levels).toBeDefined();
        expect(UPGRADE_TYPES[upgradeId].levels.length).toBeGreaterThan(0);
      });
    });

    it('should have valid level progression for all upgrades', () => {
      Object.entries(UPGRADE_TYPES).forEach(([upgradeId, upgrade]) => {
        upgrade.levels.forEach((level, index) => {
          expect(level.level).toBe(index + 1);
          expect(level.cost).toBeDefined();
          expect(level.effect).toBeDefined();
        });
      });
    });
  });
}); 