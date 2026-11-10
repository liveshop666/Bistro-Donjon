import Phaser from 'phaser';
import { CHEF_ORDER, CHEFS, ChefId, H, W, WORLD_ORDER, WorldId, WORLDS } from '../core/constants';
import { button, txt } from '../ui/text';

const SAVE_KEY = 'bistro-donjon';

export interface Save {
  best: number;
  chef: ChefId;
  world: WorldId;
}

export function loadSave(): Save {
  try {
    return { best: 0, chef: 'moustachu', world: 'clairiere', ...JSON.parse(localStorage.getItem(SAVE_KEY) ?? '{}') };
  } catch {
    return { best: 0, chef: 'moustachu', world: 'clairiere' };
  }
}

export function writeSave(s: Partial<Save>): void {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify({ ...loadSave(), ...s }));
  } catch {
    /* stockage indisponible : on joue sans sauvegarde */
  }
}

/** Ecran titre : choix du chef et du monde. */
export class MenuScene extends Phaser.Scene {
  private chef: ChefId = 'moustachu';
  private world: WorldId = 'clairiere';
  private bg!: Phaser.GameObjects.Image;
  private frame!: Phaser.GameObjects.Graphics;
  private info!: Phaser.GameObjects.Text;
  private stats!: Phaser.GameObjects.Graphics;
  private worldInfo!: Phaser.GameObjects.Text;

  constructor() {
    super('Menu');
  }

  create(): void {
    const save = loadSave();
    this.chef = save.chef;
    this.world = save.world;

    this.bg = this.add.image(0, 0, 'map_' + this.world).setOrigin(0);
    this.add.rectangle(0, 0, W, H, 0x0c0c18, 0.72).setOrigin(0);

    const title = txt(this, W / 2, 44, 'BISTRO\nDONJON', 32, '#ffc533').setOrigin(0.5);
    title.setStroke('#7a2a12', 6);
    this.tweens.add({ targets: title, y: 47, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    txt(this, W / 2, 100, `MEILLEUR SERVICE : ${save.best} OR`, 8, '#bfc8e0').setOrigin(0.5);

    // --- Chefs
    txt(this, W / 2, 124, 'CHOISIS TON CHEF', 8, '#8fe0ff').setOrigin(0.5);
    CHEF_ORDER.forEach((id, i) => {
      const x = 70 + i * 110;
      this.add.rectangle(x, 168, 52, 56, 0x1b1b2b);
      this.add
        .image(x, 168, 'portrait_' + id)
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', () => {
          this.chef = id;
          this.refresh();
        });
    });
    this.info = txt(this, W / 2, 208, '').setOrigin(0.5, 0);
    this.stats = this.add.graphics();
    ['VIE', 'VITESSE', 'DEGATS'].forEach((s, i) => txt(this, 96, 256 + i * 14, s, 8, '#bfc8e0'));

    // --- Mondes
    txt(this, W / 2, 314, 'CHOISIS TON MONDE', 8, '#8fe0ff').setOrigin(0.5);
    WORLD_ORDER.forEach((id, i) => {
      const x = 51 + i * 86;
      this.add
        .image(x, 388, 'map_' + id)
        .setScale(0.2)
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', () => {
          this.world = id;
          this.refresh();
        });
      txt(this, x, 460, String(i + 1)).setOrigin(0.5);
    });
    this.worldInfo = txt(this, W / 2, 476, '').setOrigin(0.5, 0);

    this.frame = this.add.graphics();
    button(this, W / 2, 540, 180, 40, 'JOUER EN SOLO', 0xe8642a, () => {
      writeSave({ chef: this.chef, world: this.world });
      this.scene.start('Game', { chef: this.chef, world: this.world });
    });
    button(this, 96, 592, 150, 28, 'DUO  BIENTOT', 0x4a4f66, () => {}).setAlpha(0.6);
    button(this, 264, 592, 150, 28, 'DUEL BIENTOT', 0x4a4f66, () => {}).setAlpha(0.6);
    txt(this, W / 2, 624, 'PROTOTYPE SOLO v0.1', 8, '#6b7391').setOrigin(0.5);
    this.refresh();
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
        this.stats.fillStyle(i < v ? 0xffc533 : 0x3a3f55).fillRect(176 + i * 14, 256 + row * 14, 10, 8);
      }
    });

    const ci = CHEF_ORDER.indexOf(this.chef);
    const wi = WORLD_ORDER.indexOf(this.world);
    this.frame.clear().lineStyle(2, 0xffc533);
    this.frame.strokeRect(70 + ci * 110 - 27, 168 - 29, 54, 58);
    this.frame.strokeRect(51 + wi * 86 - 37, 388 - 65, 74, 130);
  }
}
