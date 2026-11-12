# Bistro Donjon — mémoire du projet

Jeu mobile (Android d'abord) de SolveLab : action-survie roguelike + cuisine, pixel art, portrait 360 × 640, une main. Paysage géré depuis le 12/11/2026 (partie en plein écran, menu et boutique dessinés pour le paysage).
Stack : Phaser 3 + TypeScript + Vite, Capacitor pour Android. Tout le texte du jeu est en français.

**Avant de travailler, lire `docs/memoire/JOURNAL.md`** (où on en est, erreurs à ne pas refaire) et le mettre à jour en fin de session.
Ces fichiers sont du Markdown simple : le dossier `docs/` s'ouvre tel quel comme coffre Obsidian.

## Commandes
- `npm run dev` : serveur de développement — `npm run build` : vérification TypeScript + build
- `npm run assets` : redécoupe `reference/*.jpg` en sprites (Python : Pillow, NumPy, SciPy), puis `python3 tools/make_icons.py`
- `npm run android:sync` : build + copie dans `android/`
- Serveur de duel : `cd server && npm install && npm start` (port 2567)

## Repères
- Tout l'équilibrage et le contenu : `src/core/constants.ts` (chefs, monstres, vagues, recettes, cartes, mondes, boutique).
- Scène de jeu : `src/scenes/GameScene.ts`. Sauvegardes : `src/core/Storage.ts`. Son synthétisé : `src/audio/AudioManager.ts`.
- Règles du jeu : `docs/REGLES.md` (à garder identiques à `src/scenes/RulesScene.ts`). Publication : `docs/PUBLICATION.md`.

## Où vit ce projet
- **GitHub** `liveshop666/Bistro-Donjon` est la référence commune.
- **Sur le PC de Rudy**, le dépôt est rangé DANS son cerveau Obsidian : `C:\Users\nolla\jarvis-workspace\cerveau\projets\bistro-donjon\`.
  Là, `docs/memoire/JOURNAL.md` est directement une note d'Obsidian, lue aussi par son assistante vocale Alma.
  Le reste du cerveau (`../../moi.md`, `../../regles.md`, `../../memoire/`) peut être lu pour le contexte, sans le modifier.
- **Dans le navigateur (cloud)**, même dépôt, même journal : tout se retrouve sur le PC au prochain `git pull`.

## Méthode à chaque session (demandée par le propriétaire)
**Avant de toucher au code**
0. `git pull` pour récupérer le travail fait ailleurs (l'autre Claude Code, le navigateur). S'il y a un conflit, s'arrêter et l'expliquer simplement à Rudy.
1. Lire `docs/memoire/JOURNAL.md` en entier : « Où on en est », « Erreurs commises et leçons », « Notes techniques ».
2. Regarder les derniers commits (`git log --oneline -15`) pour voir ce qui a changé depuis la dernière session.
3. Redire au propriétaire en 3 lignes : où on en est, ce qu'on va faire, ce qu'on ne touchera pas.

**Pendant**
- Ne jamais casser ni réécrire ce qui est marqué « Fait et testé » sans raison : on améliore par petites touches.
- Si une amélioration claire apparaît (bug, lenteur, texte mal écrit, équilibrage), la proposer en une phrase puis la faire si elle est sûre.
- Ne jamais refaire une erreur listée dans « Erreurs commises et leçons ».
- Après chaque changement de gameplay : `npm run build`, puis une partie test dans le navigateur.

**À la fin (ou quand le propriétaire dit « mets à jour », « note ça », « on s'arrête »)**
Mettre à jour `docs/memoire/JOURNAL.md` : « Où on en est » (fait / pas fait / décisions à obtenir), une ligne par nouvelle erreur dans « Erreurs commises et leçons » (erreur → leçon), et les notes techniques utiles. Puis commit et `git push` du code et du journal, pour que l'autre Claude Code et GitHub soient à jour.
Ce journal est recopié automatiquement dans le cerveau Obsidian du propriétaire et lu par son assistante vocale Alma : il doit rester clair pour un non-développeur.

## Règles de travail
- Ne jamais écrire en dur une adresse e-mail ou une donnée personnelle du propriétaire : passer par `.env` (`VITE_SUPPORT_EMAIL`).
- Les textes EN MAJUSCULES s'écrivent sans accents (la police Press Start 2P les rend mal) ; les minuscules gardent leurs accents.
- Texte du jeu en taille 8 ou 16 uniquement, 44 caractères maximum par ligne en taille 8.
- Après tout changement de gameplay, tester dans un navigateur (Playwright est installé) avant de pousser.
- Le propriétaire n'est pas développeur : expliquer simplement, donner les commandes une par une.
