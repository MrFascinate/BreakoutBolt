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

    // Game Over background image
    const bg = this.add.image(width / 2, height / 2, 'gameover-screen');
    bg.setDisplaySize(width, height);

    // Dynamic text overlays positioned to match the baked-in layout
    // The image has: GAME OVER title, illustration, then placeholders for stats

    // Score value — positioned over the "SCORE" area (~42% down)
    this.add.text(width * 0.27, height * 0.425, `${score.toLocaleString()}`, {
      fontSize: '22px',
      fontFamily: 'Arial Black, Arial',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 3,
    }).setOrigin(0.5).setDepth(2);

    // High score value — positioned over the "HIGH SCORE" area
    this.add.text(width * 0.73, height * 0.425, `${highScore.toLocaleString()}`, {
      fontSize: '22px',
      fontFamily: 'Arial Black, Arial',
      color: '#ffdd00',
      stroke: '#000000',
      strokeThickness: 3,
    }).setOrigin(0.5).setDepth(2);

    // New high score badge
    if (isNewHighScore && score > 0) {
      const badge = this.add.text(width / 2, height * 0.385, 'NEW HIGH SCORE!', {
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

    // Level value — positioned over the "LEVEL" area (~50% down)
    this.add.text(width * 0.27, height * 0.51, `${data.level ?? 1}`, {
      fontSize: '24px',
      fontFamily: 'Arial Black, Arial',
      color: '#ff6b35',
      stroke: '#000000',
      strokeThickness: 3,
    }).setOrigin(0.5).setDepth(2);

    // Distance value — positioned over the "DISTANCE" area
    this.add.text(width * 0.73, height * 0.51, `${data.distance ?? '0.00 km'}`, {
      fontSize: '18px',
      fontFamily: 'Arial Black, Arial',
      color: '#d4a574',
      stroke: '#000000',
      strokeThickness: 3,
    }).setOrigin(0.5).setDepth(2);

    // Invisible interactive PLAY AGAIN button over the baked-in button (~60% down)
    const retryBtn = this.add.rectangle(
      width / 2, height * 0.595, width * 0.7, height * 0.05, 0x000000, 0
    ).setInteractive({ useHandCursor: true }).setDepth(10);

    retryBtn.on('pointerdown', () => {
      this.scene.start('GameScene');
    });

    // Invisible interactive MAIN MENU button over the baked-in button (~67% down)
    const menuBtn = this.add.rectangle(
      width / 2, height * 0.665, width * 0.7, height * 0.045, 0x000000, 0
    ).setInteractive({ useHandCursor: true }).setDepth(10);

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
