import { CONSTANTS } from '../config/Constants';
import { getLanePositions, getGroundY } from '../utils/DeviceUtils';

export type PlayerState = 'running' | 'jumping' | 'sliding' | 'hit' | 'invincible';

export class Player {
  private scene: Phaser.Scene;
  private sprite: Phaser.GameObjects.Rectangle;
  private currentLane = 1;
  private state: PlayerState = 'running';
  private velocityY = 0;
  private groundY: number;
  private isGrounded = true;
  private isSliding = false;
  private slideTimer?: Phaser.Time.TimerEvent;
  private invincible = false;
  private flashTween?: Phaser.Tweens.Tween;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    const lanes = getLanePositions(scene);
    this.groundY = getGroundY(scene);

    this.sprite = scene.add.rectangle(
      lanes[1],
      this.groundY - CONSTANTS.PLAYER_HEIGHT / 2,
      CONSTANTS.PLAYER_WIDTH,
      CONSTANTS.PLAYER_HEIGHT,
      0xff6b35
    ).setDepth(5);
  }

  switchLane(direction: 'left' | 'right'): void {
    const newLane = this.currentLane + (direction === 'left' ? -1 : 1);
    if (newLane < 0 || newLane >= CONSTANTS.LANE_COUNT) return;

    this.currentLane = newLane;
    const lanes = getLanePositions(this.scene);
    this.scene.tweens.add({
      targets: this.sprite,
      x: lanes[this.currentLane],
      duration: CONSTANTS.LANE_SWITCH_DURATION,
      ease: 'Power2',
    });
  }

  jump(): void {
    if (!this.isGrounded) return;
    this.isGrounded = false;
    this.velocityY = CONSTANTS.JUMP_VELOCITY;
    this.state = 'jumping';
  }

  slide(): void {
    if (!this.isGrounded || this.isSliding) return;
    this.isSliding = true;
    this.state = 'sliding';

    this.sprite.setSize(CONSTANTS.PLAYER_WIDTH, CONSTANTS.PLAYER_HEIGHT / 2);
    this.sprite.setY(this.groundY - CONSTANTS.PLAYER_HEIGHT / 4);

    this.slideTimer = this.scene.time.delayedCall(400, () => {
      this.endSlide();
    });
  }

  private endSlide(): void {
    this.isSliding = false;
    this.state = 'running';
    this.sprite.setSize(CONSTANTS.PLAYER_WIDTH, CONSTANTS.PLAYER_HEIGHT);
    this.sprite.setY(this.groundY - CONSTANTS.PLAYER_HEIGHT / 2);
  }

  hit(): void {
    if (this.invincible) return;

    this.state = 'hit';
    this.invincible = true;

    // Flash red
    this.sprite.setFillStyle(0xff2222);
    this.scene.time.delayedCall(100, () => {
      this.sprite.setFillStyle(0xff6b35);
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

  update(delta: number): void {
    if (!this.isGrounded) {
      this.velocityY += CONSTANTS.GRAVITY * (delta / 1000);
      this.sprite.y += this.velocityY * (delta / 1000);

      const standingY = this.groundY - CONSTANTS.PLAYER_HEIGHT / 2;
      if (this.sprite.y >= standingY) {
        this.sprite.y = standingY;
        this.velocityY = 0;
        this.isGrounded = true;
        this.state = 'running';
      }
    }
  }

  getBounds(): Phaser.Geom.Rectangle {
    return new Phaser.Geom.Rectangle(
      this.sprite.x - this.sprite.width / 2,
      this.sprite.y - this.sprite.height / 2,
      this.sprite.width,
      this.sprite.height
    );
  }

  getSprite(): Phaser.GameObjects.Rectangle {
    return this.sprite;
  }

  getLane(): number {
    return this.currentLane;
  }

  getState(): PlayerState {
    return this.state;
  }

  getIsSliding(): boolean {
    return this.isSliding;
  }

  getIsGrounded(): boolean {
    return this.isGrounded;
  }

  destroy(): void {
    this.slideTimer?.destroy();
    this.flashTween?.destroy();
    this.sprite.destroy();
  }
}
