import { addCoins, loadProfile, saveProfile } from './Storage';

/**
 * Missions du jour : 3 missions tirées au sort chaque jour (les mêmes pour toute la journée),
 * chacune rapporte des pièces, et un bonus si les 3 sont récupérées.
 */
export type MissionKind = 'kills' | 'served' | 'gold' | 'waves' | 'boss' | 'combo' | 'sliced';

export interface MissionDef {
  kind: MissionKind;
  target: number;
  reward: number;
  /** Libellé court en majuscules (sans accents : la police les rend mal). */
  label: string;
}

export const MISSIONS: MissionDef[] = [
  { kind: 'kills', target: 40, reward: 300, label: 'BATS 40 MONSTRES' },
  { kind: 'kills', target: 100, reward: 600, label: 'BATS 100 MONSTRES' },
  { kind: 'served', target: 6, reward: 300, label: 'SERS 6 PLATS' },
  { kind: 'served', target: 15, reward: 600, label: 'SERS 15 PLATS' },
  { kind: 'gold', target: 500, reward: 400, label: 'FAIS 500 OR' },
  { kind: 'gold', target: 900, reward: 700, label: 'FAIS 900 OR' },
  { kind: 'waves', target: 1, reward: 400, label: 'FINIS LES 3 VAGUES' },
  { kind: 'waves', target: 3, reward: 800, label: 'FINIS 3X LES VAGUES' },
  { kind: 'boss', target: 1, reward: 700, label: 'BATS UN BOSS' },
  { kind: 'combo', target: 1, reward: 400, label: 'FAIS UN COMBO' },
  { kind: 'sliced', target: 12, reward: 300, label: 'TRANCHE 12 FOIS' },
  { kind: 'sliced', target: 30, reward: 600, label: 'TRANCHE 30 FOIS' },
];
export const MISSION_BONUS = 1000;

export interface RunStats {
  kills: number;
  served: number;
  /** Or de la partie, seulement si les 3 vagues sont terminées (sinon 0). */
  gold: number;
  waves: number;
  boss: number;
  combo: number;
  sliced: number;
}

const today = (d = new Date()): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/** Les 3 missions du jour (tirées au sort une fois par jour, toutes de types différents). */
export function dailyMissions(now = new Date()) {
  const p = loadProfile();
  const day = today(now);
  if (p.missions?.day === day) return p.missions;
  let seed = [...day].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);
  const rnd = () => ((seed = (seed * 1103515245 + 12345) >>> 0) / 4294967296);
  const ids: number[] = [];
  const kinds = new Set<MissionKind>();
  while (ids.length < 3) {
    const i = Math.floor(rnd() * MISSIONS.length);
    if (kinds.has(MISSIONS[i].kind)) continue;
    kinds.add(MISSIONS[i].kind);
    ids.push(i);
  }
  const missions = { day, list: ids.map((id) => ({ id, progress: 0, claimed: false })), bonus: false };
  saveProfile({ missions });
  return missions;
}

/** Ajoute les résultats d'une partie aux missions du jour. Renvoie les libellés des missions qui viennent d'être accomplies. */
export function recordRun(stats: RunStats): string[] {
  const m = dailyMissions();
  const done: string[] = [];
  for (const it of m.list) {
    const def = MISSIONS[it.id];
    if (it.progress >= def.target) continue;
    const v = stats[def.kind];
    // or et combo : il faut le faire en une seule partie ; le reste s'additionne au fil des parties
    it.progress = def.kind === 'gold' || def.kind === 'combo' ? Math.max(it.progress, v) : it.progress + v;
    if (it.progress >= def.target) done.push(def.label);
  }
  saveProfile({ missions: m });
  return done;
}

/** Récupère la récompense d'une mission accomplie. Renvoie les pièces gagnées (0 si rien à récupérer). */
export function claimMission(index: number): number {
  const m = dailyMissions();
  const it = m.list[index];
  const def = MISSIONS[it.id];
  if (it.claimed || it.progress < def.target) return 0;
  it.claimed = true;
  saveProfile({ missions: m });
  addCoins(def.reward);
  return def.reward;
}

/** Récupère le bonus quand les 3 missions sont récupérées. */
export function claimBonus(): number {
  const m = dailyMissions();
  if (m.bonus || !m.list.every((it) => it.claimed)) return 0;
  m.bonus = true;
  saveProfile({ missions: m });
  addCoins(MISSION_BONUS);
  return MISSION_BONUS;
}

/** Nombre de missions accomplies, et vrai s'il y a quelque chose à récupérer. */
export function missionsStatus(): { done: number; claimable: boolean } {
  const m = dailyMissions();
  const done = m.list.filter((it) => it.progress >= MISSIONS[it.id].target).length;
  const claimable = m.list.some((it) => !it.claimed && it.progress >= MISSIONS[it.id].target) || (!m.bonus && m.list.every((it) => it.claimed));
  return { done, claimable };
}
