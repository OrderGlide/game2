import './ui/style.css';
import * as THREE from 'three';
import { RoomRuntime } from './engine/room';
import { generateLevel, LEVELS } from './gen/level';
import { themeFor } from './gen/themes';
import { Hud } from './ui/hud';
import { Music } from './music';
import { setMuted, setVibration, sfx, unlockAudio } from './audio';
import { applyLang, setLang } from './i18n';
import { newProfile, normalizeProfile, type Profile, type Settings } from './profile';
import { box, canvasTex, drawGrime, drawPattern, mat, mulberry32 } from './view/kit';
import { hangingBulb, heavyDoor, shadowFigure, doll } from './view/horror';
import { initAds, isNative, showInterstitial, showRewarded } from './platform/ads';
import { loadPrices, ownedProducts, priceOf, purchase } from './platform/billing';
import { INTERSTITIAL, PRODUCTS, type ProductId } from './platform/config';
import { modalOpen } from './ui/dom';

const SAVE_KEY = 'room100-save';
const OLD_SAVE_KEY = 'cat-escape-save-v1';
const VERSION = '0.2.0';

function loadProfile(): Profile {
  try {
    const raw = localStorage.getItem(SAVE_KEY) ?? localStorage.getItem(OLD_SAVE_KEY);
    if (raw) return normalizeProfile(JSON.parse(raw));
  } catch (e) {
    console.warn('Save could not be loaded, starting fresh', e);
  }
  return newProfile();
}

const profile = loadProfile();
const firstRun = (() => { try { return !localStorage.getItem(SAVE_KEY); } catch { return false; } })();
setLang(profile.settings.lang);
applyLang();

const canvas = document.getElementById('game') as HTMLCanvasElement;
const renderer = new THREE.WebGLRenderer({ canvas, antialias: profile.settings.quality !== 'low', powerPreference: 'high-performance' });
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.3;
const music = new Music();

let shadows = true;
function applySettings(s: Settings): void {
  setMuted(!s.sfx);
  setVibration(s.vibration);
  music.setEnabled(s.music);
  const high = s.quality === 'high' || (s.quality === 'auto' && !lowEnd());
  shadows = s.quality === 'high' || (s.quality === 'auto' && !lowEnd());
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

// ---------- menu scene: a dark corridor ending in a door ----------

const menuScene = new THREE.Scene();
menuScene.background = new THREE.Color(0x050303);
menuScene.fog = new THREE.Fog(0x050303, 3, 13);
const menuCam = new THREE.PerspectiveCamera(50, 16 / 9, 0.1, 40);
menuScene.add(new THREE.HemisphereLight(0x8a90a8, 0x201010, 0.35));
const menuBulb = new THREE.PointLight(0xffb070, 10, 9, 1.5);
menuBulb.position.set(0, 2.6, -4.5);
menuScene.add(menuBulb);
const redGlow = new THREE.PointLight(0xff2010, 4, 4, 2);
redGlow.position.set(0, 1.2, -8.6);
menuScene.add(redGlow);
{
  const rnd = mulberry32(99);
  const wallTex = canvasTex(1024, 256, (c) => { drawPattern(c, 'stripes', 0x5a4a3c, 0x4a3c30, 1024, 256, 70, rnd); drawGrime(c, 1024, 256, 0.8, rnd); });
  const floorTex = canvasTex(256, 1024, (c) => { drawPattern(c, 'planks', 0x4a3426, 0x2a1c14, 256, 1024, 90, rnd); drawGrime(c, 256, 1024, 0.6, rnd, false); });
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(3, 12), mat(0xffffff, { map: floorTex }));
  floor.rotation.x = -Math.PI / 2;
  floor.position.z = -3;
  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(3, 12), mat(0x2a221e));
  ceil.rotation.x = Math.PI / 2;
  ceil.position.set(0, 3, -3);
  menuScene.add(floor, ceil);
  for (const s of [-1, 1]) {
    const w = new THREE.Mesh(new THREE.PlaneGeometry(12, 3), mat(0xffffff, { map: wallTex }));
    w.rotation.y = -s * Math.PI / 2;
    w.position.set(s * 1.5, 1.5, -3);
    menuScene.add(w);
  }
  const end = new THREE.Mesh(new THREE.PlaneGeometry(3, 3), mat(0xffffff, { map: wallTex }));
  end.position.set(0, 1.5, -9);
  menuScene.add(end);
  const door = heavyDoor(0x3a2418);
  door.position.set(0, 0, -8.98);
  door.getObjectByName('leaf')!.rotation.y = -0.25;
  menuScene.add(door);
  const bulb = hangingBulb(0xffb070);
  bulb.position.set(0, 3, -4.5);
  menuScene.add(bulb);
  const d = doll(rnd);
  d.position.set(0.9, 0, -6.5);
  d.rotation.y = -0.6;
  menuScene.add(d, box(0.5, 0.9, 0.4, 0x3a2a20, -1.0, 0, -5.8));
}
const menuFigure = shadowFigure();
menuFigure.position.set(0.1, 0, -8.3);
menuFigure.visible = false;
menuScene.add(menuFigure);

// ---------- levels ----------

let rt: RoomRuntime | null = null;
const hud = new Hud({
  profile,
  version: VERSION,
  save,
  startLevel,
  toMenu,
  showRewarded,
  afterLevel,
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
    try { localStorage.removeItem(SAVE_KEY); localStorage.removeItem(OLD_SAVE_KEY); } catch { /* ignore */ }
    location.reload();
  },
});

function startLevel(n: number): void {
  if (n < 1 || n > LEVELS) return;
  const def = generateLevel(n);
  rt?.dispose();
  const saved = profile.current && profile.current.id === def.id ? profile.current : null;
  rt = new RoomRuntime(def, saved, hud, { shadows, scares: profile.settings.scares });
  profile.current = rt.s;
  save();
  hud.enterRoom(rt, n);
  music.setDrone(themeFor(n).drone);
  resize();
}

function toMenu(): void {
  rt?.dispose();
  rt = null;
  save();
  hud.showMenu();
  music.setDrone(50);
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
  save();
}

// interstitial ads: only between levels, rarely
const sessionStart = performance.now();
let lastInterstitial = -1e9;
function afterLevel(n: number): void {
  if (profile.noAds || n < INTERSTITIAL.fromRoom) return;
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
  if (!rt || modalOpen()) return;
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
resize();
// the scrawl and typewriter fonts must be ready before rooms draw them onto textures
const fontsReady = Promise.race([
  Promise.all([document.fonts.load('40px Creepster'), document.fonts.load('20px "Special Elite"')]),
  new Promise((r) => setTimeout(r, 2500)),
]);
void fontsReady.then(() => {
  hud.showMenu();
  if (firstRun) hud.contentWarning(save);
});
if (isNative) {
  void initAds();
  void loadPrices();
  void ownedProducts().then((ids) => { for (const id of ids) if (!profile.owned.includes(id)) grantProduct(id); });
}

let last = performance.now();
let hudT = 0;
let menuT = 0;
let figureT = 0;
function frame(now: number): void {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  if (rt) {
    rt.update(document.hidden ? 0 : dt);
    renderer.render(rt.scene, rt.camera);
  } else {
    menuT += dt;
    // slow creep down the corridor, with a flickering bulb and something at the door now and then
    const flick = Math.random() < 0.03 ? 0.1 : 0.9 + Math.sin(menuT * 21) * 0.05;
    menuBulb.intensity = 10 * flick;
    redGlow.intensity = 3 + Math.sin(menuT * 1.3) * 1.5;
    const z = 0.8 - (menuT * 0.06 % 2.2);
    menuCam.position.set(Math.sin(menuT * 0.4) * 0.08 + 0.35, 1.55 + Math.sin(menuT * 1.8) * 0.015, z);
    menuCam.lookAt(-0.35, 1.2, -9);
    figureT -= dt;
    if (figureT < -9 && Math.random() < 0.004) { figureT = 0.25; menuFigure.visible = true; }
    if (figureT <= 0) menuFigure.visible = false;
    renderer.render(menuScene, menuCam);
  }
  hudT += dt;
  if (hudT > 0.25) { hudT = 0; hud.update(); }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
void sfx;

// ---------- automated walkthrough (npm test) ----------

if (import.meta.env.DEV || new URLSearchParams(location.search).has('test')) {
  const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
  Object.assign(window, {
    game: { profile, get rt() { return rt; }, hud, startLevel, toMenu, levels: LEVELS, generateLevel },
    async walkthrough(n: number): Promise<string> {
      profile.current = null;
      startLevel(n);
      await wait(20);
      const room = rt!;
      for (const a of room.def.solution) {
        if (a.code !== undefined) {
          if (!hud.lockHandle) throw new Error(`No lock open for code ${a.code}`);
          if (!hud.lockHandle.submit(a.code)) throw new Error(`Wrong code ${a.code}`);
          await wait(480);
          continue;
        }
        if (a.close) { hud.closeTop(); continue; }
        room.runAction(a);
      }
      await wait(1600);
      if (!profile.levels[room.def.id]?.done) throw new Error(`Level ${n} was not escaped`);
      if (room.hintStep() < room.def.hints.length) throw new Error(`Hint step ${room.hintStep()} still open after escaping`);
      hud.closeTop();
      return `${room.def.id} (${room.def.solution.length} actions)`;
    },
  });
}
