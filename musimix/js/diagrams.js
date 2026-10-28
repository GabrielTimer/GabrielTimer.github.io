// MusiMix — diagrammes d'accords : guitare, ukulélé (doigtés) et piano.
// Guitare : base de doigtés courante (data/guitar.json) puis générateur
// automatique pour tout le reste (accords enrichis, basses, ukulélé).

import { parseChord, chordPcs, pcName, intervalName } from './theory.js';

let GUITAR_DB = null;
let dbPromise = null;

export function loadChordDb() {
  if (!dbPromise) {
    dbPromise = fetch(new URL('../data/guitar.json', import.meta.url))
      .then((r) => r.json())
      .then((d) => { GUITAR_DB = d; })
      .catch(() => { GUITAR_DB = {}; });
  }
  return dbPromise;
}

// Suffixes canoniques MusiMix → suffixes de la base de doigtés
const DB_SUFFIX = {
  '': '', m: 'm', 7: '7', maj7: 'maj7', m7: 'm7', m7b5: 'm7b5', dim: 'dim', dim7: 'dim7', aug: 'aug',
  sus2: 'sus2', sus4: 'sus4', '7sus4': '7sus4', 5: '5', 6: '6', m6: 'm6', 69: '69', m69: 'm69',
  9: '9', m9: 'm9', maj9: 'maj9', 11: '11', m11: 'm11', 13: '13', maj13: 'maj13', add9: 'add9', madd9: 'madd9',
  '7b9': '7b9', '7#9': '7#9', '7b5': '7b5', 'maj7#5': 'maj7#5', 'maj7b5': 'maj7b5', mmaj7: 'mmaj7', 'm(maj7)': 'mmaj7',
  'maj7(9)': 'maj9', 'm7(9)': 'm9', '7(9)': '9', '9#11': '9#11', aug7: 'aug7', '7#5': 'aug7', add11: 'add11',
};

const TUNINGS = {
  guitar: { strings: [40, 45, 50, 55, 59, 64], frets: 15, span: 4, label: 'Guitare' },
  ukulele: { strings: [67, 60, 64, 69], frets: 12, span: 4, label: 'Ukulélé', reentrant: true },
};

const cache = new Map();

/** Liste de doigtés pour un accord : [{ frets:[…], fingers:[…], base, barre }] (frets absolues, -1 = étouffée). */
export function voicings(name, instrument = 'guitar') {
  const ck = instrument + '|' + name;
  if (cache.has(ck)) return cache.get(ck);
  const ch = parseChord(name);
  let list = [];
  if (ch) {
    if (instrument === 'guitar' && GUITAR_DB) list = fromDb(ch);
    const gen = generate(ch, TUNINGS[instrument] || TUNINGS.guitar);
    // complète avec le générateur (positions différentes de celles de la base)
    for (const v of gen) if (!list.some((x) => x.frets.join() === v.frets.join())) list.push(v);
    // les plus simples d'abord : position basse, peu de cordes étouffées, pas de barré
    const rank = (v) => {
      const fr = v.frets.filter((f) => f > 0);
      const pos = fr.length ? Math.min(...fr) : 0;
      const span = fr.length ? Math.max(...fr) - pos : 0;
      const first = v.frets.findIndex((f) => f >= 0);
      const inner = v.frets.slice(first).filter((f) => f < 0).length;
      const maxF = fr.length ? Math.max(...fr) : 0;
      const muteW = v.frets.length === 4 ? 2.5 : 0.8;
      return maxF * 0.6 + pos * 0.4 + span * 0.3 + fr.length * 0.3 + v.frets.filter((f) => f < 0).length * muteW + inner * 3 + (v.barre ? 0.8 : 0) - (v.source === 'db' ? 1.5 : 0)
        + (maxF >= 4 && v.frets.includes(0) ? 1.5 : 0);
    };
    list.sort((a, b) => rank(a) - rank(b));
    list = list.slice(0, 6);
  }
  cache.set(ck, list);
  return list;
}

function fromDb(ch) {
  const suf = DB_SUFFIX[ch.suffix];
  const keys = [];
  if (suf !== undefined) {
    if (ch.bass !== null) keys.push(`${ch.root}|${suf}|${ch.bass}`);
    else keys.push(`${ch.root}|${suf}`);
  }
  for (const k of keys) {
    const v = GUITAR_DB[k];
    if (v) {
      return v.map(([fr, fi, base, barres]) => {
        const rel = [...fr].map((c) => (c === 'x' ? -1 : parseInt(c, 36)));
        const frets = rel.map((f) => (f <= 0 ? f : f + base - 1));
        return { frets, fingers: [...fi].map(Number), base, barre: barres.length ? barres[0] + base - 1 : null, source: 'db' };
      }).filter((v) => validVoicing(v.frets, ch));
    }
  }
  return [];
}

// quelques doigtés de la base sont faux : on vérifie notes et basse
function validVoicing(frets, ch) {
  const strings = TUNINGS.guitar.strings;
  const pcs = new Set(chordPcs(ch));
  if (ch.bass !== null) pcs.add(ch.bass);
  const notes = frets.map((f, i) => (f >= 0 ? strings[i] + f : null)).filter((x) => x !== null);
  if (!notes.length || notes.some((n) => !pcs.has(n % 12))) return false;
  return Math.min(...notes) % 12 === (ch.bass ?? ch.root);
}

/** Générateur de doigtés jouables (≤ 4 doigts, barré possible, basse correcte). */
function generate(ch, tuning) {
  const pcs = new Set(chordPcs(ch));
  const bass = ch.bass !== null ? ch.bass : ch.root;
  if (ch.bass !== null) pcs.add(ch.bass);
  // notes indispensables : fondamentale (sauf slash), tierce/sus, septième, altérations
  const essential = new Set();
  for (const i of ch.intervals) {
    const pc = (ch.root + i) % 12;
    if (i === 7) continue;                         // quinte juste : facultative
    if (i === 17 && ch.intervals.includes(21)) continue; // 11e dans un 13
    if (i === 14 && ch.intervals.length >= 6) continue;  // 9e dans un 11/13
    essential.add(pc);
  }
  if (ch.bass !== null) essential.add(ch.bass);
  const n = tuning.strings.length;
  const results = [];
  for (let start = 0; start <= tuning.frets - 3; start++) {
    const opts = tuning.strings.map((open) => {
      const o = [-1];
      if (pcs.has(open % 12)) o.push(0);
      for (let f = Math.max(1, start); f < start + tuning.span; f++) if (pcs.has((open + f) % 12)) o.push(f);
      return o;
    });
    const cur = new Array(n);
    const rec = (s) => {
      if (s === n) { const v = evaluate(cur, tuning, bass, essential, start); if (v) results.push(v); return; }
      for (const f of opts[s]) { cur[s] = f; rec(s + 1); }
    };
    rec(0);
  }
  results.sort((a, b) => a.score - b.score);
  const out = [];
  for (const r of results) {
    if (out.some((o) => o.frets.join() === r.frets.join())) continue;
    // évite deux doigtés quasi identiques dans la même position
    if (out.some((o) => Math.abs(o.pos - r.pos) <= 1 && o.frets.filter((f, i) => f === r.frets[i]).length >= n - 1)) continue;
    out.push(r);
    if (out.length >= 5) break;
  }
  return out;
}

function evaluate(frets, tuning, bass, essential, start) {
  const n = frets.length;
  const sounding = frets.map((f, i) => (f >= 0 ? tuning.strings[i] + f : null));
  const played = sounding.filter((x) => x !== null);
  if (played.length < Math.min(3, n)) return null;
  // basse : la note la plus grave doit être la basse voulue (ukulélé réentrant : on tolère)
  const low = Math.min(...played);
  if (!tuning.reentrant && low % 12 !== bass) return null;
  const have = new Set(played.map((x) => x % 12));
  for (const e of essential) if (!have.has(e)) return null;
  // cordes étouffées : seulement en bas (guitare), pas au milieu
  const firstPlayed = frets.findIndex((f) => f >= 0);
  let inner = 0;
  for (let i = firstPlayed; i < n; i++) if (frets[i] < 0) inner++;
  if (inner > 1) return null;
  const fretted = frets.map((f, i) => [f, i]).filter(([f]) => f > 0);
  const maxF = Math.max(0, ...fretted.map(([f]) => f));
  const minF = fretted.length ? Math.min(...fretted.map(([f]) => f)) : 0;
  if (maxF - minF > 3) return null;
  // doigts : barré possible sur la case la plus basse
  let barre = null;
  let fingersNeeded = fretted.length;
  const atMin = fretted.filter(([f]) => f === minF);
  if (atMin.length >= 2) {
    const lo = Math.min(...atMin.map(([, i]) => i));
    const hi = Math.max(...atMin.map(([, i]) => i));
    let ok = true;
    for (let i = lo; i <= hi; i++) if (frets[i] === 0 || (frets[i] > 0 && frets[i] < minF)) ok = false;
    if (ok) { barre = { fret: minF, from: lo, to: hi }; fingersNeeded = fretted.length - atMin.length + 1; }
  }
  if (fingersNeeded > 4) return null;
  const fingers = assignFingers(frets, barre);
  let score = 0;
  score += minF * 0.9;                                  // positions basses d'abord
  score += (n - played.length) * (tuning.reentrant ? 4 : 1.6); // cordes étouffées
  score += inner * 4;
  score += barre ? 1.2 : 0;
  score += (maxF - minF) * 0.7;
  score += fingersNeeded * 0.4;
  if (frets.some((f) => f === 0) && minF > 4) score += 3; // corde à vide loin de la position
  // doublure de la basse en haut appréciée, doublures de tierces moins
  return { frets: [...frets], fingers, base: minF > 2 ? minF : 1, barre: barre ? barre.fret : null, barreRange: barre, pos: minF, score, source: 'gen' };
}

function assignFingers(frets, barre) {
  const fingers = frets.map(() => 0);
  let next = 1;
  if (barre) {
    for (let i = barre.from; i <= barre.to; i++) if (frets[i] === barre.fret) fingers[i] = 1;
    next = 2;
  }
  const rest = frets.map((f, i) => [f, i]).filter(([f, i]) => f > 0 && fingers[i] === 0).sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  for (const [, i] of rest) fingers[i] = Math.min(4, next++);
  return fingers;
}

// ─────────────────────────────────────────────────────────── rendu SVG ──

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/** Diagramme de manche (guitare ou ukulélé). */
export function fretboardSVG(name, instrument = 'guitar', index = 0, { showName = false, fingersOn = true } = {}) {
  const vs = voicings(name, instrument);
  const v = vs[index % Math.max(1, vs.length)];
  const n = (TUNINGS[instrument] || TUNINGS.guitar).strings.length;
  const W = 24 + (n - 1) * 18 + 24, top = showName ? 40 : 22, rows = 5, rowH = 22;
  const H = top + rows * rowH + 14;
  const x = (i) => 24 + i * 18;
  let s = `<svg class="fretboard" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(name)} — ${instrument === 'ukulele' ? 'ukulélé' : 'guitare'}">`;
  if (showName) s += `<text class="d-name" x="${W / 2}" y="16" text-anchor="middle">${esc(name)}</text>`;
  if (!v) {
    s += `<text class="d-none" x="${W / 2}" y="${top + 50}" text-anchor="middle">?</text></svg>`;
    return s;
  }
  const fretted = v.frets.filter((f) => f > 0);
  const maxF = Math.max(0, ...fretted);
  let base = v.base || 1;
  if (maxF <= 5 && (v.source === 'db' ? v.base === 1 : true)) base = maxF <= 4 ? 1 : base;
  if (maxF - base >= rows) base = maxF - rows + 1;
  // cases
  for (let r = 0; r <= rows; r++) {
    const y = top + r * rowH;
    s += `<line class="${r === 0 && base === 1 ? 'd-nut' : 'd-fret'}" x1="${x(0)}" x2="${x(n - 1)}" y1="${y}" y2="${y}"/>`;
  }
  for (let i = 0; i < n; i++) s += `<line class="d-string" x1="${x(i)}" x2="${x(i)}" y1="${top}" y2="${top + rows * rowH}"/>`;
  if (base > 1) s += `<text class="d-base" x="${x(0) - 8}" y="${top + rowH * 0.5 + 4}" text-anchor="end">${base}</text>`;
  // barré
  if (v.barre) {
    const idx = v.frets.map((f, i) => (f === v.barre ? i : -1)).filter((i) => i >= 0);
    const lo = Math.min(...idx), hi = Math.max(...idx);
    if (hi > lo) {
      const y = top + (v.barre - base + 0.5) * rowH;
      s += `<rect class="d-barre" x="${x(lo) - 7}" y="${y - 7}" width="${x(hi) - x(lo) + 14}" height="14" rx="7"/>`;
      if (fingersOn) s += `<text class="d-finger" x="${(x(lo) + x(hi)) / 2}" y="${y + 4}" text-anchor="middle">1</text>`;
    }
  }
  const ch = parseChord(name);
  const strings = (TUNINGS[instrument] || TUNINGS.guitar).strings;
  v.frets.forEach((f, i) => {
    if (f < 0) s += `<text class="d-mute" x="${x(i)}" y="${top - 7}" text-anchor="middle">×</text>`;
    else if (f === 0) s += `<circle class="d-open${ch && (strings[i] % 12) === (ch.bass ?? ch.root) ? ' root' : ''}" cx="${x(i)}" cy="${top - 11}" r="4"/>`;
    else {
      const inBarre = v.barre === f && v.frets.filter((g) => g === v.barre).length > 1 && v.fingers[i] === 1;
      if (inBarre) return;
      const y = top + (f - base + 0.5) * rowH;
      const isRoot = ch && (strings[i] + f) % 12 === (ch.bass ?? ch.root);
      s += `<circle class="d-dot${isRoot ? ' root' : ''}" cx="${x(i)}" cy="${y}" r="7.5"/>`;
      if (fingersOn && v.fingers[i]) s += `<text class="d-finger" x="${x(i)}" y="${y + 4}" text-anchor="middle">${v.fingers[i]}</text>`;
    }
  });
  s += '</svg>';
  return s;
}

/** Notes jouées au piano : basse (main gauche) + accord serré (main droite). */
export function pianoNotes(name) {
  const ch = parseChord(name);
  if (!ch) return null;
  const bass = ch.bass ?? ch.root;
  const pcs = chordPcs(ch);
  let ivs = [...new Set(ch.intervals.map((i) => i % 12))];
  if (ivs.length >= 5) ivs = ivs.filter((i) => i !== 7); // quinte omise dans les accords chargés
  let base = 60 + ch.root;
  if (base > 65) base -= 12;
  const rightNotes = ivs.map((i) => base + i).sort((a, b) => a - b);
  let left = 48 + bass;
  if (left > 53) left -= 12;
  return { left, right: [...new Set(rightNotes)], pcs, bass, root: ch.root, intervals: ch.intervals, ch };
}

/** Clavier deux octaves (Do3 → Si4) avec les notes de l'accord. */
export function pianoSVG(name, { showName = false, labels = false } = {}) {
  const pn = pianoNotes(name);
  const startMidi = 48; // Do3
  const octaves = 2;
  const whites = [0, 2, 4, 5, 7, 9, 11];
  const blacks = [1, 3, 6, 8, 10];
  const ww = 15, wh = 66, bw = 9.5, bh = 40;
  const top = showName ? 24 : 4;
  const totalW = octaves * 7 * ww;
  const W = totalW + 2, H = top + wh + (labels ? 18 : 4);
  let s = `<svg class="piano" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(name)} — piano">`;
  if (showName) s += `<text class="d-name" x="${W / 2}" y="16" text-anchor="middle">${esc(name)}</text>`;
  const on = new Map();
  if (pn) {
    // on replie la main droite dans l'octave supérieure du clavier affiché
    on.set(pn.left - (pn.left >= 60 ? 12 : 0), 'bass');
    for (const m of pn.right) {
      let mm = m;
      while (mm < 60) mm += 12;
      while (mm > 83) mm -= 12;
      if (!on.has(mm)) on.set(mm, (mm % 12) === pn.root ? 'root' : 'tone');
    }
  }
  const xWhite = (oct, k) => 1 + (oct * 7 + k) * ww;
  for (let o = 0; o < octaves; o++) whites.forEach((pc, k) => {
    const midi = startMidi + o * 12 + pc;
    const st = on.get(midi);
    s += `<rect class="k-white${st ? ' on ' + st : ''}" x="${xWhite(o, k)}" y="${top}" width="${ww}" height="${wh}" rx="2.5"/>`;
  });
  const blackX = { 1: 1, 3: 2, 6: 4, 8: 5, 10: 6 };
  for (let o = 0; o < octaves; o++) blacks.forEach((pc) => {
    const midi = startMidi + o * 12 + pc;
    const st = on.get(midi);
    const x = xWhite(o, blackX[pc]) - bw / 2;
    s += `<rect class="k-black${st ? ' on ' + st : ''}" x="${x}" y="${top}" width="${bw}" height="${bh}" rx="1.8"/>`;
  });
  if (pn && labels) {
    for (const [midi, st] of on) {
      const pc = midi % 12, o = Math.floor((midi - startMidi) / 12);
      let cx;
      if (whites.includes(pc)) cx = xWhite(o, whites.indexOf(pc)) + ww / 2;
      else cx = xWhite(o, blackX[pc]);
      s += `<text class="k-label ${st}" x="${cx}" y="${top + wh + 13}" text-anchor="middle">${esc(pcName(pc, null))}</text>`;
    }
  }
  s += '</svg>';
  return s;
}

/** Diagramme selon l'instrument choisi. */
export function diagramSVG(name, instrument, opts = {}) {
  if (instrument === 'piano') return pianoSVG(name, opts);
  return fretboardSVG(name, instrument, opts.index || 0, opts);
}

/** Formule de l'accord (1 3 5 b7…) et ses notes, pour l'aide-mémoire. */
export function chordFormula(name) {
  const ch = parseChord(name);
  if (!ch) return null;
  return {
    degrees: ch.intervals.map(intervalName),
    notes: ch.intervals.map((i) => pcName((ch.root + i) % 12, null)),
    bass: ch.bass !== null ? pcName(ch.bass, null) : null,
  };
}
