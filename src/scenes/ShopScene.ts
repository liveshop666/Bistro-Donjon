import Phaser from 'phaser';
import { landscapeMenu, MENU_SCALE, portraitMenu } from '../ui/landscapeMenu';
import { landscapeWanted } from '../core/layout';
import { audio } from '../audio/AudioManager';
import { billing } from '../core/Billing';
import { CHEFS, H, itemLabel, RARITY, SHOP, ShopItem, STYLE_3D, TEST_PAYMENTS, W, fitUi } from '../core/constants';
import { addCoins, equipItem, loadProfile, nextMilestone, recordPurchase, saveProfile } from '../core/Storage';
import { openModal } from '../ui/Modal';
import { button, txt } from '../ui/text';

type Tab = 'skin' | 'combattant' | 'effet' | 'arme' | 'pack';
const tabOf = (it: ShopItem): Tab => (it.kind === 'skin' ? (it.fighter ? 'combattant' : 'skin') : it.weapon ? 'arme' : it.kind);
/** Un pack est possédé quand tout son contenu l'est. */
const has = (owned: string[], it: ShopItem): boolean => (it.kind === 'pack' ? (it.items ?? []).every((id) => owned.includes(id)) : owned.includes(it.id));

/**
 * Boutique de cosmétiques : costumes de chefs et effets d'arme, classés par rareté. Aucun avantage en jeu.
 * Trois façons d'obtenir un article : pièces gagnées en jouant, cadeau de palier (gratuit), premium (argent réel).
 */
export class ShopScene extends Phaser.Scene {
  private tab: Tab = 'skin';
  private dyn: Phaser.GameObjects.GameObject[] = [];
  /** Paysage : article affiché en grand à droite, et page d'articles. */
  private land = false;
  private selected: string | null = null;
  private page = 0;

  constructor() {
    super('Shop');
  }

  create(): void {
    this.dyn = [];
    addCoins(0); // débloque les cadeaux de palier déjà mérités (anciens profils)
    this.land = landscapeWanted();
    if (this.land) {
      this.createLandscape();
      return;
    }
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
    portraitMenu(this);
  }

  // ------------------------------------------------------------------ paysage (maquette validée par Rudy le 12/11)
  /** Boutique en paysage : onglets à gauche, articles au centre, article choisi en grand à droite. */
  private createLandscape(): void {
    const { w, h } = landscapeMenu(this);
    this.add.image(w / 2, h / 2, 'map_marche').setScale(w / W);
    this.add.rectangle(0, 0, w, h, 0x0c0c18, 0.8).setOrigin(0);
    this.add.rectangle(0, 0, w, 30, 0x0c0c18, 0.9).setOrigin(0);
    this.add.rectangle(0, 30, w, 2, 0x3a3f55).setOrigin(0);
    button(this, 38, 15, 68, 20, '< MENU', 0x4a4f66, () => this.scene.start('Menu'));
    txt(this, w / 2, 16, 'BOUTIQUE', 16, '#ffc533').setOrigin(0.5);
    audio.music('boutique');
    this.draw();
  }

  private drawLandscape(): void {
    const add = <T extends Phaser.GameObjects.GameObject>(o: T): T => (this.dyn.push(o), o);
    const p = loadProfile();
    const w = this.scale.width / MENU_SCALE;
    const h = this.scale.height / MENU_SCALE;
    add(this.add.image(w - 150, 15, 'piece'));
    add(txt(this, w - 138, 15, String(p.coins), 8, '#ffd23e').setOrigin(0, 0.5));
    const next = nextMilestone();
    add(txt(this, 6, h - 12, next ? `PROCHAIN CADEAU A ${next.item.palier} : ${itemLabel(next.item)}` : 'TOUS LES CADEAUX SONT DEBLOQUES !', 8, '#7dff7d'));

    // onglets à gauche
    const tabs: [Tab, string, number][] = [['skin', 'COSTUMES', 0x3a3f55], ['combattant', 'COMBAT', 0x3a3f55], ['effet', 'EFFETS', 0x3a3f55], ['arme', 'ARMES', 0x3a3f55], ['pack', 'PACKS', 0xc98a1e]];
    tabs.forEach(([tab, label, color], i) => {
      add(button(this, 62, 59 + i * 36, 112, 30, label, this.tab === tab ? 0xe8642a : color, () => {
        this.tab = tab;
        this.page = 0;
        this.selected = null;
        audio.sfx('clic');
        this.draw();
      }));
      if (this.tab === tab) add(this.add.graphics()).lineStyle(2, 0xffc533).strokeRect(4, 59 + i * 36 - 17, 116, 34);
    });

    // articles au centre (2 rangées, autant de colonnes que la largeur le permet)
    const items = SHOP.filter((it) => tabOf(it) === this.tab);
    const panelW = 204;
    const cols = Math.max(2, Math.min(4, Math.floor((w - 128 - panelW - 8) / 116)));
    const perPage = cols * 2;
    const pages = Math.ceil(items.length / perPage);
    this.page = Math.min(this.page, pages - 1);
    if (!this.selected || !items.some((it) => it.id === this.selected)) this.selected = items[0]?.id ?? null;
    const gridX = 128 + Math.round((w - 128 - panelW - 8 - cols * 116) / 2);
    items.slice(this.page * perPage, (this.page + 1) * perPage).forEach((it, i) => {
      const c = add(this.card(it, p, gridX + 58 + (i % cols) * 116, 112 + Math.floor(i / cols) * 156));
      if (it.id === this.selected) add(this.add.graphics()).lineStyle(2, 0xffffff).strokeRect(c.x - 56, c.y - 76, 112, 152);
    });
    if (pages > 1) {
      const mid = gridX + (cols * 116) / 2;
      add(button(this, mid - 70, h - 13, 40, 18, '<', 0x3a3f55, () => this.turnPage(-1, pages)));
      add(txt(this, mid, h - 13, `${this.page + 1}/${pages}`, 8, '#bfc8e0').setOrigin(0.5));
      add(button(this, mid + 70, h - 13, 40, 18, '>', 0x3a3f55, () => this.turnPage(1, pages)));
    }

    // article choisi, en grand à droite
    const it = items.find((x) => x.id === this.selected);
    if (!it) return;
    const px = w - panelW - 6;
    const r = RARITY[it.rarity];
    add(this.add.rectangle(px, 40, panelW, h - 60, 0x14141f, 0.85).setOrigin(0).setStrokeStyle(2, r.color));
    add(txt(this, px + panelW / 2, 50, itemLabel(it), 8, '#ffc533').setOrigin(0.5, 0));
    add(txt(this, px + panelW / 2, 64, r.label, 8, r.text).setOrigin(0.5, 0));
    add(this.add.rectangle(px + 22, 80, panelW - 44, 104, 0x1b1b2b).setOrigin(0));
    const cy = 132;
    if (it.world) {
      add(this.add.image(px + 60, cy, 'map_' + it.world).setScale(96 / 640));
      add(this.fit(this.add.image(px + 130, cy, it.sprite!), 90, 90));
    } else if (it.sprite) add(this.fit(this.add.image(px + panelW / 2, cy, it.sprite), panelW - 56, 96).setScale(Math.min(2, (panelW - 56) / this.textures.get(it.sprite).getSourceImage().width, 96 / this.textures.get(it.sprite).getSourceImage().height)));
    else add(this.slash(it.color ?? 0xffffff, !!it.rainbow).setPosition(px + panelW / 2, cy).setScale(1.6));
    add(txt(this, px + panelW / 2, 192, it.desc, 8, '#bfc8e0').setOrigin(0.5, 0).setAlign('center').setWordWrapWidth(panelW - 16));
    const owned = has(p.owned, it);
    const equipped = owned && (it.kind === 'skin' ? p.skins[it.chef!] === it.id : p.effect === it.id);
    const label = owned ? (it.kind === 'pack' ? 'DEJA A TOI' : equipped ? 'RETIRER' : 'EQUIPER') : it.coins !== undefined ? (it.euro ? 'OBTENIR' : `ACHETER : ${it.coins}`) : it.palier !== undefined ? 'CADEAU : VOIR' : `ACHETER : ${it.euro}`;
    add(button(this, px + panelW / 2, h - 52, panelW - 24, 30, label, owned ? 0x3d7a4a : 0xb03a5a, () => this.open(it)));
  }

  private turnPage(d: number, pages: number): void {
    this.page = (this.page + d + pages) % pages;
    this.selected = null;
    audio.sfx('clic');
    this.draw();
  }

  /** Carte d'un article (108 x 148), centrée en (x, y). */
  private card(it: ShopItem, p: ReturnType<typeof loadProfile>, x: number, y: number): Phaser.GameObjects.Container {
    const owned = has(p.owned, it);
    const equipped = owned && (it.kind === 'skin' ? p.skins[it.chef!] === it.id : p.effect === it.id);
    const r = RARITY[it.rarity];
    const g = this.add.graphics();
    if (STYLE_3D) {
      // carte arrondie : bord de la couleur de la rareté, fond sombre, vitrine éclairée pour l'article
      g.fillStyle(0x000000, 0.45).fillRoundedRect(-54, -71, 108, 148, 12);
      g.fillStyle(r.color).fillRoundedRect(-54, -74, 108, 148, 12);
      g.fillStyle(owned ? 0x24402c : 0x241a2a).fillRoundedRect(-51, -71, 102, 142, 10);
      g.fillStyle(0xffffff, 0.06).fillRoundedRect(-46, -40, 92, 62, 8);
    } else {
    g.fillStyle(r.color).fillRect(-54, -74, 108, 148);
    g.fillStyle(owned ? 0x2f5a3a : 0x2a2a44).fillRect(-51, -71, 102, 142);
    g.fillStyle(0x14141f, 0.6).fillRect(-46, -40, 92, 62);
    }
    const preview = it.world
      ? this.add.container(0, 0, [this.add.image(-24, -9, 'map_' + it.world).setScale(58 / 640), this.fit(this.add.image(16, -6, it.sprite!), 52, 52)])
      : it.sprite ? this.fit(this.add.image(0, -8, it.sprite)) : this.slash(it.color ?? 0xffffff, !!it.rainbow);
    let status: string;
    let detail = '';
    let color = '#ffd23e';
    let detailColor = '#bfc8e0';
    if (equipped) [status, color] = ['EQUIPE', '#ffc533'];
    else if (owned) [status, color] = ['OBTENU', '#7dff7d'];
    else if (it.euro && it.coins) {
      // payant en euros, ou gratuit avec beaucoup de pièces : les deux bien visibles
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
    if (!owned && it.coins === undefined) parts.push(fitUi(this.add.image(36, -30, 'cadenas')));
    const c = this.add.container(x, y, parts).setSize(108, 148).setInteractive({ useHandCursor: true });
    c.on('pointerup', () => {
      if (!this.land) return this.open(it);
      // en paysage, un appui montre l'article en grand ; un deuxième appui ouvre l'achat
      if (this.selected === it.id) return this.open(it);
      this.selected = it.id;
      audio.sfx('clic');
      this.draw();
    });
    return c;
  }

  private draw(): void {
    this.dyn.forEach((c) => c.destroy());
    this.dyn = [];
    if (this.land) return this.drawLandscape();
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
      add(button(this, x, 124, 68, 26, label, this.tab === tab ? 0xe8642a : 0x3a3f55, () => {
        this.tab = tab;
        this.draw();
      }));
    tabBtn(37, 'skin', 'COSTUMES');
    tabBtn(108, 'combattant', 'COMBAT');
    tabBtn(180, 'effet', 'EFFETS');
    tabBtn(252, 'arme', 'ARMES');
    tabBtn(323, 'pack', 'PACKS');

    SHOP.filter((it) => tabOf(it) === this.tab).forEach((it, i) => {
      add(this.card(it, p, 64 + (i % 3) * 116, 222 + Math.floor(i / 3) * 158));
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
    const who = it.kind === 'skin' ? `Costume pour ${CHEFS[it.chef!].name}` : it.kind === 'pack' ? 'Pack premium' : it.weapon ? 'Arme pour tous les chefs' : 'Effet pour tous les chefs';
    const title = itemLabel(it);
    const note = `${RARITY[it.rarity].label}\n${who}\n${it.desc}`;
    const equip = (on: boolean) => {
      equipItem(it, on);
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
    const grant = (price: string) => {
      const order = recordPurchase(it, price);
      audio.sfx(it.kind === 'pack' || it.rarity === 'legendaire' ? 'legendaire' : 'piece');
      if (it.kind === 'pack') this.draw();
      else equip(true);
      this.receipt(it, price, order);
    };
    const euroBtn = {
      label: `ACHETER : ${it.euro}`, color: 0xb03a5a,
      action: () => {
        if (!billing.available && TEST_PAYMENTS) {
          this.time.delayedCall(50, () => this.checkout(it, () => grant(it.euro!)));
          return;
        }
        void billing.buy(it.id).then((ok) => {
          if (ok) grant(it.euro!);
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
          grant(`${price} pièces`);
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

  /** Écran de paiement (paiement de test tant que Google Play n'est pas branché) : récapitulatif, puis PAYER. */
  private checkout(it: ShopItem, onPaid: () => void): void {
    openModal(this, 'PAIEMENT', [
      {
        label: `PAYER ${it.euro}`, color: 0x3d7a4a,
        action: () => {
          // petite attente, comme un vrai paiement
          const wait = openModal(this, 'PAIEMENT', [], 'Paiement en cours...\n');
          this.time.delayedCall(900, () => {
            wait();
            onPaid();
          });
        },
      },
      { label: 'ANNULER', action: () => {} },
    ], `${itemLabel(it)}\n${it.euro}\n\nPAIEMENT DE TEST\nAucun argent n'est débité.\nÀ la sortie du jeu, le paiement\npassera par Google Play.`);
  }

  /** Reçu après un achat : numéro de commande, et l'article à retrouver dans Mon compte > Ma collection. */
  private receipt(it: ShopItem, price: string, order: string): void {
    this.time.delayedCall(60, () => openModal(this, 'ACHAT CONFIRME', [
      { label: 'VOIR MA COLLECTION', color: 0xe8642a, action: () => { this.scene.start('Collection'); } },
      { label: 'CONTINUER', action: () => {} },
    ], `${itemLabel(it)}\n${price}\n\nCommande ${order}\n\nC'est à toi ! Retrouve-le dans\nMon compte > Ma collection.`));
  }
}
