import Phaser from 'phaser';
import { audio } from '../audio/AudioManager';
import { FONT, STYLE_3D } from '../core/constants';

/** Texte pixel (Press Start 2P) avec ombre portée d'un pixel. Tailles conseillées : 8 ou 16. */
export function txt(scene: Phaser.Scene, x: number, y: number, str: string, size = 8, color = '#ffffff'): Phaser.GameObjects.Text {
  if (STYLE_3D) {
    // style 3D : police arrondie (Lilita One), un peu plus grande, contour sombre comme sur l'image de référence
    const px = size <= 8 ? 12 : size <= 16 ? 21 : 34; // plus grand et lisible (Rudy, 15/11)
    return scene.add
      .text(x, y, str, { fontFamily: '"Lilita One"', fontSize: `${px}px`, color, align: 'center', lineSpacing: 0 })
      .setStroke('#1a1018', size <= 8 ? 3 : 4)
      .setShadow(0, 1, '#000000', 1, true, true);
  }
  return scene.add
    .text(x, y, str, { fontFamily: FONT, fontSize: `${size}px`, color, align: 'center', lineSpacing: 3 })
    .setShadow(1, 1, '#000000', 0, false, true);
}

/** Bouton rectangulaire pixel. */
export function button(scene: Phaser.Scene, x: number, y: number, w: number, h: number, label: string, color: number, onClick: () => void): Phaser.GameObjects.Container {
  const bg = scene.add.graphics();
  const draw = (pressed: boolean) => {
    bg.clear();
    if (STYLE_3D) {
      // bouton bombé façon jeu mobile : ombre, bord foncé, corps coloré, reflet clair en haut ; il s'enfonce quand on appuie
      const base = Phaser.Display.Color.ValueToColor(color);
      const r = Math.min(10, h / 2);
      const dy = pressed ? 2 : 0;
      bg.fillStyle(0x000000, 0.45).fillRoundedRect(-w / 2, -h / 2 + 3, w, h, r);
      bg.fillStyle(base.clone().darken(30).color, 1).fillRoundedRect(-w / 2, -h / 2 + dy, w, h, r);
      bg.fillStyle(color, 1).fillRoundedRect(-w / 2 + 2, -h / 2 + 2 + dy, w - 4, h - 6, r - 2);
      bg.fillStyle(base.clone().lighten(22).color, 1).fillRoundedRect(-w / 2 + 4, -h / 2 + 3 + dy, w - 8, (h - 6) * 0.45, { tl: r - 3, tr: r - 3, bl: 2, br: 2 });
      t.setY(dy - 1);
      return;
    }
    bg.fillStyle(0x1b1b2b).fillRect(-w / 2, -h / 2, w, h);
    bg.fillStyle(color).fillRect(-w / 2 + 2, -h / 2 + 2, w - 4, h - 4);
    bg.fillStyle(0x000000, 0.25).fillRect(-w / 2 + 2, pressed ? -h / 2 + 2 : h / 2 - 6, w - 4, 4);
  };
  const t = txt(scene, 0, 0, label).setOrigin(0.5);
  draw(false);
  const c = scene.add.container(x, y, [bg, t]).setSize(w, h).setInteractive({ useHandCursor: true });
  c.on('pointerdown', () => draw(true));
  c.on('pointerout', () => draw(false));
  c.on('pointerup', () => {
    draw(false);
    audio.sfx('clic');
    onClick();
  });
  return c;
}
