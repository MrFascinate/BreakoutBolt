import { getGameWidth, getGameHeight } from '../utils/DeviceUtils';

export class ScrollingBackground {
  private scene: Phaser.Scene;
  private bgTile!: Phaser.GameObjects.TileSprite;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.create();
  }

  private create(): void {
    const width = getGameWidth(this.scene);
    const height = getGameHeight(this.scene);

    // Street background as a vertically scrolling tile sprite
    this.bgTile = this.scene.add.tileSprite(
      width / 2, height / 2, width, height, 'street-bg'
    ).setDepth(-10);
  }

  update(speed: number): void {
    const delta = speed * 0.016;
    this.bgTile.tilePositionY -= delta;
  }
}
