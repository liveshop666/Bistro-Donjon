import Phaser from 'phaser';
import { H, STYLE_3D, W } from '../core/constants';
import { button, txt } from './text';

export interface ModalItem {
  label: string | (() => string);
  color?: number;
  /** Renvoyer false laisse la fenêtre ouverte (ex. bascule du son). */
  action: () => boolean | void;
}

/** Fenêtre de menu centrée (pause, confirmation…). Renvoie la fonction qui la ferme. */
export function openModal(scene: Phaser.Scene, title: string, items: ModalItem[], note = ''): () => void {
  const D = 3200;
  const objs: Phaser.GameObjects.GameObject[] = [];
  const close = () => objs.forEach((o) => o.destroy());
  const noteH = note ? 14 + note.split('\n').length * 11 : 0;
  const h = 80 + items.length * 40 + noteH;
  const top = Math.round((H - h) / 2);
  objs.push(scene.add.rectangle(0, 0, W, H, 0x0c0c18, 0.8).setOrigin(0).setDepth(D).setInteractive());
  const g = scene.add.graphics().setDepth(D + 1);
  if (STYLE_3D) {
    // fenêtre arrondie, fond sombre chaud, liseré doré
    g.fillStyle(0x000000, 0.5).fillRoundedRect(22, top + 4, W - 44, h, 16);
    g.fillStyle(0x8a5a1e).fillRoundedRect(22, top, W - 44, h, 16);
    g.fillStyle(0x241a24).fillRoundedRect(25, top + 3, W - 50, h - 6, 14);
    g.fillStyle(0x3a2a30).fillRoundedRect(25, top + 3, W - 50, 40, { tl: 14, tr: 14, bl: 0, br: 0 });
  } else {
  g.fillStyle(0x3b2414).fillRect(24, top, W - 48, h);
  g.fillStyle(0x24243a).fillRect(26, top + 2, W - 52, h - 4);
  }
  objs.push(g, txt(scene, W / 2, top + 26, title, 16, '#ffc533').setOrigin(0.5).setDepth(D + 2));
  if (note) objs.push(txt(scene, W / 2, top + 46, note, 8, '#bfc8e0').setOrigin(0.5, 0).setDepth(D + 2));
  items.forEach((it, i) => {
    const text = () => (typeof it.label === 'function' ? it.label() : it.label);
    const b = button(scene, W / 2, top + 70 + noteH + i * 40, 230, 32, text(), it.color ?? 0x4a4f66, () => {
      if (it.action() === false) (b.getAt(1) as Phaser.GameObjects.Text).setText(text());
      else close();
    }).setDepth(D + 2);
    objs.push(b);
  });
  return close;
}
