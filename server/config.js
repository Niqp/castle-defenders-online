export const PORT = process.env.PORT || 3001;
export const CORS_ORIGIN = '*';

export const TIMINGS = {
  WORKER_INTERVAL: 1000,
  WAVE_INTERVAL: 60000,
  COUNTDOWN_INTERVAL: 1000,
};

// Grid configuration
export const GRID_CONFIG = {
  DEFAULT_COLUMNS: 10, // Distance from castle to portal
  MIN_ROWS: 1, // Minimum lanes (scales up with player count)
};

// Wave spawning and enemy progression
export const WAVE_CONFIG = {
  BASE_ENEMIES_PER_WAVE: 3, // Base number of enemies per wave
  ENEMIES_PER_PLAYER_SCALING: 0.5, // Additional enemies per wave per 2 active players (0.5 = 1 enemy per 2 players)
  LAST_SCALING_WAVE: 100, // Wave number where enemy type progression completes (100% last enemy type)
  FALLBACK_ENEMY: { 
    baseHealth: 10, 
    baseDamage: 2 
  }, // Default stats when enemy type not found
};

// Game balance parameters
export const GAME_BALANCE = {
  INITIAL_CASTLE_HP: 1000, // Starting castle health
};

export const WORKER_TYPES = {
  Miner:    { costs: { gold: 50 },  outputs: { gold: 1 },  sprite: 'miner.png' },
  Digger:   { costs: { gold: 200 }, outputs: { gold: 5 },  sprite: 'digger.png' },
  Excavator:{ costs: { gold: 10 },  outputs: { gold: 10 }, sprite: 'excavator.png' },
  Farmer:   { costs: { gold: 50 },  outputs: { food: 1 },  sprite: 'farmer.png' },
  Hunter:   { costs: { gold: 200 }, outputs: { food: 5 },  sprite: 'hunter.png' },
  Rancher:  { costs: { gold: 800 }, outputs: { food: 10 }, sprite: 'rancher.png' },
};

export const UNIT_TYPES = {
  Swordsman: { costs: { gold: 10, food: 10 }, hp: 50, dmg: 5, range: 40, speed: 3, sprite: 'swordsman.png' },
  Archer: { costs: { gold: 200, food: 20 }, hp: 18, dmg: 4, range: 60, speed: 3, sprite: 'archer.png' },
  Knight: { costs: { gold: 400, food: 40 }, hp: 50, dmg: 10, range: 40, speed: 3, sprite: 'knight.png' },
};

// Enemy type definitions. Feel free to add new entries or tweak stats.
// color is forwarded to the client for future visual customisation but not yet in use.
export const ENEMY_TYPES = {
  goblin: { baseHealth: 50, baseDamage: 2, color: 0x44ee44, sprite: 'goblin.png' },
  orc:    { baseHealth: 70, baseDamage: 4, color: 0x888888, sprite: 'orc.png' },
  troll:  { baseHealth: 100, baseDamage: 6, color: 0x9966cc, sprite: 'ogre.png' },
};

// How long (in ms) we keep a clientId mapping without activity before it is purged.
export const CLIENT_TTL_MS = 1000 * 60 * 60; // 1 hour by default

// Upgrade system configuration
export const UPGRADE_TYPES = {
  // Mine Gold upgrades
  MINING_EFFICIENCY: {
    id: 'MINING_EFFICIENCY',
    name: 'Mining Efficiency',
    description: 'Increases gold gained from manual mining',
    category: 'mining',
    levels: [
      { level: 1, cost: { gold: 100, food: 0 }, effect: { mineGoldAmount: 2 } },
      { level: 2, cost: { gold: 300, food: 0 }, effect: { mineGoldAmount: 3 } },
      { level: 3, cost: { gold: 800, food: 0 }, effect: { mineGoldAmount: 5 } },
      { level: 4, cost: { gold: 1500, food: 0 }, effect: { mineGoldAmount: 8 } },
      { level: 5, cost: { gold: 3000, food: 0 }, effect: { mineGoldAmount: 12 } },
    ]
  },

  // Worker efficiency upgrades
  WORKER_PRODUCTIVITY: {
    id: 'WORKER_PRODUCTIVITY',
    name: 'Worker Productivity',
    description: 'Increases resource generation from all workers by 25% per level',
    category: 'workers',
    levels: [
      { level: 1, cost: { gold: 200, food: 50 }, effect: { workerMultiplier: 1.25 } },
      { level: 2, cost: { gold: 500, food: 150 }, effect: { workerMultiplier: 1.5 } },
      { level: 3, cost: { gold: 1200, food: 300 }, effect: { workerMultiplier: 1.75 } },
      { level: 4, cost: { gold: 2500, food: 600 }, effect: { workerMultiplier: 2.0 } },
      { level: 5, cost: { gold: 5000, food: 1200 }, effect: { workerMultiplier: 2.25 } },
    ]
  },

  EFFICIENT_MINING: {
    id: 'EFFICIENT_MINING',
    name: 'Efficient Mining',
    description: 'Reduces cost of gold-generating workers by 20% per level',
    category: 'workers',
    levels: [
      { level: 1, cost: { gold: 150, food: 25 }, effect: { goldWorkerCostReduction: 0.8 } },
      { level: 2, cost: { gold: 400, food: 75 }, effect: { goldWorkerCostReduction: 0.6 } },
      { level: 3, cost: { gold: 800, food: 150 }, effect: { goldWorkerCostReduction: 0.4 } },
    ]
  },

  EFFICIENT_FARMING: {
    id: 'EFFICIENT_FARMING',
    name: 'Efficient Farming',
    description: 'Reduces cost of food-generating workers by 20% per level',
    category: 'workers',
    levels: [
      { level: 1, cost: { gold: 150, food: 25 }, effect: { foodWorkerCostReduction: 0.8 } },
      { level: 2, cost: { gold: 400, food: 75 }, effect: { foodWorkerCostReduction: 0.6 } },
      { level: 3, cost: { gold: 800, food: 150 }, effect: { foodWorkerCostReduction: 0.4 } },
    ]
  },

  // Military upgrades
  UNIT_ARMOR: {
    id: 'UNIT_ARMOR',
    name: 'Unit Armor',
    description: 'Increases health of all military units by 20% per level',
    category: 'military',
    levels: [
      { level: 1, cost: { gold: 300, food: 100 }, effect: { unitHealthMultiplier: 1.2 } },
      { level: 2, cost: { gold: 800, food: 200 }, effect: { unitHealthMultiplier: 1.4 } },
      { level: 3, cost: { gold: 1600, food: 400 }, effect: { unitHealthMultiplier: 1.6 } },
      { level: 4, cost: { gold: 3200, food: 800 }, effect: { unitHealthMultiplier: 1.8 } },
      { level: 5, cost: { gold: 6400, food: 1600 }, effect: { unitHealthMultiplier: 2.0 } },
    ]
  },

  WEAPON_ENHANCEMENT: {
    id: 'WEAPON_ENHANCEMENT',
    name: 'Weapon Enhancement',
    description: 'Increases damage of all military units by 25% per level',
    category: 'military',
    levels: [
      { level: 1, cost: { gold: 250, food: 100 }, effect: { unitDamageMultiplier: 1.25 } },
      { level: 2, cost: { gold: 600, food: 200 }, effect: { unitDamageMultiplier: 1.5 } },
      { level: 3, cost: { gold: 1200, food: 400 }, effect: { unitDamageMultiplier: 1.75 } },
      { level: 4, cost: { gold: 2400, food: 800 }, effect: { unitDamageMultiplier: 2.0 } },
      { level: 5, cost: { gold: 4800, food: 1600 }, effect: { unitDamageMultiplier: 2.25 } },
    ]
  },

  RECRUITMENT_EFFICIENCY: {
    id: 'RECRUITMENT_EFFICIENCY',
    name: 'Recruitment Efficiency',
    description: 'Reduces cost of all military units by 15% per level',
    category: 'military',
    levels: [
      { level: 1, cost: { gold: 400, food: 100 }, effect: { unitCostReduction: 0.85 } },
      { level: 2, cost: { gold: 1000, food: 250 }, effect: { unitCostReduction: 0.7 } },
      { level: 3, cost: { gold: 2000, food: 500 }, effect: { unitCostReduction: 0.55 } },
    ]
  },

  // Castle upgrades
  CASTLE_FORTIFICATION: {
    id: 'CASTLE_FORTIFICATION',
    name: 'Castle Fortification',
    description: 'Increases maximum castle health by 500 per level',
    category: 'castle',
    levels: [
      { level: 1, cost: { gold: 500, food: 200 }, effect: { castleMaxHpIncrease: 500 } },
      { level: 2, cost: { gold: 1200, food: 400 }, effect: { castleMaxHpIncrease: 1000 } },
      { level: 3, cost: { gold: 2500, food: 800 }, effect: { castleMaxHpIncrease: 1500 } },
      { level: 4, cost: { gold: 5000, food: 1600 }, effect: { castleMaxHpIncrease: 2000 } },
      { level: 5, cost: { gold: 10000, food: 3200 }, effect: { castleMaxHpIncrease: 2500 } },
    ]
  },

  CASTLE_REPAIRS: {
    id: 'CASTLE_REPAIRS',
    name: 'Castle Repairs',
    description: 'Slowly regenerates castle health over time (10 HP per second per level)',
    category: 'castle',
    levels: [
      { level: 1, cost: { gold: 800, food: 300 }, effect: { castleRegenRate: 10 } },
      { level: 2, cost: { gold: 1800, food: 600 }, effect: { castleRegenRate: 20 } },
      { level: 3, cost: { gold: 3600, food: 1200 }, effect: { castleRegenRate: 30 } },
    ]
  },
};