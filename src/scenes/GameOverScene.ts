import Phaser from 'phaser';
import { getGameWidth, getGameHeight } from '../utils/DeviceUtils';
import { getHighScore, saveHighScore } from '../utils/HighScore';

export class GameOverScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameOverScene' });
  }

  create(data: { score: number; distance: string; level: number }): void {
    const width = getGameWidth(this);
    const height = getGameHeight(this);
    const score = data.score ?? 0;
    const isNewHighScore = saveHighScore(score);
    const highScore = getHighScore();

    // Dark background
    this.cameras.main.setBackgroundColor('#0d0d1a');

    // Red accent bar at top
    this.add.rectangle(width / 2, 0, width, 6, 0xff3333).setOrigin(0.5, 0);

    // Game Over text
    this.add.text(width / 2, height * 0.10, 'GAME OVER', {
      fontSize: '44px',
      fontFamily: 'Arial Black, Arial',
      color: '#ff3333',
      stroke: '#000000',
      strokeThickness: 6,
    }).setOrigin(0.5);

    // Divider
    this.add.rectangle(width / 2, height * 0.17, 120, 2, 0x333344);

    // Score
    this.add.text(width / 2, height * 0.20, 'SCORE', {
      fontSize: '14px',
      fontFamily: 'Arial',
      color: '#888899',
      letterSpacing: 4,
    }).setOrigin(0.5);

    this.add.text(width / 2, height * 0.25, `${score.toLocaleString()}`, {
      fontSize: '36px',
      fontFamily: 'Arial Black, Arial',
      color: '#ffffff',
    }).setOrigin(0.5);

    // New high score badge
    if (isNewHighScore && score > 0) {
      const badge = this.add.text(width / 2, height * 0.30, 'NEW HIGH SCORE!', {
        fontSize: '18px',
        fontFamily: 'Arial Black, Arial',
        color: '#ffdd00',
        stroke: '#000000',
        strokeThickness: 3,
      }).setOrigin(0.5);

      this.tweens.add({
        targets: badge,
        scaleX: 1.1,
        scaleY: 1.1,
        duration: 500,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    } else {
      this.add.text(width / 2, height * 0.30, `High Score: ${highScore.toLocaleString()}`, {
        fontSize: '14px',
        fontFamily: 'Arial',
        color: '#ffdd00',
      }).setOrigin(0.5);
    }

    // Level + Distance row
    const colLeft = width * 0.3;
    const colRight = width * 0.7;

    this.add.text(colLeft, height * 0.35, 'LEVEL', {
      fontSize: '12px',
      fontFamily: 'Arial',
      color: '#888899',
      letterSpacing: 3,
    }).setOrigin(0.5);

    this.add.text(colLeft, height * 0.39, `${data.level ?? 1}`, {
      fontSize: '28px',
      fontFamily: 'Arial Black, Arial',
      color: '#ff6b35',
    }).setOrigin(0.5);

    this.add.text(colRight, height * 0.35, 'DISTANCE', {
      fontSize: '12px',
      fontFamily: 'Arial',
      color: '#888899',
      letterSpacing: 3,
    }).setOrigin(0.5);

    this.add.text(colRight, height * 0.39, `${data.distance ?? '0.00 km'}`, {
      fontSize: '18px',
      fontFamily: 'Arial',
      color: '#d4a574',
    }).setOrigin(0.5);

    // Retry button
    const retryBtn = this.add.rectangle(
      width / 2, height * 0.50, 220, 60, 0xff6b35
    ).setInteractive({ useHandCursor: true });

    this.add.text(width / 2, height * 0.50, 'PLAY AGAIN', {
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

    // Share CTA
    this.add.rectangle(width / 2, height * 0.59, 220, 2, 0x222244);

    this.add.text(width / 2, height * 0.63, 'Screenshot & share your score!', {
      fontSize: '14px',
      fontFamily: 'Arial',
      color: '#aaaacc',
      align: 'center',
    }).setOrigin(0.5);

    this.add.text(width / 2, height * 0.67, 'OUTRUN THE OPS', {
      fontSize: '22px',
      fontFamily: 'Arial Black, Arial',
      color: '#ff6b35',
      stroke: '#000000',
      strokeThickness: 4,
    }).setOrigin(0.5);

    this.add.text(width / 2, height * 0.71, 'Can you beat my score? \uD83D\uDC40', {
      fontSize: '16px',
      fontFamily: 'Arial',
      color: '#ddddee',
    }).setOrigin(0.5);

    // Menu button
    const menuBtn = this.add.rectangle(
      width / 2, height * 0.79, 220, 50, 0x222233
    ).setInteractive({ useHandCursor: true })
      .setStrokeStyle(2, 0x444466);

    this.add.text(width / 2, height * 0.79, 'MAIN MENU', {
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
