/**
 * Achats intégrés (argent réel) — NON BRANCHÉS.
 *
 * La boutique affiche déjà les prix en euros, mais aucun paiement n'est possible tant que
 * Google Play Billing n'est pas connecté. Pour l'activer :
 *  1. créer les produits dans la Play Console (identifiants = `id` des articles de SHOP) ;
 *  2. installer un plugin Capacitor d'achats intégrés (ex. RevenueCat ou cordova-plugin-purchase) ;
 *  3. implémenter `buy` ci-dessous, passer `available` à true, et restaurer les achats au démarrage.
 */
export const billing = {
  available: false,
  /** Lance l'achat ; résout à true si le paiement est confirmé par le magasin d'applications. */
  async buy(_itemId: string): Promise<boolean> {
    return false;
  },
};
