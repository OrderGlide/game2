// Horror props: containers that hide things (each with its own opening animation and metadata for the level
// generator), clue carriers, lock devices, tools, creepy decoration and the shadow figure used in scares.
// Every model's origin is the bottom-centre of its back side and it faces +z, like the rest of the furniture.
import * as THREE from 'three';
import type { Sfx } from '../audio';
import { ball, box, canvasTex, cyl, drawGrime, drawScrawl, group, hex, hinge, mat, mulberry32, picture, shade, text } from './kit';
import { hollow, named, slide, swing } from './furniture';

const RUST = 0x6b4a3a;
const IRON = 0x4a4f55;
const STEEL = 0x8a9097;
const OLDWOOD = 0x5a4130;
const PAPER = 0xd9ceb0;

export interface Names { pl: string; plAcc: string; en: string }

export interface Container {
  node: THREE.Group;
  /** footprint width along the wall */
  w: number;
  mount: 'floor' | 'wall';
  /** bottom height for wall-mounted containers */
  wallY: number;
  /** where contents sit when open (relative: u along the wall, y up, out from the wall) */
  inside: { u: number; y: number; out: number };
  zoom: { y: number; out: number; dist: number; look: number };
  /** where a lock device hangs (relative) */
  lockAt: { u: number; y: number; out: number };
  open(node: THREE.Object3D, open: boolean, k: number): void;
  sound: Sfx;
  name: Names;
}

// ---------- containers ----------

export function cabinet(color = OLDWOOD): Container {
  const g = group(hollow(1.1, 1.9, 0.5, color), box(1.02, 0.03, 0.46, shade(color, 0.8), 0, 0.95, 0.25));
  for (const s of [-1, 1]) {
    const h = hinge(s * 0.55, 0.03, 0.51);
    h.add(box(0.54, 1.84, 0.035, shade(color, 1.08), -s * 0.27, 0, 0.017), ball(0.025, 0x8a7a50, -s * 0.47, 0.95, 0.05));
    h.name = s < 0 ? 'doorL' : 'doorR';
    g.add(h);
  }
  return {
    node: g, w: 1.1, mount: 'floor', wallY: 0,
    inside: { u: 0, y: 0.98, out: 0.25 }, zoom: { y: 1.0, out: 0.3, dist: 1.8, look: 0.2 }, lockAt: { u: 0, y: 0.95, out: 0.58 },
    open: (n, o, k) => { swing(n, 'doorL', o ? -1.8 : 0, k); swing(n, 'doorR', o ? 1.8 : 0, k); },
    sound: 'creak', name: { pl: 'szafa', plAcc: 'szafę', en: 'wardrobe' },
  };
}

export function locker(color = 0x4f6b62): Container {
  const g = group(hollow(0.6, 1.95, 0.5, color), box(0.52, 0.03, 0.46, shade(color, 0.8), 0, 1.35, 0.25));
  const d = hinge(-0.3, 0.03, 0.51);
  const m = mat(shade(color, 1.1), { metal: 0.5, rough: 0.5 });
  d.add(box(0.58, 1.88, 0.03, m, 0.29, 0, 0.015));
  for (let i = 0; i < 5; i++) d.add(box(0.3, 0.02, 0.01, 0x222222, 0.29, 1.55 + i * 0.05, 0.035));
  d.add(box(0.04, 0.14, 0.04, STEEL, 0.5, 0.95, 0.04));
  g.add(named(d, 'door'));
  return {
    node: g, w: 0.6, mount: 'floor', wallY: 0,
    inside: { u: 0, y: 1.38, out: 0.25 }, zoom: { y: 1.4, out: 0.3, dist: 1.4, look: 0.15 }, lockAt: { u: 0.2, y: 0.95, out: 0.56 },
    open: (n, o, k) => swing(n, 'door', o ? -1.9 : 0, k),
    sound: 'metal', name: { pl: 'szafka metalowa', plAcc: 'metalową szafkę', en: 'locker' },
  };
}

export function drawers(color = OLDWOOD): Container {
  const g = group(box(1.0, 0.9, 0.5, color, 0, 0, 0.25), box(1.04, 0.04, 0.54, shade(color, 0.8), 0, 0.9, 0.27));
  for (let i = 0; i < 2; i++) g.add(box(0.94, 0.24, 0.02, shade(color, 1.1), 0, 0.08 + i * 0.28, 0.505), ball(0.022, 0x8a7a50, 0, 0.2 + i * 0.28, 0.52));
  const dr = named(group(box(0.94, 0.2, 0.46, shade(color, 1.12), 0, 0.64, 0.26), box(0.9, 0.01, 0.42, shade(color, 0.6), 0, 0.84, 0.26), ball(0.022, 0x8a7a50, 0, 0.74, 0.5)), 'drawer');
  g.add(dr);
  return {
    node: g, w: 1.0, mount: 'floor', wallY: 0,
    inside: { u: 0, y: 0.86, out: 0.62 }, zoom: { y: 0.8, out: 0.6, dist: 1.2, look: 0.6 }, lockAt: { u: 0, y: 0.74, out: 0.53 },
    open: (n, o, k) => slide(n, 'drawer', o ? 0.36 : 0, k),
    sound: 'drawer', name: { pl: 'komoda', plAcc: 'komodę', en: 'chest of drawers' },
  };
}

export function desk(color = OLDWOOD): Container {
  const g = group(box(1.3, 0.06, 0.65, color, 0, 0.74, 0.33));
  for (const x of [-0.6, 0.6]) g.add(box(0.06, 0.74, 0.06, shade(color, 0.8), x, 0, 0.05), box(0.06, 0.74, 0.06, shade(color, 0.8), x, 0, 0.6));
  g.add(box(0.5, 0.2, 0.6, shade(color, 0.9), 0.35, 0.54, 0.32));
  const dr = named(group(box(0.44, 0.15, 0.55, shade(color, 1.12), 0.35, 0.56, 0.33), box(0.4, 0.01, 0.5, shade(color, 0.6), 0.35, 0.71, 0.33), ball(0.02, 0x8a7a50, 0.35, 0.63, 0.62)), 'drawer');
  g.add(dr);
  // clutter on top
  g.add(box(0.25, 0.04, 0.18, PAPER, -0.3, 0.8, 0.3), cyl(0.04, 0.035, 0.1, 0xd8d0c0, -0.05, 0.8, 0.45));
  return {
    node: g, w: 1.3, mount: 'floor', wallY: 0,
    inside: { u: 0.35, y: 0.73, out: 0.65 }, zoom: { y: 0.72, out: 0.6, dist: 1.3, look: 0.6 }, lockAt: { u: 0.35, y: 0.63, out: 0.64 },
    open: (n, o, k) => slide(n, 'drawer', o ? 0.34 : 0, k),
    sound: 'drawer', name: { pl: 'biurko', plAcc: 'biurko', en: 'desk' },
  };
}

export function trunk(color = 0x5c3a28): Container {
  const g = group(box(0.9, 0.06, 0.5, color, 0, 0, 0.25), box(0.9, 0.48, 0.05, color, 0, 0, 0.025), box(0.9, 0.48, 0.05, color, 0, 0, 0.475));
  g.add(box(0.05, 0.48, 0.5, color, -0.425, 0, 0.25), box(0.05, 0.48, 0.5, color, 0.425, 0, 0.25), box(0.8, 0.01, 0.4, 0x2a1a12, 0, 0.061, 0.25));
  for (const x of [-0.3, 0.3]) g.add(box(0.06, 0.5, 0.52, IRON, x, 0, 0.25));
  const lid = hinge(0, 0.48, 0.01);
  lid.add(box(0.92, 0.1, 0.52, shade(color, 1.1), 0, 0, 0.25));
  for (const x of [-0.3, 0.3]) lid.add(box(0.06, 0.11, 0.53, IRON, x, 0, 0.25));
  g.add(named(lid, 'lid'));
  return {
    node: g, w: 0.9, mount: 'floor', wallY: 0,
    inside: { u: 0, y: 0.07, out: 0.25 }, zoom: { y: 0.3, out: 0.3, dist: 1.3, look: 0.9 }, lockAt: { u: 0, y: 0.34, out: 0.52 },
    open: (n, o, k) => swing(n, 'lid', o ? -1.7 : 0, k, 'x'),
    sound: 'creak', name: { pl: 'kufer', plAcc: 'kufer', en: 'trunk' },
  };
}

/** Wooden crate with its lid nailed down by boards (a hammer pulls them off). */
export function crate(color = 0x8a6a45): Container {
  const g = group(box(0.8, 0.05, 0.6, color, 0, 0, 0.3));
  for (const [w, d, x, z] of [[0.8, 0.04, 0, 0.02], [0.8, 0.04, 0, 0.58], [0.04, 0.6, -0.38, 0.3], [0.04, 0.6, 0.38, 0.3]] as const) {
    for (let i = 0; i < 3; i++) g.add(box(w, 0.2, d, shade(color, 0.9 + (i % 2) * 0.15), x, 0.02 + i * 0.22, z));
  }
  g.add(box(0.7, 0.01, 0.5, 0x2a1a12, 0, 0.051, 0.3));
  const lid = hinge(0, 0.68, 0.02);
  lid.add(box(0.82, 0.04, 0.6, shade(color, 1.1), 0, 0, 0.29));
  g.add(named(lid, 'lid'));
  const boards = named(group(), 'boards');
  for (const r of [-0.4, 0.45]) { const b = box(0.95, 0.03, 0.1, 0x6e4a2f, 0, 0.71, 0.3); b.rotation.y = r; boards.add(b); }
  g.add(boards);
  return {
    node: g, w: 0.8, mount: 'floor', wallY: 0,
    inside: { u: 0, y: 0.06, out: 0.3 }, zoom: { y: 0.4, out: 0.3, dist: 1.2, look: 0.9 }, lockAt: { u: 0, y: 0.4, out: 0.61 },
    open: (n, o, k) => { swing(n, 'lid', o ? -1.6 : 0, k, 'x'); n.getObjectByName('boards')!.visible = !o; },
    sound: 'creak', name: { pl: 'zabita deskami skrzynia', plAcc: 'zabitą deskami skrzynię', en: 'boarded-up crate' },
  };
}

export function wallSafe(): Container {
  const g = group(box(0.62, 0.62, 0.08, 0x2e3338, 0, 0, 0.04), box(0.5, 0.5, 0.02, 0x121518, 0, 0.06, 0.07));
  const d = hinge(-0.28, 0.03, 0.09);
  const dial = cyl(0.08, 0.08, 0.04, STEEL, 0.28, 0.28, 0.04);
  dial.rotation.x = Math.PI / 2;
  d.add(box(0.56, 0.56, 0.05, 0x3e464e, 0.28, 0, 0.025), dial, box(0.04, 0.16, 0.04, STEEL, 0.48, 0.2, 0.06));
  g.add(named(d, 'door'));
  return {
    node: g, w: 0.62, mount: 'wall', wallY: 1.15,
    inside: { u: 0, y: 0.1, out: 0.06 }, zoom: { y: 0.3, out: 0.1, dist: 1.2, look: 0 }, lockAt: { u: 0.1, y: 0.28, out: 0.12 },
    open: (n, o, k) => swing(n, 'door', o ? -1.7 : 0, k),
    sound: 'metal', name: { pl: 'sejf w ścianie', plAcc: 'sejf w ścianie', en: 'wall safe' },
  };
}

export function medCabinet(): Container {
  const g = group(hollow(0.6, 0.7, 0.18, 0xd8d8cc), box(0.52, 0.02, 0.14, 0xbdbdb2, 0, 0.33, 0.1));
  const d = hinge(-0.3, 0.02, 0.19);
  const glass = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.6), mat(0x9fb3b8, { metal: 0.6, rough: 0.15 }));
  glass.position.set(0.3, 0.33, 0.02);
  d.add(box(0.6, 0.66, 0.025, 0xe6e6dc, 0.3, 0, 0.012), glass);
  g.add(named(d, 'door'));
  g.add(picture(0.12, 0.12, (c, W) => { c.fillStyle = '#b01010'; c.fillRect(W * 0.38, 0, W * 0.24, W); c.fillRect(0, W * 0.38, W, W * 0.24); }, 64, true));
  g.children[g.children.length - 1].position.set(0, 0.8, 0.02);
  return {
    node: g, w: 0.6, mount: 'wall', wallY: 1.1,
    inside: { u: 0, y: 0.35, out: 0.08 }, zoom: { y: 0.4, out: 0.1, dist: 1.1, look: 0 }, lockAt: { u: 0.2, y: 0.33, out: 0.22 },
    open: (n, o, k) => swing(n, 'door', o ? -1.8 : 0, k),
    sound: 'open', name: { pl: 'apteczka', plAcc: 'apteczkę', en: 'medicine cabinet' },
  };
}

/** Air vent low on the wall, held by four screws. */
export function vent(): Container {
  const g = group(box(0.64, 0.44, 0.02, 0x0c0c0c, 0, 0, 0.01), box(0.6, 0.02, 0.25, 0x1a1a1a, 0, 0.0, -0.1));
  const grate = hinge(0, 0, 0.03);
  const m = mat(0x9a9a92, { metal: 0.5, rough: 0.6 });
  grate.add(box(0.66, 0.04, 0.02, m, 0, 0, 0.01), box(0.66, 0.04, 0.02, m, 0, 0.42, 0.01), box(0.04, 0.46, 0.02, m, -0.31, 0, 0.01), box(0.04, 0.46, 0.02, m, 0.31, 0, 0.01));
  for (let i = 0; i < 6; i++) grate.add(box(0.58, 0.02, 0.02, m, 0, 0.07 + i * 0.06, 0.012));
  for (const [x, y] of [[-0.29, 0.02], [0.29, 0.02], [-0.29, 0.42], [0.29, 0.42]]) grate.add(cyl(0.012, 0.012, 0.015, 0x444444, x, y, 0.025).rotateX(Math.PI / 2));
  g.add(named(grate, 'grate'));
  return {
    node: g, w: 0.66, mount: 'wall', wallY: 0.22,
    inside: { u: 0, y: 0.03, out: 0.05 }, zoom: { y: 0.2, out: 0.1, dist: 1.1, look: 0.3 }, lockAt: { u: 0, y: 0.2, out: 0.05 },
    open: (n, o, k) => swing(n, 'grate', o ? 1.45 : 0, k, 'x'),
    sound: 'metal', name: { pl: 'kratka wentylacyjna', plAcc: 'kratkę wentylacyjną', en: 'air vent' },
  };
}

export function toolbox(): Container {
  const g = group(box(0.5, 0.22, 0.26, 0xa33a2a, 0, 0, 0.13), box(0.46, 0.005, 0.22, 0x221111, 0, 0.221, 0.13));
  const lid = hinge(0, 0.22, 0.01);
  lid.add(box(0.52, 0.05, 0.27, 0xb8452f, 0, 0, 0.13), box(0.25, 0.03, 0.03, 0x333333, 0, 0.07, 0.13));
  g.add(named(lid, 'lid'));
  return {
    node: g, w: 0.5, mount: 'floor', wallY: 0,
    inside: { u: 0, y: 0.23, out: 0.13 }, zoom: { y: 0.2, out: 0.2, dist: 1.0, look: 0.8 }, lockAt: { u: 0, y: 0.12, out: 0.27 },
    open: (n, o, k) => swing(n, 'lid', o ? -1.8 : 0, k, 'x'),
    sound: 'metal', name: { pl: 'skrzynka na narzędzia', plAcc: 'skrzynkę na narzędzia', en: 'toolbox' },
  };
}

/** A coffin standing upright against the wall. */
export function coffin(color = 0x3a2418): Container {
  const shape = new THREE.Shape();
  shape.moveTo(-0.22, 0); shape.lineTo(0.22, 0); shape.lineTo(0.34, 1.35); shape.lineTo(0.24, 1.95); shape.lineTo(-0.24, 1.95); shape.lineTo(-0.34, 1.35); shape.closePath();
  const back = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth: 0.08, bevelEnabled: false }), mat(color));
  const inner = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth: 0.01, bevelEnabled: false }), mat(0x6a1a1a));
  inner.position.z = 0.081;
  inner.scale.set(0.88, 0.96, 1);
  inner.position.y = 0.04;
  const sideL = box(0.05, 1.9, 0.4, color, -0.3, 0, 0.25);
  const sideR = box(0.05, 1.9, 0.4, color, 0.3, 0, 0.25);
  const g = group(back, inner, sideL, sideR, box(0.5, 0.05, 0.4, color, 0, 0, 0.25), box(0.46, 0.03, 0.34, shade(color, 0.8), 0, 1.0, 0.25));
  const lid = hinge(-0.34, 0, 0.45);
  const lidM = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth: 0.05, bevelEnabled: false }), mat(shade(color, 1.15)));
  lidM.position.x = 0.34;
  lidM.castShadow = true;
  lid.add(lidM, box(0.04, 0.4, 0.02, 0x8a7a50, 0.34, 1.2, 0.06), box(0.2, 0.04, 0.02, 0x8a7a50, 0.34, 1.34, 0.06));
  g.add(named(lid, 'lid'));
  return {
    node: g, w: 0.7, mount: 'floor', wallY: 0,
    inside: { u: 0, y: 1.03, out: 0.25 }, zoom: { y: 1.1, out: 0.3, dist: 1.6, look: 0.15 }, lockAt: { u: 0.15, y: 1.0, out: 0.52 },
    open: (n, o, k) => swing(n, 'lid', o ? -1.9 : 0, k),
    sound: 'creak', name: { pl: 'trumna', plAcc: 'trumnę', en: 'coffin' },
  };
}

/** A painting that swings aside to reveal a niche in the wall. */
export function hiddenPainting(rnd: () => number): Container {
  const niche = group(box(0.5, 0.4, 0.02, 0x100c0a, 0, 0.05, 0.005));
  const frame = hinge(-0.35, 0, 0.03);
  const p = portrait(rnd);
  p.position.x = 0.35;
  frame.add(p);
  const g = group(niche, named(frame, 'frame'));
  return {
    node: g, w: 0.7, mount: 'wall', wallY: 1.2,
    inside: { u: 0, y: 0.1, out: 0.03 }, zoom: { y: 0.35, out: 0.1, dist: 1.2, look: 0 }, lockAt: { u: 0, y: 0.3, out: 0.1 },
    open: (n, o, k) => swing(n, 'frame', o ? -1.3 : 0, k),
    sound: 'creak', name: { pl: 'portret', plAcc: 'portret', en: 'portrait' },
  };
}

/** Loose floorboards near the wall. */
export function floorboards(): Container {
  const g = group(box(0.7, 0.005, 0.5, 0x0e0906, 0, 0.001, 0.3));
  const lid = hinge(0, 0.01, 0.05);
  for (let i = 0; i < 3; i++) lid.add(box(0.22, 0.03, 0.5, shade(0x6a4a32, 0.9 + i * 0.06), -0.23 + i * 0.23, 0, 0.25));
  g.add(named(lid, 'lid'));
  return {
    node: g, w: 0.7, mount: 'floor', wallY: 0,
    inside: { u: 0, y: 0.01, out: 0.3 }, zoom: { y: 0.1, out: 0.3, dist: 1.0, look: 0.9 }, lockAt: { u: 0, y: 0.05, out: 0.55 },
    open: (n, o, k) => swing(n, 'lid', o ? -1.9 : 0, k, 'x'),
    sound: 'creak', name: { pl: 'luźne deski podłogi', plAcc: 'luźne deski w podłodze', en: 'loose floorboards' },
  };
}

/** Small box with a sliding-picture lock on its lid. */
export function puzzleBox(): Container {
  const stand = group(box(0.6, 0.7, 0.4, OLDWOOD, 0, 0, 0.2));
  const bx = group(box(0.34, 0.16, 0.26, 0x3a2a4a, 0, 0.7, 0.2), box(0.3, 0.005, 0.22, 0x110b16, 0, 0.861, 0.2));
  const lid = hinge(0, 0.86, 0.07);
  lid.add(box(0.36, 0.03, 0.27, 0x4a3a5a, 0, 0, 0.13));
  for (let i = 0; i < 9; i++) lid.add(box(0.07, 0.01, 0.06, 0xd9ceb0, -0.08 + (i % 3) * 0.08, 0.02, 0.06 + Math.floor(i / 3) * 0.07));
  bx.add(named(lid, 'lid'));
  const g = group(stand, bx);
  return {
    node: g, w: 0.6, mount: 'floor', wallY: 0,
    inside: { u: 0, y: 0.72, out: 0.2 }, zoom: { y: 0.8, out: 0.2, dist: 1.0, look: 0.7 }, lockAt: { u: 0, y: 0.78, out: 0.34 },
    open: (n, o, k) => swing(n, 'lid', o ? -1.8 : 0, k, 'x'),
    sound: 'click', name: { pl: 'szkatułka z układanką', plAcc: 'szkatułkę z układanką', en: 'puzzle box' },
  };
}

// ---------- clue carriers ----------

export function scrawl(lines: string[], w: number, h: number, color = '#7a0808', mirror = false): THREE.Mesh {
  const p = picture(w, h, (c, W, H) => { c.clearRect(0, 0, W, H); drawScrawl(c, lines, W, H, color, mirror); }, 256, true);
  (p.material as THREE.MeshStandardMaterial).depthWrite = false;
  return p;
}

export function chalkboard(lines: string[], w = 1.3, h = 0.85): THREE.Group {
  const g = group(box(w + 0.1, h + 0.1, 0.04, 0x5a3a24, 0, -0.05, 0));
  const p = picture(w, h, (c, W, H) => {
    c.fillStyle = '#1f2a24'; c.fillRect(0, 0, W, H);
    c.globalAlpha = 0.15; c.fillStyle = '#fff';
    for (let i = 0; i < 30; i++) c.fillRect(Math.random() * W, Math.random() * H, 30 + Math.random() * 60, 3);
    c.globalAlpha = 1;
    drawScrawl(c, lines, W, H * 0.9, '#e8e6dc', false, "'Special Elite', 'Courier New', monospace");
  }, 256);
  p.position.set(0, h / 2, 0.021);
  g.add(p);
  return g;
}

export function oldClock(h: number, m: number): THREE.Group {
  const g = new THREE.Group();
  const rim = cyl(0.3, 0.3, 0.07, 0x2e2018, 0, 0, 0.035, 24);
  rim.rotation.x = Math.PI / 2;
  rim.position.set(0, 0, 0.035);
  const face = picture(0.54, 0.54, (c, W) => {
    c.fillStyle = '#d8ccae'; c.beginPath(); c.arc(W / 2, W / 2, W / 2, 0, Math.PI * 2); c.fill();
    drawGrime(c, W, W, 0.6, mulberry32(h * 60 + m), false);
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      text(c, ['XII', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI'][i], W / 2 + Math.sin(a) * W * 0.37, W / 2 - Math.cos(a) * W * 0.37, W * 0.07, '#2a1a10', 700, 'Georgia, serif');
    }
    const hand = (a: number, len: number, wd: number) => {
      c.strokeStyle = '#111'; c.lineWidth = wd; c.lineCap = 'round';
      c.beginPath(); c.moveTo(W / 2, W / 2); c.lineTo(W / 2 + Math.sin(a) * len, W / 2 - Math.cos(a) * len); c.stroke();
    };
    hand(((h % 12) + m / 60) / 12 * Math.PI * 2, W * 0.2, W * 0.035);
    hand((m / 60) * Math.PI * 2, W * 0.32, W * 0.02);
    // a crack across the glass
    c.strokeStyle = 'rgba(255,255,255,0.5)'; c.lineWidth = 1.5;
    c.beginPath(); c.moveTo(W * 0.15, W * 0.3); c.lineTo(W * 0.45, W * 0.45); c.lineTo(W * 0.6, W * 0.4); c.lineTo(W * 0.85, W * 0.62); c.stroke();
  }, 256, true);
  face.position.z = 0.072;
  g.add(rim, face);
  return g;
}

/** Framed painting showing a row of symbols or coloured shapes. */
export function symbolPainting(symbols: string[], colors?: string[]): THREE.Group {
  const w = 0.25 * symbols.length + 0.3;
  const g = group(box(w + 0.12, 0.62, 0.05, 0x3a2410, 0, -0.06, 0));
  const p = picture(w, 0.5, (c, W, H) => {
    const gr = c.createLinearGradient(0, 0, 0, H);
    gr.addColorStop(0, '#2a2030'); gr.addColorStop(1, '#0d0a0e');
    c.fillStyle = gr; c.fillRect(0, 0, W, H);
    symbols.forEach((s, i) => {
      const cx = W / 2 + (i - (symbols.length - 1) / 2) * (W * 0.84 / symbols.length);
      if (colors) { c.fillStyle = colors[i]; c.beginPath(); c.arc(cx, H / 2, H * 0.24, 0, Math.PI * 2); c.fill(); }
      else text(c, s, cx, H / 2, H * 0.5, '#c9b27a', 400, "'Special Elite', Georgia, serif");
    });
    drawGrime(c, W, H, 0.5, mulberry32(symbols.length * 17), false);
  }, 256);
  p.position.set(0, 0.25, 0.026);
  g.add(p);
  return g;
}

export function portrait(rnd: () => number): THREE.Group {
  const g = group(box(0.62, 0.8, 0.05, 0x3a2410, 0, -0.06, 0));
  const hue = Math.floor(rnd() * 360);
  const p = picture(0.5, 0.68, (c, W, H) => {
    c.fillStyle = `hsl(${hue},20%,14%)`; c.fillRect(0, 0, W, H);
    c.fillStyle = `hsl(${hue},12%,${24 + rnd() * 10}%)`;
    c.beginPath(); c.ellipse(W / 2, H * 0.95, W * 0.42, H * 0.35, 0, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#cdb89a';
    c.beginPath(); c.ellipse(W / 2, H * 0.42, W * 0.2, H * 0.19, 0, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#1a1210';
    c.beginPath(); c.ellipse(W / 2, H * 0.3, W * 0.23, H * 0.1, 0, Math.PI, Math.PI * 2); c.fill();
    // hollow eyes
    for (const s of [-1, 1]) { c.fillStyle = '#0a0606'; c.beginPath(); c.ellipse(W / 2 + s * W * 0.075, H * 0.41, W * 0.04, H * 0.022, 0, 0, Math.PI * 2); c.fill(); }
    drawGrime(c, W, H, 0.7, rnd, false);
  }, 256);
  p.position.set(0, 0.34, 0.026);
  g.add(p);
  return g;
}

/** Old CRT television: static until there is power, then it shows `lines`. */
export function crtTv(lines: string[]): THREE.Group {
  const g = group(box(0.8, 0.5, 0.45, 0x3a2e24, 0, 0, 0.23), box(0.64, 0.5, 0.5, 0x2a2a2a, 0, 0.5, 0.25));
  const off = named(picture(0.52, 0.38, (c, W, H) => {
    c.fillStyle = '#151a18'; c.fillRect(0, 0, W, H);
    for (let i = 0; i < 1500; i++) { c.fillStyle = `rgba(200,210,200,${Math.random() * 0.35})`; c.fillRect(Math.random() * W, Math.random() * H, 2, 2); }
  }), 'off');
  off.position.set(-0.03, 0.75, 0.505);
  const on = named(picture(0.52, 0.38, (c, W, H) => {
    c.fillStyle = '#0c2a14'; c.fillRect(0, 0, W, H);
    lines.forEach((l, i) => text(c, l, W / 2, H * (0.5 + (i - (lines.length - 1) / 2) * 0.3), H * 0.2, '#7dff9a', 700, "'Special Elite', monospace"));
    for (let y = 0; y < H; y += 4) { c.fillStyle = 'rgba(0,0,0,0.25)'; c.fillRect(0, y, W, 2); }
  }), 'on');
  (on.material as THREE.MeshStandardMaterial).emissive = new THREE.Color(0x2a6a3a);
  on.position.copy(off.position);
  g.add(off, on, cyl(0.03, 0.03, 0.03, 0x888888, 0.27, 0.85, 0.5).rotateX(Math.PI / 2), cyl(0.03, 0.03, 0.03, 0x888888, 0.27, 0.72, 0.5).rotateX(Math.PI / 2));
  return g;
}

/** A row of numbered candles in different colours on a small shelf (colour-order clue). */
export function candleRow(colors: string[], nums: number[]): THREE.Group {
  const g = group(box(0.25 * colors.length + 0.15, 0.04, 0.2, OLDWOOD, 0, 0, 0.1));
  colors.forEach((col, i) => {
    const x = (i - (colors.length - 1) / 2) * 0.25;
    const h = 0.2 + ((i * 7) % 3) * 0.05;
    g.add(cyl(0.035, 0.04, h, parseInt(col.slice(1), 16), x, 0.04, 0.1));
    const flame = new THREE.Mesh(new THREE.ConeGeometry(0.015, 0.05, 6), mat(0xffb040, { emissive: 0xff8a00 }));
    flame.position.set(x, 0.04 + h + 0.03, 0.1);
    g.add(flame);
    const tag = picture(0.09, 0.09, (c, W) => { c.fillStyle = '#d9ceb0'; c.fillRect(0, 0, W, W); text(c, String(nums[i]), W / 2, W / 2, W * 0.7, '#2a1a10', 900); }, 64);
    tag.position.set(x, 0.02, 0.21);
    g.add(tag);
  });
  const light = new THREE.PointLight(0xffa040, 1.2, 2.5, 2);
  light.position.set(0, 0.45, 0.25);
  g.add(light);
  return g;
}

// ---------- locks on doors / containers ----------

export function chainLock(): THREE.Group {
  const g = new THREE.Group();
  for (let i = 0; i < 9; i++) {
    const l = new THREE.Mesh(new THREE.TorusGeometry(0.04, 0.012, 6, 10), mat(0x7a7f85, { metal: 0.8, rough: 0.4 }));
    l.position.set(-0.32 + i * 0.08, Math.sin(i / 8 * Math.PI) * -0.06, 0);
    l.rotation.y = i % 2 ? Math.PI / 2 : 0;
    g.add(l);
  }
  const pl = box(0.12, 0.14, 0.05, 0x5a5f65, 0, -0.16, 0.02);
  g.add(pl);
  return g;
}

export function boardsLock(): THREE.Group {
  const g = new THREE.Group();
  for (const [r, y] of [[0.25, 0.1], [-0.2, -0.2]] as const) {
    const b = box(1.0, 0.12, 0.04, 0x6e4a2f, 0, y, 0.02);
    b.rotation.z = r;
    g.add(b);
    for (const s of [-1, 1]) g.add(cyl(0.012, 0.012, 0.02, 0x333333, s * 0.4, y + s * r * 0.4 + 0.06, 0.05).rotateX(Math.PI / 2));
  }
  return g;
}

export function electroLock(): THREE.Group {
  const g = group(box(0.26, 0.36, 0.06, 0x2a2e33));
  const screen = named(box(0.2, 0.07, 0.01, mat(0x3a0000, { emissive: 0x550000 }), 0, 0.26, 0.06), 'led');
  g.add(screen);
  for (let r = 0; r < 4; r++) for (let q = 0; q < 3; q++) g.add(box(0.05, 0.04, 0.02, 0x9aa0a8, (q - 1) * 0.065, 0.03 + r * 0.055, 0.06));
  return g;
}

// ---------- tools & items (3D pickups) ----------

export function hammer(): THREE.Group {
  const h = cyl(0.015, 0.015, 0.3, 0x7a5030);
  h.rotation.z = Math.PI / 2;
  h.position.set(0, 0.02, 0);
  const head = box(0.05, 0.05, 0.14, IRON, 0.16, 0, 0);
  return group(h, head);
}

export function cutters(): THREE.Group {
  const m = mat(0xb03030);
  const a = cyl(0.012, 0.012, 0.3, m); a.rotation.z = Math.PI / 2 - 0.15; a.position.set(0, 0.015, 0.03);
  const b = cyl(0.012, 0.012, 0.3, m); b.rotation.z = Math.PI / 2 + 0.15; b.position.set(0, 0.015, -0.03);
  const jaw = box(0.08, 0.02, 0.04, STEEL, 0.17, 0.005, 0);
  return group(a, b, jaw);
}

export function knife(): THREE.Group {
  const blade = box(0.18, 0.005, 0.035, mat(0xc8ccd0, { metal: 0.8, rough: 0.2 }), 0.09, 0.005, 0);
  const handle = box(0.1, 0.02, 0.03, 0x2a1a12, -0.05, 0, 0);
  const stain = box(0.05, 0.006, 0.036, 0x6a0a0a, 0.12, 0.005, 0);
  return group(blade, handle, stain);
}

export function uvLamp(): THREE.Group {
  const body = cyl(0.028, 0.028, 0.2, 0x2a1a4a);
  const head = cyl(0.045, 0.03, 0.06, 0x2a1a4a, 0, 0.2, 0);
  const lens = cyl(0.04, 0.04, 0.005, mat(0x9a50ff, { emissive: 0x6a20ff }), 0, 0.26, 0);
  const g = group(body, head, lens);
  g.rotation.z = Math.PI / 2;
  g.position.y = 0.045;
  return group(g);
}

export function fuse(): THREE.Group {
  const g = group(cyl(0.02, 0.02, 0.1, mat(0xd8d0b0, { opacity: 0.7 })), cyl(0.022, 0.022, 0.02, STEEL, 0, 0, 0), cyl(0.022, 0.022, 0.02, STEEL, 0, 0.08, 0));
  g.rotation.z = Math.PI / 2;
  g.position.y = 0.025;
  return group(g);
}

export function keyHalf(): THREE.Group {
  const m = mat(0xa08a50, { metal: 0.7, rough: 0.35 });
  const g = group(box(0.09, 0.015, 0.02, m, 0.04, 0, 0), new THREE.Mesh(new THREE.TorusGeometry(0.03, 0.01, 6, 12, Math.PI * 1.3), m));
  g.rotation.x = -Math.PI / 2;
  g.position.y = 0.01;
  return group(g);
}

export function oldKey(color = 0x8a7a50): THREE.Group {
  const m = mat(color, { metal: 0.7, rough: 0.35 });
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.035, 0.01, 8, 14), m);
  const shaft = box(0.14, 0.014, 0.014, m, 0.1, -0.007, 0);
  const bit = box(0.025, 0.035, 0.014, m, 0.16, -0.03, 0);
  const g = group(ring, shaft, bit);
  g.rotation.x = -Math.PI / 2;
  g.position.y = 0.01;
  return group(g);
}

export function notePaper(torn = false): THREE.Mesh {
  const m = box(torn ? 0.1 : 0.18, 0.004, 0.24, PAPER);
  m.rotation.y = 0.3;
  return m;
}

// ---------- decoration ----------

export function doll(rnd: () => number): THREE.Group {
  const dress = [0x7a2a3a, 0x3a4a6a, 0xd8d0c0, 0x4a3a2a][Math.floor(rnd() * 4)];
  const body = cyl(0.06, 0.12, 0.22, dress, 0, 0.02, 0);
  const head = named(new THREE.Group(), 'head');
  const skull = ball(0.08, 0xe8dcd0);
  const hair = ball(1, 0x2a1a10, 0, 0.02, -0.01);
  hair.scale.set(0.085, 0.07, 0.085);
  const eyeL = ball(0.014, 0x050505, -0.03, 0.01, 0.07);
  const eyeR = ball(0.014, 0x050505, 0.03, 0.01, 0.07);
  const crack = box(0.004, 0.05, 0.004, 0x3a2a2a, 0.035, 0.03, 0.075);
  crack.rotation.z = 0.5;
  head.add(skull, hair, eyeL, eyeR, crack);
  head.position.y = 0.32;
  const legs = [-1, 1].map((s) => { const l = cyl(0.02, 0.02, 0.14, 0xe8dcd0, s * 0.04, 0.02, 0.06); l.rotation.x = Math.PI / 2; return l; });
  return group(body, head, ...legs);
}

export function rockingChair(): THREE.Group {
  const c = named(new THREE.Group(), 'rock');
  const w = 0x4a3222;
  c.add(box(0.5, 0.05, 0.45, w, 0, 0.42, 0.25), box(0.5, 0.65, 0.04, w, 0, 0.47, 0.03));
  for (const x of [-0.22, 0.22]) {
    c.add(box(0.04, 0.4, 0.04, w, x, 0.05, 0.05), box(0.04, 0.4, 0.04, w, x, 0.05, 0.45));
    const r = new THREE.Mesh(new THREE.TorusGeometry(0.6, 0.02, 4, 16, 0.9), mat(w));
    r.rotation.set(0, Math.PI / 2, -Math.PI / 2 - 0.45);
    r.position.set(x, 0.62, 0.25);
    c.add(r);
  }
  return group(c);
}

export function wheelchair(): THREE.Group {
  const m = mat(STEEL, { metal: 0.7, rough: 0.4 });
  const g = group(box(0.5, 0.05, 0.45, 0x2a2a2a, 0, 0.48, 0.3), box(0.5, 0.45, 0.04, 0x2a2a2a, 0, 0.53, 0.07));
  for (const s of [-1, 1]) {
    const wh = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.02, 6, 20), m);
    wh.rotation.y = Math.PI / 2;
    wh.position.set(s * 0.29, 0.3, 0.2);
    g.add(wh, cyl(0.05, 0.05, 0.03, 0x222222, s * 0.2, 0, 0.55));
  }
  return g;
}

export function hospitalBed(): THREE.Group {
  const m = mat(0xb8bcc0, { metal: 0.6, rough: 0.4 });
  const g = group(box(0.9, 0.08, 1.9, m, 0, 0.5, 0.95), box(0.86, 0.12, 1.86, 0xcfc8b8, 0, 0.58, 0.95));
  g.add(box(0.9, 0.5, 0.04, m, 0, 0.5, 0.02), box(0.6, 0.1, 0.35, 0xd8d2c4, 0, 0.7, 0.25));
  for (const [x, z] of [[-0.42, 0.05], [0.42, 0.05], [-0.42, 1.85], [0.42, 1.85]]) g.add(box(0.04, 0.5, 0.04, m, x, 0, z));
  const stain = box(0.35, 0.005, 0.4, 0x5a1010, 0.1, 0.705, 1.1);
  stain.rotation.y = 0.6;
  g.add(stain);
  return g;
}

export function barrel(color = 0x5a4a38): THREE.Group {
  const g = group(cyl(0.3, 0.28, 0.85, color, 0, 0, 0.3, 14));
  for (const y of [0.12, 0.7]) g.add(cyl(0.305, 0.305, 0.04, IRON, 0, y, 0.3, 14));
  return g;
}

export function brokenChair(): THREE.Group {
  const w = 0x4a3222;
  const seat = box(0.45, 0.05, 0.45, w, 0, 0.3, 0.25);
  seat.rotation.z = 0.35;
  const back = box(0.45, 0.5, 0.04, w, 0.1, 0.05, 0.6);
  back.rotation.x = -1.3;
  return group(seat, back, box(0.04, 0.4, 0.04, w, -0.2, 0, 0.05), box(0.04, 0.3, 0.04, w, 0.2, 0, 0.45));
}

export function mannequin(): THREE.Group {
  const m = mat(0xd8cbb8, { rough: 0.5 });
  const torso = cyl(0.14, 0.11, 0.6, m, 0, 0.95, 0.2);
  const head = ball(0.11, m, 0, 1.72, 0.2);
  head.scale.set(0.1, 0.13, 0.11);
  const neck = cyl(0.04, 0.04, 0.12, m, 0, 1.55, 0.2);
  const hips = ball(0.15, m, 0, 0.95, 0.2);
  hips.scale.set(0.15, 0.1, 0.12);
  const pole = cyl(0.015, 0.015, 0.95, 0x333333, 0, 0, 0.2);
  const base = cyl(0.18, 0.2, 0.03, 0x333333, 0, 0, 0.2);
  const arms = [-1, 1].map((s) => { const a = cyl(0.035, 0.03, 0.55, m, s * 0.19, 1.0, 0.2); a.rotation.z = s * 0.1; return a; });
  return group(torso, head, neck, hips, pole, base, ...arms);
}

export function bucket(): THREE.Group {
  const g = group(cyl(0.15, 0.12, 0.28, 0x6a6e72, 0, 0, 0.2, 12));
  g.add(cyl(0.13, 0.13, 0.01, 0x3a0808, 0, 0.22, 0.2, 12));
  return g;
}

export function candles(n = 3): THREE.Group {
  const g = new THREE.Group();
  for (let i = 0; i < n; i++) {
    const h = 0.12 + (i % 3) * 0.08;
    const x = (i - (n - 1) / 2) * 0.09;
    g.add(cyl(0.025, 0.03, h, 0xe8e0c8, x, 0, 0.1 + (i % 2) * 0.05));
    const f = new THREE.Mesh(new THREE.ConeGeometry(0.012, 0.04, 6), mat(0xffb040, { emissive: 0xff8a00 }));
    f.name = 'flame';
    f.position.set(x, h + 0.02, 0.1 + (i % 2) * 0.05);
    g.add(f);
  }
  const l = new THREE.PointLight(0xff9a40, 1.5, 2.8, 2);
  l.position.set(0, 0.35, 0.2);
  g.add(l);
  return g;
}

export function cobweb(size = 0.9): THREE.Mesh {
  const p = picture(size, size, (c, W) => {
    c.clearRect(0, 0, W, W);
    c.strokeStyle = 'rgba(230,230,220,0.55)';
    c.lineWidth = 1.2;
    for (let i = 0; i <= 6; i++) { const a = (i / 6) * Math.PI / 2; c.beginPath(); c.moveTo(0, 0); c.lineTo(Math.cos(a) * W, Math.sin(a) * W); c.stroke(); }
    for (let r = 0.15; r < 1; r += 0.14) {
      c.beginPath();
      for (let i = 0; i <= 6; i++) { const a = (i / 6) * Math.PI / 2; const rr = r * W * (0.9 + (i % 2) * 0.1); const x = Math.cos(a) * rr; const y = Math.sin(a) * rr; if (i) c.lineTo(x, y); else c.moveTo(x, y); }
      c.stroke();
    }
  }, 128, true);
  (p.material as THREE.MeshStandardMaterial).depthWrite = false;
  return p;
}

export function handprint(rnd: () => number, color = '#6a0606'): THREE.Mesh {
  const p = picture(0.3, 0.36, (c, W, H) => {
    c.clearRect(0, 0, W, H);
    c.fillStyle = color;
    c.globalAlpha = 0.85;
    c.beginPath(); c.ellipse(W * 0.5, H * 0.66, W * 0.2, H * 0.17, 0, 0, Math.PI * 2); c.fill();
    for (let i = 0; i < 5; i++) {
      const a = -2.4 + i * 0.42;
      const len = H * (i === 0 ? 0.2 : 0.3);
      c.save(); c.translate(W * 0.5 + Math.cos(a) * W * 0.17, H * 0.6 + Math.sin(a) * H * 0.12); c.rotate(a + Math.PI / 2);
      c.fillRect(-W * 0.04, -len, W * 0.08, len); c.restore();
    }
    for (let i = 0; i < 4; i++) c.fillRect(W * (0.35 + rnd() * 0.3), H * 0.75, 3, H * 0.25 * rnd());
  }, 128, true);
  (p.material as THREE.MeshStandardMaterial).depthWrite = false;
  return p;
}

export function pipes(): THREE.Group {
  const m = mat(0x5a5a50, { metal: 0.6, rough: 0.5 });
  const g = new THREE.Group();
  for (const y of [2.5, 2.75]) { const p = cyl(0.07, 0.07, 3, m, 0, y, 0.15); p.rotation.z = Math.PI / 2; p.position.y = y; g.add(p); }
  const v = cyl(0.06, 0.06, 2.5, m, 1.2, 0, 0.12);
  g.add(v);
  return g;
}

export function specimenJar(rnd: () => number): THREE.Group {
  const glass = cyl(0.1, 0.1, 0.32, mat(0x9aff9a, { opacity: 0.35, rough: 0.05, emissive: 0x0a3a0a }));
  const thing = ball(0.06, 0xb89a8a, 0, 0.14, 0);
  thing.scale.set(0.06 + rnd() * 0.02, 0.08, 0.05);
  return group(glass, thing, cyl(0.105, 0.105, 0.03, 0x333333, 0, 0.32, 0));
}

export function schoolDesk(): THREE.Group {
  const g = group(box(0.7, 0.04, 0.5, 0x8a6a45, 0, 0.7, 0.25));
  for (const [x, z] of [[-0.3, 0.05], [0.3, 0.05], [-0.3, 0.45], [0.3, 0.45]]) g.add(box(0.03, 0.7, 0.03, 0x333333, x, 0, z));
  g.add(box(0.2, 0.01, 0.15, PAPER, 0.1, 0.74, 0.2));
  return g;
}

export function tombstone(rnd: () => number): THREE.Group {
  const shape = new THREE.Shape();
  shape.moveTo(-0.3, 0); shape.lineTo(0.3, 0); shape.lineTo(0.3, 0.6); shape.absarc(0, 0.6, 0.3, 0, Math.PI, false); shape.closePath();
  const m = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth: 0.12, bevelEnabled: false }), mat(0x7a7a78, { rough: 1 }));
  m.castShadow = true;
  const plate = picture(0.4, 0.3, (c, W, H) => { c.fillStyle = '#6a6a68'; c.fillRect(0, 0, W, H); text(c, 'R.I.P.', W / 2, H * 0.35, H * 0.25, '#2a2a28', 700, 'Georgia, serif'); text(c, `18${Math.floor(rnd() * 90 + 10)}`, W / 2, H * 0.72, H * 0.2, '#2a2a28', 700, 'Georgia, serif'); }, 128);
  plate.position.set(0, 0.55, 0.121);
  return group(m, plate);
}

export function bookshelfDecor(rnd: () => number): THREE.Group {
  const g = group(hollow(1.0, 1.8, 0.32, OLDWOOD));
  for (let s = 0; s < 4; s++) {
    g.add(box(0.94, 0.03, 0.3, shade(OLDWOOD, 0.9), 0, 0.05 + s * 0.44, 0.16));
    let x = -0.44;
    while (x < 0.4) {
      if (rnd() < 0.15) { x += 0.12; continue; }
      const bw = 0.04 + rnd() * 0.04;
      const bh = 0.2 + rnd() * 0.14;
      const b = box(bw, bh, 0.2, shade([0x5a1a1a, 0x1a3a2a, 0x2a2a4a, 0x4a3a1a][Math.floor(rnd() * 4)], 0.8 + rnd() * 0.4), x + bw / 2, 0.08 + s * 0.44, 0.14);
      if (rnd() < 0.1) b.rotation.z = 0.3;
      g.add(b);
      x += bw + 0.005;
    }
  }
  return g;
}

/** The ceiling bulb on its cord. The glass is named 'glass' so the room can flicker it. */
export function hangingBulb(light: number): THREE.Group {
  const cord = cyl(0.008, 0.008, 0.7, 0x111111, 0, -0.7, 0);
  const socket = cyl(0.03, 0.03, 0.06, 0x333333, 0, -0.76, 0);
  const glass = named(ball(0.06, mat(light, { emissive: light })), 'glass');
  glass.position.y = -0.8;
  return group(cord, socket, glass);
}

/** Tall, thin shadow with glowing eyes — seen only for a split second. */
export function shadowFigure(): THREE.Group {
  const m = new THREE.MeshBasicMaterial({ color: 0x050505, fog: true });
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.2, 1.3, 4, 10), m);
  body.position.y = 1.0;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.15, 12, 10), m);
  head.position.y = 1.95;
  head.scale.set(0.9, 1.2, 0.9);
  const eyes = [-1, 1].map((s) => {
    const e = new THREE.Mesh(new THREE.SphereGeometry(0.02, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffeecc }));
    e.position.set(s * 0.05, 1.97, 0.13);
    return e;
  });
  const arms = [-1, 1].map((s) => {
    const a = new THREE.Mesh(new THREE.CapsuleGeometry(0.05, 1.0, 4, 8), m);
    a.position.set(s * 0.28, 1.05, 0);
    a.rotation.z = s * 0.08;
    return a;
  });
  return group(body, head, ...eyes, ...arms);
}

export function heavyDoor(color: number): THREE.Group {
  const g = new THREE.Group();
  const frame = 0x2a2420;
  g.add(box(0.14, 2.45, 0.14, frame, -0.64, 0, 0.02), box(0.14, 2.45, 0.14, frame, 0.64, 0, 0.02), box(1.42, 0.14, 0.14, frame, 0, 2.32, 0.02));
  g.add(box(1.14, 2.3, 0.02, 0x050404, 0, 0, 0.005));
  const leaf = hinge(-0.56, 0, 0.05);
  const tex = canvasTex(128, 256, (c) => {
    c.fillStyle = hex(color); c.fillRect(0, 0, 128, 256);
    c.fillStyle = hex(shade(color, 0.8));
    for (let x = 0; x < 128; x += 21) c.fillRect(x, 0, 2, 256);
    drawGrime(c, 128, 256, 0.9, mulberry32(color), true);
  });
  leaf.add(box(1.12, 2.3, 0.08, mat(0xffffff, { map: tex }), 0.56, 0, 0));
  for (const y of [0.35, 1.9]) leaf.add(box(1.12, 0.08, 0.1, IRON, 0.56, y, 0));
  leaf.add(ball(0.05, 0x8a7a50, 1.0, 1.05, 0.08));
  g.add(named(leaf, 'leaf'));
  return g;
}

/** A small wall shelf with jars, a skull-ish lump, books. */
export function wallShelf(rnd: () => number): THREE.Group {
  const g = group(box(0.8, 0.04, 0.22, OLDWOOD, 0, 0, 0.11));
  for (const x of [-0.35, 0.35]) g.add(box(0.03, 0.12, 0.2, shade(OLDWOOD, 0.8), x, -0.12, 0.1));
  let x = -0.32;
  while (x < 0.3) {
    const r = rnd();
    if (r < 0.35) g.add(cyl(0.05, 0.05, 0.14 + rnd() * 0.08, mat(0xa8b89a, { opacity: 0.6, rough: 0.1 }), x + 0.05, 0.04, 0.11));
    else if (r < 0.6) g.add(box(0.05, 0.2, 0.15, shade(0x5a1a1a, 0.7 + rnd() * 0.6), x + 0.03, 0.04, 0.1));
    else if (r < 0.75) { const b = ball(0.07, 0xd8cbb0, x + 0.07, 0.1, 0.11); b.scale.set(0.07, 0.06, 0.08); g.add(b); }
    else g.add(candles(1));
    x += 0.12 + rnd() * 0.06;
  }
  return g;
}

/** Floor junk: a bottle, a crumpled page, a bone. */
export function clutter(rnd: () => number): THREE.Group {
  const r = rnd();
  if (r < 0.3) { const b = cyl(0.03, 0.035, 0.22, mat(0x2a4a2a, { opacity: 0.8, rough: 0.15 })); b.rotation.z = Math.PI / 2; b.position.y = 0.035; return group(b); }
  if (r < 0.55) { const p = box(0.18, 0.004, 0.14, PAPER); p.rotation.y = rnd() * 3; return group(p, box(0.1, 0.02, 0.1, 0xc8bca0, 0.1, 0, 0.05)); }
  if (r < 0.75) { const b = cyl(0.015, 0.02, 0.28, 0xd8cbb0); b.rotation.z = Math.PI / 2; b.position.y = 0.02; return group(b, ball(0.03, 0xd8cbb0, 0.14, 0.02, 0), ball(0.03, 0xd8cbb0, -0.14, 0.02, 0)); }
  return group(box(0.2, 0.12, 0.2, 0x5a4030, 0, 0, 0), box(0.14, 0.09, 0.14, 0x6a4a36, 0.05, 0.12, 0.02));
}

/** Rope tied around doors or a lid (a knife cuts it). */
export function ropeLock(w = 0.9): THREE.Group {
  const g = new THREE.Group();
  for (const r of [0.5, -0.5]) {
    const c = cyl(0.015, 0.015, w * 1.2, 0x9a7a4a);
    c.rotation.z = Math.PI / 2 + r;
    g.add(c);
  }
  g.add(ball(0.05, 0x8a6a3a));
  return g;
}

export { RUST };
