import Phaser from 'phaser';
import { audio } from '../audio/AudioManager';
import { ChefId, FREE_WORLDS, H, STYLE_3D, W, WORLD_ORDER, WorldId, worldUnlocked, WORLDS } from '../core/constants';
import { loadProfile, saveProfile } from '../core/Storage';
import { setupLandscapeMenu } from '../ui/landscapeMenu';
import { openModal } from '../ui/Modal';
import { button, txt } from '../ui/text';

/**
 * Onglet « LES MAPS » (demande de Rudy, 15/11) : les 8 maps en grand, débloquées ou non ; on en choisit une et on joue.
 */
export class MapsScene extends Phaser.Scene {
  constructor() {
    super('Maps');
  }

  create(): void {
    const p = loadProfile();
    this.add.image(0, 0, 'map_' + p.world).setOrigin(0).setDisplaySize(W, H);
    this.add.rectangle(0, 0, W, H, 0x0c0c18, 0.84).setOrigin(0);
    txt(this, W / 2, 24, 'LES MAPS', 16, '#ffc533').setOrigin(0.5);
    txt(this, W / 2, 44, `${WORLD_ORDER.filter((w) => worldUnlocked(w, p.unlocked, p.owned)).length} / ${WORLD_ORDER.length} débloquées`, 8, '#bfc8e0').setOrigin(0.5, 0);
    WORLD_ORDER.forEach((id, i) => this.card(id, i, p.world, worldUnlocked(id, p.unlocked, p.owned)));
    button(this, W / 2, 616, 170, 32, 'RETOUR', 0x4a4f66, () => this.scene.start('Menu'));
    setupLandscapeMenu(this);
  }

  /** Une carte : la map en vignette, son nom, et un cadenas si elle est bloquée. */
  private card(id: WorldId, i: number, current: WorldId, open: boolean): void {
    const cw = 164;
    const ch = 92;
    const x = 12 + (i % 2) * (cw + 8);
    const y = 70 + Math.floor(i / 2) * 134;
    const w = WORLDS[id];
    const g = this.add.graphics();
    g.fillStyle(0x000000, 0.45).fillRoundedRect(x, y + 3, cw, ch + 28, 10);
    g.fillStyle(id === current ? 0xffc533 : open ? 0x8a5a1e : 0x3a3f55, 1).fillRoundedRect(x, y, cw, ch + 28, 10);
    g.fillStyle(0x1b1424, 1).fillRoundedRect(x + 3, y + ch + 3, cw - 6, 22, { tl: 0, tr: 0, bl: 8, br: 8 });
    const img = this.add.image(x + 3, y + 3, (STYLE_3D ? 'thumb_' : 'map_') + id).setOrigin(0).setDisplaySize(cw - 6, ch);
    if (!open) img.setTint(0x44445a);
    txt(this, x + cw / 2, y + ch + 14, `${i + 1}. ${w.name}`, 8, open ? '#ffe9b0' : '#8a90a8').setOrigin(0.5);
    if (!open) {
      const lock = this.add.image(x + cw / 2, y + ch / 2 - 6, 'cadenas');
      lock.setScale(30 / Math.max(lock.width, lock.height));
      txt(this, x + cw / 2, y + ch / 2 + 22, i < FREE_WORLDS ? `Bats le boss du monde ${i}` : 'BOUTIQUE > PACKS', 8, '#ff9d8a').setOrigin(0.5);
    }
    this.add.zone(x, y, cw, ch + 28).setOrigin(0).setInteractive({ useHandCursor: true }).on('pointerup', () => this.open(id, i, open));
  }

  private open(id: WorldId, i: number, open: boolean): void {
    audio.sfx('clic');
    const w = WORLDS[id];
    if (!open) {
      openModal(this, w.name, [
        ...(i >= FREE_WORLDS ? [{ label: 'VOIR LA BOUTIQUE', color: 0xc98a1e, action: () => { this.scene.start('Shop'); } }] : []),
        { label: 'FERMER', action: () => {} },
      ], i < FREE_WORLDS ? `Map bloquée.\nBats le boss du monde ${i}\npour l'ouvrir.` : 'Map bloquée.\nElle s\'obtient avec son pack\ndans la BOUTIQUE.');
      return;
    }
    const chef: ChefId = loadProfile().chef;
    const go = (mode: 'solo' | 'duel') => {
      saveProfile({ world: id });
      if (mode === 'duel') this.scene.start('Duel', { chef, world: id });
      else this.scene.start('Game', { chef, world: id, mode: 'solo' });
    };
    openModal(this, w.name, [
      { label: 'JOUER SOLO', color: 0xe8642a, action: () => go('solo') },
      { label: 'DUEL', color: 0xb03a5a, action: () => go('duel') },
      { label: 'CHOISIR ET REVENIR', color: 0x3d5c8f, action: () => { saveProfile({ world: id }); this.scene.start('Menu'); } },
      { label: 'FERMER', action: () => {} },
    ], w.hint);
  }
}
