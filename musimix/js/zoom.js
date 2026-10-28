// MusiMix — export pour le Zoom R20 : un WAV 44,1 kHz par piste (tous calés à 0:00,
// même durée), un fichier MIDI des accords et de la basse, et la marche à suivre.

import { db } from './db.js';
import { esc, dialog, toast } from './ui.js';
import { writeZip } from './zip.js';
import { decodeAt, encodeWav } from './wav.js';
import { writeChordMidi } from './midi.js';
import { chordTimeline } from './sheet.js';
import { parseChord, transposeChord } from './theory.js';
import { sortStems, download } from './songs.js';
import { songKey } from './render.js';
import { keyName } from './theory.js';

const RATE = 44100;
const ascii = (s) => String(s || '').normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^\w .()-]+/g, '').replace(/\s+/g, ' ').trim() || 'piste';

export async function zoomDialog(app, song) {
  const prefs = await app.prefs();
  const st = { bits: prefs.zoomBits || 24, stereo: !!prefs.zoomStereo, mix: false };
  const nStems = song.stems.length;
  const d = dialog(`<form method="dialog">
    <h2>Exporter pour le Zoom R20</h2>
    <p>Un fichier WAV par piste (${nStems} piste${nStems > 1 ? 's' : ''}), au format du R20, tous calés au début du morceau, plus les accords en MIDI pour la piste synthé.</p>
    <div class="opt-row"><span>Résolution<br><small class="note">la même que celle du projet R20</small></span><span class="seg"><button type="button" data-bits="24">24 bits</button><button type="button" data-bits="16">16 bits</button></span></div>
    <div class="opt-row"><span>Pistes<br><small class="note">mono : une piste du R20 par instrument</small></span><span class="seg"><button type="button" data-st="0">Mono</button><button type="button" data-st="1">Stéréo</button></span></div>
    <div class="opt-row"><span>Ajouter le morceau complet (mix)</span><label class="switch"><input type="checkbox" data-mix><i></i></label></div>
    <div class="callout" data-r="size"></div>
    <div class="progress" hidden><i></i></div>
    <p class="note" data-r="msg"></p>
    <div class="actions"><button class="btn ghost" data-close="">Annuler</button><button class="btn primary" data-go>Créer le fichier</button></div>
  </form>`);
  const el = d.el;
  const refresh = () => {
    el.querySelectorAll('[data-bits]').forEach((b) => b.classList.toggle('on', +b.dataset.bits === st.bits));
    el.querySelectorAll('[data-st]').forEach((b) => b.classList.toggle('on', !!+b.dataset.st === st.stereo));
    const n = nStems + (st.mix ? 1 : 0);
    const used = n * (st.stereo ? 2 : 1);
    const mb = Math.round(((song.duration || 240) * RATE * (st.bits / 8) * (st.stereo ? 2 : 1) * n) / 1e6);
    el.querySelector('[data-r="size"]').innerHTML = `Environ <b>${mb} Mo</b> · ${used} piste${used > 1 ? 's' : ''} du R20 sur 16${used > 16 ? ' : <b>trop de pistes</b>, passe en mono' : ''}.`;
    el.querySelector('[data-go]').disabled = used > 16;
  };
  el.addEventListener('click', (e) => {
    const b = e.target.closest('[data-bits]');
    if (b) { st.bits = +b.dataset.bits; refresh(); }
    const s = e.target.closest('[data-st]');
    if (s) { st.stereo = !!+s.dataset.st; refresh(); }
  });
  el.querySelector('[data-mix]').addEventListener('change', (e) => { st.mix = e.target.checked; refresh(); });
  el.querySelector('[data-go]').addEventListener('click', async (e) => {
    e.preventDefault();
    app.setPref('zoomBits', st.bits);
    app.setPref('zoomStereo', st.stereo);
    const go = el.querySelector('[data-go]');
    go.disabled = true;
    const bar = el.querySelector('.progress');
    bar.hidden = false;
    const msg = el.querySelector('[data-r="msg"]');
    try {
      const { blob, name } = await buildZoomPack(song, st, (m, p) => { msg.textContent = m; bar.firstElementChild.style.width = Math.round(p * 100) + '%'; });
      download(blob, name);
      msg.textContent = 'Fichier créé. Décompresse-le à la racine de la carte SD du R20 (voir LISEZ-MOI.txt).';
      go.textContent = 'Terminé';
      el.querySelector('[data-close]').textContent = 'Fermer';
      toast('Export Zoom R20 prêt');
    } catch (err) {
      console.error(err);
      msg.textContent = 'Échec : ' + err.message;
      go.disabled = false;
    }
  });
  refresh();
}

export async function buildZoomPack(song, { bits = 24, stereo = false, mix = false } = {}, onProgress = () => {}) {
  const files = [];
  const stems = sortStems(song.stems);
  const duration = song.duration || 0;
  const N = Math.ceil((duration + 0.5) * RATE);
  const decoded = [];
  const names = [];
  let num = 0;
  for (let i = 0; i < stems.length; i++) {
    const s = stems[i];
    onProgress(`Conversion : ${s.label}…`, (i / (stems.length + 1)) * 0.9);
    const blob = await db.getBlob(s.blobId);
    if (!blob) continue;
    const buf = await decodeAt(blob, RATE);
    const chans = fit(buf, N, stereo);
    if (mix) decoded.push({ chans, vol: song.mix?.[s.id], kind: s.kind });
    num++;
    const fname = `${String(num).padStart(2, '0')} ${ascii(s.label)}.wav`;
    names.push([fname, s.label]);
    files.push({ name: `AUDIO/${fname}`, data: encodeWav(chans, RATE, bits) });
    await new Promise((r) => setTimeout(r, 0));
  }
  if (mix && decoded.length) {
    onProgress('Morceau complet…', 0.9);
    const out = Array.from({ length: stereo ? 2 : 1 }, () => new Float32Array(N));
    const anySolo = decoded.some((x) => x.vol?.solo);
    for (const x of decoded) {
      if (x.kind === 'instrumental' && decoded.length > 2) continue;
      const g = (x.vol?.mute || (anySolo && !x.vol?.solo)) ? 0 : Math.pow(x.vol?.vol ?? 1, 1.6);
      x.chans.forEach((c, k) => { const o = out[k]; for (let i = 0; i < N; i++) o[i] += c[i] * g; });
    }
    let peak = 0;
    for (const c of out) for (let i = 0; i < N; i += 3) peak = Math.max(peak, Math.abs(c[i]));
    if (peak > 0.98) for (const c of out) for (let i = 0; i < N; i++) c[i] *= 0.98 / peak;
    num++;
    const fname = `${String(num).padStart(2, '0')} Mix complet.wav`;
    names.push([fname, 'Morceau complet']);
    files.push({ name: `AUDIO/${fname}`, data: encodeWav(out, RATE, bits) });
  }
  // accords + basse en MIDI (sonnent en tonalité d'origine)
  const tl = chordTimeline(song.doc, duration, song.detectedChords).filter((c) => c.t != null);
  const bpm = Math.round(song.bpm || 120);
  const title = ascii(song.title);
  if (tl.length) {
    const capo = 0;
    const chords = tl.map((c) => ({ ...c, name: capo ? transposeChord(c.name, capo, null) : c.name }));
    files.push({ name: `MIDI/${title} - accords.mid`, data: writeChordMidi(chords, { bpm, title: song.title, parseChord }) });
  }
  const k = songKey(song);
  files.push({ name: 'LISEZ-MOI.txt', data: '﻿' + readme(song, { bits, stereo, names, bpm, key: k ? keyName(k) : '', midi: tl.length ? `MIDI/${title} - accords.mid` : null }) });
  onProgress('Assemblage du fichier…', 0.96);
  const zip = await writeZip(files);
  onProgress('Prêt', 1);
  return { blob: zip, name: `Zoom R20 - ${title}.zip` };
}

/** Ramène un AudioBuffer à N échantillons, en mono (moyenne) ou stéréo. */
function fit(buf, N, stereo) {
  const L = buf.getChannelData(0);
  const R = buf.numberOfChannels > 1 ? buf.getChannelData(1) : L;
  const n = Math.min(N, buf.length);
  if (stereo) {
    const a = new Float32Array(N), b = new Float32Array(N);
    a.set(L.subarray(0, n)); b.set(R.subarray(0, n));
    return [a, b];
  }
  const m = new Float32Array(N);
  for (let i = 0; i < n; i++) m[i] = (L[i] + R[i]) * 0.5;
  return [m];
}

function readme(song, { bits, stereo, names, bpm, key, midi }) {
  const L = [];
  L.push(`${song.title || 'Morceau'}${song.artist ? ' - ' + song.artist : ''}`);
  L.push(`Export MusiMix pour Zoom R20 : WAV 44,1 kHz / ${bits} bits, ${stereo ? 'stéréo' : 'mono'}.`);
  L.push(`Tempo : ${bpm} BPM${key ? ' · Tonalité : ' + key : ''}`);
  L.push('');
  L.push('1. Copie les dossiers AUDIO et MIDI à la racine de la carte SD du R20');
  L.push('   (s\'ils existent déjà, ajoute simplement ces fichiers dedans).');
  L.push(`2. Sur le R20, crée un nouveau projet en ${bits} bits (Bit Depth ${bits}-bit).`);
  L.push(`3. Règle le tempo du projet sur ${bpm}.`);
  if (stereo) L.push('4. Couple les pistes par deux en stéréo (1-2, 3-4...) AVANT d\'importer.');
  L.push(`${stereo ? '5' : '4'}. Mets la tête de lecture tout au début du morceau.`);
  L.push(`${stereo ? '6' : '5'}. Pour chaque piste : touche deux fois une zone vide de la piste → Add Audio File → SD Card,`);
  L.push('   puis choisis le fichier. Tous les fichiers commencent à 0:00 et ont la même durée : ils restent calés.');
  if (midi) L.push(`${stereo ? '7' : '6'}. Accords : sur la piste synthé, charge ${midi.replace('MIDI/', '')} (dossier MIDI) avec « Ch All » : accords (piano) + basse.`);
  L.push('');
  L.push('Pistes :');
  names.forEach(([f, label], i) => {
    const track = stereo ? `${i * 2 + 1}-${i * 2 + 2}` : `${i + 1}`;
    L.push(`  Piste ${track.padEnd(5)} ← ${f}   (${label})`);
  });
  L.push('');
  L.push('Ensuite, tu mixes sur les faders du R20 : volume, panoramique, effets, et tu peux enregistrer');
  L.push('ta voix ou ta guitare sur les pistes libres par-dessus.');
  return L.join('\r\n') + '\r\n';
}

export { esc };
