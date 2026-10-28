// MusiMix — théorie musicale : lecture des accords, transposition, notes.

export const SHARP = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
export const FLAT = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
// Orthographe par défaut quand la tonalité est inconnue (la plus courante en pratique).
const DEFAULT_SPELL = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];
const FLAT_MAJOR = new Set([5, 10, 3, 8, 1, 6]);      // F Bb Eb Ab Db Gb
const FLAT_MINOR = new Set([2, 7, 0, 5, 10, 3]);      // Dm Gm Cm Fm Bbm Ebm

const NOTE_RE = /^([A-Ga-g])(#|♯|b|♭)?/;
const LETTER = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

export function noteToPc(name) {
  const m = NOTE_RE.exec(name || '');
  if (!m) return null;
  let pc = LETTER[m[1].toUpperCase()];
  if (m[2] === '#' || m[2] === '♯') pc += 1;
  if (m[2] === 'b' || m[2] === '♭') pc -= 1;
  return (pc + 12) % 12;
}

/** Choisit ♯ ou ♭ pour une tonalité donnée ({pc, minor}) ou null. */
export function spelling(key) {
  if (!key) return DEFAULT_SPELL;
  const flats = key.minor ? FLAT_MINOR.has(key.pc) : FLAT_MAJOR.has(key.pc);
  if (key.pc === 6 && !key.minor) return SHARP; // F# majeur plutôt que Gb
  return flats ? FLAT : SHARP;
}

export function pcName(pc, key) { return spelling(key)[((pc % 12) + 12) % 12]; }

export function parseKey(str) {
  if (!str) return null;
  const s = String(str).trim();
  const pc = noteToPc(s);
  if (pc === null) return null;
  const rest = s.replace(NOTE_RE, '').trim().toLowerCase();
  const minor = /^(m(?!aj)|min|-|mineur|minor)/.test(rest);
  return { pc, minor };
}

export function keyName(key) {
  if (!key) return '';
  return pcName(key.pc, key) + (key.minor ? 'm' : '');
}

export function transposeKey(key, n) {
  if (!key) return null;
  return { pc: (key.pc + n + 120) % 12, minor: key.minor };
}

// ─────────────────────────────────────────────────────────── accords ──

const CHORD_RE = /^([A-G])(#|♯|b|♭)?([^/\s]*)(?:\/([A-G](?:#|♯|b|♭)?))?$/;

/**
 * Lit un nom d'accord, y compris les notations brésiliennes / jazz :
 * C7M, C7+, CΔ, C°, Cø, C(9), Am7(b5), D9(11), E7(#9), Bb6/9, C-7…
 * Retourne { root, bass, suffix (canonique), intervals, minor } ou null.
 */
export function parseChord(raw) {
  if (!raw) return null;
  const name = String(raw).trim().replace(/\s+/g, '');
  // 6/9, 7/9, 7/4 (notation brésilienne) : ce ne sont pas des basses
  const norm = name.replace(/6\/9/g, '69').replace(/\/(b|#)?(\d+)(?=$|\/|\()/g, '($1$2)');
  const m = CHORD_RE.exec(norm);
  if (!m) return null;
  const root = noteToPc(m[1] + (m[2] || ''));
  const bass = m[4] ? noteToPc(m[4]) : null;
  const q = analyseSuffix(m[3] || '');
  if (!q) return null;
  const acc = (x) => (x || '').replace('♯', '#').replace('♭', 'b');
  return {
    root, bass: bass === root ? null : bass, suffix: q.suffix, intervals: q.intervals, minor: q.minor, raw: name,
    rootName: m[1] + acc(m[2]), bassName: m[4] ? m[4][0] + acc(m[4].slice(1)) : null,
  };
}

export function isChord(tok) {
  if (!tok) return false;
  const t = tok.replace(/^\|+|\|+$/g, '');
  if (!t || t === 'N.C.' || t === 'NC') return /^N\.?C\.?$/.test(t);
  return parseChord(t) !== null;
}

function analyseSuffix(s0) {
  let s = s0
    .replace(/♭/g, 'b').replace(/♯/g, '#')
    .replace(/7\(4\)/g, '7sus4')
    .replace(/\((\d+)\)/g, ' add$1 ')
    .replace(/[()]/g, ' ').replace(/,/g, ' ')
    .replace(/º|°/g, 'dim').replace(/ø7?/g, 'm7b5')
    .replace(/Δ7?|\^7?/g, 'maj7')
    .replace(/7M|7\+(?!\d)|M7/g, 'maj7')
    .replace(/\+(?!\d)/g, 'aug')
    .replace(/^min|^mi(?!n)|^-(?=\d|$|\s|maj|M)/, 'm')
    .trim();
  // jetons après nettoyage, ex. "m7 b5", "9 11", "maj7 #11", "add9"
  const out = { third: 4, fifth: 7, ext: new Set(), seventh: null, minor: false, sus: null, power: false, omit3: false };
  let rest = s.replace(/\s+/g, ' ');
  const take = (re) => { const mm = re.exec(rest); if (mm) { rest = rest.slice(0, mm.index) + ' ' + rest.slice(mm.index + mm[0].length); rest = rest.trim(); } return mm; };

  if (take(/^m7b5/)) { out.minor = true; out.third = 3; out.fifth = 6; out.seventh = 10; }
  else if (take(/^dim7/)) { out.minor = true; out.third = 3; out.fifth = 6; out.seventh = 9; }
  else if (take(/^dim/)) { out.minor = true; out.third = 3; out.fifth = 6; if (take(/^7/)) out.seventh = 9; }
  else if (take(/^aug/)) { out.fifth = 8; }
  else if (take(/^m(?!aj)/)) { out.minor = true; out.third = 3; }

  if (take(/^5(?!\d)/)) { out.power = true; }
  if (take(/^(maj|M)(?=7|9|11|13)/)) { const n = take(/^(13|11|9|7)/); out.seventh = 11; if (n) addExt(out, +n[1], true); }
  else if (take(/^(maj|M)$/)) { /* "Cmaj" = majeur */ }
  else {
    if (take(/^4(?!\d)/)) out.sus = 4;
    else if (take(/^2(?!\d)/)) out.ext.add(14);
    const n = take(/^(6\/9|69|6|7|9|11|13)/);
    if (n) {
      const v = n[1];
      if (v === '6') out.ext.add(9);
      else if (v === '69' || v === '6/9') { out.ext.add(9); out.ext.add(14); }
      else { if (out.seventh === null) out.seventh = 10; addExt(out, +v, false); }
    }
  }
  // mmaj7 : "m(maj7)" → après le "m", "maj7"
  if (take(/^(maj|M)7/)) out.seventh = 11;

  // suites : sus, add, altérations, extensions isolées "(9)" "(11)"
  let guard = 0;
  while (rest && guard++ < 12) {
    let mm;
    if ((mm = take(/^sus2/))) out.sus = 2;
    else if ((mm = take(/^sus4|^sus/))) out.sus = 4;
    else if ((mm = take(/^add\s?4/))) addTone(out, '', 11);
    else if ((mm = take(/^add\s?(b|#)?(\d+)/))) addTone(out, mm[1], +mm[2]);
    else if ((mm = take(/^(b|#)(5|9|11|13)/))) addTone(out, mm[1], +mm[2], true);
    else if ((mm = take(/^4/))) out.sus = 4;
    else if ((mm = take(/^(2|9|11|13)/))) addTone(out, '', +mm[1]);
    else if ((mm = take(/^(maj|M)7?/))) out.seventh = 11;
    else if ((mm = take(/^7/))) { if (out.seventh === null) out.seventh = 10; }
    else if ((mm = take(/^no3|^omit3/))) out.omit3 = true;
    else if ((mm = take(/^\//))) { /* reste d'un 6/9 */ }
    else return null; // jeton inconnu : ce n'est pas un accord
  }

  const iv = new Set([0]);
  if (out.power) { iv.add(7); }
  else {
    if (out.sus) iv.add(out.sus === 2 ? 2 : 5); else if (!out.omit3) iv.add(out.third);
    if (out.fifth !== null) iv.add(out.fifth);
  }
  if (out.seventh !== null) iv.add(out.seventh);
  out.ext.forEach((e) => iv.add(e));
  const intervals = [...iv].sort((a, b) => a - b);
  return { intervals, minor: out.minor && !out.sus, suffix: canonicalSuffix(s0, out) };
}

function addExt(out, n, maj) {
  // 9 → 7+9 ; 11 → 7+9+11 ; 13 → 7+9+13 (11 omise, usage courant)
  if (n >= 9) out.ext.add(14);
  if (n === 11) out.ext.add(17);
  if (n === 13) out.ext.add(21);
  if (maj) out.seventh = 11;
}

function addTone(out, acc, n, alteration = false) {
  const base = { 2: 14, 4: 17, 5: 7, 9: 14, 11: 17, 13: 21 }[n];
  if (base === undefined) return;
  const v = base + (acc === 'b' ? -1 : acc === '#' ? 1 : 0);
  if (n === 5) { out.fifth = v; return; }
  if (alteration && n === 9 && out.seventh === null) out.seventh = 10;
  out.ext.add(v);
}

/** Suffixe normalisé pour l'affichage (7M → maj7, ° → dim, (9) → add9…). */
function canonicalSuffix(s0, out) {
  let s = s0.replace(/♭/g, 'b').replace(/♯/g, '#');
  s = s.replace(/^(m?)4$/, '$1sus4').replace(/^(m?)7\(4\)$/, '$17sus4').replace(/^(m?)2$/, '$1add9');
  s = s.replace(/º|°/g, 'dim').replace(/ø7?/g, 'm7b5').replace(/Δ7?/g, 'maj7')
    .replace(/7M|7\+(?!\d)/g, 'maj7').replace(/^M7/, 'maj7').replace(/^-/, 'm').replace(/^min/, 'm');
  s = s.replace(/^\+$/, 'aug');
  // "(9)" seul sans septième → add9 ; "7(9)" → 9 ; "m7(11)" → m11
  s = s.replace(/^(m?)\((9|11|13)\)$/, '$1add$2');
  s = s.replace(/^(m?)7\((9)\)$/, '$19').replace(/^(m?)7\((11)\)$/, '$111').replace(/^(m?)7\((13)\)$/, '$113');
  s = s.replace(/^(m?)7M?\((#|b)(\d+)\)$/, '$17$2$3');
  s = s.replace(/\((#|b)?(\d+)\)/g, '($1$2)');
  s = s.replace(/^6\/9$/, '69').replace(/^m6\/9$/, 'm69');
  return s;
}

export function chordName(ch, key) {
  if (!ch) return '';
  if (!key && ch.rootName) return ch.rootName + ch.suffix + (ch.bass !== null ? '/' + ch.bassName : '');
  const sp = spelling(key);
  return sp[ch.root] + ch.suffix + (ch.bass !== null ? '/' + sp[ch.bass] : '');
}

/** Transpose un nom d'accord de n demi-tons, orthographié selon la tonalité cible. */
export function transposeChord(name, n, targetKey) {
  const ch = parseChord(name);
  if (!ch) return name;
  if (!n) return chordName(ch, null);
  return chordName({ ...ch, rootName: null, root: (ch.root + n + 120) % 12, bass: ch.bass === null ? null : (ch.bass + n + 120) % 12 }, targetKey);
}

/** Notes (classes de hauteur) d'un accord, la basse en premier si accord slash. */
export function chordPcs(ch) {
  return ch.intervals.map((i) => (ch.root + i) % 12);
}

const INTERVAL_NAMES = { 0: '1', 1: 'b9', 2: '9', 3: 'b3', 4: '3', 5: '4', 6: 'b5', 7: '5', 8: '#5', 9: '6', 10: 'b7', 11: '7', 13: 'b9', 14: '9', 15: '#9', 17: '11', 18: '#11', 20: 'b13', 21: '13' };
export function intervalName(i) { return INTERVAL_NAMES[i] || String(i); }

/** Estime la tonalité à partir d'une liste d'accords (durées en poids). */
export function guessKeyFromChords(list) {
  const MAJ = [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88];
  const MIN = [6.33, 2.68, 3.52, 5.38, 2.6, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17];
  const prof = new Array(12).fill(0);
  for (const { name, w = 1 } of list) {
    const ch = parseChord(name);
    if (!ch) continue;
    for (const i of ch.intervals) prof[(ch.root + i) % 12] += w * (i === 0 ? 1.5 : 1);
  }
  if (prof.every((v) => v === 0)) return null;
  let best = null, bestScore = -Infinity;
  for (let r = 0; r < 12; r++) {
    for (const [minor, p] of [[false, MAJ], [true, MIN]]) {
      let s = 0;
      for (let i = 0; i < 12; i++) s += prof[(r + i) % 12] * p[i];
      if (s > bestScore) { bestScore = s; best = { pc: r, minor }; }
    }
  }
  return best;
}

export const NOTE_NAMES_FR = { C: 'Do', D: 'Ré', E: 'Mi', F: 'Fa', G: 'Sol', A: 'La', B: 'Si' };
