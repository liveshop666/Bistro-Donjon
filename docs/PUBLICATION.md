# Publier Bistro Donjon sur le Google Play Store

Ce qui est prêt dans le dépôt, et ce qu'il reste à faire de votre côté (comptes, signature, hébergement).

## Déjà prêt
- Projet Android complet dans `android/` : rotation libre (portrait ou paysage, depuis le 12/11), plein écran immersif, écran qui reste allumé, bouton Retour géré, icônes et écran de démarrage.
- Identifiant de l'application : `fr.solvelab.bistrodonjon`, version 1.0.0 (code 1).
- Visuels de la fiche dans `store/` : icône 512 px, bannière 1024 × 500, 8 captures 1080 × 1920.
- Textes de la fiche et réponses aux questionnaires : `store/FICHE_PLAY_STORE.md`.
- Politique de confidentialité : `public/privacy.html` (à mettre en ligne, voir étape 3).
- Construction automatique : à chaque envoi de code, GitHub fabrique un APK de test (onglet **Actions** du dépôt, tâche **Android**, fichier `bistro-donjon-apk-test`).

## À faire jusqu'au Play Store, dans l'ordre (mis à jour le 12/11/2026)
Légende : **[Rudy]** = à faire par Rudy (compte, argent, signature) ; **[Claude]** = Claude Code s'en charge quand Rudy dit « vas-y ».

### Étape 1. Tester à fond sur le vrai téléphone [Rudy]
- Réinstaller l'appli de test une fois (onglet **Actions** de GitHub, tâche **Android**, fichier `bistro-donjon-apk-test`) : c'est nécessaire pour que la rotation en paysage marche dans l'appli. Ensuite les mises à jour du jeu arrivent toutes seules.
- Jouer plusieurs parties dans les 2 sens (portrait et paysage), sur plusieurs mondes. Noter tout ce qui gêne : boutons mal placés, texte trop petit, jeu trop dur ou trop facile, prix.
- [Claude] corrige ce que Rudy remonte.

### Étape 2. Régler l'équilibre avec les vrais chiffres [Claude]
- Après quelques jours de jeu, regarder dans « Mon compte » la moyenne de pièces gagnées par partie, et ajuster les prix et la difficulté.

### Étape 3. Créer le compte Google Play Console [Rudy]
- Sur https://play.google.com/console : 25 $ une seule fois, pièce d'identité demandée par Google, vérification de quelques jours.
- Choisir compte **personnel** ou **organisation** (SolveLab). Avec un compte personnel récent, Google impose un **test fermé de 12 testeurs pendant 14 jours** avant la mise en production : prévoir 12 personnes (amis, famille) avec un compte Gmail.

### Étape 4. Adresse d'assistance et politique de confidentialité [Rudy + Claude]
- [Rudy] Choisir une adresse e-mail de contact pour le jeu (par exemple une adresse dédiée).
- [Claude] La mettre dans `.env` (`VITE_SUPPORT_EMAIL`) et dans Vercel, et compléter `public/privacy.html`.
- La politique est déjà accessible publiquement à l'adresse du site + `/privacy.html` (exception ajoutée au code d'accès le 12/11) : c'est cette adresse qu'on donne à Google.

### Étape 5. Clé de signature de l'appli [Rudy, avec Claude]
- Créer la clé une seule fois (Claude donne la commande, Rudy choisit et garde les mots de passe) :
```bash
keytool -genkey -v -keystore bistro-donjon.jks -keyalg RSA -keysize 2048 -validity 10000 -alias bistro
```
- La ranger en lieu sûr (2 copies, hors du dépôt). La perdre = plus jamais de mise à jour possible.
- Ajouter les 4 secrets dans GitHub (*Settings > Secrets and variables > Actions*) : `ANDROID_KEYSTORE_BASE64`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS` (`bistro`), `ANDROID_KEY_PASSWORD`. GitHub fabriquera alors le fichier `.aab` signé.

### Étape 6. Version Play Store embarquée [Claude]
- L'appli de test charge le jeu depuis Vercel avec un code d'accès. La version Play Store doit avoir le jeu **dans l'appli** (sans code d'accès) : c'est déjà prévu (sans `BD_LIVE_URL`, le jeu est embarqué). Vérifier que le `.aab` est bien construit ainsi, monter le numéro de version (`versionCode` / `versionName` dans `android/app/build.gradle`).

### Étape 7. Achats en euros [Rudy puis Claude]
- [Rudy] Dans la Play Console : remplir le **profil de paiement** (compte bancaire, informations fiscales) et créer les produits (chefs 1,99 €, armes 0,99 €, packs 2,49 € à 12,99 €), avec les identifiants que Claude donnera.
- [Claude] Brancher Google Play Billing dans le jeu (`src/core/Billing.ts` explique comment) et tester avec un compte testeur (achats sans débit réel).
- Possible de sortir une **première version sans achats** (tout gratuit en pièces) et d'ajouter les achats ensuite.

### Étape 8. Publicités récompensées (facultatif) [Rudy puis Claude]
- [Rudy] Créer un compte AdMob (Google), relié au compte de paiement.
- [Claude] Ajouter « regarder une pub = des pièces », le bandeau de consentement (RGPD) et mettre à jour la fiche « sécurité des données ».

### Étape 9. Fiche Play Store [Rudy + Claude]
- [Claude] Mettre à jour les textes (`store/FICHE_PLAY_STORE.md`) et refaire les captures avec le jeu actuel (8 mondes, chefs, boutique, paysage).
- [Rudy] Créer l'appli dans la Play Console, copier les textes, déposer icône, bannière et captures, remplir les questionnaires (classification du contenu, sécurité des données, public cible, publicités oui/non) avec les réponses de la fiche.

### Étape 10. Tests Google puis sortie [Rudy]
- Déposer le `.aab` en **test interne** (Rudy et quelques proches), corriger si besoin.
- Puis **test fermé** : 12 testeurs, 14 jours (compte personnel).
- Puis demander l'accès à la **production** : Google vérifie l'appli (quelques jours) et le jeu sort sur le Play Store.

### Plus tard, après la sortie
- Classement mondial et jeu en ligne (serveur à héberger, ou Supabase quand Rudy le voudra), sauvegarde en ligne, mode duo à deux, menus redessinés en paysage, version iPhone.

## Pas encore dans le jeu
- **Paiements en euros** : la boutique affiche les prix, mais l'achat réel n'est pas branché (`src/core/Billing.ts` explique comment). Il faut d'abord créer les produits dans la Play Console.
- **Connexion à un compte / sauvegarde en ligne** : les données restent sur l'appareil. Tant qu'il n'y a pas de compte, Google n'exige pas de procédure de suppression de compte ; « Supprimer mes données » efface tout sur l'appareil.
- **Publicités récompensées**, **mode Duo coopératif**, **iOS**.
- Les écrans de menu restent en portrait quand le téléphone est en paysage (seule la partie passe en paysage).
- Le serveur de duel en ligne (`server/`) n'est pas hébergé : le solo et le duel contre l'ordinateur marchent, « En ligne » non.

## Mettre à jour le jeu
Augmenter `versionCode` et `versionName` dans `android/app/build.gradle`, puis :
```bash
npm run android:sync
```
