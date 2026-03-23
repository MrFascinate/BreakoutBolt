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
    // Image layout (1024x1536): GAME OVER ~4%, illustration ~8-52%,
    // SCORE label ~56%, HIGH SCORE label ~56%, values below labels ~60%,
    // LEVEL label ~66%, DISTANCE label ~66%, values below labels ~70%,
    // PLAY AGAIN button ~80%, MAIN MENU button ~90%

    // Score value — below the "SCORE" label
    this.add.text(width * 0.27, height * 0.61, `${score.toLocaleString()}`, {
      fontSize: '22px',
      fontFamily: 'Arial Black, Arial',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 3,
    }).setOrigin(0.5).setDepth(2);

    // High score value — below the "HIGH SCORE" label
    this.add.text(width * 0.73, height * 0.61, `${highScore.toLocaleString()}`, {
      fontSize: '22px',
      fontFamily: 'Arial Black, Arial',
      color: '#ffdd00',
      stroke: '#000000',
      strokeThickness: 3,
    }).setOrigin(0.5).setDepth(2);

    // New high score badge
    if (isNewHighScore && score > 0) {
      const badge = this.add.text(width / 2, height * 0.56, 'NEW HIGH SCORE!', {
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

    // Level value — below the "LEVEL" label
    this.add.text(width * 0.27, height * 0.72, `${data.level ?? 1}`, {
      fontSize: '22px',
      fontFamily: 'Arial Black, Arial',
      color: '#ff6b35',
      stroke: '#000000',
      strokeThickness: 3,
    }).setOrigin(0.5).setDepth(2);

    // Distance value — below the "DISTANCE" label
    this.add.text(width * 0.73, height * 0.72, `${data.distance ?? '0.00 mi'}`, {
      fontSize: '18px',
      fontFamily: 'Arial Black, Arial',
      color: '#d4a574',
      stroke: '#000000',
      strokeThickness: 3,
    }).setOrigin(0.5).setDepth(2);

    // PLAY AGAIN button zone (~76-84% of height)
    const playAgainZone = this.add.zone(width / 2, height * 0.80, width * 0.7, height * 0.07)
      .setInteractive()
      .setDepth(5);
    playAgainZone.on('pointerdown', () => this.startGame());

    // MAIN MENU button zone (~86-94% of height)
    const mainMenuZone = this.add.zone(width / 2, height * 0.90, width * 0.7, height * 0.07)
      .setInteractive()
      .setDepth(5);
    mainMenuZone.on('pointerdown', () => this.goToMainMenu());

    // Keyboard shortcuts
    this.input.keyboard?.on('keydown-SPACE', () => this.startGame());
    this.input.keyboard?.on('keydown-ESC', () => this.goToMainMenu());
  }

  private startGame(): void {
    if (this.starting) return;
    this.starting = true;
    // Ensure UIScene is fully stopped before starting a new game
    if (this.scene.isActive('UIScene') || this.scene.isSleeping('UIScene')) {
      this.scene.stop('UIScene');
    }
    this.scene.start('GameScene');
  }

  private goToMainMenu(): void {
    if (this.starting) return;
    this.starting = true;
    // Ensure UIScene is fully stopped before going to main menu
    if (this.scene.isActive('UIScene') || this.scene.isSleeping('UIScene')) {
      this.scene.stop('UIScene');
    }
    this.scene.start('MainMenuScene');
  }
}
