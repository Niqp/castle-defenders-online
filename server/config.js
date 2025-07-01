export const PORT = process.env.PORT || 3001;
export const CORS_ORIGIN = '*';

export const TIMINGS = {
  WORKER_INTERVAL: 1000,
  WAVE_INTERVAL: 75000,
  COUNTDOWN_INTERVAL: 1000,
};

// Grid configuration
export const GRID_CONFIG = {
  DEFAULT_COLUMNS: 10, // Distance from castle to portal
  MIN_ROWS: 1, // Minimum lanes (scales up with player count)
};

// Wave spawning and enemy progression
export const WAVE_CONFIG = {
  BASE_ENEMIES_PER_WAVE: 4, // Increased base threat
  ENEMIES_PER_PLAYER_SCALING: 0.4, // Much higher scaling
  PLAYER_COUNT_SCALING_CURVE: 1.1, // Slightly super-linear to make large games harder
  MAX_ENEMIES_PER_LANE: 12, // Increased cap
  LANE_DISTRIBUTION_SMOOTHING: 0.3, // More randomness for variety
  MIN_ENEMIES_PER_ACTIVE_LANE: 1, // Ensure every player gets at least 1 enemy if possible
  LAST_SCALING_WAVE: 150, // Wave where enemy type progression completes
  FALLBACK_ENEMY: { 
    baseHealth: 10, 
    baseDamage: 2 
  },
};

// Game balance parameters
export const GAME_BALANCE = {
  INITIAL_CASTLE_HP: 400, // Reduced for more tension
  STARTING_GOLD: 5, // Reduced from 10 to 5 - very tight start
  STARTING_FOOD: 2, // Reduced from 5 to 2 - forces careful early choices
  COOP_BONUS_PER_PLAYER: 0.03, // Reduced from 0.05 to 0.03
  LARGE_GAME_CASTLE_HP_BONUS: 30, // Reduced bonus
};

export const WORKER_TYPES = {
  // Gold generation - significantly reduced efficiency and higher costs
  Miner:    { costs: { gold: 50 },   outputs: { gold: 1 },   sprite: 'miner.png' },
  Digger:   { costs: { gold: 150 },  outputs: { gold: 4 },   sprite: 'digger.png' },
  Excavator:{ costs: { gold: 500 },  outputs: { gold: 25 },   sprite: 'excavator.png' },
  
  // Food generation - significantly reduced efficiency and higher costs
  Farmer:   { costs: { gold: 50 },   outputs: { food: 0.5 },   sprite: 'farmer.png' },
  Hunter:   { costs: { gold: 150 },  outputs: { food: 2 },   sprite: 'hunter.png' },
  Rancher:  { costs: { gold: 500 },  outputs: { food: 10 },   sprite: 'rancher.png' },
};

export const UNIT_TYPES = {
  // Early game unit - significantly more expensive
  Swordsman: { costs: { gold: 40, food: 12 }, hp: 50, dmg: 6, sprite: 'swordsman.png' },
  
  // Mid game unit - much more expensive
  Archer: { costs: { gold: 65, food: 25 }, hp: 35, dmg: 12, sprite: 'archer.png' },
  
  // Late game unit - very expensive
  Knight: { costs: { gold: 160, food: 55 }, hp: 140, dmg: 18, sprite: 'knight.png' },
  
  // Support unit - heals all friendly units each tick during battle
  Priest: { costs: { gold: 120, food: 40 }, hp: 60, dmg: 3, healAmount: 8, sprite: 'priest.png' },
  
  // Magic unit - attacks all enemy units in the same cell
  Mage: { costs: { gold: 180, food: 60 }, hp: 45, dmg: 8, attacksAll: true, sprite: 'mage.png' },
};

// More aggressive enemy types
export const ENEMY_TYPES = {
  // Early enemies (waves 1-20) - buffed significantly
  goblin:    { baseHealth: 50, baseDamage: 8, sprite: 'goblin.png' },
  
  // Mid enemies (waves 15-50) - earlier introduction
  orc:       { baseHealth: 90, baseDamage: 15, sprite: 'orc.png' },
  
  // Late enemies (waves 30-80)
  troll:     { baseHealth: 160, baseDamage: 25, sprite: 'ogre.png' },
  
  // Ultra late enemies (waves 60+)
  berserker: { baseHealth: 280, baseDamage: 40, selfHealPercent: 0.5, sprite: 'berserk.png' },
  warlord:   { baseHealth: 450, baseDamage: 60, attacksAll: true, sprite: 'warlord.png' },
};

// How long (in ms) we keep a clientId mapping without activity before it is purged.
export const CLIENT_TTL_MS = 1000 * 60 * 60; // 1 hour by default

// Upgrade system configuration - significantly increased costs
export const UPGRADE_TYPES = {
  MINING_EFFICIENCY: {
    id: 'MINING_EFFICIENCY',
    name: 'Mining Efficiency',
    description: 'Increases gold gained from manual mining',
    category: 'mining',
    levels: [
      { level: 1, cost: { gold: 80, food: 0 }, effect: { mineGoldAmount: 2 } },
      { level: 2, cost: { gold: 200, food: 0 }, effect: { mineGoldAmount: 3 } },
      { level: 3, cost: { gold: 500, food: 0 }, effect: { mineGoldAmount: 5 } },
      { level: 4, cost: { gold: 1200, food: 0 }, effect: { mineGoldAmount: 8 } },
      { level: 5, cost: { gold: 2500, food: 0 }, effect: { mineGoldAmount: 15 } },
    ]
  },

  WORKER_PRODUCTIVITY: {
    id: 'WORKER_PRODUCTIVITY',
    name: 'Worker Productivity',
    description: 'Increases resource generation from all workers by 20% per level',
    category: 'workers',
    levels: [
      { level: 1, cost: { gold: 130, food: 35 }, effect: { workerMultiplier: 1.2 } },
      { level: 2, cost: { gold: 350, food: 90 }, effect: { workerMultiplier: 1.4 } },
      { level: 3, cost: { gold: 850, food: 220 }, effect: { workerMultiplier: 1.6 } },
      { level: 4, cost: { gold: 2000, food: 500 }, effect: { workerMultiplier: 1.8 } },
      { level: 5, cost: { gold: 5000, food: 1250 }, effect: { workerMultiplier: 2.0 } },
    ]
  },

  EFFICIENT_MINING: {
    id: 'EFFICIENT_MINING',
    name: 'Efficient Mining',
    description: 'Reduces cost of gold-generating workers by 15% per level',
    category: 'workers',
    levels: [
      { level: 1, cost: { gold: 160, food: 25 }, effect: { goldWorkerCostReduction: 0.85 } },
      { level: 2, cost: { gold: 400, food: 70 }, effect: { goldWorkerCostReduction: 0.7 } },
      { level: 3, cost: { gold: 1000, food: 180 }, effect: { goldWorkerCostReduction: 0.55 } },
    ]
  },

  EFFICIENT_FARMING: {
    id: 'EFFICIENT_FARMING',
    name: 'Efficient Farming',
    description: 'Reduces cost of food-generating workers by 15% per level',
    category: 'workers',
    levels: [
      { level: 1, cost: { gold: 120, food: 35 }, effect: { foodWorkerCostReduction: 0.85 } },
      { level: 2, cost: { gold: 300, food: 90 }, effect: { foodWorkerCostReduction: 0.7 } },
      { level: 3, cost: { gold: 750, food: 220 }, effect: { foodWorkerCostReduction: 0.55 } },
    ]
  },

  UNIT_ARMOR: {
    id: 'UNIT_ARMOR',
    name: 'Unit Armor',
    description: 'Increases health of all military units by 25% per level',
    category: 'military',
    levels: [
      { level: 1, cost: { gold: 320, food: 100 }, effect: { unitHealthMultiplier: 1.25 } },
      { level: 2, cost: { gold: 800, food: 250 }, effect: { unitHealthMultiplier: 1.5 } },
      { level: 3, cost: { gold: 2000, food: 625 }, effect: { unitHealthMultiplier: 1.75 } },
      { level: 4, cost: { gold: 5000, food: 1500 }, effect: { unitHealthMultiplier: 2.0 } },
      { level: 5, cost: { gold: 12000, food: 3750 }, effect: { unitHealthMultiplier: 2.25 } },
    ]
  },

  WEAPON_ENHANCEMENT: {
    id: 'WEAPON_ENHANCEMENT',
    name: 'Weapon Enhancement',
    description: 'Increases damage of all military units by 20% per level',
    category: 'military',
    levels: [
      { level: 1, cost: { gold: 250, food: 80 }, effect: { unitDamageMultiplier: 1.2 } },
      { level: 2, cost: { gold: 650, food: 200 }, effect: { unitDamageMultiplier: 1.4 } },
      { level: 3, cost: { gold: 1600, food: 500 }, effect: { unitDamageMultiplier: 1.6 } },
      { level: 4, cost: { gold: 4000, food: 1250 }, effect: { unitDamageMultiplier: 1.8 } },
      { level: 5, cost: { gold: 10000, food: 3000 }, effect: { unitDamageMultiplier: 2.0 } },
    ]
  },

  RECRUITMENT_EFFICIENCY: {
    id: 'RECRUITMENT_EFFICIENCY',
    name: 'Recruitment Efficiency',
    description: 'Reduces cost of all military units by 10% per level',
    category: 'military',
    levels: [
      { level: 1, cost: { gold: 400, food: 125 }, effect: { unitCostReduction: 0.9 } },
      { level: 2, cost: { gold: 1200, food: 375 }, effect: { unitCostReduction: 0.8 } },
      { level: 3, cost: { gold: 3000, food: 900 }, effect: { unitCostReduction: 0.7 } },
    ]
  },

  CASTLE_FORTIFICATION: {
    id: 'CASTLE_FORTIFICATION',
    name: 'Castle Fortification',
    description: 'Increases maximum castle health by 200 per level',
    category: 'castle',
    levels: [
      { level: 1, cost: { gold: 650, food: 200 }, effect: { castleMaxHpIncrease: 200 } },
      { level: 2, cost: { gold: 1650, food: 500 }, effect: { castleMaxHpIncrease: 400 } },
      { level: 3, cost: { gold: 4000, food: 1250 }, effect: { castleMaxHpIncrease: 600 } },
      { level: 4, cost: { gold: 10000, food: 3000 }, effect: { castleMaxHpIncrease: 800 } },
      { level: 5, cost: { gold: 25000, food: 7500 }, effect: { castleMaxHpIncrease: 1000 } },
    ]
  },

  CASTLE_REPAIRS: {
    id: 'CASTLE_REPAIRS',
    name: 'Castle Repairs',
    description: 'Slowly regenerates castle health over time (8 HP per second per level)',
    category: 'castle',
    levels: [
      { level: 1, cost: { gold: 800, food: 250 }, effect: { castleRegenRate: 8 } },
      { level: 2, cost: { gold: 2000, food: 625 }, effect: { castleRegenRate: 16 } },
      { level: 3, cost: { gold: 5000, food: 1500 }, effect: { castleRegenRate: 24 } },
    ]
  },
  
  CRITICAL_STRIKES: {
    id: 'CRITICAL_STRIKES',
    name: 'Critical Strikes',
    description: 'Units have a 10% chance per level to deal double damage',
    category: 'military',
    levels: [
      { level: 1, cost: { gold: 800, food: 300 }, effect: { critChance: 0.1 } },
      { level: 2, cost: { gold: 2000, food: 750 }, effect: { critChance: 0.2 } },
      { level: 3, cost: { gold: 5000, food: 2000 }, effect: { critChance: 0.3 } },
    ]
  },

  OVERCHARGE: {
    id: 'OVERCHARGE',
    name: 'Overcharge',
    description: 'Manual mining also gives food (1 food per 2 gold mined)',
    category: 'mining',
    levels: [
      { level: 1, cost: { gold: 650, food: 650 }, effect: { miningFoodRatio: 0.25 } },
      { level: 2, cost: { gold: 1650, food: 1650 }, effect: { miningFoodRatio: 0.5 } },
      { level: 3, cost: { gold: 4000, food: 4000 }, effect: { miningFoodRatio: 1.0 } },
    ]
  },
};

// New feature flags for large games
export const LARGE_GAME_FEATURES = {
  ENABLE_AUTO_SPAWN: true, // Allow auto-spawning units when resources are high
  AUTO_SPAWN_THRESHOLD: 5, // Enable auto-spawn for games with 5+ players
  AUTO_SPAWN_RESOURCE_MULTIPLIER: 3, // Auto-spawn when resources > 3x unit cost
  SHARED_VISION_THRESHOLD: 4, // Show all lanes' enemy counts when 4+ players
};