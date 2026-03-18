import Phaser from 'phaser';
import { getGameWidth } from '../utils/DeviceUtils';

export class UIScene extends Phaser.Scene {
  private scoreText!: Phaser.GameObjects.Text;
  private distanceText!: Phaser.GameObjects.Text;
  private livesText!: Phaser.GameObjects.Text;
  private toastText!: Phaser.GameObjects.Text;

  constructor() {
    super({ key: 'UIScene' });
  }

  create(): void {
    const width = getGameWidth(this);
    const padding = 16;

    this.distanceText = this.add.text(padding, padding, 'Distance: 0.00 km', {
      fontSize: '16px',
      fontFamily: 'Arial',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 3,
    });

    this.scoreText = this.add.text(width - padding, padding, 'Score: 0', {
      fontSize: '16px',
      fontFamily: 'Arial',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 3,
    }).setOrigin(1, 0);

    this.livesText = this.add.text(width / 2, padding, '', {
      fontSize: '20px',
      fontFamily: 'Arial',
      color: '#ff4444',
      stroke: '#000000',
      strokeThickness: 3,
    }).setOrigin(0.5, 0);

    this.toastText = this.add.text(width / 2, 80, '', {
      fontSize: '18px',
      fontFamily: 'Arial Black, Arial',
      color: '#ffdd00',
      stroke: '#000000',
      strokeThickness: 4,
    }).setOrigin(0.5).setAlpha(0);

    // Listen to GameScene events
    const gameScene = this.scene.get('GameScene');

    gameScene.events.on('score-updated', (data: { score: number; distance: string }) => {
      this.scoreText.setText(`Score: ${data.score.toLocaleString()}`);
      this.distanceText.setText(`Distance: ${data.distance}`);
    });

    gameScene.events.on('lives-changed', (lives: number) => {
      this.livesText.setText('\u2764 '.repeat(lives).trim());
    });

    gameScene.events.on('near-miss', () => {
      this.showToast('+100 CLOSE CALL');
    });

    // Set initial lives
    const initData = this.scene.settings.data as { lives: number };
    if (initData?.lives) {
      this.livesText.setText('\u2764 '.repeat(initData.lives).trim());
    }
  }

  private showToast(message: string): void {
    this.toastText.setText(message);
    this.toastText.setAlpha(1);
    this.toastText.setY(80);

    this.tweens.add({
      targets: this.toastText,
      y: 60,
      alpha: 0,
      duration: 800,
      ease: 'Power2',
    });
  }
}
