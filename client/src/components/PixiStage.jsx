import React, { useMemo } from 'react';
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
    for (let r = 0; r < rows; r++) {
      const rowArr = Array.isArray(grid[r]) ? grid[r] : [];
      for (let c = 0; c < cols; c++) {
        const cell = rowArr[c];
        const units = Array.isArray(cell) ? cell : cell ? [cell] : [];
        const { x: cx, y: cy } = cellCenter(r, c);
        units.forEach((unit, idx) => {
          const { dx, dy } = offsetWithinCell(idx, units.length, 0.25);
          const posX = cx + dx;
          const posY = cy + dy;
          const key = unit.id;
          if (unit.type === 'enemy') {
            elements.push(
              <pixiGraphics
                key={key}
                x={posX}
                y={posY}
                draw={(g) => {
                  g.clear();
                  g.beginFill(0xff5555);
                  g.drawCircle(0, 0, 0.35);
                  g.endFill();

                  const hpPerc = unit.maxHealth ? Math.max(0, unit.health / unit.maxHealth) : 1;
                  g.beginFill(0xff0000);
                  g.drawRect(-0.35, 0.45, 0.7, 0.1);
                  g.endFill();
                  g.beginFill(0x00ff00);
                  g.drawRect(-0.35, 0.45, 0.7 * hpPerc, 0.1);
                  g.endFill();
                }}
              />
            );
          } else {
            elements.push(
              <pixiGraphics
                key={key}
                x={posX}
                y={posY}
                draw={(g) => {
                  g.clear();
                  g.beginFill(0x44bbee);
                  g.drawRect(-0.4, -0.5, 0.8, 1);
                  g.endFill();

                  const hpPerc = unit.maxHealth ? Math.max(0, unit.health / unit.maxHealth) : 1;
                  g.beginFill(0xff0000);
                  g.drawRect(-0.4, -0.65, 0.8, 0.1);
                  g.endFill();
                  g.beginFill(0x00ff00);
                  g.drawRect(-0.4, -0.65, 0.8 * hpPerc, 0.1);
                  g.endFill();
                }}
              />
            );
          }
        });
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
