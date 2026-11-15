import Phaser from 'phaser';
import { setupLandscapeMenu } from '../ui/landscapeMenu';
import { H, W, playerLevel, WORLD_ORDER, worldUnlocked } from '../core/constants';
import { deleteAllData, loadProfile, saveProfile } from '../core/Storage';
import { openKeyboard } from '../ui/Keyboard';
import { openModal } from '../ui/Modal';
import { BUILD_LABEL } from '../core/update';
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
    txt(this, 96, 108, p.registered ? `Compte créé le ${p.registered.split('-').reverse().join('/')}` : 'Affiché en duel en ligne', 8, '#6b7391');
    txt(this, W / 2, 134, `NIVEAU ${playerLevel(p.earned).level}\n\nRECORD : ${p.best} OR   MOYENNE : ${p.runs.length ? Math.round(p.runs.reduce((a, b) => a + b, 0) / p.runs.length) : 0}\n\nDUELS GAGNES : ${p.duelWins}\n\nPIECES : ${p.coins}\n\nMONDES DEBLOQUES : ${WORLD_ORDER.filter((w) => worldUnlocked(w, p.unlocked, p.owned)).length}/${WORLD_ORDER.length}`, 8, '#bfc8e0').setOrigin(0.5, 0);

    const items: [string, number, () => void][] = [
      ['CHANGER DE PSEUDO', 0x3d5c8f, () => this.rename()],
      ['ASSISTANCE', 0x3d7a4a, () => this.support()],
      ['CONFIDENTIALITE', 0x4a4f66, () => this.privacy()],
      ['SUPPRIMER MES DONNEES', 0x9a3a2e, () => this.confirmDelete()],
    ];
    items.unshift(['MA COLLECTION', 0xe8642a, () => this.scene.start('Collection')]);
    items.forEach(([label, color, cb], i) => button(this, W / 2, 256 + i * 40, 260, 32, label, color, cb));
    txt(this, W / 2, 484, 'Ton compte est enregistré sur cet\nappareil. La sauvegarde en ligne\narrivera dans une prochaine version.', 8, '#6b7391').setOrigin(0.5, 0);
    txt(this, W / 2, 538, `BISTRO DONJON v${APP_VERSION}\nVersion du ${BUILD_LABEL}\nUn jeu SolveLab`, 8, '#6b7391').setOrigin(0.5, 0);
    button(this, W / 2, 606, 160, 32, 'RETOUR', 0x4a4f66, () => this.scene.start('Menu'));
    void H;
    setupLandscapeMenu(this); // paysage : la page en deux colonnes qui remplissent l'écran
  }

  private rename(): void {
    openKeyboard(this, 'TON PSEUDO', loadProfile().pseudo, 12, (pseudo) => {
      saveProfile({ pseudo });
      this.scene.restart();
    });
  }

  private support(): void {
    const mail = () => {
      const subject = encodeURIComponent('Bistro Donjon - Assistance');
      const body = encodeURIComponent(`\n\n---\nBistro Donjon v${APP_VERSION}`);
      window.location.href = `mailto:${SUPPORT_CONTACT}?subject=${subject}&body=${body}`;
    };
    // L'assistance sert à NOUS CONTACTER en cas de problème avec le jeu (les règles ont leur propre bouton au menu).
    const copy = { label: () => (this.copied ? 'ADRESSE COPIEE !' : "COPIER L'ADRESSE"), action: () => (this.copyContact(), false) };
    const items = [
      ...(SUPPORT_CONTACT ? [{ label: 'ECRIRE UN E-MAIL', color: 0x3d7a4a, action: mail }, copy] : []),
      { label: 'FERMER', action: () => {} },
    ];
    const note = SUPPORT_CONTACT
      ? `Un bug, un achat, une idée ?\nEcris-nous, on te répond vite :\n\n${SUPPORT_CONTACT}\n\nDis-nous ton téléphone et ce\nqui s'est passé.`
      : "Un bug, un achat, une idée ?\n\nNotre adresse de contact arrive\ntrès bientôt ici même.";
    this.copied = false;
    openModal(this, 'NOUS CONTACTER', items, note);
  }

  private copied = false;

  private copyContact(): void {
    void navigator.clipboard?.writeText(SUPPORT_CONTACT).catch(() => {});
    this.copied = true;
  }

  /** Confidentialité : résumé affiché dans le jeu, au style du jeu (la version complète est sur la fiche du magasin). */
  private privacy(): void {
    openModal(this, 'CONFIDENTIALITE', [{ label: 'FERMER', action: () => {} }], [
      'Tes données restent sur cet',
      'appareil : record, pièces,',
      'costumes, partie en cours.',
      '',
      'Pas de compte, pas de publicité,',
      'aucun outil de suivi.',
      '',
      'En duel en ligne, ton pseudo et',
      'ton score sont envoyés à ton',
      'adversaire le temps du duel,',
      'puis oubliés.',
      '',
      '« Supprimer mes données » efface',
      'tout, tout de suite.',
    ].join('\n'));
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
