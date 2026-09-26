// Level generator: builds escape room number N (1–100) from a seed. Works backwards from the exit door:
// every lock needs something (a key, a code, a tool, power…), that something is hidden somewhere that may be
// locked too, and so on. Deeper chains, more door locks and trickier clues as the level number grows.
// It also writes the hint for every step and the full solution, which the automated test replays.
import * as THREE from 'three';
import { L, lang, tx, type Txt } from '../i18n';
import type { Action, Builder, CombineDef, Ctx, Flags, Handler, ItemDef, LockDef, Place, RoomDef } from '../engine/types';
import { canvasTex, mulberry32 } from '../view/kit';
import * as H from '../view/horror';
import { batteries, colorPanel, flashlight, keypad, letterLock, padlock, screwdriver, smallKey } from '../view/furniture';
import { PHRASES, themeFor, type DecorKind, type Theme } from './themes';

type Wall = 0 | 1 | 2 | 3;
type GateKind = 'free' | 'key' | 'code' | 'chain' | 'hammer' | 'screwdriver' | 'knife' | 'slide' | 'power';
type CodeKind = 'digits' | 'keypad' | 'letters' | 'symbols' | 'colors';
type ToolKind = 'hammer' | 'screwdriver' | 'cutters' | 'knife';

interface Slot { wall: Wall; u: number; mount: 'floor' | 'wall'; maxW: number; used: boolean }
interface Step { done: (f: Flags, has: (i: string) => boolean) => boolean; hints: Txt[]; actions: Action[] }

interface ObjSpec {
  id: string;
  make: () => THREE.Object3D;
  place: Place;
  fx?: boolean;
  zoom?: string;
  inView?: string;
  show?: (f: Flags) => boolean;
  anim?: (f: Flags, n: THREE.Object3D, k: number) => void;
  tap?: Handler;
  uses: Record<string, Handler>;
}

/** Something that can be unlocked: a container or one of the door's locks. */
interface Target {
  id: string;
  flag: string;
  name: Txt;
  where: Txt;
  gates: GateKind[];
  spec: ObjSpec;
  /** called when unlocked */
  onOpen: (c: Ctx) => void;
  door: boolean;
  lockAt?: Place;
  acc?: Txt;
}

interface GateResult { kind: GateKind; lock?: LockDef; tool?: ToolKind }

const WHERE: Txt[] = [
  L('ściana z drzwiami', 'the door wall'), L('prawa ściana', 'the right wall'), L('ściana za tobą', 'the wall behind you'), L('lewa ściana', 'the left wall'),
];

const TOOLS: Record<ToolKind, { icon: string; name: Txt; desc: Txt; make: () => THREE.Object3D }> = {
  hammer: { icon: '🔨', name: L('Młotek', 'Hammer'), desc: L('Ciężki młotek z pazurem do gwoździ.', 'A heavy claw hammer.'), make: H.hammer },
  screwdriver: { icon: '🪛', name: L('Śrubokręt', 'Screwdriver'), desc: L('Stary śrubokręt.', 'An old screwdriver.'), make: screwdriver },
  cutters: { icon: '✂️', name: L('Nożyce do metalu', 'Bolt cutters'), desc: L('Przetną każdy łańcuch.', 'They cut through any chain.'), make: H.cutters },
  knife: { icon: '🔪', name: L('Nóż', 'Knife'), desc: L('Nóż z zaschniętą plamą na ostrzu.', 'A knife with a dried stain on the blade.'), make: H.knife },
};
const GATE_TOOL: Partial<Record<GateKind, ToolKind>> = { hammer: 'hammer', screwdriver: 'screwdriver', chain: 'cutters', knife: 'knife' };

const KEY_NAMES: Txt[] = [
  L('Zardzewiały klucz', 'Rusty key'), L('Mosiężny klucz', 'Brass key'), L('Mały kluczyk', 'Small key'), L('Srebrny klucz', 'Silver key'),
  L('Czarny klucz', 'Black key'), L('Kościany klucz', 'Bone key'), L('Stary klucz', 'Old key'), L('Klucz z zawieszką', 'Tagged key'),
];
const KEY_COLORS = [0x8a5a3a, 0xc9a23a, 0xb8b8b0, 0xd8d8e0, 0x2a2a2a, 0xe8dcc8, 0x8a7a50, 0xa08a50];

const SYMBOLS = '☽✚☠✦◆⌘';
const COLORS = [
  { id: 'red', css: '#b3261e', name: L('czerwony', 'red'), dot: '🔴' },
  { id: 'green', css: '#2e7d32', name: L('zielony', 'green'), dot: '🟢' },
  { id: 'blue', css: '#1f5fbf', name: L('niebieski', 'blue'), dot: '🔵' },
  { id: 'yellow', css: '#e0b31c', name: L('żółty', 'yellow'), dot: '🟡' },
  { id: 'white', css: '#e8e6dc', name: L('biały', 'white'), dot: '⚪' },
  { id: 'purple', css: '#6a2a9a', name: L('fioletowy', 'purple'), dot: '🟣' },
];
const WORDS = {
  pl: ['DUCH', 'KREW', 'MROK', 'GROB', 'TRUP', 'ZJAWA', 'LALKA', 'KRZYK', 'CIEMNO', 'UPIOR', 'STRACH', 'WIDMO'],
  en: ['GHOST', 'BLOOD', 'DARK', 'GRAVE', 'BONES', 'DOLL', 'SCREAM', 'CRYPT', 'NIGHT', 'FEAR', 'SHADOW', 'CURSE'],
};
const NUM_WORDS = {
  pl: ['ZERO', 'JEDEN', 'DWA', 'TRZY', 'CZTERY', 'PIEC', 'SZESC', 'SIEDEM', 'OSIEM', 'DZIEWIEC'],
  en: ['ZERO', 'ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX', 'SEVEN', 'EIGHT', 'NINE'],
};
const ROMAN = ['0', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX'];
const DICE = ['0', '⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];
const PART = ['I', 'II', 'III'];

const JUNK: { icon: string; name: Txt; desc: Txt }[] = [
  { icon: '🥄', name: L('Zardzewiała łyżka', 'Rusty spoon'), desc: L('Do niczego się nie przyda.', 'Useless.') },
  { icon: '👁️', name: L('Szklane oko', 'Glass eye'), desc: L('Patrzy na ciebie.', 'It is looking at you.') },
  { icon: '🦷', name: L('Ząb', 'A tooth'), desc: L('Ludzki. Chyba.', 'Human. Probably.') },
  { icon: '🧸', name: L('Rozpruty miś', 'Torn teddy'), desc: L('W środku tylko wata.', 'Only stuffing inside.') },
  { icon: '🕯️', name: L('Ogarek', 'Candle stub'), desc: L('Wypalona świeczka.', 'A burnt-out candle.') },
];

export function levelId(n: number): string { return `L${n}`; }

class Gen {
  rnd: () => number;
  theme: Theme;
  steps: Step[] = [];
  items: Record<string, ItemDef> = {};
  combos: CombineDef[] = [];
  specs: ObjSpec[] = [];
  views: { id: string; p: Place & { dist: number; look?: number } }[] = [];
  pickups: { item: string; make: () => THREE.Object3D; p: Place; view?: string; when?: (f: Flags) => boolean }[] = [];
  decor: ((b: Builder) => void)[] = [];
  slots: Slot[] = [];
  loose: Place[] = [];
  high: Place[] = [];
  uid = 0;
  keyNo = 0;
  tools: Partial<Record<ToolKind, 'pending' | 'ready'>> = {};
  power: 'none' | 'pending' | 'ready' = 'none';
  uv: 'none' | 'pending' | 'ready' = 'none';
  scareable: Target[] = [];
  doorLeafUsed = false;
  targetsMade = 0;

  constructor(public n: number) {
    this.rnd = mulberry32(n * 7919 + 1301);
    this.theme = themeFor(n);
    this.makeSlots();
  }

  // ---------- helpers ----------

  pick<T>(a: T[]): T { return a[Math.floor(this.rnd() * a.length)]; }
  chance(p: number): boolean { return this.rnd() < p; }
  int(a: number, b: number): number { return a + Math.floor(this.rnd() * (b - a + 1)); }
  id(prefix: string): string { return `${prefix}${++this.uid}`; }
  shuffle<T>(a: T[]): T[] {
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(this.rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  }

  private makeSlots(): void {
    const s = (wall: Wall, u: number, mount: 'floor' | 'wall', maxW: number) => this.slots.push({ wall, u, mount, maxW, used: false });
    s(0, 1.25, 'floor', 1.0); s(0, 2.85, 'floor', 1.1); s(0, 2.05, 'wall', 0.75);
    for (const w of [1, 2, 3] as Wall[]) {
      s(w, -2.35, 'floor', 1.3); s(w, 0, 'floor', 1.3); s(w, 2.35, 'floor', 1.3);
      s(w, -1.15, 'wall', 0.75); s(w, 1.15, 'wall', 0.75);
    }
    this.shuffle(this.slots);
    for (const w of [0, 1, 2, 3] as Wall[]) {
      for (const u of w === 0 ? [0.3, 2.1] : [-2.9, -1.3, 0.8, 2.6]) this.loose.push({ wall: w, u, out: 1.05 + this.rnd() * 0.35 });
      for (const u of [-2.2, 0.2, 2.3]) if (!(w === 0 && u < 0)) this.high.push({ wall: w, u, y: 1.95 });
    }
    this.shuffle(this.loose);
    this.shuffle(this.high);
  }

  takeSlot(mount: 'floor' | 'wall', w: number): Slot | null {
    const s = this.slots.find((x) => !x.used && x.mount === mount && x.maxW >= w);
    if (s) s.used = true;
    return s ?? null;
  }

  takeLoose(): Place {
    return this.loose.shift() ?? { wall: this.pick([1, 2, 3]) as Wall, u: this.rnd() * 5 - 2.5, out: 1.2 + this.rnd() * 0.6 };
  }

  get level(): number { return this.n; }

  // ---------- difficulty ----------

  gatesAllowed(): GateKind[] {
    const n = this.n;
    const g: GateKind[] = ['free', 'key'];
    if (n >= 2) g.push('code');
    if (n >= 5) g.push('hammer');
    if (n >= 7) g.push('screwdriver');
    if (n >= 11) g.push('chain');
    if (n >= 16) g.push('knife');
    if (n >= 12) g.push('slide');
    if (n >= 18) g.push('power');
    return g;
  }

  codeKinds(): CodeKind[] {
    const n = this.n;
    const k: CodeKind[] = ['digits'];
    if (n >= 6) k.push('keypad');
    if (n >= 10) k.push('letters');
    if (n >= 14) k.push('symbols');
    if (n >= 20) k.push('colors');
    return k;
  }

  // ---------- items ----------

  addItem(id: string, def: ItemDef): string { this.items[id] = def; return id; }

  newKey(): { id: string; make: () => THREE.Object3D } {
    const i = this.keyNo++ % KEY_NAMES.length;
    const id = this.addItem(this.id('key'), { icon: i % 2 ? '🔑' : '🗝️', name: KEY_NAMES[i], desc: L('Do czego pasuje?', 'What does it open?') });
    const color = KEY_COLORS[i];
    return { id, make: () => (i % 3 === 0 ? H.oldKey(color) : smallKey(color)) };
  }

  /** Make an item obtainable, spending up to `budget` extra steps on hiding it. */
  hide(item: string, make: () => THREE.Object3D, budget: number): void {
    const def = this.items[item];
    if (budget > 0 || this.chance(0.55)) {
      const c = this.newContainer(budget > 0 ? undefined : ['free']);
      if (c) {
        this.gate(c.target, budget - 1);
        this.pickups.push({ item, make, p: c.inside, view: c.view, when: (f) => !!f[c.target.flag] });
        this.steps.push({
          done: (f) => !!f[`got_${item}`],
          hints: [
            L(`Zajrzyj do środka: ${tx(c.target.name)} (${tx(c.target.where)}).`, `Look inside the ${tx(c.target.name)} (${tx(c.target.where)}).`),
            L(`W środku: ${def.icon} ${tx(def.name)}.`, `Inside: ${def.icon} ${tx(def.name)}.`),
            L(`Weź ${tx(def.name).toLowerCase()} z: ${tx(c.target.name)} (${tx(c.target.where)}).`, `Take the ${tx(def.name).toLowerCase()} from the ${tx(c.target.name)} (${tx(c.target.where)}).`),
          ],
          actions: [{ tap: `pick_${item}` }],
        });
        return;
      }
    }
    // lying around, glinting
    const p = this.takeLoose();
    this.pickups.push({ item, make, p });
    this.steps.push({
      done: (f) => !!f[`got_${item}`],
      hints: [
        L('Rozejrzyj się uważnie. Coś błyszczy na podłodze.', 'Look around carefully. Something glints on the floor.'),
        L(`Sprawdź podłogę: ${tx(WHERE[p.wall])}.`, `Check the floor: ${tx(WHERE[p.wall])}.`),
        L(`Podnieś ${def.icon} ${tx(def.name).toLowerCase()} z podłogi (${tx(WHERE[p.wall])}).`, `Pick up the ${def.icon} ${tx(def.name).toLowerCase()} from the floor (${tx(WHERE[p.wall])}).`),
      ],
      actions: [{ tap: `pick_${item}` }],
    });
  }

  tool(kind: ToolKind, budget: number): string {
    const id = `tool_${kind}`;
    if (this.tools[kind]) return id;
    this.tools[kind] = 'pending';
    const t = TOOLS[kind];
    this.addItem(id, { icon: t.icon, name: t.name, desc: t.desc });
    this.hide(id, t.make, budget);
    this.tools[kind] = 'ready';
    return id;
  }

  // ---------- containers ----------

  newContainer(only?: GateKind[]): { target: Target; inside: Place; view: string } | null {
    const n = this.n;
    const allowed = this.gatesAllowed().filter((g) => this.gateUsable(g, false));
    type Opt = { key: string; make: () => H.Container; gates: GateKind[]; min: number };
    const all: Opt[] = [
      { key: 'cabinet', make: () => H.cabinet(), gates: ['free', 'key', 'code', 'chain', 'knife'], min: 1 },
      { key: 'locker', make: () => H.locker(), gates: ['free', 'key', 'code', 'chain'], min: 1 },
      { key: 'drawers', make: () => H.drawers(), gates: ['free', 'key', 'code'], min: 1 },
      { key: 'desk', make: () => H.desk(), gates: ['free', 'key', 'code'], min: 1 },
      { key: 'trunk', make: () => H.trunk(), gates: ['free', 'key', 'code', 'chain', 'knife'], min: 1 },
      { key: 'crate', make: () => H.crate(), gates: ['hammer'], min: 5 },
      { key: 'safe', make: () => H.wallSafe(), gates: ['code', 'power'], min: 4 },
      { key: 'medcab', make: () => H.medCabinet(), gates: ['free', 'key'], min: 1 },
      { key: 'vent', make: () => H.vent(), gates: ['screwdriver'], min: 7 },
      { key: 'toolbox', make: () => H.toolbox(), gates: ['free', 'key', 'code'], min: 1 },
      { key: 'coffin', make: () => H.coffin(), gates: ['free', 'key', 'chain'], min: 1 },
      { key: 'painting', make: () => H.hiddenPainting(this.rnd), gates: ['free'], min: 3 },
      { key: 'floorboards', make: () => H.floorboards(), gates: ['free', 'hammer'], min: 3 },
      { key: 'puzzle', make: () => H.puzzleBox(), gates: ['slide'], min: 12 },
    ];
    let opts = all.filter((o) => o.min <= n && o.gates.some((g) => allowed.includes(g) && (!only || only.includes(g))));
    if (this.theme.id !== 'morgue' && this.theme.id !== 'crypt' && this.theme.id !== 'final') opts = opts.filter((o) => o.key !== 'coffin');
    // favour the theme's own furniture
    const weighted: Opt[] = [];
    for (const o of opts) for (let i = 0; i < (this.theme.prefer.includes(o.key) ? 3 : 1); i++) weighted.push(o);
    this.shuffle(weighted);
    for (const o of weighted) {
      const model = o.make();
      const slot = this.takeSlot(model.mount, model.w);
      if (!slot) continue;
      return this.placeContainer(o.key, model, slot, o.gates.filter((g) => allowed.includes(g) && (!only || only.includes(g))));
    }
    return null;
  }

  placeContainer(_key: string, m: H.Container, slot: Slot, gates: GateKind[]): { target: Target; inside: Place; view: string } {
    const id = this.id('c');
    const wall = slot.wall;
    const baseY = m.mount === 'wall' ? m.wallY : 0;
    const place: Place = { wall, u: slot.u, y: baseY };
    const view = `z_${id}`;
    this.views.push({ id: view, p: { wall, u: slot.u + m.inside.u, y: baseY + m.zoom.y, out: m.zoom.out, dist: m.zoom.dist, look: m.zoom.look } });
    const flag = `o_${id}`;
    const spec: ObjSpec = {
      id, make: () => m.node, place, zoom: view, uses: {},
      anim: (f, node, k) => m.open(node, !!f[flag], k),
    };
    this.specs.push(spec);
    const name = L(m.name.pl, m.name.en);
    const target: Target = {
      id, flag, name, where: WHERE[wall], gates, spec, door: false,
      onOpen: (c) => { c.sfx(m.sound); },
      lockAt: { wall, u: slot.u + m.lockAt.u, y: baseY + m.lockAt.y, out: m.lockAt.out },
      acc: L(m.name.plAcc, m.name.en),
    };
    this.scareable.push(target);
    return { target, inside: { wall, u: slot.u + m.inside.u, y: baseY + m.inside.y, out: m.inside.out }, view };
  }

  // ---------- gates ----------

  gateUsable(g: GateKind, door: boolean): boolean {
    const t = GATE_TOOL[g];
    if (t && this.tools[t] === 'pending') return false;
    if (g === 'power' && this.power === 'pending') return false;
    if (door && (g === 'chain' || g === 'hammer' || g === 'knife') && this.doorLeafUsed) return false;
    return true;
  }

  /** Lock `t` behind something, spending about `budget` steps on it. */
  gate(t: Target, budget: number): GateResult {
    const allowed = this.gatesAllowed();
    let options = t.gates.filter((g) => allowed.includes(g) && this.gateUsable(g, t.door));
    if (budget <= 0 && !t.door) options = options.filter((g) => g === 'free' || (g !== 'code' && g !== 'key' && this.toolReady(g)));
    if (budget > 0) options = options.filter((g) => g !== 'free');
    if (!options.length) options = t.gates.includes('free') ? ['free'] : t.gates.filter((g) => this.gateUsable(g, t.door)).slice(0, 1);
    if (!options.length) options = [t.gates[0]];
    // prefer variety: tools/code/power when available at higher levels
    const g = this.pick(options);
    const where = t.where;
    const tacc = t.acc ?? t.name;
    const markOpen = (c: Ctx) => {
      if (c.f[t.flag]) return;
      c.f[t.flag] = true;
      t.onOpen(c);
    };
    const lockAt = t.lockAt;

    switch (g) {
      case 'free': {
        t.spec.tap = (c) => markOpen(c);
        this.steps.push({
          done: (f) => !!f[t.flag],
          hints: [
            L('Nie wszystko tutaj jest zamknięte.', 'Not everything here is locked.'),
            L(`Sprawdź: ${tx(t.name)} (${tx(where)}).`, `Check the ${tx(t.name)} (${tx(where)}).`),
            L(`Otwórz ${tx(tacc)} (${tx(where)}).`, `Open the ${tx(t.name)} (${tx(where)}).`),
          ],
          actions: [{ tap: t.id }],
        });
        return { kind: g };
      }
      case 'key': {
        const key = this.newKey();
        this.hide(key.id, key.make, budget - 1);
        if (lockAt && !t.door) this.lockVisual(t, () => padlock(0x6a6258, 0), lockAt);
        t.spec.tap = (c) => { if (!c.f[t.flag]) { c.sfx('locked'); c.say(L('Zamknięte na kłódkę. Potrzebny klucz.', 'Padlocked. You need a key.')); } };
        t.spec.uses[key.id] = (c) => { c.take(key.id); c.sfx('unlock'); markOpen(c); };
        // other keys: "doesn't fit"
        this.steps.push({
          done: (f) => !!f[t.flag],
          hints: [
            L(`Masz klucz. Która kłódka na niego czeka?`, `You have a key. Which padlock is waiting for it?`),
            L(`Klucz pasuje do: ${tx(t.name)} (${tx(where)}).`, `The key fits the ${tx(t.name)} (${tx(where)}).`),
            L(`Użyj: ${tx(this.items[key.id].name)} na: ${tx(t.name)}.`, `Use the ${tx(this.items[key.id].name).toLowerCase()} on the ${tx(t.name)}.`),
          ],
          actions: [{ use: [key.id, t.id] }],
        });
        return { kind: g };
      }
      case 'code': {
        const { lock, where: clueWhere, answer } = this.codeLock(budget - 1);
        if (lockAt && !t.door) this.lockVisual(t, () => (lock.kind === 'keypad' ? keypad() : lock.kind === 'sequence' ? colorPanel(COLORS.slice(0, 4).map((x) => x.css)) : lock.kind === 'wheels' && /[A-Z]/.test(lock.chars) ? letterLock() : padlock(0x9a8a5a, 3)), lockAt);
        t.spec.tap = (c) => { if (!c.f[t.flag]) c.lock(lock, () => markOpen(c)); };
        this.steps.push({
          done: (f) => !!f[t.flag],
          hints: [
            L(`${tx(t.name)} ma zamek szyfrowy. Szyfr jest gdzieś w tym pokoju.`, `The ${tx(t.name)} has a combination lock. The code is somewhere in this room.`),
            L(`Wskazówka: ${tx(clueWhere)}.`, `Clue: ${tx(clueWhere)}.`),
            L(`Szyfr do: ${tx(t.name)} to ${answer}.`, `The code for the ${tx(t.name)} is ${answer}.`),
          ],
          actions: [{ tap: t.id }, { code: codeAnswer(lock) }],
        });
        return { kind: g, lock };
      }
      case 'slide': {
        const tiles = this.shuffle(['☠', '👁️', '🕯️', '🗝️', '🩸', '🦴', '🕷️', '🌑', '🐀']).slice(0, 8);
        const lock: LockDef = { kind: 'slide', tiles, title: L('Ułóż obrazek', 'Complete the picture') };
        t.spec.tap = (c) => { if (!c.f[t.flag]) c.lock(lock, () => markOpen(c)); };
        this.steps.push({
          done: (f) => !!f[t.flag],
          hints: [
            L(`${tx(t.name)} otwiera się po ułożeniu obrazka.`, `The ${tx(t.name)} opens once the picture is complete.`),
            L('Wzór jest obok układanki. Puste pole musi trafić do prawego dolnego rogu.', 'The pattern is next to the puzzle. The gap must end up in the bottom-right corner.'),
            L(`Kolejność: ${tiles.slice(0, 3).join(' ')} / ${tiles.slice(3, 6).join(' ')} / ${tiles.slice(6).join(' ')} ▢`, `Order: ${tiles.slice(0, 3).join(' ')} / ${tiles.slice(3, 6).join(' ')} / ${tiles.slice(6).join(' ')} ▢`),
          ],
          actions: [{ tap: t.id }, { code: 'solve' }],
        });
        return { kind: g, lock };
      }
      case 'power': {
        this.makePower(budget - 1);
        const { lock, where: clueWhere, answer } = this.codeLock(budget - 2, 'keypad');
        if (lockAt && !t.door) this.lockVisual(t, H.electroLock, lockAt, true);
        t.spec.tap = (c) => {
          if (c.f[t.flag]) return;
          if (!c.f.power) { c.sfx('buzz'); c.say(L('Elektroniczny zamek jest martwy. Nie ma prądu.', 'The electronic lock is dead. There is no power.')); return; }
          c.lock(lock, () => markOpen(c));
        };
        this.steps.push({
          done: (f) => !!f[t.flag],
          hints: [
            L(`Zamek elektroniczny działa, kiedy jest prąd.`, `The electronic lock works when there is power.`),
            L(`Wskazówka do kodu: ${tx(clueWhere)}.`, `Code clue: ${tx(clueWhere)}.`),
            L(`Kod: ${answer}.`, `The code is ${answer}.`),
          ],
          actions: [{ tap: t.id }, { code: codeAnswer(lock) }],
        });
        return { kind: g, lock };
      }
      default: {
        const kind = GATE_TOOL[g]!;
        const toolId = this.tool(kind, budget - 1);
        if (t.door) this.doorLeafUsed = true;
        const vis = g === 'chain' ? H.chainLock : g === 'knife' ? () => H.ropeLock() : g === 'hammer' ? H.boardsLock : null;
        if (vis && lockAt && !t.door && g !== 'hammer') this.lockVisual(t, vis, lockAt);
        const msg: Record<string, Txt> = {
          chain: L('Owinięte łańcuchem z kłódką. Przydałyby się nożyce do metalu.', 'Wrapped in a padlocked chain. Bolt cutters would help.'),
          knife: L('Związane grubym sznurem. Trzeba go przeciąć.', 'Tied with thick rope. It needs cutting.'),
          hammer: L('Zabite deskami na gwoździe. Potrzebny młotek.', 'Nailed shut with boards. You need a hammer.'),
          screwdriver: L('Przykręcone śrubkami. Potrzebny śrubokręt.', 'Held on with screws. You need a screwdriver.'),
        };
        t.spec.tap = (c) => { if (!c.f[t.flag]) { c.sfx('locked'); c.say(msg[g]); } };
        t.spec.uses[toolId] = (c) => { c.sfx(g === 'chain' ? 'chain' : g === 'hammer' ? 'bang' : 'metal'); markOpen(c); };
        this.steps.push({
          done: (f) => !!f[t.flag],
          hints: [
            L(`${tx(t.name)}: ${tx(msg[g])}`, `${tx(t.name)}: ${tx(msg[g])}`),
            L(`Masz odpowiednie narzędzie? ${TOOLS[kind].icon}`, `Do you have the right tool? ${TOOLS[kind].icon}`),
            L(`Użyj: ${tx(TOOLS[kind].name)} na: ${tx(t.name)} (${tx(where)}).`, `Use the ${tx(TOOLS[kind].name).toLowerCase()} on the ${tx(t.name)} (${tx(where)}).`),
          ],
          actions: [{ use: [toolId, t.id] }],
        });
        return { kind: g, tool: kind };
      }
    }
  }

  toolReady(g: GateKind): boolean {
    const t = GATE_TOOL[g];
    return !!t && this.tools[t] === 'ready';
  }

  lockVisual(t: Target, make: () => THREE.Object3D, p: Place, electric = false): void {
    const id = `${t.id}_lock`;
    this.specs.push({
      id, make, place: p, fx: true, uses: {},
      show: (f) => !f[t.flag],
      anim: electric ? (f, n) => { const led = n.getObjectByName('led') as THREE.Mesh | undefined; if (led) (led.material as THREE.MeshStandardMaterial).emissive.setHex(f.power ? 0x00aa33 : 0x550000); } : undefined,
    });
  }

  // ---------- power ----------

  makePower(budget: number): void {
    if (this.power !== 'none') return;
    this.power = 'pending';
    const slot = this.takeSlot('wall', 0.5);
    const p: Place = slot ? { wall: slot.wall, u: slot.u, y: 1.1 } : { wall: 0, u: 3.2, y: 1.1 };
    const needFuse = budget > 0 && this.n >= 25 && this.chance(0.6);
    let fuseId = '';
    if (needFuse) {
      fuseId = this.addItem('fuse', { icon: '🔌', name: L('Bezpiecznik', 'Fuse'), desc: L('Szklany bezpiecznik. Wygląda na sprawny.', 'A glass fuse. Looks fine.') });
      this.hide(fuseId, H.fuse, budget - 1);
    }
    const lock: LockDef = { kind: 'lights', size: 3, start: this.shuffle([0, 1, 2, 3, 4, 5, 6, 7, 8]).slice(0, this.n >= 60 ? 4 : 3), title: L('Zapal wszystkie bezpieczniki', 'Light up every fuse') };
    const start = (lock as { start: number[] }).start;
    const names = [L('lewy górny', 'top left'), L('środkowy górny', 'top middle'), L('prawy górny', 'top right'), L('lewy środkowy', 'middle left'), L('środek', 'centre'), L('prawy środkowy', 'middle right'), L('lewy dolny', 'bottom left'), L('środkowy dolny', 'bottom middle'), L('prawy dolny', 'bottom right')];
    const openBox = (c: Ctx) => c.lock(lock, () => {
      c.f.power = true;
      c.sfx('power');
      c.say(L('Coś zabrzęczało. Jest prąd!', 'Something hums. The power is back!'));
    });
    this.specs.push({
      id: 'fusebox', make: () => fuseBoxModel(), place: p, uses: {},
      tap: (c) => {
        if (c.f.power) { c.say(L('Prąd działa.', 'The power is on.')); return; }
        if (needFuse && !c.f.fuseIn) { c.sfx('buzz'); c.say(L('Skrzynka z bezpiecznikami. Brakuje jednego bezpiecznika.', 'A fuse box. One fuse is missing.')); return; }
        openBox(c);
      },
    });
    if (needFuse) {
      this.specs[this.specs.length - 1].uses[fuseId] = (c) => { c.take(fuseId); c.f.fuseIn = true; c.sfx('click'); c.say(L('Bezpiecznik wskoczył na miejsce.', 'The fuse clicks into place.')); openBox(c); };
      this.steps.push({
        done: (f) => !!f.fuseIn,
        hints: [
          L('Skrzynce z bezpiecznikami czegoś brakuje.', 'The fuse box is missing something.'),
          L(`Skrzynka jest tu: ${tx(WHERE[p.wall])}.`, `The fuse box is on ${tx(WHERE[p.wall])}.`),
          L('Użyj bezpiecznika na skrzynce.', 'Use the fuse on the fuse box.'),
        ],
        actions: [{ use: [fuseId, 'fusebox'] }, { code: 'solve' }],
      });
    }
    this.steps.push({
      done: (f) => !!f.power,
      hints: [
        L(`Nie ma prądu. Skrzynka z bezpiecznikami: ${tx(WHERE[p.wall])}.`, `There is no power. Fuse box: ${tx(WHERE[p.wall])}.`),
        L('Każdy przełącznik zmienia siebie i sąsiadów w górę, w dół, w lewo i w prawo. Zapal wszystkie.', 'Each switch flips itself and its neighbours above, below, left and right. Light them all.'),
        L(`Stuknij: ${start.map((i) => tx(names[i])).join(', ')}.`, `Tap: ${start.map((i) => tx(names[i])).join(', ')}.`),
      ],
      actions: needFuse ? [] : [{ tap: 'fusebox' }, { code: 'solve' }],
    });
    this.power = 'ready';
  }

  // ---------- codes and their clues ----------

  /** Create a code lock and the clue that reveals its code. */
  codeLock(budget: number, force?: CodeKind): { lock: LockDef; where: Txt; answer: string } {
    const kind = force ?? this.pick(this.codeKinds());
    const n = this.n;
    switch (kind) {
      case 'digits':
      case 'keypad': {
        const len = kind === 'keypad' ? (n >= 50 ? 5 : 4) : (n >= 30 ? 4 : 3);
        const { answer, where } = this.digitClue(len, budget);
        const lock: LockDef = kind === 'keypad'
          ? { kind: 'keypad', answer, title: L('Klawiatura', 'Keypad') }
          : { kind: 'wheels', chars: '0123456789', answer, title: L('Kłódka szyfrowa', 'Combination lock') };
        return { lock, where, answer };
      }
      case 'letters': {
        const words = WORDS[lang];
        const word = words[Math.floor(this.rnd() * words.length)];
        const where = this.wordClue(word, budget);
        return { lock: { kind: 'wheels', chars: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', answer: word, title: L('Kłódka z literami', 'Letter lock') }, where, answer: word };
      }
      case 'symbols': {
        const len = n >= 40 ? 4 : 3;
        const seq = Array.from({ length: len }, () => SYMBOLS[Math.floor(this.rnd() * SYMBOLS.length)]);
        const answer = seq.join('');
        const where = this.symbolClue(seq, budget);
        return { lock: { kind: 'wheels', chars: SYMBOLS, answer, title: L('Kłódka z symbolami', 'Symbol lock') }, where, answer: seq.join(' ') };
      }
      case 'colors': {
        const len = n >= 50 ? 5 : 4;
        const cols = Array.from({ length: len }, () => this.pick(COLORS.slice(0, 4)));
        const where = this.colorClue(cols, budget);
        const lock: LockDef = {
          kind: 'sequence', title: L('Kolorowy zamek', 'Colour lock'),
          buttons: COLORS.slice(0, 4).map((c) => ({ id: c.id, label: '', color: c.css })),
          answer: cols.map((c) => c.id),
        };
        return { lock, where, answer: cols.map((c) => tx(c.name)).join(', ') };
      }
    }
  }

  /** Pick how a digit code is presented, place the clue, return the code. */
  digitClue(len: number, budget: number): { answer: string; where: Txt } {
    const n = this.n;
    const formats: string[] = ['note'];
    if (n >= 3) formats.push('wall');
    if (n >= 6 && len <= 4) formats.push('clock');
    if (n >= 12) formats.push('words');
    if (n >= 15) formats.push('split');
    if (n >= 20) formats.push('roman');
    if (n >= 26) formats.push('uv');
    if (n >= 30) formats.push('dice');
    if (n >= 35) formats.push('math');
    if (n >= 40) formats.push('mirror');
    if (n >= 45 && this.power !== 'pending') formats.push('tv');
    if (n >= 55) formats.push('cipher');
    // later levels lean on the trickier formats
    const f = this.chance(Math.min(0.75, n / 110)) && formats.length > 3 ? this.pick(formats.slice(3)) : this.pick(formats);
    if (f === 'clock') {
      const h = len === 3 ? this.int(1, 9) : this.int(10, 12);
      const m = this.int(0, 11) * 5;
      const answer = `${h}${String(m).padStart(2, '0')}`;
      const where = this.placeWall(() => H.oldClock(h, m), 0.6, L('zegar', 'the clock'), L('Zegar stanął na zawsze.', 'The clock has stopped forever.'));
      return { answer, where: L(`${tx(where)} — która godzina?`, `${tx(where)} — what time is it?`) };
    }
    const noZero = f === 'roman' || f === 'dice' || f === 'cipher';
    const maxD = f === 'dice' ? 6 : 9;
    const digits = Array.from({ length: len }, () => this.int(noZero ? 1 : 0, maxD));
    const answer = digits.join('');
    const enc = (d: number[]): string[] => {
      switch (f) {
        case 'words': return d.map((x) => NUM_WORDS[lang][x]);
        case 'roman': return [d.map((x) => ROMAN[x]).join(' · ')];
        case 'dice': return [d.map((x) => DICE[x]).join(' ')];
        case 'math': return [d.map((x) => { if (this.chance(0.5)) { const a = this.int(0, x); return `${a}+${x - a}`; } const a = this.int(1, 5); return `${x + a}-${a}`; }).join('  ')];
        default: return [d.join(' ')];
      }
    };
    if (f === 'split') {
      const parts = len >= 4 && n >= 40 ? 3 : 2;
      const chunks: number[][] = [];
      const size = Math.ceil(len / parts);
      for (let i = 0; i < len; i += size) chunks.push(digits.slice(i, i + size));
      const wheres = chunks.map((ch, i) => {
        const label = `${PART[i]}: ${ch.join(' ')}`;
        return this.carrier([label], budget - 1, i === 0 ? 'wall' : 'any');
      });
      return { answer, where: L(`kod jest podzielony na ${chunks.length} części (I, II${chunks.length > 2 ? ', III' : ''}): ${wheres.map(tx).join('; ')}`, `the code is split into ${chunks.length} parts (I, II${chunks.length > 2 ? ', III' : ''}): ${wheres.map(tx).join('; ')}`) };
    }
    if (f === 'cipher') {
      const syms = this.shuffle(SYMBOLS.split(''));
      const map = new Map<number, string>();
      let si = 0;
      for (const d of digits) if (!map.has(d)) map.set(d, syms[si++ % syms.length]);
      const coded = digits.map((d) => map.get(d)!).join(' ');
      const legend = [...map.entries()].map(([d, s]) => `${s} = ${d}`);
      // decoy symbols in the legend
      for (const s of syms.slice(si, si + 2)) legend.push(`${s} = ${this.int(1, 9)}`);
      this.shuffle(legend);
      const w1 = this.carrier([coded], budget - 1, 'wall');
      const w2 = this.noteCarrier(L('Klucz do szyfru', 'Cipher key'), legend.join('\n'), budget - 1);
      return { answer, where: L(`symbole (${tx(w1)}) i klucz do szyfru (${tx(w2)})`, `the symbols (${tx(w1)}) and the cipher key (${tx(w2)})`) };
    }
    if (f === 'tv') {
      this.makePower(budget - 1);
      const lines = enc(digits);
      const where = this.placeFloorClue(() => H.crtTv(lines), 0.8, L('stary telewizor', 'the old TV'), (f) => !!f.power, L('Na ekranie tylko szum. Nie ma prądu.', 'Only static on the screen. No power.'), L(`Na ekranie: ${lines.join(' ')}`, `On screen: ${lines.join(' ')}`));
      return { answer, where: L(`${tx(where)} (gdy jest prąd)`, `${tx(where)} (when there is power)`) };
    }
    if (f === 'uv') {
      const where = this.uvCarrier(enc(digits), budget - 1);
      return { answer, where };
    }
    if (f === 'mirror') {
      const where = this.scrawlCarrier(enc(digits), true);
      return { answer, where: L(`${tx(where)} — czytaj w lustrzanym odbiciu`, `${tx(where)} — read it mirrored`) };
    }
    const lines = enc(digits);
    const where = f === 'wall' || f === 'roman' || f === 'words' || f === 'math' || f === 'dice'
      ? this.carrier(lines, budget, f === 'wall' ? 'wall' : 'any')
      : this.noteCarrier(L('Kartka', 'Note'), lines.join('\n'), budget);
    const fmtHint: Record<string, Txt> = {
      words: L('cyfry zapisane słowami', 'digits written as words'), roman: L('cyfry rzymskie', 'Roman numerals'),
      dice: L('oczka na kostkach to cyfry', 'dice pips are digits'), math: L('wynik każdego działania to jedna cyfra', 'each sum is one digit'),
    };
    return { answer, where: fmtHint[f] ? L(`${tx(where)} — ${tx(fmtHint[f])}`, `${tx(where)} — ${tx(fmtHint[f])}`) : where };
  }

  wordClue(word: string, budget: number): Txt {
    const n = this.n;
    const f = this.pick(['plain', 'plain', ...(n >= 30 ? ['reverse'] : []), ...(n >= 45 ? ['acrostic'] : []), ...(n >= 26 ? ['uv'] : [])]);
    if (f === 'reverse') {
      const w = this.carrier([word.split('').reverse().join('')], budget, 'wall');
      return L(`${tx(w)} — przeczytaj od tyłu`, `${tx(w)} — read it backwards`);
    }
    if (f === 'acrostic') {
      const lines = word.split('').map((ch) => acrosticLine(ch, this.rnd));
      const w = this.noteCarrier(L('Wiersz', 'A poem'), lines.join('\n'), budget);
      return L(`${tx(w)} — pierwsze litery wersów`, `${tx(w)} — the first letters of the lines`);
    }
    if (f === 'uv') return this.uvCarrier([word], budget - 1);
    return this.carrier([word], budget, 'any');
  }

  symbolClue(seq: string[], budget: number): Txt {
    if (this.n >= 40 && this.chance(0.5)) {
      // shown out of order, with small numbers telling the order
      const order = this.shuffle(seq.map((s, i) => ({ s, i })));
      return this.placeWall(() => H.symbolPainting(order.map((o) => `${o.s}${o.i + 1}`)), 0.75, L('obraz z symbolami (liczby mówią o kolejności)', 'the painting of symbols (the numbers give the order)'), L('Symbole z małymi cyframi.', 'Symbols with little numbers.'));
    }
    if (this.chance(0.5)) return this.placeWall(() => H.symbolPainting(seq), 0.75, L('obraz z symbolami', 'the painting of symbols'), L('Dziwne symbole na obrazie.', 'Strange symbols on the painting.'));
    return this.carrier([seq.join(' ')], budget, 'any');
  }

  colorClue(cols: typeof COLORS, budget: number): Txt {
    if (this.chance(0.5)) {
      // numbered candles, standing in a shuffled order
      const order = this.shuffle(cols.map((c, i) => ({ c, i })));
      return this.placeFloorClue(() => H.candleRow(order.map((o) => o.c.css), order.map((o) => o.i + 1)), 1.2,
        L('ponumerowane świece', 'the numbered candles'), undefined, L('Świece w różnych kolorach, każda z numerem.', 'Candles in different colours, each with a number.'));
    }
    if (this.chance(0.5)) return this.placeWall(() => H.symbolPainting(cols.map(() => ''), cols.map((c) => c.css)), 0.75, L('obraz z kolorowymi kołami', 'the painting of coloured circles'), L('Kolorowe koła na obrazie.', 'Coloured circles on the painting.'));
    return this.noteCarrier(L('Kartka', 'Note'), cols.map((c) => `${c.dot} ${tx(c.name)}`).join('\n'), budget);
  }

  /** Put a clue somewhere: on a wall (scrawl/chalkboard) or on a note that may be hidden. */
  carrier(lines: string[], budget: number, pref: 'wall' | 'any'): Txt {
    if (pref === 'wall' || budget <= 0 || this.chance(0.5)) return this.scrawlCarrier(lines, false);
    return this.noteCarrier(L('Kartka', 'Note'), lines.join('\n'), budget);
  }

  scrawlCarrier(lines: string[], mirror: boolean): Txt {
    const p = this.high.shift() ?? { wall: 3 as Wall, u: this.rnd() * 4 - 2, y: 2.2 };
    const chalk = this.theme.id === 'school' && !mirror;
    const id = this.id('w');
    const w = Math.min(2.0, 0.5 + Math.max(...lines.map((l) => l.length)) * 0.2);
    const h = Math.min(1.0, 0.3 + lines.length * 0.28);
    this.specs.push({
      id, place: { ...p, y: (p.y ?? 2.2) + (chalk ? -0.3 : 0), out: 0.02 }, uses: {},
      make: () => {
        if (chalk) return H.chalkboard(lines, w, h);
        const s = H.scrawl(lines, w, h, '#7a0808', mirror);
        s.position.y = h / 2;
        return new THREE.Group().add(s);
      },
      tap: (c) => c.say(L(mirror ? 'Napis wygląda jak odbity w lustrze.' : 'Ktoś to napisał… czym?', mirror ? 'The writing looks mirrored.' : 'Someone wrote this… with what?')),
    });
    return chalk ? L(`tablica (${tx(WHERE[p.wall])})`, `the chalkboard (${tx(WHERE[p.wall])})`) : L(`napis na ścianie (${tx(WHERE[p.wall])})`, `the writing on the wall (${tx(WHERE[p.wall])})`);
  }

  noteCarrier(title: Txt, body: string, budget: number): Txt {
    const id = this.addItem(this.id('note'), {
      icon: '📜', name: L('Kartka', 'Note'), desc: L('Pożółkła kartka.', 'A yellowed note.'),
      doc: { title, body: L(body, body), style: this.chance(0.5) ? 'typed' : 'paper' },
    });
    this.hide(id, () => H.notePaper(), budget);
    return L('kartka w ekwipunku (stuknij ją dwa razy)', 'the note in your inventory (tap it twice)');
  }

  uvCarrier(lines: string[], budget: number): Txt {
    if (this.uv === 'none') {
      this.uv = 'pending';
      this.addItem('uv', { icon: '🟣', name: L('Lampa UV', 'UV lamp'), desc: L('Świeci na fioletowo. Pokazuje to, czego nie widać.', 'It glows purple. It shows what can\'t be seen.') });
      this.hide('uv', H.uvLamp, budget);
      this.uv = 'ready';
    }
    const p = this.high.shift() ?? { wall: 1 as Wall, u: 0, y: 2.2 };
    const id = this.id('uv');
    const flag = `lit_${id}`;
    const w = Math.min(2.0, 0.5 + Math.max(...lines.map((l) => l.length)) * 0.2);
    const h = Math.min(1.0, 0.3 + lines.length * 0.28);
    this.specs.push({
      id, place: { ...p, out: 0.02 }, uses: {
        uv: (c) => { c.f[flag] = true; c.sfx('uv'); c.say(L('W fioletowym świetle na ścianie pojawił się napis!', 'Writing appears on the wall in the purple light!')); },
      },
      make: () => {
        const g = new THREE.Group();
        const hit = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }));
        hit.position.y = h / 2;
        const s = H.scrawl(lines, w, h, '#c58aff');
        (s.material as THREE.MeshStandardMaterial).emissive = new THREE.Color(0x8a40ff);
        s.position.set(0, h / 2, 0.005);
        s.name = 'glow';
        g.add(hit, s);
        return g;
      },
      anim: (f, n) => { n.getObjectByName('glow')!.visible = !!f[flag]; },
      tap: (c) => c.say(c.f[flag] ? L('Świecący napis.', 'Glowing writing.') : L('Zwykła, brudna ściana… chyba.', 'Just a dirty wall… probably.')),
    });
    this.steps.push({
      done: (f) => !!f[flag],
      hints: [
        L('Niektóre napisy widać tylko w specjalnym świetle.', 'Some writing only shows in a special light.'),
        L(`Poświeć lampą UV na górę ściany: ${tx(WHERE[p.wall])}.`, `Shine the UV lamp high on ${tx(WHERE[p.wall])}.`),
        L(`Użyj lampy UV na ścianie (${tx(WHERE[p.wall])}, wysoko).`, `Use the UV lamp on the wall (${tx(WHERE[p.wall])}, up high).`),
      ],
      actions: [{ use: ['uv', id] }],
    });
    return L(`ukryty napis (${tx(WHERE[p.wall])}) — potrzebna lampa UV`, `hidden writing (${tx(WHERE[p.wall])}) — you need the UV lamp`);
  }

  placeWall(make: () => THREE.Object3D, w: number, name: Txt, say: Txt): Txt {
    const slot = this.takeSlot('wall', w);
    const p: Place = slot ? { wall: slot.wall, u: slot.u, y: 1.45 } : { ...(this.high.shift() ?? { wall: 2 as Wall, u: 0 }), y: 1.9 };
    const id = this.id('k');
    this.specs.push({ id, make, place: { ...p, out: 0.01 }, uses: {}, tap: (c) => c.say(say) });
    return L(`${tx(name)} (${tx(WHERE[p.wall])})`, `${tx(name)} (${tx(WHERE[p.wall])})`);
  }

  placeFloorClue(make: () => THREE.Object3D, w: number, name: Txt, when: ((f: Flags) => boolean) | undefined, off: Txt, on?: Txt): Txt {
    const slot = this.takeSlot('floor', w);
    const p: Place = slot ? { wall: slot.wall, u: slot.u } : { wall: 2, u: 0, out: 1.5 };
    const id = this.id('k');
    this.specs.push({
      id, make, place: p, uses: {},
      anim: when ? (f, n) => { const onM = n.getObjectByName('on'); const offM = n.getObjectByName('off'); if (onM && offM) { onM.visible = when(f); offM.visible = !when(f); } } : undefined,
      tap: (c) => c.say(when && when(c.f) && on ? on : off),
    });
    return L(`${tx(name)} (${tx(WHERE[p.wall])})`, `${tx(name)} (${tx(WHERE[p.wall])})`);
  }

  // ---------- the door ----------

  door(): void {
    const n = this.n;
    const locks = n < 5 ? 1 : n < 20 ? 2 : n < 50 ? 3 : 4;
    const depth = Math.min(8, 1 + Math.floor((n + 3) / 7));
    const ids: string[] = [];
    const doorKinds: GateKind[][] = [['key'], ['code'], ['code', 'key', 'power'], ['chain', 'hammer', 'code']];
    for (let i = 0; i < locks; i++) {
      const id = `dl${i}`;
      ids.push(id);
      const flag = `o_${id}`;
      const spec: ObjSpec = { id, make: () => new THREE.Group(), place: { wall: 0, u: -0.4, y: 0.7 + i * 0.42, out: 0.06 }, uses: {}, show: (f) => !f[flag] };
      this.specs.push(spec);
      const t: Target = {
        id, flag, name: L(`zamek w drzwiach nr ${i + 1}`, `door lock #${i + 1}`), where: WHERE[0], gates: n === 1 ? ['key'] : this.shuffle([...doorKinds[i % 4], ...this.gatesAllowed().filter((g) => g !== 'free' && g !== 'slide')]),
        spec, door: true, onOpen: (c) => { c.sfx('unlock'); c.vibrate(40); },
      };
      const r = this.gate(t, depth - (i > 1 ? 1 : 0));
      if (r.tool) {
        spec.place = { wall: 0, u: -1.3, y: 1.15, out: 0.14 };
        spec.make = r.tool === 'cutters' ? () => { const g = H.chainLock(); g.scale.setScalar(1.6); return g; } : r.tool === 'knife' ? () => H.ropeLock(1.2) : () => H.boardsLock();
      } else if (r.kind === 'key') {
        spec.make = () => padlock(0x7a7066, 0);
      } else if (r.kind === 'power') {
        spec.make = H.electroLock;
        spec.anim = (f, node) => { const led = node.getObjectByName('led') as THREE.Mesh | undefined; if (led) (led.material as THREE.MeshStandardMaterial).emissive.setHex(f.power ? 0x00aa33 : 0x550000); };
      } else {
        const lk = r.lock!;
        spec.make = lk.kind === 'keypad' ? keypad
          : lk.kind === 'sequence' ? () => colorPanel(COLORS.slice(0, 4).map((x) => x.css))
            : lk.kind === 'wheels' && /[A-Z]/.test(lk.chars) ? letterLock : () => padlock(0x9a8a5a, 3);
      }
    }
    // the door itself
    this.specs.push({
      id: 'door', make: () => H.heavyDoor(this.theme.door), place: { wall: 0, u: -1.3 }, uses: {},
      anim: (f, node, k) => { const open = ids.every((d) => f[`o_${d}`]); const leaf = node.getObjectByName('leaf'); if (leaf) leaf.rotation.y += ((open ? -0.35 : 0) - leaf.rotation.y) * k * 0.5; },
      tap: (c) => {
        if (ids.every((d) => c.f[`o_${d}`])) c.win();
        else { c.sfx('locked'); c.say(L(`Drzwi się nie ruszą. Zamki: ${ids.filter((d) => !c.f[`o_${d}`]).length}.`, `The door won't budge. Locks left: ${ids.filter((d) => !c.f[`o_${d}`]).length}.`)); }
      },
    });
    this.steps.push({
      done: (f) => !!f.won,
      hints: [L('Wszystkie zamki są otwarte!', 'Every lock is open!'), L('Wyjdź przez drzwi.', 'Go through the door.'), L('Stuknij drzwi, żeby uciec.', 'Tap the door to escape.')],
      actions: [{ tap: 'door' }],
    });
  }

  // ---------- dark rooms ----------

  darkness(): void {
    this.addItem('flashlight', { icon: '🔦', name: L('Latarka bez baterii', 'Flashlight (no batteries)'), desc: L('Pusta w środku.', 'Empty inside.') });
    this.addItem('batt', { icon: '🔋', name: L('Baterie', 'Batteries'), desc: L('Dwie baterie.', 'Two batteries.') });
    this.addItem('torch', { icon: '🔦', name: L('Latarka', 'Flashlight'), desc: L('Świeci. Na razie.', 'It works. For now.') });
    this.combos.push({ a: 'flashlight', b: 'batt', result: 'torch', say: L('Wkładasz baterie. Światło!', 'You put the batteries in. Light!') });
    const p1: Place = { wall: 0, u: 1.6, out: 1.4 };
    this.pickups.push({ item: 'flashlight', make: flashlight, p: p1 });
    this.steps.push({
      done: (f) => !!f.got_flashlight,
      hints: [L('Jest ciemno. Szukaj czegoś, co błyszczy.', 'It is dark. Look for something that glints.'), L('Przy drzwiach leży latarka.', 'A flashlight lies near the door.'), L('Podnieś latarkę z podłogi przy drzwiach.', 'Pick up the flashlight near the door.')],
      actions: [{ tap: 'pick_flashlight' }],
    });
    const p2 = this.takeLoose();
    this.pickups.push({ item: 'batt', make: batteries, p: p2 });
    this.steps.push({
      done: (f) => !!f.got_batt,
      hints: [L('Latarce brakuje baterii.', 'The flashlight needs batteries.'), L(`Baterie leżą na podłodze: ${tx(WHERE[p2.wall])}.`, `The batteries are on the floor: ${tx(WHERE[p2.wall])}.`), L('Podnieś baterie.', 'Pick up the batteries.')],
      actions: [{ tap: 'pick_batt' }],
    });
    this.steps.push({
      done: (_f, has) => has('torch'),
      hints: [L('Połącz latarkę z bateriami.', 'Combine the flashlight and the batteries.'), L('Stuknij latarkę w ekwipunku, potem baterie.', 'Tap the flashlight in your inventory, then the batteries.'), L('Połącz latarkę i baterie.', 'Combine the flashlight and batteries.')],
      actions: [{ combine: ['flashlight', 'batt'] }],
    });
  }

  // ---------- decoys, decoration, scares ----------

  extras(): void {
    const n = this.n;
    const decoys = Math.min(5, Math.floor(n / 11));
    for (let i = 0; i < decoys; i++) {
      const c = this.newContainer(['free']);
      if (!c) break;
      const t = c.target;
      t.spec.tap = (ctx) => { if (!ctx.f[t.flag]) { ctx.f[t.flag] = true; t.onOpen(ctx); } };
      if (n >= 40 && this.chance(0.5)) {
        const j = this.pick(JUNK);
        const id = this.addItem(this.id('junk'), { icon: j.icon, name: j.name, desc: j.desc });
        this.pickups.push({ item: id, make: () => H.notePaper(true), p: c.inside, view: c.view, when: (f) => !!f[t.flag] });
      }
    }
    // scares on opening some containers
    if (n >= 3) {
      const count = Math.min(this.scareable.length, 1 + Math.floor(n / 35));
      for (const t of this.shuffle([...this.scareable]).slice(0, count)) {
        const kind = n < 10 ? 'bang' : this.pick(['figure', 'bang', 'flicker', 'figure'] as const);
        const prev = t.onOpen;
        t.onOpen = (c) => { prev(c); c.scare(kind); };
      }
    }
    // decoration: theme props in free floor slots, writing, handprints, cobwebs
    const rnd = this.rnd;
    for (const s of this.slots.filter((x) => !x.used)) {
      if (s.mount === 'floor') {
        const d = this.pick(this.theme.decor);
        this.decor.push((b) => { const node = decorModel(d, rnd); b.fx(this.id('d'), node, { wall: s.wall, u: s.u }).anim(d === 'rocking' ? (_f, nd) => { const r = nd.getObjectByName('rock'); if (r) r.rotation.x = Math.sin(performance.now() / 700) * 0.12; } : d === 'doll' ? (_f, nd) => { const h = nd.getObjectByName('head'); if (h) h.rotation.y = Math.sin(performance.now() / 4000) > 0.95 ? 1.2 : 0; } : () => {}); });
      } else if (s.mount === 'wall') {
        const r = this.rnd();
        this.decor.push((b) => b.fx(this.id('d'), r < 0.6 ? H.portrait(rnd) : H.wallShelf(rnd), { wall: s.wall, u: s.u, y: r < 0.6 ? 1.3 : 1.45 }));
      }
    }
    // small clutter on the floor: bottles, papers, bones of something
    for (let i = 0; i < 5 + Math.floor(this.rnd() * 4); i++) {
      const w = this.int(0, 3) as Wall;
      const u = this.rnd() * 6.4 - 3.2;
      if (w === 0 && u > -2 && u < -0.6) continue;
      this.decor.push((b) => b.fx(this.id('d'), H.clutter(rnd), { wall: w, u, out: 0.15 + this.rnd() * 0.5, rot: this.rnd() * 6 }));
    }
    const phrases = this.shuffle([...PHRASES]).slice(0, 1 + Math.floor(this.rnd() * 2));
    for (const ph of phrases) {
      const p = this.high.shift();
      if (!p) break;
      const text = tx(ph);
      this.decor.push((b) => { const s = H.scrawl([text], Math.min(2.2, 0.4 + text.length * 0.16), 0.5); s.position.y = 0.25; b.fx(this.id('d'), new THREE.Group().add(s), { ...p, out: 0.02 }); });
    }
    for (let i = 0; i < 3; i++) {
      const w = this.int(0, 3) as Wall;
      const u = this.rnd() * 6 - 3;
      if (w === 0 && u < 0) continue;
      this.decor.push((b) => b.fx(this.id('d'), H.handprint(rnd), { wall: w, u, y: 0.8 + this.rnd() * 1.2, out: 0.015 }));
    }
    for (const w of [0, 1, 2, 3] as Wall[]) {
      this.decor.push((b) => { const web = H.cobweb(0.9); web.rotation.z = Math.PI; web.position.set(0, 0, 0); b.fx(this.id('d'), new THREE.Group().add(web), { wall: w, u: 3.55, y: 2.95, out: 0.02 }); });
    }
  }

  // ---------- assemble ----------

  build(): RoomDef {
    const n = this.n;
    const dark = n >= 8 && n % 5 === 3;
    if (dark) this.darkness();
    this.door();
    this.extras();
    // steps in play order: our recursion pushes prerequisites first, but the door step must be last
    const doorStep = this.steps.find((s) => s.actions[0]?.tap === 'door')!;
    const steps = [...this.steps.filter((s) => s !== doorStep), doorStep];
    const theme = this.theme;
    const intro = n === 1
      ? L('Obudziłeś się w obcym domu. Drzwi są zamknięte. Stukaj w meble, żeby je obejrzeć, a strzałkami się rozglądaj.', 'You wake up in a strange house. The door is locked. Tap furniture to search it and use the arrows to look around.')
      : n === 2 ? L('Przedmioty używasz tak: stuknij go w ekwipunku, a potem miejsce, gdzie ma zadziałać.', 'To use an item: tap it in your inventory, then tap where it should go.')
        : n === 3 ? L('Szyfry są gdzieś w pokoju. Kartki czytasz, stukając je dwa razy w ekwipunku.', 'Codes are hidden somewhere in the room. Read notes by tapping them twice in your inventory.')
          : this.pick(theme.intro);
    const specs = this.specs;
    const views = this.views;
    const pickups = this.pickups;
    const decor = this.decor;
    return {
      id: levelId(n),
      level: n,
      name: L(`${tx(theme.name)} · ${n}`, `${tx(theme.name)} · ${n}`),
      theme,
      items: this.items,
      combos: this.combos,
      dark,
      intro,
      hints: steps.map((s) => ({ done: s.done, hints: s.hints })),
      solution: steps.flatMap((s) => s.actions),
      build(b: Builder) {
        for (const v of views) b.zoomView(v.id, v.p);
        for (const s of specs) {
          const h = s.fx ? b.fx(s.id, s.make(), s.place) : b.obj(s.id, s.make(), s.place);
          if (s.zoom) h.zoom(s.zoom);
          if (s.inView) h.in(s.inView);
          if (s.show) h.show(s.show);
          if (s.anim) h.anim(s.anim);
          if (s.tap) h.tap(s.tap);
          for (const [item, fn] of Object.entries(s.uses)) h.use(item, fn);
        }
        for (const p of pickups) b.pickup(p.item, withGlint(p.make()), p.p, p.view, p.when);
        for (const d of decor) d(b);
      },
    };
  }
}

function codeAnswer(lock: LockDef): string {
  if (lock.kind === 'sequence') return lock.answer.join(',');
  if (lock.kind === 'wheels' || lock.kind === 'keypad') return lock.answer;
  return 'solve';
}

function acrosticLine(ch: string, rnd: () => number): string {
  const pl: Record<string, string[]> = {
    A: ['Ale nikt nie przyszedł', 'A cisza wciąż krzyczy'], B: ['Biała twarz w oknie', 'Bez twarzy, bez imienia'], C: ['Cień stoi za tobą', 'Cisza przed krzykiem'],
    D: ['Drzwi same się zamknęły', 'Dom pamięta każdego'], E: ['Echo woła twoje imię', 'Ech, znów ta noc'], G: ['Gdzieś płacze dziecko', 'Głosy w ścianach'],
    I: ['I nikt cię nie usłyszy', 'Idzie po schodach'], J: ['Jeszcze tu jesteś?', 'Jego oczy świecą'], K: ['Kto zgasił światło?', 'Krew na podłodze'],
    L: ['Lustro kłamie', 'Lalka odwróciła głowę'], M: ['Między nami ściana', 'Mrok ma zęby'], N: ['Nigdy stąd nie wyjdziesz', 'Noc nie ma końca'],
    O: ['Ona wciąż czeka', 'Oczy w ciemności'], P: ['Pod łóżkiem coś oddycha', 'Północ wybiła'], R: ['Ręka na klamce', 'Rano nikt nie wróci'],
    S: ['Szept za drzwiami', 'Stuk, stuk, stuk'], T: ['Tylko nie patrz w lustro', 'Ten dom jest głodny'], U: ['Uciekaj, póki możesz', 'Uśmiech bez twarzy'],
    W: ['Wszyscy już zniknęli', 'Widzę cię'], Y: ['Ypsilon na ścianie?', 'Y… nic nie widać'], Z: ['Zimny oddech na karku', 'Zamknij oczy'],
    H: ['Hałas na strychu', 'Hej, jest tu ktoś?'], F: ['Fotografie bez twarzy', 'Firanka się porusza'], C2: [],
  };
  const en: Record<string, string[]> = {
    A: ['Alone in the dark', 'All the doors are locked'], B: ['Behind you, breathing', 'Bones in the wall'], C: ['Can you hear it too?', 'Cold hands on your neck'],
    D: ['Don\'t turn around', 'Dust on every face'], E: ['Every mirror lies', 'Eyes in the window'], G: ['Gone before morning', 'Glass eyes watching'],
    H: ['Here it comes', 'Hush, it listens'], I: ['It knows your name', 'In the walls, whispering'], K: ['Knock, knock, knock', 'Keep the candle lit'],
    L: ['Look under the bed', 'Lights won\'t save you'], M: ['Midnight again', 'Mother is not home'], N: ['Nobody leaves', 'Night never ends'],
    O: ['Only one way out', 'Open the box, if you dare'], P: ['Please let me out', 'Pale face at the glass'], R: ['Run while you can', 'Red on the floor'],
    S: ['Something is smiling', 'Stairs creak by themselves'], T: ['The doll turned its head', 'They are all gone'], U: ['Under the floorboards', 'Up in the attic'],
    V: ['Voices in the pipes', 'Very close now'], W: ['Where did they go?', 'Watching, always watching'], Y: ['You were here before', 'Your name is on the wall'],
    F: ['Faces in the dark', 'Footsteps above'], C2: [],
  };
  const table = lang === 'pl' ? pl : en;
  const opts = table[ch] ?? [`${ch}…`];
  return opts[Math.floor(rnd() * opts.length)];
}

function withGlint(node: THREE.Object3D): THREE.Object3D {
  const tex = glintTex ??= canvasTex(64, 64, (c) => {
    const g = c.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, 'rgba(255,245,210,1)');
    g.addColorStop(0.25, 'rgba(255,230,160,0.5)');
    g.addColorStop(1, 'rgba(255,220,150,0)');
    c.fillStyle = g;
    c.fillRect(0, 0, 64, 64);
  });
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
  s.scale.setScalar(0.22);
  s.position.y = 0.08;
  s.onBeforeRender = () => { s.material.opacity = 0.35 + Math.max(0, Math.sin(performance.now() / 380)) * 0.65; };
  const g = new THREE.Group();
  g.add(node, s);
  return g;
}
let glintTex: THREE.CanvasTexture | undefined;

function fuseBoxModel(): THREE.Object3D {
  const g = new THREE.Group();
  const bx = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.65, 0.15), new THREE.MeshStandardMaterial({ color: 0x6a7480, roughness: 0.6, metalness: 0.4 }));
  bx.position.set(0, 0.325, 0.075);
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(0.14, 0.12), new THREE.MeshStandardMaterial({ color: 0xffd23f, emissive: 0x332200 }));
  sign.position.set(0, 0.52, 0.152);
  bx.castShadow = true;
  g.add(bx, sign);
  for (let i = 0; i < 3; i++) {
    const sw = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.1, 0.03), new THREE.MeshStandardMaterial({ color: 0x222222 }));
    sw.position.set(-0.12 + i * 0.12, 0.25, 0.16);
    g.add(sw);
  }
  return g;
}

function decorModel(d: DecorKind, rnd: () => number): THREE.Object3D {
  switch (d) {
    case 'doll': { const g = new THREE.Group(); const doll = H.doll(rnd); doll.position.set(0, 0, 0.3); g.add(doll); return g; }
    case 'rocking': return H.rockingChair();
    case 'wheelchair': return H.wheelchair();
    case 'hospitalBed': return H.hospitalBed();
    case 'barrel': return H.barrel();
    case 'brokenChair': return H.brokenChair();
    case 'mannequin': return H.mannequin();
    case 'bucket': return H.bucket();
    case 'candles': return H.candles(3 + Math.floor(rnd() * 3));
    case 'specimen': { const g = new THREE.Group(); const t = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.8, 0.45), new THREE.MeshStandardMaterial({ color: 0x5a5a52 })); t.position.set(0, 0.4, 0.23); g.add(t); for (let i = 0; i < 3; i++) { const j = H.specimenJar(rnd); j.position.set(-0.28 + i * 0.28, 0.8, 0.23); g.add(j); } return g; }
    case 'schoolDesk': return H.schoolDesk();
    case 'tombstone': return H.tombstone(rnd);
    case 'bookshelf': return H.bookshelfDecor(rnd);
    case 'portrait': { const p = H.portrait(rnd); p.position.y = 1.3; return new THREE.Group().add(p); }
    case 'pipes': return H.pipes();
  }
}

const cache = new Map<string, RoomDef>();

/** Room definition for level `n` (1..100). Deterministic: the same level is always the same room. */
export function generateLevel(n: number): RoomDef {
  const key = `${n}:${lang}`;
  let r = cache.get(key);
  if (!r) { r = new Gen(n).build(); cache.set(key, r); }
  return r;
}

export const LEVELS = 100;
