import Phaser from 'phaser';
import { getGameWidth, getGameHeight } from '../utils/DeviceUtils';

export class GameOverScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameOverScene' });
  }

  create(data: { score: number; distance: string }): void {
    const width = getGameWidth(this);
    const height = getGameHeight(this);

    // Dark background
    this.cameras.main.setBackgroundColor('#0d0d1a');

    // Red accent bar at top
    this.add.rectangle(width / 2, 0, width, 6, 0xff3333).setOrigin(0.5, 0);

    // Game Over text
    this.add.text(width / 2, height * 0.18, 'GAME OVER', {
      fontSize: '44px',
      fontFamily: 'Arial Black, Arial',
      color: '#ff3333',
      stroke: '#000000',
      strokeThickness: 6,
    }).setOrigin(0.5);

    // Divider
    this.add.rectangle(width / 2, height * 0.27, 120, 2, 0x333344);

    // Score
    this.add.text(width / 2, height * 0.34, 'SCORE', {
      fontSize: '14px',
      fontFamily: 'Arial',
      color: '#888899',
      letterSpacing: 4,
    }).setOrigin(0.5);

    this.add.text(width / 2, height * 0.40, `${(data.score ?? 0).toLocaleString()}`, {
      fontSize: '36px',
      fontFamily: 'Arial Black, Arial',
      color: '#ffffff',
    }).setOrigin(0.5);

    // Distance
    this.add.text(width / 2, height * 0.48, 'DISTANCE', {
      fontSize: '14px',
      fontFamily: 'Arial',
      color: '#888899',
      letterSpacing: 4,
    }).setOrigin(0.5);

    this.add.text(width / 2, height * 0.53, `${data.distance ?? '0.00 km'}`, {
      fontSize: '24px',
      fontFamily: 'Arial',
      color: '#d4a574',
    }).setOrigin(0.5);

    // Retry button
    const retryBtn = this.add.rectangle(
      width / 2, height * 0.66, 220, 60, 0xff6b35
    ).setInteractive({ useHandCursor: true });

    this.add.text(width / 2, height * 0.66, 'PLAY AGAIN', {
      fontSize: '24px',
      fontFamily: 'Arial Black, Arial',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 2,
    }).setOrigin(0.5);

    retryBtn.on('pointerover', () => retryBtn.setFillStyle(0xff8855));
    retryBtn.on('pointerout', () => retryBtn.setFillStyle(0xff6b35));
    retryBtn.on('pointerdown', () => {
      this.scene.start('GameScene');
    });

    // Menu button
    const menuBtn = this.add.rectangle(
      width / 2, height * 0.77, 220, 50, 0x222233
    ).setInteractive({ useHandCursor: true })
      .setStrokeStyle(2, 0x444466);

    this.add.text(width / 2, height * 0.77, 'MAIN MENU', {
      fontSize: '20px',
      fontFamily: 'Arial',
      color: '#ccccdd',
    }).setOrigin(0.5);

    menuBtn.on('pointerover', () => menuBtn.setFillStyle(0x333355));
    menuBtn.on('pointerout', () => menuBtn.setFillStyle(0x222233));
    menuBtn.on('pointerdown', () => {
      this.scene.start('MainMenuScene');
    });

    // Hint text
    this.add.text(width / 2, height * 0.88, 'SPACE to retry  |  ESC for menu', {
      fontSize: '11px',
      fontFamily: 'Arial',
      color: '#555566',
    }).setOrigin(0.5);

    // Keyboard shortcuts
    this.input.keyboard?.on('keydown-SPACE', () => {
      this.scene.start('GameScene');
    });
    this.input.keyboard?.on('keydown-ESC', () => {
      this.scene.start('MainMenuScene');
    });
  }
}
