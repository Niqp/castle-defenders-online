import React, { useMemo } from 'react';
import { Application, extend } from '@pixi/react';
import { Container, Graphics } from 'pixi.js';
extend({ Container, Graphics });

// Logical to canvas coordinate mapping
function logicalToCanvas(x, y, width, height) {
  const px = width / 2 + (x / 40) * (width / 2 * 0.9);
  const py = height * 0.1 + (y / 100) * (height * 0.8);
  return { x: px, y: py };
}

// Draw road, castle, portal
const drawRoad = (g, width, height) => {
  g.clear();
  const roadTop = logicalToCanvas(0, 0, width, height);
  const roadBot = logicalToCanvas(0, 100, width, height);
  g.rect(roadTop.x - width * 0.03, roadTop.y, width * 0.06, roadBot.y - roadTop.y);
  g.fill({ color: 0x444444 });
};

const drawCastle = (g, width, height) => {
  g.clear();
  const castlePos = logicalToCanvas(0, 100, width, height);
  g.rect(castlePos.x - width * 0.028, castlePos.y - height * 0.08, width * 0.056, height * 0.13);
  g.fill({ color: 0xaaaaee });
};

const drawPortal = (g, width, height) => {
  g.clear();
  const portalPos = logicalToCanvas(0, 0, width, height);
  g.circle(portalPos.x, portalPos.y, Math.min(width, height) * 0.045);
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

// Player spawn logic
function getPlayerSpawns(playerNames, width, height) {
  if (!playerNames || playerNames.length === 0) return [{ x: 0, y: 100 }];
  return playerNames.map((_, i) => {
    const n = playerNames.length;
    const x = n === 1 ? 0 : -30 + (60 * i) / (n - 1);
    return logicalToCanvas(x, 100, width, height);
  });
}

export default function PixiStage({
  width = 800,
  height = 600,
  enemies = [],
  units = [],
  playerNames = [],
}) {
  // Memoize spawn points
  const playerSpawns = useMemo(() => getPlayerSpawns(playerNames, width, height), [playerNames, width, height]);

  // Memoized draw callbacks for static objects
  const drawRoadMemo = useMemo(() => g => drawRoad(g, width, height), [width, height]);
  const drawCastleMemo = useMemo(() => g => drawCastle(g, width, height), [width, height]);
  const drawPortalMemo = useMemo(() => g => drawPortal(g, width, height), [width, height]);

  return (
    <Application width={width} height={height} background={0x222222}>
      <pixiContainer>
        <pixiGraphics draw={drawRoadMemo} />
        <pixiGraphics draw={drawCastleMemo} />
        <pixiGraphics draw={drawPortalMemo} />
        {/* Player spawns */}
        {playerSpawns.map((pos, i) => (
          <pixiGraphics
            key={"spawn-" + i}
            draw={g => {
              g.clear();
              g.circle(0, 0, Math.max(10, width * 0.012));
              g.fill({ color: 0x44bbee });
            }}
            x={pos.x}
            y={pos.y}
          />
        ))}
        {/* Enemies */}
        {enemies.map(enemy => {
          const pos = logicalToCanvas(enemy.x, enemy.y, width, height);
          return (
            <pixiGraphics
              key={"enemy-" + enemy.id}
              draw={g => {
                g.clear();
                g.circle(0, 0, Math.max(18, width * 0.02));
                g.fill({ color: getEnemyColor(enemy.type) });
                // HP Bar
                const hpPerc = Math.max(0, enemy.hp / (enemy.maxHp || 30));
                g.rect(-18, -30, 36, 6);
                g.fill({ color: 0xff0000 });
                g.rect(-18, -30, 36 * hpPerc, 6);
                g.fill({ color: 0x00ff00 });
              }}
              x={pos.x}
              y={pos.y}
            />
          );
        })}
        {/* Units */}
        {units.map(unit => {
          const pos = logicalToCanvas(unit.x, unit.y, width, height);
          return (
            <pixiGraphics
              key={"unit-" + unit.id}
              draw={g => {
                g.clear();
                g.rect(-12, -18, 24, 36);
                g.fill({ color: getUnitColor(unit.type) });
                // HP Bar
                const hpPerc = Math.max(0, unit.hp / (unit.maxHp || 30));
                g.rect(-12, -30, 24, 6);
                g.fill({ color: 0xff0000 });
                g.rect(-12, -30, 24 * hpPerc, 6);
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
