import Phaser from 'phaser';
import { getGameWidth } from '../utils/DeviceUtils';
import { getHighScore } from '../utils/HighScore';

export class MainMenuScene extends Phaser.Scene {
  private starting = false;

  constructor() {
    super({ key: 'MainMenuScene' });
  }

  create(): void {
    this.starting = false;
    const width = getGameWidth(this);
    const height = this.cameras.main.height;

    // Title screen background image (covers full screen)
    const bg = this.add.image(width / 2, height / 2, 'title-screen');
    bg.setDisplaySize(width, height);

    // High score overlay — positioned where the baked-in text is (~43% down)
    const highScore = getHighScore();
    if (highScore > 0) {
      this.add.text(width / 2, height * 0.435, `High Score: ${highScore.toLocaleString()}`, {
        fontSize: '14px',
        fontFamily: 'Arial Black, Arial',
        color: '#ffffff',
        stroke: '#000000',
        strokeThickness: 3,
      }).setOrigin(0.5).setDepth(2);
    }

    // Any tap anywhere starts the game
    this.input.on('pointerdown', () => this.startGame());

    // Keyboard shortcut
    this.input.keyboard?.on('keydown-SPACE', () => this.startGame());
  }

  private startGame(): void {
    if (this.starting) return;
    this.starting = true;
    this.scene.start('GameScene');
  }
}
