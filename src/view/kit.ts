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

/** Draw a repeating wall/floor pattern over a W×H canvas area; `t` = tile size in pixels. */
export function drawPattern(c: CanvasRenderingContext2D, kind: WallPattern, a: number, b: number, W: number, H: number, t = 64, rnd: () => number = Math.random): void {
  c.fillStyle = hex(a);
  c.fillRect(0, 0, W, H);
  c.fillStyle = hex(b);
  c.strokeStyle = hex(b);
  switch (kind) {
    case 'stripes':
      for (let x = 0; x < W; x += t) c.fillRect(x, 0, t * 0.34, H);
      break;
    case 'dots':
      for (let y = 0; y * t < H + t; y++) for (let x = 0; x * t < W + t; x++) {
        c.beginPath();
        c.arc(t / 2 + x * t + (y % 2) * t / 2, t / 2 + y * t, t * 0.11, 0, Math.PI * 2);
        c.fill();
      }
      break;
    case 'tiles':
      c.lineWidth = Math.max(2, t * 0.09);
      for (let i = 0; i <= W; i += t) { c.beginPath(); c.moveTo(i, 0); c.lineTo(i, H); c.stroke(); }
      for (let i = 0; i <= H; i += t) { c.beginPath(); c.moveTo(0, i); c.lineTo(W, i); c.stroke(); }
      break;
    case 'planks': {
      const ph = t * 0.66;
      c.lineWidth = Math.max(2, t * 0.06);
      for (let y = 0, r = 0; y < H; y += ph, r++) {
        c.beginPath(); c.moveTo(0, y); c.lineTo(W, y); c.stroke();
        for (let x = ((r * 37) % 5) * t * 0.5; x < W; x += t * 2.6) { c.beginPath(); c.moveTo(x, y); c.lineTo(x, y + ph); c.stroke(); }
      }
      c.globalAlpha = 0.12;
      for (let i = 0; i < (W * H) / 1000; i++) c.fillRect(rnd() * W, rnd() * H, t * 0.5 + rnd() * t, 2);
      c.globalAlpha = 1;
      break;
    }
    case 'bricks': {
      const bh = t / 2;
      c.lineWidth = Math.max(2, t * 0.08);
      for (let y = 0, r = 0; y < H; y += bh, r++) {
        c.beginPath(); c.moveTo(0, y); c.lineTo(W, y); c.stroke();
        for (let x = r % 2 ? t / 2 : 0; x < W; x += t) { c.beginPath(); c.moveTo(x, y); c.lineTo(x, y + bh); c.stroke(); }
      }
      break;
    }
    case 'diamonds':
      c.globalAlpha = 0.6;
      for (let y = 0; y < H; y += t) for (let x = 0; x < W; x += t) {
        c.beginPath(); c.moveTo(x + t / 2, y + t * 0.12); c.lineTo(x + t * 0.88, y + t / 2); c.lineTo(x + t / 2, y + t * 0.88); c.lineTo(x + t * 0.12, y + t / 2); c.closePath(); c.fill();
      }
      c.globalAlpha = 1;
      break;
    case 'plain':
      break;
  }
}

export function patternTex(kind: WallPattern, a: number, b: number, repeat: [number, number]): THREE.CanvasTexture {
  return canvasTex(256, 256, (c) => drawPattern(c, kind, a, b, 256, 256, 64), repeat);
}

/** Dirt, stains, damp and drips over whatever is already on the canvas. `amount` 0..1. */
export function drawGrime(c: CanvasRenderingContext2D, W: number, H: number, amount: number, rnd: () => number, drips = true): void {
  // big damp stains
  for (let i = 0; i < 6 + amount * 30; i++) {
    const x = rnd() * W;
    const y = rnd() * H;
    const r = 20 + rnd() * (60 + amount * 120);
    const g = c.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `rgba(20,14,8,${0.08 + amount * 0.25 * rnd()})`);
    g.addColorStop(1, 'rgba(20,14,8,0)');
    c.fillStyle = g;
    c.fillRect(x - r, y - r, r * 2, r * 2);
  }
  // dirt near the floor
  const f = c.createLinearGradient(0, H * 0.65, 0, H);
  f.addColorStop(0, 'rgba(10,6,4,0)');
  f.addColorStop(1, `rgba(10,6,4,${0.25 + amount * 0.4})`);
  c.fillStyle = f;
  c.fillRect(0, 0, W, H);
  // water drips from the ceiling
  if (drips) {
    for (let i = 0; i < amount * 26; i++) {
      const x = rnd() * W;
      const len = H * (0.1 + rnd() * 0.45);
      const g = c.createLinearGradient(0, 0, 0, len);
      g.addColorStop(0, `rgba(25,18,10,${0.2 + rnd() * 0.3})`);
      g.addColorStop(1, 'rgba(25,18,10,0)');
      c.fillStyle = g;
      c.fillRect(x, 0, 2 + rnd() * 5, len);
    }
  }
  // scratches and cracks
  c.strokeStyle = `rgba(15,10,6,${0.3 + amount * 0.4})`;
  for (let i = 0; i < amount * 14; i++) {
    c.lineWidth = 1 + rnd() * 1.5;
    let x = rnd() * W;
    let y = rnd() * H;
    c.beginPath();
    c.moveTo(x, y);
    for (let k = 0; k < 5; k++) { x += (rnd() - 0.5) * 40; y += rnd() * 30; c.lineTo(x, y); }
    c.stroke();
  }
}

/** Text written in blood (or chalk/paint) with drips — for walls and mirrors. */
export function drawScrawl(c: CanvasRenderingContext2D, lines: string[], W: number, H: number, color = '#8a0a0a', mirror = false, font = 'Creepster, Impact, fantasy'): void {
  c.save();
  if (mirror) { c.translate(W, 0); c.scale(-1, 1); }
  const size = Math.min(H / (lines.length * 1.25), (W / Math.max(...lines.map((l) => l.length), 1)) * 1.5);
  c.font = `${size}px ${font}`;
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  lines.forEach((l, i) => {
    const y = H / 2 + (i - (lines.length - 1) / 2) * size * 1.15;
    c.fillStyle = color;
    c.globalAlpha = 0.92;
    c.fillText(l, W / 2, y);
    // drips below letters
    const w = c.measureText(l).width;
    for (let d = 0; d < l.length * 0.7; d++) {
      const x = W / 2 - w / 2 + ((d * 97) % 100) / 100 * w;
      const len = size * (0.2 + ((d * 53) % 10) / 10 * 0.9);
      c.fillRect(x, y + size * 0.25, size * 0.05, len);
      c.beginPath(); c.arc(x + size * 0.025, y + size * 0.25 + len, size * 0.045, 0, Math.PI * 2); c.fill();
    }
  });
  c.restore();
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

export function mulberry32(seed: number): () => number {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
