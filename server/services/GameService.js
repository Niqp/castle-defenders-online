import { WORKER_TYPES, UNIT_TYPES, ENEMY_TYPES, TIMINGS, GAME_BALANCE } from '../config.js';
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
  cleanup() {
    // Stop all game tickers
    this._clearIntervals();
    
    // Clear game state
    this.gameState = null;
    
    // Clear lobby state
    this.lobby = { players: [], ready: new Map() };
    
    // Clear socket mappings
    this.socketToName.clear();
    
    console.log(`Game cleanup completed for room ${this.roomId}`);
  }

  triggerRoomCleanup() {
    // First cleanup the game service itself
    this.cleanup();
    
    // Then notify the room manager to remove this room and clear client registry
    if (this.onCleanupCallback) {
      this.onCleanupCallback(this.roomId);
    }
  }
  constructor(io, roomId, onCleanupCallback = null) {
    this.io = io;
    this.roomId = roomId;
    this.lobby = { players: [], ready: new Map() };
    this.gameState = null;
    this.socketToName = new Map();
    this.onCleanupCallback = onCleanupCallback;
  }

  join(socket, name) {
    this.socketToName.set(socket.id, name);

    // -----------------------------------------------------
    // 1) Game already in progress ⇒ join immediately
    // -----------------------------------------------------
    if (this.gameState) {
      // a) Extend GameState with new player/column
      const col = this.gameState.addPlayer(name, GAME_BALANCE.INITIAL_CASTLE_HP);
      if (col < 0) {
        // Player already present – just sync state
        this.syncState(socket, name);
        return;
      }

      // b) Initialise per-player resource tracking object
      const newPlayerObj = {
        name,
        gold: 0,
        food: 0,
        iron: 0,
        jewels: 0,
        workers: Object.fromEntries(Object.keys(WORKER_TYPES).map(k => [k, 0])),
        units: Object.fromEntries(Object.keys(UNIT_TYPES).map(k => [k, 0]))
      };
      this.gameState.players.push(newPlayerObj);

      // c) Make sure future resource ticks include this player (array ref shared)
      //    -> already handled because ResourceTicker keeps reference to players array

      // d) Broadcast updated battlefield so existing players see new lane
      this.io.in(this.roomId).emit(EVENTS.STATE_UPDATE, {
        castleHp: this.gameState.castleHealth,
        grid: this.gameState.grid.cells,
        players: this.gameState.players
      });

      // e) Finally, send full sync snapshot to the newcomer so their UI hydrates
      this.syncState(socket, name);
      return;
    }

    // -----------------------------------------------------
    // 2) Game not started ⇒ normal lobby join flow
    // -----------------------------------------------------
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
    const name = this.socketToName.get(socket.id);
    if (!this.gameState?.isPlayerAlive(name)) return; // eliminated players cannot act
    this._modifyResource(socket, 'gold', 1);
  }

  hireWorker(socket, type) {
    const name = this.socketToName.get(socket.id);
    if (!this.gameState?.isPlayerAlive(name)) return;
    const req = WORKER_TYPES[type];
    this._purchase(socket, req, 'workers', type);
  }

  /**
   * Spawns a player unit in the selected lane (row).
   * @param {Socket} socket
   * @param {string} type - Unit type key
   * @param {number} selectedRow - The row (lane) to spawn the unit in
   */
  spawnUnit(socket, type, selectedRow = null) {
    const name = this.socketToName.get(socket.id);
    if (!this.gameState?.isPlayerAlive(name)) return;

    // Default lane to the player's own row if not provided
    const defaultRow = this.gameState?.playerToRow[name] ?? 0;
    const rowToUse = selectedRow !== null ? selectedRow : defaultRow;

    const req = UNIT_TYPES[type];
    this._purchase(socket, req, 'units', type, (player) => {
      const playerConfig = {
        maxHealth: req.hp,
        damage: req.dmg
      };
      const unit = spawnPlayerUnit(this.gameState.grid, playerConfig, rowToUse, player.name, type);
      this.gameState.addUnit(unit);
      this.io.in(this.roomId).emit(EVENTS.UNIT_UPDATE, { unit });
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
    this.gameState = new GameState([...this.lobby.players], undefined, GAME_BALANCE.INITIAL_CASTLE_HP);
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
      unitTypes: UNIT_TYPES,
      enemyTypes: ENEMY_TYPES
    });
    // Start modular tickers with new state
    this.resourceTicker = new ResourceTicker(this.io, this.socketToName, this.gameState.players);
    this.waveSpawner = new WaveSpawner(this.io, this.roomId, this.gameState);
    this.countdownTicker = new CountdownTicker(this.io, this.roomId, this.gameState, () => {
      this.waveSpawner.spawnWave();
      this.gameState.nextWaveIn = Math.floor(TIMINGS.WAVE_INTERVAL / 1000);
      this.io.in(this.roomId).emit(EVENTS.STATE_UPDATE, { nextWaveIn: this.gameState.nextWaveIn });
    });
    this.combatTicker = new CombatTicker(this.io, this.roomId, this.gameState, this);
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
    // Prepare all players' resources for broadcasting
    const allPlayersResources = {};
    if (this.gameState && this.gameState.players) {
      this.gameState.players.forEach(p => {
        allPlayersResources[p.name] = {
          gold: Math.floor(p.gold),
          food: Math.floor(p.food),
          workers: p.workers
        };
      });
    }

    socket.emit(EVENTS.RESOURCE_UPDATE, {
      gold: Math.floor(player.gold),
      food: Math.floor(player.food),
      workers: player.workers,
      allPlayersResources: allPlayersResources
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
      enemyTypes: ENEMY_TYPES,
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
