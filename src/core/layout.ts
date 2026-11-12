/**
 * Écran en paysage (téléphone tourné) : pendant une partie, le canvas devient large.
 * La carte (360 de large) reste au centre et la caméra la suit verticalement ;
 * la vie et les commandes vont dans le bandeau de gauche, les boutons dans celui de droite.
 * Les menus restent en portrait (centrés avec des bandes noires).
 */
export const LH = 480;

/** Vrai si l'écran est nettement plus large que haut. */
export function landscapeWanted(): boolean {
  return window.innerWidth > window.innerHeight * 1.1;
}

/** Largeur du canvas en paysage, selon la forme de l'écran (16:9 à 21:9). */
export function landscapeWidth(): number {
  const ratio = window.innerWidth / Math.max(1, window.innerHeight);
  return Math.round(Math.min(2.4, Math.max(1.6, ratio)) * LH);
}
