import { CONSTANTS, ObstacleType } from '../config/Constants';
import { OBSTACLE_CONFIGS } from '../config/ObstacleData';
import { ObstaclePool } from '../entities/ObstaclePool';

/** Minimum vertical gap (px) between enemies in the same or adjacent lanes. */
const MIN_VERTICAL_GAP = 180;
/** Global cooldown (ms) — no two spawns within this window regardless of lane. */
const GLOBAL_SPAWN_COOLDOWN = 300;

export class ObstacleSpawner {
  private scene: Phaser.Scene;
  private pool: ObstaclePool;
  private timeSinceLastSpawn = 0;
  private lastTypes: ObstacleType[] = [];
  private patrolCarTimer = 0;
  private patrolCarInterval = 60000;
  private globalCooldown = 0;

  constructor(scene: Phaser.Scene, pool: ObstaclePool) {
    this.scene = scene;
    this.pool = pool;
  }

  update(speed: number, delta: number): void {
    this.timeSinceLastSpawn += delta;
    this.patrolCarTimer += delta;
    if (this.globalCooldown > 0) this.globalCooldown -= delta;

    const minGap = this.getMinGap(speed);
    const minGapMs = minGap * 1000;

    if (this.timeSinceLastSpawn >= minGapMs && this.globalCooldown <= 0) {
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

  /** Check if any active obstacle in the given lane (or adjacent) is too close to startY. */
  private isLaneTooClose(lane: number, startY: number): boolean {
    const active = this.pool.getActive();
    for (const obs of active) {
      const obsLane = obs.getLane();
      // Check same lane and adjacent lanes
      if (Math.abs(obsLane - lane) <= 1) {
        const verticalDist = Math.abs(obs.getY() - startY);
        if (verticalDist < MIN_VERTICAL_GAP) {
          return true;
        }
      }
    }
    return false;
  }

  private spawnObstacle(speed: number): void {
    const type = this.pickObstacleType();
    const config = OBSTACLE_CONFIGS[type];
    let lane = Math.floor(Math.random() * CONSTANTS.LANE_COUNT);
    const startY = -50;

    // If the chosen lane is too close, try others; skip spawn if all blocked
    if (this.isLaneTooClose(lane, startY)) {
      const alternatives = [0, 1, 2].filter(l => l !== lane && !this.isLaneTooClose(l, startY));
      if (alternatives.length === 0) return; // Skip this spawn entirely
      lane = alternatives[Math.floor(Math.random() * alternatives.length)];
    }

    this.pool.get(config, lane, startY);
    this.globalCooldown = GLOBAL_SPAWN_COOLDOWN;
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
    // Pick a lane that has enough vertical clearance
    const safeLanes = availableLanes.filter(l => !this.isLaneTooClose(l, -80));
    if (safeLanes.length === 0) return;
    const extraLane = safeLanes[Math.floor(Math.random() * safeLanes.length)];
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
    this.globalCooldown = GLOBAL_SPAWN_COOLDOWN;
  }

  private pickObstacleType(): ObstacleType {
    // Never spawn same type 3 times in a row
    const types: ObstacleType[] = ['cop', 'maga', 'karen'];

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
    this.globalCooldown = 0;
  }
}
