// MusiMix — morceaux : import (audio, pistes, ZIP, grilles, LRC), export, pistes.

import { db, uid } from './db.js';
import { readZip, writeZip } from './zip.js';
import { parseSheet, parseLRC, attachTimings, docFromSongJson, docToSongJson, toChordPro, toLRC, fillLineEnds, placeChords } from './sheet.js';
import { parseMidi, familyOf, karaokeLines, chordsFromNotes, keyNameOf } from './midi.js';
import { renderFamily, SYNTH_RATE } from './synth.js';
import { encodeWav } from './wav.js';

export const STEM_KINDS = {
  vocals: { label: 'Voix', color: 'var(--c-voice)', order: 0 },
  backing: { label: 'Chœurs', color: 'var(--c-voice-2)', order: 1 },
  drums: { label: 'Batterie', color: 'var(--c-rhythm)', order: 2 },
  bass: { label: 'Basse', color: 'var(--c-rhythm-2)', order: 3 },
  guitar: { label: 'Guitare', color: 'var(--c-harmony)', order: 4 },
  piano: { label: 'Piano', color: 'var(--c-harmony-2)', order: 5 },
  other: { label: 'Autres', color: 'var(--c-other)', order: 6 },
  instrumental: { label: 'Instrumental', color: 'var(--c-harmony)', order: 7 },
  mix: { label: 'Morceau', color: 'var(--c-other)', order: 8 },
};

const AUDIO_EXT = /\.(mp3|wav|flac|m4a|aac|ogg|oga|opus|webm|aif|aiff|mp4)$/i;
const MIDI_EXT = /\.(mid|midi|kar|rmi)$/i;
const SHEET_EXT = /\.(cho|chopro|chordpro|crd|pro|txt)$/i;

export function stemKind(filename) {
  const n = filename.toLowerCase().replace(/\.[^.]+$/, '');
  if (/(instrumental|no[ _-]?vocals?|karaoke|accompan|backing[ _-]?track|\binst\b|minus[ _-]?one)/.test(n)) return 'instrumental';
  if (/(backing[ _-]?vocals?|back[ _-]?vocals?|ch(oe|œ)urs?|choir|\bbv\b|harmon(y|ies)\b)/.test(n)) return 'backing';
  if (/(vocals?|voix|voice|chant|lead|acapella|a[ _-]?cappella)/.test(n)) return 'vocals';
  if (/(drums?|batterie|percu)/.test(n)) return 'drums';
  if (/(bass|basse)/.test(n)) return 'bass';
  if (/(guitars?|guitare|gtr)/.test(n)) return 'guitar';
  if (/(piano|keys|keyboard|clavier|synth)/.test(n)) return 'piano';
  if (/(other|autres?|rest)/.test(n)) return 'other';
  return null;
}

export function guessTitleArtist(filename) {
  let n = filename.replace(/\.[^.]+$/, '').replace(/_/g, ' ');
  n = n.replace(/\s*[([](official.*?|lyrics?.*?|audio|video|clip.*?|hd|hq|\d{3,4}p)[)\]]/gi, '');
  n = n.replace(/\((vocals|instrumental|drums|bass|guitar|piano|other|no vocals)\)/gi, '').replace(/^\d+[ .-]+/, '').trim();
  const m = n.split(/\s+[-–—]\s+/);
  if (m.length >= 2) return { artist: m[0].trim(), title: m.slice(1).join(' - ').trim() };
  return { artist: '', title: n.trim() };
}

export function audioDuration(blob) {
  return new Promise((resolve) => {
    const a = new Audio();
    const url = URL.createObjectURL(blob);
    const done = (d) => { URL.revokeObjectURL(url); resolve(isFinite(d) ? d : 0); };
    a.preload = 'metadata';
    a.onloadedmetadata = () => done(a.duration);
    a.onerror = () => done(0);
    setTimeout(() => done(a.duration || 0), 6000);
    a.src = url;
  });
}

export function newSong(fields = {}) {
  return {
    id: uid(),
    title: '', artist: '', duration: 0, key: '', capo: 0, bpm: null,
    beats: [], downbeats: [], detectedChords: [],
    doc: { meta: {}, lines: [] },
    stems: [], mix: {}, master: 1,
    prefs: { transpose: 0, audioPitch: false, rate: 1, offset: 0 },
    source: 'manuel', createdAt: Date.now(), playCount: 0, lastPlayedAt: 0,
    ...fields,
  };
}

async function addStem(song, blob, name, kind) {
  const blobId = await db.putBlob(blob);
  const k = kind || stemKind(name) || 'mix';
  song.stems.push({ id: uid(), kind: k, label: STEM_KINDS[k]?.label || k, blobId, name, mime: blob.type || mimeOf(name), size: blob.size });
}

function mimeOf(name) {
  const ext = (name.split('.').pop() || '').toLowerCase();
  return { mp3: 'audio/mpeg', wav: 'audio/wav', flac: 'audio/flac', m4a: 'audio/mp4', aac: 'audio/aac', ogg: 'audio/ogg', oga: 'audio/ogg', opus: 'audio/ogg', webm: 'audio/webm', mp4: 'audio/mp4' }[ext] || '';
}

export function sortStems(stems) {
  return [...stems].sort((a, b) => (STEM_KINDS[a.kind]?.order ?? 9) - (STEM_KINDS[b.kind]?.order ?? 9));
}

/** Applique une partition texte (ChordPro / grille / paroles) à un morceau. */
export function applySheetText(song, text) {
  const doc = parseSheet(text);
  const old = song.doc;
  if (old?.lines?.some((l) => l.s != null)) {
    attachTimings(doc.lines, old.lines.filter((l) => l.type === 'lyric' && l.s != null).map((l) => ({ text: l.text, s: l.s, e: l.e, words: null })));
  }
  song.doc = doc;
  if (doc.meta.title && !song.title) song.title = doc.meta.title;
  if (doc.meta.artist && !song.artist) song.artist = doc.meta.artist;
  if (doc.meta.key) song.key = doc.meta.key;
  if (doc.meta.capo) song.capo = doc.meta.capo;
  if (doc.meta.bpm && !song.bpm) song.bpm = doc.meta.bpm;
}

export function applyLRC(song, text) {
  const lrc = parseLRC(text);
  if (!song.doc.lines.some((l) => l.type === 'lyric')) {
    song.doc.lines = lrc.lines.map((l) => ({ type: 'lyric', text: l.text, chords: [] }));
  }
  attachTimings(song.doc.lines, lrc.lines.map((l) => ({ text: l.text, s: l.s, words: l.words })));
  if (lrc.meta.title && !song.title) song.title = lrc.meta.title;
  if (lrc.meta.artist && !song.artist) song.artist = lrc.meta.artist;
}

function applySongJson(song, json, choText) {
  song.doc = docFromSongJson(json, choText);
  song.title = json.title || song.doc.meta.title || song.title;
  song.artist = json.artist || song.doc.meta.artist || song.artist;
  song.key = json.key || song.doc.meta.key || song.key;
  song.capo = +(json.capo || song.doc.meta.capo || 0);
  song.bpm = json.bpm || song.bpm;
  song.beats = json.beats || [];
  song.downbeats = json.downbeats || [];
  song.detectedChords = json.chordsDetected || (json.format !== 'musimix-3' ? json.chords : null) || [];
  song.duration = json.duration || song.duration;
  song.lang = json.lang;
  song.analysis = json.analysis || null;
  song.peaks = json.peaks || null;
  if (json.mix) song.mixHint = json.mix;
}

/**
 * Crée un morceau à partir de fichiers déposés (pistes, ZIP, partition, LRC, song.json).
 * Retourne { songs: [...], audioOnly: [fichiers audio non reconnus comme pistes] }.
 */
export async function importFiles(fileList, onProgress) {
  const files = [...fileList];
  const songs = [];
  for (const m of files.filter((f) => MIDI_EXT.test(f.name))) songs.push(await importMidi(m, onProgress));
  files.splice(0, files.length, ...files.filter((f) => !MIDI_EXT.test(f.name)));
  if (!files.length) return { songs, audioOnly: [] };
  const zips = files.filter((f) => /\.zip$/i.test(f.name));
  for (const z of zips) songs.push(await importPack(z));
  const rest = files.filter((f) => !/\.zip$/i.test(f.name));
  if (!rest.length) return { songs, audioOnly: [] };
  const audio = rest.filter((f) => AUDIO_EXT.test(f.name));
  const stems = audio.filter((f) => stemKind(f.name));
  const plain = audio.filter((f) => !stemKind(f.name));
  // un seul fichier audio « normal » → à préparer (séparation) : on le renvoie
  if (plain.length && !stems.length && !rest.some((f) => /song\.json$/i.test(f.name))) {
    return { songs, audioOnly: plain, extras: rest.filter((f) => !AUDIO_EXT.test(f.name)) };
  }
  const song = await songFromLooseFiles(rest);
  if (song) songs.push(song);
  return { songs, audioOnly: [] };
}

async function songFromLooseFiles(files) {
  const song = newSong({ source: 'fichiers' });
  const json = files.find((f) => /song\.json$/i.test(f.name) || /\.musimix\.json$/i.test(f.name));
  const cho = files.find((f) => SHEET_EXT.test(f.name));
  const lrc = files.find((f) => /\.lrc$/i.test(f.name));
  const choText = cho ? await cho.text() : null;
  if (json) applySongJson(song, JSON.parse(await json.text()), choText);
  else if (choText) applySheetText(song, choText);
  if (lrc && !json) applyLRC(song, await lrc.text());
  for (const f of files.filter((x) => AUDIO_EXT.test(x.name))) await addStem(song, f, f.name);
  if (!song.stems.length && !song.doc.lines.length) return null;
  const first = files.find((f) => AUDIO_EXT.test(f.name)) || cho || lrc;
  if (!song.title && first) Object.assign(song, guessTitleArtist(first.name));
  if (!song.duration && song.stems.length) song.duration = await audioDuration(await db.getBlob(song.stems[0].blobId));
  finalize(song);
  await db.putSong(song);
  return song;
}

export async function importPack(zipFile) {
  const entries = await readZip(zipFile);
  const song = newSong({ source: 'pack' });
  const json = entries.find((e) => /(^|\/)song\.json$/i.test(e.name));
  const cho = entries.find((e) => SHEET_EXT.test(e.name) && !/readme/i.test(e.base));
  const lrc = entries.find((e) => /\.lrc$/i.test(e.name));
  const choText = cho ? await cho.text() : null;
  let meta = null;
  if (json) {
    meta = JSON.parse(await json.text());
    applySongJson(song, meta, choText);
  } else if (choText) applySheetText(song, choText);
  if (lrc && (!json || !song.doc.lines.some((l) => l.s != null))) applyLRC(song, await lrc.text());
  const stemMap = meta?.stems || {};
  for (const e of entries.filter((x) => AUDIO_EXT.test(x.name))) {
    const declared = Object.entries(stemMap).find(([, f]) => f === e.base || f === e.name)?.[0];
    const blob = await e.blob(mimeOf(e.name));
    await addStem(song, blob, e.base, declared || stemKind(e.base));
  }
  if (!song.title) Object.assign(song, guessTitleArtist(zipFile.name));
  if (!song.duration && song.stems.length) song.duration = await audioDuration(await db.getBlob(song.stems[0].blobId));
  finalize(song);
  await db.putSong(song);
  return song;
}

/** Morceau à partir d'un seul fichier audio, sans séparation. */
export async function importSingleAudio(file, { sheetText, title, artist } = {}) {
  const song = newSong({ source: 'audio' });
  Object.assign(song, guessTitleArtist(file.name));
  if (title) song.title = title;
  if (artist) song.artist = artist;
  await addStem(song, file, file.name, 'mix');
  if (sheetText) applySheetText(song, sheetText);
  song.duration = await audioDuration(file);
  finalize(song);
  await db.putSong(song);
  return song;
}

function finalize(song) {
  song.stems = sortStems(song.stems);
  // dédoublonne les libellés (deux pistes « Autres »…)
  const seen = {};
  for (const st of song.stems) { seen[st.label] = (seen[st.label] || 0) + 1; if (seen[st.label] > 1) st.label += ' ' + seen[st.label]; }
  for (const st of song.stems) {
    if (!song.mix[st.id]) song.mix[st.id] = { vol: 1, mute: false, solo: false, pan: 0 };
  }
  // si on a voix + instrumental + pistes détaillées, l'instrumental fait doublon : coupé par défaut
  const kinds = new Set(song.stems.map((s) => s.kind));
  if (kinds.has('instrumental') && ['drums', 'bass', 'guitar', 'piano', 'other'].some((k) => kinds.has(k))) {
    for (const st of song.stems) if (st.kind === 'instrumental') song.mix[st.id].mute = true;
  }
  song.doc.meta = { ...song.doc.meta, title: song.title, artist: song.artist, key: song.key, capo: song.capo, bpm: song.bpm };
  fillLineEnds(song.doc.lines);
}

export async function exportPack(song) {
  const files = [];
  const safe = (s) => (s || 'morceau').replace(/[\\/:*?"<>|]+/g, '_').trim();
  const title = safe(song.title);
  const stems = {};
  for (const st of song.stems) {
    const blob = await db.getBlob(st.blobId);
    if (!blob) continue;
    const ext = (st.name?.split('.').pop() || 'mp3').toLowerCase();
    const name = `${title} (${st.label}).${ext}`;
    stems[st.kind === 'mix' ? 'mix' : st.kind] = name;
    files.push({ name, data: blob });
  }
  const doc = { ...song.doc, meta: { ...song.doc.meta, title: song.title, artist: song.artist, key: song.key, capo: song.capo, bpm: song.bpm } };
  const json = docToSongJson(doc, {
    duration: song.duration, beats: song.beats, downbeats: song.downbeats, chordsDetected: song.detectedChords, stems, lang: song.lang,
    peaks: song.peaks || undefined, analysis: song.analysis || undefined,
  });
  files.push({ name: 'song.json', data: JSON.stringify(json) });
  files.push({ name: `${title}.cho`, data: toChordPro(doc) });
  if (doc.lines.some((l) => l.s != null)) files.push({ name: `${title}.lrc`, data: toLRC(doc) });
  const zip = await writeZip(files);
  return { blob: zip, name: `${song.artist ? safe(song.artist) + ' - ' : ''}${title}.zip` };
}

export function download(blob, name) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 2000);
}

/** Recherche de paroles synchronisées sur LRCLIB (base libre). */
export async function lrclibSearch({ title, artist, duration }) {
  const tries = [];
  if (title && artist) {
    const q = new URLSearchParams({ track_name: title, artist_name: artist });
    if (duration) q.set('duration', Math.round(duration));
    tries.push(`https://lrclib.net/api/get?${q}`);
  }
  const results = [];
  for (const url of tries) {
    try { const r = await fetch(url); if (r.ok) results.push(await r.json()); } catch { /* hors ligne */ }
  }
  try {
    const q = new URLSearchParams({ q: [artist, title].filter(Boolean).join(' ') });
    const r = await fetch(`https://lrclib.net/api/search?${q}`);
    if (r.ok) for (const x of await r.json()) if (!results.some((y) => y.id === x.id)) results.push(x);
  } catch { /* */ }
  return results.filter((r) => r.syncedLyrics || r.plainLyrics).slice(0, 12);
}

/**
 * Fichier MIDI (.mid, .kar) → morceau : une piste audio par famille d'instruments
 * (synthétisée ici), paroles karaoké synchronisées, accords et tempo tirés des notes.
 */
export async function importMidi(file, onProgress = () => {}) {
  onProgress('Lecture du fichier MIDI…', 0.02);
  const mid = parseMidi(await file.arrayBuffer());
  if (!mid.tracks.length) throw new Error('Ce fichier MIDI ne contient pas de notes.');
  const lyricTracks = new Set(mid.lyrics.map((x) => x.track));
  const families = new Map();
  for (const t of mid.tracks) families.set(t, familyOf(t, lyricTracks));
  // s'il n'y a pas de piste « mélodie » mais des paroles : la piste aiguë la plus monophonique
  if (![...families.values()].includes('vocals') && (mid.lyrics.length || mid.texts.length > 20)) {
    const cand = mid.tracks.filter((t) => families.get(t) !== 'drums' && families.get(t) !== 'bass')
      .map((t) => ({ t, mono: monophony(t.notes), pitch: t.notes.reduce((a, n) => a + n.pitch, 0) / t.notes.length }))
      .sort((a, b) => (b.mono + b.pitch / 100) - (a.mono + a.pitch / 100))[0];
    if (cand && cand.mono > 0.8) families.set(cand.t, 'vocals');
  }
  const groups = {};
  for (const t of mid.tracks) (groups[families.get(t)] ||= []).push(...t.notes);
  const order = ['vocals', 'drums', 'bass', 'guitar', 'piano', 'other'];
  const kinds = order.filter((k) => groups[k]?.length);
  const rendered = [];
  for (let i = 0; i < kinds.length; i++) {
    const k = kinds[i];
    onProgress(`Synthèse : ${STEM_KINDS[k].label.toLowerCase()}…`, 0.05 + 0.8 * (i / kinds.length));
    rendered.push([k, await renderFamily(groups[k], k, mid.duration)]);
  }
  // même gain pour toutes les pistes (garde l'équilibre du fichier)
  let peak = 0;
  for (const [, d] of rendered) for (let i = 0; i < d.length; i += 7) peak = Math.max(peak, Math.abs(d[i]));
  const gain = peak > 0 ? 0.89 / peak : 1;
  const song = newSong({ source: 'midi' });
  Object.assign(song, guessTitleArtist(file.name));
  song.duration = mid.duration + 1;
  song.bpm = mid.bpm;
  song.beats = mid.beats;
  song.downbeats = mid.downbeats;
  onProgress('Paroles et accords…', 0.9);
  for (const [k, d] of rendered) {
    for (let i = 0; i < d.length; i++) d[i] *= gain;
    const label = k === 'vocals' ? 'Mélodie' : STEM_KINDS[k].label;
    await addStem(song, encodeWav([d], SYNTH_RATE, 16), `${label}.wav`, k);
    song.stems[song.stems.length - 1].label = label;
  }
  song.detectedChords = chordsFromNotes(mid, families);
  song.key = keyNameOf(mid, families);
  const lines = karaokeLines(mid);
  song.doc = { meta: {}, lines: lines.length ? placeChords(lines, song.detectedChords, 60 / (mid.bpm || 120)) : placeChords([], song.detectedChords) };
  song.analysis = { notes: `Importé depuis un fichier MIDI (${mid.tracks.length} pistes)${lines.length ? ' · paroles karaoké' : ''} · accords lus dans les notes` };
  finalize(song);
  await db.putSong(song);
  onProgress('Prêt', 1);
  return song;
}

function monophony(notes) {
  let overl = 0;
  for (let i = 1; i < notes.length; i++) if (notes[i].t < notes[i - 1].t + notes[i - 1].d - 0.05) overl++;
  return 1 - overl / Math.max(1, notes.length);
}
