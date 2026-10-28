// MusiMix — éditeur : paroles et accords (ChordPro), synchronisation, infos et pistes.

import { db } from '../db.js';
import { esc, icon, fmtTime, toast, confirmBox, dialog, debounce, pickFiles } from '../ui.js';
import { parseSheet, toChordPro, carryTimings, looksLikeChordPro, fillLineEnds, toLRC, parseLRC, attachTimings } from '../sheet.js';
import { renderSheet } from '../render.js';
import { transposeChord, parseKey, transposeKey } from '../theory.js';
import { STEM_KINDS, sortStems, lrclibSearch, download, stemKind, audioDuration } from '../songs.js';

export class EditorView {
  constructor(app) { this.app = app; this.engine = app.engine; }

  async open(song, tab = 'text') {
    this.song = song;
    this.tab = tab;
    this.dirty = false;
    const el = document.createElement('section');
    el.className = 'view editor-view';
    el.innerHTML = `
      <header class="topbar" style="border-bottom:1px solid var(--line)">
        <button class="icon-btn" data-act="back" aria-label="Retour au lecteur">${icon('back')}</button>
        <div class="song-title"><b>${esc(song.title || 'Sans titre')}</b><span>Éditer</span></div>
        <div class="spacer"></div>
        <div class="seg" role="tablist">
          <button data-tab="text">Texte</button><button data-tab="sync">Synchro</button><button data-tab="info">Infos</button>
        </div>
        <button class="btn primary small" data-act="save" style="margin-left:8px">Enregistrer</button>
      </header>
      <div data-r="body" style="flex:1;display:flex;flex-direction:column;min-height:0"></div>`;
    this.el = el;
    this.app.mount(el);
    el.addEventListener('click', (e) => this.onClick(e));
    this._key = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); this.save(); }
      if (this.tab === 'sync' && !e.target.closest('input, textarea')) {
        if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); this.tap(); }
        if (e.key === 'p' || e.key === 'P') { e.preventDefault(); this.engine.toggle(); }
        if (e.key === 'ArrowLeft') { e.preventDefault(); this.engine.skip(-3); }
        if (e.key === 'Backspace') { e.preventDefault(); this.untap(); }
      }
    };
    document.addEventListener('keydown', this._key);
    this.showTab(tab);
  }

  close() {
    document.removeEventListener('keydown', this._key);
    this.engine.removeEventListener('time', this._onTime);
    this.engine.removeEventListener('play', this._onPP);
    this.engine.removeEventListener('pause', this._onPP);
    this.engine.unload();
    this.el?.remove();
  }

  async leave() {
    if (this.dirty && !(await confirmBox('Quitter sans enregistrer ?', 'Tes modifications seront perdues.', { ok: 'Quitter' }))) return false;
    return true;
  }

  showTab(tab) {
    if (this.tab === 'text' && this.textarea && tab !== 'text') this.applyText();
    this.tab = tab;
    this.el.querySelectorAll('[data-tab]').forEach((b) => b.classList.toggle('on', b.dataset.tab === tab));
    const body = this.el.querySelector('[data-r="body"]');
    if (tab === 'text') this.renderText(body);
    else if (tab === 'sync') this.renderSync(body);
    else this.renderInfo(body);
  }

  // ─────────────────────────────────────────────────────── texte ──

  renderText(body) {
    const s = this.song;
    const text = this.pendingText ?? toChordPro({ ...s.doc, meta: { ...s.doc.meta, title: s.title, artist: s.artist, key: s.key, capo: s.capo, bpm: s.bpm } });
    body.innerHTML = `<div class="editor">
      <div class="pane">
        <div class="pane-head">
          <button class="btn small" data-act="lrclib">${icon('search')} Chercher les paroles</button>
          <button class="btn small" data-act="import-text">${icon('upload')} Ouvrir un fichier</button>
          <span class="spacer"></span>
          <span class="stepper" title="Transposer le texte"><button data-act="tt-">−</button><output>Ton</output><button data-act="tt+">+</button></span>
        </div>
        <div class="callout" data-r="grid-hint" hidden style="margin:10px 16px 0">Ce texte ressemble à une grille « accords au-dessus des paroles ». <button class="btn small" data-act="convert">Convertir en ChordPro</button></div>
        <textarea spellcheck="false" aria-label="Paroles et accords au format ChordPro" placeholder="Colle ici les paroles, une grille copiée d’un site (accords au-dessus des paroles) ou du ChordPro.&#10;&#10;[G]Exemple de [C]ligne avec [D]accords">${esc(text)}</textarea>
      </div>
      <div class="pane">
        <div class="pane-head"><b>Aperçu</b><span class="note">Les accords se placent dans le texte entre crochets : [Am7]</span></div>
        <div class="preview"></div>
      </div></div>`;
    this.textarea = body.querySelector('textarea');
    const upd = debounce(() => this.updatePreview(), 200);
    this.textarea.addEventListener('input', () => { this.dirty = true; this.pendingText = this.textarea.value; upd(); });
    this.updatePreview();
  }

  updatePreview() {
    const txt = this.textarea.value;
    const doc = parseSheet(txt);
    this.el.querySelector('.preview').innerHTML = doc.lines.length ? renderSheet(doc) : '<p class="note">L’aperçu apparaîtra ici.</p>';
    this.el.querySelector('[data-r="grid-hint"]').hidden = looksLikeChordPro(txt) || !doc.lines.some((l) => l.chords?.length);
  }

  applyText() {
    if (!this.textarea) return;
    const s = this.song;
    const doc = parseSheet(this.textarea.value);
    carryTimings(s.doc.lines, doc.lines);
    fillLineEnds(doc.lines);
    s.doc = doc;
    if (doc.meta.title) s.title = doc.meta.title;
    if (doc.meta.artist !== undefined) s.artist = doc.meta.artist;
    if (doc.meta.key !== undefined) s.key = doc.meta.key;
    s.capo = doc.meta.capo || 0;
    if (doc.meta.bpm) s.bpm = doc.meta.bpm;
    this.pendingText = null;
    this.textarea = null;
  }

  transposeText(n) {
    const ta = this.textarea;
    const key = parseKey(parseSheet(ta.value).meta.key);
    const target = key ? transposeKey(key, n) : null;
    ta.value = ta.value.replace(/\[([^\]]+)\]/g, (m, c) => `[${transposeChord(c, n, target)}]`)
      .replace(/\{key:\s*([^}]+)\}/, (m, k) => { const kk = parseKey(k); return kk ? `{key: ${transposeChord(k.trim(), n, transposeKey(kk, n))}}` : m; });
    this.dirty = true;
    this.pendingText = ta.value;
    this.updatePreview();
  }

  async lrclib() {
    const s = this.song;
    const d = dialog(`<div class="dlg"><h2>Paroles en ligne</h2>
      <p>Recherche dans LRCLIB, une base libre de paroles souvent déjà synchronisées.</p>
      <div class="two"><label class="field">Titre<input type="text" name="t" value="${esc(s.title)}"></label><label class="field">Artiste<input type="text" name="a" value="${esc(s.artist)}"></label></div>
      <div class="actions" style="justify-content:flex-start"><button class="btn primary small" data-go>Rechercher</button></div>
      <div class="lrclib-results" data-r="res"></div>
      <div class="actions"><button class="btn ghost" data-close="">Fermer</button></div></div>`);
    const run = async () => {
      const res = d.el.querySelector('[data-r="res"]');
      res.innerHTML = '<p class="note">Recherche…</p>';
      const list = await lrclibSearch({ title: d.el.querySelector('[name=t]').value, artist: d.el.querySelector('[name=a]').value, duration: s.duration });
      if (!list.length) { res.innerHTML = '<p class="note">Rien trouvé (ou pas de connexion). Essaie un autre titre, ou colle les paroles à la main.</p>'; return; }
      res.innerHTML = list.map((r, i) => `<button data-i="${i}"><b>${esc(r.trackName)} — ${esc(r.artistName)}</b><small>${r.syncedLyrics ? 'Synchronisées' : 'Texte seul'}${r.duration ? ' · ' + fmtTime(r.duration) : ''}${s.duration && r.duration ? (Math.abs(r.duration - s.duration) < 3 ? ' · même durée' : ' · durée différente') : ''}</small></button>`).join('');
      res.onclick = (e) => {
        const b = e.target.closest('[data-i]');
        if (!b) return;
        this.useLrclib(list[+b.dataset.i]);
        d.close();
      };
    };
    d.el.querySelector('[data-go]').addEventListener('click', run);
    run();
  }

  useLrclib(r) {
    const s = this.song;
    const keepChords = this.textarea.value.trim() && /\[[A-G]/.test(this.textarea.value);
    if (r.syncedLyrics) {
      const lrc = parseLRC(r.syncedLyrics);
      if (keepChords) {
        // garde la partition actuelle (avec accords), prend seulement les temps
        this.applyText();
        attachTimings(s.doc.lines, lrc.lines.map((l) => ({ text: l.text, s: l.s, words: l.words })));
        fillLineEnds(s.doc.lines);
        toast('Synchro récupérée pour les lignes correspondantes');
      } else {
        s.doc = { meta: s.doc.meta, lines: [] };
        const doc = parseSheet(r.plainLyrics || lrc.lines.map((l) => l.text).join('\n'));
        attachTimings(doc.lines, lrc.lines.map((l) => ({ text: l.text, s: l.s, words: l.words })));
        fillLineEnds(doc.lines);
        s.doc = doc;
        toast('Paroles synchronisées ajoutées');
      }
    } else {
      this.applyText();
      s.doc = parseSheet(r.plainLyrics);
      toast('Paroles ajoutées (sans synchro)');
    }
    if (!s.title) s.title = r.trackName;
    if (!s.artist) s.artist = r.artistName;
    this.dirty = true;
    this.pendingText = null;
    this.showTab('text');
  }

  // ─────────────────────────────────────────────────────── synchro ──

  async renderSync(body) {
    const s = this.song;
    const lines = s.doc.lines.map((l, li) => ({ l, li })).filter((x) => x.l.type === 'lyric');
    if (!lines.length) { body.innerHTML = '<div class="info-form"><p>Ajoute d’abord des paroles dans l’onglet <b>Texte</b>.</p></div>'; return; }
    body.innerHTML = `<div style="display:flex;flex-direction:column;flex:1;min-height:0">
      <div class="pane-head" style="border-bottom:1px solid var(--line)">
        <span class="note">Lance la lecture, puis touche <b>Taper</b> (ou Espace) au début de chaque ligne chantée. Clic sur une ligne : y aller. Retour arrière : annuler la dernière.</span>
        <span class="spacer"></span>
        <button class="btn small" data-act="sync-clear">Tout effacer</button>
        <button class="btn small" data-act="export-lrc">${icon('download')} LRC</button>
      </div>
      <div class="sync-list">${lines.map(({ l, li }) => `<div class="sync-row" data-li="${li}">
        <span class="ts ${l.s == null ? 'none' : ''}">${l.s == null ? '—' : fmtTs(l.s)}</span>
        <span>${esc(l.text)}</span>
        <span class="nudge"><button data-act="n-" title="Avancer de 0,1 s">−0,1</button><button data-act="n+" title="Retarder de 0,1 s">+0,1</button><button data-act="set" title="Caler sur le temps actuel">${icon('tap')}</button></span>
      </div>`).join('')}</div>
      <div class="tap-bar">
        <button class="play" data-act="sync-play" aria-label="Lecture">${icon('play')}</button>
        <span class="time" data-r="t">0:00</span>
        <button class="big-tap" data-act="tap">Taper : début de la ligne suivante</button>
      </div></div>`;
    this.syncLines = lines;
    this.tapIdx = lines.findIndex((x) => x.l.s == null);
    if (this.tapIdx < 0) this.tapIdx = lines.length;
    if (!this.engine.tracks.length) {
      const stems = [];
      for (const st of s.stems) {
        const blob = await db.getBlob(st.blobId);
        if (!blob) continue;
        const m = s.mix[st.id] || {};
        stems.push({ id: st.id, kind: st.kind, blob, vol: m.vol ?? 1, mute: !!m.mute, solo: !!m.solo });
      }
      await this.engine.load(stems, { duration: s.duration });
    }
    if (!this._syncBound) {
      this._syncBound = true;
      this._onTime = () => this.syncFrame();
      this._onPP = () => this.syncPlayIcon();
      this.engine.addEventListener('time', this._onTime);
      this.engine.addEventListener('play', this._onPP);
      this.engine.addEventListener('pause', this._onPP);
    }
    this.syncFrame();
  }

  syncPlayIcon() {
    const b = this.el?.querySelector('[data-act="sync-play"]');
    if (b) b.innerHTML = icon(this.engine.playing ? 'pause' : 'play');
  }

  syncFrame() {
    if (this.tab !== 'sync' || !this.el) return;
    const t = this.engine.currentTime;
    const te = this.el.querySelector('[data-r="t"]');
    if (te) te.textContent = fmtTime(t);
    let cur = -1;
    this.syncLines.forEach((x, i) => { if (x.l.s != null && x.l.s <= t) cur = i; });
    this.el.querySelectorAll('.sync-row').forEach((r, i) => {
      r.classList.toggle('cur', i === cur);
      r.classList.toggle('next', i === this.tapIdx);
    });
    const focus = cur >= 0 ? cur : this.tapIdx;
    if (focus !== this._lastCur) {
      this._lastCur = focus;
      const row = this.el.querySelectorAll('.sync-row')[focus];
      const list = this.el.querySelector('.sync-list');
      if (row && list) list.scrollTo({ top: row.offsetTop - list.clientHeight / 2, behavior: 'smooth' });
    }
  }

  setLineTime(i, t) {
    const x = this.syncLines[i];
    if (!x) return;
    const l = x.l;
    const old = l.s;
    l.s = Math.max(0, t);
    if (l.words?.length && old != null && !l.words[0].est) {
      const d = l.s - old;
      l.words = l.words.map((w) => ({ s: w.s + d, e: w.e + d }));
      l.e = (l.e ?? old + 3) + d;
    } else {
      l.words = null;
      l.e = null;
    }
    // la ligne précédente se termine au plus tard ici
    const prev = this.syncLines[i - 1]?.l;
    if (prev?.s != null && prev.words?.every((w) => w.est)) { prev.words = null; prev.e = null; }
    for (const y of this.syncLines) if (y.l.words?.every((w) => w.est)) { y.l.words = null; y.l.e = null; }
    fillLineEnds(this.song.doc.lines);
    this.dirty = true;
    const row = this.el.querySelectorAll('.sync-row')[i];
    if (row) { const ts = row.querySelector('.ts'); ts.textContent = fmtTs(l.s); ts.classList.remove('none'); }
  }

  tap() {
    if (this.tapIdx >= this.syncLines.length) { toast('Toutes les lignes sont calées'); return; }
    if (!this.engine.playing) { this.engine.play(); return; }
    this.setLineTime(this.tapIdx, this.engine.currentTime - 0.12); // temps de réaction
    this.tapIdx++;
    this.syncFrame();
  }

  untap() {
    if (this.tapIdx <= 0) return;
    this.tapIdx--;
    const l = this.syncLines[this.tapIdx].l;
    l.s = null; l.e = null; l.words = null;
    const row = this.el.querySelectorAll('.sync-row')[this.tapIdx];
    if (row) { const ts = row.querySelector('.ts'); ts.textContent = '—'; ts.classList.add('none'); }
    this.dirty = true;
    this.syncFrame();
  }

  // ─────────────────────────────────────────────────────── infos ──

  renderInfo(body) {
    const s = this.song;
    const stems = sortStems(s.stems);
    body.innerHTML = `<div style="overflow-y:auto;flex:1"><div class="info-form">
      <div class="two" style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
        <label class="field">Titre<input type="text" data-f="title" value="${esc(s.title)}"></label>
        <label class="field">Artiste<input type="text" data-f="artist" value="${esc(s.artist)}"></label>
        <label class="field">Tonalité<input type="text" data-f="key" value="${esc(s.key || '')}" placeholder="ex. G, F#m, Bb"></label>
        <label class="field">Tempo (BPM)<input type="number" min="30" max="260" data-f="bpm" value="${s.bpm ? Math.round(s.bpm) : ''}"></label>
        <label class="field">Capo indiqué<input type="number" min="0" max="11" data-f="capo" value="${s.capo || 0}"></label>
        <label class="field">Langue des paroles<input type="text" data-f="lang" value="${esc(s.lang || '')}" placeholder="fr, en, pt…"></label>
      </div>
      <h3 style="margin:10px 0 0;font:600 20px var(--font-display)">Pistes audio</h3>
      ${stems.map((st) => `<div class="stem-edit" data-id="${st.id}">
        <input type="text" data-sf="label" value="${esc(st.label)}" aria-label="Nom de la piste">
        <select data-sf="kind" aria-label="Type de piste">${Object.entries(STEM_KINDS).map(([k, v]) => `<option value="${k}" ${k === st.kind ? 'selected' : ''}>${v.label}</option>`).join('')}</select>
        <button class="icon-btn" data-act="stem-del" aria-label="Retirer la piste">${icon('trash')}</button>
      </div>`).join('') || '<p class="note">Aucune piste.</p>'}
      <div><button class="btn small" data-act="stem-add">${icon('plus')} Ajouter des pistes</button></div>
      <p class="note">Morceau ajouté le ${new Date(s.createdAt).toLocaleDateString('fr-FR')} · joué ${s.playCount || 0} fois${s.analysis?.notes ? ' · ' + esc(s.analysis.notes) : ''}</p>
      <div><button class="btn danger" data-act="delete">${icon('trash')} Supprimer ce morceau</button></div>
    </div></div>`;
    body.querySelectorAll('[data-f]').forEach((inp) => inp.addEventListener('input', () => {
      const f = inp.dataset.f;
      let v = inp.value;
      if (f === 'bpm') v = v ? +v : null;
      if (f === 'capo') v = +v || 0;
      s[f] = v;
      this.dirty = true;
    }));
    body.querySelectorAll('[data-sf]').forEach((inp) => inp.addEventListener('change', () => {
      const st = s.stems.find((x) => x.id === inp.closest('[data-id]').dataset.id);
      st[inp.dataset.sf] = inp.value;
      if (inp.dataset.sf === 'kind' && STEM_KINDS[inp.value] && st.label === STEM_KINDS[st.kind]?.label) st.label = STEM_KINDS[inp.value].label;
      this.dirty = true;
    }));
  }

  // ─────────────────────────────────────────────────────── actions ──

  async save() {
    if (this.tab === 'text') { this.applyText(); }
    const s = this.song;
    s.doc.meta = { ...s.doc.meta, title: s.title, artist: s.artist, key: s.key, capo: s.capo, bpm: s.bpm };
    await db.putSong(s);
    this.dirty = false;
    toast('Enregistré');
    if (this.tab === 'text') this.showTab('text');
  }

  async onClick(e) {
    const tb = e.target.closest('[data-tab]');
    if (tb) { this.showTab(tb.dataset.tab); return; }
    const row = e.target.closest('.sync-row');
    const b = e.target.closest('[data-act]');
    if (row && !b) {
      const x = this.syncLines.find((y) => y.li === +row.dataset.li);
      if (x?.l.s != null) this.engine.seek(Math.max(0, x.l.s - 1));
      return;
    }
    if (!b) return;
    const a = b.dataset.act;
    const s = this.song;
    if (a === 'back') { if (await this.leave()) { this.dirty = false; this.app.go(`#/play/${s.id}`); } }
    else if (a === 'save') this.save();
    else if (a === 'tt-' || a === 'tt+') this.transposeText(a === 'tt+' ? 1 : -1);
    else if (a === 'lrclib') this.lrclib();
    else if (a === 'convert') { const doc = parseSheet(this.textarea.value); this.textarea.value = toChordPro({ ...doc, meta: { ...doc.meta, title: s.title, artist: s.artist } }); this.pendingText = this.textarea.value; this.dirty = true; this.updatePreview(); }
    else if (a === 'import-text') {
      const [f] = await pickFiles({ accept: '.cho,.chopro,.chordpro,.txt,.lrc,.crd,.pro', multiple: false });
      if (!f) return;
      const txt = await f.text();
      if (/\.lrc$/i.test(f.name)) {
        this.applyText();
        const lrc = parseLRC(txt);
        if (!s.doc.lines.some((l) => l.type === 'lyric')) s.doc = parseSheet(lrc.lines.map((l) => l.text).join('\n'));
        attachTimings(s.doc.lines, lrc.lines.map((l) => ({ text: l.text, s: l.s, words: l.words })));
        fillLineEnds(s.doc.lines);
        this.dirty = true;
        toast('Synchro LRC importée');
        this.showTab('text');
      } else { this.textarea.value = txt; this.pendingText = txt; this.dirty = true; this.updatePreview(); }
    }
    else if (a === 'sync-play') this.engine.toggle();
    else if (a === 'tap') this.tap();
    else if (a === 'n-' || a === 'n+' || a === 'set') {
      const li = +b.closest('.sync-row').dataset.li;
      const i = this.syncLines.findIndex((x) => x.li === li);
      const l = this.syncLines[i].l;
      if (a === 'set') this.setLineTime(i, this.engine.currentTime - 0.1);
      else if (l.s != null) this.setLineTime(i, l.s + (a === 'n+' ? 0.1 : -0.1));
    }
    else if (a === 'sync-clear') {
      if (!(await confirmBox('Effacer la synchro ?', 'Toutes les lignes perdront leur temps.', { ok: 'Effacer', danger: true }))) return;
      for (const x of this.syncLines) { x.l.s = null; x.l.e = null; x.l.words = null; }
      for (const l of s.doc.lines) for (const c of l.chords || []) delete c.t;
      this.dirty = true;
      this.renderSync(this.el.querySelector('[data-r="body"]'));
    }
    else if (a === 'export-lrc') download(new Blob([toLRC({ ...s.doc, meta: { title: s.title, artist: s.artist } })], { type: 'text/plain' }), `${s.title || 'paroles'}.lrc`);
    else if (a === 'stem-del') {
      const id = b.closest('[data-id]').dataset.id;
      const st = s.stems.find((x) => x.id === id);
      if (!(await confirmBox('Retirer cette piste ?', `« ${st.label} » sera supprimée.`, { ok: 'Retirer', danger: true }))) return;
      await db.deleteBlob(st.blobId);
      s.stems = s.stems.filter((x) => x.id !== id);
      delete s.mix[id];
      await db.putSong(s);
      this.renderInfo(this.el.querySelector('[data-r="body"]'));
    }
    else if (a === 'stem-add') {
      const files = await pickFiles({ accept: 'audio/*,.mp3,.wav,.flac,.m4a,.ogg', multiple: true });
      for (const f of files) {
        const blobId = await db.putBlob(f);
        const kind = stemKind(f.name) || 'other';
        const id = Math.random().toString(36).slice(2, 10);
        s.stems.push({ id, kind, label: STEM_KINDS[kind].label, blobId, name: f.name, mime: f.type, size: f.size });
        s.mix[id] = { vol: 1, mute: false, solo: false };
        if (!s.duration) s.duration = await audioDuration(f);
      }
      if (files.length) { await db.putSong(s); this.renderInfo(this.el.querySelector('[data-r="body"]')); toast(`${files.length} piste${files.length > 1 ? 's' : ''} ajoutée${files.length > 1 ? 's' : ''}`); }
    }
    else if (a === 'delete') {
      if (!(await confirmBox('Supprimer ce morceau ?', `« ${s.title} » et ses pistes seront effacés de cet appareil.`, { ok: 'Supprimer', danger: true }))) return;
      await db.deleteSong(s.id);
      this.dirty = false;
      this.app.go('#/');
    }
  }
}

function fmtTs(t) {
  const m = Math.floor(t / 60);
  return `${m}:${(t - m * 60).toFixed(1).padStart(4, '0')}`;
}
