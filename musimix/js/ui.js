// MusiMix — petits outils d'interface : icônes, messages, menus, boîtes de dialogue.

export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export function fmtTime(t) {
  if (!isFinite(t) || t < 0) t = 0;
  const m = Math.floor(t / 60);
  const s = Math.floor(t % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

const PATHS = {
  play: '<path d="M8 5.5v13l11-6.5z" class="f"/>',
  pause: '<rect x="6.5" y="5" width="4" height="14" rx="1" class="f"/><rect x="13.5" y="5" width="4" height="14" rx="1" class="f"/>',
  back: '<path d="M15 5l-7 7 7 7"/>',
  back5: '<path d="M11 7V4L6 8l5 4V9a5 5 0 1 1-5 5"/><text x="12.5" y="18.5" font-size="7" font-weight="800" stroke="none" fill="currentColor" font-family="sans-serif">5</text>',
  fwd5: '<path d="M13 7V4l5 4-5 4V9a5 5 0 1 0 5 5"/><text x="6" y="18.5" font-size="7" font-weight="800" stroke="none" fill="currentColor" font-family="sans-serif">5</text>',
  loop: '<path d="M17 2l3 3-3 3"/><path d="M4 11V9a4 4 0 0 1 4-4h12"/><path d="M7 22l-3-3 3-3"/><path d="M20 13v2a4 4 0 0 1-4 4H4"/>',
  mix: '<path d="M6 3v18M12 3v18M18 3v18"/><circle cx="6" cy="14" r="2.4" class="f"/><circle cx="12" cy="8" r="2.4" class="f"/><circle cx="18" cy="16" r="2.4" class="f"/>',
  more: '<circle cx="5" cy="12" r="1.6" class="f"/><circle cx="12" cy="12" r="1.6" class="f"/><circle cx="19" cy="12" r="1.6" class="f"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  search: '<circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/>',
  edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M13.5 6.5l4 4"/>',
  trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
  download: '<path d="M12 4v11M7 10l5 5 5-5M5 20h14"/>',
  upload: '<path d="M12 20V9M7 14l5-5 5 5M5 4h14"/>',
  pdf: '<path d="M7 3h7l5 5v13H7z"/><path d="M14 3v5h5"/><path d="M10 13h6M10 17h6"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1"/>',
  list: '<path d="M9 6h11M9 12h11M9 18h11"/><circle cx="4.5" cy="6" r="1.2" class="f"/><circle cx="4.5" cy="12" r="1.2" class="f"/><circle cx="4.5" cy="18" r="1.2" class="f"/>',
  stage: '<rect x="3" y="4" width="18" height="13" rx="2"/><path d="M8 21h8M12 17v4"/>',
  lyrics: '<path d="M4 6h16M4 11h16M4 16h10"/>',
  grid: '<rect x="3" y="5" width="18" height="14" rx="1.5"/><path d="M9 5v14M15 5v14"/>',
  metro: '<path d="M8 21l3-18h2l3 18z"/><path d="M12 15l6-8"/><path d="M7 17h10"/>',
  textsize: '<path d="M4 18l5-12 5 12M5.8 14h6.4"/><path d="M15 18l3-7 3 7M15.9 16h4.2"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  close: '<path d="M6 6l12 12M18 6L6 18"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  moon: '<path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/>',
  next: '<path d="M6 5l9 7-9 7z" class="f"/><path d="M18 5v14"/>',
  prev: '<path d="M18 5l-9 7 9 7z" class="f"/><path d="M6 5v14"/>',
  sparkle: '<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/><path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z"/>',
  tap: '<path d="M9 11V5.5a1.5 1.5 0 0 1 3 0V11"/><path d="M12 10.5V9a1.5 1.5 0 0 1 3 0v2"/><path d="M15 10.5a1.5 1.5 0 0 1 3 0V15a6 6 0 0 1-6 6h-1a6 6 0 0 1-5-2.7L4 15a1.6 1.6 0 0 1 2.6-1.8L9 15.5"/>',
  wifi: '<path d="M2 9a15 15 0 0 1 20 0M5.5 12.5a10 10 0 0 1 13 0M9 16a5 5 0 0 1 6 0"/><circle cx="12" cy="19.5" r="1" class="f"/>',
  piano: '<rect x="3" y="4" width="18" height="16" rx="1.5"/><path d="M8 4v16M13 4v16M18 4v16"/><path d="M6 4v9h4V4M15.5 4v9h4V4" class="f"/>',
  guitar: '<path d="M19.5 4.5l-7 7"/><path d="M17 2l5 5"/><path d="M11 11a4 4 0 0 0-5.5.5c-1 1-.6 2.6-1.8 3.4C2 16 2 18.5 3.7 20.2s4.2 1.7 5.3 0c.8-1.2 2.4-.8 3.4-1.8A4 4 0 0 0 13 13"/><circle cx="8.5" cy="15.5" r="1.3"/>',
  folder: '<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
  sync: '<path d="M4 12a8 8 0 0 1 13.7-5.7L20 8.5M20 4v4.5h-4.5"/><path d="M20 12a8 8 0 0 1-13.7 5.7L4 15.5M4 20v-4.5h4.5"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.5"/>',
  undo: '<path d="M9 14L4 9l5-5"/><path d="M4 9h10a6 6 0 0 1 0 12h-3"/>',
};

export function icon(name, cls = '') {
  const p = PATHS[name] || '';
  return `<svg class="i ${cls}" viewBox="0 0 24 24" aria-hidden="true">${p.replace(/class="f"/g, 'fill="currentColor" stroke="none"')}</svg>`;
}

let toastTimer = null;
export function toast(msg, ms = 2600) {
  let el = document.querySelector('.toast');
  if (!el) { el = document.createElement('div'); el.className = 'toast'; el.setAttribute('role', 'status'); document.body.appendChild(el); }
  el.textContent = msg;
  el.classList.add('on');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('on'), ms);
}

/** Menu contextuel. items = [{ icon, label, action, danger } | '-'] */
export function openMenu(anchor, items) {
  closeMenu();
  const m = document.createElement('div');
  m.className = 'menu';
  m.setAttribute('role', 'menu');
  m.innerHTML = items.map((it, i) => (it === '-' ? '<hr>' : `<button role="menuitem" data-i="${i}" class="${it.danger ? 'danger' : ''}">${it.icon ? icon(it.icon) : ''}${esc(it.label)}</button>`)).join('');
  document.body.appendChild(m);
  const r = anchor.getBoundingClientRect();
  const mw = m.offsetWidth, mh = m.offsetHeight;
  let left = Math.min(r.right - mw, window.innerWidth - mw - 8);
  left = Math.max(8, left);
  let top = r.bottom + 6;
  if (top + mh > window.innerHeight - 8) top = Math.max(8, r.top - mh - 6);
  m.style.left = left + 'px';
  m.style.top = top + 'px';
  m.addEventListener('click', (e) => {
    const b = e.target.closest('button[data-i]');
    if (!b) return;
    closeMenu();
    items[+b.dataset.i].action?.();
  });
  setTimeout(() => {
    document.addEventListener('pointerdown', onOutside, true);
    document.addEventListener('keydown', onEsc, true);
  });
  m.querySelector('button')?.focus();
  function onOutside(e) { if (!m.contains(e.target)) closeMenu(); }
  function onEsc(e) { if (e.key === 'Escape') { e.stopPropagation(); closeMenu(); } }
  m._cleanup = () => { document.removeEventListener('pointerdown', onOutside, true); document.removeEventListener('keydown', onEsc, true); };
}

export function closeMenu() {
  document.querySelectorAll('.menu').forEach((m) => { m._cleanup?.(); m.remove(); });
}

/** Boîte de dialogue modale. Retourne { el, close(), done: Promise<valeur> }. */
export function dialog(html, { onOpen, dismissable = true, cls = '' } = {}) {
  const d = document.createElement('dialog');
  if (cls) d.className = cls;
  d.innerHTML = html;
  document.body.appendChild(d);
  let resolve;
  const done = new Promise((r) => { resolve = r; });
  const close = (v) => { if (d.open) d.close(); d.remove(); resolve(v); };
  d.addEventListener('cancel', (e) => { if (!dismissable) e.preventDefault(); else { e.preventDefault(); close(null); } });
  d.addEventListener('click', (e) => {
    if (dismissable && e.target === d) close(null);
    const b = e.target.closest('[data-close]');
    if (b) { e.preventDefault(); close(b.dataset.close || null); }
  });
  d.showModal();
  onOpen?.(d, close);
  return { el: d, close, done };
}

export async function confirmBox(title, text, { ok = 'Confirmer', danger = false } = {}) {
  const { done } = dialog(`<div class="dlg"><h2>${esc(title)}</h2><p>${esc(text)}</p>
    <div class="actions"><button class="btn ghost" data-close="">Annuler</button><button class="btn ${danger ? 'primary danger-bg' : 'primary'}" data-close="ok">${esc(ok)}</button></div></div>`);
  return (await done) === 'ok';
}

/** Glisser vertical / horizontal sur un élément (souris + tactile). */
export function drag(el, { onStart, onMove, onEnd }) {
  el.addEventListener('pointerdown', (e) => {
    if (e.button > 0) return;
    e.preventDefault();
    el.setPointerCapture(e.pointerId);
    onStart?.(e);
    const move = (ev) => onMove?.(ev);
    const up = (ev) => {
      el.removeEventListener('pointermove', move);
      el.removeEventListener('pointerup', up);
      el.removeEventListener('pointercancel', up);
      onEnd?.(ev);
    };
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', up);
  });
}

export function debounce(fn, ms) {
  let t;
  return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
}

export function pickFiles({ accept = '', multiple = true, directory = false } = {}) {
  return new Promise((resolve) => {
    const inp = document.createElement('input');
    inp.type = 'file';
    inp.accept = accept;
    inp.multiple = multiple;
    if (directory) inp.webkitdirectory = true;
    inp.onchange = () => resolve([...inp.files]);
    inp.addEventListener('cancel', () => resolve([]));
    inp.click();
  });
}
