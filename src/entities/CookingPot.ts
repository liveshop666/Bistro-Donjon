import Phaser from 'phaser';
import { COOK_TIME, uiScale } from '../core/constants';
import { Order } from '../core/RecipeManager';

/** La marmite : cuisson automatique d'une commande, puis plat à récupérer. */
export class CookingPot {
  state: 'idle' | 'cooking' | 'ready' = 'idle';
  order: Order | null = null;
  private timer = 0;
  private total = 1;
  private sprite: Phaser.GameObjects.Image;
  private bar: Phaser.GameObjects.Graphics;
  private ready: Phaser.GameObjects.Image;

  constructor(scene: Phaser.Scene, public x: number, public y: number) {
    scene.add.ellipse(x, y, 40, 10, 0x000000, 0.3).setDepth(y - 1);
    this.sprite = scene.add.image(x, y + 2, 'marmite').setOrigin(0.5, 1).setDepth(y);
    this.bar = scene.add.graphics().setDepth(y + 1);
    this.ready = scene.add.image(x, y - 50, 'plat').setDepth(y + 2).setVisible(false).setScale(uiScale('plat'));
  }

  /** @param slicedFraction part d'ingrédients tranchés (cuisson jusqu'à 2x plus rapide) */
  start(order: Order, slicedFraction: number, speedMul: number): void {
    this.order = order;
    this.state = 'cooking';
    this.total = this.timer = COOK_TIME * (1 - 0.5 * slicedFraction) * speedMul;
  }

  /** Le chef récupère le plat prêt. */
  take(): Order | null {
    const o = this.order;
    this.order = null;
    this.state = 'idle';
    return o;
  }

  update(dt: number, time: number): void {
    this.bar.clear();
    if (this.state === 'cooking') {
      this.timer -= dt;
      const p = 1 - Math.max(0, this.timer) / this.total;
      this.bar.fillStyle(0x1b1b2b).fillRect(this.x - 17, this.y - 52, 34, 6);
      this.bar.fillStyle(0xffc533).fillRect(this.x - 16, this.y - 51, Math.round(32 * p), 4);
      this.sprite.setScale(1 + Math.sin(time / 60) * 0.03, 1 - Math.sin(time / 60) * 0.03);
      if (this.timer <= 0) {
        this.state = 'ready';
        if (this.order) this.order.state = 'ready';
      }
    } else this.sprite.setScale(1);
    this.ready.setVisible(this.state === 'ready').setY(this.y - 52 + Math.sin(time / 140) * 3);
  }
}
