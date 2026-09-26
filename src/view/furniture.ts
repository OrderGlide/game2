// Low-poly furniture and props, all built from primitives. Every model's origin is the bottom-centre of its
// back side, and it faces +z, so it can stand against any wall. Moving parts are named groups that room
// scripts animate (e.g. 'leaf' of a door, 'drawer' of a desk).
import * as THREE from 'three';
import { ball, box, canvasTex, cyl, group, hex, hinge, mat, picture, roundRect, shade, text } from './kit';

const WOOD = 0x9a6b45;
const WOOD_D = 0x6e4a2f;
const WHITE = 0xf4f1ea;
const METAL = 0xb8bec6;
const GOLD = 0xe8b64a;

/** Open-fronted box (cabinet carcass) so things inside are visible when its doors open. */
export function hollow(w: number, h: number, d: number, color: number, t = 0.04): THREE.Group {
  const inner = shade(color, 0.62);
  return group(
    box(w, h, t, color, 0, 0, t / 2),
    box(w - 2 * t, h - 2 * t, 0.005, inner, 0, t, t + 0.003),
    box(t, h, d, color, -w / 2 + t / 2, 0, d / 2),
    box(t, h, d, color, w / 2 - t / 2, 0, d / 2),
    box(w, t, d, color, 0, h - t, d / 2),
    box(w, t, d, color, 0, 0, d / 2),
  );
}

function named<T extends THREE.Object3D>(o: T, name: string): T { o.name = name; return o; }

/** Door (1.1 × 2.25 m) with a hinged leaf named 'leaf' (rotate y negative to open). */
export function door(color = 0x8a5a3b): THREE.Group {
  const g = new THREE.Group();
  const frame = 0xefe6d8;
  g.add(box(0.12, 2.4, 0.12, frame, -0.63, 0, 0.02), box(0.12, 2.4, 0.12, frame, 0.63, 0, 0.02), box(1.38, 0.12, 0.12, frame, 0, 2.3, 0.02));
  g.add(box(1.14, 2.28, 0.02, 0x2a1d14, 0, 0, 0.005)); // dark gap behind the leaf
  const leaf = hinge(-0.56, 0, 0.05);
  const slab = box(1.12, 2.28, 0.07, color, 0.56, 0, 0);
  leaf.add(slab);
  for (const y of [0.35, 1.3]) leaf.add(box(0.8, 0.75, 0.02, shade(color, 1.12), 0.56, y, 0.04));
  leaf.add(ball(0.05, GOLD, 1.0, 1.05, 0.09), box(0.14, 0.03, 0.03, GOLD, 0.97, 1.05, 0.1));
  g.add(named(leaf, 'leaf'));
  return g;
}

/** Detach a named moving part so it can become its own tappable object (same local frame as the model). */
export function split(model: THREE.Object3D, name: string): THREE.Group {
  const part = model.getObjectByName(name)!;
  part.parent!.remove(part);
  const g = new THREE.Group();
  g.add(part);
  return g;
}

/** Open the named hinge toward `target` radians. */
export function swing(node: THREE.Object3D, name: string, target: number, k: number, axis: 'x' | 'y' | 'z' = 'y'): void {
  const p = node.getObjectByName(name);
  if (p) p.rotation[axis] += (target - p.rotation[axis]) * k;
}

/** Slide a named part along its local axis toward `target`. */
export function slide(node: THREE.Object3D, name: string, target: number, k: number, axis: 'x' | 'y' | 'z' = 'z'): void {
  const p = node.getObjectByName(name);
  if (!p) return;
  const base = (p.userData.base ??= p.position[axis]) as number;
  p.position[axis] += (base + target - p.position[axis]) * k;
}

export function keypad(): THREE.Group {
  const g = group(box(0.26, 0.38, 0.05, 0x3a3f47));
  g.add(named(picture(0.2, 0.07, (c, W, H) => { c.fillStyle = '#153b2a'; c.fillRect(0, 0, W, H); text(c, '- - - -', W / 2, H / 2, H * 0.6, '#6dff9c'); }), 'screen'));
  g.getObjectByName('screen')!.position.set(0, 0.3, 0.052);
  for (let r = 0; r < 4; r++) for (let q = 0; q < 3; q++) g.add(box(0.05, 0.04, 0.02, 0xd9dde3, (q - 1) * 0.065, 0.04 + r * 0.055, 0.05));
  return g;
}

export function padlock(color = 0xc9a23a, wheels = 3): THREE.Group {
  const g = new THREE.Group();
  const shackle = new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.018, 8, 16, Math.PI), mat(METAL, { metal: 0.8, rough: 0.3 }));
  shackle.position.set(0, 0.2, 0.04);
  named(shackle, 'shackle');
  g.add(shackle, box(0.2, 0.2, 0.08, color, 0, 0, 0));
  for (let i = 0; i < wheels; i++) g.add(cyl(0.025, 0.025, 0.04, 0x333333, (i - (wheels - 1) / 2) * 0.05, 0.08, 0.08, 10));
  g.children.slice(2).forEach((c) => { c.rotation.x = Math.PI / 2; });
  g.scale.setScalar(1.3);
  return g;
}

export function colorPanel(colors: string[]): THREE.Group {
  const g = group(box(0.32, 0.32, 0.04, 0xe9e4da));
  colors.forEach((c, i) => {
    const b = cyl(0.045, 0.045, 0.03, mat(parseInt(c.slice(1), 16), { rough: 0.4 }), ((i % 2) - 0.5) * 0.14, 0.09 + Math.floor(i / 2) * 0.14 - 0.03, 0.04);
    b.rotation.x = Math.PI / 2;
    g.add(b);
  });
  return g;
}

export function letterLock(): THREE.Group {
  const g = group(box(0.34, 0.2, 0.06, 0x7b5a2e));
  for (let i = 0; i < 4; i++) {
    const w = cyl(0.04, 0.04, 0.055, 0xd8c9a0, (i - 1.5) * 0.075, 0.1, 0.07, 12);
    w.rotation.z = Math.PI / 2;
    w.position.y = 0.1;
    g.add(w);
  }
  return g;
}

/** Framed picture drawn with a canvas function. */
export function framed(w: number, h: number, draw: (c: CanvasRenderingContext2D, W: number, H: number) => void, frame = 0x6e4a2f): THREE.Group {
  const g = group(box(w + 0.1, h + 0.1, 0.04, frame, 0, -0.05, 0));
  const p = picture(w, h, draw, 256);
  p.position.set(0, h / 2 - 0.05 + 0.05, 0.042);
  g.add(p);
  return g;
}

export function bed(blanket = 0x6f9fd8): THREE.Group {
  const g = new THREE.Group();
  g.add(box(1.6, 1.1, 0.1, WOOD_D, 0, 0, 0.05)); // headboard
  g.add(box(1.6, 0.35, 2.1, WOOD, 0, 0.05, 1.1));
  g.add(box(1.5, 0.2, 2.0, WHITE, 0, 0.4, 1.1)); // mattress
  const bl = box(1.56, 0.08, 1.4, blanket, 0, 0.58, 1.45);
  g.add(bl, box(1.56, 0.25, 0.05, blanket, 0, 0.36, 2.14));
  const pillow = named(box(1.0, 0.16, 0.42, 0xfffaf2, 0, 0.6, 0.35), 'pillow');
  g.add(pillow);
  for (const x of [-0.75, 0.75]) g.add(box(0.08, 0.3, 0.08, WOOD_D, x, 0, 2.1));
  return g;
}

export function nightstand(): THREE.Group {
  const g = group(box(0.5, 0.55, 0.45, WOOD, 0, 0, 0.23));
  const drawer = named(group(box(0.44, 0.2, 0.42, shade(WOOD, 1.1), 0, 0.28, 0.24), ball(0.025, GOLD, 0, 0.38, 0.46)), 'drawer');
  g.add(drawer);
  return g;
}

export function tableLamp(shadeColor = 0xf7d9a8): THREE.Group {
  const g = group(cyl(0.08, 0.1, 0.04, 0x8a8f96), cyl(0.015, 0.015, 0.3, 0x8a8f96, 0, 0.04, 0), cyl(0.1, 0.16, 0.18, mat(shadeColor, { emissive: 0x6b4a1c }), 0, 0.3, 0));
  return g;
}

export function windowFrame(sky = 0x9fd4ff): THREE.Group {
  const g = new THREE.Group();
  const glass = picture(1.2, 1.3, (c, W, H) => {
    const gr = c.createLinearGradient(0, 0, 0, H);
    gr.addColorStop(0, hex(sky)); gr.addColorStop(1, '#e8f6ff');
    c.fillStyle = gr; c.fillRect(0, 0, W, H);
    c.fillStyle = '#ffffff';
    for (const [x, y, r] of [[0.3, 0.3, 30], [0.4, 0.28, 24], [0.75, 0.5, 26]]) { c.beginPath(); c.arc(x * W, y * H, r, 0, Math.PI * 2); c.fill(); }
    c.fillStyle = '#7fbf6a'; c.fillRect(0, H * 0.82, W, H * 0.18);
  });
  (glass.material as THREE.MeshStandardMaterial).emissive = new THREE.Color(0x445566);
  glass.position.set(0, 1.35 + 0.65, 0.01);
  g.add(glass);
  g.add(box(1.36, 0.08, 0.1, WHITE, 0, 1.3, 0.02), box(1.36, 0.08, 0.1, WHITE, 0, 2.65, 0.02), box(0.08, 1.4, 0.1, WHITE, -0.64, 1.3, 0.02), box(0.08, 1.4, 0.1, WHITE, 0.64, 1.3, 0.02), box(0.04, 1.3, 0.06, WHITE, 0, 1.35, 0.02), box(1.3, 0.04, 0.06, WHITE, 0, 1.98, 0.02));
  g.add(box(1.5, 0.05, 0.25, WHITE, 0, 1.26, 0.1)); // sill
  return g;
}

export function curtains(color = 0xd96f7c): THREE.Group {
  const g = new THREE.Group();
  const rod = cyl(0.02, 0.02, 1.9, METAL);
  rod.rotation.z = Math.PI / 2;
  rod.position.set(0, 2.85, 0.12);
  g.add(rod);
  for (const s of [-1, 1]) {
    const c = new THREE.Group();
    c.name = s < 0 ? 'curtainL' : 'curtainR';
    for (let i = 0; i < 4; i++) c.add(box(0.2, 1.75, 0.05, shade(color, i % 2 ? 1 : 0.9), s * (0.1 + i * 0.17), 1.05, 0.13 + (i % 2) * 0.03));
    c.position.x = s * 0.02;
    g.add(c);
  }
  return g;
}

export function desk(): THREE.Group {
  const g = group(box(1.4, 0.06, 0.7, WOOD, 0, 0.74, 0.35));
  for (const x of [-0.65, 0.65]) g.add(box(0.06, 0.74, 0.06, WOOD_D, x, 0, 0.05), box(0.06, 0.74, 0.06, WOOD_D, x, 0, 0.65));
  return g;
}

export function chair(color = WOOD): THREE.Group {
  const g = group(box(0.45, 0.05, 0.45, color, 0, 0.45, 0.22), box(0.45, 0.5, 0.05, color, 0, 0.5, 0.02));
  for (const [x, z] of [[-0.2, 0.02], [0.2, 0.02], [-0.2, 0.42], [0.2, 0.42]]) g.add(box(0.04, 0.45, 0.04, shade(color, 0.8), x, 0, z));
  return g;
}

/** Wall clock showing a fixed time. */
export function wallClock(h: number, m: number, rim = 0x6e4a2f): THREE.Group {
  const g = new THREE.Group();
  const rimM = cyl(0.3, 0.3, 0.06, rim, 0, 0, 0.03, 24);
  rimM.rotation.x = Math.PI / 2;
  rimM.position.set(0, 0, 0.03);
  const face = picture(0.54, 0.54, (c, W) => {
    c.fillStyle = '#fffaf0'; c.beginPath(); c.arc(W / 2, W / 2, W / 2, 0, Math.PI * 2); c.fill();
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      text(c, String(i === 0 ? 12 : i), W / 2 + Math.sin(a) * W * 0.38, W / 2 - Math.cos(a) * W * 0.38, W * 0.09, '#3a2a20');
    }
    const hand = (a: number, len: number, wd: number) => {
      c.strokeStyle = '#222'; c.lineWidth = wd; c.lineCap = 'round';
      c.beginPath(); c.moveTo(W / 2, W / 2); c.lineTo(W / 2 + Math.sin(a) * len, W / 2 - Math.cos(a) * len); c.stroke();
    };
    hand(((h % 12) + m / 60) / 12 * Math.PI * 2, W * 0.22, W * 0.035);
    hand((m / 60) * Math.PI * 2, W * 0.34, W * 0.022);
    c.fillStyle = '#c0392b'; c.beginPath(); c.arc(W / 2, W / 2, W * 0.025, 0, Math.PI * 2); c.fill();
  }, 256, true);
  face.position.z = 0.065;
  g.add(rimM, face);
  return g;
}

export function plantPot(potColor = 0xc8643c, leaf = 0x4f9a4a, size = 1): THREE.Group {
  const g = group(cyl(0.16, 0.12, 0.28, potColor, 0, 0, 0.16));
  g.add(named(cyl(0.15, 0.15, 0.02, 0x4a3222, 0, 0.26, 0.16), 'soil'));
  for (let i = 0; i < 7; i++) {
    const l = ball(1, leaf, Math.sin(i * 2.4) * 0.09, 0.4 + (i % 3) * 0.08, 0.16 + Math.cos(i * 2.4) * 0.09);
    l.scale.set(0.08, 0.18, 0.05);
    l.rotation.set(Math.cos(i) * 0.4, i, Math.sin(i * 2.4) * 0.5);
    g.add(l);
  }
  g.scale.setScalar(size);
  return g;
}

export function wardrobe(color = 0xb07b52): THREE.Group {
  const g = group(hollow(1.5, 2.2, 0.6, color));
  g.add(box(1.4, 0.03, 0.55, shade(color, 0.85), 0, 1.2, 0.3)); // shelf (visible when open)
  g.add(box(0.02, 0.02, 0.55, 0xb8bec6, 0, 1.9, 0.3));
  for (const s of [-1, 1]) {
    const h = hinge(s * 0.75, 0.05, 0.61);
    h.add(box(0.74, 2.1, 0.04, shade(color, 1.08), -s * 0.37, 0, 0.02), ball(0.03, GOLD, -s * 0.66, 1.05, 0.06));
    h.name = s < 0 ? 'doorL' : 'doorR';
    g.add(h);
  }
  g.add(box(1.6, 0.08, 0.66, shade(color, 0.8), 0, 2.2, 0.3));
  return g;
}

export function rug(color = 0xc0504d, color2 = 0xf2d0a4, w = 2.4, d = 1.6): THREE.Group {
  const tex = canvasTex(256, 170, (c) => {
    c.fillStyle = hex(color); c.fillRect(0, 0, 256, 170);
    c.strokeStyle = hex(color2); c.lineWidth = 10; c.strokeRect(16, 16, 224, 138);
    c.fillStyle = hex(color2);
    for (let i = 0; i < 5; i++) { c.beginPath(); c.arc(48 + i * 40, 85, 10, 0, Math.PI * 2); c.fill(); }
  });
  const main = new THREE.Mesh(new THREE.PlaneGeometry(w, d), mat(0xffffff, { map: tex }));
  main.rotation.x = -Math.PI / 2;
  main.position.y = 0.012;
  main.receiveShadow = true;
  const corner = new THREE.Group();
  corner.name = 'corner';
  const flap = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.5), mat(color, { side: THREE.DoubleSide }));
  flap.rotation.x = -Math.PI / 2;
  flap.position.set(-0.25, 0, -0.25);
  corner.add(flap);
  corner.position.set(w / 2, 0.016, d / 2);
  return group(main, corner);
}

export function toyBox(color = 0x5aa0d8): THREE.Group {
  const g = group(box(0.8, 0.45, 0.5, color, 0, 0, 0.25));
  const lid = hinge(0, 0.45, 0.02);
  lid.add(box(0.84, 0.06, 0.52, shade(color, 1.15), 0, 0, 0.24));
  g.add(named(lid, 'lid'));
  g.add(ball(0.08, 0xffd23f, -0.25, 0.47, 0.2), ball(0.06, 0xff6f91, 0.2, 0.47, 0.3));
  return g;
}

export function treatsBox(): THREE.Group {
  const g = group(box(0.22, 0.28, 0.12, 0xff8a3d));
  g.add(picture(0.18, 0.18, (c, W) => { c.fillStyle = '#fff1dd'; c.fillRect(0, 0, W, W); text(c, '🐟', W / 2, W / 2, W * 0.6, '#000'); }));
  g.children[1].position.set(0, 0.15, 0.061);
  return g;
}

export function smallKey(color = GOLD): THREE.Group {
  const m = mat(color, { metal: 0.8, rough: 0.3 });
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.035, 0.012, 8, 16), m);
  const shaft = box(0.1, 0.018, 0.018, m, 0.08, -0.009, 0);
  const tooth = box(0.02, 0.03, 0.018, m, 0.12, -0.035, 0);
  const g = group(ring, shaft, tooth);
  g.rotation.x = -Math.PI / 2;
  const outer = group(g);
  outer.scale.setScalar(1.6);
  return outer;
}

export function paper(color = 0xfffbe8, w = 0.2, d = 0.28): THREE.Mesh {
  const m = box(w, 0.005, d, color);
  m.rotation.y = 0.2;
  return m;
}

export function bowl(color = 0x5aa0d8): THREE.Group {
  const b = cyl(0.16, 0.11, 0.09, color);
  const inside = named(cyl(0.13, 0.13, 0.01, 0xffffff, 0, 0.075, 0), 'milk');
  return group(b, inside);
}

// ---------- kitchen ----------

export function fridge(): THREE.Group {
  const g = group(hollow(0.8, 1.9, 0.7, 0xe8ecef));
  g.add(box(0.7, 0.02, 0.55, 0xffffff, 0, 0.7, 0.38), box(0.7, 0.02, 0.55, 0xffffff, 0, 1.05, 0.38));
  const d1 = hinge(-0.4, 0.02, 0.71);
  d1.add(box(0.8, 1.26, 0.06, 0xf4f7f9, 0.4, 0, 0.03), box(0.03, 0.4, 0.04, METAL, 0.72, 0.5, 0.08));
  const d2 = hinge(-0.4, 1.3, 0.71);
  d2.add(box(0.8, 0.58, 0.06, 0xf4f7f9, 0.4, 0, 0.03), box(0.03, 0.25, 0.04, METAL, 0.72, 0.08, 0.08));
  // fridge magnets
  d1.add(ball(0.03, 0xff5a5a, 0.2, 1.0, 0.07), ball(0.03, 0x4aa3ff, 0.5, 0.85, 0.07), ball(0.03, 0xffd23f, 0.35, 0.7, 0.07));
  g.add(named(d1, 'door'), named(d2, 'freezer'));
  g.add(box(0.72, 0.02, 0.55, 0xcfd6dc, 0, 1.3, 0.38));
  return g;
}

export function milk(): THREE.Group {
  const g = group(box(0.12, 0.22, 0.12, 0xffffff), box(0.12, 0.08, 0.12, 0x4aa3ff, 0, 0.08, 0));
  const roof = box(0.1, 0.05, 0.12, 0xffffff, 0, 0.22, 0);
  g.add(roof);
  return g;
}

export function stove(): THREE.Group {
  const g = group(box(0.8, 0.9, 0.65, 0xf1ede6, 0, 0, 0.33), box(0.8, 0.03, 0.65, 0x2d2d2d, 0, 0.9, 0.33));
  for (const [x, z] of [[-0.2, 0.2], [0.2, 0.2], [-0.2, 0.45], [0.2, 0.45]]) g.add(cyl(0.1, 0.1, 0.02, 0x444444, x, 0.93, z));
  g.add(box(0.6, 0.35, 0.02, 0x222222, 0, 0.3, 0.65));
  const od = hinge(0, 0.2, 0.67);
  od.add(box(0.7, 0.55, 0.04, 0xe8e3db, 0, 0, 0.02), box(0.45, 0.25, 0.01, 0x333a40, 0, 0.18, 0.045), box(0.5, 0.03, 0.04, METAL, 0, 0.48, 0.07));
  g.add(named(od, 'ovenDoor'));
  for (let i = 0; i < 4; i++) g.add(cyl(0.03, 0.03, 0.04, 0x333333, -0.27 + i * 0.18, 0.8, 0.67).rotateX(Math.PI / 2));
  // hood with vent grate
  const hood = group(box(0.8, 0.35, 0.5, 0xd0d4d9, 0, 1.9, 0.25));
  const grate = named(group(box(0.5, 0.02, 0.3, 0x8a9199, 0, 1.885, 0.27)), 'grate');
  hood.add(grate);
  g.add(hood);
  return g;
}

export function sinkCabinet(color = 0xf3e3c3): THREE.Group {
  const g = group(hollow(1.2, 0.85, 0.6, color), box(1.24, 0.05, 0.64, 0x9aa3ad, 0, 0.85, 0.32));
  g.add(box(0.5, 0.04, 0.35, 0x6d757e, 0, 0.87, 0.3), cyl(0.02, 0.02, 0.25, METAL, 0, 0.9, 0.08), box(0.03, 0.03, 0.18, METAL, 0, 1.13, 0.16));
  for (const s of [-1, 1]) {
    const h = hinge(s * 0.58, 0.06, 0.61);
    h.add(box(0.56, 0.74, 0.04, shade(color, 1.06), -s * 0.28, 0, 0.02), box(0.02, 0.15, 0.03, METAL, -s * 0.5, 0.45, 0.05));
    h.name = s < 0 ? 'doorL' : 'doorR';
    g.add(h);
  }
  return g;
}

export function upperCabinet(w = 1.2, color = 0xf3e3c3): THREE.Group {
  const g = group(box(w, 0.7, 0.35, color, 0, 0, 0.18));
  for (let i = 0; i < 2; i++) g.add(box(w / 2 - 0.04, 0.64, 0.02, shade(color, 1.06), (i - 0.5) * w / 2, 0.03, 0.36), box(0.02, 0.12, 0.03, METAL, (i - 0.5) * 0.12, 0.1, 0.38));
  return g;
}

export function table(w = 1.4, d = 0.9, color = WOOD): THREE.Group {
  const g = group(box(w, 0.06, d, color, 0, 0.74, d / 2));
  for (const x of [-w / 2 + 0.08, w / 2 - 0.08]) for (const z of [0.08, d - 0.08]) g.add(box(0.07, 0.74, 0.07, shade(color, 0.8), x, 0, z));
  return g;
}

/** Upside-down cup; its 'cup' child lifts to reveal what's under it. */
export function cup(color: number, under: string): THREE.Group {
  const g = new THREE.Group();
  const label = picture(0.12, 0.12, (c, W) => { text(c, under, W / 2, W / 2, W * 0.75, '#2d2d2d', 900); }, 128, true);
  label.rotation.x = -Math.PI / 2;
  label.position.y = 0.003;
  const c = named(group(cyl(0.06, 0.08, 0.14, color), cyl(0.05, 0.05, 0.005, shade(color, 0.7), 0, 0.14, 0)), 'cup');
  g.add(label, c);
  return g;
}

export function calendar(month: string, mark: string): THREE.Mesh {
  return picture(0.45, 0.6, (c, W, H) => {
    c.fillStyle = '#fffdf6'; c.fillRect(0, 0, W, H);
    c.fillStyle = '#e25c5c'; c.fillRect(0, 0, W, H * 0.2);
    text(c, month, W / 2, H * 0.1, H * 0.09, '#fff');
    for (let i = 0; i < 28; i++) text(c, String(i + 1), W * (0.12 + (i % 7) * 0.127), H * (0.3 + Math.floor(i / 7) * 0.16), H * 0.05, '#555', 600);
    c.strokeStyle = '#e25c5c'; c.lineWidth = 4; c.beginPath(); c.arc(W * 0.12 + 3 * W * 0.127, H * 0.46, W * 0.06, 0, Math.PI * 2); c.stroke();
    text(c, mark, W / 2, H * 0.93, H * 0.06, '#e25c5c', 700);
  });
}

export function screwdriver(): THREE.Group {
  const g = group(cyl(0.025, 0.025, 0.12, 0xe8b400), cyl(0.008, 0.008, 0.14, METAL, 0, 0.12, 0));
  g.rotation.z = Math.PI / 2;
  return group(g);
}

// ---------- bathroom ----------

export function bathtub(): THREE.Group {
  const g = new THREE.Group();
  const W = 0xfdfdfd;
  // hollow tub so the water and ducks inside are visible from above
  g.add(box(1.8, 0.12, 0.85, W, 0, 0, 0.43), box(1.8, 0.6, 0.07, W, 0, 0, 0.035), box(1.8, 0.6, 0.07, W, 0, 0, 0.815));
  g.add(box(0.07, 0.6, 0.85, W, -0.865, 0, 0.43), box(0.07, 0.6, 0.85, W, 0.865, 0, 0.43));
  g.add(box(1.66, 0.02, 0.72, 0xdfe9f0, 0, 0.12, 0.43));
  const water = named(box(1.66, 0.3, 0.72, mat(0x9fd8f5, { opacity: 0.75, rough: 0.1 }), 0, 0.14, 0.43), 'water');
  water.castShadow = false;
  g.add(water);
  const foam = named(new THREE.Group(), 'foam');
  const foamMat = mat(0xffffff, { emissive: 0x777777, rough: 1 });
  for (let i = 0; i < 10; i++) {
    const x = i < 5 ? -0.78 + i * 0.05 : 0.58 + (i - 5) * 0.05;
    foam.add(ball(0.05 + (i % 3) * 0.02, foamMat, x, 0.45, 0.12 + (i % 3) * 0.1));
  }
  g.add(foam);
  for (const [x, z] of [[-0.8, 0.1], [0.8, 0.1], [-0.8, 0.78], [0.8, 0.78]]) g.add(ball(0.05, GOLD, x, 0.02, z));
  // shower: pipe, head, tap socket
  g.add(cyl(0.02, 0.02, 1.3, METAL, 0.75, 0.6, 0.05), box(0.25, 0.03, 0.03, METAL, 0.63, 1.9, 0.06));
  const head = cyl(0.09, 0.06, 0.05, METAL, 0.5, 1.84, 0.1);
  g.add(head, cyl(0.03, 0.03, 0.06, 0x6d757e, 0.75, 0.9, 0.06).rotateX(Math.PI / 2));
  const handle = named(group(box(0.14, 0.03, 0.03, 0xd94040, 0.75, 0.89, 0.12), cyl(0.02, 0.02, 0.05, METAL, 0.75, 0.88, 0.1)), 'handle');
  g.add(handle);
  const stream = named(new THREE.Group(), 'stream');
  for (let i = 0; i < 6; i++) {
    const s = cyl(0.006, 0.006, 1.3, mat(0xbfe8ff, { opacity: 0.6 }), 0.45 + (i % 3) * 0.05, 0.55, 0.08 + Math.floor(i / 3) * 0.05);
    s.castShadow = false;
    stream.add(s);
  }
  g.add(stream);
  return g;
}

export function duck(color: number, symbol: string): THREE.Group {
  const body = ball(1, color);
  body.scale.set(0.09, 0.07, 0.07);
  const head = ball(0.05, color, 0.06, 0.07, 0);
  const beak = ball(1, 0xff8a1f, 0.11, 0.065, 0);
  beak.scale.set(0.03, 0.012, 0.02);
  const eye = ball(0.008, 0x111111, 0.09, 0.085, 0.03);
  const eye2 = ball(0.008, 0x111111, 0.09, 0.085, -0.03);
  const bottom = picture(0.1, 0.1, (c, W) => { c.fillStyle = '#ffffff'; c.beginPath(); c.arc(W / 2, W / 2, W / 2, 0, Math.PI * 2); c.fill(); text(c, symbol, W / 2, W / 2, W * 0.7, '#222', 900); }, 128, true);
  bottom.rotation.x = Math.PI / 2;
  bottom.position.y = -0.065;
  const inner = named(group(body, head, beak, eye, eye2, bottom), 'duck');
  inner.position.y = 0.07;
  // floating, camera-facing label shown when the duck is flipped over
  const tex = canvasTex(128, 128, (c) => {
    c.fillStyle = '#ffffff'; c.beginPath(); c.arc(64, 64, 60, 0, Math.PI * 2); c.fill();
    c.strokeStyle = hex(color); c.lineWidth = 8; c.stroke();
    text(c, symbol, 64, 68, 76, '#222', 900);
  });
  const label = named(new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false })), 'label');
  label.scale.setScalar(0.13);
  label.position.y = 0.32;
  label.visible = false;
  label.renderOrder = 5;
  return group(inner, label);
}

export function mirror(): THREE.Group {
  const g = group(box(0.9, 1.1, 0.04, 0xd9c8a8));
  const glass = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 1.0), mat(0xcfe4ee, { rough: 0.05, metal: 0.6 }));
  glass.position.set(0, 0.55, 0.021);
  g.add(glass);
  return g;
}

/** Symbols that appear on a steamed-up mirror. */
export function mirrorWriting(symbols: string): THREE.Mesh {
  const p = picture(0.8, 1.0, (c, W, H) => {
    c.clearRect(0, 0, W, H);
    text(c, symbols, W / 2, H / 2, W * 0.16, 'rgba(255,255,255,0.95)', 900);
  }, 256, true);
  const m = p.material as THREE.MeshStandardMaterial;
  m.transparent = true;
  m.opacity = 0;
  m.depthWrite = false;
  return p;
}

export function steam(): THREE.Group {
  const g = new THREE.Group();
  const m = mat(0xffffff, { opacity: 0.16, rough: 1 });
  for (let i = 0; i < 18; i++) {
    const b = ball(0.12 + (i % 4) * 0.05, m, (Math.random() - 0.5) * 1.4, 1.0 + Math.random() * 1.3, Math.random() * 0.7);
    b.castShadow = false;
    b.receiveShadow = false;
    g.add(b);
  }
  return g;
}

export function washbasin(): THREE.Group {
  const g = group(box(0.7, 0.8, 0.45, 0xe8ecef, 0, 0, 0.23), box(0.74, 0.1, 0.5, 0xffffff, 0, 0.8, 0.25));
  g.add(box(0.45, 0.02, 0.3, 0xcfe0ea, 0, 0.88, 0.26), cyl(0.02, 0.02, 0.18, METAL, 0, 0.9, 0.06), box(0.02, 0.02, 0.12, METAL, 0, 1.06, 0.12));
  return g;
}

export function laundryBasket(): THREE.Group {
  const g = new THREE.Group();
  g.add(cyl(0.34, 0.28, 0.6, 0xc9a36b, 0, 0, 0.35, 12));
  for (let i = 0; i < 4; i++) g.add(cyl(0.345, 0.345, 0.02, 0xa9834b, 0, 0.12 + i * 0.13, 0.35, 12));
  const cloth = ball(1, 0x7fb3e0, -0.05, 0.56, 0.35);
  cloth.scale.set(0.26, 0.07, 0.26);
  g.add(cloth);
  return g;
}

export function washingMachine(): THREE.Group {
  const g = group(box(0.7, 0.85, 0.65, 0xf6f7f8, 0, 0, 0.33), box(0.6, 0.08, 0.02, 0xdde1e5, 0, 0.72, 0.66));
  g.add(box(0.36, 0.36, 0.02, 0x2e3a44, 0, 0.2, 0.655));
  const d = hinge(-0.2, 0.38, 0.67);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.19, 0.035, 8, 24), mat(0xb8bec6, { metal: 0.6, rough: 0.3 }));
  ring.position.set(0.2, 0, 0.02);
  const glass = cyl(0.17, 0.17, 0.02, mat(0x8fb9d6, { opacity: 0.6, rough: 0.05 }), 0.2, 0, 0.02);
  glass.rotation.x = Math.PI / 2;
  d.add(ring, glass);
  g.add(named(d, 'drum'));
  for (let i = 0; i < 3; i++) g.add(cyl(0.02, 0.02, 0.02, 0x5a6570, -0.2 + i * 0.1, 0.75, 0.67).rotateX(Math.PI / 2));
  return g;
}

export function smallCabinet(color = 0xf3e3c3): THREE.Group {
  const g = group(hollow(0.6, 0.7, 0.4, color));
  const d = hinge(-0.3, 0.04, 0.41);
  d.add(box(0.58, 0.62, 0.03, shade(color, 1.05), 0.29, 0, 0.015), ball(0.025, METAL, 0.52, 0.32, 0.04));
  g.add(named(d, 'door'));
  return g;
}

export function toyMouse(): THREE.Group {
  const b = ball(1, 0xb0b5bb);
  b.scale.set(0.06, 0.045, 0.09);
  b.position.y = 0.04;
  const ears = [ball(0.025, 0xffa8b8, -0.03, 0.08, 0.05), ball(0.025, 0xffa8b8, 0.03, 0.08, 0.05)];
  const tail = cyl(0.004, 0.004, 0.12, 0xffa8b8, 0, 0.03, -0.12);
  tail.rotation.x = Math.PI / 2;
  return group(b, ...ears, tail);
}

export function tapHandle(): THREE.Group {
  return group(box(0.14, 0.03, 0.03, 0xd94040, 0, 0.02, 0), cyl(0.02, 0.02, 0.05, METAL, 0, 0, 0));
}

export function towelRack(color = 0x7fc8b8): THREE.Group {
  return group(box(0.7, 0.03, 0.03, METAL, 0, 1.3, 0.12), box(0.5, 0.7, 0.04, color, 0, 0.72, 0.14), box(0.5, 0.05, 0.05, shade(color, 0.85), 0, 1.3, 0.14));
}

// ---------- living room ----------

export function sofa(color = 0x6a8caf): THREE.Group {
  const g = group(box(2.2, 0.4, 0.9, color, 0, 0.1, 0.45), box(2.2, 0.7, 0.25, shade(color, 0.9), 0, 0.3, 0.12));
  for (const x of [-1.0, 1.0]) g.add(box(0.2, 0.6, 0.9, shade(color, 0.9), x, 0.1, 0.45));
  for (const x of [-0.95, 0.95]) for (const z of [0.1, 0.8]) g.add(cyl(0.03, 0.03, 0.1, WOOD_D, x, 0, z));
  return g;
}

export function cushion(color: number): THREE.Mesh {
  const c = box(0.85, 0.15, 0.62, color);
  return c;
}

export function coffeeTable(): THREE.Group {
  const g = group(box(1.1, 0.06, 0.6, WOOD, 0, 0.42, 0.3), box(1.0, 0.15, 0.5, shade(WOOD, 0.9), 0, 0.27, 0.3));
  for (const x of [-0.5, 0.5]) for (const z of [0.05, 0.55]) g.add(box(0.05, 0.42, 0.05, WOOD_D, x, 0, z));
  const drawer = named(group(box(0.5, 0.12, 0.45, shade(WOOD, 1.1), 0, 0.285, 0.3), ball(0.025, GOLD, 0, 0.35, 0.53)), 'drawer');
  g.add(drawer);
  return g;
}

export function fireplace(): THREE.Group {
  const g = group(box(1.5, 1.2, 0.45, 0xb9674e, 0, 0, 0.23), box(1.7, 0.1, 0.55, 0xefe6d8, 0, 1.2, 0.27));
  g.add(box(0.8, 0.65, 0.05, 0x2a1b14, 0, 0.1, 0.44));
  for (let i = 0; i < 3; i++) g.add(cyl(0.05, 0.05, 0.6, WOOD_D, 0, 0.12 + i * 0.06, 0.35).rotateZ(Math.PI / 2 + (i - 1) * 0.3));
  const fire = named(new THREE.Group(), 'fire');
  for (let i = 0; i < 3; i++) {
    const f = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.35, 6), mat(0xff9a3c, { emissive: 0xff6a00 }));
    f.position.set((i - 1) * 0.15, 0.35, 0.36);
    fire.add(f);
  }
  g.add(fire);
  return g;
}

export function tvStand(): THREE.Group {
  const g = group(box(0.7, 0.5, 0.45, WOOD_D, -0.3, 0, 0.23), hollow(0.62, 0.5, 0.45, WOOD_D));
  g.children[1].position.x = 0.34;
  const d = hinge(0.05, 0.05, 0.46);
  d.add(box(0.55, 0.4, 0.03, shade(WOOD_D, 1.2), 0.28, 0, 0.015), ball(0.02, GOLD, 0.5, 0.2, 0.04));
  g.add(named(d, 'door'));
  // TV
  g.add(box(1.1, 0.66, 0.06, 0x1d1f23, 0, 0.58, 0.2), box(0.3, 0.08, 0.2, 0x1d1f23, 0, 0.5, 0.2));
  return g;
}

export function tvScreen(lines: string[]): THREE.Mesh {
  return picture(1.0, 0.56, (c, W, H) => {
    c.fillStyle = '#123a6b'; c.fillRect(0, 0, W, H);
    lines.forEach((l, i) => text(c, l, W / 2, H * (0.3 + i * 0.3), H * (i === 0 ? 0.14 : 0.22), i === 0 ? '#ffd23f' : '#ffffff', 900));
  }, 256);
}

export function bookshelf(w = 1.4, color = WOOD): THREE.Group {
  const g = group(hollow(w, 2.0, 0.35, color));
  for (let i = 0; i < 5; i++) g.add(box(w - 0.06, 0.04, 0.32, shade(color, 1.1), 0, 0.05 + i * 0.46, 0.2));
  return g;
}

const BOOK_COLORS = [0xc0504d, 0x4f81bd, 0x9bbb59, 0x8064a2, 0xf79646, 0x4bacc6, 0xd9a441];
/** A row of decorative books along a shelf, x from -w/2 to w/2. */
export function bookRow(w: number, seed = 1): THREE.Group {
  const g = new THREE.Group();
  let x = -w / 2 + 0.03;
  let i = seed;
  while (x < w / 2 - 0.08) {
    const bw = 0.05 + ((i * 37) % 5) * 0.012;
    const bh = 0.28 + ((i * 13) % 4) * 0.03;
    g.add(box(bw, bh, 0.22, BOOK_COLORS[i % BOOK_COLORS.length], x + bw / 2, 0, 0.13));
    x += bw + 0.008;
    i++;
  }
  return g;
}

/** A big book with a number and a letter on its spine (the named 'book' part can slide out). */
export function labelledBook(color: number, num: string, letter: string): THREE.Group {
  const spine = picture(0.1, 0.36, (c, W, H) => {
    c.fillStyle = hex(color); c.fillRect(0, 0, W, H);
    c.fillStyle = '#f3e3b3'; c.fillRect(0, H * 0.06, W, H * 0.03); c.fillRect(0, H * 0.91, W, H * 0.03);
    text(c, num, W / 2, H * 0.2, W * 0.45, '#f3e3b3', 700);
    text(c, letter, W / 2, H * 0.58, W * 0.75, '#f3e3b3', 900);
  }, 128);
  spine.position.set(0, 0.18, 0.261);
  const b = named(group(box(0.1, 0.36, 0.26, color, 0, 0, 0.13), spine), 'book');
  return group(b);
}

export function aquarium(): THREE.Group {
  const g = group(box(1.0, 0.7, 0.45, WOOD_D, 0, 0, 0.23));
  const glass = box(0.95, 0.55, 0.4, mat(0x7fd3f0, { opacity: 0.45, rough: 0.05 }), 0, 0.7, 0.23);
  glass.castShadow = false;
  g.add(glass, box(0.97, 0.04, 0.42, 0x333333, 0, 1.25, 0.23), box(0.9, 0.06, 0.38, 0xe8d9a8, 0, 0.7, 0.23));
  for (let i = 0; i < 4; i++) {
    const w = box(0.02, 0.2 + (i % 2) * 0.12, 0.02, 0x3fa34d, -0.35 + i * 0.22, 0.75, 0.15 + (i % 2) * 0.12);
    g.add(w);
  }
  const fishes = named(new THREE.Group(), 'fishes');
  for (const [c, x, y] of [[0xff7a3c, -0.2, 0.95], [0x5ab4ff, 0.25, 1.05]] as const) {
    const f = ball(1, c, x, y, 0.23);
    f.scale.set(0.05, 0.035, 0.015);
    fishes.add(f);
  }
  g.add(fishes);
  return g;
}

export function featherWand(): THREE.Group {
  const stick = cyl(0.008, 0.008, 0.5, 0xd9a441);
  stick.rotation.z = 0.3;
  const f1 = ball(1, 0xff6f91, -0.08, 0.5, 0);
  f1.scale.set(0.03, 0.08, 0.01);
  const f2 = ball(1, 0x5ab4ff, -0.05, 0.53, 0.01);
  f2.scale.set(0.025, 0.07, 0.01);
  return group(stick, f1, f2);
}

export function remote(): THREE.Group {
  const g = group(box(0.07, 0.025, 0.2, 0x2d2f33));
  for (let i = 0; i < 6; i++) g.add(box(0.015, 0.01, 0.015, i === 0 ? 0xff4d4d : 0xbfc5cc, (i % 2 - 0.5) * 0.025, 0.025, -0.06 + Math.floor(i / 2) * 0.04));
  return g;
}

export function net(): THREE.Group {
  const handle = cyl(0.01, 0.01, 0.45, WOOD);
  handle.rotation.z = Math.PI / 2.4;
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.09, 0.008, 6, 16), mat(METAL));
  ring.position.set(-0.22, 0.32, 0);
  ring.rotation.y = Math.PI / 2;
  const mesh = ball(1, mat(0x9fd4c0, { opacity: 0.6 }), -0.22, 0.28, 0);
  mesh.scale.set(0.01, 0.1, 0.08);
  return group(handle, ring, mesh);
}

export function batteries(): THREE.Group {
  const g = new THREE.Group();
  for (const x of [-0.03, 0.03]) {
    const b = cyl(0.022, 0.022, 0.1, 0x2d2f33, x, 0, 0);
    b.rotation.z = Math.PI / 2;
    b.position.set(0, 0.022, x * 2);
    const tip = cyl(0.022, 0.022, 0.03, 0xe8b64a, 0, 0, 0);
    tip.rotation.z = Math.PI / 2;
    tip.position.set(0.06, 0.022, x * 2);
    g.add(b, tip);
  }
  return g;
}

// ---------- study ----------

export function bigDesk(): THREE.Group {
  const g = group(box(1.8, 0.07, 0.8, WOOD_D, 0, 0.74, 0.4), box(0.5, 0.74, 0.75, WOOD, 0.62, 0, 0.4), box(0.06, 0.74, 0.7, WOOD, -0.85, 0, 0.4));
  const names = ['drawer1', 'drawer2', 'drawer3'];
  names.forEach((n, i) => {
    const d = named(group(box(0.46, 0.2, 0.7, shade(WOOD, 1.12), 0.62, 0.5 - i * 0.23, 0.42), ball(0.025, GOLD, 0.62, 0.6 - i * 0.23, 0.79)), n);
    g.add(d);
  });
  return g;
}

export function deskLamp(): THREE.Group {
  const base = cyl(0.1, 0.12, 0.03, 0x2f6b4f);
  const arm = cyl(0.012, 0.012, 0.4, 0xc9a23a, 0, 0.03, 0);
  const head = cyl(0.05, 0.12, 0.12, 0x2f6b4f, 0.08, 0.36, 0.05);
  head.rotation.z = -0.5;
  const bulb = named(ball(0.05, mat(0xfff3c4, { emissive: 0xffd76a }), 0.1, 0.33, 0.05), 'bulb');
  const g = group(base, arm, head, bulb);
  const light = named(new THREE.PointLight(0xffd76a, 2.5, 2.2, 1.5), 'light');
  light.position.set(0.12, 0.25, 0.1);
  g.add(light);
  return g;
}

export function worldMap(pins: { x: number; y: number; label: string }[], showLabels: boolean, caption = ''): THREE.Mesh {
  return picture(1.5, 0.95, (c, W, H) => {
    c.fillStyle = '#e9dcb8'; c.fillRect(0, 0, W, H);
    c.fillStyle = '#9fc3d8'; c.fillRect(W * 0.03, H * 0.05, W * 0.94, H * 0.9);
    c.fillStyle = '#b9c98a';
    const blobs = [[0.18, 0.35, 0.12, 0.2], [0.25, 0.7, 0.07, 0.15], [0.5, 0.3, 0.09, 0.12], [0.52, 0.62, 0.08, 0.18], [0.72, 0.35, 0.16, 0.18], [0.82, 0.72, 0.07, 0.08]];
    for (const [x, y, rx, ry] of blobs) { c.beginPath(); c.ellipse(x * W, y * H, rx * W, ry * H, 0, 0, Math.PI * 2); c.fill(); }
    for (const p of pins) {
      c.fillStyle = '#d63a3a'; c.beginPath(); c.arc(p.x * W, p.y * H, 7, 0, Math.PI * 2); c.fill();
      if (showLabels) text(c, p.label, p.x * W, p.y * H + 18, 15, '#2a1b14', 800);
    }
    if (showLabels && caption) text(c, caption, W / 2, H * 0.92, 16, '#2a1b14', 800);
    c.strokeStyle = '#7a5c3a'; c.lineWidth = 6; c.strokeRect(0, 0, W, H);
  }, 512);
}

export function globe(): THREE.Group {
  const stand = group(cyl(0.18, 0.22, 0.05, WOOD_D), cyl(0.03, 0.03, 0.5, WOOD_D, 0, 0.05, 0));
  const sphereTex = canvasTex(256, 128, (c) => {
    c.fillStyle = '#5a9fd4'; c.fillRect(0, 0, 256, 128);
    c.fillStyle = '#9ccc65';
    for (const [x, y, r] of [[40, 50, 22], [70, 85, 14], [130, 45, 18], [135, 80, 16], [190, 50, 30], [215, 95, 12]]) { c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill(); }
  });
  const top = named(new THREE.Group(), 'top');
  const upper = new THREE.Mesh(new THREE.SphereGeometry(0.3, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), mat(0xffffff, { map: sphereTex }));
  upper.castShadow = true;
  top.add(upper);
  top.position.y = 0.85;
  const lower = new THREE.Mesh(new THREE.SphereGeometry(0.3, 20, 10, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), mat(0xffffff, { map: sphereTex }));
  lower.position.y = 0.85;
  lower.castShadow = true;
  const inside = cyl(0.28, 0.28, 0.01, 0x6b3a2a, 0, 0.845, 0);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.33, 0.015, 6, 32), mat(GOLD, { metal: 0.7, rough: 0.3 }));
  ring.position.y = 0.85;
  ring.rotation.x = Math.PI / 2;
  const g = group(stand, lower, inside, top, ring);
  g.children.forEach((c) => { c.position.z += 0.3; });
  return g;
}

export function grandfatherClock(h: number, m: number): THREE.Group {
  const g = group(hollow(0.6, 2.1, 0.4, WOOD_D), box(0.7, 0.12, 0.45, shade(WOOD_D, 1.2), 0, 2.1, 0.22));
  const face = wallClock(h, m, GOLD);
  face.scale.setScalar(0.75);
  face.position.set(0, 1.75, 0.38);
  g.add(face, box(0.52, 0.02, 0.36, WOOD_D, 0, 1.45, 0.2));
  const pend = named(new THREE.Group(), 'pendulum');
  pend.position.set(0, 1.4, 0.39);
  pend.add(cyl(0.008, 0.008, 0.7, GOLD, 0, -0.75, 0), cyl(0.07, 0.07, 0.02, GOLD, 0, -0.78, 0.01).rotateX(Math.PI / 2));
  g.add(pend);
  const d = hinge(-0.22, 0.4, 0.41);
  d.add(box(0.44, 1.1, 0.03, mat(0xbfd9e6, { opacity: 0.35, rough: 0.05 }), 0.22, 0, 0.015), box(0.44, 0.04, 0.035, GOLD, 0.22, 1.08, 0.015), box(0.44, 0.04, 0.035, GOLD, 0.22, 0, 0.015));
  g.add(named(d, 'door'));
  return g;
}

export function safe(): THREE.Group {
  const g = group(box(0.62, 0.62, 0.08, 0x3d4852, 0, 0, 0.04));
  const d = hinge(-0.28, 0.03, 0.09);
  const dial = cyl(0.09, 0.09, 0.04, 0xb8bec6, 0.28, 0.28, 0.04);
  dial.rotation.x = Math.PI / 2;
  d.add(box(0.56, 0.56, 0.05, 0x55616d, 0.28, 0, 0.025), dial, box(0.04, 0.16, 0.04, 0xb8bec6, 0.48, 0.2, 0.06));
  g.add(named(d, 'door'), box(0.5, 0.5, 0.02, 0x1d2227, 0, 0.06, 0.08));
  return g;
}

export function armchair(color = 0x9c3d3d): THREE.Group {
  const g = group(box(0.9, 0.4, 0.8, color, 0, 0.1, 0.45), box(0.9, 0.8, 0.2, shade(color, 0.9), 0, 0.3, 0.12));
  for (const x of [-0.42, 0.42]) g.add(box(0.14, 0.55, 0.8, shade(color, 0.85), x, 0.1, 0.45));
  return g;
}

export function magnifier(): THREE.Group {
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.01, 8, 20), mat(GOLD, { metal: 0.7, rough: 0.3 }));
  const lens = cyl(0.055, 0.055, 0.005, mat(0xcfefff, { opacity: 0.5, rough: 0.05 }));
  lens.rotation.x = Math.PI / 2;
  const handle = cyl(0.012, 0.012, 0.12, WOOD_D, 0, -0.18, 0);
  ring.rotation.x = Math.PI / 2;
  lens.rotation.x = 0;
  const g = group(ring, lens, handle);
  g.rotation.x = -Math.PI / 2;
  g.position.y = 0.02;
  return group(g);
}

export function safeHandle(): THREE.Group {
  const hub = cyl(0.04, 0.04, 0.03, 0xb8bec6);
  const g = group(hub);
  for (let i = 0; i < 3; i++) {
    const s = box(0.12, 0.015, 0.015, 0xb8bec6, 0, 0.015, 0);
    s.rotation.y = (i / 3) * Math.PI;
    g.add(s);
  }
  return g;
}

export function bigKey(): THREE.Group {
  const k = smallKey(0xc9a23a);
  k.scale.setScalar(3);
  return group(k);
}

// ---------- attic ----------

export function roofBeam(len: number): THREE.Mesh { return box(len, 0.22, 0.22, 0x6e4a2f); }

export function roofWindow(open: boolean): THREE.Group {
  const g = group(box(1.2, 0.9, 0.08, WOOD_D));
  const glass = picture(1.0, 0.7, (c, W, H) => {
    const gr = c.createLinearGradient(0, 0, 0, H);
    gr.addColorStop(0, '#1b2a55'); gr.addColorStop(1, '#f6a96b');
    c.fillStyle = gr; c.fillRect(0, 0, W, H);
    c.fillStyle = '#fffbe0';
    for (let i = 0; i < 12; i++) c.fillRect((i * 53) % W, (i * 29) % (H * 0.5), 2, 2);
    c.beginPath(); c.arc(W * 0.75, H * 0.28, 16, 0, Math.PI * 2); c.fill();
  });
  (glass.material as THREE.MeshStandardMaterial).emissive = new THREE.Color(0x444455);
  glass.position.set(0, 0.45, 0.041);
  const sash = named(hinge(0, 0.9, 0.08, box(1.1, 0.8, 0.05, mat(0xcfe4ee, { opacity: 0.4 }), 0, -0.8, 0.025)), 'sash');
  if (open) sash.rotation.x = -1.2;
  g.add(glass, sash);
  return g;
}

export function fuseBox(): THREE.Group {
  const g = group(box(0.5, 0.65, 0.15, 0x7d8a96, 0, 0, 0.08), box(0.44, 0.58, 0.02, 0x2d3339, 0, 0.035, 0.16));
  for (let r = 0; r < 3; r++) for (let q = 0; q < 3; q++) g.add(box(0.06, 0.1, 0.04, 0x222222, (q - 1) * 0.12, 0.13 + r * 0.16, 0.17));
  const d = hinge(-0.25, 0, 0.16);
  d.add(box(0.5, 0.65, 0.03, 0x93a1ad, 0.25, 0, 0.015), box(0.12, 0.12, 0.01, 0xffd23f, 0.25, 0.45, 0.035));
  g.add(named(d, 'door'));
  return g;
}

export function chest(color = 0x8a5a3b): THREE.Group {
  const g = group(box(1.0, 0.5, 0.55, color, 0, 0, 0.28));
  for (const x of [-0.4, 0.4]) g.add(box(0.06, 0.52, 0.57, 0x3d3d3d, x, 0, 0.28));
  const lid = hinge(0, 0.5, 0.02);
  const top = cyl(0.28, 0.28, 1.0, color, 0, 0, 0, 12);
  top.rotation.z = Math.PI / 2;
  top.scale.set(1, 1, 1);
  top.position.set(0, 0, 0.26);
  top.scale.set(1, 1.0, 0.5);
  lid.add(top);
  g.add(named(lid, 'lid'));
  g.add(box(0.1, 0.12, 0.04, GOLD, 0, 0.36, 0.56));
  return g;
}

export function cardboardBox(label: string, w = 0.6, h = 0.45): THREE.Group {
  const g = group(box(w, h, 0.5, 0xc79a5e, 0, 0, 0.25), box(w + 0.01, 0.05, 0.1, 0xe0c28b, 0, h - 0.05, 0.25));
  const p = named(picture(0.3, 0.3, (c, W) => { text(c, label, W / 2, W / 2, W * 0.7, '#8a2b1b', 900); }, 128, true), 'label');
  p.position.set(0, h / 2, 0.505);
  g.add(p);
  return g;
}

export function ladder(): THREE.Group {
  const g = new THREE.Group();
  for (const x of [-0.22, 0.22]) g.add(box(0.06, 2.2, 0.06, 0xb08a5a, x, 0, 0));
  for (let i = 0; i < 7; i++) g.add(box(0.44, 0.04, 0.04, 0x9a7446, 0, 0.2 + i * 0.3, 0));
  return g;
}

export function chain(): THREE.Group {
  const g = new THREE.Group();
  for (let i = 0; i < 8; i++) {
    const l = new THREE.Mesh(new THREE.TorusGeometry(0.035, 0.01, 6, 10), mat(0x9aa3ad, { metal: 0.8, rough: 0.4 }));
    l.position.set(-0.3 + i * 0.08, 0, 0);
    l.rotation.y = i % 2 ? Math.PI / 2 : 0;
    g.add(l);
  }
  return g;
}

export function shelf(w = 1.4, levels = 3, color = WOOD): THREE.Group {
  const g = new THREE.Group();
  for (let i = 0; i < levels; i++) g.add(box(w, 0.04, 0.3, color, 0, 0.6 + i * 0.5, 0.15));
  for (const x of [-w / 2, w / 2]) g.add(box(0.04, 0.5 * levels + 0.3, 0.3, shade(color, 0.85), x, 0.3, 0.15));
  return g;
}

export function jar(color = 0xcfe9d8, lidColor = 0xc0504d): THREE.Group {
  const g = group(cyl(0.08, 0.08, 0.2, mat(color, { opacity: 0.55, rough: 0.1 })));
  g.add(named(cyl(0.085, 0.085, 0.04, lidColor, 0, 0.2, 0), 'lid'));
  return g;
}

export function flashlight(): THREE.Group {
  const body = cyl(0.03, 0.03, 0.22, 0x2d6fb5);
  const head = cyl(0.05, 0.035, 0.07, 0x2d6fb5, 0, 0.22, 0);
  const lens = cyl(0.045, 0.045, 0.005, mat(0xfff9d9, { emissive: 0x333322 }), 0, 0.29, 0);
  const g = group(body, head, lens);
  g.rotation.z = Math.PI / 2;
  g.position.y = 0.05;
  return group(g);
}

export function rag(): THREE.Mesh {
  const m = box(0.25, 0.02, 0.2, 0xd9c7a1);
  m.rotation.y = 0.4;
  return m;
}

export function tuna(): THREE.Group {
  const g = group(cyl(0.07, 0.07, 0.06, 0xc0c6cc), cyl(0.071, 0.071, 0.04, 0x3a86c8, 0, 0.01, 0));
  return g;
}

export function dustyMirror(): THREE.Group {
  const g = group(box(0.8, 1.5, 0.05, 0x8a6a3b));
  const glass = new THREE.Mesh(new THREE.PlaneGeometry(0.66, 1.36), mat(0xb9cdd6, { rough: 0.1, metal: 0.5 }));
  glass.position.set(0, 0.75, 0.026);
  const dust = named(new THREE.Mesh(new THREE.PlaneGeometry(0.66, 1.36), mat(0x8c8272, { opacity: 0.92 })), 'dust');
  dust.position.set(0, 0.75, 0.03);
  g.add(glass, dust);
  return g;
}

// ---------- shared ----------

export function goldFishModel(): THREE.Group {
  const m = mat(0xffc93c, { metal: 0.6, rough: 0.25, emissive: 0x6b4a00 });
  const body = ball(1, m);
  body.scale.set(0.1, 0.065, 0.035);
  const tail = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.08, 4), m);
  tail.rotation.z = Math.PI / 2;
  tail.position.x = -0.12;
  const eye = ball(0.01, 0x111111, 0.06, 0.02, 0.03);
  const g = group(body, tail, eye);
  g.position.y = 0.08;
  const glow = new THREE.PointLight(0xffd76a, 0.6, 0.8);
  glow.position.y = 0.1;
  return group(g, glow);
}

export function ceilingLamp(light: number): THREE.Group {
  const cord = cyl(0.01, 0.01, 0.5, 0x333333, 0, -0.5, 0);
  const shadeM = cyl(0.12, 0.35, 0.25, mat(0xf2e3c6, { side: THREE.DoubleSide }), 0, -0.75, 0);
  const bulb = ball(0.07, mat(light, { emissive: 0xffe0a0 }), 0, -0.72, 0);
  return group(cord, shadeM, bulb);
}

export function noteCanvas(lines: string[]): THREE.Mesh {
  return picture(0.3, 0.4, (c, W, H) => {
    c.fillStyle = '#fffbe8'; c.fillRect(0, 0, W, H);
    lines.forEach((l, i) => text(c, l, W / 2, H * (0.25 + i * 0.2), W * 0.1, '#333', 700));
  });
}

export function stickyNote(color = 0xfff176): THREE.Mesh {
  return box(0.12, 0.12, 0.005, color);
}

export function catBed(color = 0xc0504d): THREE.Group {
  const g = group(cyl(0.38, 0.34, 0.12, color, 0, 0, 0.4, 16), cyl(0.3, 0.3, 0.05, 0xf5e6d0, 0, 0.1, 0.4, 16));
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.33, 0.07, 8, 20), mat(color));
  rim.rotation.x = Math.PI / 2;
  rim.position.set(0, 0.14, 0.4);
  g.add(rim);
  return g;
}

/** Invisible box used as a bigger, easier tap target. */
export function hitbox(w: number, h: number, d: number): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }));
  m.position.set(0, h / 2, d / 2);
  return m;
}

export function roundedLabel(txt: string, w = 0.5, h = 0.2, bg = '#fff', fg = '#333'): THREE.Mesh {
  return picture(w, h, (c, W, H) => {
    roundRect(c, 2, 2, W - 4, H - 4, H * 0.2);
    c.fillStyle = bg; c.fill();
    text(c, txt, W / 2, H / 2, H * 0.55, fg, 900);
  }, 128, true);
}
