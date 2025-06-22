import React, { useMemo, useRef, useEffect, useState } from 'react';
import { Application, extend } from '@pixi/react';
import { Container, Graphics, Sprite, Texture, Assets, Text, extensions, ResizePlugin } from 'pixi.js';

// Import sprite images (player + enemy)
import swordsmanImg from '../sprites/units/swordsman.png';
import archerImg from '../sprites/units/archer.png';
import knightImg from '../sprites/units/knight.png';

import goblinImg from '../sprites/units/goblin.png';
import orcImg from '../sprites/units/orc.png';
import ogreImg from '../sprites/units/ogre.png';
import grassImg from '../sprites/background/grass.png';
import roadImg from '../sprites/background/road.png';
import stoneImg from '../sprites/background/stone.png';

const SPRITE_URLS = {
  swordsman: swordsmanImg,
  archer: archerImg,
  knight: knightImg,
  goblin: goblinImg,
  orc: orcImg,
  troll: ogreImg,
  grass: grassImg,
  road: roadImg,
  stone: stoneImg,
};

extend({ Container, Graphics, Sprite, Text });

// Register PixiJS Resize plugin to enable automatic renderer resizing
extensions.add(ResizePlugin);

/******************************
 * Utility helpers            *
 ******************************/
// After a 90° anticlockwise rotation, logical X axis corresponds to original rows (left←→right),
// and logical Y axis corresponds to original columns (top↕︎bottom).  The castle column is now at X=0,
// and the portal column at X=rows-1.
const cellCenter = (row, col, rows, cols) => ({
  x: rows - 1 - row + 0.5,   // rows run right → left after rotation
  y: col + 0.5               // columns become vertical axis (top → bottom)
});

const offsetWithinCell = (index, total, radius) => {
  if (total === 1) return { dx: 0, dy: 0 };
  const angle = (Math.PI * 2 * index) / total;
  return { dx: Math.cos(angle) * radius, dy: Math.sin(angle) * radius };
};

/******************************
 * PixiStage Component        *
 ******************************/
export default function PixiStage({ grid = [], resizeTarget = window }) {

  /* --------------------------------------
   * Determine current rendering area size
   * ------------------------------------*/
  let width = 800;
  let height = 600;
  if (resizeTarget && resizeTarget.getBoundingClientRect) {
    const rect = resizeTarget.getBoundingClientRect();
    width = rect.width || width;
    height = rect.height || height;
  } else if (resizeTarget === window) {
    width = window.innerWidth;
    height = window.innerHeight;
  }

  /* ------------------------------
   * Board & scaling calculations
   * ----------------------------*/

  const rows = grid && grid.length ? grid.length : 1;
  const cols = grid && grid.length && Array.isArray(grid[0]) ? grid[0].length : 1;

  // Logical board width/height after rotation
  const logicalWidth = rows;
  const logicalHeight = cols;

  // Responsive scaling: on mobile we prioritise height so the full vertical board is visible
  // and allow horizontal scrolling. On larger viewports we keep the previous "fit" behaviour.
  const MOBILE_BREAKPOINT = 640; // Tailwind's `sm` breakpoint (in px)

  const isMobile = width < MOBILE_BREAKPOINT;

  // Mobile cell-size limits (px per logical unit)
  const MAX_MOBILE_CELL = 80; // px cell upper bound to limit horizontal scroll

  const scaleFitHeight = height / logicalHeight;

  let scale;
  if (isMobile) {
    // Use the scale that fits the height, but cap individual cell size to avoid excessive scroll.
    scale = Math.min(scaleFitHeight, MAX_MOBILE_CELL);
  } else {
    scale = Math.min(width / logicalWidth, height / logicalHeight);
  }

  // Ensure scale is an integer number of pixels to avoid sub-pixel gaps that
  // can appear between tiled background sprites when their edges fall on
  // fractional pixel boundaries. We keep a minimum of 1px per logical unit.
  scale = Math.max(1, Math.floor(scale));

  // Dimensions of the logical game area after scaling
  const gameAreaWidth = logicalWidth * scale;
  const gameAreaHeight = logicalHeight * scale;

  // Positioning: centre the board horizontally on desktop, but start at x=0 on mobile (so left-aligned)
  const offsetX = isMobile ? 0 : (width - gameAreaWidth) / 2;
  const offsetY = (height - gameAreaHeight) / 2;

  // On mobile we want the canvas to extend beyond viewport to enable horizontal scroll.
  const canvasWidth = isMobile ? gameAreaWidth : width;
  const canvasHeight = height;

  // Determine props for <Application>: use resize plugin on desktop/tablet, disable on mobile.
  const appProps = isMobile
    ? { width: canvasWidth, height: canvasHeight }
    : { width: canvasWidth, height: canvasHeight, resizeTo: resizeTarget };

  /***************   Animation state refs   ****************/
  const prevPosRef = useRef(new Map());            // id -> {x,y}
  const targetPosRef = useRef(new Map());          // id -> {x,y}
  const metaRef = useRef(new Map());               // id -> {hp,maxHp,type}
  const moveTimeRef = useRef(new Map());           // id -> timestamp of last movement
  const battleEndTimeRef = useRef(new Map());      // id -> timestamp when battle ended
  const battleStartTimeRef = useRef(new Map());     // id -> timestamp when battle started
  const battleReturnOffsetRef = useRef(new Map()); // id -> {x,y} offset at battle end
  const hpPrevRatioRef = useRef(new Map());        // id -> previous hp ratio for tween
  const hpAnimStartRef = useRef(new Map());        // id -> timestamp when hp began changing

  const SERVER_TICK_MS = 1000; // Matches CombatTicker interval
  const ANIM_MS = SERVER_TICK_MS; // movement tween equals tick duration
  // Constant circle radius (logical units) chosen small enough to fit many units per cell
  const UNIT_RADIUS = 0.15;

  // -------------------  Death-effect state  -------------------
  // Active blood splatters are stored here until they time-out.
  // Each entry: { x, y, start }
  const effectsRef = useRef([]);
  const BLOOD_LIFE_MS = 700; // splash lasts this long

  // local state counter to trigger re-render
  const [, setFrameTick] = React.useState(0);

  // force re-render every animation frame for smooth tweening
  useEffect(() => {
    let raf;
    const tick = () => {
      setFrameTick(f => f + 1);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  // Utility to compute target positions for all units in current grid
  const computeTargets = () => {
    const targets = new Map();
    const meta = new Map();
    for (let r = 0; r < rows; r++) {
      const rowArr = Array.isArray(grid[r]) ? grid[r] : [];
      for (let c = 0; c < cols; c++) {
        const cell = rowArr[c];
        const units = Array.isArray(cell) ? cell : cell ? [cell] : [];
        if (!units.length) continue;
        const players = units.filter(u => u.type === 'player');
        const enemies = units.filter(u => u.type === 'enemy');
        const cellInBattle = players.length && enemies.length;

        // helper to assign vertical slots within half-cell
        const assignSide = (arr, side) => {
          const count = arr.length;
          if (!count) return;
          // Available vertical span inside the side (±0.4 from centre)
          const spacing = 0.8 / count;

          arr.forEach((unit, idx) => {
            const base = cellCenter(r, c, rows, cols);
            const xHalfOffset = side === 'left' ? -0.25 : 0.25;
            const yOffset = -0.4 + spacing * (idx + 0.5);
            targets.set(unit.id, {
              x: base.x + xHalfOffset,
              y: base.y + yOffset,
            });
            const spriteKey = unit.type === 'player'
              ? (unit.unitType || '').toLowerCase()
              : (unit.subtype || '').toLowerCase();

            meta.set(unit.id, {
              hp: unit.health,
              maxHp: unit.maxHealth,
              type: unit.type,
              inBattle: cellInBattle,
              spriteKey,
            });
          });
        };

        assignSide(players, 'left');
        assignSide(enemies, 'right');
      }
    }
    metaRef.current = meta;
    return targets;
  };

  // Update target positions when grid changes
  useEffect(() => {
    const prevMetaSnapshot = new Map(metaRef.current);
    const newTargets = computeTargets();

    // Detect battle start to initialise animation phase from 0
    for (let [id, newMeta] of metaRef.current.entries()) {
      const prevMeta = prevMetaSnapshot.get(id);
      if (newMeta.inBattle && (!prevMeta || !prevMeta.inBattle)) {
        battleStartTimeRef.current.set(id, Date.now());
      }
    }

    // Detect battle end to start retreat tween
    for (let [id, newMeta] of metaRef.current.entries()) {
      const prevMeta = prevMetaSnapshot.get(id);
      if (prevMeta && prevMeta.inBattle && !newMeta.inBattle) {
        battleEndTimeRef.current.set(id, Date.now());

        // Capture offset at battle end to ensure smooth return without snapping
        const target = targetPosRef.current.get(id);
        if (target) {
          const unitType = prevMeta.type || (id.startsWith('enemy') ? 'enemy' : 'player');
          const cycleMs = 1000;
          const start = battleStartTimeRef.current.get(id) || Date.now();
          const phase = (((Date.now() - start) % cycleMs) / cycleMs);

          const halfOffset = unitType === 'player' ? -0.25 : 0.25;
          const cellCenterY = Math.floor(target.y) + 0.5;
          let dirY = 0;
          if (Math.abs(target.y - cellCenterY) > 0.01) {
            dirY = target.y < cellCenterY ? -1 : 1;
          }
          const curveAmp = 0.06;
          let offX = 0;
          let offY = 0;
          if (phase < 0.5) {
            const p = phase * 2;
            const ease = 1 - Math.pow(1 - p, 1.5);
            offX = -halfOffset * ease;
            offY = curveAmp * Math.sin(Math.PI * ease) * dirY;
          } else {
            const p = (phase - 0.5) * 2;
            offX = -halfOffset * (1 - p);
            offY = 0;
          }
          battleReturnOffsetRef.current.set(id, { x: offX, y: offY });
        }
      }
    }

    // Iterate to update refs and detect movements
    for (let [id, newPos] of newTargets.entries()) {
      const prevPos = targetPosRef.current.get(id);
      if (!prevPos) {
        // new unit – start with no tween
        prevPosRef.current.set(id, { ...newPos });
        moveTimeRef.current.set(id, Date.now());
      } else if (prevPos.x !== newPos.x || prevPos.y !== newPos.y) {
        // position changed – update prevPos and timestamp
        prevPosRef.current.set(id, { ...prevPos });
        moveTimeRef.current.set(id, Date.now());
      }
    }

    // Remove data for units that disappeared
    for (let id of Array.from(targetPosRef.current.keys())) {
      if (!newTargets.has(id)) {
        // Before purging, add a blood effect at last known position.
        const lastPos = targetPosRef.current.get(id) || prevPosRef.current.get(id);
        if (lastPos) {
          effectsRef.current.push({ x: lastPos.x, y: lastPos.y, start: Date.now() });
        }

        targetPosRef.current.delete(id);
        prevPosRef.current.delete(id);
        metaRef.current.delete(id);
        moveTimeRef.current.delete(id);
        battleEndTimeRef.current.delete(id);
        battleReturnOffsetRef.current.delete(id);
        battleStartTimeRef.current.delete(id);
        hpPrevRatioRef.current.delete(id);
        hpAnimStartRef.current.delete(id);
      }
    }

    // Finally replace targets and trigger an immediate re-render now that
    // all refs reflect the latest grid. This guarantees the first frame
    // after a grid update starts interpolating from the correct previous
    // position instead of potentially drawing the unit at its new target
    // location without tweening.
    targetPosRef.current = newTargets;

    // Force a re-render so changes take effect right away.
    setFrameTick(f => f + 1);
  }, [grid, rows, cols]);

  /***************   Memoised Drawers   ****************/
  const drawPortalColumn = useMemo(() => (g) => {
    g.clear();
    g.beginFill(0x663399);
    // Rightmost column after rotation
    g.drawRect(logicalWidth - 1, 0, 1, logicalHeight);
    g.endFill();
  }, [logicalWidth, logicalHeight]);

  const drawCastleColumn = useMemo(() => (g) => {
    g.clear();
    g.beginFill(0x336699);
    // Leftmost column after rotation
    g.drawRect(0, 0, 1, logicalHeight);
    g.endFill();
  }, [logicalHeight]);

  const drawGrid = useMemo(() => (g) => {
    g.clear();
    const lineColor = 0xffffff;
    const lineW = 0.04; // logical units (≈2px after scale≈50)
    // verticals (columns in rotated view)
    for (let x = 0; x <= logicalWidth; x++) {
      g.beginFill(lineColor);
      g.drawRect(x - lineW / 2, 0, lineW, logicalHeight);
      g.endFill();
    }
    // horizontals (rows in rotated view)
    for (let y = 0; y <= logicalHeight; y++) {
      g.beginFill(lineColor);
      g.drawRect(0, y - lineW / 2, logicalWidth, lineW);
      g.endFill();
    }
  }, [logicalWidth, logicalHeight]);

  const renderRowNumbers = () => {
    // Display numeric labels for each visual row (original column index)
    const elements = [];
    // Scale text inversely so it stays a constant pixel size regardless of board scaling
    const textScale = 1 / scale;
    for (let y = 0; y < logicalHeight; y++) {
      elements.push(
        <pixiText
          key={`row-number-${y}`}
          text={`${y+1}`}
          x={0.5}
          y={y + 0.5}
          anchor={{ x: 0.5, y: 0.5 }}
          scale={textScale}
          style={{ fill: 0xffffff, fontFamily: 'Arial', fontSize: 16 }}
        />
      );
    }
    return elements;
  };

  /***************   Units Render   ****************/
  const renderUnits = () => {
    const elements = [];
    const now = Date.now();

    for (let [id, target] of targetPosRef.current.entries()) {
      const prev = prevPosRef.current.get(id) || target;
      const lastMove = moveTimeRef.current.get(id) || now;
      const localT = Math.min(1, (now - lastMove) / ANIM_MS);
      const interpX = prev.x + (target.x - prev.x) * localT;
      const interpY = prev.y + (target.y - prev.y) * localT;
      const radius = UNIT_RADIUS;
      const meta = metaRef.current.get(id);
      const ratioTarget = meta ? Math.max(0, meta.hp) / (meta.maxHp || 1) : 1;
      const nowRatioPrev = hpPrevRatioRef.current.get(id);
      if (nowRatioPrev === undefined) {
        hpPrevRatioRef.current.set(id, ratioTarget);
      }
      let ratioFrom = hpPrevRatioRef.current.get(id);
      const animStartExisting = hpAnimStartRef.current.get(id);
      if (!animStartExisting && ratioFrom > ratioTarget) {
        // HP decreased – kick off animation only if not already animating
        hpAnimStartRef.current.set(id, now);
      }
      const animStart = hpAnimStartRef.current.get(id);
      let ratio = ratioTarget;
      const HP_ANIM_MS = 400;
      if (animStart && ratioFrom !== undefined && ratioFrom > ratioTarget) {
        const t = Math.min(1, (now - animStart) / HP_ANIM_MS);
        ratio = ratioFrom + (ratioTarget - ratioFrom) * t;
        if (t === 1) {
          hpPrevRatioRef.current.set(id, ratioTarget);
          hpAnimStartRef.current.delete(id);
        }
      } else {
        ratio = ratioTarget;
      }
      const unitType = meta?.type || (id.startsWith('enemy') ? 'enemy' : 'player');

      // Battle animation: slow approach, fast curved retreat
      let battleOffsetX = 0;
      let battleOffsetY = 0;
      const RETURN_MS = 300;

      if (meta?.inBattle) {
        const cycleMs = 1000; // server combat tick
        const start = battleStartTimeRef.current.get(id) || now;
        const phase = (((now - start) % cycleMs) / cycleMs);

        const halfOffset = unitType === 'player' ? -0.25 : 0.25;

        // Direction based on actual vertical position inside the cell
        const cellCenterY = Math.floor(target.y) + 0.5;
        let dirY = 0;
        if (Math.abs(target.y - cellCenterY) > 0.01) {
          dirY = target.y < cellCenterY ? -1 : 1;
        }
        const curveAmp = 0.06; // vertical curve on retreat

        if (phase < 0.5) {
          const p = phase * 2;
          const ease = 1 - Math.pow(1 - p, 1.5);
          battleOffsetX = -halfOffset * ease;
          battleOffsetY = curveAmp * Math.sin(Math.PI * ease) * dirY;
        } else {
          const p = (phase - 0.5) * 2;
          battleOffsetX = -halfOffset * (1 - p);
          battleOffsetY = 0;
        }
      } else {
        // Not in battle. Check if we just ended battle and need smooth return
        const endTime = battleEndTimeRef.current.get(id);
        if (endTime) {
          const elapsed = now - endTime;
          if (elapsed < RETURN_MS) {
            const startOff = battleReturnOffsetRef.current.get(id) || { x: 0, y: 0 };
            const p = 1 - elapsed / RETURN_MS; // 1 → 0
            battleOffsetX = startOff.x * p;
            battleOffsetY = startOff.y * p;
          } else {
            battleEndTimeRef.current.delete(id); // finished
            battleReturnOffsetRef.current.delete(id);
          }
        }
      }

      // HP bar graphics: vertical bar on side (right for players, left for enemies)
      const drawHpBar = (g) => {
        g.clear();

        const barWidth = 0.08; // logical units
        const barHeight = radius * 2;
        const margin = 0.15;

        // Determine X position based on side
        const barX = unitType === 'player'
          ? -radius - margin - barWidth
          : radius + margin;

        const barYTop = -radius;

        // Background
        g.beginFill(0x333333);
        g.drawRect(barX, barYTop, barWidth, barHeight);
        g.endFill();

        // Fill (draw from bottom up for intuitive drain effect)
        const fillHeight = barHeight * ratio;
        const fillY = barYTop + (barHeight - fillHeight);
        g.beginFill(0x00ff00);
        g.drawRect(barX, fillY, barWidth, fillHeight);
        g.endFill();
      };

      const spriteTexture = textures[meta?.spriteKey] || textures[unitType === 'enemy' ? 'goblin' : 'swordsman'];

      const baseSize = (spriteTexture?.width ?? 64);
      const spriteScale = (radius * 2) / baseSize; // logical units

      elements.push(
        <pixiContainer key={id} x={interpX + battleOffsetX} y={interpY + battleOffsetY}>
          <pixiSprite
            texture={spriteTexture}
            scale={spriteScale}
            anchor={0.5}
          />
          <pixiGraphics draw={drawHpBar} />
        </pixiContainer>
      );

      // when animation complete update prevPos
      if (localT === 1) {
        prevPosRef.current.set(id, target);
      }
    }
    return elements;
  };

  const [textures, setTextures] = useState(null);

  // Load textures once on mount
  useEffect(() => {
    let cancelled = false;
    (async () => {
      await Assets.load(Object.values(SPRITE_URLS));
      if (cancelled) return;
      const map = {};
      for (const [key, url] of Object.entries(SPRITE_URLS)) {
        map[key] = Assets.get(url);
      }
      setTextures(map);
    })();
    return () => { cancelled = true; };
  }, []);

  if (!textures) {
    // Optionally render nothing until textures are ready
    return null;
  }

  /***************   Blood-splatter Render   ****************/
  const renderEffects = () => {
    const now = Date.now();

    // Filter out expired splatters
    effectsRef.current = effectsRef.current.filter(e => now - e.start < BLOOD_LIFE_MS);

    return effectsRef.current.map((effect, idx) => {
      const t = (now - effect.start) / BLOOD_LIFE_MS; // 0 → 1
      const alpha = 1 - t; // fade out
      const scale = 1 + 0.4 * t; // slight spread

      const drawSplash = (g) => {
        g.clear();
        g.beginFill(0xbb0000, alpha);
        // central blot
        g.drawCircle(0, 0, UNIT_RADIUS * 0.5 * scale);
        // little surrounding drops (fixed pseudo-random layout for consistency)
        const drops = [
          { dx: 0.08, dy: -0.04, r: 0.05 },
          { dx: -0.06, dy: 0.06, r: 0.04 },
          { dx: 0.03, dy: 0.07, r: 0.03 },
        ];
        drops.forEach(d => {
          g.drawCircle(d.dx * scale, d.dy * scale, d.r * scale);
        });
        g.endFill();
      };

      return (
        <pixiGraphics
          key={`blood-${idx}-${effect.start}`}
          x={effect.x}
          y={effect.y}
          draw={drawSplash}
          alpha={alpha}
        />
      );
    });
  };

  /***************   Background Tiles Render   ****************/
  const renderBackground = () => {
    if (!textures) return null;
    const tiles = [];
    for (let x = 0; x < logicalWidth; x++) {
      for (let y = 0; y < logicalHeight; y++) {
        let texKey;
        if (x === 0) {
          texKey = 'grass'; // castle column
        } else if (x === logicalWidth - 1) {
          texKey = 'stone'; // portal column
        } else {
          texKey = 'road'; // middle cells
        }
        const tex = textures[texKey];
        // Slightly oversize each tile by exactly one pixel in world units
        // to ensure adjacent tiles overlap and no visual gap appears even
        // if rounding leads to a 1-pixel seam.
        const overlap = 1 / scale; // world-units equivalent of 1 pixel
        const size = 1 + overlap;
        tiles.push(
          <pixiSprite
            key={`bg-${x}-${y}`}
            texture={tex}
            x={x}
            y={y}
            width={size}
            height={size}
          />
        );
      }
    }
    return tiles;
  };

  return (
    <Application {...appProps} background={0x222222}>
      <pixiContainer x={offsetX} y={offsetY} scale={scale}>
        {/* draw order: background tiles → units */}
        {renderBackground()}
        {/* Row/column numeric labels */}
        {renderRowNumbers()}
        {renderEffects()}
        {renderUnits()}
      </pixiContainer>
    </Application>
  );
}
