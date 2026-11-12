import Phaser from 'phaser';
import { setupLandscapeMenu } from '../ui/landscapeMenu';
import { audio } from '../audio/AudioManager';
import { ChefId, CHEFS, H, W, WorldId } from '../core/constants';
import { loadProfile } from '../core/Storage';
import { BotLink } from '../network/DuelLink';
import { MultiplayerClient } from '../network/MultiplayerClient';
import { button, txt } from '../ui/text';

/** Salon du mode Duel « Guerre des Stands » : contre l'ordinateur ou en ligne. */
export class DuelScene extends Phaser.Scene {
  private chef: ChefId = 'moustachu';
  private world: WorldId = 'clairiere';
  private client: MultiplayerClient | null = null;
  private status!: Phaser.GameObjects.Text;
  private menu: Phaser.GameObjects.GameObject[] = [];
  private pad: Phaser.GameObjects.GameObject[] = [];
  private code = '';

  constructor() {
    super('Duel');
  }

  init(data: { chef?: ChefId; world?: WorldId }): void {
    this.chef = data.chef ?? 'moustachu';
    this.world = data.world ?? 'clairiere';
  }

  create(): void {
    this.client = null;
    this.menu = [];
    this.pad = [];
    this.add.image(0, 0, 'map_' + this.world).setOrigin(0);
    this.add.rectangle(0, 0, W, H, 0x0c0c18, 0.8).setOrigin(0);
    txt(this, W / 2, 50, 'GUERRE DES\nSTANDS', 16, '#ff6a5a').setOrigin(0.5).setStroke('#1b1b2b', 4);
    this.add.image(W / 2 - 60, 120, 'portrait_' + this.chef);
    txt(this, W / 2, 120, 'VS', 16, '#ffc533').setOrigin(0.5);
    this.add.image(W / 2 + 60, 120, 'roi_tomate').setScale(0.55);
    txt(this, W / 2, 176, '2 minutes. Le plus riche gagne.\n3 plats d\'affilée = sabotage !', 8, '#bfc8e0').setOrigin(0.5);
    this.status = txt(this, W / 2, 470, '', 8, '#ffe27a').setOrigin(0.5, 0);

    const items: [string, number, () => void][] = [
      ["CONTRE L'ORDINATEUR", 0xe8642a, () => this.start(new BotLink())],
      ['EN LIGNE : PARTIE RAPIDE', 0xb03a5a, () => this.online('quick')],
      ['EN LIGNE : CREER UN SALON', 0x3d5c8f, () => this.online('create')],
      ['EN LIGNE : REJOINDRE', 0x3d5c8f, () => this.showPad()],
    ];
    items.forEach(([label, color, cb], i) => this.menu.push(button(this, W / 2, 230 + i * 48, 280, 38, label, color, cb)));
    button(this, W / 2, 600, 160, 32, 'RETOUR', 0x4a4f66, () => {
      this.client?.close();
      this.scene.start('Menu');
    });
    this.events.once('shutdown', () => {
      // la connexion n'est conservée que si elle est transmise à la partie
      if (this.client && !this.handedOver) this.client.close();
    });
    this.handedOver = false;
    setupLandscapeMenu(this); // paysage : la page en deux colonnes qui remplissent l'écran
  }
  private handedOver = false;

  private start(link: BotLink | MultiplayerClient): void {
    this.handedOver = true;
    this.scene.start('Game', { chef: this.chef, world: this.world, mode: 'duel', link });
  }

  private online(t: 'quick' | 'create' | 'join', code?: string): void {
    this.client?.close();
    const c = (this.client = new MultiplayerClient());
    this.status.setText('CONNEXION AU SERVEUR...').setColor('#ffe27a');
    c.onRoom = (room) => this.status.setText(`SALON CREE ! TON CODE :\n\n${room.split('').join(' ')}\n\nDonne-le a ton ami.\nEn attente...`).setColor('#7dff7d');
    c.onStart = () => {
      audio.sfx('vague');
      this.start(c);
    };
    c.onError = (msg) => {
      this.client = null;
      audio.sfx('parti');
      this.status
        .setText(msg === 'SERVEUR INJOIGNABLE' ? "SERVEUR INJOIGNABLE\nVerifie ta connexion,\nou joue contre l'ordinateur." : msg)
        .setColor('#ff6a5a');
    };
    c.open({ t, code, name: loadProfile().pseudo || (CHEFS[this.chef].name.split(' ').pop() ?? 'CHEF'), chef: this.chef });
    if (t === 'quick') this.status.setText("RECHERCHE D'UN RIVAL...");
  }

  /** Pavé numérique pour saisir le code à 4 chiffres d'un salon. */
  private showPad(): void {
    this.code = '';
    this.menu.forEach((m) => (m as Phaser.GameObjects.Container).setVisible(false));
    this.status.setText('');
    const add = <T extends Phaser.GameObjects.GameObject>(o: T): T => (this.pad.push(o), o);
    const display = add(txt(this, W / 2, 226, '_ _ _ _', 16, '#ffc533').setOrigin(0.5));
    add(txt(this, W / 2, 204, 'CODE DU SALON', 8, '#8fe0ff').setOrigin(0.5));
    const refresh = () => display.setText((this.code + '____').slice(0, 4).split('').join(' '));
    const close = () => {
      this.pad.forEach((o) => o.destroy());
      this.pad = [];
      this.menu.forEach((m) => (m as Phaser.GameObjects.Container).setVisible(true));
    };
    ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'X', '0', 'OK'].forEach((k, i) => {
      const x = W / 2 + ((i % 3) - 1) * 66;
      const y = 270 + Math.floor(i / 3) * 44;
      add(
        button(this, x, y, 58, 36, k, k === 'OK' ? 0x3d7a4a : k === 'X' ? 0x9a3a2e : 0x4a4f66, () => {
          if (k === 'X') {
            if (this.code) this.code = this.code.slice(0, -1);
            else return close();
          } else if (k === 'OK') {
            if (this.code.length === 4) {
              const code = this.code;
              close();
              this.online('join', code);
            }
            return;
          } else if (this.code.length < 4) this.code += k;
          refresh();
        }),
      );
    });
  }
}
