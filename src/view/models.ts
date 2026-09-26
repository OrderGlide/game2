// Realistic furniture made in Blender (tools/blender/furniture.py → public/models/*.glb).
// Models are loaded once at start-up; rooms whose theme has photo textures (theme.pbr) use them instead of
// the primitive-built props. Material slots in the files are just names — the PBR textures are applied here.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { pbr } from './assets';

export const MODELS = ['wardrobe', 'drawers', 'trunk', 'desk', 'door', 'frame'] as const;
export type ModelName = (typeof MODELS)[number];

const loaded = new Map<ModelName, THREE.Object3D>();
let enabled = false;
let loading: Promise<void> | null = null;

function materialFor(name: string): THREE.Material {
  switch (name) {
    case 'oak': return pbr('oak', [1, 1], { tint: 0xb8a898, rough: 0.9 });
    case 'oak_dark': return pbr('oak', [1, 1], { tint: 0x6e6058, rough: 0.95 });
    case 'iron': return pbr('rust', [1, 1], { tint: 0x9a9a9a, metal: 0.35, rough: 1 });
    case 'brass': return pbr('brass', [1, 1], { tint: 0xe0c090, metal: 0.6, rough: 0.8 });
    default: return new THREE.MeshStandardMaterial({ color: 0x070504, roughness: 1 });
  }
}

/** Load every model (once). Resolves even if some files fail — those props fall back to primitives. */
export function loadModels(): Promise<void> {
  loading ??= (async () => {
    const loader = new GLTFLoader();
    const mats = new Map<string, THREE.Material>();
    await Promise.all(MODELS.map(async (name) => {
      try {
        const gltf = await loader.loadAsync(`${import.meta.env.BASE_URL}models/${name}.glb`);
        gltf.scene.traverse((o) => {
          if (!(o instanceof THREE.Mesh)) return;
          const key = (o.material as THREE.Material).name;
          if (!mats.has(key)) mats.set(key, materialFor(key));
          o.material = mats.get(key)!;
          o.castShadow = key !== 'shadow';
          o.receiveShadow = true;
        });
        loaded.set(name, gltf.scene);
      } catch (e) {
        console.warn(`model ${name} failed to load`, e);
      }
    }));
  })();
  return loading;
}

/** Use the realistic models for the room being built (set before building each room). */
export function useModels(on: boolean): void { enabled = on; }

/** True while building a room with realistic models and decals. */
export function realistic(): boolean { return enabled; }

/** A fresh copy of a model, or null when models are off for this room or not loaded. */
export function model(name: ModelName): THREE.Group | null {
  const m = enabled ? loaded.get(name) : undefined;
  if (!m) return null;
  const g = new THREE.Group();
  for (const c of m.clone(true).children) g.add(c);
  return g;
}
