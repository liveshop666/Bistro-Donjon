import Phaser from 'phaser';
import { audio } from '../audio/AudioManager';
import { CHEF_ORDER, CHEFS, ChefId, DAILY_GIFT, H, itemLabel, playerLevel, W, WORLD_ORDER, WorldId, WORLDS } from '../core/constants';
import { claimDailyGift, loadProfile, loadRun, saveProfile } from '../core/Storage';
import { openModal } from '../ui/Modal';
import { button, txt } from '../ui/text';

/** Ecran titre : choix du chef et du monde, accès au solo, au duel, à la reprise et aux règles. */
export class MenuScene extends Phaser.Scene {
  private chef: ChefId = 'moustachu';
  private world: WorldId = 'clairiere';
  private unlocked = 1;
  private bg!: Phaser.GameObjects.Image;
  private frame!: Phaser.GameObjects.Graphics;
  private info!: Phaser.GameObjects.Text;
  private stats!: Phaser.GameObjects.Graphics;
  private worldInfo!: Phaser.GameObjects.Text;

  constructor() {
    super('Menu');
  }

  create(): void {
    if (!loadProfile().rulesSeen) {
      // premier lancement : on montre les règles
      saveProfile({ rulesSeen: true });
      this.scene.start('Rules');
      return;
    }
    const gift = claimDailyGift(); // cadeau du jour, une fois par jour
    const profile = loadProfile();
    this.chef = profile.chef;
    this.unlocked = profile.unlocked;
    this.world = WORLD_ORDER.indexOf(profile.world) < this.unlocked ? profile.world : 'clairiere';

    this.bg = this.add.image(0, 0, 'map_' + this.world).setOrigin(0);
    this.add.rectangle(0, 0, W, H, 0x0c0c18, 0.72).setOrigin(0);

    const title = txt(this, W / 2, 50, 'BISTRO\nDONJON', 32, '#ffc533').setOrigin(0.5);
    title.setStroke('#7a2a12', 6);
    this.tweens.add({ targets: title, y: 53, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    const lvl = playerLevel(profile.earned);
    txt(this, W / 2, 100, `NIVEAU ${lvl.level}   PIECES : ${profile.coins}   RECORD : ${profile.best}`, 8, '#bfc8e0').setOrigin(0.5);
    // barre de progression vers le niveau suivant
    const xp = this.add.graphics();
    xp.fillStyle(0x1b1b2b).fillRect(80, 108, 200, 6);
    xp.fillStyle(0x4fb8ff).fillRect(81, 109, Math.round((198 * lvl.into) / lvl.span), 4);

    // --- Chefs
    txt(this, W / 2, 124, 'CHOISIS TON CHEF', 8, '#8fe0ff').setOrigin(0.5);
    CHEF_ORDER.forEach((id, i) => {
      const x = 70 + i * 110;
      this.add.rectangle(x, 166, 52, 56, 0x1b1b2b);
      this.add
        .image(x, 166, 'portrait_' + id)
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', () => {
          this.chef = id;
          audio.sfx('clic');
          this.refresh();
        });
    });
    this.info = txt(this, W / 2, 204, '').setOrigin(0.5, 0);
    this.stats = this.add.graphics();
    ['VIE', 'VITESSE', 'DEGATS'].forEach((s, i) => txt(this, 96, 250 + i * 14, s, 8, '#bfc8e0'));

    // --- Mondes
    txt(this, W / 2, 304, 'CHOISIS TON MONDE', 8, '#8fe0ff').setOrigin(0.5);
    WORLD_ORDER.forEach((id, i) => {
      const x = 51 + i * 86;
      const locked = i >= this.unlocked;
      const img = this.add.image(x, 378, 'map_' + id).setScale(0.2);
      if (locked) {
        img.setTint(0x333344);
        this.add.image(x, 378, 'cadenas');
      }
      img.setInteractive({ useHandCursor: true }).on('pointerdown', () => {
        audio.sfx(locked ? 'parti' : 'clic');
        if (locked) this.worldInfo.setText(`${WORLDS[id].name}\nBats le Roi Tomate du monde ${i}`);
        else {
          this.world = id;
          this.refresh();
        }
      });
      txt(this, x, 450, String(i + 1)).setOrigin(0.5);
    });
    this.worldInfo = txt(this, W / 2, 464, '').setOrigin(0.5, 0);
    this.frame = this.add.graphics();

    // --- Boutons
    const pick = () => saveProfile({ chef: this.chef, world: this.world });
    button(this, 92, 512, 168, 36, 'JOUER SOLO', 0xe8642a, () => {
      pick();
      this.scene.start('Game', { chef: this.chef, world: this.world, mode: 'solo' });
    });
    button(this, 268, 512, 168, 36, 'DUEL', 0xb03a5a, () => {
      pick();
      this.scene.start('Duel', { chef: this.chef, world: this.world });
    });
    const run = loadRun();
    const cont = button(this, 92, 554, 168, 32, run ? `CONTINUER (V.${Math.min(run.wave + 1, 4)})` : 'CONTINUER', 0x3d7a4a, () => {
      if (run) this.scene.start('Game', { chef: run.chef, world: run.world, mode: 'solo', resume: run });
    });
    if (!run) cont.setAlpha(0.4);
    button(this, 268, 554, 168, 32, 'BOUTIQUE', 0xc98a1e, () => this.scene.start('Shop'));
    button(this, 92, 596, 168, 30, 'REGLES DU JEU', 0x4a4f66, () => this.scene.start('Rules'));
    button(this, 268, 596, 168, 30, 'MON COMPTE', 0x4a4f66, () => this.scene.start('Account'));

    const son = () => (audio.muted ? 'SON : NON' : 'SON : OUI');
    const mute = txt(this, W - 6, 6, son(), 8, '#bfc8e0').setOrigin(1, 0).setInteractive({ useHandCursor: true });
    mute.on('pointerdown', () => {
      audio.toggleMute();
      mute.setText(son());
      audio.sfx('clic');
    });
    audio.music('menu');
    this.refresh();
    if (gift) {
      const tomorrow = DAILY_GIFT[Math.min(gift.streak + 1, DAILY_GIFT.length) - 1];
      const lines = [`Jour ${gift.streak} d'affilée : +${gift.coins} pièces !`, `Reviens demain : +${tomorrow} pièces.`];
      for (const g of gift.gifts) lines.push(`Cadeau débloqué : ${itemLabel(g)} !`);
      audio.sfx('piece');
      openModal(this, 'CADEAU DU JOUR', [{ label: 'MERCI !', color: 0xe8642a, action: () => {} }], lines.join('\n'));
    }
  }

  private refresh(): void {
    const c = CHEFS[this.chef];
    const w = WORLDS[this.world];
    this.bg.setTexture('map_' + this.world);
    this.info.setText(`${c.name}\n${c.weapon}\n${c.ultimateName}`);
    this.worldInfo.setText(`${w.name}\n${w.hint}`);

    this.stats.clear();
    [c.stats.vie, c.stats.vitesse, c.stats.degats].forEach((v, row) => {
      for (let i = 0; i < 5; i++) {
        this.stats.fillStyle(i < v ? 0xffc533 : 0x3a3f55).fillRect(176 + i * 14, 250 + row * 14, 10, 8);
      }
    });

    const ci = CHEF_ORDER.indexOf(this.chef);
    const wi = WORLD_ORDER.indexOf(this.world);
    this.frame.clear().lineStyle(2, 0xffc533);
    this.frame.strokeRect(70 + ci * 110 - 27, 166 - 29, 54, 58);
    this.frame.strokeRect(51 + wi * 86 - 37, 378 - 65, 74, 130);
  }
}
