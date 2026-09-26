// Shapes of room definitions. Rooms are produced by the level generator (src/gen); each one builds its
// objects and wires up what happens when the player taps them or uses an item on them.
import type * as THREE from 'three';
import type { Txt } from '../i18n';
import type { Sfx } from '../audio';

export type Flags = Record<string, number | boolean | string | undefined>;

export interface DocDef {
  title?: Txt;
  /** Text; lines separated by \n. */
  body: Txt;
  style?: 'paper' | 'typed' | 'torn' | 'blood' | 'photo';
  /** extra-large text, for symbol clues */
  big?: boolean;
  /** show mirrored (the player has to read it backwards) */
  mirror?: boolean;
}

export interface ItemDef {
  icon: string;
  name: Txt;
  desc: Txt;
  /** Inspecting the item opens this document (notes, photos). */
  doc?: DocDef;
}

export interface CombineDef { a: string; b: string; result: string; say?: Txt }

export type LockDef =
  | { kind: 'wheels'; chars: string; answer: string; title?: Txt }
  | { kind: 'keypad'; answer: string; title?: Txt }
  | { kind: 'sequence'; buttons: { id: string; label: string; color: string }[]; answer: string[]; title?: Txt }
  | { kind: 'slide'; tiles: string[]; title?: Txt }
  | { kind: 'lights'; size: number; start: number[]; title?: Txt };

export interface HintStep {
  /** The step is finished once this returns true; the first unfinished step is the one hinted. */
  done: (f: Flags, has: (item: string) => boolean) => boolean;
  /** From a gentle nudge to the full solution. */
  hints: Txt[];
}

/** Where something sits: on wall 0–3 (0 = the door wall, then clockwise), `u` metres right of the wall's
 *  centre as seen when facing it, `y` up from the floor and `out` metres out from the wall into the room. */
export interface Place { wall: 0 | 1 | 2 | 3; u: number; y?: number; out?: number; rot?: number }

export type ScareKind = 'figure' | 'flicker' | 'bang' | 'whisper';

export interface Ctx {
  f: Flags;
  /** The inventory item the player is using, or null for a plain tap. */
  item: string | null;
  has(id: string): boolean;
  give(id: string): void;
  take(id: string): void;
  say(t: Txt): void;
  read(doc: DocDef): void;
  lock(def: LockDef, onOpen: () => void): void;
  zoom(view: string): void;
  sfx(name: Sfx): void;
  vibrate(ms: number): void;
  scare(kind: ScareKind): void;
  win(): void;
}

export type Handler = (c: Ctx) => void;

export interface ObjHandle {
  readonly node: THREE.Object3D;
  tap(fn: Handler): ObjHandle;
  use(item: string, fn: Handler): ObjHandle;
  show(fn: (f: Flags) => boolean): ObjHandle;
  /** Called every frame; move parts toward their target with `k` (0..1, 1 = snap). */
  anim(fn: (f: Flags, node: THREE.Object3D, k: number) => void): ObjHandle;
  /** Tapping it from a wall view zooms into this close-up. */
  zoom(view: string): ObjHandle;
  /** Only interactive in these close-ups (tapping it from their parent wall zooms in). */
  in(...views: string[]): ObjHandle;
}

export interface Builder {
  readonly root: THREE.Group;
  /** Decoration that doesn't react to taps. */
  put<T extends THREE.Object3D>(node: T, p: Place): T;
  obj(id: string, node: THREE.Object3D, p: Place): ObjHandle;
  /** Reacts to flags (show/anim) but ignores taps — writing, lights, props. */
  fx(id: string, node: THREE.Object3D, p: Place): ObjHandle;
  /** An item lying somewhere; tapping it puts it in the inventory. */
  pickup(item: string, node: THREE.Object3D, p: Place, view?: string, when?: (f: Flags) => boolean): ObjHandle;
  /** A close-up camera view looking at a point on a wall from `dist` metres away. */
  zoomView(id: string, p: Place & { dist: number; parent?: string; look?: number }): void;
}

export interface RoomTheme {
  id: string;
  name: Txt;
  wall: number;
  wall2: number;
  pattern: 'plain' | 'stripes' | 'dots' | 'tiles' | 'diamonds' | 'bricks' | 'planks';
  floor: number;
  floor2: number;
  floorKind: 'planks' | 'tiles' | 'bricks';
  ceiling: number;
  trim: number;
  /** colour of the flickering bulb */
  light: number;
  /** colour of the fog and the darkness */
  fog: number;
  /** 0..1, how much dirt, stains and drips on the walls */
  grime: number;
  /** base brightness (1 = normal) */
  bright: number;
  /** photo-based PBR texture sets (public/textures) replacing the drawn wall/floor/ceiling patterns */
  pbr?: { wall: string; floor: string; ceiling: string; trim?: string; wallTile: number; floorTile: number };
}

export interface Action {
  tap?: string;
  use?: [string, string];
  combine?: [string, string];
  code?: string;
  close?: boolean;
}

export interface RoomDef {
  id: string;
  level: number;
  name: Txt;
  theme: RoomTheme;
  items: Record<string, ItemDef>;
  combos?: CombineDef[];
  hints: HintStep[];
  /** Said when the room starts. */
  intro: Txt;
  /** Pitch-dark room: almost nothing is visible until the player has the item `torch`. */
  dark?: boolean;
  build(b: Builder): void;
  /** Scripted walkthrough, used by the automated test to prove the room can be escaped. */
  solution: Action[];
}
