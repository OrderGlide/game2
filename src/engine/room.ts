// Runs one escape room: builds the 3D room from its definition, moves the camera between the four walls
// and close-ups, turns taps into object interactions and keeps the room's state (flags + inventory).
// Also owns the horror atmosphere: dirty walls, fog, a flickering bulb, darkness + flashlight, and scares.
import * as THREE from 'three';
import { sfx, vibrate, type Sfx } from '../audio';
import { T, tx, type Txt } from '../i18n';
import { canvasTex, drawGrime, drawPattern, mat, box, shade, mulberry32 } from '../view/kit';
import { hangingBulb, shadowFigure } from '../view/horror';
import { imagePlane, pbr } from '../view/assets';
import type { Action, Builder, Ctx, DocDef, Flags, Handler, LockDef, ObjHandle, Place, RoomDef, RoomTheme, ScareKind } from './types';

export const HALF = 4;
export const HEIGHT = 3.4;

const FACING = [new THREE.Vector3(0, 0, -1), new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 0, 1), new THREE.Vector3(-1, 0, 0)];
const RIGHT = [new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 0, 1), new THREE.Vector3(-1, 0, 0), new THREE.Vector3(0, 0, -1)];
export const ROT = [0, -Math.PI / 2, Math.PI, Math.PI / 2];

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
}

export interface RoomUI {
  say(text: string): void;
  read(doc: DocDef): void;
  lock(def: LockDef, onOpen: () => void): void;
  inventoryChanged(): void;
  viewChanged(): void;
  won(): void;
  scare(kind: ScareKind): void;
}

export interface RoomOptions { shadows: boolean; scares: boolean }

interface ObjRec {
  id: string;
  node: THREE.Object3D;
  onTap?: Handler;
  uses: Record<string, Handler>;
  visible?: (f: Flags) => boolean;
  animate?: (f: Flags, node: THREE.Object3D, k: number) => void;
  zoomTo?: string;
  views?: string[];
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
  private camFrom = { pos: new THREE.Vector3(), target: new THREE.Vector3() };
  private camTo = { pos: new THREE.Vector3(), target: new THREE.Vector3() };
  private camT = 1;
  private camDur = 0.45;
  private camTarget = new THREE.Vector3();
  private aspect = 16 / 9;
  private ray = new THREE.Raycaster();
  private firstFrame = true;
  // atmosphere
  private bulb!: THREE.PointLight;
  private bulbMesh!: THREE.Mesh;
  private bulbBase = 1;
  private lights: { l: THREE.Light; base: number }[] = [];
  private torch = new THREE.SpotLight(0xfff2d0, 0, 9, 0.5, 0.45, 1.2);
  private blackout = 0;
  private flickerT = 0;
  private nextAmbient = 20;
  private shake = 0;
  private figure: THREE.Group;
  private figureT = 0;
  private time = 0;

  constructor(public def: RoomDef, save: RoomSave | null, private ui: RoomUI, private opts: RoomOptions) {
    this.s = save && save.id === def.id ? save : { id: def.id, flags: {}, inv: [], elapsed: 0, hintsUsed: 0, shown: {} };
    this.scene.add(this.root);
    this.buildShell();
    for (let w = 0; w < 4; w++) this.addWallView(w);
    def.build(this.builder());
    this.figure = shadowFigure();
    this.figure.visible = false;
    this.scene.add(this.figure);
    this.camera.add(this.torch, this.torch.target);
    this.torch.position.set(0.15, -0.2, 0);
    this.torch.target.position.set(0, -0.1, -3);
    this.scene.add(this.camera);
    this.setView('w0', true);
  }

  // ---------- room shell ----------

  private buildShell(): void {
    const th = this.def.theme;
    const rnd = mulberry32(this.def.level * 131 + 7);
    this.scene.background = new THREE.Color(th.fog);
    this.scene.fog = new THREE.Fog(th.fog, 6, 16);
    const b = th.bright;
    // photo textures carry their own detail, so they get moodier light: less fill, a stronger bulb
    const fill = th.pbr ? 0.5 : 1;
    const hemi = new THREE.HemisphereLight(0xd8d4dc, shade(th.floor, 0.6), 1.25 * b * fill);
    const amb = new THREE.AmbientLight(0xffffff, 0.3 * b * fill);
    const moon = new THREE.DirectionalLight(0x9fb2e0, 0.9 * b * (th.pbr ? 0.8 : 1));
    moon.position.set(-3, 6, 4);
    this.bulb = new THREE.PointLight(th.light, (th.pbr ? 34 : 26) * b, 16, th.pbr ? 1.5 : 1.3);
    this.bulb.position.set(0, HEIGHT - 0.75, 0.3);
    if (this.opts.shadows) {
      this.bulb.castShadow = true;
      this.bulb.shadow.mapSize.set(512, 512);
      this.bulb.shadow.bias = -0.004;
      this.bulb.shadow.radius = 3;
    }
    this.bulbBase = this.bulb.intensity;
    this.lights = [{ l: hemi, base: hemi.intensity }, { l: amb, base: amb.intensity }, { l: moon, base: moon.intensity }];
    this.scene.add(hemi, amb, moon, this.bulb);
    const hb = hangingBulb(th.light);
    hb.position.set(0, HEIGHT, 0.3);
    this.bulbMesh = hb.getObjectByName('glass') as THREE.Mesh;
    this.root.add(hb);

    if (th.pbr) this.buildPbrShell(th.pbr, rnd);
    else this.buildDrawnShell(rnd);
  }

  /** Walls, floor and ceiling drawn on canvases from the theme colours. */
  private buildDrawnShell(rnd: () => number): void {
    const th = this.def.theme;
    const S = HALF * 2;
    // floor: pattern + dirt, not repeating
    const floorTex = canvasTex(1024, 1024, (c) => {
      drawPattern(c, th.floorKind, th.floor, th.floor2, 1024, 1024, 128, rnd);
      drawGrime(c, 1024, 1024, th.grime * 0.8, rnd, false);
    });
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(S, S), mat(0xffffff, { map: floorTex, rough: 0.85 }));
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    const ceilTex = canvasTex(512, 512, (c) => {
      c.fillStyle = `#${th.ceiling.toString(16).padStart(6, '0')}`;
      c.fillRect(0, 0, 512, 512);
      drawGrime(c, 512, 512, th.grime, rnd, false);
    });
    const ceil = new THREE.Mesh(new THREE.PlaneGeometry(S, S), mat(0xffffff, { map: ceilTex, rough: 1 }));
    ceil.rotation.x = Math.PI / 2;
    ceil.position.y = HEIGHT;
    this.root.add(floor, ceil);
    for (let w = 0; w < 4; w++) {
      const wallTex = canvasTex(1024, 436, (c) => {
        drawPattern(c, th.pattern, th.wall, th.wall2, 1024, 436, 110, rnd);
        drawGrime(c, 1024, 436, th.grime, rnd);
      });
      const wall = new THREE.Mesh(new THREE.PlaneGeometry(S, HEIGHT), mat(0xffffff, { map: wallTex, rough: 0.95 }));
      wall.position.copy(FACING[w]).multiplyScalar(HALF).setY(HEIGHT / 2);
      wall.rotation.y = ROT[w];
      wall.receiveShadow = true;
      this.root.add(wall);
      const skirt = box(S, 0.14, 0.05, th.trim);
      skirt.position.copy(FACING[w]).multiplyScalar(HALF - 0.025).setY(0.07);
      skirt.rotation.y = ROT[w];
      skirt.castShadow = false;
      this.root.add(skirt);
    }
  }

  /** Photo-textured PBR surfaces, with a unique layer of drawn dirt on top so the tiling doesn't show. */
  private buildPbrShell(p: NonNullable<RoomTheme['pbr']>, rnd: () => number): void {
    const th = this.def.theme;
    const S = HALF * 2;
    const grime = (w: number, h: number, amount: number, drips: boolean) => new THREE.MeshStandardMaterial({
      map: canvasTex(w, h, (c) => drawGrime(c, w, h, amount, rnd, drips)),
      transparent: true, depthWrite: false, roughness: 1, polygonOffset: true, polygonOffsetFactor: -2,
    });
    const plane = (w: number, h: number, m: THREE.Material) => {
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), m);
      mesh.receiveShadow = true;
      if (m.transparent) mesh.userData.noHit = true; // dirt layers never block taps
      return mesh;
    };
    const flat = (o: THREE.Object3D, y: number, up: boolean) => {
      o.rotation.x = up ? -Math.PI / 2 : Math.PI / 2;
      o.position.y = y;
      this.root.add(o);
    };
    flat(plane(S, S, pbr(p.floor, [S / p.floorTile, S / p.floorTile], { tint: 0xd8d0c8 })), 0, true);
    flat(plane(S, S, grime(1024, 1024, th.grime * 0.9, false)), 0.002, true);
    flat(plane(S, S, pbr(p.ceiling, [S / 2.5, S / 2.5], { tint: shade(th.ceiling, 2.2) })), HEIGHT, false);
    for (let w = 0; w < 4; w++) {
      const put = (o: THREE.Object3D, out: number, y: number) => {
        o.position.copy(FACING[w]).multiplyScalar(HALF - out).setY(y);
        o.rotation.y = ROT[w];
        this.root.add(o);
      };
      put(plane(S, HEIGHT, pbr(p.wall, [S / p.wallTile, HEIGHT / p.wallTile], { tint: 0x869484, normal: 0.8 })), 0, HEIGHT / 2);
      put(plane(S, HEIGHT, grime(1024, 436, th.grime, true)), 0.003, HEIGHT / 2);
      const trim = p.trim ? pbr(p.trim, [S / 1.5, 0.12], { tint: 0x9a8c80 }) : mat(th.trim);
      const skirt = box(S, 0.16, 0.035, trim);
      skirt.castShadow = false;
      put(skirt, 0.0175, 0);
      const crown = box(S, 0.08, 0.05, trim);
      crown.castShadow = false;
      put(crown, 0.025, HEIGHT - 0.08);
      // wallpaper torn off down to the plaster, and old smears of blood
      for (let i = Math.floor(rnd() * 2.2 * th.grime + 0.6); i > 0; i--) {
        const size = 0.45 + rnd() * 0.5;
        const d = imagePlane('peel.webp', size, size * 1.05, true, 0x9a9088);
        d.rotation.z = (rnd() - 0.5) * 0.5;
        put(d, 0.004 + rnd() * 0.001, 0.4 + size / 2 + rnd() * (HEIGHT - 1.1 - size));
        d.position.addScaledVector(RIGHT[w], (rnd() - 0.5) * 6.5);
      }
      if (rnd() < th.grime * 0.8) {
        const d = imagePlane('blood_smear.webp', 0.6, 0.35, true);
        d.rotation.z = (rnd() - 0.5) * 1.2;
        put(d, 0.006, 0.6 + rnd() * 1.4);
        d.position.addScaledVector(RIGHT[w], (rnd() - 0.5) * 6);
      }
    }
  }

  private addWallView(w: number): void {
    const pos = FACING[w].clone().multiplyScalar(-2.4).setY(1.75);
    const target = FACING[w].clone().multiplyScalar(HALF).setY(1.05);
    this.views.set(`w${w}`, { id: `w${w}`, pos, target, parent: null, wall: w, fovScale: 1 });
  }

  // ---------- builder API used by room definitions ----------

  private builder(): Builder {
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
      zoomView: (id, p) => {
        const target = wallPoint({ ...p, out: p.out ?? 0.3 });
        const pos = wallPoint({ ...p, out: (p.out ?? 0.3) + p.dist, y: (p.y ?? 0) + (p.look ?? 0.2) });
        this.views.set(id, { id, pos, target, parent: p.parent ?? `w${p.wall}`, wall: p.wall, fovScale: p.dist / 7 });
      },
    };
  }

  // ---------- context handed to room scripts ----------

  private ctx(item: string | null): Ctx {
    return {
      f: this.s.flags,
      item,
      has: (id) => this.s.inv.includes(id),
      give: (id) => this.give(id),
      take: (id) => this.take(id),
      say: (t: Txt) => this.ui.say(tx(t)),
      read: (d) => { sfx('paper'); this.ui.read(d); },
      lock: (d, onOpen) => this.ui.lock(d, () => { sfx('unlock'); vibrate(30); onOpen(); this.ui.inventoryChanged(); }),
      zoom: (v) => this.setView(v),
      sfx: (n: Sfx) => sfx(n),
      vibrate,
      scare: (k) => this.scare(k),
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
    sfx('door');
    vibrate(60);
    const v = this.views.get('w0')!;
    this.moveCamera(v.pos.clone().lerp(v.target, 0.9).setY(1.6), v.target.clone().add(new THREE.Vector3(-1.3, 0.2, -4)), 1.6);
    setTimeout(() => this.ui.won(), 1500);
  }

  // ---------- scares & atmosphere ----------

  scare(kind: ScareKind): void {
    if (!this.opts.scares && kind === 'figure') kind = 'flicker';
    switch (kind) {
      case 'flicker':
        this.blackout = 1.1;
        sfx('whisper');
        break;
      case 'whisper':
        sfx('whisper');
        break;
      case 'bang':
        sfx('bang');
        this.shake = 0.35;
        vibrate(80);
        break;
      case 'figure': {
        // a dark shape stands in the room for a split second, in front of whatever wall you face
        const v = this.currentView;
        const side = Math.random() < 0.5 ? -1 : 1;
        const p = wallPoint({ wall: v.wall as 0 | 1 | 2 | 3, u: side * (1.2 + Math.random() * 1.2), out: 1.2 });
        this.figure.position.copy(p);
        this.figure.lookAt(this.camera.position.x, 0, this.camera.position.z);
        this.figure.visible = true;
        this.figureT = 0.55;
        this.blackout = 0.7;
        sfx('scare');
        vibrate(120);
        this.shake = 0.25;
        break;
      }
    }
    this.ui.scare(kind);
  }

  private get torchOn(): boolean { return this.s.inv.includes('torch'); }

  private updateAtmosphere(dt: number): void {
    this.time += dt;
    // bulb flicker: gentle wobble, occasional stutter, and blackouts from scares
    this.flickerT -= dt;
    let f = 0.92 + Math.sin(this.time * 23) * 0.03 + Math.sin(this.time * 7.3) * 0.04;
    if (this.flickerT < 0) {
      if (Math.random() < 0.004 + (this.def.theme.grime > 0.6 ? 0.004 : 0)) this.flickerT = 0.25 + Math.random() * 0.4;
    } else f *= Math.random() < 0.5 ? 0.15 : 1;
    if (this.blackout > 0) { this.blackout -= dt; f *= Math.random() < 0.7 ? 0.05 : 0.6; }
    const dark = this.def.dark && !this.s.flags.power;
    const dim = dark ? 0.08 : 1;
    this.bulb.intensity = this.bulbBase * f * dim;
    (this.bulbMesh.material as THREE.MeshStandardMaterial).emissiveIntensity = f * dim;
    for (const { l, base } of this.lights) l.intensity = base * (dark ? 0.25 : 0.85 + f * 0.15);
    this.torch.intensity = this.torchOn ? (dark ? 26 : 10) * (0.96 + Math.random() * 0.04) : 0;
    // ambient noises now and then
    this.nextAmbient -= dt;
    if (this.nextAmbient <= 0 && !this.won) {
      this.nextAmbient = 18 + Math.random() * 30;
      const r = Math.random();
      if (r < 0.3) sfx('creak'); else if (r < 0.5) sfx('knock'); else if (r < 0.7) sfx('drip'); else if (r < 0.85) sfx('whisper');
      else { this.flickerT = 0.5; sfx('buzz'); }
    }
    // the figure fades out
    if (this.figureT > 0) {
      this.figureT -= dt;
      if (this.figureT <= 0) this.figure.visible = false;
    }
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
      sfx('step');
    }
    this.applyFov();
    this.ui.viewChanged();
  }

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
    if (rec.views && !rec.views.includes(this.view)) {
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
    if (rec.onTap) { rec.onTap(c); return true; }
    sfx('tap');
    return false;
  }

  /** Run one scripted walkthrough step (automated tests). */
  runAction(a: Action): void {
    const prep = (id: string): ObjRec => {
      const rec = this.objs.get(id);
      if (!rec) throw new Error(`No object ${id}`);
      if (rec.views && !rec.views.includes(this.view)) this.view = rec.views[0];
      else if (rec.zoomTo) this.view = rec.zoomTo;
      return rec;
    };
    if (a.tap) {
      if (!this.activate(prep(a.tap))) throw new Error(`Tap on ${a.tap} did nothing`);
    }
    if (a.use) {
      const [item, target] = a.use;
      if (!this.has(item)) throw new Error(`Missing item ${item} for ${target}`);
      const rec = prep(target);
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
    if (this.camT < 1) {
      this.camT = Math.min(1, this.camT + dt / this.camDur);
      const e = this.camT * this.camT * (3 - 2 * this.camT);
      this.camera.position.lerpVectors(this.camFrom.pos, this.camTo.pos, e);
      this.camTarget.lerpVectors(this.camFrom.target, this.camTo.target, e);
    }
    this.camera.lookAt(this.camTarget);
    // slow breathing sway, plus shake after a scare
    const sway = 0.004;
    this.camera.rotation.z += Math.sin(this.time * 0.6) * sway;
    if (this.shake > 0) {
      this.shake -= dt;
      this.camera.rotation.x += (Math.random() - 0.5) * this.shake * 0.08;
      this.camera.rotation.y += (Math.random() - 0.5) * this.shake * 0.08;
    }
    this.updateAtmosphere(dt);
  }

  dispose(): void {
    this.scene.traverse((o) => {
      if (o instanceof THREE.Mesh) {
        const m = o.material as THREE.MeshStandardMaterial;
        if (m.map) m.map.dispose();
      }
    });
  }
}

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
