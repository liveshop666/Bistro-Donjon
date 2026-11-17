# Reprise du travail : Bistro Donjon

Fiche courte pour reprendre le projet dans un nouvel espace de travail, sans refaire ce qui est déjà fait ni répéter les erreurs passées.
À lire en premier, avant le [[JOURNAL]] (le journal garde l'historique complet, cette fiche ne garde que l'essentiel).
Mise à jour : 17/11/2026 (soir) : jeu net sur PC ; Clairière en 3D Blender ; chat chef 3D animé sur squelette, 5 angles.

## 1. Où on en est

- Tout est **fusionné sur `main`** et **en ligne sur Vercel** (dernière fusion : liveshop666/Bistro-Donjon#13).
- Le jeu est entièrement en **style 3D** (`STYLE_3D = true` dans `src/core/constants.ts`) : maps, personnages, monstres, interface, boutique.
- Fait et testé, sans erreur :
  - netteté partout (textes haute définition, qualité toujours au maximum, plus de réglage « fluide ») ;
  - onglet **LES MAPS** pour voir et choisir les 8 maps ;
  - **Ma collection** (ancien « Mes articles ») dans Mon compte ;
  - vraie marche des 13 personnages (pose de pas + pose debout) ;
  - un geste et un effet par arme ;
  - bruitage fabriqué pour chaque arme, bruit de pas, musique « orchestre » ;
  - 8 maps en haute définition (3360 × 1888) ;
  - joystick et boutons identiques à l'image de référence de Rudy.
- Pas vérifié : **les sons n'ont jamais été écoutés** (pas de haut-parleur dans l'environnement cloud). C'est à Rudy de les écouter sur son téléphone.

## 2. Ce qu'on reprend (dans l'ordre)

0. **Blender (cartes et personnages 3D, demande de Rudy du 17/11)** : voir l'entrée « cartes et personnage en vraie 3D » du [[JOURNAL]]. Suite : resserrer le visage du chat, refaire les autres chefs et monstres avec `tools/blender/chef.py`, puis les 7 autres cartes avec `tools/blender/clairiere.py` comme modèle ; textures de sol réalistes quand les deux domaines (`dl.polyhaven.org`, `acg-download.struffelproductions.com`) seront autorisés.

1. **Sons et musique professionnels** (demande de Rudy) :
   - Rudy télécharge de vrais sons gratuits et les dépose dans `reference/sons/`.
   - Sources conseillées :
     - Sonniss GDC Game Audio Bundle (le meilleur choix, libre pour un jeu vendu) ;
     - Freesound.org avec le filtre « CC0 » ;
     - Pixabay (sons et musique) ;
     - Kenney.nl ;
     - Incompetech (il faut citer l'auteur) ;
     - OpenGameArt (vérifier la licence de chaque fichier).
   - **Pas BBC Sound Effects** : interdit dans un jeu vendu.
   - Ensuite : les convertir en mp3 courts dans `public/assets/sons/`, puis les brancher dans `SAMPLE_OF` de `src/audio/AudioManager.ts`. Les sons fabriqués restent en secours si un fichier manque.
   - Les écouter avec Rudy, une arme après l'autre.
2. **Mouvements encore plus réalistes avec Blender** (idée de Rudy, à faire après les sons) :
   - il faut de vrais modèles 3D des personnages, avec un squelette pour les animer ;
   - on rend ensuite les animations en images ;
   - c'est un gros chantier : en parler avec Rudy avant de commencer.
3. **Avant le Play Store** :
   - remettre `TEST_UNLOCK_ALL` et `TEST_PAYMENTS` à `false` (`constants.ts`) ;
   - brancher les vrais paiements, la sauvegarde en ligne et la sécurité de la base de données (voir `docs/PUBLICATION.md`).

## 3. Faut-il régénérer ? (non, sauf cas précis)

| Élément | Où | Régénérer ? |
|---|---|---|
| Personnages, poses d'attaque, poses de marche (`_atk`, `_mar`) | planches dans `reference/3d/*.png`, découpées dans `public/assets/sprites3d/` | **Non.** (Depuis le 17/11 ils sont agrandis 2 fois : `python3 tools/upscale_sprites.py <EDSR_x2.pb>`, ~35 min, `ART_RES` = 12. Après un nouveau `extract_3d.py`, relancer cet agrandissement.) Ils sont bons et vérifiés. Ne relancer `python3 tools/extract_3d.py` que si une planche change, puis vérifier chaque image à l'œil. |
| Boutons, joystick, cœurs, pièce, chrono | `public/assets/ui3d/` (découpés par `tools/extract_ui3d.py`) | **Non.** |
| Maps 3D | `public/assets/maps/wide3d_*.jpg` (1680 px) et `hd3d_*.jpg` (3360 px) | **Non.** L'agrandissement prend environ 10 minutes par map. Ne le relancer que pour une nouvelle map : `python3 tools/upscale_maps.py <modèle EDSR_x2.pb>` (modèle : github.com/Saafke/EDSR_Tensorflow). |
| Vignettes de l'onglet des maps | `public/assets/maps/thumb3d_*.jpg` | Seulement si une map change. |
| Sons de la vidéo de pub | `public/assets/sons/` (`tools/extract_sons.sh`) | **Non.** On y entend la musique de la vidéo : à remplacer par de vrais sons gratuits (point 2.1). |
| Anciens dessins pixel | `npm run assets` | **Ne pas lancer** : ils ne servent plus qu'au mode pixel. |

**Nouvelles images (Canva) :**
1. `generate-image` avec les images de référence.
2. `remove-background`.
3. Poser l'image sur une page du design « Bistro Donjon - export 3D » (`DAHa7uXcGeY`) avec `insert_fill`.
4. `export-design` en PNG transparent.

Les aperçus Canva ne font que 200 px : toujours passer par l'export.

## 4. Erreurs à ne jamais refaire (résumé)

- Une **zone tactile vide** (taille 0) casse tout le toucher. Tester le joystick avec de vrais touchers (CDP), pas seulement la souris.
- **Textes flous** : Phaser dessine les textes à la finesse 1 par défaut. Le correctif est dans `main.ts` : ne pas l'enlever.
- **Ne jamais baisser la qualité d'image tout seul** : Rudy veut toujours le maximum.
- **Positions arrondies au pixel en 3D** : les personnages avancent alors par à-coups. Utiliser `px()`.
- **Sons découpés dans une vidéo** : on y entend la musique. Prendre de vrais fichiers de sons.
- **Découpe automatique des planches** : elle peut attraper un bout du voisin. Toujours vérifier chaque image à l'œil.
- **Charger toutes les grandes maps au démarrage** : c'est trop lourd. Ne charger que celle du monde joué (`GameScene.preload`).
- **Long calcul lancé en arrière-plan** : il est arrêté au bout de 30 minutes par défaut. Donner un délai plus long (jusqu'à 2 h), ou traiter une map à la fois.
- **Données personnelles** : aucune adresse e-mail en dur, tout passe par `.env`.
- **Majuscules** : pas d'accents.
- La liste complète est dans [[JOURNAL]], section « Erreurs commises et leçons ».

## 5. Méthode avec Rudy

- Rudy n'est pas développeur : parler simplement, en français, et donner une commande à la fois.
- Quand il dit « fais tout, ne me demande rien », il faut tout finir, tester, puis faire un seul compte rendu à la fin. Quand il dit « fusionne » : faire la fusion sur `main` (mise en ligne Vercel).
- Après chaque changement de jeu :
  - lancer `npm run build` ;
  - puis tester dans le navigateur avec Playwright : tous les écrans, une partie, le joystick au vrai toucher, le robot qui joue.
- En fin de session :
  - mettre à jour cette fiche et le [[JOURNAL]] ;
  - puis commit, push et fusion.
  - Ces notes sont lues dans Obsidian et par Jarvis/Alma : elles doivent rester claires pour un non-développeur.
