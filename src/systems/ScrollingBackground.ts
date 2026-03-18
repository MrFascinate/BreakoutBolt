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

    // Sky — warm golden hour gradient feel
    this.skyGradient = this.scene.add.rectangle(
      width / 2, groundY / 2, width, groundY, 0x1a1a2e
    ).setDepth(-10);

    // Warm horizon glow
    this.scene.add.rectangle(
      width / 2, groundY - 40, width, 80, 0x4a2040, 0.5
    ).setDepth(-9);

    // Distant buildings silhouette
    this.createBuildings(width, groundY);

    // Ground — dark asphalt
    if (!this.scene.textures.exists('ground-tile')) {
      const groundGfx = this.scene.make.graphics({ x: 0, y: 0 });
      groundGfx.fillStyle(0x2a2a2a);
      groundGfx.fillRect(0, 0, 64, 64);
      groundGfx.generateTexture('ground-tile', 64, 64);
      groundGfx.destroy();
    }

    this.groundTile = this.scene.add.tileSprite(
      width / 2, groundY + 50, width, 100, 'ground-tile'
    ).setDepth(-1);

    // Lane dividers — white dashed
    if (!this.scene.textures.exists('lane-line')) {
      const lineGfx = this.scene.make.graphics({ x: 0, y: 0 });
      lineGfx.fillStyle(0xffffff, 0.6);
      lineGfx.fillRect(0, 0, 3, 24);
      lineGfx.generateTexture('lane-line', 3, 48);
      lineGfx.destroy();
    }

    const laneWidth = Math.min(120, width / 4);
    const centerX = width / 2;

    for (let i = -1; i <= 1; i += 2) {
      const lineX = centerX + i * (laneWidth / 2);
      const line = this.scene.add.tileSprite(
        lineX, groundY - 150, 3, 400, 'lane-line'
      ).setDepth(-1);
      this.laneLines.push(line);
    }
  }

  private createBuildings(width: number, groundY: number): void {
    const gfx = this.scene.add.graphics().setDepth(-5);
    // Dark building silhouettes
    gfx.fillStyle(0x111122, 0.8);
    for (let x = 0; x < width; x += 55) {
      const h = 50 + Math.random() * 100;
      gfx.fillRect(x, groundY - 300 - h, 45, h);
      // Window lights
      gfx.fillStyle(0xffcc44, 0.3);
      for (let wy = groundY - 300 - h + 10; wy < groundY - 310; wy += 18) {
        for (let wx = x + 6; wx < x + 40; wx += 12) {
          if (Math.random() > 0.4) {
            gfx.fillRect(wx, wy, 6, 8);
          }
        }
      }
      gfx.fillStyle(0x111122, 0.8);
    }

    // Palm tree silhouettes
    gfx.fillStyle(0x1a3a1a, 0.7);
    for (let x = 30; x < width; x += 140) {
      gfx.fillRect(x - 3, groundY - 350, 6, 70);
      gfx.fillCircle(x, groundY - 355, 22);
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
