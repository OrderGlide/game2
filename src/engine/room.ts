// Runs one escape room: builds the 3D room from its definition, moves the camera between the four walls
// and close-ups, turns taps into object interactions and keeps the room's state (flags + inventory).
import * as THREE from 'three';
import { sfx, vibrate, type Sfx } from '../audio';
import { T, tx, type Txt } from '../i18n';
import { Cat, type Pose, type SkinDef } from '../view/cat';
import { mat, patternTex, box, shade } from '../view/kit';
import { goldFishModel, ceilingLamp } from '../view/furniture';
import type {
  Action, Builder, CatApi, Ctx, DocDef, Flags, Handler, LockDef, ObjHandle, Place, RoomDef,
} from './types';

export const HALF = 4;
export const HEIGHT = 3.4;

const FACING = [new THREE.Vector3(0, 0, -1), new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 0, 1), new THREE.Vector3(-1, 0, 0)];
const RIGHT = [new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 0, 1), new THREE.Vector3(-1, 0, 0), new THREE.Vector3(0, 0, -1)];
const ROT = [0, -Math.PI / 2, Math.PI, Math.PI / 2];

export function wallPoint(p: Place): THREE.Vector3 {
  return FACING[p.wall].clone().multiplyScalar(HALF - (p.out ?? 0))
    .addScaledVector(RIGHT[p.wall], p.u)
    .setY(p.y ?? 0);
}

export interface RoomSave {
  id: string;
  flags: Flags;
  inv: string[];
  elapsed: number;
  hintsUsed: number;
  /** how many hints of each step have been revealed */
  shown: Record<number, number>;
  fish: boolean;
}

export interface RoomUI {
  say(text: string): void;
  read(doc: DocDef): void;
  lock(def: LockDef, onOpen: () => void): void;
  inventoryChanged(): void;
  viewChanged(): void;
  won(): void;
  fishFound(): void;
}

interface ObjRec {
  id: string;
  node: THREE.Object3D;
  onTap?: Handler;
  uses: Record<string, Handler>;
  visible?: (f: Flags) => boolean;
  animate?: (f: Flags, node: THREE.Object3D, k: number) => void;
  zoomTo?: string;
  views?: string[];
  any?: boolean;
}

interface View { id: string; pos: THREE.Vector3; target: THREE.Vector3; parent: string | null; wall: number; fovScale: number }

export class RoomRuntime {
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(50, 16 / 9, 0.05, 40);
  root = new THREE.Group();
  s: RoomSave;
  view = 'w0';
  selected: string | null = null;
  won = false;
  private objs = new Map<string, ObjRec>();
  private views = new Map<string, View>();
  private spots = new Map<string, { pos: THREE.Vector3; rot: number; pose: Pose }>();
  private cat: Cat | null = null;
  private catObj: ObjRec | null = null;
  private catMove: { from: THREE.Vector3; to: THREE.Vector3; fromRot: number; toRot: number; t: number; pose: Pose } | null = null;
  private camFrom = { pos: new THREE.Vector3(), target: new THREE.Vector3() };
  private camTo = { pos: new THREE.Vector3(), target: new THREE.Vector3() };
  private camT = 1;
  private camTarget = new THREE.Vector3();
  private aspect = 16 / 9;
  private ray = new THREE.Raycaster();
  private firstFrame = true;
  private sparkles: { m: THREE.Mesh; t: number }[] = [];

  constructor(public def: RoomDef, save: RoomSave | null, private ui: RoomUI, skin: SkinDef, shadows: boolean) {
    this.s = save && save.id === def.id ? save : { id: def.id, flags: {}, inv: [], elapsed: 0, hintsUsed: 0, shown: {}, fish: false };
    this.scene.add(this.root);
    this.buildShell(shadows);
    for (let w = 0; w < 4; w++) this.addWallView(w);
    def.build(this.builder(skin));
    this.setView('w0', true);
  }

  // ---------- room shell ----------

  private buildShell(shadows: boolean): void {
    const th = this.def.theme;
    const dim = th.dim ?? 1;
    this.scene.background = new THREE.Color(shade(th.wall, 0.5));
    const hemi = new THREE.HemisphereLight(0xfff4e6, shade(th.floor, 0.8), 1.1 * dim);
    const amb = new THREE.AmbientLight(0xffffff, 0.35 * dim);
    const sun = new THREE.DirectionalLight(th.light, 1.5 * dim);
    sun.position.set(2.5, 7, 3.5);
    sun.target.position.set(0, 0, 0);
    if (shadows) {
      sun.castShadow = true;
      sun.shadow.mapSize.set(1024, 1024);
      const c = sun.shadow.camera;
      c.left = -6; c.right = 6; c.top = 6; c.bottom = -6; c.near = 1; c.far = 16;
      sun.shadow.bias = -0.0015;
      sun.shadow.normalBias = 0.02;
    }
    const lamp = new THREE.PointLight(th.light, 6 * dim, 9, 1.6);
    lamp.position.set(0, HEIGHT - 0.8, 0);
    this.scene.add(hemi, amb, sun, sun.target, lamp);

    const S = HALF * 2;
    const floorTex = patternTex(th.floorKind, th.floor, th.floor2, [4, 4]);
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(S, S), mat(0xffffff, { map: floorTex, rough: 0.7 }));
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    const ceil = new THREE.Mesh(new THREE.PlaneGeometry(S, S), mat(th.ceiling, { rough: 1 }));
    ceil.rotation.x = Math.PI / 2;
    ceil.position.y = HEIGHT;
    this.root.add(floor, ceil);
    const wallTex = patternTex(th.pattern, th.wall, th.wall2, [4, 2]);
    const wallMat = mat(0xffffff, { map: wallTex, rough: 0.95 });
    for (let w = 0; w < 4; w++) {
      const wall = new THREE.Mesh(new THREE.PlaneGeometry(S, HEIGHT), wallMat);
      wall.position.copy(FACING[w]).multiplyScalar(HALF).setY(HEIGHT / 2);
      wall.rotation.y = ROT[w];
      wall.receiveShadow = true;
      this.root.add(wall);
      // skirting board and crown moulding
      const skirt = box(S, 0.14, 0.05, th.trim);
      const crown = box(S, 0.1, 0.08, shade(th.ceiling, 0.95));
      for (const [m, y] of [[skirt, 0], [crown, HEIGHT - 0.1]] as const) {
        m.position.copy(FACING[w]).multiplyScalar(HALF - 0.025).setY(y + (m === skirt ? 0.07 : 0.05));
        m.rotation.y = ROT[w];
        m.castShadow = false;
        this.root.add(m);
      }
    }
    const l = ceilingLamp(th.light);
    l.position.set(0, HEIGHT, 0);
    this.root.add(l);
  }

  private addWallView(w: number): void {
    const pos = FACING[w].clone().multiplyScalar(-2.4).setY(1.75);
    const target = FACING[w].clone().multiplyScalar(HALF).setY(1.05);
    this.views.set(`w${w}`, { id: `w${w}`, pos, target, parent: null, wall: w, fovScale: 1 });
  }

  // ---------- builder API used by room definitions ----------

  private builder(skin: SkinDef): Builder {
    const place = <T extends THREE.Object3D>(node: T, p: Place): T => {
      node.position.copy(wallPoint(p));
      node.rotation.y = ROT[p.wall] + (p.rot ?? 0);
      this.root.add(node);
      return node;
    };
    const handle = (rec: ObjRec): ObjHandle => {
      const h: ObjHandle = {
        node: rec.node,
        tap: (fn) => { rec.onTap = fn; return h; },
        use: (item, fn) => { rec.uses[item] = fn; return h; },
        show: (fn) => { rec.visible = fn; return h; },
        anim: (fn) => { rec.animate = fn; return h; },
        zoom: (v) => { rec.zoomTo = v; return h; },
        in: (...v) => { rec.views = v; return h; },
      };
      return h;
    };
    const obj = (id: string, node: THREE.Object3D, p: Place): ObjHandle => {
      if (this.objs.has(id)) throw new Error(`Duplicate object id ${id}`);
      place(node, p);
      node.userData.oid = id;
      const rec: ObjRec = { id, node, uses: {} };
      this.objs.set(id, rec);
      return handle(rec);
    };
    return {
      root: this.root,
      put: place,
      obj,
      fx: (id, node, p) => {
        node.userData.noHit = true;
        return obj(id, node, p);
      },
      pickup: (item, node, p, view, when) => {
        const h = obj(`pick_${item}`, node, p)
          .show((f) => !f[`got_${item}`] && (when ? when(f) : true))
          .tap((c) => { c.give(item); });
        if (view) h.in(view);
        return h;
      },
      goldFish: (p, view, when) => {
        const h = obj('goldfish', goldFishModel(), p)
          .show((f) => !this.s.fish && (when ? when(f) : true))
          .anim((_f, n) => { n.rotation.y = ROT[p.wall] + Math.sin(performance.now() / 600) * 0.3; })
          .tap((c) => c.foundFish());
        if (view) h.in(view);
        return h;
      },
      zoomView: (id, p) => {
        const target = wallPoint({ ...p, out: p.out ?? 0.3 });
        const pos = wallPoint({ ...p, out: (p.out ?? 0.3) + p.dist, y: (p.y ?? 0) + (p.look ?? 0.2) });
        this.views.set(id, { id, pos, target, parent: p.parent ?? `w${p.wall}`, wall: p.wall, fovScale: p.dist / 7 });
      },
      catSpot: (name, p) => {
        this.spots.set(name, { pos: wallPoint(p), rot: ROT[p.wall] + (p.face ?? 0), pose: p.pose });
      },
      cat: (start) => {
        this.cat = new Cat(skin);
        this.cat.root.userData.oid = 'cat';
        this.root.add(this.cat.root);
        const rec: ObjRec = { id: 'cat', node: this.cat.root, uses: {}, any: true };
        this.objs.set('cat', rec);
        this.catObj = rec;
        this.catApi.goto((this.s.flags.catSpot as string) ?? start, true);
        return handle(rec);
      },
    };
  }

  private catApi: CatApi = {
    goto: (spot, instant = false) => {
      const sp = this.spots.get(spot);
      if (!sp || !this.cat) return;
      this.s.flags.catSpot = spot;
      if (instant) {
        this.cat.root.position.copy(sp.pos);
        this.cat.root.rotation.y = sp.rot;
        this.cat.setPose(sp.pose);
        this.catMove = null;
        return;
      }
      this.catMove = { from: this.cat.root.position.clone(), to: sp.pos.clone(), fromRot: this.cat.root.rotation.y, toRot: sp.rot, t: 0, pose: sp.pose };
      this.cat.setPose('stand');
      sfx('whoosh');
    },
    pose: (p) => this.cat?.setPose(p),
    meow: () => { sfx('meow'); if (this.cat) this.cat.happy = 0.6; },
    happy: () => { if (this.cat) this.cat.happy = 1; sfx('purr'); },
    get spot() { return '' },
  };

  // ---------- context handed to room scripts ----------

  private ctx(item: string | null): Ctx {
    const f = this.s.flags;
    const self = this;
    return {
      f,
      item,
      has: (id) => this.s.inv.includes(id),
      give: (id) => this.give(id),
      take: (id) => this.take(id),
      say: (t) => this.ui.say(tx(t)),
      read: (d) => { sfx('paper'); this.ui.read(d); },
      lock: (d, onOpen) => this.ui.lock(d, () => { sfx('unlock'); vibrate(30); onOpen(); this.ui.inventoryChanged(); }),
      zoom: (v) => this.setView(v),
      sfx: (n: Sfx) => sfx(n),
      vibrate,
      get cat() { return { ...self.catApi, get spot() { return (f.catSpot as string) ?? ''; } }; },
      foundFish: () => {
        this.s.fish = true;
        f.fishFound = true;
        sfx('fish');
        vibrate(40);
        this.ui.fishFound();
      },
      win: () => this.win(),
    };
  }

  give(id: string): void {
    if (!this.s.inv.includes(id)) this.s.inv.push(id);
    this.s.flags[`got_${id}`] = true;
    sfx('pick');
    vibrate(15);
    const def = this.def.items[id];
    if (def) this.ui.say(T.got.replace('{n}', `${def.icon} ${tx(def.name)}`));
    this.ui.inventoryChanged();
  }

  take(id: string): void {
    this.s.inv = this.s.inv.filter((x) => x !== id);
    if (this.selected === id) this.selected = null;
    this.ui.inventoryChanged();
  }

  has(id: string): boolean { return this.s.inv.includes(id); }

  select(id: string | null): void {
    if (id && this.selected && id !== this.selected) {
      if (this.combine(this.selected, id)) return;
    }
    this.selected = id === this.selected ? null : id;
    sfx('click');
    this.ui.inventoryChanged();
  }

  /** Try to combine two inventory items; true if they made something. */
  combine(a: string, b: string): boolean {
    const c = this.def.combos?.find((x) => (x.a === a && x.b === b) || (x.a === b && x.b === a));
    if (!c) return false;
    this.s.inv = this.s.inv.filter((x) => x !== a && x !== b);
    this.selected = null;
    this.s.flags[`got_${c.result}`] = true;
    this.s.inv.push(c.result);
    sfx('combine');
    this.ui.say(c.say ? tx(c.say) : `${T.combined} ${this.def.items[c.result].icon} ${tx(this.def.items[c.result].name)}`);
    this.ui.inventoryChanged();
    return true;
  }

  private win(): void {
    if (this.won) return;
    this.won = true;
    this.s.flags.won = true;
    sfx('win');
    vibrate(60);
    // walk out through the door
    const v = this.views.get('w0')!;
    this.moveCamera(v.pos.clone().lerp(v.target, 0.85).setY(1.6), v.target.clone().add(new THREE.Vector3(0, 0, -3)), 1.6);
    setTimeout(() => this.ui.won(), 1500);
  }

  // ---------- views & camera ----------

  get currentView(): View { return this.views.get(this.view)!; }
  isZoomed(): boolean { return this.currentView.parent !== null; }

  setView(id: string, instant = false): void {
    const v = this.views.get(id);
    if (!v) return;
    this.view = id;
    if (instant) {
      this.camera.position.copy(v.pos);
      this.camTarget.copy(v.target);
      this.camera.lookAt(v.target);
      this.camT = 1;
    } else {
      this.moveCamera(v.pos, v.target, 0.45);
      sfx('whoosh');
    }
    this.applyFov();
    this.ui.viewChanged();
  }

  private camDur = 0.45;
  private moveCamera(pos: THREE.Vector3, target: THREE.Vector3, dur: number): void {
    this.camFrom.pos.copy(this.camera.position);
    this.camFrom.target.copy(this.camTarget);
    this.camTo.pos.copy(pos);
    this.camTo.target.copy(target);
    this.camT = 0;
    this.camDur = dur;
  }

  turn(dir: 1 | -1): void {
    if (this.won) return;
    const wall = this.currentView.wall;
    this.setView(`w${(wall + dir + 4) % 4}`);
  }

  back(): void {
    const p = this.currentView.parent;
    if (p) this.setView(p);
  }

  resize(aspect: number): void {
    this.aspect = aspect;
    this.camera.aspect = aspect;
    this.applyFov();
  }

  private applyFov(): void {
    // fit most of the wall's width (7.2 m seen from 6.4 m) and at least 3 m of height
    const v = this.currentView;
    const dist = v.parent ? 7 * v.fovScale : 6.4;
    const halfW = v.parent ? 4 * v.fovScale : 3.6;
    const halfH = v.parent ? 2.4 * v.fovScale : 1.5;
    const vW = 2 * Math.atan(halfW / dist / this.aspect);
    const vH = 2 * Math.atan(halfH / dist);
    this.camera.fov = THREE.MathUtils.radToDeg(Math.max(vW, vH));
    this.camera.updateProjectionMatrix();
  }

  // ---------- taps ----------

  /** Handle a tap at normalised device coordinates (-1..1). */
  tap(x: number, y: number): void {
    if (this.won || this.camT < 1) return;
    this.ray.setFromCamera(new THREE.Vector2(x, y), this.camera);
    const hits = this.ray.intersectObject(this.root, true);
    for (const h of hits) {
      if (!visibleChain(h.object) || noHit(h.object)) continue;
      const rec = this.findObj(h.object);
      if (!rec) return; // tapped scenery in front of anything interactive
      this.activate(rec);
      if (rec === this.catObj) this.sparkle(h.point);
      return;
    }
  }

  private findObj(o: THREE.Object3D | null): ObjRec | null {
    while (o) {
      if (o.userData.oid) return this.objs.get(o.userData.oid) ?? null;
      o = o.parent;
    }
    return null;
  }

  /** Tap an object by id (also used by the automated walkthrough). */
  activate(rec: ObjRec | string): boolean {
    if (typeof rec === 'string') {
      const r = this.objs.get(rec);
      if (!r) throw new Error(`No object ${rec}`);
      rec = r;
    }
    if (rec.visible && !rec.visible(this.s.flags)) return false;
    // close-up objects: from their parent wall, the first tap zooms in
    if (rec.views && !rec.any && !rec.views.includes(this.view)) {
      const into = rec.views.find((v) => this.views.get(v)?.parent === this.view)
        ?? rec.views.find((v) => this.views.get(v)?.wall === this.currentView.wall);
      if (into) this.setView(into);
      return false;
    }
    if (rec.zoomTo && this.view !== rec.zoomTo && !this.selected) {
      this.setView(rec.zoomTo);
      return false;
    }
    const item = this.selected;
    const c = this.ctx(item);
    if (item) {
      const fn = rec.uses[item];
      this.selected = null;
      this.ui.inventoryChanged();
      if (fn) { fn(c); return true; }
      if (rec.zoomTo && this.view !== rec.zoomTo) { this.setView(rec.zoomTo); return false; }
      const lines = T.notUseful;
      this.ui.say(lines[Math.floor(Math.random() * lines.length)]);
      sfx('wrong');
      return false;
    }
    if (rec === this.catObj && !rec.onTap) {
      this.catApi.meow();
      const lines = T.tapCat;
      this.ui.say(lines[Math.floor(Math.random() * lines.length)]);
      return true;
    }
    if (rec.onTap) { rec.onTap(c); return true; }
    sfx('tap');
    return false;
  }

  /** Run one scripted walkthrough step (automated tests). */
  runAction(a: Action): void {
    if (a.tap) {
      const rec = this.objs.get(a.tap)!;
      if (!rec) throw new Error(`No object ${a.tap}`);
      if (rec.views && !rec.any && !rec.views.includes(this.view)) this.view = rec.views[0];
      else if (rec.zoomTo) this.view = rec.zoomTo;
      if (!this.activate(rec)) throw new Error(`Tap on ${a.tap} did nothing`);
    }
    if (a.use) {
      const [item, target] = a.use;
      if (!this.has(item)) throw new Error(`Missing item ${item} for ${target}`);
      const rec = this.objs.get(target)!;
      if (!rec) throw new Error(`No object ${target}`);
      if (rec.views && !rec.any && !rec.views.includes(this.view)) this.view = rec.views[0];
      else if (rec.zoomTo) this.view = rec.zoomTo;
      this.selected = item;
      if (!this.activate(rec)) throw new Error(`Using ${item} on ${target} did nothing`);
    }
    if (a.combine) {
      if (!this.combine(a.combine[0], a.combine[1])) throw new Error(`Can't combine ${a.combine}`);
    }
  }

  // ---------- hints ----------

  hintStep(): number {
    const has = (i: string) => this.has(i);
    const i = this.def.hints.findIndex((h) => !h.done(this.s.flags, has));
    return i < 0 ? this.def.hints.length : i;
  }

  // ---------- per-frame update ----------

  update(dt: number): void {
    if (!this.won) this.s.elapsed += dt;
    const k = this.firstFrame ? 1 : 1 - Math.exp(-dt * 8);
    this.firstFrame = false;
    for (const rec of this.objs.values()) {
      if (rec.visible) rec.node.visible = rec.visible(this.s.flags);
      if (rec.animate) rec.animate(this.s.flags, rec.node, k);
    }
    // camera tween
    if (this.camT < 1) {
      this.camT = Math.min(1, this.camT + dt / this.camDur);
      const e = this.camT * this.camT * (3 - 2 * this.camT);
      this.camera.position.lerpVectors(this.camFrom.pos, this.camTo.pos, e);
      this.camTarget.lerpVectors(this.camFrom.target, this.camTo.target, e);
      this.camera.lookAt(this.camTarget);
    }
    // cat
    if (this.cat) {
      if (this.catMove) {
        const m = this.catMove;
        m.t = Math.min(1, m.t + dt / 0.8);
        const e = m.t * m.t * (3 - 2 * m.t);
        this.cat.root.position.lerpVectors(m.from, m.to, e);
        this.cat.root.position.y += Math.sin(m.t * Math.PI) * 0.7;
        this.cat.root.rotation.y = m.fromRot + angleDiff(m.fromRot, m.toRot) * e;
        if (m.t >= 1) { this.cat.setPose(m.pose); this.catMove = null; sfx('thud'); }
      }
      this.cat.update(dt);
    }
    for (const s of [...this.sparkles]) {
      s.t += dt;
      s.m.position.y += dt * 0.5;
      s.m.scale.setScalar(0.06 * (1 - s.t));
      if (s.t >= 1) { this.root.remove(s.m); this.sparkles.splice(this.sparkles.indexOf(s), 1); }
    }
  }

  private sparkle(p: THREE.Vector3): void {
    for (let i = 0; i < 4; i++) {
      const m = new THREE.Mesh(heartGeo, mat(0xff6f91, { emissive: 0xff3f6f }));
      m.position.copy(p).add(new THREE.Vector3((Math.random() - 0.5) * 0.3, 0.1 + i * 0.08, (Math.random() - 0.5) * 0.3));
      this.root.add(m);
      this.sparkles.push({ m, t: -i * 0.1 });
    }
  }

  /** Project a world position (e.g. the cat) to screen pixels for UI speech bubbles. */
  project(p: THREE.Vector3, w: number, h: number): { x: number; y: number } {
    const v = p.clone().project(this.camera);
    return { x: (v.x + 1) / 2 * w, y: (1 - v.y) / 2 * h };
  }

  dispose(): void {
    this.scene.traverse((o) => {
      if (o instanceof THREE.Mesh) {
        const m = o.material as THREE.MeshStandardMaterial;
        if (m.map && !(m.map as THREE.CanvasTexture).userData?.shared) m.map.dispose();
      }
    });
  }
}

const heartGeo = new THREE.SphereGeometry(1, 8, 6);

function visibleChain(o: THREE.Object3D | null): boolean {
  while (o) {
    if (!o.visible) return false;
    o = o.parent;
  }
  return true;
}

function noHit(o: THREE.Object3D | null): boolean {
  while (o) {
    if (o.userData.noHit) return true;
    o = o.parent;
  }
  return false;
}

function angleDiff(a: number, b: number): number {
  let d = (b - a) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return d;
}

export type { Txt };
