import { allOwnable, ChefId, DAILY_GIFT, IngredientId, SHOP, ShopItem, TEST_UNLOCK_ALL, UpgradeId, WORLD_ORDER, WorldId } from './constants';

/** Sauvegardes locales : profil du joueur et partie en cours. */

const PROFILE_KEY = 'bistro-donjon';
const RUN_KEY = 'bistro-donjon-partie';

export interface Profile {
  best: number;
  chef: ChefId;
  world: WorldId;
  /** Nombre de mondes débloqués (1 à 4). */
  unlocked: number;
  rulesSeen: boolean;
  duelWins: number;
  /** Pièces gagnées en jouant, à dépenser dans la boutique. */
  coins: number;
  /** Total des pièces gagnées depuis le début (ne baisse jamais) : débloque les cadeaux de palier. */
  earned: number;
  /** Dernier jour où le cadeau du jour a été pris (AAAA-MM-JJ) et nombre de jours d'affilée. */
  lastGift: string;
  streak: number;
  /** Pièces validées des 20 dernières parties solo (0 si les 3 vagues n'ont pas été terminées) : sert à régler les prix. */
  runs: number[];
  /** Missions du jour (voir core/Missions.ts). */
  missions: { day: string; list: { id: number; progress: number; claimed: boolean }[]; bonus: boolean } | null;
  /** Identifiants des articles de boutique possédés. */
  owned: string[];
  /** Costume équipé par chef. */
  skins: Partial<Record<ChefId, string>>;
  /** Effet d'arme équipé. */
  effect: string | null;
  pseudo: string;
}

/** Partie solo sauvegardée : on reprend au début de la vague enregistrée. */
export interface RunSave {
  v: 1;
  chef: ChefId;
  world: WorldId;
  wave: number;
  gold: number;
  served: number;
  kills: number;
  combo: number;
  standHp: number;
  hp: number;
  maxHp: number;
  ult: number;
  upgrades: Partial<Record<UpgradeId, number>>;
  inv: Record<IngredientId, { n: number; sliced: number }>;
}

const DEFAULT: Profile = { best: 0, chef: 'moustachu', world: 'clairiere', unlocked: 1, rulesSeen: false, duelWins: 0, coins: 0, earned: 0, lastGift: '', streak: 0, runs: [], missions: null, owned: [], skins: {}, effect: null, pseudo: '' };

function read<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function write(key: string, value: unknown): void {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* stockage indisponible : on joue sans sauvegarde */
  }
}

function storedProfile(): Profile {
  const raw = read<Partial<Profile>>(PROFILE_KEY) ?? {};
  const p = { ...DEFAULT, ...raw };
  // anciens profils : le total gagné démarre à ce que le joueur possède déjà
  if (raw.earned === undefined) p.earned = p.coins;
  return p;
}
/** Profil vu par le jeu. En mode test, tout est possédé et les 8 mondes sont ouverts, sans toucher à la sauvegarde. */
export function loadProfile(): Profile {
  const p = storedProfile();
  return TEST_UNLOCK_ALL ? { ...p, owned: allOwnable(), unlocked: WORLD_ORDER.length } : p;
}
export function saveProfile(p: Partial<Profile>): void {
  const next = { ...storedProfile(), ...p };
  // mode test : ce qui est « possédé » est factice, on garde les vraies valeurs de la sauvegarde
  if (TEST_UNLOCK_ALL) Object.assign(next, { owned: storedProfile().owned, unlocked: storedProfile().unlocked });
  write(PROFILE_KEY, next);
}

export function loadRun(): RunSave | null {
  const r = read<RunSave>(RUN_KEY);
  return r && r.v === 1 && typeof r.wave === 'number' ? r : null;
}
export const saveRun = (r: RunSave): void => write(RUN_KEY, r);
export const clearRun = (): void => write(RUN_KEY, null);

/** Efface toutes les données du joueur sur cet appareil (profil, achats en pièces, partie en cours, réglages). */
export function deleteAllData(): void {
  try {
    for (const k of Object.keys(localStorage)) if (k.startsWith(PROFILE_KEY)) localStorage.removeItem(k);
  } catch {
    /* ignoré */
  }
}

/**
 * Ajoute des pièces (à dépenser + total gagné à vie) et débloque les cadeaux de palier atteints.
 * Renvoie les cadeaux nouvellement débloqués.
 */
export function addCoins(n: number): ShopItem[] {
  const p = loadProfile();
  const earned = p.earned + Math.max(0, n);
  const gifts = SHOP.filter((it) => it.palier !== undefined && earned >= it.palier && !p.owned.includes(it.id));
  saveProfile({ coins: p.coins + Math.max(0, n), earned, owned: [...p.owned, ...gifts.map((g) => g.id)] });
  return gifts;
}

/** Prochain cadeau de palier pas encore atteint, et pièces restant à gagner. */
export function nextMilestone(): { item: ShopItem; left: number } | null {
  const p = loadProfile();
  const next = SHOP.filter((it) => it.palier !== undefined && p.earned < it.palier).sort((a, b) => a.palier! - b.palier!)[0];
  return next ? { item: next, left: next.palier! - p.earned } : null;
}

const day = (d: Date): string => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/** Cadeau du jour : une fois par jour ; jouer plusieurs jours d'affilée rapporte plus. Renvoie null si déjà pris. */
export function claimDailyGift(now = new Date()): { streak: number; coins: number; gifts: ShopItem[] } | null {
  const p = loadProfile();
  const today = day(now);
  if (p.lastGift === today) return null;
  const yesterday = day(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1));
  const streak = p.lastGift === yesterday ? p.streak + 1 : 1;
  const coins = DAILY_GIFT[Math.min(streak, DAILY_GIFT.length) - 1];
  saveProfile({ lastGift: today, streak });
  return { streak, coins, gifts: addCoins(coins) };
}
