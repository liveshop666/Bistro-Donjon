import Phaser from 'phaser';
import { H, W } from '../core/constants';
import { button, txt } from './text';

const KEYS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

/**
 * Clavier dessiné dans le jeu (pas celui du téléphone, qui déformait l'écran).
 * Saisie en majuscules, lettres et chiffres, espace et effacement. Appelle onOk avec le texte validé.
 */
export function openKeyboard(scene: Phaser.Scene, title: string, initial: string, max: number, onOk: (text: string) => void): void {
  const D = 3200;
  const objs: Phaser.GameObjects.GameObject[] = [];
  const close = () => objs.forEach((o) => o.destroy());
  let value = initial.toUpperCase().slice(0, max);

  objs.push(scene.add.rectangle(0, 0, W, H, 0x0c0c18, 0.92).setOrigin(0).setDepth(D).setInteractive());
  const g = scene.add.graphics().setDepth(D + 1);
  g.fillStyle(0x3b2414).fillRect(8, 60, W - 16, 520);
  g.fillStyle(0x24243a).fillRect(10, 62, W - 20, 516);
  g.fillStyle(0x14141f).fillRect(40, 118, W - 80, 36);
  objs.push(g, txt(scene, W / 2, 90, title, 16, '#ffc533').setOrigin(0.5).setDepth(D + 2));
  const field = txt(scene, W / 2, 136, '', 16, '#ffffff').setOrigin(0.5).setDepth(D + 2);
  const count = txt(scene, W / 2, 166, '', 8, '#6b7391').setOrigin(0.5).setDepth(D + 2);
  objs.push(field, count);
  const show = () => {
    field.setText(value + (value.length < max ? '_' : ''));
    count.setText(`${value.length}/${max}`);
  };
  const key = (x: number, y: number, w: number, label: string, color: number, action: () => void) =>
    objs.push(button(scene, x, y, w, 38, label, color, action).setDepth(D + 2));

  [...KEYS].forEach((ch, i) => {
    key(40 + (i % 6) * 56, 200 + Math.floor(i / 6) * 44, 50, ch, 0x4a4f66, () => {
      if (value.length < max) value += ch;
      show();
    });
  });
  key(96, 470, 162, 'ESPACE', 0x3d5c8f, () => {
    if (value.length > 0 && value.length < max && !value.endsWith(' ')) value += ' ';
    show();
  });
  key(264, 470, 162, 'EFFACER', 0x9a3a2e, () => {
    value = value.slice(0, -1);
    show();
  });
  key(96, 530, 162, 'ANNULER', 0x4a4f66, close);
  key(264, 530, 162, 'OK', 0x3d7a4a, () => {
    close();
    onOk(value.trim());
  });
  show();
}
