import { ChefId, Sabotage } from '../core/constants';
import { DuelLink } from './DuelLink';

/**
 * Client du serveur de duel (WebSocket, voir server/index.mjs).
 * L'adresse vient de la variable VITE_SERVER_URL au moment du build ;
 * sans elle on vise le port 2567 de la machine qui sert le jeu (développement).
 */
export const SERVER_URL: string =
  import.meta.env.VITE_SERVER_URL || `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.hostname || 'localhost'}:2567`;

type ServerMsg =
  | { t: 'room'; code: string }
  | { t: 'start'; rival: { name: string; chef: ChefId } }
  | { t: 'peer'; gold: number; served: number }
  | { t: 'sabotage'; kind: Sabotage }
  | { t: 'ko' }
  | { t: 'left' }
  | { t: 'error'; msg: string };

export class MultiplayerClient implements DuelLink {
  readonly online = true;
  rivalName = 'RIVAL';
  rivalChef: ChefId = 'moustachu';
  onPeer: DuelLink['onPeer'] = () => {};
  onSabotage: DuelLink['onSabotage'] = () => {};
  onRivalOut: DuelLink['onRivalOut'] = () => {};
  /** Salon créé : code à communiquer à l'ami. */
  onRoom: (code: string) => void = () => {};
  /** Les deux joueurs sont là : la partie commence. */
  onStart: () => void = () => {};
  onError: (msg: string) => void = () => {};

  private ws: WebSocket | null = null;
  private started = false;

  /** Ouvre la connexion puis envoie la demande (partie rapide, création ou entrée dans un salon). */
  open(request: { t: 'quick' | 'create' | 'join'; code?: string; name: string; chef: ChefId }): void {
    let ws: WebSocket;
    try {
      ws = this.ws = new WebSocket(SERVER_URL);
    } catch {
      this.onError('SERVEUR INJOIGNABLE');
      return;
    }
    const timeout = setTimeout(() => ws.readyState !== WebSocket.OPEN && ws.close(), 6000);
    ws.onopen = () => {
      clearTimeout(timeout);
      ws.send(JSON.stringify(request));
    };
    ws.onmessage = (ev) => {
      let m: ServerMsg;
      try {
        m = JSON.parse(String(ev.data)) as ServerMsg;
      } catch {
        return;
      }
      if (m.t === 'room') this.onRoom(m.code);
      else if (m.t === 'start') {
        this.started = true;
        this.rivalName = (m.rival.name || 'RIVAL').toUpperCase().slice(0, 12);
        this.rivalChef = m.rival.chef;
        this.onStart();
      } else if (m.t === 'peer') this.onPeer(m.gold, m.served);
      else if (m.t === 'sabotage') this.onSabotage(m.kind);
      else if (m.t === 'ko') this.onRivalOut('ko');
      else if (m.t === 'left') this.onRivalOut('left');
      else if (m.t === 'error') this.onError(m.msg);
    };
    ws.onclose = () => {
      clearTimeout(timeout);
      if (this.ws !== ws) return; // fermeture volontaire
      this.ws = null;
      if (this.started) this.onRivalOut('left');
      else this.onError('SERVEUR INJOIGNABLE');
    };
  }

  private send(msg: object): void {
    if (this.ws?.readyState === WebSocket.OPEN) this.ws.send(JSON.stringify(msg));
  }

  sendScore(gold: number, served: number): void {
    this.send({ t: 'score', gold, served });
  }
  sendSabotage(kind: Sabotage): void {
    this.send({ t: 'sabotage', kind });
  }
  sendKo(): void {
    this.send({ t: 'ko' });
  }
  update(): void {}
  close(): void {
    const ws = this.ws;
    this.ws = null;
    ws?.close();
  }
}
