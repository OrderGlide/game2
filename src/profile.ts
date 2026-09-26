// The player's saved progress: levels escaped, hints, coins, settings and purchases.
import type { RoomSave } from './engine/room';
import type { ProductId } from './platform/config';
import { ADS_PER_DAY, AD_COOLDOWN } from './platform/config';

export type Quality = 'auto' | 'low' | 'high';
export interface Settings {
  sfx: boolean; music: boolean; vibration: boolean; scares: boolean; quality: Quality; lang: 'auto' | 'pl' | 'en';
}
export const DEFAULT_SETTINGS: Settings = { sfx: true, music: true, vibration: true, scares: true, quality: 'auto', lang: 'auto' };

export interface LevelResult { done: boolean; stars: number; time: number }

export interface Profile {
  v: 2;
  coins: number;
  hints: number;
  /** keyed by level id (L1…L100) */
  levels: Record<string, LevelResult>;
  /** The level in progress (kept so the player can continue after closing the app). */
  current: RoomSave | null;
  settings: Settings;
  noAds: boolean;
  owned: ProductId[];
  /** When the next free hint can be claimed (ms since epoch). */
  freeHintAt: number;
  daily: { last: string; streak: number };
  adReadyAt: Record<string, number>;
  ads: { day: string; n: number };
}

/** Wait between free hints. */
export const FREE_HINT_MIN = 20;
/** Hints needed to skip a level. */
export const SKIP_COST = 5;
/** Coins for one hint in the shop. */
export const HINT_COINS = 40;

export const DAILY: { coins?: number; hints?: number }[] = [
  { coins: 30 }, { hints: 1 }, { coins: 50 }, { hints: 2 }, { coins: 80 }, { hints: 2 }, { coins: 150, hints: 3 },
];

export function newProfile(): Profile {
  return {
    v: 2, coins: 0, hints: 3, levels: {}, current: null,
    settings: { ...DEFAULT_SETTINGS }, noAds: false, owned: [], freeHintAt: 0,
    daily: { last: '', streak: 0 }, adReadyAt: {}, ads: { day: '', n: 0 },
  };
}

export function normalizeProfile(p: Partial<Profile> & { v?: number }): Profile {
  const d = newProfile();
  if (p.v !== 2) {
    // the old cat-game save: keep only purchases and settings
    return { ...d, owned: p.owned ?? [], noAds: p.noAds ?? false, hints: Math.max(d.hints, p.hints ?? 0), settings: { ...d.settings, ...p.settings } };
  }
  return {
    ...d, ...p,
    levels: p.levels ?? {},
    settings: { ...d.settings, ...p.settings },
    owned: p.owned ?? [],
    adReadyAt: p.adReadyAt ?? {},
    ads: p.ads ?? d.ads,
    daily: { ...d.daily, ...p.daily },
  };
}

/** 3 stars without hints, 2 with up to two, 1 otherwise. */
export function starsFor(hintsUsed: number): number {
  return hintsUsed === 0 ? 3 : hintsUsed <= 2 ? 2 : 1;
}

export function coinsFor(stars: number, level: number): number {
  return 10 + stars * 5 + Math.floor(level / 10) * 2;
}

export function dayKey(d = new Date()): string {
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

export function dailyAvailable(p: Profile): boolean { return p.daily.last !== dayKey(); }

export function dailyIndex(p: Profile): number {
  if (!dailyAvailable(p)) return (p.daily.streak - 1 + 7) % 7;
  const y = new Date();
  y.setDate(y.getDate() - 1);
  return p.daily.last === dayKey(y) ? p.daily.streak % 7 : 0;
}

export function claimDaily(p: Profile): { coins?: number; hints?: number } | null {
  if (!dailyAvailable(p)) return null;
  const i = dailyIndex(p);
  const r = DAILY[i];
  p.coins += r.coins ?? 0;
  p.hints += r.hints ?? 0;
  p.daily = { last: dayKey(), streak: i + 1 };
  return r;
}

export function freeHintReady(p: Profile, now = Date.now()): boolean { return now >= p.freeHintAt; }

export function claimFreeHint(p: Profile, now = Date.now()): boolean {
  if (!freeHintReady(p, now)) return false;
  p.hints++;
  p.freeHintAt = now + FREE_HINT_MIN * 60_000;
  return true;
}

export function adReady(p: Profile, key: keyof typeof AD_COOLDOWN, now = Date.now()): boolean {
  const used = p.ads.day === dayKey() ? p.ads.n : 0;
  return now >= (p.adReadyAt[key] ?? 0) && used < ADS_PER_DAY;
}

export function markAd(p: Profile, key: keyof typeof AD_COOLDOWN, now = Date.now()): void {
  const today = dayKey();
  if (p.ads.day !== today) p.ads = { day: today, n: 0 };
  p.ads.n++;
  p.adReadyAt[key] = now + AD_COOLDOWN[key] * 1000;
}

/** Highest level the player may enter (the first one not yet escaped). */
export function unlockedUpTo(p: Profile, total: number): number {
  let n = 1;
  while (n < total && p.levels[`L${n}`]?.done) n++;
  return n;
}
