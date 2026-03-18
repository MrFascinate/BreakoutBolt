import { Obstacle } from './Obstacle';
import { ObstacleConfig } from '../config/Constants';

export class ObstaclePool {
  private scene: Phaser.Scene;
  private pool: Obstacle[] = [];
  private poolSize: number;

  constructor(scene: Phaser.Scene, poolSize = 20) {
    this.scene = scene;
    this.poolSize = poolSize;

    for (let i = 0; i < poolSize; i++) {
      this.pool.push(new Obstacle(scene));
    }
  }

  get(config: ObstacleConfig, lane: number, startY: number): Obstacle | null {
    const available = this.pool.find(o => !o.isActive());
    if (!available) return null;

    available.spawn(config, lane, startY);
    return available;
  }

  getActive(): Obstacle[] {
    return this.pool.filter(o => o.isActive());
  }

  update(speed: number, delta: number): void {
    for (const obstacle of this.pool) {
      if (obstacle.isActive()) {
        obstacle.update(speed, delta);
      }
    }
  }

  deactivateAll(): void {
    for (const obstacle of this.pool) {
      obstacle.deactivate();
    }
  }

  destroy(): void {
    for (const obstacle of this.pool) {
      obstacle.destroy();
    }
    this.pool = [];
  }
}
