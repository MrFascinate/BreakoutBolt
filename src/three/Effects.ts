import * as THREE from 'three';

const MAX = 500;

export interface BurstOpts {
  count: number;
  color: number;
  speed?: number;
  /** Extra upward kick added to every particle. */
  up?: number;
  life?: number;
  size?: number;
}

/**
 * Additive spark particles in one draw call. Particles live in world space and
 * are carried toward the camera with the scrolling road, like everything else.
 */
export class Sparks {
  readonly points: THREE.Points;
  private pos = new Float32Array(MAX * 3);
  private col = new Float32Array(MAX * 3);
  private vel = new Float32Array(MAX * 3);
  private base = new Float32Array(MAX * 3);
  private life = new Float32Array(MAX);
  private maxLife = new Float32Array(MAX);
  private next = 0;
  private tmp = new THREE.Color();

  constructor(scene: THREE.Scene) {
    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage));
    geom.setAttribute('color', new THREE.BufferAttribute(this.col, 3).setUsage(THREE.DynamicDrawUsage));
    const mat = new THREE.PointsMaterial({
      size: 0.28,
      map: dotTexture(),
      vertexColors: true,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      fog: false,
    });
    this.points = new THREE.Points(geom, mat);
    this.points.frustumCulled = false;
    for (let i = 0; i < MAX; i++) this.pos[i * 3 + 1] = -100; // park dead particles out of view
    scene.add(this.points);
  }

  burst(at: THREE.Vector3, o: BurstOpts): void {
    const speed = o.speed ?? 5;
    const life = o.life ?? 0.6;
    this.tmp.setHex(o.color);
    for (let n = 0; n < o.count; n++) {
      const i = this.next;
      this.next = (this.next + 1) % MAX;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 2 - 1);
      const s = speed * (0.4 + Math.random() * 0.6);
      this.pos[i * 3] = at.x;
      this.pos[i * 3 + 1] = at.y;
      this.pos[i * 3 + 2] = at.z;
      this.vel[i * 3] = Math.sin(phi) * Math.cos(theta) * s;
      this.vel[i * 3 + 1] = Math.abs(Math.cos(phi)) * s * 0.8 + (o.up ?? 2);
      this.vel[i * 3 + 2] = Math.sin(phi) * Math.sin(theta) * s;
      this.base[i * 3] = this.tmp.r;
      this.base[i * 3 + 1] = this.tmp.g;
      this.base[i * 3 + 2] = this.tmp.b;
      this.life[i] = this.maxLife[i] = life * (0.6 + Math.random() * 0.4);
    }
  }

  /** dt in seconds; scrollDz is how far the world moved toward the camera this frame. */
  update(dt: number, scrollDz: number): void {
    for (let i = 0; i < MAX; i++) {
      if (this.life[i] <= 0) continue;
      this.life[i] -= dt;
      const j = i * 3;
      if (this.life[i] <= 0) {
        this.pos[j + 1] = -100;
        this.col[j] = this.col[j + 1] = this.col[j + 2] = 0;
        continue;
      }
      this.vel[j + 1] -= 14 * dt;
      this.pos[j] += this.vel[j] * dt;
      this.pos[j + 1] = Math.max(0.05, this.pos[j + 1] + this.vel[j + 1] * dt);
      this.pos[j + 2] += this.vel[j + 2] * dt + scrollDz;
      // Additive blending: fading the color fades the spark
      const k = this.life[i] / this.maxLife[i];
      this.col[j] = this.base[j] * k;
      this.col[j + 1] = this.base[j + 1] * k;
      this.col[j + 2] = this.base[j + 2] * k;
    }
    this.points.geometry.attributes.position.needsUpdate = true;
    this.points.geometry.attributes.color.needsUpdate = true;
  }

  clear(): void {
    this.life.fill(0);
    this.col.fill(0);
    for (let i = 0; i < MAX; i++) this.pos[i * 3 + 1] = -100;
  }
}

function dotTexture(): THREE.Texture {
  const c = document.createElement('canvas');
  c.width = c.height = 32;
  const ctx = c.getContext('2d')!;
  const g = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.35, 'rgba(255,255,255,0.8)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 32, 32);
  return new THREE.CanvasTexture(c);
}
