import Phaser from 'phaser';
import '@fontsource/press-start-2p';
import { audio } from './audio/AudioManager';
import { H, W } from './core/constants';
import { BootScene } from './scenes/BootScene';
import { GameScene } from './scenes/GameScene';
import { MenuScene } from './scenes/MenuScene';

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
    scene: [BootScene, MenuScene, GameScene],
  });
  window.addEventListener('resize', () => {
    fitParent();
    game.scale.refresh();
  });
  Object.assign(window, { game, audio }); // accès console pour le débogage
});
