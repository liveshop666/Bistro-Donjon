import Phaser from 'phaser';
import { artScale, CHEF_FRAMES, ChefDef, is3d, PowerId, uiScale } from '../core/constants';
import { emptyInventory, Inventory, Order } from '../core/RecipeManager';
import anchors from '../core/spriteAnchors.json';

const ANCHORS = anchors as Record<string, number>;
const ATTACK_ANIM = 0.28;

/** Le chef jouable : déplacement, vie, inventaire, pouvoirs temporaires, animations. */
export class Chef {
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  facing = 1;
  aim = new Phaser.Math.Vector2(0, 1);
  invuln = 0;
  cooldown = 0;
  /** Jauge d'ultime, 0..100. */
  ult = 0;
  /** Durée restante de l'ultime actif (Tornade Flambée). */
  ultActive = 0;
  inv: Inventory = emptyInventory();
  dish: Order | null = null;
  powers: Record<PowerId, number> = { vitesse: 0, feu: 0, regen: 0, bouclier: 0 };
  moving = false;
  /** Vrai tant que le chef découpe sur la planche (animation de couteau). */
  chopping = false;

  private sprite: Phaser.GameObjects.Image;
  private shadow: Phaser.GameObjects.Ellipse;
  private dishIcon: Phaser.GameObjects.Image;
  private knife: Phaser.GameObjects.Image;
  private walkT = 0;
  private lunge = 0;
  private attackT = 0;
  private frames: { idle: string[]; walk: string[]; attack: string[] };

  /** @param skin costume de boutique : une seule image, animée par code */
  constructor(scene: Phaser.Scene, public def: ChefDef, x: number, y: number, private skin: string | null = null) {
    this.x = x;
    this.y = y;
    this.hp = this.maxHp = def.hp;
    // costume : une seule image ; en style 3D, sa pose d'attaque quand elle existe
    this.frames = skin ? { idle: [skin], walk: [skin], attack: [is3d(skin) && scene.textures.exists(skin + '_atk') ? skin + '_atk' : skin] } : CHEF_FRAMES[def.id];
    this.shadow = scene.add.ellipse(x, y, 26, 8, 0x000000, 0.3);
    this.sprite = scene.add.image(x, y, this.frames.idle[0]).setOrigin(0.5, 1);
    this.dishIcon = scene.add.image(x, y, 'plat').setVisible(false).setScale(uiScale('plat'));
    this.knife = scene.add.image(x, y, 'couteau').setVisible(false);
  }

  /** @param blocked vrai si un point est dans un décor : le chef glisse le long au lieu de le traverser */
  move(dir: Phaser.Math.Vector2, speed: number, dt: number, bounds: Phaser.Geom.Rectangle,
    blocked: (x: number, y: number) => boolean = () => false): void {
    this.moving = dir.lengthSq() > 0.01;
    if (this.moving) {
      const nx = Phaser.Math.Clamp(this.x + dir.x * speed * dt, bounds.left, bounds.right);
      const ny = Phaser.Math.Clamp(this.y + dir.y * speed * dt, bounds.top, bounds.bottom);
      const stuck = blocked(this.x, this.y); // déjà dans un décor (ne devrait pas arriver) : on le laisse sortir
      if (stuck || !blocked(nx, this.y)) this.x = nx;
      if (stuck || !blocked(this.x, ny)) this.y = ny;
      if (Math.abs(dir.x) > 0.15) this.facing = dir.x > 0 ? 1 : -1;
      this.walkT += dt * (speed / 12);
    }
  }

  /** Oriente le chef vers une cible et joue l'animation d'attaque. */
  strike(tx: number, ty: number): void {
    this.hits++;
    this.aim.set(tx - this.x, ty - this.y).normalize();
    if (Math.abs(this.aim.x) > 0.15) this.facing = this.aim.x > 0 ? 1 : -1;
    this.lunge = 1;
    this.attackT = ATTACK_ANIM;
  }

  hurt(n: number): boolean {
    if (this.invuln > 0) return false;
    this.hp = Math.max(0, this.hp - n);
    this.invuln = 0.9;
    return true;
  }

  heal(n: number): void {
    this.hp = Math.min(this.maxHp, this.hp + n);
  }

  addUlt(n: number): void {
    this.ult = Math.min(100, this.ult + n);
  }

  private frame(time: number): string {
    const f = this.frames;
    if (this.ultActive > 0) return f.attack[f.attack.length - 1];
    if (this.attackT > 0) {
      const p = 1 - this.attackT / ATTACK_ANIM;
      return f.attack[Math.min(f.attack.length - 1, Math.floor(p * f.attack.length))];
    }
    if (this.chopping) return f.attack[Math.floor(time / 130) % 2];
    if (this.moving) return f.walk[Math.floor(this.walkT) % f.walk.length];
    return f.idle[0];
  }

  /**
   * Mouvement d'attaque en style 3D, selon l'arme (demande de Rudy, 15/11) :
   * swing = grand coup de poêle ; slam = arme levée puis abattue (rouleau, hachoir géant, marteau) ;
   * punch = coups de poing alternés (poêles-gants du Gorille) ; spin = tourbillon (nunchakus du Tigre) ;
   * double = deux coups croisés rapides (hachoirs de Mlle Noisette).
   */
  style: 'swing' | 'slam' | 'punch' | 'spin' | 'double' = 'swing';
  private hits = 0;

  updateVisual(dt: number, time: number): void {
    this.invuln = Math.max(0, this.invuln - dt);
    this.lunge = Math.max(0, this.lunge - dt * 7);
    this.attackT = Math.max(0, this.attackT - dt);
    const key = this.frame(time);
    const anchor = is3d(key) || key.endsWith('_atk') ? 0.5 : (ANCHORS[key] ?? 0.5);
    // image 3D : une seule image, le coup de poêle est animé par le code (le chef pivote vers sa cible)
    // style 3D (vidéo de Rudy) : le chef arme son coup en levant la poêle (penché en arrière), puis frappe d'un grand
    // mouvement vers l'avant et revient ; il s'étire en armant et s'écrase à l'impact
    let swing = 0;
    let sx = 1;
    let sy = 1;
    let lift = 0;
    let lungeX = 0;
    if (is3d(key) && this.attackT > 0 && this.style !== 'swing') {
      const p = 1 - this.attackT / ATTACK_ANIM;
      const dir = this.facing < 0 ? -1 : 1;
      const bump = (c: number, w: number) => Math.max(0, 1 - Math.abs(p - c) / w); // pic autour de p = c
      if (this.style === 'slam') {
        // arme levée bien haut (penché en arrière, on décolle un peu), puis abattue d'un coup : gros écrasement
        if (p < 0.4) {
          const u = p / 0.4;
          swing = -38 * u * dir;
          lift = 5 * u;
          sy = 1 + 0.1 * u;
          sx = 1 - 0.06 * u;
        } else {
          const u = Math.min(1, (p - 0.4) / 0.2);
          swing = (-38 + 66 * u) * (1 - Math.max(0, p - 0.75) / 0.25) * dir;
          lift = 5 * (1 - u);
          const k = bump(0.62, 0.2);
          sx = 1 + 0.18 * k;
          sy = 1 - 0.16 * k;
        }
      } else if (this.style === 'punch') {
        // un poing puis l'autre : petit élan vers l'avant, le corps pivote d'un côté puis de l'autre
        const side = this.hits % 2 ? 1 : -1;
        const k = bump(0.4, 0.4);
        lungeX = 7 * k * dir;
        swing = 12 * side * k * dir;
        sx = 1 + 0.1 * k;
        sy = 1 - 0.06 * k;
      } else if (this.style === 'spin') {
        // tourbillon complet avec les nunchakus
        swing = 360 * Math.min(1, p * 1.3) * dir;
        const k = bump(0.5, 0.5);
        sx = 1 + 0.08 * k;
        sy = 1 - 0.05 * k;
      } else {
        // deux coups croisés : à gauche puis à droite
        swing = (p < 0.5 ? -24 * Math.sin((p / 0.5) * Math.PI) : 24 * Math.sin(((p - 0.5) / 0.5) * Math.PI)) * dir;
        const k = bump(0.25, 0.2) + bump(0.75, 0.2);
        sx = 1 + 0.08 * k;
        sy = 1 - 0.06 * k;
      }
    } else if (is3d(key) && this.attackT > 0) {
      const p = 1 - this.attackT / ATTACK_ANIM;
      const dir = this.facing < 0 ? -1 : 1;
      if (p < 0.3) {
        const u = p / 0.3;
        swing = -28 * u * dir;
        sy = 1 + 0.08 * u;
        sx = 1 - 0.05 * u;
      } else {
        const u = (p - 0.3) / 0.7;
        swing = (-28 + 62 * Math.sin(Math.min(1, u * 1.6) * Math.PI / 2)) * (1 - Math.max(0, u - 0.6) / 0.4) * dir;
        const hitU = Math.max(0, 1 - Math.abs(u - 0.35) / 0.25);
        sx = 1 + 0.12 * hitU;
        sy = 1 - 0.1 * hitU;
      }
    }
    const bob = this.moving ? Math.abs(Math.sin(this.walkT * Math.PI)) * 2 : Math.sin(time / 300) * 0.8;
    const flip = this.ultActive > 0 ? Math.floor(time / 70) % 2 === 0 : this.facing < 0;
    this.sprite
      .setTexture(key)
      .setFlipX(flip)
      .setOrigin(flip ? 1 - anchor : anchor, 1)
      .setPosition(Math.round(this.x + this.aim.x * this.lunge * 5 + lungeX), Math.round(this.y - bob - lift + this.aim.y * this.lunge * 5))
      .setScale(artScale(key) * sx, artScale(key) * sy)
      .setAngle(swing || ((this.skin || is3d(key)) && this.moving ? Math.sin(this.walkT * Math.PI) * 5 : 0))
      .setAlpha(this.invuln > 0 && Math.floor(time / 80) % 2 === 0 ? 0.35 : 1)
      .setDepth(this.y);
    this.shadow.setPosition(this.x, this.y - 1).setDepth(this.y - 1);
    this.dishIcon
      .setVisible(this.dish !== null)
      .setPosition(this.x, this.y - 54 + Math.sin(time / 150) * 1.5)
      .setDepth(this.y + 1);
    // couteau de cuisine qui hache sur la planche
    const chop = Math.abs(Math.sin(time / 65));
    this.knife
      .setVisible(this.chopping)
      .setPosition(this.x + this.facing * 15, this.y - 12 - chop * 9)
      .setAngle(this.facing * (150 + chop * 35))
      .setDepth(this.y + 2);
  }
}
