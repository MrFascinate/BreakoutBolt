import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { toon } from './Models';

export const LANE_SPACING = 2.0;
export const LANE_X = [-LANE_SPACING, 0, LANE_SPACING];
const ROAD_WIDTH = LANE_SPACING * 3 + 1.2; // three lanes plus a shoulder on each side
const ROAD_LENGTH = 260;
const TEX_LENGTH = 12; // world units covered by one repeat of the road texture
const PROP_SPAN = 230; // props recycle over this stretch of road
const HORIZON = new THREE.Color(0xffa854);

function roadTexture(): THREE.CanvasTexture {
  const w = 512, h = 512;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#3d3644';
  ctx.fillRect(0, 0, w, h);
  // Asphalt speckle
  for (let i = 0; i < 2600; i++) {
    const v = 40 + Math.random() * 40;
    ctx.fillStyle = `rgba(${v + 10},${v},${v + 14},0.5)`;
    ctx.fillRect(Math.random() * w, Math.random() * h, 2, 2);
  }
  const px = (x: number) => ((x + ROAD_WIDTH / 2) / ROAD_WIDTH) * w;
  // Solid edge lines
  ctx.fillStyle = '#efe7d6';
  for (const x of [-LANE_SPACING * 1.5, LANE_SPACING * 1.5]) {
    ctx.fillRect(px(x) - 5, 0, 10, h);
  }
  // Dashed lane dividers (two dashes per texture repeat)
  for (const x of [-LANE_SPACING / 2, LANE_SPACING / 2]) {
    for (let y = 0; y < h; y += h / 2) {
      ctx.fillRect(px(x) - 5, y + 30, 10, h / 4);
    }
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(1, ROAD_LENGTH / TEX_LENGTH);
  tex.anisotropy = 8;
  return tex;
}

function grassTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#6aa63a';
  ctx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 900; i++) {
    const g = 110 + Math.random() * 70;
    ctx.fillStyle = `rgba(${g * 0.55},${g},${g * 0.3},0.6)`;
    ctx.fillRect(Math.random() * 256, Math.random() * 256, 3, 7);
  }
  // Mowed stripes so forward motion reads clearly
  ctx.fillStyle = 'rgba(255,255,180,0.08)';
  ctx.fillRect(0, 0, 256, 128);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(20, 26);
  return tex;
}

function skyDome(): THREE.Mesh {
  // Values are written straight to the screen, so they're picked as sRGB.
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    vertexShader: `
      varying vec3 vDir;
      void main() {
        vDir = normalize(position);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: `
      varying vec3 vDir;
      void main() {
        float h = vDir.y;
        vec3 top = vec3(0.10, 0.17, 0.50);
        vec3 mid = vec3(0.33, 0.36, 0.74);
        vec3 hor = vec3(${HORIZON.r.toFixed(3)}, ${HORIZON.g.toFixed(3)}, ${HORIZON.b.toFixed(3)});
        vec3 c = mix(hor, mid, smoothstep(0.0, 0.16, h));
        c = mix(c, top, smoothstep(0.16, 0.55, h));
        float sun = max(dot(normalize(vDir), normalize(vec3(0.0, 0.02, -1.0))), 0.0);
        c += vec3(1.0, 0.85, 0.5) * (pow(sun, 400.0) * 1.2 + pow(sun, 24.0) * 0.35);
        if (h < 0.0) c = hor;
        gl_FragColor = vec4(c, 1.0);
      }`,
  });
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(400, 32, 16), mat);
  mesh.renderOrder = -1;
  return mesh;
}

function tree(): THREE.Group {
  const g = new THREE.Group();
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.26, 1.4, 8), toon(0x6b4423));
  trunk.position.y = 0.7;
  g.add(trunk);
  const leaf = toon([0x2f7d32, 0x3b8f2a, 0x27692b][Math.floor(Math.random() * 3)]);
  for (let i = 0; i < 3; i++) {
    const cone = new THREE.Mesh(new THREE.ConeGeometry(1.25 - i * 0.3, 1.5, 9), leaf);
    cone.position.y = 1.7 + i * 0.75;
    g.add(cone);
  }
  g.scale.setScalar(0.9 + Math.random() * 0.8);
  return g;
}

function fencePost(): THREE.Group {
  const g = new THREE.Group();
  const post = new THREE.Mesh(new THREE.BoxGeometry(0.16, 1.0, 0.16), toon(0x8a6a44));
  post.position.y = 0.5;
  g.add(post);
  const rail = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.1, 5.6), toon(0x9c7a50));
  rail.position.y = 0.75;
  g.add(rail);
  return g;
}

export class World {
  readonly scene = new THREE.Scene();
  private sky = skyDome();
  private roadTex = roadTexture();
  private grassTex = grassTexture();
  private props: THREE.Object3D[] = [];

  constructor(renderer: THREE.WebGLRenderer) {
    const scene = this.scene;
    scene.fog = new THREE.Fog(HORIZON, 55, 175);
    scene.add(this.sky);

    // Environment map gives Bolt's chrome something to reflect
    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environmentIntensity = 0.9;

    scene.add(new THREE.HemisphereLight(0xc4d4ff, 0x5d7a3a, 1.5));
    const sun = new THREE.DirectionalLight(0xffe2b8, 2.2);
    sun.position.set(-4, 10, 9); // behind the camera so faces toward it are lit
    scene.add(sun);
    const rim = new THREE.DirectionalLight(0xffa860, 1.2); // warm sunset rim from ahead
    rim.position.set(0, 3, -10);
    scene.add(rim);

    const road = new THREE.Mesh(
      new THREE.PlaneGeometry(ROAD_WIDTH, ROAD_LENGTH),
      new THREE.MeshLambertMaterial({ map: this.roadTex })
    );
    road.rotation.x = -Math.PI / 2;
    road.position.set(0, 0.01, -ROAD_LENGTH / 2 + 20);
    scene.add(road);

    for (const side of [-1, 1]) {
      const shoulder = new THREE.Mesh(
        new THREE.PlaneGeometry(0.9, ROAD_LENGTH),
        new THREE.MeshLambertMaterial({ color: 0x9a7a4e })
      );
      shoulder.rotation.x = -Math.PI / 2;
      shoulder.position.set(side * (ROAD_WIDTH / 2 + 0.45), 0.005, -ROAD_LENGTH / 2 + 20);
      scene.add(shoulder);
    }

    const grass = new THREE.Mesh(
      new THREE.PlaneGeometry(240, ROAD_LENGTH + 60),
      new THREE.MeshLambertMaterial({ map: this.grassTex })
    );
    grass.rotation.x = -Math.PI / 2;
    grass.position.set(0, 0, -ROAD_LENGTH / 2);
    scene.add(grass);

    // Distant mountains (fog gives them the hazy sunset look from the title art)
    for (let i = 0; i < 14; i++) {
      const h = 14 + Math.random() * 22;
      const m = new THREE.Mesh(new THREE.ConeGeometry(18 + Math.random() * 16, h, 6), toon(0x5a4a7a));
      const x = -150 + i * 23 + Math.random() * 10;
      if (Math.abs(x) < 12) continue; // keep the vanishing point clear
      m.position.set(x, h / 2 - 2, -190 - Math.random() * 30);
      scene.add(m);
    }

    // Recycled roadside props
    for (let i = 0; i < 46; i++) {
      const side = i % 2 === 0 ? -1 : 1;
      const z = 15 - (i / 46) * PROP_SPAN;
      let p: THREE.Object3D;
      if (i % 5 === 0) {
        p = fencePost();
        p.position.set(side * (ROAD_WIDTH / 2 + 1.6), 0, z);
      } else {
        p = tree();
        p.position.set(side * (ROAD_WIDTH / 2 + 3 + Math.random() * 12), 0, z);
      }
      this.props.push(p);
      scene.add(p);
    }
  }

  /** Scroll the world toward the camera by `dz` world units. */
  scroll(dz: number): void {
    this.roadTex.offset.y = (this.roadTex.offset.y + dz / TEX_LENGTH) % 1;
    this.grassTex.offset.y = (this.grassTex.offset.y + dz / ((ROAD_LENGTH + 60) / 26)) % 1;
    for (const p of this.props) {
      p.position.z += dz;
      if (p.position.z > 15) p.position.z -= PROP_SPAN;
    }
  }

  followCamera(camera: THREE.Camera): void {
    this.sky.position.copy(camera.position);
  }
}
