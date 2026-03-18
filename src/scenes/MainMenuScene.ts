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

    // Dark background
    this.cameras.main.setBackgroundColor('#0d0d1a');

    // Title
    this.add.text(width / 2, height * 0.22, 'OUTRUN\nTHE OPS', {
      fontSize: '48px',
      fontFamily: 'Arial Black, Arial',
      color: '#ff6b35',
      align: 'center',
      stroke: '#000000',
      strokeThickness: 8,
    }).setOrigin(0.5);

    // Subtitle
    this.add.text(width / 2, height * 0.40, 'South LA Endless Runner', {
      fontSize: '16px',
      fontFamily: 'Arial',
      color: '#d4a574',
      align: 'center',
    }).setOrigin(0.5);

    // Play button
    const playBtn = this.add.rectangle(
      width / 2, height * 0.54, 220, 64, 0xff6b35
    ).setInteractive({ useHandCursor: true });

    this.add.text(width / 2, height * 0.54, 'PLAY', {
      fontSize: '30px',
      fontFamily: 'Arial Black, Arial',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 2,
    }).setOrigin(0.5);

    playBtn.on('pointerover', () => playBtn.setFillStyle(0xff8855));
    playBtn.on('pointerout', () => playBtn.setFillStyle(0xff6b35));
    playBtn.on('pointerdown', () => {
      this.scene.start('GameScene');
    });

    // High score display
    const highScore = getHighScore();
    if (highScore > 0) {
      this.add.text(width / 2, height * 0.46, `High Score: ${highScore.toLocaleString()}`, {
        fontSize: '16px',
        fontFamily: 'Arial Black, Arial',
        color: '#ffdd00',
        stroke: '#000000',
        strokeThickness: 2,
      }).setOrigin(0.5);
    }

    // Controls section
    this.add.text(width / 2, height * 0.66, '— CONTROLS —', {
      fontSize: '15px',
      fontFamily: 'Arial Black, Arial',
      color: '#ff6b35',
      align: 'center',
    }).setOrigin(0.5);

    const controlLines = [
      ['Move Left', 'Swipe Left  /  \u2190 or A'],
      ['Move Right', 'Swipe Right  /  \u2192 or D'],
    ];

    const startY = height * 0.71;
    const lineHeight = 22;
    const colLeft = width / 2 - 10;
    const colRight = width / 2 + 10;

    controlLines.forEach((line, i) => {
      const y = startY + i * lineHeight;
      this.add.text(colLeft, y, line[0], {
        fontSize: '13px',
        fontFamily: 'Arial',
        color: '#e0e0e0',
        align: 'right',
      }).setOrigin(1, 0.5);

      this.add.text(colRight, y, line[1], {
        fontSize: '13px',
        fontFamily: 'Arial',
        color: '#999999',
        align: 'left',
      }).setOrigin(0, 0.5);
    });

    this.add.text(width / 2, startY + controlLines.length * lineHeight + 18, 'Dodge cops, MAGA, and haters. Don\'t get caught!', {
      fontSize: '12px',
      fontFamily: 'Arial',
      color: '#777777',
      align: 'center',
    }).setOrigin(0.5);

    // Keyboard shortcut
    this.input.keyboard?.on('keydown-SPACE', () => {
      this.scene.start('GameScene');
    });
  }
}
