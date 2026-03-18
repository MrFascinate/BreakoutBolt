import Phaser from 'phaser';
import { getGameWidth, getGameHeight } from '../utils/DeviceUtils';
import { getHighScore } from '../utils/HighScore';

export class MainMenuScene extends Phaser.Scene {
  private starting = false;

  constructor() {
    super({ key: 'MainMenuScene' });
  }

  create(): void {
    this.starting = false;
    const width = getGameWidth(this);
    const height = getGameHeight(this);

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

    // Invisible interactive play button — covers the baked-in PLAY button area
    // The PLAY button in the image is a wide orange bar at roughly 48-52% down
    const playBtn = this.add.rectangle(
      width / 2, height * 0.50, width * 0.75, height * 0.06, 0x000000, 0
    ).setInteractive({ useHandCursor: true }).setDepth(10);

    playBtn.on('pointerdown', () => this.startGame());

    // Keyboard shortcut
    this.input.keyboard?.on('keydown-SPACE', () => this.startGame());
  }

  private startGame(): void {
    if (this.starting) return;
    this.starting = true;

    const width = getGameWidth(this);
    const height = getGameHeight(this);

    // Flash overlay
    const flash = this.add.rectangle(width / 2, height / 2, width, height, 0xffffff, 0)
      .setDepth(100);

    // Quick white flash, then "GO!" text, then transition
    this.tweens.add({
      targets: flash,
      alpha: { from: 0, to: 1 },
      duration: 150,
      yoyo: true,
      onYoyo: () => {
        // Show "GO!" text during the flash
        const goText = this.add.text(width / 2, height / 2, 'GO!', {
          fontSize: '72px',
          fontFamily: 'Arial Black, Arial',
          color: '#ff6b35',
          stroke: '#000000',
          strokeThickness: 8,
        }).setOrigin(0.5).setDepth(101).setScale(0.5).setAlpha(0);

        this.tweens.add({
          targets: goText,
          scale: 1.5,
          alpha: { from: 1, to: 0 },
          duration: 500,
          ease: 'Power2',
          onComplete: () => {
            this.scene.start('GameScene');
          },
        });
      },
    });
  }
}
