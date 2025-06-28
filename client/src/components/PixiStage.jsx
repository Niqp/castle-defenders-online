import React, { useMemo, useRef, useEffect, useState } from 'react';
import { Application, extend, useTick } from '@pixi/react';
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
import castleImg from '../sprites/buildings/castle.png';
import portalImg from '../sprites/buildings/portal.png';

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
  castle: castleImg,
  portal: portalImg,
};

extend({ Container, Graphics, Sprite, Text });

// Register PixiJS Resize plugin to enable automatic renderer resizing
extensions.add(ResizePlugin);

/******************************
 * Utility helpers            *
 ******************************/
// With the new coordinate system, logical X axis corresponds to columns (left←→right),
// and logical Y axis corresponds to rows (top↕︎bottom). The castle is now at X=0,
// and the portal is at X=columns-1.
const cellCenter = (row, col, rows, cols) => ({
  x: col + 0.5,              // columns run left → right
  y: row + 0.5               // rows become vertical axis (top → bottom)
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

  // Logical board width/height with new coordinate system
  const logicalWidth = cols;
  const logicalHeight = rows;

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

  /****************************************************************
   * ============================================================ *
   *  PERFORMANCE PATCH –  remove 60 fps React renders           *
   * ------------------------------------------------------------ *
   *  We stop using requestAnimationFrame to bump React state on  *
   *  every frame.  Instead an inner <UnitSprite> component       *
   *  carries its own refs and updates its PIXI DisplayObjects    *
   *  imperatively via useTick (Pixi 8).                          *
   * ============================================================ *
   ****************************************************************/

  // Helper component responsible for one on-screen unit.  It does *not*
  // trigger React renders while animating; all motion & HP tweening
  // happen on the Pixi ticker.
  const UnitSprite = React.memo(function UnitSprite({ unitId }) {
    const containerRef = useRef();           // Main container for this unit
    const hpBarRef = useRef();               // Graphics for HP bar

    // Render static children once. Positions will be mutated imperatively.
    const meta = metaRef.current.get(unitId);
    const spriteKey = meta?.spriteKey ?? (meta?.type === 'enemy' ? 'goblin' : 'swordsman');
    const texture = textures[spriteKey];
    const baseSize = (texture?.width ?? 64);
    const spriteScale = (UNIT_RADIUS * 2) / baseSize;

    // Draw function for HP bar (called from ticker when ratio changes)
    const drawHpBar = (g, ratio) => {
      const barWidth = 0.08; // logical units
      const barHeight = UNIT_RADIUS * 2;
      const margin = 0.15;
      const unitType = meta?.type === 'enemy' ? 'enemy' : 'player';
      const barX = unitType === 'player'
        ? -UNIT_RADIUS - margin - barWidth
        :  UNIT_RADIUS + margin;
      const barYTop = -UNIT_RADIUS;
      g.clear();
      // Background
      g.beginFill(0x333333);
      g.drawRect(barX, barYTop, barWidth, barHeight);
      g.endFill();
      // Fill (draw from bottom up)
      const fillHeight = barHeight * ratio;
      const fillY = barYTop + (barHeight - fillHeight);
      g.beginFill(0x00ff00);
      g.drawRect(barX, fillY, barWidth, fillHeight);
      g.endFill();
    };

    // Imperative animation loop – runs at display framerate without touching React
    useTick(() => {
      const now = Date.now();

      const target = targetPosRef.current.get(unitId);
      // Safety check: if target position doesn't exist, skip this frame
      if (!target) return;
      
      const prev = prevPosRef.current.get(unitId) || target;
      const lastMove = moveTimeRef.current.get(unitId) || now;
      const localT = Math.min(1, (now - lastMove) / ANIM_MS);

      const interpX = prev.x + (target.x - prev.x) * localT;
      const interpY = prev.y + (target.y - prev.y) * localT;

      // Battle offset (re-use original logic)
      let battleOffsetX = 0;
      let battleOffsetY = 0;
      const unitMeta = metaRef.current.get(unitId);
      const unitType = unitMeta?.type === 'enemy' ? 'enemy' : 'player';

      const RETURN_MS = 300;
      if (unitMeta?.inBattle) {
        const cycleMs = 1000;
        const start = battleStartTimeRef.current.get(unitId) || now;
        const phase = (((now - start) % cycleMs) / cycleMs);
        const halfOffset = unitType === 'player' ? -0.25 : 0.25;
        const cellCenterY = Math.floor(target.y) + 0.5;
        let dirY = 0;
        if (Math.abs(target.y - cellCenterY) > 0.01) {
          dirY = target.y < cellCenterY ? -1 : 1;
        }
        const curveAmp = 0.06;
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
        const endTime = battleEndTimeRef.current.get(unitId);
        if (endTime) {
          const elapsed = now - endTime;
          if (elapsed < RETURN_MS) {
            const startOff = battleReturnOffsetRef.current.get(unitId) || { x: 0, y: 0 };
            const p = 1 - elapsed / RETURN_MS;
            battleOffsetX = startOff.x * p;
            battleOffsetY = startOff.y * p;
          } else {
            battleEndTimeRef.current.delete(unitId);
            battleReturnOffsetRef.current.delete(unitId);
          }
        }
      }

      // Update container position
      if (containerRef.current) {
        containerRef.current.x = interpX + battleOffsetX;
        containerRef.current.y = interpY + battleOffsetY;
      }

      // HP bar tween (reuse previous hpPrevRatio logic)
      const ratioTarget = unitMeta ? Math.max(0, unitMeta.hp) / (unitMeta.maxHp || 1) : 1;
      const prevRatioStored = hpPrevRatioRef.current.get(unitId);
      if (prevRatioStored === undefined) {
        hpPrevRatioRef.current.set(unitId, ratioTarget);
      }
      let ratioFrom = hpPrevRatioRef.current.get(unitId);
      const animStartExisting = hpAnimStartRef.current.get(unitId);
      const HP_ANIM_MS = 400;
      if (!animStartExisting && ratioFrom > ratioTarget) {
        hpAnimStartRef.current.set(unitId, now);
      }
      const animStart = hpAnimStartRef.current.get(unitId);
      let ratio = ratioTarget;
      if (animStart && ratioFrom !== undefined && ratioFrom > ratioTarget) {
        const t = Math.min(1, (now - animStart) / HP_ANIM_MS);
        ratio = ratioFrom + (ratioTarget - ratioFrom) * t;
        if (t === 1) {
          hpPrevRatioRef.current.set(unitId, ratioTarget);
          hpAnimStartRef.current.delete(unitId);
        }
      }

      // Redraw HP bar graphics
      if (hpBarRef.current) drawHpBar(hpBarRef.current, ratio);

      // when animation complete update prevPos so next tick interpolates correctly
      if (localT === 1) {
        prevPosRef.current.set(unitId, target);
      }
    });

    return (
      <pixiContainer ref={containerRef}>
        <pixiSprite texture={texture} anchor={0.5} scale={spriteScale} />
        <pixiGraphics ref={hpBarRef} draw={(g) => drawHpBar(g, 1)} />
      </pixiContainer>
    );
  });

  /*******************************
   * Target recomputation logic  *
   *******************************/

  // Utility to compute target positions for all units in current grid
  const computeTargets = () => {
    const targets = new Map();
    const meta = new Map();
    for (let r = 0; r < rows; r++) {
      const rowArr = Array.isArray(grid[r]) ? grid[r] : [];
      for (let c = 0; c < cols; c++) {
        const cell = rowArr[c];
        // Extract units correctly from the new grid structure
        let units = [];
        if (Array.isArray(cell)) {
          units = cell;
        } else if (cell && cell.type && (cell.type === 'castle' || cell.type === 'portal') && cell.units) {
          units = cell.units;
        }
        if (!units.length) continue;
        const players = units.filter(u => u.type === 'player');
        const enemies = units.filter(u => u.type === 'enemy');
        const cellInBattle = players.length && enemies.length;

        // helper to assign vertical slots within half-cell
        const assignSide = (arr, side) => {
          const count = arr.length;
          if (!count) return;
          const spacing = 0.8 / count; // vertical span inside side (±0.4)

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

  // Light-weight counter used only to refresh React when unit set changes.
  const [, forceRender] = React.useState(0);

  // Update target positions whenever the grid changes
  useEffect(() => {
    const prevMetaSnapshot = new Map(metaRef.current);
    const newTargets = computeTargets();

    // Detect battle start/end (maintain animation timers)
    for (let [id, newMeta] of metaRef.current.entries()) {
      const prevMeta = prevMetaSnapshot.get(id);
      if (newMeta.inBattle && (!prevMeta || !prevMeta.inBattle)) {
        battleStartTimeRef.current.set(id, Date.now());
      }
      if (prevMeta && prevMeta.inBattle && !newMeta.inBattle) {
        battleEndTimeRef.current.set(id, Date.now());

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
          let offX, offY;
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

    // Detect movements & update timestamps
    for (let [id, newPos] of newTargets.entries()) {
      const prevPos = targetPosRef.current.get(id);
      if (!prevPos) {
        prevPosRef.current.set(id, { ...newPos });
        moveTimeRef.current.set(id, Date.now());
      } else if (prevPos.x !== newPos.x || prevPos.y !== newPos.y) {
        prevPosRef.current.set(id, { ...prevPos });
        moveTimeRef.current.set(id, Date.now());
      }
    }

    // Clean up data for units that disappeared
    for (let id of Array.from(targetPosRef.current.keys())) {
      if (!newTargets.has(id)) {
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

    // Replace targets map
    targetPosRef.current = newTargets;

    // Trigger a single React refresh so new/removed UnitSprite components
    // are reconciled.  This runs once per server grid update, not every frame.
    forceRender(c => c + 1);
  }, [grid, rows, cols]);

  /***************   Memoised Drawers   ****************/
  const drawPortalColumn = useMemo(() => (g) => {
    g.clear();
    g.beginFill(0x663399);
    // Rightmost column
    g.drawRect(logicalWidth - 1, 0, 1, logicalHeight);
    g.endFill();
  }, [logicalWidth, logicalHeight]);

  const drawCastleColumn = useMemo(() => (g) => {
    g.clear();
    g.beginFill(0x336699);
    // Leftmost column
    g.drawRect(0, 0, 1, logicalHeight);
    g.endFill();
  }, [logicalHeight]);

  const drawGrid = useMemo(() => (g) => {
    g.clear();
    const lineColor = 0xffffff;
    const lineW = 0.04; // logical units (≈2px after scale≈50)
    // verticals (columns)
    for (let x = 0; x <= logicalWidth; x++) {
      g.beginFill(lineColor);
      g.drawRect(x - lineW / 2, 0, lineW, logicalHeight);
      g.endFill();
    }
    // horizontals (rows)
    for (let y = 0; y <= logicalHeight; y++) {
      g.beginFill(lineColor);
      g.drawRect(0, y - lineW / 2, logicalWidth, lineW);
      g.endFill();
    }
  }, [logicalWidth, logicalHeight]);

  const renderRowNumbers = () => {
    // Display numeric labels for each row
    const elements = [];
    // Scale text inversely so it stays a constant pixel size regardless of board scaling
    const textScale = 1 / scale;
    for (let y = 0; y < logicalHeight; y++) {
      elements.push(
        <pixiText
          key={`row-number-${y}`}
          text={`${y + 1}`}
          x={0.5}
          y={y + 0.5}
          anchor={{ x: 0.5, y: 0.5 }}
          scale={textScale}
          style={{
            fill: 0xffffff,
            fontFamily: 'Arial',
            fontSize: 24,
            stroke: 0x000000,
            strokeThickness: 4,
            dropShadow: true,
            dropShadowColor: 0x000000,
            dropShadowBlur: 2,
            dropShadowAngle: Math.PI / 4,
            dropShadowDistance: 2,
          }}
        />
      );
    }
    return elements;
  };

  /***************   Units Render   ****************/
  const renderUnits = () => {
    if (!textures) return null;
    return Array.from(targetPosRef.current.keys()).map((id) => (
      <UnitSprite key={id} unitId={id} />
    ));
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

  /***************   Structures Render   ****************/
  const renderStructures = () => {
    if (!textures) return null;
    const elems = [];
    const castleTex = textures['castle'];
    const portalTex = textures['portal'];
    // Desired sprite size to fit nicely within cell (90% of cell)
    const spriteSize = 0.9;
    const scaleCastle = spriteSize / (castleTex?.width || 64);
    const scalePortal = spriteSize / (portalTex?.width || 64);

    for (let y = 0; y < logicalHeight; y++) {
      // Castle column at x = 0
      elems.push(
        <pixiSprite
          key={`castle-${y}`}
          texture={castleTex}
          x={0.5}
          y={y + 0.5}
          anchor={0.5}
          scale={scaleCastle}
        />
      );
      // Portal column at x = logicalWidth - 0.5 (center of last column)
      elems.push(
        <pixiSprite
          key={`portal-${y}`}
          texture={portalTex}
          x={logicalWidth - 0.5}
          y={y + 0.5}
          anchor={0.5}
          scale={scalePortal}
        />
      );
    }
    return elems;
  };

  return (
    <Application {...appProps} background={0x222222}>
      <pixiContainer x={offsetX} y={offsetY} scale={scale}>
        {/* draw order: background tiles → structures → units */}
        {renderBackground()}
        {renderStructures()}
        {renderEffects()}
        {renderUnits()}
        {/* Row/column numeric labels */}
        {renderRowNumbers()}
      </pixiContainer>
    </Application>
  );
}
