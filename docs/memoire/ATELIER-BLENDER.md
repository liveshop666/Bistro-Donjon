# Atelier Blender : cartes et personnages en 3D

Mémoire technique du chantier 3D (créée le 17/11/2026 à la demande de Rudy : « apprendre de tes erreurs, ne pas les reproduire, avancer 10 fois plus vite »).
À lire AVANT de toucher à `tools/blender/`. Le [[JOURNAL]] raconte l'histoire, [[REPRISE]] dit où on en est ; ce fichier dit **comment faire vite et sans erreur**.

## 1. L'objectif de Rudy (à ne jamais perdre de vue)
- Cartes et personnages en **vraie 3D réaliste, IDENTIQUES à ses dessins** (pas « dans le même esprit »).
- Personnages avec un **vrai squelette**, qui marchent et courent **comme un humain**, **dans toutes les directions** (gauche, droite, haut, bas), de façon fluide.
- Vue **en hauteur** : toute la carte visible. Taille des personnages **cohérente avec la carte** (ni gros, ni minuscules).
- Rudy vérifie toujours : il compare avec l'original et voit les écarts. **Toujours comparer côte à côte avant de dire que c'est bon.**
- Il ne veut RIEN installé sur son ordinateur : tout se passe dans le cloud.

## 2. Mise en route (5 minutes)
```bash
python3 -m venv /tmp/blender_env
pip download bpy --no-deps -d /tmp/bpy_dl            # roue ~430 Mo (Blender 5.3 comme module Python)
/tmp/blender_env/bin/pip install /tmp/bpy_dl/bpy-*.whl
pip install scipy opencv-contrib-python-headless      # masques, étalement des couleurs, agrandissement
```
- `ffmpeg` est déjà installé (`/usr/bin/ffmpeg`) pour les vidéos.
- Les modèles libres ne sont pas dans le dépôt : `add_repo` (lecture) puis `GIT_LFS_SKIP_SMUDGE=1 git clone --depth 1 <url> <dossier>` :
  - `walterpalladino/godot-quaternius-ultimate-stylized-nature` (arbres, buissons, rochers, fleurs, herbe ; FBX + textures) → dossier lu par `quaternius.py` (`QUAT_DIR`).
  - `J-Ponzo/gltf-universal-animation-library` (squelette 53 os + 46 animations de capture de mouvement) → `UAL_GLTF`.
  - `J-Ponzo/gltf-medieval-village-megakit` (murs, toits, sols, portes, caisses, charrette, clôtures : pour Taverne et Marché).
- Lancer un script : `/tmp/blender_env/bin/python -I tools/blender/<script>.py -- <arguments>` (le `-I` est important).

## 3. Les outils du dépôt (`tools/blender/`)
| Fichier | À quoi il sert |
|---|---|
| `make_masks.py` | forme de la zone de terre et traces au sol, tirées de la peinture d'origine d'une carte |
| `clairiere.py` | scène 3D complète de la Clairière (modèle pour les 7 autres cartes) ; `-- sortie.png échelle échantillons` |
| `finish.py` | vignette, chaleur, contraste après le rendu de la carte |
| `install_map.py` | installe un rendu 3360 x 1888 dans le jeu (4 tailles : `hd3d_`, `wide3d_`, `thumb3d_`, `port3d_`) |
| `quaternius.py` | charge les modèles FBX du pack, textures, mise debout, copies (`Q.place`) |
| `chef.py` | personnage sur le squelette ; modes `apercu`, `face`, `profil`, `angles`, `video`, `repos`, `jeu` |
| `pack_anim.py` | assemble les rendus en planches WebP + `src/core/anim3d.json` |
| `compose_video.py` | vidéo de démonstration (carte entière + loupe) |

Dans le jeu : `BootScene` charge `rig_<chef>_<anim>_<direction>` ; `Chef.ts` (`applyRig`, `sectorFor`) choisit l'image selon la direction (8 secteurs, 5 angles rendus, les 3 autres retournés), la cadence des pas suit la vitesse (`RIG_STRIDE`).

## 4. Méthode qui marche : la peinture projetée (identité du visage)
- Un personnage fabriqué « à la main » par code ne ressemble PAS au dessin (essais 1 et 2 : mannequin à tête de chat, puis chat à proportions de dessin animé : reconnaissable mais pas identique).
- Ce qui donne l'identique : **projeter la peinture d'origine de face** (tête, toque, foulard, tablier) sur des volumes 3D accrochés aux os, repère qui suit l'os (`painted_material` dans `chef.py`). De face = le dessin ; sur les côtés/dessus/dos = couleur unie éclairée (la projection s'étire sinon).
- Ne PAS découper par la transparence de la peinture : vu de côté, la tête devient fantôme. Étaler les couleurs au-delà du contour (`scipy.ndimage.distance_transform_edt`) et ajuster les volumes à la silhouette.
- **La tête et le corps doivent avoir la même couleur** (faute de Rudy du 17/11 soir : tête vive, corps terne). Mesurer les pixels sur un rendu (zones tête / torse / jambes) et comparer. Les matières « fourrure » ont la même émission que la tête peinte.
- Pour un nouveau personnage : entrée dans `SPECS`, recadrer tête et plastron dans la peinture (`tools/blender/_work/`), couleurs mesurées sur la peinture, lancer `chef.py ... apercu/angles`, comparer, puis `jeu`.

## 5. Réglages qui comptent
- Carte : caméra orthographique inclinée à 60°, 1 unité = 100 px de la peinture ; `P(px, py, z)` place un objet au pixel de la peinture. Rendu 3360 x 1888, 48 échantillons, débruitage ; ~15 min.
- Personnage : caméra à **18°** (presque de face, comme la peinture), `DENS = 3` px rendus par px de carte, `CHAR_SCALE = 0.31` (≈ 50 px de haut sur la carte de 1680 px), pieds ancrés en (320, 388) dans l'image de 640 px. Affichage dans le jeu : `pack_anim.py ... 80` (≈ 80 unités de haut comme les anciens chefs).
- Mouvements : la bibliothèque est à 24 images/s ; images intermédiaires par `frame_set(int, subframe=)`. Course = `Sprint_Loop` (cycle court). Squelette raccourci par `Z_MAP` (jambes ×0,5) ; les déplacements du bassin des animations sont réduits de même (`LOC_K`).
- Durées de rendu (4 cœurs) : image de personnage 640 px ≈ 2,6 s ; 300 images (5 angles) ≈ 13 min ; vidéo de 200 images ≈ 9 min.

## 6. Ressources gratuites : ce qui est accessible
- OK : GitHub (clone des dépôts publics, fichiers `raw.githubusercontent.com`), PyPI, `quaternius.com` et `opengameart.org` (pages), l'API `api.polyhaven.com`.
- Bloqué dans l'environnement cloud tant que Rudy ne l'autorise pas : les fichiers de **Poly Haven** (`dl.polyhaven.org`, attention : en `.org`), **ambientCG** (`acg-download.struffelproductions.com`), Kenney (`kenney.nl`, 403), Sketchfab. Rudy les ajoute dans les réglages de l'environnement cloud (Domaines autorisés, **une adresse par ligne**), puis il faut peut-être **relancer la session**.
- Licences : Quaternius = CC0 (usage commercial libre, pas de crédit obligatoire, mais **on ne redistribue pas les modèles eux-mêmes** : seuls les rendus vont dans le dépôt). Générateurs d'arbres sous GPL (tree-gen) : refusé par la sécurité de la session (code téléchargé), non utilisé.
- Recherche de dépôts : `gh api -X GET search/repositories -f q='...'` (marche) ; lire un dépôt non attaché demande `add_repo`.

## 7. Erreurs commises et leçons (ne plus jamais refaire)
1. **Attendre la fin avec `grep -q fini`** : « fini » est dans « glTF import finished ». → attendre un marqueur unique (`CHEF OK`, `TERMINE`) avec `for i in $(seq 1 110); do grep -q "..." log && break; timeout 5 tail -f /dev/null; done`. Le `sleep` seul est bloqué.
2. **Remplacement de texte trop large** dans `chef.py` : tout un bloc (la tête peinte) a été effacé. → remplacer des blocs précis entre deux repères uniques ; relancer un rendu de contrôle après CHAQUE modification ; enregistrer (commit) les états qui marchent ; `git checkout <fichier>` pour revenir.
3. **Annoncer « fait » avant d'avoir comparé** à l'original : Rudy voit les écarts (dos, couleur tête/corps). → comparaison côte à côte sous les 5 angles + mesure des couleurs avant de fusionner.
4. **Fusionner avant le dernier avis de Rudy** : la couleur tête/corps a été signalée après la fusion. → montrer d'abord une image, fusionner ensuite, sauf ordre clair « fusionne ».
5. **`import bmesh` avant `import bpy`** → erreur. FBX du pack : axe « haut » = Y, tourner de −90° sur X avant d'appliquer les transformations.
6. **API Blender 5** : actions en couches (`act.layers[].strips[].channelbags[].fcurves`), noeud Mix (entrées 6 et 7), entrées Principled `Sheen Weight`, `Subsurface Weight`, `Specular IOR Level`, `use_nodes` annoncé obsolète (inoffensif).
7. **Caméra trop plongeante pour les personnages** (50-60°) : la toque cache le visage. → 18° pour les personnages, 60° pour la carte.
8. **Découpe par transparence sur des volumes arrondis** : tête fantôme de côté. → pas d'alpha, couleurs étalées, couleur unie selon la normale.
9. **Tester un seul angle** : le dos et le profil étaient mauvais. → toujours le mode `angles`.
10. **Domaines réseau saisis sur une seule ligne** : refusé. → une adresse par ligne, case « gestionnaires de paquet » cochée.
11. **Dire « fusionné » sans l'être** (et inversement) : vérifier avec l'état du dépôt avant de répondre.

## 8. Pour aller 10 fois plus vite
- Ne jamais refaire ce qui est décrit ici : lire cette page avant de commencer.
- Prévisualiser en basse définition (`apercu`/`angles`, 1280 px, 24 échantillons ≈ 30 s) ; ne lancer le rendu final (13 à 15 min) qu'une fois la comparaison bonne ; le lancer en arrière-plan et travailler pendant ce temps (journal, code du jeu, notes).
- Un chef = une entrée `SPECS` + 2 recadrages de peinture + 3 commandes (`angles`, `jeu`, `pack_anim`). Les animations et le code du jeu sont déjà faits et valables pour tous les chefs.
- Une carte = copier `clairiere.py`, replacer les éléments aux pixels de la peinture (`P(px, py)`), `install_map.py`.
- Quand un site est bloqué, noter ici lequel et ce que Rudy doit autoriser, sans attendre.

## 9. Check-list avant de fusionner
- [ ] `npm run build` passe ; aucune erreur dans la console du navigateur de test.
- [ ] Comparaison côte à côte avec l'original sous 5 angles ; couleurs tête / corps mesurées et proches.
- [ ] Partie de test dans le jeu : 6 directions, repos, course, attaque.
- [ ] Journal et cette fiche à jour ; ligne datée dans la note Obsidian du projet (`projets/bistro-donjon.md`).
- [ ] Dire clairement ce qui n'est PAS identique.

## 10. Reste à faire (au 17/11 nuit)
Autres chefs (Maître Shiba, Mlle Noisette), combattants, costumes, monstres ; 7 autres cartes ; textures de sol réalistes (en attente des domaines) ; profil et dos de la tête du chat ; poêle ; vidéo de démonstration à jour.
