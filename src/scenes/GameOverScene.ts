import Phaser from 'phaser';
import { getGameWidth, getGameHeight } from '../utils/DeviceUtils';

export class GameOverScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameOverScene' });
  }

  create(data: { score: number; distance: string }): void {
    const width = getGameWidth(this);
    const height = getGameHeight(this);

    // Darken background
    this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.7);

    // Game Over text
    this.add.text(width / 2, height * 0.2, 'GAME OVER', {
      fontSize: '42px',
      fontFamily: 'Arial Black, Arial',
      color: '#ff4444',
      stroke: '#000000',
      strokeThickness: 6,
    }).setOrigin(0.5);

    // Score
    this.add.text(width / 2, height * 0.38, `Score: ${data.score.toLocaleString()}`, {
      fontSize: '28px',
      fontFamily: 'Arial',
      color: '#ffffff',
    }).setOrigin(0.5);

    // Distance
    this.add.text(width / 2, height * 0.46, `Distance: ${data.distance}`, {
      fontSize: '22px',
      fontFamily: 'Arial',
      color: '#cccccc',
    }).setOrigin(0.5);

    // Retry button
    const retryBtn = this.add.rectangle(
      width / 2, height * 0.62, 200, 60, 0x00cc44
    ).setInteractive({ useHandCursor: true });

    this.add.text(width / 2, height * 0.62, 'PLAY AGAIN', {
      fontSize: '24px',
      fontFamily: 'Arial Black, Arial',
      color: '#000000',
    }).setOrigin(0.5);

    retryBtn.on('pointerover', () => retryBtn.setFillStyle(0x00ff55));
    retryBtn.on('pointerout', () => retryBtn.setFillStyle(0x00cc44));
    retryBtn.on('pointerdown', () => {
      this.scene.start('GameScene');
    });

    // Menu button
    const menuBtn = this.add.rectangle(
      width / 2, height * 0.74, 200, 50, 0x444444
    ).setInteractive({ useHandCursor: true });

    this.add.text(width / 2, height * 0.74, 'MAIN MENU', {
      fontSize: '20px',
      fontFamily: 'Arial',
      color: '#ffffff',
    }).setOrigin(0.5);

    menuBtn.on('pointerover', () => menuBtn.setFillStyle(0x666666));
    menuBtn.on('pointerout', () => menuBtn.setFillStyle(0x444444));
    menuBtn.on('pointerdown', () => {
      this.scene.start('MainMenuScene');
    });

    // Keyboard shortcuts
    this.input.keyboard?.on('keydown-SPACE', () => {
      this.scene.start('GameScene');
    });
    this.input.keyboard?.on('keydown-ESC', () => {
      this.scene.start('MainMenuScene');
    });
  }
}
