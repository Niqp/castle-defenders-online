import React, { useEffect, useRef, useState, useMemo } from 'react';
import PixiStage from './PixiStage';
import Loading from './Loading.jsx';
import WorkerCard from './ui/WorkerCard';
import swordsmanImg from '../sprites/units/swordsman.png';
import archerImg from '../sprites/units/archer.png';
import knightImg from '../sprites/units/knight.png';
import minerImg from '../sprites/workers/miner.png';
import diggerImg from '../sprites/workers/digger.png';
import excavatorImg from '../sprites/workers/excavator.png';
import farmerImg from '../sprites/workers/farmer.png';
import hunterImg from '../sprites/workers/hunter.png';
import rancherImg from '../sprites/workers/rancher.png';
// Removed 'io' import as socketRef is passed as a prop

// ENEMY_COLORS might be used by PixiStage or game logic, keeping it for now.
const ENEMY_COLORS = {
  goblin: 0x44ee44,
  orc: 0x888888,
  troll: 0x9966cc
};

const SPRITE_MAP = {
  'swordsman.png': swordsmanImg,
  'archer.png': archerImg,
  'knight.png': knightImg,
  'miner.png': minerImg,
  'digger.png': diggerImg,
  'excavator.png': excavatorImg,
  'farmer.png': farmerImg,
  'hunter.png': hunterImg,
  'rancher.png': rancherImg,
};

export default function GameScreen({ playerName, gameState, socketRef }) {
  const [gold, setGold] = useState(gameState?.gold ?? 0);
  const [food, setFood] = useState(gameState?.food ?? 0);
  const [workers, setWorkers] = useState(gameState?.workers ?? { Miner: 0, Digger: 0, Excavator: 0 });
  const [playerUnits, setPlayerUnits] = useState(gameState?.playerUnits ?? { Swordsman: 0, Archer: 0, Knight: 0 });
  const [enemies, setEnemies] = useState(gameState?.enemies ?? []);
  const [units, setUnits] = useState(gameState?.units ?? []); // Assuming units are player-controlled units on the map
  const [wave, setWave] = useState(gameState?.wave ?? 1);
  const [grid, setGrid] = useState(gameState?.grid ?? []);
  const [allPlayersResources, setAllPlayersResources] = useState({});

  const prevEnemiesRef = useRef(gameState?.enemies ?? []);
  const lastUpdateRef = useRef(Date.now());

  const [nextWaveIn, setNextWaveIn] = useState(gameState?.nextWaveIn ?? 60); // Default to 60s
  const lastWaveUpdateRef = useRef(Date.now());
  const lastWaveValueRef = useRef(gameState?.nextWaveIn ?? 60);
  const [castleHp, setCastleHp] = useState(
    typeof gameState?.castleHp === 'object' ? gameState.castleHp : { [playerName]: gameState?.castleHp ?? 1000 }
  );
  const MAX_CASTLE_HP = 1000; // TODO: optionally fetch from server

  // Derived flag: is this local player still alive?
  const playerAlive = (castleHp[playerName] ?? 0) > 0;

  useEffect(() => {
    const socket = socketRef.current;
    if (!socket) return;

    socket.on('resourceUpdate', (data) => {
      if (data) {
        if (data.gold !== undefined) setGold(data.gold);
        if (data.food !== undefined) setFood(data.food);
        if (data.workers) setWorkers(prev => ({...prev, ...data.workers}));
        // Store all players' resources if provided
        if (data.allPlayersResources) setAllPlayersResources(data.allPlayersResources);
      }
    });
    socket.on('unitUpdate', (data) => {
      if (data && data.units) setPlayerUnits(prev => ({...prev, ...data.units}));
    });
    socket.on('stateUpdate', (data) => {
      if (data.wave !== undefined) setWave(data.wave);
      if (data.nextWaveIn !== undefined) {
        setNextWaveIn(data.nextWaveIn);
        lastWaveValueRef.current = data.nextWaveIn; // Ensure animation resets correctly
        lastWaveUpdateRef.current = Date.now();
      }
      if (data.castleHp !== undefined) {
        setCastleHp(typeof data.castleHp === 'object' ? data.castleHp : { [playerName]: data.castleHp });
      }
      if (data.grid) setGrid(data.grid);
    });
    socket.on('spawnEnemies', (data) => {
      if (data && Array.isArray(data.enemies)) {
        prevEnemiesRef.current = enemies; // For interpolation if PixiStage uses it
        lastUpdateRef.current = Date.now();
        setEnemies(data.enemies);
      }
    });
    socket.on('spawnUnits', (data) => {
      // Assuming 'units' are player units on the map, distinct from 'playerUnits' (counts)
      if (data && Array.isArray(data.units)) {
        // prevUnitsRef.current = units; // If interpolation is needed for these units
        // lastUpdateRef.current = Date.now();
        setUnits(data.units);
      }
    });

    // Initial fetch of full state if needed, or rely on gameState prop
    // socket.emit('requestInitialGameState'); // Example: if you need to fetch fresh state

    return () => {
      socket.off('resourceUpdate');
      socket.off('unitUpdate');
      socket.off('stateUpdate');
      socket.off('spawnEnemies');
      socket.off('spawnUnits');
    };
  }, [socketRef, enemies]); // Added enemies to ref for prevEnemiesRef.current logic

  function handleHireWorker(type) {
    socketRef.current?.emit('hireWorker', type);
  }
  function handleSpawnUnit(type) {
    socketRef.current?.emit('spawnUnit', type, selectedCol);
  }
  const mineButtonRef = useRef(null);

  const spawnGoldChips = (amount = 1) => {
    const btn = mineButtonRef.current;
    if (!btn) return;
    const btnRect = btn.getBoundingClientRect();

    const base = 1;
    const NUM_CHIPS = Math.max(base, amount * base);
    for (let i = 0; i < NUM_CHIPS; i++) {
      const chip = document.createElement('span');
      chip.className = 'gold-chip';
      // random start inside button bounds (viewport coords)
      const startX = btnRect.left + Math.random() * btnRect.width;
      const startY = btnRect.top + Math.random() * btnRect.height;
      chip.style.left = `${startX}px`;
      chip.style.top = `${startY}px`;

      const distance = 120 + Math.random() * 80; // 80–140px reach
      const dx = (Math.random() < 0.5 ? -0.15 : 0.15) * distance;
      const dy = 60 + Math.random() * 60; // always downward travel at end
      const peak = -(60 + Math.random() * 60); // upward peak relative to start

      // Attach and animate via JS for perfectly smooth arc
      document.body.appendChild(chip);

      const duration = 1000; // ms
      const startTime = performance.now();

      const animate = (now) => {
        const t = Math.min(1, (now - startTime) / duration);
        // Parabolic vertical motion: peak at t=0.5
        const x = dx * t;
        const y = peak * 4 * t * (1 - t) + dy * t;
        chip.style.transform = `translate(${x}px, ${y}px)`;
        chip.style.opacity = `${1 - t}`;
        if (t < 1) {
          requestAnimationFrame(animate);
        } else {
          chip.remove();
        }
      };
      requestAnimationFrame(animate);
    }
  };

  const handleMine = () => {
    socketRef.current?.emit('mine');
  };

  const [animatedWaveIn, setAnimatedWaveIn] = useState(nextWaveIn);
  useEffect(() => {
    setAnimatedWaveIn(nextWaveIn); // Initialize with current nextWaveIn
    let rafId;
    const animate = () => {
      const timePassed = (Date.now() - lastWaveUpdateRef.current) / 1000;
      const newAnimatedTime = Math.max(0, lastWaveValueRef.current - timePassed);
      setAnimatedWaveIn(newAnimatedTime);
      if (newAnimatedTime > 0) {
        rafId = requestAnimationFrame(animate);
      }
    };
    rafId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafId);
  }, [nextWaveIn]);

  const castleHpPercentage = Math.max(0, Math.min(100, ((castleHp[playerName] ?? 0) / MAX_CASTLE_HP) * 100));

  const pixiContainerRef = useRef(null);

  // Stage is ready once grid is ready and the container element exists
  const gridReady = useMemo(() => Array.isArray(grid) && grid.length && Array.isArray(grid[0]), [grid]);
  const stageReady = gridReady && pixiContainerRef.current !== null;

  // Dynamically build worker type list based on server-provided config (fallback to legacy list)
  const workerTypes = useMemo(() => {
    if (gameState?.workerTypes) {
      return Object.entries(gameState.workerTypes).map(([type, cfg]) => ({
        type,
        cost: cfg.costs ?? { gold: cfg.cost ?? 0 },
        current: workers[type] ?? 0,
        sprite: cfg.sprite ?? null,
      }));
    }
    // Fallback if server did not send workerTypes
    return [
      { type: 'Miner', cost: { gold: 50 }, current: workers.Miner, sprite: 'miner.png' },
      { type: 'Digger', cost: { gold: 200 }, current: workers.Digger, sprite: 'digger.png' },
      { type: 'Excavator', cost: { gold: 500 }, current: workers.Excavator, sprite: 'excavator.png' },
    ];
  }, [gameState?.workerTypes, workers]);

  /* --------------------------
   * Row selection state   
   * -------------------------- */
  const rows = useMemo(() => {
    if (Array.isArray(grid) && grid.length) return grid.length;
    return 1;
  }, [grid]);

  // Determine this player's default lane based on join order (index in players list) or 0.
  const initialPlayerCol = useMemo(() => {
    if (Array.isArray(gameState?.players)) {
      const idx = gameState.players.findIndex(p => (p.name || p) === playerName);
      return idx >= 0 ? idx : 0;
    }
    return 0;
  }, [gameState?.players, playerName]);

  const [selectedCol, _setSelectedCol] = useState(initialPlayerCol);
  const [manualCol, setManualCol] = useState(false);

  const setSelectedCol = (val) => {
    _setSelectedCol(val);
    setManualCol(true);
  };

  // Keep selected row within bounds whenever grid changes
  useEffect(() => {
    setSelectedCol(prev => Math.min(prev, Math.max(0, rows - 1)));
  }, [rows]);

  // Keep spawn lane synced with player's default row unless the user has manually changed it.
  useEffect(() => {
    if (!manualCol) {
      _setSelectedCol(initialPlayerCol);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialPlayerCol]);

  /* -------------------------------------------------
   * Derived state: alive units belonging to this player
   * -------------------------------------------------
   */
  const aliveUnitCounts = useMemo(() => {
    const counts = {};
    if (!Array.isArray(grid) || !playerName) return counts;
    for (const row of grid) {
      if (!Array.isArray(row)) continue;
      for (const cell of row) {
        // Extract units correctly from the new grid structure
        let unitsInCell = [];
        if (Array.isArray(cell)) {
          unitsInCell = cell;
        } else if (cell && cell.type && (cell.type === 'castle' || cell.type === 'portal') && cell.units) {
          unitsInCell = cell.units;
        }
        for (const u of unitsInCell) {
          if (u && u.type === 'player' && u.owner === playerName) {
            const key = u.unitType || 'Unknown';
            counts[key] = (counts[key] || 0) + 1;
          }
        }
      }
    }
    return counts;
  }, [grid, playerName]);

  const unitTypes = useMemo(() => {
    // Always show the number of ALIVE units. If none are alive, display 0
    // rather than falling back to the total number ever hired.
    const getCurrent = (type) => (
      aliveUnitCounts[type] !== undefined ? aliveUnitCounts[type] : 0
    );
    if (gameState?.unitTypes) {
      return Object.entries(gameState.unitTypes).map(([type, cfg]) => ({
        type,
        cost: cfg.costs ?? { gold: cfg.gold ?? 0, food: cfg.food ?? 0 },
        current: getCurrent(type),
        sprite: cfg.sprite ?? null,
      }));
    }
    return [
      { type: 'Swordsman', cost: { gold: 100, food: 10 }, current: getCurrent('Swordsman'), sprite: 'swordsman.png' },
      { type: 'Archer', cost: { gold: 150, food: 15 }, current: getCurrent('Archer'), sprite: 'archer.png' },
      { type: 'Knight', cost: { gold: 300, food: 30 }, current: getCurrent('Knight'), sprite: 'knight.png' },
    ];
  }, [gameState?.unitTypes, playerUnits, aliveUnitCounts]);

  const canAfford = (cost) => {
    return Object.entries(cost).every(([res, val]) => {
      if (res === 'gold') return gold >= val;
      if (res === 'food') return food >= val;
      return true; // Unknown resources assumed unlimited for now
    });
  };

  // Calculate resource per tick based on workers
  const calculateResourcePerTick = (workerCounts, workerTypes) => {
    const resourcePerTick = { gold: 0, food: 0 };
    
    if (!workerTypes || !workerCounts) return resourcePerTick;
    
    Object.entries(workerTypes).forEach(([type, config]) => {
      const count = workerCounts[type] || 0;
      if (count > 0 && config.outputs) {
        Object.entries(config.outputs).forEach(([resource, amount]) => {
          resourcePerTick[resource] = (resourcePerTick[resource] || 0) + (count * amount);
        });
      }
    });
    
    return resourcePerTick;
  };

  // Calculate current player's resource per tick
  const currentPlayerResourcePerTick = useMemo(() => {
    return calculateResourcePerTick(workers, gameState?.workerTypes);
  }, [workers, gameState?.workerTypes]);

  return (
    <div data-theme="fantasy" className="min-h-screen w-full flex flex-col bg-base-300 text-base-content relative">
      {/* Header Navbar */}
      <div className="navbar bg-base-300 shadow-lg sticky top-0 z-50 flex flex-col sm:flex-row py-2 sm:py-0">
        <div className="navbar-start min-w-0 sm:w-auto flex flex-col items-center sm:flex-row sm:justify-start sm:items-center order-1 sm:order-none w-full sm:w-auto py-1 sm:py-0">
          <div className="flex items-center space-x-2 sm:space-x-2 pl-0 sm:pl-4 py-1 sm:py-0">
            <span className="font-bold text-base sm:text-lg truncate">Castle Defenders</span>
            <div className="tooltip tooltip-bottom" data-tip="Gold">
              <span className="flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1 text-yellow-400" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" /></svg>
                {gold}
                {currentPlayerResourcePerTick.gold > 0 && (
                  <span className="text-xs text-yellow-300 ml-1">(+{currentPlayerResourcePerTick.gold})</span>
                )}
              </span>
            </div>
            <div className="tooltip tooltip-bottom" data-tip="Food">
              <span className="flex items-center">
                 <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1 text-green-500" viewBox="0 0 20 20" fill="currentColor"><path d="M10 3.5A1.5 1.5 0 0111.5 5v1.781l-.003.002-.002.002A5.5 5.5 0 006.5 11H6v2.5a1.5 1.5 0 003 0V11h2v2.5a1.5 1.5 0 003 0V11h.5a5.5 5.5 0 00-2.504-4.715L13.5 5A1.5 1.5 0 0115 3.5V2a1 1 0 00-1-1h-4a1 1 0 00-1 1v1.5zM6.5 9a1.5 1.5 0 110-3 1.5 1.5 0 010 3zm7 0a1.5 1.5 0 110-3 1.5 1.5 0 010 3z" /></svg>
                {food}
                {currentPlayerResourcePerTick.food > 0 && (
                  <span className="text-xs text-green-400 ml-1">(+{currentPlayerResourcePerTick.food})</span>
                )}
              </span>
            </div>
          </div>
        </div>
        {/* Wrapper for Wave Info and Castle HP to be on the same row on mobile */}
        <div className="order-2 sm:order-none flex flex-row flex-nowrap items-center justify-between w-full sm:contents px-2 py-1 sm:p-0">
          {/* Navbar Center (Wave Info) */}
          <div className="navbar-center text-center min-w-0 sm:w-auto sm:order-none">
            <div className="text-sm">Wave: <span className="font-semibold text-accent">{wave}</span></div>
            <div className="text-xs">Next in: <span className="font-semibold countdown">{Math.ceil(animatedWaveIn)}s</span></div>
          </div>
          {/* Navbar End (Castle HP) */}
          <div className="navbar-end flex items-center min-w-0 sm:justify-end sm:w-auto sm:order-none sm:pr-4">
          <div className="flex items-center space-x-2 w-full">
            <span className="text-sm hidden sm:inline">Castle HP:</span>
            <progress className="progress progress-error flex-grow sm:w-32" value={castleHpPercentage} max="100"></progress>
            <span className="text-xs sm:text-sm">{castleHp[playerName] ?? 0}/{MAX_CASTLE_HP}</span>
          </div>
        </div>
        </div>
      </div>

      {!playerAlive && (
        <div className="alert alert-warning shadow-lg rounded-none text-center">
          <span>You have been eliminated – you are now spectating.</span>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-grow flex flex-col lg:flex-row overflow-hidden p-2 sm:p-4 gap-2 sm:gap-4">
        {/* Game Canvas */}
        <div className="h-[50vh] sm:h-[clamp(200px,40vh,450px)] flex-none sm:flex-grow lg:w-2/3 lg:h-full bg-black rounded-lg shadow-xl overflow-x-auto overflow-y-hidden flex p-1 sm:p-2">
          <div ref={pixiContainerRef} className="relative w-full h-full">
            {stageReady && (
              <PixiStage
                resizeTarget={pixiContainerRef.current}
                grid={grid}
              />
            )}
            {!stageReady && (
              <div className="absolute inset-0 flex items-center justify-center bg-base-300">
                <Loading message="Synchronising with server…" />
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="min-h-0 flex-grow lg:flex-grow-0 lg:w-1/3 xl:w-1/4 lg:h-full flex flex-col space-y-2 sm:space-y-4 overflow-y-auto bg-base-200 p-2 sm:p-4 rounded-lg shadow-xl scrollbar-thin scrollbar-thumb-primary scrollbar-track-base-300">
          
          {/* Resources Section */}
          <div className="card bg-base-300 shadow-md compact">
            <div className="card-body p-3 sm:p-4">
              <h3 className="card-title text-md sm:text-lg">Resources</h3>
              <button 
                className="btn btn-primary btn-sm sm:btn-md w-full mt-2 relative z-10" 
                onClick={() => { spawnGoldChips(1); handleMine(); }}
                ref={mineButtonRef}
                disabled={!playerAlive}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M6 2a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2V4a2 2 0 00-2-2H6zm2 2a1 1 0 00-1 1v2a1 1 0 102 0V5a1 1 0 00-1-1zm4 0a1 1 0 00-1 1v2a1 1 0 102 0V5a1 1 0 00-1-1zm-2 5a1 1 0 011 1v4a1 1 0 11-2 0v-4a1 1 0 011-1z" clipRule="evenodd" /></svg>
                Mine Gold
              </button>
              <p className="text-xs text-base-content/70 mt-1 text-center">Click to manually gather gold.</p>
            </div>
          </div>

          {/* Workers Section */}
          <div className="card bg-base-300 shadow-md compact">
            <div className="card-body p-3 sm:p-4">
              <h3 className="card-title text-md sm:text-lg">Workers</h3>
              <div className="space-y-4 mt-3">
                {workerTypes.map(worker => (
                  <WorkerCard
                    key={worker.type}
                    worker={worker}
                    workerSprite={SPRITE_MAP[worker.sprite]}
                    workerConfig={gameState?.workerTypes?.[worker.type]}
                    onHire={() => handleHireWorker(worker.type)}
                    canAfford={canAfford(worker.cost)}
                    disabled={!playerAlive}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Military Units Section */}
          <div className="card bg-base-300 shadow-md compact">
            <div className="card-body p-3 sm:p-4">
              <h3 className="card-title text-md sm:text-lg">Military Units</h3>
              <div className="space-y-2 mt-2">
                {unitTypes.map(unit => (
                  <div key={unit.type} className="flex items-center justify-between p-2 bg-base-400 rounded-md">
                    <div>
                      <p className="font-semibold text-sm sm:text-base flex items-center">{SPRITE_MAP[unit.sprite] && <img src={SPRITE_MAP[unit.sprite]} alt={unit.type} className="w-5 h-5 mr-1" />} {unit.type} <span className="badge badge-neutral badge-sm ml-1">x{unit.current}</span></p>
                      <p className="text-xs text-base-content/70">Cost: {Object.entries(unit.cost).map(([res,val]) => `${val}${res[0].toUpperCase()}`).join(' / ')}</p>
                    </div>
                    <button 
                      className="btn btn-accent btn-sm" 
                      onClick={() => handleSpawnUnit(unit.type)}
                      disabled={!playerAlive || !canAfford(unit.cost)}
                    >
                      Spawn
                    </button>
                  </div>
                ))}
              </div>
              {rows > 1 && (
                <div className="form-control mb-3">
                  <label className="label justify-between">
                    <span className="label-text text-xs sm:text-sm">Spawn Row</span>
                    <span className="label-text-alt text-xs">{selectedCol + 1}</span>
                  </label>
                  {rows <= 8 ? (
                    <div className="grid gap-1 pt-1" style={{ gridTemplateColumns: 'repeat(5, minmax(0, 1fr))' }}>
                      {Array.from({ length: rows }).map((_, idx) => (
                        <button
                          key={idx}
                          className={`btn btn-xs sm:btn-sm ${selectedCol === idx ? 'btn-primary' : 'btn-outline'}`}
                          onClick={() => setSelectedCol(idx)}
                          disabled={!playerAlive}
                        >{idx + 1}</button>
                      ))}
                    </div>
                  ) : (
                    <input
                      type="range"
                      min="0"
                      max={rows - 1}
                      step="1"
                      value={selectedCol}
                      onChange={(e) => setSelectedCol(Number(e.target.value))}
                      className="range range-accent range-xs"
                      disabled={!playerAlive}
                    />
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Battle Info Section */}
          <div className="card bg-base-300 shadow-md compact">
            <div className="card-body p-3 sm:p-4">
              <h3 className="card-title text-md sm:text-lg">Battle Info</h3>
              <div className="space-y-1 mt-2 text-sm sm:text-base">
                <div className="flex justify-between"><span>Current Wave:</span> <span className="font-semibold text-info">{wave}</span></div>
                <div className="flex justify-between"><span>Castle Health:</span> <span className="font-semibold text-error">{castleHp[playerName] ?? 0}/{MAX_CASTLE_HP}</span></div>
                <div className="flex justify-between"><span>Total Units:</span> <span className="font-semibold">{Object.values(aliveUnitCounts).reduce((a, b) => a + b, 0)}</span></div>
              </div>
              <hr className="my-1 opacity-50" />
              <div className="space-y-2">
                {(() => {
                  // Determine display order based on lane (players array order)
                  const orderedNames = Array.isArray(gameState?.players)
                    ? gameState.players.map(p => (typeof p === 'string' ? p : p.name))
                    : Object.keys(castleHp);
                  return orderedNames.map((name, idx) => {
                    const hp = castleHp[name] ?? 0;
                    const playerResources = name === playerName 
                      ? { gold, food, workers }
                      : allPlayersResources[name];
                    const playerResourcePerTick = playerResources
                      ? calculateResourcePerTick(playerResources.workers, gameState?.workerTypes)
                      : { gold: 0, food: 0 };
                    
                    return (
                      <div key={name} className="bg-base-200 p-2 rounded">
                        <div className="flex justify-between items-center text-xs sm:text-sm mb-1">
                          <span className={`${name===playerName ? 'font-bold' : ''} mr-1 whitespace-nowrap`}>{idx + 1}. {name}</span>
                          <progress className="progress progress-error flex-grow mx-1" value={hp} max={MAX_CASTLE_HP}></progress>
                          <span className="ml-1">{hp}</span>
                        </div>
                        {playerResources && (
                          <div className="flex justify-between text-xs text-base-content/70">
                            <span className="flex items-center">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1 text-yellow-400" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" /></svg>
                              {Math.floor(playerResources.gold || 0)}
                              {playerResourcePerTick.gold > 0 && (
                                <span className="text-yellow-300 ml-1">(+{playerResourcePerTick.gold})</span>
                              )}
                            </span>
                            <span className="flex items-center">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1 text-green-500" viewBox="0 0 20 20" fill="currentColor"><path d="M10 3.5A1.5 1.5 0 0111.5 5v1.781l-.003.002-.002.002A5.5 5.5 0 006.5 11H6v2.5a1.5 1.5 0 003 0V11h2v2.5a1.5 1.5 0 003 0V11h.5a5.5 5.5 0 00-2.504-4.715L13.5 5A1.5 1.5 0 0115 3.5V2a1 1 0 00-1-1h-4a1 1 0 00-1 1v1.5zM6.5 9a1.5 1.5 0 110-3 1.5 1.5 0 010 3zm7 0a1.5 1.5 0 110-3 1.5 1.5 0 010 3z" /></svg>
                              {Math.floor(playerResources.food || 0)}
                              {playerResourcePerTick.food > 0 && (
                                <span className="text-green-400 ml-1">(+{playerResourcePerTick.food})</span>
                              )}
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  });
                })()}
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

