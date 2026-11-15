/**
 * Écran en paysage (téléphone tourné) pendant une partie : le canvas devient large et la map le remplit,
 * la caméra suit le chef. Le canvas paysage fait 640 de large et une hauteur à la forme de l'écran :
 * c'est le canvas portrait tourné, donc les personnages gardent exactement la même taille qu'en portrait.
 */
export const LW = 640;

/** Vrai si l'écran est nettement plus large que haut. */
export function landscapeWanted(): boolean {
  return window.innerWidth > window.innerHeight * 1.1;
}

/** Largeur du canvas en paysage. */
export function landscapeWidth(): number {
  return LW;
}

/** Hauteur du canvas en paysage, selon la forme de l'écran (288 pour un téléphone 20:9, 360 pour du 16:9). */
export function landscapeHeight(): number {
  const ratio = window.innerHeight / Math.max(1, window.innerWidth);
  return Math.round(Math.min(400, Math.max(266, LW * ratio)));
}

/**
 * Finesse du rendu : le canvas a RES fois plus de pixels que la page (360 x 640 en portrait) et chaque caméra
 * est zoomée RES fois. Toutes les positions du jeu restent les mêmes.
 * Qualité maximale tout le temps (décision de Rudy, 15/11 : « on ne choisit pas la qualité ») : RES suit la finesse
 * de l'écran (pixels réels du téléphone), de 2 à 4. Il n'y a plus de réglage « fluide ».
 */
export const RES = Math.min(4, Math.max(2, Math.round((window.devicePixelRatio || 1) * 1.25)));

/**
 * Règle une caméra : elle occupe le rectangle (vx, vy, vw, vh) de l'écran (en coordonnées de page)
 * et montre la page à partir du point (sx, sy), avec un zoom en plus de RES.
 */
export function pageCam<T extends { setViewport: (x: number, y: number, w: number, h: number) => T; setZoom: (z: number) => T; centerOn: (x: number, y: number) => T }>(
  cam: T, vx: number, vy: number, vw: number, vh: number, sx = 0, sy = 0, zoom = 1,
): T {
  cam.setViewport(Math.round(vx * RES), Math.round(vy * RES), Math.round(vw * RES), Math.round(vh * RES));
  cam.setZoom(RES * zoom);
  return cam.centerOn(sx + vw / (2 * zoom), sy + vh / (2 * zoom));
}
