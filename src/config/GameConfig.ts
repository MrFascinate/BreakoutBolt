import Phaser from 'phaser';
import { BootScene } from '../scenes/BootScene';
import { MainMenuScene } from '../scenes/MainMenuScene';
import { GameScene } from '../scenes/GameScene';
import { UIScene } from '../scenes/UIScene';
import { GameOverScene } from '../scenes/GameOverScene';

export function createGameConfig(): Phaser.Types.Core.GameConfig {
  const width = Math.min(window.innerWidth, 480);
  const height = window.innerHeight;

  return {
    type: Phaser.AUTO,
    width,
    height,
    parent: document.body,
    backgroundColor: '#87CEEB',
    physics: {
      default: 'arcade',
      arcade: {
        gravity: { x: 0, y: 0 },
        debug: false,
      },
    },
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    scene: [BootScene, MainMenuScene, GameScene, UIScene, GameOverScene],
  };
}
