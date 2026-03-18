import Phaser from 'phaser';
import { createGameConfig } from './config/GameConfig';

const game = new Phaser.Game(createGameConfig());

window.addEventListener('resize', () => {
  game.scale.resize(Math.min(window.innerWidth, 480), window.innerHeight);
});
