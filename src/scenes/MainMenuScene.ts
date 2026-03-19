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

    // Scene-level tap detection — more reliable on mobile than invisible game objects
    const playMinY = height * 0.76;
    const playMaxY = height * 0.84;
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (pointer.y >= playMinY && pointer.y <= playMaxY) {
        this.startGame();
      }
    });

    // Keyboard shortcut
    this.input.keyboard?.on('keydown-SPACE', () => this.startGame());
  }

  private startGame(): void {
    if (this.starting) return;
    this.starting = true;

    const width = getGameWidth(this);
    const height = getGameHeight(this);

    // Flash + GO! animation, then switch scene via delayedCall for reliability
    const flash = this.add.rectangle(width / 2, height / 2, width, height, 0xffffff, 0)
      .setDepth(100);

    this.tweens.add({
      targets: flash,
      alpha: { from: 0, to: 0.9 },
      duration: 120,
      yoyo: true,
    });

    const goText = this.add.text(width / 2, height / 2, 'GO!', {
      fontSize: '72px',
      fontFamily: 'Arial Black, Arial',
      color: '#ff6b35',
      stroke: '#000000',
      strokeThickness: 8,
    }).setOrigin(0.5).setDepth(101).setScale(0.3).setAlpha(0);

    this.tweens.add({
      targets: goText,
      scale: 1.5,
      alpha: { from: 1, to: 0 },
      delay: 100,
      duration: 450,
      ease: 'Power2',
    });

    // Scene switch via delayedCall — guaranteed to fire
    this.time.delayedCall(600, () => {
      this.scene.start('GameScene');
    });
  }
}
