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

    // Read previous best BEFORE saving so comparison is against the real stored value
    const previousBest = getHighScore();
    const isNewHighScore = score > 0 && score > previousBest;
    if (isNewHighScore) {
      saveHighScore(score);
    }
    const highScore = isNewHighScore ? score : previousBest;

    // Game Over background image
    const bg = this.add.image(width / 2, height / 2, 'gameover-screen');
    bg.setDisplaySize(width, height);

    // Semi-transparent overlay for readability
    this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.45).setDepth(1);

    // GAME OVER title
    const gameOverText = this.add.text(width / 2, height * 0.15, 'GAME OVER', {
      fontSize: '42px',
      fontFamily: 'Arial Black, Arial',
      color: '#ff4444',
      stroke: '#000000',
      strokeThickness: 6,
    }).setOrigin(0.5).setDepth(2);

    // Subtle drop-in animation for title
    gameOverText.setScale(0.5);
    gameOverText.setAlpha(0);
    this.tweens.add({
      targets: gameOverText,
      scaleX: 1,
      scaleY: 1,
      alpha: 1,
      duration: 500,
      ease: 'Back.easeOut',
    });

    // --- Score box ---
    const boxW = width * 0.82;
    const boxH = height * 0.32;
    const boxY = height * 0.43;

    // Box background
    const boxGfx = this.add.graphics().setDepth(2);
    boxGfx.fillStyle(0x1a0a2e, 0.85);
    boxGfx.fillRoundedRect(width / 2 - boxW / 2, boxY - boxH / 2, boxW, boxH, 16);
    boxGfx.lineStyle(2, 0xffdd00, 0.6);
    boxGfx.strokeRoundedRect(width / 2 - boxW / 2, boxY - boxH / 2, boxW, boxH, 16);

    // Score label + value
    this.add.text(width / 2, boxY - boxH * 0.34, 'SCORE', {
      fontSize: '14px',
      fontFamily: 'Arial Black, Arial',
      color: '#aaaaaa',
    }).setOrigin(0.5).setDepth(3);

    this.add.text(width / 2, boxY - boxH * 0.16, `${score.toLocaleString()}`, {
      fontSize: '38px',
      fontFamily: 'Arial Black, Arial',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 4,
    }).setOrigin(0.5).setDepth(3);

    // Divider line
    const divGfx = this.add.graphics().setDepth(3);
    divGfx.lineStyle(1, 0xffffff, 0.25);
    divGfx.lineBetween(width / 2 - boxW * 0.38, boxY + boxH * 0.02, width / 2 + boxW * 0.38, boxY + boxH * 0.02);

    // High score label + value
    this.add.text(width / 2, boxY + boxH * 0.12, 'HIGH SCORE', {
      fontSize: '12px',
      fontFamily: 'Arial Black, Arial',
      color: '#aaaaaa',
    }).setOrigin(0.5).setDepth(3);

    this.add.text(width / 2, boxY + boxH * 0.26, `${highScore.toLocaleString()}`, {
      fontSize: '24px',
      fontFamily: 'Arial Black, Arial',
      color: '#ffdd00',
      stroke: '#000000',
      strokeThickness: 3,
    }).setOrigin(0.5).setDepth(3);

    // New high score badge
    if (isNewHighScore && score > 0) {
      const badge = this.add.text(width / 2, boxY + boxH * 0.42, 'NEW HIGH SCORE!', {
        fontSize: '14px',
        fontFamily: 'Arial Black, Arial',
        color: '#ffdd00',
        stroke: '#000000',
        strokeThickness: 3,
      }).setOrigin(0.5).setDepth(4);

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

    // Level and distance below the box
    this.add.text(width * 0.3, boxY + boxH / 2 + 20, `Level ${data.level ?? 1}`, {
      fontSize: '16px',
      fontFamily: 'Arial Black, Arial',
      color: '#ff6b35',
      stroke: '#000000',
      strokeThickness: 3,
    }).setOrigin(0.5).setDepth(2);

    this.add.text(width * 0.7, boxY + boxH / 2 + 20, `${data.distance ?? '0.00 mi'}`, {
      fontSize: '16px',
      fontFamily: 'Arial Black, Arial',
      color: '#d4a574',
      stroke: '#000000',
      strokeThickness: 3,
    }).setOrigin(0.5).setDepth(2);

    // --- Try Again button ---
    const btnW = Math.min(width * 0.6, 240);
    const btnH = 50;
    const tryAgainY = height * 0.74;

    const tryAgainGfx = this.add.graphics().setDepth(10);
    tryAgainGfx.fillStyle(0x00cc44, 1);
    tryAgainGfx.fillRoundedRect(width / 2 - btnW / 2, tryAgainY - btnH / 2, btnW, btnH, 14);
    tryAgainGfx.lineStyle(3, 0xffffff, 0.8);
    tryAgainGfx.strokeRoundedRect(width / 2 - btnW / 2, tryAgainY - btnH / 2, btnW, btnH, 14);

    this.add.text(width / 2, tryAgainY, 'TRY AGAIN', {
      fontSize: '22px',
      fontFamily: 'Arial Black, Arial',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 4,
    }).setOrigin(0.5).setDepth(11);

    const tryAgainZone = this.add.zone(width / 2, tryAgainY, btnW, btnH)
      .setInteractive({ useHandCursor: true })
      .setDepth(12);

    tryAgainZone.on('pointerover', () => {
      tryAgainGfx.clear();
      tryAgainGfx.fillStyle(0x00ff55, 1);
      tryAgainGfx.fillRoundedRect(width / 2 - btnW / 2, tryAgainY - btnH / 2, btnW, btnH, 14);
      tryAgainGfx.lineStyle(3, 0xffffff, 1);
      tryAgainGfx.strokeRoundedRect(width / 2 - btnW / 2, tryAgainY - btnH / 2, btnW, btnH, 14);
    });

    tryAgainZone.on('pointerout', () => {
      tryAgainGfx.clear();
      tryAgainGfx.fillStyle(0x00cc44, 1);
      tryAgainGfx.fillRoundedRect(width / 2 - btnW / 2, tryAgainY - btnH / 2, btnW, btnH, 14);
      tryAgainGfx.lineStyle(3, 0xffffff, 0.8);
      tryAgainGfx.strokeRoundedRect(width / 2 - btnW / 2, tryAgainY - btnH / 2, btnW, btnH, 14);
    });

    tryAgainZone.on('pointerdown', () => this.startGame());

    // --- Main Menu button ---
    const menuY = height * 0.85;

    const menuGfx = this.add.graphics().setDepth(10);
    menuGfx.fillStyle(0x444466, 1);
    menuGfx.fillRoundedRect(width / 2 - btnW / 2, menuY - btnH / 2, btnW, btnH, 14);
    menuGfx.lineStyle(3, 0xffffff, 0.5);
    menuGfx.strokeRoundedRect(width / 2 - btnW / 2, menuY - btnH / 2, btnW, btnH, 14);

    this.add.text(width / 2, menuY, 'MAIN MENU', {
      fontSize: '20px',
      fontFamily: 'Arial Black, Arial',
      color: '#cccccc',
      stroke: '#000000',
      strokeThickness: 3,
    }).setOrigin(0.5).setDepth(11);

    const menuZone = this.add.zone(width / 2, menuY, btnW, btnH)
      .setInteractive({ useHandCursor: true })
      .setDepth(12);

    menuZone.on('pointerover', () => {
      menuGfx.clear();
      menuGfx.fillStyle(0x555588, 1);
      menuGfx.fillRoundedRect(width / 2 - btnW / 2, menuY - btnH / 2, btnW, btnH, 14);
      menuGfx.lineStyle(3, 0xffffff, 0.7);
      menuGfx.strokeRoundedRect(width / 2 - btnW / 2, menuY - btnH / 2, btnW, btnH, 14);
    });

    menuZone.on('pointerout', () => {
      menuGfx.clear();
      menuGfx.fillStyle(0x444466, 1);
      menuGfx.fillRoundedRect(width / 2 - btnW / 2, menuY - btnH / 2, btnW, btnH, 14);
      menuGfx.lineStyle(3, 0xffffff, 0.5);
      menuGfx.strokeRoundedRect(width / 2 - btnW / 2, menuY - btnH / 2, btnW, btnH, 14);
    });

    menuZone.on('pointerdown', () => this.goToMainMenu());

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
