import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';
import { ObstacleType } from '../config/Constants';
import { EnemyView, blobShadow, buildNewsCamera, buildSign, buildSunglasses, buildTie, outlineMaterial, toon } from './Models';

// Enemy characters from Quaternius's CC0 character pack (public/models).
// Each file holds one rigged character plus its animations; we recolor the
// named materials to match the 2D art and attach the coded props to bones.

/** The pack's characters are ~3.3 units tall; this brings them to ~2.5 like the coded ones. */
const MODEL_SCALE = 0.76;
const OUTLINE = 0.03; // in model units, before MODEL_SCALE

interface CharacterSpec {
  file: string;
  clip: 'Run' | 'Run_Carry';
  /** Material name -> color, matching the character's 2D sprite. */
  colors: Record<string, number>;
  /** Attach props to named bones. */
  props(bone: (name: string) => THREE.Object3D): void;
}

const SPECS: Record<ObstacleType, CharacterSpec> = {
  agent: {
    file: 'models/Suit_Male.gltf',
    clip: 'Run',
    colors: { Skin: 0xe0a77a, Hair: 0x4a2a14 },
    props(bone) {
      const glasses = buildSunglasses(0.8);
      glasses.position.set(0, 0.62, 0.5);
      bone('Head').add(glasses);
      const tie = buildTie(0.55);
      tie.position.set(0, 0.32, 0.25);
      bone('Torso').add(tie);
    },
  },
  cameraman: {
    file: 'models/Casual_Male.gltf',
    clip: 'Run',
    colors: { Skin: 0xf0bf94, Hair: 0x6b3a1a, Shirt: 0x2f6fd6, Pants: 0x5b5f66 },
    props(bone) {
      // Camera rides on his right shoulder (character's right is -X), aimed at Bolt
      const cam = buildNewsCamera();
      cam.scale.setScalar(1.7);
      cam.position.set(-0.75, 0.3, 0.25);
      bone('Head').add(cam);
    },
  },
  protester: {
    file: 'models/Casual2_Male.gltf',
    clip: 'Run_Carry', // both hands forward, gripping the sign pole
    colors: { Skin: 0xe8b088, Hair: 0x7a3b16, Shirt: 0xd8402e, Pants: 0x34507e },
    props(bone) {
      const sign = buildSign(2.0);
      sign.scale.setScalar(1.6);
      // On the Body bone (not Torso) so it bobs with him but doesn't twist with the arms
      sign.position.set(-0.45, 0.45, 0.62);
      bone('Body').add(sign);
    },
  },
};

interface Template {
  scene: THREE.Group;
  clip: THREE.AnimationClip;
  spec: CharacterSpec;
}

let templates: Record<ObstacleType, Template> | null = null;

/** Load all three characters once. Rejects if any file fails, so the caller can fall back. */
export async function loadCharacterModels(): Promise<void> {
  const loader = new GLTFLoader();
  const entries = await Promise.all(
    (Object.keys(SPECS) as ObstacleType[]).map(async (type) => {
      const spec = SPECS[type];
      const gltf = await loader.loadAsync(spec.file);
      const clip = gltf.animations.find((a) => a.name === spec.clip);
      if (!clip) throw new Error(`${spec.file} has no ${spec.clip} animation`);
      // Swap the pack's PBR materials for flat toon ones in the same (or recolored) colors
      gltf.scene.traverse((o) => {
        const mesh = o as THREE.Mesh;
        if (!mesh.isMesh) return;
        const swap = (m: THREE.Material) => {
          const src = m as THREE.MeshStandardMaterial;
          return toon(spec.colors[src.name] ?? src.color.getHex());
        };
        mesh.material = Array.isArray(mesh.material) ? mesh.material.map(swap) : swap(mesh.material);
      });
      return [type, { scene: gltf.scene, clip, spec }] as const;
    })
  );
  templates = Object.fromEntries(entries) as Record<ObstacleType, Template>;
}

export function hasCharacterModels(): boolean {
  return templates !== null;
}

/** A new animated instance of a loaded character, with props and outlines. */
export function createCharacterEnemy(type: ObstacleType): EnemyView {
  if (!templates) throw new Error('Character models not loaded');
  const t = templates[type];
  const model = SkeletonUtils.clone(t.scene) as THREE.Group;
  model.scale.setScalar(MODEL_SCALE);

  // Inverted-hull outline for each skinned mesh, sharing its skeleton
  const skinned: THREE.SkinnedMesh[] = [];
  model.traverse((o) => {
    if ((o as THREE.SkinnedMesh).isSkinnedMesh) skinned.push(o as THREE.SkinnedMesh);
  });
  for (const mesh of skinned) {
    mesh.frustumCulled = false; // bind-pose bounds don't cover the running pose
    const outline = new THREE.SkinnedMesh(mesh.geometry, outlineMaterial(OUTLINE));
    outline.bind(mesh.skeleton, mesh.bindMatrix);
    outline.frustumCulled = false;
    mesh.parent!.add(outline);
  }

  t.spec.props((name) => {
    const bone = model.getObjectByName(name);
    if (!bone) throw new Error(`${t.spec.file} has no bone named ${name}`);
    return bone;
  });

  const root = new THREE.Group();
  root.add(model);
  root.add(blobShadow(0.8));

  const mixer = new THREE.AnimationMixer(model);
  const action = mixer.clipAction(t.clip);
  action.play();
  mixer.setTime(Math.random() * t.clip.duration); // crowds shouldn't run in lockstep

  return {
    root,
    animate(dt, rate) {
      mixer.update(dt * rate);
    },
  };
}
