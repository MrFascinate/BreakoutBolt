import { getGameWidth, getGameHeight } from '../utils/DeviceUtils';

export class ScrollingBackground {
  private scene: Phaser.Scene;
  private groundTile!: Phaser.GameObjects.TileSprite;
  private skyGradient!: Phaser.GameObjects.Rectangle;
  private laneLines: Phaser.GameObjects.TileSprite[] = [];

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.create();
  }

  private create(): void {
    const width = getGameWidth(this.scene);
    const height = getGameHeight(this.scene);
    const groundY = height - 100;

    // Sky
    this.skyGradient = this.scene.add.rectangle(
      width / 2, height / 2 - 50, width, height, 0x87CEEB
    ).setDepth(-10);

    // Distant buildings silhouette
    this.createBuildings(width, groundY);

    // Ground
    const groundGfx = this.scene.make.graphics({ x: 0, y: 0 });
    groundGfx.fillStyle(0x555555);
    groundGfx.fillRect(0, 0, 64, 64);
    groundGfx.generateTexture('ground-tile', 64, 64);
    groundGfx.destroy();

    this.groundTile = this.scene.add.tileSprite(
      width / 2, groundY + 50, width, 100, 'ground-tile'
    ).setDepth(-1);

    // Lane dividers
    const lineGfx = this.scene.make.graphics({ x: 0, y: 0 });
    lineGfx.fillStyle(0xffff00);
    lineGfx.fillRect(0, 0, 4, 32);
    lineGfx.fillStyle(0x555555);
    lineGfx.fillRect(0, 32, 4, 32);
    lineGfx.generateTexture('lane-line', 4, 64);
    lineGfx.destroy();

    const laneWidth = Math.min(120, width / 4);
    const centerX = width / 2;

    for (let i = -1; i <= 1; i += 2) {
      const lineX = centerX + i * (laneWidth / 2);
      const line = this.scene.add.tileSprite(
        lineX, groundY - 150, 4, 400, 'lane-line'
      ).setDepth(-1);
      this.laneLines.push(line);
    }
  }

  private createBuildings(width: number, groundY: number): void {
    const gfx = this.scene.add.graphics().setDepth(-5);
    gfx.fillStyle(0x444466, 0.6);
    for (let x = 0; x < width; x += 60) {
      const h = 40 + Math.random() * 80;
      gfx.fillRect(x, groundY - 300 - h, 50, h);
    }

    // Palm tree silhouettes
    gfx.fillStyle(0x2d5a27, 0.5);
    for (let x = 30; x < width; x += 150) {
      gfx.fillRect(x - 3, groundY - 350, 6, 60);
      gfx.fillCircle(x, groundY - 360, 20);
    }
  }

  update(speed: number): void {
    const delta = speed * 0.016;
    this.groundTile.tilePositionY -= delta;
    for (const line of this.laneLines) {
      line.tilePositionY -= delta;
    }
  }
}
