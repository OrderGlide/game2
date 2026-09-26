// Mruczek — the low-poly cat, built from primitives, with idle animations and a few poses.
import * as THREE from 'three';
import { ball, box, mat } from './kit';

export type SkinId = 'ginger' | 'black' | 'white' | 'grey' | 'tuxedo' | 'siamese' | 'golden' | 'cosmic';
export interface SkinDef { id: SkinId; body: number; belly: number; stripe: number | null; points?: number; eyes: number; coins?: number; special?: 'fish' | 'pack'; shiny?: boolean; glow?: number }

export const SKINS: SkinDef[] = [
  { id: 'ginger', body: 0xf29a45, belly: 0xfde6c8, stripe: 0xcc6f22, eyes: 0x9ccc3c },
  { id: 'black', body: 0x2e2a30, belly: 0x3a353c, stripe: null, eyes: 0xf5c542, coins: 300 },
  { id: 'white', body: 0xf8f5ef, belly: 0xffffff, stripe: null, eyes: 0x5fb0ff, coins: 300 },
  { id: 'grey', body: 0x9ba1aa, belly: 0xdde0e4, stripe: 0x6f757e, eyes: 0xffb74d, coins: 400 },
  { id: 'tuxedo', body: 0x2b2b31, belly: 0xffffff, stripe: null, eyes: 0x9ccc65, coins: 500 },
  { id: 'siamese', body: 0xf2e4ca, belly: 0xf8efdf, stripe: null, points: 0x5a4032, eyes: 0x4aa3ff, coins: 700 },
  { id: 'golden', body: 0xffcf40, belly: 0xffe58a, stripe: 0xe8a800, eyes: 0x40c4ff, special: 'pack', shiny: true },
  { id: 'cosmic', body: 0x2a2d6e, belly: 0x4a3f9a, stripe: 0x9a6bff, eyes: 0xffe066, special: 'fish', glow: 0x3b2c8a },
];

export type Pose = 'sit' | 'sleep' | 'loaf' | 'stand';

const coneGeo = new THREE.ConeGeometry(1, 1, 4);

export class Cat {
  root = new THREE.Group();
  /** everything that bobs with breathing */
  private body = new THREE.Group();
  private head = new THREE.Group();
  private tail: THREE.Group[] = [];
  private eyes: THREE.Object3D[] = [];
  private legs: THREE.Object3D[] = [];
  private earL = new THREE.Group();
  private earR = new THREE.Group();
  private lids: THREE.Object3D[] = [];
  private chest!: THREE.Object3D;
  private hips: THREE.Object3D[] = [];
  private feet: THREE.Object3D[] = [];
  private stripes = new THREE.Group();
  private pose: Pose = 'sit';
  private t = Math.random() * 10;
  private blinkIn = 2;
  private blink = 0;
  private headTurn = 0;
  private headTarget = 0;
  /** 0..1 excitement (eating / being petted) */
  happy = 0;

  constructor(skin: SkinDef) {
    const fur = mat(skin.body, { rough: skin.shiny ? 0.35 : 0.9, metal: skin.shiny ? 0.5 : 0, emissive: skin.glow });
    const belly = mat(skin.belly, { rough: 0.9 });
    const stripe = skin.stripe !== null ? mat(skin.stripe, { rough: 0.9 }) : null;
    const point = skin.points !== undefined ? mat(skin.points, { rough: 0.9 }) : fur;
    const pink = mat(0xff9fb0);
    const dark = mat(0x1d1a1f, { rough: 0.3 });
    const white = mat(0xffffff, { rough: 0.2 });

    this.root.add(this.body);

    // torso
    const torso = ball(1, fur);
    torso.scale.set(0.2, 0.26, 0.22);
    torso.position.set(0, 0.28, -0.02);
    torso.name = 'torso';
    const chest = ball(1, belly);
    chest.scale.set(0.13, 0.18, 0.08);
    chest.position.set(0, 0.3, 0.14);
    this.chest = chest;
    const hipL = ball(0.14, fur, -0.12, 0.13, -0.06);
    const hipR = ball(0.14, fur, 0.12, 0.13, -0.06);
    this.hips = [hipL, hipR];
    this.body.add(torso, chest, hipL, hipR);
    if (stripe) {
      // painted-on stripes: flattened ellipsoids hugging the back
      for (let i = 0; i < 3; i++) {
        const st = ball(1, stripe);
        st.scale.set(0.2, 0.025, 0.05);
        st.position.set(0, 0.18 + i * 0.1, -0.18 + i * 0.015);
        st.rotation.x = -0.5;
        this.stripes.add(st);
      }
      torso.add(this.stripes);
      this.stripes.scale.set(1 / 0.2, 1 / 0.26, 1 / 0.22);
      this.stripes.position.set(0, -0.28 / 0.26, 0.02 / 0.22);
    }
    for (const sx of [-1, 1]) {
      const leg = box(0.07, 0.24, 0.07, point, sx * 0.075, 0.02, 0.13);
      const paw = ball(0.05, point === fur ? belly : point, sx * 0.075, 0.035, 0.17);
      paw.scale.set(0.05, 0.035, 0.06);
      const g = new THREE.Group();
      g.add(leg, paw);
      this.legs.push(g);
      this.body.add(g);
      const foot = ball(1, fur, sx * 0.14, 0.035, 0.05);
      foot.scale.set(0.06, 0.035, 0.09);
      this.feet.push(foot);
      this.body.add(foot);
    }

    // head
    this.head.position.set(0, 0.58, 0.06);
    this.body.add(this.head);
    const skull = ball(1, fur);
    skull.scale.set(0.2, 0.17, 0.18);
    const cheekL = ball(0.085, fur, -0.09, -0.04, 0.07);
    const cheekR = ball(0.085, fur, 0.09, -0.04, 0.07);
    const muzzle = ball(1, skin.points !== undefined ? point : belly, 0, -0.05, 0.14);
    muzzle.scale.set(0.075, 0.05, 0.05);
    const nose = ball(1, pink, 0, -0.02, 0.185);
    nose.scale.set(0.022, 0.015, 0.012);
    this.head.add(skull, cheekL, cheekR, muzzle, nose);
    if (stripe) {
      for (let i = -1; i <= 1; i++) {
        const st = ball(1, stripe);
        st.scale.set(0.014, 0.01, 0.06);
        st.position.set(i * 0.045, 0.163 - Math.abs(i) * 0.012, 0.03);
        st.rotation.z = i * 0.35;
        this.head.add(st);
      }
    }
    for (const sx of [-1, 1]) {
      // big eyes = cute
      const eye = new THREE.Group();
      const iris = ball(1, mat(skin.eyes, { rough: 0.25 }));
      iris.scale.set(0.045, 0.05, 0.02);
      const pupil = ball(1, dark);
      pupil.scale.set(0.02, 0.038, 0.01);
      pupil.position.z = 0.016;
      const hl = ball(0.011, white, 0.012 * sx, 0.018, 0.024);
      eye.add(iris, pupil, hl);
      eye.position.set(sx * 0.075, 0.02, 0.155);
      eye.rotation.y = sx * 0.25;
      this.eyes.push(eye);
      this.head.add(eye);
      // closed eye: a small dark curve
      const lid = box(0.06, 0.008, 0.01, dark, sx * 0.075, 0.012, 0.172);
      lid.rotation.set(0, sx * 0.25, sx * 0.12);
      lid.visible = false;
      lid.castShadow = false;
      this.lids.push(lid);
      this.head.add(lid);
      // ears
      const ear = sx < 0 ? this.earL : this.earR;
      const outer = new THREE.Mesh(coneGeo, point);
      outer.scale.set(0.075, 0.13, 0.05);
      outer.rotation.y = Math.PI / 4;
      outer.castShadow = true;
      const inner = new THREE.Mesh(coneGeo, pink);
      inner.scale.set(0.045, 0.09, 0.02);
      inner.rotation.y = Math.PI / 4;
      inner.position.set(0, -0.01, 0.022);
      ear.add(outer, inner);
      ear.position.set(sx * 0.105, 0.14, 0.0);
      ear.rotation.z = -sx * 0.3;
      this.head.add(ear);
      // whiskers
      for (let i = 0; i < 3; i++) {
        const w = box(0.14, 0.004, 0.004, 0xffffff, sx * 0.13, -0.06 + i * 0.018, 0.13);
        w.rotation.z = sx * (i - 1) * 0.18;
        w.castShadow = false;
        this.head.add(w);
      }
    }

    // tail: chain of segments, each a child of the previous so it curls naturally
    let parent: THREE.Object3D = this.body;
    const base = new THREE.Group();
    base.position.set(0, 0.1, -0.22);
    parent.add(base);
    parent = base;
    for (let i = 0; i < 6; i++) {
      const seg = new THREE.Group();
      const piece = ball(1, i >= 4 && stripe ? stripe : i >= 3 ? point : fur);
      piece.scale.set(0.045 - i * 0.002, 0.045 - i * 0.002, 0.07);
      piece.position.z = -0.05;
      seg.add(piece);
      seg.position.z = i === 0 ? 0 : -0.08;
      parent.add(seg);
      this.tail.push(seg);
      parent = seg;
    }
    this.setPose('sit');
  }

  setPose(p: Pose): void {
    this.pose = p;
    const torso = this.body.getObjectByName('torso')!;
    const low = p === 'sleep' || p === 'loaf';
    this.body.rotation.set(0, 0, 0);
    this.body.position.set(0, 0, 0);
    this.legs.forEach((l) => { l.visible = !low; });
    this.chest.visible = !low;
    if (p === 'sit') {
      torso.scale.set(0.2, 0.26, 0.22);
      torso.position.set(0, 0.28, -0.02);
      torso.rotation.set(0, 0, 0);
      this.head.position.set(0, 0.58, 0.06);
      this.head.rotation.set(0, 0, 0);
      this.hips.forEach((h, i) => h.position.set(i ? 0.12 : -0.12, 0.13, -0.06));
      this.feet.forEach((f, i) => f.position.set(i ? 0.14 : -0.14, 0.035, 0.05));
    } else if (p === 'stand') {
      torso.scale.set(0.19, 0.19, 0.3);
      torso.position.set(0, 0.3, -0.05);
      torso.rotation.set(0, 0, 0);
      this.head.position.set(0, 0.5, 0.26);
      this.head.rotation.set(0, 0, 0);
      this.hips.forEach((h, i) => h.position.set(i ? 0.1 : -0.1, 0.24, -0.22));
      this.feet.forEach((f, i) => f.position.set(i ? 0.1 : -0.1, 0.035, -0.2));
    } else if (p === 'loaf') {
      torso.scale.set(0.22, 0.17, 0.27);
      torso.position.set(0, 0.17, -0.03);
      torso.rotation.set(0, 0, 0);
      this.head.position.set(0, 0.34, 0.19);
      this.head.rotation.set(0.1, 0, 0);
      this.hips.forEach((h, i) => h.position.set(i ? 0.12 : -0.12, 0.12, -0.12));
      this.feet.forEach((f, i) => f.position.set(i ? 0.07 : -0.07, 0.035, 0.22));
    } else {
      // sleep: curled up, chin resting on the paws, tail wrapped around
      torso.scale.set(0.25, 0.15, 0.26);
      torso.position.set(0, 0.15, -0.02);
      torso.rotation.set(0, 0, 0);
      this.head.position.set(0.04, 0.19, 0.2);
      this.head.rotation.set(0.35, 0.3, 0.15);
      this.hips.forEach((h, i) => h.position.set(i ? 0.12 : -0.12, 0.11, -0.12));
      this.feet.forEach((f, i) => f.position.set(i ? 0.05 : -0.08, 0.035, 0.24));
    }
  }

  getPose(): Pose { return this.pose; }

  lookAt(angle: number): void { this.headTarget = THREE.MathUtils.clamp(angle, -0.8, 0.8); }

  update(dt: number): void {
    this.t += dt;
    const t = this.t;
    const sleeping = this.pose === 'sleep';
    // breathing
    const breath = Math.sin(t * (sleeping ? 1.6 : 2.4)) * (sleeping ? 0.03 : 0.015);
    this.body.scale.set(1 + breath * 0.5, 1 + breath, 1 + breath * 0.5);
    // tail sway (curled around the body when sleeping)
    this.happy = Math.max(0, this.happy - dt * 0.4);
    const speed = 1.8 + this.happy * 6;
    this.tail.forEach((seg, i) => {
      if (sleeping || this.pose === 'loaf') {
        seg.rotation.set(i === 0 ? 0.25 : 0, i === 0 ? 1.7 : 0.42 + Math.sin(t * 0.8 + i) * 0.03, 0);
      } else {
        seg.rotation.set(i === 0 ? -0.9 : -0.18, Math.sin(t * speed - i * 0.6) * (0.18 + this.happy * 0.2), 0);
      }
    });
    // blinking (eyes closed while sleeping)
    this.blinkIn -= dt;
    if (this.blinkIn <= 0) { this.blink = 0.15; this.blinkIn = 2 + Math.random() * 4; }
    this.blink = Math.max(0, this.blink - dt);
    const closed = sleeping || this.blink > 0;
    const open = this.happy > 0.5 ? 0.45 : 1;
    for (const e of this.eyes) { e.visible = !closed; e.scale.y = open; }
    for (const l of this.lids) l.visible = closed;
    // head: look around a bit
    if (!sleeping) {
      if (Math.random() < dt * 0.25) this.headTarget = (Math.random() - 0.5) * 1.1;
      this.headTurn += (this.headTarget - this.headTurn) * Math.min(1, dt * 3);
      this.head.rotation.y = this.headTurn;
      this.head.rotation.z = Math.sin(t * 0.7) * 0.05 + this.happy * Math.sin(t * 8) * 0.08;
    }
    // ear twitch
    const tw = Math.sin(t * 13) * (Math.sin(t * 0.9) > 0.97 ? 0.3 : 0);
    this.earL.rotation.x = tw;
    this.earR.rotation.x = -tw * 0.5;
  }
}
