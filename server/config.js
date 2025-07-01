export const PORT = process.env.PORT || 3001;
export const CORS_ORIGIN = '*';

export const TIMINGS = {
  WORKER_INTERVAL: 1000,
  WAVE_INTERVAL: 10000,
  COUNTDOWN_INTERVAL: 1000,
};

// Grid configuration
export const GRID_CONFIG = {
  DEFAULT_COLUMNS: 12, // Distance from castle to portal
  MIN_ROWS: 7, // Minimum lanes (scales up with player count)
};

// Wave spawning and enemy progression
export const WAVE_CONFIG = {
  BASE_ENEMIES_PER_WAVE: 3, // Base number of enemies per wave
  ENEMIES_PER_PLAYER_SCALING: 0.5, // Additional enemies per wave per 2 active players (0.5 = 1 enemy per 2 players)
  LAST_SCALING_WAVE: 10, // Wave number where enemy type progression completes (100% last enemy type)
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