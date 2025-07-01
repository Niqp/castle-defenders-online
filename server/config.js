export const PORT = process.env.PORT || 3001;
export const CORS_ORIGIN = '*';

export const TIMINGS = {
  WORKER_INTERVAL: 1000,
  WAVE_INTERVAL: 50000,
  COUNTDOWN_INTERVAL: 1000,
};

// Grid configuration
export const GRID_CONFIG = {
  DEFAULT_COLUMNS: 10,
  MIN_ROWS: 1,
};

// Rebalanced wave spawning with steady difficulty increase
export const WAVE_CONFIG = {
  BASE_ENEMIES_PER_WAVE: 5, // Increased from 4 for more consistent threat
  ENEMIES_PER_PLAYER_SCALING: 0.5, // Increased from 0.4 for better scaling
  PLAYER_COUNT_SCALING_CURVE: 1.15, // Slightly increased
  MAX_ENEMIES_PER_LANE: 25,
  LANE_DISTRIBUTION_SMOOTHING: 0.3,
  MIN_ENEMIES_PER_ACTIVE_LANE: 1,
  LAST_SCALING_WAVE: 50, // Reduced from 60 for faster enemy progression
  FALLBACK_ENEMY: { 
    baseHealth: 12, 
    baseDamage: 3 
  },
};

// Tighter starting economy
export const GAME_BALANCE = {
  INITIAL_CASTLE_HP: 350, // Slightly reduced from 400
  STARTING_GOLD: 6, // Reduced from 10, but not too harsh
  STARTING_FOOD: 3, // Reduced from 5, but allows 1 early unit
  COOP_BONUS_PER_PLAYER: 0.02, // Reduced from 0.03
  LARGE_GAME_CASTLE_HP_BONUS: 25,
};

// Rebalanced worker economy with integer values only
export const WORKER_TYPES = {
  // Gold workers - higher tiers less efficient but more convenient
  Miner:    { costs: { gold: 80 },   outputs: { gold: 1 },   sprite: 'miner.png' },     // 0.0125 efficiency
  Digger:   { costs: { gold: 600 },  outputs: { gold: 6 },   sprite: 'digger.png' },    // 0.01 efficiency  
  Excavator:{ costs: { gold: 1500 }, outputs: { gold: 12 },  sprite: 'excavator.png' }, // 0.008 efficiency
  
  // Food workers - same scaling pattern
  Farmer:   { costs: { gold: 80 },   outputs: { food: 1 },   sprite: 'farmer.png' },    // 1 food per 2 seconds
  Hunter:   { costs: { gold: 600 },  outputs: { food: 5 },   sprite: 'hunter.png' },    // 1 food per 2.4 seconds per gold
  Rancher:  { costs: { gold: 1500 }, outputs: { food: 10 },  sprite: 'rancher.png' },   // 1 food per 3 seconds per gold
};

// Rebalanced units - keep spam units affordable, premium units expensive
export const UNIT_TYPES = {
  // Early defense - affordable spam unit
  Swordsman: { costs: { gold: 50, food: 15 }, hp: 50, dmg: 6, sprite: 'swordsman.png' },
  
  // Mid-tier unit - reasonable cost increase
  Archer: { costs: { gold: 120, food: 45 }, hp: 35, dmg: 18, sprite: 'archer.png' },
  
  // Premium tank unit - expensive but powerful
  Knight: { costs: { gold: 350, food: 100 }, hp: 140, dmg: 12, sprite: 'knight.png' },
  
  // Premium support - expensive utility
  Priest: { costs: { gold: 280, food: 70 }, hp: 50, dmg: 3, healAmount: 12, sprite: 'priest.png' },
  
  // Premium AoE - heavily nerfed cost/power ratio
  Mage: { costs: { gold: 320, food: 90 }, hp: 45, dmg: 8, attacksAll: true, sprite: 'mage.png' },
};

// Buffed enemies with steady progression
export const ENEMY_TYPES = {
  // Early game (waves 1-15) - moderately buffed
  goblin:    { baseHealth: 60, baseDamage: 10, sprite: 'goblin.png' },
  
  // Mid game (waves 10-30) - significant presence
  orc:       { baseHealth: 120, baseDamage: 18, sprite: 'orc.png' },
  
  // Late game (waves 25-45) - serious threat
  troll:     { baseHealth: 200, baseDamage: 30, sprite: 'ogre.png' },
  
  // End game (waves 35+) - major challenge
  berserker: { baseHealth: 320, baseDamage: 45, selfHealPercent: 0.3, sprite: 'berserk.png' },
  warlord:   { baseHealth: 500, baseDamage: 40, attacksAll: true, sprite: 'warlord.png' },
};

export const CLIENT_TTL_MS = 1000 * 60 * 60;

// Rebalanced upgrades - useful but not economy-breaking
export const UPGRADE_TYPES = {
  MINING_EFFICIENCY: {
    id: 'MINING_EFFICIENCY',
    name: 'Mining Efficiency',
    description: 'Increases gold gained from manual mining',
    category: 'mining',
    levels: [
      { level: 1, cost: { gold: 100, food: 0 }, effect: { mineGoldAmount: 2 } },
      { level: 2, cost: { gold: 350, food: 0 }, effect: { mineGoldAmount: 3 } },
      { level: 3, cost: { gold: 800, food: 0 }, effect: { mineGoldAmount: 4 } },
      { level: 4, cost: { gold: 1800, food: 0 }, effect: { mineGoldAmount: 5 } },
      { level: 5, cost: { gold: 4000, food: 0 }, effect: { mineGoldAmount: 7 } },
    ]
  },

  WORKER_PRODUCTIVITY: {
    id: 'WORKER_PRODUCTIVITY',
    name: 'Worker Productivity',
    description: 'Increases resource generation from all workers by 10% per level',
    category: 'workers',
    levels: [
      { level: 1, cost: { gold: 150, food: 40 }, effect: { workerMultiplier: 1.1 } },   // +10%
      { level: 2, cost: { gold: 500, food: 100 }, effect: { workerMultiplier: 1.2 } },  // +20% total
      { level: 3, cost: { gold: 1200, food: 250 }, effect: { workerMultiplier: 1.3 } }, // +30% total
      { level: 4, cost: { gold: 2800, food: 600 }, effect: { workerMultiplier: 1.4 } }, // +40% total
      { level: 5, cost: { gold: 6500, food: 1400 }, effect: { workerMultiplier: 1.5 } }, // +50% total
    ]
  },

  EFFICIENT_MINING: {
    id: 'EFFICIENT_MINING',
    name: 'Efficient Mining',
    description: 'Reduces cost of gold-generating workers by 10% per level',
    category: 'workers',
    levels: [
      { level: 1, cost: { gold: 300, food: 30 }, effect: { goldWorkerCostReduction: 0.9 } },
      { level: 2, cost: { gold: 800, food: 80 }, effect: { goldWorkerCostReduction: 0.8 } },
      { level: 3, cost: { gold: 2000, food: 200 }, effect: { goldWorkerCostReduction: 0.7 } },
    ]
  },

  EFFICIENT_FARMING: {
    id: 'EFFICIENT_FARMING',
    name: 'Efficient Farming',
    description: 'Reduces cost of food-generating workers by 10% per level',
    category: 'workers',
    levels: [
      { level: 1, cost: { gold: 350, food: 40 }, effect: { foodWorkerCostReduction: 0.9 } },
      { level: 2, cost: { gold: 850, food: 100 }, effect: { foodWorkerCostReduction: 0.8 } },
      { level: 3, cost: { gold: 2200, food: 250 }, effect: { foodWorkerCostReduction: 0.7 } },
    ]
  },

  UNIT_ARMOR: {
    id: 'UNIT_ARMOR',
    name: 'Unit Armor',
    description: 'Increases health of all military units by 15% per level',
    category: 'military',
    levels: [
      { level: 1, cost: { gold: 400, food: 80 }, effect: { unitHealthMultiplier: 1.15 } },
      { level: 2, cost: { gold: 1000, food: 200 }, effect: { unitHealthMultiplier: 1.3 } },
      { level: 3, cost: { gold: 2500, food: 500 }, effect: { unitHealthMultiplier: 1.45 } },
      { level: 4, cost: { gold: 6000, food: 1200 }, effect: { unitHealthMultiplier: 1.6 } },
      { level: 5, cost: { gold: 14000, food: 2800 }, effect: { unitHealthMultiplier: 1.75 } },
    ]
  },

  WEAPON_ENHANCEMENT: {
    id: 'WEAPON_ENHANCEMENT',
    name: 'Weapon Enhancement',
    description: 'Increases damage of all military units by 12% per level',
    category: 'military',
    levels: [
      { level: 1, cost: { gold: 300, food: 60 }, effect: { unitDamageMultiplier: 1.12 } },
      { level: 2, cost: { gold: 800, food: 160 }, effect: { unitDamageMultiplier: 1.24 } },
      { level: 3, cost: { gold: 2000, food: 400 }, effect: { unitDamageMultiplier: 1.36 } },
      { level: 4, cost: { gold: 5000, food: 1000 }, effect: { unitDamageMultiplier: 1.48 } },
      { level: 5, cost: { gold: 12000, food: 2400 }, effect: { unitDamageMultiplier: 1.6 } },
    ]
  },

  RECRUITMENT_EFFICIENCY: {
    id: 'RECRUITMENT_EFFICIENCY',
    name: 'Recruitment Efficiency',
    description: 'Reduces cost of all military units by 8% per level',
    category: 'military',
    levels: [
      { level: 1, cost: { gold: 500, food: 100 }, effect: { unitCostReduction: 0.92 } },
      { level: 2, cost: { gold: 1400, food: 280 }, effect: { unitCostReduction: 0.84 } },
      { level: 3, cost: { gold: 3500, food: 700 }, effect: { unitCostReduction: 0.76 } },
    ]
  },

  CASTLE_FORTIFICATION: {
    id: 'CASTLE_FORTIFICATION',
    name: 'Castle Fortification',
    description: 'Increases maximum castle health by 100 per level',
    category: 'castle',
    levels: [
      { level: 1, cost: { gold: 800, food: 150 }, effect: { castleMaxHpIncrease: 100 } },
      { level: 2, cost: { gold: 2000, food: 400 }, effect: { castleMaxHpIncrease: 200 } },
      { level: 3, cost: { gold: 5000, food: 1000 }, effect: { castleMaxHpIncrease: 300 } },
      { level: 4, cost: { gold: 12000, food: 2400 }, effect: { castleMaxHpIncrease: 400 } },
      { level: 5, cost: { gold: 28000, food: 5600 }, effect: { castleMaxHpIncrease: 500 } },
    ]
  },

  CASTLE_REPAIRS: {
    id: 'CASTLE_REPAIRS',
    name: 'Castle Repairs',
    description: 'Slowly regenerates castle health over time (5 HP per second per level)',
    category: 'castle',
    levels: [
      { level: 1, cost: { gold: 1200, food: 200 }, effect: { castleRegenRate: 5 } },
      { level: 2, cost: { gold: 3000, food: 500 }, effect: { castleRegenRate: 10 } },
      { level: 3, cost: { gold: 7500, food: 1250 }, effect: { castleRegenRate: 15 } },
    ]
  },
  
  CRITICAL_STRIKES: {
    id: 'CRITICAL_STRIKES',
    name: 'Critical Strikes',
    description: 'Units have a 6% chance per level to deal double damage',
    category: 'military',
    levels: [
      { level: 1, cost: { gold: 1500, food: 250 }, effect: { critChance: 0.06 } },
      { level: 2, cost: { gold: 3800, food: 600 }, effect: { critChance: 0.12 } },
      { level: 3, cost: { gold: 9500, food: 1500 }, effect: { critChance: 0.18 } },
    ]
  },

  OVERCHARGE: {
    id: 'OVERCHARGE',
    name: 'Overcharge',
    description: 'Manual mining also gives food (1 food per 4 gold mined)',
    category: 'mining',
    levels: [
      { level: 1, cost: { gold: 1200, food: 400 }, effect: { miningFoodRatio: 0.25 } },
      { level: 2, cost: { gold: 3000, food: 1000 }, effect: { miningFoodRatio: 0.5 } },
    ]
  },
};

// Slightly adjusted large game features
export const LARGE_GAME_FEATURES = {
  ENABLE_AUTO_SPAWN: true,
  AUTO_SPAWN_THRESHOLD: 5,
  AUTO_SPAWN_RESOURCE_MULTIPLIER: 3,
  SHARED_VISION_THRESHOLD: 4,
};