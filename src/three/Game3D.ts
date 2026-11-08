import * as THREE from 'three';
import { CONSTANTS, ObstacleConfig, ObstacleType } from '../config/Constants';
import { OBSTACLE_CONFIGS } from '../config/ObstacleData';
import { ScoreManager } from '../systems/ScoreManager';
import { Sparks } from './Effects';
import { EnemyView, animateRun, buildBolt } from './Models';
import { PowerKind, buildEnergyBolt, buildMagnetRing, buildPowerUp, buildShieldBubble } from './Pickups';
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

// Late game: past MAX_LEVEL, a new level every mile ramps difficulty further
// until OVERTIME_LEVELS more levels, then holds. Level numbers keep counting.
const OVERTIME_LEVEL_DISTANCE = 16093; // one mile in 2D px (ScoreManager's mile)
const OVERTIME_LEVELS = 10;
const OVERTIME_SPEED_BOOST = 0.2; // up to +20% over MAX_SPEED
const OVERTIME_GAP_CUT = 0.3; // spawn gaps up to 30% shorter
const OVERTIME_PAIR_CHANCE = 0.45; // chance a spawn comes with a partner in another lane
const OVERTIME_PATROL_CUT = 0.5; // roadblocks up to twice as often
const POOL_PER_TYPE = 8;
const TYPES: ObstacleType[] = ['agent', 'cameraman', 'protester'];

// Bodies only touch when they're this close along the road. (The 2D hitboxes
// spanned ~7 units of depth here, which looked like hits from a distance in 3D.)
const HIT_DEPTH = 1.3;
const NEAR_DEPTH = 1.7;

// Jump / slide
const JUMP_MS = 800;
const JUMP_HEIGHT = 2.6; // visibly over an enemy's head
const CLEAR_HEIGHT = 0.6; // high enough to clear a jumpable enemy
/** A jump/slide/swerve this soon after touching a jumpable or slideable enemy still counts. */
const LATE_GRACE_MS = 130;
/** A jump pressed this close to landing is queued instead of dropped. */
const JUMP_BUFFER_MS = 150;
const SLIDE_MS = 650;

// Collectibles and power-ups
const BOLT_POOL = 60;
const BOLT_POINTS = 10;
const CHARGE_MAX = 30; // bolts to fill the Overdrive meter
const OVERDRIVE_MS = 5000;
const OVERDRIVE_SPEED = 1.6;
const MAGNET_MS = 8000;
const MAGNET_RANGE_Z = 22;
const KNOCK_POINTS = 50;
const POWER_POOL = 2; // per kind

export interface GameEvents {
  livesChanged(lives: number): void;
  levelChanged(level: number): void;
  nearMiss(): void;
  hit(): void;
  gameOver(result: { score: number; distance: string; level: number }): void;
  jump(): void;
  slide(): void;
  lane(): void;
  collect(): void;
  powerUp(kind: PowerKind | 'overdrive'): void;
  shieldPop(): void;
  knock(): void;
}

export interface PowerState {
  shield: boolean;
  magnetLeft: number; // ms
  overdriveLeft: number; // ms
  charge: number; // 0..1
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
  /** Set when Overdrive or the shield sends this enemy flying. */
  knock: { vel: THREE.Vector3; spin: THREE.Vector3 } | null = null;
  /** Bolt got over/under this enemy; landing on it afterwards doesn't count as a hit. */
  cleared = false;
  /** Contact happened without clearing; the hit lands at this time unless Bolt reacts. */
  graceUntil = 0;

  constructor(readonly type: ObstacleType, scene: THREE.Scene, makeView: (type: ObstacleType) => EnemyView) {
    this.view = makeView(type);
    this.view.root.visible = false;
    scene.add(this.view.root);
  }

  get root(): THREE.Object3D { return this.view.root; }
  get z(): number { return this.root.position.z; }
  get x(): number { return this.root.position.x; }
}

interface Pickup {
  obj: THREE.Group;
  active: boolean;
  lane: number;
  kind?: PowerKind;
  /** Being pulled in by the magnet. */
  pulled: boolean;
}

export class Game3D {
  private bolt = buildBolt();
  private boltMetals: THREE.MeshStandardMaterial[] = [];
  private bulbMat: THREE.MeshBasicMaterial;
  private enemies: Enemy[] = [];
  private score = new ScoreManager();
  readonly sparks: Sparks;

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

  // Jump / slide
  private jumpStart: number | null = null;
  private jumpQueued = false;
  private slideStart: number | null = null;

  // Pickups and power-ups
  private bolts: Pickup[] = [];
  private powerUps: Pickup[] = [];
  private nextBoltRow = 0;
  private nextPowerUp = 0;
  private shield = false;
  private magnetUntil = 0;
  private overdriveUntil = 0;
  private charge = 0;
  private shieldBubble = buildShieldBubble();
  private magnetRing = buildMagnetRing();

  // Spawner state (mirrors ObstacleSpawner)
  private timeSinceLastSpawn = 0;
  private lastTypes: ObstacleType[] = [];
  private patrolTimer = 0;
  private globalCooldown = 0;

  private tmp = new THREE.Vector3();

  constructor(
    private scene: THREE.Scene,
    private events: GameEvents,
    makeEnemy: (type: ObstacleType) => EnemyView
  ) {
    scene.add(this.bolt.root);
    // Give the bulb its own material so its color can show Bolt's state
    const sharedBulb = this.bolt.bulb.material as THREE.MeshBasicMaterial;
    this.bulbMat = sharedBulb.clone();
    this.bolt.root.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (mesh.material === sharedBulb) mesh.material = this.bulbMat;
      const m = mesh.material;
      if (m instanceof THREE.MeshStandardMaterial && !this.boltMetals.includes(m)) this.boltMetals.push(m);
    });
    this.bolt.root.add(this.shieldBubble, this.magnetRing);

    for (const type of TYPES) {
      for (let i = 0; i < POOL_PER_TYPE; i++) this.enemies.push(new Enemy(type, scene, makeEnemy));
    }
    for (let i = 0; i < BOLT_POOL; i++) {
      const obj = buildEnergyBolt();
      obj.visible = false;
      scene.add(obj);
      this.bolts.push({ obj, active: false, lane: 0, pulled: false });
    }
    for (const kind of ['shield', 'magnet', 'battery'] as PowerKind[]) {
      for (let i = 0; i < POWER_POOL; i++) {
        const obj = buildPowerUp(kind);
        obj.visible = false;
        scene.add(obj);
        this.powerUps.push({ obj, active: false, lane: 0, kind, pulled: false });
      }
    }
    this.sparks = new Sparks(scene);
  }

  /** Fresh run: everything that GameScene.create() resets, plus pooled objects. */
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

    this.jumpStart = null;
    this.jumpQueued = false;
    this.slideStart = null;
    this.shield = false;
    this.magnetUntil = 0;
    this.overdriveUntil = 0;
    this.charge = 0;
    this.nextBoltRow = 1200;
    this.nextPowerUp = 9000 + Math.random() * 5000;
    for (const p of [...this.bolts, ...this.powerUps]) this.hidePickup(p);
    this.sparks.clear();

    const root = this.bolt.root;
    root.position.set(LANE_X[1], 0, PLAYER_Z);
    root.rotation.set(0, 0, 0);
    root.visible = true;
    this.bolt.body.rotation.set(0, 0, 0);
    this.bolt.body.position.set(0, 0, 0);
    this.bolt.body.scale.set(1, 1, 1);
    this.setBoltTint(0x000000);

    this.events.livesChanged(this.lives);
    this.events.levelChanged(this.level);
  }

  getScore(): number { return this.score.getScore(); }
  getDistance(): string { return this.score.getDistanceFormatted(); }
  getLevel(): number { return this.level; }
  getPlayerX(): number { return this.bolt.root.position.x; }
  getPlayerY(): number { return this.bolt.root.position.y; }
  isOver(): boolean { return this.over; }
  isOverdrive(): boolean { return this.time < this.overdriveUntil; }
  /** 0 at the starting speed, 1 at max speed. */
  getSpeedRatio(): number {
    return (this.speed - CONSTANTS.INITIAL_SPEED) / (CONSTANTS.MAX_SPEED - CONSTANTS.INITIAL_SPEED);
  }

  getPowerState(): PowerState {
    return {
      shield: this.shield,
      magnetLeft: Math.max(0, this.magnetUntil - this.time),
      overdriveLeft: Math.max(0, this.overdriveUntil - this.time),
      charge: this.isOverdrive() ? (this.overdriveUntil - this.time) / OVERDRIVE_MS : this.charge / CHARGE_MAX,
    };
  }

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
    this.events.lane();
  }

  jump(): void {
    if (this.over) return;
    if (this.jumpStart !== null) {
      if (this.time - this.jumpStart > JUMP_MS - JUMP_BUFFER_MS) this.jumpQueued = true;
      return;
    }
    this.slideStart = null; // jumping cancels a slide
    this.jumpStart = this.time;
    this.forgiveLate('jump');
    this.events.jump();
  }

  slide(): void {
    if (this.over) return;
    this.jumpStart = null; // sliding mid-air drops Bolt straight down
    this.jumpQueued = false;
    this.slideStart = this.time;
    this.forgiveLate('slide');
    this.events.slide();
  }

  /** A slightly late jump/slide still clears an enemy that's mid-contact. */
  private forgiveLate(action: 'jump' | 'slide'): void {
    for (const e of this.enemies) {
      if (!e.active || !e.graceUntil) continue;
      if ((action === 'jump' && e.config.canJump) || (action === 'slide' && e.config.canSlide)) {
        e.cleared = true;
        e.graceUntil = 0;
      }
    }
  }

  private isJumping(): boolean { return this.jumpStart !== null; }
  private isSliding(): boolean { return this.slideStart !== null; }

  /** Road speed in 2D px/s, including the Overdrive boost. */
  private worldSpeed(): number {
    return this.speed * (this.isOverdrive() ? OVERDRIVE_SPEED : 1);
  }

  /** Advance the run. Returns world units scrolled, so the scenery can follow. */
  update(deltaMs: number): number {
    this.time += deltaMs;
    const dt = deltaMs / 1000;
    this.animateBolt(dt);

    if (this.over) {
      this.animateDeath();
      this.sparks.update(dt, 0);
      return 0;
    }

    const scroll = this.worldSpeed() * dt * ZK;
    this.updateSpawner(deltaMs);
    for (const e of this.enemies) if (e.active) this.updateEnemy(e, dt, scroll);
    this.updatePickups(dt, scroll);

    this.score.addDistance(this.worldSpeed() * dt);
    this.checkLevelUp();
    this.checkCollisions();
    this.sparks.update(dt, scroll);
    return scroll;
  }

  // ---------------------------------------------------------------- player

  private animateBolt(dt: number): void {
    const root = this.bolt.root;
    const body = this.bolt.body;
    let lean = 0;
    if (this.laneTween) {
      const k = Math.min((this.time - this.laneTween.start) / CONSTANTS.LANE_SWITCH_DURATION, 1);
      const eased = 1 - (1 - k) * (1 - k); // Power2 out, as in the 2D tween
      root.position.x = this.laneTween.from + (this.laneTween.to - this.laneTween.from) * eased;
      lean = -this.laneTween.dir * 0.22 * (1 - k);
      if (k >= 1) this.laneTween = null;
    }
    if (this.over) return;

    const overdrive = this.isOverdrive();
    animateRun(this.bolt, this.time / 1000, (2.6 + this.getSpeedRatio() * 1.6) * (overdrive ? 1.4 : 1), 0.95);
    body.rotation.z += lean; // after the run cycle, which also sets the body roll

    // Jump arc with tucked legs
    root.position.y = 0;
    if (this.jumpStart !== null) {
      const k = (this.time - this.jumpStart) / JUMP_MS;
      if (k >= 1) {
        this.jumpStart = null;
        if (this.jumpQueued) {
          this.jumpQueued = false;
          this.jump();
        }
        this.sparks.burst(this.tmp.set(root.position.x, 0.1, PLAYER_Z), { count: 10, color: 0xbbbbbb, speed: 3, up: 1, life: 0.35 });
      } else {
        root.position.y = 4 * JUMP_HEIGHT * k * (1 - k);
        this.bolt.leftLeg.rotation.x = -0.9;
        this.bolt.rightLeg.rotation.x = 0.5;
        this.bolt.leftArm.rotation.x = this.bolt.rightArm.rotation.x = -2.4;
      }
    }

    // Slide: lean back and squash, sparks scraping off the feet
    if (this.slideStart !== null) {
      const k = (this.time - this.slideStart) / SLIDE_MS;
      if (k >= 1) {
        this.slideStart = null;
        body.rotation.x = 0;
        body.scale.set(1, 1, 1);
      } else {
        const ease = Math.sin(Math.min(k * 4, 1) * Math.PI / 2) * (k > 0.8 ? (1 - k) / 0.2 : 1);
        // Cartoon crouch: squash down and lean back slightly (a full lean-back
        // tips the big head into the camera)
        body.rotation.x = 0.3 * ease;
        body.scale.set(1 + 0.12 * ease, 1 - 0.45 * ease, 1 + 0.12 * ease);
        body.position.y = 0;
        if (Math.random() < 0.7) {
          this.sparks.burst(this.tmp.set(root.position.x + (Math.random() - 0.5) * 0.5, 0.1, PLAYER_Z + 0.4),
            { count: 2, color: 0xffb340, speed: 2.5, up: 2, life: 0.3 });
        }
      }
    }

    // Overdrive: white-hot bulb, glowing body, electric trail
    if (overdrive) {
      this.setBoltTint(0x1a4a66);
      if (Math.random() < 0.8) {
        this.sparks.burst(this.tmp.set(root.position.x + (Math.random() - 0.5), root.position.y + 0.6 + Math.random() * 1.6, PLAYER_Z + 0.6),
          { count: 2, color: 0x66ddff, speed: 2, up: 0.5, life: 0.4 });
      }
    } else if (!this.hitTintUntil) {
      this.setBoltTint(0x000000);
    }

    // Bulb color shows Bolt's state
    const pulse = 0.85 + Math.sin(this.time / 90) * 0.15;
    if (overdrive) this.bulbMat.color.setHex(0xffffff);
    else if (this.shield) this.bulbMat.color.setHex(0x59c8ff);
    else if (this.lives === 1) this.bulbMat.color.setHex(Math.floor(this.time / 220) % 2 ? 0xff3030 : 0x801010);
    else this.bulbMat.color.setHex(0xffd84a);
    this.bolt.bulb.scale.setScalar(pulse * (overdrive ? 1.35 : 1));

    // Invincibility blinks Bolt like the 2D alpha flash (not during Overdrive)
    root.visible = overdrive || this.time >= this.invincibleUntil || Math.floor(this.time / 150) % 2 === 0;

    this.shieldBubble.visible = this.shield;
    if (this.shield) {
      (this.shieldBubble.userData.wire as THREE.Object3D).rotation.y += dt * 0.8;
      this.shieldBubble.scale.setScalar(1 + Math.sin(this.time / 160) * 0.03);
    }
    const magnet = this.time < this.magnetUntil;
    this.magnetRing.visible = magnet;
    if (magnet) {
      const s = 1 + ((this.time / 600) % 1) * 0.6;
      this.magnetRing.scale.set(s, s, 1);
      (this.magnetRing.material as THREE.MeshBasicMaterial).opacity = 0.8 * (1.6 - s) / 0.6;
    }

    if (this.hitTintUntil && this.time >= this.hitTintUntil) {
      this.hitTintUntil = 0;
      this.setBoltTint(0x000000);
    }
  }

  private setBoltTint(hex: number): void {
    for (const m of this.boltMetals) m.emissive.setHex(hex);
  }

  private isInvincible(): boolean {
    return this.time < this.invincibleUntil;
  }

  private onPlayerHit(e: Enemy): void {
    // Shield soaks the hit and sends the enemy flying
    if (this.shield) {
      this.shield = false;
      this.invincibleUntil = this.time + 1000;
      this.knockEnemy(e);
      this.sparks.burst(this.tmp.set(this.bolt.root.position.x, 1.2, PLAYER_Z), { count: 40, color: 0x59c8ff, speed: 7, life: 0.7 });
      this.events.shieldPop();
      return;
    }
    this.lives--;
    this.invincibleUntil = this.time + CONSTANTS.INVINCIBILITY_DURATION;
    this.hitTintUntil = this.time + 100;
    this.setBoltTint(0xcc1111);
    this.score.resetCombo();
    this.sparks.burst(this.tmp.set(this.bolt.root.position.x, 1.3, PLAYER_Z), { count: 30, color: 0xff7a2a, speed: 6, life: 0.6 });
    this.events.livesChanged(this.lives);
    this.events.hit();
    if (this.lives <= 0) {
      this.over = true;
      this.deathStart = this.time;
      this.jumpStart = this.slideStart = null;
      this.bolt.body.rotation.x = 0;
      this.bolt.body.scale.set(1, 1, 1);
      this.bolt.root.visible = true;
      this.shieldBubble.visible = this.magnetRing.visible = false;
    }
  }

  /** Bolt topples forward during the same 800ms pause the 2D game had before Game Over. */
  private animateDeath(): void {
    const k = Math.min((this.time - this.deathStart) / 500, 1);
    this.bolt.root.rotation.x = -k * k * 1.45;
    this.bolt.root.position.y = Math.sin(k * Math.PI) * 0.4;
    this.bulbMat.color.setHex(Math.floor(this.time / 120) % 2 ? 0x552222 : 0x111111);
    if (!this.overSent && this.time - this.deathStart >= 800) {
      this.overSent = true;
      this.events.gameOver({ score: this.getScore(), distance: this.getDistance(), level: this.level });
    }
  }

  // ---------------------------------------------------------------- level

  private checkLevelUp(): void {
    if (this.score.getDistance() < this.distanceForNextLevel) return;
    this.level++;
    if (this.level <= CONSTANTS.MAX_LEVEL) {
      const speedRange = CONSTANTS.MAX_SPEED - CONSTANTS.INITIAL_SPEED;
      const levelRatio = (this.level - 1) / (CONSTANTS.MAX_LEVEL - 1);
      this.speed = CONSTANTS.INITIAL_SPEED + speedRange * levelRatio;
    } else {
      this.speed = CONSTANTS.MAX_SPEED * (1 + OVERTIME_SPEED_BOOST * this.overtime());
    }
    this.distanceForNextLevel += this.level >= CONSTANTS.MAX_LEVEL ? OVERTIME_LEVEL_DISTANCE : CONSTANTS.LEVEL_DISTANCE;
    this.events.levelChanged(this.level);
  }

  /** 0 up to MAX_LEVEL, rising to 1 over the next OVERTIME_LEVELS levels. */
  private overtime(): number {
    return THREE.MathUtils.clamp((this.level - CONSTANTS.MAX_LEVEL) / OVERTIME_LEVELS, 0, 1);
  }

  // ---------------------------------------------------------------- enemies

  private spawnEnemy(config: ObstacleConfig, lane: number, z: number): Enemy | null {
    const e = this.enemies.find((o) => !o.active && o.type === config.type);
    if (!e) return null;
    e.config = config;
    e.lane = lane;
    e.active = true;
    e.dodged = false;
    e.cleared = false;
    e.graceUntil = 0;
    e.zigzagged = false;
    e.laneTween = null;
    e.knock = null;
    e.root.position.set(LANE_X[lane], 0, z);
    e.root.rotation.set(0, 0, 0);
    e.root.visible = true;
    // Protester zigzag behavior: one lane change 600–1000ms after spawning
    e.zigzagAt = config.zigzag ? this.time + 600 + Math.random() * 400 : null;
    return e;
  }

  private deactivate(e: Enemy): void {
    e.active = false;
    e.zigzagAt = null;
    e.laneTween = null;
    e.knock = null;
    e.root.rotation.set(0, 0, 0);
    e.root.visible = false;
  }

  private knockEnemy(e: Enemy): void {
    e.dodged = true;
    e.graceUntil = 0;
    e.zigzagAt = null;
    e.laneTween = null;
    const side = e.x === this.bolt.root.position.x ? (Math.random() < 0.5 ? -1 : 1) : Math.sign(e.x - this.bolt.root.position.x);
    e.knock = {
      vel: new THREE.Vector3(side * (5 + Math.random() * 4), 9 + Math.random() * 3, -14),
      spin: new THREE.Vector3((Math.random() - 0.5) * 12, (Math.random() - 0.5) * 10, side * -6),
    };
    this.score.addBonus(KNOCK_POINTS);
    this.sparks.burst(this.tmp.set(e.x, 1.4, e.z), { count: 24, color: 0xffffff, speed: 6, life: 0.5 });
    this.events.knock();
  }

  private updateEnemy(e: Enemy, dt: number, scroll: number): void {
    if (e.knock) {
      // Ragdoll-free "launch": fly up and away, tumbling, then vanish
      const { vel, spin } = e.knock;
      vel.y -= 26 * dt;
      e.root.position.x += vel.x * dt;
      e.root.position.y += vel.y * dt;
      e.root.position.z += vel.z * dt + scroll;
      e.root.rotation.x += spin.x * dt;
      e.root.rotation.y += spin.y * dt;
      e.root.rotation.z += spin.z * dt;
      if (e.root.position.y < -4 || e.z > DESPAWN_Z) this.deactivate(e);
      return;
    }

    e.root.position.z += scroll + e.config.speed * ZK * dt;
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

  // ---------------------------------------------------------------- pickups

  private hidePickup(p: Pickup): void {
    p.active = false;
    p.pulled = false;
    p.obj.visible = false;
  }

  private spawnBoltRow(): void {
    const lane = Math.floor(Math.random() * CONSTANTS.LANE_COUNT);
    const count = 5 + Math.floor(Math.random() * 4);
    // Sometimes an arc that can only be reached by jumping
    const arc = Math.random() < 0.3;
    for (let i = 0; i < count; i++) {
      const p = this.bolts.find((b) => !b.active);
      if (!p) return;
      p.active = true;
      p.pulled = false;
      p.lane = lane;
      const y = arc ? 0.9 + Math.sin((i / (count - 1)) * Math.PI) * 1.8 : 0.9;
      p.obj.position.set(LANE_X[lane], y, SPAWN_Z - i * 2.6);
      p.obj.visible = true;
    }
  }

  private spawnPowerUp(): void {
    // A battery only shows up when it would actually restore a life
    const kinds: PowerKind[] = this.lives < CONSTANTS.LIVES && Math.random() < 0.3 ? ['battery'] : ['shield', 'magnet'];
    const kind = kinds[Math.floor(Math.random() * kinds.length)];
    const p = this.powerUps.find((o) => !o.active && o.kind === kind);
    if (!p) return;
    p.active = true;
    p.lane = Math.floor(Math.random() * CONSTANTS.LANE_COUNT);
    p.obj.position.set(LANE_X[p.lane], 1.2, SPAWN_Z);
    p.obj.visible = true;
  }

  private updatePickups(dt: number, scroll: number): void {
    if (this.time >= this.nextBoltRow) {
      this.spawnBoltRow();
      this.nextBoltRow = this.time + 2200 + Math.random() * 1600;
    }
    if (this.time >= this.nextPowerUp) {
      this.spawnPowerUp();
      this.nextPowerUp = this.time + 14000 + Math.random() * 7000;
    }

    const px = this.bolt.root.position.x;
    const py = this.bolt.root.position.y + 0.9;
    const magnet = this.time < this.magnetUntil;
    const spin = this.time / 1000;

    for (const p of this.bolts) {
      if (!p.active) continue;
      const o = p.obj.position;
      o.z += scroll;
      (p.obj.userData.spin as THREE.Object3D).rotation.y = spin * 4 + o.z * 0.3;
      if (magnet && o.z > -MAGNET_RANGE_Z && o.z < 2) p.pulled = true;
      if (p.pulled) {
        // Home in on Bolt
        const k = Math.min(1, dt * 9);
        o.x += (px - o.x) * k;
        o.y += (py - o.y) * k;
        o.z += (PLAYER_Z - o.z) * k;
      }
      if (Math.abs(o.x - px) < 0.9 && Math.abs(o.z - PLAYER_Z) < 0.9 && Math.abs(o.y - py) < 1.2) {
        this.collectBolt(p);
      } else if (o.z > DESPAWN_Z) {
        this.hidePickup(p);
      }
    }

    for (const p of this.powerUps) {
      if (!p.active) continue;
      const o = p.obj.position;
      o.z += scroll;
      o.y = 1.2 + Math.sin(this.time / 250) * 0.15;
      (p.obj.userData.spin as THREE.Object3D).rotation.y = spin * 2.5;
      (p.obj.userData.ring as THREE.Object3D).rotation.set(Math.sin(spin) * 0.6, spin * 1.5, 0);
      if (Math.abs(o.x - px) < 1.1 && Math.abs(o.z - PLAYER_Z) < 1.1 && Math.abs(o.y - py) < 1.5) {
        this.collectPowerUp(p);
      } else if (o.z > DESPAWN_Z) {
        this.hidePickup(p);
      }
    }
  }

  private collectBolt(p: Pickup): void {
    this.sparks.burst(p.obj.position, { count: 8, color: 0xffe14d, speed: 3.5, up: 2, life: 0.4 });
    this.hidePickup(p);
    this.score.addBonus(BOLT_POINTS);
    this.events.collect();
    if (!this.isOverdrive()) {
      this.charge++;
      if (this.charge >= CHARGE_MAX) this.startOverdrive();
    }
  }

  private collectPowerUp(p: Pickup): void {
    const kind = p.kind!;
    const color = { shield: 0x3fb6ff, magnet: 0xff4b4b, battery: 0x4cff7a }[kind];
    this.sparks.burst(p.obj.position, { count: 30, color, speed: 6, life: 0.6 });
    this.hidePickup(p);
    if (kind === 'shield') this.shield = true;
    else if (kind === 'magnet') this.magnetUntil = this.time + MAGNET_MS;
    else if (kind === 'battery' && this.lives < CONSTANTS.LIVES) {
      this.lives++;
      this.events.livesChanged(this.lives);
    }
    this.events.powerUp(kind);
  }

  private startOverdrive(): void {
    this.charge = 0;
    this.overdriveUntil = this.time + OVERDRIVE_MS;
    this.sparks.burst(this.tmp.set(this.bolt.root.position.x, 1.2, PLAYER_Z), { count: 50, color: 0x66ddff, speed: 8, life: 0.8 });
    this.events.powerUp('overdrive');
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
    // If the roadblock can't leave an open lane right now, it retries next frame
    if (this.patrolTimer >= PATROL_INTERVAL * (1 - OVERTIME_PATROL_CUT * this.overtime()) && this.spawnPatrol()) {
      this.patrolTimer = 0;
    }
  }

  private getMinGap(): number {
    // Speed ratio is capped at 1 here; the late game shortens gaps separately
    const ratio = Math.min(this.getSpeedRatio(), 1);
    return (CONSTANTS.MIN_OBSTACLE_GAP -
      (CONSTANTS.MIN_OBSTACLE_GAP - CONSTANTS.MIN_OBSTACLE_GAP_AT_MAX) * ratio) *
      (1 - OVERTIME_GAP_CUT * this.overtime());
  }

  /** Any non-knocked enemy in exactly this lane within `range` of z. */
  private laneOccupied(lane: number, z: number, range: number): boolean {
    return this.enemies.some((e) => e.active && !e.knock && e.lane === lane && Math.abs(e.z - z) < range);
  }

  private isLaneTooClose(lane: number, z: number): boolean {
    return this.enemies.some((e) => e.active && !e.knock && Math.abs(e.lane - lane) <= 1 && Math.abs(e.z - z) < MIN_VERTICAL_GAP);
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
        return;
      }
    }

    // Late game: a partner in another lane, as long as the third lane stays clear
    if (Math.random() < OVERTIME_PAIR_CHANCE * this.overtime()) {
      const options = [0, 1, 2].filter((l) => {
        const open = 3 - lane - l;
        return l !== lane && !this.laneOccupied(l, SPAWN_Z, MIN_VERTICAL_GAP) &&
          !this.laneOccupied(open, SPAWN_Z, MIN_VERTICAL_GAP);
      });
      if (options.length > 0) {
        this.spawnEnemy(OBSTACLE_CONFIGS[this.pickType()], options[Math.floor(Math.random() * options.length)], SPAWN_Z);
      }
    }
  }

  /**
   * Every 60s (30s in the late game), agents block two lanes and leave one open.
   * The open lane must actually be clear, or the roadblock would be a wall.
   * Returns false (try again later) when no lane is clear.
   */
  private spawnPatrol(): boolean {
    const clear = [0, 1, 2].filter((l) => !this.laneOccupied(l, SPAWN_Z, MIN_VERTICAL_GAP));
    if (clear.length === 0) return false;
    const openLane = clear[Math.floor(Math.random() * clear.length)];
    for (const lane of [0, 1, 2].filter((l) => l !== openLane)) {
      if (!this.laneOccupied(lane, SPAWN_Z, 3)) this.spawnEnemy(OBSTACLE_CONFIGS['agent'], lane, SPAWN_Z);
    }
    this.globalCooldown = GLOBAL_SPAWN_COOLDOWN;
    return true;
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

  /** Same order as GameScene.checkCollisions, plus jump/slide clearance and Overdrive knockouts. */
  private checkCollisions(): void {
    const px = this.bolt.root.position.x;
    const overdrive = this.isOverdrive();
    for (const e of this.enemies) {
      if (!e.active || e.knock) continue;
      const dz = e.z - PLAYER_Z;

      // Pending late-reaction window: the hit lands when it runs out, unless
      // Bolt jumped/slid (forgiveLate) or swerved out of the lane in time
      if (e.graceUntil) {
        if (e.cleared || e.lane !== this.lane) {
          e.graceUntil = 0;
        } else if (this.time >= e.graceUntil) {
          e.graceUntil = 0;
          e.dodged = true;
          if (overdrive) this.knockEnemy(e);
          else if (!this.isInvincible()) this.onPlayerHit(e);
          continue;
        } else {
          continue;
        }
      }

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
      const dx = Math.abs(px - e.x);

      if (e.lane === this.lane) {
        const touching = Math.abs(dz) < HIT_DEPTH && dx < ((CONSTANTS.PLAYER_WIDTH + colW) / 2) * XK;
        if (!touching) continue;
        if (overdrive) {
          this.knockEnemy(e);
          continue;
        }
        // Jumpable enemies are cleared from above, slideable ones from below.
        // Clearing sticks, so landing a little early doesn't turn into a hit.
        if ((e.config.canJump && this.getPlayerY() > CLEAR_HEIGHT) || (e.config.canSlide && this.isSliding())) {
          e.cleared = true;
        }
        if (e.cleared) continue; // stays undodged so the pass-by still awards the dodge bonus
        if (e.config.canJump || e.config.canSlide) {
          e.graceUntil = this.time + LATE_GRACE_MS;
          continue;
        }
        e.dodged = true;
        if (!this.isInvincible()) this.onPlayerHit(e);
      } else if (!this.isInvincible() && !overdrive) {
        // Different lane but brushed past mid-switch = near miss
        const near = CONSTANTS.NEAR_MISS_DISTANCE;
        const close = Math.abs(dz) < NEAR_DEPTH &&
          dx < ((CONSTANTS.PLAYER_WIDTH + near * 2 + colW) / 2) * XK;
        if (close) {
          e.dodged = true;
          this.score.addNearMissBonus();
          this.sparks.burst(this.tmp.set((px + e.x) / 2, 1.2, PLAYER_Z), { count: 16, color: 0x9fe8ff, speed: 5, life: 0.4 });
          this.events.nearMiss();
        }
      }
    }
  }
}
