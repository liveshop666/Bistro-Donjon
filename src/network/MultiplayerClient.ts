import { ChefId, WorldId } from '../core/constants';

/**
 * Client multijoueur — SQUELETTE (non branché dans le prototype solo).
 *
 * Cible : serveur Colyseus (WebSockets) avec deux types de salles :
 *  - "duo"  : « Service du Soir », arène et cuisine partagées, rôles échangeables ;
 *  - "duel" : « Guerre des Stands », 2 minutes, un combo de 3 plats envoie un sabotage.
 *
 * Pour l'activer : `npm i colyseus.js`, déployer le serveur, puis implémenter `connect`
 * avec `new Client(url).joinOrCreate(mode, options)` et relayer les messages ci-dessous.
 */

export type MultiplayerMode = 'duo' | 'duel';
export type Sabotage = 'roi_tomate' | 'fumee' | 'controles_inverses';

/** Messages client -> serveur. */
export type ClientMessage =
  | { type: 'move'; x: number; y: number; facing: number }
  | { type: 'slice'; ingredientId: number }
  | { type: 'serve'; recipeId: string; gold: number }
  | { type: 'swapRoles' }
  | { type: 'sabotage'; kind: Sabotage };

/** Messages serveur -> client. */
export type ServerMessage =
  | { type: 'start'; seed: number; world: WorldId }
  | { type: 'peer'; x: number; y: number; facing: number; chef: ChefId }
  | { type: 'score'; you: number; opponent: number; timeLeft: number }
  | { type: 'sabotage'; kind: Sabotage }
  | { type: 'end'; winner: 'you' | 'opponent' | 'draw' };

export interface JoinOptions {
  mode: MultiplayerMode;
  chef: ChefId;
  roomCode?: string;
}

export class MultiplayerClient {
  onMessage: (msg: ServerMessage) => void = () => {};

  constructor(readonly serverUrl: string) {}

  get connected(): boolean {
    return false;
  }

  async connect(_options: JoinOptions): Promise<void> {
    throw new Error('Multijoueur non disponible dans le prototype solo.');
  }

  send(_msg: ClientMessage): void {
    /* à implémenter avec room.send(msg.type, msg) */
  }

  leave(): void {
    /* à implémenter avec room.leave() */
  }
}
