// MusiMix — modèle de la partition : paroles, accords, sections et synchronisation.
//
// Une partition = { meta, lines[] }
//   line = { type: 'lyric' | 'chords' | 'section' | 'blank',
//            text, chords: [{ pos, name, t? }], words?: [{ s, e }], s?, e?,
//            label? (section), kind? ('chorus'|'verse'|'bridge'|…), chorus?: bool }
// Les mots d'une ligne sont obtenus avec tokenize(text) ; line.words[i] donne leurs temps.

import { isChord, parseChord, chordName } from './theory.js';

// ───────────────────────────────────────────────────────────── outils ──

export function normText(t) {
  return String(t || '')
    .toLowerCase()
    .normalize('NFKD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, ' ').trim();
}

/** Découpe une ligne en mots avec leur position (caractères). */
export function tokenize(text) {
  const out = [];
  const re = /\S+/g;
  let m;
  while ((m = re.exec(text || ''))) out.push({ w: m[0], start: m.index, end: m.index + m[0].length });
  return out;
}

const SECTION_WORDS = '(intro|introdu[cç][aã]o|verse|couplet|verso|estrofe|pr[eé][- ]?(?:chorus|refr[aã]o|refrain|couplet)|chorus|refrain|refr[aã]o|bridge|pont|ponte|solo|outro|final|fin|interlude|instrumental|riff|coda|tag|parte\\s*\\d+|primeira parte|segunda parte|terceira parte|break|hook|post[- ]?chorus)';
const SECTION_RE = new RegExp(`^\\s*[\\[(]?\\s*${SECTION_WORDS}[^\\])\\n]*[\\])]?\\s*:?\\s*`, 'i');

export function sectionKind(label) {
  const l = normText(label);
  if (/pre|pr /.test(l) && /(refr|chorus|refrain)/.test(l)) return 'prechorus';
  if (/(refr|chorus|refrain|hook)/.test(l)) return 'chorus';
  if (/(pont|bridge|ponte)/.test(l)) return 'bridge';
  if (/intro/.test(l)) return 'intro';
  if (/(outro|final|fin|coda)/.test(l)) return 'outro';
  if (/(solo|instrumental|interlude|riff|break)/.test(l)) return 'instrumental';
  return 'verse';
}

const SECTION_FR = { chorus: 'Refrain', prechorus: 'Pré-refrain', bridge: 'Pont', intro: 'Intro', outro: 'Fin', instrumental: 'Instrumental', verse: 'Couplet' };

export function normalizeChordToken(tok) {
  const t = tok.replace(/^\|+|\|+$/g, '');
  const p = parseChord(t);
  return p ? chordName(p, null) : t;
}

function isChordLine(line) {
  const toks = line.trim().split(/\s+/).filter((t) => t && !['|', '||', '-', '/', '%', '/:', ':/'].includes(t))
    .filter((t) => !/^\(?x\d+\)?$|^\d+x$/i.test(t))
    .map((t) => (/^\(.*\)$/.test(t) ? t.slice(1, -1) : t));
  return toks.length > 0 && toks.every((t) => isChord(t));
}

// ─────────────────────────────────────────────────────────── lecture ──

export function looksLikeChordPro(text) {
  return /\[[A-G][^\]\s]*\]/.test(text) || /^\s*\{\s*\w+\s*[:}]/m.test(text);
}

/** Lit du ChordPro, une grille « accords au-dessus des paroles » ou des paroles simples. */
export function parseSheet(text) {
  text = String(text || '').replace(/\r\n?/g, '\n').replace(/\t/g, '    ').replace(/ /g, ' ');
  const doc = looksLikeChordPro(text) ? parseChordPro(text) : parseGrid(text);
  markChorus(doc.lines);
  return doc;
}

function parseChordPro(text) {
  const meta = {};
  const lines = [];
  let inChorus = false;
  for (const raw of text.split('\n')) {
    const dir = /^\s*\{\s*([\w_-]+)\s*(?::\s*(.*?))?\s*\}\s*$/.exec(raw);
    if (dir) {
      const k = dir[1].toLowerCase();
      const v = (dir[2] || '').trim();
      if (k === 'title' || k === 't') meta.title = v;
      else if (['artist', 'a', 'subtitle', 'st'].includes(k)) meta.artist = v;
      else if (k === 'key') meta.key = v;
      else if (k === 'capo') meta.capo = parseInt(v, 10) || 0;
      else if (k === 'tempo' || k === 'bpm') meta.bpm = parseFloat(v) || undefined;
      else if (k === 'album') meta.album = v;
      else if (['comment', 'c', 'ci', 'comment_italic', 'cb'].includes(k)) lines.push({ type: 'section', label: v, kind: sectionKind(v), chords: [] });
      else if (k === 'start_of_chorus' || k === 'soc') { inChorus = true; lines.push({ type: 'section', label: v || 'Refrain', kind: 'chorus', chords: [], explicit: true }); }
      else if (k === 'end_of_chorus' || k === 'eoc') { inChorus = false; }
      else if (k === 'start_of_verse' || k === 'sov') lines.push({ type: 'section', label: v || 'Couplet', kind: 'verse', chords: [] });
      else if (k === 'start_of_bridge' || k === 'sob') lines.push({ type: 'section', label: v || 'Pont', kind: 'bridge', chords: [] });
      else if (k === 'chorus') lines.push({ type: 'section', label: v || 'Refrain', kind: 'chorus', chords: [], repeat: true });
      continue;
    }
    if (/^\s*#/.test(raw)) continue; // commentaire ChordPro
    if (!raw.trim()) { lines.push({ type: 'blank', chords: [] }); continue; }
    let textOnly = '';
    const chords = [];
    for (const part of raw.split(/(\[[^\]]*\])/)) {
      if (part.startsWith('[') && part.endsWith(']')) {
        const inner = part.slice(1, -1).trim();
        if (isChord(inner)) chords.push({ pos: textOnly.length, name: normalizeChordToken(inner) });
        else if (inner) textOnly += part; // [x2] etc. → texte
      } else textOnly += part;
    }
    if (textOnly.trim() && !/^[\s|/%.\-–x\d()]*$/i.test(textOnly)) {
      // retire l'indentation commune en gardant les positions d'accords
      const lead = textOnly.length - textOnly.trimStart().length;
      const t = textOnly.slice(lead).replace(/\s+$/, '');
      lines.push({ type: 'lyric', text: t, chords: chords.map((c) => ({ ...c, pos: Math.max(0, c.pos - lead) })), chorus: inChorus || undefined });
    } else if (chords.length) {
      lines.push({ type: 'chords', text: '', chords: chords.map((c, i) => ({ ...c, pos: i })), chorus: inChorus || undefined });
    }
  }
  return { meta, lines: tidy(lines) };
}

function parseGrid(text) {
  const meta = {};
  const lines = [];
  const raw = text.split('\n');
  for (let i = 0; i < raw.length; i++) {
    let ln = raw[i].replace(/\s+$/, '');
    if (!ln.trim()) { lines.push({ type: 'blank', chords: [] }); continue; }
    if (/^\s*[eBGDAE]\|[-\d|hpbr/\\~x ]+/.test(ln)) continue; // tablature
    if (/^\s*(tom|tono|tonalidade|key)\s*:/i.test(ln)) { meta.key = ln.split(':')[1].trim().split(/\s/)[0]; continue; }
    if (/^\s*capo(traste)?\s*:?/i.test(ln) && /\d/.test(ln)) { meta.capo = parseInt(ln.match(/\d+/)[0], 10); continue; }
    const sec = SECTION_RE.exec(ln);
    if (sec && (sec[0].length === ln.length || isChordLine(ln.slice(sec[0].length)))) {
      const label = ln.slice(0, sec[0].length).replace(/[[\]():]/g, '').trim();
      lines.push({ type: 'section', label: cap(label), kind: sectionKind(label), chords: [] });
      const rest = ln.slice(sec[0].length);
      if (!rest.trim()) continue;
      ln = ' '.repeat(sec[0].length) + rest;
    }
    if (isChordLine(ln)) {
      const chords = [];
      const re = /\S+/g;
      let m;
      while ((m = re.exec(ln))) {
        const tok = /^\(.*\)$/.test(m[0]) ? m[0].slice(1, -1) : m[0];
        if (isChord(tok)) chords.push({ pos: m.index, name: normalizeChordToken(tok) });
      }
      const nxt = (raw[i + 1] || '').replace(/\s+$/, '');
      if (nxt.trim() && !isChordLine(nxt) && !SECTION_RE.test(nxt) && !/^\s*[eBGDAE]\|/.test(nxt)) {
        const lead = nxt.length - nxt.trimStart().length;
        const t = nxt.slice(lead);
        const snapped = chords.map((c) => {
          let p = c.pos - lead;
          if (p < 0) p = 0;
          while (p < t.length && t[p] === ' ') p++;
          return { pos: Math.min(p, t.length), name: c.name };
        });
        lines.push({ type: 'lyric', text: t, chords: dedupePos(snapped) });
        i++;
        continue;
      }
      lines.push({ type: 'chords', text: '', chords: chords.map((c, k) => ({ name: c.name, pos: k })) });
      continue;
    }
    // ligne "Titre - Artiste" en tête de grille copiée
    lines.push({ type: 'lyric', text: ln.trim(), chords: [] });
  }
  return { meta, lines: tidy(lines) };
}

function dedupePos(chords) {
  // deux accords sur la même lettre : on décale le second d'un caractère
  const out = [];
  for (const c of chords) {
    if (out.length && c.pos <= out[out.length - 1].pos) out.push({ ...c, pos: out[out.length - 1].pos + 1 });
    else out.push(c);
  }
  return out;
}

function cap(s) { return s ? s[0].toUpperCase() + s.slice(1) : s; }

function tidy(lines) {
  const out = [];
  for (const l of lines) {
    if (l.type === 'blank' && (!out.length || out[out.length - 1].type === 'blank')) continue;
    out.push(l);
  }
  while (out.length && out[out.length - 1].type === 'blank') out.pop();
  return out;
}

/** Repère les refrains : strophes répétées à l'identique (au moins 2 lignes). */
function markChorus(lines) {
  if (lines.some((l) => l.type === 'section' && l.kind === 'chorus')) {
    // propage le marqueur chorus aux lignes qui suivent une section refrain
    let inC = false;
    for (const l of lines) {
      if (l.type === 'section') inC = l.kind === 'chorus';
      else if (inC && l.type !== 'blank') l.chorus = true;
      else if (l.type === 'blank' && !l.chorusKeep) { /* une strophe peut contenir des blancs */ }
    }
    return;
  }
  const stanzas = [];
  let cur = [];
  lines.forEach((l, i) => {
    if (l.type === 'lyric') cur.push(i);
    else if ((l.type === 'blank' || l.type === 'section') && cur.length) { stanzas.push(cur); cur = []; }
  });
  if (cur.length) stanzas.push(cur);
  const sig = stanzas.map((s) => s.map((i) => normText(lines[i].text)).join('|'));
  const counts = {};
  sig.forEach((s, k) => { if (stanzas[k].length >= 2) counts[s] = (counts[s] || 0) + 1; });
  stanzas.forEach((s, k) => { if (counts[sig[k]] >= 2) s.forEach((i) => { lines[i].chorus = true; }); });
}

// ─────────────────────────────────────────────────────────── écriture ──

export function toChordPro(doc, { withMeta = true } = {}) {
  const out = [];
  const m = doc.meta || {};
  if (withMeta) {
    if (m.title) out.push(`{title: ${m.title}}`);
    if (m.artist) out.push(`{artist: ${m.artist}}`);
    if (m.key) out.push(`{key: ${m.key}}`);
    if (m.capo) out.push(`{capo: ${m.capo}}`);
    if (m.bpm) out.push(`{tempo: ${Math.round(m.bpm)}}`);
    if (out.length) out.push('');
  }
  let chorusOpen = false;
  const closeChorus = () => { if (chorusOpen) { out.push('{end_of_chorus}'); chorusOpen = false; } };
  for (const l of doc.lines) {
    if (l.type === 'section') {
      closeChorus();
      if (out.length && out[out.length - 1] !== '') out.push('');
      if (l.kind === 'chorus' && l.explicit) { out.push(l.label && l.label !== 'Refrain' ? `{start_of_chorus: ${l.label}}` : '{start_of_chorus}'); chorusOpen = true; }
      else out.push(`{comment: ${l.label}}`);
    } else if (l.type === 'blank') {
      if (out.length && out[out.length - 1] !== '') out.push('');
    } else if (l.type === 'chords') {
      out.push(l.chords.map((c) => `[${c.name}]`).join(' '));
    } else {
      out.push(renderChordProLine(l.text, l.chords));
    }
  }
  closeChorus();
  return out.join('\n').replace(/\n{3,}/g, '\n\n').trim() + '\n';
}

function renderChordProLine(text, chords) {
  const inside = chords.filter((c) => c.pos < text.length).sort((a, b) => a.pos - b.pos);
  const after = chords.filter((c) => c.pos >= text.length);
  let res = '', last = 0;
  for (const c of inside) { res += text.slice(last, c.pos) + `[${c.name}]`; last = c.pos; }
  res += text.slice(last);
  for (const c of after) res += ` [${c.name}]`;
  return res;
}

const fmtTs = (t) => {
  const m = Math.floor(t / 60);
  const s = t - m * 60;
  return `${String(m).padStart(2, '0')}:${s.toFixed(2).padStart(5, '0')}`;
};

/** Export LRC (avec horodatage mot à mot « enhanced LRC » si disponible). */
export function toLRC(doc, { words = true } = {}) {
  const out = [];
  if (doc.meta?.title) out.push(`[ti:${doc.meta.title}]`);
  if (doc.meta?.artist) out.push(`[ar:${doc.meta.artist}]`);
  for (const l of doc.lines) {
    if (l.type !== 'lyric' || l.s == null) continue;
    if (words && l.words?.length) {
      const toks = tokenize(l.text);
      out.push(`[${fmtTs(l.s)}]` + toks.map((t, i) => (l.words[i] ? `<${fmtTs(l.words[i].s)}>` : '') + t.w).join(' '));
    } else out.push(`[${fmtTs(l.s)}]${l.text}`);
  }
  return out.join('\n') + '\n';
}

/** Lit un LRC (y compris mots horodatés <mm:ss.xx>). Retourne [{ s, text, words? }]. */
export function parseLRC(text) {
  const out = [];
  const meta = {};
  for (const ln of String(text || '').split(/\r?\n/)) {
    const tag = /^\[(ti|ar|al|length|offset):(.*)\]$/i.exec(ln.trim());
    if (tag) { meta[tag[1].toLowerCase()] = tag[2].trim(); continue; }
    const stamps = [...ln.matchAll(/\[(\d+):(\d+(?:\.\d+)?)\]/g)];
    if (!stamps.length) continue;
    const body = ln.replace(/\[[^\]]*\]/g, '');
    const wordTimes = [];
    const plain = body.replace(/<(\d+):(\d+(?:\.\d+)?)>\s*([^<]*)/g, (_, m, s, w) => {
      if (w.trim()) wordTimes.push({ s: +m * 60 + +s, w: w.trim() });
      return w;
    }).replace(/\s+/g, ' ').trim();
    for (const st of stamps) {
      const s = +st[1] * 60 + +st[2];
      out.push({ s, text: plain, words: wordTimes.length ? wordTimes : null });
    }
  }
  const offset = meta.offset ? +meta.offset / 1000 : 0;
  out.forEach((l) => { l.s -= offset; l.words?.forEach((w) => { w.s -= offset; }); });
  out.sort((a, b) => a.s - b.s);
  return { meta: { title: meta.ti, artist: meta.ar }, lines: out.filter((l) => l.text) };
}

// ──────────────────────────────────────────────────── synchronisation ──

/** Aligne deux suites de chaînes (LCS) ; retourne des paires [i, j]. */
export function alignSequences(a, b, eq = (x, y) => x === y) {
  const n = a.length, m = b.length;
  const dp = Array.from({ length: n + 1 }, () => new Uint16Array(m + 1));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i][j] = eq(a[i], b[j]) ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }
  const pairs = [];
  let i = 0, j = 0;
  while (i < n && j < m) {
    if (eq(a[i], b[j])) { pairs.push([i, j]); i++; j++; }
    else if (dp[i + 1][j] >= dp[i][j + 1]) i++;
    else j++;
  }
  return pairs;
}

function similar(x, y) {
  if (x === y) return true;
  if (!x || !y) return false;
  // tolérance : 80 % des mots en commun
  const a = x.split(' '), b = y.split(' ');
  const sb = new Set(b);
  const common = a.filter((w) => sb.has(w)).length;
  return common / Math.max(a.length, b.length) >= 0.8;
}

/**
 * Pose des temps venant d'ailleurs (LRC, song.json, ancienne version) sur les
 * lignes de paroles de la partition. timed = [{ text, s, e?, words?: [{w?, s, e?}] }]
 */
export function attachTimings(lines, timed) {
  const lyr = lines.map((l, i) => [l, i]).filter(([l]) => l.type === 'lyric');
  const pairs = alignSequences(lyr.map(([l]) => normText(l.text)), timed.map((t) => normText(t.text)), similar);
  for (const [i, j] of pairs) {
    const line = lyr[i][0];
    const t = timed[j];
    line.s = t.s;
    const toks = tokenize(line.text);
    if (t.words?.length) {
      line.words = mapWords(toks, t.words, t);
    } else {
      line.words = null;
    }
    line.e = t.e ?? (line.words?.length ? line.words[line.words.length - 1].e : undefined);
  }
  fillLineEnds(lines);
  return pairs.length;
}

function mapWords(toks, words, t) {
  const tw = words.map((w) => normText(w.w ?? ''));
  const uw = toks.map((x) => normText(x.w));
  let res;
  if (tw.every((x) => x) && tw.length) {
    res = new Array(toks.length).fill(null);
    for (const [i, j] of alignSequences(uw, tw)) res[i] = { s: words[j].s, e: words[j].e ?? null };
  } else if (words.length === toks.length) {
    res = words.map((w) => ({ s: w.s, e: w.e ?? null }));
  } else return null;
  return interpolateWords(res, t.s, t.e);
}

/** Complète les mots sans temps par interpolation ; garantit s croissant. */
export function interpolateWords(res, lineS, lineE) {
  const n = res.length;
  if (!n) return [];
  const known = res.map((w, i) => (w ? i : -1)).filter((i) => i >= 0);
  if (!known.length) {
    if (lineS == null) return null;
    const end = lineE ?? lineS + Math.max(1.5, n * 0.35);
    const step = (end - lineS) / n;
    return res.map((_, i) => ({ s: lineS + i * step, e: lineS + (i + 1) * step }));
  }
  for (let i = 0; i < n; i++) {
    if (res[i]) continue;
    const p = known.filter((k) => k < i).pop();
    const q = known.find((k) => k > i);
    if (p !== undefined && q !== undefined) {
      const a = res[p].e ?? res[p].s + 0.2;
      const f = (i - p) / (q - p);
      res[i] = { s: a + f * (res[q].s - a), e: null };
    } else if (p !== undefined) res[i] = { s: (res[p].e ?? res[p].s + 0.25) + 0.25 * (i - p - 1), e: null };
    else res[i] = { s: Math.max(lineS ?? 0, res[q].s - 0.3 * (q - i)), e: null };
  }
  for (let i = 0; i < n; i++) {
    if (i && res[i].s < res[i - 1].s) res[i].s = res[i - 1].s;
    if (res[i].e == null || res[i].e <= res[i].s) res[i].e = i + 1 < n ? Math.max(res[i].s + 0.05, Math.min(res[i + 1]?.s ?? res[i].s + 0.4, res[i].s + 1.2)) : res[i].s + 0.45;
  }
  return res;
}

/** Fin de ligne manquante = début de la suivante (borné). */
export function fillLineEnds(lines) {
  const timed = lines.filter((l) => l.type === 'lyric' && l.s != null);
  timed.forEach((l, k) => {
    const next = timed[k + 1];
    if (l.words?.length) l.e = Math.max(l.e ?? 0, l.words[l.words.length - 1].e);
    if (l.e == null) l.e = next ? Math.min(next.s, l.s + 8) : l.s + 5;
    if (!l.words?.length) {
      const toks = tokenize(l.text);
      const dur = Math.max(0.6, Math.min(l.e, next ? next.s : l.e) - l.s) * 0.92;
      l.words = toks.map((_, i) => ({ s: l.s + (i * dur) / toks.length, e: l.s + ((i + 1) * dur) / toks.length, est: true }));
    }
  });
}

/** Garde la synchro lors d'une modification du texte (éditeur). */
export function carryTimings(oldLines, newLines) {
  const oldLyr = oldLines.filter((l) => l.type === 'lyric' && l.s != null);
  attachTimings(newLines, oldLyr.map((l) => {
    const toks = tokenize(l.text);
    return { text: l.text, s: l.s, e: l.e, words: l.words?.length === toks.length ? toks.map((t, i) => ({ w: t.w, s: l.words[i].s, e: l.words[i].e })) : null };
  }));
  // lignes d'accords seuls : on reprend leurs temps dans l'ordre
  const oldC = oldLines.filter((l) => l.type === 'chords');
  const newC = newLines.filter((l) => l.type === 'chords');
  const sigO = oldC.map((l) => l.chords.map((c) => c.name).join(' '));
  const sigN = newC.map((l) => l.chords.map((c) => c.name).join(' '));
  for (const [i, j] of alignSequences(sigN, sigO)) newC[i].chords.forEach((c, k) => { c.t = oldC[j].chords[k]?.t; });
}

/**
 * Calcule la ligne de temps des accords : chaque accord reçoit un temps t
 * (d'après les mots de sa ligne, ou son temps propre pour les lignes d'accords).
 * Retourne [{ name, t, e, li, ci }].
 */
export function chordTimeline(doc, duration, fallback = null) {
  const ev = [];
  doc.lines.forEach((l, li) => {
    if (l.type === 'lyric' && l.chords.length) {
      const toks = tokenize(l.text);
      l.chords.forEach((c, ci) => {
        let t = c.t ?? null;
        if (t == null && l.words?.length && toks.length) {
          let k = 0;
          for (let i = 0; i < toks.length; i++) if (toks[i].start <= c.pos) k = i;
          const w = l.words[k];
          const tk = toks[k];
          if (c.pos >= tk.end) t = (w.e ?? w.s + 0.3) + 0.1;
          else t = w.s + ((c.pos - tk.start) / Math.max(1, tk.end - tk.start)) * ((w.e ?? w.s + 0.3) - w.s);
          if (c.pos === 0 && k === 0) t = Math.min(t, w.s);
        }
        ev.push({ name: c.name, t, li, ci });
      });
    } else if (l.type === 'chords') {
      l.chords.forEach((c, ci) => ev.push({ name: c.name, t: c.t ?? null, li, ci }));
    }
  });
  if (!ev.length) return fallback ? fallback.map((c) => ({ name: c.name, t: c.s, e: c.e, li: -1, ci: -1 })) : [];
  if (ev.every((e) => e.t == null)) {
    // pas de synchro : on garde l'ordre, sans temps (sauf si une détection audio existe)
    if (fallback?.length) return fallback.map((c) => ({ name: c.name, t: c.s, e: c.e, li: -1, ci: -1 }));
    return ev.map((e) => ({ ...e, t: null, e: null }));
  }
  // accords sans temps (intro, pont instrumental…) : répartis dans le trou,
  // ou calés sur la détection audio si elle existe pour ce trou
  let i = 0;
  while (i < ev.length) {
    if (ev[i].t != null) { i++; continue; }
    let j = i;
    while (j < ev.length && ev[j].t == null) j++;
    const t0 = i > 0 ? ev[i - 1].t + 1.5 : 0;
    const t1 = j < ev.length ? ev[j].t : (duration || t0 + (j - i) * 2);
    const det = fallback?.filter((c) => c.s >= t0 - 0.5 && c.s < t1 - 0.3) || [];
    if (det.length >= j - i && det.length && sameNames(det.map((c) => c.name), ev.slice(i, j).map((e) => e.name))) {
      for (let k = i; k < j; k++) ev[k].t = det[k - i].s;
    } else {
      const step = Math.max((t1 - t0) / (j - i), 0.4);
      for (let k = i; k < j; k++) ev[k].t = t0 + (k - i) * step;
    }
    i = j;
  }
  ev.sort((a, b) => a.t - b.t);
  for (let k = 0; k < ev.length; k++) ev[k].e = k + 1 < ev.length ? ev[k + 1].t : (duration || ev[k].t + 4);
  return ev;
}

function sameNames(a, b) {
  // les noms peuvent différer (détection imparfaite) : on vérifie juste le nombre
  return a.length >= b.length;
}

// ─────────────────────────────────────────────────── formats MusiMix ──

/** Partition à partir d'un song.json (musimix-1 ou musimix-3) + .cho éventuel. */
export function docFromSongJson(json, choText) {
  if (json.format === 'musimix-3' && Array.isArray(json.lines) && json.lines.some((l) => l.type)) {
    const lines = json.lines.map((l) => ({
      type: l.type, text: l.text || '', label: l.label, kind: l.kind, chorus: l.chorus || undefined, explicit: l.explicit,
      chords: (l.chords || []).map((c) => ({ pos: c.pos, name: c.name, t: c.t ?? undefined })),
      words: l.words ? l.words.map((w) => ({ s: w.s, e: w.e })) : undefined, s: l.s, e: l.e,
    }));
    if (!lines.some((l) => l.chorus)) markChorus(lines);
    fillLineEnds(lines);
    return { meta: { title: json.title, artist: json.artist, key: json.key, capo: +json.capo || 0, bpm: json.bpm }, lines };
  }
  // musimix-1 : lignes datées + accords datés, la mise en page vient du .cho
  const doc = choText ? parseSheet(choText) : { meta: {}, lines: [] };
  if (!doc.lines.some((l) => l.type === 'lyric') && json.lines?.length) {
    doc.lines = json.lines.map((l) => ({ type: 'lyric', text: l.text, chords: [] }));
  }
  if (json.lines?.length) {
    attachTimings(doc.lines, json.lines.map((l) => ({ text: l.text, s: l.s, e: l.e, words: l.words?.map((w) => ({ w: w.w, s: w.s, e: w.e })) })));
  }
  doc.meta = { ...doc.meta, title: doc.meta.title || json.title, artist: doc.meta.artist || json.artist, key: doc.meta.key || json.key, capo: +(doc.meta.capo || json.capo || 0), bpm: json.bpm };
  return doc;
}

export function docToSongJson(doc, extra = {}) {
  return {
    format: 'musimix-3',
    title: doc.meta.title || '', artist: doc.meta.artist || '', key: doc.meta.key || '', capo: doc.meta.capo || 0, bpm: doc.meta.bpm || null,
    ...extra,
    lines: doc.lines.map((l) => {
      const o = { type: l.type };
      if (l.text) o.text = l.text;
      if (l.label) o.label = l.label;
      if (l.kind) o.kind = l.kind;
      if (l.explicit) o.explicit = true;
      if (l.chorus) o.chorus = true;
      if (l.chords?.length) o.chords = l.chords.map((c) => (c.t != null ? { pos: c.pos, name: c.name, t: r3(c.t) } : { pos: c.pos, name: c.name }));
      if (l.s != null) { o.s = r3(l.s); o.e = r3(l.e); }
      if (l.words?.length && !l.words.every((w) => w.est)) o.words = l.words.map((w) => ({ s: r3(w.s), e: r3(w.e) }));
      return o;
    }),
  };
}

const r3 = (x) => (x == null ? x : Math.round(x * 1000) / 1000);

export function sectionLabelFr(kind) { return SECTION_FR[kind] || 'Couplet'; }

/** Liste des sections avec leur temps de début (pour la timeline et les sauts). */
export function sectionsOf(doc, timeline) {
  const out = [];
  let pending = null;
  const explicitChorus = doc.lines.some((l) => l.type === 'section' && l.kind === 'chorus');
  doc.lines.forEach((l, li) => {
    if (l.type === 'section') pending = { label: l.label || sectionLabelFr(l.kind), kind: l.kind, li };
    else if (l.type === 'lyric' || l.type === 'chords') {
      let t = l.s;
      if (t == null && l.type === 'chords') t = timeline.find((c) => c.li === li)?.t;
      if (t == null && l.type === 'lyric') t = timeline.find((c) => c.li === li)?.t;
      if (pending) { out.push({ ...pending, t: t ?? null }); pending = null; }
      else if (!explicitChorus && l.chorus && t != null && !(out.length && out[out.length - 1].kind === 'chorus' && lastChorusContinues(doc, li))) {
        out.push({ label: 'Refrain', kind: 'chorus', li, t, auto: true });
      }
    }
  });
  return out.filter((s) => s.t != null).sort((a, b) => a.t - b.t);
}

function lastChorusContinues(doc, li) {
  for (let k = li - 1; k >= 0; k--) {
    const l = doc.lines[k];
    if (l.type === 'blank' || l.type === 'section') return false;
    if (l.type === 'lyric') return !!l.chorus;
  }
  return false;
}

/**
 * Place des accords datés (détection audio ou MIDI) dans des paroles datées :
 * accords au-dessus des mots, et lignes d'accords seuls dans les passages instrumentaux.
 */
export function placeChords(lines, chords, beat = 0.5) {
  const timed = lines.filter((l) => l.type === 'lyric' && l.words?.length && l.s != null);
  if (!timed.length) {
    const out = [...lines];
    if (chords.length) {
      out.push({ type: 'section', label: 'Accords', kind: 'instrumental', chords: [] });
      for (let k = 0; k < chords.length; k += 4) out.push({ type: 'chords', text: '', chords: chords.slice(k, k + 4).map((c, i) => ({ pos: i, name: c.name, t: c.s })) });
    }
    return out;
  }
  const out = [];
  let ci = 0;
  let lastName = null;
  const gap = (t0, t1, label) => {
    const grp = [];
    while (ci < chords.length && chords[ci].s < t1 - 0.25) { if (chords[ci].s >= t0 - 0.05) grp.push(chords[ci]); ci++; }
    if (!grp.length || (grp.length === 1 && grp[0].name === lastName)) return;
    if (t1 - t0 < Math.max(3 * beat, 2.5) && out.length && out[out.length - 1].type === 'lyric') {
      const l = out[out.length - 1];
      grp.forEach((c, k) => l.chords.push({ pos: l.text.length + 1 + k, name: c.name, t: c.s }));
      lastName = grp[grp.length - 1].name;
      return;
    }
    if (label) out.push({ type: 'section', label, kind: label === 'Intro' ? 'intro' : 'outro', chords: [] });
    for (let k = 0; k < grp.length; k += 4) out.push({ type: 'chords', text: '', chords: grp.slice(k, k + 4).map((c, i) => ({ pos: i, name: c.name, t: c.s })) });
    lastName = grp[grp.length - 1].name;
  };
  let lastEnd = 0;
  let first = true;
  for (const l of lines) {
    if (l.type !== 'lyric' || !l.words?.length || l.s == null) { out.push(l); continue; }
    gap(lastEnd, l.s - 0.25, first ? 'Intro' : null);
    first = false;
    const toks = tokenize(l.text);
    const nl = { ...l, chords: [] };
    const cur = [...chords].reverse().find((c) => c.s <= l.s + 0.25);
    if (cur && cur.name !== lastName) nl.chords.push({ pos: 0, name: cur.name, t: Math.max(cur.s, l.s - 0.25) });
    while (ci < chords.length && chords[ci].s < l.s + 0.25) ci++;
    const end = l.e ?? l.words[l.words.length - 1].e;
    while (ci < chords.length && chords[ci].s < end) {
      const c = chords[ci++];
      let k = 0, best = Infinity;
      l.words.forEach((w, i) => { const dd = Math.abs(w.s - c.s); if (dd < best) { best = dd; k = i; } });
      const pos = toks[k]?.start ?? 0;
      nl.chords = nl.chords.filter((x) => x.pos !== pos);
      if (!nl.chords.length || nl.chords[nl.chords.length - 1].name !== c.name) nl.chords.push({ pos, name: c.name, t: c.s });
    }
    nl.chords.sort((a, b) => a.pos - b.pos);
    if (nl.chords.length) lastName = nl.chords[nl.chords.length - 1].name;
    out.push(nl);
    lastEnd = end;
  }
  gap(lastEnd, 1e9, 'Fin');
  return out;
}
