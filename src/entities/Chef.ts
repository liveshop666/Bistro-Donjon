import Phaser from 'phaser';
import { ChefDef, PowerId } from '../core/constants';
import { emptyInventory, Inventory, Order } from '../core/RecipeManager';
import anchors from '../core/spriteAnchors.json';

/** Le chef jouable : déplacement, vie, inventaire, pouvoirs temporaires. */
export class Chef {
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  facing = 1;
  aim = new Phaser.Math.Vector2(0, 1);
  invuln = 0;
  cooldown = 0;
  /** Jauge d'ultime, 0..100. */
  ult = 0;
  /** Durée restante de l'ultime actif (Tornade Flambée). */
  ultActive = 0;
  inv: Inventory = emptyInventory();
  dish: Order | null = null;
  powers: Record<PowerId, number> = { vitesse: 0, feu: 0, regen: 0, bouclier: 0 };
  moving = false;

  private sprite: Phaser.GameObjects.Image;
  private shadow: Phaser.GameObjects.Ellipse;
  private dishIcon: Phaser.GameObjects.Image;
  private walkT = 0;
  private lunge = 0;
  private anchor: number;

  constructor(scene: Phaser.Scene, public def: ChefDef, x: number, y: number) {
    this.x = x;
    this.y = y;
    this.hp = this.maxHp = def.hp;
    this.anchor = (anchors as Record<string, number>)[def.id] ?? 0.5;
    this.shadow = scene.add.ellipse(x, y, 26, 8, 0x000000, 0.3);
    this.sprite = scene.add.image(x, y, def.id).setOrigin(this.anchor, 1);
    this.dishIcon = scene.add.image(x, y, 'plat').setVisible(false);
  }

  move(dir: Phaser.Math.Vector2, speed: number, dt: number, bounds: Phaser.Geom.Rectangle): void {
    this.moving = dir.lengthSq() > 0.01;
    if (this.moving) {
      this.x = Phaser.Math.Clamp(this.x + dir.x * speed * dt, bounds.left, bounds.right);
      this.y = Phaser.Math.Clamp(this.y + dir.y * speed * dt, bounds.top, bounds.bottom);
      if (Math.abs(dir.x) > 0.15) this.facing = dir.x > 0 ? 1 : -1;
      this.walkT += dt * (speed / 9);
    }
  }

  /** Oriente le chef vers une cible et joue un petit élan d'attaque. */
  strike(tx: number, ty: number): void {
    this.aim.set(tx - this.x, ty - this.y).normalize();
    if (Math.abs(this.aim.x) > 0.15) this.facing = this.aim.x > 0 ? 1 : -1;
    this.lunge = 1;
  }

  hurt(n: number): boolean {
    if (this.invuln > 0) return false;
    this.hp = Math.max(0, this.hp - n);
    this.invuln = 0.9;
    return true;
  }

  heal(n: number): void {
    this.hp = Math.min(this.maxHp, this.hp + n);
  }

  addUlt(n: number): void {
    this.ult = Math.min(100, this.ult + n);
  }

  updateVisual(dt: number, time: number): void {
    this.invuln = Math.max(0, this.invuln - dt);
    this.lunge = Math.max(0, this.lunge - dt * 7);
    const bob = this.moving ? Math.abs(Math.sin(this.walkT)) * 3 : Math.sin(time / 300) * 0.8;
    const spin = this.ultActive > 0;
    const flip = spin ? Math.floor(time / 70) % 2 === 0 : this.facing < 0;
    this.sprite
      .setFlipX(flip)
      .setOrigin(flip ? 1 - this.anchor : this.anchor, 1)
      .setPosition(Math.round(this.x + this.aim.x * this.lunge * 5), Math.round(this.y - bob + this.aim.y * this.lunge * 5))
      .setAngle(this.moving ? Math.sin(this.walkT) * 4 : 0)
      .setAlpha(this.invuln > 0 && Math.floor(time / 80) % 2 === 0 ? 0.35 : 1)
      .setDepth(this.y);
    this.shadow.setPosition(this.x, this.y - 1).setDepth(this.y - 1);
    this.dishIcon
      .setVisible(this.dish !== null)
      .setPosition(this.x, this.y - 54 + Math.sin(time / 150) * 1.5)
      .setDepth(this.y + 1);
  }
}
