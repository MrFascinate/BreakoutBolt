import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { ObstacleType } from '../config/Constants';

// All characters are built from primitives with a toon material and an
// inverted-hull black outline, to match the thick-lined cartoon art style.

const toonGradient = (() => {
  const data = new Uint8Array([90, 170, 255]);
  const tex = new THREE.DataTexture(data, 3, 1, THREE.RedFormat);
  tex.minFilter = THREE.NearestFilter;
  tex.magFilter = THREE.NearestFilter;
  tex.needsUpdate = true;
  return tex;
})();

const matCache = new Map<string, THREE.Material>();

export function toon(color: number): THREE.MeshToonMaterial {
  const key = `toon-${color}`;
  if (!matCache.has(key)) {
    matCache.set(key, new THREE.MeshToonMaterial({ color, gradientMap: toonGradient }));
  }
  return matCache.get(key) as THREE.MeshToonMaterial;
}

function metal(color: number, roughness = 0.28): THREE.MeshStandardMaterial {
  const key = `metal-${color}-${roughness}`;
  if (!matCache.has(key)) {
    matCache.set(key, new THREE.MeshStandardMaterial({ color, metalness: 0.75, roughness }));
  }
  return matCache.get(key) as THREE.MeshStandardMaterial;
}

function glow(color: number): THREE.MeshBasicMaterial {
  const key = `glow-${color}`;
  if (!matCache.has(key)) {
    matCache.set(key, new THREE.MeshBasicMaterial({ color }));
  }
  return matCache.get(key) as THREE.MeshBasicMaterial;
}

/** Outline thickness is pushed along vertex normals, so it stays even on scaled-down parts. */
export function outlineMaterial(thickness: number): THREE.MeshBasicMaterial {
  const key = `outline-${thickness}`;
  if (!matCache.has(key)) {
    const m = new THREE.MeshBasicMaterial({ color: 0x111118, side: THREE.BackSide });
    m.onBeforeCompile = (shader) => {
      shader.vertexShader = shader.vertexShader.replace(
        '#include <begin_vertex>',
        `vec3 transformed = position + normal * ${thickness.toFixed(3)};`
      );
    };
    m.customProgramCacheKey = () => key;
    matCache.set(key, m);
  }
  return matCache.get(key) as THREE.MeshBasicMaterial;
}

/** A mesh plus its outline shell, grouped so callers can position them together. */
function part(
  geom: THREE.BufferGeometry,
  mat: THREE.Material,
  pos: [number, number, number] = [0, 0, 0],
  outline = 0.025
): THREE.Group {
  const g = new THREE.Group();
  g.add(new THREE.Mesh(geom, mat));
  if (outline > 0) g.add(new THREE.Mesh(geom, outlineMaterial(outline)));
  g.position.set(...pos);
  return g;
}

// Geometry is cached by shape so every pooled enemy shares the same buffers.
const geomCache = new Map<string, THREE.BufferGeometry>();
function cached(key: string, make: () => THREE.BufferGeometry): THREE.BufferGeometry {
  if (!geomCache.has(key)) geomCache.set(key, make());
  return geomCache.get(key)!;
}
const box = (w: number, h: number, d: number, r = 0.06) =>
  cached(`box${w},${h},${d},${r}`, () => new RoundedBoxGeometry(w, h, d, 3, r));
const sphere = (r: number) => cached(`sph${r}`, () => new THREE.SphereGeometry(r, 20, 14));
const capsule = (r: number, len: number) => cached(`cap${r},${len}`, () => new THREE.CapsuleGeometry(r, len, 6, 12));
const cyl = (rt: number, rb: number, h: number, seg = 18) =>
  cached(`cyl${rt},${rb},${h},${seg}`, () => new THREE.CylinderGeometry(rt, rb, h, seg));

/** Soft dark disc under a character — cheaper than real shadow maps on mobile. */
let shadowMat: THREE.MeshBasicMaterial | null = null;
export function blobShadow(radius: number): THREE.Mesh {
  if (!shadowMat) {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 64;
    const ctx = canvas.getContext('2d')!;
    const grad = ctx.createRadialGradient(32, 32, 4, 32, 32, 32);
    grad.addColorStop(0, 'rgba(0,0,0,0.55)');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 64, 64);
    shadowMat = new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(canvas), transparent: true, depthWrite: false });
  }
  const mesh = new THREE.Mesh(cached(`shadow${radius}`, () => new THREE.PlaneGeometry(radius * 2, radius * 2)), shadowMat);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = 0.02;
  return mesh;
}

/** Shared rig: limb pivots that the run cycle swings. */
export interface Rig {
  root: THREE.Group;      // moved around the world
  body: THREE.Group;      // bobs and leans while running
  leftArm: THREE.Group;
  rightArm: THREE.Group;
  leftLeg: THREE.Group;
  rightLeg: THREE.Group;
  /** Arms that hold a prop stay posed instead of swinging. */
  fixedArms: { left: boolean; right: boolean };
  /** Phase offset so a crowd doesn't run in lockstep. */
  phase: number;
}

/** Run cycle: 'cadence' is strides per second, 'swing' the leg angle in radians. */
export function animateRun(rig: Rig, t: number, cadence: number, swing = 0.85): void {
  const p = t * cadence * Math.PI * 2 + rig.phase;
  const s = Math.sin(p);
  rig.leftLeg.rotation.x = s * swing;
  rig.rightLeg.rotation.x = -s * swing;
  if (!rig.fixedArms.left) rig.leftArm.rotation.x = -s * swing * 0.9;
  if (!rig.fixedArms.right) rig.rightArm.rotation.x = s * swing * 0.9;
  rig.body.position.y = Math.abs(Math.cos(p)) * 0.09;
  rig.body.rotation.z = s * 0.04;
}

// ---------------------------------------------------------------- Bolt

/**
 * Bolt: chrome barrel head with riveted panels, ear cans, glowing bulb antenna,
 * small body. Faces -Z (up the road); the +Z side is the back the chase camera sees.
 */
export function buildBolt(): Rig & { bulb: THREE.Mesh } {
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);

  const chrome = metal(0xc9ced6);
  const darkMetal = metal(0x4a4f58, 0.45);
  const rivet = metal(0x8a9099, 0.35);

  // Torso
  body.add(part(box(0.72, 0.62, 0.5, 0.12), chrome, [0, 0.95, 0]));
  body.add(part(box(0.5, 0.18, 0.06, 0.03), darkMetal, [0, 1.02, 0.25], 0)); // back vent
  body.add(part(cyl(0.18, 0.22, 0.14), darkMetal, [0, 1.32, 0])); // neck

  // Head: wide rounded barrel
  const head = new THREE.Group();
  head.position.set(0, 1.78, 0);
  body.add(head);
  const headShell = part(sphere(0.62), chrome, [0, 0, 0], 0.03);
  headShell.scale.set(1.12, 0.88, 1.0);
  head.add(headShell);
  // Panel seams across the back of the head (visible from the chase camera)
  for (const x of [-0.24, 0.24]) {
    const seam = new THREE.Mesh(box(0.035, 0.9, 0.08, 0.015), darkMetal);
    seam.position.set(x, 0, 0.56);
    seam.rotation.y = x * 0.6;
    head.add(seam);
  }
  const brow = new THREE.Mesh(box(1.0, 0.04, 0.08, 0.015), darkMetal);
  brow.position.set(0, -0.28, 0.5);
  head.add(brow);
  for (const [x, y] of [[-0.42, 0.18], [0.42, 0.18], [-0.4, -0.18], [0.4, -0.18]]) {
    const r = new THREE.Mesh(sphere(0.04), rivet);
    r.position.set(x, y, 0.42);
    head.add(r);
  }
  // Ear cans
  for (const side of [-1, 1]) {
    const ear = part(cyl(0.22, 0.22, 0.2), chrome, [side * 0.72, -0.02, 0]);
    ear.rotation.z = Math.PI / 2;
    head.add(ear);
    const hole = new THREE.Mesh(cyl(0.12, 0.12, 0.04), darkMetal);
    hole.rotation.z = Math.PI / 2;
    hole.position.set(side * 0.83, -0.02, 0);
    head.add(hole);
  }
  // Antenna + glowing bulb
  head.add(part(cyl(0.05, 0.08, 0.28), darkMetal, [0, 0.62, 0]));
  const bulb = new THREE.Mesh(sphere(0.16), glow(0xffd84a));
  bulb.position.set(0, 0.86, 0);
  head.add(bulb);
  head.add(part(sphere(0.16), glow(0xffd84a), [0, 0.86, 0], 0.02));
  const halo = new THREE.Mesh(
    sphere(0.28),
    new THREE.MeshBasicMaterial({ color: 0xffe680, transparent: true, opacity: 0.25, depthWrite: false })
  );
  halo.position.copy(bulb.position);
  head.add(halo);

  // Arms (pivot at the shoulder)
  const makeArm = (side: number) => {
    const arm = new THREE.Group();
    arm.position.set(side * 0.46, 1.15, 0);
    arm.add(part(sphere(0.12), darkMetal, [0, 0, 0]));
    arm.add(part(capsule(0.09, 0.3), chrome, [0, -0.25, 0]));
    arm.add(part(sphere(0.12), chrome, [0, -0.5, 0]));
    body.add(arm);
    return arm;
  };
  // Legs (pivot at the hip)
  const makeLeg = (side: number) => {
    const leg = new THREE.Group();
    leg.position.set(side * 0.2, 0.66, 0);
    leg.add(part(capsule(0.1, 0.22), darkMetal, [0, -0.2, 0]));
    leg.add(part(box(0.26, 0.16, 0.36, 0.06), darkMetal, [0, -0.46, -0.04]));
    body.add(leg);
    return leg;
  };

  const leftArm = makeArm(-1);
  const rightArm = makeArm(1);
  const leftLeg = makeLeg(-1);
  const rightLeg = makeLeg(1);

  root.add(blobShadow(0.75));

  return {
    root, body, leftArm, rightArm, leftLeg, rightLeg,
    fixedArms: { left: false, right: false }, phase: 0, bulb,
  };
}

// ---------------------------------------------------------------- Humans

interface HumanLook {
  skin: number;
  hair: number;
  shirt: number;
  sleeves: number;
  pants: number;
  shoes: number;
}

/** Generic cartoon human facing +Z (toward the player / camera). */
function buildHuman(look: HumanLook): Rig & { head: THREE.Group; torso: THREE.Group } {
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);
  body.rotation.x = 0.12; // lean into the run

  const torso = part(box(0.78, 0.86, 0.42, 0.12), toon(look.shirt), [0, 1.5, 0]);
  body.add(torso);

  const head = new THREE.Group();
  head.position.set(0, 2.2, 0.02);
  body.add(head);
  head.add(part(sphere(0.3), toon(look.skin)));
  const hair = part(sphere(0.32), toon(look.hair), [0, 0.08, -0.04]);
  hair.scale.set(1, 0.75, 1);
  head.add(hair);
  for (const side of [-1, 1]) {
    head.add(part(sphere(0.06), toon(look.skin), [side * 0.29, -0.02, 0], 0.015)); // ears
  }
  // Simple face: eyes + angry brows (they're chasing you)
  for (const side of [-1, 1]) {
    const eye = new THREE.Mesh(sphere(0.045), toon(0x1a1a1a));
    eye.position.set(side * 0.11, 0.0, 0.27);
    head.add(eye);
    const brow = new THREE.Mesh(box(0.12, 0.03, 0.03, 0.01), toon(look.hair));
    brow.position.set(side * 0.11, 0.08, 0.28);
    brow.rotation.z = side * 0.35;
    head.add(brow);
  }
  const mouth = new THREE.Mesh(box(0.12, 0.025, 0.02, 0.01), toon(0x5a1f1f));
  mouth.position.set(0, -0.14, 0.28);
  head.add(mouth);

  const makeArm = (side: number) => {
    const arm = new THREE.Group();
    arm.position.set(side * 0.5, 1.82, 0);
    arm.add(part(capsule(0.12, 0.42), toon(look.sleeves), [0, -0.3, 0]));
    arm.add(part(sphere(0.11), toon(look.skin), [0, -0.66, 0]));
    body.add(arm);
    return arm;
  };
  const makeLeg = (side: number) => {
    const leg = new THREE.Group();
    leg.position.set(side * 0.2, 1.08, 0);
    leg.add(part(capsule(0.14, 0.62), toon(look.pants), [0, -0.46, 0]));
    leg.add(part(box(0.26, 0.16, 0.42, 0.06), toon(look.shoes), [0, -0.96, 0.08]));
    body.add(leg);
    return leg;
  };

  const leftArm = makeArm(-1);
  const rightArm = makeArm(1);
  const leftLeg = makeLeg(-1);
  const rightLeg = makeLeg(1);

  root.add(blobShadow(0.8));

  return {
    root, body, head, torso, leftArm, rightArm, leftLeg, rightLeg,
    fixedArms: { left: false, right: false }, phase: Math.random() * Math.PI * 2,
  };
}

/** Government agent: black suit, white shirt, red tie, dark sunglasses. */
function buildAgent(): Rig {
  const rig = buildHuman({
    skin: 0xe0a77a, hair: 0x4a2a14, shirt: 0x1d1f26, sleeves: 0x1d1f26, pants: 0x1d1f26, shoes: 0x0d0d0d,
  });
  const front = 0.215;
  rig.torso.add(part(box(0.24, 0.8, 0.02, 0.01), toon(0xf2f2f2), [0, 0.02, front], 0));
  rig.torso.add(part(box(0.08, 0.5, 0.02, 0.01), toon(0xb3202a), [0, 0.0, front + 0.012], 0));
  const glasses = buildSunglasses();
  glasses.position.set(0, 0.02, 0.27);
  rig.head.add(glasses);
  rig.head.add(part(capsule(0.02, 0.1), toon(0x222222), [0.3, -0.12, 0.02], 0)); // earpiece wire
  return rig;
}

// ---------------------------------------------------------------- props
// Shared by the coded enemies and the downloaded character models.

export function buildSunglasses(width = 0.44): THREE.Group {
  return part(box(width, width * 0.23, 0.06, 0.03), toon(0x0a0a0a), [0, 0, 0], 0.012);
}

export function buildTie(length = 0.5): THREE.Group {
  return part(box(0.09, length, 0.03, 0.012), toon(0xb3202a), [0, 0, 0], 0.01);
}

/** Shoulder-mounted news camera, lens pointing +Z, with a red recording light. */
export function buildNewsCamera(): THREE.Group {
  const cam = new THREE.Group();
  cam.add(part(box(0.32, 0.36, 0.7, 0.06), toon(0x1c1c1f)));
  const lens = part(cyl(0.13, 0.15, 0.3), toon(0x2a2a2e), [0, 0.02, 0.48]);
  lens.rotation.x = Math.PI / 2;
  cam.add(lens);
  const glass = new THREE.Mesh(cyl(0.1, 0.1, 0.02), metal(0x5aa0ff, 0.1));
  glass.rotation.x = Math.PI / 2;
  glass.position.set(0, 0.02, 0.64);
  cam.add(glass);
  const tally = new THREE.Mesh(sphere(0.035), glow(0xff2a2a));
  tally.position.set(0.1, 0.2, 0.2);
  cam.add(tally);
  return cam;
}

/** "ROBOTS GO HOME" protest sign: pole starts at the origin, board on top facing +Z. */
export function buildSign(poleLength = 1.3): THREE.Group {
  sharedSignTex ??= signTexture();
  const sign = new THREE.Group();
  sign.add(part(cyl(0.035, 0.035, poleLength, 8), toon(0x7a5230), [0, poleLength / 2, 0], 0.012));
  sign.add(part(box(1.0, 0.62, 0.05, 0.02), toon(0xc99a5b), [0, poleLength + 0.15, 0]));
  const face = new THREE.Mesh(
    cached('signFace', () => new THREE.PlaneGeometry(0.96, 0.58)),
    new THREE.MeshBasicMaterial({ map: sharedSignTex })
  );
  face.position.set(0, poleLength + 0.15, 0.03);
  sign.add(face);
  return sign;
}

/** News cameraman: blue polo, khaki vest, big shoulder-mounted camera aimed at Bolt. */
function buildCameraman(): Rig {
  const rig = buildHuman({
    skin: 0xf0bf94, hair: 0x6b3a1a, shirt: 0x2f6fd6, sleeves: 0x2f6fd6, pants: 0x5b5f66, shoes: 0x3b2a1e,
  });
  // Vest panels
  for (const side of [-1, 1]) {
    rig.torso.add(part(box(0.22, 0.7, 0.04, 0.02), toon(0xb59a6a), [side * 0.22, -0.04, 0.21], 0.015));
  }
  // Camera on the right shoulder; right arm raised to steady it
  const cam = buildNewsCamera();
  cam.position.set(0.42, 2.22, 0.1);
  rig.body.add(cam);
  rig.rightArm.rotation.set(-2.4, 0, 0.25);
  rig.fixedArms.right = true;
  // Shoulder bag on the left hip
  rig.body.add(part(box(0.3, 0.26, 0.14, 0.05), toon(0x6b5a40), [-0.45, 1.12, 0.05]));
  return rig;
}

function signTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 160;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#c99a5b';
  ctx.fillRect(0, 0, 256, 160);
  ctx.strokeStyle = 'rgba(90,55,20,0.35)';
  ctx.lineWidth = 3;
  for (let y = 18; y < 160; y += 26) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(256, y + 4);
    ctx.stroke();
  }
  ctx.fillStyle = '#3a1f0c';
  ctx.textAlign = 'center';
  ctx.font = 'bold 50px Arial Black, Arial';
  ctx.fillText('ROBOTS', 128, 58);
  ctx.font = 'bold 40px Arial Black, Arial';
  ctx.fillText('GO HOME', 128, 118);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

let sharedSignTex: THREE.CanvasTexture | null = null;

/** Protester: red tee, tan jacket, jeans, waving a "ROBOTS GO HOME" sign. */
function buildProtester(): Rig {
  const rig = buildHuman({
    skin: 0xe8b088, hair: 0x7a3b16, shirt: 0xd8402e, sleeves: 0xb88a52, pants: 0x34507e, shoes: 0x2b2b2b,
  });
  for (const side of [-1, 1]) {
    rig.torso.add(part(box(0.2, 0.84, 0.05, 0.02), toon(0xb88a52), [side * 0.29, 0, 0.2], 0.015));
  }
  // Sign held overhead in the raised left hand. The arm is flipped to point up,
  // so the sign group is counter-rotated to stay upright.
  const sign = buildSign();
  sign.position.set(0, -0.66, 0);
  sign.rotation.z = Math.PI + 0.35;
  rig.leftArm.add(sign);
  rig.leftArm.rotation.set(0, 0, Math.PI - 0.35);
  rig.fixedArms.left = true;
  return rig;
}

/** What the game needs from an enemy, whichever kind of model backs it. */
export interface EnemyView {
  root: THREE.Object3D;
  /** Advance the run cycle; `rate` > 1 runs faster (e.g. the cameraman). */
  animate(dt: number, rate: number): void;
}

function buildCodedRig(type: ObstacleType): Rig {
  switch (type) {
    case 'agent': return buildAgent();
    case 'cameraman': return buildCameraman();
    case 'protester': return buildProtester();
  }
}

/** Fallback enemies built from primitives (used if the character models fail to load). */
export function buildCodedEnemy(type: ObstacleType): EnemyView {
  const rig = buildCodedRig(type);
  let t = 0;
  return {
    root: rig.root,
    animate(dt, rate) {
      t += dt;
      animateRun(rig, t, 2.2 * rate);
    },
  };
}
