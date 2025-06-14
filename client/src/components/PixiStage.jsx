import React, { useMemo, useRef, useEffect } from 'react';
import { Application, extend } from '@pixi/react';
import { Container, Graphics } from 'pixi.js';

extend({ Container, Graphics });

/******************************
 * Utility helpers            *
 ******************************/
// Logical coordinates: one unit per cell (so logical width = cols, height = rows)
const cellCenter = (row, col) => ({ x: col + 0.5, y: row + 0.5 });

const offsetWithinCell = (index, total, radius) => {
  if (total === 1) return { dx: 0, dy: 0 };
  const angle = (Math.PI * 2 * index) / total;
  return { dx: Math.cos(angle) * radius, dy: Math.sin(angle) * radius };
};

/******************************
 * PixiStage Component        *
 ******************************/
export default function PixiStage({ width = 800, height = 600, grid = [] }) {
  const rows = grid && grid.length ? grid.length : 1;
  const cols = grid && grid.length && Array.isArray(grid[0]) ? grid[0].length : 1;

  // each logical unit (cell) maps to this many screen pixels
  const scale = Math.min(width / cols, height / rows);
  const gameAreaWidth = cols * scale;
  const gameAreaHeight = rows * scale;
  const offsetX = (width - gameAreaWidth) / 2;
  const offsetY = (height - gameAreaHeight) / 2;

  /***************   Animation state refs   ****************/
  const prevPosRef = useRef(new Map());            // id -> {x,y}
  const targetPosRef = useRef(new Map());          // id -> {x,y}
  const metaRef = useRef(new Map());               // id -> {hp,maxHp,type}
  const lastUpdateRef = useRef(Date.now());

  const ANIM_MS = 300; // duration of movement tween
  // Constant circle radius (logical units) chosen small enough to fit many units per cell
  const UNIT_RADIUS = 0.15;

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

  // when targets updated, trigger immediate render so circles appear
  useEffect(() => {
    setFrameTick(f => f + 1);
  }, [grid]);

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

        // helper to assign horizontal slots within half-cell
        const assignHalf = (arr, half) => {
          const count = arr.length;
          if (!count) return;
          // Available horizontal span inside the half-cell (±0.4 from centre)
          const spacing = 0.8 / count;

          arr.forEach((unit, idx) => {
            const base = cellCenter(r, c);
            const yHalfOffset = half === 'top' ? -0.25 : 0.25;
            const xOffset = -0.4 + spacing * (idx + 0.5);
            targets.set(unit.id, {
              x: base.x + xOffset,
              y: base.y + yHalfOffset,
            });
            meta.set(unit.id, { hp: unit.health, maxHp: unit.maxHealth, type: unit.type });
          });
        };

        assignHalf(enemies, 'top');
        assignHalf(players, 'bottom');
      }
    }
    metaRef.current = meta;
    return targets;
  };

  // Update target positions when grid changes
  useEffect(() => {
    targetPosRef.current = computeTargets();
    // keep any previous positions for interpolation; if a unit is new, set prev=target so no pop-in
    for (let [id, pos] of targetPosRef.current.entries()) {
      if (!prevPosRef.current.has(id)) prevPosRef.current.set(id, { ...pos });
    }
    // Remove positions for units that disappeared
    for (let id of Array.from(prevPosRef.current.keys())) {
      if (!targetPosRef.current.has(id)) prevPosRef.current.delete(id);
    }
    lastUpdateRef.current = Date.now();
  }, [grid, rows, cols]);

  /***************   Memoised Drawers   ****************/
  const drawPortalRow = useMemo(() => (g) => {
    g.clear();
    g.beginFill(0x663399);
    g.drawRect(0, 0, cols, 1);
    g.endFill();
  }, [cols]);

  const drawCastleRow = useMemo(() => (g) => {
    g.clear();
    g.beginFill(0x336699);
    g.drawRect(0, rows - 1, cols, 1);
    g.endFill();
  }, [cols, rows]);

  const drawGrid = useMemo(() => (g) => {
    g.clear();
    const lineColor = 0xffffff;
    const lineW = 0.04; // logical units (≈2px after scale≈50)
    // verticals
    for (let c = 0; c <= cols; c++) {
      g.beginFill(lineColor);
      g.drawRect(c - lineW / 2, 0, lineW, rows);
      g.endFill();
    }
    // horizontals
    for (let r = 0; r <= rows; r++) {
      g.beginFill(lineColor);
      g.drawRect(0, r - lineW / 2, cols, lineW);
      g.endFill();
    }
  }, [rows, cols]);

  /***************   Units Render   ****************/
  const renderUnits = () => {
    const elements = [];
    const now = Date.now();
    const t = Math.min(1, (now - lastUpdateRef.current) / ANIM_MS);

    for (let [id, target] of targetPosRef.current.entries()) {
      const prev = prevPosRef.current.get(id) || target;
      const interpX = prev.x + (target.x - prev.x) * t;
      const interpY = prev.y + (target.y - prev.y) * t;
      const radius = UNIT_RADIUS;
      const meta = metaRef.current.get(id);
      const ratio = meta ? Math.max(0, meta.hp) / (meta.maxHp || 1) : 1;
      const unitType = meta?.type || (id.startsWith('enemy') ? 'enemy' : 'player');

      const drawFn = (g) => {
        g.clear();
        // Draw circle
        g.beginFill(unitType === 'enemy' ? 0xff5555 : 0x44bbee);
        g.drawCircle(0, 0, radius);
        g.endFill();

        // Draw HP bar background
        const barWidth = radius * 2;
        const barHeight = 0.08; // logical units
        const barY = -radius - 0.15;
        g.beginFill(0x333333);
        g.drawRect(-radius, barY, barWidth, barHeight);
        g.endFill();

        // Draw HP bar fill
        g.beginFill(0x00ff00);
        g.drawRect(-radius, barY, barWidth * ratio, barHeight);
        g.endFill();
      };

      elements.push(
        <pixiGraphics
          key={id}
          x={interpX}
          y={interpY}
          draw={drawFn}
        />
      );

      // when animation complete update prevPos
      if (t === 1) {
        prevPosRef.current.set(id, target);
      }
    }
    return elements;
  };

  return (
    <Application width={width} height={height} background={0x222222}>
      <pixiContainer x={offsetX} y={offsetY} scale={scale}>
        {/* draw order: backgrounds → grid → units */}
        <pixiGraphics draw={drawPortalRow} />
        <pixiGraphics draw={drawCastleRow} />
        <pixiGraphics draw={drawGrid} />
        {renderUnits()}
      </pixiContainer>
    </Application>
  );
}
