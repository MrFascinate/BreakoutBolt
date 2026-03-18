import Phaser from 'phaser';
import { CONSTANTS } from '../config/Constants';
import { Player } from '../entities/Player';
import { ObstaclePool } from '../entities/ObstaclePool';
import { ObstacleSpawner } from '../systems/ObstacleSpawner';
import { InputManager, GameAction } from '../systems/InputManager';
import { ScrollingBackground } from '../systems/ScrollingBackground';
import { ScoreManager } from '../systems/ScoreManager';
import { getGroundY } from '../utils/DeviceUtils';

export class GameScene extends Phaser.Scene {
  private player!: Player;
  private obstaclePool!: ObstaclePool;
  private spawner!: ObstacleSpawner;
  private inputManager!: InputManager;
  private background!: ScrollingBackground;
  private scoreManager!: ScoreManager;
  private currentSpeed: number = CONSTANTS.INITIAL_SPEED;
  private lives = CONSTANTS.LIVES;
  private gameOver = false;
  private speedTimer = 0;

  constructor() {
    super({ key: 'GameScene' });
  }

  create(): void {
    this.currentSpeed = CONSTANTS.INITIAL_SPEED;
    this.lives = CONSTANTS.LIVES;
    this.gameOver = false;
    this.speedTimer = 0;

    this.background = new ScrollingBackground(this);
    this.player = new Player(this);
    this.obstaclePool = new ObstaclePool(this);
    this.spawner = new ObstacleSpawner(this, this.obstaclePool);
    this.scoreManager = new ScoreManager(this);
    this.inputManager = new InputManager(this, (action) => this.handleAction(action));

    // Launch UI scene in parallel
    this.scene.launch('UIScene', {
      lives: this.lives,
      scoreManager: this.scoreManager,
    });

    // Emit initial state
    this.events.emit('lives-changed', this.lives);
  }

  private handleAction(action: GameAction): void {
    if (this.gameOver) return;

    switch (action) {
      case 'left':
        this.player.switchLane('left');
        break;
      case 'right':
        this.player.switchLane('right');
        break;
      case 'jump':
        this.player.jump();
        break;
      case 'slide':
        this.player.slide();
        break;
    }
  }

  update(time: number, delta: number): void {
    if (this.gameOver) return;

    // Speed scaling
    this.speedTimer += delta;
    if (this.speedTimer >= CONSTANTS.SPEED_INCREASE_INTERVAL) {
      this.speedTimer = 0;
      this.currentSpeed = Math.min(
        this.currentSpeed + CONSTANTS.SPEED_INCREMENT,
        CONSTANTS.MAX_SPEED
      );
    }

    this.background.update(this.currentSpeed);
    this.player.update(delta);
    this.obstaclePool.update(this.currentSpeed, delta);
    this.spawner.update(this.currentSpeed, delta);

    // Distance scoring
    this.scoreManager.addDistance(this.currentSpeed * (delta / 1000));

    // Collision detection
    this.checkCollisions();

    // Emit score updates
    this.events.emit('score-updated', {
      score: this.scoreManager.getScore(),
      distance: this.scoreManager.getDistanceFormatted(),
    });
  }

  private checkCollisions(): void {
    const playerBounds = this.player.getBounds();
    const activeObstacles = this.obstaclePool.getActive();
    const groundY = getGroundY(this);

    for (const obstacle of activeObstacles) {
      // Only check obstacles near the player
      if (Math.abs(obstacle.getY() - (groundY - CONSTANTS.PLAYER_HEIGHT / 2)) > 100) {
        // Check if obstacle passed player (for dodge bonus)
        if (obstacle.getY() > groundY && !obstacle.wasDodged()) {
          obstacle.markDodged();
          this.scoreManager.addDodgeBonus();
        }
        continue;
      }

      if (obstacle.checkCollision(playerBounds)) {
        if (!this.player.isInvincible()) {
          this.onPlayerHit();
        }
      } else if (obstacle.checkNearMiss(playerBounds) && !obstacle.wasDodged()) {
        obstacle.markDodged();
        this.scoreManager.addNearMissBonus();
      }
    }
  }

  private onPlayerHit(): void {
    this.lives--;
    this.player.hit();
    this.scoreManager.resetCombo();
    this.events.emit('lives-changed', this.lives);

    // Screen flash
    this.cameras.main.flash(200, 255, 0, 0, true);
    this.cameras.main.shake(100, 0.01);

    if (this.lives <= 0) {
      this.endGame();
    }
  }

  private endGame(): void {
    this.gameOver = true;
    this.inputManager.setEnabled(false);

    this.time.delayedCall(500, () => {
      this.scene.stop('UIScene');
      this.scene.start('GameOverScene', {
        score: this.scoreManager.getScore(),
        distance: this.scoreManager.getDistanceFormatted(),
      });
    });
  }

  shutdown(): void {
    this.inputManager?.destroy();
    this.player?.destroy();
    this.obstaclePool?.destroy();
  }
}
