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

    // Semi-transparent HUD bar at top
    this.add.rectangle(width / 2, 0, width, 44, 0x000000, 0.5).setOrigin(0.5, 0);

    this.distanceText = this.add.text(padding, 12, 'Distance: 0.00 km', {
      fontSize: '14px',
      fontFamily: 'Arial',
      color: '#d4a574',
      stroke: '#000000',
      strokeThickness: 2,
    });

    this.scoreText = this.add.text(width - padding, 12, 'Score: 0', {
      fontSize: '14px',
      fontFamily: 'Arial',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 2,
    }).setOrigin(1, 0);

    this.livesText = this.add.text(width / 2, 12, '', {
      fontSize: '18px',
      fontFamily: 'Arial',
      color: '#ff4444',
      stroke: '#000000',
      strokeThickness: 2,
    }).setOrigin(0.5, 0);

    this.toastText = this.add.text(width / 2, 60, '', {
      fontSize: '20px',
      fontFamily: 'Arial Black, Arial',
      color: '#ffdd00',
      stroke: '#000000',
      strokeThickness: 4,
    }).setOrigin(0.5).setAlpha(0);

    // Listen to GameScene events
    const gameScene = this.scene.get('GameScene');

    gameScene.events.on('score-updated', (data: { score: number; distance: string }) => {
      if (!data) return;
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
    this.toastText.setY(60);

    this.tweens.add({
      targets: this.toastText,
      y: 46,
      alpha: 0,
      duration: 900,
      ease: 'Power2',
    });
  }
}
