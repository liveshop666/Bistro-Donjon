/** Données d'équilibrage et de contenu de Bistro Donjon. Tout se règle ici. */

export const W = 360;
export const H = 640;
/** Taille du terrain de la partie en cours (plus grand que l'écran pour les grandes maps). Réglé par GameScene. */
export const ARENA = { w: W, h: H };
/** Les grandes maps (1680 x 944) sont affichées à 70 % : terrain de 1176 x 661. */
export const WIDE_SCALE = 0.7;

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
    hp: 5, speed: 135, damage: 9, cooldown: 0.22, range: 40, slashColor: 0xdff4ff,
  },
};

// ---------------------------------------------------------------- Ennemis
export type EnemyId =
  | 'champi' | 'tomate' | 'gelee' | 'piment' | 'roi_tomate'
  | 'ail' | 'aubergine' | 'mais' | 'oignon' | 'citrouille' | 'hotdog' | 'cube_fromage' | 'roi_fromage';
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
  /** Bruitage joué quand il est vaincu (par défaut : « pop »). */
  die?: string;
}

export const ENEMIES: Record<EnemyId, EnemyDef> = {
  champi: { id: 'champi', ai: 'stand', hp: 32, speed: 22, radius: 11, damage: 1, drop: 'champignon', group: 1 },
  tomate: { id: 'tomate', ai: 'chase', hp: 14, speed: 52, radius: 9, damage: 1, drop: 'tomate', group: 3 },
  gelee: { id: 'gelee', ai: 'hop', hp: 26, speed: 40, radius: 11, damage: 1, drop: 'sucre', group: 1 },
  piment: { id: 'piment', ai: 'ranged', hp: 18, speed: 42, radius: 9, damage: 1, drop: 'piment', group: 1 },
  roi_tomate: { id: 'roi_tomate', ai: 'boss', hp: 650, speed: 30, radius: 36, damage: 2, drop: null, group: 1 },
  // Monstres des mondes 5 à 8. Chacun remplace un monstre de base (même comportement, même ingrédient lâché,
  // force très proche) : l'équilibrage testé sur les 4 premiers mondes reste valable.
  ail: { id: 'ail', ai: 'chase', hp: 14, speed: 50, radius: 10, damage: 1, drop: 'tomate', group: 3 },
  oignon: { id: 'oignon', ai: 'hop', hp: 24, speed: 42, radius: 10, damage: 1, drop: 'sucre', group: 1, die: 'fantome' },
  aubergine: { id: 'aubergine', ai: 'stand', hp: 36, speed: 20, radius: 13, damage: 1, drop: 'champignon', group: 1, die: 'splat' },
  citrouille: { id: 'citrouille', ai: 'stand', hp: 40, speed: 18, radius: 12, damage: 1, drop: 'champignon', group: 1, die: 'splat' },
  mais: { id: 'mais', ai: 'ranged', hp: 18, speed: 40, radius: 10, damage: 1, drop: 'piment', group: 1 },
  hotdog: { id: 'hotdog', ai: 'ranged', hp: 16, speed: 46, radius: 10, damage: 1, drop: 'piment', group: 1, die: 'splat' },
  cube_fromage: { id: 'cube_fromage', ai: 'chase', hp: 14, speed: 50, radius: 8, damage: 1, drop: 'tomate', group: 3, die: 'splat' },
  roi_fromage: { id: 'roi_fromage', ai: 'boss', hp: 700, speed: 28, radius: 38, damage: 2, drop: null, group: 1 },
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
export type WorldId = 'clairiere' | 'marche' | 'taverne' | 'cantine' | 'glaciere' | 'volcan' | 'bateau' | 'bonbons';
export type WorldMechanic = 'none' | 'file' | 'tonneaux' | 'tapis';

export interface WorldDef {
  id: WorldId;
  name: string;
  hint: string;
  mechanic: WorldMechanic;
  pot: { x: number; y: number };
  /** Grande map paysage (public/assets/maps/wide_<id>.jpg) : taille du terrain et zone où le chef peut marcher. */
  wide?: { w: number; h: number; area: Obstacle };
  counter: { x: number; y: number };
  /** Planche à découper : tranche en sécurité les ingrédients portés. */
  board: { x: number; y: number };
  /** Ligne de séparation cuisine / arène : les monstres s'y arrêtent et attaquent le stand. */
  standLine: number;
  /** Décors peints sur la carte que le chef ne traverse pas (arbres, troncs, étals, tonneaux). Rectangles en pixels. */
  obstacles?: Obstacle[];
  /** Monstres de ce monde : chaque monstre de base tiré par la vague est remplacé par l'un de ceux-ci. */
  swap?: Partial<Record<EnemyId, EnemyId[]>>;
  /** Boss du monde (par défaut le Roi Tomate), son nom affiché, et les sbires qu'il appelle. */
  boss?: EnemyId;
  bossName?: string;
  minion?: EnemyId;
}

export interface Obstacle { x: number; y: number; w: number; h: number }

export const WORLDS: Record<WorldId, WorldDef> = {
  clairiere: {
    id: 'clairiere', name: 'LA CLAIRIERE', hint: 'Idéal pour apprendre', mechanic: 'none',
    wide: { w: 1176, h: 661, area: { x: 105, y: 0, w: 966, h: 623 } },
    pot: { x: 396, y: 132 }, counter: { x: 605, y: 146 }, board: { x: 500, y: 152 }, standLine: 172,
    obstacles: [
      { x: 147, y: 126, w: 105, h: 70 }, { x: 962, y: 126, w: 95, h: 74 }, // troncs couchés du haut
      { x: 984, y: 518, w: 35, h: 35 }, // rocher
    ],
  },
  marche: {
    id: 'marche', name: 'MARCHE DE NUIT', hint: 'Monstres en file serrée', mechanic: 'file',
    wide: { w: 1176, h: 661, area: { x: 161, y: 0, w: 875, h: 649 } },
    pot: { x: 487, y: 152 }, counter: { x: 655, y: 168 }, board: { x: 571, y: 170 }, standLine: 190,
    obstacles: [
      { x: 378, y: 577, w: 88, h: 84 }, { x: 717, y: 602, w: 91, h: 59 }, // caisses du bas
      { x: 161, y: 455, w: 40, h: 120 }, { x: 1001, y: 245, w: 49, h: 98 }, // tonneaux et caisses des côtés
    ],
  },
  taverne: {
    id: 'taverne', name: 'LA TAVERNE', hint: 'Tonneaux explosifs', mechanic: 'tonneaux',
    wide: { w: 1176, h: 661, area: { x: 42, y: 0, w: 1092, h: 518 } },
    pot: { x: 455, y: 172 }, counter: { x: 742, y: 196 }, board: { x: 350, y: 178 }, standLine: 214,
    obstacles: [ // tables, bancs, tonneaux et caisses du décor
      { x: 60, y: 248, w: 70, h: 60 }, { x: 46, y: 336, w: 87, h: 38 }, { x: 1036, y: 248, w: 70, h: 60 },
      { x: 1081, y: 325, w: 42, h: 85 }, { x: 38, y: 448, w: 130, h: 70 }, { x: 1036, y: 413, w: 98, h: 105 },
      { x: 70, y: 98, w: 46, h: 140 }, { x: 1064, y: 161, w: 49, h: 84 },
    ],
  },
  cantine: {
    id: 'cantine', name: 'CANTINE CYBER', hint: 'Tapis roulants rapides', mechanic: 'tapis',
    wide: { w: 1176, h: 661, area: { x: 120, y: 0, w: 936, h: 648 } },
    pot: { x: 470, y: 222 }, counter: { x: 715, y: 222 }, board: { x: 590, y: 228 }, standLine: 244,
    obstacles: [
      { x: 120, y: 214, w: 165, h: 95 }, { x: 895, y: 214, w: 161, h: 95 }, // distributeurs
      { x: 120, y: 515, w: 185, h: 146 }, { x: 870, y: 515, w: 186, h: 146 }, // blocs des poubelles, en bas
    ],
  },
  // ---- Mondes 5 à 8 (planche du 11/11/2026) : nouveaux monstres, boss Roi Fromage
  glaciere: {
    id: 'glaciere', name: 'LA GLACIERE', hint: 'Monstres givrés', mechanic: 'none',
    wide: { w: 1176, h: 661, area: { x: 160, y: 0, w: 850, h: 600 } },
    pot: { x: 455, y: 236 }, counter: { x: 705, y: 236 }, board: { x: 580, y: 242 }, standLine: 258,
    obstacles: [{ x: 188, y: 566, w: 70, h: 40 }, { x: 918, y: 566, w: 72, h: 40 }], // tonneaux gelés du bas
    swap: { tomate: ['ail'], champi: ['aubergine'], gelee: ['oignon'], piment: ['mais'] },
    boss: 'roi_fromage', bossName: 'ROI FROMAGE', minion: 'cube_fromage',
  },
  volcan: {
    id: 'volcan', name: 'VOLCAN BARBECUE', hint: 'Tonneaux explosifs', mechanic: 'tonneaux',
    // grande map refaite le 14/11 depuis la petite map d'origine (grill de lave, rivières de lave sur les côtés)
    wide: { w: 1176, h: 661, area: { x: 215, y: 0, w: 750, h: 650 } },
    pot: { x: 505, y: 290 }, counter: { x: 660, y: 290 }, board: { x: 583, y: 294 }, standLine: 310,
    swap: { tomate: ['ail'], champi: ['citrouille'], gelee: ['oignon'], piment: ['hotdog'] },
    boss: 'roi_fromage', bossName: 'ROI FROMAGE', minion: 'cube_fromage',
  },
  bateau: {
    id: 'bateau', name: 'GALION PIRATE', hint: 'Monstres en file serrée', mechanic: 'file',
    // grande map refaite le 14/11 depuis la petite map d'origine (pont du galion, la mer de chaque côté)
    wide: { w: 1176, h: 661, area: { x: 245, y: 0, w: 690, h: 645 } },
    pot: { x: 510, y: 296 }, counter: { x: 660, y: 296 }, board: { x: 585, y: 300 }, standLine: 316,
    swap: { tomate: ['ail', 'cube_fromage'], champi: ['aubergine', 'citrouille'], gelee: ['oignon'], piment: ['mais', 'hotdog'] },
    boss: 'roi_fromage', bossName: 'ROI FROMAGE', minion: 'cube_fromage',
  },
  bonbons: {
    id: 'bonbons', name: 'USINE HANTEE', hint: 'Tapis roulants rapides', mechanic: 'tapis',
    // grande map du 14/11 (style de la petite map d'origine) : on marche entre les deux tapis roulants du milieu
    wide: { w: 1176, h: 661, area: { x: 300, y: 0, w: 572, h: 655 } },
    pot: { x: 515, y: 290 }, counter: { x: 665, y: 290 }, board: { x: 590, y: 294 }, standLine: 308,
    swap: { tomate: ['ail', 'cube_fromage'], champi: ['aubergine', 'citrouille'], gelee: ['oignon'], piment: ['mais', 'hotdog'] },
    boss: 'roi_fromage', bossName: 'ROI FROMAGE', minion: 'cube_fromage',
  },
};
/**
 * Difficulté par monde : chaque monde est un peu plus dur que le précédent, pour que la progression prenne du temps
 * sans devenir impossible (les cartes d'amélioration compensent). Monde 1 : inchangé. Monde 8 : monstres +56 % de vie,
 * apparitions 21 % plus rapprochées. À régler ici après essais sur téléphone.
 */
export const WORLD_HP_STEP = 0.08;
export const WORLD_PACE_STEP = 0.03;
export const worldRank = (id: WorldId): number => Math.max(0, WORLD_ORDER.indexOf(id));

/**
 * Les 4 premiers mondes se débloquent en battant le boss du précédent.
 * Les mondes 5 à 8 s'obtiennent avec un pack de la boutique (payant, ou énormément de pièces).
 */
export const FREE_WORLDS = 4;
/**
 * MODE TEST (demande de Rudy du 14/11) : tout est débloqué pour essayer le jeu en entier (packs, costumes,
 * effets, armes, chefs combattants, les 8 mondes). Rien n'est écrit dans la sauvegarde du joueur :
 * remettre `false` suffit pour retrouver exactement ce qu'il possédait. À REMETTRE À `false` AVANT LE PLAY STORE.
 */
export const TEST_UNLOCK_ALL = true;
/**
 * PAIEMENT DE TEST (14/11) : tant que Google Play Billing n'est pas branché, un achat en euros passe par un faux
 * écran de paiement, gratuit, pour essayer tout le parcours (payer, reçu, Mes articles). À REMETTRE À `false`
 * AVANT LE PLAY STORE (sinon tout le premium serait gratuit).
 */
export const TEST_PAYMENTS = true;
export const worldKey = (id: WorldId): string => 'monde_' + id;
export function worldUnlocked(id: WorldId, unlocked: number, owned: string[]): boolean {
  const i = WORLD_ORDER.indexOf(id);
  return i < FREE_WORLDS ? i < unlocked : owned.includes(worldKey(id));
}
/** Tout ce qu'on peut posséder : articles de la boutique, contenu des packs, clés des mondes payants. */
export const allOwnable = (): string[] => [...new Set([...SHOP.flatMap((it) => [it.id, ...(it.items ?? [])]), ...WORLD_ORDER.map(worldKey)])];

export const WORLD_ORDER: WorldId[] = ['clairiere', 'marche', 'taverne', 'cantine', 'glaciere', 'volcan', 'bateau', 'bonbons'];
export const CHEF_ORDER: ChefId[] = ['moustachu', 'shiba', 'noisette'];
/** Bandes horizontales des tapis roulants (Cantine, Usine hantée) : petite map, puis grande map. */
export const CONVEYORS = [{ y: 430, h: 36 }, { y: 540, h: 36 }];
export const WIDE_CONVEYORS = [{ y: 340, h: 36 }, { y: 450, h: 36 }];
/** Tapis roulants : bandes horizontales (largeur du terrain), ou rectangles posés sur les tapis dessinés de la map. */
export interface Conveyor { y: number; h: number; x?: number; w?: number }
/** Usine hantée, grande map : les deux tapis verticaux dessinés au milieu font courir le chef plus vite. */
const BONBONS_CONVEYORS: Conveyor[] = [{ x: 302, w: 66, y: 300, h: 361 }, { x: 806, w: 64, y: 300, h: 361 }];
export const conveyorsOf = (w: WorldDef): Conveyor[] => (w.mechanic !== 'tapis' ? [] : !w.wide ? CONVEYORS : w.id === 'bonbons' ? BONBONS_CONVEYORS : WIDE_CONVEYORS);

// ---------------------------------------------------------------- Cuisine
/** Patience d'un client (s). Servi avant la moitié : pourboire. Dépassée : le client part, le combo retombe. */
export const ORDER_PATIENCE = 50;
export const TIP_BONUS = 0.25;
/** Tous les COMBO_SIZE plats servis d'affilée : prime d'or (et sabotage en duel). */
export const COMBO_SIZE = 3;
export const COMBO_GOLD = 60;
/** Durée de découpe d'un ingrédient sur la planche (s). */
export const CHOP_TIME = 0.4;

// ---------------------------------------------------------------- Duel
export const DUEL_TIME = 120;
export type Sabotage = 'roi_tomate' | 'fumee' | 'inverse';
export const SABOTAGES: Sabotage[] = ['roi_tomate', 'fumee', 'inverse'];
export const SABOTAGE_LABEL: Record<Sabotage, string> = {
  roi_tomate: 'MINI ROI TOMATE', fumee: 'NUAGE DE FUMEE', inverse: 'CONTROLES INVERSES',
};
export type GameMode = 'solo' | 'duel';

// ---------------------------------------------------------------- Animations (clés de textures)
export const CHEF_FRAMES: Record<ChefId, { idle: string[]; walk: string[]; attack: string[] }> = {
  moustachu: { idle: ['moustachu_i0'], walk: ['moustachu_w0', 'moustachu_w1', 'moustachu_w2', 'moustachu_w3'], attack: ['moustachu_a0', 'moustachu_a1', 'moustachu_a2'] },
  shiba: { idle: ['shiba_i0'], walk: ['shiba_w0', 'shiba_i0', 'shiba_w1', 'shiba_i0'], attack: ['shiba_a0', 'shiba_a1', 'shiba_a2'] },
  noisette: { idle: ['noisette_i0'], walk: ['noisette_w0', 'noisette_w1'], attack: ['noisette_a0', 'noisette_a1', 'noisette_a2'] },
};
export const SPRITE_FILES = {
  chefs: Object.values(CHEF_FRAMES).flatMap((f) => [...f.idle, ...f.walk, ...f.attack]).filter((k, i, a) => a.indexOf(k) === i),
  enemies: ['champi', 'champi_w0', 'champi_w1', 'champi_a0', 'tomate', 'tomate_ko', 'gelee_0', 'gelee_1', 'gelee_2', 'gelee_3', 'piment', 'roi_tomate', 'ail', 'aubergine', 'mais', 'oignon', 'citrouille', 'hotdog', 'cube_fromage', 'roi_fromage'],
};

// ---------------------------------------------------------------- Style 3D (essai du 14/11, demande de Rudy)
/**
 * STYLE 3D : remplace des dessins pixel par des images au rendu 3D (planche reference/3d/personnages-3d.png, découpée
 * par tools/extract_3d.py dans public/assets/sprites3d/). Les dessins pixel restent : `false` revient au jeu d'avant.
 * Depuis le 14/11 au soir : les 8 maps, les 3 chefs, les 4 chefs combattants et tous les monstres (les 6 costumes restent pixel).
 */
export const STYLE_3D = true;
/** Clé d'un sprite du jeu -> fichier 3D qui le remplace (toutes les images d'animation d'un personnage prennent la même). */
const chef3d = (id: ChefId) => [...CHEF_FRAMES[id].idle, ...CHEF_FRAMES[id].walk, ...CHEF_FRAMES[id].attack].map((k) => [k, id]);
export const ART_3D: Record<string, string> = {
  ...Object.fromEntries([...chef3d('moustachu'), ...chef3d('shiba'), ...chef3d('noisette')]),
  // chefs combattants des packs
  skin_taureau: 'skin_taureau', skin_ours: 'skin_ours', skin_gorille: 'skin_gorille', skin_tigre: 'skin_tigre',
  // monstres des mondes 5 à 8 et Roi Fromage
  ail: 'ail', aubergine: 'aubergine', mais: 'mais', oignon: 'oignon', citrouille: 'citrouille', hotdog: 'hotdog', cube_fromage: 'cube_fromage', roi_fromage: 'roi_fromage',
  tomate: 'tomate', tomate_ko: 'tomate',
  champi: 'champi', champi_w0: 'champi', champi_w1: 'champi', champi_a0: 'champi',
  gelee_0: 'gelee', gelee_1: 'gelee', gelee_2: 'gelee', gelee_3: 'gelee',
  piment: 'piment', roi_tomate: 'roi_tomate',
};
/** Vrai si ce sprite est dessiné en 3D : l'image est 2 fois plus grande et le jeu l'affiche à moitié (nette). */
export const is3d = (key: string): boolean => STYLE_3D && key in ART_3D;
/** Taille d'affichage d'un sprite : 0,5 pour les images 3D (dessinées 2 fois plus grandes), 1 sinon. */
export const artScale = (key: string): number => (is3d(key) ? 0.5 : 1);
/** Mondes redessinés en 3D : leur grande map (public/assets/maps/wide3d_<id>.jpg) et la cuisine replacée dessus
 * (vide quand la map 3D garde la disposition de la grande map pixel). */
export const WORLD_3D: Partial<Record<WorldId, Partial<WorldDef>>> = {
  cantine: {}, glaciere: {}, volcan: {}, bateau: {}, bonbons: {},
  taverne: {
    wide: { w: 1176, h: 661, area: { x: 100, y: 0, w: 985, h: 640 } },
    pot: { x: 487, y: 222 }, counter: { x: 705, y: 238 }, board: { x: 336, y: 226 }, standLine: 258,
    obstacles: [{ x: 100, y: 180, w: 32, h: 170 }, { x: 808, y: 228, w: 192, h: 32 }], // tonneaux de gauche, tabourets du comptoir
  },
  marche: {
    wide: { w: 1176, h: 661, area: { x: 200, y: 0, w: 800, h: 645 } },
    pot: { x: 490, y: 194 }, counter: { x: 690, y: 198 }, board: { x: 590, y: 200 }, standLine: 218,
    obstacles: [
      { x: 322, y: 560, w: 26, h: 100 }, { x: 812, y: 560, w: 26, h: 100 }, // poteaux des lanternes du bas
      { x: 375, y: 580, w: 85, h: 81 }, { x: 720, y: 625, w: 90, h: 36 }, { x: 962, y: 540, w: 38, h: 60 }, // caisses et tonneau
    ],
  },
  clairiere: {
    wide: { w: 1176, h: 661, area: { x: 120, y: 0, w: 940, h: 640 } },
    pot: { x: 425, y: 162 }, counter: { x: 655, y: 166 }, board: { x: 545, y: 170 }, standLine: 188,
    obstacles: [
      { x: 165, y: 150, w: 110, h: 28 }, { x: 978, y: 150, w: 92, h: 76 }, // troncs couchés du haut
      { x: 163, y: 550, w: 88, h: 55 }, { x: 742, y: 610, w: 93, h: 45 }, { x: 985, y: 545, w: 32, h: 35 }, // troncs et rocher du bas
    ],
  },
};
/** Définition d'un monde, avec sa version 3D si elle existe. */
export const worldDef = (id: WorldId): WorldDef => (STYLE_3D && WORLD_3D[id] ? { ...WORLDS[id], ...WORLD_3D[id] } : WORLDS[id]);

// ---------------------------------------------------------------- Boutique (cosmétiques uniquement)
export type Rarity = 'commun' | 'rare' | 'epique' | 'legendaire';
export const RARITY: Record<Rarity, { label: string; color: number; text: string }> = {
  commun: { label: 'COMMUN', color: 0x8a90a8, text: '#bfc8e0' },
  rare: { label: 'RARE', color: 0x3f8fff, text: '#7fb8ff' },
  epique: { label: 'EPIQUE', color: 0xb46bff, text: '#d0a0ff' },
  legendaire: { label: 'LEGENDAIRE', color: 0xffc533, text: '#ffd23e' },
};

/**
 * Un article s'obtient d'UNE seule façon :
 *  - `coins`  : acheté avec les pièces gagnées en jouant ;
 *  - `palier` : cadeau gratuit, débloqué quand le total de pièces gagnées depuis le début atteint ce nombre ;
 *  - `euro`   : premium, en argent réel uniquement (les plus rares).
 */
export interface ShopItem {
  id: string;
  kind: 'skin' | 'effet' | 'pack';
  rarity: Rarity;
  /** Chef concerné par le costume. */
  chef?: ChefId;
  name: string;
  desc: string;
  coins?: number;
  palier?: number;
  euro?: string;
  sprite?: string;
  color?: number;
  /** Effet qui change de couleur en continu. */
  rainbow?: boolean;
  /** Chef combattant (onglet à part dans la boutique). */
  fighter?: boolean;
  /** Arme (onglet ARMES) : un effet qui change aussi le bruit des coups, pour tous les chefs. */
  weapon?: boolean;
  /** Bruitage et couleur des coups propres à l'arme de ce costume. */
  hit?: string;
  slash?: number;
  /** Pack : identifiants de ce qu'il contient (articles, ou « monde_<id> » pour un monde). */
  items?: string[];
  /** Pack de monde : le monde qu'il débloque (pour l'aperçu). */
  world?: WorldId;
}

export const SHOP: ShopItem[] = [
  // --- costumes
  { id: 'skin_patissier', kind: 'skin', rarity: 'rare', chef: 'moustachu', name: 'CHAT\nPATISSIER', desc: 'Veste de chef et grand\nfouet de pâtissier.', palier: 40000, sprite: 'skin_patissier' },
  { id: 'skin_chevalier', kind: 'skin', rarity: 'rare', chef: 'moustachu', name: 'CHAT\nCHEVALIER', desc: 'Heaume, bouclier et\nfourchette géante.', coins: 12000, sprite: 'skin_chevalier' },
  { id: 'skin_samourai', kind: 'skin', rarity: 'epique', chef: 'moustachu', name: 'CHAT\nSAMOURAI', desc: 'Armure rouge et casque\ndoré pour Chef Moustachu.', coins: 25000, sprite: 'skin_samourai' },
  { id: 'skin_shiba_samourai', kind: 'skin', rarity: 'epique', chef: 'shiba', name: 'SHIBA\nSAMOURAI', desc: 'Armure et sabre de feu\npour Maître Shiba.', palier: 120000, sprite: 'skin_shiba_samourai' },
  { id: 'skin_cyber', kind: 'skin', rarity: 'legendaire', chef: 'moustachu', name: 'CHAT\nCYBER', desc: 'Visière néon et poêle\nélectrique.', euro: '1,99 EUR', sprite: 'skin_cyber' },
  { id: 'skin_astronaute', kind: 'skin', rarity: 'legendaire', chef: 'moustachu', name: 'CHAT\nASTRONAUTE', desc: 'Scaphandre et fouet\nlaser.', euro: '1,99 EUR', sprite: 'skin_astronaute' },
  // --- effets d'arme
  { id: 'fx_vert', kind: 'effet', rarity: 'commun', name: 'FLAMMES\nVERTES', desc: 'Tes coups laissent une\ntraînée verte.', palier: 5000, color: 0x6dff6d },
  { id: 'fx_bleu', kind: 'effet', rarity: 'commun', name: 'FLAMMES\nBLEUES', desc: 'Tes coups laissent une\ntraînée bleue.', coins: 2500, color: 0x4fb8ff },
  { id: 'fx_rose', kind: 'effet', rarity: 'commun', name: 'LAMES\nROSES', desc: 'Tes coups laissent une\ntraînée rose.', coins: 2500, color: 0xff7ad0 },
  { id: 'fx_or', kind: 'effet', rarity: 'rare', name: 'ETOILES\nDOREES', desc: 'Tes coups laissent une\ntraînée dorée.', palier: 15000, color: 0xffe27a },
  { id: 'fx_violet', kind: 'effet', rarity: 'epique', name: 'ECLAIRS\nVIOLETS', desc: 'Tes coups laissent une\ntraînée violette.', euro: '0,99 EUR', color: 0xb46bff },
  { id: 'fx_arcenciel', kind: 'effet', rarity: 'legendaire', name: 'ARC-EN-\nCIEL', desc: 'Tes coups changent de\ncouleur en continu.', palier: 300000, color: 0xff7ad0, rainbow: true },
  // --- chefs combattants (premium) : chacun a son arme, son bruit et sa couleur de coup
  { id: 'skin_taureau', kind: 'skin', fighter: true, rarity: 'legendaire', chef: 'shiba', name: 'TAUREAU\nBOUCHER', desc: 'Colosse au hachoir géant\nenflammé.', euro: '1,99 EUR', sprite: 'skin_taureau', hit: 'coup_hache', slash: 0xff5a1e },
  { id: 'skin_gorille', kind: 'skin', fighter: true, rarity: 'legendaire', chef: 'moustachu', name: 'GORILLE\nTONNERRE', desc: 'Deux poêles-gants de boxe\nchargées d\'éclairs.', euro: '1,99 EUR', sprite: 'skin_gorille', hit: 'coup_elec', slash: 0xffe84a },
  { id: 'skin_tigre', kind: 'skin', fighter: true, rarity: 'legendaire', chef: 'noisette', name: 'TIGRE\nDES WOKS', desc: 'Nunchakus de woks aux\nflammes bleues.', euro: '1,99 EUR', sprite: 'skin_tigre', hit: 'coup_wok', slash: 0x4fb8ff },
  { id: 'skin_ours', kind: 'skin', fighter: true, rarity: 'legendaire', chef: 'shiba', name: 'OURS\nGLACIER', desc: 'Marteau attendrisseur géant\ncouvert de glace.', euro: '1,99 EUR', sprite: 'skin_ours', hit: 'coup_glace', slash: 0x9fe0ff },
  // --- armes : changent la couleur ET le bruit des coups de tous les chefs. Payantes, ou beaucoup de pièces.
  { id: 'arme_foudre', kind: 'effet', weapon: true, rarity: 'epique', name: 'LAME\nFOUDRE', desc: 'Tes coups claquent comme\nla foudre.', euro: '0,99 EUR', coins: 40000, color: 0xffe84a, hit: 'coup_elec' },
  { id: 'arme_givre', kind: 'effet', weapon: true, rarity: 'epique', name: 'MARTEAU\nGIVRE', desc: 'Tes coups brisent la\nglace.', euro: '0,99 EUR', coins: 40000, color: 0x9fe0ff, hit: 'coup_glace' },
  { id: 'arme_lave', kind: 'effet', weapon: true, rarity: 'epique', name: 'HACHE\nDE LAVE', desc: 'Tes coups font trembler\nle sol.', euro: '0,99 EUR', coins: 40000, color: 0xff5a1e, hit: 'coup_hache' },
  { id: 'arme_wok', kind: 'effet', weapon: true, rarity: 'epique', name: 'WOK\nBLEU', desc: 'Tes coups crachent des\nflammes bleues.', euro: '0,99 EUR', coins: 40000, color: 0x4fb8ff, hit: 'coup_wok' },
  // --- packs : un monde + son chef combattant. Deux façons de les avoir : payer, ou énormément de pièces.
  //     Contenu connu d'avance (pas de tirage au hasard).
  { id: 'pack_glaciere', kind: 'pack', rarity: 'legendaire', world: 'glaciere', name: 'PACK\nGLACIERE', desc: 'Le monde La Glacière\net le chef Ours Glacier.', euro: '2,99 EUR', coins: 100000, sprite: 'skin_ours', items: ['monde_glaciere', 'skin_ours'] },
  { id: 'pack_volcan', kind: 'pack', rarity: 'legendaire', world: 'volcan', name: 'PACK\nVOLCAN', desc: 'Le monde Volcan Barbecue\net le chef Taureau Boucher.', euro: '2,99 EUR', coins: 150000, sprite: 'skin_taureau', items: ['monde_volcan', 'skin_taureau'] },
  { id: 'pack_pirate', kind: 'pack', rarity: 'legendaire', world: 'bateau', name: 'PACK\nPIRATE', desc: 'Le monde Galion Pirate\net le chef Gorille Tonnerre.', euro: '2,99 EUR', coins: 200000, sprite: 'skin_gorille', items: ['monde_bateau', 'skin_gorille'] },
  { id: 'pack_hante', kind: 'pack', rarity: 'legendaire', world: 'bonbons', name: 'PACK\nHANTE', desc: 'Le monde Usine Hantée\net le chef Tigre des Woks.', euro: '2,99 EUR', coins: 250000, sprite: 'skin_tigre', items: ['monde_bonbons', 'skin_tigre'] },
  { id: 'pack_armes', kind: 'pack', rarity: 'legendaire', name: 'PACK\nARMES', desc: 'Les 4 armes : Lame Foudre,\nMarteau Givre, Hache de Lave,\nWok Bleu. (3,96 EUR à l\'unité)', euro: '2,49 EUR', coins: 120000, color: 0xffe84a, rainbow: true, items: ['arme_foudre', 'arme_givre', 'arme_lave', 'arme_wok'] },
  { id: 'pack_integral', kind: 'pack', rarity: 'legendaire', name: 'PACK\nINTEGRAL', desc: 'Les 4 packs de mondes, Chat\nCyber, Chat Astronaute et\nEclairs Violets.\n(16,93 EUR à l\'unité)', euro: '12,99 EUR', sprite: 'skin_gorille', items: ['monde_glaciere', 'monde_volcan', 'monde_bateau', 'monde_bonbons', 'skin_ours', 'skin_taureau', 'skin_gorille', 'skin_tigre', 'skin_cyber', 'skin_astronaute', 'fx_violet'] },
];

/** Nom d'un article sur une seule ligne. */
export const itemLabel = (it: ShopItem): string => it.name.replace('-\n', '-').replace('\n', ' ');

/**
 * Niveau du joueur : il monte avec le total de pièces gagnées depuis le début (jamais avec les pièces dépensées).
 * Niveau 2 à 500 pièces, 3 à 1 500, 5 à 5 000, 10 à 22 500, 20 à 95 000 : chaque niveau est plus long que le précédent.
 */
const levelStart = (level: number): number => 250 * level * (level - 1);
export function playerLevel(earned: number): { level: number; into: number; span: number } {
  let level = 1;
  while (earned >= levelStart(level + 1)) level++;
  return { level, into: earned - levelStart(level), span: levelStart(level + 1) - levelStart(level) };
}

/** Cadeau du jour : pièces offertes selon le nombre de jours joués d'affilée (plafonné au 7e jour). */
export const DAILY_GIFT = [100, 150, 200, 250, 300, 400, 500];
