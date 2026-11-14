import Phaser from 'phaser';
import '@fontsource/press-start-2p';
import '@fontsource/lilita-one'; // chiffres de l'interface 3D (chrono, pièces), comme sur l'image de référence
import { audio } from './audio/AudioManager';
import { H, W } from './core/constants';
import { BootScene } from './scenes/BootScene';
import { GameScene } from './scenes/GameScene';
import { MenuScene } from './scenes/MenuScene';
import { RulesScene } from './scenes/RulesScene';
import { DuelScene } from './scenes/DuelScene';
import { ShopScene } from './scenes/ShopScene';
import { AccountScene } from './scenes/AccountScene';
import { CollectionScene } from './scenes/CollectionScene';
import { SignupScene } from './scenes/SignupScene';
import { App } from '@capacitor/app';
import { reloadIfUpdated } from './core/update';
import { RES } from './core/layout';

const parent = document.getElementById('game') as HTMLDivElement;

/**
 * Pixel Perfect : le canvas 360x640 est agrandi d'un facteur ENTIER en pixels physiques
 * (ex. x3 sur un écran 1080 px de large), avec bandes noires si besoin.
 */
function fitParent(w = W, h = H): void {
  const dpr = window.devicePixelRatio || 1;
  const zoom = Math.floor(Math.min((window.innerWidth * dpr) / w, (window.innerHeight * dpr) / h));
  // paysage (canvas plus large que haut) : on remplit tout l'écran, même avec un agrandissement non entier
  const fill = Math.min(window.innerWidth / w, window.innerHeight / h);
  const css = w > h || RES > 1 ? fill : zoom >= 1 ? zoom / dpr : fill;
  parent.style.width = `${w * css}px`;
  parent.style.height = `${h * css}px`;
}
fitParent(W * RES, H * RES);

Promise.all([document.fonts.load('8px "Press Start 2P"'), document.fonts.load('16px "Lilita One"')]).finally(() => {
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    width: W * RES, // rendu RES fois plus fin (voir core/layout.ts)
    height: H * RES,
    backgroundColor: '#000000',
    pixelArt: true,
    roundPixels: true,
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.NO_CENTER },
    input: { activePointers: 3 },
    audio: { noAudio: true }, // tout le son passe par src/audio/AudioManager (synthèse Web Audio)
    scene: [BootScene, MenuScene, GameScene, RulesScene, DuelScene, ShopScene, AccountScene, CollectionScene, SignupScene],
  });
  // Recalage de l'écran : refait tout de suite puis encore deux fois, car sur Android la taille de la fenêtre
  // n'est pas toujours à jour au moment de l'événement (clavier qui se ferme, rotation, retour dans l'appli).
  const refit = () => {
    fitParent(game.scale.gameSize.width, game.scale.gameSize.height);
    game.scale.getParentBounds();
    game.scale.refresh();
  };
  const refitSoon = () => {
    refit();
    window.setTimeout(refit, 250);
    window.setTimeout(refit, 1000);
  };
  // Rotation : le jeu installé depuis Chrome garde l'orientation « portrait » de son ancienne installation
  // (Chrome ne la met à jour qu'après plusieurs jours). On la débloque nous-mêmes à chaque ouverture.
  const unlockRotation = () => {
    const so = screen.orientation as ScreenOrientation & { lock?: (o: string) => Promise<void> };
    try {
      void so?.lock?.('any').catch(() => undefined);
    } catch {
      /* navigateur sans verrouillage d'orientation : rien à faire */
    }
  };
  unlockRotation();
  document.addEventListener('pointerdown', unlockRotation, { once: true });
  document.addEventListener('visibilitychange', () => !document.hidden && unlockRotation());
  window.addEventListener('resize', refitSoon);
  // la partie passe en paysage ou revient en portrait (taille du canvas changée par GameScene)
  game.events.on('refit', refitSoon);
  window.addEventListener('orientationchange', refitSoon);
  window.addEventListener('focus', refitSoon);
  window.visualViewport?.addEventListener('resize', refitSoon);
  document.addEventListener('visibilitychange', () => !document.hidden && refitSoon());
  // Appli en arrière-plan (appel, autre appli, écran éteint) : la partie se met en pause.
  document.addEventListener('visibilitychange', () => document.hidden && game.events.emit('app-pause'));
  // Bouton Retour d'Android : pause en partie, retour au menu ailleurs, sortie depuis le menu.
  void App.addListener('backButton', () => {
    if (game.scene.isActive('Game')) game.events.emit('app-pause');
    else if (game.scene.isActive('Menu')) void App.exitApp();
    else {
      for (const k of ['Rules', 'Duel', 'Shop', 'Account', 'Collection', 'Signup']) if (game.scene.isActive(k)) game.scene.stop(k);
      game.scene.start('Menu');
    }
  });
  // Mise à jour automatique : à chaque retour dans l'appli et à chaque retour au menu, on vérifie s'il existe
  // une version plus récente en ligne. Jamais pendant une partie, pour ne pas la couper.
  const checkUpdate = () => {
    if (!game.scene.isActive('Game')) void reloadIfUpdated();
  };
  document.addEventListener('visibilitychange', () => !document.hidden && checkUpdate());
  window.addEventListener('focus', checkUpdate);
  void App.addListener('resume', checkUpdate);
  game.events.on('menu', checkUpdate);
  // Installation sur l'écran d'accueil (version en ligne ouverte dans Chrome) : le navigateur nous confie
  // la demande d'installation, le menu la propose au joueur (voir MenuScene).
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    game.registry.set('installPrompt', e);
    game.events.emit('installable');
  });
  window.addEventListener('appinstalled', () => game.registry.remove('installPrompt'));
  Object.assign(window, { game, audio }); // accès console pour le débogage
});
