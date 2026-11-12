import Phaser from 'phaser';
import { ENEMIES, EnemyDef, EnemyId, H, W } from '../core/constants';
import anchors from '../core/spriteAnchors.json';

export interface EnemyApi {
  chefX: number;
  chefY: number;
  standLine: number;
  shoot(x: number, y: number, tx: number, ty: number): void;
  summon(x: number, y: number): void;
  shake(): void;
}

/** Monstre-ingrédient. Le comportement dépend de `def.ai`. */
export class Enemy {
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  def: EnemyDef;
  radius: number;
  dead = false;
  stun = 0;
  /** Délai avant la prochaine attaque contre le stand. */
  standAtk = 1;
  knifeCd = 0;

  private sprite: Phaser.GameObjects.Image;
  private shadow: Phaser.GameObjects.Ellipse;
  private anchor: number;
  private t = Math.random() * 10;
  private timer = 1.5 + Math.random();
  private state: 'chase' | 'windup' | 'charge' = 'chase';
  private stateT = 3;
  private summonT = 5;
  private dir = new Phaser.Math.Vector2();
  private hop = 0;
  private flash = 0;
  private faceLeft = false;

  constructor(private scene: Phaser.Scene, type: EnemyId, x: number, y: number, hpMul: number, public mini = false) {
    this.def = ENEMIES[type];
    this.x = x;
    this.y = y;
    const scale = mini ? 0.6 : 1;
    this.radius = this.def.radius * scale;
    this.hp = this.maxHp = Math.round(this.def.hp * hpMul * (mini ? 0.4 : 1));
    this.anchor = (anchors as Record<string, number>)[type] ?? 0.5;
    this.shadow = scene.add.ellipse(x, y, this.radius * 2.2, this.radius * 0.7, 0x000000, 0.3);
    this.sprite = scene.add.image(x, y, type === 'gelee' ? 'gelee_1' : type === 'champi' ? 'champi_w0' : type).setScale(scale);
    this.sprite.setOrigin(this.anchor, type === 'tomate' ? 0.5 : 1);
  }

  get atStand(): boolean {
    return this.y <= this.standY + 2;
  }
  private standY = 0;

  update(dt: number, api: EnemyApi): void {
    this.t += dt;
    this.knifeCd -= dt;
    this.flash -= dt;
    this.standY = api.standLine + this.radius;
    if (this.stun > 0) {
      this.stun -= dt;
      this.render();
      return;
    }
    const dx = api.chefX - this.x;
    const dy = api.chefY - this.y;
    const dist = Math.hypot(dx, dy) || 1;
    let vx = 0;
    let vy = 0;

    switch (this.def.ai) {
      case 'stand': // avance en ligne droite vers le stand
        vy = -this.def.speed;
        if (this.x < 20) vx = this.def.speed;
        else if (this.x > W - 20) vx = -this.def.speed;
        break;
      case 'chase':
        vx = (dx / dist) * this.def.speed;
        vy = (dy / dist) * this.def.speed;
        break;
      case 'hop': {
        // bondit par à-coups
        this.timer -= dt;
        if (this.timer <= 0) {
          this.timer = 0.9;
          this.dir.set(dx / dist, dy / dist);
        }
        const jumping = this.timer > 0.45;
        this.hop = jumping ? Math.sin(((this.timer - 0.45) / 0.45) * Math.PI) : 0;
        if (jumping) {
          vx = this.dir.x * this.def.speed * 2.4;
          vy = this.dir.y * this.def.speed * 2.4;
        }
        break;
      }
      case 'ranged': {
        // reste à distance et crache des boules de feu
        const want = dist > 150 ? 1 : dist < 100 ? -1 : 0;
        vx = (dx / dist) * this.def.speed * want + (-dy / dist) * this.def.speed * 0.5 * Math.sin(this.t);
        vy = (dy / dist) * this.def.speed * want + (dx / dist) * this.def.speed * 0.5 * Math.sin(this.t);
        this.timer -= dt;
        if (this.timer <= 0 && this.y < H - 10 && this.x > 0 && this.x < W) {
          this.timer = 2.6;
          api.shoot(this.x, this.y - 12, api.chefX, api.chefY - 14);
        }
        break;
      }
      case 'boss':
        [vx, vy] = this.boss(dt, dx / dist, dy / dist, api);
        break;
    }

    this.x += vx * dt;
    this.y += vy * dt;
    if (this.y < this.standY) this.y = this.standY;
    if (Math.abs(vx) > 2) this.faceLeft = vx < 0;
    if (this.def.id === 'tomate') this.sprite.rotation += (vx * dt) / this.radius;
    this.render();
  }

  private boss(dt: number, nx: number, ny: number, api: EnemyApi): [number, number] {
    this.stateT -= dt;
    this.summonT -= dt;
    if (this.summonT <= 0 && this.y < H) {
      this.summonT = 7;
      api.summon(this.x, this.y);
    }
    if (this.state === 'chase') {
      if (this.stateT <= 0 && this.y < H - 40) {
        this.state = 'windup';
        this.stateT = 0.7;
      }
      return [nx * this.def.speed, ny * this.def.speed];
    }
    if (this.state === 'windup') {
      if (this.stateT <= 0) {
        this.state = 'charge';
        this.stateT = 0.7;
        this.dir.set(nx, ny);
      }
      return [0, 0];
    }
    if (this.stateT <= 0) {
      this.state = 'chase';
      this.stateT = 3.2;
      api.shake();
    }
    return [this.dir.x * 230, this.dir.y * 230];
  }

  hit(dmg: number): void {
    this.hp -= dmg;
    this.flash = 0.08;
  }

  separate(other: Enemy): void {
    const dx = other.x - this.x;
    const dy = other.y - this.y;
    const min = this.radius + other.radius;
    const d2 = dx * dx + dy * dy;
    if (d2 >= min * min || d2 === 0) return;
    const d = Math.sqrt(d2);
    const push = (min - d) / 2;
    const wa = this.def.ai === 'boss' ? 0 : 1;
    const wb = other.def.ai === 'boss' ? 0 : 1;
    this.x -= (dx / d) * push * wa;
    this.y -= (dy / d) * push * wa;
    other.x += (dx / d) * push * wb;
    other.y += (dy / d) * push * wb;
  }

  private render(): void {
    const s = this.mini ? 0.6 : 1;
    const flying = this.def.id === 'piment' ? 10 + Math.sin(this.t * 5) * 2 : 0; // seul le piment ailé vole
    const lift = this.hop * 12 + flying;
    const squash = 1;
    // images d'animation
    if (this.def.id === 'gelee') {
      const landed = this.hop === 0 && this.timer > 0.3;
      this.sprite.setTexture(this.hop > 0.5 ? 'gelee_0' : this.hop > 0 ? 'gelee_1' : landed ? 'gelee_3' : this.timer > 0.15 ? 'gelee_2' : 'gelee_1');
    } else if (this.def.id === 'champi') {
      const step = Math.floor(this.t * 4) % 2;
      const key = this.atStand ? (step ? 'champi_a0' : 'champi_w0') : step ? 'champi_w1' : 'champi_w0';
      this.sprite.setTexture(key);
      this.anchor = (anchors as Record<string, number>)[key] ?? 0.5;
    }
    const wobble = this.def.ai === 'stand' && !this.atStand ? Math.sin(this.t * 6) * 3 : 0;
    const yOff = this.def.id === 'tomate' ? this.sprite.displayHeight / 2 : 0;
    this.sprite
      .setFlipX(this.def.id === 'tomate' ? false : this.faceLeft)
      .setOrigin(this.faceLeft && this.def.id !== 'tomate' ? 1 - this.anchor : this.anchor, this.def.id === 'tomate' ? 0.5 : 1)
      .setPosition(Math.round(this.x), Math.round(this.y - lift - yOff))
      .setScale(s * (2 - squash), s * squash)
      .setDepth(this.y);
    if (this.def.id !== 'tomate') this.sprite.setAngle(wobble);
    if (this.flash > 0) this.sprite.setTintFill(0xffffff);
    else if (this.stun > 0) this.sprite.setTint(0x88aaff);
    else if (this.state === 'windup') this.sprite.setTint(Math.floor(this.t * 14) % 2 ? 0xff5555 : 0xffffff);
    else this.sprite.clearTint();
    this.shadow.setPosition(this.x, this.y - 1).setDepth(this.y - 1);
  }

  /** Retire le monstre ; avec `animated`, joue d'abord une petite animation d'écrasement. */
  destroy(animated = false): void {
    this.shadow.destroy();
    if (!animated) {
      this.sprite.destroy();
      return;
    }
    const sp = this.sprite;
    if (this.def.id === 'tomate') sp.setTexture('tomate_ko').setRotation(0);
    sp.setTintFill(0xffffff);
    this.scene.time.delayedCall(60, () => sp.active && sp.clearTint());
    this.scene.tweens.add({ targets: sp, scaleY: sp.scaleY * 0.35, scaleX: sp.scaleX * 1.35, alpha: 0, duration: 260, ease: 'Cubic.in', onComplete: () => sp.destroy() });
  }
}
