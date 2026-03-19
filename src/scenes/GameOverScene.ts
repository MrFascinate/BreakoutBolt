import Phaser from 'phaser';
import { getGameWidth, getGameHeight } from '../utils/DeviceUtils';
import { getHighScore, saveHighScore } from '../utils/HighScore';

export class GameOverScene extends Phaser.Scene {
  private starting = false;

  constructor() {
    super({ key: 'GameOverScene' });
  }

  create(data: { score: number; distance: string; level: number }): void {
    this.starting = false;
    const width = getGameWidth(this);
    const height = getGameHeight(this);
    const score = data.score ?? 0;
    const isNewHighScore = saveHighScore(score);
    const highScore = getHighScore();

    // Game Over background image
    const bg = this.add.image(width / 2, height / 2, 'gameover-screen');
    bg.setDisplaySize(width, height);

    // --- Dynamic text overlays positioned to match the baked-in layout ---
    // Image layout (1024x1536): GAME OVER ~3%, illustration ~5-38%,
    // SCORE/HIGH SCORE labels ~44%, values ~48%, divider ~53%,
    // LEVEL/DISTANCE labels ~56%, values ~60%, divider ~64%,
    // PLAY AGAIN button ~75%, MAIN MENU button ~85%

    // Score value — positioned over the "SCORE" area (~48% down)
    this.add.text(width * 0.27, height * 0.48, `${score.toLocaleString()}`, {
      fontSize: '20px',
      fontFamily: 'Arial Black, Arial',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 3,
    }).setOrigin(0.5).setDepth(2);

    // High score value
    this.add.text(width * 0.73, height * 0.48, `${highScore.toLocaleString()}`, {
      fontSize: '20px',
      fontFamily: 'Arial Black, Arial',
      color: '#ffdd00',
      stroke: '#000000',
      strokeThickness: 3,
    }).setOrigin(0.5).setDepth(2);

    // New high score badge
    if (isNewHighScore && score > 0) {
      const badge = this.add.text(width / 2, height * 0.44, 'NEW HIGH SCORE!', {
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

    // Level value — positioned over the "LEVEL" area (~60% down)
    this.add.text(width * 0.27, height * 0.60, `${data.level ?? 1}`, {
      fontSize: '22px',
      fontFamily: 'Arial Black, Arial',
      color: '#ff6b35',
      stroke: '#000000',
      strokeThickness: 3,
    }).setOrigin(0.5).setDepth(2);

    // Distance value
    this.add.text(width * 0.73, height * 0.60, `${data.distance ?? '0.00 mi'}`, {
      fontSize: '16px',
      fontFamily: 'Arial Black, Arial',
      color: '#d4a574',
      stroke: '#000000',
      strokeThickness: 3,
    }).setOrigin(0.5).setDepth(2);

    // Tap bottom half → play again, tap top half → main menu
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (pointer.y >= height * 0.5) {
        this.startGame();
      } else {
        if (this.starting) return;
        this.starting = true;
        this.scene.start('MainMenuScene');
      }
    });

    // Keyboard shortcuts
    this.input.keyboard?.on('keydown-SPACE', () => this.startGame());
    this.input.keyboard?.on('keydown-ESC', () => {
      this.scene.start('MainMenuScene');
    });
  }

  private startGame(): void {
    if (this.starting) return;
    this.starting = true;
    this.scene.start('GameScene');
  }
}
