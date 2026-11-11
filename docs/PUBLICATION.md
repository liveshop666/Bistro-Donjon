# Publier Bistro Donjon sur le Google Play Store

Ce qui est prêt dans le dépôt, et ce qu'il reste à faire de votre côté (comptes, signature, hébergement).

## Déjà prêt
- Projet Android complet dans `android/` : portrait verrouillé, plein écran immersif, écran qui reste allumé, bouton Retour géré, icônes et écran de démarrage.
- Identifiant de l'application : `fr.solvelab.bistrodonjon`, version 1.0.0 (code 1).
- Visuels de la fiche dans `store/` : icône 512 px, bannière 1024 × 500, 8 captures 1080 × 1920.
- Textes de la fiche et réponses aux questionnaires : `store/FICHE_PLAY_STORE.md`.
- Politique de confidentialité : `public/privacy.html` (à mettre en ligne, voir étape 3).
- Construction automatique : à chaque envoi de code, GitHub fabrique un APK de test (onglet **Actions** du dépôt, tâche **Android**, fichier `bistro-donjon-apk-test`).

## À faire, dans l'ordre

### 1. Tester sur un vrai téléphone
Télécharger l'APK de test depuis l'onglet Actions de GitHub, le copier sur un téléphone Android et l'installer (autoriser « sources inconnues »). Le jeu n'a encore jamais tourné sur un vrai téléphone : c'est l'étape à ne pas sauter.

### 2. Héberger le serveur de duel (pour le jeu en ligne)
Le dossier `server/` est un petit serveur Node.js. Il faut le déposer chez un hébergeur qui accepte les WebSockets (Render, Railway, Fly.io…) : commande de démarrage `npm start`, dossier racine `server`. Vous obtenez une adresse du type `wss://bistro-donjon.onrender.com`.
Copier ensuite `.env.example` en `.env` et y mettre cette adresse dans `VITE_SERVER_URL` (et, sur GitHub, dans *Settings > Secrets and variables > Actions > Variables*).
Sans cette étape, le solo et le duel contre l'ordinateur marchent, mais « En ligne » affichera « Serveur injoignable ».

### 3. Mettre la politique de confidentialité en ligne
Google exige une adresse web publique. Le plus simple : publier le dossier `dist/` (ou seulement `privacy.html`) sur un hébergement web et noter l'adresse.
Renseigner aussi l'adresse d'assistance dans `.env` (`VITE_SUPPORT_EMAIL`) : elle apparaît dans *Mon compte > Assistance*.

### 4. Créer la clé de signature (une seule fois, à garder précieusement)
```bash
keytool -genkey -v -keystore bistro-donjon.jks -keyalg RSA -keysize 2048 -validity 10000 -alias bistro
```
Ne jamais mettre ce fichier dans le dépôt. Le perdre empêche de publier des mises à jour.
Pour que GitHub fabrique le fichier `.aab` signé, ajouter 4 secrets dans *Settings > Secrets and variables > Actions* :
`ANDROID_KEYSTORE_BASE64` (le fichier encodé en base64), `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS` (`bistro`), `ANDROID_KEY_PASSWORD`.
Autre possibilité : Android Studio, *Build > Generate Signed App Bundle*.

### 5. Play Console
1. Créer le compte développeur (25 $, une fois) sur https://play.google.com/console.
2. Créer l'application, copier les textes de `store/FICHE_PLAY_STORE.md`, déposer les visuels de `store/`.
3. Remplir les questionnaires (classification du contenu, sécurité des données, public cible) avec les réponses de la fiche.
4. Déposer le `.aab` en **test interne** d'abord, puis en production.
Un compte développeur personnel récent doit faire un test fermé avec 12 testeurs pendant 14 jours avant la mise en production.

## Pas encore dans le jeu
- **Paiements en euros** : la boutique affiche les prix, mais l'achat réel n'est pas branché (`src/core/Billing.ts` explique comment). Il faut d'abord créer les produits dans la Play Console.
- **Connexion à un compte / sauvegarde en ligne** : les données restent sur l'appareil. Tant qu'il n'y a pas de compte, Google n'exige pas de procédure de suppression de compte ; « Supprimer mes données » efface tout sur l'appareil.
- **Publicités récompensées**, **mode Duo coopératif**, **iOS**.

## Mettre à jour le jeu
Augmenter `versionCode` et `versionName` dans `android/app/build.gradle`, puis :
```bash
npm run android:sync
```
