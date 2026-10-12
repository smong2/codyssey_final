import { registry } from './minigames/index.js';
import { MenuScene } from './scenes/MenuScene.js';
import { ResultScene } from './scenes/ResultScene.js';
import { SPACES } from './ui/theme.js';

class BootScene extends Phaser.Scene {
  constructor() { super('boot'); }
  preload() {
    for (const [id, space] of Object.entries(SPACES)) this.load.image(`space-${id}`, `./world-assets/${space.image}`);
  }
  create() { this.scene.start('menu'); }
}

new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: 1280, height: 720,
  backgroundColor: '#172a3a',
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  render: { antialias: true, pixelArt: false },
  scene: [BootScene, MenuScene, ResultScene, ...registry.map(game => game.scene)],
});
