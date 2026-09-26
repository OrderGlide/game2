// Lock and mini-game panels: combination wheels, keypad, colour sequence, sliding picture and lights-out.
import { sfx, vibrate } from '../audio';
import { T, tx } from '../i18n';
import type { LockDef } from '../engine/types';
import { btn, el, modal } from './dom';

export interface LockHandle { submit(answer: string): boolean; close(): void }

export function openLock(root: HTMLElement, def: LockDef, onOpen: () => void): LockHandle {
  const m = modal(root, { cls: 'narrow' });
  const title = def.title ? tx(def.title) : '';
  if (title) m.panel.appendChild(el('div', 'lock-title', title));
  const body = el('div');
  m.panel.appendChild(body);
  let done = false;

  const success = () => {
    if (done) return;
    done = true;
    body.classList.add('lock-ok');
    setTimeout(() => { m.close(); onOpen(); }, 450);
  };
  const fail = () => {
    sfx('wrong');
    vibrate(80);
    body.classList.remove('shake');
    void body.offsetWidth;
    body.classList.add('shake');
  };

  let check: (answer: string) => boolean = () => false;

  switch (def.kind) {
    case 'wheels': {
      const chars = Array.from(def.chars);
      const answer = Array.from(def.answer);
      const vals = answer.map(() => 0);
      const wrap = el('div', 'wheels');
      body.appendChild(wrap);
      const test = () => { if (vals.every((v, i) => chars[v] === answer[i])) success(); };
      answer.forEach((_, i) => {
        const w = el('div', 'wheel');
        const val = el('div', 'val', chars[0]);
        const spin = (d: number) => {
          if (done) return;
          vals[i] = (vals[i] + d + chars.length) % chars.length;
          val.textContent = chars[vals[i]];
          val.classList.remove('spin');
          void val.offsetWidth;
          val.classList.add('spin');
          sfx('click');
          test();
        };
        w.append(btn('▲', '', () => spin(-1)), val, btn('▼', '', () => spin(1)));
        wrap.appendChild(w);
      });
      check = (a) => a === def.answer;
      break;
    }
    case 'keypad': {
      let entered = '';
      const screen = el('div', 'kp-screen', '');
      const pad = el('div', 'keypad');
      body.append(screen, pad);
      const show = () => { screen.textContent = entered.padEnd(def.answer.length, '·'); };
      show();
      const press = (k: string) => {
        if (done) return;
        if (k === 'C') entered = '';
        else if (k === 'OK') {
          if (entered === def.answer) { screen.textContent = '✓'; success(); return; }
          fail();
          entered = '';
        } else if (entered.length < def.answer.length) entered += k;
        show();
        if (entered.length === def.answer.length && entered === def.answer) { screen.textContent = '✓'; success(); }
      };
      for (const k of ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', 'OK']) {
        pad.appendChild(btn(k === 'C' ? T.clear : k === 'OK' ? T.enter : k, '', () => press(k)));
      }
      check = (a) => a === def.answer;
      break;
    }
    case 'sequence': {
      let seq: string[] = [];
      const grid = el('div', 'seq');
      const dots = el('div', 'seq-dots');
      body.append(grid, dots);
      const drawDots = () => {
        dots.innerHTML = '';
        def.answer.forEach((_, i) => dots.appendChild(el('span', i < seq.length ? 'on' : '')));
      };
      drawDots();
      for (const b of def.buttons) {
        const e = btn(b.label, '', () => {
          if (done) return;
          seq.push(b.id);
          sfx('ding');
          drawDots();
          if (seq.length === def.answer.length) {
            if (seq.every((s, i) => s === def.answer[i])) success();
            else { fail(); seq = []; setTimeout(drawDots, 300); }
          }
        });
        e.style.background = b.color;
        grid.appendChild(e);
      }
      check = (a) => a === def.answer.join(',');
      break;
    }
    case 'slide': {
      const n = 3;
      // start from the solved picture and make random legal moves, so it is always solvable
      const cells = [...def.tiles.slice(0, n * n - 1), ''];
      let blank = n * n - 1;
      const neighbours = (i: number) => [i - n, i + n, i % n ? i - 1 : -1, i % n < n - 1 ? i + 1 : -1].filter((j) => j >= 0 && j < n * n);
      let prev = -1;
      for (let k = 0; k < 60; k++) {
        const opts = neighbours(blank).filter((j) => j !== prev);
        const j = opts[Math.floor(Math.random() * opts.length)];
        [cells[blank], cells[j]] = [cells[j], cells[blank]];
        prev = blank;
        blank = j;
      }
      const grid = el('div', 'slide15');
      grid.style.gridTemplateColumns = `repeat(${n}, auto)`;
      body.appendChild(grid);
      const solved = () => cells.every((c, i) => c === (i < n * n - 1 ? def.tiles[i] : ''));
      const draw = () => {
        grid.innerHTML = '';
        cells.forEach((c, i) => {
          const b = el('button', c ? '' : 'empty', c);
          b.addEventListener('click', () => {
            if (done || !c || !neighbours(i).includes(blank)) return;
            [cells[blank], cells[i]] = [cells[i], cells[blank]];
            blank = i;
            sfx('slide');
            draw();
            if (solved()) success();
          });
          grid.appendChild(b);
        });
      };
      draw();
      // the target picture, small, next to the puzzle
      const target = el('div', 'slide-target');
      for (let i = 0; i < n * n; i++) target.appendChild(el('span', '', def.tiles[i] ?? ''));
      body.classList.add('slide-wrap');
      body.appendChild(target);
      check = (a) => a === 'solve';
      break;
    }
    case 'lights': {
      const n = def.size;
      const on = new Array(n * n).fill(true);
      const press = (i: number) => {
        const x = i % n;
        const y = Math.floor(i / n);
        for (const [dx, dy] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx >= 0 && ny >= 0 && nx < n && ny < n) on[ny * n + nx] = !on[ny * n + nx];
        }
      };
      for (const i of def.start) press(i);
      const grid = el('div', 'lights');
      grid.style.gridTemplateColumns = `repeat(${n}, auto)`;
      body.appendChild(grid);
      const draw = () => {
        grid.innerHTML = '';
        on.forEach((v, i) => {
          const b = el('button', v ? 'on' : '', '⚡');
          b.addEventListener('click', () => {
            if (done) return;
            press(i);
            sfx('switch');
            draw();
            if (on.every(Boolean)) success();
          });
          grid.appendChild(b);
        });
      };
      draw();
      check = (a) => a === 'solve';
      break;
    }
  }

  return {
    submit(a) {
      if (!check(a)) return false;
      success();
      return true;
    },
    close: () => m.close(),
  };
}
