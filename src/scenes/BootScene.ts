import Phaser from 'phaser';
import { CHEF_ORDER, INGREDIENTS, SHOP, SPRITE_FILES, UPGRADES, WORLD_ORDER, WORLDS } from '../core/constants';

/** Charge les sprites et génère les petites textures procédurales (joystick, plat, effets). */
export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  preload(): void {
    this.load.setPath('assets/');
    for (const c of CHEF_ORDER) {
      this.load.image(c, `sprites/chefs/${c}.png`);
      this.load.image('portrait_' + c, `sprites/chefs/portrait_${c}.png`);
      // grands dessins haute définition (menu en paysage), découpés par tools/extract_hd_chefs.py
      this.load.image('hd_' + c, `sprites/chefs/hd_${c}.png`);
      this.load.image('hdp_' + c, `sprites/chefs/hdp_${c}.png`);
    }
    for (const f of SPRITE_FILES.chefs) this.load.image(f, `sprites/chefs/${f}.png`);
    for (const it of SHOP) if (it.sprite) this.load.image(it.sprite, `sprites/skins/${it.sprite}.png`);
    for (const e of SPRITE_FILES.enemies) this.load.image(e, `sprites/enemies/${e}.png`);
    for (const w of WORLD_ORDER) this.load.image('map_' + w, `maps/${w}.png`);
    // grandes maps paysage (le terrain de la partie) ; les petites restent pour les menus
    for (const w of WORLD_ORDER) if (WORLDS[w].wide) this.load.image('wide_' + w, `maps/wide_${w}.jpg`);
    for (const i of INGREDIENTS) this.load.image('ing_' + i, `ui/ing_${i}.png`);
    for (const u of UPGRADES) this.load.image(u.icon, `ui/${u.icon}.png`);
    this.load.image('logo', '../logo.png');
    for (const k of ['marmite', 'coeur', 'piece', 'bouton_ultime']) this.load.image(k, `ui/${k}.png`);
  }

  create(): void {
    // les dessins HD sont réduits à l'affichage : lissage pour garder tous les détails
    for (const c of CHEF_ORDER) for (const k of ['hd_' + c, 'hdp_' + c]) this.textures.get(k).setFilter(Phaser.Textures.FilterMode.LINEAR);
    const g = this.make.graphics({ x: 0, y: 0 }, false);
    const tex = (key: string, w: number, h: number, draw: () => void) => {
      g.clear();
      draw();
      g.generateTexture(key, w, h);
    };

    tex('joy_base', 72, 72, () => {
      g.fillStyle(0xffffff, 0.18).fillCircle(36, 36, 34);
      g.lineStyle(2, 0xffffff, 0.7).strokeCircle(36, 36, 34);
    });
    tex('joy_thumb', 28, 28, () => {
      g.fillStyle(0xffffff, 0.9).fillCircle(14, 14, 13);
      g.fillStyle(0x9fb4d8).fillCircle(14, 14, 9);
    });
    // plat prêt à servir
    tex('plat', 18, 14, () => {
      g.fillStyle(0x1b1b2b).fillEllipse(9, 8, 18, 12);
      g.fillStyle(0xf4efe4).fillEllipse(9, 8, 16, 10);
      g.fillStyle(0xd9502b).fillEllipse(9, 6, 12, 6);
      g.fillStyle(0x6fbf3a).fillRect(6, 5, 2, 2).fillRect(11, 6, 2, 2);
    });
    // comptoir de service
    tex('comptoir', 48, 26, () => {
      g.fillStyle(0x1b1b2b).fillRect(0, 4, 48, 22);
      g.fillStyle(0xa9713d).fillRect(1, 5, 46, 8);
      g.fillStyle(0x7a4a26).fillRect(1, 13, 46, 12);
      g.fillStyle(0x5c3519).fillRect(11, 13, 2, 12).fillRect(23, 13, 2, 12).fillRect(35, 13, 2, 12);
      g.fillStyle(0xffd23e).fillRect(20, 1, 8, 5).fillRect(22, 0, 4, 1); // clochette
      g.fillStyle(0x1b1b2b).fillRect(19, 6, 10, 1);
    });
    tex('etincelle', 24, 24, () => {
      g.fillStyle(0xffffff);
      g.fillTriangle(12, 0, 15, 12, 9, 12).fillTriangle(12, 24, 15, 12, 9, 12);
      g.fillTriangle(0, 12, 12, 9, 12, 15).fillTriangle(24, 12, 12, 9, 12, 15);
    });
    tex('boule_feu', 10, 10, () => {
      g.fillStyle(0xd9301a).fillCircle(5, 5, 5);
      g.fillStyle(0xff9d2e).fillCircle(5, 5, 3);
      g.fillStyle(0xfff0a0).fillCircle(5, 5, 1);
    });
    tex('couteau', 6, 16, () => {
      g.fillStyle(0x1b1b2b).fillRect(0, 0, 6, 16);
      g.fillStyle(0xe6eef5).fillRect(1, 1, 4, 9);
      g.fillStyle(0x8a5a33).fillRect(2, 10, 2, 5);
    });
    tex('tourelle', 20, 18, () => {
      g.fillStyle(0x1b1b2b).fillRect(2, 6, 16, 12).fillRect(8, 0, 4, 8);
      g.fillStyle(0x8f9bb0).fillRect(3, 7, 14, 10);
      g.fillStyle(0xc9d3e2).fillRect(9, 1, 2, 7);
      g.fillStyle(0xff5a3c).fillRect(8, 10, 4, 4);
    });
    tex('tonneau', 18, 22, () => {
      g.fillStyle(0x1b1b2b).fillRect(1, 0, 16, 22);
      g.fillStyle(0xb5462b).fillRect(2, 1, 14, 20);
      g.fillStyle(0x3a3a48).fillRect(2, 4, 14, 2).fillRect(2, 16, 14, 2);
      g.fillStyle(0xffd23e).fillRect(7, 8, 4, 6);
    });
    tex('fleche_tapis', 24, 12, () => {
      g.fillStyle(0x4ff3ff, 0.9);
      g.fillTriangle(4, 1, 12, 6, 4, 11).fillTriangle(14, 1, 22, 6, 14, 11);
    });
    // planche à découper
    tex('planche', 34, 20, () => {
      g.fillStyle(0x1b1b2b).fillRect(0, 2, 34, 18);
      g.fillStyle(0xd9a866).fillRect(1, 3, 32, 12);
      g.fillStyle(0xb98548).fillRect(1, 15, 32, 4).fillRect(4, 7, 14, 1).fillRect(9, 11, 16, 1);
      g.fillStyle(0xe8483a).fillRect(22, 5, 6, 6);
      g.fillStyle(0x4f9f3a).fillRect(24, 4, 2, 2);
    });
    tex('ico_pause', 14, 14, () => {
      g.fillStyle(0x3a3f55).fillRect(0, 0, 14, 14);
      g.fillStyle(0xffffff).fillRect(3, 3, 3, 8).fillRect(8, 3, 3, 8);
    });
    tex('fumee', 64, 64, () => {
      g.fillStyle(0x2a2a33).fillCircle(32, 32, 30);
      g.fillStyle(0x3d3d4a).fillCircle(26, 26, 18);
    });
    tex('cadenas', 16, 18, () => {
      g.lineStyle(3, 0xd8dcea).strokeRect(4, 2, 8, 9);
      g.fillStyle(0x1b1b2b).fillRect(0, 7, 16, 11);
      g.fillStyle(0xffc533).fillRect(1, 8, 14, 9);
      g.fillStyle(0x1b1b2b).fillRect(7, 11, 2, 4);
    });
    tex('particule', 4, 4, () => g.fillStyle(0xffffff).fillRect(0, 0, 4, 4));
    tex('ico_stand', 12, 10, () => {
      g.fillStyle(0x1b1b2b).fillRect(0, 0, 12, 10);
      g.fillStyle(0xe8483a).fillRect(1, 1, 10, 4);
      g.fillStyle(0xffffff).fillRect(3, 1, 2, 4).fillRect(7, 1, 2, 4);
      g.fillStyle(0xa9713d).fillRect(1, 5, 10, 4);
    });
    g.destroy();
    // écran de chargement (logo, dans index.html) : il s'efface en fondu
    const splash = document.getElementById('splash');
    if (splash) {
      splash.style.opacity = '0';
      window.setTimeout(() => splash.remove(), 350);
    }
    this.scene.start('Menu');
  }
}
