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
    this.load.image('title-screen', 'characters/Intro.png');
    this.load.image('gameover-screen', 'characters/Game Over.png');

    // Street background
    this.load.image('street-bg', 'background/game_background.png');

    // New character spritesheets (1920x1080, 5 horizontal frames each)
    this.load.image('bolt-sheet', 'characters/Bolt_Running.png');
    this.load.image('agent-sheet', 'characters/Agent_Running.png');
    this.load.image('cameraman-sheet', 'characters/Cameraman_Running.png');
    this.load.image('protester-sheet', 'characters/Protester_Running.png');
  }

  create(): void {
    // All new spritesheets are 1920x1080 with 5 horizontal frames.
    // Frame width = 1920 / 5 = 384px, frame height = 1080px.
    const frameW = 384;
    const frameH = 1080;
    const frameCount = 5;

    // Define frames for each character — use full frame (no header cropping needed)
    this.addCroppedFrames('bolt-sheet', frameCount, frameW, frameH, {
      cropX: 0, cropY: 0, cropW: frameW, cropH: frameH,
    });

    this.addCroppedFrames('agent-sheet', frameCount, frameW, frameH, {
      cropX: 0, cropY: 0, cropW: frameW, cropH: frameH,
    });

    this.addCroppedFrames('cameraman-sheet', frameCount, frameW, frameH, {
      cropX: 0, cropY: 0, cropW: frameW, cropH: frameH,
    });

    this.addCroppedFrames('protester-sheet', frameCount, frameW, frameH, {
      cropX: 0, cropY: 0, cropW: frameW, cropH: frameH,
    });

    // Create run animations — all characters use 5 frames
    this.anims.create({
      key: 'bolt-run-anim',
      frames: this.buildFrameArray('bolt-sheet', frameCount),
      frameRate: 10,
      repeat: -1,
    });

    this.anims.create({
      key: 'agent-run-anim',
      frames: this.buildFrameArray('agent-sheet', frameCount),
      frameRate: 10,
      repeat: -1,
    });

    this.anims.create({
      key: 'cameraman-run-anim',
      frames: this.buildFrameArray('cameraman-sheet', frameCount),
      frameRate: 10,
      repeat: -1,
    });

    this.anims.create({
      key: 'protester-run-anim',
      frames: this.buildFrameArray('protester-sheet', frameCount),
      frameRate: 10,
      repeat: -1,
    });

    this.scene.start('MainMenuScene');
  }

  /** Add cropped frames from a single-row spritesheet */
  private addCroppedFrames(
    key: string,
    frameCount: number,
    frameW: number,
    _frameH: number,
    crop: { cropX: number; cropY: number; cropW: number; cropH: number }
  ): void {
    const tex = this.textures.get(key);
    for (let i = 0; i < frameCount; i++) {
      tex.add(i, 0, i * frameW + crop.cropX, crop.cropY, crop.cropW, crop.cropH);
    }
  }

  private buildFrameArray(key: string, count: number): Phaser.Types.Animations.AnimationFrame[] {
    return Array.from({ length: count }, (_, i) => ({ key, frame: i }));
  }
}
