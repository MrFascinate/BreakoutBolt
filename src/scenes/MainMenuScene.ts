import Phaser from 'phaser';
import { getGameWidth, getGameHeight } from '../utils/DeviceUtils';
import { getHighScore } from '../utils/HighScore';

export class MainMenuScene extends Phaser.Scene {
  private starting = false;

  constructor() {
    super({ key: 'MainMenuScene' });
  }

  create(): void {
    this.starting = false;

    // Ensure no leftover scenes from a previous game
    if (this.scene.isActive('UIScene') || this.scene.isSleeping('UIScene')) {
      this.scene.stop('UIScene');
    }
    if (this.scene.isActive('GameScene') || this.scene.isSleeping('GameScene')) {
      this.scene.stop('GameScene');
    }

    const width = getGameWidth(this);
    const height = getGameHeight(this);

    // Title screen background image (covers full screen)
    const bg = this.add.image(width / 2, height / 2, 'title-screen');
    bg.setDisplaySize(width, height);

    // "Breakout Bolt!" title text
    const title = this.add.text(width / 2, height * 0.12, 'Breakout Bolt!', {
      fontSize: '38px',
      fontFamily: 'Arial Black, Arial',
      color: '#ffdd00',
      stroke: '#000000',
      strokeThickness: 7,
    }).setOrigin(0.5).setDepth(2);

    // Subtle bounce animation on title
    this.tweens.add({
      targets: title,
      y: title.y - 6,
      duration: 1200,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // High score display
    const highScore = getHighScore();
    if (highScore > 0) {
      this.add.text(width / 2, height * 0.42, `High Score: ${highScore.toLocaleString()}`, {
        fontSize: '16px',
        fontFamily: 'Arial Black, Arial',
        color: '#ffffff',
        stroke: '#000000',
        strokeThickness: 3,
      }).setOrigin(0.5).setDepth(2);
    }

    // Animated Start button
    const btnW = Math.min(width * 0.55, 220);
    const btnH = 50;
    const btnY = height * 0.78;

    // Button background (rounded rectangle via graphics)
    const btnGfx = this.add.graphics().setDepth(10);
    btnGfx.fillStyle(0x00cc44, 1);
    btnGfx.fillRoundedRect(width / 2 - btnW / 2, btnY - btnH / 2, btnW, btnH, 14);
    btnGfx.lineStyle(3, 0xffffff, 0.8);
    btnGfx.strokeRoundedRect(width / 2 - btnW / 2, btnY - btnH / 2, btnW, btnH, 14);

    // Button text
    const btnText = this.add.text(width / 2, btnY, 'START', {
      fontSize: '24px',
      fontFamily: 'Arial Black, Arial',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 4,
    }).setOrigin(0.5).setDepth(11);

    // Container for pulsing animation
    const btnContainer = this.add.container(0, 0, [btnGfx, btnText]).setDepth(10);

    // Subtle pulsing scale animation
    this.tweens.add({
      targets: btnContainer,
      scaleX: 1.05,
      scaleY: 1.05,
      duration: 800,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // Interactive zone for the button
    const btnZone = this.add.zone(width / 2, btnY, btnW, btnH)
      .setInteractive({ useHandCursor: true })
      .setDepth(12);

    // Hover/tap feedback
    btnZone.on('pointerover', () => {
      btnGfx.clear();
      btnGfx.fillStyle(0x00ff55, 1);
      btnGfx.fillRoundedRect(width / 2 - btnW / 2, btnY - btnH / 2, btnW, btnH, 14);
      btnGfx.lineStyle(3, 0xffffff, 1);
      btnGfx.strokeRoundedRect(width / 2 - btnW / 2, btnY - btnH / 2, btnW, btnH, 14);
    });

    btnZone.on('pointerout', () => {
      btnGfx.clear();
      btnGfx.fillStyle(0x00cc44, 1);
      btnGfx.fillRoundedRect(width / 2 - btnW / 2, btnY - btnH / 2, btnW, btnH, 14);
      btnGfx.lineStyle(3, 0xffffff, 0.8);
      btnGfx.strokeRoundedRect(width / 2 - btnW / 2, btnY - btnH / 2, btnW, btnH, 14);
    });

    btnZone.on('pointerdown', () => this.startGame());

    // Keyboard shortcut
    this.input.keyboard?.on('keydown-SPACE', () => this.startGame());
  }

  private startGame(): void {
    if (this.starting) return;
    this.starting = true;
    this.scene.start('GameScene');
  }
}
