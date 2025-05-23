import { WORKER_TYPES, UNIT_TYPES, ENEMY_TYPES, TIMINGS } from './config.js';
import { EVENTS } from './events.js';
import { ResourceTicker } from './ResourceTicker.js';
import { WaveSpawner } from './WaveSpawner.js';
import { CountdownTicker } from './CountdownTicker.js';
import { CombatTicker } from './CombatTicker.js';

export class GameService {
  constructor(io, roomId) {
    this.io = io;
    this.roomId = roomId;
    this.lobby = { players: [], ready: new Map() };
    this.gameState = null;
    this.socketToName = new Map();
  }

  join(socket, name) {
    this.socketToName.set(socket.id, name);
    if (!this.lobby.players.includes(name)) {
      this.lobby.players.push(name);
      this.lobby.ready.set(name, false);
    }
    this.io.in(this.roomId).emit(EVENTS.LOBBY_UPDATE, Object.assign({}, this.lobby, { ready: Object.fromEntries(this.lobby.ready) }));
  }

  setReady(socket, ready) {
    const name = this.socketToName.get(socket.id);
    if (!name) return;
    this.lobby.ready.set(name, ready);
    this.io.in(this.roomId).emit(EVENTS.LOBBY_UPDATE, Object.assign({}, this.lobby, { ready: Object.fromEntries(this.lobby.ready) }));
    const allReady = this.lobby.players.length && Array.from(this.lobby.ready.values()).every(v => v);
    if (allReady) this.startGame();
  }

  mine(socket) {
    this._modifyResource(socket, 'gold', 1);
  }

  hireWorker(socket, type) {
    const req = WORKER_TYPES[type];
    this._purchase(socket, req, 'workers', type);
  }

  spawnUnit(socket, type) {
    const req = UNIT_TYPES[type];
    this._purchase(socket, req, 'units', type, (player) => {
      const unit = {
        id: `unit-${type}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        type,
        hp: req.hp,
        maxHp: req.hp,
        dmg: req.dmg,
        range: req.range,
        speed: req.speed,
        x: 450,
        y: 120,
        engaged: false
      };
      this.gameState.units.push(unit);
    });
  }

  disconnect(socket) {
    const name = this.socketToName.get(socket.id);
    if (!name) return;
    this.lobby.players = this.lobby.players.filter(p => p !== name);
    this.lobby.ready.delete(name);
    this.socketToName.delete(socket.id);
    this.io.in(this.roomId).emit(EVENTS.LOBBY_UPDATE, Object.assign({}, this.lobby, { ready: Object.fromEntries(this.lobby.ready) }));
  }

  startGame() {
    this._clearIntervals();
    this.gameState = {
      wave: 1,
      castleHp: 1000,
      nextWaveIn: Math.floor(TIMINGS.WAVE_INTERVAL / 1000),
      players: this.lobby.players.map(name => ({
        name,
        gold: 0,
        food: 0,
        iron: 0,
        jewels: 0,
        workers: Object.fromEntries(Object.keys(WORKER_TYPES).map(k => [k, 0])),
        units: Object.fromEntries(Object.keys(UNIT_TYPES).map(k => [k, 0]))
      })),
      units: [],
      enemies: []
    };
    this.io.in(this.roomId).emit(EVENTS.GAME_START, this.gameState);
    // start modular tickers
    this.resourceTicker = new ResourceTicker(this.io, this.socketToName, this.gameState.players);
    // Refactored: Wave spawns only when timer hits 0
    this.waveSpawner = new WaveSpawner(this.io, this.gameState);
    this.countdownTicker = new CountdownTicker(this.io, this.gameState, () => {
      this.waveSpawner.spawnWave();
      // Reset timer for next wave
      this.gameState.nextWaveIn = Math.floor(TIMINGS.WAVE_INTERVAL / 1000);
      this.io.in(this.roomId).emit(EVENTS.STATE_UPDATE, { nextWaveIn: this.gameState.nextWaveIn });
    });
    this.combatTicker = new CombatTicker(this.io, this.gameState);
    this.resourceTicker.start();
    this.countdownTicker.start();
    this.combatTicker.start();
  }

  _modifyResource(socket, key, amount) {
    const player = this._getPlayer(socket);
    if (!player) return;
    player[key] = (player[key] || 0) + amount;
    this._emitResourceUpdate(socket, player);
  }

  _purchase(socket, req, category, type, onSuccess) {
    if (!req) return;
    const player = this._getPlayer(socket);
    if (!player) return;
    if ((player.gold || 0) < req.cost) return;
    player.gold -= req.cost;
    // Ensure player.workers is always an object
    if (category === 'workers') {
      if (typeof player.workers !== 'object' || player.workers === null) {
        player.workers = Object.fromEntries(Object.keys(WORKER_TYPES).map(k => [k, 0]));
      }
      player.workers[type] = (player.workers[type] || 0) + 1;
    } else {
      player[category][type] = (player[category][type] || 0) + 1;
    }
    if (onSuccess) onSuccess(player);
    this._emitResourceUpdate(socket, player);
    if (category === 'units') socket.emit(EVENTS.UNIT_UPDATE, { units: player.units });
  }

  _getPlayer(socket) {
    const name = this.socketToName.get(socket.id);
    return this.gameState?.players.find(p => p.name === name);
  }

  _emitResourceUpdate(socket, player) {
    socket.emit(EVENTS.RESOURCE_UPDATE, {
      gold: Math.floor(player.gold),
      food: Math.floor(player.food),
      workers: player.workers
    });
  }

  _clearIntervals() {
    // stop modular tickers if running
    this.resourceTicker?.stop();
    if (this.waveSpawner && typeof this.waveSpawner.stop === 'function') {
      this.waveSpawner.stop();
    }
    this.countdownTicker?.stop();
    this.combatTicker?.stop();
  }
}
