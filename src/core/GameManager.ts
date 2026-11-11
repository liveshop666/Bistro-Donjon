import Phaser from 'phaser';
import { COMBO_SIZE, DUEL_TIME, GameMode, HARVEST_TIME, KITCHEN_TIME, STAND_HP, UPGRADES, UpgradeDef, UpgradeId, WAVES } from './constants';
import { RunSave } from './Storage';

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
  levels: Partial<Record<UpgradeId, number>> = {};

  constructor(readonly mode: GameMode = 'solo') {
    super();
    if (mode === 'duel') this.timeLeft = DUEL_TIME;
  }

  /** Reprend une partie sauvegardée au début de sa vague. */
  restore(s: RunSave): void {
    this.wave = s.wave;
    this.gold = s.gold;
    this.served = s.served;
    this.kills = s.kills;
    this.combo = s.combo;
    this.standHp = s.standHp;
    this.levels = { ...s.upgrades };
    if (this.isBossWave) this.phase = 'boss';
  }

  /** Compte un plat servi ; vrai si le combo vient d'atteindre un palier. */
  serve(): boolean {
    this.served++;
    this.combo++;
    return this.combo % COMBO_SIZE === 0;
  }

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
    if (this.mode === 'duel') {
      // duel : 2 minutes d'affilée, la difficulté monte toutes les 40 s
      this.timeLeft = Math.max(0, this.timeLeft - dt);
      this.wave = Math.min(WAVES.length - 1, Math.floor((DUEL_TIME - this.timeLeft) / (DUEL_TIME / WAVES.length)));
      if (this.timeLeft <= 0 && this.phase !== 'over') this.emit('duelTime');
      return;
    }
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
