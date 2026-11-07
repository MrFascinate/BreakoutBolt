import * as THREE from 'three';
import { outlineMaterial, toon } from './Models';

export type PowerKind = 'shield' | 'magnet' | 'battery';

const glowMat = (color: number, opacity: number) =>
  new THREE.MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: false, blending: THREE.AdditiveBlending });

/** Classic zig-zag lightning bolt, extruded so it reads as a coin-like collectible. */
function boltGeometry(): THREE.BufferGeometry {
  const s = new THREE.Shape();
  s.moveTo(0.1, 0.5);
  s.lineTo(-0.22, 0.02);
  s.lineTo(0.0, 0.02);
  s.lineTo(-0.12, -0.5);
  s.lineTo(0.24, 0.06);
  s.lineTo(0.02, 0.06);
  s.lineTo(0.18, 0.5);
  s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth: 0.12, bevelEnabled: true, bevelSize: 0.03, bevelThickness: 0.03, bevelSegments: 1 });
  g.center();
  return g;
}

let boltGeom: THREE.BufferGeometry | null = null;
let boltMat: THREE.MeshBasicMaterial | null = null;
let haloMat: THREE.MeshBasicMaterial | null = null;
let haloGeom: THREE.PlaneGeometry | null = null;

/** Energy-bolt collectible: bright yellow bolt with a soft glow card behind it. */
export function buildEnergyBolt(): THREE.Group {
  boltGeom ??= boltGeometry();
  boltMat ??= new THREE.MeshBasicMaterial({ color: 0xffe14d });
  haloMat ??= glowMat(0xffc400, 0.35);
  haloGeom ??= new THREE.PlaneGeometry(1.0, 1.2);
  const g = new THREE.Group();
  const spin = new THREE.Group();
  spin.add(new THREE.Mesh(boltGeom, boltMat));
  spin.add(new THREE.Mesh(boltGeom, outlineMaterial(0.02)));
  spin.scale.setScalar(1.15);
  g.add(spin);
  const halo = new THREE.Mesh(haloGeom, haloMat);
  halo.position.z = -0.05;
  g.add(halo);
  g.userData.spin = spin;
  return g;
}

/** Power-up orb: a glowing bubble with an icon inside. */
export function buildPowerUp(kind: PowerKind): THREE.Group {
  const color = { shield: 0x3fb6ff, magnet: 0xff4b4b, battery: 0x4cff7a }[kind];
  const g = new THREE.Group();
  const orb = new THREE.Mesh(new THREE.SphereGeometry(0.62, 24, 16), glowMat(color, 0.28));
  g.add(orb);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.66, 0.04, 8, 40), new THREE.MeshBasicMaterial({ color }));
  g.add(ring);

  const icon = new THREE.Group();
  if (kind === 'shield') {
    const s = new THREE.Shape();
    s.moveTo(0, 0.32);
    s.lineTo(0.26, 0.22);
    s.quadraticCurveTo(0.26, -0.18, 0, -0.34);
    s.quadraticCurveTo(-0.26, -0.18, -0.26, 0.22);
    s.closePath();
    const geom = new THREE.ExtrudeGeometry(s, { depth: 0.08, bevelEnabled: false });
    geom.center();
    icon.add(new THREE.Mesh(geom, toon(0x9fdcff)), new THREE.Mesh(geom, outlineMaterial(0.02)));
  } else if (kind === 'magnet') {
    const arc = new THREE.TorusGeometry(0.2, 0.08, 10, 24, Math.PI);
    const m = new THREE.Mesh(arc, toon(0xe8322e));
    m.rotation.z = Math.PI;
    icon.add(m);
    for (const x of [-0.2, 0.2]) {
      const tip = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.16, 0.16), toon(0xdddddd));
      tip.position.set(x, 0.08, 0);
      icon.add(tip);
    }
    icon.position.y = 0.05;
  } else {
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.46, 16), toon(0x2c9e4b));
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.08, 12), toon(0xcccccc));
    cap.position.y = 0.27;
    const band = new THREE.Mesh(new THREE.CylinderGeometry(0.165, 0.165, 0.12, 16), toon(0xb8ff5a));
    band.position.y = 0.08;
    icon.add(body, cap, band);
  }
  g.add(icon);
  g.userData.spin = icon;
  g.userData.ring = ring;
  return g;
}

/** Blue force-field bubble that surrounds Bolt while the shield is up. */
export function buildShieldBubble(): THREE.Group {
  const g = new THREE.Group();
  const shell = new THREE.Mesh(new THREE.SphereGeometry(1.35, 32, 20), glowMat(0x3fb6ff, 0.16));
  const wire = new THREE.Mesh(
    new THREE.IcosahedronGeometry(1.38, 1),
    new THREE.MeshBasicMaterial({ color: 0x8fd8ff, wireframe: true, transparent: true, opacity: 0.35, depthWrite: false })
  );
  g.add(shell, wire);
  g.position.y = 1.15;
  g.userData.wire = wire;
  return g;
}

/** Pulsing ring at Bolt's feet while the magnet is active. */
export function buildMagnetRing(): THREE.Mesh {
  const ring = new THREE.Mesh(new THREE.TorusGeometry(1.1, 0.06, 8, 48), glowMat(0xff5a5a, 0.7));
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.08;
  return ring;
}
