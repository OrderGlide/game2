// All the 2D interface: menu, in-room HUD, inventory, speech bubble, documents, hints, shop, settings, win screen.
import { sfx } from '../audio';
import { T, fmt, fmtTime, tx } from '../i18n';
import type { RoomRuntime, RoomUI } from '../engine/room';
import type { DocDef, LockDef, RoomDef } from '../engine/types';
import {
  SKIP_COST, HINT_COINS, DAILY, adReady, claimDaily, claimFreeHint, coinsFor, dailyAvailable, dailyIndex, freeHintReady,
  markAd, starsFor, type Profile, type Settings,
} from '../profile';
import { PRODUCTS, type ProductId } from '../platform/config';
import { SKINS, type SkinId } from '../view/cat';
import { btn, el, esc, modal, closeAllModals, modalOpen, topModal } from './dom';
import { openLock, type LockHandle } from './locks';

export interface Services {
  profile: Profile;
  rooms: RoomDef[];
  version: string;
  save(): void;
  startRoom(i: number): void;
  toMenu(): void;
  showRewarded(): Promise<boolean>;
  afterRoom(index: number): void;
  purchase(id: ProductId): Promise<boolean>;
  priceOf(id: ProductId): string;
  grantProduct(id: ProductId): void;
  restore(): Promise<void>;
  applySettings(s: Settings, langChanged: boolean): void;
  resetProgress(): void;
  portrait(skin: SkinId): string;
  setSkin(skin: SkinId): void;
}

export class Hud implements RoomUI {
  root = document.getElementById('ui') as HTMLDivElement;
  rt: RoomRuntime | null = null;
  roomIndex = 0;
  private game = el('div');
  private menuEl = el('div');
  private bubble = el('div', 'bubble off');
  private bubbleTimer = 0;
  private invEl = el('div', 'inv');
  private timerEl = el('span', 'timer');
  private hintBtn!: HTMLButtonElement;
  private arrows: HTMLButtonElement[] = [];
  private backBtn!: HTMLButtonElement;
  private lastInv: string[] = [];
  lockHandle: LockHandle | null = null;

  constructor(public svc: Services) {
    this.buildGame();
    this.root.appendChild(el('div', 'rotate', T.rotate));
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

  enterRoom(rt: RoomRuntime, index: number): void {
    this.rt = rt;
    this.roomIndex = index;
    this.menuEl.remove();
    this.root.appendChild(this.game);
    (this.game.querySelector('.room-title .nm') as HTMLElement).textContent = `${rt.def.icon} ${tx(rt.def.name)}`;
    this.lastInv = [];
    this.inventoryChanged();
    this.viewChanged();
    this.refreshHintBtn();
    if (rt.s.elapsed < 1) setTimeout(() => this.say(tx(rt.def.intro), 6000), 600);
  }

  update(): void {
    const rt = this.rt;
    if (!rt) return;
    this.timerEl.textContent = fmtTime(rt.s.elapsed);
  }

  refreshHintBtn(): void {
    (this.hintBtn.querySelector('.n') as HTMLElement).textContent = String(this.p.hints);
    // nudge players who've been stuck for a while
    const stuck = this.rt && this.rt.s.elapsed > 240 && this.rt.hintStep() === 0;
    this.hintBtn.classList.toggle('pulse', !!stuck || (freeHintReady(this.p) && this.p.hints === 0));
  }

  say(text: string, ms = 3600): void {
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
    m.panel.appendChild(el('div', `doc ${doc.style ?? 'paper'} ${doc.big ? 'big' : ''}`, esc(tx(doc.body))));
  }

  lock(def: LockDef, onOpen: () => void): void {
    this.lockHandle = openLock(this.root, def, () => { this.lockHandle = null; onOpen(); });
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
          const before = rt.s.inv.length;
          rt.select(id);
          if (rt.selected === id) this.say(fmt(T.selectHint, { n: `${def.icon} ${tx(def.name)}` }), 2600);
          else if (rt.s.inv.length === before && !rt.selected) this.say(T.cantCombine);
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

  fishFound(): void {
    this.toast(`🐠 ${T.goldFish} ${T.found}`);
    this.svc.save();
  }

  won(): void {
    const rt = this.rt!;
    const stars = starsFor(rt.s.hintsUsed);
    const fish = rt.s.fish;
    const coins = coinsFor(stars, fish);
    const prev = this.p.rooms[rt.def.id];
    this.p.rooms[rt.def.id] = {
      done: true,
      stars: Math.max(prev?.stars ?? 0, stars),
      time: prev?.done && prev.time ? Math.min(prev.time, rt.s.elapsed) : rt.s.elapsed,
      fish: (prev?.fish ?? false) || fish,
    };
    this.p.coins += coins;
    this.p.current = null;
    this.svc.save();
    this.showWin(stars, coins, fish);
  }

  private showWin(stars: number, coins: number, fish: boolean): void {
    const rt = this.rt!;
    const m = modal(this.root, { cls: 'narrow', sticky: true });
    m.panel.appendChild(el('h2', '', `🎉 ${T.escaped}`));
    const st = el('div', 'win-stars');
    for (let i = 0; i < 3; i++) {
      const s = el('span', i < stars ? '' : 'off', '⭐');
      s.style.animationDelay = `${0.2 + i * 0.25}s`;
      st.appendChild(s);
    }
    m.panel.appendChild(st);
    const stats = el('div', 'win-stats');
    stats.append(
      el('div', 'stat-row', `<span>⏱️ ${T.time}</span><span>${fmtTime(rt.s.elapsed)}</span>`),
      el('div', 'stat-row', `<span>💡 ${T.hintsUsed}</span><span>${rt.s.hintsUsed}</span>`),
      el('div', 'stat-row', `<span>🐠 ${T.goldFish}</span><span>${fish ? T.found : T.notFound}</span>`),
    );
    const coinRow = el('div', 'stat-row', `<span>🪙 ${T.reward}</span><span class="c">+${coins}</span>`);
    stats.appendChild(coinRow);
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
    const last = this.roomIndex >= this.svc.rooms.length - 1;
    row.append(
      dbl,
      btn(last ? `🏠 ${T.menu}` : `${T.nextRoom} ▶`, 'btn green big', () => {
        m.close();
        this.svc.afterRoom(this.roomIndex);
        if (last) { this.svc.toMenu(); this.toast(T.chapterDone); } else this.svc.startRoom(this.roomIndex + 1);
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
      if (!def) {
        m.panel.appendChild(el('p', 'center', T.noHintNeeded));
        return;
      }
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
        const label = `${isSol ? T.hintSolution : T.hintNext} (1 💡)`;
        const b = btn(label, 'btn big', () => {
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
      } else {
        col.appendChild(el('p', 'center muted', T.hintDone));
      }
      col.appendChild(el('div', 'center', `<span class="pill">💡 ${this.p.hints}</span>`));
      // ways to get more hints
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
    m.panel.appendChild(el('h2', '', `⏸️ ${T.paused}`));
    const col = el('div', 'col');
    col.append(
      btn(`▶ ${T.resume}`, 'btn green big', () => m.close()),
      btn(`⏭️ ${fmt(T.skipRoom, { n: SKIP_COST })}`, 'btn', () => {
        if (this.p.hints < SKIP_COST) { m.close(); this.openShop(); return; }
        this.confirm(T.skipConfirm, () => {
          this.p.hints -= SKIP_COST;
          const prev = this.p.rooms[rt.def.id];
          this.p.rooms[rt.def.id] = { done: true, stars: prev?.stars ?? 0, time: prev?.time ?? 0, fish: prev?.fish ?? rt.s.fish };
          this.p.current = null;
          this.svc.save();
          closeAllModals();
          const last = this.roomIndex >= this.svc.rooms.length - 1;
          if (last) this.svc.toMenu(); else this.svc.startRoom(this.roomIndex + 1);
        });
      }),
      btn(`🔄 ${T.restartRoom}`, 'btn plain', () => this.confirm(T.restartConfirm, () => {
        this.p.current = null;
        this.svc.save();
        closeAllModals();
        this.svc.startRoom(this.roomIndex);
      })),
      btn(`⚙️ ${T.settings}`, 'btn plain', () => this.openSettings()),
      btn(`🏠 ${T.toMenu}`, 'btn plain', () => { closeAllModals(); this.svc.toMenu(); }),
    );
    m.panel.appendChild(col);
  }

  confirm(text: string, yes: () => void): void {
    const m = modal(this.root, { cls: 'narrow' });
    m.panel.append(el('p', 'center', `<b>${esc(text)}</b>`));
    const row = el('div', 'row');
    row.append(btn('✔', 'btn green', () => { m.close(); yes(); }), btn('✕', 'btn plain', () => m.close()));
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
    const left = el('div', 'menu-left');
    left.appendChild(el('div', 'logo', `${T.title}<small>${T.subtitle}</small>`));
    const stats = el('div', 'menu-stats');
    const totalStars = Object.values(p.rooms).reduce((a, r) => a + r.stars, 0);
    const fish = Object.values(p.rooms).filter((r) => r.fish).length;
    stats.append(el('span', 'pill', `🪙 ${p.coins}`), el('span', 'pill', `💡 ${p.hints}`), el('span', 'pill', `⭐ ${totalStars}`), el('span', 'pill', `🐠 ${fish}/${this.svc.rooms.length}`));
    const buttons = el('div', 'menu-buttons');
    const next = this.nextRoomIndex();
    const cur = p.current ? this.svc.rooms.findIndex((r) => r.id === p.current!.id) : -1;
    const playIdx = cur >= 0 ? cur : next;
    buttons.append(
      btn(`▶ ${cur >= 0 ? T.continue : T.play}`, 'btn green big', () => this.svc.startRoom(playIdx)),
    );
    const small = el('div', 'menu-buttons');
    const daily = btn('🎁', 'round', () => this.openDaily());
    if (dailyAvailable(p)) daily.appendChild(el('span', 'badge', '1'));
    small.append(btn('🛒', 'round', () => this.openShop()), btn('🐱', 'round', () => this.openWardrobe()), daily, btn('⚙️', 'round', () => this.openSettings()));
    left.append(buttons, stats, small);

    const right = el('div', 'menu-right');
    right.appendChild(el('h3', '', T.chapter1));
    const grid = el('div', 'rooms');
    this.svc.rooms.forEach((r, i) => {
      const res = p.rooms[r.id];
      const unlocked = i === 0 || !!p.rooms[this.svc.rooms[i - 1].id]?.done;
      const card = btn('', `room-card ${unlocked ? '' : 'locked'} ${i === playIdx ? 'current' : ''}`, () => {
        if (!unlocked) { this.toast(T.finishPrev); return; }
        this.svc.startRoom(i);
      });
      card.append(el('span', 'num', String(i + 1)), el('span', 'ic', unlocked ? r.icon : '🔒'), el('span', 'nm', unlocked ? esc(tx(r.name)) : T.locked));
      const stars = res?.done ? '⭐'.repeat(res.stars) + '☆'.repeat(3 - res.stars) : '';
      card.appendChild(el('span', 'st', stars || '&nbsp;'));
      if (res?.fish) card.appendChild(el('span', 'fish', '🐠'));
      grid.appendChild(card);
    });
    const soon = el('div', 'room-card locked');
    soon.append(el('span', 'ic', '🚧'), el('span', 'nm', T.comingSoon));
    grid.appendChild(soon);
    right.appendChild(grid);
    this.menuEl.append(left, right);
    this.root.appendChild(this.menuEl);
    if (dailyAvailable(p) && Object.keys(p.rooms).length > 0) setTimeout(() => { if (!modalOpen()) this.openDaily(); }, 500);
  }

  nextRoomIndex(): number {
    const i = this.svc.rooms.findIndex((r) => !this.p.rooms[r.id]?.done);
    return i < 0 ? 0 : i;
  }

  refreshMenu(): void { if (!this.rt) this.showMenu(); }

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
    const b = btn(T.dailyClaim, 'btn green big', () => {
      if (claimDaily(p)) { sfx('fish'); this.svc.save(); }
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
      // hint for coins
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
            sfx('win');
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

  // ================= wardrobe =================

  openWardrobe(): void {
    const p = this.p;
    const m = modal(this.root, { onClose: () => this.refreshMenu() });
    const fishAll = this.svc.rooms.every((r) => p.rooms[r.id]?.fish);
    const draw = () => {
      m.panel.innerHTML = '';
      m.panel.appendChild(btn('✕', 'x', () => m.close()));
      m.panel.appendChild(el('h2', '', `🐱 ${T.wardrobe}`));
      m.panel.appendChild(el('div', 'row', `<span class="pill">🪙 ${p.coins}</span>`));
      const grid = el('div', 'shop-grid');
      grid.style.marginTop = '12px';
      for (const s of SKINS) {
        const owned = p.skins.includes(s.id) || (s.special === 'fish' && fishAll);
        const card = el('div', 'card');
        const img = el('img', 'skin-img');
        img.src = this.svc.portrait(s.id);
        card.appendChild(img);
        let b: HTMLButtonElement;
        if (p.skin === s.id) b = btn(`✔ ${T.equipped}`, 'btn plain', () => {});
        else if (owned) b = btn(T.equip, 'btn green', () => { if (!p.skins.includes(s.id)) p.skins.push(s.id); this.svc.setSkin(s.id); draw(); });
        else if (s.coins) {
          b = btn(`🪙 ${s.coins}`, 'btn', () => {
            if (p.coins < s.coins!) { this.toast(T.noCoins); return; }
            p.coins -= s.coins!;
            p.skins.push(s.id);
            sfx('pick');
            this.svc.setSkin(s.id);
            draw();
          });
          b.disabled = p.coins < s.coins;
        } else {
          b = btn(s.special === 'fish' ? `🐠 ${T.skinLockedFish}` : `🎁 ${T.skinLockedPack}`, 'btn plain', () => { if (s.special === 'pack') { m.close(); this.openShop(); } });
          b.style.fontSize = '12px';
        }
        card.appendChild(b);
        grid.appendChild(card);
      }
      m.panel.appendChild(grid);
    };
    draw();
  }

  // ================= settings =================

  openSettings(): void {
    const p = this.p;
    const s = p.settings;
    const m = modal(this.root, { cls: 'narrow' });
    m.panel.appendChild(el('h2', '', `⚙️ ${T.settings}`));
    const col = el('div', 'col');
    const toggle = (label: string, key: 'sfx' | 'music' | 'vibration') => {
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
