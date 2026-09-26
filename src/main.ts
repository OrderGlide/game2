import './ui/style.css';
import * as THREE from 'three';
import { RoomRuntime } from './engine/room';
import { ROOMS } from './rooms';
import { Hud } from './ui/hud';
import { Music } from './music';
import { setMuted, setVibration, unlockAudio } from './audio';
import { applyLang, setLang } from './i18n';
import { newProfile, normalizeProfile, type Profile, type Settings } from './profile';
import { Cat, SKINS, type SkinId } from './view/cat';
import { box, cyl, mat } from './view/kit';
import { cushion } from './view/furniture';
import { initAds, isNative, showInterstitial, showRewarded } from './platform/ads';
import { billingAvailable, loadPrices, ownedProducts, priceOf, purchase } from './platform/billing';
import { INTERSTITIAL, PRODUCTS, type ProductId } from './platform/config';
import { modalOpen, setModalListener } from './ui/dom';

const SAVE_KEY = 'cat-escape-save-v1';
const VERSION = '0.1.0';

function loadProfile(): Profile {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (raw) return normalizeProfile(JSON.parse(raw));
  } catch (e) {
    console.warn('Save could not be loaded, starting fresh', e);
  }
  return newProfile();
}

const profile = loadProfile();
setLang(profile.settings.lang);
applyLang();

const canvas = document.getElementById('game') as HTMLCanvasElement;
const renderer = new THREE.WebGLRenderer({ canvas, antialias: profile.settings.quality !== 'low', powerPreference: 'high-performance' });
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
const music = new Music();

let shadows = true;
function applySettings(s: Settings): void {
  setMuted(!s.sfx);
  setVibration(s.vibration);
  music.setEnabled(s.music);
  const high = s.quality === 'high' || (s.quality === 'auto' && !lowEnd());
  shadows = s.quality !== 'low';
  renderer.shadowMap.enabled = shadows;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, high ? 2 : 1.25));
  resize();
}

function lowEnd(): boolean {
  const cores = navigator.hardwareConcurrency ?? 4;
  return cores <= 4 && /Android/i.test(navigator.userAgent);
}

function save(): void {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(profile)); } catch { /* storage full or blocked */ }
}

// ---------- menu scene: Mruczek on a cushion ----------

const menuScene = new THREE.Scene();
menuScene.background = new THREE.Color(0xf2c894);
const menuCam = new THREE.PerspectiveCamera(35, 16 / 9, 0.1, 50);
menuScene.add(new THREE.HemisphereLight(0xfff4e6, 0x8a5a3b, 1.3));
const menuSun = new THREE.DirectionalLight(0xfff1dc, 2);
menuSun.position.set(2, 5, 4);
menuSun.castShadow = true;
menuScene.add(menuSun);
const floor = new THREE.Mesh(new THREE.CircleGeometry(6, 40), mat(0xe8b77e));
floor.rotation.x = -Math.PI / 2;
floor.receiveShadow = true;
const pillow = cushion(0xd96f7c);
pillow.scale.multiply(new THREE.Vector3(1.4, 1, 1.5));
menuScene.add(floor, pillow, cyl(0.15, 0.15, 0.02, 0xffc93c, 0.9, 0, 0.5), box(0.4, 0.3, 0.3, 0xc79a5e, -1.0, 0, -0.3));
let menuCat = new Cat(SKINS.find((s) => s.id === profile.skin) ?? SKINS[0]);
menuCat.root.position.set(0, 0.18, 0);
menuCat.root.scale.setScalar(1.3);
menuScene.add(menuCat.root);

function setSkin(id: SkinId): void {
  profile.skin = id;
  save();
  menuScene.remove(menuCat.root);
  menuCat = new Cat(SKINS.find((s) => s.id === id)!);
  menuCat.root.position.set(0, 0.18, 0);
  menuCat.root.scale.setScalar(1.3);
  menuScene.add(menuCat.root);
  menuCat.happy = 1;
}

// ---------- cat portraits for the wardrobe ----------

const portraits = new Map<SkinId, string>();
function portrait(id: SkinId, size = 192, bg: number | null = null, closeUp = false): string {
  const cached = bg === null && size === 192 ? portraits.get(id) : undefined;
  if (cached) return cached;
  const scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight(0xffffff, 0x8a5a3b, 1.6));
  const l = new THREE.DirectionalLight(0xffffff, 1.6);
  l.position.set(1, 2, 3);
  scene.add(l);
  const c = new Cat(SKINS.find((s) => s.id === id)!);
  c.update(0.01);
  scene.add(c.root);
  const cam = new THREE.PerspectiveCamera(30, 1, 0.1, 10);
  if (closeUp) { cam.position.set(0.28, 0.72, 1.45); cam.lookAt(0, 0.5, 0); } else { cam.position.set(0.9, 0.85, 1.9); cam.lookAt(0, 0.4, 0); }
  const rt = new THREE.WebGLRenderTarget(size, size, { colorSpace: THREE.SRGBColorSpace });
  const prevTarget = renderer.getRenderTarget();
  renderer.setRenderTarget(rt);
  renderer.setClearColor(bg ?? 0x000000, bg === null ? 0 : 1);
  renderer.clear();
  renderer.render(scene, cam);
  renderer.setClearColor(0x000000, 0);
  const px = new Uint8Array(size * size * 4);
  renderer.readRenderTargetPixels(rt, 0, 0, size, size, px);
  renderer.setRenderTarget(prevTarget);
  rt.dispose();
  const cv = document.createElement('canvas');
  cv.width = cv.height = size;
  const ctx = cv.getContext('2d')!;
  const img = ctx.createImageData(size, size);
  for (let y = 0; y < size; y++) img.data.set(px.subarray((size - 1 - y) * size * 4, (size - y) * size * 4), y * size * 4);
  ctx.putImageData(img, 0, 0);
  const url = cv.toDataURL();
  if (bg === null && size === 192) portraits.set(id, url);
  return url;
}

// ---------- rooms ----------

let rt: RoomRuntime | null = null;
const hud = new Hud({
  profile,
  rooms: ROOMS,
  version: VERSION,
  save,
  startRoom,
  toMenu,
  showRewarded,
  afterRoom,
  purchase,
  priceOf,
  grantProduct,
  async restore() {
    for (const id of await ownedProducts()) if (!profile.owned.includes(id)) grantProduct(id);
  },
  applySettings(s, langChanged) {
    applySettings(s);
    save();
    if (langChanged) location.reload();
  },
  resetProgress() {
    try { localStorage.removeItem(SAVE_KEY); } catch { /* ignore */ }
    location.reload();
  },
  portrait,
  setSkin,
});
void billingAvailable;

function startRoom(i: number): void {
  const def = ROOMS[i];
  if (!def) return;
  rt?.dispose();
  const saved = profile.current && profile.current.id === def.id ? profile.current : null;
  const skin = SKINS.find((s) => s.id === profile.skin) ?? SKINS[0];
  rt = new RoomRuntime(def, saved, hud, skin, shadows);
  profile.current = rt.s;
  save();
  hud.enterRoom(rt, i);
  resize();
}

function toMenu(): void {
  rt?.dispose();
  rt = null;
  save();
  hud.showMenu();
  resize();
}

function grantProduct(id: ProductId): void {
  const def = PRODUCTS.find((p) => p.id === id)!;
  if (!def.consumable) {
    if (profile.owned.includes(id)) return;
    profile.owned.push(id);
  }
  profile.hints += def.grant.hints ?? 0;
  profile.coins += def.grant.coins ?? 0;
  if (def.grant.noAds) profile.noAds = true;
  if (def.grant.skin && !profile.skins.includes(def.grant.skin)) profile.skins.push(def.grant.skin);
  save();
}

// interstitial ads: only between rooms, rarely
const sessionStart = performance.now();
let lastInterstitial = -1e9;
function afterRoom(index: number): void {
  if (profile.noAds || index + 1 < INTERSTITIAL.fromRoom) return;
  const now = performance.now() / 1000;
  if (now - sessionStart / 1000 < INTERSTITIAL.firstAfterSec || now - lastInterstitial < INTERSTITIAL.minGapSec) return;
  lastInterstitial = now;
  void showInterstitial();
}

// ---------- sizing & input ----------

function invWidth(): number {
  const inv = document.querySelector('.inv') as HTMLElement | null;
  return rt && inv ? inv.offsetWidth : 0;
}

function resize(): void {
  const w = Math.max(1, window.innerWidth - invWidth());
  const h = Math.max(1, window.innerHeight);
  renderer.setSize(w, h, false);
  canvas.style.width = `${w}px`;
  canvas.style.height = `${h}px`;
  rt?.resize(w / h);
  menuCam.aspect = w / h;
  menuCam.updateProjectionMatrix();
}
window.addEventListener('resize', resize);

let down: { x: number; y: number; t: number } | null = null;
canvas.addEventListener('pointerdown', (e) => {
  unlockAudio();
  down = { x: e.clientX, y: e.clientY, t: performance.now() };
});
canvas.addEventListener('pointerup', (e) => {
  if (!down) return;
  const dx = e.clientX - down.x;
  const dy = e.clientY - down.y;
  const dt = performance.now() - down.t;
  down = null;
  if (!rt || modalOpen()) {
    if (!rt) { menuCat.happy = 1; }
    return;
  }
  if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5 && !rt.isZoomed()) {
    rt.turn(dx < 0 ? 1 : -1);
    return;
  }
  if (Math.abs(dy) > 70 && dy > 0 && rt.isZoomed()) { rt.back(); return; }
  if (Math.hypot(dx, dy) < 14 && dt < 700) {
    const r = canvas.getBoundingClientRect();
    rt.tap(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
  }
});
document.addEventListener('pointerdown', unlockAudio, { once: true });
setModalListener(() => { /* modals pause nothing — the room keeps its timer running while reading notes */ });
document.addEventListener('keydown', (e) => {
  if (!rt || modalOpen()) return;
  if (e.key === 'ArrowLeft') rt.turn(-1);
  if (e.key === 'ArrowRight') rt.turn(1);
  if (e.key === 'ArrowDown' || e.key === 'Escape') rt.back();
});

// ---------- persistence ----------

setInterval(save, 3000);
document.addEventListener('visibilitychange', () => { if (document.hidden) save(); });
window.addEventListener('pagehide', save);

// ---------- boot ----------

applySettings(profile.settings);
hud.showMenu();
resize();
if (isNative) {
  void initAds();
  void loadPrices();
  void ownedProducts().then((ids) => { for (const id of ids) if (!profile.owned.includes(id)) grantProduct(id); });
}

let last = performance.now();
let hudT = 0;
let menuT = 0;
function frame(now: number): void {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  if (rt) {
    // the room clock doesn't run while the game is in the background
    rt.update(document.hidden ? 0 : dt);
    renderer.render(rt.scene, rt.camera);
  } else {
    menuT += dt;
    menuCat.update(dt);
    menuCat.root.rotation.y = Math.sin(menuT * 0.3) * 0.5 + 0.25;
    const a = menuT * 0.05;
    // keep the cat right of centre, above the room cards
    menuCam.position.set(Math.sin(a) * 0.3 - 0.55, 1.3, 3.3);
    menuCam.lookAt(-0.6, 0.15, 0);
    renderer.render(menuScene, menuCam);
  }
  hudT += dt;
  if (hudT > 0.25) { hudT = 0; hud.update(); }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// ---------- automated walkthrough (npm test) ----------

if (import.meta.env.DEV || new URLSearchParams(location.search).has('test')) {
  const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
  Object.assign(window, {
    game: { profile, get rt() { return rt; }, hud, startRoom, toMenu, rooms: ROOMS, portrait },
    async walkthrough(i: number): Promise<string> {
      startRoom(i);
      await wait(100);
      const room = rt!;
      for (const a of room.def.solution) {
        if (a.code !== undefined) {
          if (!hud.lockHandle) throw new Error(`No lock open for code ${a.code}`);
          if (!hud.lockHandle.submit(a.code)) throw new Error(`Wrong code ${a.code}`);
          await wait(600);
          continue;
        }
        if (a.close) { hud.closeTop(); continue; }
        room.runAction(a);
        await wait(30);
      }
      await wait(1700);
      if (!profile.rooms[room.def.id]?.done) throw new Error(`Room ${room.def.id} was not escaped`);
      if (room.hintStep() < room.def.hints.length) throw new Error(`Hint step ${room.hintStep()} still open after escaping`);
      return room.def.id;
    },
  });
}
