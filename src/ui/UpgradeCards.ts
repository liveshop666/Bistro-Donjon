import Phaser from 'phaser';
import { audio } from '../audio/AudioManager';
import { CARDS_TIME, H, UpgradeDef, W } from '../core/constants';
import { txt } from './text';

const D = 3000;

/** Phase 3 : trois cartes d'amélioration au choix (choix automatique à la fin du compte à rebours). */
export class UpgradeCards {
  private objects: Phaser.GameObjects.GameObject[] = [];
  private countdown?: Phaser.Time.TimerEvent;

  constructor(private scene: Phaser.Scene) {}

  show(cards: UpgradeDef[], levelOf: (u: UpgradeDef) => number, onPick: (u: UpgradeDef) => void): void {
    const add = <T extends Phaser.GameObjects.GameObject>(o: T): T => {
      this.objects.push(o);
      return o;
    };
    add(this.scene.add.rectangle(0, 0, W, H, 0x0c0c18, 0.78).setOrigin(0).setDepth(D).setInteractive());
    add(txt(this.scene, W / 2, 170, 'CHOISIS UNE\nAMELIORATION', 16, '#ffc533').setOrigin(0.5).setDepth(D + 1));
    let left = CARDS_TIME;
    const shownAt = this.scene.time.now;
    const clock = add(txt(this.scene, W / 2, 216, `${left}s`, 8, '#bfc8e0').setOrigin(0.5).setDepth(D + 1));

    audio.sfx('cartes');
    const pick = (u: UpgradeDef) => {
      audio.sfx('carte');
      this.countdown?.remove();
      this.objects.forEach((o) => o.destroy());
      this.objects = [];
      onPick(u);
    };

    cards.forEach((u, i) => {
      const x = W / 2 + (i - (cards.length - 1) / 2) * 116;
      const y = 320;
      const g = this.scene.add.graphics();
      g.fillStyle(0x1b1b2b).fillRect(-54, -78, 108, 156);
      g.fillStyle([0xb5532e, 0x8a6a3a, 0x3d5c8f][i % 3]).fillRect(-52, -76, 104, 152);
      g.fillStyle(0x14141f, 0.55).fillRect(-46, -70, 92, 34).fillRect(-46, 4, 92, 66);
      const c = add(
        this.scene.add
          .container(x, y + 40, [
            g,
            txt(this.scene, 0, -53, u.name).setOrigin(0.5),
            this.scene.add.image(0, -16, u.icon).setScale(1.5),
            txt(this.scene, 0, 30, u.desc, 8, '#e8e8f0').setOrigin(0.5),
            txt(this.scene, 0, 60, `NIV. ${levelOf(u) + 1}`, 8, '#ffc533').setOrigin(0.5),
          ])
          .setDepth(D + 2)
          .setAlpha(0)
          .setSize(108, 156)
          .setInteractive({ useHandCursor: true }),
      );
      this.scene.tweens.add({ targets: c, y, alpha: 1, duration: 260, delay: i * 90, ease: 'Back.out' });
      // délai de garde : évite un choix involontaire avec le pouce déjà en mouvement
      c.on('pointerdown', () => this.scene.time.now - shownAt > 450 && pick(u));
    });

    this.countdown = this.scene.time.addEvent({
      delay: 1000,
      repeat: CARDS_TIME - 1,
      callback: () => {
        left--;
        clock.setText(`${left}s`);
        if (left <= 0) pick(cards[0]);
      },
    });
  }
}
