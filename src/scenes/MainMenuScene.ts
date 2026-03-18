import Phaser from 'phaser';
import { getGameWidth, getGameHeight } from '../utils/DeviceUtils';

export class MainMenuScene extends Phaser.Scene {
  constructor() {
    super({ key: 'MainMenuScene' });
  }

  create(): void {
    const width = getGameWidth(this);
    const height = getGameHeight(this);

    // Title
    this.add.text(width / 2, height * 0.25, 'OUTRUN\nTHE OPS', {
      fontSize: '48px',
      fontFamily: 'Arial Black, Arial',
      color: '#00cc44',
      align: 'center',
      stroke: '#000000',
      strokeThickness: 6,
    }).setOrigin(0.5);

    // Subtitle
    this.add.text(width / 2, height * 0.42, 'South LA Endless Runner', {
      fontSize: '16px',
      fontFamily: 'Arial',
      color: '#ffffff',
      align: 'center',
    }).setOrigin(0.5);

    // Play button
    const playBtn = this.add.rectangle(
      width / 2, height * 0.6, 200, 60, 0x00cc44
    ).setInteractive({ useHandCursor: true });

    this.add.text(width / 2, height * 0.6, 'PLAY', {
      fontSize: '28px',
      fontFamily: 'Arial Black, Arial',
      color: '#000000',
    }).setOrigin(0.5);

    playBtn.on('pointerover', () => playBtn.setFillStyle(0x00ff55));
    playBtn.on('pointerout', () => playBtn.setFillStyle(0x00cc44));
    playBtn.on('pointerdown', () => {
      this.scene.start('GameScene');
    });

    // Controls hint
    this.add.text(width / 2, height * 0.78, 'Swipe or Arrow Keys to move\nSwipe Up / Tap to jump\nSwipe Down to slide', {
      fontSize: '14px',
      fontFamily: 'Arial',
      color: '#cccccc',
      align: 'center',
    }).setOrigin(0.5);

    // Keyboard shortcut
    this.input.keyboard?.on('keydown-SPACE', () => {
      this.scene.start('GameScene');
    });
  }
}
