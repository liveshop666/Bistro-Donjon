import { Sabotage, SABOTAGES } from '../core/constants';

/**
 * Lien avec le rival d'un duel « Guerre des Stands ».
 * Deux implémentations : BotLink (adversaire simulé, hors ligne) et MultiplayerClient (en ligne).
 */
export interface DuelLink {
  readonly online: boolean;
  rivalName: string;
  onPeer: (gold: number, served: number) => void;
  onSabotage: (kind: Sabotage) => void;
  /** Le rival a quitté ou a été mis K.O. : victoire immédiate. */
  onRivalOut: (reason: 'ko' | 'left') => void;
  sendScore(gold: number, served: number): void;
  sendSabotage(kind: Sabotage): void;
  sendKo(): void;
  update(dt: number): void;
  close(): void;
}

/** Adversaire contrôlé par l'ordinateur : il sert des plats à son rythme et sabote tous les 3 plats. */
export class BotLink implements DuelLink {
  readonly online = false;
  rivalName = 'CHEF ROBOT';
  onPeer: DuelLink['onPeer'] = () => {};
  onSabotage: DuelLink['onSabotage'] = () => {};
  onRivalOut: DuelLink['onRivalOut'] = () => {};
  private gold = 0;
  private served = 0;
  private next = 14;

  /** @param skill 0 (facile) à 1 (difficile) */
  constructor(private skill = 0.5) {}

  update(dt: number): void {
    this.next -= dt;
    if (this.next > 0) return;
    this.next = 15 - this.skill * 6 + Math.random() * 5;
    this.served++;
    this.gold += 35 + Math.round(Math.random() * 45);
    this.onPeer(this.gold, this.served);
    if (this.served % 3 === 0) this.onSabotage(SABOTAGES[Math.floor(Math.random() * SABOTAGES.length)]);
  }

  sendScore(): void {}
  /** Un sabotage reçu fait perdre du temps au robot. */
  sendSabotage(): void {
    this.next += 7;
  }
  sendKo(): void {}
  close(): void {}
}
