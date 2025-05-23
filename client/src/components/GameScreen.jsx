import { h } from 'preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import PixiCanvas from './PixiCanvas';
import io from 'socket.io-client';

const ENEMY_COLORS = {
  goblin: 0x44ee44,
  orc: 0x888888,
  troll: 0x9966cc
};

// Fix: Provide a no-op handler for castle click if not needed
function handleCastleClick() {}

export default function GameScreen({ playerName, gameState, socketRef }) {
  const pixiContainer = useRef();
  const pixiInstance = useRef();
  const [gold, setGold] = useState(0);
  const [food, setFood] = useState(0);
  const [workers, setWorkers] = useState({ Miner: 0, Digger: 0, Excavator: 0 });
  const [playerUnits, setPlayerUnits] = useState({ Swordsman: 0, Archer: 0, Knight: 0 });
  const [enemies, setEnemies] = useState([]);
  const [units, setUnits] = useState([]);

  // For interpolation
  const prevEnemiesRef = useRef([]);
  const prevUnitsRef = useRef([]);
  const lastUpdateRef = useRef(Date.now());
  const SERVER_TICK_MS = 1000; // Matches TIMINGS.COUNTDOWN_INTERVAL on server

  // Only update prevEnemiesRef when new server data arrives (see socket.on('spawnEnemies'))
  // (No effect here: handled in event handler for correct interpolation)
  // Units do not interpolate, so prevUnitsRef is not needed for animation.


  const [wave, setWave] = useState(gameState?.wave ?? 1);
  const [nextWaveIn, setNextWaveIn] = useState(gameState?.nextWaveIn ?? 10);
  const lastWaveUpdateRef = useRef(Date.now());
  const lastWaveValueRef = useRef(nextWaveIn);
  const [castleHp, setCastleHp] = useState(gameState?.castleHp ?? 1000);

  // Only use gameState for initial state, not for ongoing updates
  // (No effect here: all updates handled by socket events)

  // Setup socket for mining, resource/unit/wave, and enemy updates
  useEffect(() => {
    const socket = socketRef.current;
    if (!socket) return;
    console.log('GameScreen using socket id:', socket.id);

    // Interpolation: update prev state and timestamp on new data
    socket.on('resourceUpdate', (data) => {
      if (data) {
        if (data.gold !== undefined) setGold(data.gold);
        if (data.food !== undefined) setFood(data.food);
        if (data.workers) setWorkers(data.workers);
      }
    });
    socket.on('unitUpdate', (data) => {
      if (data && data.units) setPlayerUnits(data.units);
    });
    socket.on('stateUpdate', (data) => {
      if (data.wave !== undefined) setWave(data.wave);
      if (data.nextWaveIn !== undefined) setNextWaveIn(data.nextWaveIn);
      if (data.castleHp !== undefined) setCastleHp(data.castleHp);
    });
    socket.on('spawnEnemies', (data) => {
      if (data && Array.isArray(data.enemies)) {
        prevEnemiesRef.current = enemies;
        lastUpdateRef.current = Date.now();
        setEnemies(data.enemies);
      }
    });
    socket.on('spawnUnits', (data) => {
      if (data && Array.isArray(data.units)) {
        prevUnitsRef.current = units;
        lastUpdateRef.current = Date.now();
        setUnits(data.units);
      }
    });
    return () => {
      socket.off('resourceUpdate');
      socket.off('unitUpdate');
      socket.off('stateUpdate');
      socket.off('spawnEnemies');
      socket.off('spawnUnits');
    };

  }, []);

  // Worker/unit/upgrade button handlers
  function handleHireWorker(type) {
    if (socketRef.current) {
      socketRef.current.emit('hireWorker', type);
    }
  }
  function handleSpawnUnit(type) {
    if (socketRef.current) {
      socketRef.current.emit('spawnUnit', type);
    }
  }

  // PixiJS setup: modular, responsive, and new spawn logic
  // Only create PixiCanvas when gameState/playerName changes
  useEffect(() => {
    if (!pixiContainer.current) return;
    const playerNames = (gameState?.players || []).map(p => p.name);
    // Initialize PixiJS
    if (pixiContainer.current && !pixiInstance.current) {
      pixiInstance.current = new PixiCanvas(pixiContainer.current, {
        onCastleClick: handleCastleClick
      });
      appRef.current = pixiInstance.current;
    }

    // Ensure the canvas container is always rendered
    // (This is handled in the JSX return at the bottom)

    return () => {
      if (pixiInstance.current) {
        pixiInstance.current.destroy();
        pixiInstance.current = null;
        appRef.current = null;
      }
    };
  }, [gameState, playerName]);

  // Smoothly animate the nextWaveIn counter between server updates
  const [animatedWaveIn, setAnimatedWaveIn] = useState(nextWaveIn);
  useEffect(() => {
    lastWaveUpdateRef.current = Date.now();
    lastWaveValueRef.current = nextWaveIn;
    setAnimatedWaveIn(nextWaveIn);
    let raf;
    function animate() {
      const now = Date.now();
      const dt = (now - lastWaveUpdateRef.current) / 1000;
      const est = Math.max(0, lastWaveValueRef.current - dt);
      setAnimatedWaveIn(est);
      if (est > 0) raf = requestAnimationFrame(animate);
    }
    animate();
    return () => raf && cancelAnimationFrame(raf);
  }, [nextWaveIn]);

  // Animation loop: interpolate enemies from previous to new server positions, units are not interpolated
  useEffect(() => {
    if (!pixiInstance.current) return;
    let running = true;
    let animationFrame;
    function lerp(a, b, t) { return a + (b - a) * t; }
    function interpolateEnemies(prevList, currList, t) {
      return currList.map(curr => {
        const prev = prevList.find(p => p.id === curr.id);
        if (prev) {
          return { ...curr, x: lerp(prev.x, curr.x, t), y: lerp(prev.y, curr.y, t) };
        } else {
          return { ...curr };
        }
      });
    }
    function animate() {
      if (!running) return;
      const now = Date.now();
      const dt = now - lastUpdateRef.current;
      const t = Math.max(0, Math.min(1, dt / SERVER_TICK_MS));
      const interpEnemies = interpolateEnemies(prevEnemiesRef.current, enemies, t);
      pixiInstance.current.renderObjects({ enemies: interpEnemies, units });
      animationFrame = requestAnimationFrame(animate);
    }
    animate();
    return () => {
      running = false;
      cancelAnimationFrame(animationFrame);
    };
  }, [enemies, units]);

  // Update enemies/units on state change
  // Interpolated rendering is now handled in the animation loop above
  // useEffect(() => {
  //   if (!pixiInstance.current) return;
  //   pixiInstance.current.renderObjects({ enemies, units });
  // }, [enemies, units]);

  // Update units when units state changes
  // Fix: Ensure appRef exists and is assigned PixiCanvas instance
  const appRef = useRef(null);

  useEffect(() => {
    if (!appRef.current) return;
    const app = appRef.current;
    if (!app.unitContainer || !app.unitSprites) return;
    const unitContainer = app.unitContainer;
    const unitSprites = app.unitSprites;
    // Remove old sprites
    for (const id in unitSprites) {
      if (!units.find(u => u.id === id)) {
        unitContainer.removeChild(unitSprites[id]);
        unitSprites[id].destroy();
        delete unitSprites[id];
      }
    }
    // Add/update sprites
    for (const unit of units) {
      let sprite = unitSprites[unit.id];
      if (!sprite) {
        sprite = new PIXI.Graphics();
        // Color by type
        let color = 0xdddddd;
        if (unit.type === 'Swordsman') color = 0xaaaaaa;
        if (unit.type === 'Archer') color = 0x44bbee;
        if (unit.type === 'Knight') color = 0xeecc44;
        sprite.beginFill(color);
        sprite.drawRect(-12, -18, 24, 36);
        sprite.endFill();
        unitContainer.addChild(sprite);
        unitSprites[unit.id] = sprite;
        // HP bar
        sprite.hpBar = new PIXI.Graphics();
        sprite.addChild(sprite.hpBar);
      }
      // Always update position and type
      sprite._unitData = unit;
      sprite.x = unit.x;
      sprite.y = unit.y;
      // Draw HP bar
      const hpPerc = Math.max(0, unit.hp / (unit.maxHp || 30));
      sprite.hpBar.clear();
      sprite.hpBar.beginFill(0xff0000);
      sprite.hpBar.drawRect(-12, -30, 24, 6);
      sprite.hpBar.endFill();
      sprite.hpBar.beginFill(0x00ff00);
      sprite.hpBar.drawRect(-12, -30, 24 * hpPerc, 6);
      sprite.hpBar.endFill();
    }
  }, [units]);

  // Mine gold handler
  function handleMine() {
    console.log('Mine Gold button clicked');
    if (socketRef.current) {
      console.log('Emitting mine event');
      socketRef.current.emit('mine');
    }
  }

  return (
    <div className="game-screen">
      <div className="game-header">
        <div className="resources">
          <div className="resource">
            <div className="resource-icon">G</div>
            <div className="resource-value">{gold}</div>
          </div>
          <div className="resource">
            <div className="resource-icon">F</div>
            <div className="resource-value">{food}</div>
          </div>
        </div>
        <div className="wave-info">
          <div>Wave: <span className="wave-number">{wave}</span></div>
          <div>Next wave in: <span className="wave-timer">{Math.ceil(animatedWaveIn)}s</span></div>
        </div>
        <div className="castle-hp">
          <div>Castle:</div>
          <div className="hp-bar">
            <div className="hp-fill" style={{width: `${Math.max(0, Math.min(100, (castleHp / 1000) * 100))}%`}}></div>
          </div>
          <div>{castleHp}</div>
        </div>
      </div>
      
      <div className="game-content">
        <div ref={pixiContainer} className="game-canvas"></div>
        
        <div className="game-sidebar">
          <div className="sidebar-section">
            <h3>Resources</h3>
            <button 
              className="action-button mine-button" 
              onClick={handleMine}
            >
              Mine Gold
              <div className="action-description">Click to mine gold manually</div>
            </button>
          </div>
          
          <div className="sidebar-section">
            <h3>Workers</h3>
            <div className="action-buttons">
              <button 
                className="action-button" 
                onClick={() => handleHireWorker('Miner')}
                disabled={gold < 50}
              >
                Miner
                <div className="action-cost">50 gold</div>
              </button>
              <div className="worker-count">x{workers.Miner}</div>
              
              <button 
                className="action-button" 
                onClick={() => handleHireWorker('Digger')}
                disabled={gold < 200}
              >
                Digger
                <div className="action-cost">200 gold</div>
              </button>
              <div className="worker-count">x{workers.Digger}</div>
              
              <button 
                className="action-button" 
                onClick={() => handleHireWorker('Excavator')}
                disabled={gold < 500}
              >
                Excavator
                <div className="action-cost">500 gold</div>
              </button>
              <div className="worker-count">x{workers.Excavator}</div>
            </div>
          </div>
          
          <div className="sidebar-section">
            <h3>Military Units</h3>
            <div className="action-buttons">
              <button 
                className="action-button" 
                onClick={() => handleSpawnUnit('Swordsman')}
                disabled={gold < 100 || food < 10}
              >
                Swordsman
                <div className="action-cost">100g / 10f</div>
              </button>
              <div className="unit-count">x{playerUnits.Swordsman}</div>
              
              <button 
                className="action-button" 
                onClick={() => handleSpawnUnit('Archer')}
                disabled={gold < 150 || food < 15}
              >
                Archer
                <div className="action-cost">150g / 15f</div>
              </button>
              <div className="unit-count">x{playerUnits.Archer}</div>
              
              <button 
                className="action-button" 
                onClick={() => handleSpawnUnit('Knight')}
                disabled={gold < 300 || food < 30}
              >
                Knight
                <div className="action-cost">300g / 30f</div>
              </button>
              <div className="unit-count">x{playerUnits.Knight}</div>
            </div>
          </div>
          
          <div className="sidebar-section">
            <h3>Battle Info</h3>
            <div className="battle-stats">
              <div className="stat-row">
                <div className="stat-label">Wave:</div>
                <div className="stat-value">{wave}</div>
              </div>
              <div className="stat-row">
                <div className="stat-label">Castle Health:</div>
                <div className="stat-value">{castleHp}/1000</div>
              </div>
              <div className="stat-row">
                <div className="stat-label">Total Units:</div>
                <div className="stat-value">
                  {playerUnits.Swordsman + playerUnits.Archer + playerUnits.Knight}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
