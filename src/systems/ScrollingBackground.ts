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
    // Use the texture's native dimensions for tiling, then scale to fill viewport
    const tex = this.scene.textures.get('street-bg').getSourceImage();
    this.bgTile = this.scene.add.tileSprite(
      width / 2, height / 2, tex.width, tex.height, 'street-bg'
    ).setDepth(-10);
    this.bgTile.setDisplaySize(width, height);
  }

  update(speed: number): void {
    this.bgTile.tilePositionY -= speed * 0.08;
  }
}
