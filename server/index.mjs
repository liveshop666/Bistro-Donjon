/**
 * Serveur de duel de Bistro Donjon (« Guerre des Stands »).
 * Met deux joueurs en relation (partie rapide ou salon à code) et relaie scores et sabotages.
 * Chaque joueur fait tourner sa propre arène ; le serveur ne simule pas le jeu.
 *
 *   npm install && npm start        (port : variable PORT, 2567 par défaut)
 */
import { createServer } from 'node:http';
import { WebSocketServer } from 'ws';

const PORT = Number(process.env.PORT) || 2567;
const SABOTAGES = ['roi_tomate', 'fumee', 'inverse'];
const CHEFS = ['moustachu', 'shiba', 'noisette'];
const MAX_ROOMS = 500;

/** @type {Map<string, {host: any, guest: any}>} */
const rooms = new Map();
let waiting = null; // joueur en attente d'une partie rapide

const http = createServer((req, res) => {
  res.writeHead(200, { 'content-type': 'text/plain; charset=utf-8' });
  res.end(`Bistro Donjon - serveur de duel OK (${rooms.size} salon(s))\n`);
});
const wss = new WebSocketServer({ server: http, maxPayload: 1024 });

const send = (ws, msg) => ws.readyState === 1 && ws.send(JSON.stringify(msg));
const clean = (s) => String(s ?? '').replace(/[^\p{L}\p{N} _-]/gu, '').slice(0, 12) || 'CHEF';
const int = (n, max) => Math.max(0, Math.min(max, Math.floor(Number(n) || 0)));

function newCode() {
  for (let i = 0; i < 50; i++) {
    const code = String(1000 + Math.floor(Math.random() * 9000));
    if (!rooms.has(code)) return code;
  }
  return null;
}

function start(a, b) {
  a.peer = b;
  b.peer = a;
  send(a, { t: 'start', rival: { name: b.name, chef: b.chef } });
  send(b, { t: 'start', rival: { name: a.name, chef: a.chef } });
}

function leave(ws) {
  if (waiting === ws) waiting = null;
  if (ws.code) {
    rooms.delete(ws.code);
    ws.code = null;
  }
  const peer = ws.peer;
  ws.peer = null;
  if (peer) {
    peer.peer = null;
    send(peer, { t: 'left' });
  }
}

wss.on('connection', (ws) => {
  ws.alive = true;
  ws.budget = 40; // anti-spam : messages autorisés par tranche de 2 s
  ws.on('pong', () => (ws.alive = true));
  ws.on('close', () => leave(ws));
  ws.on('error', () => {});
  ws.on('message', (raw) => {
    if (--ws.budget < 0) return;
    let m;
    try {
      m = JSON.parse(String(raw));
    } catch {
      return;
    }
    if (!m || typeof m !== 'object') return;

    if (!ws.peer && ['quick', 'create', 'join'].includes(m.t)) {
      if (ws.joined) return;
      ws.joined = true;
      ws.name = clean(m.name);
      ws.chef = CHEFS.includes(m.chef) ? m.chef : 'moustachu';
      if (m.t === 'quick') {
        if (waiting && waiting !== ws && waiting.readyState === 1) {
          const other = waiting;
          waiting = null;
          start(other, ws);
        } else waiting = ws;
      } else if (m.t === 'create') {
        const code = rooms.size < MAX_ROOMS ? newCode() : null;
        if (!code) return send(ws, { t: 'error', msg: 'SERVEUR PLEIN' });
        ws.code = code;
        rooms.set(code, { host: ws });
        send(ws, { t: 'room', code });
      } else {
        const room = rooms.get(String(m.code));
        if (!room || room.host.readyState !== 1) return send(ws, { t: 'error', msg: 'SALON INTROUVABLE' });
        rooms.delete(String(m.code));
        room.host.code = null;
        start(room.host, ws);
      }
      return;
    }

    if (!ws.peer) return;
    if (m.t === 'score') send(ws.peer, { t: 'peer', gold: int(m.gold, 999999), served: int(m.served, 9999) });
    else if (m.t === 'sabotage' && SABOTAGES.includes(m.kind)) send(ws.peer, { t: 'sabotage', kind: m.kind });
    else if (m.t === 'ko') send(ws.peer, { t: 'ko' });
  });
});

// nettoyage des connexions mortes + recharge du budget anti-spam
setInterval(() => {
  for (const ws of wss.clients) {
    ws.budget = 40;
    if (!ws.alive) {
      ws.terminate();
      continue;
    }
    ws.alive = false;
    ws.ping();
  }
}, 2000);

http.listen(PORT, () => console.log(`Serveur de duel Bistro Donjon sur le port ${PORT}`));
