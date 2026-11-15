import Phaser from 'phaser';
import { IngredientId, fitUi } from '../core/constants';

const LIFETIME = 30;

/** Ingrédient brut lâché au sol. Peut être tranché d'un glissement avant ramassage. */
export class Ingredient {
  sliced = false;
  collected = false;
  expired = false;
  private age = 0;
  private attracted = false;
  private left: Phaser.GameObjects.Image;
  private right: Phaser.GameObjects.Image;
  private gap = 0;

  constructor(private scene: Phaser.Scene, public type: IngredientId, public x: number, public y: number) {
    const key = 'ing_' + type;
    this.left = fitUi(scene.add.image(x, y, key));
    this.right = fitUi(scene.add.image(x, y, key));
    const w = this.left.width;
    const h = this.left.height;
    this.left.setCrop(0, 0, Math.floor(w / 2), h);
    this.right.setCrop(Math.floor(w / 2), 0, Math.ceil(w / 2), h);
    // petit saut à l'apparition
    scene.tweens.addCounter({
      from: 0, to: 1, duration: 350,
      onUpdate: (tw) => (this.pop = Math.sin((tw.getValue() ?? 0) * Math.PI) * 14),
    });
  }
  private pop = 0;

  /** Tranche l'ingrédient si le segment du glissement passe dessus. */
  trySlice(x1: number, y1: number, x2: number, y2: number, reach = 13): boolean {
    if (this.sliced || this.collected) return false;
    const cy = this.y - 6;
    const len2 = (x2 - x1) ** 2 + (y2 - y1) ** 2 || 1;
    const t = Phaser.Math.Clamp(((this.x - x1) * (x2 - x1) + (cy - y1) * (y2 - y1)) / len2, 0, 1);
    const d = Math.hypot(x1 + (x2 - x1) * t - this.x, y1 + (y2 - y1) * t - cy);
    if (d > reach) return false;
    this.sliced = true;
    this.scene.tweens.addCounter({ from: 0, to: 1, duration: 160, ease: 'Back.out', onUpdate: (tw) => (this.gap = (tw.getValue() ?? 0) * 3) });
    const flash = this.scene.add.image(this.x, this.y - 6, 'etincelle').setDepth(this.y + 2).setScale(0.4);
    this.scene.tweens.add({ targets: flash, scale: 1.3, alpha: 0, duration: 220, onComplete: () => flash.destroy() });
    return true;
  }

  update(dt: number, chefX: number, chefY: number, pickupRadius: number, time: number): void {
    this.age += dt;
    const dx = chefX - this.x;
    const dy = chefY - 10 - this.y;
    const dist = Math.hypot(dx, dy);
    if (dist < pickupRadius && this.age > 0.3) this.attracted = true;
    if (this.attracted) {
      const step = 260 * dt;
      if (dist <= step + 6) this.collected = true;
      else {
        this.x += (dx / dist) * step;
        this.y += (dy / dist) * step;
      }
    } else if (this.age > LIFETIME) this.expired = true;

    const blink = this.age > LIFETIME - 5 && Math.floor(time / 120) % 2 === 0;
    const bob = Math.sin(time / 250 + this.x) * 1.2;
    const y = Math.round(this.y - 8 - this.pop + bob);
    this.left.setPosition(Math.round(this.x - this.gap), y).setAngle(-this.gap * 5).setAlpha(blink ? 0.3 : 1).setDepth(this.y);
    this.right.setPosition(Math.round(this.x + this.gap), y).setAngle(this.gap * 5).setAlpha(blink ? 0.3 : 1).setDepth(this.y);
  }

  destroy(): void {
    this.left.destroy();
    this.right.destroy();
  }
}
