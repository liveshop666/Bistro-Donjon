import Phaser from 'phaser';
import { H, W } from '../core/constants';
import { deleteAllData, loadProfile, saveProfile } from '../core/Storage';
import { openModal } from '../ui/Modal';
import { button, txt } from '../ui/text';

export const APP_VERSION = '1.0.0';
/** Adresse d'assistance montrée aux joueurs : à renseigner dans le fichier .env (VITE_SUPPORT_EMAIL). */
export const SUPPORT_CONTACT: string = import.meta.env.VITE_SUPPORT_EMAIL ?? '';

/** Compte du joueur : pseudo, statistiques, assistance, suppression des données. */
export class AccountScene extends Phaser.Scene {
  constructor() {
    super('Account');
  }

  create(): void {
    const p = loadProfile();
    this.add.image(0, 0, 'map_taverne').setOrigin(0);
    this.add.rectangle(0, 0, W, H, 0x0c0c18, 0.86).setOrigin(0);
    txt(this, W / 2, 26, 'MON COMPTE', 16, '#ffc533').setOrigin(0.5);

    this.add.image(60, 96, 'portrait_' + p.chef);
    txt(this, 96, 76, 'PSEUDO', 8, '#8fe0ff');
    txt(this, 96, 92, p.pseudo || 'CHEF SANS NOM', 8);
    txt(this, 96, 108, 'Affiché en duel en ligne', 8, '#6b7391');
    txt(this, W / 2, 142, `RECORD : ${p.best} OR\n\nDUELS GAGNES : ${p.duelWins}\n\nPIECES : ${p.coins}\n\nMONDES DEBLOQUES : ${p.unlocked}/4`, 8, '#bfc8e0').setOrigin(0.5, 0);

    const items: [string, number, () => void][] = [
      ['CHANGER DE PSEUDO', 0x3d5c8f, () => this.rename()],
      ['ASSISTANCE', 0x3d7a4a, () => this.support()],
      ['CONFIDENTIALITE', 0x4a4f66, () => void window.open('privacy.html', '_blank')],
      ['SUPPRIMER MES DONNEES', 0x9a3a2e, () => this.confirmDelete()],
    ];
    items.forEach(([label, color, cb], i) => button(this, W / 2, 262 + i * 44, 260, 36, label, color, cb));
    txt(this, W / 2, 440, 'Tes données sont enregistrées\nsur cet appareil uniquement.\nLa sauvegarde en ligne (connexion\navec un compte) arrivera dans une\nprochaine version.', 8, '#6b7391').setOrigin(0.5, 0);
    txt(this, W / 2, 540, `BISTRO DONJON v${APP_VERSION}\nUn jeu SolveLab`, 8, '#6b7391').setOrigin(0.5, 0);
    button(this, W / 2, 606, 160, 32, 'RETOUR', 0x4a4f66, () => this.scene.start('Menu'));
    void H;
  }

  private rename(): void {
    const raw = window.prompt('Ton pseudo (12 caractères max) :', loadProfile().pseudo);
    if (raw === null) return;
    const pseudo = raw.replace(/[^\p{L}\p{N} _-]/gu, '').trim().slice(0, 12).toUpperCase();
    saveProfile({ pseudo });
    this.scene.restart();
  }

  private support(): void {
    const mail = () => {
      const subject = encodeURIComponent('Bistro Donjon - Assistance');
      const body = encodeURIComponent(`\n\n---\nBistro Donjon v${APP_VERSION}`);
      window.location.href = `mailto:${SUPPORT_CONTACT}?subject=${subject}&body=${body}`;
    };
    const items = [
      ...(SUPPORT_CONTACT ? [{ label: 'ECRIRE UN E-MAIL', color: 0x3d7a4a, action: mail }] : []),
      { label: 'REVOIR LES REGLES', action: () => void this.scene.start('Rules') },
      { label: 'FERMER', action: () => {} },
    ];
    const note = SUPPORT_CONTACT
      ? `Un souci, une idée ? Ecris-nous :\n${SUPPORT_CONTACT}`
      : "Un souci, une idée ? Contacte-nous\nvia la fiche du jeu sur le\nGoogle Play Store.";
    openModal(this, 'ASSISTANCE', items, note);
  }

  private confirmDelete(): void {
    openModal(this, 'SUPPRIMER ?', [
      {
        label: 'OUI, TOUT EFFACER', color: 0x9a3a2e,
        action: () => {
          deleteAllData();
          this.scene.start('Menu');
        },
      },
      { label: 'ANNULER', action: () => {} },
    ], 'Record, pièces, costumes, mondes\ndébloqués et partie en cours\nseront effacés. Irréversible.');
  }
}
