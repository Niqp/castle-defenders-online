export const PORT = process.env.PORT || 3001;
export const CORS_ORIGIN = '*';
export const TIMINGS = {
  WORKER_INTERVAL: 1000,
  WAVE_INTERVAL: 60000,
  COUNTDOWN_INTERVAL: 1000,
};
export const WORKER_TYPES = {
  Miner: { cost: 50, output: 1 },
  Digger: { cost: 200, output: 5 },
  Excavator: { cost: 800, output: 10 },
  Farmer: { cost: 50, output: 1 },
};
export const UNIT_TYPES = {
  Swordsman: { gold: 100, food: 10, hp: 30, dmg: 6, range: 40, speed: 3 },
  Archer: { gold: 200, food: 20, hp: 18, dmg: 4, range: 60, speed: 3 },
  Knight: { gold: 400, food: 40, hp: 50, dmg: 10, range: 40, speed: 3 },
};
export const ENEMY_TYPES = ['goblin', 'orc', 'troll'];
