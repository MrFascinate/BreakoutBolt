import { CONSTANTS } from '../config/Constants';
import { getLanePositions, getGroundY, clampToRoad } from '../utils/DeviceUtils';

export type PlayerState = 'running' | 'hit' | 'invincible';

export class Player {
  private scene: Phaser.Scene;
  private sprite: Phaser.GameObjects.Sprite;
  private currentLane = 1;
  private state: PlayerState = 'running';
  private invincible = false;
  private flashTween?: Phaser.Tweens.Tween;
  private groundY: number;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    const lanes = getLanePositions(scene);
    this.groundY = getGroundY(scene);

    // Animated Bolt sprite — display size is larger than collision box
    const displayW = 120;
    const displayH = 165;
    this.sprite = scene.add.sprite(
      clampToRoad(scene, lanes[1], displayW),
      this.groundY - CONSTANTS.PLAYER_HEIGHT / 2,
      'bolt-sheet', 0
    )
      .setDepth(5)
      .setDisplaySize(displayW, displayH)
      .play('bolt-run-anim');
  }

  switchLane(direction: 'left' | 'right'): void {
    const newLane = this.currentLane + (direction === 'left' ? -1 : 1);
    if (newLane < 0 || newLane >= CONSTANTS.LANE_COUNT) return;

    this.currentLane = newLane;
    const lanes = getLanePositions(this.scene);
    const displayW = 120;
    this.scene.tweens.add({
      targets: this.sprite,
      x: clampToRoad(this.scene, lanes[this.currentLane], displayW),
      duration: CONSTANTS.LANE_SWITCH_DURATION,
      ease: 'Power2',
    });
  }

  hit(): void {
    if (this.invincible) return;

    this.state = 'hit';
    this.invincible = true;

    // Flash red tint
    this.sprite.setTint(0xff2222);
    this.scene.time.delayedCall(100, () => {
      this.sprite.clearTint();
    });

    // Start invincibility flash
    this.flashTween = this.scene.tweens.add({
      targets: this.sprite,
      alpha: { from: 1, to: 0.3 },
      duration: 150,
      yoyo: true,
      repeat: 6,
      onComplete: () => {
        this.sprite.setAlpha(1);
      },
    });

    this.scene.time.delayedCall(CONSTANTS.INVINCIBILITY_DURATION, () => {
      this.invincible = false;
      this.state = 'running';
    });
  }

  isInvincible(): boolean {
    return this.invincible;
  }

  getBounds(): Phaser.Geom.Rectangle {
    return new Phaser.Geom.Rectangle(
      this.sprite.x - CONSTANTS.PLAYER_WIDTH / 2,
      this.sprite.y - CONSTANTS.PLAYER_HEIGHT / 2,
      CONSTANTS.PLAYER_WIDTH,
      CONSTANTS.PLAYER_HEIGHT
    );
  }

  getSprite(): Phaser.GameObjects.Sprite {
    return this.sprite;
  }

  getLane(): number {
    return this.currentLane;
  }

  getState(): PlayerState {
    return this.state;
  }

  destroy(): void {
    this.flashTween?.destroy();
    this.sprite.destroy();
  }
}
