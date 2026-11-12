import Phaser from 'phaser';
import { setupLandscapeMenu } from '../ui/landscapeMenu';
import { H, W } from '../core/constants';
import { button, txt } from '../ui/text';

const PAGES: { title: string; icon: string; text: string }[] = [
  {
    title: 'LE BUT', icon: 'portrait_moustachu',
    text: `Tu es un chef ambulant dans un monde
de monstres-aliments.

Chasse les monstres, récolte leurs
ingrédients et sers un maximum de
plats pour gagner de l'or.

Survis aux 3 vagues, puis bats le
Roi Tomate : tu débloques alors le
monde suivant.`,
  },
  {
    title: 'LA CHASSE', icon: 'tomate',
    text: `Pose ton pouce n'importe où et
glisse pour déplacer ton chef.

Garde le bouton rouge appuyé pour
FRAPPER. A l'arrêt tu tapes vite,
en mouvement 2 fois moins.

Les monstres vaincus lâchent des
ingrédients. Glisse VITE le doigt
dessus pour les TRANCHER : ils
valent double et cuisent 2 fois
plus vite.

Jauge pleine ? Touche le bouton
de feu pour l'attaque ultime.`,
  },
  {
    title: 'LA CUISINE', icon: 'marmite',
    text: `Les commandes s'affichent en haut.

1. MARMITE : approche-toi avec les
bons ingrédients, le plat cuit en
5 secondes.
2. Reprends le plat à la marmite.
3. SERVICE : amène-le au comptoir.
Tu gagnes de l'or et un pouvoir.

PLANCHE : reste immobile devant
elle pour trancher ce que tu portes.

Les clients s'impatientent : servi
vite = POURBOIRE. Client parti =
combo perdu. 3 plats d'affilée =
COMBO, +60 or.`,
  },
  {
    title: 'CARTES ET FIN', icon: 'ico_etoile',
    text: `Après chaque vague, choisis 1 carte
d'amélioration parmi 3 : couteaux
volants, bottes, tourelle, aimant...

DEFAITE : ta vie tombe à zéro, ou
les Champi-Boucliers détruisent
ton stand. Arrête-les avant qu'ils
n'atteignent la cuisine !

VICTOIRE : bats le Roi Tomate.

Le bouton PAUSE (en bas de l'écran)
permet de sauvegarder et quitter :
tu reprendras au début de la vague.`,
  },
  {
    title: 'LE DUEL', icon: 'roi_tomate',
    text: `Guerre des Stands : 2 minutes,
chacun dans son arène. Celui qui a
le plus d'or à la fin gagne.

Chaque COMBO de 3 plats envoie un
sabotage chez ton rival :
- un mini Roi Tomate,
- un nuage de fumée sur sa cuisine,
- ses contrôles inversés 5 s.

Chef K.O. : -100 or. Stand
détruit : -150 or, et on repart.

Joue contre l'ordinateur, ou en
ligne : partie rapide, ou salon
privé avec un code à 4 chiffres.`,
  },
];

/** Les règles du jeu, page par page. */
export class RulesScene extends Phaser.Scene {
  private page = 0;
  private title!: Phaser.GameObjects.Text;
  private body!: Phaser.GameObjects.Text;
  private icon!: Phaser.GameObjects.Image;
  private dots!: Phaser.GameObjects.Text;
  private next!: Phaser.GameObjects.Container;

  constructor() {
    super('Rules');
  }

  create(): void {
    this.page = 0;
    this.add.image(0, 0, 'map_clairiere').setOrigin(0);
    this.add.rectangle(0, 0, W, H, 0x0c0c18, 0.86).setOrigin(0);
    txt(this, W / 2, 26, 'REGLES DU JEU', 16, '#ffc533').setOrigin(0.5);
    this.icon = this.add.image(W / 2, 86, 'marmite');
    this.title = txt(this, W / 2, 136, '', 16, '#8fe0ff').setOrigin(0.5);
    this.body = this.add
      .text(W / 2, 160, '', { fontFamily: '"Press Start 2P"', fontSize: '8px', color: '#ffffff', align: 'left', lineSpacing: 6 })
      .setOrigin(0.5, 0);
    this.dots = txt(this, W / 2, 566, '', 8, '#bfc8e0').setOrigin(0.5);
    button(this, 70, 602, 120, 34, 'RETOUR', 0x4a4f66, () => this.go(-1));
    this.next = button(this, 250, 602, 200, 34, 'SUIVANT', 0xe8642a, () => this.go(1));
    this.show();
    setupLandscapeMenu(this); // paysage : la page en deux colonnes qui remplissent l'écran
  }

  private go(d: number): void {
    this.page += d;
    if (this.page < 0 || this.page >= PAGES.length) this.scene.start('Menu');
    else this.show();
  }

  private show(): void {
    const p = PAGES[this.page];
    this.title.setText(p.title);
    this.body.setText(p.text);
    this.icon.setTexture(p.icon).setScale(p.icon === 'roi_tomate' ? 0.7 : p.icon === 'tomate' ? 2 : 1);
    this.dots.setText(PAGES.map((_, i) => (i === this.page ? '[*]' : ' . ')).join(''));
    (this.next.getAt(1) as Phaser.GameObjects.Text).setText(this.page === PAGES.length - 1 ? "C'EST PARTI !" : 'SUIVANT');
  }
}
