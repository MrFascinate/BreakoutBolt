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

    // Load character spritesheets as plain images so we can define cropped frames
    this.load.image('protagonist-sheet', 'characters/spritesheet_protagonist_running.png');
    this.load.image('cop-sheet', 'characters/spritesheet_cop_running.png');
    this.load.image('maga-sheet', 'characters/spritesheet_maga_running.png');
    this.load.image('hater-sheet', 'characters/spritesheet_hater_running.png');
  }

  create(): void {
    // Define cropped frames for each character spritesheet, excluding headers and dead space

    // Protagonist (1536x1024, 6 frames at 256px wide, has "SPRITESHEET:" header)
    this.addCroppedFrames('protagonist-sheet', 6, 256, 1024, {
      cropX: 20, cropY: 200, cropW: 216, cropH: 620,
    });

    // Cop (1536x1024, 6 frames at 256px wide, has header)
    // Generous vertical crop to keep full body — cop is chunky
    this.addCroppedFrames('cop-sheet', 6, 256, 1024, {
      cropX: 5, cropY: 100, cropW: 246, cropH: 840,
    });

    // MAGA (1536x1024, 8 frames at 192px wide, has header)
    this.addCroppedFrames('maga-sheet', 8, 192, 1024, {
      cropX: 5, cropY: 130, cropW: 182, cropH: 760,
    });

    // Hater (1536x1024, 4 cols x 3 rows = 12 frames at 384x341, no header)
    // Minimal crop — keep nearly full frame so character body isn't cut off
    this.addGridCroppedFrames('hater-sheet', 4, 3, 384, 341, {
      cropX: 15, cropY: 5, cropW: 354, cropH: 330,
    });

    // Create animations
    this.anims.create({
      key: 'protagonist-run-anim',
      frames: this.buildFrameArray('protagonist-sheet', 6),
      frameRate: 10,
      repeat: -1,
    });

    this.anims.create({
      key: 'cop-run-anim',
      frames: this.buildFrameArray('cop-sheet', 6),
      frameRate: 10,
      repeat: -1,
    });

    this.anims.create({
      key: 'maga-run-anim',
      frames: this.buildFrameArray('maga-sheet', 8),
      frameRate: 10,
      repeat: -1,
    });

    // Use only middle row (frames 4-7) for a smooth, consistent running cycle
    this.anims.create({
      key: 'hater-run-anim',
      frames: [
        { key: 'hater-sheet', frame: 4 },
        { key: 'hater-sheet', frame: 5 },
        { key: 'hater-sheet', frame: 6 },
        { key: 'hater-sheet', frame: 7 },
      ],
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

  /** Add cropped frames from a grid spritesheet (cols x rows) */
  private addGridCroppedFrames(
    key: string,
    cols: number,
    rows: number,
    frameW: number,
    frameH: number,
    crop: { cropX: number; cropY: number; cropW: number; cropH: number }
  ): void {
    const tex = this.textures.get(key);
    let frameIndex = 0;
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        tex.add(
          frameIndex,
          0,
          col * frameW + crop.cropX,
          row * frameH + crop.cropY,
          crop.cropW,
          crop.cropH
        );
        frameIndex++;
      }
    }
  }

  private buildFrameArray(key: string, count: number): Phaser.Types.Animations.AnimationFrame[] {
    return Array.from({ length: count }, (_, i) => ({ key, frame: i }));
  }
}
