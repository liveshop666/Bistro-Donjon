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
