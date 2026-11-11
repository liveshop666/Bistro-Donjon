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

## Contenu du jeu

- **Solo** : 3 vagues puis le Roi Tomate, 3 chefs animés, 5 monstres, 4 mondes à débloquer, 6 recettes, 8 cartes d'amélioration.
- **Cuisine** : marmite, comptoir, planche à découper, patience des clients, pourboires, combos.
- **Duel « Guerre des Stands »** : 2 minutes, sabotages, contre l'ordinateur ou en ligne (partie rapide ou salon à code).
- **Pause et sauvegarde** : enregistrement automatique à chaque vague, reprise depuis le menu.
- **Boutique** de costumes et d'effets (pièces gagnées en jouant), **Mon compte** (pseudo, assistance, suppression des données).
- Règles intégrées, son synthétisé, affichage Pixel Perfect.

Documents : [règles du jeu](docs/REGLES.md) · [publication sur le Play Store](docs/PUBLICATION.md) · [fiche du store](store/FICHE_PLAY_STORE.md) · [journal du projet](docs/memoire/JOURNAL.md)

## Jouer en ligne en local

Dans un second terminal :

```bash
cd server
```

```bash
npm install
```

```bash
npm start
```

Le jeu lancé avec `npm run dev` s'y connecte tout seul. Pour jouer avec d'autres personnes par Internet, le serveur doit être hébergé : voir `docs/PUBLICATION.md`.

## Pas encore fait

Paiements en euros, connexion à un compte et sauvegarde en ligne, mode Duo coopératif, publicités récompensées, iOS, collisions avec les décors. Le jeu n'a pas encore été testé sur un vrai téléphone.

## Arborescence

```
public/assets/sprites/chefs/    chefs + portraits
public/assets/sprites/enemies/  monstres et boss
public/assets/maps/             décors des 4 mondes (360 × 640)
public/assets/ui/               ingrédients, marmite, icônes, bouton d'ultime
reference/                      planches visuelles d'origine
tools/                          découpe des planches en sprites
src/audio/                      AudioManager (bruitages et musiques synthétisés)
src/core/                       constants, GameManager, WaveManager, RecipeManager
src/entities/                   Chef, Enemy, Ingredient, CookingPot
src/input/                      TouchController (joystick flottant + tranchage)
src/network/                    DuelLink (adversaire robot), MultiplayerClient (en ligne)
src/scenes/                     Boot, Menu, Game, Rules, Duel, Shop, Account
server/                         serveur de duel en ligne (Node.js + WebSocket)
android/                        projet Android (Capacitor)
store/                          visuels et textes de la fiche Play Store
docs/                           règles, publication, journal du projet
src/ui/                         HUD, cartes d'amélioration, texte pixel
```

Les sprites sont dans `public/assets/` (et non `/assets/` à la racine) car c'est le dossier que Vite copie tel quel dans le build.
