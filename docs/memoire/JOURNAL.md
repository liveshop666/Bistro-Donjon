# Journal du projet Bistro Donjon

Mémoire partagée entre les sessions de travail. Ajouter une entrée datée en haut à chaque session.

## Où on en est (11/11/2026)
**Fait et testé dans un navigateur**
- Solo complet : 3 vagues (chasse 45 s, cuisine 20 s, carte), boss Roi Tomate, victoire/défaite, déblocage des mondes.
- 3 chefs animés (marche, attaque), 5 monstres, 4 mondes avec leur mécanique.
- Cuisine : marmite, comptoir, planche à découper, patience des clients, pourboire, combo de 3.
- Pause, sauvegarde automatique à chaque vague, « Sauvegarder et quitter », « Continuer ».
- Duel 2 minutes avec sabotages : contre l'ordinateur, ou en ligne (partie rapide, salon à code) via `server/`.
- Boutique (refaite le 11/11) : 6 costumes + 6 effets en deux onglets, avec 4 raretés (commun, rare, épique, légendaire). Chaque article s'obtient d'une seule façon : en pièces, en cadeau de palier gratuit (2 500, 5 000, 10 000, 50 000, 100 000 pièces gagnées au total) ou en premium (argent réel, pas encore branché). Écran Mon compte : pseudo, assistance, suppression des données.
- Attaque manuelle (11/11, demande de Rudy) : le chef ne frappe plus tout seul. Bouton rouge en bas à droite à garder appuyé (touche K ou E au clavier). Le bouton d'ultime est remonté juste au-dessus.
- Bouton PAUSE en bas de l'écran (l'icône du haut reste).
- Une musique de chasse par monde : Clairière (l'ancienne), Marché de nuit (gamme japonaise), Taverne (gigue médiévale), Cantine (arpèges de synthé). Cuisine et boss gardent la même musique partout.
- Cadeau du jour : pièces offertes à la première ouverture du jeu chaque jour, de 100 à 500 selon le nombre de jours d'affilée.
- Fin de partie : affiche les cadeaux débloqués et les pièces qui manquent pour le prochain.
- Son 100 % synthétisé, règles en jeu (5 pages), projet Android, visuels et textes de la fiche Play Store.
- Collisions avec les décors (11/11, sur le PC de Rudy) : le chef ne traverse plus les arbres, troncs et rocher de la Clairière, les étals du Marché ni les tonneaux et caisses de la Taverne. Il glisse le long, le dash s'arrête devant, et un ingrédient tombé dans un décor est reposé juste à côté.

**Mise à jour automatique sur le téléphone (11/11) : en service, vérifié depuis le PC**
- Le jeu est déployé sur Vercel (projet `bistro-donjon`, équipe stockly, relié à GitHub : chaque envoi sur `main` redéploie). Adresse : `bistro-donjon-stockly6.vercel.app`.
- Porte d'entrée (`middleware.ts`) : sans autorisation, rien du jeu n'est servi. L'APK de test entre tout seul grâce à une clé secrète (la clé est dans les secrets GitHub, `BD_APP_KEY` ; Vercel n'a que son empreinte, `APP_KEY_HASH`) : rien à taper sur le téléphone. Un code à taper depuis un navigateur est possible en plus (`ACCESS_CODE` dans Vercel, facultatif). Aucune de ces valeurs n'est dans le dépôt. Variables vides = site fermé à tous.
- L'APK de test charge le jeu depuis cette adresse (`BD_LIVE_URL` dans le workflow Android) : installé une fois, il se met à jour tout seul. L'AAB du Play Store garde le jeu embarqué.
- Mis en service avec l'accord de Rudy : la protection « Vercel Authentication » ne couvre plus que les adresses de brouillon (preview) ; l'adresse de production est gardée par la porte du jeu. Vérifié : un navigateur reçoit « 403 version de test privée » (page et images), l'APK reçoit le jeu.
- Pas encore essayé sur un vrai téléphone. Cette version de test demande du réseau. Pour changer la clé : nouveau secret `BD_APP_KEY` dans GitHub + nouvelle empreinte `APP_KEY_HASH` dans Vercel, puis renvoyer du code et réinstaller l'APK.

**Pas fait**
- Jamais testé sur un vrai téléphone. APK non construit ici (le SDK Android n'est pas téléchargeable depuis cet environnement) : il sort de GitHub Actions.
- Serveur de duel non hébergé : le jeu en ligne ne marche qu'avec le serveur lancé localement.
- Paiements en euros non branchés (`src/core/Billing.ts`), pas de connexion à un compte ni de sauvegarde en ligne.
- Mode Duo coopératif, publicités récompensées, iOS.
- Classement mondial : pas fait, il faut un serveur en ligne (voir décisions). Idées proposées à Rudy pour faire revenir les joueurs, pas encore faites : missions du jour, classement mondial hebdomadaire, saisons avec récompenses.
- Articles premium : les 3 articles premium (Chat Cyber, Chat Astronaute, Eclairs Violets) ne peuvent pas encore être obtenus, le paiement n'étant pas branché. De nouveaux costumes « les plus beaux » demandent de nouveaux dessins dans `reference/`.
- Attaque manuelle jamais essayée sur un vrai téléphone (deux pouces : joystick + bouton).
- Les monstres traversent encore les décors (laissé exprès pour ne pas changer leur comportement ni l'équilibrage).
- Murs du fond de la Taverne et de la Cantine : laissés libres, car la marmite et le comptoir sont posés devant.

**Décisions à obtenir du propriétaire**
- Adresse e-mail d'assistance à publier.
- Hébergeur du serveur de duel (servirait aussi au classement mondial).
- Prix des articles premium (1,99 € les costumes légendaires, 0,99 € l'effet épique : proposés par Claude, à valider).
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
- **Navigateur de test absent sur le PC** : Playwright est installé mais pas son Chromium. Leçon : lancer avec `channel="msedge"` (Edge est déjà là) plutôt que de télécharger un navigateur.
- **Script de modification qui casse les retours à la ligne** : un script Python passé dans le terminal a transformé des `\n` en vrais retours à la ligne dans le code. Leçon : pour modifier du code qui contient `\n`, utiliser l'outil d'édition ou un fichier de script, pas un texte collé dans le terminal ; puis lancer `npx tsc --noEmit`.
- **Scène relancée à moitié pendant le test** : arrêter toutes les scènes et démarrer « Game » dans la même image laisse une scène sans caméra. Leçon : arrêter, attendre un instant, puis démarrer.

## Notes techniques
- Les costumes de boutique sont une seule image animée par code ; les chefs de base ont de vraies images de marche et d'attaque.
- Le duel ne synchronise pas les arènes : chaque joueur joue la sienne, le serveur relaie scores et sabotages. Les scores sont déclarés par le client (trichable).
- La reprise d'une sauvegarde repart du début de la vague, avec l'or et l'inventaire du moment de la sauvegarde.
- Collisions : les décors sont peints dans l'image de fond, donc chaque monde déclare ses zones bloquantes (`obstacles`, rectangles en pixels) dans `constants.ts`. `GameScene.blocked(x, y)` teste les pieds du chef. Pour ajuster une zone, modifier le rectangle puis vérifier à l'œil sur la carte.
- Boutique : un article a UN seul mode d'obtention dans `SHOP` (`coins`, `palier` ou `euro`) et une `rarity`. `Storage.addCoins()` est le seul endroit qui ajoute des pièces : il augmente aussi le total à vie (`earned`) et offre les cadeaux de palier. Ne jamais faire `coins + x` à la main.
- Attaque : `GameScene.attack()` ne frappe que si `hud.attackHeld` (doigt sur le bouton) ou touche K/E. Cadence et dégâts inchangés par rapport à l'ancienne attaque automatique.
- Musiques : `HUNT_TUNE` (GameScene) associe chaque monde à sa boucle dans `AudioManager.TUNES`.
- Version en ligne : `middleware.ts` (à la racine) n'est utilisé que par Vercel. Il se teste en local en le compilant avec esbuild puis en l'appelant avec des `Request`. Un changement de `ACCESS_CODE` ne prend effet qu'au déploiement suivant et annule les accès déjà donnés.
- Test dans le navigateur : la scène Phaser est récupérée en remplaçant `SceneManager.prototype.update` (importé depuis `/.vite/deps/phaser`), puis le chef est piloté au clavier.
