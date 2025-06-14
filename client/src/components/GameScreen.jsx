import React, { useEffect, useRef, useState, useMemo } from 'react';
import PixiStage from './PixiStage';
// Removed 'io' import as socketRef is passed as a prop

// ENEMY_COLORS might be used by PixiStage or game logic, keeping it for now.
const ENEMY_COLORS = {
  goblin: 0x44ee44,
  orc: 0x888888,
  troll: 0x9966cc
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

  const prevEnemiesRef = useRef(gameState?.enemies ?? []);
  const lastUpdateRef = useRef(Date.now());

  const [nextWaveIn, setNextWaveIn] = useState(gameState?.nextWaveIn ?? 60); // Default to 60s
  const lastWaveUpdateRef = useRef(Date.now());
  const lastWaveValueRef = useRef(gameState?.nextWaveIn ?? 60);
  const [castleHp, setCastleHp] = useState(gameState?.castleHp ?? 1000);
  const MAX_CASTLE_HP = 1000; // Define max HP for progress bar calculation

  useEffect(() => {
    const socket = socketRef.current;
    if (!socket) return;

    socket.on('resourceUpdate', (data) => {
      if (data) {
        if (data.gold !== undefined) setGold(data.gold);
        if (data.food !== undefined) setFood(data.food);
        if (data.workers) setWorkers(prev => ({...prev, ...data.workers}));
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
      if (data.castleHp !== undefined) setCastleHp(data.castleHp);
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
    socketRef.current?.emit('spawnUnit', type);
  }
  function handleMine() {
    socketRef.current?.emit('mine');
  }

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

  const castleHpPercentage = Math.max(0, Math.min(100, (castleHp / MAX_CASTLE_HP) * 100));

  const pixiContainerRef = useRef(null);
  const [pixiDimensions, setPixiDimensions] = useState({ width: 800, height: 450 }); // Default 16:9, will be updated by ResizeObserver

  useEffect(() => {
    const targetElement = pixiContainerRef.current;
    if (!targetElement) return;

    const resizeObserver = new ResizeObserver(entries => {
      for (let entry of entries) {
        if (entry.target === targetElement) {
          const { width, height } = entry.contentRect;
          console.log('[ResizeObserver] Detected dimensions:', { width, height });
          // Only update if dimensions actually changed to avoid potential loops if not careful
          setPixiDimensions(prevDims => {
            if (prevDims.width !== width || prevDims.height !== height) {
              console.log('[ResizeObserver] Setting new dimensions:', { width, height });
              return { width, height };
            }
            return prevDims;
          });
        }
      }
    });

    resizeObserver.observe(targetElement);

    // Clean up observer on component unmount
    return () => {
      resizeObserver.unobserve(targetElement);
      resizeObserver.disconnect();
    };
  }, []); // Empty dependency array ensures this runs once on mount and cleans up on unmount

  // Dynamically build worker type list based on server-provided config (fallback to legacy list)
  const workerTypes = useMemo(() => {
    if (gameState?.workerTypes) {
      return Object.entries(gameState.workerTypes).map(([type, cfg]) => ({
        type,
        cost: cfg.costs ?? { gold: cfg.cost ?? 0 },
        current: workers[type] ?? 0
      }));
    }
    // Fallback if server did not send workerTypes
    return [
      { type: 'Miner', cost: { gold: 50 }, current: workers.Miner },
      { type: 'Digger', cost: { gold: 200 }, current: workers.Digger },
      { type: 'Excavator', cost: { gold: 500 }, current: workers.Excavator },
    ];
  }, [gameState?.workerTypes, workers]);

  const unitTypes = useMemo(() => {
    if (gameState?.unitTypes) {
      return Object.entries(gameState.unitTypes).map(([type, cfg]) => ({
        type,
        cost: cfg.costs ?? { gold: cfg.gold ?? 0, food: cfg.food ?? 0 },
        current: playerUnits[type] ?? 0
      }));
    }
    return [
      { type: 'Swordsman', cost: { gold: 100, food: 10 }, current: playerUnits.Swordsman },
      { type: 'Archer', cost: { gold: 150, food: 15 }, current: playerUnits.Archer },
      { type: 'Knight', cost: { gold: 300, food: 30 }, current: playerUnits.Knight },
    ];
  }, [gameState?.unitTypes, playerUnits]);

  const canAfford = (cost) => {
    return Object.entries(cost).every(([res, val]) => {
      if (res === 'gold') return gold >= val;
      if (res === 'food') return food >= val;
      return true; // Unknown resources assumed unlimited for now
    });
  };

  return (
    <div data-theme="fantasy" className="min-h-screen w-full flex flex-col bg-base-300 text-base-content">
      {/* Header Navbar */}
      <div className="navbar bg-base-300 shadow-lg sticky top-0 z-50 flex flex-col sm:flex-row py-2 sm:py-0">
        <div className="navbar-start min-w-0 sm:w-auto flex flex-col items-center sm:flex-row sm:justify-start sm:items-center order-1 sm:order-none w-full sm:w-auto py-1 sm:py-0">
          <div className="flex items-center space-x-2 sm:space-x-2 pl-0 sm:pl-4 py-1 sm:py-0">
            <span className="font-bold text-base sm:text-lg truncate">Castle Defenders</span>
            <div className="tooltip tooltip-bottom" data-tip="Gold">
              <span className="flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1 text-yellow-400" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" /></svg>
                {gold}
              </span>
            </div>
            <div className="tooltip tooltip-bottom" data-tip="Food">
              <span className="flex items-center">
                 <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1 text-green-500" viewBox="0 0 20 20" fill="currentColor"><path d="M10 3.5A1.5 1.5 0 0111.5 5v1.781l-.003.002-.002.002A5.5 5.5 0 006.5 11H6v2.5a1.5 1.5 0 003 0V11h2v2.5a1.5 1.5 0 003 0V11h.5a5.5 5.5 0 00-2.504-4.715L13.5 5A1.5 1.5 0 0115 3.5V2a1 1 0 00-1-1h-4a1 1 0 00-1 1v1.5zM6.5 9a1.5 1.5 0 110-3 1.5 1.5 0 010 3zm7 0a1.5 1.5 0 110-3 1.5 1.5 0 010 3z" /></svg>
                {food}
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
            <span className="text-xs sm:text-sm">{castleHp}/{MAX_CASTLE_HP}</span>
          </div>
        </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-grow flex flex-col lg:flex-row overflow-hidden p-2 sm:p-4 gap-2 sm:gap-4">
        {/* Game Canvas */}
        <div className="min-h-[clamp(200px,40vh,350px)] flex-grow lg:w-2/3 lg:h-full bg-black rounded-lg shadow-xl overflow-hidden flex p-1 sm:p-2">
          <div ref={pixiContainerRef} className="relative w-full h-full">
            {pixiDimensions.width > 0 && pixiDimensions.height > 0 && (
              <PixiStage
                key={`${pixiDimensions.width}-${pixiDimensions.height}`}
                width={pixiDimensions.width}
                height={pixiDimensions.height}
                grid={grid}
              />
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
                className="btn btn-primary btn-sm sm:btn-md w-full mt-2" 
                onClick={handleMine}
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
              <div className="space-y-2 mt-2">
                {workerTypes.map(worker => (
                  <div key={worker.type} className="flex items-center justify-between p-2 bg-base-400 rounded-md">
                    <div>
                      <p className="font-semibold text-sm sm:text-base">{worker.type} <span className="badge badge-neutral badge-sm">x{worker.current}</span></p>
                      <p className="text-xs text-base-content/70">Cost: {Object.entries(worker.cost).map(([res,val]) => `${val}${res[0].toUpperCase()}`).join(' / ')}</p>
                    </div>
                    <button 
                      className="btn btn-secondary btn-sm" 
                      onClick={() => handleHireWorker(worker.type)}
                      disabled={!canAfford(worker.cost)}
                    >
                      Hire
                    </button>
                  </div>
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
                      <p className="font-semibold text-sm sm:text-base">{unit.type} <span className="badge badge-neutral badge-sm">x{unit.current}</span></p>
                      <p className="text-xs text-base-content/70">Cost: {Object.entries(unit.cost).map(([res,val]) => `${val}${res[0].toUpperCase()}`).join(' / ')}</p>
                    </div>
                    <button 
                      className="btn btn-accent btn-sm" 
                      onClick={() => handleSpawnUnit(unit.type)}
                      disabled={!canAfford(unit.cost)}
                    >
                      Spawn
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Battle Info Section */}
          <div className="card bg-base-300 shadow-md compact">
            <div className="card-body p-3 sm:p-4">
              <h3 className="card-title text-md sm:text-lg">Battle Info</h3>
              <div className="space-y-1 mt-2 text-sm sm:text-base">
                <div className="flex justify-between"><span>Current Wave:</span> <span className="font-semibold text-info">{wave}</span></div>
                <div className="flex justify-between"><span>Castle Health:</span> <span className="font-semibold text-error">{castleHp}/{MAX_CASTLE_HP}</span></div>
                <div className="flex justify-between"><span>Total Units:</span> <span className="font-semibold">{Object.values(playerUnits).reduce((a, b) => a + b, 0)}</span></div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
