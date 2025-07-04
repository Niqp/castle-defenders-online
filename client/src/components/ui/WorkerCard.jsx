import React, { useState, useEffect, useRef, useMemo, createContext, useContext } from 'react';

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

/****************************************************************
 * ============================================================ *
 *  PERFORMANCE PATCH – shared animation context               *
 * ------------------------------------------------------------ *
 *  Replace individual RAF loops with a single shared ticker   *
 *  that updates all visible WorkerCards. Add intersection     *
 *  observer to pause off-screen animations.                   *
 * ============================================================ *
 ****************************************************************/

// Module-level sprite cache to prevent duplicate Image objects
const SPRITE_CACHE = new Map();
const getCachedImage = (src) => {
  if (!SPRITE_CACHE.has(src)) {
    const img = new Image();
    img.src = src;
    SPRITE_CACHE.set(src, img);
  }
  return SPRITE_CACHE.get(src);
};

// Shared animation context
const WorkerAnimationContext = createContext();

export const WorkerAnimationProvider = ({ children }) => {
  const cardsRef = useRef(new Map()); // cardId -> { canvas, workers, isVisible, ... }
  const rafIdRef = useRef(null);
  
  const registerCard = (cardId, cardData) => {
    cardsRef.current.set(cardId, { ...cardData, isVisible: true });
    
    // Start animation loop if not already running
    if (!rafIdRef.current) {
      startAnimation();
    }
  };
  
  const unregisterCard = (cardId) => {
    cardsRef.current.delete(cardId);
    
    // Stop animation if no cards remain
    if (cardsRef.current.size === 0 && rafIdRef.current) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }
  };
  
  const updateCardVisibility = (cardId, isVisible) => {
    const card = cardsRef.current.get(cardId);
    if (card) {
      card.isVisible = isVisible;
    }
  };
  
  const updateCardWorkers = (cardId, workers) => {
    const card = cardsRef.current.get(cardId);
    if (card) {
      card.workers = workers;
    }
  };
  
  const updateCardData = (cardId, newData) => {
    const card = cardsRef.current.get(cardId);
    if (card) {
      Object.assign(card, newData);
    }
  };
  
  const startAnimation = () => {
    const DURATION = 3000; // ms for full round trip
    
    const animate = (now) => {
      
      // Update all visible cards
      for (const [cardId, cardData] of cardsRef.current.entries()) {
        if (!cardData.isVisible || !cardData.canvas) continue;
        
        const { canvas, workers, canvasSize, images } = cardData;
        const ctx = canvas.getContext('2d');
        if (!ctx) continue;
        
        // Clear canvas
        ctx.clearRect(0, 0, canvasSize.w, canvasSize.h);
        
        // Compute path endpoints
        const SPRITE_SIZE = 32;
        const WORKER_SIZE = 16;
        const RESOURCE_SIZE = 12;
        const HALF_SPRITE = SPRITE_SIZE / 2;
        const HALF_WORKER = WORKER_SIZE / 2;
        
        const castleX = HALF_SPRITE + 8;
        const castleY = canvasSize.h / 2;
        const buildX = canvasSize.w - (HALF_SPRITE + 8);
        const buildY = castleY;
        
        // Draw static sprites (always show them)
        if (images.castle && images.castle.complete) {
          ctx.drawImage(images.castle, castleX - HALF_SPRITE, castleY - HALF_SPRITE, SPRITE_SIZE, SPRITE_SIZE);
        }
        if (images.building && images.building.complete) {
          ctx.drawImage(images.building, buildX - HALF_SPRITE, buildY - HALF_SPRITE, SPRITE_SIZE, SPRITE_SIZE);
        }
        
        // Animate workers (only if there are any)
        if (!workers || workers.length === 0) continue;
        
        workers.forEach((w, idx) => {
          // Use current time with worker's initial offset for smooth animation
          const elapsed = (now - w.startTime) % DURATION;
          const t = elapsed / DURATION;
          const forward = t < 0.5;
          const prog = forward ? t * 2 : (t - 0.5) * 2;
          const x = forward
            ? castleX + (buildX - castleX) * prog
            : buildX - (buildX - castleX) * prog;
          const y = castleY + ((idx % 3) - 1) * 6;
          
          if (images.worker && images.worker.complete) {
            ctx.save();
            ctx.translate(x, y);
            ctx.scale(forward ? 1 : -1, 1);
            ctx.drawImage(images.worker, -HALF_WORKER, -HALF_WORKER, WORKER_SIZE, WORKER_SIZE);
            ctx.restore();
          }
          
          // Draw resource when coming back
          if (!forward && images.resource && images.resource.complete) {
            ctx.drawImage(images.resource, x + HALF_WORKER - 2, y - HALF_WORKER - 6, RESOURCE_SIZE, RESOURCE_SIZE);
          }
        });
      }
      
      rafIdRef.current = requestAnimationFrame(animate);
    };
    
    rafIdRef.current = requestAnimationFrame(animate);
  };
  
  return (
    <WorkerAnimationContext.Provider value={{
      registerCard,
      unregisterCard,
      updateCardVisibility,
      updateCardWorkers,
      updateCardData
    }}>
      {children}
    </WorkerAnimationContext.Provider>
  );
};

export default function WorkerCard({ 
  worker, 
  workerSprite, 
  onHire, 
  canAfford, 
  disabled,
  workerConfig,
  upgrades = {},
  upgradeTypes = {}
  }) {
  const animationContext = useContext(WorkerAnimationContext);
  
  /* --------------------------
   * Helper functions for upgrade effects
   * -------------------------- */
  const getUpgradeEffect = (upgradeType, level, effectKey, defaultValue) => {
    if (!upgradeType || level === 0) return defaultValue;
    const levelData = upgradeType.levels?.find(l => l.level === level);
    return levelData?.effect[effectKey] ?? defaultValue;
  };

  const getUpgradedProduction = (baseOutputs) => {
    if (!baseOutputs || !upgrades || !upgradeTypes) return baseOutputs;
    
    const productivityLevel = upgrades.WORKER_PRODUCTIVITY || 0;
    if (productivityLevel === 0) return baseOutputs;
    
    const multiplier = getUpgradeEffect(upgradeTypes.WORKER_PRODUCTIVITY, productivityLevel, 'workerMultiplier', 1);
    
    const upgradedOutputs = {};
    Object.entries(baseOutputs).forEach(([resource, amount]) => {
      // Preserve decimal precision and round to 1 decimal place for display
      upgradedOutputs[resource] = Math.round(amount * multiplier * 10) / 10;
    });
    
    return upgradedOutputs;
  };

  /* --------------------------
   * Cached sprite assets
   * -------------------------- */
  const images = useMemo(() => ({
    worker: getCachedImage(workerSprite),
    castle: getCachedImage(castleImg),
    building: getCachedImage(BUILDING_SPRITES[workerConfig?.outputs?.food ? 'food' : 'gold']),
    resource: getCachedImage(RESOURCE_SPRITES[workerConfig?.outputs?.food ? 'food' : 'gold'])
  }), [workerSprite, workerConfig]);

  /* --------------------------
   * Layout refs & state
   * -------------------------- */
  const cardRef = useRef(null);
  const canvasRef = useRef(null);
  const [canvasSize, setCanvasSize] = useState({ w: 1, h: 1 });
  const cardIdRef = useRef(`worker-${worker.type}-${Math.random()}`);
  
  // Dynamic worker cap
  const MAX_WORKERS = useMemo(
    () => (navigator.hardwareConcurrency >= 4 ? 50 : 25),
    []
  );

  // Worker simulation objects
  const workersRef = useRef([]);

  /* --------------------------
   * Intersection Observer for visibility
   * -------------------------- */
  useEffect(() => {
    if (!cardRef.current || !animationContext) return;
    
    const observer = new IntersectionObserver(
      ([entry]) => {
        animationContext.updateCardVisibility(cardIdRef.current, entry.isIntersecting);
      },
      { threshold: 0.1 }
    );
    
    observer.observe(cardRef.current);
    return () => observer.disconnect();
  }, [animationContext]);

  /* --------------------------
   * Resize observer
   * -------------------------- */
  useEffect(() => {
    const updateSize = () => {
      if (!cardRef.current) return;
      const rect = cardRef.current.getBoundingClientRect();
      setCanvasSize({ w: rect.width, h: rect.height - 48 }); // Increased from 32 to 48 for two-line bottom bar
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
    while (arr.length < target) {
      // Give each worker a random start time offset so they don't move in sync
      const randomOffset = Math.random() * 3000; // 0-3000ms random offset
      arr.push({ startTime: performance.now() - randomOffset });
    }
    while (arr.length > target) arr.pop();
    
    // Update animation context
    if (animationContext) {
      animationContext.updateCardWorkers(cardIdRef.current, arr);
    }
  }, [worker.current, MAX_WORKERS, animationContext]);

  /* --------------------------
   * Register/unregister with animation context
   * -------------------------- */
  useEffect(() => {
    if (!animationContext || !canvasRef.current) return;
    
    animationContext.registerCard(cardIdRef.current, {
      canvas: canvasRef.current,
      workers: workersRef.current,
      canvasSize,
      images
    });
    
    return () => {
      animationContext.unregisterCard(cardIdRef.current);
    };
  }, [animationContext, canvasSize, images]);

  /* --------------------------
   * Force initial render when images load
   * -------------------------- */
  useEffect(() => {
    if (!animationContext) return;
    
    // Update context data when images change/load
    animationContext.updateCardData?.(cardIdRef.current, {
      images,
      canvasSize
    });
  }, [images.castle, images.building, images.worker, images.resource, animationContext, canvasSize]);

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
      style={{ height: 125 }}
      onClick={handleClick}
    >
      <canvas
        ref={canvasRef}
        width={canvasSize.w}
        height={canvasSize.h}
        className="block pointer-events-none"
        style={{ touchAction: 'pan-y' }}
      />

      {/* Bottom bar with detailed info */}
      <div className="absolute bottom-0 inset-x-0 bg-black/90 text-white text-xs px-2 py-2">
        <div className="flex items-center justify-between gap-2 mb-1">
          <div className="flex items-center gap-1">
            <img src={workerSprite} alt="w" className="w-5 h-5" />
            <span className="font-semibold">{worker.type}</span>
            <span className="badge badge-accent badge-xs">x{worker.current}</span>
          </div>
          <button
            className="btn btn-secondary btn-xs"
            disabled={hireDisabled}
            onClick={onHire}
          >
            Hire
          </button>
        </div>
        
        {/* Cost information */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            <span className="opacity-70">Cost:</span>
            {/* Check if costs are different to show upgrade pricing */}
            {worker.originalCost && JSON.stringify(worker.cost) !== JSON.stringify(worker.originalCost) ? (
              <>
                <span className="text-green-400 font-medium">
                  {Object.entries(worker.cost)
                    .map(([r, v]) => `${v}${r[0].toUpperCase()}`)
                    .join(' / ')}
                </span>
                <span className="line-through opacity-50 text-xs">
                  {Object.entries(worker.originalCost)
                    .map(([r, v]) => `${v}${r[0].toUpperCase()}`)
                    .join(' / ')}
                </span>
              </>
            ) : (
              <span className="font-medium">
                {Object.entries(worker.cost)
                  .map(([r, v]) => `${v}${r[0].toUpperCase()}`)
                  .join(' / ')}
              </span>
            )}
          </div>
          
          {/* Production info */}
          {workerConfig?.outputs && (
            <div className="flex items-center gap-1">
              {(() => {
                const baseOutputs = workerConfig.outputs;
                const upgradedOutputs = getUpgradedProduction(baseOutputs);
                const hasUpgrades = JSON.stringify(baseOutputs) !== JSON.stringify(upgradedOutputs);
                
                return (
                  <div className="flex items-center gap-1">
                    <span className="opacity-70 text-xs">Produces:</span>
                    {hasUpgrades ? (
                      <>
                        <span className="text-blue-400 font-medium text-xs">
                          +{Object.entries(upgradedOutputs)
                            .map(([r, v]) => `${v % 1 === 0 ? v : v.toFixed(1)}${r[0].toUpperCase()}`)
                            .join('/')}/s
                        </span>
                        <span className="line-through opacity-50 text-xs">
                          +{Object.entries(baseOutputs)
                            .map(([r, v]) => `${v % 1 === 0 ? v : v.toFixed(1)}${r[0].toUpperCase()}`)
                            .join('/')}/s
                        </span>
                      </>
                    ) : (
                      <span className="font-medium text-xs">
                        +{Object.entries(baseOutputs)
                          .map(([r, v]) => `${v % 1 === 0 ? v : v.toFixed(1)}${r[0].toUpperCase()}`)
                          .join('/')}/s
                      </span>
                    )}
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 