export const PORT = process.env.PORT || 3001;
export const CORS_ORIGIN = '*';

export const TIMINGS = {
  WORKER_INTERVAL: 1000,
  WAVE_INTERVAL: 45000,
  COUNTDOWN_INTERVAL: 1000,
};

// Grid configuration
export const GRID_CONFIG = {
  DEFAULT_COLUMNS: 10, // Distance from castle to portal
  MIN_ROWS: 1, // Minimum lanes (scales up with player count)
};

// Wave spawning and enemy progression
export const WAVE_CONFIG = {
  BASE_ENEMIES_PER_WAVE: 3, // Increased to ensure early action in large games
  ENEMIES_PER_PLAYER_SCALING: 0.22, // Slightly reduced to compensate for base increase
  PLAYER_COUNT_SCALING_CURVE: 0.75, // Slightly steeper curve for more challenge
  MAX_ENEMIES_PER_LANE: 8, // Cap on enemies per lane to prevent impossible scenarios
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
  INITIAL_CASTLE_HP: 500, // Reduced from 1000 to 500 for more tension
  STARTING_GOLD: 20, // Increased from 15 to 20 for better start
  STARTING_FOOD: 10, // New: Start with 10 food to spawn first unit
  COOP_BONUS_PER_PLAYER: 0.1, // 10% resource generation bonus per additional player
  LARGE_GAME_CASTLE_HP_BONUS: 50, // Extra castle HP per player above 4
};

export const WORKER_TYPES = {
  // Gold generation - better scaling
  Miner:    { costs: { gold: 30 },   outputs: { gold: 2 },  sprite: 'miner.png' },
  Digger:   { costs: { gold: 80 },   outputs: { gold: 4 },  sprite: 'digger.png' },
  Excavator:{ costs: { gold: 300 },  outputs: { gold: 10 }, sprite: 'excavator.png' },
  
  // Food generation - faster early progression
  Farmer:   { costs: { gold: 25 },   outputs: { food: 2 },  sprite: 'farmer.png' },
  Hunter:   { costs: { gold: 70 },   outputs: { food: 4 },  sprite: 'hunter.png' },
  Rancher:  { costs: { gold: 250 },  outputs: { food: 10 }, sprite: 'rancher.png' },
};

export const UNIT_TYPES = {
  // Early game unit - cheap but weak
  Swordsman: { costs: { gold: 15, food: 5 }, hp: 40, dmg: 5, range: 35, speed: 3, sprite: 'swordsman.png' },
  
  // Mid game unit - better value proposition
  Archer: { costs: { gold: 25, food: 8 }, hp: 30, dmg: 7, range: 80, speed: 2.5, sprite: 'archer.png' },
  
  // Late game unit - more accessible tank
  Knight: { costs: { gold: 70, food: 25 }, hp: 120, dmg: 15, range: 35, speed: 2, sprite: 'knight.png' },
};

// Extended enemy types with better progression
export const ENEMY_TYPES = {
  goblin:    { baseHealth: 30, baseDamage: 5, color: 0x44ee44, sprite: 'goblin.png' },
  orc:       { baseHealth: 60, baseDamage: 10, color: 0x888888, sprite: 'orc.png' },
  troll:     { baseHealth: 120, baseDamage: 20, color: 0x9966cc, sprite: 'ogre.png' },
  berserker: { baseHealth: 200, baseDamage: 35, color: 0xff4444, sprite: 'orc.png' },
  warlord:   { baseHealth: 350, baseDamage: 50, color: 0x442288, sprite: 'ogre.png' },
};

// How long (in ms) we keep a clientId mapping without activity before it is purged.
export const CLIENT_TTL_MS = 1000 * 60 * 60; // 1 hour by default

// Upgrade system configuration
export const UPGRADE_TYPES = {
  MINING_EFFICIENCY: {
    id: 'MINING_EFFICIENCY',
    name: 'Mining Efficiency',
    description: 'Increases gold gained from manual mining',
    category: 'mining',
    levels: [
      { level: 1, cost: { gold: 30, food: 0 }, effect: { mineGoldAmount: 3 } },
      { level: 2, cost: { gold: 80, food: 0 }, effect: { mineGoldAmount: 6 } },
      { level: 3, cost: { gold: 200, food: 0 }, effect: { mineGoldAmount: 12 } },
      { level: 4, cost: { gold: 500, food: 0 }, effect: { mineGoldAmount: 25 } },
      { level: 5, cost: { gold: 1200, food: 0 }, effect: { mineGoldAmount: 50 } },
    ]
  },

  WORKER_PRODUCTIVITY: {
    id: 'WORKER_PRODUCTIVITY',
    name: 'Worker Productivity',
    description: 'Increases resource generation from all workers by 20% per level',
    category: 'workers',
    levels: [
      { level: 1, cost: { gold: 60, food: 15 }, effect: { workerMultiplier: 1.2 } },
      { level: 2, cost: { gold: 150, food: 40 }, effect: { workerMultiplier: 1.4 } },
      { level: 3, cost: { gold: 400, food: 100 }, effect: { workerMultiplier: 1.6 } },
      { level: 4, cost: { gold: 1000, food: 250 }, effect: { workerMultiplier: 1.8 } },
      { level: 5, cost: { gold: 2500, food: 600 }, effect: { workerMultiplier: 2.0 } },
    ]
  },

  EFFICIENT_MINING: {
    id: 'EFFICIENT_MINING',
    name: 'Efficient Mining',
    description: 'Reduces cost of gold-generating workers by 15% per level',
    category: 'workers',
    levels: [
      { level: 1, cost: { gold: 80, food: 10 }, effect: { goldWorkerCostReduction: 0.85 } },
      { level: 2, cost: { gold: 200, food: 30 }, effect: { goldWorkerCostReduction: 0.7 } },
      { level: 3, cost: { gold: 500, food: 80 }, effect: { goldWorkerCostReduction: 0.55 } },
    ]
  },

  EFFICIENT_FARMING: {
    id: 'EFFICIENT_FARMING',
    name: 'Efficient Farming',
    description: 'Reduces cost of food-generating workers by 15% per level',
    category: 'workers',
    levels: [
      { level: 1, cost: { gold: 60, food: 15 }, effect: { foodWorkerCostReduction: 0.85 } },
      { level: 2, cost: { gold: 150, food: 40 }, effect: { foodWorkerCostReduction: 0.7 } },
      { level: 3, cost: { gold: 400, food: 100 }, effect: { foodWorkerCostReduction: 0.55 } },
    ]
  },

  UNIT_ARMOR: {
    id: 'UNIT_ARMOR',
    name: 'Unit Armor',
    description: 'Increases health of all military units by 25% per level',
    category: 'military',
    levels: [
      { level: 1, cost: { gold: 150, food: 50 }, effect: { unitHealthMultiplier: 1.25 } },
      { level: 2, cost: { gold: 400, food: 120 }, effect: { unitHealthMultiplier: 1.5 } },
      { level: 3, cost: { gold: 1000, food: 300 }, effect: { unitHealthMultiplier: 1.75 } },
      { level: 4, cost: { gold: 2500, food: 800 }, effect: { unitHealthMultiplier: 2.0 } },
      { level: 5, cost: { gold: 6000, food: 2000 }, effect: { unitHealthMultiplier: 2.25 } },
    ]
  },

  WEAPON_ENHANCEMENT: {
    id: 'WEAPON_ENHANCEMENT',
    name: 'Weapon Enhancement',
    description: 'Increases damage of all military units by 20% per level',
    category: 'military',
    levels: [
      { level: 1, cost: { gold: 120, food: 40 }, effect: { unitDamageMultiplier: 1.2 } },
      { level: 2, cost: { gold: 350, food: 100 }, effect: { unitDamageMultiplier: 1.4 } },
      { level: 3, cost: { gold: 900, food: 250 }, effect: { unitDamageMultiplier: 1.6 } },
      { level: 4, cost: { gold: 2200, food: 600 }, effect: { unitDamageMultiplier: 1.8 } },
      { level: 5, cost: { gold: 5500, food: 1500 }, effect: { unitDamageMultiplier: 2.0 } },
    ]
  },

  RECRUITMENT_EFFICIENCY: {
    id: 'RECRUITMENT_EFFICIENCY',
    name: 'Recruitment Efficiency',
    description: 'Reduces cost of all military units by 10% per level',
    category: 'military',
    levels: [
      { level: 1, cost: { gold: 200, food: 60 }, effect: { unitCostReduction: 0.9 } },
      { level: 2, cost: { gold: 600, food: 180 }, effect: { unitCostReduction: 0.8 } },
      { level: 3, cost: { gold: 1500, food: 450 }, effect: { unitCostReduction: 0.7 } },
    ]
  },

  CASTLE_FORTIFICATION: {
    id: 'CASTLE_FORTIFICATION',
    name: 'Castle Fortification',
    description: 'Increases maximum castle health by 250 per level',
    category: 'castle',
    levels: [
      { level: 1, cost: { gold: 300, food: 100 }, effect: { castleMaxHpIncrease: 250 } },
      { level: 2, cost: { gold: 800, food: 250 }, effect: { castleMaxHpIncrease: 500 } },
      { level: 3, cost: { gold: 2000, food: 600 }, effect: { castleMaxHpIncrease: 750 } },
      { level: 4, cost: { gold: 5000, food: 1500 }, effect: { castleMaxHpIncrease: 1000 } },
      { level: 5, cost: { gold: 12000, food: 3500 }, effect: { castleMaxHpIncrease: 1250 } },
    ]
  },

  CASTLE_REPAIRS: {
    id: 'CASTLE_REPAIRS',
    name: 'Castle Repairs',
    description: 'Slowly regenerates castle health over time (10 HP per second per level)',
    category: 'castle',
    levels: [
      { level: 1, cost: { gold: 400, food: 100 }, effect: { castleRegenRate: 10 } },
      { level: 2, cost: { gold: 1000, food: 250 }, effect: { castleRegenRate: 20 } },
      { level: 3, cost: { gold: 2500, food: 600 }, effect: { castleRegenRate: 30 } },
    ]
  },
  
  CRITICAL_STRIKES: {
    id: 'CRITICAL_STRIKES',
    name: 'Critical Strikes',
    description: 'Units have a 10% chance per level to deal double damage',
    category: 'military',
    levels: [
      { level: 1, cost: { gold: 400, food: 150 }, effect: { critChance: 0.1 } },
      { level: 2, cost: { gold: 1000, food: 400 }, effect: { critChance: 0.2 } },
      { level: 3, cost: { gold: 2500, food: 1000 }, effect: { critChance: 0.3 } },
    ]
  },

  // New late game upgrade for variety
  OVERCHARGE: {
    id: 'OVERCHARGE',
    name: 'Overcharge',
    description: 'Manual mining also gives food (2 food per gold mined)',
    category: 'mining',
    levels: [
      { level: 1, cost: { gold: 300, food: 300 }, effect: { miningFoodRatio: 0.5 } },
      { level: 2, cost: { gold: 800, food: 800 }, effect: { miningFoodRatio: 1.0 } },
      { level: 3, cost: { gold: 2000, food: 2000 }, effect: { miningFoodRatio: 2.0 } },
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