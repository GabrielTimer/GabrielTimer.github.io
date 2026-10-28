// MusiMix — rendu des paroles et accords (lecteur, aperçu de l'éditeur, PDF).

import { esc } from './ui.js';
import { tokenize, sectionLabelFr } from './sheet.js';
import { transposeChord, parseKey, guessKeyFromChords, transposeKey, keyName } from './theory.js';

/** Tonalité d'un morceau : déclarée, sinon devinée d'après les accords. */
export function songKey(song) {
  const k = parseKey(song.key || song.doc?.meta?.key);
  if (k) return k;
  const names = [];
  for (const l of song.doc?.lines || []) for (const c of l.chords || []) names.push({ name: c.name, w: 1 });
  if (!names.length) for (const c of song.detectedChords || []) names.push({ name: c.name, w: (c.e - c.s) || 1 });
  return guessKeyFromChords(names);
}

/** Fabrique la fonction d'affichage d'un accord (transposition + capo). */
export function chordDisplay(song, transpose = 0, capo = 0) {
  const key = songKey(song);
  const shift = transpose - capo;
  const target = key ? transposeKey(key, shift) : null;
  const cache = new Map();
  const fn = (name) => {
    if (!cache.has(name)) cache.set(name, shift ? transposeChord(name, shift, target) : transposeChord(name, 0, null));
    return cache.get(name);
  };
  fn.key = key;
  fn.soundingKey = key ? transposeKey(key, transpose) : null;
  fn.shapeKey = target;
  fn.keyLabel = key ? keyName(transposeKey(key, transpose)) : '';
  return fn;
}


/** HTML de la partition. opts: { display(name), withTimes } */
export function renderSheet(doc, { display = (n) => n } = {}) {
  const out = [];
  let lastSectionKind = null;
  doc.lines.forEach((l, li) => {
    if (l.type === 'section') {
      lastSectionKind = l.kind;
      out.push(`<p class="ln section k-${l.kind || 'verse'}" data-li="${li}">${esc(l.label || sectionLabelFr(l.kind))}</p>`);
    } else if (l.type === 'blank') {
      out.push(`<p class="ln blank" data-li="${li}"></p>`);
    } else if (l.type === 'chords') {
      out.push(`<p class="ln chords-only${l.chorus ? ' chorus' : ''}" data-li="${li}">${l.chords.map((c, ci) => `<span class="cbar" data-li="${li}" data-ci="${ci}">${esc(display(c.name))}</span>`).join('')}</p>`);
    } else {
      out.push(lyricLine(l, li, display));
    }
  });
  return `<div class="sheet">${out.join('')}</div>`;
}

export function lyricLine(l, li, display, extraClass = '') {
  const toks = tokenize(l.text);
  const chords = [...(l.chords || [])].map((c, ci) => ({ ...c, ci })).sort((a, b) => a.pos - b.pos);
  const has = chords.length > 0;
  const words = l.words || [];
  const parts = [];
  let k = 0; // index de l'accord suivant
  toks.forEach((tk, wi) => {
    // accords situés avant ce mot (dans l'espace) → rattachés au début du mot
    const cuts = [];
    while (k < chords.length && chords[k].pos < tk.end) {
      const c = chords[k++];
      cuts.push({ at: Math.max(tk.start, c.pos), c });
    }
    const w = words[wi];
    const pieces = [];
    let from = tk.start;
    let pending = null;
    for (const cut of cuts) {
      if (cut.at > from) { pieces.push({ a: from, b: cut.at, c: pending }); from = cut.at; pending = null; }
      if (pending) pieces.push({ a: from, b: from, c: pending });
      pending = cut.c;
    }
    pieces.push({ a: from, b: tk.end, c: pending });
    const len = tk.end - tk.start || 1;
    for (const p of pieces) {
      const text = l.text.slice(p.a, p.b) || ' ';
      let times = '';
      if (w) {
        const s = w.s + ((p.a - tk.start) / len) * (w.e - w.s);
        const e = w.s + ((p.b - tk.start) / len) * (w.e - w.s);
        times = ` data-s="${s.toFixed(3)}" data-e="${e.toFixed(3)}"`;
      }
      const name = p.c ? display(p.c.name) : '';
      const label = p.c ? `<span class="c" data-li="${li}" data-ci="${p.c.ci}">${esc(name)}</span>` : has ? '<span class="c e"></span>' : '';
      parts.push(`<span class="w" data-wi="${wi}"${times}>${label}${has ? `<span class="t">${esc(text)}</span>` : esc(text)}</span>`);
    }
    if (wi < toks.length - 1) parts.push(' ');
  });
  // accords après la fin du texte
  while (k < chords.length) {
    const c = chords[k++];
    const name = display(c.name);
    parts.push(` <span class="w"><span class="c" data-li="${li}" data-ci="${c.ci}">${esc(name)}</span><span class="t">\u00a0</span></span>`);
  }
  const cls = ['ln', 'lyric', has ? 'has-ch' : '', l.chorus ? 'chorus' : '', extraClass].filter(Boolean).join(' ');
  const t = l.s != null ? ` data-s="${l.s.toFixed(3)}" data-e="${(l.e ?? l.s + 4).toFixed(3)}"` : '';
  return `<p class="${cls}" data-li="${li}"${t}>${parts.join('')}</p>`;
}

/** Accords distincts d'une partition, dans l'ordre d'apparition. */
export function uniqueChords(doc, display = (n) => n, fallback = []) {
  const seen = new Set();
  const out = [];
  const add = (n) => { const d = display(n); if (!seen.has(d)) { seen.add(d); out.push(d); } };
  for (const l of doc.lines) for (const c of l.chords || []) add(c.name);
  if (!out.length) for (const c of fallback) add(c.name);
  return out;
}
