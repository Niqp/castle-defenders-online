export const PORT = process.env.PORT || 3001;
export const CORS_ORIGIN = '*';
export const TIMINGS = {
  WORKER_INTERVAL: 1000,
  WAVE_INTERVAL: 20000,
  COUNTDOWN_INTERVAL: 1000,
};
export const WORKER_TYPES = {
  Miner: { costs: { gold: 50 }, outputs: { gold: 1 } },
  Digger: { costs: { gold: 200 }, outputs: { gold: 5 } },
  Excavator: { costs: { gold: 10 }, outputs: { gold: 10 } },
  Farmer: { costs: { gold: 50 }, outputs: { food: 1 } },
  Hunter: { costs: { gold: 200 }, outputs: { food: 5 } },
  Rancher: { costs: { gold: 800 }, outputs: { food: 10 } },
};
export const UNIT_TYPES = {
  Swordsman: { costs: { gold: 10, food: 10 }, hp: 50, dmg: 5, range: 40, speed: 3 },
  Archer: { costs: { gold: 200, food: 20 }, hp: 18, dmg: 4, range: 60, speed: 3 },
  Knight: { costs: { gold: 400, food: 40 }, hp: 50, dmg: 10, range: 40, speed: 3 },
};
// Enemy type definitions. Feel free to add new entries or tweak stats.
// color is forwarded to the client for future visual customisation but not yet in use.
export const ENEMY_TYPES = {
  goblin: { baseHealth: 50, baseDamage: 2, color: 0x44ee44 },
  orc:    { baseHealth: 70, baseDamage: 4, color: 0x888888 },
  troll:  { baseHealth: 100, baseDamage: 6, color: 0x9966cc },
};

// How long (in ms) we keep a clientId mapping without activity before it is purged.
export const CLIENT_TTL_MS = 1000 * 60 * 60; // 1 hour by default