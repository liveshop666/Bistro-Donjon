import Phaser from 'phaser';
import '@fontsource/press-start-2p';
import { audio } from './audio/AudioManager';
import { H, W } from './core/constants';
import { BootScene } from './scenes/BootScene';
import { GameScene } from './scenes/GameScene';
import { MenuScene } from './scenes/MenuScene';
import { RulesScene } from './scenes/RulesScene';
import { DuelScene } from './scenes/DuelScene';
import { ShopScene } from './scenes/ShopScene';
import { AccountScene } from './scenes/AccountScene';
import { App } from '@capacitor/app';
import { reloadIfUpdated } from './core/update';

const parent = document.getElementById('game') as HTMLDivElement;

/**
 * Pixel Perfect : le canvas 360x640 est agrandi d'un facteur ENTIER en pixels physiques
 * (ex. x3 sur un écran 1080 px de large), avec bandes noires si besoin.
 */
function fitParent(): void {
  const dpr = window.devicePixelRatio || 1;
  const zoom = Math.floor(Math.min((window.innerWidth * dpr) / W, (window.innerHeight * dpr) / H));
  const css = zoom >= 1 ? zoom / dpr : Math.min(window.innerWidth / W, window.innerHeight / H);
  parent.style.width = `${W * css}px`;
  parent.style.height = `${H * css}px`;
}
fitParent();

document.fonts.load('8px "Press Start 2P"').finally(() => {
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    width: W,
    height: H,
    backgroundColor: '#000000',
    pixelArt: true,
    roundPixels: true,
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.NO_CENTER },
    input: { activePointers: 3 },
    audio: { noAudio: true }, // tout le son passe par src/audio/AudioManager (synthèse Web Audio)
    scene: [BootScene, MenuScene, GameScene, RulesScene, DuelScene, ShopScene, AccountScene],
  });
  // Recalage de l'écran : refait tout de suite puis encore deux fois, car sur Android la taille de la fenêtre
  // n'est pas toujours à jour au moment de l'événement (clavier qui se ferme, rotation, retour dans l'appli).
  const refit = () => {
    fitParent();
    game.scale.getParentBounds();
    game.scale.refresh();
  };
  const refitSoon = () => {
    refit();
    window.setTimeout(refit, 250);
    window.setTimeout(refit, 1000);
  };
  window.addEventListener('resize', refitSoon);
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
      for (const k of ['Rules', 'Duel', 'Shop', 'Account']) if (game.scene.isActive(k)) game.scene.stop(k);
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
