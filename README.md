# Bistro Donjon

Jeu mobile d'action-survie roguelike + cuisine rapide, en pixel art, jouable à une main (portrait 360 × 640).
Ce dépôt contient le **prototype solo jouable** : chasse aux monstres-ingrédients, tranchage au doigt, cuisson, service, cartes d'amélioration et boss.

Stack : **Phaser 3 + TypeScript + Vite**, empaquetage Android/iOS prévu avec **Capacitor**.

## Lancer le jeu

```bash
npm install
```

```bash
npm run dev
```

Ouvrir l'adresse affichée (idéalement sur un téléphone du même réseau, ou avec l'émulation mobile du navigateur).

| Commande | Rôle |
| --- | --- |
| `npm run dev` | serveur de développement |
| `npm run build` | vérification TypeScript + build de production dans `dist/` |
| `npm run preview` | sert le build de production |
| `npm run assets` | redécoupe les planches de `reference/` en sprites (Python 3 + Pillow, NumPy, SciPy) |

## Comment jouer

- **Se déplacer** : poser le pouce n'importe où, un joystick flottant apparaît. (Ordinateur : flèches, ZQSD ou WASD.)
- **Attaquer** : automatique dès qu'un monstre est à portée. À l'arrêt le chef frappe à pleine cadence, en mouvement deux fois moins vite.
- **Trancher** : glisser rapidement le doigt ou le stylet sur un ingrédient au sol. Tranché, il compte double en or et cuit deux fois plus vite.
- **Cuisiner** : avec les ingrédients d'une commande, s'approcher de la marmite. Le plat cuit en 5 s ; le reprendre à la marmite, puis l'amener au comptoir « SERVICE ».
- **Servir** : rapporte de l'or, un pouvoir temporaire (vitesse, feu, régénération, bouclier de flammes) et charge l'ultime.
- **Ultime** : bouton en bas à droite quand la jauge est pleine (ordinateur : Espace).
- **Défaite** : vie du chef à zéro, ou stand détruit par les Champi-Boucliers. **Victoire** : vaincre le Roi Tomate.

Déroulé d'une partie (≈ 4 min) : 3 vagues de `récolte 45 s → coup de feu 20 s → 1 carte parmi 3`, puis le boss.
Toutes les valeurs (durées, stats, vagues, recettes, cartes) sont dans `src/core/constants.ts`.

## Ce que contient le prototype

- 3 chefs jouables avec arme et ultime propres : Chef Moustachu (Tornade Flambée), Maître Shiba (Onde de Choc Pâte), Mlle Noisette (Danse des Lames).
- Bestiaire : Champi-Bouclier (vise le stand), Tomate Grognon (meute), Gelée Sucrée (bondit, se divise), Piment Diablotin (tir à distance), Roi Tomate (charge, invoque, fait trembler l'écran).
- 4 mondes avec leur mécanique : Clairière (standard), Marché de Nuit (monstres en file), Taverne (tonneaux explosifs), Cantine Cyber (tapis roulants).
- 6 recettes, 8 cartes d'amélioration (couteaux volants, bottes, tourelle, aimant, fourneaux…), meilleur score sauvegardé localement.
- Affichage Pixel Perfect : le canvas est agrandi d'un facteur entier en pixels physiques.

## Pas encore fait

- **Multijoueur** (Duo coop, Duel sabotage) : `src/network/MultiplayerClient.ts` ne contient que le contrat de messages, aucun serveur Colyseus n'est branché.
- **Monétisation** (AdMob récompensé, boutique de skins) et déblocage progressif des mondes.
- **Sprites animés** : chaque personnage est une image fixe animée par code (rebond, dandinement, élan). Les planches d'animation image par image restent à produire en 32 × 32.
- **Masques de collision des décors** : seule la ligne cuisine/arène est gérée ; les personnages passent sur les arbres et les murs dessinés.
- **Son et musique**, ingrédient Viande, louche laser.
- **Projet Android** : la configuration Capacitor est prête mais le dossier `android/` n'est pas généré (voir ci-dessous).

## Générer l'application Android

Nécessite Android Studio et le SDK Android.

```bash
npm run build
```

```bash
npx cap add android
```

```bash
npx cap sync android
```

```bash
npx cap open android
```

Puis dans Android Studio : *Build > Generate Signed Bundle* pour obtenir le fichier `.aab` à déposer sur la Google Play Console. Penser à verrouiller l'orientation en portrait dans `AndroidManifest.xml` (`android:screenOrientation="portrait"`).

## Arborescence

```
public/assets/sprites/chefs/    chefs + portraits
public/assets/sprites/enemies/  monstres et boss
public/assets/maps/             décors des 4 mondes (360 × 640)
public/assets/ui/               ingrédients, marmite, icônes, bouton d'ultime
reference/                      planches visuelles d'origine
tools/                          découpe des planches en sprites
src/core/                       constants, GameManager, WaveManager, RecipeManager
src/entities/                   Chef, Enemy, Ingredient, CookingPot
src/input/                      TouchController (joystick flottant + tranchage)
src/network/                    MultiplayerClient (squelette)
src/scenes/                     Boot, Menu, Game
src/ui/                         HUD, cartes d'amélioration, texte pixel
```

Les sprites sont dans `public/assets/` (et non `/assets/` à la racine) car c'est le dossier que Vite copie tel quel dans le build.
