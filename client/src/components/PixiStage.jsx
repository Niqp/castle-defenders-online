import React, { useMemo } from 'react';
import { Application, extend } from '@pixi/react'; // Reverted Stage to Application
import { Container, Graphics } from 'pixi.js';
extend({ Container, Graphics });

const LOGICAL_WIDTH = 1600;
const LOGICAL_HEIGHT = 900;

// Logical to canvas coordinate mapping (within the LOGICAL_WIDTH x LOGICAL_HEIGHT space)
function logicalToCanvas(x, y) {
  const px = LOGICAL_WIDTH / 2 + (x / 40) * (LOGICAL_WIDTH / 2 * 0.9);
  const py = LOGICAL_HEIGHT * 0.1 + (y / 100) * (LOGICAL_HEIGHT * 0.8);
  return { x: px, y: py };
}

// Draw road, castle, portal using LOGICAL_WIDTH and LOGICAL_HEIGHT
const drawRoad = (g) => {
  g.clear();
  const roadTop = logicalToCanvas(0, 0);
  const roadBot = logicalToCanvas(0, 100);
  g.rect(roadTop.x - LOGICAL_WIDTH * 0.03, roadTop.y, LOGICAL_WIDTH * 0.06, roadBot.y - roadTop.y);
  g.fill({ color: 0x444444 });
};

const drawCastle = (g) => {
  g.clear();
  const castlePos = logicalToCanvas(0, 100);
  g.rect(castlePos.x - LOGICAL_WIDTH * 0.028, castlePos.y - LOGICAL_HEIGHT * 0.08, LOGICAL_WIDTH * 0.056, LOGICAL_HEIGHT * 0.13);
  g.fill({ color: 0xaaaaee });
};

const drawPortal = (g) => {
  g.clear();
  const portalPos = logicalToCanvas(0, 0);
  g.circle(portalPos.x, portalPos.y, Math.min(LOGICAL_WIDTH, LOGICAL_HEIGHT) * 0.045);
  g.fill({ color: 0x9933cc });
};

function getEnemyColor(type) {
  return {
    goblin: 0x44ee44,
    orc: 0x888888,
    troll: 0x9966cc,
  }[type] || 0xff0000;
}

function getUnitColor(type) {
  if (type === 'Swordsman') return 0xaaaaaa;
  if (type === 'Archer') return 0x44bbee;
  if (type === 'Knight') return 0xeecc44;
  return 0xdddddd;
}

// Player spawn logic using LOGICAL_WIDTH and LOGICAL_HEIGHT
function getPlayerSpawns(playerNames) {
  if (!playerNames || playerNames.length === 0) return [logicalToCanvas(0, 100)]; // Default spawn at castle
  return playerNames.map((_, i) => {
    const n = playerNames.length;
    const x = n === 1 ? 0 : -30 + (60 * i) / (n - 1); // Logical x coordinate
    return logicalToCanvas(x, 100); // y=100 is castle line
  });
}

export default function PixiStage({
  width = 800, // Actual component width
  height = 600, // Actual component height
  enemies = [],
  units = [],
  playerNames = [],
}) {
  const scale = Math.min(width / LOGICAL_WIDTH, height / LOGICAL_HEIGHT);
  const gameAreaWidth = LOGICAL_WIDTH * scale;
  const gameAreaHeight = LOGICAL_HEIGHT * scale;
  const offsetX = (width - gameAreaWidth) / 2;
  const offsetY = (height - gameAreaHeight) / 2;

  const playerSpawns = useMemo(() => getPlayerSpawns(playerNames), [playerNames]);

  const drawRoadMemo = useMemo(() => g => drawRoad(g), []);
  const drawCastleMemo = useMemo(() => g => drawCastle(g), []);
  const drawPortalMemo = useMemo(() => g => drawPortal(g), []);

  // Define base sizes in logical units
  const SPAWN_RADIUS = LOGICAL_WIDTH * 0.012;
  const ENEMY_RADIUS = LOGICAL_WIDTH * 0.02;
  const UNIT_WIDTH = LOGICAL_WIDTH * 0.015; // Approx 24 for LOGICAL_WIDTH 1600
  const UNIT_HEIGHT = LOGICAL_HEIGHT * 0.04; // Approx 36 for LOGICAL_HEIGHT 900

  const HP_BAR_HEIGHT_ENEMY = ENEMY_RADIUS * 0.25;
  const HP_BAR_OFFSET_Y_ENEMY = ENEMY_RADIUS * 0.3;

  const HP_BAR_HEIGHT_UNIT = UNIT_HEIGHT * 0.15;
  const HP_BAR_OFFSET_Y_UNIT = UNIT_HEIGHT * 0.1;

  return (
    <Application 
      width={width} 
      height={height} 
      background={0x222222}
      // resolution={typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1} // Temporarily commented out
      // autoDensity={true} // Temporarily commented out
    >
      <pixiContainer x={offsetX} y={offsetY} scale={scale}>
        <pixiGraphics draw={drawRoadMemo} />
        <pixiGraphics draw={drawCastleMemo} />
        <pixiGraphics draw={drawPortalMemo} />
        
        {playerSpawns.map((pos, i) => (
          <pixiGraphics
            key={"spawn-" + i}
            draw={g => {
              g.clear();
              g.circle(0, 0, SPAWN_RADIUS);
              g.fill({ color: 0x44bbee });
            }}
            x={pos.x}
            y={pos.y}
          />
        ))}
        
        {enemies.map(enemy => {
          const pos = logicalToCanvas(enemy.x, enemy.y);
          return (
            <pixiGraphics
              key={"enemy-" + enemy.id}
              draw={g => {
                g.clear();
                g.circle(0, 0, ENEMY_RADIUS);
                g.fill({ color: getEnemyColor(enemy.type) });
                
                const hpPerc = Math.max(0, enemy.hp / (enemy.maxHp || 30));
                const hpBarCenterY = -(ENEMY_RADIUS + HP_BAR_OFFSET_Y_ENEMY + HP_BAR_HEIGHT_ENEMY / 2);
                g.rect(-ENEMY_RADIUS, hpBarCenterY - HP_BAR_HEIGHT_ENEMY / 2, ENEMY_RADIUS * 2, HP_BAR_HEIGHT_ENEMY);
                g.fill({ color: 0xff0000 });
                g.rect(-ENEMY_RADIUS, hpBarCenterY - HP_BAR_HEIGHT_ENEMY / 2, ENEMY_RADIUS * 2 * hpPerc, HP_BAR_HEIGHT_ENEMY);
                g.fill({ color: 0x00ff00 });
              }}
              x={pos.x}
              y={pos.y}
            />
          );
        })}
        
        {units.map(unit => {
          const pos = logicalToCanvas(unit.x, unit.y);
          return (
            <pixiGraphics
              key={"unit-" + unit.id}
              draw={g => {
                g.clear();
                g.rect(-UNIT_WIDTH / 2, -UNIT_HEIGHT / 2, UNIT_WIDTH, UNIT_HEIGHT);
                g.fill({ color: getUnitColor(unit.type) });
                
                const hpPerc = Math.max(0, unit.hp / (unit.maxHp || 30));
                const hpBarCenterY = -(UNIT_HEIGHT / 2 + HP_BAR_OFFSET_Y_UNIT + HP_BAR_HEIGHT_UNIT / 2);
                g.rect(-UNIT_WIDTH / 2, hpBarCenterY - HP_BAR_HEIGHT_UNIT / 2, UNIT_WIDTH, HP_BAR_HEIGHT_UNIT);
                g.fill({ color: 0xff0000 });
                g.rect(-UNIT_WIDTH / 2, hpBarCenterY - HP_BAR_HEIGHT_UNIT / 2, UNIT_WIDTH * hpPerc, HP_BAR_HEIGHT_UNIT);
                g.fill({ color: 0x00ff00 });
              }}
              x={pos.x}
              y={pos.y}
            />
          );
        })}
      </pixiContainer>
    </Application>
  );
}
