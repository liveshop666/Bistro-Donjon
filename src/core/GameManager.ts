import Phaser from 'phaser';
import { HARVEST_TIME, KITCHEN_TIME, STAND_HP, UPGRADES, UpgradeDef, UpgradeId, WAVES } from './constants';

export type Phase = 'harvest' | 'kitchen' | 'cards' | 'boss' | 'over';

/**
 * Etat d'une partie : phase en cours, chrono, or, stand, améliorations.
 * Emet 'phase' (phase) à chaque changement.
 */
export class GameManager extends Phaser.Events.EventEmitter {
  phase: Phase = 'harvest';
  wave = 0;
  timeLeft = HARVEST_TIME;
  gold = 0;
  served = 0;
  combo = 0;
  kills = 0;
  standHp = STAND_HP;
  standMax = STAND_HP;
  victory = false;
  private levels: Partial<Record<UpgradeId, number>> = {};

  get isBossWave(): boolean {
    return this.wave >= WAVES.length;
  }

  level(id: UpgradeId): number {
    return this.levels[id] ?? 0;
  }

  addUpgrade(id: UpgradeId): void {
    this.levels[id] = this.level(id) + 1;
  }

  /** Tire 3 cartes distinctes parmi les améliorations non maximisées. */
  drawCards(): UpgradeDef[] {
    const pool = UPGRADES.filter((u) => this.level(u.id) < u.max);
    return Phaser.Utils.Array.Shuffle(pool).slice(0, 3);
  }

  update(dt: number): void {
    if (this.phase === 'harvest' || this.phase === 'kitchen') {
      this.timeLeft -= dt;
      if (this.timeLeft <= 0) {
        if (this.phase === 'harvest') {
          this.timeLeft = KITCHEN_TIME;
          this.setPhase('kitchen');
        } else {
          this.setPhase('cards');
        }
      }
    }
  }

  /** Appelé après le choix d'une carte : lance la vague suivante (ou le boss). */
  nextWave(): void {
    this.wave++;
    this.timeLeft = HARVEST_TIME;
    this.setPhase(this.isBossWave ? 'boss' : 'harvest');
  }

  damageStand(n: number): void {
    this.standHp = Math.max(0, this.standHp - n);
  }

  repairStand(n: number): void {
    this.standHp = Math.min(this.standMax, this.standHp + n);
  }

  end(victory: boolean): void {
    this.victory = victory;
    this.setPhase('over');
  }

  private setPhase(p: Phase): void {
    this.phase = p;
    this.emit('phase', p);
  }
}
