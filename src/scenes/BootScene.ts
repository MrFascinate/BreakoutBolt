import Phaser from 'phaser';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  preload(): void {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    // Loading bar
    const progressBar = this.add.graphics();
    const progressBox = this.add.graphics();
    progressBox.fillStyle(0x222222, 0.8);
    progressBox.fillRect(width / 2 - 160, height / 2 - 25, 320, 50);

    this.load.on('progress', (value: number) => {
      progressBar.clear();
      progressBar.fillStyle(0x00cc44, 1);
      progressBar.fillRect(width / 2 - 150, height / 2 - 15, 300 * value, 30);
    });

    this.load.on('complete', () => {
      progressBar.destroy();
      progressBox.destroy();
    });

    // Title & Game Over screens
    this.load.image('title-screen', 'characters/Title screen.png');
    this.load.image('gameover-screen', 'characters/Game Over Screen.png');

    // Street background
    this.load.image('street-bg', 'background/game_background.png');

    // Character spritesheets
    this.load.spritesheet('protagonist-run', 'characters/spritesheet_protagonist_running.png', {
      frameWidth: 256,
      frameHeight: 1024,
    });

    this.load.spritesheet('cop-run', 'characters/spritesheet_cop_running.png', {
      frameWidth: 256,
      frameHeight: 1024,
    });

    this.load.spritesheet('maga-run', 'characters/spritesheet_maga_running.png', {
      frameWidth: 192,
      frameHeight: 1024,
    });

    this.load.spritesheet('hater-run', 'characters/spritesheet_hater_running.png', {
      frameWidth: 384,
      frameHeight: 341,
    });
  }

  create(): void {
    // Create animations for all characters
    this.anims.create({
      key: 'protagonist-run-anim',
      frames: this.anims.generateFrameNumbers('protagonist-run', { start: 0, end: 5 }),
      frameRate: 10,
      repeat: -1,
    });

    this.anims.create({
      key: 'cop-run-anim',
      frames: this.anims.generateFrameNumbers('cop-run', { start: 0, end: 5 }),
      frameRate: 10,
      repeat: -1,
    });

    this.anims.create({
      key: 'maga-run-anim',
      frames: this.anims.generateFrameNumbers('maga-run', { start: 0, end: 7 }),
      frameRate: 10,
      repeat: -1,
    });

    this.anims.create({
      key: 'hater-run-anim',
      frames: this.anims.generateFrameNumbers('hater-run', { start: 0, end: 11 }),
      frameRate: 10,
      repeat: -1,
    });

    this.scene.start('MainMenuScene');
  }
}
