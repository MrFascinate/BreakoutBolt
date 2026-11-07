import * as THREE from 'three';
import { CONSTANTS, ObstacleConfig, ObstacleType } from '../config/Constants';
import { OBSTACLE_CONFIGS } from '../config/ObstacleData';
import { ScoreManager } from '../systems/ScoreManager';
import { EnemyView, animateRun, buildBolt } from './Models';
import { LANE_SPACING, LANE_X } from './World';

// The 2D game measures speed and distance in screen pixels. These factors map
// those numbers into world units so every speed, gap and hitbox from
// Constants/ObstacleData keeps the same feel and the scoring stays identical.
/** World units per 2D pixel along the road. */
const ZK = 0.11;
/** World units per 2D pixel across the road (2D lanes were ~112px apart). */
const XK = LANE_SPACING / 112;

const PLAYER_Z = 0;
const SPAWN_Z = -50 * ZK - 90; // 2D spawned at y=-50, just off the top edge
const DESPAWN_Z = 12; // behind the camera
const MIN_VERTICAL_GAP = 180 * ZK;
const GLOBAL_SPAWN_COOLDOWN = 300;
const PATROL_INTERVAL = 60000;
const POOL_PER_TYPE = 8;
const TYPES: ObstacleType[] = ['agent', 'cameraman', 'protester'];

export interface GameEvents {
  livesChanged(lives: number): void;
  levelChanged(level: number): void;
  nearMiss(): void;
  hit(): void;
  gameOver(result: { score: number; distance: string; level: number }): void;
}

class Enemy {
  view: EnemyView;
  config!: ObstacleConfig;
  lane = 1;
  active = false;
  dodged = false;
  zigzagAt: number | null = null;
  zigzagged = false;
  laneTween: { from: number; to: number; start: number; dur: number } | null = null;

  constructor(readonly type: ObstacleType, scene: THREE.Scene, makeView: (type: ObstacleType) => EnemyView) {
    this.view = makeView(type);
    this.view.root.visible = false;
    scene.add(this.view.root);
  }

  get root(): THREE.Object3D { return this.view.root; }
  get z(): number { return this.root.position.z; }
  get x(): number { return this.root.position.x; }
}

export class Game3D {
  private bolt = buildBolt();
  private boltMetals: THREE.MeshStandardMaterial[] = [];
  private enemies: Enemy[] = [];
  private score = new ScoreManager();

  private time = 0; // game-clock ms; frozen while paused
  private speed: number = CONSTANTS.INITIAL_SPEED;
  private lives: number = CONSTANTS.LIVES;
  private level = 1;
  private distanceForNextLevel: number = CONSTANTS.LEVEL_DISTANCE;
  private lane = 1;
  private laneTween: { from: number; to: number; start: number; dir: number } | null = null;
  private invincibleUntil = 0;
  private hitTintUntil = 0;
  private over = false;
  private deathStart = 0;
  private overSent = false;

  // Spawner state (mirrors ObstacleSpawner)
  private timeSinceLastSpawn = 0;
  private lastTypes: ObstacleType[] = [];
  private patrolTimer = 0;
  private globalCooldown = 0;

  constructor(
    private scene: THREE.Scene,
    private events: GameEvents,
    makeEnemy: (type: ObstacleType) => EnemyView
  ) {
    scene.add(this.bolt.root);
    this.bolt.root.traverse((o) => {
      const m = (o as THREE.Mesh).material;
      if (m instanceof THREE.MeshStandardMaterial && !this.boltMetals.includes(m)) this.boltMetals.push(m);
    });
    for (const type of TYPES) {
      for (let i = 0; i < POOL_PER_TYPE; i++) this.enemies.push(new Enemy(type, scene, makeEnemy));
    }
  }

  /** Fresh run: everything that GameScene.create() resets, plus pooled enemies. */
  reset(): void {
    this.time = 0;
    this.speed = CONSTANTS.INITIAL_SPEED;
    this.lives = CONSTANTS.LIVES;
    this.level = 1;
    this.distanceForNextLevel = CONSTANTS.LEVEL_DISTANCE;
    this.lane = 1;
    this.laneTween = null;
    this.invincibleUntil = 0;
    this.hitTintUntil = 0;
    this.over = false;
    this.overSent = false;
    this.score.reset();
    this.timeSinceLastSpawn = 0;
    this.lastTypes = [];
    this.patrolTimer = 0;
    this.globalCooldown = 0;
    for (const e of this.enemies) this.deactivate(e);

    const root = this.bolt.root;
    root.position.set(LANE_X[1], 0, PLAYER_Z);
    root.rotation.set(0, 0, 0);
    root.visible = true;
    this.bolt.body.rotation.set(0, 0, 0);
    this.setBoltTint(false);

    this.events.livesChanged(this.lives);
    this.events.levelChanged(this.level);
  }

  getScore(): number { return this.score.getScore(); }
  getDistance(): string { return this.score.getDistanceFormatted(); }
  getPlayerX(): number { return this.bolt.root.position.x; }
  isOver(): boolean { return this.over; }

  switchLane(dir: 'left' | 'right'): void {
    if (this.over) return;
    const newLane = this.lane + (dir === 'left' ? -1 : 1);
    if (newLane < 0 || newLane >= CONSTANTS.LANE_COUNT) return;
    this.lane = newLane;
    this.laneTween = {
      from: this.bolt.root.position.x,
      to: LANE_X[newLane],
      start: this.time,
      dir: dir === 'left' ? -1 : 1,
    };
  }

  /** Advance the run. Returns world units scrolled, so the scenery can follow. */
  update(deltaMs: number): number {
    this.time += deltaMs;
    this.animateBolt();

    if (this.over) {
      this.animateDeath();
      return 0;
    }

    const dt = deltaMs / 1000;
    this.updateSpawner(deltaMs);
    for (const e of this.enemies) if (e.active) this.updateEnemy(e, dt);

    this.score.addDistance(this.speed * dt);
    this.checkLevelUp();
    this.checkCollisions();
    return this.speed * dt * ZK;
  }

  // ---------------------------------------------------------------- player

  private animateBolt(): void {
    const root = this.bolt.root;
    if (this.laneTween) {
      const k = Math.min((this.time - this.laneTween.start) / CONSTANTS.LANE_SWITCH_DURATION, 1);
      const eased = 1 - (1 - k) * (1 - k); // Power2 out, as in the 2D tween
      root.position.x = this.laneTween.from + (this.laneTween.to - this.laneTween.from) * eased;
      this.bolt.body.rotation.z = -this.laneTween.dir * 0.22 * (1 - k);
      if (k >= 1) this.laneTween = null;
    }
    if (!this.over) {
      animateRun(this.bolt, this.time / 1000, 2.6 + (this.speed / CONSTANTS.MAX_SPEED) * 1.6, 0.95);
      // Bulb flickers; invincibility blinks Bolt like the 2D alpha flash
      const pulse = 0.85 + Math.sin(this.time / 90) * 0.15;
      this.bolt.bulb.scale.setScalar(pulse);
      root.visible = this.time >= this.invincibleUntil || Math.floor(this.time / 150) % 2 === 0;
    }
    if (this.hitTintUntil && this.time >= this.hitTintUntil) {
      this.hitTintUntil = 0;
      this.setBoltTint(false);
    }
  }

  private setBoltTint(on: boolean): void {
    for (const m of this.boltMetals) m.emissive.setHex(on ? 0xcc1111 : 0x000000);
  }

  private isInvincible(): boolean {
    return this.time < this.invincibleUntil;
  }

  private onPlayerHit(): void {
    this.lives--;
    this.invincibleUntil = this.time + CONSTANTS.INVINCIBILITY_DURATION;
    this.hitTintUntil = this.time + 100;
    this.setBoltTint(true);
    this.score.resetCombo();
    this.events.livesChanged(this.lives);
    this.events.hit();
    if (this.lives <= 0) {
      this.over = true;
      this.deathStart = this.time;
      this.bolt.root.visible = true;
    }
  }

  /** Bolt topples forward during the same 800ms pause the 2D game had before Game Over. */
  private animateDeath(): void {
    const k = Math.min((this.time - this.deathStart) / 500, 1);
    this.bolt.root.rotation.x = -k * k * 1.45;
    this.bolt.root.position.y = Math.sin(k * Math.PI) * 0.4;
    if (!this.overSent && this.time - this.deathStart >= 800) {
      this.overSent = true;
      this.events.gameOver({ score: this.getScore(), distance: this.getDistance(), level: this.level });
    }
  }

  // ---------------------------------------------------------------- level

  private checkLevelUp(): void {
    if (this.level >= CONSTANTS.MAX_LEVEL) return;
    if (this.score.getDistance() >= this.distanceForNextLevel) {
      this.level++;
      this.distanceForNextLevel += CONSTANTS.LEVEL_DISTANCE;
      const speedRange = CONSTANTS.MAX_SPEED - CONSTANTS.INITIAL_SPEED;
      const levelRatio = (this.level - 1) / (CONSTANTS.MAX_LEVEL - 1);
      this.speed = CONSTANTS.INITIAL_SPEED + speedRange * levelRatio;
      this.events.levelChanged(this.level);
    }
  }

  // ---------------------------------------------------------------- enemies

  private spawnEnemy(config: ObstacleConfig, lane: number, z: number): Enemy | null {
    const e = this.enemies.find((o) => !o.active && o.type === config.type);
    if (!e) return null;
    e.config = config;
    e.lane = lane;
    e.active = true;
    e.dodged = false;
    e.zigzagged = false;
    e.laneTween = null;
    e.root.position.set(LANE_X[lane], 0, z);
    e.root.visible = true;
    // Protester zigzag behavior: one lane change 600–1000ms after spawning
    e.zigzagAt = config.zigzag ? this.time + 600 + Math.random() * 400 : null;
    return e;
  }

  private deactivate(e: Enemy): void {
    e.active = false;
    e.zigzagAt = null;
    e.laneTween = null;
    e.root.visible = false;
  }

  private updateEnemy(e: Enemy, dt: number): void {
    e.root.position.z += (this.speed + e.config.speed) * ZK * dt;
    e.view.animate(dt, 1 + e.config.speed / 260);

    if (e.zigzagAt !== null && this.time >= e.zigzagAt) {
      e.zigzagAt = null;
      this.doZigzag(e);
    }
    if (e.laneTween) {
      const k = Math.min((this.time - e.laneTween.start) / e.laneTween.dur, 1);
      e.root.position.x = e.laneTween.from + (e.laneTween.to - e.laneTween.from) * k;
      if (k >= 1) e.laneTween = null;
    }
    if (e.z > DESPAWN_Z) this.deactivate(e);
  }

  private doZigzag(e: Enemy): void {
    if (!e.active || e.zigzagged) return;
    // Only zigzag while still far away (2D: upper 45% of the screen) so the player can react
    if (e.z > SPAWN_Z * 0.46) return;
    e.zigzagged = true;
    const options = [0, 1, 2].filter((l) => l !== e.lane);
    e.lane = options[Math.floor(Math.random() * options.length)];
    e.laneTween = { from: e.x, to: LANE_X[e.lane], start: this.time, dur: 200 };
  }

  // ---------------------------------------------------------------- spawner

  private updateSpawner(deltaMs: number): void {
    this.timeSinceLastSpawn += deltaMs;
    this.patrolTimer += deltaMs;
    if (this.globalCooldown > 0) this.globalCooldown -= deltaMs;

    if (this.timeSinceLastSpawn >= this.getMinGap() * 1000 && this.globalCooldown <= 0) {
      this.spawnObstacle();
      this.timeSinceLastSpawn = 0;
    }
    if (this.patrolTimer >= PATROL_INTERVAL) {
      this.spawnPatrol();
      this.patrolTimer = 0;
    }
  }

  private getMinGap(): number {
    const speedRatio = (this.speed - CONSTANTS.INITIAL_SPEED) / (CONSTANTS.MAX_SPEED - CONSTANTS.INITIAL_SPEED);
    return CONSTANTS.MIN_OBSTACLE_GAP -
      (CONSTANTS.MIN_OBSTACLE_GAP - CONSTANTS.MIN_OBSTACLE_GAP_AT_MAX) * speedRatio;
  }

  private isLaneTooClose(lane: number, z: number): boolean {
    return this.enemies.some((e) => e.active && Math.abs(e.lane - lane) <= 1 && Math.abs(e.z - z) < MIN_VERTICAL_GAP);
  }

  private spawnObstacle(): void {
    const type = this.pickType();
    let lane = Math.floor(Math.random() * CONSTANTS.LANE_COUNT);
    if (this.isLaneTooClose(lane, SPAWN_Z)) {
      const alternatives = [0, 1, 2].filter((l) => l !== lane && !this.isLaneTooClose(l, SPAWN_Z));
      if (alternatives.length === 0) return;
      lane = alternatives[Math.floor(Math.random() * alternatives.length)];
    }
    this.spawnEnemy(OBSTACLE_CONFIGS[type], lane, SPAWN_Z);
    this.globalCooldown = GLOBAL_SPAWN_COOLDOWN;
    this.lastTypes.push(type);
    if (this.lastTypes.length > 3) this.lastTypes.shift();

    // Sometimes spawn group for cameraman
    if (type === 'cameraman' && Math.random() < 0.3) {
      const groupZ = SPAWN_Z - 30 * ZK;
      const safe = [0, 1, 2].filter((l) => l !== lane && !this.isLaneTooClose(l, groupZ));
      if (safe.length > 0) {
        this.spawnEnemy(OBSTACLE_CONFIGS['cameraman'], safe[Math.floor(Math.random() * safe.length)], groupZ);
      }
    }
  }

  /** Every 60s, agents block two lanes and leave one open. */
  private spawnPatrol(): void {
    const openLane = Math.floor(Math.random() * CONSTANTS.LANE_COUNT);
    for (const lane of [0, 1, 2].filter((l) => l !== openLane)) {
      this.spawnEnemy(OBSTACLE_CONFIGS['agent'], lane, SPAWN_Z);
    }
    this.globalCooldown = GLOBAL_SPAWN_COOLDOWN;
  }

  private pickType(): ObstacleType {
    // Never spawn same type 3 times in a row
    const n = this.lastTypes.length;
    if (n >= 2 && this.lastTypes[n - 1] === this.lastTypes[n - 2]) {
      return this.weightedPick(TYPES.filter((t) => t !== this.lastTypes[n - 1]));
    }
    return this.weightedPick(TYPES);
  }

  private weightedPick(types: ObstacleType[]): ObstacleType {
    const total = types.reduce((s, t) => s + OBSTACLE_CONFIGS[t].spawnWeight, 0);
    let roll = Math.random() * total;
    for (const t of types) {
      roll -= OBSTACLE_CONFIGS[t].spawnWeight;
      if (roll <= 0) return t;
    }
    return types[0];
  }

  // ---------------------------------------------------------------- collisions

  /** Same checks and order as GameScene.checkCollisions, with z standing in for screen y. */
  private checkCollisions(): void {
    const px = this.bolt.root.position.x;
    for (const e of this.enemies) {
      if (!e.active) continue;
      const dz = e.z - PLAYER_Z;

      // Passed the player — award dodge if not already handled
      if (dz > 60 * ZK) {
        if (!e.dodged) {
          e.dodged = true;
          this.score.addDodgeBonus();
        }
        continue;
      }
      if (Math.abs(dz) > 80 * ZK) continue;
      if (e.dodged) continue;

      const colW = e.config.width * e.config.collisionWidthRatio;
      const colH = e.config.height * e.config.collisionHeightRatio;
      const dx = Math.abs(px - e.x);

      if (e.lane === this.lane) {
        const hit = Math.abs(dz) < ((CONSTANTS.PLAYER_HEIGHT + colH) / 2) * ZK &&
          dx < ((CONSTANTS.PLAYER_WIDTH + colW) / 2) * XK;
        if (hit) {
          e.dodged = true;
          if (!this.isInvincible()) this.onPlayerHit();
        }
      } else if (!this.isInvincible()) {
        // Different lane but brushed past mid-switch = near miss
        const near = CONSTANTS.NEAR_MISS_DISTANCE;
        const close = Math.abs(dz) < ((CONSTANTS.PLAYER_HEIGHT + near * 2 + colH) / 2) * ZK &&
          dx < ((CONSTANTS.PLAYER_WIDTH + near * 2 + colW) / 2) * XK;
        if (close) {
          e.dodged = true;
          this.score.addNearMissBonus();
          this.events.nearMiss();
        }
      }
    }
  }
}
