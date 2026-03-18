import Phaser from 'phaser';
import { getGameWidth, getGameHeight } from '../utils/DeviceUtils';

export class UIScene extends Phaser.Scene {
  private scoreText!: Phaser.GameObjects.Text;
  private distanceText!: Phaser.GameObjects.Text;
  private livesText!: Phaser.GameObjects.Text;
  private levelText!: Phaser.GameObjects.Text;
  private toastText!: Phaser.GameObjects.Text;
  private levelUpText!: Phaser.GameObjects.Text;

  constructor() {
    super({ key: 'UIScene' });
  }

  create(): void {
    const width = getGameWidth(this);
    const height = getGameHeight(this);
    const padding = 16;

    // Semi-transparent HUD bar at top
    this.add.rectangle(width / 2, 0, width, 50, 0x000000, 0.6).setOrigin(0.5, 0);

    // Top row: distance (left), lives (center), score (right)
    this.distanceText = this.add.text(padding, 6, '0.00 km', {
      fontSize: '14px',
      fontFamily: 'Arial',
      color: '#d4a574',
      stroke: '#000000',
      strokeThickness: 2,
    });

    this.livesText = this.add.text(width / 2, 6, '', {
      fontSize: '18px',
      fontFamily: 'Arial',
      color: '#ff4444',
      stroke: '#000000',
      strokeThickness: 2,
    }).setOrigin(0.5, 0);

    this.scoreText = this.add.text(width - padding, 6, '0', {
      fontSize: '14px',
      fontFamily: 'Arial',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 2,
    }).setOrigin(1, 0);

    // Bottom row: level indicator (centered, prominent)
    this.levelText = this.add.text(width / 2, 30, 'LEVEL 1', {
      fontSize: '16px',
      fontFamily: 'Arial Black, Arial',
      color: '#ff6b35',
      stroke: '#000000',
      strokeThickness: 3,
    }).setOrigin(0.5, 0);

    // Toast for close calls (below HUD)
    this.toastText = this.add.text(width / 2, 70, '', {
      fontSize: '20px',
      fontFamily: 'Arial Black, Arial',
      color: '#ffdd00',
      stroke: '#000000',
      strokeThickness: 4,
    }).setOrigin(0.5).setAlpha(0);

    // Big centered level-up announcement
    this.levelUpText = this.add.text(width / 2, height * 0.35, '', {
      fontSize: '48px',
      fontFamily: 'Arial Black, Arial',
      color: '#ff6b35',
      stroke: '#000000',
      strokeThickness: 8,
    }).setOrigin(0.5).setAlpha(0);

    // Listen to GameScene events
    const gameScene = this.scene.get('GameScene');

    gameScene.events.on('score-updated', (data: { score: number; distance: string }) => {
      if (!data) return;
      this.scoreText.setText(`${data.score.toLocaleString()}`);
      this.distanceText.setText(`${data.distance}`);
    });

    gameScene.events.on('lives-changed', (lives: number) => {
      this.livesText.setText('\u2764 '.repeat(lives).trim());
    });

    gameScene.events.on('near-miss', () => {
      this.showToast('+100 CLOSE CALL');
    });

    gameScene.events.on('level-changed', (level: number) => {
      this.levelText.setText(`LEVEL ${level}`);
      if (level > 1) {
        this.showLevelUp(level);
      }
    });

    // Set initial state
    const initData = this.scene.settings.data as { lives: number; level: number };
    if (initData?.lives) {
      this.livesText.setText('\u2764 '.repeat(initData.lives).trim());
    }
    if (initData?.level) {
      this.levelText.setText(`LEVEL ${initData.level}`);
    }
  }

  private showToast(message: string): void {
    this.toastText.setText(message);
    this.toastText.setAlpha(1);
    this.toastText.setY(70);

    this.tweens.add({
      targets: this.toastText,
      y: 56,
      alpha: 0,
      duration: 900,
      ease: 'Power2',
    });
  }

  private showLevelUp(level: number): void {
    this.levelUpText.setText(`LEVEL ${level}`);
    this.levelUpText.setAlpha(1);
    this.levelUpText.setScale(0.3);

    this.tweens.add({
      targets: this.levelUpText,
      scaleX: 1,
      scaleY: 1,
      duration: 400,
      ease: 'Back.easeOut',
      onComplete: () => {
        this.tweens.add({
          targets: this.levelUpText,
          alpha: 0,
          y: this.levelUpText.y - 40,
          delay: 600,
          duration: 500,
          ease: 'Power2',
        });
      },
    });
  }
}
