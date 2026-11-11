import Phaser from 'phaser';
import { audio } from '../audio/AudioManager';
import {
  BOSS_REWARD, ChefId, CHEFS, CHOP_TIME, COMBO_GOLD, COMBO_SIZE, CONVEYORS, EnemyId, GameMode, H, IngredientId, INGREDIENTS, ORDER_PATIENCE,
  POWER_LABEL, POWER_TIME, SHOP, Sabotage, SABOTAGE_LABEL, SABOTAGES, TIP_BONUS, UpgradeDef, W, WAVES, WORLD_ORDER, WorldDef, WorldId, WORLDS,
} from '../core/constants';
import { GameManager, Phase } from '../core/GameManager';
import { RecipeManager } from '../core/RecipeManager';
import { WaveManager } from '../core/WaveManager';
import { Chef } from '../entities/Chef';
import { CookingPot } from '../entities/CookingPot';
import { Enemy, EnemyApi } from '../entities/Enemy';
import { Ingredient } from '../entities/Ingredient';
import { TouchController } from '../input/TouchController';
import { Hud } from '../ui/Hud';
import { button, txt } from '../ui/text';
import { UpgradeCards } from '../ui/UpgradeCards';
import { clearRun, loadProfile, RunSave, saveProfile, saveRun } from '../core/Storage';
import { BotLink, DuelLink } from '../network/DuelLink';
import { openModal } from '../ui/Modal';

interface Shot {
  img: Phaser.GameObjects.Image;
  vx: number;
  vy: number;
  life: number;
}
interface Barrel {
  img: Phaser.GameObjects.Image;
  x: number;
  y: number;
}

export interface GameData {
  chef?: ChefId;
  world?: WorldId;
  mode?: GameMode;
  /** Partie sauvegardée à reprendre. */
  resume?: RunSave | null;
  /** Lien avec le rival (duel). */
  link?: DuelLink | null;
}

/** Boucle solo : récolte -> cuisine -> cartes, puis boss. */
export class GameScene extends Phaser.Scene {
  private gm!: GameManager;
  private waves!: WaveManager;
  private recipes!: RecipeManager;
  private world!: WorldDef;
  private chef!: Chef;
  private pot!: CookingPot;
  private touch!: TouchController;
  private hud!: Hud;
  private cards!: UpgradeCards;
  private bounds!: Phaser.Geom.Rectangle;
  private fx!: Phaser.GameObjects.Graphics;
  private counterHint!: Phaser.GameObjects.Text;

  private enemies: Enemy[] = [];
  private ingredients: Ingredient[] = [];
  private shots: Shot[] = [];
  private barrels: Barrel[] = [];
  private knives: Phaser.GameObjects.Image[] = [];
  private turret: Phaser.GameObjects.Image | null = null;
  private conveyors: Phaser.GameObjects.TileSprite[] = [];

  private chefId: ChefId = 'moustachu';
  private worldId: WorldId = 'clairiere';
  private tick = { aura: 0, regen: 0, tornado: 0, turret: 0, barrel: 6 };
  private dashing = false;
  private mode: GameMode = 'solo';
  private resume: RunSave | null = null;
  private link: DuelLink | null = null;
  private paused = false;
  private inverseT = 0;
  private smokeT = 0;
  private smoke: Phaser.GameObjects.Image[] = [];
  private chopT = 0;
  private scoreT = 0;
  private rivalGold = 0;
  private rivalOut: 'ko' | 'left' | null = null;
  private unlockedWorld = false;
  private effectColor: number | null = null;

  constructor() {
    super('Game');
  }

  init(data: GameData): void {
    this.chefId = data.chef ?? 'moustachu';
    this.worldId = data.world ?? 'clairiere';
    this.mode = data.mode ?? 'solo';
    this.resume = data.resume ?? null;
    this.link = data.link ?? null;
  }

  create(): void {
    this.enemies = [];
    this.ingredients = [];
    this.shots = [];
    this.barrels = [];
    this.knives = [];
    this.turret = null;
    this.conveyors = [];
    this.smoke = [];
    this.paused = false;
    this.inverseT = this.smokeT = this.chopT = this.scoreT = this.rivalGold = 0;
    this.rivalOut = null;
    this.unlockedWorld = false;
    this.dashing = false;
    this.tick = { aura: 0, regen: 0, tornado: 0, turret: 0, barrel: 6 };

    this.world = WORLDS[this.worldId];
    const { pot, counter, standLine } = this.world;
    this.add.image(0, 0, 'map_' + this.worldId).setOrigin(0).setDepth(-100);
    if (this.world.mechanic === 'tapis') {
      for (const c of CONVEYORS) {
        this.add.rectangle(0, c.y, W, c.h, 0x4ff3ff, 0.12).setOrigin(0).setDepth(-50);
        this.conveyors.push(this.add.tileSprite(0, c.y + c.h / 2, W, 12, 'fleche_tapis').setOrigin(0, 0.5).setAlpha(0.5).setDepth(-49));
      }
    }

    this.gm = new GameManager(this.mode);
    this.recipes = new RecipeManager();
    if (this.resume) {
      this.gm.restore(this.resume);
      this.recipes.orders = [];
      this.recipes.refill(this.gm.wave);
    }
    const board = this.world.board;
    this.add.image(board.x, board.y, 'planche').setOrigin(0.5, 1).setDepth(board.y - 12);
    txt(this, board.x, board.y + 4, 'PLANCHE', 8, '#ffe9b0').setOrigin(0.5, 0).setDepth(-10);
    this.pot = new CookingPot(this, pot.x, pot.y);
    this.add.image(counter.x, counter.y, 'comptoir').setOrigin(0.5, 1).setDepth(counter.y);
    txt(this, pot.x, pot.y + 4, 'MARMITE', 8, '#ffe9b0').setOrigin(0.5, 0).setDepth(-10);
    txt(this, counter.x, counter.y + 4, 'SERVICE', 8, '#ffe9b0').setOrigin(0.5, 0).setDepth(-10);
    this.counterHint = txt(this, counter.x, counter.y - 40, 'ICI !', 8, '#ffe27a').setOrigin(0.5).setDepth(1500).setVisible(false);

    const profile = loadProfile();
    const skin = profile.skins[this.chefId] ?? null;
    this.effectColor = SHOP.find((i) => i.id === profile.effect)?.color ?? null;
    this.chef = new Chef(this, CHEFS[this.chefId], W / 2, standLine + 100, skin && profile.owned.includes(skin) ? skin : null);
    if (this.resume) {
      const r = this.resume;
      this.chef.maxHp = r.maxHp;
      this.chef.hp = Math.max(1, r.hp);
      this.chef.ult = r.ult;
      for (const i of INGREDIENTS) this.chef.inv[i] = { ...r.inv[i] };
    }
    this.bounds = new Phaser.Geom.Rectangle(16, pot.y - 4, W - 32, H - 12 - (pot.y - 4));
    this.fx = this.add.graphics().setDepth(1800);

    this.hud = new Hud(this, this.gm, this.chef, this.recipes, () => this.ultimate(), () => this.pause());
    this.cards = new UpgradeCards(this);
    this.touch = new TouchController(this, (x, y) => this.hud.isUi(x, y));
    this.touch.onSlice = (x1, y1, x2, y2) => this.slice(x1, y1, x2, y2);
    this.input.keyboard?.on('keydown-SPACE', () => this.ultimate());

    this.waves = new WaveManager(this.gm, this.world, (t, x, y) => this.spawnEnemy(t, x, y));
    this.gm.on('phase', (p: Phase) => this.onPhase(p));
    this.input.keyboard?.on('keydown-M', () => audio.toggleMute());
    this.input.keyboard?.on('keydown-ESC', () => this.pause());
    this.input.keyboard?.on('keydown-P', () => this.pause());
    // mise en pause automatique quand l'appli passe en arrière-plan ou sur le bouton Retour
    const autoPause = () => this.pause();
    this.game.events.on('app-pause', autoPause);
    this.events.once('shutdown', () => {
      this.game.events.off('app-pause', autoPause);
      this.link?.close();
    });

    audio.sfx('vague');
    if (this.mode === 'duel') {
      this.setupDuel();
      this.hud.banner('DUEL !\n2 MINUTES', '#ff6a5a');
      audio.music('cuisine');
    } else if (this.gm.phase === 'boss') {
      this.hud.banner('LE ROI TOMATE\nARRIVE !', '#ff6a5a');
      audio.music('boss');
    } else {
      this.hud.banner(`VAGUE ${this.gm.wave + 1}\nA LA CHASSE !`);
      audio.music('chasse');
    }
    this.autosave();
  }

  // ------------------------------------------------------------------ boucle
  update(time: number, delta: number): void {
    const dt = Math.min(delta, 50) / 1000;
    this.touch.update(dt);
    const { gm, chef } = this;
    // en duel en ligne le temps ne s'arrête pas : le menu pause s'affiche par-dessus
    if (gm.phase === 'cards' || gm.phase === 'over' || (this.paused && !this.link?.online)) {
      this.hud.refresh(time);
      return;
    }
    gm.update(dt);
    if (this.recipes.tick(dt, gm.wave) > 0) {
      gm.combo = 0;
      this.hud.float(W / 2, 96, 'CLIENT PARTI ! COMBO PERDU', '#ff6a5a');
      audio.sfx('parti');
    }
    this.updateDuel(dt, time);
    this.waves.update(dt);

    this.updateChef(dt);
    this.autoAttack(dt);
    this.updateUltimate(dt);
    this.updateEnemies(dt);
    this.updateShots(dt);
    this.updateIngredients(dt, time);
    this.updateKitchen(dt);
    this.updateGadgets(dt, time);

    this.enemies = this.enemies.filter((e) => !e.dead);
    chef.updateVisual(dt, time);
    const wasCooking = this.pot.state === 'cooking';
    this.pot.update(dt, time);
    if (wasCooking && this.pot.state === 'ready') {
      this.recipes.onChange();
      this.hud.float(this.pot.x, this.pot.y - 60, 'PRET !', '#7dff7d');
      audio.sfx('pret');
    }
    this.drawAuras(time);
    this.hud.refresh(time);
    for (const c of this.conveyors) c.tilePositionX -= 60 * dt;

    if ((gm.phase as Phase) !== 'over' && (chef.hp <= 0 || gm.standHp <= 0)) {
      if (this.mode === 'duel') this.duelKo();
      else gm.end(false);
    }
  }

  private updateChef(dt: number): void {
    const { chef, gm } = this;
    const onBelt = this.world.mechanic === 'tapis' && CONVEYORS.some((c) => chef.y >= c.y && chef.y <= c.y + c.h);
    const speed = chef.def.speed * (1 + 0.15 * gm.level('bottes')) * (chef.powers.vitesse > 0 ? 1.35 : 1) * (onBelt ? 1.6 : 1);
    const dir = this.inverseT > 0 ? this.touch.dir.clone().negate() : this.touch.dir;
    if (!this.dashing) chef.move(dir, speed, dt, this.bounds);

    for (const p of Object.keys(chef.powers) as (keyof typeof chef.powers)[]) chef.powers[p] = Math.max(0, chef.powers[p] - dt);
    if (chef.powers.regen > 0) {
      this.tick.regen += dt;
      if (this.tick.regen >= 3) {
        this.tick.regen = 0;
        chef.heal(1);
        this.hud.float(chef.x, chef.y - 50, '+1', '#7dff7d');
        audio.sfx('soin');
      }
    }
    if (chef.powers.bouclier > 0) {
      this.tick.aura += dt;
      if (this.tick.aura >= 0.4) {
        this.tick.aura = 0;
        for (const e of this.enemies) if (!e.dead && this.dist(e, chef) < 44 + e.radius) this.damage(e, 8);
      }
    }
  }

  private autoAttack(dt: number): void {
    const c = this.chef;
    // A l'arrêt le chef frappe à pleine cadence ; en mouvement il esquive et frappe deux fois moins vite.
    c.cooldown -= dt * (c.moving ? 0.5 : 1);
    if (c.cooldown > 0 || this.dashing) return;
    let target: Enemy | null = null;
    let best = c.def.range;
    for (const e of this.enemies) {
      const d = this.dist(e, c) - e.radius;
      if (!e.dead && d < best) {
        best = d;
        target = e;
      }
    }
    if (!target) return;
    c.cooldown = c.def.cooldown;
    c.strike(target.x, target.y);
    audio.sfx(c.def.id === 'moustachu' ? 'coup_poele' : c.def.id === 'shiba' ? 'coup_rouleau' : 'coup_hachoir');
    const dmg = this.attackDamage();
    const ang = Math.atan2(target.y - c.y, target.x - c.x);
    const tx = target.x;
    const ty = target.y;
    const color = c.powers.feu > 0 ? 0xff3b1e : (this.effectColor ?? c.def.slashColor);

    if (c.def.id === 'moustachu') {
      // arc de feu devant le chef
      for (const e of [...this.enemies]) {
        const d = this.dist(e, c) - e.radius;
        const diff = Math.abs(Phaser.Math.Angle.Wrap(Math.atan2(e.y - c.y, e.x - c.x) - ang));
        if (!e.dead && d < c.def.range + 8 && diff < 1.2) this.damage(e, dmg);
      }
      this.arcFx(c.x, c.y - 16, ang, c.def.range, color);
    } else {
      // frappe lourde (zone large) ou hachoirs rapides (zone étroite)
      const zone = c.def.id === 'shiba' ? 38 : 20;
      for (const e of [...this.enemies]) {
        if (!e.dead && Math.hypot(e.x - tx, e.y - ty) < zone + e.radius) this.damage(e, dmg);
      }
      if (c.def.id === 'shiba') this.ringFx(tx, ty - 6, zone, color);
      else this.arcFx(c.x, c.y - 16, ang + (Math.random() - 0.5), c.def.range, color, 0.7);
    }
  }

  private attackDamage(): number {
    return this.chef.def.damage * (1 + 0.25 * this.gm.level('degats')) * (this.chef.powers.feu > 0 ? 1.5 : 1);
  }

  // ------------------------------------------------------------------ ultimes
  private ultimate(): void {
    const { chef, gm } = this;
    if (chef.ult < 100 || gm.phase === 'cards' || gm.phase === 'over' || this.dashing) return;
    chef.ult = 0;
    this.hud.banner(chef.def.ultimateName, '#ff8a1e', 420);
    this.cameras.main.flash(150, 255, 200, 120);
    audio.sfx('ultime');

    if (chef.def.ultimate === 'tornade') {
      chef.ultActive = 3;
      this.tick.tornado = 0;
    } else if (chef.def.ultimate === 'onde') {
      this.cameras.main.shake(350, 0.012);
      audio.sfx('choc');
      this.ringFx(chef.x, chef.y, 300, 0xe8c48a, 500);
      for (const e of [...this.enemies]) {
        if (e.dead) continue;
        e.stun = 3;
        this.damage(e, 40);
      }
    } else {
      // Danse des Lames : dash qui traverse et découpe ennemis et ingrédients
      const dir = this.touch.dir.lengthSq() > 0.01 ? this.touch.dir.clone().normalize() : new Phaser.Math.Vector2(chef.facing, 0);
      const x2 = Phaser.Math.Clamp(chef.x + dir.x * 220, this.bounds.left, this.bounds.right);
      const y2 = Phaser.Math.Clamp(chef.y + dir.y * 220, this.bounds.top, this.bounds.bottom);
      const line = new Phaser.Geom.Line(chef.x, chef.y, x2, y2);
      for (const e of [...this.enemies]) {
        if (!e.dead && this.distToLine(line, e.x, e.y) < 30 + e.radius) this.damage(e, 50);
      }
      for (const i of this.ingredients) i.trySlice(line.x1, line.y1, line.x2, line.y2, 34);
      const trail = this.add.graphics().setDepth(1700);
      trail.lineStyle(10, 0xdff4ff, 0.8).strokeLineShape(line);
      this.tweens.add({ targets: trail, alpha: 0, duration: 350, onComplete: () => trail.destroy() });
      this.dashing = true;
      chef.invuln = 0.6;
      this.tweens.add({ targets: chef, x: x2, y: y2, duration: 160, ease: 'Cubic.out', onComplete: () => (this.dashing = false) });
    }
  }

  private updateUltimate(dt: number): void {
    const chef = this.chef;
    if (chef.ultActive <= 0) return;
    chef.ultActive -= dt;
    this.tick.tornado -= dt;
    if (this.tick.tornado <= 0) {
      this.tick.tornado = 0.25;
      for (const e of [...this.enemies]) if (!e.dead && this.dist(e, chef) < 84 + e.radius) this.damage(e, 12);
    }
  }

  // ------------------------------------------------------------------ ennemis
  private spawnEnemy(type: EnemyId, x: number, y: number, mini = false): void {
    const hpMul = type === 'roi_tomate' ? 1 : 1 + 0.25 * Math.min(this.gm.wave, WAVES.length);
    this.enemies.push(new Enemy(this, type, x, y, hpMul, mini));
  }

  private updateEnemies(dt: number): void {
    const { chef, gm } = this;
    const api: EnemyApi = {
      chefX: chef.x,
      chefY: chef.y,
      standLine: this.world.standLine,
      shoot: (x, y, tx, ty) => this.shoot(x, y, tx, ty),
      summon: (x, y) => {
        for (let i = 0; i < 3; i++) this.spawnEnemy('tomate', x - 50 + i * 50, y + 20);
        this.hud.float(x, y - 90, 'A MOI, MES SBIRES !', '#ff6a5a');
        audio.sfx('rugissement');
      },
      shake: () => {
        this.cameras.main.shake(300, 0.012);
        audio.sfx('choc');
      },
    };
    for (const e of this.enemies) if (!e.dead) e.update(dt, api);
    for (let i = 0; i < this.enemies.length; i++) {
      for (let j = i + 1; j < this.enemies.length; j++) this.enemies[i].separate(this.enemies[j]);
    }
    for (const e of this.enemies) {
      if (e.dead || e.stun > 0) continue;
      if (this.dist(e, chef) < e.radius + 9) this.hurtChef(e.def.damage);
      // les Champi-Boucliers (et le boss) arrivés à la ligne du stand le démolissent
      if (e.atStand && (e.def.ai === 'stand' || e.def.ai === 'boss')) {
        e.standAtk -= dt;
        if (e.standAtk <= 0) {
          e.standAtk = 3;
          gm.damageStand(e.def.damage);
          this.hud.float(e.x, this.world.standLine - 10, 'STAND -' + e.def.damage, '#ff6a5a');
          this.cameras.main.shake(80, 0.004);
          audio.sfx('stand');
        }
      }
    }
  }

  private hurtChef(n: number): void {
    if (this.chef.powers.bouclier > 0 || this.chef.ultActive > 0 || this.dashing) return;
    if (this.chef.hurt(n)) {
      this.cameras.main.shake(120, 0.008);
      audio.sfx('aie');
      this.cameras.main.flash(100, 255, 60, 60);
    }
  }

  private damage(e: Enemy, dmg: number): void {
    if (e.dead) return;
    e.hit(dmg);
    audio.sfx('touche');
    if (e.hp <= 0) this.kill(e);
  }

  private kill(e: Enemy): void {
    e.dead = true;
    this.gm.kills++;
    audio.sfx(e.def.ai === 'boss' ? 'explosion' : 'pop');
    this.chef.addUlt(5);
    this.puff(e.x, e.y - e.radius, e.def.id === 'gelee' ? 0x6fe04a : e.def.id === 'champi' ? 0xc9a070 : 0xe8483a, e.def.ai === 'boss' ? 30 : 7);
    if (e.def.ai === 'boss' && (e.mini || this.mode === 'duel')) {
      // mini Roi Tomate envoyé par le rival
      this.gm.gold += 100;
      this.hud.float(e.x, e.y - 40, 'SABOTAGE REPOUSSE +100');
      e.destroy(true);
      return;
    }
    if (e.def.ai === 'boss') {
      e.destroy();
      this.gm.gold += BOSS_REWARD;
      this.hud.float(e.x, e.y - 60, `TOMATE ROYALE +${BOSS_REWARD}`);
      this.cameras.main.shake(600, 0.015);
      this.time.delayedCall(900, () => this.gm.end(true));
      return;
    }
    if (e.def.id === 'gelee' && !e.mini) {
      // se divise en deux petites gelées, qui lâchent le sucre
      this.spawnEnemy('gelee', e.x - 8, e.y, true);
      this.spawnEnemy('gelee', e.x + 8, e.y, true);
    } else if (e.def.drop) this.drop(e.def.drop, e.x, e.y);
    e.destroy(true);
  }

  private drop(type: IngredientId, x: number, y: number): void {
    const b = this.bounds;
    this.ingredients.push(
      new Ingredient(this, type, Phaser.Math.Clamp(x, b.left, b.right), Phaser.Math.Clamp(y, this.world.standLine + 6, b.bottom)),
    );
  }

  private shoot(x: number, y: number, tx: number, ty: number): void {
    const d = Math.hypot(tx - x, ty - y) || 1;
    audio.sfx('feu');
    this.shots.push({ img: this.add.image(x, y, 'boule_feu').setDepth(1600), vx: ((tx - x) / d) * 95, vy: ((ty - y) / d) * 95, life: 5 });
  }

  private updateShots(dt: number): void {
    for (const s of this.shots) {
      s.life -= dt;
      s.img.x += s.vx * dt;
      s.img.y += s.vy * dt;
      if (Math.hypot(s.img.x - this.chef.x, s.img.y - (this.chef.y - 14)) < 13) {
        this.hurtChef(1);
        s.life = 0;
      }
      if (s.life <= 0) s.img.destroy();
    }
    this.shots = this.shots.filter((s) => s.life > 0);
  }

  // ------------------------------------------------------------------ ingrédients & cuisine
  private slice(x1: number, y1: number, x2: number, y2: number): void {
    if (this.gm.phase === 'cards' || this.gm.phase === 'over') return;
    for (const i of this.ingredients) {
      if (i.trySlice(x1, y1, x2, y2)) {
        this.hud.float(i.x, i.y - 16, 'TRANCHE ! x2', '#8fe0ff');
        audio.sfx('tranche');
      }
    }
  }

  private updateIngredients(dt: number, time: number): void {
    const radius = 30 + 34 * this.gm.level('aimant');
    for (const i of this.ingredients) {
      i.update(dt, this.chef.x, this.chef.y, radius, time);
      if (i.collected) {
        audio.sfx('ramasse');
        this.chef.inv[i.type].n++;
        if (i.sliced) this.chef.inv[i.type].sliced++;
      }
      if (i.collected || i.expired) i.destroy();
    }
    this.ingredients = this.ingredients.filter((i) => !i.collected && !i.expired);
  }

  private updateKitchen(dt: number): void {
    const { chef, pot, recipes, gm } = this;
    // planche à découper : à l'arrêt devant elle, le chef tranche ce qu'il porte
    const b = this.world.board;
    const raw = INGREDIENTS.find((i) => chef.inv[i].n > chef.inv[i].sliced);
    chef.chopping = !chef.moving && raw !== undefined && Math.hypot(chef.x - b.x, chef.y - b.y) < 30;
    if (chef.chopping && raw) {
      chef.facing = b.x >= chef.x ? 1 : -1;
      this.chopT += dt;
      if (this.chopT >= CHOP_TIME) {
        this.chopT = 0;
        chef.inv[raw].sliced++;
        audio.sfx('hache');
        this.puff(b.x, b.y - 14, 0xffe9b0, 3);
      }
    } else this.chopT = 0;

    const nearPot = Math.hypot(chef.x - pot.x, chef.y - pot.y) < 36;
    if (nearPot && pot.state === 'idle') {
      const order = recipes.findCookable(chef.inv);
      if (order) {
        const sliced = recipes.consume(order, chef.inv);
        pot.start(order, sliced, Math.pow(0.75, gm.level('fourneaux')));
        this.hud.float(pot.x, pot.y - 60, sliced > 0 ? 'CUISSON EXPRESS !' : 'A LA MARMITE !', '#ffe27a');
        audio.sfx('marmite');
      }
    } else if (nearPot && pot.state === 'ready' && !chef.dish) {
      chef.dish = pot.take();
      audio.sfx('plat');
    }

    const c = this.world.counter;
    this.counterHint.setVisible(chef.dish !== null).setY(c.y - 40 + Math.sin(this.time.now / 150) * 3);
    if (chef.dish && Math.hypot(chef.x - c.x, chef.y - c.y) < 38) {
      const order = chef.dish;
      chef.dish = null;
      const tip = order.patience > ORDER_PATIENCE / 2;
      const gold = Math.round(order.recipe.gold * order.bonus * (tip ? 1 + TIP_BONUS : 1));
      gm.gold += gold;
      if (tip) this.hud.float(c.x, c.y - 72, 'POURBOIRE !', '#7dff7d');
      if (gm.serve()) {
        gm.gold += COMBO_GOLD;
        this.hud.banner(`COMBO x${COMBO_SIZE} !\n+${COMBO_GOLD} OR`, '#ffc533', 250);
        if (this.link) {
          const kind = SABOTAGES[Math.floor(Math.random() * SABOTAGES.length)];
          this.link.sendSabotage(kind);
          this.hud.float(W / 2, 110, `SABOTAGE ENVOYE : ${SABOTAGE_LABEL[kind]}`, '#ff9d8a');
        }
      }
      chef.powers[order.recipe.power] = POWER_TIME;
      chef.addUlt(20);
      recipes.serve(order, gm.wave);
      this.hud.float(c.x, c.y - 44, `+${gold} OR`);
      audio.sfx('piece');
      this.time.delayedCall(260, () => audio.sfx('pouvoir'));
      this.hud.float(c.x, c.y - 58, `POUVOIR : ${POWER_LABEL[order.recipe.power]}`, '#8fe0ff');
      this.puff(c.x, c.y - 20, 0xffd23e, 8);
    }
  }

  // ------------------------------------------------------------------ améliorations & mécaniques de monde
  private updateGadgets(dt: number, time: number): void {
    const { gm, chef } = this;
    // couteaux volants
    const n = gm.level('couteaux');
    while (this.knives.length < n) this.knives.push(this.add.image(0, 0, 'couteau'));
    this.knives.forEach((k, i) => {
      const a = time / 330 + (i * Math.PI * 2) / n;
      k.setPosition(chef.x + Math.cos(a) * 46, chef.y - 16 + Math.sin(a) * 46).setRotation(a + Math.PI).setDepth(k.y + 16);
      for (const e of this.enemies) {
        if (!e.dead && e.knifeCd <= 0 && Math.hypot(e.x - k.x, e.y - e.radius - k.y) < e.radius + 9) {
          e.knifeCd = 0.4;
          this.damage(e, 8);
        }
      }
    });

    // tourelle devant le stand
    const lvl = gm.level('tourelle');
    if (lvl > 0) {
      const ty = this.world.standLine - 2;
      if (!this.turret) this.turret = this.add.image(W / 2, ty, 'tourelle').setOrigin(0.5, 1).setDepth(ty);
      this.tick.turret -= dt;
      if (this.tick.turret <= 0) {
        let target: Enemy | null = null;
        let best = 240;
        for (const e of this.enemies) {
          const d = Math.hypot(e.x - W / 2, e.y - ty);
          if (!e.dead && d < best) {
            best = d;
            target = e;
          }
        }
        if (target) {
          this.tick.turret = 1.5 - 0.3 * lvl;
          const beam = this.add.graphics().setDepth(1700);
          beam.lineStyle(2, 0xff5a3c).lineBetween(W / 2, ty - 16, target.x, target.y - target.radius);
          this.tweens.add({ targets: beam, alpha: 0, duration: 140, onComplete: () => beam.destroy() });
          this.damage(target, 10);
          audio.sfx('laser');
        }
      }
    }

    // tonneaux explosifs (monde 3)
    if (this.world.mechanic === 'tonneaux') {
      this.tick.barrel -= dt;
      if (this.tick.barrel <= 0 && this.barrels.length < 3) {
        this.tick.barrel = 9;
        const x = 40 + Math.random() * (W - 80);
        const y = this.world.standLine + 60 + Math.random() * (H - this.world.standLine - 130);
        this.barrels.push({ x, y, img: this.add.image(x, y, 'tonneau').setOrigin(0.5, 1).setDepth(y) });
      }
      for (const b of this.barrels) {
        if (!this.enemies.some((e) => !e.dead && Math.hypot(e.x - b.x, e.y - b.y) < e.radius + 9)) continue;
        b.img.destroy();
        b.x = -999;
        this.ringFx(b.img.x, b.img.y - 10, 66, 0xff8a1e, 300);
        this.cameras.main.shake(150, 0.008);
        audio.sfx('explosion');
        for (const e of [...this.enemies]) {
          if (!e.dead && Math.hypot(e.x - b.img.x, e.y - b.img.y) < 66 + e.radius) this.damage(e, 45);
        }
      }
      this.barrels = this.barrels.filter((b) => b.x !== -999);
    }
  }

  // ------------------------------------------------------------------ phases
  private onPhase(p: Phase): void {
    if (p === 'kitchen') {
      audio.music('cuisine');
      audio.sfx('cloche');
    } else if (p === 'harvest') {
      audio.music('chasse');
      audio.sfx('vague');
    } else if (p === 'boss') {
      audio.music('boss');
      audio.sfx('rugissement');
    }
    if (p === 'harvest' || p === 'boss') this.autosave();
    if (p === 'kitchen') this.hud.banner('COUP DE FEU !\nEN CUISINE !', '#ffe27a');
    else if (p === 'harvest') this.hud.banner(`VAGUE ${this.gm.wave + 1}\nA LA CHASSE !`);
    else if (p === 'boss') {
      this.hud.banner('LE ROI TOMATE\nARRIVE !', '#ff6a5a');
      this.cameras.main.shake(500, 0.008);
    } else if (p === 'cards') {
      this.touch.setEnabled(false);
      this.cards.show(this.gm.drawCards(), (u) => this.gm.level(u.id), (u) => this.applyUpgrade(u));
    } else if (p === 'over') this.showEnd();
  }

  private applyUpgrade(u: UpgradeDef): void {
    this.gm.addUpgrade(u.id);
    if (u.id === 'coeur') {
      this.chef.maxHp += 2;
      this.chef.heal(2);
    } else if (u.id === 'reparation') this.gm.repairStand(4);
    this.touch.setEnabled(true);
    this.gm.nextWave();
  }

  private showEnd(): void {
    const { gm } = this;
    this.touch.setEnabled(false);
    audio.music(null);
    const duel = this.mode === 'duel';
    const draw = duel && !this.rivalOut && gm.victory === false && gm.gold === this.rivalGold && this.chef.hp > 0 && gm.standHp > 0;
    audio.sfx(gm.victory ? 'victoire' : 'defaite');
    const profile = loadProfile();
    saveProfile({ coins: profile.coins + gm.gold }); // l'or de la partie devient des pièces de boutique
    const lines: string[] = [];
    let title: string;
    if (duel) {
      title = gm.victory ? 'DUEL\nGAGNE !' : draw ? 'EGALITE !' : 'DUEL\nPERDU...';
      if (gm.victory) saveProfile({ duelWins: profile.duelWins + 1 });
      if (this.rivalOut) lines.push(this.rivalOut === 'ko' ? 'TON RIVAL EST K.O. !' : 'TON RIVAL A QUITTE');
      else if (this.chef.hp <= 0 || gm.standHp <= 0) lines.push(this.chef.hp <= 0 ? 'TON CHEF EST K.O.' : 'TON STAND EST DETRUIT');
      lines.push(`TOI : ${gm.gold} OR`, `${this.link?.rivalName ?? 'RIVAL'} : ${this.rivalGold} OR`, `PLATS SERVIS : ${gm.served}`);
    } else {
      clearRun();
      title = gm.victory ? 'SERVICE\nREUSSI !' : gm.standHp <= 0 ? 'STAND\nDETRUIT...' : 'CHEF\nK.O. ...';
      const record = gm.gold > profile.best;
      if (record) saveProfile({ best: gm.gold });
      const next = WORLD_ORDER.indexOf(this.worldId) + 2;
      if (gm.victory && next > profile.unlocked && next <= WORLD_ORDER.length) {
        saveProfile({ unlocked: next });
        this.unlockedWorld = true;
      }
      lines.push(`OR GAGNE : ${gm.gold}`, `PLATS SERVIS : ${gm.served}`, `MONSTRES VAINCUS : ${gm.kills}`, record ? 'NOUVEAU RECORD !' : `RECORD : ${profile.best}`);
      if (this.unlockedWorld) lines.push('NOUVEAU MONDE DEBLOQUE !');
    }
    lines.push(`+${gm.gold} PIECES POUR LA BOUTIQUE`);
    const D = 3000;
    this.add.rectangle(0, 0, W, H, 0x0c0c18, 0.8).setOrigin(0).setDepth(D).setInteractive();
    txt(this, W / 2, 150, title, 16, gm.victory ? '#ffc533' : '#ff6a5a').setOrigin(0.5).setDepth(D + 1);
    txt(this, W / 2, 280, lines.join('\n\n'), 8).setOrigin(0.5).setDepth(D + 1);
    const again = duel && this.link?.online ? null : duel ? 'REVANCHE' : 'REJOUER';
    if (again) {
      button(this, W / 2, 400, 160, 36, again, 0xe8642a, () =>
        this.scene.restart({ chef: this.chefId, world: this.worldId, mode: this.mode, link: duel ? new BotLink() : null }),
      ).setDepth(D + 1);
    }
    button(this, W / 2, again ? 446 : 400, 160, 30, 'MENU', 0x4a4f66, () => this.scene.start('Menu')).setDepth(D + 1);
  }

  // ------------------------------------------------------------------ pause & sauvegarde
  private snapshot(): RunSave {
    const { gm, chef } = this;
    return {
      v: 1, chef: this.chefId, world: this.worldId, wave: gm.wave, gold: gm.gold, served: gm.served, kills: gm.kills, combo: gm.combo,
      standHp: gm.standHp, hp: chef.hp, maxHp: chef.maxHp, ult: chef.ult, upgrades: { ...gm.levels },
      inv: JSON.parse(JSON.stringify(chef.inv)) as RunSave['inv'],
    };
  }

  /** Sauvegarde automatique à chaque début de vague (partie solo uniquement). */
  private autosave(): void {
    if (this.mode === 'solo' && this.gm.phase !== 'over') saveRun(this.snapshot());
  }

  private pause(): void {
    const { gm } = this;
    if (this.paused || gm.phase === 'over' || gm.phase === 'cards') return;
    this.paused = true;
    this.touch.setEnabled(false);
    const resume = () => {
      this.paused = false;
      this.touch.setEnabled(true);
    };
    const son = { label: () => (audio.muted ? 'SON : NON' : 'SON : OUI'), action: () => (audio.toggleMute(), false) };
    const data = { chef: this.chefId, world: this.worldId };
    if (this.mode === 'duel') {
      openModal(this, 'PAUSE', [
        { label: 'REPRENDRE', color: 0xe8642a, action: resume },
        son,
        { label: 'QUITTER LE DUEL', color: 0x9a3a2e, action: () => void this.scene.start('Menu') },
      ], this.link?.online ? 'Le duel continue !' : '');
      return;
    }
    openModal(this, 'PAUSE', [
      { label: 'REPRENDRE', color: 0xe8642a, action: resume },
      {
        label: 'SAUVEGARDER ET QUITTER', color: 0x3d7a4a,
        action: () => {
          saveRun(this.snapshot());
          this.scene.start('Menu');
        },
      },
      { label: 'RECOMMENCER', action: () => (clearRun(), void this.scene.restart({ ...data, mode: 'solo' })) },
      son,
      { label: 'ABANDONNER', color: 0x9a3a2e, action: () => (clearRun(), void this.scene.start('Menu')) },
    ], `Vague ${Math.min(gm.wave + 1, WAVES.length + 1)} - reprise au debut de la vague`);
  }

  // ------------------------------------------------------------------ duel
  private setupDuel(): void {
    const link = (this.link ??= new BotLink());
    this.hud.rivalInfo = { name: link.rivalName, gold: 0 };
    link.onPeer = (gold) => {
      this.rivalGold = gold;
      if (this.hud.rivalInfo) this.hud.rivalInfo.gold = gold;
    };
    link.onSabotage = (kind) => this.sabotaged(kind);
    link.onRivalOut = (reason) => {
      if (this.gm.phase === 'over') return;
      this.rivalOut = reason;
      this.gm.end(true);
    };
    this.gm.on('duelTime', () => {
      if (this.gm.phase === 'over') return;
      link.sendScore(this.gm.gold, this.gm.served);
      this.gm.end(this.gm.gold > this.rivalGold);
    });
  }

  private updateDuel(dt: number, time: number): void {
    this.inverseT = Math.max(0, this.inverseT - dt);
    if (this.link) {
      this.link.update(dt);
      this.scoreT -= dt;
      if (this.scoreT <= 0) {
        this.scoreT = 0.5;
        this.link.sendScore(this.gm.gold, this.gm.served);
      }
    }
    // nuage de fumée sur la cuisine
    this.smokeT = Math.max(0, this.smokeT - dt);
    if (this.smokeT > 0 && !this.smoke.length) {
      for (let i = 0; i < 16; i++) {
        this.smoke.push(this.add.image((i % 4) * 100 + 30, 40 + Math.floor(i / 4) * 62, 'fumee').setScale(2.2).setDepth(2150).setAlpha(0));
      }
    }
    this.smoke.forEach((sm, i) => {
      sm.setAlpha(Math.min(0.94, this.smokeT * 1.5)).setX((i % 4) * 100 + 30 + Math.sin(time / 600 + i) * 18);
    });
  }

  /** En duel, un K.O. ou un stand détruit coûte de l'or mais la partie continue jusqu'au bout des 2 minutes. */
  private duelKo(): void {
    const { gm, chef } = this;
    const stand = gm.standHp <= 0;
    const cost = Math.min(gm.gold, stand ? 150 : 100);
    gm.gold -= cost;
    gm.combo = 0;
    if (stand) gm.standHp = gm.standMax;
    else chef.hp = chef.maxHp;
    chef.invuln = 3;
    for (const e of this.enemies) e.stun = 2.5;
    this.hud.banner(`${stand ? 'STAND DETRUIT' : 'K.O.'} !\n-${cost} OR`, '#ff6a5a', 250);
    audio.sfx('defaite');
    this.cameras.main.shake(300, 0.012);
  }

  /** Malus envoyé par le rival après un combo de 3 plats. */
  private sabotaged(kind: Sabotage): void {
    if (this.gm.phase === 'over') return;
    this.hud.banner(`SABOTAGE !\n${SABOTAGE_LABEL[kind]}`, '#ff6a5a', 250);
    audio.sfx('rugissement');
    this.cameras.main.shake(300, 0.01);
    if (kind === 'roi_tomate') this.spawnEnemy('roi_tomate', W / 2, H + 30, true);
    else if (kind === 'fumee') this.smokeT = 7;
    else this.inverseT = 5;
  }

  // ------------------------------------------------------------------ effets & utilitaires
  private dist(a: { x: number; y: number }, b: { x: number; y: number }): number {
    return Math.hypot(a.x - b.x, a.y - b.y);
  }

  private distToLine(l: Phaser.Geom.Line, x: number, y: number): number {
    const len2 = (l.x2 - l.x1) ** 2 + (l.y2 - l.y1) ** 2 || 1;
    const t = Phaser.Math.Clamp(((x - l.x1) * (l.x2 - l.x1) + (y - l.y1) * (l.y2 - l.y1)) / len2, 0, 1);
    return Math.hypot(l.x1 + (l.x2 - l.x1) * t - x, l.y1 + (l.y2 - l.y1) * t - y);
  }

  private arcFx(x: number, y: number, ang: number, r: number, color: number, spread = 1.1): void {
    const g = this.add.graphics().setDepth(1700);
    g.lineStyle(7, color, 0.9).beginPath().arc(x, y, r - 6, ang - spread, ang + spread).strokePath();
    g.lineStyle(3, 0xffffff, 0.9).beginPath().arc(x, y, r - 3, ang - spread * 0.8, ang + spread * 0.8).strokePath();
    this.tweens.add({ targets: g, alpha: 0, duration: 160, onComplete: () => g.destroy() });
  }

  private ringFx(x: number, y: number, r: number, color: number, duration = 200): void {
    const g = this.add.graphics({ x, y }).setDepth(1700);
    g.lineStyle(5, color, 0.9).strokeCircle(0, 0, r);
    g.fillStyle(color, 0.25).fillCircle(0, 0, r);
    g.setScale(0.3);
    this.tweens.add({ targets: g, scale: 1, alpha: 0, duration, ease: 'Cubic.out', onComplete: () => g.destroy() });
  }

  private puff(x: number, y: number, color: number, count: number): void {
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const d = 10 + Math.random() * (count > 10 ? 60 : 18);
      const p = this.add.image(x, y, 'particule').setTint(color).setDepth(1650);
      this.tweens.add({ targets: p, x: x + Math.cos(a) * d, y: y + Math.sin(a) * d, alpha: 0, scale: 0.3, duration: 350 + Math.random() * 200, onComplete: () => p.destroy() });
    }
  }

  private drawAuras(time: number): void {
    const { chef, fx } = this;
    fx.clear();
    if (chef.powers.bouclier > 0) {
      fx.lineStyle(3, 0xff8a1e, 0.7 + Math.sin(time / 90) * 0.2).strokeCircle(chef.x, chef.y - 14, 42);
      fx.lineStyle(1, 0xffe27a, 0.8).strokeCircle(chef.x, chef.y - 14, 38 + Math.sin(time / 60) * 2);
    }
    if (chef.ultActive > 0) {
      for (let i = 0; i < 3; i++) {
        const a = time / 80 + (i * Math.PI * 2) / 3;
        fx.lineStyle(6, i % 2 ? 0xffc533 : 0xff5a1e, 0.8).beginPath().arc(chef.x, chef.y - 14, 50 + i * 16, a, a + 1.6).strokePath();
      }
    }
  }
}
