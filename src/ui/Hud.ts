import Phaser from 'phaser';
import { COMBO_SIZE, IngredientId, INGREDIENTS, ORDER_PATIENCE, POWER_LABEL, PowerId, W, WAVES } from '../core/constants';
import { GameManager } from '../core/GameManager';
import { RecipeManager } from '../core/RecipeManager';
import { Chef } from '../entities/Chef';
import { txt } from './text';
import { RES } from '../core/layout';

const D = 2000;

/** Interface en jeu : vie, stand, chrono, or, commandes, inventaire, bouton d'ultime. */
export class Hud {
  // Positions en portrait : ultime en bas à droite, sous le bouton d'attaque (choix de Rudy, 12/11).
  // En paysage elles sont recalculées dans le constructeur (bandeau de droite).
  private ULT = { x: 322, y: 594, r: 32 };
  /** Bouton d'attaque : sous le pouce droit, on le garde appuyé pour frapper en continu. */
  private ATK = { x: 316, y: 512, r: 34 };
  /** Bouton PAUSE en bas de l'écran, facile à atteindre. */
  private PAUSE = { x: 233, y: 622, w: 70, h: 26 };
  /** Largeur de l'écran (canvas) et mode paysage. */
  private sw = W;
  private land = false;
  /** Tous les objets de l'interface fixe (pour les caméras en paysage et pour tout détruire). */
  private own = new Set<Phaser.GameObjects.GameObject>();
  private releaseFn: (p: Phaser.Input.Pointer) => void;
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
  private atkBtn: Phaser.GameObjects.Graphics;
  private atkIcon: Phaser.GameObjects.Image;
  /** Identifiant du doigt posé sur le bouton d'attaque (-1 : relâché). */
  private atkPointer = -1;
  private patience: Phaser.GameObjects.Graphics;
  private combo: Phaser.GameObjects.Text;
  private rival: Phaser.GameObjects.Text;
  /** Score du rival en duel (null en solo). */
  rivalInfo: { name: string; gold: number } | null = null;

  constructor(private scene: Phaser.Scene, private gm: GameManager, private chef: Chef, private recipes: RecipeManager, onUlt: () => void, onPause: () => void) {
    const before = new Set(scene.children.list);
    const sw = scene.scale.width / RES;
    const sh = scene.scale.height / RES;
    const land = sw > sh;
    this.sw = sw;
    this.land = land;
    if (land) {
      // paysage (façon jeu de tir mobile, maquette validée par Rudy le 12/11) : tout flotte par-dessus la map
      this.ATK = { x: sw - 64, y: sh - 66, r: 42 };
      this.ULT = { x: sw - 150, y: sh - 50, r: 32 };
      this.PAUSE = { x: -100, y: -100, w: 0, h: 0 }; // pas de bouton PAUSE en bas : celui du haut à droite suffit
    }
    const { ATK, ULT } = this;

    if (land) {
      scene.add.rectangle(0, 0, 100, 26, 0x14141f, 0.8).setOrigin(0).setDepth(D);
      scene.add.rectangle(sw / 2 - 70, 0, 140, 26, 0x14141f, 0.8).setOrigin(0).setDepth(D);
      scene.add.rectangle(sw - 104, 0, 104, 26, 0x14141f, 0.8).setOrigin(0).setDepth(D);
    } else scene.add.rectangle(0, 0, W, 26, 0x14141f, 0.88).setOrigin(0).setDepth(D);
    scene.add.image(9, 8, 'coeur').setDepth(D + 1);
    scene.add.image(9, 19, 'ico_stand').setDepth(D + 1);
    this.bars = scene.add.graphics().setDepth(D + 1);
    this.timer = txt(scene, sw / 2, 13, '').setOrigin(0.5).setDepth(D + 1);
    scene.add.image(sw - 12, 13, 'ico_pause').setDepth(D + 1).setInteractive({ useHandCursor: true }).on('pointerdown', onPause);
    if (land) scene.add.zone(sw - 16, 14, 36, 30).setDepth(D + 3).setInteractive({ useHandCursor: true }).on('pointerdown', onPause);
    scene.add.image(sw - 32, 13, 'piece').setDepth(D + 1);
    this.patience = scene.add.graphics().setDepth(D + 2);
    this.combo = txt(scene, 6, land ? 32 : 70, '', 8, '#ffc533').setDepth(D + 1).setStroke('#14141f', 3);
    this.rival = txt(scene, sw - 6, land ? 32 : 70, '', 8, '#ff9d8a').setOrigin(1, 0).setDepth(D + 1).setStroke('#14141f', 3);
    this.gold = txt(scene, sw - 42, 13, '0', 8, '#ffd23e').setOrigin(1, 0.5).setDepth(D + 1);
    this.powers = txt(scene, sw / 2, land ? 72 : 84, '', 8, '#8fe0ff').setOrigin(0.5, 0).setDepth(D + 1).setStroke('#14141f', 3);

    // inventaire
    const invX = land ? Math.round(sw / 2 - 93) : 2;
    scene.add.rectangle(invX, sh - 34, 186, 32, 0x14141f, 0.8).setOrigin(0).setDepth(D);
    INGREDIENTS.forEach((ing, i) => {
      const x = invX + 12 + i * 46;
      scene.add.image(x, sh - 18, 'ing_' + ing).setDepth(D + 1);
      this.invTexts[ing] = txt(scene, x + 11, sh - 29, '0').setDepth(D + 1);
      this.slicedTexts[ing] = txt(scene, x + 11, sh - 17, '', 8, '#8fe0ff').setDepth(D + 1);
    });

    // bouton d'ultime
    this.ultRing = scene.add.graphics().setDepth(D + 1);
    this.ultBtn = scene.add.image(ULT.x, ULT.y, 'bouton_ultime').setDepth(D + 2).setInteractive({ useHandCursor: true });
    this.ultBtn.on('pointerdown', onUlt);

    // bouton d'attaque (maintenir pour frapper)
    this.atkBtn = scene.add.graphics().setDepth(D + 1);
    this.atkIcon = scene.add.image(ATK.x, ATK.y, 'couteau').setDepth(D + 2).setScale(2.4).setAngle(45);
    scene.add
      .zone(ATK.x, ATK.y, ATK.r * 2 + 8, ATK.r * 2 + 8)
      .setDepth(D + 3)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', (p: Phaser.Input.Pointer) => (this.atkPointer = p.id));
    this.releaseFn = (p: Phaser.Input.Pointer) => {
      if (p.id === this.atkPointer) this.atkPointer = -1;
    };
    scene.input.on('pointerup', this.releaseFn);
    scene.input.on('pointerupoutside', this.releaseFn);

    // bouton PAUSE en bas (celui du haut reste aussi) ; pas en paysage
    if (!land) this.bottomPause(onPause);

    for (const o of scene.children.list) if (!before.has(o)) this.own.add(o);
    recipes.onChange = () => this.buildOrders();
    this.buildOrders();
  }

  private bottomPause(onPause: () => void): void {
    const { scene, PAUSE } = this;
    const pg = scene.add.graphics().setDepth(D);
    pg.fillStyle(0x1b1b2b, 0.9).fillRect(PAUSE.x - PAUSE.w / 2, PAUSE.y - PAUSE.h / 2, PAUSE.w, PAUSE.h);
    pg.fillStyle(0x3a3f55, 0.9).fillRect(PAUSE.x - PAUSE.w / 2 + 2, PAUSE.y - PAUSE.h / 2 + 2, PAUSE.w - 4, PAUSE.h - 4);
    txt(scene, PAUSE.x, PAUSE.y, 'PAUSE').setOrigin(0.5).setDepth(D + 1);
    scene.add.zone(PAUSE.x, PAUSE.y, PAUSE.w, PAUSE.h).setDepth(D + 3).setInteractive({ useHandCursor: true }).on('pointerdown', onPause);
  }

  /** Vrai si l'objet fait partie de l'interface fixe (bandeaux, boutons, commandes). */
  owns(o: Phaser.GameObjects.GameObject): boolean {
    return this.own.has(o) || this.orderUi.includes(o);
  }

  /** Coin haut-gauche de la commande n° i : côte à côte, centrées sous le chrono. */
  private orderPos(i: number): { x: number; y: number } {
    return { x: (this.land ? Math.round(this.sw / 2 - 178) : 4) + i * 178, y: 29 };
  }

  /** Détruit toute l'interface (quand on tourne le téléphone, elle est reconstruite). */
  destroy(): void {
    this.orderUi.forEach((o) => o.destroy());
    this.own.forEach((o) => o.destroy());
    this.own.clear();
    this.scene.input.off('pointerup', this.releaseFn);
    this.scene.input.off('pointerupoutside', this.releaseFn);
  }

  /** Vrai tant que le joueur garde le doigt sur le bouton d'attaque. */
  get attackHeld(): boolean {
    return this.atkPointer !== -1;
  }

  releaseAttack(): void {
    this.atkPointer = -1;
  }

  /** Vrai si le point touche un élément d'interface (ne doit pas déclencher le joystick). */
  isUi(x: number, y: number): boolean {
    const { ATK, ULT, PAUSE, sw: W } = this;
    return (
      Math.hypot(x - ULT.x, y - ULT.y) < ULT.r + 4 ||
      Math.hypot(x - ATK.x, y - ATK.y) < ATK.r + 6 ||
      (Math.abs(x - PAUSE.x) < PAUSE.w / 2 + 2 && Math.abs(y - PAUSE.y) < PAUSE.h / 2 + 2) ||
      (x > W - 26 && y < 26)
    );
  }

  private buildOrders(): void {
    this.orderUi.forEach((o) => o.destroy());
    this.orderUi = [];
    this.orderCounts = [];
    this.recipes.orders.forEach((o, i) => {
      const { x, y } = this.orderPos(i);
      const g = this.scene.add.graphics().setDepth(D);
      // commandes plus légères (demande de Rudy, 12/11) : plus fines et un peu transparentes pour voir le jeu derrière
      g.fillStyle(0x3b2414, 0.55).fillRect(x, y, 174, 30);
      g.fillStyle(o.state === 'open' ? 0xf0dcae : 0xffe27a, 0.72).fillRect(x + 1, y + 1, 172, 28);
      this.orderUi.push(g);
      const name = this.scene.add
        .text(x + 87, y + 3, o.recipe.name, { fontFamily: '"Press Start 2P"', fontSize: '8px', color: '#3b2414' })
        .setOrigin(0.5, 0)
        .setDepth(D + 1);
      this.orderUi.push(name);
      if (o.state !== 'open') {
        const label = o.state === 'cooking' ? 'CUISSON...' : 'PRET ! A SERVIR';
        this.orderUi.push(txt(this.scene, x + 87, y + 15, label, 8, '#ffffff').setOrigin(0.5, 0).setDepth(D + 1));
        return;
      }
      const needs = Object.entries(o.recipe.needs) as [IngredientId, number][];
      needs.forEach(([ing, need], j) => {
        const ix = x + 87 - (needs.length * 52) / 2 + j * 52 + 10;
        this.orderUi.push(this.scene.add.image(ix, y + 20, 'ing_' + ing).setScale(0.7).setDepth(D + 1));
        const t = txt(this.scene, ix + 8, y + 16, '', 8).setDepth(D + 1);
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
      gm.mode === 'duel' ? `DUEL ${clock}` : gm.phase === 'boss' ? 'BOSS !' : gm.phase === 'kitchen' ? `CUISINE ${clock}` : `VAGUE ${Math.min(gm.wave + 1, WAVES.length)}/${WAVES.length} ${clock}`;
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

    // patience des clients
    this.patience.clear();
    this.recipes.orders.forEach((o, i) => {
      if (o.state !== 'open') return;
      const p = Math.max(0, o.patience / ORDER_PATIENCE);
      const { x, y } = this.orderPos(i);
      this.patience.fillStyle(0x3b2414, 0.5).fillRect(x + 2, y + 27, 170, 2);
      this.patience.fillStyle(p > 0.5 ? 0x3fae3f : p > 0.25 ? 0xe08a2a : 0xd0342a).fillRect(x + 2, y + 27, Math.round(170 * p), 2);
    });
    const c = gm.combo % COMBO_SIZE;
    this.combo.setText(gm.combo > 0 ? `COMBO ${gm.combo} ${'*'.repeat(c)}${'.'.repeat(COMBO_SIZE - c)}` : '');
    this.rival.setText(this.rivalInfo ? `${this.rivalInfo.name} ${this.rivalInfo.gold}` : '');

    const active = (Object.keys(chef.powers) as PowerId[]).filter((p) => chef.powers[p] > 0);
    this.powers.setText(active.map((p) => `${POWER_LABEL[p]} ${Math.ceil(chef.powers[p])}s`).join('\n'));

    // jauge d'ultime autour du bouton
    const { ULT, ATK } = this;
    const ready = chef.ult >= 100;
    this.ultRing.clear();
    this.ultRing.lineStyle(4, 0x14141f, 0.9).strokeCircle(ULT.x, ULT.y, ULT.r);
    this.ultRing.lineStyle(4, ready ? 0xffe27a : 0xff8a1e, 1).beginPath();
    this.ultRing.arc(ULT.x, ULT.y, ULT.r, -Math.PI / 2, -Math.PI / 2 + (Math.PI * 2 * chef.ult) / 100).strokePath();
    this.ultBtn.setAlpha(ready ? 1 : 0.45).setScale(ready ? 1 + Math.sin(time / 120) * 0.05 : 0.9);

    // bouton d'attaque : s'enfonce quand on appuie
    const held = this.attackHeld;
    this.atkBtn.clear();
    this.atkBtn.fillStyle(0x14141f, 0.6).fillCircle(ATK.x, ATK.y, ATK.r);
    this.atkBtn.fillStyle(held ? 0xff6a3a : 0xc8402e, held ? 0.95 : 0.75).fillCircle(ATK.x, ATK.y, ATK.r - (held ? 6 : 4));
    this.atkBtn.lineStyle(3, 0xffe9b0, 0.9).strokeCircle(ATK.x, ATK.y, ATK.r);
    this.atkIcon.setScale(held ? 2.1 : 2.4);
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
