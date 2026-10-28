// MusiMix — export PDF : une partition propre (paroles, accords, diagrammes),
// imprimée par le navigateur (« Enregistrer au format PDF »).

import { esc, dialog } from './ui.js';
import { renderSheet, chordDisplay, uniqueChords } from './render.js';
import { diagramSVG, loadChordDb } from './diagrams.js';
import { keyName } from './theory.js';

export async function printDialog(app, songs, opts = {}) {
  await loadChordDb();
  const prefs = await app.prefs();
  const st = {
    instrument: opts.instrument || prefs.pdfInstrument || prefs.instrument || 'guitar',
    transpose: opts.transpose ?? (songs.length === 1 ? (songs[0].prefs?.transpose || 0) - (songs[0].prefs?.capo || 0) : 0),
    cols: prefs.pdfCols || 1,
    size: prefs.pdfSize || 13.5,
    diagrams: prefs.pdfDiagrams !== false,
    chords: true,
  };
  const d = dialog(`<div class="dlg">
    <h2>Exporter en PDF</h2>
    <div style="display:grid;grid-template-columns:minmax(0,260px) minmax(0,1fr);gap:20px" class="pdf-grid">
      <div style="display:grid;gap:12px;align-content:start">
        <label class="field">Diagrammes
          <select data-o="instrument"><option value="guitar">Guitare</option><option value="ukulele">Ukulélé</option><option value="piano">Piano</option><option value="none">Aucun</option></select></label>
        <div class="opt-row"><span>Transposer</span><span class="stepper"><button data-o="tr-">−</button><output data-r="tr"></output><button data-o="tr+">+</button></span></div>
        <div class="opt-row"><span>Colonnes</span><span class="seg"><button data-cols="1">1</button><button data-cols="2">2</button></span></div>
        <div class="opt-row"><span>Taille du texte</span><span class="stepper"><button data-o="fs-">−</button><output data-r="fs"></output><button data-o="fs+">+</button></span></div>
        <div class="opt-row"><span>Afficher les accords</span><label class="switch"><input type="checkbox" data-o="chords" checked><i></i></label></div>
        <p class="note">Dans la fenêtre d’impression, choisis <b>Enregistrer au format PDF</b>. Sur iPhone : <b>Partager → Imprimer</b>, puis écarte l’aperçu avec deux doigts.</p>
      </div>
      <div class="pdf-prev" style="max-height:64vh;overflow:auto;background:var(--surface-3);border-radius:12px;padding:14px"><div data-r="prev"></div></div>
    </div>
    <div class="actions"><button class="btn ghost" data-close="">Annuler</button><button class="btn primary" data-o="print">Créer le PDF</button></div>
  </div>`, { cls: 'wide' });
  const el = d.el;
  if (window.innerWidth < 760) el.querySelector('.pdf-grid').style.gridTemplateColumns = '1fr';
  const sel = el.querySelector('[data-o="instrument"]');
  sel.value = st.diagrams ? st.instrument : 'none';
  const refresh = () => {
    el.querySelector('[data-r="tr"]').textContent = st.transpose ? (st.transpose > 0 ? '+' : '−') + Math.abs(st.transpose) : '0';
    el.querySelector('[data-r="fs"]').textContent = st.size.toString().replace('.', ',') + ' pt';
    el.querySelectorAll('[data-cols]').forEach((b) => b.classList.toggle('on', +b.dataset.cols === st.cols));
    const prev = el.querySelector('[data-r="prev"]');
    prev.innerHTML = songs.slice(0, 1).map((s) => songPage(s, st, true)).join('');
    const box = el.querySelector('.pdf-prev');
    prev.style.zoom = Math.min(1, (box.clientWidth - 28) / 794);
  };
  el.addEventListener('click', (e) => {
    const c = e.target.closest('[data-cols]');
    if (c) { st.cols = +c.dataset.cols; refresh(); return; }
    const b = e.target.closest('[data-o]');
    if (!b) return;
    const o = b.dataset.o;
    if (o === 'tr-') st.transpose--;
    if (o === 'tr+') st.transpose++;
    if (o === 'fs-') st.size = Math.max(9, st.size - 0.5);
    if (o === 'fs+') st.size = Math.min(22, st.size + 0.5);
    if (o === 'print') {
      app.setPref('pdfInstrument', st.instrument);
      app.setPref('pdfCols', st.cols);
      app.setPref('pdfSize', st.size);
      app.setPref('pdfDiagrams', st.diagrams);
      d.close();
      doPrint(songs, st);
      return;
    }
    refresh();
  });
  el.addEventListener('change', (e) => {
    if (e.target === sel) { st.diagrams = sel.value !== 'none'; if (st.diagrams) st.instrument = sel.value; refresh(); }
    if (e.target.dataset.o === 'chords') { st.chords = e.target.checked; refresh(); }
  });
  refresh();
}

function songPage(song, st, preview = false) {
  const display = chordDisplay(song, st.transpose, 0);
  const doc = st.chords ? song.doc : { ...song.doc, lines: song.doc.lines.filter((l) => l.type !== 'chords').map((l) => ({ ...l, chords: [] })) };
  const chords = st.chords && st.diagrams ? uniqueChords(song.doc, display, song.detectedChords) : [];
  const facts = [];
  const k = display.keyLabel;
  if (k) facts.push(['Tonalité', k]);
  if (song.capo && !st.transpose) facts.push(['Capo', song.capo]);
  if (song.bpm) facts.push(['Tempo', Math.round(song.bpm)]);
  const body = doc.lines.length ? renderSheet(doc, { display }) : '<p>Pas de paroles.</p>';
  return `<article class="pr${preview ? ' preview' : ''}" style="--cols:${st.cols};--pfs:${st.size}pt">
    <header><div><h1>${esc(song.title || 'Sans titre')}</h1>${song.artist ? `<div class="by">${esc(song.artist)}</div>` : ''}</div>
      <div class="facts">${facts.map(([a, b]) => `<div>${esc(a)}<b>${esc(b)}</b></div>`).join('')}</div></header>
    ${chords.length ? `<div class="chords-row">${chords.map((c) => `<figure><figcaption>${esc(c)}</figcaption>${diagramSVG(c, st.instrument)}</figure>`).join('')}</div>` : ''}
    <div class="body">${body}</div>
    <footer><span>${esc(song.title || '')}${song.artist ? ' — ' + esc(song.artist) : ''}</span><span>MusiMix</span></footer>
  </article>`;
}

function doPrint(songs, st) {
  let root = document.getElementById('print-root');
  if (!root) { root = document.createElement('div'); root.id = 'print-root'; document.body.appendChild(root); }
  root.innerHTML = songs.map((s, i) => `<div style="${i ? 'break-before:page' : ''}">${songPage(s, st)}</div>`).join('');
  const title = document.title;
  document.title = songs.length === 1 ? `${songs[0].title || 'Partition'}${songs[0].artist ? ' - ' + songs[0].artist : ''}` : 'Setlist MusiMix';
  const done = () => { document.title = title; root.innerHTML = ''; window.removeEventListener('afterprint', done); };
  window.addEventListener('afterprint', done);
  // laisse le temps aux polices et SVG de se poser
  setTimeout(() => window.print(), 250);
}

export { keyName };
