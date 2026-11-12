import Phaser from 'phaser';

const JOY_RADIUS = 34;
const DEADZONE = 5;
/** Vitesse minimale d'un glissement pour trancher (px de jeu par ms). */
const SLICE_SPEED = 0.45;

interface Track {
  x: number;
  y: number;
  t: number;
}

/**
 * Contrôles tactiles à une main :
 *  - joystick flottant : le premier doigt posé déplace le chef ;
 *  - tranchage : tout glissement rapide (même doigt, autre doigt ou stylet) coupe ce qu'il traverse.
 * Clavier (flèches / ZQSD / WASD) pris en charge pour les tests sur ordinateur.
 */
export class TouchController {
  dir = new Phaser.Math.Vector2();
  enabled = true;
  onSlice: (x1: number, y1: number, x2: number, y2: number) => void = () => {};

  private joyId = -1;
  private origin = new Phaser.Math.Vector2();
  private touchDir = new Phaser.Math.Vector2();
  private tracks = new Map<number, Track>();
  private base: Phaser.GameObjects.Image;
  private thumb: Phaser.GameObjects.Image;
  private trail: Phaser.GameObjects.Graphics;
  private segs: { x1: number; y1: number; x2: number; y2: number; life: number }[] = [];
  private keys: Record<string, Phaser.Input.Keyboard.Key> = {};

  constructor(scene: Phaser.Scene, private isUi: (x: number, y: number) => boolean) {
    scene.input.addPointer(2);
    this.base = scene.add.image(0, 0, 'joy_base').setDepth(2500).setVisible(false).setAlpha(0.7);
    this.thumb = scene.add.image(0, 0, 'joy_thumb').setDepth(2501).setVisible(false).setAlpha(0.85);
    this.trail = scene.add.graphics().setDepth(1900);

    scene.input.on('pointerdown', this.down, this);
    scene.input.on('pointermove', this.moved, this);
    scene.input.on('pointerup', this.up, this);
    scene.input.on('pointerupoutside', this.up, this);
    if (scene.input.keyboard) {
      this.keys = scene.input.keyboard.addKeys('UP,DOWN,LEFT,RIGHT,W,A,S,D,Z,Q') as Record<string, Phaser.Input.Keyboard.Key>;
    }
  }

  private down(p: Phaser.Input.Pointer): void {
    if (!this.enabled || this.isUi(p.x, p.y)) return;
    this.tracks.set(p.id, { x: p.x, y: p.y, t: p.downTime });
    if (this.joyId === -1) {
      this.joyId = p.id;
      this.origin.set(p.x, p.y);
      this.base.setPosition(p.x, p.y).setVisible(true);
      this.thumb.setPosition(p.x, p.y).setVisible(true);
    }
  }

  private moved(p: Phaser.Input.Pointer): void {
    const tr = this.tracks.get(p.id);
    if (!this.enabled || !tr || !p.isDown) return;
    const now = p.event.timeStamp;
    const dt = Math.max(1, now - tr.t);
    const len = Math.hypot(p.x - tr.x, p.y - tr.y);
    if (len >= 3) {
      if (len / dt >= SLICE_SPEED) {
        this.segs.push({ x1: tr.x, y1: tr.y, x2: p.x, y2: p.y, life: 1 });
        this.onSlice(tr.x, tr.y, p.x, p.y);
      }
      tr.x = p.x;
      tr.y = p.y;
      tr.t = now;
    }
    if (p.id === this.joyId) {
      const v = new Phaser.Math.Vector2(p.x - this.origin.x, p.y - this.origin.y);
      const d = v.length();
      if (d > JOY_RADIUS) {
        // le joystick suit le pouce
        this.origin.add(v.clone().scale((d - JOY_RADIUS) / d));
        v.setLength(JOY_RADIUS);
        this.base.setPosition(this.origin.x, this.origin.y);
      }
      this.thumb.setPosition(this.origin.x + v.x, this.origin.y + v.y);
      if (d < DEADZONE) this.touchDir.set(0, 0);
      else this.touchDir.copy(v).scale(1 / JOY_RADIUS);
    }
  }

  private up(p: Phaser.Input.Pointer): void {
    this.tracks.delete(p.id);
    if (p.id === this.joyId) this.release();
  }

  private release(): void {
    this.joyId = -1;
    this.touchDir.set(0, 0);
    this.base.setVisible(false);
    this.thumb.setVisible(false);
  }

  /** Vrai pour le joystick et la traînée de doigt (dessinés en coordonnées d'écran). */
  owns(o: Phaser.GameObjects.GameObject): boolean {
    return o === this.base || o === this.thumb || o === this.trail;
  }

  setEnabled(on: boolean): void {
    this.enabled = on;
    if (!on) {
      this.release();
      this.tracks.clear();
      this.dir.set(0, 0);
    }
  }

  update(dt: number): void {
    const k = this.keys;
    const kx = (k.RIGHT?.isDown || k.D?.isDown ? 1 : 0) - (k.LEFT?.isDown || k.A?.isDown || k.Q?.isDown ? 1 : 0);
    const ky = (k.DOWN?.isDown || k.S?.isDown ? 1 : 0) - (k.UP?.isDown || k.W?.isDown || k.Z?.isDown ? 1 : 0);
    if (!this.enabled) this.dir.set(0, 0);
    else if (kx || ky) this.dir.set(kx, ky).normalize();
    else this.dir.copy(this.touchDir);

    this.trail.clear();
    for (const s of this.segs) {
      s.life -= dt * 5;
      this.trail.lineStyle(5 * s.life, 0xbfefff, s.life * 0.8).lineBetween(s.x1, s.y1, s.x2, s.y2);
      this.trail.lineStyle(2 * s.life, 0xffffff, s.life).lineBetween(s.x1, s.y1, s.x2, s.y2);
    }
    this.segs = this.segs.filter((s) => s.life > 0);
  }
}
