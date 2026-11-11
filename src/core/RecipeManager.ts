import { IngredientId, ORDER_PATIENCE, RECIPES, RecipeDef, WAVES } from './constants';

export type Inventory = Record<IngredientId, { n: number; sliced: number }>;

export interface Order {
  recipe: RecipeDef;
  state: 'open' | 'cooking' | 'ready';
  /** Multiplicateur d'or (1 à 2) selon la part d'ingrédients tranchés. */
  bonus: number;
  /** Patience restante du client (s). */
  patience: number;
}

export const emptyInventory = (): Inventory => ({
  tomate: { n: 0, sliced: 0 },
  champignon: { n: 0, sliced: 0 },
  sucre: { n: 0, sliced: 0 },
  piment: { n: 0, sliced: 0 },
});

/** Gère les commandes des clients affichées en haut de l'écran. */
export class RecipeManager {
  orders: Order[] = [];
  onChange: () => void = () => {};

  constructor(private slots = 2) {
    this.refill(0);
  }

  /** Complète les commandes ouvertes avec des recettes réalisables à cette vague. */
  refill(wave: number): void {
    const unlocked = WAVES[Math.min(wave, WAVES.length - 1)].unlocks;
    const pool = RECIPES.filter((r) => (Object.keys(r.needs) as IngredientId[]).every((i) => unlocked.includes(i)));
    while (this.orders.length < this.slots) {
      const taken = this.orders.map((o) => o.recipe.id);
      const choices = pool.filter((r) => !taken.includes(r.id));
      const list = choices.length ? choices : pool;
      this.orders.push({ recipe: list[Math.floor(Math.random() * list.length)], state: 'open', bonus: 1, patience: ORDER_PATIENCE });
    }
    this.onChange();
  }

  /** Première commande ouverte que l'inventaire permet de cuisiner. */
  findCookable(inv: Inventory): Order | null {
    return (
      this.orders.find(
        (o) => o.state === 'open' && (Object.entries(o.recipe.needs) as [IngredientId, number][]).every(([i, n]) => inv[i].n >= n),
      ) ?? null
    );
  }

  /** Retire les ingrédients de l'inventaire (tranchés d'abord) et renvoie la part tranchée (0..1). */
  consume(order: Order, inv: Inventory): number {
    let total = 0;
    let sliced = 0;
    for (const [i, n] of Object.entries(order.recipe.needs) as [IngredientId, number][]) {
      const s = Math.min(n, inv[i].sliced);
      inv[i].sliced -= s;
      inv[i].n -= n;
      total += n;
      sliced += s;
    }
    order.state = 'cooking';
    order.bonus = 1 + sliced / total;
    this.onChange();
    return sliced / total;
  }

  /** Fait baisser la patience des clients ; renvoie le nombre de clients partis. */
  tick(dt: number, wave: number): number {
    let gone = 0;
    for (const o of this.orders) {
      if (o.state !== 'open') continue;
      o.patience -= dt;
      if (o.patience <= 0) gone++;
    }
    if (gone) {
      this.orders = this.orders.filter((o) => o.state !== 'open' || o.patience > 0);
      this.refill(wave);
    }
    return gone;
  }

  serve(order: Order, wave: number): void {
    this.orders = this.orders.filter((o) => o !== order);
    this.refill(wave);
  }
}
