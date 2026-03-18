import Phaser from 'phaser';
import { getGameWidth, getGameHeight } from '../utils/DeviceUtils';
import { getHighScore, saveHighScore } from '../utils/HighScore';

export class GameOverScene extends Phaser.Scene {
  private starting = false;

  constructor() {
    super({ key: 'GameOverScene' });
  }

  create(data: { score: number; distance: string; level: number }): void {
    this.starting = false;
    const width = getGameWidth(this);
    const height = getGameHeight(this);
    const score = data.score ?? 0;
    const isNewHighScore = saveHighScore(score);
    const highScore = getHighScore();

    // Game Over background image
    const bg = this.add.image(width / 2, height / 2, 'gameover-screen');
    bg.setDisplaySize(width, height);

    // --- Dynamic text overlays positioned to match the baked-in layout ---
    // Image layout (1024x1536): GAME OVER ~5%, illustration ~10-33%,
    // SCORE/HIGH SCORE labels ~37%, values ~42%, divider ~46%,
    // LEVEL/DISTANCE labels ~48%, values ~52%, divider ~55%,
    // PLAY AGAIN button ~60%, MAIN MENU button ~67%

    // Score value
    this.add.text(width * 0.27, height * 0.43, `${score.toLocaleString()}`, {
      fontSize: '20px',
      fontFamily: 'Arial Black, Arial',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 3,
    }).setOrigin(0.5).setDepth(2);

    // High score value
    this.add.text(width * 0.73, height * 0.43, `${highScore.toLocaleString()}`, {
      fontSize: '20px',
      fontFamily: 'Arial Black, Arial',
      color: '#ffdd00',
      stroke: '#000000',
      strokeThickness: 3,
    }).setOrigin(0.5).setDepth(2);

    // New high score badge
    if (isNewHighScore && score > 0) {
      const badge = this.add.text(width / 2, height * 0.39, 'NEW HIGH SCORE!', {
        fontSize: '14px',
        fontFamily: 'Arial Black, Arial',
        color: '#ffdd00',
        stroke: '#000000',
        strokeThickness: 3,
      }).setOrigin(0.5).setDepth(3);

      this.tweens.add({
        targets: badge,
        scaleX: 1.1,
        scaleY: 1.1,
        duration: 500,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    }

    // Level value
    this.add.text(width * 0.27, height * 0.525, `${data.level ?? 1}`, {
      fontSize: '22px',
      fontFamily: 'Arial Black, Arial',
      color: '#ff6b35',
      stroke: '#000000',
      strokeThickness: 3,
    }).setOrigin(0.5).setDepth(2);

    // Distance value
    this.add.text(width * 0.73, height * 0.525, `${data.distance ?? '0.00 km'}`, {
      fontSize: '16px',
      fontFamily: 'Arial Black, Arial',
      color: '#d4a574',
      stroke: '#000000',
      strokeThickness: 3,
    }).setOrigin(0.5).setDepth(2);

    // PLAY AGAIN button — large hit area over the baked-in orange button (~59-62%)
    const retryBtn = this.add.rectangle(
      width / 2, height * 0.605, width * 0.75, height * 0.055, 0x000000, 0
    ).setInteractive({ useHandCursor: true }).setDepth(10);

    retryBtn.on('pointerdown', () => this.startGame());

    // MAIN MENU button — hit area over the baked-in dark button (~66-69%)
    const menuBtn = this.add.rectangle(
      width / 2, height * 0.675, width * 0.75, height * 0.05, 0x000000, 0
    ).setInteractive({ useHandCursor: true }).setDepth(10);

    menuBtn.on('pointerdown', () => {
      if (this.starting) return;
      this.starting = true;
      this.scene.start('MainMenuScene');
    });

    // Keyboard shortcuts
    this.input.keyboard?.on('keydown-SPACE', () => this.startGame());
    this.input.keyboard?.on('keydown-ESC', () => {
      this.scene.start('MainMenuScene');
    });
  }

  private startGame(): void {
    if (this.starting) return;
    this.starting = true;

    const width = getGameWidth(this);
    const height = getGameHeight(this);

    // Same flash + GO! transition as MainMenuScene
    const flash = this.add.rectangle(width / 2, height / 2, width, height, 0xffffff, 0)
      .setDepth(100);

    this.tweens.add({
      targets: flash,
      alpha: { from: 0, to: 1 },
      duration: 150,
      yoyo: true,
      onYoyo: () => {
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
