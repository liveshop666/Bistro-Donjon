import Phaser from 'phaser';
import { audio } from '../audio/AudioManager';
import { billing } from '../core/Billing';
import { CHEFS, H, itemLabel, RARITY, SHOP, ShopItem, W } from '../core/constants';
import { addCoins, loadProfile, nextMilestone, saveProfile } from '../core/Storage';
import { openModal } from '../ui/Modal';
import { button, txt } from '../ui/text';

type Tab = 'skin' | 'combattant' | 'effet' | 'pack';
const tabOf = (it: ShopItem): Tab => (it.kind === 'skin' ? (it.fighter ? 'combattant' : 'skin') : it.kind);
/** Un pack est possédé quand tout son contenu l'est. */
const has = (owned: string[], it: ShopItem): boolean => (it.kind === 'pack' ? (it.items ?? []).every((id) => owned.includes(id)) : owned.includes(it.id));

/**
 * Boutique de cosmétiques : costumes de chefs et effets d'arme, classés par rareté. Aucun avantage en jeu.
 * Trois façons d'obtenir un article : pièces gagnées en jouant, cadeau de palier (gratuit), premium (argent réel).
 */
export class ShopScene extends Phaser.Scene {
  private tab: Tab = 'skin';
  private dyn: Phaser.GameObjects.GameObject[] = [];

  constructor() {
    super('Shop');
  }

  create(): void {
    this.dyn = [];
    addCoins(0); // débloque les cadeaux de palier déjà mérités (anciens profils)
    this.add.image(0, 0, 'map_marche').setOrigin(0);
    this.add.rectangle(0, 0, W, H, 0x0c0c18, 0.84).setOrigin(0);
    txt(this, W / 2, 24, 'BOUTIQUE', 16, '#ffc533').setOrigin(0.5);
    txt(this, W / 2, 474, 'PIECES : gagne-les en jouant.', 8, '#ffd23e').setOrigin(0.5, 0);
    txt(this, W / 2, 490, 'CADEAU : gratuit, selon ton total gagné.', 8, '#7dff7d').setOrigin(0.5, 0);
    txt(this, W / 2, 506, 'PREMIUM : les plus rares, à acheter.', 8, '#ff9ad0').setOrigin(0.5, 0);
    txt(this, W / 2, 530, 'Pour le style : aucun avantage en jeu.', 8, '#bfc8e0').setOrigin(0.5, 0);
    button(this, W / 2, 610, 160, 32, 'RETOUR', 0x4a4f66, () => this.scene.start('Menu'));
    audio.music('boutique');
    this.draw();
  }

  private draw(): void {
    this.dyn.forEach((c) => c.destroy());
    this.dyn = [];
    const add = <T extends Phaser.GameObjects.GameObject>(o: T): T => (this.dyn.push(o), o);
    const p = loadProfile();

    // pièces, total gagné et progression vers le prochain cadeau
    add(this.add.image(W / 2 - 50, 50, 'piece'));
    add(txt(this, W / 2 - 38, 50, `${p.coins} PIECES`, 8, '#ffd23e').setOrigin(0, 0.5));
    const next = nextMilestone();
    const bar = add(this.add.graphics());
    bar.fillStyle(0x1b1b2b).fillRect(60, 94, 240, 8);
    if (next) {
      add(txt(this, W / 2, 66, `TOTAL GAGNE : ${p.earned}`, 8, '#bfc8e0').setOrigin(0.5, 0));
      add(txt(this, W / 2, 80, `PROCHAIN CADEAU A ${next.item.palier} : ${itemLabel(next.item)}`, 8, '#7dff7d').setOrigin(0.5, 0));
      bar.fillStyle(0x3fae3f).fillRect(61, 95, Math.round((238 * p.earned) / next.item.palier!), 6);
    } else {
      add(txt(this, W / 2, 66, `TOTAL GAGNE : ${p.earned}`, 8, '#bfc8e0').setOrigin(0.5, 0));
      add(txt(this, W / 2, 80, 'TOUS LES CADEAUX SONT DEBLOQUES !', 8, '#7dff7d').setOrigin(0.5, 0));
      bar.fillStyle(0xffc533).fillRect(61, 95, 238, 6);
    }

    // onglets
    const tabBtn = (x: number, tab: Tab, label: string) =>
      add(button(this, x, 124, 82, 26, label, this.tab === tab ? 0xe8642a : 0x3a3f55, () => {
        this.tab = tab;
        this.draw();
      }));
    tabBtn(49, 'skin', 'COSTUMES');
    tabBtn(136, 'combattant', 'COMBAT');
    tabBtn(223, 'effet', 'EFFETS');
    tabBtn(310, 'pack', 'PACKS');

    SHOP.filter((it) => tabOf(it) === this.tab).forEach((it, i) => {
      const x = 64 + (i % 3) * 116;
      const y = 222 + Math.floor(i / 3) * 158;
      const owned = has(p.owned, it);
      const equipped = owned && (it.kind === 'skin' ? p.skins[it.chef!] === it.id : p.effect === it.id);
      const r = RARITY[it.rarity];
      const g = this.add.graphics();
      g.fillStyle(r.color).fillRect(-54, -74, 108, 148);
      g.fillStyle(owned ? 0x2f5a3a : 0x2a2a44).fillRect(-51, -71, 102, 142);
      g.fillStyle(0x14141f, 0.6).fillRect(-46, -40, 92, 62);
      const preview = it.world
        ? this.add.container(0, 0, [this.add.image(-24, -9, 'map_' + it.world).setScale(58 / 640), this.fit(this.add.image(16, -6, it.sprite!), 52, 52)])
        : it.sprite ? this.fit(this.add.image(0, -8, it.sprite)) : this.slash(it.color ?? 0xffffff, !!it.rainbow);
      let status: string;
      let detail = '';
      let color = '#ffd23e';
      let detailColor = '#bfc8e0';
      if (equipped) [status, color] = ['EQUIPE', '#ffc533'];
      else if (owned) [status, color] = ['OBTENU', '#7dff7d'];
      else if (it.kind === 'pack') {
        // pack de monde : le prix en euros, et bien en vert qu'il peut aussi être gratuit
        [status, color] = [it.euro ?? '', '#ff9ad0'];
        if (it.coins) [detail, detailColor] = [`GRATUIT ${Math.round(it.coins / 1000)}K`, '#7dff7d'];
      }
      else if (it.coins !== undefined) status = `${it.coins} PIECES`;
      else if (it.palier !== undefined) [status, detail, color] = ['CADEAU', `A ${it.palier}`, '#7dff7d'];
      else [status, detail, color] = ['PREMIUM', it.euro ?? '', '#ff9ad0'];
      const parts: Phaser.GameObjects.GameObject[] = [
        g,
        txt(this, 0, -57, it.name).setOrigin(0.5),
        preview,
        txt(this, 0, 30, r.label, 8, r.text).setOrigin(0.5),
        txt(this, 0, 46, status, 8, color).setOrigin(0.5),
        txt(this, 0, 60, detail, 8, detailColor).setOrigin(0.5),
      ];
      if (!owned && it.coins === undefined) parts.push(this.add.image(36, -30, 'cadenas'));
      const c = add(this.add.container(x, y, parts).setSize(108, 148).setInteractive({ useHandCursor: true }));
      c.on('pointerup', () => this.open(it));
    });
  }

  /** Réduit une image trop grande (chefs combattants avec leur arme) pour qu'elle tienne dans sa carte. */
  private fit(img: Phaser.GameObjects.Image, w = 88, h = 58): Phaser.GameObjects.Image {
    return img.setScale(Math.min(1, w / img.width, h / img.height));
  }

  /** Aperçu d'un effet d'arme : un arc de la couleur de l'effet (plusieurs couleurs pour l'arc-en-ciel). */
  private slash(color: number, rainbow = false): Phaser.GameObjects.Graphics {
    const g = this.add.graphics();
    if (rainbow) {
      [0xff5a5a, 0xffc533, 0x6dff6d, 0x4fb8ff, 0xb46bff].forEach((c, i) => g.lineStyle(3, c, 0.95).beginPath().arc(-6, -4, 18 + i * 3, -1.1, 1.1).strokePath());
      return g;
    }
    g.lineStyle(7, color, 0.9).beginPath().arc(-6, -4, 24, -1.1, 1.1).strokePath();
    g.lineStyle(3, 0xffffff, 0.9).beginPath().arc(-6, -4, 27, -0.9, 0.9).strokePath();
    return g;
  }

  private open(it: ShopItem): void {
    audio.sfx('clic');
    const p = loadProfile();
    const owned = has(p.owned, it);
    const equipped = owned && (it.kind === 'skin' ? p.skins[it.chef!] === it.id : p.effect === it.id);
    const who = it.kind === 'skin' ? `Costume pour ${CHEFS[it.chef!].name}` : it.kind === 'pack' ? 'Pack premium' : 'Effet pour tous les chefs';
    const title = itemLabel(it);
    const note = `${RARITY[it.rarity].label}\n${who}\n${it.desc}`;
    const equip = (on: boolean) => {
      const q = loadProfile();
      if (it.kind === 'skin') saveProfile({ skins: { ...q.skins, [it.chef!]: on ? it.id : undefined } });
      else saveProfile({ effect: on ? it.id : null });
      this.draw();
    };
    const info = (heading: string, text: string) => this.time.delayedCall(50, () => openModal(this, heading, [{ label: 'OK', action: () => {} }], text));
    const close = { label: 'FERMER', action: () => {} };
    if (owned && it.kind === 'pack') {
      openModal(this, title, [close], `${note}\n\nTu possèdes tout ce pack.`);
      return;
    }
    if (owned) {
      openModal(this, title, [{ label: equipped ? 'RETIRER' : 'EQUIPER', color: 0xe8642a, action: () => equip(!equipped) }, close], note);
      return;
    }
    // Achat réel (premium). Le paiement n'est pas encore branché : voir core/Billing.ts.
    const grant = () => {
      const q = loadProfile();
      saveProfile({ owned: [...new Set([...q.owned, it.id, ...(it.items ?? [])])] });
      audio.sfx('piece');
      if (it.kind === 'pack') this.draw();
      else equip(true);
    };
    const euroBtn = {
      label: `ACHETER : ${it.euro}`, color: 0xb03a5a,
      action: () => {
        void billing.buy(it.id).then((ok) => {
          if (ok) grant();
          else if (!billing.available) info('BIENTOT', 'Le paiement arrive bientôt.\nCet article sera en vente\nà la sortie du jeu.');
        });
      },
    };
    if (it.coins !== undefined) {
      const price = it.coins;
      const coinBtn = {
        label: it.euro ? `GRATUIT : ${price} PIECES` : `ACHETER : ${price} PIECES`, color: p.coins >= price ? 0x3d7a4a : 0x4a4f66,
        action: () => {
          const q = loadProfile();
          if (q.coins < price) {
            audio.sfx('parti');
            info('PAS ASSEZ', `Il te manque ${price - q.coins} pièces.\nJoue pour en gagner !`);
            return;
          }
          saveProfile({ coins: q.coins - price });
          grant();
        },
      };
      // un pack de monde s'obtient en payant, ou avec énormément de pièces
      const missing = Math.max(0, price - p.coins);
      const extra = it.euro
        ? `\n\nGRATUIT avec ${price} pièces gagnées\nen jouant, ou tout de suite en payant.\n` +
          (missing ? `Tu as ${p.coins} pièces : il t'en manque ${missing}.` : 'Tu as assez de pièces : appuie sur GRATUIT !')
        : '';
      openModal(this, title, it.euro ? [euroBtn, coinBtn, close] : [coinBtn, close], note + extra);
      return;
    }
    if (it.palier !== undefined) {
      const left = Math.max(0, it.palier - p.earned);
      openModal(this, title, [close], `${note}\n\nCadeau gratuit à ${it.palier} pièces gagnées.\nEncore ${left} pièces à gagner en jouant !`);
      return;
    }
    openModal(this, title, [euroBtn, close], `${note}\n\nPremium : achat réel uniquement.`);
  }
}
