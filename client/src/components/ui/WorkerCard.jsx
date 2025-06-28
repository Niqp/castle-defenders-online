import React, { useState, useEffect, useRef, useMemo } from 'react';

// Import sprites
import castleImg from '../../sprites/buildings/castle.png';
import goldmineImg from '../../sprites/buildings/goldmine.png';
import farmImg from '../../sprites/buildings/farm.png';
import goldImg from '../../sprites/buildings/gold.png';
import foodImg from '../../sprites/buildings/food.png';

const BUILDING_SPRITES = {
  gold: goldmineImg,
  food: farmImg
};

const RESOURCE_SPRITES = {
  gold: goldImg,
  food: foodImg
};

export default function WorkerCard({ 
  worker, 
  workerSprite, 
  onHire, 
  canAfford, 
  disabled,
  workerConfig 
}) {
  /* --------------------------
   * Sprite asset caching
   * -------------------------- */
  const workerImage = useMemo(() => {
    const img = new Image();
    img.src = workerSprite;
    return img;
  }, [workerSprite]);
  const castleImage = useMemo(() => {
    const img = new Image();
    img.src = castleImg;
    return img;
  }, []);
  const buildingKey = useMemo(() => {
    const outputs = workerConfig?.outputs || { gold: 1 };
    return outputs.food ? 'food' : 'gold';
  }, [workerConfig]);
  const buildingImage = useMemo(() => {
    const img = new Image();
    img.src = BUILDING_SPRITES[buildingKey];
    return img;
  }, [buildingKey]);
  const resourceImage = useMemo(() => {
    const img = new Image();
    img.src = RESOURCE_SPRITES[buildingKey];
    return img;
  }, [buildingKey]);

  /* --------------------------
   * Layout refs & state & sizing constants
   * -------------------------- */
  const SPRITE_SIZE = 32;            // Castle / Building sprite size
  const WORKER_SIZE = 16;            // Animated worker sprite
  const RESOURCE_SIZE = 12;          // Carried resource sprite
  const HALF_SPRITE = SPRITE_SIZE / 2;
  const HALF_WORKER = WORKER_SIZE / 2;

  const cardRef = useRef(null);
  const canvasRef = useRef(null);
  const [canvasSize, setCanvasSize] = useState({ w: 1, h: 1 });

  // Dynamic worker cap (3 for strong devices, else 2)
  const MAX_WORKERS = useMemo(
    () => (navigator.hardwareConcurrency >= 4 ? 50 : 25),
    []
  );

  // Worker simulation objects
  const workersRef = useRef([]); // {offset}

  /* --------------------------
   * Resize observer -> rescale canvas
   * -------------------------- */
  useEffect(() => {
    const updateSize = () => {
      if (!cardRef.current) return;
      const rect = cardRef.current.getBoundingClientRect();
      // Reserve 32px for new taller bottom bar
      setCanvasSize({ w: rect.width, h: rect.height - 32 });
    };

    updateSize();
    const ro = new ResizeObserver(updateSize);
    if (cardRef.current) ro.observe(cardRef.current);
    return () => ro.disconnect();
  }, []);

  /* --------------------------
   * Manage visible workers when count changes
   * -------------------------- */
  useEffect(() => {
    const target = Math.min(worker.current, MAX_WORKERS);
    const arr = workersRef.current;
    while (arr.length < target) arr.push({ offset: Math.random() * 3000 });
    while (arr.length > target) arr.pop();
  }, [worker.current, MAX_WORKERS]);

  /* --------------------------
   * Animation loop
   * -------------------------- */
  useEffect(() => {
    let running = true;
    let last = performance.now();
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;

    const DURATION = 3000; // ms for full round trip
    const speed = 1 / DURATION;

    const draw = (now) => {
      if (!running) return;
      const dt = now - last;
      last = now;

      // Clear
      ctx.clearRect(0, 0, canvasSize.w, canvasSize.h);

      // Compute path endpoints (sprite centres)
      const castleX = HALF_SPRITE + 8; // margin 8px
      const castleY = canvasSize.h / 2;
      const buildX = canvasSize.w - (HALF_SPRITE + 8);
      const buildY = castleY;

      // Draw static sprites
      ctx.drawImage(castleImage, castleX - HALF_SPRITE, castleY - HALF_SPRITE, SPRITE_SIZE, SPRITE_SIZE);
      ctx.drawImage(buildingImage, buildX - HALF_SPRITE, buildY - HALF_SPRITE, SPRITE_SIZE, SPRITE_SIZE);

      // Walk each visible worker
      workersRef.current.forEach((w, idx) => {
        w.offset = (w.offset + dt) % DURATION;
        const t = w.offset / DURATION; // 0→1
        const forward = t < 0.5;
        const prog = forward ? t * 2 : (t - 0.5) * 2; // 0→1 both ways
        const x = forward
          ? castleX + (buildX - castleX) * prog
          : buildX - (buildX - castleX) * prog;
        const y = castleY + ((idx % 3) - 1) * 6; // slightly larger lane offset

        ctx.save();
        ctx.translate(x, y);
        ctx.scale(forward ? 1 : -1, 1);
        ctx.drawImage(workerImage, -HALF_WORKER, -HALF_WORKER, WORKER_SIZE, WORKER_SIZE);
        ctx.restore();

        // Draw resource when coming back
        if (!forward) {
          ctx.drawImage(resourceImage, x + HALF_WORKER - 2, y - HALF_WORKER - 6, RESOURCE_SIZE, RESOURCE_SIZE);
        }
      });

      requestAnimationFrame(draw);
    };
    requestAnimationFrame(draw);
    return () => {
      running = false;
    };
  }, [canvasSize, workerImage, buildingImage, castleImage, resourceImage]);

  /* --------------------------
   * Click-to-hire helpers
   * -------------------------- */
  const hireDisabled = disabled || !canAfford;
  const handleClick = (e) => {
    if (!hireDisabled && !e.target.closest('button')) onHire();
  };

  return (
    <div
      ref={cardRef}
      className={`worker-card relative overflow-hidden rounded-lg bg-gradient-to-r from-base-300 to-base-400 border-2 border-base-200 shadow-lg ${
        hireDisabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'
      }`}
      style={{ height: 110 }}
      onClick={handleClick}
    >
      <canvas
        ref={canvasRef}
        width={canvasSize.w}
        height={canvasSize.h}
        className="block"
      />

      {/* Bottom bar */}
      <div className="absolute bottom-0 inset-x-0 bg-black/90 text-white text-xs px-2 py-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1 truncate">
          <img src={workerSprite} alt="w" className="w-5 h-5" />
          <span className="font-semibold truncate max-w-[6rem]">{worker.type}</span>
          <span className="badge badge-accent badge-xs">x{worker.current}</span>
          <span className="hidden sm:inline opacity-70 ml-1">
            {Object.entries(worker.cost)
              .map(([r, v]) => `${v}${r[0].toUpperCase()}`)
              .join('/')}
          </span>
        </div>
        <button
          className="btn btn-secondary btn-xs"
          disabled={hireDisabled}
          onClick={onHire}
        >
          Hire
        </button>
      </div>
    </div>
  );
} 