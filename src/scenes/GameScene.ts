import Phaser from 'phaser';
import { landscapeHeight, landscapeWanted, landscapeWidth, pageCam, RES } from '../core/layout';
import { audio, Sfx, Tune } from '../audio/AudioManager';
import {
  ARENA, BOSS_REWARD, ChefId, ENEMIES, FREE_WORLDS, ShopItem, WORLD_HP_STEP, worldRank, CHEFS, CHOP_TIME, COMBO_GOLD, COMBO_SIZE, conveyorsOf, worldDef, STYLE_3D, WORLD_3D, EnemyId, GameMode, H, IngredientId, INGREDIENTS, itemLabel, playerLevel, ORDER_PATIENCE,
  POWER_LABEL, POWER_TIME, SHOP, Sabotage, SABOTAGE_LABEL, SABOTAGES, TIP_BONUS, UpgradeDef, W, WAVES, WORLD_ORDER, WorldDef, WorldId, fitUi } from '../core/constants';
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
import { recordRun } from '../core/Missions';
import { addCoins, clearRun, loadProfile, nextMilestone, RunSave, saveProfile, saveRun } from '../core/Storage';
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
/** Une musique de chasse par monde. */
const HUNT_TUNE: Record<WorldId, Tune> = {
  clairiere: 'chasse', marche: 'chasse_marche', taverne: 'chasse_taverne', cantine: 'chasse_cantine',
  glaciere: 'chasse_glaciere', volcan: 'chasse_volcan', bateau: 'chasse_bateau', bonbons: 'chasse_bonbons',
};

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
  private effectRainbow = false;
  /** Bruit de l'arme équipée (onglet ARMES de la boutique). */
  private effectHit: string | null = null;
  /** Pour les missions du jour. */
  private sliced = 0;
  private maxCombo = 0;
  /** Costume équipé (pour le bruit et la couleur de son arme). */
  private skinItem: ShopItem | null = null;
  private atkKeys: Phaser.Input.Keyboard.Key[] = [];
  /** Écran en paysage (téléphone tourné) et ses caméras d'interface. */
  private land = false;
  private hudCam?: Phaser.Cameras.Scene2D.Camera;
  private ovlCam?: Phaser.Cameras.Scene2D.Camera;

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

  /** Map en haute définition (2 fois plus fine) du monde joué : chargée juste avant la partie, une seule à la fois. */
  preload(): void {
    if (!STYLE_3D || !WORLD_3D[this.worldId]) return;
    for (const k of this.textures.getTextureKeys()) if (k.startsWith('hdmap_') && k !== 'hdmap_' + this.worldId) this.textures.remove(k);
    if (!this.textures.exists('hdmap_' + this.worldId)) this.load.image('hdmap_' + this.worldId, `assets/maps/hd3d_${this.worldId}.jpg`);
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

    this.world = worldDef(this.worldId); // version 3D du monde si elle existe
    const { pot, counter, standLine, wide } = this.world;
    ARENA.w = wide?.w ?? W;
    ARENA.h = wide?.h ?? H;
    if (wide) {
      // grande map paysage : tout le terrain est dessiné, la caméra suit le chef (portrait comme paysage)
      this.add.image(0, 0, this.textures.exists('hdmap_' + this.worldId) ? 'hdmap_' + this.worldId : 'wide_' + this.worldId).setOrigin(0).setDisplaySize(wide.w, wide.h).setDepth(-100);
    } else {
      // monde sans grande map (il n'y en a plus depuis le 14/11) : une seule map, jamais de copies en miroir
      this.add.image(0, 0, 'map_' + this.worldId).setOrigin(0).setDepth(-100);
    }
    // tapis roulants : sur une grande map, ils ne couvrent que la zone où l'on marche
    const [bx, bw] = wide ? [wide.area.x, wide.area.w] : [0, W];
    for (const c of conveyorsOf(this.world)) {
      const [x, w] = c.x !== undefined ? [c.x, c.w!] : [bx, bw];
      this.add.rectangle(x, c.y, w, c.h, 0x4ff3ff, 0.12).setOrigin(0).setDepth(-50);
      if (c.x !== undefined) {
        // tapis vertical dessiné sur la map : flèches tournées vers le bas
        this.conveyors.push(this.add.tileSprite(x + w / 2, c.y + c.h / 2, c.h, 12, 'fleche_tapis').setAngle(90).setAlpha(0.5).setDepth(-49));
      } else this.conveyors.push(this.add.tileSprite(x, c.y + c.h / 2, w, 12, 'fleche_tapis').setOrigin(0, 0.5).setAlpha(0.5).setDepth(-49));
    }

    this.gm = new GameManager(this.mode);
    this.recipes = new RecipeManager();
    if (this.resume) {
      this.gm.restore(this.resume);
      this.recipes.orders = [];
      this.recipes.refill(this.gm.wave);
    }
    const board = this.world.board;
    fitUi(this.add.image(board.x, board.y, 'planche').setOrigin(0.5, 1).setDepth(board.y - 12));
    txt(this, board.x, board.y + 4, 'PLANCHE', 8, '#ffe9b0').setOrigin(0.5, 0).setDepth(-10);
    this.pot = new CookingPot(this, pot.x, pot.y);
    fitUi(this.add.image(counter.x, counter.y, 'comptoir').setOrigin(0.5, 1).setDepth(counter.y));
    txt(this, pot.x, pot.y + 4, 'MARMITE', 8, '#ffe9b0').setOrigin(0.5, 0).setDepth(-10);
    txt(this, counter.x, counter.y + 4, 'SERVICE', 8, '#ffe9b0').setOrigin(0.5, 0).setDepth(-10);
    // halo au sol sous chaque poste de cuisine, pour les repérer d'un coup d'œil sur les grandes maps
    for (const [p, color] of [[pot, 0xff9a3c], [board, 0x7dff7d], [counter, 0xffe27a]] as const) {
      const halo = this.add.ellipse(p.x, p.y - 2, 58, 22, color, 0.4).setDepth(-20);
      this.tweens.add({ targets: halo, alpha: 0.12, scaleX: 1.2, scaleY: 1.2, duration: 800, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    }
    this.counterHint = txt(this, counter.x, counter.y - 40, 'ICI !', 8, '#ffe27a').setOrigin(0.5).setDepth(1500).setVisible(false);

    const profile = loadProfile();
    const skin = profile.skins[this.chefId] ?? null;
    this.skinItem = skin && profile.owned.includes(skin) ? (SHOP.find((i) => i.id === skin) ?? null) : null;
    const effect = SHOP.find((i) => i.id === profile.effect && profile.owned.includes(i.id));
    this.effectColor = effect?.color ?? null;
    this.effectRainbow = !!effect?.rainbow;
    this.effectHit = effect?.hit ?? null;
    this.sliced = this.maxCombo = 0;
    this.chef = new Chef(this, CHEFS[this.chefId], wide ? counter.x - 60 : W / 2, standLine + 100, skin && profile.owned.includes(skin) ? skin : null);
    // mouvement d'attaque selon l'arme (style 3D)
    const worn = this.skinItem?.id;
    this.chef.style = worn === 'skin_gorille' ? 'punch' : worn === 'skin_tigre' ? 'spin'
      : worn === 'skin_taureau' || worn === 'skin_ours' || this.chefId === 'shiba' ? 'slam'
      : this.chefId === 'noisette' ? 'double' : 'swing';
    if (this.resume) {
      const r = this.resume;
      this.chef.maxHp = r.maxHp;
      this.chef.hp = Math.max(1, r.hp);
      this.chef.ult = r.ult;
      for (const i of INGREDIENTS) this.chef.inv[i] = { ...r.inv[i] };
    }
    this.bounds = wide
      ? new Phaser.Geom.Rectangle(wide.area.x, pot.y - 4, wide.area.w, wide.area.y + wide.area.h - (pot.y - 4))
      : new Phaser.Geom.Rectangle(16, pot.y - 4, W - 32, H - 12 - (pot.y - 4));
    this.fx = this.add.graphics().setDepth(1800);

    this.setupLayout();
    this.hud = this.makeHud();
    this.cards = new UpgradeCards(this);
    this.touch = new TouchController(this, (x, y) => this.hud.isUi(x, y));
    // le doigt glisse en coordonnées d'écran : on les ramène sur la carte (utile en paysage, caméra qui suit le chef)
    this.touch.onSlice = (x1, y1, x2, y2) => {
      const a = this.cameras.main.getWorldPoint(x1 * RES, y1 * RES);
      const b = this.cameras.main.getWorldPoint(x2 * RES, y2 * RES);
      this.slice(a.x, a.y, b.x, b.y);
    };
    // téléphone tourné en pleine partie : on refait l'écran (Android met parfois un instant à donner la bonne taille)
    const relayout = () => {
      if (!this.sys.isActive() && !this.sys.isPaused()) return;
      const land = landscapeWanted();
      if (land === this.land && (!land || (landscapeWidth() * RES === this.scale.width && landscapeHeight() * RES === this.scale.height))) return;
      this.setupLayout();
      const rival = this.hud.rivalInfo;
      this.hud.destroy();
      this.hud = this.makeHud();
      this.hud.rivalInfo = rival;
    };
    const onResize = () => [0, 300, 1000].forEach((ms) => window.setTimeout(relayout, ms));
    window.addEventListener('resize', onResize);
    this.events.on('prerender', this.filterCameras, this);
    this.events.once('shutdown', () => {
      window.removeEventListener('resize', onResize);
      this.events.off('prerender', this.filterCameras, this);
      this.land = false;
      this.hudCam = this.ovlCam = undefined;
      if (this.scale.width !== W * RES || this.scale.height !== H * RES) {
        this.scale.setGameSize(W * RES, H * RES);
        this.game.events.emit('refit');
      }
    });
    this.input.keyboard?.on('keydown-SPACE', () => this.ultimate());
    this.atkKeys = this.input.keyboard ? Object.values(this.input.keyboard.addKeys('K,E') as Record<string, Phaser.Input.Keyboard.Key>) : [];

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
      audio.music('duel');
    } else if (this.gm.phase === 'boss') {
      this.hud.banner(`LE ${this.world.bossName ?? 'ROI TOMATE'}\nARRIVE !`, '#ff6a5a');
      audio.music('boss');
    } else {
      this.hud.banner(`VAGUE ${this.gm.wave + 1}\nA LA CHASSE !`);
      audio.music(HUNT_TUNE[this.worldId]);
    }
    this.autosave();
  }

  // ------------------------------------------------------------------ boucle
  update(time: number, delta: number): void {
    this.nowT = time;
    if (this.stopUntil > time) return;
    const dt = Math.min(delta, 50) / 1000;
    this.touch.update(dt);
    if (this.hudCam) this.followChef(Math.min(1, dt * 6));
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
    this.attack(dt);
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
    this.maxCombo = Math.max(this.maxCombo, gm.combo);
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
    const onBelt = conveyorsOf(this.world).some((c) => chef.y >= c.y && chef.y <= c.y + c.h && (c.x === undefined || (chef.x >= c.x && chef.x <= c.x + c.w!)));
    const speed = chef.def.speed * (1 + 0.15 * gm.level('bottes')) * (chef.powers.vitesse > 0 ? 1.35 : 1) * (onBelt ? 1.6 : 1);
    const dir = this.inverseT > 0 ? this.touch.dir.clone().negate() : this.touch.dir;
    if (!this.dashing) chef.move(dir, speed, dt, this.bounds, this.blocked);

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

  /** Attaque manuelle : le joueur garde le bouton d'attaque appuyé (ou la touche K / E au clavier). */
  private attack(dt: number): void {
    const c = this.chef;
    // A l'arrêt le chef frappe à pleine cadence ; en mouvement il esquive et frappe deux fois moins vite.
    c.cooldown -= dt * (c.moving ? 0.5 : 1);
    if (c.cooldown > 0 || this.dashing) return;
    if (!this.hud.attackHeld && !this.atkKeys.some((k) => k.isDown)) return;
    let target: Enemy | null = null;
    let best = c.def.range;
    for (const e of this.enemies) {
      const d = this.dist(e, c) - e.radius;
      if (!e.dead && d < best) {
        best = d;
        target = e;
      }
    }
    // sans monstre à portée, le coup part devant le chef (dans le sens du joystick)
    const aim = this.touch.dir.lengthSq() > 0.01 ? this.touch.dir.clone().normalize() : new Phaser.Math.Vector2(c.facing, 0);
    const tx = target ? target.x : c.x + aim.x * c.def.range * 0.8;
    const ty = target ? target.y : c.y + aim.y * c.def.range * 0.8;
    c.cooldown = c.def.cooldown;
    c.strike(tx, ty);
    // chaque arme a son bruit : celui du costume équipé s'il en a un, sinon celui du chef
    audio.sfx(((this.effectHit ?? this.skinItem?.hit) as Sfx | undefined) ?? (c.def.id === 'moustachu' ? 'coup_poele' : c.def.id === 'shiba' ? 'coup_rouleau' : 'coup_hachoir'));
    const dmg = this.attackDamage();
    const ang = Math.atan2(ty - c.y, tx - c.x);
    const color = c.powers.feu > 0 ? 0xff3b1e : (this.fxColor() ?? this.skinItem?.slash ?? c.def.slashColor);

    if (c.def.id === 'moustachu') {
      // arc de feu devant le chef
      for (const e of [...this.enemies]) {
        const d = this.dist(e, c) - e.radius;
        const diff = Math.abs(Phaser.Math.Angle.Wrap(Math.atan2(e.y - c.y, e.x - c.x) - ang));
        if (!e.dead && d < c.def.range + 8 && diff < 1.2) this.damage(e, dmg);
      }
      if (STYLE_3D && c.style === 'punch') this.punchFx(c, tx, ty, color);
      else this.arcFx(c.x, c.y - 16, ang, c.def.range, color);
    } else {
      // frappe lourde (zone large) ou hachoirs rapides (zone étroite)
      const zone = c.def.id === 'shiba' ? 38 : 20;
      for (const e of [...this.enemies]) {
        if (!e.dead && Math.hypot(e.x - tx, e.y - ty) < zone + e.radius) this.damage(e, dmg);
      }
      if (c.def.id === 'shiba' && STYLE_3D) this.slamFx(tx, ty, zone, color, this.skinItem?.id);
      else if (c.def.id === 'shiba') this.ringFx(tx, ty - 6, zone, color);
      else if (STYLE_3D && c.style === 'spin') this.spinFx(c, color);
      else if (STYLE_3D) this.doubleFx(c, ang, color);
      else this.arcFx(c.x, c.y - 16, ang + (Math.random() - 0.5), c.def.range, color, 0.7);
    }
  }

  /** Couleur de l'effet d'arme équipé (l'arc-en-ciel change de couleur en continu). */
  private fxColor(): number | null {
    return this.effectRainbow ? (Phaser.Display.Color.HSVToRGB((this.time.now / 700) % 1, 0.85, 1) as Phaser.Display.Color).color : this.effectColor;
  }

  private attackDamage(): number {
    return this.chef.def.damage * (1 + 0.25 * this.gm.level('degats')) * (this.chef.powers.feu > 0 ? 1.5 : 1);
  }

  // ------------------------------------------------------------------ ultimes
  private ultimate(): void {
    const { chef, gm } = this;
    if (chef.ult < 100 || gm.phase === 'cards' || gm.phase === 'over' || this.dashing || this.paused) return;
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
      let x2 = chef.x;
      let y2 = chef.y;
      for (let d = 4; d <= 220; d += 4) { // le dash s'arrête devant un décor
        const tx = Phaser.Math.Clamp(chef.x + dir.x * d, this.bounds.left, this.bounds.right);
        const ty = Phaser.Math.Clamp(chef.y + dir.y * d, this.bounds.top, this.bounds.bottom);
        if (this.blocked(tx, ty)) break;
        x2 = tx;
        y2 = ty;
      }
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
    // vie : +25 % par vague (sauf boss), et +8 % par monde pour tout le monde, boss compris
    const hpMul = (ENEMIES[type].ai === 'boss' ? 1 : 1 + 0.25 * Math.min(this.gm.wave, WAVES.length)) * (1 + WORLD_HP_STEP * worldRank(this.worldId));
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
        for (let i = 0; i < 3; i++) this.spawnEnemy(this.world.minion ?? 'tomate', x - 50 + i * 50, y + 20);
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
    e.hit(dmg, this.chef.x, this.chef.y);
    audio.sfx('touche');
    if (STYLE_3D) this.impactFx(e);
    if (e.hp <= 0) this.kill(e);
  }

  private kill(e: Enemy): void {
    e.dead = true;
    this.gm.kills++;
    audio.sfx(e.def.ai === 'boss' ? 'explosion' : ((e.def.die as Sfx | undefined) ?? 'pop'));
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
      this.hud.float(e.x, e.y - 60, `${this.world.bossName ?? 'TOMATE ROYALE'} +${BOSS_REWARD}`);
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
    let px = Phaser.Math.Clamp(x, b.left, b.right);
    let py = Phaser.Math.Clamp(y, this.world.standLine + 6, b.bottom);
    // tombé dans un décor : on le pose juste à côté, là où le chef peut le ramasser
    for (let r = 8; this.blocked(px, py) && r <= 200; r += 8) {
      for (let a = 0; a < 8; a++) {
        const tx = Phaser.Math.Clamp(px + Math.cos((a * Math.PI) / 4) * r, b.left, b.right);
        const ty = Phaser.Math.Clamp(py + Math.sin((a * Math.PI) / 4) * r, this.world.standLine + 6, b.bottom);
        if (!this.blocked(tx, ty)) { px = tx; py = ty; break; }
      }
    }
    this.ingredients.push(new Ingredient(this, type, px, py));
  }

  /** Vrai si le point (les pieds du chef) est dans un décor de la carte, avec une petite marge. */
  private blocked = (x: number, y: number): boolean =>
    (this.world.obstacles ?? []).some((o) => x > o.x - 6 && x < o.x + o.w + 6 && y > o.y - 3 && y < o.y + o.h + 3);

  private shoot(x: number, y: number, tx: number, ty: number): void {
    const d = Math.hypot(tx - x, ty - y) || 1;
    audio.sfx('feu');
    this.shots.push({ img: fitUi(this.add.image(x, y, 'boule_feu').setDepth(1600)), vx: ((tx - x) / d) * 95, vy: ((ty - y) / d) * 95, life: 5 });
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
        this.sliced++;
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
        const x = this.bounds.left + 24 + Math.random() * (this.bounds.width - 48);
        const y = this.world.standLine + 60 + Math.random() * (this.bounds.bottom - this.world.standLine - 120);
        this.barrels.push({ x, y, img: fitUi(this.add.image(x, y, 'tonneau').setOrigin(0.5, 1).setDepth(y)) });
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
      audio.music(HUNT_TUNE[this.worldId]);
      audio.sfx('vague');
    } else if (p === 'boss') {
      audio.music('boss');
      audio.sfx('rugissement');
      if (STYLE_3D) this.time.delayedCall(1300, () => this.bossCloseUp());
    }
    if (p === 'harvest' || p === 'boss') this.autosave();
    if (p === 'kitchen') this.hud.banner('COUP DE FEU !\nEN CUISINE !', '#ffe27a');
    else if (p === 'harvest') this.hud.banner(`VAGUE ${this.gm.wave + 1}\nA LA CHASSE !`);
    else if (p === 'boss') {
      this.hud.banner(`LE ${this.world.bossName ?? 'ROI TOMATE'}\nARRIVE !`, '#ff6a5a');
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
    const levelBefore = playerLevel(profile.earned).level;
    // L'or de la partie ne devient des pièces que si les 3 vagues ont été terminées (boss atteint) ou le duel joué.
    const validated = duel || gm.victory === true || gm.wave >= WAVES.length;
    const gifts = validated ? addCoins(gm.gold) : [];
    if (!duel) saveProfile({ runs: [...loadProfile().runs, validated ? gm.gold : 0].slice(-20) });
    const missionsDone = recordRun({
      kills: gm.kills, served: gm.served, sliced: this.sliced, combo: this.maxCombo >= COMBO_SIZE ? 1 : 0,
      gold: !duel && validated ? gm.gold : 0, waves: !duel && validated ? 1 : 0, boss: !duel && gm.victory === true ? 1 : 0,
    });
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
      if (gm.victory && next > profile.unlocked && next <= FREE_WORLDS) {
        saveProfile({ unlocked: next });
        this.unlockedWorld = true;
      }
      lines.push(`OR GAGNE : ${gm.gold}`, `PLATS SERVIS : ${gm.served}`, `MONSTRES VAINCUS : ${gm.kills}`, record ? 'NOUVEAU RECORD !' : `RECORD : ${profile.best}`);
      if (this.unlockedWorld) lines.push('NOUVEAU MONDE DEBLOQUE !');
    }
    lines.push(validated ? `+${gm.gold} PIECES POUR LA BOUTIQUE` : 'PIECES PERDUES : TERMINE\nLES 3 VAGUES POUR LES GARDER');
    const levelNow = playerLevel(loadProfile().earned);
    if (levelNow.level > levelBefore) {
      lines.push(`NIVEAU ${levelNow.level} ATTEINT !`);
      this.time.delayedCall(1700, () => audio.sfx('niveau')); // après la musique de fin
    }
    else lines.push(`NIVEAU ${levelNow.level} : ${levelNow.into}/${levelNow.span}`);
    if (gifts.length === 1) lines.push(`CADEAU DEBLOQUE : ${itemLabel(gifts[0])} !`);
    else if (gifts.length > 1) lines.push(`${gifts.length} CADEAUX DEBLOQUES ! (BOUTIQUE)`);
    if (missionsDone.length) lines.push(`MISSION DU JOUR ACCOMPLIE !${missionsDone.length > 1 ? ` (x${missionsDone.length})` : ''}`);
    const milestone = nextMilestone();
    if (milestone) lines.push(`PROCHAIN CADEAU DANS ${milestone.left} PIECES`);
    const D = 3000;
    this.add.rectangle(0, 0, W, H, 0x0c0c18, 0.8).setOrigin(0).setDepth(D).setInteractive();
    // le bloc de texte se resserre quand il y a beaucoup de lignes, pour ne jamais toucher le titre ni les boutons
    const body = txt(this, W / 2, 0, lines.join(lines.length > 7 ? '\n' : '\n\n'), 8).setOrigin(0.5, 0).setDepth(D + 1);
    body.setY(Math.round(Math.max(118, 282 - body.height / 2)));
    txt(this, W / 2, Math.min(150, body.y - 30), title, 16, gm.victory ? '#ffc533' : '#ff6a5a').setOrigin(0.5).setDepth(D + 1);
    const again = duel && this.link?.online ? null : duel ? 'REVANCHE' : 'REJOUER';
    if (again) {
      button(this, W / 2, 400, 160, 36, again, 0xe8642a, () =>
        this.scene.restart({ chef: this.chefId, world: this.worldId, mode: this.mode, link: duel ? new BotLink() : null }),
      ).setDepth(D + 1);
    }
    button(this, W / 2, again ? 446 : 400, 160, 30, 'MENU', 0x4a4f66, () => this.scene.start('Menu')).setDepth(D + 1);
  }

  // ------------------------------------------------------------------ écran portrait / paysage
  private makeHud(): Hud {
    return new Hud(this, this.gm, this.chef, this.recipes, () => this.ultimate(), () => this.pause());
  }

  /**
   * Portrait : une seule caméra, comme avant. Paysage : canvas large et trois caméras —
   * la carte au centre (suit le chef), l'interface fixe dans les bandeaux (coordonnées d'écran),
   * et une caméra « fenêtres » au centre pour les bannières, la pause, les cartes et l'écran de fin.
   */
  private setupLayout(): void {
    const land = landscapeWanted();
    const gw = land ? landscapeWidth() : W;
    const gh = land ? landscapeHeight() : H;
    if (this.scale.width !== gw * RES || this.scale.height !== gh * RES) this.scale.setGameSize(gw * RES, gh * RES);
    this.game.events.emit('refit');
    if (this.hudCam) this.cameras.remove(this.hudCam);
    if (this.ovlCam) this.cameras.remove(this.ovlCam);
    this.hudCam = this.ovlCam = undefined;
    this.land = land;
    const main = this.cameras.main;
    const wide = !!this.world.wide;
    if (!land && !wide) {
      pageCam(main.removeBounds(), 0, 0, W, H);
      for (const o of this.children.list) o.cameraFilter = 0;
      return;
    }
    // la map remplit tout l'écran et la caméra suit le chef ; interface et fenêtres par-dessus
    // style 3D : caméra un peu plus proche, personnages plus grands comme sur l'image de référence
    // caméra plus haute en style 3D (on voit presque toute la map), mais jamais au point de montrer un bord noir
    const camZoom = STYLE_3D ? Math.max(land ? 0.78 : 0.82, gw / ARENA.w, gh / ARENA.h) : 1;
    if (wide) pageCam(main, 0, 0, gw, gh, 0, 0, camZoom).setBounds(0, 0, ARENA.w, ARENA.h);
    else pageCam(main, 0, 0, gw, gh).setBounds(-2 * W, 0, 5 * W, H);
    this.hudCam = pageCam(this.cameras.add(), 0, 0, gw, gh);
    this.ovlCam = pageCam(this.cameras.add(), 0, 0, gw, gh);
    this.followChef(1);
  }

  /** Style 3D (vidéo de Rudy) : le boss surgit, la caméra va le voir et zoome, rugissement et secousse, puis revient. */
  private bossCloseUp(): void {
    const boss = this.enemies.find((e) => e.def.ai === 'boss' && !e.dead);
    if (!boss || this.gm.phase !== 'boss') return;
    this.camFocus = { x: boss.x, y: Math.min(boss.y, ARENA.h - 40) - 30, until: this.time.now + 1500 };
    const main = this.cameras.main;
    const z = main.zoom;
    this.tweens.add({ targets: main, zoom: z * 1.25, duration: 450, ease: 'Sine.out', yoyo: true, hold: 600 });
    this.time.delayedCall(350, () => {
      main.shake(500, 0.012);
      audio.sfx('rugissement');
    });
  }

  /** En paysage, la map défile pour garder le chef au milieu de l'écran. */
  private followChef(k: number): void {
    const main = this.cameras.main;
    const vw = main.width / main.zoom;
    const vh = main.height / main.zoom;
    const [x0, x1] = this.world.wide ? [0, ARENA.w] : [-2 * W, 3 * W];
    const focus = this.camFocus && this.camFocus.until > this.time.now ? this.camFocus : null;
    const tx = Phaser.Math.Clamp(focus ? focus.x : this.chef.x, x0 + vw / 2, x1 - vw / 2);
    // en paysage, les commandes couvrent le haut de l'écran : le chef est tenu un peu plus bas pour laisser voir la cuisine
    const ty = Phaser.Math.Clamp(focus ? focus.y : this.chef.y - (this.land ? (STYLE_3D ? 34 : 60) : 0), vh / 2, Math.max(vh / 2, ARENA.h - vh / 2));
    const c = main.midPoint;
    main.centerOn(c.x + (tx - c.x) * k, c.y + (ty - c.y) * k);
  }

  /** Chaque objet n'est dessiné que par sa caméra (en paysage seulement). */
  private filterCameras(): void {
    if (!this.hudCam || !this.ovlCam) return;
    const m = this.cameras.main.id;
    const h = this.hudCam.id;
    const o = this.ovlCam.id;
    const all = m | h | o;
    let box: Phaser.Geom.Rectangle | null = null;
    for (const obj of this.children.list) {
      const depth = (obj as Phaser.GameObjects.Components.Depth & Phaser.GameObjects.GameObject).depth;
      const cam = this.hud.owns(obj) || this.touch.owns(obj) ? h : depth >= 2040 ? o : m;
      obj.cameraFilter = all & ~cam;
      // fenêtres (pause, cartes, fin de partie) : on mesure leur taille pour les afficher en entier
      if (depth >= 3000 && (obj as unknown as Phaser.GameObjects.Components.Visible).visible) {
        const c = obj as unknown as Phaser.GameObjects.Container;
        const b = obj.type === 'Container' && c.width > 0 ? new Phaser.Geom.Rectangle(c.x - c.width / 2, c.y - c.height / 2, c.width, c.height)
          : (obj as unknown as { getBounds?: () => Phaser.Geom.Rectangle }).getBounds?.();
        if (b && b.width > 0 && !(b.width >= W && b.height >= H)) box = box ? Phaser.Geom.Rectangle.Union(box, b, box) : Phaser.Geom.Rectangle.Clone(b);
      }
    }
    const ov = this.ovlCam;
    const oh = ov.height / RES;
    // une fenêtre est ouverte : l'interface de jeu s'efface derrière (pas de texte qui se chevauche)
    this.hudCam.setVisible(!box);
    if (box) {
      ov.setZoom(RES * Math.min(1, (oh - 6) / (box.height + 16)));
      ov.centerOn(W / 2, box.centerY);
    } else {
      ov.setZoom(RES * Math.min(1, oh / 330));
      ov.centerOn(W / 2, 320);
    }
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
    this.hud.releaseAttack();
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
    if (kind === 'roi_tomate') this.spawnEnemy('roi_tomate', ARENA.w / 2, ARENA.h + 30, true);
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
    if (STYLE_3D) {
      // style 3D (image de référence) : croissant de feu effilé aux deux bouts, coeur jaune-blanc, bords orange et rouge,
      // qui se déploie dans le sens du coup puis s'efface
      g.destroy();
      this.flameCrescent(x, y, ang, r + 8, spread, color);
      return;
    }
    g.lineStyle(7, color, 0.9).beginPath().arc(x, y, r - 6, ang - spread, ang + spread).strokePath();
    g.lineStyle(3, 0xffffff, 0.9).beginPath().arc(x, y, r - 3, ang - spread * 0.8, ang + spread * 0.8).strokePath();
    this.tweens.add({ targets: g, alpha: 0, duration: 160, onComplete: () => g.destroy() });
  }

  /** Couleur du jus d'un monstre (éclaboussures). */
  private juice(e: Enemy): number {
    const id = e.def.id as string;
    return id === 'gelee' ? 0x6fe04a : id === 'champi' ? 0xc9a070 : id === 'mais' || id === 'cube_fromage' || id === 'roi_fromage' ? 0xffd23e
      : id === 'aubergine' ? 0x9a4ad8 : id === 'oignon' || id === 'ail' ? 0xf0ece0 : id === 'citrouille' || id === 'hotdog' ? 0xff8a1e : 0xe8302a;
  }

  /** Impact (style 3D, vidéo de Rudy) : gouttes du jus du monstre, étoile blanche, petite secousse et arrêt sur image. */
  private impactFx(e: Enemy): void {
    const c = this.juice(e);
    const y = e.y - e.radius;
    const star = this.add.image(e.x, y, 'etincelle').setDepth(1702).setScale(0.6).setBlendMode(Phaser.BlendModes.ADD);
    this.tweens.add({ targets: star, scale: 1.3, alpha: 0, angle: 45, duration: 160, onComplete: () => star.destroy() });
    const a0 = Math.atan2(e.y - this.chef.y, e.x - this.chef.x);
    for (let i = 0; i < 8; i++) {
      const a = a0 + (Math.random() - 0.5) * 1.8;
      const d = 14 + Math.random() * 22;
      const p = this.add.circle(e.x, y, 1.5 + Math.random() * 2, c).setDepth(1701);
      this.tweens.add({ targets: p, x: e.x + Math.cos(a) * d, y: y + Math.sin(a) * d * 0.6 - 8, duration: 180, ease: 'Quad.out' });
      this.tweens.add({ targets: p, y: `+=${12 + Math.random() * 8}`, alpha: 0, delay: 180, duration: 220, ease: 'Quad.in', onComplete: () => p.destroy() });
    }
    this.cameras.main.shake(70, 0.0035);
    this.hitStop(35);
  }

  private stopUntil = 0;
  private nowT = 0;
  /** Arrêt sur image très court à l'impact (sensation de coup qui « tape »). */
  private hitStop(ms: number): void {
    this.stopUntil = Math.max(this.stopUntil, this.nowT + ms);
  }

  /** Point que la caméra regarde à la place du chef (boss qui surgit), jusqu'à une date. */
  private camFocus: { x: number; y: number; until: number } | null = null;

  /** Frappe lourde (style 3D, Maître Shiba et ses combattants) : onde de choc au sol, éclats et petite secousse. */
  /** Gorille : coup de poing électrique, éclairs en zigzag vers la cible, étincelles et anneau. */
  private punchFx(c: Chef, tx: number, ty: number, color: number): void {
    const g = this.add.graphics().setDepth(1702).setBlendMode(Phaser.BlendModes.ADD);
    const sx = c.x + c.facing * 12;
    const sy = c.y - 22;
    for (let k = 0; k < 3; k++) {
      const pts: Phaser.Math.Vector2[] = [new Phaser.Math.Vector2(sx, sy)];
      for (let i = 1; i <= 5; i++) {
        const t = i / 5;
        pts.push(new Phaser.Math.Vector2(sx + (tx - sx) * t + (Math.random() - 0.5) * 14, sy + (ty - 14 - sy) * t + (Math.random() - 0.5) * 14));
      }
      g.lineStyle(k === 0 ? 4 : 2, k === 0 ? 0xffffff : color, 1).strokePoints(pts);
    }
    g.fillStyle(color, 0.5).fillCircle(tx, ty - 14, 14);
    g.fillStyle(0xffffff, 0.9).fillCircle(tx, ty - 14, 6);
    this.tweens.add({ targets: g, alpha: 0, duration: 200, onComplete: () => g.destroy() });
    this.ringFx(tx, ty - 10, 26, color, 220);
    for (let i = 0; i < 8; i++) {
      const a = Math.random() * Math.PI * 2;
      const p = this.add.image(tx, ty - 14, 'particule').setTint(i % 2 ? color : 0xffffff).setDepth(1702).setBlendMode(Phaser.BlendModes.ADD);
      this.tweens.add({ targets: p, x: tx + Math.cos(a) * 26, y: ty - 14 + Math.sin(a) * 20, alpha: 0, duration: 220, onComplete: () => p.destroy() });
    }
  }

  /** Tigre : tourbillon de flammes autour du chef. */
  private spinFx(c: Chef, color: number): void {
    const cx = c.x;
    const cy = c.y - 14;
    const o = { t: 0 };
    const g = this.add.graphics().setDepth(1700).setBlendMode(Phaser.BlendModes.ADD);
    this.tweens.add({
      targets: o, t: 1, duration: 320, ease: 'Sine.out',
      onUpdate: () => {
        g.clear();
        const a0 = o.t * Math.PI * 2.2;
        for (let k = 0; k < 3; k++) {
          const rr = 28 + k * 6;
          g.lineStyle(10 - k * 3, k === 2 ? 0xffffff : color, (1 - o.t) * (k === 0 ? 0.6 : 1));
          g.beginPath().arc(cx, cy, rr, a0, a0 + Math.PI * 1.2).strokePath();
        }
      },
      onComplete: () => g.destroy(),
    });
    for (let i = 0; i < 10; i++) {
      const a = (Math.PI * 2 * i) / 10;
      const p = this.add.image(cx + Math.cos(a) * 30, cy + Math.sin(a) * 22, 'particule').setTint(i % 2 ? color : 0xffffff).setDepth(1701).setScale(1.5).setBlendMode(Phaser.BlendModes.ADD);
      this.tweens.add({ targets: p, x: cx + Math.cos(a) * 48, y: cy + Math.sin(a) * 34 - 8, alpha: 0, duration: 340, onComplete: () => p.destroy() });
    }
  }

  /** Mlle Noisette : deux coups de hachoir croisés (un X), rapides. */
  private doubleFx(c: Chef, ang: number, color: number): void {
    const x = c.x;
    const y = c.y - 16;
    this.flameCrescent(x, y, ang - 0.35, c.def.range + 2, 0.7, color);
    this.time.delayedCall(90, () => this.flameCrescent(x, y, ang + 0.35, c.def.range + 2, 0.7, color));
  }

  private slamFx(x: number, y: number, r: number, color: number, skin?: string): void {
    if (skin === 'skin_taureau') {
      // hachoir enflammé : colonne de flammes qui jaillit du sol
      for (let i = 0; i < 14; i++) {
        const p = this.add.image(x + (Math.random() - 0.5) * r * 1.4, y - 2, 'flammeche').setTint([0xff3b1e, 0xff8a1e, 0xffc533][i % 3]).setDepth(1701).setScale(0.9 + Math.random() * 0.8).setBlendMode(Phaser.BlendModes.ADD).setOrigin(0.5, 1);
        this.tweens.add({ targets: p, y: y - 24 - Math.random() * 26, scaleY: p.scaleY * 1.5, alpha: 0, duration: 380 + Math.random() * 220, ease: 'Sine.out', onComplete: () => p.destroy() });
      }
    } else if (skin === 'skin_ours') {
      // marteau de glace : éclats de glace qui jaillissent
      for (let i = 0; i < 10; i++) {
        const a = -Math.PI * (0.1 + 0.8 * Math.random());
        const s = this.add.image(x, y - 4, 'etincelle').setTint(0xbff0ff).setDepth(1701).setScale(0.35).setAngle(Math.random() * 90);
        this.tweens.add({ targets: s, x: x + Math.cos(a) * r * 1.3, y: y - 4 + Math.sin(a) * r, angle: '+=180', alpha: 0, duration: 420, ease: 'Quad.out', onComplete: () => s.destroy() });
      }
    }
    const fire = Phaser.Display.Color.ValueToColor(color);
    const ring = this.add.graphics({ x, y }).setDepth(1700).setBlendMode(Phaser.BlendModes.ADD);
    const o = { t: 0 };
    this.tweens.add({
      targets: o, t: 1, duration: 320, ease: 'Cubic.out',
      onUpdate: () => {
        const rr = r * (0.3 + o.t * 1.1);
        ring.clear();
        ring.lineStyle(10 * (1 - o.t) + 2, color, 0.9 * (1 - o.t)).strokeEllipse(0, 0, rr * 2, rr * 1.1);
        ring.lineStyle(4 * (1 - o.t) + 1, fire.clone().lighten(30).color, 1 - o.t).strokeEllipse(0, 0, rr * 1.6, rr * 0.85);
        ring.fillStyle(color, 0.25 * (1 - o.t)).fillEllipse(0, 0, rr * 1.4, rr * 0.75);
      },
      onComplete: () => ring.destroy(),
    });
    for (let i = 0; i < 12; i++) {
      const a = (Math.PI * 2 * i) / 12 + Math.random() * 0.3;
      const p = this.add.image(x, y - 4, 'particule').setTint(i % 2 ? color : 0xfff4c0).setDepth(1701).setScale(1.5).setBlendMode(Phaser.BlendModes.ADD);
      this.tweens.add({ targets: p, x: x + Math.cos(a) * r * 1.2, y: y - 4 + Math.sin(a) * r * 0.6 - 10, alpha: 0, scale: 0.2, duration: 300 + Math.random() * 150, onComplete: () => p.destroy() });
    }
    this.cameras.main.shake(90, 0.004);
  }

  /** Croissant de flammes (style 3D) : plusieurs couches du rouge au blanc, épaisses au milieu, pointues aux bouts. */
  private flameCrescent(x: number, y: number, ang: number, R: number, spread: number, color: number): void {
    const fire = [0xa8160a, 0xf0400f, 0xff8a1e, 0xffc23a, 0xfff4c0];
    const c = Phaser.Display.Color.IntegerToColor(color);
    const fireLike = c.red > 200 && c.green < 190 && c.blue < 120;
    const pal = fireLike ? fire : [
      Phaser.Display.Color.ValueToColor(color).darken(45).color, Phaser.Display.Color.ValueToColor(color).darken(15).color, color,
      Phaser.Display.Color.ValueToColor(color).lighten(25).color, 0xffffff,
    ];
    const layers: [number, number, number][] = [[pal[0], 1, 0.5], [pal[1], 0.82, 0.95], [pal[2], 0.62, 1], [pal[3], 0.4, 1], [pal[4], 0.18, 1]];
    const thick = 27; // large comme sur la vidéo de Rudy
    const glow = this.add.graphics().setDepth(1699).setBlendMode(Phaser.BlendModes.ADD);
    const g = this.add.graphics().setDepth(1700);
    const a0 = ang - spread;
    const a1 = ang + spread;
    const N = 22;
    const draw = (t: number) => {
      g.clear();
      glow.clear();
      const end = a0 + (a1 - a0) * Math.min(1, t * 2.2); // déploiement
      const start = a0 + (a1 - a0) * Math.max(0, t * 1.6 - 0.6); // la queue rattrape la tête
      if (end - start < 0.02) return;
      const crescent = (gr: Phaser.GameObjects.Graphics, col: number, k: number, alpha: number, extra = 0) => {
        const pts: Phaser.Math.Vector2[] = [];
        for (let i = 0; i <= N; i++) {
          const a = start + ((end - start) * i) / N;
          const u = (a - a0) / (a1 - a0);
          const w = Math.sin(Math.PI * u) * thick;
          pts.push(new Phaser.Math.Vector2(x + Math.cos(a) * (R + extra - (1 - k) * w * 0.25), y + Math.sin(a) * (R + extra - (1 - k) * w * 0.25)));
        }
        for (let i = N; i >= 0; i--) {
          const a = start + ((end - start) * i) / N;
          const u = (a - a0) / (a1 - a0);
          const w = Math.sin(Math.PI * u) * thick * k + extra;
          const rr = R - (1 - k) * Math.sin(Math.PI * u) * thick * 0.25 - w;
          pts.push(new Phaser.Math.Vector2(x + Math.cos(a) * rr, y + Math.sin(a) * rr));
        }
        gr.fillStyle(col, alpha).fillPoints(pts, true);
      };
      crescent(glow, pal[1], 1, 0.35 * (1 - t), 6);
      for (const [col, k, al] of layers) crescent(g, col, k, al);
    };
    const o = { t: 0 };
    this.tweens.add({
      targets: o, t: 1, duration: 300, ease: 'Sine.out',
      onUpdate: () => {
        draw(o.t);
        g.setAlpha(o.t < 0.55 ? 1 : 1 - (o.t - 0.55) / 0.45);
      },
      onComplete: () => {
        g.destroy();
        glow.destroy();
      },
    });
    // braises qui s'envolent du croissant
    for (let i = 0; i < 9; i++) {
      const a = a0 + Math.random() * (a1 - a0);
      const px = x + Math.cos(a) * (R - 6);
      const py = y + Math.sin(a) * (R - 6);
      const p = this.add.image(px, py, 'particule').setTint(pal[1 + (i % 3)]).setDepth(1701).setScale(1.4).setBlendMode(Phaser.BlendModes.ADD);
      this.tweens.add({ targets: p, x: px + Math.cos(a) * 18, y: py + Math.sin(a) * 18 - 12, alpha: 0, scale: 0.2, delay: 60 + Math.random() * 120, duration: 300 + Math.random() * 200, onComplete: () => p.destroy() });
    }
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
