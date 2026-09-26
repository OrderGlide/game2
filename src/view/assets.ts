// Image-based assets: PBR texture sets from public/textures (made by tools/textures/process.py).
// Textures load in the background and appear as soon as they arrive, so building a room stays synchronous.
import * as THREE from 'three';

THREE.Cache.enabled = true; // several textures share one image file (different repeats)
const loader = new THREE.TextureLoader();
const images = new Map<string, THREE.Texture>();
const mats = new Map<string, THREE.MeshStandardMaterial>();

const url = (file: string) => `${import.meta.env.BASE_URL}textures/${file}`;

/** A texture from public/textures, shared between all users of the same file and repeat. */
export function texture(file: string, color: boolean, repeat: [number, number] = [1, 1]): THREE.Texture {
  const key = `${file}|${repeat}`;
  let t = images.get(key);
  if (!t) {
    t = loader.load(url(file));
    t.colorSpace = color ? THREE.SRGBColorSpace : THREE.NoColorSpace;
    t.repeat.set(repeat[0], repeat[1]);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.anisotropy = 4;
    images.set(key, t);
  }
  return t;
}

export interface PbrOpts { tint?: number; normal?: number; metal?: number; rough?: number }

/** Material from a `<name>_c/_n/_r.jpg` set; `repeat` = how many times the texture tiles across the surface. */
export function pbr(name: string, repeat: [number, number] = [1, 1], o: PbrOpts = {}): THREE.MeshStandardMaterial {
  const key = `${name}|${repeat}|${o.tint ?? ''}|${o.normal ?? ''}|${o.metal ?? ''}|${o.rough ?? ''}`;
  let m = mats.get(key);
  if (!m) {
    m = new THREE.MeshStandardMaterial({
      color: o.tint ?? 0xffffff,
      map: texture(`${name}_c.jpg`, true, repeat),
      normalMap: texture(`${name}_n.jpg`, false, repeat),
      roughnessMap: texture(`${name}_r.jpg`, false, repeat),
      roughness: o.rough ?? 1,
      metalness: o.metal ?? 0,
    });
    const n = o.normal ?? 1;
    m.normalScale.set(n, n);
    mats.set(key, m);
  }
  return m;
}

const decals = new Map<string, THREE.MeshStandardMaterial>();

/** Flat image material (a painting, paper, or a transparent decal like blood). */
export function imageMat(file: string, decal = false, tint = 0xffffff): THREE.MeshStandardMaterial {
  const key = `${file}|${tint}`;
  let m = decals.get(key);
  if (!m) {
    m = new THREE.MeshStandardMaterial({ map: texture(file, true), roughness: decal ? 0.6 : 0.9, color: tint });
    if (decal) {
      m.transparent = true;
      m.depthWrite = false;
      m.polygonOffset = true;
      m.polygonOffsetFactor = -1;
    }
    decals.set(key, m);
  }
  return m;
}

/** A w×h plane showing an image; decals don't catch taps. */
export function imagePlane(file: string, w: number, h: number, decal = false, tint = 0xffffff, mirror = false): THREE.Mesh {
  const geo = new THREE.PlaneGeometry(w, h);
  if (mirror) {
    const uv = geo.getAttribute('uv');
    for (let i = 0; i < uv.count; i++) uv.setX(i, 1 - uv.getX(i));
  }
  const m = new THREE.Mesh(geo, imageMat(file, decal, tint));
  m.receiveShadow = true;
  if (decal) {
    m.userData.noHit = true;
    m.renderOrder = -1; // drawn before (under) scrawled clues and other see-through things, never hiding them
  }
  return m;
}
