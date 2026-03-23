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

    // Ensure no leftover scenes from a previous game
    if (this.scene.isActive('UIScene') || this.scene.isSleeping('UIScene')) {
      this.scene.stop('UIScene');
    }
    if (this.scene.isActive('GameScene') || this.scene.isSleeping('GameScene')) {
      this.scene.stop('GameScene');
    }

    const width = getGameWidth(this);
    const height = this.cameras.main.height;

    // Title screen background image (covers full screen)
    const bg = this.add.image(width / 2, height / 2, 'title-screen');
    bg.setDisplaySize(width, height);

    // Cover the baked-in high score text in the image with a matching background,
    // then draw the real dynamic high score from localStorage on top.
    // The baked-in text sits at ~43.5% down the image.
    const highScore = getHighScore();
    const hsY = height * 0.435;
    // Opaque cover to hide the baked-in "High Score: 18,473" in the image
    this.add.rectangle(width / 2, hsY, width * 0.55, 22, 0x1a0a2e, 1)
      .setOrigin(0.5)
      .setDepth(1);
    // Single source-of-truth high score from localStorage
    this.add.text(width / 2, hsY, highScore > 0 ? `High Score: ${highScore.toLocaleString()}` : '', {
      fontSize: '14px',
      fontFamily: 'Arial Black, Arial',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 3,
    }).setOrigin(0.5).setDepth(2);

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
