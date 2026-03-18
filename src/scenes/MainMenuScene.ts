import Phaser from 'phaser';
import { getGameWidth, getGameHeight } from '../utils/DeviceUtils';
import { getHighScore } from '../utils/HighScore';

export class MainMenuScene extends Phaser.Scene {
  constructor() {
    super({ key: 'MainMenuScene' });
  }

  create(): void {
    const width = getGameWidth(this);
    const height = getGameHeight(this);

    // Title screen background image (covers full screen)
    const bg = this.add.image(width / 2, height / 2, 'title-screen');
    bg.setDisplaySize(width, height);

    // High score overlay — positioned where the baked-in "High Score: 18,473" text is
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

    // Invisible interactive play button zone over the baked-in PLAY button (~48-55% down)
    const playBtn = this.add.rectangle(
      width / 2, height * 0.505, width * 0.7, height * 0.055, 0x000000, 0
    ).setInteractive({ useHandCursor: true }).setDepth(10);

    playBtn.on('pointerdown', () => {
      this.scene.start('GameScene');
    });

    // Keyboard shortcut
    this.input.keyboard?.on('keydown-SPACE', () => {
      this.scene.start('GameScene');
    });
  }
}
