import Phaser from 'phaser';
import { FONT } from '../core/constants';

/** Texte pixel (Press Start 2P) avec ombre portée d'un pixel. Tailles conseillées : 8 ou 16. */
export function txt(scene: Phaser.Scene, x: number, y: number, str: string, size = 8, color = '#ffffff'): Phaser.GameObjects.Text {
  return scene.add
    .text(x, y, str, { fontFamily: FONT, fontSize: `${size}px`, color, align: 'center', lineSpacing: 3 })
    .setShadow(1, 1, '#000000', 0, false, true);
}

/** Bouton rectangulaire pixel. */
export function button(scene: Phaser.Scene, x: number, y: number, w: number, h: number, label: string, color: number, onClick: () => void): Phaser.GameObjects.Container {
  const bg = scene.add.graphics();
  const draw = (pressed: boolean) => {
    bg.clear();
    bg.fillStyle(0x1b1b2b).fillRect(-w / 2, -h / 2, w, h);
    bg.fillStyle(color).fillRect(-w / 2 + 2, -h / 2 + 2, w - 4, h - 4);
    bg.fillStyle(0x000000, 0.25).fillRect(-w / 2 + 2, pressed ? -h / 2 + 2 : h / 2 - 6, w - 4, 4);
  };
  draw(false);
  const t = txt(scene, 0, 0, label).setOrigin(0.5);
  const c = scene.add.container(x, y, [bg, t]).setSize(w, h).setInteractive({ useHandCursor: true });
  c.on('pointerdown', () => draw(true));
  c.on('pointerout', () => draw(false));
  c.on('pointerup', () => {
    draw(false);
    onClick();
  });
  return c;
}
