import Phaser from 'phaser';
import { audio } from '../audio/AudioManager';
import { H, W } from '../core/constants';
import { loadProfile, saveProfile } from '../core/Storage';
import { openKeyboard } from '../ui/Keyboard';
import { setupLandscapeMenu } from '../ui/landscapeMenu';
import { openModal } from '../ui/Modal';
import { button, txt } from '../ui/text';

/**
 * Inscription, une seule fois : pseudo + accord sur les règles et la confidentialité.
 * Pas de mot de passe : le compte est enregistré sur ce téléphone (la connexion en ligne viendra plus tard).
 */
export class SignupScene extends Phaser.Scene {
  private pseudo = '';
  private accepted = false;

  constructor() {
    super('Signup');
  }

  create(): void {
    if (!this.pseudo) this.pseudo = loadProfile().pseudo;
    this.add.image(0, 0, 'map_clairiere').setOrigin(0);
    this.add.rectangle(0, 0, W, H, 0x0c0c18, 0.82).setOrigin(0);
    this.add.image(W / 2, 118, 'logo').setDisplaySize(150, 150);
    txt(this, W / 2, 216, 'CREER MON COMPTE', 16, '#ffc533').setOrigin(0.5);

    txt(this, W / 2, 252, 'TON PSEUDO', 8, '#8fe0ff').setOrigin(0.5);
    button(this, W / 2, 280, 260, 34, this.pseudo || 'APPUIE POUR LE CHOISIR', this.pseudo ? 0x3d5c8f : 0x4a4f66, () =>
      openKeyboard(this, 'TON PSEUDO', this.pseudo, 12, (v) => {
        this.pseudo = v.trim();
        this.scene.restart();
      }));
    txt(this, W / 2, 304, 'Affiché en duel et dans ton compte', 8, '#6b7391').setOrigin(0.5, 0);

    button(this, W / 2, 352, 300, 40, `${this.accepted ? '[X]' : '[ ]'} J'ACCEPTE LES REGLES\nET LA CONFIDENTIALITE`, this.accepted ? 0x3d7a4a : 0x3a3f55, () => {
      this.accepted = !this.accepted;
      this.scene.restart();
    });
    button(this, W / 2 - 74, 400, 140, 26, 'LIRE LES REGLES', 0x4a4f66, () => this.rules());
    button(this, W / 2 + 74, 400, 140, 26, 'CONFIDENTIALITE', 0x4a4f66, () => this.privacy());

    const ok = !!this.pseudo && this.accepted;
    button(this, W / 2, 462, 260, 40, "C'EST PARTI !", ok ? 0xe8642a : 0x4a4f66, () => this.create_account());
    txt(this, W / 2, 500, 'Pas de mot de passe : ton compte est\nenregistré sur ce téléphone. La\nconnexion en ligne arrivera plus tard.', 8, '#6b7391').setOrigin(0.5, 0);
    audio.music('menu');
    setupLandscapeMenu(this);
  }

  private create_account(): void {
    if (!this.pseudo || !this.accepted) {
      audio.sfx('parti');
      openModal(this, 'PRESQUE !', [{ label: 'OK', action: () => {} }], !this.pseudo ? 'Choisis d\'abord ton pseudo.' : 'Coche la case pour accepter\nles règles et la confidentialité.');
      return;
    }
    saveProfile({ pseudo: this.pseudo, registered: new Date().toISOString().slice(0, 10) });
    audio.sfx('niveau');
    openModal(this, 'BIENVENUE !', [{ label: 'JOUER', color: 0xe8642a, action: () => { this.scene.start('Menu'); } }], `Ton compte est créé,\nchef ${this.pseudo} !\n\nTa progression et tes achats\nsont sauvegardés tout seuls.`);
  }

  private rules(): void {
    openModal(this, 'LES REGLES', [{ label: 'FERMER', action: () => {} }], [
      'Chasse les monstres-aliments,',
      'ramasse leurs ingrédients et',
      'cuisine les plats commandés.',
      '',
      'Survis aux 3 vagues, puis bats le',
      'boss pour débloquer le monde suivant.',
      '',
      'Toutes les règles : menu > Règles.',
    ].join('\n'));
  }

  private privacy(): void {
    openModal(this, 'CONFIDENTIALITE', [{ label: 'FERMER', action: () => {} }], [
      'Tes données restent sur cet',
      'appareil : pseudo, record, pièces,',
      'achats, partie en cours.',
      '',
      'Pas de publicité, aucun outil',
      'de suivi.',
      '',
      '« Supprimer mes données » (Mon',
      'compte) efface tout, tout de suite.',
    ].join('\n'));
  }
}
