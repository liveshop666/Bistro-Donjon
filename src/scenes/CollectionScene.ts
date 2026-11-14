import Phaser from 'phaser';
import { audio } from '../audio/AudioManager';
import { CHEFS, H, itemLabel, RARITY, SHOP, ShopItem, TEST_UNLOCK_ALL, W, WORLD_ORDER, worldUnlocked, WORLDS } from '../core/constants';
import { loadProfile, saveProfile } from '../core/Storage';
import { setupLandscapeMenu } from '../ui/landscapeMenu';
import { button, txt } from '../ui/text';

type Tab = 'costumes' | 'effets' | 'mondes' | 'achats';
const PER_PAGE = 8;

/**
 * Mon compte > Mes articles : tout ce que le joueur possède (achats, cadeaux, pièces), pour l'équiper,
 * les mondes débloqués pour y jouer, et l'historique de ses achats.
 */
export class CollectionScene extends Phaser.Scene {
  private tab: Tab = 'costumes';
  private page = 0;
  private dyn: Phaser.GameObjects.GameObject[] = [];

  constructor() {
    super('Collection');
  }

  create(): void {
    this.dyn = [];
    this.add.image(0, 0, 'map_taverne').setOrigin(0);
    this.add.rectangle(0, 0, W, H, 0x0c0c18, 0.86).setOrigin(0);
    txt(this, W / 2, 24, 'MES ARTICLES', 16, '#ffc533').setOrigin(0.5);
    if (TEST_UNLOCK_ALL) txt(this, W / 2, 44, 'Mode test : tout est débloqué', 8, '#ff9ad0').setOrigin(0.5, 0);
    const tabs: [Tab, string][] = [['costumes', 'COSTUMES'], ['effets', 'EFFETS'], ['mondes', 'MONDES'], ['achats', 'ACHATS']];
    tabs.forEach(([tab, label], i) => {
      const b = button(this, 46 + i * 89, 72, 84, 24, label, this.tab === tab ? 0xe8642a : 0x3a3f55, () => {
        this.tab = tab;
        this.page = 0;
        this.scene.restart();
      });
      if (this.tab === tab) this.add.graphics().lineStyle(2, 0xffc533).strokeRect(b.x - 43, b.y - 13, 86, 26);
    });
    button(this, 95, 606, 150, 32, 'RETOUR', 0x4a4f66, () => this.scene.start('Account'));
    button(this, 265, 606, 150, 32, 'BOUTIQUE', 0xc98a1e, () => this.scene.start('Shop'));
    this.draw();
    setupLandscapeMenu(this);
  }

  private draw(): void {
    this.dyn.forEach((o) => o.destroy());
    this.dyn = [];
    if (this.tab === 'achats') return this.drawPurchases();
    const p = loadProfile();
    const rows: { icon: () => Phaser.GameObjects.GameObject; name: string; sub: string; subColor: string; label: string; color: number; act: () => void }[] = [];
    if (this.tab === 'mondes') {
      for (const id of WORLD_ORDER) {
        if (!worldUnlocked(id, p.unlocked, p.owned)) continue;
        const here = p.world === id;
        rows.push({
          icon: () => this.add.image(0, 0, 'map_' + id).setDisplaySize(26, 46),
          name: WORLDS[id].name, sub: WORLDS[id].hint, subColor: '#bfc8e0',
          label: here ? 'CHOISI' : 'JOUER', color: here ? 0x3d7a4a : 0xe8642a,
          act: () => {
            saveProfile({ world: id });
            this.scene.start('Menu');
          },
        });
      }
    } else {
      const items = SHOP.filter((it) => it.kind !== 'pack' && p.owned.includes(it.id) && (this.tab === 'costumes' ? it.kind === 'skin' : it.kind === 'effet'));
      for (const it of items) {
        const on = it.kind === 'skin' ? p.skins[it.chef!] === it.id : p.effect === it.id;
        rows.push({
          icon: () => this.icon(it),
          name: itemLabel(it),
          sub: it.kind === 'skin' ? CHEFS[it.chef!].name : `${it.weapon ? 'ARME' : 'EFFET'} ${RARITY[it.rarity].label}`, // couleur = rareté
          subColor: RARITY[it.rarity].text,
          label: on ? 'RETIRER' : 'EQUIPER', color: on ? 0x3d7a4a : 0xe8642a,
          act: () => this.equip(it, !on),
        });
      }
    }
    if (!rows.length) {
      this.dyn.push(txt(this, W / 2, 250, 'Rien ici pour l\'instant.\n\nVa voir la BOUTIQUE, ou gagne\ndes pièces en jouant !', 8, '#bfc8e0').setOrigin(0.5, 0));
      return;
    }
    const pages = Math.ceil(rows.length / PER_PAGE);
    this.page = Math.min(this.page, pages - 1);
    rows.slice(this.page * PER_PAGE, (this.page + 1) * PER_PAGE).forEach((r, i) => {
      const y = 116 + i * 54;
      this.dyn.push(this.add.rectangle(12, y - 24, W - 24, 48, 0x14141f, 0.9).setOrigin(0).setStrokeStyle(1, 0x3a3f55));
      const ic = r.icon() as Phaser.GameObjects.Image;
      ic.setPosition(38, y);
      this.dyn.push(ic);
      this.dyn.push(txt(this, 64, y - 10, r.name, 8, '#ffffff'));
      this.dyn.push(txt(this, 64, y + 4, r.sub, 8, r.subColor));
      this.dyn.push(button(this, W - 60, y, 84, 26, r.label, r.color, r.act));
    });
    if (pages > 1) {
      this.dyn.push(button(this, W / 2 - 70, 556, 44, 22, '<', 0x3a3f55, () => this.turn(-1, pages)));
      this.dyn.push(txt(this, W / 2, 556, `${this.page + 1}/${pages}`, 8, '#bfc8e0').setOrigin(0.5));
      this.dyn.push(button(this, W / 2 + 70, 556, 44, 22, '>', 0x3a3f55, () => this.turn(1, pages)));
    }
  }

  /** Historique des achats, du plus récent au plus ancien. */
  private drawPurchases(): void {
    const list = [...loadProfile().purchases].reverse();
    if (!list.length) {
      this.dyn.push(txt(this, W / 2, 250, 'Aucun achat pour l\'instant.\n\nTes achats de la boutique\napparaîtront ici, avec leur\nnuméro de commande.', 8, '#bfc8e0').setOrigin(0.5, 0));
      return;
    }
    const pages = Math.ceil(list.length / PER_PAGE);
    this.page = Math.min(this.page, pages - 1);
    list.slice(this.page * PER_PAGE, (this.page + 1) * PER_PAGE).forEach((a, i) => {
      const it = SHOP.find((x) => x.id === a.id);
      const y = 116 + i * 54;
      this.dyn.push(this.add.rectangle(12, y - 24, W - 24, 48, 0x14141f, 0.9).setOrigin(0).setStrokeStyle(1, 0x3a3f55));
      this.dyn.push(txt(this, 22, y - 14, it ? itemLabel(it) : a.id, 8, '#ffffff'));
      this.dyn.push(txt(this, 22, y, `${a.price}`, 8, '#ffd23e'));
      this.dyn.push(txt(this, 22, y + 12, `${a.date.split('-').reverse().join('/')}   ${a.order}`, 8, '#6b7391'));
    });
    if (pages > 1) {
      this.dyn.push(button(this, W / 2 - 70, 556, 44, 22, '<', 0x3a3f55, () => this.turn(-1, pages)));
      this.dyn.push(txt(this, W / 2, 556, `${this.page + 1}/${pages}`, 8, '#bfc8e0').setOrigin(0.5));
      this.dyn.push(button(this, W / 2 + 70, 556, 44, 22, '>', 0x3a3f55, () => this.turn(1, pages)));
    }
  }

  private turn(d: number, pages: number): void {
    this.page = (this.page + d + pages) % pages;
    audio.sfx('clic');
    this.draw();
  }

  private equip(it: ShopItem, on: boolean): void {
    const q = loadProfile();
    if (it.kind === 'skin') saveProfile({ skins: { ...q.skins, [it.chef!]: on ? it.id : undefined } });
    else saveProfile({ effect: on ? it.id : null });
    this.draw();
  }

  /** Petite image de l'article : le costume, ou un trait de la couleur de l'effet. */
  private icon(it: ShopItem): Phaser.GameObjects.GameObject {
    if (it.sprite) {
      const img = this.add.image(0, 0, it.sprite);
      const src = this.textures.get(it.sprite).getSourceImage();
      return img.setScale(Math.min(40 / src.width, 40 / src.height));
    }
    const g = this.add.graphics();
    g.lineStyle(4, it.color ?? 0xffffff).beginPath().moveTo(-14, 10).lineTo(14, -10).strokePath();
    if (it.rainbow) g.lineStyle(2, 0x6dff6d).beginPath().moveTo(-14, 14).lineTo(14, -6).strokePath();
    return g;
  }
}
