import { ChefId, IngredientId, UpgradeId, WorldId } from './constants';

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

const DEFAULT: Profile = { best: 0, chef: 'moustachu', world: 'clairiere', unlocked: 1, rulesSeen: false, duelWins: 0, coins: 0, owned: [], skins: {}, effect: null, pseudo: '' };

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

export const loadProfile = (): Profile => ({ ...DEFAULT, ...(read<Partial<Profile>>(PROFILE_KEY) ?? {}) });
export const saveProfile = (p: Partial<Profile>): void => write(PROFILE_KEY, { ...loadProfile(), ...p });

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
