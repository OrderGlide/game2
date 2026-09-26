// Tiny DOM helpers: create elements, open/close modal panels.
import { sfx } from '../audio';

export function el<K extends keyof HTMLElementTagNameMap>(tag: K, cls = '', html = ''): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html) e.innerHTML = html;
  return e;
}

export function btn(label: string, cls: string, onClick: () => void): HTMLButtonElement {
  const b = el('button', cls, label);
  b.addEventListener('click', (e) => {
    e.stopPropagation();
    sfx('click');
    onClick();
  });
  return b;
}

export const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));

export interface Modal { bg: HTMLDivElement; panel: HTMLDivElement; close: () => void }

const stack: Modal[] = [];
export let onModalsChanged: () => void = () => {};
export function setModalListener(fn: () => void): void { onModalsChanged = fn; }
export function modalOpen(): boolean { return stack.length > 0; }

/** Open a centred panel over everything; tapping the dark background closes it unless `sticky`. */
export function modal(root: HTMLElement, opts: { cls?: string; sticky?: boolean; onClose?: () => void; closeBtn?: boolean } = {}): Modal {
  const bg = el('div', 'modal-bg');
  const panel = el('div', `panel ${opts.cls ?? ''}`);
  bg.appendChild(panel);
  root.appendChild(bg);
  let closed = false;
  const m: Modal = {
    bg, panel,
    close: () => {
      if (closed) return;
      closed = true;
      bg.remove();
      stack.splice(stack.indexOf(m), 1);
      opts.onClose?.();
      onModalsChanged();
    },
  };
  if (!opts.sticky) bg.addEventListener('pointerdown', (e) => { if (e.target === bg) m.close(); });
  if (opts.closeBtn !== false && !opts.sticky) panel.appendChild(btn('✕', 'x', () => m.close()));
  stack.push(m);
  onModalsChanged();
  return m;
}

export function closeAllModals(): void {
  for (const m of [...stack]) m.close();
}

/** The most recently opened modal (used by the automated walkthrough to close documents). */
export function topModal(): Modal | undefined { return stack[stack.length - 1]; }
