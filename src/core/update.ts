/**
 * Mise à jour automatique de la version en ligne.
 * Sur Android, « fermer » l'appli la met souvent juste en veille : en revenant dessus, elle reprend la page déjà
 * chargée. On compare donc l'identifiant de la version chargée avec celui publié en ligne (version.json) et on
 * recharge la page s'il a changé. Jamais pendant une partie.
 */
declare const __BUILD_ID__: string;
declare const __BUILD_LABEL__: string;

/** Date et heure de fabrication de la version chargée, ex. « 11/11 16:42 » (affichée dans le jeu). */
export const BUILD_LABEL: string = __BUILD_LABEL__;

const TRIED_KEY = 'bistro-donjon-maj';

/** Recharge le jeu si une version plus récente est en ligne. Renvoie true si un rechargement est lancé. */
export async function reloadIfUpdated(): Promise<boolean> {
  if (import.meta.env.DEV) return false;
  try {
    const res = await fetch(`./version.json?t=${Date.now()}`, { cache: 'no-store' });
    if (!res.ok) return false;
    const online = (await res.json()) as { id?: string };
    if (typeof online.id !== 'string' || online.id === __BUILD_ID__) return false;
    // garde-fou : on ne recharge qu'une fois pour une même version, pour ne jamais tourner en boucle
    if (sessionStorage.getItem(TRIED_KEY) === online.id) return false;
    sessionStorage.setItem(TRIED_KEY, online.id);
    location.reload();
    return true;
  } catch {
    return false; // hors ligne ou stockage indisponible : on garde la version chargée
  }
}
