// Building blocks for the low-poly rooms: shared materials, primitive shapes and canvas-drawn textures.
import * as THREE from 'three';

const mats = new Map<string, THREE.Material>();

export interface MatOpts { rough?: number; metal?: number; emissive?: number; opacity?: number; map?: THREE.Texture; side?: THREE.Side }

/** Cached standard material for a colour. */
export function mat(color: number, o: MatOpts = {}): THREE.MeshStandardMaterial {
  const key = `${color}|${o.rough ?? 0.8}|${o.metal ?? 0}|${o.emissive ?? ''}|${o.opacity ?? 1}|${o.map?.uuid ?? ''}|${o.side ?? 0}`;
  let m = mats.get(key) as THREE.MeshStandardMaterial | undefined;
  if (!m) {
    m = new THREE.MeshStandardMaterial({
      color, roughness: o.rough ?? 0.8, metalness: o.metal ?? 0, map: o.map ?? null, side: o.side ?? THREE.FrontSide,
      transparent: (o.opacity ?? 1) < 1, opacity: o.opacity ?? 1,
    });
    if (o.emissive !== undefined) { m.emissive = new THREE.Color(o.emissive); m.emissiveIntensity = 1; }
    mats.set(key, m);
  }
  return m;
}

const boxGeo = new THREE.BoxGeometry(1, 1, 1);
const sphereGeo = new THREE.SphereGeometry(1, 16, 12);
const cylGeos = new Map<string, THREE.CylinderGeometry>();

function shadow<T extends THREE.Object3D>(m: T): T {
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

/** Box with its bottom-centre at (x, y, z). */
export function box(w: number, h: number, d: number, color: number | THREE.Material, x = 0, y = 0, z = 0): THREE.Mesh {
  const m = new THREE.Mesh(boxGeo, typeof color === 'number' ? mat(color) : color);
  m.scale.set(w, h, d);
  m.position.set(x, y + h / 2, z);
  return shadow(m);
}

/** Cylinder with its bottom-centre at (x, y, z). */
export function cyl(rTop: number, rBot: number, h: number, color: number | THREE.Material, x = 0, y = 0, z = 0, seg = 16): THREE.Mesh {
  const key = `${rTop}|${rBot}|${seg}`;
  let g = cylGeos.get(key);
  if (!g) { g = new THREE.CylinderGeometry(rTop, rBot, 1, seg); cylGeos.set(key, g); }
  const m = new THREE.Mesh(g, typeof color === 'number' ? mat(color) : color);
  m.scale.y = h;
  m.position.set(x, y + h / 2, z);
  return shadow(m);
}

export function ball(r: number, color: number | THREE.Material, x = 0, y = 0, z = 0): THREE.Mesh {
  const m = new THREE.Mesh(sphereGeo, typeof color === 'number' ? mat(color) : color);
  m.scale.setScalar(r);
  m.position.set(x, y, z);
  return shadow(m);
}

export function group(...children: THREE.Object3D[]): THREE.Group {
  const g = new THREE.Group();
  for (const c of children) g.add(c);
  return g;
}

/** A group whose origin is a hinge — rotate it to swing a door/lid open. */
export function hinge(x: number, y: number, z: number, ...children: THREE.Object3D[]): THREE.Group {
  const g = group(...children);
  g.position.set(x, y, z);
  return g;
}

// ---------- canvas textures ----------

export function canvasTex(w: number, h: number, draw: (c: CanvasRenderingContext2D) => void, repeat?: [number, number]): THREE.CanvasTexture {
  const cv = document.createElement('canvas');
  cv.width = w;
  cv.height = h;
  draw(cv.getContext('2d')!);
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  if (repeat) {
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(repeat[0], repeat[1]);
  }
  return t;
}

export const hex = (c: number) => `#${c.toString(16).padStart(6, '0')}`;

export function shade(c: number, f: number): number {
  const r = Math.min(255, Math.round(((c >> 16) & 255) * f));
  const g = Math.min(255, Math.round(((c >> 8) & 255) * f));
  const b = Math.min(255, Math.round((c & 255) * f));
  return (r << 16) | (g << 8) | b;
}

export type WallPattern = 'plain' | 'stripes' | 'dots' | 'tiles' | 'planks' | 'bricks' | 'diamonds';

export function patternTex(kind: WallPattern, a: number, b: number, repeat: [number, number]): THREE.CanvasTexture {
  return canvasTex(256, 256, (c) => {
    c.fillStyle = hex(a);
    c.fillRect(0, 0, 256, 256);
    c.fillStyle = hex(b);
    c.strokeStyle = hex(b);
    switch (kind) {
      case 'stripes':
        for (let x = 0; x < 256; x += 64) c.fillRect(x, 0, 22, 256);
        break;
      case 'dots':
        for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) {
          c.beginPath();
          c.arc(32 + x * 64 + (y % 2) * 32, 32 + y * 64, 7, 0, Math.PI * 2);
          c.fill();
        }
        break;
      case 'tiles':
        c.lineWidth = 6;
        for (let i = 0; i <= 256; i += 64) {
          c.beginPath(); c.moveTo(i, 0); c.lineTo(i, 256); c.stroke();
          c.beginPath(); c.moveTo(0, i); c.lineTo(256, i); c.stroke();
        }
        break;
      case 'planks':
        c.lineWidth = 4;
        for (let y = 0; y < 256; y += 42) {
          c.beginPath(); c.moveTo(0, y); c.lineTo(256, y); c.stroke();
          const off = ((y / 42) % 3) * 90;
          c.beginPath(); c.moveTo(off + 40, y); c.lineTo(off + 40, y + 42); c.stroke();
        }
        // subtle grain
        c.globalAlpha = 0.12;
        for (let i = 0; i < 60; i++) c.fillRect(Math.random() * 256, Math.random() * 256, 30 + Math.random() * 60, 2);
        c.globalAlpha = 1;
        break;
      case 'bricks':
        c.lineWidth = 5;
        for (let y = 0; y < 256; y += 32) {
          c.beginPath(); c.moveTo(0, y); c.lineTo(256, y); c.stroke();
          const off = (y / 32) % 2 ? 32 : 0;
          for (let x = off; x < 256; x += 64) { c.beginPath(); c.moveTo(x, y); c.lineTo(x, y + 32); c.stroke(); }
        }
        break;
      case 'diamonds':
        c.globalAlpha = 0.6;
        for (let y = 0; y < 256; y += 64) for (let x = 0; x < 256; x += 64) {
          c.beginPath(); c.moveTo(x + 32, y + 8); c.lineTo(x + 56, y + 32); c.lineTo(x + 32, y + 56); c.lineTo(x + 8, y + 32); c.closePath(); c.fill();
        }
        c.globalAlpha = 1;
        break;
      case 'plain':
        break;
    }
  }, repeat);
}

/** A flat plane (facing +z) showing canvas-drawn content — labels, notes, clock faces, pictures. */
export function picture(w: number, h: number, draw: (c: CanvasRenderingContext2D, W: number, H: number) => void, res = 256, transparent = false): THREE.Mesh {
  const W = Math.min(1024, Math.round(res * Math.max(1, w / h)));
  const H = Math.min(1024, Math.round(res * Math.max(1, h / w)));
  const tex = canvasTex(W, H, (c) => draw(c, W, H));
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.9, transparent }));
  m.receiveShadow = true;
  return m;
}

export function roundRect(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  c.beginPath();
  c.moveTo(x + r, y);
  c.arcTo(x + w, y, x + w, y + h, r);
  c.arcTo(x + w, y + h, x, y + h, r);
  c.arcTo(x, y + h, x, y, r);
  c.arcTo(x, y, x + w, y, r);
  c.closePath();
}

export function text(c: CanvasRenderingContext2D, s: string, x: number, y: number, size: number, color: string, weight = 800, font = 'system-ui, sans-serif'): void {
  c.fillStyle = color;
  c.font = `${weight} ${size}px ${font}`;
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.fillText(s, x, y);
}
