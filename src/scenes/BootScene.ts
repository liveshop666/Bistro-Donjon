import Phaser from 'phaser';
import { ART_3D, CHEF_ORDER, INGREDIENTS, is3d, SHOP, SPRITE_FILES, STYLE_3D, UPGRADES, WORLD_3D, WORLD_ORDER, WORLDS, UI3D_2X } from '../core/constants';

/** Charge les sprites et génère les petites textures procédurales (joystick, plat, effets). */
export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  preload(): void {
    // barre de chargement de l'écran d'accueil (index.html)
    const fill = document.getElementById('splash-fill');
    const label = document.getElementById('splash-txt');
    this.load.on('progress', (v: number) => {
      if (fill) fill.style.width = `${Math.max(4, Math.round(v * 100))}%`;
      if (label) label.textContent = `Chargement... ${Math.round(v * 100)} %`;
    });
    this.load.setPath('assets/');
    for (const c of CHEF_ORDER) {
      this.load.image(c, `sprites/chefs/${c}.png`);
      this.load.image('portrait_' + c, `sprites/chefs/portrait_${c}.png`);
      // grands dessins haute définition (menu en paysage), découpés par tools/extract_hd_chefs.py
      this.load.image('hd_' + c, STYLE_3D ? `sprites3d/${c}.png` : `sprites/chefs/hd_${c}.png`);
      this.load.image('hdp_' + c, STYLE_3D ? `sprites3d/${c}.png` : `sprites/chefs/hdp_${c}.png`);
    }
    // style 3D : la même clé charge l'image 3D à la place du dessin pixel
    const art = (k: string, pixel: string) => (is3d(k) ? `sprites3d/${ART_3D[k]}.png` : pixel);
    for (const f of SPRITE_FILES.chefs) this.load.image(f, art(f, `sprites/chefs/${f}.png`));
    for (const it of SHOP) if (it.sprite) this.load.image(it.sprite, art(it.sprite, `sprites/skins/${it.sprite}.png`));
    // poses d'attaque 3D des costumes
    if (STYLE_3D) for (const it of SHOP) if (it.sprite && it.kind === 'skin') this.load.image(it.sprite + '_atk', `sprites3d/${it.sprite}_atk.png`);
    for (const e of SPRITE_FILES.enemies) this.load.image(e, art(e, `sprites/enemies/${e}.png`));
    // style 3D : les fonds des menus (et les vignettes des mondes) sont tirés des maps 3D
    for (const w of WORLD_ORDER) this.load.image('map_' + w, STYLE_3D ? `maps/port3d_${w}.jpg` : `maps/${w}.png`);
    // grandes maps paysage (le terrain de la partie) ; les petites restent pour les menus
    for (const w of WORLD_ORDER) if (WORLDS[w].wide) this.load.image('wide_' + w, STYLE_3D && WORLD_3D[w] ? `maps/wide3d_${w}.jpg` : `maps/wide_${w}.jpg`);
    if (!STYLE_3D) for (const i of INGREDIENTS) this.load.image('ing_' + i, `ui/ing_${i}.png`);
    for (const u of UPGRADES) this.load.image(u.icon, STYLE_3D && UI3D_2X.includes(u.icon) ? `ui3d/${u.icon}.png` : `ui/${u.icon}.png`);
    // plat, tonneau explosif, boule de feu, cadenas : version 3D (les dessins pixel ne sont alors pas fabriqués)
    if (STYLE_3D) for (const k of ['plat', 'tonneau', 'boule_feu', 'cadenas']) this.load.image(k, `ui3d/${k}.png`);
    this.load.image('logo', '../logo.png');
    // interface façon image de référence (découpée par tools/extract_ui3d.py)
    if (STYLE_3D) for (const k of ['btn_attaque', 'btn_feu', 'joy_pommeau', 'chrono', 'piece', 'pause', 'coeur', 'coeur_vide']) this.load.image('ui3d_' + k, `ui3d/${k}.png`);
    for (const k of ['marmite', 'coeur', 'piece', 'bouton_ultime']) this.load.image(k, STYLE_3D && k === 'marmite' ? 'ui3d/marmite.png' : `ui/${k}.png`);
    // style 3D : planche, comptoir et ingrédients redessinés (même taille que les dessins pixel)
    if (STYLE_3D) for (const k of ['planche', 'comptoir', 'ing_tomate', 'ing_champignon', 'ing_sucre', 'ing_piment']) this.load.image(k, `ui3d/${k}.png`);
  }

  create(): void {
    // les dessins HD sont réduits à l'affichage : lissage pour garder tous les détails
    for (const c of CHEF_ORDER) for (const k of ['hd_' + c, 'hdp_' + c]) this.textures.get(k).setFilter(Phaser.Textures.FilterMode.LINEAR);
    for (const k of this.textures.getTextureKeys()) if (k.startsWith('ui3d_') || (STYLE_3D && (k.startsWith('ing_') || UI3D_2X.includes(k) || ['marmite', 'planche', 'comptoir'].includes(k)))) this.textures.get(k).setFilter(Phaser.Textures.FilterMode.LINEAR);
    // images 3D : lissées (pas de gros pixels)
    for (const k of Object.keys(ART_3D)) if (is3d(k) && this.textures.exists(k)) this.textures.get(k).setFilter(Phaser.Textures.FilterMode.LINEAR);
    const g = this.make.graphics({ x: 0, y: 0 }, false);
    const tex = (key: string, w: number, h: number, draw: () => void) => {
      if (this.textures.exists(key)) return; // déjà chargé (image 3D)
      g.clear();
      draw();
      g.generateTexture(key, w, h);
    };

    // Commandes tactiles redessinées le 14/11 (demande de Rudy) : dessinées 2 fois plus grandes puis affichées
    // à moitié, pour rester nettes avec le rendu fin. Joystick : socle sombre cerclé d'or, 4 flèches, pommeau orange.
    tex('joy_base', 144, 144, () => {
      g.fillStyle(0x0c0c18, 0.55).fillCircle(72, 72, 70);
      g.lineStyle(6, 0x1b1b2b, 1).strokeCircle(72, 72, 67);
      g.lineStyle(4, 0xffc533, 0.85).strokeCircle(72, 72, 64);
      g.lineStyle(2, 0xffffff, 0.18).strokeCircle(72, 72, 44);
      g.fillStyle(0xffe9b0, 0.85);
      g.fillTriangle(72, 14, 62, 28, 82, 28).fillTriangle(72, 130, 62, 116, 82, 116);
      g.fillTriangle(14, 72, 28, 62, 28, 82).fillTriangle(130, 72, 116, 62, 116, 82);
    });
    tex('joy_thumb', 68, 68, () => {
      g.fillStyle(0x1b1b2b, 1).fillCircle(34, 36, 32);
      g.fillStyle(0xa83a14, 1).fillCircle(34, 34, 30);
      g.fillStyle(0xe8642a, 1).fillCircle(34, 32, 26);
      g.fillStyle(0xff9a4a, 1).fillCircle(32, 28, 18);
      g.fillStyle(0xffffff, 0.55).fillEllipse(26, 20, 16, 9);
    });
    // socle du joystick façon image de référence : disque sombre transparent, liseré clair, 4 flèches grises
    tex('joy_base3d', 184, 184, () => {
      g.fillStyle(0x000000, 0.38).fillCircle(92, 92, 90);
      g.lineStyle(3, 0xffffff, 0.22).strokeCircle(92, 92, 88);
      g.fillStyle(0x000000, 0.22).fillCircle(92, 92, 60);
      g.fillStyle(0x9aa0aa, 0.75);
      g.fillTriangle(92, 16, 80, 32, 104, 32).fillTriangle(92, 168, 80, 152, 104, 152);
      g.fillTriangle(16, 92, 32, 80, 32, 104).fillTriangle(168, 92, 152, 80, 152, 104);
    });
    // icône du bouton d'attaque : un hachoir de cuisine
    tex('ico_hachoir', 64, 64, () => {
      g.fillStyle(0x1b1b2b, 1).fillRoundedRect(10, 6, 36, 30, 4).fillRect(22, 34, 12, 26);
      g.fillStyle(0xdfe7f0, 1).fillRoundedRect(12, 8, 32, 26, 3);
      g.fillStyle(0xffffff, 1).fillRect(12, 8, 32, 5);
      g.fillStyle(0x9aa6b8, 1).fillRect(12, 28, 32, 6);
      g.fillStyle(0x1b1b2b, 1).fillCircle(36, 15, 3);
      g.fillStyle(0x8a5a33, 1).fillRect(24, 36, 8, 22);
      g.fillStyle(0xb9814c, 1).fillRect(24, 36, 3, 22);
    });
    // bouton des flammes (attaque ultime) : disque de braise et grande flamme
    tex('btn_feu', 128, 128, () => {
      g.fillStyle(0x1b1b2b, 1).fillCircle(64, 66, 62);
      g.fillStyle(0x7a1a10, 1).fillCircle(64, 64, 58);
      g.fillStyle(0xc8321e, 1).fillCircle(64, 62, 54);
      g.fillStyle(0xe8482a, 1).fillCircle(64, 58, 44);
      const flame = (cx: number, base: number, w: number, h: number, color: number) => {
        g.fillStyle(color, 1).fillCircle(cx, base - w / 2, w / 2).fillTriangle(cx - w / 2, base - w / 2, cx + w / 2, base - w / 2, cx + w * 0.12, base - h);
      };
      flame(64, 104, 56, 86, 0xff7a1e);
      flame(50, 100, 22, 52, 0xff7a1e);
      flame(80, 100, 22, 50, 0xff7a1e);
      flame(64, 102, 38, 64, 0xffc533);
      flame(64, 100, 20, 38, 0xfff3b0);
      g.fillStyle(0xffffff, 0.3).fillEllipse(48, 30, 40, 16);
    });
    if (STYLE_3D) {
      // style 3D : petits éléments redessinés lisses (formes rondes, dégradés), à la place des dessins pixel
      tex('etincelle', 24, 24, () => {
        g.fillStyle(0xffffff, 0.35).fillCircle(12, 12, 7);
        g.fillStyle(0xffffff, 1);
        g.fillTriangle(12, 0, 14.5, 12, 9.5, 12).fillTriangle(12, 24, 14.5, 12, 9.5, 12);
        g.fillTriangle(0, 12, 12, 9.5, 12, 14.5).fillTriangle(24, 12, 12, 9.5, 12, 14.5);
        g.fillCircle(12, 12, 3);
      });
      tex('couteau', 8, 20, () => {
        g.fillStyle(0xdfe7f0, 1).fillRoundedRect(1.5, 0.5, 5, 12, { tl: 2.5, tr: 2.5, bl: 0, br: 0 });
        g.fillStyle(0xffffff, 0.9).fillRect(2, 1.5, 1.5, 10);
        g.fillStyle(0x7a4a26, 1).fillRoundedRect(2.5, 12, 3, 7.5, 1.5);
      });
      tex('tourelle', 20, 18, () => {
        g.fillStyle(0x5a6274, 1).fillRoundedRect(2, 7, 16, 11, 4);
        g.fillStyle(0x9aa6bc, 1).fillRoundedRect(3, 8, 14, 6, 3);
        g.fillStyle(0x6a7284, 1).fillRoundedRect(8, 0, 4, 9, 2);
        g.fillStyle(0xff5a3c, 1).fillCircle(10, 12, 2.5);
      });
      tex('fumee', 64, 64, () => {
        for (let r = 30; r > 4; r -= 3) g.fillStyle(0x2a2a33, 0.12).fillCircle(32, 32, r);
      });
      tex('fleche_tapis', 24, 12, () => {
        g.lineStyle(3, 0x4ff3ff, 0.9);
        g.beginPath().moveTo(4, 2).lineTo(10, 6).lineTo(4, 10).strokePath();
        g.beginPath().moveTo(14, 2).lineTo(20, 6).lineTo(14, 10).strokePath();
      });
      tex('ico_stand', 12, 10, () => {
        g.fillStyle(0xe8483a, 1).fillRoundedRect(0.5, 0.5, 11, 4.5, { tl: 2, tr: 2, bl: 0, br: 0 });
        g.fillStyle(0xffffff, 1).fillRect(3, 0.5, 2, 4.5).fillRect(7, 0.5, 2, 4.5);
        g.fillStyle(0xa9713d, 1).fillRoundedRect(1, 5, 10, 4.5, 1.5);
      });
    }
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
    if (STYLE_3D) {
      // style 3D : plus de petits carrés (Rudy, 15/11) ; braise ronde et douce (lumineuse au centre, floue au bord)
      tex('particule', 8, 8, () => {
        for (let r = 4; r >= 1; r -= 0.5) g.fillStyle(0xffffff, 0.16 + (4 - r) * 0.2).fillCircle(4, 4, r);
      });
      // petite flamme en goutte (blanche, teintée à l'usage) : jaillit vers le haut
      tex('flammeche', 12, 20, () => {
        for (const [w, a] of [[6, 0.35], [4.5, 0.7], [3, 1]] as const) {
          g.fillStyle(0xffffff, a).fillCircle(6, 14, w);
          g.fillTriangle(6 - w, 14, 6 + w, 14, 6, 14 - w * 2.6);
        }
      });
    } else tex('particule', 4, 4, () => g.fillStyle(0xffffff).fillRect(0, 0, 4, 4));
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
