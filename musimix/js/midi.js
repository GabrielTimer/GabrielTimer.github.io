// MusiMix — fichiers MIDI : lecture (SMF 0/1, karaoké .kar), accords d'après les notes, écriture.

import { SHARP, spelling } from './theory.js';

// ─────────────────────────────────────────────────────────── lecture ──

export function parseMidi(buf) {
  const d = new DataView(buf instanceof ArrayBuffer ? buf : buf.buffer);
  let p = 0;
  const str = (n) => { let s = ''; for (let i = 0; i < n; i++) s += String.fromCharCode(d.getUint8(p + i)); return s; };
  // certains fichiers ont un en-tête RIFF (RMID)
  if (str(4) === 'RIFF') { while (p < d.byteLength - 4 && str(4) !== 'MThd') p++; }
  if (str(4) !== 'MThd') throw new Error('Ce fichier n’est pas un MIDI valide.');
  const hlen = d.getUint32(p + 4);
  const format = d.getUint16(p + 8);
  const ntrks = d.getUint16(p + 10);
  const division = d.getUint16(p + 12);
  if (division & 0x8000) throw new Error('MIDI au format SMPTE non géré.');
  p += 8 + hlen;
  const tracks = [];
  for (let t = 0; t < ntrks && p < d.byteLength - 8; t++) {
    if (str(4) !== 'MTrk') { p += 8 + d.getUint32(p + 4); t--; continue; }
    const len = d.getUint32(p + 4);
    const end = p + 8 + len;
    p += 8;
    const events = [];
    let tick = 0, status = 0;
    const vlq = () => { let v = 0, b; do { b = d.getUint8(p++); v = (v << 7) | (b & 0x7f); } while (b & 0x80); return v; };
    while (p < end) {
      tick += vlq();
      let b = d.getUint8(p);
      if (b & 0x80) { status = b; p++; } else if (status < 0x80) { p++; continue; }
      if (status === 0xff) {
        const type = d.getUint8(p++);
        const l = vlq();
        const bytes = new Uint8Array(d.buffer, d.byteOffset + p, l);
        events.push({ tick, meta: type, bytes: bytes.slice() });
        p += l;
        status = 0;
      } else if (status === 0xf0 || status === 0xf7) {
        p += vlq();
        status = 0;
      } else {
        const type = status >> 4, ch = status & 15;
        const a = d.getUint8(p++);
        const two = type !== 0xc && type !== 0xd;
        const v = two ? d.getUint8(p++) : 0;
        events.push({ tick, type, ch, a, v });
      }
    }
    p = end;
    tracks.push(events);
  }
  return interpret({ format, division, tracks });
}

const latin = new TextDecoder('latin1');
function text(bytes) {
  try { return new TextDecoder('utf-8', { fatal: true }).decode(bytes); } catch { return latin.decode(bytes); }
}

function interpret({ division, tracks }) {
  // carte des tempos (toutes pistes confondues)
  const tempos = [{ tick: 0, us: 500000 }];
  let timeSig = [4, 4];
  for (const ev of tracks.flat()) {
    if (ev.meta === 0x51 && ev.bytes.length >= 3) tempos.push({ tick: ev.tick, us: (ev.bytes[0] << 16) | (ev.bytes[1] << 8) | ev.bytes[2] });
    if (ev.meta === 0x58 && ev.bytes.length >= 2 && ev.tick === 0) timeSig = [ev.bytes[0], 2 ** ev.bytes[1]];
  }
  tempos.sort((a, b) => a.tick - b.tick);
  const tmap = [];
  let sec = 0, lastTick = 0, us = 500000;
  for (const t of tempos) {
    sec += ((t.tick - lastTick) * us) / division / 1e6;
    lastTick = t.tick; us = t.us;
    tmap.push({ tick: t.tick, sec, us });
  }
  const toSec = (tick) => {
    let k = tmap.length - 1;
    while (k > 0 && tmap[k].tick > tick) k--;
    const m = tmap[k];
    return m.sec + ((tick - m.tick) * m.us) / division / 1e6;
  };
  const out = { division, timeSig, tempos: tmap, tracks: [], lyrics: [], texts: [], duration: 0 };
  tracks.forEach((events, ti) => {
    let name = '';
    const programs = {};
    const open = {};
    const notes = [];
    for (const ev of events) {
      if (ev.meta === 0x03 && !name) name = text(ev.bytes).trim();
      else if (ev.meta === 0x05) out.lyrics.push({ t: toSec(ev.tick), text: text(ev.bytes), track: ti });
      else if (ev.meta === 0x01) out.texts.push({ t: toSec(ev.tick), text: text(ev.bytes), track: ti });
      else if (ev.type === 0xc) programs[ev.ch] = programs[ev.ch] ?? ev.a;
      else if (ev.type === 0x9 && ev.v > 0) {
        (open[ev.ch * 128 + ev.a] ||= []).push({ tick: ev.tick, vel: ev.v });
      } else if (ev.type === 0x8 || (ev.type === 0x9 && ev.v === 0)) {
        const st = open[ev.ch * 128 + ev.a]?.shift();
        if (st) {
          const t = toSec(st.tick), e = toSec(ev.tick);
          notes.push({ t, d: Math.max(0.02, e - t), pitch: ev.a, vel: st.vel / 127, ch: ev.ch, program: programs[ev.ch] ?? 0 });
        }
      }
    }
    if (notes.length) {
      notes.sort((a, b) => a.t - b.t);
      out.tracks.push({ index: ti, name, notes, channels: [...new Set(notes.map((n) => n.ch))] });
      out.duration = Math.max(out.duration, ...notes.slice(-50).map((n) => n.t + n.d));
    }
  });
  // morceau en piste unique (format 0) : on sépare par canal
  if (out.tracks.length === 1 && out.tracks[0].channels.length > 1) {
    const tr = out.tracks[0];
    out.tracks = tr.channels.map((ch) => ({ index: tr.index, name: '', notes: tr.notes.filter((n) => n.ch === ch), channels: [ch] }));
  }
  const bpm = 60e6 / (tmap.find((t) => t.tick > 0 || tmap.length === 1)?.us || tmap[0].us);
  out.bpm = Math.round(60e6 / tmap[tmap.length > 1 && tmap[0].tick === 0 && tmap[1].tick === 0 ? 1 : 0].us * 10) / 10 || Math.round(bpm);
  // temps et premiers temps de mesure
  const beats = [], downbeats = [];
  const beatTicks = division * (4 / timeSig[1]);
  const endTick = ticksAt(out.duration + 1);
  function ticksAt(s) { let k = tmap.length - 1; while (k > 0 && tmap[k].sec > s) k--; const m = tmap[k]; return m.tick + ((s - m.sec) * 1e6 * division) / m.us; }
  for (let tk = 0, i = 0; tk <= endTick; tk += beatTicks, i++) {
    const s = toSec(tk);
    beats.push(Math.round(s * 1000) / 1000);
    if (i % timeSig[0] === 0) downbeats.push(Math.round(s * 1000) / 1000);
  }
  out.beats = beats;
  out.downbeats = downbeats;
  return out;
}

// ───────────────────────────────────────────── familles d'instruments ──

const VOICE_RE = /(voc|voix|voice|chant|melod|lead|vocal|canto|singer|lyric)/i;

/** Classe chaque piste MIDI : drums, bass, guitar, piano, vocals (mélodie), other. */
export function familyOf(track, lyricTracks = new Set()) {
  const ch = track.channels[0];
  const prog = track.notes[0]?.program ?? 0;
  if (track.channels.includes(9)) return 'drums';
  if (lyricTracks.has(track.index) || VOICE_RE.test(track.name)) return 'vocals';
  if (/bass|basse|baixo/i.test(track.name) || (prog >= 32 && prog <= 39)) return 'bass';
  if (/guit|gtr|violão/i.test(track.name) || (prog >= 24 && prog <= 31)) return 'guitar';
  if (/piano|key|organ|orgue|rhodes/i.test(track.name) || prog <= 23) return 'piano';
  return ch === 9 ? 'drums' : 'other';
}

// ───────────────────────────────────────────────────── paroles .kar ──

/** Paroles karaoké → lignes MusiMix { type:'lyric', text, words:[{s,e}] }. */
export function karaokeLines(mid) {
  let ev = mid.lyrics.length >= 8 ? mid.lyrics : [];
  if (!ev.length) {
    // .kar classique : textes (méta 0x01) dans une piste, hors en-têtes « @ »
    const byTrack = {};
    for (const x of mid.texts) if (!x.text.startsWith('@')) (byTrack[x.track] ||= []).push(x);
    ev = Object.values(byTrack).sort((a, b) => b.length - a.length)[0] || [];
    if (ev.length < 8) return [];
  }
  const lines = [];
  let cur = null;
  const flush = () => { if (cur && cur.text.trim()) lines.push(cur); cur = null; };
  for (const { t, text: raw } of ev) {
    let s = raw.replace(/\r\n?/g, '\n');
    let newPara = false, newLine = false;
    if (s.startsWith('\\')) { newPara = true; s = s.slice(1); } else if (s.startsWith('/')) { newLine = true; s = s.slice(1); }
    if (/^\n/.test(s)) { newLine = true; s = s.replace(/^\n+/, ''); }
    const endBreak = /\n$/.test(s);
    s = s.replace(/\n/g, ' ');
    if (newPara || newLine) { flush(); if (newPara && lines.length) lines.push({ blank: true }); }
    if (!s) { if (endBreak) flush(); continue; }
    if (!cur) { cur = { text: '', sylls: [] }; s = s.replace(/^\s+/, ''); }
    cur.sylls.push({ at: cur.text.length, t });
    cur.text += s;
    if (endBreak) flush();
  }
  flush();
  // mots : début = première syllabe, fin = syllabe suivante
  const out = [];
  const flat = [];
  for (const l of lines) {
    if (l.blank) { out.push({ type: 'blank', chords: [] }); continue; }
    const text = l.text.replace(/\s+/g, ' ').trim();
    const words = [];
    for (const tk of l.text.matchAll(/\S+/g)) {
      // dernière syllabe commencée au plus tard au début du mot
      let syl = l.sylls[0];
      for (const x of l.sylls) if (x.at <= tk.index) syl = x;
      words.push({ s: syl.t, e: null });
    }
    const line = { type: 'lyric', text, chords: [], words };
    out.push(line);
    flat.push(...words);
  }
  for (let i = 0; i < flat.length; i++) {
    const nxt = flat[i + 1]?.s;
    flat[i].e = nxt != null && nxt - flat[i].s < 1.6 ? nxt : flat[i].s + 0.6;
    if (flat[i].e <= flat[i].s) flat[i].e = flat[i].s + 0.15;
  }
  for (const l of out) if (l.type === 'lyric' && l.words.length) { l.s = l.words[0].s; l.e = l.words[l.words.length - 1].e; }
  return out;
}

// ───────────────────────────────────────────────── accords des notes ──

const QUALS = [
  ['', [0, 4, 7], 1], ['m', [0, 3, 7], 1], ['7', [0, 4, 7, 10], 0.97], ['maj7', [0, 4, 7, 11], 0.97],
  ['m7', [0, 3, 7, 10], 0.97], ['sus4', [0, 5, 7], 0.93], ['sus2', [0, 2, 7], 0.92], ['dim', [0, 3, 6], 0.92],
  ['m7b5', [0, 3, 6, 10], 0.94], ['6', [0, 4, 7, 9], 0.9], ['m6', [0, 3, 7, 9], 0.9], ['aug', [0, 4, 8], 0.88],
];

/** Accords par temps d'après les notes (hors batterie et mélodie chantée). */
export function chordsFromNotes(mid, families) {
  const notes = mid.tracks.filter((t) => !['drums', 'vocals'].includes(families.get(t))).flatMap((t) => t.notes);
  if (!notes.length || !mid.beats.length) return [];
  const beats = mid.beats;
  const prof = beats.map(() => new Float32Array(12));
  const bass = beats.map(() => ({ p: 200, w: 0 }));
  for (const n of notes) {
    let i = Math.max(0, upper(beats, n.t) - 1);
    for (; i < beats.length && beats[i] < n.t + n.d; i++) {
      const a = Math.max(n.t, beats[i]), b = Math.min(n.t + n.d, beats[i + 1] ?? beats[i] + 0.5);
      if (b <= a) continue;
      const w = (b - a) * (0.5 + n.vel) * (n.pitch < 55 ? 1.4 : 1);
      prof[i][n.pitch % 12] += w;
      if (n.pitch < bass[i].p) bass[i] = { p: n.pitch, w };
    }
  }
  const total = new Float32Array(12);
  prof.forEach((v) => v.forEach((x, k) => { total[k] += x; }));
  const key = keyOf(total);
  const names = spelling(key);
  const labels = [];
  for (let i = 0; i < beats.length; i++) {
    const v = prof[i];
    const sum = v.reduce((a, b) => a + b, 0);
    if (sum < 1e-3) { labels.push(null); continue; }
    let best = null, bs = -1;
    for (let r = 0; r < 12; r++) {
      for (const [suf, ivs, w] of QUALS) {
        let inn = 0;
        for (const iv of ivs) inn += v[(r + iv) % 12];
        const out = sum - inn;
        let sc = (inn / sum - 0.6 * out / sum) * w;
        if (bass[i].p < 200 && bass[i].p % 12 === r) sc += 0.08;
        if (sc > bs) { bs = sc; best = { r, suf, ivs }; }
      }
    }
    let name = names[best.r] + best.suf;
    const bp = bass[i].p % 12;
    if (bass[i].p < 200 && bp !== best.r && best.ivs.some((iv) => (best.r + iv) % 12 === bp)) name += '/' + names[bp];
    labels.push(name);
  }
  // lissage : un accord d'un seul temps entouré du même voisin disparaît
  for (let i = 1; i < labels.length - 1; i++) if (labels[i] !== labels[i - 1] && labels[i - 1] === labels[i + 1]) labels[i] = labels[i - 1];
  const out = [];
  labels.forEach((n, i) => {
    if (!n) return;
    const s = beats[i], e = beats[i + 1] ?? s + 0.5;
    if (out.length && out[out.length - 1].name === n && Math.abs(out[out.length - 1].e - s) < 0.05) out[out.length - 1].e = e;
    else out.push({ name: n, s: Math.round(s * 1000) / 1000, e: Math.round(e * 1000) / 1000 });
  });
  return out;
}

function keyOf(prof) {
  const MAJ = [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88];
  const MIN = [6.33, 2.68, 3.52, 5.38, 2.6, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17];
  let best = { pc: 0, minor: false }, bs = -Infinity;
  for (let r = 0; r < 12; r++) for (const [minor, p] of [[false, MAJ], [true, MIN]]) {
    let s = 0;
    for (let i = 0; i < 12; i++) s += prof[(r + i) % 12] * p[i];
    if (s > bs) { bs = s; best = { pc: r, minor }; }
  }
  return best;
}

export function keyNameOf(mid, families) {
  const total = new Float32Array(12);
  for (const t of mid.tracks) if (families.get(t) !== 'drums') for (const n of t.notes) total[n.pitch % 12] += n.d;
  const k = keyOf(total);
  return spelling(k)[k.pc] + (k.minor ? 'm' : '');
}

function upper(arr, x) { let lo = 0, hi = arr.length; while (lo < hi) { const m = (lo + hi) >> 1; if (arr[m] <= x) lo = m + 1; else hi = m; } return lo; }

// ─────────────────────────────────────────────────────────── écriture ──

/**
 * Fichier MIDI (format 1) : tempo, accords (canal 1, piano), basse (canal 2).
 * chords = [{ name, t, e }] en secondes ; bpm constant.
 */
export function writeChordMidi(chords, { bpm = 120, title = '', parseChord, keyNotes } = {}) {
  const PPQ = 480;
  const toTick = (s) => Math.max(0, Math.round((s * bpm / 60) * PPQ));
  const tempoUs = Math.round(60e6 / bpm);
  const meta = [
    ...metaEv(0, 0x03, enc(title || 'MusiMix')),
    ...metaEv(0, 0x51, [(tempoUs >> 16) & 255, (tempoUs >> 8) & 255, tempoUs & 255]),
    ...metaEv(0, 0x58, [4, 2, 24, 8]),
  ];
  const evC = [], evB = [];
  for (const c of chords) {
    if (c.t == null) continue;
    const ch = parseChord(c.name);
    if (!ch) continue;
    const a = toTick(c.t), b = Math.max(a + 60, toTick(c.e ?? c.t + 2) - 10);
    // accord serré autour du do central (4 notes max : polyphonie du R20)
    let ivs = [...new Set(ch.intervals.map((i) => i % 12))];
    if (ivs.length > 4) ivs = ivs.filter((i) => i !== 7).slice(0, 4);
    let root = 60 + ch.root;
    if (root > 65) root -= 12;
    for (const iv of ivs) { evC.push([a, 0x90, root + iv, 82]); evC.push([b, 0x80, root + iv, 0]); }
    const bn = 36 + (ch.bass ?? ch.root);
    evB.push([a, 0x91, bn, 96]); evB.push([b, 0x81, bn, 0]);
  }
  const trackOf = (name, prog, chn, evs) => {
    evs.sort((x, y) => x[0] - y[0] || (x[1] & 0xf0) - (y[1] & 0xf0));
    const bytes = [...metaEv(0, 0x03, enc(name)), 0, 0xc0 | chn, prog];
    let last = 0;
    for (const [t, st, n, v] of evs) { bytes.push(...vlq(t - last), st, n, v); last = t; }
    bytes.push(0, 0xff, 0x2f, 0);
    return bytes;
  };
  const t0 = [...meta, 0, 0xff, 0x2f, 0];
  const t1 = trackOf('Accords', 0, 0, evC);
  const t2 = trackOf('Basse', 33, 1, evB);
  const chunks = [[0x4d, 0x54, 0x68, 0x64, 0, 0, 0, 6, 0, 1, 0, 3, PPQ >> 8, PPQ & 255]];
  for (const t of [t0, t1, t2]) chunks.push([0x4d, 0x54, 0x72, 0x6b, ...u32(t.length), ...t]);
  return new Blob([new Uint8Array(chunks.flat())], { type: 'audio/midi' });
}

function metaEv(delta, type, data) { return [...vlq(delta), 0xff, type, ...vlq(data.length), ...data]; }
function vlq(n) { const out = [n & 0x7f]; while ((n >>= 7)) out.unshift((n & 0x7f) | 0x80); return out; }
function u32(n) { return [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255]; }
function enc(s) { return [...new TextEncoder().encode(s)]; }

export { SHARP };
