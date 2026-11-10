import Phaser from 'phaser';
import { H, IngredientId, INGREDIENTS, POWER_LABEL, PowerId, W, WAVES } from '../core/constants';
import { GameManager } from '../core/GameManager';
import { RecipeManager } from '../core/RecipeManager';
import { Chef } from '../entities/Chef';
import { txt } from './text';

const D = 2000;
const ULT = { x: 322, y: 600, r: 32 };

/** Interface en jeu : vie, stand, chrono, or, commandes, inventaire, bouton d'ultime. */
export class Hud {
  private bars: Phaser.GameObjects.Graphics;
  private timer: Phaser.GameObjects.Text;
  private gold: Phaser.GameObjects.Text;
  private powers: Phaser.GameObjects.Text;
  private invTexts = {} as Record<IngredientId, Phaser.GameObjects.Text>;
  private slicedTexts = {} as Record<IngredientId, Phaser.GameObjects.Text>;
  private orderUi: Phaser.GameObjects.GameObject[] = [];
  private orderCounts: { text: Phaser.GameObjects.Text; ing: IngredientId; need: number }[] = [];
  private ultBtn: Phaser.GameObjects.Image;
  private ultRing: Phaser.GameObjects.Graphics;

  constructor(private scene: Phaser.Scene, private gm: GameManager, private chef: Chef, private recipes: RecipeManager, onUlt: () => void) {
    scene.add.rectangle(0, 0, W, 26, 0x14141f, 0.88).setOrigin(0).setDepth(D);
    scene.add.image(9, 8, 'coeur').setDepth(D + 1);
    scene.add.image(9, 19, 'ico_stand').setDepth(D + 1);
    this.bars = scene.add.graphics().setDepth(D + 1);
    this.timer = txt(scene, W / 2, 13, '').setOrigin(0.5).setDepth(D + 1);
    scene.add.image(W - 10, 13, 'piece').setDepth(D + 1);
    this.gold = txt(scene, W - 20, 13, '0', 8, '#ffd23e').setOrigin(1, 0.5).setDepth(D + 1);
    this.powers = txt(scene, W / 2, 70, '', 8, '#8fe0ff').setOrigin(0.5, 0).setDepth(D + 1);

    // inventaire
    scene.add.rectangle(2, H - 34, 186, 32, 0x14141f, 0.8).setOrigin(0).setDepth(D);
    INGREDIENTS.forEach((ing, i) => {
      const x = 14 + i * 46;
      scene.add.image(x, H - 18, 'ing_' + ing).setDepth(D + 1);
      this.invTexts[ing] = txt(scene, x + 11, H - 29, '0').setDepth(D + 1);
      this.slicedTexts[ing] = txt(scene, x + 11, H - 17, '', 8, '#8fe0ff').setDepth(D + 1);
    });

    // bouton d'ultime
    this.ultRing = scene.add.graphics().setDepth(D + 1);
    this.ultBtn = scene.add.image(ULT.x, ULT.y, 'bouton_ultime').setDepth(D + 2).setInteractive({ useHandCursor: true });
    this.ultBtn.on('pointerdown', onUlt);

    recipes.onChange = () => this.buildOrders();
    this.buildOrders();
  }

  /** Vrai si le point touche un élément d'interface (ne doit pas déclencher le joystick). */
  isUi(x: number, y: number): boolean {
    return Math.hypot(x - ULT.x, y - ULT.y) < ULT.r + 4;
  }

  private buildOrders(): void {
    this.orderUi.forEach((o) => o.destroy());
    this.orderUi = [];
    this.orderCounts = [];
    this.recipes.orders.forEach((o, i) => {
      const x = 4 + i * 178;
      const y = 29;
      const g = this.scene.add.graphics().setDepth(D);
      g.fillStyle(0x3b2414).fillRect(x, y, 174, 38);
      g.fillStyle(o.state === 'open' ? 0xf0dcae : 0xffe27a).fillRect(x + 1, y + 1, 172, 36);
      this.orderUi.push(g);
      const name = this.scene.add
        .text(x + 87, y + 4, o.recipe.name, { fontFamily: '"Press Start 2P"', fontSize: '8px', color: '#3b2414' })
        .setOrigin(0.5, 0)
        .setDepth(D + 1);
      this.orderUi.push(name);
      if (o.state !== 'open') {
        const label = o.state === 'cooking' ? 'CUISSON...' : 'PRET ! A SERVIR';
        this.orderUi.push(txt(this.scene, x + 87, y + 20, label, 8, '#ffffff').setOrigin(0.5, 0).setDepth(D + 1));
        return;
      }
      const needs = Object.entries(o.recipe.needs) as [IngredientId, number][];
      needs.forEach(([ing, need], j) => {
        const ix = x + 87 - (needs.length * 52) / 2 + j * 52 + 10;
        this.orderUi.push(this.scene.add.image(ix, y + 25, 'ing_' + ing).setDepth(D + 1));
        const t = txt(this.scene, ix + 10, y + 21, '', 8).setDepth(D + 1);
        this.orderUi.push(t);
        this.orderCounts.push({ text: t, ing, need });
      });
    });
  }

  refresh(time: number): void {
    const { gm, chef } = this;
    this.bars.clear();
    this.bars.fillStyle(0x000000).fillRect(18, 4, 72, 8).fillRect(18, 15, 72, 8);
    this.bars.fillStyle(0xe8483a).fillRect(19, 5, Math.round((70 * chef.hp) / chef.maxHp), 6);
    this.bars.fillStyle(0xe0a04a).fillRect(19, 16, Math.round((70 * gm.standHp) / gm.standMax), 6);

    const mm = Math.max(0, Math.ceil(gm.timeLeft));
    const clock = `${Math.floor(mm / 60)}:${String(mm % 60).padStart(2, '0')}`;
    const label =
      gm.phase === 'boss' ? 'BOSS !' : gm.phase === 'kitchen' ? `CUISINE ${clock}` : `VAGUE ${Math.min(gm.wave + 1, WAVES.length)}/${WAVES.length} ${clock}`;
    this.timer.setText(label).setColor(gm.phase === 'kitchen' ? '#ffd23e' : gm.phase === 'boss' ? '#ff6a5a' : '#ffffff');
    this.gold.setText(String(gm.gold));

    for (const ing of INGREDIENTS) {
      const s = chef.inv[ing];
      this.invTexts[ing].setText(String(s.n)).setAlpha(s.n ? 1 : 0.4);
      this.slicedTexts[ing].setText(s.sliced ? `x${s.sliced}` : '');
    }
    for (const c of this.orderCounts) {
      const have = chef.inv[c.ing].n;
      c.text.setText(`${Math.min(have, c.need)}/${c.need}`).setColor(have >= c.need ? '#2f8f2f' : '#b0392b');
    }

    const active = (Object.keys(chef.powers) as PowerId[]).filter((p) => chef.powers[p] > 0);
    this.powers.setText(active.map((p) => `${POWER_LABEL[p]} ${Math.ceil(chef.powers[p])}s`).join('\n'));

    // jauge d'ultime autour du bouton
    const ready = chef.ult >= 100;
    this.ultRing.clear();
    this.ultRing.lineStyle(4, 0x14141f, 0.9).strokeCircle(ULT.x, ULT.y, ULT.r);
    this.ultRing.lineStyle(4, ready ? 0xffe27a : 0xff8a1e, 1).beginPath();
    this.ultRing.arc(ULT.x, ULT.y, ULT.r, -Math.PI / 2, -Math.PI / 2 + (Math.PI * 2 * chef.ult) / 100).strokePath();
    this.ultBtn.setAlpha(ready ? 1 : 0.45).setScale(ready ? 1 + Math.sin(time / 120) * 0.05 : 0.9);
  }

  banner(text: string, color = '#ffc533', y = 330): void {
    const t = txt(this.scene, W / 2, y, text, 16, color).setOrigin(0.5).setDepth(D + 50).setStroke('#1b1b2b', 4).setScale(0.2);
    this.scene.tweens.add({ targets: t, scale: 1, duration: 250, ease: 'Back.out' });
    this.scene.tweens.add({ targets: t, alpha: 0, y: y - 20, delay: 1500, duration: 400, onComplete: () => t.destroy() });
  }

  float(x: number, y: number, text: string, color = '#ffd23e'): void {
    const t = txt(this.scene, Phaser.Math.Clamp(x, 40, W - 40), y, text, 8, color).setOrigin(0.5).setDepth(D - 10);
    this.scene.tweens.add({ targets: t, y: y - 26, alpha: 0, duration: 900, ease: 'Cubic.out', onComplete: () => t.destroy() });
  }
}
