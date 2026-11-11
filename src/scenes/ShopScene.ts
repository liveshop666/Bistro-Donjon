import Phaser from 'phaser';
import { audio } from '../audio/AudioManager';
import { billing } from '../core/Billing';
import { CHEFS, H, SHOP, ShopItem, W } from '../core/constants';
import { loadProfile, saveProfile } from '../core/Storage';
import { openModal } from '../ui/Modal';
import { button, txt } from '../ui/text';

/** Boutique de cosmétiques : costumes de chefs et effets d'arme. Aucun avantage en jeu. */
export class ShopScene extends Phaser.Scene {
  private coins!: Phaser.GameObjects.Text;
  private cards: Phaser.GameObjects.GameObject[] = [];

  constructor() {
    super('Shop');
  }

  create(): void {
    this.cards = [];
    this.add.image(0, 0, 'map_marche').setOrigin(0);
    this.add.rectangle(0, 0, W, H, 0x0c0c18, 0.84).setOrigin(0);
    txt(this, W / 2, 24, 'BOUTIQUE', 16, '#ffc533').setOrigin(0.5);
    this.add.image(W / 2 - 50, 50, 'piece');
    this.coins = txt(this, W / 2 - 38, 50, '', 8, '#ffd23e').setOrigin(0, 0.5);
    txt(this, W / 2, 68, 'Costumes et effets : pour le style,\nsans avantage en jeu.', 8, '#bfc8e0').setOrigin(0.5, 0);
    button(this, W / 2, 610, 160, 32, 'RETOUR', 0x4a4f66, () => this.scene.start('Menu'));
    this.draw();
  }

  private draw(): void {
    this.cards.forEach((c) => c.destroy());
    this.cards = [];
    const p = loadProfile();
    this.coins.setText(`${p.coins} PIECES`);
    SHOP.forEach((it, i) => {
      const x = 64 + (i % 3) * 116;
      const y = 172 + Math.floor(i / 3) * 158;
      const owned = p.owned.includes(it.id);
      const equipped = it.kind === 'skin' ? p.skins[it.chef!] === it.id : p.effect === it.id;
      const g = this.add.graphics();
      g.fillStyle(equipped ? 0xffc533 : 0x1b1b2b).fillRect(-54, -74, 108, 148);
      g.fillStyle(owned ? 0x2f5a3a : 0x2a2a44).fillRect(-52, -72, 104, 144);
      g.fillStyle(0x14141f, 0.6).fillRect(-46, -40, 92, 62);
      const preview = it.sprite ? this.add.image(0, -8, it.sprite) : this.slash(it.color ?? 0xffffff);
      const status = equipped ? 'EQUIPE' : owned ? 'ACHETE' : `${it.coins}`;
      const c = this.add
        .container(x, y, [
          g,
          txt(this, 0, -57, it.name).setOrigin(0.5),
          preview,
          txt(this, 0, 38, status, 8, equipped ? '#ffc533' : owned ? '#7dff7d' : '#ffd23e').setOrigin(0.5),
          txt(this, 0, 56, owned ? '' : `ou ${it.euro}`, 8, '#bfc8e0').setOrigin(0.5),
        ])
        .setSize(108, 148)
        .setInteractive({ useHandCursor: true });
      c.on('pointerup', () => this.open(it));
      this.cards.push(c);
    });
  }

  /** Aperçu d'un effet d'arme : un arc de la couleur de l'effet. */
  private slash(color: number): Phaser.GameObjects.Graphics {
    const g = this.add.graphics();
    g.lineStyle(7, color, 0.9).beginPath().arc(-6, -4, 24, -1.1, 1.1).strokePath();
    g.lineStyle(3, 0xffffff, 0.9).beginPath().arc(-6, -4, 27, -0.9, 0.9).strokePath();
    return g;
  }

  private open(it: ShopItem): void {
    audio.sfx('clic');
    const p = loadProfile();
    const owned = p.owned.includes(it.id);
    const equipped = it.kind === 'skin' ? p.skins[it.chef!] === it.id : p.effect === it.id;
    const who = it.kind === 'skin' ? `Costume pour ${CHEFS[it.chef!].name}` : 'Effet pour tous les chefs';
    const title = it.name.replace('\n', ' ');
    const equip = (on: boolean) => {
      const q = loadProfile();
      if (it.kind === 'skin') saveProfile({ skins: { ...q.skins, [it.chef!]: on ? it.id : undefined } });
      else saveProfile({ effect: on ? it.id : null });
      this.draw();
    };
    const info = (heading: string, note: string) => this.time.delayedCall(50, () => openModal(this, heading, [{ label: 'OK', action: () => {} }], note));
    if (owned) {
      openModal(this, title, [
        { label: equipped ? 'RETIRER' : 'EQUIPER', color: 0xe8642a, action: () => equip(!equipped) },
        { label: 'FERMER', action: () => {} },
      ], `${who}\n${it.desc}`);
      return;
    }
    openModal(this, title, [
      {
        label: `ACHETER : ${it.coins} PIECES`, color: p.coins >= it.coins ? 0x3d7a4a : 0x4a4f66,
        action: () => {
          const q = loadProfile();
          if (q.coins < it.coins) {
            audio.sfx('parti');
            info('PAS ASSEZ', `Il te manque ${it.coins - q.coins} pièces.\nJoue pour en gagner !`);
            return;
          }
          saveProfile({ coins: q.coins - it.coins, owned: [...q.owned, it.id] });
          audio.sfx('piece');
          equip(true);
        },
      },
      {
        label: `ACHETER : ${it.euro}`, color: 0xb03a5a,
        action: () => {
          void billing.buy(it.id).then((ok) => {
            if (ok) {
              const q = loadProfile();
              saveProfile({ owned: [...q.owned, it.id] });
              audio.sfx('piece');
              equip(true);
            } else if (!billing.available) info('BIENTOT', 'Le paiement arrive bientôt.\nEn attendant, utilise tes pièces !');
          });
        },
      },
      { label: 'FERMER', action: () => {} },
    ], `${who}\n${it.desc}`);
  }
}
