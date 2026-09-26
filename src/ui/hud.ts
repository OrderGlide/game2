// All the 2D interface: menu with 100 levels, in-room HUD, inventory, messages, notes, hints, shop, settings, win screen.
import { sfx } from '../audio';
import { T, fmt, fmtTime, tx } from '../i18n';
import type { RoomRuntime, RoomUI } from '../engine/room';
import type { DocDef, LockDef, ScareKind } from '../engine/types';
import {
  SKIP_COST, HINT_COINS, DAILY, adReady, claimDaily, claimFreeHint, coinsFor, dailyAvailable, dailyIndex, freeHintReady,
  markAd, starsFor, unlockedUpTo, type Profile, type Settings,
} from '../profile';
import { PRODUCTS, type ProductId } from '../platform/config';
import { THEMES } from '../gen/themes';
import { LEVELS, levelId } from '../gen/level';
import { btn, el, esc, modal, closeAllModals, modalOpen, topModal } from './dom';
import { openLock, type LockHandle } from './locks';

export interface Services {
  profile: Profile;
  version: string;
  save(): void;
  startLevel(n: number): void;
  toMenu(): void;
  showRewarded(): Promise<boolean>;
  afterLevel(n: number): void;
  purchase(id: ProductId): Promise<boolean>;
  priceOf(id: ProductId): string;
  grantProduct(id: ProductId): void;
  restore(): Promise<void>;
  applySettings(s: Settings, langChanged: boolean): void;
  resetProgress(): void;
}

export class Hud implements RoomUI {
  root = document.getElementById('ui') as HTMLDivElement;
  rt: RoomRuntime | null = null;
  level = 1;
  private game = el('div');
  private menuEl = el('div');
  private bubble = el('div', 'bubble off');
  private bubbleTimer = 0;
  private invEl = el('div', 'inv');
  private timerEl = el('span', 'timer');
  private hintBtn!: HTMLButtonElement;
  private arrows: HTMLButtonElement[] = [];
  private backBtn!: HTMLButtonElement;
  private flash = el('div', 'scare-flash');
  private lastInv: string[] = [];
  private chapter = -1;
  lockHandle: LockHandle | null = null;

  constructor(public svc: Services) {
    this.buildGame();
    this.root.append(el('div', 'vignette'), this.flash, el('div', 'rotate', T.rotate));
  }

  get p(): Profile { return this.svc.profile; }

  // ================= in-room HUD =================

  private buildGame(): void {
    const top = el('div', 'hud-top');
    const title = el('div', 'room-title');
    title.append(el('span', 'nm'), this.timerEl);
    this.hintBtn = btn('💡 <span class="n">0</span>', 'round hint-btn', () => this.openHints());
    top.append(btn('☰', 'round', () => this.openPause()), title, el('div', 'spacer'), this.hintBtn);
    const left = btn('‹', 'arrow left', () => this.rt?.turn(-1));
    const right = btn('›', 'arrow right', () => this.rt?.turn(1));
    this.arrows = [left, right];
    this.backBtn = btn(`↩ ${T.back}`, 'btn plain back-btn', () => this.rt?.back());
    this.game.append(top, left, right, this.backBtn, this.invEl, this.bubble);
  }

  enterRoom(rt: RoomRuntime, level: number): void {
    this.rt = rt;
    this.level = level;
    this.menuEl.remove();
    this.root.insertBefore(this.game, this.root.firstChild);
    (this.game.querySelector('.room-title .nm') as HTMLElement).textContent = `${fmt(T.levelN, { n: level })} · ${tx(rt.def.theme.name)}`;
    this.lastInv = [];
    this.inventoryChanged();
    this.viewChanged();
    this.refreshHintBtn();
    if (rt.s.elapsed < 1) setTimeout(() => this.say(tx(rt.def.intro), 6500), 700);
  }

  update(): void {
    if (this.rt) this.timerEl.textContent = fmtTime(this.rt.s.elapsed);
  }

  refreshHintBtn(): void {
    (this.hintBtn.querySelector('.n') as HTMLElement).textContent = String(this.p.hints);
    const stuck = this.rt && this.rt.s.elapsed > 300 && this.rt.hintStep() === 0;
    this.hintBtn.classList.toggle('pulse', !!stuck || (freeHintReady(this.p) && this.p.hints === 0));
  }

  say(text: string, ms = 3800): void {
    this.bubble.textContent = text;
    this.bubble.classList.remove('off');
    clearTimeout(this.bubbleTimer);
    this.bubbleTimer = window.setTimeout(() => this.bubble.classList.add('off'), ms);
  }

  toast(text: string): void {
    const t = el('div', 'toast', esc(text));
    this.root.appendChild(t);
    setTimeout(() => t.remove(), 2200);
  }

  read(doc: DocDef): void {
    const m = modal(this.root, { cls: 'narrow' });
    if (doc.title) m.panel.appendChild(el('div', 'doc-title', esc(tx(doc.title))));
    m.panel.appendChild(el('div', `doc ${doc.style ?? 'paper'} ${doc.big ? 'big' : ''} ${doc.mirror ? 'mirror' : ''}`, esc(tx(doc.body))));
  }

  lock(def: LockDef, onOpen: () => void): void {
    this.lockHandle = openLock(this.root, def, () => { this.lockHandle = null; onOpen(); });
  }

  scare(kind: ScareKind): void {
    if (kind === 'whisper') return;
    const cls = kind === 'figure' ? 'hit' : kind === 'bang' ? 'bang' : 'dark';
    this.flash.className = 'scare-flash';
    void this.flash.offsetWidth;
    this.flash.classList.add(cls);
    if (kind !== 'flicker') {
      this.game.classList.remove('shake');
      void this.game.offsetWidth;
      this.game.classList.add('shake');
    }
  }

  inventoryChanged(): void {
    const rt = this.rt;
    if (!rt) return;
    this.invEl.innerHTML = '';
    this.invEl.appendChild(el('div', 'inv-label', '🎒'));
    const slots = Math.max(6, rt.s.inv.length);
    for (let i = 0; i < slots; i++) {
      const id = rt.s.inv[i];
      if (!id) { this.invEl.appendChild(el('div', 'slot')); continue; }
      const def = rt.def.items[id];
      const s = btn(def.icon, `slot full ${rt.selected === id ? 'sel' : ''} ${this.lastInv.includes(id) ? '' : 'pop'}`, () => {
        if (rt.selected === id) this.inspect(id);
        else {
          const hadSel = !!rt.selected;
          rt.select(id);
          if (rt.selected === id) this.say(fmt(T.selectHint, { n: `${def.icon} ${tx(def.name)}` }), 2600);
          else if (hadSel && !rt.selected && rt.s.inv.includes(id)) this.say(T.cantCombine);
        }
      });
      this.invEl.appendChild(s);
    }
    this.lastInv = [...rt.s.inv];
    this.refreshHintBtn();
  }

  private inspect(id: string): void {
    const rt = this.rt!;
    const def = rt.def.items[id];
    rt.select(null);
    if (def.doc) { sfx('paper'); this.read(def.doc); return; }
    const m = modal(this.root, { cls: 'narrow' });
    m.panel.append(el('div', 'inspect-icon', def.icon), el('h2', '', esc(tx(def.name))), el('p', 'center', esc(tx(def.desc))));
  }

  viewChanged(): void {
    const zoomed = this.rt?.isZoomed() ?? false;
    this.arrows.forEach((a) => a.classList.toggle('hidden', zoomed));
    this.backBtn.classList.toggle('hidden', !zoomed);
  }

  won(): void {
    const rt = this.rt!;
    const stars = starsFor(rt.s.hintsUsed);
    const coins = coinsFor(stars, this.level);
    const id = levelId(this.level);
    const prev = this.p.levels[id];
    this.p.levels[id] = {
      done: true,
      stars: Math.max(prev?.stars ?? 0, stars),
      time: prev?.done && prev.time ? Math.min(prev.time, rt.s.elapsed) : rt.s.elapsed,
    };
    this.p.coins += coins;
    this.p.current = null;
    this.svc.save();
    this.showWin(stars, coins);
  }

  private showWin(stars: number, coins: number): void {
    const rt = this.rt!;
    const m = modal(this.root, { cls: 'narrow win', sticky: true });
    m.panel.append(el('h2', 'horror-title', T.escaped), el('div', 'center muted', `${fmt(T.levelN, { n: this.level })} · ${T.escapedSub}`));
    const st = el('div', 'win-stars');
    for (let i = 0; i < 3; i++) {
      const s = el('span', i < stars ? '' : 'off', '★');
      s.style.animationDelay = `${0.2 + i * 0.25}s`;
      st.appendChild(s);
    }
    m.panel.appendChild(st);
    const stats = el('div', 'win-stats');
    const coinRow = el('div', 'stat-row', `<span>🪙 ${T.reward}</span><span class="c">+${coins}</span>`);
    stats.append(
      el('div', 'stat-row', `<span>⏱️ ${T.time}</span><span>${fmtTime(rt.s.elapsed)}</span>`),
      el('div', 'stat-row', `<span>💡 ${T.hintsUsed}</span><span>${rt.s.hintsUsed}</span>`),
      coinRow,
    );
    m.panel.appendChild(stats);
    const row = el('div', 'row');
    row.style.marginTop = '12px';
    const dbl = btn(T.double, 'btn blue', async () => {
      dbl.disabled = true;
      if (await this.svc.showRewarded()) {
        this.p.coins += coins;
        this.svc.save();
        (coinRow.querySelector('.c') as HTMLElement).textContent = `+${coins * 2}`;
        dbl.textContent = T.doubled;
      } else { dbl.disabled = false; this.toast(T.adFail); }
    });
    const last = this.level >= LEVELS;
    row.append(
      dbl,
      btn(last ? `☰ ${T.menu}` : `${T.nextRoom} ▶`, 'btn big', () => {
        m.close();
        this.svc.afterLevel(this.level);
        if (last) { this.svc.toMenu(); this.toast(T.allDone); } else this.svc.startLevel(this.level + 1);
      }),
    );
    m.panel.appendChild(row);
  }

  // ================= hints =================

  openHints(): void {
    const rt = this.rt;
    if (!rt) return;
    const m = modal(this.root, { cls: 'narrow' });
    const draw = () => {
      m.panel.innerHTML = '';
      m.panel.appendChild(btn('✕', 'x', () => m.close()));
      m.panel.appendChild(el('h2', '', `💡 ${T.hintTitle}`));
      const step = rt.hintStep();
      const def = rt.def.hints[step];
      if (!def) { m.panel.appendChild(el('p', 'center', T.noHintNeeded)); return; }
      const shown = rt.s.shown[step] ?? 0;
      const list = el('div', 'hint-list');
      for (let i = 0; i < shown; i++) {
        const sol = i === def.hints.length - 1;
        list.appendChild(el('div', `hint-item ${sol ? 'solution' : ''}`, `<b>${i + 1}.</b> ${esc(tx(def.hints[i]))}`));
      }
      if (shown) m.panel.appendChild(list);
      const col = el('div', 'col');
      if (shown < def.hints.length) {
        const isSol = shown === def.hints.length - 1;
        const b = btn(`${isSol ? T.hintSolution : T.hintNext} (1 💡)`, 'btn big', () => {
          if (this.p.hints <= 0) return;
          this.p.hints--;
          rt.s.shown[step] = shown + 1;
          rt.s.hintsUsed++;
          sfx('ding');
          this.svc.save();
          this.refreshHintBtn();
          draw();
        });
        b.disabled = this.p.hints <= 0;
        col.appendChild(b);
      } else col.appendChild(el('p', 'center muted', T.hintDone));
      col.appendChild(el('div', 'center', `<span class="pill">💡 ${this.p.hints}</span>`));
      if (freeHintReady(this.p)) {
        col.appendChild(btn(`🎁 ${T.hintFreeReady}`, 'btn green', () => { claimFreeHint(this.p); sfx('pick'); this.svc.save(); this.refreshHintBtn(); draw(); }));
      } else {
        const free = el('div', 'center muted', fmt(T.hintFreeIn, { t: fmtTime((this.p.freeHintAt - Date.now()) / 1000) }));
        col.appendChild(free);
        const id = setInterval(() => {
          if (!free.isConnected) { clearInterval(id); return; }
          if (freeHintReady(this.p)) { clearInterval(id); draw(); return; }
          free.textContent = fmt(T.hintFreeIn, { t: fmtTime((this.p.freeHintAt - Date.now()) / 1000) });
        }, 1000);
      }
      const row = el('div', 'row');
      if (adReady(this.p, 'hint')) {
        const ad = btn(T.hintAd, 'btn blue', async () => {
          ad.disabled = true;
          if (await this.svc.showRewarded()) {
            markAd(this.p, 'hint');
            this.p.hints++;
            this.svc.save();
            this.refreshHintBtn();
            draw();
          } else { ad.disabled = false; this.toast(T.adFail); }
        });
        row.appendChild(ad);
      }
      row.appendChild(btn(`🛒 ${T.hintBuy}`, 'btn pink', () => { m.close(); this.openShop(); }));
      col.appendChild(row);
      m.panel.appendChild(col);
    };
    draw();
  }

  // ================= pause =================

  private openPause(): void {
    const rt = this.rt;
    if (!rt) return;
    const m = modal(this.root, { cls: 'narrow' });
    m.panel.appendChild(el('h2', '', T.paused));
    const col = el('div', 'col');
    col.append(
      btn(`▶ ${T.resume}`, 'btn big', () => m.close()),
      btn(`⏭️ ${fmt(T.skipRoom, { n: SKIP_COST })}`, 'btn plain', () => {
        if (this.p.hints < SKIP_COST) { m.close(); this.openShop(); return; }
        this.confirm(T.skipConfirm, () => {
          this.p.hints -= SKIP_COST;
          const id = levelId(this.level);
          const prev = this.p.levels[id];
          this.p.levels[id] = { done: true, stars: prev?.stars ?? 0, time: prev?.time ?? 0 };
          this.p.current = null;
          this.svc.save();
          closeAllModals();
          if (this.level >= LEVELS) this.svc.toMenu(); else this.svc.startLevel(this.level + 1);
        });
      }),
      btn(`🔄 ${T.restartRoom}`, 'btn plain', () => this.confirm(T.restartConfirm, () => {
        this.p.current = null;
        this.svc.save();
        closeAllModals();
        this.svc.startLevel(this.level);
      })),
      btn(`⚙️ ${T.settings}`, 'btn plain', () => this.openSettings()),
      btn(`☰ ${T.toMenu}`, 'btn plain', () => { closeAllModals(); this.svc.toMenu(); }),
    );
    m.panel.appendChild(col);
  }

  confirm(text: string, yes: () => void): void {
    const m = modal(this.root, { cls: 'narrow' });
    m.panel.append(el('p', 'center', `<b>${esc(text)}</b>`));
    const row = el('div', 'row');
    row.append(btn('✔', 'btn', () => { m.close(); yes(); }), btn('✕', 'btn plain', () => m.close()));
    m.panel.appendChild(row);
  }

  // ================= menu =================

  showMenu(): void {
    this.rt = null;
    this.game.remove();
    closeAllModals();
    this.menuEl.remove();
    this.menuEl = el('div', 'menu');
    const p = this.p;
    const unlocked = unlockedUpTo(p, LEVELS);
    const cur = p.current ? Number(p.current.id.slice(1)) : 0;
    const playLevel = cur || unlocked;
    if (this.chapter < 0) this.chapter = Math.floor((playLevel - 1) / 10);
    const left = el('div', 'menu-left');
    left.appendChild(el('div', 'logo', `${T.title}<small>${T.subtitle}</small>`));
    const done = Object.values(p.levels).filter((l) => l.done).length;
    const stars = Object.values(p.levels).reduce((a, l) => a + l.stars, 0);
    const buttons = el('div', 'menu-buttons');
    buttons.append(btn(`▶ ${cur ? T.continue : T.play} · ${playLevel}`, 'btn big', () => this.svc.startLevel(playLevel)));
    const stats = el('div', 'menu-stats');
    stats.append(el('span', 'pill', fmt(T.progress, { n: done, m: LEVELS })), el('span', 'pill', `★ ${stars}`), el('span', 'pill', `💡 ${p.hints}`), el('span', 'pill', `🪙 ${p.coins}`));
    const small = el('div', 'menu-buttons');
    const daily = btn('🎁', 'round', () => this.openDaily());
    if (dailyAvailable(p)) daily.appendChild(el('span', 'badge', '1'));
    small.append(btn('🛒', 'round', () => this.openShop()), daily, btn('⚙️', 'round', () => this.openSettings()));
    left.append(buttons, stats, small);

    const right = el('div', 'menu-right');
    const tabs = el('div', 'chapters');
    THEMES.forEach((th, i) => {
      const open = unlocked > i * 10;
      const b = btn(`${i + 1}`, `chap ${i === this.chapter ? 'on' : ''} ${open ? '' : 'locked'}`, () => { this.chapter = i; this.showMenu(); });
      b.title = tx(th.name);
      tabs.appendChild(b);
    });
    const th = THEMES[this.chapter];
    right.append(tabs, el('h3', '', `${fmt(T.chapter, { n: this.chapter + 1 })}: ${tx(th.name)}`));
    const grid = el('div', 'levels');
    for (let k = 1; k <= 10; k++) {
      const n = this.chapter * 10 + k;
      const res = p.levels[levelId(n)];
      const open = n <= unlocked || !!res?.done;
      const card = btn('', `lvl ${open ? '' : 'locked'} ${n === playLevel ? 'current' : ''} ${res?.done ? 'done' : ''}`, () => {
        if (!open) { this.toast(T.finishPrev); return; }
        this.svc.startLevel(n);
      });
      card.append(el('span', 'num', open ? String(n) : '🔒'), el('span', 'st', res?.done ? '★'.repeat(res.stars) + '☆'.repeat(3 - res.stars) : '&nbsp;'));
      grid.appendChild(card);
    }
    right.appendChild(grid);
    this.menuEl.append(left, right);
    this.root.insertBefore(this.menuEl, this.root.firstChild);
    if (dailyAvailable(p) && done > 0) setTimeout(() => { if (!modalOpen() && !this.rt) this.openDaily(); }, 600);
  }

  refreshMenu(): void { if (!this.rt) this.showMenu(); }

  /** First launch: tell players what kind of game this is. */
  contentWarning(then: () => void): void {
    const m = modal(this.root, { cls: 'narrow', sticky: true });
    m.panel.append(el('h2', 'horror-title', '⚠'), el('p', 'center', esc(T.warning)));
    const row = el('div', 'row');
    row.appendChild(btn(T.warningOk, 'btn big', () => { m.close(); then(); }));
    m.panel.appendChild(row);
  }

  // ================= daily =================

  openDaily(): void {
    const p = this.p;
    const m = modal(this.root, { cls: 'narrow', onClose: () => this.refreshMenu() });
    m.panel.appendChild(el('h2', '', `🎁 ${T.daily}`));
    const today = dailyIndex(p);
    const avail = dailyAvailable(p);
    const grid = el('div', 'daily');
    DAILY.forEach((d, i) => {
      const cls = i === today && avail ? 'today' : i < today || (i === today && !avail) ? 'done' : '';
      const reward = [d.coins ? `🪙${d.coins}` : '', d.hints ? `💡${d.hints}` : ''].filter(Boolean).join(' ');
      grid.appendChild(el('div', cls, `${fmt(T.dailyDay, { n: i + 1 })}<b>${d.hints ? '💡' : '🪙'}</b>${reward}`));
    });
    m.panel.appendChild(grid);
    const b = btn(T.dailyClaim, 'btn big', () => {
      if (claimDaily(p)) { sfx('pick'); this.svc.save(); }
      m.close();
    });
    b.disabled = !avail;
    const row = el('div', 'row');
    row.appendChild(b);
    m.panel.appendChild(row);
  }

  // ================= shop =================

  openShop(): void {
    const p = this.p;
    const m = modal(this.root, { onClose: () => { this.refreshMenu(); this.refreshHintBtn(); } });
    const draw = () => {
      m.panel.innerHTML = '';
      m.panel.appendChild(btn('✕', 'x', () => m.close()));
      m.panel.appendChild(el('h2', '', `🛒 ${T.shop}`));
      m.panel.appendChild(el('div', 'row', `<span class="pill">🪙 ${p.coins}</span><span class="pill">💡 ${p.hints}</span>`));
      const grid = el('div', 'shop-grid');
      grid.style.marginTop = '12px';
      const coinCard = el('div', 'card');
      coinCard.append(el('div', 'ic', '💡'), el('div', 't', T.buyHintCoins), el('div', 'd', `🪙 ${HINT_COINS}`));
      const cb = btn(`🪙 ${HINT_COINS}`, 'btn', () => {
        if (p.coins < HINT_COINS) { this.toast(T.noCoins); return; }
        p.coins -= HINT_COINS;
        p.hints++;
        sfx('pick');
        this.svc.save();
        draw();
      });
      cb.disabled = p.coins < HINT_COINS;
      coinCard.appendChild(cb);
      grid.appendChild(coinCard);
      for (const prod of PRODUCTS) {
        const owned = !prod.consumable && p.owned.includes(prod.id);
        if (prod.id === 'no_ads' && p.noAds && !owned) continue;
        const [name, desc] = T.products[prod.id];
        const card = el('div', `card ${prod.best ? 'best' : ''}`);
        if (prod.best) card.appendChild(el('div', 'ribbon', '★ TOP'));
        card.append(el('div', 'ic', prod.icon), el('div', 't', esc(name)), el('div', 'd', esc(desc)));
        const b = btn(owned ? `✔ ${T.owned}` : this.svc.priceOf(prod.id), owned ? 'btn plain' : 'btn pink', async () => {
          if (owned) return;
          b.disabled = true;
          if (await this.svc.purchase(prod.id)) {
            this.svc.grantProduct(prod.id);
            this.toast(T.purchaseOk);
            sfx('unlock');
            draw();
          } else { b.disabled = false; this.toast(T.purchaseFail); }
        });
        b.disabled = owned;
        card.appendChild(b);
        grid.appendChild(card);
      }
      m.panel.appendChild(grid);
      const row = el('div', 'row');
      row.style.marginTop = '12px';
      row.appendChild(btn(T.restore, 'btn plain', async () => { await this.svc.restore(); this.toast(T.restored); draw(); }));
      m.panel.appendChild(row);
    };
    draw();
  }

  // ================= settings =================

  openSettings(): void {
    const s = this.p.settings;
    const m = modal(this.root, { cls: 'narrow' });
    m.panel.appendChild(el('h2', '', `⚙️ ${T.settings}`));
    const col = el('div', 'col');
    const toggle = (label: string, key: 'sfx' | 'music' | 'vibration' | 'scares') => {
      const row = el('div', 'setting', `<span>${label}</span>`);
      const t = btn('', `toggle ${s[key] ? 'on' : ''}`, () => {
        s[key] = !s[key];
        t.classList.toggle('on', s[key]);
        this.svc.applySettings(s, false);
      });
      row.appendChild(t);
      col.appendChild(row);
    };
    toggle(`🔊 ${T.sfx}`, 'sfx');
    toggle(`🎵 ${T.music}`, 'music');
    toggle(`📳 ${T.vibration}`, 'vibration');
    toggle(`👻 ${T.scares}`, 'scares');
    const seg = <K extends 'quality' | 'lang'>(label: string, key: K, opts: [Settings[K], string][]) => {
      const row = el('div', 'setting', `<span>${label}</span>`);
      const g = el('div', 'seg');
      for (const [v, l] of opts) {
        g.appendChild(btn(l, s[key] === v ? 'on' : '', () => {
          const langChanged = key === 'lang' && s[key] !== v;
          s[key] = v;
          g.querySelectorAll('button').forEach((b, i) => b.classList.toggle('on', opts[i][0] === v));
          this.svc.applySettings(s, langChanged);
        }));
      }
      row.appendChild(g);
      col.appendChild(row);
    };
    seg(`🖼️ ${T.quality}`, 'quality', [['auto', T.qualityAuto], ['low', T.qualityLow], ['high', T.qualityHigh]]);
    seg(`🌍 ${T.language}`, 'lang', [['auto', T.langAuto], ['pl', 'PL'], ['en', 'EN']]);
    col.appendChild(btn(`🗑️ ${T.reset}`, 'btn plain', () => this.confirm(T.resetConfirm, () => this.svc.resetProgress())));
    col.appendChild(el('div', 'center muted', `v${this.svc.version}`));
    m.panel.appendChild(col);
  }

  /** Close the topmost overlay (automated walkthrough). */
  closeTop(): void { topModal()?.close(); }
}
