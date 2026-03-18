import { ObstacleConfig, ObstacleType } from '../config/Constants';
import { getGroundY, getLanePositions } from '../utils/DeviceUtils';

const SPRITE_KEYS: Record<ObstacleType, string> = {
  cop: 'cop-sheet',
  maga: 'maga-sheet',
  hater: 'hater-sheet',
};

const ANIM_KEYS: Record<ObstacleType, string> = {
  cop: 'cop-run-anim',
  maga: 'maga-run-anim',
  hater: 'hater-run-anim',
};

// Display sizes per type — larger than collision boxes for visibility
const DISPLAY_SIZES: Record<ObstacleType, { w: number; h: number }> = {
  cop: { w: 90, h: 150 },
  maga: { w: 80, h: 110 },
  hater: { w: 75, h: 100 },
};

export class Obstacle {
  private scene: Phaser.Scene;
  private sprite: Phaser.GameObjects.Sprite;
  private config: ObstacleConfig;
  private lane: number;
  private active = false;
  private groundY: number;
  private hasBeenDodged = false;
  private zigzagTimer?: Phaser.Time.TimerEvent;
  private hasZigzagged = false;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.groundY = getGroundY(scene);
    this.config = null!;
    this.lane = 1;
    // Create with a default sprite key; will be updated on spawn
    this.sprite = scene.add.sprite(0, -100, 'cop-sheet', 0)
      .setDepth(4)
      .setVisible(false);
  }

  spawn(config: ObstacleConfig, lane: number, startY: number): void {
    this.config = config;
    this.lane = lane;
    this.active = true;
    this.hasBeenDodged = false;
    this.hasZigzagged = false;

    const lanes = getLanePositions(this.scene);

    // Switch to the correct spritesheet and animation for this obstacle type
    const spriteKey = SPRITE_KEYS[config.type];
    const animKey = ANIM_KEYS[config.type];

    const display = DISPLAY_SIZES[config.type];
    this.sprite.setTexture(spriteKey);
    this.sprite.setPosition(lanes[lane], startY);
    this.sprite.setDisplaySize(display.w, display.h);
    this.sprite.setVisible(true);
    this.sprite.play(animKey);

    // Hater zigzag behavior
    if (config.zigzag && !this.zigzagTimer) {
      this.zigzagTimer = this.scene.time.delayedCall(
        600 + Math.random() * 400,
        () => this.doZigzag()
      );
    }
  }

  private doZigzag(): void {
    if (!this.active || this.hasZigzagged) return;

    // Only zigzag if still in the upper half of the screen — gives player time to react
    const screenHeight = this.scene.cameras.main.height;
    if (this.sprite.y > screenHeight * 0.45) return;

    this.hasZigzagged = true;

    const lanes = getLanePositions(this.scene);
    const possibleLanes = [0, 1, 2].filter(l => l !== this.lane);
    const newLane = possibleLanes[Math.floor(Math.random() * possibleLanes.length)];
    this.lane = newLane;

    this.scene.tweens.add({
      targets: this.sprite,
      x: lanes[newLane],
      duration: 200,
      ease: 'Power1',
    });
  }

  update(speed: number, delta: number): void {
    if (!this.active) return;

    const moveSpeed = speed + this.config.speed;
    this.sprite.y += moveSpeed * (delta / 1000);

    // Deactivate if off screen
    if (this.sprite.y > this.groundY + 200) {
      this.deactivate();
    }
  }

  checkCollision(playerBounds: Phaser.Geom.Rectangle): boolean {
    if (!this.active) return false;

    const colW = this.config.width * this.config.collisionWidthRatio;
    const colH = this.config.height * this.config.collisionHeightRatio;
    const obsBounds = new Phaser.Geom.Rectangle(
      this.sprite.x - colW / 2,
      this.sprite.y - colH / 2,
      colW,
      colH
    );

    return Phaser.Geom.Rectangle.Overlaps(playerBounds, obsBounds);
  }

  checkNearMiss(playerBounds: Phaser.Geom.Rectangle): boolean {
    if (!this.active || this.hasBeenDodged) return false;

    const nearDist = 20;
    const expandedBounds = new Phaser.Geom.Rectangle(
      playerBounds.x - nearDist,
      playerBounds.y - nearDist,
      playerBounds.width + nearDist * 2,
      playerBounds.height + nearDist * 2
    );

    const colW = this.config.width * this.config.collisionWidthRatio;
    const colH = this.config.height * this.config.collisionHeightRatio;
    const obsBounds = new Phaser.Geom.Rectangle(
      this.sprite.x - colW / 2,
      this.sprite.y - colH / 2,
      colW,
      colH
    );

    return Phaser.Geom.Rectangle.Overlaps(expandedBounds, obsBounds);
  }

  markDodged(): void {
    this.hasBeenDodged = true;
  }

  wasDodged(): boolean {
    return this.hasBeenDodged;
  }

  deactivate(): void {
    this.active = false;
    this.sprite.setVisible(false);
    this.sprite.setPosition(0, -100);
    this.sprite.stop();
    this.zigzagTimer?.destroy();
    this.zigzagTimer = undefined;
  }

  isActive(): boolean {
    return this.active;
  }

  getType(): ObstacleType {
    return this.config?.type;
  }

  getLane(): number {
    return this.lane;
  }

  getY(): number {
    return this.sprite.y;
  }

  getSprite(): Phaser.GameObjects.Sprite {
    return this.sprite;
  }

  destroy(): void {
    this.zigzagTimer?.destroy();
    this.sprite.destroy();
  }
}
