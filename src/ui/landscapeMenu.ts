import Phaser from 'phaser';
import { H, W } from '../core/constants';
import { landscapeWanted } from '../core/layout';

/**
 * Écrans de menu (titre, boutique, compte, règles, duel) quand le téléphone est en paysage.
 * La page portrait (360 x 640) est coupée en deux colonnes posées côte à côte : le haut à gauche,
 * le bas à droite. Tout reste à la même taille qu'en portrait et l'écran large est rempli.
 * Les fenêtres (pause, missions, cadeaux, clavier…) s'affichent en entier au centre, par-dessus.
 */
interface Cams {
  left: Phaser.Cameras.Scene2D.Camera;
  right: Phaser.Cameras.Scene2D.Camera;
  modal: Phaser.Cameras.Scene2D.Camera;
  split: number;
}
const CAMS = new WeakMap<Phaser.Scene, Cams>();
const MODAL_DEPTH = 3000;

type Obj = Phaser.GameObjects.GameObject & Partial<Phaser.GameObjects.Components.Depth & Phaser.GameObjects.Components.Visible> & {
  getBounds?: () => Phaser.Geom.Rectangle;
};

const isModal = (o: Obj) => (o.depth ?? 0) >= MODAL_DEPTH;

/** Rectangle occupé par un objet. Les boutons sont des conteneurs dont le fond est dessiné : on prend leur taille déclarée. */
function boundsOf(o: Obj): Phaser.Geom.Rectangle {
  const c = o as unknown as Phaser.GameObjects.Container;
  if (o.type === 'Container' && c.width > 0) return new Phaser.Geom.Rectangle(c.x - c.width / 2, c.y - c.height / 2, c.width, c.height);
  return o.getBounds ? o.getBounds() : new Phaser.Geom.Rectangle();
}

/** Ligne de coupe qui ne tranche aucun bouton ni texte, la plus proche du milieu. */
function autoSplit(scene: Phaser.Scene): number {
  const boxes: Phaser.Geom.Rectangle[] = [];
  for (const o of scene.children.list as Obj[]) {
    if (isModal(o) || o.visible === false || !o.getBounds) continue;
    const b = boundsOf(o);
    if (b.height >= 300 || b.height <= 0) continue; // fonds d'écran
    boxes.push(b);
  }
  let best = H / 2;
  let bestScore = Infinity;
  for (let y = 240; y <= 400; y += 2) {
    const cuts = boxes.filter((b) => b.top < y - 1 && b.bottom > y + 1).length;
    // éviter aussi de couper juste au ras d'un élément (les cadres dessinés autour ne sont pas mesurables)
    const near = boxes.filter((b) => Math.abs(b.top - y) < 4 || Math.abs(b.bottom - y) < 4).length;
    const score = cuts * 1000 + near * 20 + Math.abs(y - H / 2);
    if (score < bestScore) {
      bestScore = score;
      best = y;
    }
  }
  return best;
}

/** À appeler à la fin du create() de chaque écran de menu. */
export function setupLandscapeMenu(scene: Phaser.Scene, fixedSplit?: number, bg = 0x0c0c18): void {
  let alive = true;
  const apply = () => {
    if (!alive) return;
    const land = landscapeWanted();
    const old = CAMS.get(scene);
    if (old) {
      scene.cameras.remove(old.left);
      scene.cameras.remove(old.right);
      scene.cameras.remove(old.modal);
      CAMS.delete(scene);
    }
    const main = scene.cameras.main;
    if (!land) {
      if (scene.scale.width !== W || scene.scale.height !== H) {
        scene.scale.setGameSize(W, H);
        scene.game.events.emit('refit');
      }
      main.setViewport(0, 0, W, H).setScroll(0, 0).setBackgroundColor('rgba(0,0,0,0)');
      for (const o of scene.children.list) o.cameraFilter = 0;
      return;
    }
    const split = fixedSplit ?? autoSplit(scene);
    const ch = Math.max(split, H - split);
    const ratio = window.innerWidth / Math.max(1, window.innerHeight);
    const cw = Math.max(2 * W + 16, Math.round(ch * Math.min(2.4, ratio)));
    if (scene.scale.width !== cw || scene.scale.height !== ch) {
      scene.scale.setGameSize(cw, ch);
      scene.game.events.emit('refit');
    }
    const gap = Math.min(40, cw - 2 * W);
    const x1 = Math.round(cw / 2 - W - gap / 2);
    const x2 = Math.round(cw / 2 + gap / 2);
    // la caméra principale ne sert plus que de fond (elle regarde ailleurs)
    main.setViewport(0, 0, cw, ch).setScroll(-100000, -100000).setBackgroundColor(bg);
    const left = scene.cameras.add(x1, Math.round((ch - split) / 2), W, split).setScroll(0, 0);
    const right = scene.cameras.add(x2, Math.round((ch - (H - split)) / 2), W, H - split).setScroll(0, split);
    const modal = scene.cameras.add(0, 0, cw, ch);
    CAMS.set(scene, { left, right, modal, split });
  };

  /** Chaque objet n'est dessiné que par sa caméra ; une fenêtre ouverte assombrit et bloque le reste. */
  const filter = () => {
    const c = CAMS.get(scene);
    if (!c) return;
    const all = scene.cameras.main.id | c.left.id | c.right.id | c.modal.id;
    const page = all & ~(c.left.id | c.right.id);
    const top = all & ~c.modal.id;
    let box: Phaser.Geom.Rectangle | null = null;
    for (const o of scene.children.list as Obj[]) {
      const m = isModal(o);
      o.cameraFilter = m ? top : page;
      if (m && o.visible !== false && o.getBounds) {
        const b = boundsOf(o);
        if (b.width >= W && b.height >= H) continue; // voile sombre plein écran
        box = box ? Phaser.Geom.Rectangle.Union(box, b, box) : Phaser.Geom.Rectangle.Clone(b);
      }
    }
    const open = !!box;
    c.left.setAlpha(open ? 0.3 : 1).inputEnabled = !open;
    c.right.setAlpha(open ? 0.3 : 1).inputEnabled = !open;
    c.modal.inputEnabled = open;
    if (box) {
      c.modal.setZoom(Math.min(1, (c.modal.height - 4) / (box.height + 12)));
      c.modal.centerOn(W / 2, box.centerY);
    }
  };

  apply();
  scene.events.on('prerender', filter);
  const relayout = () => [0, 300, 1000].forEach((ms) => window.setTimeout(apply, ms));
  window.addEventListener('resize', relayout);
  scene.events.once('shutdown', () => {
    alive = false;
    CAMS.delete(scene);
    window.removeEventListener('resize', relayout);
    scene.events.off('prerender', filter);
  });
}

/** Point de l'écran -> point de la page portrait (identique en portrait ; en paysage selon la colonne touchée). */
export function pageToWorld(scene: Phaser.Scene, x: number, y: number): { x: number; y: number } {
  const c = CAMS.get(scene);
  if (!c) return { x, y };
  const cam = c.right.worldView && x >= c.right.x ? c.right : c.left;
  const p = cam.getWorldPoint(x, y);
  return { x: p.x, y: p.y };
}

/** Hauteur du canvas des écrans de menu dessinés exprès pour le paysage (titre, boutique). */
export const MENU_LH = 360;

/** Redémarre l'écran quand on tourne le téléphone (portrait <-> paysage ou autre largeur), pour qu'il se redessine. */
function restartOnRotate(scene: Phaser.Scene, land: boolean, width: number, beforeRestart?: () => void): void {
  let alive = true;
  const check = () => {
    if (!alive) return;
    const nowLand = landscapeWanted();
    if (nowLand === land && (!land || landscapeMenuWidth() === width)) return;
    alive = false;
    beforeRestart?.();
    scene.scene.restart();
  };
  const relayout = () => [0, 300, 1000].forEach((ms) => window.setTimeout(check, ms));
  window.addEventListener('resize', relayout);
  scene.events.once('shutdown', () => {
    alive = false;
    window.removeEventListener('resize', relayout);
  });
}

export function landscapeMenuWidth(): number {
  const ratio = window.innerWidth / Math.max(1, window.innerHeight);
  return Math.round(MENU_LH * Math.min(2.4, Math.max(1.6, ratio)));
}

/** Écran de menu en portrait (360 x 640) qui se redessine en paysage quand on tourne le téléphone. */
export function portraitMenu(scene: Phaser.Scene, beforeRestart?: () => void): void {
  if (scene.scale.width !== W || scene.scale.height !== H) {
    scene.scale.setGameSize(W, H);
    scene.game.events.emit('refit');
  }
  scene.cameras.main.setViewport(0, 0, W, H);
  restartOnRotate(scene, false, W, beforeRestart);
}

/**
 * Écran de menu dessiné exprès pour le paysage : canvas large (MENU_LH de haut). Les fenêtres (openModal, clavier),
 * construites en coordonnées portrait, s'affichent en entier au centre ; le reste s'assombrit et ne réagit plus.
 * Renvoie la taille de l'écran.
 */
export function landscapeMenu(scene: Phaser.Scene, beforeRestart?: () => void): { w: number; h: number } {
  const w = landscapeMenuWidth();
  const h = MENU_LH;
  if (scene.scale.width !== w || scene.scale.height !== h) {
    scene.scale.setGameSize(w, h);
    scene.game.events.emit('refit');
  }
  const main = scene.cameras.main.setViewport(0, 0, w, h).setScroll(0, 0);
  const modal = scene.cameras.add(0, 0, w, h);
  const filter = () => {
    let box: Phaser.Geom.Rectangle | null = null;
    for (const o of scene.children.list as Obj[]) {
      const m = isModal(o);
      o.cameraFilter = m ? main.id : modal.id;
      if (m && o.visible !== false) {
        const b = boundsOf(o);
        if (b.width >= W && b.height >= H) continue;
        if (b.width > 0) box = box ? Phaser.Geom.Rectangle.Union(box, b, box) : Phaser.Geom.Rectangle.Clone(b);
      }
    }
    main.setAlpha(box ? 0.3 : 1).inputEnabled = !box;
    modal.inputEnabled = !!box;
    if (box) {
      modal.setZoom(Math.min(1, (h - 4) / (box.height + 12)));
      modal.centerOn(W / 2, box.centerY);
    }
  };
  scene.events.on('prerender', filter);
  scene.events.once('shutdown', () => scene.events.off('prerender', filter));
  restartOnRotate(scene, true, w, beforeRestart);
  return { w, h };
}
