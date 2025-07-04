import React, { useEffect, useRef, useState, useMemo } from 'react';
import PixiStage from './PixiStage';
import Loading from './Loading.jsx';
import WorkerCard, { WorkerAnimationProvider } from './ui/WorkerCard';
import { EVENTS } from '../events.js';
import swordsmanImg from '../sprites/units/swordsman.png';
import archerImg from '../sprites/units/archer.png';
import knightImg from '../sprites/units/knight.png';
import priestImg from '../sprites/units/priest.png';
import mageImg from '../sprites/units/mage.png';
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
  'priest.png': priestImg,
  'mage.png': mageImg,
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
  const [upgrades, setUpgrades] = useState(gameState?.upgrades ?? {});
  const [autoSpawn, setAutoSpawn] = useState(gameState?.autoSpawn ?? {});
  const [enemies, setEnemies] = useState(gameState?.enemies ?? []);
  const [units, setUnits] = useState(gameState?.units ?? []); // Assuming units are player-controlled units on the map
  const [wave, setWave] = useState(gameState?.wave ?? 1);
  const [grid, setGrid] = useState(gameState?.grid ?? []);
  const [enemyCountsPerLane, setEnemyCountsPerLane] = useState(gameState?.enemyCountsPerLane ?? {});
  const [allPlayersResources, setAllPlayersResources] = useState({});

  const prevEnemiesRef = useRef(gameState?.enemies ?? []);
  const lastUpdateRef = useRef(Date.now());

  const [nextWaveIn, setNextWaveIn] = useState(gameState?.nextWaveIn ?? 60); // Default to 60s
  const lastWaveUpdateRef = useRef(Date.now());
  const lastWaveValueRef = useRef(gameState?.nextWaveIn ?? 60);
  const [castleHp, setCastleHp] = useState(
    typeof gameState?.castleHp === 'object' ? gameState.castleHp : { [playerName]: gameState?.castleHp ?? 1000 }
  );
  // Calculate actual maximum castle HP based on upgrades
  const calculateMaxCastleHp = (upgrades, upgradeTypes) => {
    // Base castle HP (400) plus any multiplayer bonuses (server handles these)
    // We start with a conservative estimate since server handles initial bonuses
    let maxHp = 400;
    
    // Add castle fortification upgrades
    if (upgrades && upgradeTypes && upgradeTypes.CASTLE_FORTIFICATION) {
      const fortificationLevel = upgrades.CASTLE_FORTIFICATION || 0;
      if (fortificationLevel > 0) {
        // Calculate total HP increase from all upgrade levels
        let totalHpIncrease = 0;
        for (let level = 1; level <= fortificationLevel; level++) {
          const levelData = upgradeTypes.CASTLE_FORTIFICATION.levels?.find(l => l.level === level);
          if (levelData && levelData.effect.castleMaxHpIncrease) {
            totalHpIncrease += levelData.effect.castleMaxHpIncrease;
          }
        }
        maxHp += totalHpIncrease;
      }
    }
    
    return maxHp;
  };

  const MAX_CASTLE_HP = useMemo(() => {
    return calculateMaxCastleHp(upgrades, gameState?.upgradeTypes);
  }, [upgrades, gameState?.upgradeTypes]);

  // Helper function to calculate max castle HP for any player
  const calculateMaxCastleHpForPlayer = (playerUpgrades) => {
    return calculateMaxCastleHp(playerUpgrades, gameState?.upgradeTypes);
  };

  // Derived flag: is this local player still alive?
  const playerAlive = (castleHp[playerName] ?? 0) > 0;

  // Tab state management
  const [activeTab, setActiveTab] = useState('resources');

  useEffect(() => {
    const socket = socketRef.current;
    if (!socket) return;

    const handleResourceUpdate = (data) => {
      try {
        if (data) {
          if (data.gold !== undefined) setGold(data.gold);
          if (data.food !== undefined) setFood(data.food);
          if (data.workers) setWorkers(prev => ({...prev, ...data.workers}));
          // Store all players' resources if provided
          if (data.allPlayersResources) setAllPlayersResources(data.allPlayersResources);
        }
      } catch (error) {
        console.error('Error handling resource update:', error);
      }
    };

    const handleUnitUpdate = (data) => {
      try {
        if (data && data.units) setPlayerUnits(prev => ({...prev, ...data.units}));
      } catch (error) {
        console.error('Error handling unit update:', error);
      }
    };

    const handleUpgradeUpdate = (data) => {
      try {
        if (data && data.upgrades) setUpgrades(prev => ({...prev, ...data.upgrades}));
      } catch (error) {
        console.error('Error handling upgrade update:', error);
      }
    };

    const handleAutoSpawnUpdate = (data) => {
      try {
        if (data && data.autoSpawn) setAutoSpawn(prev => ({...prev, ...data.autoSpawn}));
      } catch (error) {
        console.error('Error handling auto-spawn update:', error);
      }
    };

    const handleStateUpdate = (data) => {
      try {
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
        if (data.enemyCountsPerLane) setEnemyCountsPerLane(data.enemyCountsPerLane);
      } catch (error) {
        console.error('Error handling state update:', error);
      }
    };

    const handleSpawnEnemies = (data) => {
      try {
        if (data && Array.isArray(data.enemies)) {
          prevEnemiesRef.current = enemies; // For interpolation if PixiStage uses it
          lastUpdateRef.current = Date.now();
          setEnemies(data.enemies);
        }
      } catch (error) {
        console.error('Error handling enemy spawn:', error);
      }
    };

    const handleSpawnUnits = (data) => {
      try {
        // Assuming 'units' are player units on the map, distinct from 'playerUnits' (counts)
        if (data && Array.isArray(data.units)) {
          // prevUnitsRef.current = units; // If interpolation is needed for these units
          // lastUpdateRef.current = Date.now();
          setUnits(data.units);
        }
      } catch (error) {
        console.error('Error handling unit spawn:', error);
      }
    };

    socket.on(EVENTS.RESOURCE_UPDATE, handleResourceUpdate);
    socket.on(EVENTS.UNIT_UPDATE, handleUnitUpdate);
    socket.on(EVENTS.UPGRADE_UPDATE, handleUpgradeUpdate);
    socket.on(EVENTS.AUTO_SPAWN_UPDATE, handleAutoSpawnUpdate);
    socket.on(EVENTS.STATE_UPDATE, handleStateUpdate);
    socket.on(EVENTS.SPAWN_ENEMIES, handleSpawnEnemies);
    socket.on(EVENTS.SPAWN_UNITS, handleSpawnUnits);

    // Initial fetch of full state if needed, or rely on gameState prop
    // socket.emit('requestInitialGameState'); // Example: if you need to fetch fresh state

    return () => {
      socket.off(EVENTS.RESOURCE_UPDATE, handleResourceUpdate);
      socket.off(EVENTS.UNIT_UPDATE, handleUnitUpdate);
      socket.off(EVENTS.UPGRADE_UPDATE, handleUpgradeUpdate);
      socket.off(EVENTS.AUTO_SPAWN_UPDATE, handleAutoSpawnUpdate);
      socket.off(EVENTS.STATE_UPDATE, handleStateUpdate);
      socket.off(EVENTS.SPAWN_ENEMIES, handleSpawnEnemies);
      socket.off(EVENTS.SPAWN_UNITS, handleSpawnUnits);
    };
  }, [socketRef]); // Fix #4: Only depend on socketRef to prevent listener churn

  function handleHireWorker(type) {
    try {
      if (socketRef.current?.connected) {
        socketRef.current.emit(EVENTS.HIRE_WORKER, type);
      } else {
        console.error('Socket not connected');
      }
    } catch (error) {
      console.error('Error hiring worker:', error);
    }
  }
  
  function handleSpawnUnit(type) {
    try {
      if (socketRef.current?.connected) {
        socketRef.current.emit(EVENTS.SPAWN_UNIT, type, selectedCol);
      } else {
        console.error('Socket not connected');
      }
    } catch (error) {
      console.error('Error spawning unit:', error);
    }
  }
  
  function handlePurchaseUpgrade(upgradeId) {
    try {
      if (socketRef.current?.connected) {
        socketRef.current.emit(EVENTS.PURCHASE_UPGRADE, upgradeId);
      } else {
        console.error('Socket not connected');
      }
    } catch (error) {
      console.error('Error purchasing upgrade:', error);
    }
  }
  
  function handleToggleAutoSpawn(unitType) {
    try {
      if (socketRef.current?.connected) {
        socketRef.current.emit(EVENTS.TOGGLE_AUTO_SPAWN, unitType);
      } else {
        console.error('Socket not connected');
      }
    } catch (error) {
      console.error('Error toggling auto-spawn:', error);
    }
  }
  
  function handleSetAutoSpawnAmount(unitType, amount) {
    try {
      if (socketRef.current?.connected) {
        socketRef.current.emit(EVENTS.SET_AUTO_SPAWN_AMOUNT, unitType, amount);
      } else {
        console.error('Socket not connected');
      }
    } catch (error) {
      console.error('Error setting auto-spawn amount:', error);
    }
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
    try {
      if (socketRef.current?.connected) {
        socketRef.current.emit(EVENTS.MINE);
      } else {
        console.error('Socket not connected');
      }
    } catch (error) {
      console.error('Error mining:', error);
    }
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

  // Helper functions for upgrade effects
  const getUpgradeEffect = (upgradeType, level, effectKey, defaultValue) => {
    if (!upgradeType || level === 0) return defaultValue;
    const levelData = upgradeType.levels?.find(l => l.level === level);
    return levelData?.effect[effectKey] ?? defaultValue;
  };

  // Calculate resource per tick based on workers
  const calculateResourcePerTick = (workerCounts, workerTypes) => {
    const resourcePerTick = { gold: 0, food: 0 };
    
    if (!workerTypes || !workerCounts) return resourcePerTick;
    
    // Apply worker productivity upgrade
    const productivityLevel = upgrades.WORKER_PRODUCTIVITY || 0;
    const productivityMultiplier = getUpgradeEffect(gameState?.upgradeTypes?.WORKER_PRODUCTIVITY, productivityLevel, 'workerMultiplier', 1);
    
    // Apply cooperative bonus (3% per additional player)
    const playerCount = gameState?.players?.length || 1;
    const coopBonus = 1 + ((playerCount - 1) * 0.03);
    
    Object.entries(workerTypes).forEach(([type, config]) => {
      const count = workerCounts[type] || 0;
      if (count > 0 && config.outputs) {
        Object.entries(config.outputs).forEach(([resource, amount]) => {
          const modifiedAmount = amount * productivityMultiplier * coopBonus;
          resourcePerTick[resource] = (resourcePerTick[resource] || 0) + (count * modifiedAmount);
        });
      }
    });
    
    // Round to 1 decimal place for display
    resourcePerTick.gold = Math.round(resourcePerTick.gold * 10) / 10;
    resourcePerTick.food = Math.round(resourcePerTick.food * 10) / 10;
    
    return resourcePerTick;
  };

  // Calculate current player's resource per tick
  const currentPlayerResourcePerTick = useMemo(() => {
    return calculateResourcePerTick(workers, gameState?.workerTypes);
  }, [workers, gameState?.workerTypes]);

  const getModifiedWorkerCost = (workerReq, upgrades, upgradeTypes) => {
    if (!upgrades || !upgradeTypes) return workerReq.costs;
    
    const modifiedCosts = { ...workerReq.costs };
    
    // Check if this is a gold-generating worker
    const isGoldWorker = workerReq.outputs && workerReq.outputs.gold;
    // Check if this is a food-generating worker
    const isFoodWorker = workerReq.outputs && workerReq.outputs.food;
    
    if (isGoldWorker) {
      const level = upgrades.EFFICIENT_MINING || 0;
      if (level > 0) {
        const reduction = getUpgradeEffect(upgradeTypes.EFFICIENT_MINING, level, 'goldWorkerCostReduction', 1);
        modifiedCosts.gold = Math.ceil(modifiedCosts.gold * reduction);
      }
    }
    
    if (isFoodWorker) {
      const level = upgrades.EFFICIENT_FARMING || 0;
      if (level > 0) {
        const reduction = getUpgradeEffect(upgradeTypes.EFFICIENT_FARMING, level, 'foodWorkerCostReduction', 1);
        modifiedCosts.gold = Math.ceil(modifiedCosts.gold * reduction);
      }
    }
    
    return modifiedCosts;
  };

  const getModifiedUnitCost = (unitReq, upgrades, upgradeTypes) => {
    if (!upgrades || !upgradeTypes) return unitReq.costs;
    
    const level = upgrades.RECRUITMENT_EFFICIENCY || 0;
    if (level === 0) return unitReq.costs;
    
    const reduction = getUpgradeEffect(upgradeTypes.RECRUITMENT_EFFICIENCY, level, 'unitCostReduction', 1);
    
    const modifiedCosts = { ...unitReq.costs };
    for (const [resource, cost] of Object.entries(modifiedCosts)) {
      modifiedCosts[resource] = Math.ceil(cost * reduction);
    }
    
    return modifiedCosts;
  };

  const getModifiedUnitStats = (unitReq, upgrades, upgradeTypes) => {
    if (!upgrades || !upgradeTypes) return { hp: unitReq.hp, dmg: unitReq.dmg };
    
    let hp = unitReq.hp;
    let dmg = unitReq.dmg;
    
    // Apply health multiplier
    const armorLevel = upgrades.UNIT_ARMOR || 0;
    if (armorLevel > 0) {
      const multiplier = getUpgradeEffect(upgradeTypes.UNIT_ARMOR, armorLevel, 'unitHealthMultiplier', 1);
      hp = Math.ceil(hp * multiplier);
    }
    
    // Apply damage multiplier
    const weaponLevel = upgrades.WEAPON_ENHANCEMENT || 0;
    if (weaponLevel > 0) {
      const multiplier = getUpgradeEffect(upgradeTypes.WEAPON_ENHANCEMENT, weaponLevel, 'unitDamageMultiplier', 1);
      dmg = Math.ceil(dmg * multiplier);
    }
    
    return { hp, dmg };
  };

  // Dynamically build worker type list based on server-provided config (fallback to legacy list)
  const workerTypes = useMemo(() => {
    if (gameState?.workerTypes) {
      return Object.entries(gameState.workerTypes).map(([type, cfg]) => {
        const modifiedCost = getModifiedWorkerCost(cfg, upgrades, gameState?.upgradeTypes);
        return {
          type,
          cost: modifiedCost,
          originalCost: cfg.costs ?? { gold: cfg.cost ?? 0 },
          current: workers[type] ?? 0,
          sprite: cfg.sprite ?? null,
        };
      });
    }
    // Fallback if server did not send workerTypes
    return [
      { type: 'Miner', cost: { gold: 50 }, originalCost: { gold: 50 }, current: workers.Miner, sprite: 'miner.png' },
      { type: 'Digger', cost: { gold: 200 }, originalCost: { gold: 200 }, current: workers.Digger, sprite: 'digger.png' },
      { type: 'Excavator', cost: { gold: 500 }, originalCost: { gold: 500 }, current: workers.Excavator, sprite: 'excavator.png' },
    ];
  }, [gameState?.workerTypes, gameState?.upgradeTypes, workers, upgrades]);

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
      return Object.entries(gameState.unitTypes).map(([type, cfg]) => {
        const modifiedCost = getModifiedUnitCost(cfg, upgrades, gameState?.upgradeTypes);
        const modifiedStats = getModifiedUnitStats(cfg, upgrades, gameState?.upgradeTypes);
        return {
          type,
          cost: modifiedCost,
          originalCost: cfg.costs ?? { gold: cfg.gold ?? 0, food: cfg.food ?? 0 },
          current: getCurrent(type),
          sprite: cfg.sprite ?? null,
          hp: modifiedStats.hp,
          dmg: modifiedStats.dmg,
          originalHp: cfg.hp,
          originalDmg: cfg.dmg,
        };
      });
    }
    return [
      { type: 'Swordsman', cost: { gold: 100, food: 10 }, originalCost: { gold: 100, food: 10 }, current: getCurrent('Swordsman'), sprite: 'swordsman.png', hp: 50, dmg: 5, originalHp: 50, originalDmg: 5 },
      { type: 'Archer', cost: { gold: 150, food: 15 }, originalCost: { gold: 150, food: 15 }, current: getCurrent('Archer'), sprite: 'archer.png', hp: 18, dmg: 4, originalHp: 18, originalDmg: 4 },
      { type: 'Knight', cost: { gold: 300, food: 30 }, originalCost: { gold: 300, food: 30 }, current: getCurrent('Knight'), sprite: 'knight.png', hp: 50, dmg: 10, originalHp: 50, originalDmg: 10 },
    ];
  }, [gameState?.unitTypes, gameState?.upgradeTypes, playerUnits, aliveUnitCounts, upgrades]);

  const canAfford = (cost) => {
    return Object.entries(cost).every(([res, val]) => {
      if (res === 'gold') return gold >= val;
      if (res === 'food') return food >= val;
      return true; // Unknown resources assumed unlimited for now
    });
  };

  // Calculate gold amount per mine click
  const getMineGoldAmount = () => {
    const miningLevel = upgrades.MINING_EFFICIENCY || 0;
    return getUpgradeEffect(gameState?.upgradeTypes?.MINING_EFFICIENCY, miningLevel, 'mineGoldAmount', 1);
  };

  // Calculate food amount from mining (from Overcharge upgrade)
  const getMiningFoodAmount = () => {
    const overchargeLevel = upgrades.OVERCHARGE || 0;
    if (overchargeLevel === 0) return 0;
    const goldAmount = getMineGoldAmount();
    const foodRatio = getUpgradeEffect(gameState?.upgradeTypes?.OVERCHARGE, overchargeLevel, 'miningFoodRatio', 0);
    return Math.floor(goldAmount * foodRatio);
  };

  return (
    <div data-theme="fantasy" className="min-h-dvh w-full flex flex-col bg-base-300 text-base-content relative">
      {/* Header Navbar - Redesigned for consistency and responsiveness */}
      <header className="bg-base-200 border-b border-base-300 shadow-lg sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3">
          {/* Desktop Layout */}
          <div className="hidden md:grid md:grid-cols-3 md:gap-6 md:items-center">
            {/* Left Section - Game Title & Resources */}
            <div className="flex items-center space-x-6">
              <h1 className="text-xl font-bold text-primary truncate">Castle Defenders</h1>
              <div className="flex items-center space-x-4">
                <div className="tooltip tooltip-bottom" data-tip="Gold per second">
                  <div className="flex items-center space-x-1.5 bg-base-300 px-3 py-1.5 rounded-lg">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-yellow-500" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" />
                    </svg>
                    <span className="font-semibold text-sm">{gold}</span>
                    {currentPlayerResourcePerTick.gold > 0 && (
                      <span className="text-xs text-yellow-400">(+{currentPlayerResourcePerTick.gold % 1 === 0 ? currentPlayerResourcePerTick.gold : currentPlayerResourcePerTick.gold.toFixed(1)}/s)</span>
                    )}
                  </div>
                </div>
                <div className="tooltip tooltip-bottom" data-tip="Food per second">
                  <div className="flex items-center space-x-1.5 bg-base-300 px-3 py-1.5 rounded-lg">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-green-500" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M10 3.5A1.5 1.5 0 0111.5 5v1.781l-.003.002-.002.002A5.5 5.5 0 006.5 11H6v2.5a1.5 1.5 0 003 0V11h2v2.5a1.5 1.5 0 003 0V11h.5a5.5 5.5 0 00-2.504-4.715L13.5 5A1.5 1.5 0 0115 3.5V2a1 1 0 00-1-1h-4a1 1 0 00-1 1v1.5zM6.5 9a1.5 1.5 0 110-3 1.5 1.5 0 010 3zm7 0a1.5 1.5 0 110-3 1.5 1.5 0 010 3z" />
                    </svg>
                    <span className="font-semibold text-sm">{food}</span>
                    {currentPlayerResourcePerTick.food > 0 && (
                      <span className="text-xs text-green-400">(+{currentPlayerResourcePerTick.food % 1 === 0 ? currentPlayerResourcePerTick.food : currentPlayerResourcePerTick.food.toFixed(1)}/s)</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Center Section - Wave Information */}
            <div className="text-center">
              <div className="bg-base-300 px-4 py-2 rounded-lg inline-block">
                <div className="text-sm text-base-content/70">Wave</div>
                <div className="text-lg font-bold text-accent">{wave}</div>
                <div className="text-xs text-base-content/60">
                  Next in: <span className="font-semibold text-warning">{Math.ceil(animatedWaveIn)}s</span>
                </div>
              </div>
            </div>

            {/* Right Section - Castle Health */}
            <div className="flex items-center justify-end space-x-3">
              <span className="text-sm font-medium text-base-content/70">Castle HP</span>
              <div className="flex items-center space-x-2">
                <div className="w-24 h-3 bg-base-content/20 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-error transition-all duration-300 ease-out"
                    style={{ width: `${castleHpPercentage}%` }}
                  ></div>
                </div>
                <span className="text-sm font-semibold min-w-[4rem] text-right">
                  {castleHp[playerName] ?? 0}/{MAX_CASTLE_HP}
                </span>
              </div>
            </div>
          </div>

          {/* Mobile Layout */}
          <div className="md:hidden space-y-3">
            {/* Top Row - Title and Wave */}
            <div className="flex items-center justify-between">
              <h1 className="text-lg font-bold text-primary">Castle Defenders</h1>
              <div className="bg-base-300 px-3 py-1.5 rounded-lg">
                <span className="text-sm">Wave <span className="font-bold text-accent">{wave}</span></span>
                <span className="text-xs text-base-content/60 ml-2">
                  ({Math.ceil(animatedWaveIn)}s)
                </span>
              </div>
            </div>

            {/* Bottom Row - Resources and Health */}
            <div className="flex items-center justify-between space-x-4">
              {/* Resources */}
              <div className="flex items-center space-x-3">
                <div className="flex items-center space-x-1.5 bg-base-300 px-2.5 py-1.5 rounded-lg">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-yellow-500" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" />
                  </svg>
                  <span className="font-semibold text-sm">{gold}</span>
                  {currentPlayerResourcePerTick.gold > 0 && (
                    <span className="text-xs text-yellow-400">(+{currentPlayerResourcePerTick.gold % 1 === 0 ? currentPlayerResourcePerTick.gold : currentPlayerResourcePerTick.gold.toFixed(1)})</span>
                  )}
                </div>
                <div className="flex items-center space-x-1.5 bg-base-300 px-2.5 py-1.5 rounded-lg">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-green-500" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M10 3.5A1.5 1.5 0 0111.5 5v1.781l-.003.002-.002.002A5.5 5.5 0 006.5 11H6v2.5a1.5 1.5 0 003 0V11h2v2.5a1.5 1.5 0 003 0V11h.5a5.5 5.5 0 00-2.504-4.715L13.5 5A1.5 1.5 0 0115 3.5V2a1 1 0 00-1-1h-4a1 1 0 00-1 1v1.5zM6.5 9a1.5 1.5 0 110-3 1.5 1.5 0 010 3zm7 0a1.5 1.5 0 110-3 1.5 1.5 0 010 3z" />
                  </svg>
                  <span className="font-semibold text-sm">{food}</span>
                  {currentPlayerResourcePerTick.food > 0 && (
                    <span className="text-xs text-green-400">(+{currentPlayerResourcePerTick.food % 1 === 0 ? currentPlayerResourcePerTick.food : currentPlayerResourcePerTick.food.toFixed(1)})</span>
                  )}
                </div>
              </div>

              {/* Castle Health */}
              <div className="flex items-center space-x-2 min-w-0 flex-1 justify-end">
                <span className="text-xs text-base-content/70 hidden sm:inline">HP</span>
                <div className="flex-1 max-w-[5rem] h-2.5 bg-base-content/20 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-error transition-all duration-300 ease-out"
                    style={{ width: `${castleHpPercentage}%` }}
                  ></div>
                </div>
                <span className="text-xs font-semibold text-right min-w-[3rem]">
                  {castleHp[playerName] ?? 0}
                </span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {!playerAlive && (
        <div className="alert alert-warning shadow-lg rounded-none text-center">
          <span>You have been eliminated – you are now spectating.</span>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden p-2 sm:p-4 gap-2 sm:gap-4 min-h-0">
        {/* Game Canvas */}
        <div className="h-[35vh] sm:h-[clamp(200px,40vh,450px)] flex-shrink-0 sm:flex-grow lg:w-2/3 lg:h-full bg-black rounded-lg shadow-xl overflow-x-auto overflow-y-hidden flex p-1 sm:p-2">
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

        {/* Sidebar with Tabs */}
        <div className="min-h-0 flex-grow lg:flex-grow-0 lg:w-1/3 xl:w-1/4 lg:h-full flex flex-col bg-base-200 rounded-lg shadow-xl scrollbar-thin scrollbar-thumb-primary scrollbar-track-base-300">
          
          {/* Tab Navigation */}
          <div className="tabs tabs-boxed justify-center p-2 bg-base-200 rounded-t-lg">
            <button 
              className={`tab tab-sm sm:tab-md ${activeTab === 'resources' ? 'tab-active' : ''}`}
              onClick={() => setActiveTab('resources')}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 sm:h-4 sm:w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" />
              </svg>
              <span className="hidden sm:inline">Resources</span>
            </button>
            <button 
              className={`tab tab-sm sm:tab-md ${activeTab === 'military' ? 'tab-active' : ''}`}
              onClick={() => setActiveTab('military')}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 sm:h-4 sm:w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span className="hidden sm:inline">Military</span>
            </button>
            <button 
              className={`tab tab-sm sm:tab-md ${activeTab === 'stats' ? 'tab-active' : ''}`}
              onClick={() => setActiveTab('stats')}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 sm:h-4 sm:w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
              </svg>
              <span className="hidden sm:inline">Stats</span>
            </button>
            <button 
              className={`tab tab-sm sm:tab-md ${activeTab === 'upgrades' ? 'tab-active' : ''}`}
              onClick={() => setActiveTab('upgrades')}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 sm:h-4 sm:w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
              </svg>
              <span className="hidden sm:inline">Upgrades</span>
            </button>
          </div>

          {/* Tab Content */}
          <div className="flex-grow overflow-y-auto p-2 sm:p-4 space-y-2 sm:space-y-4">
            
            {/* Resources Tab */}
            {activeTab === 'resources' && (
              <>
                {/* Mine Gold Section */}
                <div className="card bg-base-300 shadow-md compact">
                  <div className="card-body p-3 sm:p-4">
                    <h3 className="card-title text-md sm:text-lg">Mine Gold</h3>
                    <button 
                      className="btn btn-primary btn-sm sm:btn-md w-full mt-2 relative z-10" 
                      onClick={() => { spawnGoldChips(getMineGoldAmount()); handleMine(); }}
                      ref={mineButtonRef}
                      disabled={!playerAlive}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M6 2a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2V4a2 2 0 00-2-2H6zm2 2a1 1 0 00-1 1v2a1 1 0 102 0V5a1 1 0 00-1-1zm4 0a1 1 0 00-1 1v2a1 1 0 102 0V5a1 1 0 00-1-1zm-2 5a1 1 0 011 1v4a1 1 0 11-2 0v-4a1 1 0 011-1z" clipRule="evenodd" /></svg>
                      Mine Gold 
                      <span className="text-yellow-300 font-bold">
                        (+{getMineGoldAmount()})
                      </span>
                      {getMiningFoodAmount() > 0 && (
                        <span className="text-green-300 font-bold">
                          (+{getMiningFoodAmount()}F)
                        </span>
                      )}
                    </button>
                    <p className="text-xs text-base-content/70 mt-1 text-center">
                      Click to manually gather {getMineGoldAmount()} gold{getMiningFoodAmount() > 0 ? ` and ${getMiningFoodAmount()} food` : ''}.
                    </p>
                  </div>
                </div>

                {/* Workers Section */}
                <WorkerAnimationProvider>
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
                            upgrades={upgrades}
                            upgradeTypes={gameState?.upgradeTypes}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                </WorkerAnimationProvider>
              </>
            )}

            {/* Military Tab */}
            {activeTab === 'military' && (
              <>
                {unitTypes.map(unit => {
                  const hasUpgrades = unit.cost !== unit.originalCost || unit.hp !== unit.originalHp || unit.dmg !== unit.originalDmg;
                  return (
                    <div key={unit.type} className="card bg-base-300 shadow-md compact">
                      <div className="card-body p-3 sm:p-4">
                        {/* Header with unit info */}
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            {SPRITE_MAP[unit.sprite] && (
                              <img src={SPRITE_MAP[unit.sprite]} alt={unit.type} className="w-8 h-8" />
                            )}
                            <div>
                              <h4 className="font-semibold text-sm sm:text-base">{unit.type}</h4>
                              <span className="badge badge-neutral badge-sm">x{unit.current} active</span>
                            </div>
                          </div>
                          <button 
                            className="btn btn-accent btn-sm" 
                            onClick={() => handleSpawnUnit(unit.type)}
                            disabled={!playerAlive || !canAfford(unit.cost)}
                          >
                            Spawn
                          </button>
                        </div>

                        {/* Stats grid */}
                        <div className="grid grid-cols-3 gap-3 text-xs">
                          {/* Cost */}
                          <div className="bg-base-200 p-2 rounded">
                            <div className="text-base-content/70 mb-1">Cost</div>
                            <div className="font-medium">
                              {hasUpgrades ? (
                                <>
                                  <div className="text-green-400">
                                    {Object.entries(unit.cost).map(([res,val]) => `${val}${res[0].toUpperCase()}`).join(' / ')}
                                  </div>
                                  <div className="text-base-content/50 line-through text-xs">
                                    {Object.entries(unit.originalCost).map(([res,val]) => `${val}${res[0].toUpperCase()}`).join(' / ')}
                                  </div>
                                </>
                              ) : (
                                <div>
                                  {Object.entries(unit.cost).map(([res,val]) => `${val}${res[0].toUpperCase()}`).join(' / ')}
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Health */}
                          <div className="bg-base-200 p-2 rounded">
                            <div className="text-base-content/70 mb-1">Health</div>
                            <div className="font-medium">
                              <span className={unit.hp !== unit.originalHp ? 'text-blue-400' : ''}>{unit.hp}</span>
                              {unit.hp !== unit.originalHp && (
                                <div className="text-base-content/50 line-through text-xs">{unit.originalHp}</div>
                              )}
                            </div>
                          </div>

                          {/* Damage */}
                          <div className="bg-base-200 p-2 rounded">
                            <div className="text-base-content/70 mb-1">Damage</div>
                            <div className="font-medium">
                              <span className={unit.dmg !== unit.originalDmg ? 'text-red-400' : ''}>{unit.dmg}</span>
                              {unit.dmg !== unit.originalDmg && (
                                <div className="text-base-content/50 line-through text-xs">{unit.originalDmg}</div>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Upgrade Effects Display */}
                        {(() => {
                          const critLevel = upgrades.CRITICAL_STRIKES || 0;
                          if (critLevel > 0) {
                            const critChance = getUpgradeEffect(gameState?.upgradeTypes?.CRITICAL_STRIKES, critLevel, 'critChance', 0);
                            return (
                              <div className="mt-2 p-2 bg-orange-500/10 border border-orange-500/20 rounded">
                                <div className="flex items-center gap-1">
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-orange-400" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M12.395 2.553a1 1 0 00-1.45-.385c-.345.23-.614.558-.822.88-.214.33-.403.713-.57 1.116-.334.804-.614 1.768-.84 2.734a31.365 31.365 0 00-.613 3.58 2.64 2.64 0 01-.945-1.067c-.328-.68-.398-1.534-.398-2.654A1 1 0 005.05 6.05 6.981 6.981 0 003 11a7 7 0 1011.95-4.95c-.592-.591-.98-.985-1.348-1.467-.363-.476-.724-1.063-1.207-2.03zM12.12 15.12A3 3 0 017 13s.879.5 2.5.5c0-1 .5-4 1.25-4.5.5 1 .786 1.293 1.371 1.879A2.99 2.99 0 0113 13a2.99 2.99 0 01-.879 2.121z" clipRule="evenodd" />
                                  </svg>
                                  <span className="text-xs text-orange-400 font-medium">
                                    Critical Strikes: {Math.round(critChance * 100)}% chance for 2x damage
                                  </span>
                                </div>
                              </div>
                            );
                          }
                          return null;
                        })()}

                        {/* Auto-spawn controls */}
                        <div className="mt-3 p-2 bg-base-100 rounded border-l-4 border-accent">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-accent" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                              </svg>
                              <span className="text-sm font-medium">Auto-spawn</span>
                            </div>
                            <div className="form-control">
                              <label className="label cursor-pointer gap-2 p-0">
                                <input 
                                  type="checkbox" 
                                  className="toggle toggle-accent toggle-sm" 
                                  checked={autoSpawn[unit.type]?.enabled || false}
                                  onChange={() => handleToggleAutoSpawn(unit.type)}
                                  disabled={!playerAlive}
                                />
                              </label>
                            </div>
                          </div>
                          
                          {autoSpawn[unit.type]?.enabled && (
                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <label className="text-xs text-base-content/70 min-w-0 flex-shrink-0">Amount per second:</label>
                                <input
                                  type="range"
                                  min="1"
                                  max="10"
                                  step="1"
                                  value={autoSpawn[unit.type]?.amount || 1}
                                  onChange={(e) => handleSetAutoSpawnAmount(unit.type, parseInt(e.target.value))}
                                  className="range range-accent range-xs flex-grow"
                                  disabled={!playerAlive}
                                />
                                <span className="text-xs font-medium min-w-0 flex-shrink-0">
                                  {autoSpawn[unit.type]?.amount || 1}
                                </span>
                              </div>
                              <div className="text-xs text-base-content/60 text-center">
                                Auto-spawns {autoSpawn[unit.type]?.amount || 1} {unit.type}{(autoSpawn[unit.type]?.amount || 1) > 1 ? 's' : ''} per second when resources are available
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}

                 {/* Row Selection for Military */}
                 {rows > 1 && (
                   <div className="card bg-base-300 shadow-md compact">
                     <div className="card-body p-3 sm:p-4">
                       <h3 className="card-title text-md sm:text-lg">Deployment</h3>
                       <div className="form-control mt-2">
                         <label className="label justify-between">
                           <span className="label-text text-xs sm:text-sm">Spawn Row</span>
                           <span className="label-text-alt text-xs">{selectedCol + 1}</span>
                         </label>
                         {rows <= 8 ? (
                           <div className="grid gap-1 pt-1" style={{ gridTemplateColumns: 'repeat(5, minmax(0, 1fr))' }}>
                             {Array.from({ length: rows }).map((_, idx) => (
                               <button
                                 key={idx}
                                 className={`btn btn-sm sm:btn-md ${selectedCol === idx ? 'btn-primary' : 'btn-outline'}`}
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
                     </div>
                   </div>
                 )}
               </>
             )}

            {/* Stats Tab */}
            {activeTab === 'stats' && (
              <>
                <div className="card bg-base-300 shadow-md compact">
                  <div className="card-body p-3 sm:p-4">
                    <h3 className="card-title text-md sm:text-lg">Battle Info</h3>
                    <div className="space-y-1 mt-2 text-sm sm:text-base">
                      <div className="flex justify-between"><span>Current Wave:</span> <span className="font-semibold text-info">{wave}</span></div>
                      <div className="flex justify-between"><span>Castle Health:</span> <span className="font-semibold text-error">{castleHp[playerName] ?? 0}/{MAX_CASTLE_HP}</span></div>
                      <div className="flex justify-between"><span>Total Units:</span> <span className="font-semibold">{Object.values(aliveUnitCounts).reduce((a, b) => a + b, 0)}</span></div>
                    </div>
                  </div>
                </div>

                {/* Enemy Counts Per Lane */}
                {Object.keys(enemyCountsPerLane).length > 0 && (
                  <div className="card bg-base-300 shadow-md compact">
                    <div className="card-body p-3 sm:p-4">
                      <h3 className="card-title text-md sm:text-lg flex items-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-red-500" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        Enemy Threats
                      </h3>
                      <div className="space-y-2 mt-2">
                        {Object.entries(enemyCountsPerLane).map(([lane, count]) => {
                          const laneNumber = parseInt(lane) + 1;
                          const playerName = Array.isArray(gameState?.players) && gameState.players[lane] 
                            ? (typeof gameState.players[lane] === 'string' ? gameState.players[lane] : gameState.players[lane].name)
                            : `Lane ${laneNumber}`;
                          
                          return (
                            <div key={lane} className="flex items-center justify-between p-2 bg-base-200 rounded">
                              <div className="flex items-center gap-2">
                                <span className="badge badge-primary badge-sm">{laneNumber}</span>
                                <span className="text-sm truncate">{playerName}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className={`text-sm font-semibold ${
                                  count === 0 ? 'text-success' : 
                                  count <= 3 ? 'text-warning' : 
                                  'text-error'
                                }`}>
                                  {count} enemies
                                </span>
                                {count > 0 && (
                                  <div className="flex">
                                    {Array.from({ length: Math.min(count, 5) }).map((_, i) => (
                                      <svg key={i} xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                      </svg>
                                    ))}
                                    {count > 5 && <span className="text-xs text-red-400 ml-1">+{count - 5}</span>}
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                                 )}
                
                <div className="card bg-base-300 shadow-md compact">
                  <div className="card-body p-3 sm:p-4">
                    <hr className="my-3 opacity-50" />
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
                        
                        // Calculate this player's maximum castle HP based on their upgrades
                        const playerUpgrades = name === playerName 
                          ? upgrades 
                          : gameState?.players?.find(p => p.name === name)?.upgrades || {};
                        const playerMaxCastleHp = calculateMaxCastleHpForPlayer(playerUpgrades);
                        
                        const hpPercentage = Math.max(0, Math.min(100, (hp / playerMaxCastleHp) * 100));
                        
                        return (
                          <div key={`${name}-${hp}-${playerMaxCastleHp}`} className="bg-base-200 p-2 rounded">
                            <div className="flex justify-between items-center text-xs sm:text-sm mb-1">
                              <span className={`${name===playerName ? 'font-bold' : ''} mr-1 whitespace-nowrap`}>{idx + 1}. {name}</span>
                              <div className="flex-grow mx-1 h-2 bg-base-content/20 rounded-full overflow-hidden">
                                <div 
                                  className="h-full bg-error transition-all duration-300 ease-out"
                                  style={{ width: `${hpPercentage}%` }}
                                ></div>
                              </div>
                              <span className="ml-1">{hp}/{playerMaxCastleHp}</span>
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
              </>
            )}

            {/* Upgrades Tab */}
            {activeTab === 'upgrades' && (
              <div className="space-y-4">
                {/* Mining Upgrades */}
                <div className="card bg-base-300 shadow-md compact">
                  <div className="card-body p-3 sm:p-4">
                    <h3 className="card-title text-md sm:text-lg flex items-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-yellow-500" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M6 2a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2V4a2 2 0 00-2-2H6zm2 2a1 1 0 00-1 1v2a1 1 0 102 0V5a1 1 0 00-1-1zm4 0a1 1 0 00-1 1v2a1 1 0 102 0V5a1 1 0 00-1-1zm-2 5a1 1 0 011 1v4a1 1 0 11-2 0v-4a1 1 0 011-1z" clipRule="evenodd" />
                      </svg>
                      Mining
                    </h3>
                    <div className="space-y-2 mt-2">
                      {gameState?.upgradeTypes && Object.entries(gameState.upgradeTypes)
                        .filter(([_, upgrade]) => upgrade.category === 'mining')
                        .map(([upgradeId, upgrade]) => {
                          const currentLevel = upgrades[upgradeId] || 0;
                          const nextLevel = currentLevel + 1;
                          const levelData = upgrade.levels.find(l => l.level === nextLevel);
                          const isMaxLevel = !levelData;
                          const canAffordUpgrade = levelData && canAfford(levelData.cost);

                          return (
                            <div key={upgradeId} className="p-3 bg-base-200 rounded-lg">
                              <div className="flex justify-between items-start mb-2">
                                <div className="flex-1">
                                  <h4 className="font-semibold text-sm">{upgrade.name}</h4>
                                  <p className="text-xs text-base-content/70">{upgrade.description}</p>
                                  <div className="flex items-center mt-1">
                                    <span className="text-xs text-base-content/60">Level:</span>
                                    <div className="ml-2 flex space-x-1">
                                      {Array.from({ length: upgrade.levels.length }).map((_, i) => (
                                        <div key={i} className={`w-2 h-2 rounded-full ${i < currentLevel ? 'bg-primary' : 'bg-base-content/20'}`} />
                                      ))}
                                    </div>
                                    <span className="ml-2 text-xs font-medium">{currentLevel}/{upgrade.levels.length}</span>
                                  </div>
                                </div>
                                <div className="text-right">
                                  {!isMaxLevel && (
                                    <>
                                      <div className="text-xs text-base-content/70 mb-1">
                                        Cost: {Object.entries(levelData.cost).map(([res, val]) => `${val}${res[0].toUpperCase()}`).join(' / ')}
                                      </div>
                                      <button 
                                        className="btn btn-primary btn-xs" 
                                        onClick={() => handlePurchaseUpgrade(upgradeId)}
                                        disabled={!playerAlive || !canAffordUpgrade}
                                      >
                                        Upgrade
                                      </button>
                                    </>
                                  )}
                                  {isMaxLevel && (
                                    <span className="text-xs text-success font-medium">MAX</span>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                </div>

                {/* Worker Upgrades */}
                <div className="card bg-base-300 shadow-md compact">
                  <div className="card-body p-3 sm:p-4">
                    <h3 className="card-title text-md sm:text-lg flex items-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-blue-500" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Workers
                    </h3>
                    <div className="space-y-2 mt-2">
                      {gameState?.upgradeTypes && Object.entries(gameState.upgradeTypes)
                        .filter(([_, upgrade]) => upgrade.category === 'workers')
                        .map(([upgradeId, upgrade]) => {
                          const currentLevel = upgrades[upgradeId] || 0;
                          const nextLevel = currentLevel + 1;
                          const levelData = upgrade.levels.find(l => l.level === nextLevel);
                          const isMaxLevel = !levelData;
                          const canAffordUpgrade = levelData && canAfford(levelData.cost);

                          return (
                            <div key={upgradeId} className="p-3 bg-base-200 rounded-lg">
                              <div className="flex justify-between items-start mb-2">
                                <div className="flex-1">
                                  <h4 className="font-semibold text-sm">{upgrade.name}</h4>
                                  <p className="text-xs text-base-content/70">{upgrade.description}</p>
                                  <div className="flex items-center mt-1">
                                    <span className="text-xs text-base-content/60">Level:</span>
                                    <div className="ml-2 flex space-x-1">
                                      {Array.from({ length: upgrade.levels.length }).map((_, i) => (
                                        <div key={i} className={`w-2 h-2 rounded-full ${i < currentLevel ? 'bg-primary' : 'bg-base-content/20'}`} />
                                      ))}
                                    </div>
                                    <span className="ml-2 text-xs font-medium">{currentLevel}/{upgrade.levels.length}</span>
                                  </div>
                                </div>
                                <div className="text-right">
                                  {!isMaxLevel && (
                                    <>
                                      <div className="text-xs text-base-content/70 mb-1">
                                        Cost: {Object.entries(levelData.cost).map(([res, val]) => `${val}${res[0].toUpperCase()}`).join(' / ')}
                                      </div>
                                      <button 
                                        className="btn btn-primary btn-xs" 
                                        onClick={() => handlePurchaseUpgrade(upgradeId)}
                                        disabled={!playerAlive || !canAffordUpgrade}
                                      >
                                        Upgrade
                                      </button>
                                    </>
                                  )}
                                  {isMaxLevel && (
                                    <span className="text-xs text-success font-medium">MAX</span>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                </div>

                {/* Military Upgrades */}
                <div className="card bg-base-300 shadow-md compact">
                  <div className="card-body p-3 sm:p-4">
                    <h3 className="card-title text-md sm:text-lg flex items-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-red-500" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      Military
                    </h3>
                    <div className="space-y-2 mt-2">
                      {gameState?.upgradeTypes && Object.entries(gameState.upgradeTypes)
                        .filter(([_, upgrade]) => upgrade.category === 'military')
                        .map(([upgradeId, upgrade]) => {
                          const currentLevel = upgrades[upgradeId] || 0;
                          const nextLevel = currentLevel + 1;
                          const levelData = upgrade.levels.find(l => l.level === nextLevel);
                          const isMaxLevel = !levelData;
                          const canAffordUpgrade = levelData && canAfford(levelData.cost);

                          return (
                            <div key={upgradeId} className="p-3 bg-base-200 rounded-lg">
                              <div className="flex justify-between items-start mb-2">
                                <div className="flex-1">
                                  <h4 className="font-semibold text-sm">{upgrade.name}</h4>
                                  <p className="text-xs text-base-content/70">{upgrade.description}</p>
                                  <div className="flex items-center mt-1">
                                    <span className="text-xs text-base-content/60">Level:</span>
                                    <div className="ml-2 flex space-x-1">
                                      {Array.from({ length: upgrade.levels.length }).map((_, i) => (
                                        <div key={i} className={`w-2 h-2 rounded-full ${i < currentLevel ? 'bg-primary' : 'bg-base-content/20'}`} />
                                      ))}
                                    </div>
                                    <span className="ml-2 text-xs font-medium">{currentLevel}/{upgrade.levels.length}</span>
                                  </div>
                                </div>
                                <div className="text-right">
                                  {!isMaxLevel && (
                                    <>
                                      <div className="text-xs text-base-content/70 mb-1">
                                        Cost: {Object.entries(levelData.cost).map(([res, val]) => `${val}${res[0].toUpperCase()}`).join(' / ')}
                                      </div>
                                      <button 
                                        className="btn btn-primary btn-xs" 
                                        onClick={() => handlePurchaseUpgrade(upgradeId)}
                                        disabled={!playerAlive || !canAffordUpgrade}
                                      >
                                        Upgrade
                                      </button>
                                    </>
                                  )}
                                  {isMaxLevel && (
                                    <span className="text-xs text-success font-medium">MAX</span>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                </div>

                {/* Castle Upgrades */}
                <div className="card bg-base-300 shadow-md compact">
                  <div className="card-body p-3 sm:p-4">
                    <h3 className="card-title text-md sm:text-lg flex items-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-purple-500" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4z" />
                        <path fillRule="evenodd" d="M18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z" clipRule="evenodd" />
                      </svg>
                      Castle
                    </h3>
                    <div className="space-y-2 mt-2">
                      {gameState?.upgradeTypes && Object.entries(gameState.upgradeTypes)
                        .filter(([_, upgrade]) => upgrade.category === 'castle')
                        .map(([upgradeId, upgrade]) => {
                          const currentLevel = upgrades[upgradeId] || 0;
                          const nextLevel = currentLevel + 1;
                          const levelData = upgrade.levels.find(l => l.level === nextLevel);
                          const isMaxLevel = !levelData;
                          const canAffordUpgrade = levelData && canAfford(levelData.cost);

                          return (
                            <div key={upgradeId} className="p-3 bg-base-200 rounded-lg">
                              <div className="flex justify-between items-start mb-2">
                                <div className="flex-1">
                                  <h4 className="font-semibold text-sm">{upgrade.name}</h4>
                                  <p className="text-xs text-base-content/70">{upgrade.description}</p>
                                  <div className="flex items-center mt-1">
                                    <span className="text-xs text-base-content/60">Level:</span>
                                    <div className="ml-2 flex space-x-1">
                                      {Array.from({ length: upgrade.levels.length }).map((_, i) => (
                                        <div key={i} className={`w-2 h-2 rounded-full ${i < currentLevel ? 'bg-primary' : 'bg-base-content/20'}`} />
                                      ))}
                                    </div>
                                    <span className="ml-2 text-xs font-medium">{currentLevel}/{upgrade.levels.length}</span>
                                  </div>
                                </div>
                                <div className="text-right">
                                  {!isMaxLevel && (
                                    <>
                                      <div className="text-xs text-base-content/70 mb-1">
                                        Cost: {Object.entries(levelData.cost).map(([res, val]) => `${val}${res[0].toUpperCase()}`).join(' / ')}
                                      </div>
                                      <button 
                                        className="btn btn-primary btn-xs" 
                                        onClick={() => handlePurchaseUpgrade(upgradeId)}
                                        disabled={!playerAlive || !canAffordUpgrade}
                                      >
                                        Upgrade
                                      </button>
                                    </>
                                  )}
                                  {isMaxLevel && (
                                    <span className="text-xs text-success font-medium">MAX</span>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}

