/** Données d'équilibrage et de contenu de Bistro Donjon. Tout se règle ici. */

export const W = 360;
export const H = 640;

export const HARVEST_TIME = 45; // Phase 1 : récolte sauvage (s)
export const KITCHEN_TIME = 20; // Phase 2 : coup de feu en cuisine (s)
export const CARDS_TIME = 15; // Phase 3 : choix d'une carte (s)
export const COOK_TIME = 5; // cuisson d'un plat (s)
export const STAND_HP = 20;
export const BOSS_REWARD = 500;
export const FONT = '"Press Start 2P"';

export type IngredientId = 'tomate' | 'champignon' | 'sucre' | 'piment';
export const INGREDIENTS: IngredientId[] = ['tomate', 'champignon', 'sucre', 'piment'];

// ---------------------------------------------------------------- Chefs
export type ChefId = 'moustachu' | 'shiba' | 'noisette';
export type UltimateId = 'tornade' | 'onde' | 'dash';

export interface ChefDef {
  id: ChefId;
  name: string;
  weapon: string;
  ultimate: UltimateId;
  ultimateName: string;
  stats: { vie: number; vitesse: number; degats: number }; // sur 5, affichage
  hp: number;
  speed: number; // px/s
  damage: number;
  cooldown: number; // s entre deux coups
  range: number; // px
  slashColor: number;
}

export const CHEFS: Record<ChefId, ChefDef> = {
  moustachu: {
    id: 'moustachu', name: 'CHEF MOUSTACHU', weapon: 'Poêle enflammée',
    ultimate: 'tornade', ultimateName: 'TORNADE FLAMBEE',
    stats: { vie: 3, vitesse: 3, degats: 3 },
    hp: 6, speed: 100, damage: 14, cooldown: 0.5, range: 52, slashColor: 0xff8a1e,
  },
  shiba: {
    id: 'shiba', name: 'MAITRE SHIBA', weapon: 'Rouleau géant',
    ultimate: 'onde', ultimateName: 'ONDE DE CHOC PATE',
    stats: { vie: 5, vitesse: 2, degats: 5 },
    hp: 10, speed: 80, damage: 30, cooldown: 0.95, range: 48, slashColor: 0xe8c48a,
  },
  noisette: {
    id: 'noisette', name: 'MLLE NOISETTE', weapon: 'Doubles hachoirs',
    ultimate: 'dash', ultimateName: 'DANSE DES LAMES',
    stats: { vie: 2, vitesse: 5, degats: 4 },
    hp: 4, speed: 135, damage: 9, cooldown: 0.22, range: 40, slashColor: 0xdff4ff,
  },
};

// ---------------------------------------------------------------- Ennemis
export type EnemyId = 'champi' | 'tomate' | 'gelee' | 'piment' | 'roi_tomate';
export type EnemyAi = 'stand' | 'chase' | 'hop' | 'ranged' | 'boss';

export interface EnemyDef {
  id: EnemyId;
  ai: EnemyAi;
  hp: number;
  speed: number;
  radius: number;
  damage: number;
  drop: IngredientId | null;
  group: number; // nombre d'ennemis par apparition
}

export const ENEMIES: Record<EnemyId, EnemyDef> = {
  champi: { id: 'champi', ai: 'stand', hp: 32, speed: 22, radius: 11, damage: 1, drop: 'champignon', group: 1 },
  tomate: { id: 'tomate', ai: 'chase', hp: 14, speed: 52, radius: 9, damage: 1, drop: 'tomate', group: 3 },
  gelee: { id: 'gelee', ai: 'hop', hp: 26, speed: 40, radius: 11, damage: 1, drop: 'sucre', group: 1 },
  piment: { id: 'piment', ai: 'ranged', hp: 18, speed: 42, radius: 9, damage: 1, drop: 'piment', group: 1 },
  roi_tomate: { id: 'roi_tomate', ai: 'boss', hp: 650, speed: 30, radius: 36, damage: 2, drop: null, group: 1 },
};

// ---------------------------------------------------------------- Vagues
export interface WaveDef {
  interval: number; // s entre deux apparitions
  pool: Partial<Record<EnemyId, number>>; // poids
  unlocks: IngredientId[]; // ingrédients disponibles pour les commandes
}

export const WAVES: WaveDef[] = [
  { interval: 1.7, pool: { tomate: 4, champi: 1.5 }, unlocks: ['tomate', 'champignon'] },
  { interval: 1.4, pool: { tomate: 3, champi: 2, gelee: 3 }, unlocks: ['tomate', 'champignon', 'sucre'] },
  { interval: 1.15, pool: { tomate: 3, champi: 2, gelee: 2, piment: 3 }, unlocks: ['tomate', 'champignon', 'sucre', 'piment'] },
];

// ---------------------------------------------------------------- Recettes
export type PowerId = 'vitesse' | 'feu' | 'regen' | 'bouclier';
export const POWER_LABEL: Record<PowerId, string> = {
  vitesse: 'VITESSE', feu: 'FEU', regen: 'REGEN', bouclier: 'BOUCLIER',
};
export const POWER_TIME = 15;

export interface RecipeDef {
  id: string;
  name: string;
  needs: Partial<Record<IngredientId, number>>;
  gold: number;
  power: PowerId;
}

export const RECIPES: RecipeDef[] = [
  { id: 'salade', name: 'SALADE GROGNON', needs: { tomate: 3 }, gold: 30, power: 'vitesse' },
  { id: 'soupe', name: 'SOUPE CHAMPI-TOMATE', needs: { tomate: 2, champignon: 1 }, gold: 40, power: 'regen' },
  { id: 'poelee', name: 'POELEE FORESTIERE', needs: { champignon: 2, tomate: 1 }, gold: 40, power: 'vitesse' },
  { id: 'confiture', name: 'CONFITURE GELEE', needs: { sucre: 2, tomate: 1 }, gold: 55, power: 'regen' },
  { id: 'brochette', name: 'BROCHETTE EPICEE', needs: { piment: 2, champignon: 1 }, gold: 70, power: 'feu' },
  { id: 'sauce', name: 'SOUPE DU DIABLE', needs: { piment: 1, sucre: 1, tomate: 1 }, gold: 75, power: 'bouclier' },
];

// ---------------------------------------------------------------- Améliorations
export type UpgradeId = 'couteaux' | 'bottes' | 'tourelle' | 'aimant' | 'fourneaux' | 'degats' | 'coeur' | 'reparation';

export interface UpgradeDef {
  id: UpgradeId;
  name: string;
  desc: string;
  icon: string;
  max: number;
}

export const UPGRADES: UpgradeDef[] = [
  { id: 'couteaux', name: 'COUTEAUX\nVOLANTS', desc: '+1 couteau\nen orbite', icon: 'ico_couteaux', max: 4 },
  { id: 'bottes', name: 'BOTTES DE\nVITESSE', desc: 'Vitesse\n+15%', icon: 'ico_etoile', max: 4 },
  { id: 'tourelle', name: 'TOURELLE', desc: 'Tire devant\nle stand', icon: 'ico_engrenage', max: 3 },
  { id: 'aimant', name: 'AIMANT', desc: 'Ramassage\nplus large', icon: 'ico_sac', max: 3 },
  { id: 'fourneaux', name: 'FOURNEAUX\nTURBO', desc: 'Cuisson\n-25%', icon: 'ico_tornade', max: 3 },
  { id: 'degats', name: 'LAME\nAFFUTEE', desc: 'Dégâts\n+25%', icon: 'ico_epees', max: 5 },
  { id: 'coeur', name: 'COEUR\nGOURMAND', desc: '+2 vie max\net soin', icon: 'ico_coeur', max: 3 },
  { id: 'reparation', name: 'STAND\nBLINDE', desc: 'Répare le\nstand (+4)', icon: 'ico_bouclier', max: 99 },
];

// ---------------------------------------------------------------- Mondes
export type WorldId = 'clairiere' | 'marche' | 'taverne' | 'cantine';
export type WorldMechanic = 'none' | 'file' | 'tonneaux' | 'tapis';

export interface WorldDef {
  id: WorldId;
  name: string;
  hint: string;
  mechanic: WorldMechanic;
  pot: { x: number; y: number };
  counter: { x: number; y: number };
  /** Ligne de séparation cuisine / arène : les monstres s'y arrêtent et attaquent le stand. */
  standLine: number;
}

export const WORLDS: Record<WorldId, WorldDef> = {
  clairiere: {
    id: 'clairiere', name: 'LA CLAIRIERE', hint: 'Idéal pour apprendre', mechanic: 'none',
    pot: { x: 140, y: 214 }, counter: { x: 264, y: 200 }, standLine: 252,
  },
  marche: {
    id: 'marche', name: 'MARCHE DE NUIT', hint: 'Monstres en file serrée', mechanic: 'file',
    pot: { x: 92, y: 276 }, counter: { x: 268, y: 276 }, standLine: 312,
  },
  taverne: {
    id: 'taverne', name: 'LA TAVERNE', hint: 'Tonneaux explosifs', mechanic: 'tonneaux',
    pot: { x: 84, y: 296 }, counter: { x: 262, y: 296 }, standLine: 330,
  },
  cantine: {
    id: 'cantine', name: 'CANTINE CYBER', hint: 'Tapis roulants rapides', mechanic: 'tapis',
    pot: { x: 90, y: 284 }, counter: { x: 266, y: 284 }, standLine: 320,
  },
};
export const WORLD_ORDER: WorldId[] = ['clairiere', 'marche', 'taverne', 'cantine'];
export const CHEF_ORDER: ChefId[] = ['moustachu', 'shiba', 'noisette'];
/** Bandes horizontales des tapis roulants (monde 4). */
export const CONVEYORS = [{ y: 430, h: 36 }, { y: 540, h: 36 }];
