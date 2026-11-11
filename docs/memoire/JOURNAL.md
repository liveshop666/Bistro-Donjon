# Journal du projet Bistro Donjon

Mémoire partagée entre les sessions de travail. Ajouter une entrée datée en haut à chaque session.

## Où on en est (11/11/2026)
**Fait et testé dans un navigateur**
- Solo complet : 3 vagues (chasse 45 s, cuisine 20 s, carte), boss Roi Tomate, victoire/défaite, déblocage des mondes.
- 3 chefs animés (marche, attaque), 5 monstres, 4 mondes avec leur mécanique.
- Cuisine : marmite, comptoir, planche à découper, patience des clients, pourboire, combo de 3.
- Pause, sauvegarde automatique à chaque vague, « Sauvegarder et quitter », « Continuer ».
- Duel 2 minutes avec sabotages : contre l'ordinateur, ou en ligne (partie rapide, salon à code) via `server/`.
- Boutique : 6 costumes + 3 effets, achetables en pièces gagnées en jeu. Écran Mon compte : pseudo, assistance, suppression des données.
- Son 100 % synthétisé, règles en jeu (5 pages), projet Android, visuels et textes de la fiche Play Store.

**Pas fait**
- Jamais testé sur un vrai téléphone. APK non construit ici (le SDK Android n'est pas téléchargeable depuis cet environnement) : il sort de GitHub Actions.
- Serveur de duel non hébergé : le jeu en ligne ne marche qu'avec le serveur lancé localement.
- Paiements en euros non branchés (`src/core/Billing.ts`), pas de connexion à un compte ni de sauvegarde en ligne.
- Mode Duo coopératif, publicités récompensées, iOS, collisions avec les décors (on marche sur les arbres et les murs).

**Décisions à obtenir du propriétaire**
- Adresse e-mail d'assistance à publier.
- Hébergeur du serveur de duel.
- Connexion par compte : avec quel service (Google Play Jeux, e-mail via Supabase…).

## Erreurs commises et leçons
- **Adresse e-mail en dur** : j'ai failli publier l'adresse du propriétaire dans le jeu et la page de confidentialité sans demander. Leçon : toute donnée personnelle passe par `.env` et se demande d'abord.
- **Stand détruit dès la première vague** : tous les monstres attaquaient le stand. Leçon : seuls les Champi-Boucliers et le boss l'attaquent ; toujours faire tourner une partie complète après un changement d'équilibrage.
- **Robot de test inactif** : remplacer `scene.update` ne fait rien, Phaser garde la fonction en cache. Leçon : remplacer `scene.sys.sceneUpdate`.
- **Accents majuscules** : la police les affiche en petit. Leçon : majuscules sans accents.
- **Libellé de commande figé sur « Cuisson »** : l'affichage n'était reconstruit que sur changement de liste. Leçon : appeler `recipes.onChange()` quand l'état d'une commande change.
- **K.O. en duel = défaite immédiate** : trop punitif, le duel s'arrêtait en 30 s. Leçon : en duel, un K.O. coûte de l'or et la partie continue.
- **Morceau d'image parasite sur le Roi Tomate** : la découpe automatique englobait un portrait voisin. Leçon : vérifier chaque sprite à l'œil après `npm run assets`.
- **Dossier trop haut chez le propriétaire** : le ZIP GitHub se décompresse dans un sous-dossier du même nom. Leçon : dire d'entrer dans le dossier qui contient `package.json`.

## Notes techniques
- Les costumes de boutique sont une seule image animée par code ; les chefs de base ont de vraies images de marche et d'attaque.
- Le duel ne synchronise pas les arènes : chaque joueur joue la sienne, le serveur relaie scores et sabotages. Les scores sont déclarés par le client (trichable).
- La reprise d'une sauvegarde repart du début de la vague, avec l'or et l'inventaire du moment de la sauvegarde.
