import Phaser from 'phaser';
import { COMBO_SIZE, IngredientId, INGREDIENTS, ORDER_PATIENCE, POWER_LABEL, PowerId, STYLE_3D, W, WAVES } from '../core/constants';
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
  private bars!: Phaser.GameObjects.Graphics;
  private timer!: Phaser.GameObjects.Text;
  private gold!: Phaser.GameObjects.Text;
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
    if (STYLE_3D) {
      // comme l'image de référence (14/11) : gros bouton rouge d'attaque, bouton orange des flammes collé en haut à droite
      this.ATK = land ? { x: sw - 108, y: sh - 58, r: 42 } : { x: 284, y: sh - 64, r: 42 };
      this.ULT = land ? { x: sw - 46, y: sh - 112, r: 32 } : { x: 320, y: sh - 132, r: 30 };
      this.PAUSE = { x: -100, y: -100, w: 0, h: 0 }; // la pause est en haut à droite, comme sur la référence
    }
    const { ATK, ULT } = this;

    if (STYLE_3D) this.top3d(sw, onPause);
    else {
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
    }
    this.patience = scene.add.graphics().setDepth(D + 2);
    this.combo = txt(scene, 6, land ? 32 : 70, '', 8, '#ffc533').setDepth(D + 1).setStroke('#14141f', 3);
    this.rival = txt(scene, sw - 6, land ? 32 : 70, '', 8, '#ff9d8a').setOrigin(1, 0).setDepth(D + 1).setStroke('#14141f', 3);
    if (!STYLE_3D) this.gold = txt(scene, sw - 42, 13, '0', 8, '#ffd23e').setOrigin(1, 0.5).setDepth(D + 1);
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
    this.ultBtn = scene.add.image(ULT.x, ULT.y, STYLE_3D ? 'ui3d_btn_feu' : 'btn_feu').setDepth(D + 2).setInteractive({ useHandCursor: true });
    this.ultBtn.on('pointerdown', onUlt);

    // bouton d'attaque (maintenir pour frapper)
    this.atkBtn = scene.add.graphics().setDepth(D + 1);
    this.atkIcon = STYLE_3D
      ? scene.add.image(ATK.x, ATK.y, 'ui3d_btn_attaque').setDepth(D + 2).setScale(0.5)
      : scene.add.image(ATK.x, ATK.y, 'ico_hachoir').setDepth(D + 2).setScale(0.62).setAngle(-30);
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
    if (!land && !STYLE_3D) this.bottomPause(onPause); // style 3D : la pause est en haut à droite (une zone vide bloquait tout le toucher en vertical)

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

  // ------------------------------------------------------------------ interface façon image de référence (style 3D)
  private hearts: Phaser.GameObjects.Image[] = [];
  private heartsFull: Phaser.GameObjects.Image[] = [];

  /** Haut de l'écran : coeurs à gauche, chrono au centre, pièces et pause à droite (pastilles sombres arrondies). */
  private top3d(sw: number, onPause: () => void): void {
    const { scene } = this;
    for (let i = 0; i < 8; i++) {
      this.hearts.push(scene.add.image(14 + i * 19, 14, 'ui3d_coeur_vide').setScale(0.45).setDepth(D + 1));
      this.heartsFull.push(scene.add.image(14 + i * 19, 14, 'ui3d_coeur').setScale(0.45).setDepth(D + 2));
    }
    scene.add.image(10, 31, 'ico_stand').setDepth(D + 1);
    this.bars = scene.add.graphics().setDepth(D + 1);
    const pill = (x: number, w: number) => scene.add.graphics().setDepth(D).fillStyle(0x0c0c18, 0.55).fillRoundedRect(x - w / 2, 3, w, 23, 11.5);
    pill(sw / 2, 116);
    scene.add.image(sw / 2 - 44, 14.5, 'ui3d_chrono').setScale(0.45).setDepth(D + 1);
    this.timer = scene.add.text(sw / 2 + 8, 14.5, '', { fontFamily: '"Lilita One"', fontSize: '16px', color: '#ffffff' }).setOrigin(0.5).setDepth(D + 1).setShadow(0, 1, '#000000', 2);
    pill(sw - 74, 76);
    scene.add.image(sw - 98, 14.5, 'ui3d_piece').setScale(0.45).setDepth(D + 1);
    this.gold = scene.add.text(sw - 86, 14.5, '0', { fontFamily: '"Lilita One"', fontSize: '16px', color: '#ffffff' }).setOrigin(0, 0.5).setDepth(D + 1).setShadow(0, 1, '#000000', 2);
    scene.add.image(sw - 17, 15, 'ui3d_pause').setScale(0.5).setDepth(D + 1);
    scene.add.zone(sw - 17, 15, 34, 30).setDepth(D + 3).setInteractive({ useHandCursor: true }).on('pointerdown', onPause);
  }

  private refresh3d(): void {
    const { gm, chef } = this;
    // un coeur = 2 points de vie, demi-coeur si impair
    const n = Math.ceil(chef.maxHp / 2);
    this.hearts.forEach((h, i) => h.setVisible(i < n));
    this.heartsFull.forEach((h, i) => {
      const v = Phaser.Math.Clamp(chef.hp - i * 2, 0, 2);
      h.setVisible(i < n && v > 0).setCrop(0, 0, v === 1 ? 20 : 40, 40);
    });
    this.bars.clear();
    this.bars.fillStyle(0x000000, 0.6).fillRoundedRect(18, 28, 60, 6, 3);
    this.bars.fillStyle(0xe0a04a).fillRoundedRect(19, 29, Math.max(2, Math.round((58 * gm.standHp) / gm.standMax)), 4, 2);
    const mm = Math.max(0, Math.ceil(gm.timeLeft));
    const clock = `${String(Math.floor(mm / 60)).padStart(2, '0')}:${String(mm % 60).padStart(2, '0')}`;
    const label = gm.mode === 'duel' ? `DUEL ${clock}` : gm.phase === 'boss' ? 'BOSS !' : gm.phase === 'kitchen' ? `CUISINE ${clock}` : `${Math.min(gm.wave + 1, WAVES.length)}/${WAVES.length}  ${clock}`;
    this.timer.setText(label).setColor(gm.phase === 'kitchen' ? '#ffd23e' : gm.phase === 'boss' ? '#ff8a7a' : '#ffffff');
    this.gold.setText(gm.gold.toLocaleString('fr-FR'));
  }

  /** Vrai si l'objet fait partie de l'interface fixe (bandeaux, boutons, commandes). */
  owns(o: Phaser.GameObjects.GameObject): boolean {
    return this.own.has(o) || this.orderUi.includes(o);
  }

  /** Coin haut-gauche de la commande n° i : côte à côte, centrées sous le chrono. */
  private orderPos(i: number): { x: number; y: number } {
    return { x: (this.land ? Math.round(this.sw / 2 - 178) : 4) + i * 178, y: STYLE_3D ? 38 : 29 };
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
      (x > W - 36 && y < 30)
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
      if (STYLE_3D) {
        // style 3D : pastille sombre arrondie, liseré doré quand le plat est prêt
        g.fillStyle(0x0c0c18, 0.6).fillRoundedRect(x, y, 174, 32, 9);
        if (o.state !== 'open') g.lineStyle(2, 0xffc533, 1).strokeRoundedRect(x, y, 174, 32, 9);
      } else {
      g.fillStyle(0x3b2414, 0.55).fillRect(x, y, 174, 30);
      g.fillStyle(o.state === 'open' ? 0xf0dcae : 0xffe27a, 0.72).fillRect(x + 1, y + 1, 172, 28);
      }
      this.orderUi.push(g);
      const name = (STYLE_3D ? txt(this.scene, x + 87, y + 1, o.recipe.name, 8, '#ffe9b0') : this.scene.add
        .text(x + 87, y + 3, o.recipe.name, { fontFamily: '"Press Start 2P"', fontSize: '8px', color: '#3b2414' }))
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
        this.orderUi.push(this.scene.add.image(ix, y + (STYLE_3D ? 19 : 20), 'ing_' + ing).setScale(0.7).setDepth(D + 1));
        const t = txt(this.scene, ix + 8, y + (STYLE_3D ? 13 : 16), '', 8).setDepth(D + 1);
        this.orderUi.push(t);
        this.orderCounts.push({ text: t, ing, need });
      });
    });
  }

  refresh(time: number): void {
    const { gm, chef } = this;
    if (STYLE_3D) this.refresh3d();
    else {
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
    }

    for (const ing of INGREDIENTS) {
      const s = chef.inv[ing];
      this.invTexts[ing].setText(String(s.n)).setAlpha(s.n ? 1 : 0.4);
      this.slicedTexts[ing].setText(s.sliced ? `x${s.sliced}` : '');
    }
    for (const c of this.orderCounts) {
      const have = chef.inv[c.ing].n;
      c.text.setText(`${Math.min(have, c.need)}/${c.need}`).setColor(have >= c.need ? (STYLE_3D ? '#7dff7d' : '#2f8f2f') : (STYLE_3D ? '#ff8a7a' : '#b0392b'));
    }

    // patience des clients
    this.patience.clear();
    this.recipes.orders.forEach((o, i) => {
      if (o.state !== 'open') return;
      const p = Math.max(0, o.patience / ORDER_PATIENCE);
      const { x, y } = this.orderPos(i);
      const py = y + (STYLE_3D ? 29 : 27);
      this.patience.fillStyle(0x3b2414, 0.5).fillRect(x + 8, py, 158, 2);
      this.patience.fillStyle(p > 0.5 ? 0x3fae3f : p > 0.25 ? 0xe08a2a : 0xd0342a).fillRect(x + 8, py, Math.round(158 * p), 2);
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
    // prêt : halo doré qui respire ; en charge : bouton grisé et jauge orange qui se remplit
    if (ready) this.ultRing.fillStyle(0xffc533, 0.25 + Math.sin(time / 150) * 0.12).fillCircle(ULT.x, ULT.y, ULT.r + 7);
    this.ultRing.lineStyle(5, 0x14141f, 0.9).strokeCircle(ULT.x, ULT.y, ULT.r + 2);
    this.ultRing.lineStyle(4, ready ? 0xffe27a : 0xff8a1e, 1).beginPath();
    this.ultRing.arc(ULT.x, ULT.y, ULT.r + 2, -Math.PI / 2, -Math.PI / 2 + (Math.PI * 2 * chef.ult) / 100).strokePath();
    const s = (ULT.r * 2) / 128;
    this.ultBtn.setAlpha(ready ? 1 : 0.6).setTint(ready ? 0xffffff : 0x8a8a9a).setScale(ready ? s * (1 + Math.sin(time / 120) * 0.05) : s * 0.92);
    if (STYLE_3D) {
      // bouton d'attaque de la référence : il s'enfonce et fonce un peu quand on appuie
      const held3d = this.attackHeld;
      this.atkBtn.clear();
      this.atkIcon.setScale(held3d ? 0.46 : 0.5).setTint(held3d ? 0xd8d8d8 : 0xffffff).setY(ATK.y + (held3d ? 2 : 0));
      return;
    }

    // bouton d'attaque : s'enfonce quand on appuie
    const held = this.attackHeld;
    this.atkBtn.clear();
    // bouton bombé : ombre, bord doré, corps rouge, reflet en haut ; il s'enfonce quand on appuie
    const dy = held ? 2 : 0;
    const b = this.atkBtn;
    b.fillStyle(0x0c0c18, 0.55).fillCircle(ATK.x, ATK.y + 3, ATK.r + 1);
    b.fillStyle(0x1b1b2b, 1).fillCircle(ATK.x, ATK.y + dy, ATK.r);
    b.fillStyle(0xffc533, 1).fillCircle(ATK.x, ATK.y + dy, ATK.r - 2);
    b.fillStyle(held ? 0x8a2416 : 0x9a2a1a, 1).fillCircle(ATK.x, ATK.y + dy, ATK.r - 5);
    b.fillStyle(held ? 0xd84a2a : 0xd8402a, 1).fillCircle(ATK.x, ATK.y + dy - 2, ATK.r - 8);
    b.fillStyle(held ? 0xff7a4a : 0xf0603a, 1).fillCircle(ATK.x, ATK.y + dy - 5, ATK.r - 15);
    if (!held) b.fillStyle(0xffffff, 0.28).fillEllipse(ATK.x - 8, ATK.y - ATK.r * 0.5, ATK.r, ATK.r * 0.4);
    this.atkIcon.setY(ATK.y + dy).setScale(held ? 0.56 : 0.62);
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
