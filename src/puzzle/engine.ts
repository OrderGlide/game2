// Puzzle rules — pure logic, no graphics. Used by the game, the hint solver and the level generator.
//
// Goal of every level: eat all the fish 🐟, then curl up in the basket 🧺.
// One swipe = one move. Cats push boxes (one at a time), yarn balls roll until they hit something,
// ice makes everything slide, boxes/yarn dropped into water become a bridge, cracked floor breaks
// behind the cat, keys open locks, pressure plates open doors, portals teleport the cat,
// and a sleeping dog must not be woken: the cat can't step next to it.

export enum T {
  VOID = 0, FLOOR, WALL, WATER, ICE, CRACKED, HOLE, PLATE, DOOR, LOCK, PORTAL, HOME, FISH, KEY, BRIDGE, DOG,
}

export type Dir = 0 | 1 | 2 | 3; // up, right, down, left
export const DIRS: Dir[] = [0, 1, 2, 3];
export const DX = [0, 1, 0, -1];
export const DY = [-1, 0, 1, 0];

export enum ObjKind { BOX = 0, YARN = 1 }
export interface Obj { k: ObjKind; p: number; /** fell into water/hole */ gone?: boolean }

export interface Level {
  w: number;
  h: number;
  tiles: Uint8Array;
  cat: number;
  objs: Obj[];
  portals: number[];
  plates: number[];
  /** cells the cat may not enter because a dog sleeps next to them */
  danger: Uint8Array;
  /** cells whose tile can change during play (for hashing) */
  dyn: number[];
  fish: number;
}

export interface State {
  cat: number;
  objs: Obj[];
  tiles: Uint8Array;
  keys: number;
  fish: number;
  facing: Dir;
}

export type MoveEvent =
  | { t: 'cat'; path: number[]; slide: boolean }
  | { t: 'teleport'; from: number; to: number }
  | { t: 'push'; i: number; path: number[]; sink: boolean; yarn: boolean }
  | { t: 'eat'; cell: number }
  | { t: 'key'; cell: number }
  | { t: 'unlock'; cell: number }
  | { t: 'crack'; cell: number }
  | { t: 'doors'; open: boolean };

const CHAR: Record<string, T> = {
  ' ': T.VOID, '.': T.FLOOR, '#': T.WALL, '~': T.WATER, '_': T.ICE, x: T.CRACKED, P: T.PLATE, D: T.DOOR,
  L: T.LOCK, O: T.PORTAL, H: T.HOME, F: T.FISH, k: T.KEY, g: T.DOG, C: T.FLOOR, b: T.FLOOR, y: T.FLOOR,
};

/** Parse a level drawn as text rows (see README for the legend). */
export function parseLevel(rows: string[]): Level {
  const h = rows.length;
  const w = Math.max(...rows.map((r) => r.length));
  const tiles = new Uint8Array(w * h);
  const objs: Obj[] = [];
  let cat = -1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const ch = rows[y][x] ?? ' ';
      const i = y * w + x;
      const t = CHAR[ch];
      if (t === undefined) throw new Error(`Unknown tile '${ch}'`);
      tiles[i] = t;
      if (ch === 'C') cat = i;
      if (ch === 'b') objs.push({ k: ObjKind.BOX, p: i });
      if (ch === 'y') objs.push({ k: ObjKind.YARN, p: i });
    }
  }
  if (cat < 0) throw new Error('Level has no cat');
  const portals: number[] = [];
  const plates: number[] = [];
  const dyn: number[] = [];
  const danger = new Uint8Array(w * h);
  let fish = 0;
  tiles.forEach((t, i) => {
    if (t === T.PORTAL) portals.push(i);
    if (t === T.PLATE) plates.push(i);
    if (t === T.FISH) fish++;
    if (t === T.FISH || t === T.KEY || t === T.WATER || t === T.CRACKED || t === T.LOCK) dyn.push(i);
    if (t === T.DOG) {
      danger[i] = 1;
      for (const d of DIRS) {
        const n = stepCell(w, h, i, d);
        if (n >= 0) danger[n] = 1;
      }
    }
  });
  if (portals.length !== 0 && portals.length !== 2) throw new Error('Portals must come in a pair');
  return { w, h, tiles, cat, objs, portals, plates, danger, dyn, fish };
}

export function stepCell(w: number, h: number, cell: number, d: Dir): number {
  const x = (cell % w) + DX[d];
  const y = Math.floor(cell / w) + DY[d];
  return x < 0 || y < 0 || x >= w || y >= h ? -1 : y * w + x;
}

export function initialState(lv: Level): State {
  return { cat: lv.cat, objs: lv.objs.map((o) => ({ ...o })), tiles: lv.tiles.slice(), keys: 0, fish: lv.fish, facing: 2 };
}

export function cloneState(s: State): State {
  return { cat: s.cat, objs: s.objs.map((o) => ({ ...o })), tiles: s.tiles.slice(), keys: s.keys, fish: s.fish, facing: s.facing };
}

export function objAt(s: State, cell: number): number {
  for (let i = 0; i < s.objs.length; i++) if (!s.objs[i].gone && s.objs[i].p === cell) return i;
  return -1;
}

/** Doors are open while every pressure plate has the cat or an object on it. */
export function doorsOpen(lv: Level, s: State): boolean {
  if (!lv.plates.length) return false;
  return lv.plates.every((p) => p === s.cat || objAt(s, p) >= 0);
}

function doorPassable(lv: Level, s: State, cell: number): boolean {
  return doorsOpen(lv, s) || s.cat === cell || objAt(s, cell) >= 0;
}

/** Can the cat stand on this cell (ignoring objects)? */
function catCan(lv: Level, s: State, cell: number): boolean {
  if (cell < 0 || lv.danger[cell]) return false;
  switch (s.tiles[cell]) {
    case T.FLOOR: case T.ICE: case T.CRACKED: case T.PLATE: case T.HOME: case T.FISH: case T.KEY: case T.PORTAL: case T.BRIDGE:
      return true;
    case T.DOOR: return doorPassable(lv, s, cell);
    case T.LOCK: return s.keys > 0;
    default: return false;
  }
}

/** 0 = blocked, 1 = can move there, 2 = falls in and fills the gap */
function objCan(lv: Level, s: State, cell: number, catAt: number): 0 | 1 | 2 {
  if (cell < 0 || cell === catAt || objAt(s, cell) >= 0) return 0;
  switch (s.tiles[cell]) {
    case T.FLOOR: case T.ICE: case T.CRACKED: case T.PLATE: case T.BRIDGE: return 1;
    case T.DOOR: return doorPassable(lv, s, cell) ? 1 : 0;
    case T.WATER: case T.HOLE: return 2;
    default: return 0;
  }
}

/** Try to move the cat. Returns the animation events, or null if the move is blocked. Mutates `s`. */
export function move(lv: Level, s: State, d: Dir): MoveEvent[] | null {
  const { w, h } = lv;
  const t = stepCell(w, h, s.cat, d);
  if (t < 0) return null;
  const openBefore = doorsOpen(lv, s);
  const ev: MoveEvent[] = [];
  const oi = objAt(s, t);
  if (oi >= 0) {
    // push: the object moves first, while the cat still stands where it was
    if (!catCan(lv, s, t)) return null;
    const o = s.objs[oi];
    const path = [o.p];
    let cur = o.p;
    let sink = false;
    for (;;) {
      const n = stepCell(w, h, cur, d);
      const r = objCan(lv, s, n, t);
      if (r === 0) break;
      cur = n;
      path.push(n);
      if (r === 2) { sink = true; break; }
      // yarn keeps rolling; boxes only keep going on ice
      if (o.k !== ObjKind.YARN && s.tiles[cur] !== T.ICE) break;
    }
    if (path.length === 1) return null;
    o.p = cur;
    if (sink) {
      o.gone = true;
      s.tiles[cur] = T.BRIDGE;
    }
    ev.push({ t: 'push', i: oi, path, sink, yarn: o.k === ObjKind.YARN });
  } else if (!catCan(lv, s, t)) {
    return null;
  }

  s.facing = d;
  const path = [s.cat];
  let slide = false;
  for (;;) {
    const from = s.cat;
    const to = path.length === 1 ? t : stepCell(w, h, from, d);
    if (path.length > 1 && (to < 0 || !catCan(lv, s, to) || objAt(s, to) >= 0)) break;
    if (s.tiles[from] === T.CRACKED) {
      s.tiles[from] = T.HOLE;
      ev.push({ t: 'crack', cell: from });
    }
    s.cat = to;
    path.push(to);
    const tile = s.tiles[to];
    if (tile === T.LOCK) { s.keys--; s.tiles[to] = T.FLOOR; ev.push({ t: 'unlock', cell: to }); }
    else if (tile === T.FISH) { s.fish--; s.tiles[to] = T.FLOOR; ev.push({ t: 'eat', cell: to }); }
    else if (tile === T.KEY) { s.keys++; s.tiles[to] = T.FLOOR; ev.push({ t: 'key', cell: to }); }
    else if (tile === T.PORTAL) {
      const other = lv.portals[0] === to ? lv.portals[1] : lv.portals[0];
      ev.unshift({ t: 'cat', path: [...path], slide });
      ev.push({ t: 'teleport', from: to, to: other });
      s.cat = other;
      pushDoors(lv, s, openBefore, ev);
      return ev;
    }
    if (s.tiles[to] !== T.ICE) break;
    slide = true;
  }
  // cat animation plays together with (right after) the push
  ev.unshift({ t: 'cat', path, slide });
  pushDoors(lv, s, openBefore, ev);
  return ev;
}

function pushDoors(lv: Level, s: State, before: boolean, ev: MoveEvent[]): void {
  const after = doorsOpen(lv, s);
  if (after !== before) ev.push({ t: 'doors', open: after });
}

export function isWon(s: State): boolean {
  return s.fish === 0 && s.tiles[s.cat] === T.HOME;
}

/** Unique key of a state, for the solver's visited set. */
export function stateKey(lv: Level, s: State): string {
  let k = `${s.cat},${s.keys}|`;
  const os = s.objs.filter((o) => !o.gone).map((o) => o.k * 10000 + o.p).sort((a, b) => a - b);
  k += os.join(',') + '|';
  for (const c of lv.dyn) k += String.fromCharCode(65 + s.tiles[c]);
  return k;
}
