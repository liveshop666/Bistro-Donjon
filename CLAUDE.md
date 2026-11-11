# Bistro Donjon — mémoire du projet

Jeu mobile (Android d'abord) de SolveLab : action-survie roguelike + cuisine, pixel art, portrait 360 × 640, une main.
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

## Règles de travail
- Ne jamais écrire en dur une adresse e-mail ou une donnée personnelle du propriétaire : passer par `.env` (`VITE_SUPPORT_EMAIL`).
- Les textes EN MAJUSCULES s'écrivent sans accents (la police Press Start 2P les rend mal) ; les minuscules gardent leurs accents.
- Texte du jeu en taille 8 ou 16 uniquement, 44 caractères maximum par ligne en taille 8.
- Après tout changement de gameplay, tester dans un navigateur (Playwright est installé) avant de pousser.
- Le propriétaire n'est pas développeur : expliquer simplement, donner les commandes une par une.
