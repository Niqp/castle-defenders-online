import { WORKER_TYPES, UNIT_TYPES, ENEMY_TYPES, TIMINGS } from '../config.js';
import { EVENTS } from '../events.js';
import { ResourceTicker } from '../ticker/ResourceTicker.js';
import { WaveSpawner } from '../ticker/WaveSpawner.js';
import { CountdownTicker } from '../ticker/CountdownTicker.js';
import { CombatTicker } from '../ticker/CombatTicker.js';
// New grid-based imports
import GameState from '../game/GameState.js';
import { spawnEnemyUnit, spawnPlayerUnit } from '../game/Spawner.js';

export class GameService {
  addPlayer(playerId) {
    // Minimal implementation for tests
    if (!this.lobby) this.lobby = { players: [] };
    if (!this.lobby.players.includes(playerId)) {
      this.lobby.players.push(playerId);
    }
  }
  removePlayer(playerId) {
    if (this.lobby && this.lobby.players) {
      this.lobby.players = this.lobby.players.filter(p => p !== playerId);
    }
  }
  endGame() {
    // Minimal implementation for test compatibility
  }
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

  /**
   * Spawns a player unit in the selected lane (column).
   * @param {Socket} socket
   * @param {string} type - Unit type key
   * @param {number} selectedCol - The column (lane) to spawn the unit in
   */
  spawnUnit(socket, type, selectedCol = 0) {
    const req = UNIT_TYPES[type];
    this._purchase(socket, req, 'units', type, (player) => {
      // Use new grid/unit system
      const playerConfig = {
        maxHealth: req.hp,
        damage: req.dmg
      };
      // Use gameState.grid and add to global units map
      const unit = spawnPlayerUnit(this.gameState.grid, playerConfig, selectedCol);
      this.gameState.addUnit(unit);
      // Optionally, emit new unit state to client(s)
      this.io.in(this.roomId).emit(EVENTS.UNIT_UPDATE, { unit });
      // Send immediate grid update so clients render the unit without waiting for next tick
      this.io.in(this.roomId).emit(EVENTS.STATE_UPDATE, {
        grid: this.gameState.grid.cells
      });
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
    // Use new GameState with grid and castle health
    this.gameState = new GameState(this.lobby.players.length, undefined, undefined, 1000);
    // Initialize player objects for resource tracking (legacy compatibility)
    this.gameState.players = this.lobby.players.map(name => ({
      name,
      gold: 0,
      food: 0,
      iron: 0,
      jewels: 0,
      workers: Object.fromEntries(Object.keys(WORKER_TYPES).map(k => [k, 0])),
      units: Object.fromEntries(Object.keys(UNIT_TYPES).map(k => [k, 0]))
    }));
    this.gameState.wave = 1;
    this.gameState.nextWaveIn = Math.floor(TIMINGS.WAVE_INTERVAL / 1000);
    // Emit initial state (can be adapted to emit grid/castle health as needed)
    this.io.in(this.roomId).emit(EVENTS.GAME_START, {
      wave: this.gameState.wave,
      castleHp: this.gameState.castleHealth,
      players: this.gameState.players,
      workerTypes: WORKER_TYPES,
      unitTypes: UNIT_TYPES
    });
    // Start modular tickers with new state
    this.resourceTicker = new ResourceTicker(this.io, this.socketToName, this.gameState.players);
    this.waveSpawner = new WaveSpawner(this.io, this.gameState);
    this.countdownTicker = new CountdownTicker(this.io, this.gameState, () => {
      this.waveSpawner.spawnWave();
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
    const costs = req.costs || { gold: req.cost ?? req.gold ?? 0, food: req.food ?? 0 };
    // ensure player has all resources
    for (const [res, amt] of Object.entries(costs)) {
      if ((player[res] || 0) < amt) return; // insufficient
    }
    // deduct resources
    for (const [res, amt] of Object.entries(costs)) {
      player[res] = (player[res] || 0) - amt;
    }
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

  /**
   * Sends a full state snapshot to a reconnecting client so that their UI can
   * seamlessly resume. Currently this consists of the same payload that is
   * emitted on GAME_START plus some live counters.
   *
   * @param {import('socket.io').Socket} socket
   * @param {string} playerName – The logical player name stored on the server.
   */
  syncState(socket, playerName) {
    if (!this.gameState) {
      // If the game hasn't started yet, just treat it like a lobby join instead.
      this.io.to(socket.id).emit(EVENTS.LOBBY_UPDATE, Object.assign({}, this.lobby, { ready: Object.fromEntries(this.lobby.ready) }));
      return;
    }

    // Ensure stale socketIds for the same logical user are cleared so that the
    // ResourceTicker doesn't emit to a closed connection (which would starve
    // the new one of updates because of the early `break` inside its loop).
    for (const [id, name] of this.socketToName) {
      if (name === playerName && id !== socket.id) {
        this.socketToName.delete(id);
      }
    }
    this.socketToName.set(socket.id, playerName);

    const player = this.gameState.players.find(p => p.name === playerName);

    const payload = {
      wave: this.gameState.wave,
      nextWaveIn: this.gameState.nextWaveIn,
      castleHp: this.gameState.castleHealth,
      grid: this.gameState.grid,
      players: this.gameState.players,
      workerTypes: WORKER_TYPES,
      unitTypes: UNIT_TYPES,
      playerName,
      roomId: this.roomId,
      // Player-specific live resources at reconnect time
      gold: Math.floor(player?.gold ?? 0),
      food: Math.floor(player?.food ?? 0),
      workers: player?.workers ?? {},
      playerUnits: player?.units ?? {}
    };

    socket.emit(EVENTS.RESTORE_GAME, { gameState: payload, playerName, roomId: this.roomId });

    // Also send a direct RESOURCE_UPDATE so the client UI can hydrate even if it
    // relies purely on that event stream.
    if (player) this._emitResourceUpdate(socket, player);
  }
}
