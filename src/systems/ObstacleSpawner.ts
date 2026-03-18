import { CONSTANTS, ObstacleType } from '../config/Constants';
import { OBSTACLE_CONFIGS } from '../config/ObstacleData';
import { ObstaclePool } from '../entities/ObstaclePool';

export class ObstacleSpawner {
  private scene: Phaser.Scene;
  private pool: ObstaclePool;
  private timeSinceLastSpawn = 0;
  private lastTypes: ObstacleType[] = [];
  private patrolCarTimer = 0;
  private patrolCarInterval = 60000;

  constructor(scene: Phaser.Scene, pool: ObstaclePool) {
    this.scene = scene;
    this.pool = pool;
  }

  update(speed: number, delta: number): void {
    this.timeSinceLastSpawn += delta;
    this.patrolCarTimer += delta;

    const minGap = this.getMinGap(speed);
    const minGapMs = minGap * 1000;

    if (this.timeSinceLastSpawn >= minGapMs) {
      this.spawnObstacle(speed);
      this.timeSinceLastSpawn = 0;
    }

    // Patrol car every ~60 seconds
    if (this.patrolCarTimer >= this.patrolCarInterval) {
      this.spawnPatrolCar();
      this.patrolCarTimer = 0;
    }
  }

  private getMinGap(speed: number): number {
    const speedRatio = (speed - CONSTANTS.INITIAL_SPEED) /
      (CONSTANTS.MAX_SPEED - CONSTANTS.INITIAL_SPEED);
    return CONSTANTS.MIN_OBSTACLE_GAP -
      (CONSTANTS.MIN_OBSTACLE_GAP - CONSTANTS.MIN_OBSTACLE_GAP_AT_MAX) * speedRatio;
  }

  private spawnObstacle(speed: number): void {
    const type = this.pickObstacleType();
    const config = OBSTACLE_CONFIGS[type];
    const lane = Math.floor(Math.random() * CONSTANTS.LANE_COUNT);

    this.pool.get(config, lane, -50);
    this.lastTypes.push(type);
    if (this.lastTypes.length > 3) this.lastTypes.shift();

    // Sometimes spawn group for maga
    if (type === 'maga' && Math.random() < 0.3) {
      this.spawnMagaGroup(lane);
    }
  }

  private spawnMagaGroup(excludeLane: number): void {
    const config = OBSTACLE_CONFIGS['maga'];
    const availableLanes = [0, 1, 2].filter(l => l !== excludeLane);
    // Spawn one more in an adjacent lane (leave one open)
    const extraLane = availableLanes[Math.floor(Math.random() * availableLanes.length)];
    this.pool.get(config, extraLane, -80);
  }

  private spawnPatrolCar(): void {
    const config = OBSTACLE_CONFIGS['cop'];
    // Patrol car spans 2 lanes, leave 1 open
    const openLane = Math.floor(Math.random() * CONSTANTS.LANE_COUNT);
    const blockedLanes = [0, 1, 2].filter(l => l !== openLane);
    for (const lane of blockedLanes) {
      this.pool.get(config, lane, -50);
    }
  }

  private pickObstacleType(): ObstacleType {
    // Never spawn same type 3 times in a row
    const types: ObstacleType[] = ['cop', 'maga', 'hater'];

    if (this.lastTypes.length >= 2 &&
        this.lastTypes[this.lastTypes.length - 1] === this.lastTypes[this.lastTypes.length - 2]) {
      const exclude = this.lastTypes[this.lastTypes.length - 1];
      const filtered = types.filter(t => t !== exclude);
      return this.weightedPick(filtered);
    }

    return this.weightedPick(types);
  }

  private weightedPick(types: ObstacleType[]): ObstacleType {
    const totalWeight = types.reduce((sum, t) => sum + OBSTACLE_CONFIGS[t].spawnWeight, 0);
    let roll = Math.random() * totalWeight;
    for (const type of types) {
      roll -= OBSTACLE_CONFIGS[type].spawnWeight;
      if (roll <= 0) return type;
    }
    return types[0];
  }

  reset(): void {
    this.timeSinceLastSpawn = 0;
    this.lastTypes = [];
    this.patrolCarTimer = 0;
  }
}
