import * as PIXI from 'pixi.js';

/**
 * Modular PixiJS Canvas System
 * Handles responsive canvas, object rendering, and spawn logic.
 */
export default class PixiCanvas {
  constructor(container, {
    onCastleClick = null,
    width = window.innerWidth,
    height = window.innerHeight * 0.7
  } = {}) {
    this.container = container;
    this.onCastleClick = onCastleClick;
    this.app = new PIXI.Application({
      width,
      height,
      background: '#222',
      resizeTo: container || window
    });
    this.enemySprites = {};
    this.unitSprites = {};
    this._setupStage();
    this._attachView();
    this._setupResize();
  }

  _setupStage() {
    this.app.stage.removeChildren();
    // Road, castle, portal containers
    this.road = new PIXI.Graphics();
    this.castle = new PIXI.Graphics();
    this.portal = new PIXI.Graphics();
    this.enemyContainer = new PIXI.Container();
    this.unitContainer = new PIXI.Container();
    this.app.stage.addChild(this.road);
    this.app.stage.addChild(this.castle);
    this.app.stage.addChild(this.portal);
    this.app.stage.addChild(this.enemyContainer);
    this.app.stage.addChild(this.unitContainer);
    this._drawStaticObjects();
  }

  _attachView() {
    if (this.container) {
      this.container.innerHTML = '';
      this.container.appendChild(this.app.view);
    }
  }

  _setupResize() {
    window.addEventListener('resize', this.resize.bind(this));
    this.resize();
  }

  resize() {
    const width = this.container ? this.container.offsetWidth : window.innerWidth;
    const height = this.container ? this.container.offsetHeight : window.innerHeight * 0.7;
    this.app.renderer.resize(width, height);
    this._drawStaticObjects();
    // Optionally reposition dynamic objects here
  }

  // Map logical coordinates (x: -40~40, y: 0~100) to canvas pixels
  logicalToCanvas(x, y) {
    const w = this.app.renderer.width;
    const h = this.app.renderer.height;
    // x: -40 (left), 0 (center), 40 (right)
    // y: 0 (top/portal), 100 (castle/bottom)
    const px = w/2 + (x/40) * (w/2 * 0.9); // 90% width for spread
    const py = h * 0.1 + (y/100) * (h * 0.8); // 10% margin top, 80% for playfield
    return {x: px, y: py};
  }

  _drawStaticObjects() {
    const w = this.app.renderer.width;
    const h = this.app.renderer.height;
    // Road (vertical, center)
    this.road.clear();
    const roadTop = this.logicalToCanvas(0, 0);
    const roadBot = this.logicalToCanvas(0, 100);
    this.road.beginFill(0x444444);
    this.road.drawRect(roadTop.x - w*0.03, roadTop.y, w*0.06, roadBot.y-roadTop.y);
    this.road.endFill();
    // Castle (center, y=100)
    this.castle.clear();
    const castlePos = this.logicalToCanvas(0, 100);
    this.castle.beginFill(0xaaaaee);
    this.castle.drawRect(castlePos.x - w*0.028, castlePos.y - h*0.08, w*0.056, h*0.13);
    this.castle.endFill();
    // Portal (top center, y=0)
    this.portal.clear();
    const portalPos = this.logicalToCanvas(0, 0);
    this.portal.beginFill(0x9933cc);
    this.portal.drawCircle(portalPos.x, portalPos.y, Math.min(w, h)*0.045);
    this.portal.endFill();
  }

  /**
   * Set up player spawn points (evenly distributed along bottom or sides)
   * @param {Array<string>} playerNames
   */
  setPlayerSpawns(playerNames) {
    // Distribute logical x along [-30, 30] at y=100
    this.playerSpawns = playerNames.map((_, i) => {
      const n = playerNames.length;
      const x = n === 1 ? 0 : -30 + (60 * i) / (n-1);
      return { x, y: 100 };
    });
  }

  /**
   * Get spawn point for a player index
   */
  getPlayerSpawn(index) {
    return this.playerSpawns ? this.playerSpawns[index] : {x: 0, y: 0};
  }

  /**
   * Render enemies and units
   */
  renderObjects({enemies = [], units = []}) {
    this._renderSprites(this.enemyContainer, this.enemySprites, enemies, 'enemy');
    this._renderSprites(this.unitContainer, this.unitSprites, units, 'unit');
  }

  _renderSprites(container, spriteMap, objects, type) {
    // Remove old
    for (const id in spriteMap) {
      if (!objects.find(o => o.id === id)) {
        container.removeChild(spriteMap[id]);
        spriteMap[id].destroy();
        delete spriteMap[id];
      }
    }
    // Add/update
    for (const obj of objects) {
      let sprite = spriteMap[obj.id];
      if (!sprite) {
        sprite = new PIXI.Graphics();
        if (type === 'enemy') {
          sprite.beginFill(this._getEnemyColor(obj.type));
          sprite.drawCircle(0, 0, Math.max(18, this.app.renderer.width*0.02));
        } else {
          let color = 0xdddddd;
          if (obj.type === 'Swordsman') color = 0xaaaaaa;
          if (obj.type === 'Archer') color = 0x44bbee;
          if (obj.type === 'Knight') color = 0xeecc44;
          sprite.beginFill(color);
          sprite.drawRect(-12, -18, 24, 36);
        }
        sprite.endFill();
        container.addChild(sprite);
        spriteMap[obj.id] = sprite;
        // HP bar
        sprite.hpBar = new PIXI.Graphics();
        sprite.addChild(sprite.hpBar);
      }
      sprite._data = obj;
      // Map logical to canvas coordinates
      const pos = this.logicalToCanvas(obj.x, obj.y);
      sprite.x = pos.x;
      sprite.y = pos.y;
      // HP bar
      const hpPerc = Math.max(0, obj.hp / (obj.maxHp || 30));
      sprite.hpBar.clear();
      sprite.hpBar.beginFill(0xff0000);
      sprite.hpBar.drawRect(-18, -30, 36, 6);
      sprite.hpBar.endFill();
      sprite.hpBar.beginFill(0x00ff00);
      sprite.hpBar.drawRect(-18, -30, 36 * hpPerc, 6);
      sprite.hpBar.endFill();
    }
  }

  _getEnemyColor(type) {
    return {
      goblin: 0x44ee44,
      orc: 0x888888,
      troll: 0x9966cc
    }[type] || 0xff0000;
  }

  destroy() {
    window.removeEventListener('resize', this.resize.bind(this));
    this.app.destroy(true, true);
  }
}
