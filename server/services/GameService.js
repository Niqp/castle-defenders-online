import { WORKER_TYPES, UNIT_TYPES, ENEMY_TYPES, TIMINGS, GAME_BALANCE, UPGRADE_TYPES } from '../config.js';
import { EVENTS } from '../events.js';
import { ResourceTicker } from '../ticker/ResourceTicker.js';
import { WaveSpawner } from '../ticker/WaveSpawner.js';
import { CountdownTicker } from '../ticker/CountdownTicker.js';
import { CombatTicker } from '../ticker/CombatTicker.js';
import { CastleRegenTicker } from '../ticker/CastleRegenTicker.js';
import { AutoSpawnTicker } from '../ticker/AutoSpawnTicker.js';
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
    try {
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
          units: Object.fromEntries(Object.keys(UNIT_TYPES).map(k => [k, 0])),
          upgrades: Object.fromEntries(Object.keys(UPGRADE_TYPES).map(k => [k, 0])),
          autoSpawn: Object.fromEntries(Object.keys(UNIT_TYPES).map(k => [k, { enabled: false, amount: 1 }]))
        };
        this.gameState.players.push(newPlayerObj);

        // c) Make sure future resource ticks include this player (array ref shared)
        //    -> already handled because ResourceTicker keeps reference to players array

        // d) Broadcast updated battlefield so existing players see new lane
        this.safeEmitToRoom(EVENTS.STATE_UPDATE, {
          castleHp: this.gameState.castleHealth,
          grid: this.gameState.grid.cells,
          players: this.gameState.players,
          enemyCountsPerLane: this._getEnemyCountsPerLane()
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
      this.safeEmitToRoom(EVENTS.LOBBY_UPDATE, Object.assign({}, this.lobby, { ready: Object.fromEntries(this.lobby.ready) }));
    } catch (error) {
      console.error(`Error in join for socket ${socket.id}:`, error);
    }
  }

  setReady(socket, ready) {
    try {
      const name = this.socketToName.get(socket.id);
      if (!name) return;
      this.lobby.ready.set(name, ready);
      this.safeEmitToRoom(EVENTS.LOBBY_UPDATE, Object.assign({}, this.lobby, { ready: Object.fromEntries(this.lobby.ready) }));
      const allReady = this.lobby.players.length && Array.from(this.lobby.ready.values()).every(v => v);
      if (allReady) this.startGame();
    } catch (error) {
      console.error(`Error in setReady for socket ${socket.id}:`, error);
    }
  }

  mine(socket) {
    const name = this.socketToName.get(socket.id);
    if (!this.gameState?.isPlayerAlive(name)) return; // eliminated players cannot act
    
    const player = this._getPlayer(socket);
    const miningEfficiencyLevel = player?.upgrades?.MINING_EFFICIENCY || 0;
    const goldAmount = this._getUpgradeEffect(UPGRADE_TYPES.MINING_EFFICIENCY, miningEfficiencyLevel, 'mineGoldAmount', 1);
    
    this._modifyResource(socket, 'gold', goldAmount);
  }

  hireWorker(socket, type) {
    const name = this.socketToName.get(socket.id);
    if (!this.gameState?.isPlayerAlive(name)) return;
    
    const req = WORKER_TYPES[type];
    if (!req) return;
    
    // Apply worker cost reduction upgrades
    const player = this._getPlayer(socket);
    const modifiedReq = this._getModifiedWorkerCost(req, player);
    
    this._purchase(socket, modifiedReq, 'workers', type);
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
    if (!req) return;
    
    // Apply unit cost reduction upgrades
    const player = this._getPlayer(socket);
    const modifiedReq = this._getModifiedUnitCost(req, player);
    
    this._purchase(socket, modifiedReq, 'units', type, (player) => {
      // Apply unit stat upgrades
      const modifiedStats = this._getModifiedUnitStats(req, player);
      
      const playerConfig = {
        maxHealth: modifiedStats.hp,
        damage: modifiedStats.dmg,
        // Include special properties like healAmount for Priests
        ...modifiedStats
      };
      const unit = spawnPlayerUnit(this.gameState.grid, playerConfig, rowToUse, player.name, type);
      this.gameState.addUnit(unit);
      this.safeEmitToRoom(EVENTS.UNIT_UPDATE, { unit });
      this.safeEmitToRoom(EVENTS.STATE_UPDATE, {
        grid: this.gameState.grid.cells,
        enemyCountsPerLane: this._getEnemyCountsPerLane()
      });
    });
  }

  disconnect(socket) {
    try {
      const name = this.socketToName.get(socket.id);
      if (!name) return;
      this.lobby.players = this.lobby.players.filter(p => p !== name);
      this.lobby.ready.delete(name);
      this.socketToName.delete(socket.id);
      this.safeEmitToRoom(EVENTS.LOBBY_UPDATE, Object.assign({}, this.lobby, { ready: Object.fromEntries(this.lobby.ready) }));
    } catch (error) {
      console.error(`Error handling disconnect for socket ${socket.id}:`, error);
    }
  }

  startGame() {
    try {
      this._clearIntervals();
      // Calculate castle HP with bonus for large games
      const playerCount = this.lobby.players.length;
      const bonusHp = playerCount > 4 ? (playerCount - 4) * (GAME_BALANCE.LARGE_GAME_CASTLE_HP_BONUS || 0) : 0;
      const totalCastleHp = GAME_BALANCE.INITIAL_CASTLE_HP + bonusHp;
      
      // Use new GameState with grid and castle health
      this.gameState = new GameState([...this.lobby.players], undefined, totalCastleHp);
      // Initialize player objects for resource tracking (legacy compatibility)
      this.gameState.players = this.lobby.players.map(name => ({
        name,
        gold: GAME_BALANCE.STARTING_GOLD || 0,
        food: GAME_BALANCE.STARTING_FOOD || 0,
        iron: 0,
        jewels: 0,
        workers: Object.fromEntries(Object.keys(WORKER_TYPES).map(k => [k, 0])),
        units: Object.fromEntries(Object.keys(UNIT_TYPES).map(k => [k, 0])),
        upgrades: Object.fromEntries(Object.keys(UPGRADE_TYPES).map(k => [k, 0])),
        autoSpawn: Object.fromEntries(Object.keys(UNIT_TYPES).map(k => [k, { enabled: false, amount: 1 }]))
      }));
      this.gameState.wave = 1;
      this.gameState.nextWaveIn = Math.floor(TIMINGS.WAVE_INTERVAL / 1000);
      // Emit initial state (can be adapted to emit grid/castle health as needed)
      this.safeEmitToRoom(EVENTS.GAME_START, {
        wave: this.gameState.wave,
        castleHp: this.gameState.castleHealth,
        players: this.gameState.players,
        workerTypes: WORKER_TYPES,
        unitTypes: UNIT_TYPES,
        enemyTypes: ENEMY_TYPES,
        upgradeTypes: UPGRADE_TYPES,
        enemyCountsPerLane: this._getEnemyCountsPerLane()
      });
      // Start modular tickers with new state
      this.resourceTicker = new ResourceTicker(this.io, this.socketToName, this.gameState.players);
      this.waveSpawner = new WaveSpawner(this.io, this.roomId, this.gameState);
      this.countdownTicker = new CountdownTicker(this.io, this.roomId, this.gameState, () => {
        this.waveSpawner.spawnWave();
        this.gameState.nextWaveIn = Math.floor(TIMINGS.WAVE_INTERVAL / 1000);
        this.safeEmitToRoom(EVENTS.STATE_UPDATE, { nextWaveIn: this.gameState.nextWaveIn });
      });
      this.combatTicker = new CombatTicker(this.io, this.roomId, this.gameState, this);
      this.castleRegenTicker = new CastleRegenTicker(this.io, this.roomId, this.gameState);
      this.autoSpawnTicker = new AutoSpawnTicker(this.io, this.gameState, this);
      this.resourceTicker.start();
      this.countdownTicker.start();
      this.combatTicker.start();
      this.castleRegenTicker.start();
      this.autoSpawnTicker.start();
    } catch (error) {
      console.error(`Error starting game in room ${this.roomId}:`, error);
    }
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
    if (category === 'units') this.safeEmitToSocket(socket, EVENTS.UNIT_UPDATE, { units: player.units });
  }

  _getPlayer(socket) {
    const name = this.socketToName.get(socket.id);
    return this.gameState?.players.find(p => p.name === name);
  }

  _emitResourceUpdate(socket, player) {
    try {
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

      this.safeEmitToSocket(socket, EVENTS.RESOURCE_UPDATE, {
        gold: Math.floor(player.gold),
        food: Math.floor(player.food),
        workers: player.workers,
        allPlayersResources: allPlayersResources
      });
    } catch (error) {
      console.error(`Error emitting resource update for socket ${socket.id}:`, error);
    }
  }

  _clearIntervals() {
    [this.resourceTicker, this.waveSpawner, this.countdownTicker, this.combatTicker, this.castleRegenTicker, this.autoSpawnTicker].forEach(ticker => {
      if (ticker && typeof ticker.stop === 'function') {
        ticker.stop();
      }
    });
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
    try {
      if (!this.gameState) {
        // If the game hasn't started yet, just treat it like a lobby join instead.
        this.safeEmitToSocket(socket, EVENTS.LOBBY_UPDATE, Object.assign({}, this.lobby, { ready: Object.fromEntries(this.lobby.ready) }));
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
        upgradeTypes: UPGRADE_TYPES,
        playerName,
        roomId: this.roomId,
        // Player-specific live resources at reconnect time
        gold: Math.floor(player?.gold ?? 0),
        food: Math.floor(player?.food ?? 0),
        workers: player?.workers ?? {},
        playerUnits: player?.units ?? {},
        upgrades: player?.upgrades ?? {},
        autoSpawn: player?.autoSpawn ?? {}
      };

      // Add enemy counts per lane
      const enemyCountsPerLane = this._getEnemyCountsPerLane();
      payload.enemyCountsPerLane = enemyCountsPerLane;

      this.safeEmitToSocket(socket, EVENTS.RESTORE_GAME, { gameState: payload, playerName, roomId: this.roomId });

      // Also send a direct RESOURCE_UPDATE so the client UI can hydrate even if it
      // relies purely on that event stream.
      if (player) this._emitResourceUpdate(socket, player);
    } catch (error) {
      console.error(`Error syncing state for socket ${socket.id}:`, error);
    }
  }

  // Helper methods for upgrade effects
  _getUpgradeEffect(upgradeType, level, effectKey, defaultValue) {
    if (level === 0) return defaultValue;
    const levelData = upgradeType.levels.find(l => l.level === level);
    return levelData?.effect[effectKey] ?? defaultValue;
  }

  _getModifiedWorkerCost(workerReq, player) {
    if (!player?.upgrades) return workerReq;
    
    const modifiedReq = { ...workerReq, costs: { ...workerReq.costs } };
    
    // Check if this is a gold-generating worker
    const isGoldWorker = workerReq.outputs && workerReq.outputs.gold;
    // Check if this is a food-generating worker
    const isFoodWorker = workerReq.outputs && workerReq.outputs.food;
    
    if (isGoldWorker) {
      const level = player.upgrades.EFFICIENT_MINING || 0;
      if (level > 0) {
        const reduction = this._getUpgradeEffect(UPGRADE_TYPES.EFFICIENT_MINING, level, 'goldWorkerCostReduction', 1);
        modifiedReq.costs.gold = Math.ceil(modifiedReq.costs.gold * reduction);
      }
    }
    
    if (isFoodWorker) {
      const level = player.upgrades.EFFICIENT_FARMING || 0;
      if (level > 0) {
        const reduction = this._getUpgradeEffect(UPGRADE_TYPES.EFFICIENT_FARMING, level, 'foodWorkerCostReduction', 1);
        modifiedReq.costs.gold = Math.ceil(modifiedReq.costs.gold * reduction);
      }
    }
    
    return modifiedReq;
  }

  _getModifiedUnitCost(unitReq, player) {
    if (!player?.upgrades) return unitReq;
    
    const level = player.upgrades.RECRUITMENT_EFFICIENCY || 0;
    if (level === 0) return unitReq;
    
    const reduction = this._getUpgradeEffect(UPGRADE_TYPES.RECRUITMENT_EFFICIENCY, level, 'unitCostReduction', 1);
    
    const modifiedReq = { ...unitReq, costs: { ...unitReq.costs } };
    for (const [resource, cost] of Object.entries(modifiedReq.costs)) {
      modifiedReq.costs[resource] = Math.ceil(cost * reduction);
    }
    
    return modifiedReq;
  }

  _getModifiedUnitStats(unitReq, player) {
    if (!player?.upgrades) return unitReq;
    
    let hp = unitReq.hp;
    let dmg = unitReq.dmg;
    
    // Apply health multiplier
    const armorLevel = player.upgrades.UNIT_ARMOR || 0;
    if (armorLevel > 0) {
      const multiplier = this._getUpgradeEffect(UPGRADE_TYPES.UNIT_ARMOR, armorLevel, 'unitHealthMultiplier', 1);
      hp = Math.ceil(hp * multiplier);
    }
    
    // Apply damage multiplier
    const weaponLevel = player.upgrades.WEAPON_ENHANCEMENT || 0;
    if (weaponLevel > 0) {
      const multiplier = this._getUpgradeEffect(UPGRADE_TYPES.WEAPON_ENHANCEMENT, weaponLevel, 'unitDamageMultiplier', 1);
      dmg = Math.ceil(dmg * multiplier);
    }
    
    return { ...unitReq, hp, dmg };
  }

  purchaseUpgrade(socket, upgradeId) {
    const name = this.socketToName.get(socket.id);
    if (!this.gameState?.isPlayerAlive(name)) return;
    
    const player = this._getPlayer(socket);
    if (!player) return;
    
    const upgradeType = UPGRADE_TYPES[upgradeId];
    if (!upgradeType) return;
    
    const currentLevel = player.upgrades[upgradeId] || 0;
    const nextLevel = currentLevel + 1;
    
    // Check if upgrade level exists
    const levelData = upgradeType.levels.find(l => l.level === nextLevel);
    if (!levelData) return; // Already at max level
    
    // Check if player can afford upgrade
    const costs = levelData.cost;
    for (const [res, amt] of Object.entries(costs)) {
      if ((player[res] || 0) < amt) return; // insufficient resources
    }
    
    // Deduct resources
    for (const [res, amt] of Object.entries(costs)) {
      player[res] = (player[res] || 0) - amt;
    }
    
    // Apply upgrade
    player.upgrades[upgradeId] = nextLevel;
    
    // Handle castle fortification upgrade immediately
    if (upgradeId === 'CASTLE_FORTIFICATION') {
      const hpIncrease = levelData.effect.castleMaxHpIncrease;
      this.gameState.castleHealth[name] += hpIncrease;
    }
    
    // Emit updates
    this._emitResourceUpdate(socket, player);
    this.safeEmitToSocket(socket, EVENTS.UPGRADE_UPDATE, { upgrades: player.upgrades });
    
    // Broadcast castle HP changes if applicable
    if (upgradeId === 'CASTLE_FORTIFICATION') {
      this.safeEmitToRoom(EVENTS.STATE_UPDATE, {
        castleHp: this.gameState.castleHealth
      });
    }
  }

  toggleAutoSpawn(socket, unitType) {
    const name = this.socketToName.get(socket.id);
    if (!this.gameState?.isPlayerAlive(name)) return;
    
    const player = this._getPlayer(socket);
    if (!player || !UNIT_TYPES[unitType]) return;
    
    // Initialize autoSpawn if it doesn't exist
    if (!player.autoSpawn) {
      player.autoSpawn = Object.fromEntries(Object.keys(UNIT_TYPES).map(k => [k, { enabled: false, amount: 1 }]));
    }
    
    // Toggle the auto-spawn for this unit type
    player.autoSpawn[unitType].enabled = !player.autoSpawn[unitType].enabled;
    
    // Emit update
    this.safeEmitToSocket(socket, EVENTS.AUTO_SPAWN_UPDATE, { autoSpawn: player.autoSpawn });
  }

  setAutoSpawnAmount(socket, unitType, amount) {
    const name = this.socketToName.get(socket.id);
    if (!this.gameState?.isPlayerAlive(name)) return;
    
    const player = this._getPlayer(socket);
    if (!player || !UNIT_TYPES[unitType]) return;
    
    // Validate amount (1-10 per tick seems reasonable)
    const validAmount = Math.max(1, Math.min(10, Math.floor(amount)));
    
    // Initialize autoSpawn if it doesn't exist
    if (!player.autoSpawn) {
      player.autoSpawn = Object.fromEntries(Object.keys(UNIT_TYPES).map(k => [k, { enabled: false, amount: 1 }]));
    }
    
    // Set the amount
    player.autoSpawn[unitType].amount = validAmount;
    
    // Emit update
    this.safeEmitToSocket(socket, EVENTS.AUTO_SPAWN_UPDATE, { autoSpawn: player.autoSpawn });
  }

  _getEnemyCountsPerLane() {
    if (!this.gameState || !this.gameState.grid) return {};
    
    const counts = {};
    
    // Initialize counts for all rows
    for (let row = 0; row < this.gameState.grid.rows; row++) {
      counts[row] = 0;
    }
    
    // Count enemies in each row
    for (let col = 0; col < this.gameState.grid.columns; col++) {
      for (let row = 0; row < this.gameState.grid.rows; row++) {
        const units = this.gameState.grid.getUnitsInCell(row, col);
        const enemyCount = units.filter(u => u.type === 'enemy' && u.isAlive()).length;
        counts[row] += enemyCount;
      }
    }
    
    return counts;
  }

  // Helper methods for safe socket emission
  safeEmitToRoom(event, data) {
    try {
      this.io.in(this.roomId).emit(event, data);
    } catch (error) {
      console.error(`Error emitting ${event} to room ${this.roomId}:`, error);
    }
  }

  safeEmitToSocket(socket, event, data) {
    try {
      if (socket && socket.connected) {
        socket.emit(event, data);
      }
    } catch (error) {
      console.error(`Error emitting ${event} to socket ${socket?.id}:`, error);
    }
  }
}
