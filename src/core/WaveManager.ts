import { ENEMIES, EnemyId, H, W, WAVES, WorldDef } from './constants';
import { GameManager } from './GameManager';

export type SpawnFn = (type: EnemyId, x: number, y: number) => void;

/** Fait apparaître les monstres pendant la phase de récolte, puis le boss. */
export class WaveManager {
  private acc = 0;
  private bossSpawned = false;

  constructor(private gm: GameManager, private world: WorldDef, private spawn: SpawnFn) {}

  update(dt: number): void {
    if (this.gm.phase === 'boss') {
      if (!this.bossSpawned) {
        this.bossSpawned = true;
        this.spawn('roi_tomate', W / 2, H + 50);
      }
      return;
    }
    if (this.gm.phase !== 'harvest') return;
    const wave = WAVES[this.gm.wave];
    this.acc += dt;
    if (this.acc < wave.interval) return;
    this.acc = 0;

    const type = this.pick(wave.pool);
    const [x, y] = this.spawnPoint();
    for (let i = 0; i < ENEMIES[type].group; i++) {
      this.spawn(type, x + (i - (ENEMIES[type].group - 1) / 2) * 16, y + i * 10);
    }
  }

  private pick(pool: Partial<Record<EnemyId, number>>): EnemyId {
    const entries = Object.entries(pool) as [EnemyId, number][];
    let r = Math.random() * entries.reduce((s, [, w]) => s + w, 0);
    for (const [id, w] of entries) {
      r -= w;
      if (r <= 0) return id;
    }
    return entries[0][0];
  }

  private spawnPoint(): [number, number] {
    // Monde 2 : ruelle étroite, les monstres arrivent en file par le bas.
    if (this.world.mechanic === 'file') return [130 + Math.random() * 100, H + 16];
    const side = Math.random();
    if (side < 0.6) return [24 + Math.random() * (W - 48), H + 16];
    const y = this.world.standLine + 90 + Math.random() * (H - this.world.standLine - 110);
    return [side < 0.8 ? -16 : W + 16, y];
  }
}
