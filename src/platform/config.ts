// Store and ad configuration. The AdMob IDs below are Google's public *test* IDs — replace them with your own
// before release (AdMob console → Apps → your app / Ad units). Product IDs must match the in-app products you
// create in Play Console → Monetize → Products → In-app products. No secrets live in this file.
import type { SkinId } from '../view/cat';

export const ADMOB = {
  /** Also set in android/app/src/main/AndroidManifest.xml (com.google.android.gms.ads.APPLICATION_ID). */
  appId: 'ca-app-pub-3940256099942544~3347511713',
  rewarded: 'ca-app-pub-3940256099942544/5224354917',
  interstitial: 'ca-app-pub-3940256099942544/1033173712',
  /** Keep true until your own ad units are approved — clicking real ads on your own device can get the account banned. */
  testing: true,
};

/** Interstitials only between rooms, never in the first minutes and never back to back. */
export const INTERSTITIAL = { firstAfterSec: 300, minGapSec: 240, fromRoom: 2 };

/** "Watch an ad" rewards: cooldown in seconds and a daily cap. */
export const AD_COOLDOWN = { hint: 180, double: 0 };
export const ADS_PER_DAY = 15;

export type ProductId = 'starter_pack' | 'hints_small' | 'hints_medium' | 'hints_large' | 'no_ads';
export interface ProductDef {
  id: ProductId;
  icon: string;
  consumable: boolean;
  grant: { hints?: number; coins?: number; skin?: SkinId; noAds?: boolean };
  /** Shown until the real, localised price is loaded from Google Play. */
  fallbackPrice: string;
  best?: boolean;
}

export const PRODUCTS: ProductDef[] = [
  { id: 'starter_pack', icon: '🎁', consumable: false, grant: { hints: 15, skin: 'golden', noAds: true }, fallbackPrice: '14,99 zł', best: true },
  { id: 'hints_small', icon: '💡', consumable: true, grant: { hints: 5 }, fallbackPrice: '4,99 zł' },
  { id: 'hints_medium', icon: '🔦', consumable: true, grant: { hints: 20 }, fallbackPrice: '14,99 zł' },
  { id: 'hints_large', icon: '🌟', consumable: true, grant: { hints: 60 }, fallbackPrice: '34,99 zł' },
  { id: 'no_ads', icon: '🚫', consumable: false, grant: { noAds: true }, fallbackPrice: '9,99 zł' },
];
