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

    // Controls section
    this.add.text(width / 2, height * 0.72, '— CONTROLS —', {
      fontSize: '16px',
      fontFamily: 'Arial Black, Arial',
      color: '#00cc44',
      align: 'center',
    }).setOrigin(0.5);

    const controlLines = [
      ['Move Left', 'Swipe Left  /  \u2190'],
      ['Move Right', 'Swipe Right  /  \u2192'],
      ['Jump', 'Swipe Up or Tap  /  \u2191'],
      ['Slide', 'Swipe Down  /  \u2193 or S'],
    ];

    const startY = height * 0.77;
    const lineHeight = 22;
    const colLeft = width / 2 - 10;
    const colRight = width / 2 + 10;

    controlLines.forEach((line, i) => {
      const y = startY + i * lineHeight;
      this.add.text(colLeft, y, line[0], {
        fontSize: '13px',
        fontFamily: 'Arial',
        color: '#ffffff',
        align: 'right',
      }).setOrigin(1, 0.5);

      this.add.text(colRight, y, line[1], {
        fontSize: '13px',
        fontFamily: 'Arial',
        color: '#aaaaaa',
        align: 'left',
      }).setOrigin(0, 0.5);
    });

    this.add.text(width / 2, startY + controlLines.length * lineHeight + 14, 'Dodge cops, MAGA, and haters. Don\'t get caught!', {
      fontSize: '12px',
      fontFamily: 'Arial',
      color: '#888888',
      align: 'center',
    }).setOrigin(0.5);

    // Keyboard shortcut
    this.input.keyboard?.on('keydown-SPACE', () => {
      this.scene.start('GameScene');
    });
  }
}
