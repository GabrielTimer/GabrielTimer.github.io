// MusiMix — le lecteur : paroles synchronisées, accords, mixage, options.

import { db } from '../db.js';
import { esc, icon, fmtTime, toast, openMenu, drag, debounce } from '../ui.js';
import { renderSheet, lyricLine, chordDisplay, songKey, uniqueChords } from '../render.js';
import { chordTimeline, sectionsOf } from '../sheet.js';
import { diagramSVG, voicings, chordFormula, loadChordDb } from '../diagrams.js';
import { STEM_KINDS, sortStems, exportPack, download } from '../songs.js';
import { lowerBound } from '../engine.js';
import { keyName } from '../theory.js';

export class PlayerView {
  constructor(app) {
    this.app = app;
    this.engine = app.engine;
    this.song = null;
    this.el = null;
    this.raf = 0;
    this.userScrollAt = 0;
    this.mode = 'lyrics';
    this.instrument = 'guitar';
    this.voicingIdx = {};
    this.saveSong = debounce(() => this.song && db.putSong(this.song), 600);
    this._onTime = () => this.frame();
    this._onKey = (e) => this.onKey(e);
  }

  async open(song, ctx = {}) {
    this.song = song;
    this.ctx = ctx;
    const prefs = await this.app.prefs();
    this.instrument = prefs.instrument || 'guitar';
    this.mode = prefs.viewMode || 'lyrics';
    this.fontSize = prefs.fontSize || null;
    this.showChords = prefs.showChords !== false;
    song.prefs = { transpose: 0, audioPitch: false, rate: 1, offset: 0, capo: 0, ...(song.prefs || {}) };
    await loadChordDb();
    this.build();
    await this.loadAudio();
    song.playCount = (song.playCount || 0) + 1;
    song.lastPlayedAt = Date.now();
    db.putSong(song);
    document.addEventListener('keydown', this._onKey);
    this.setupMediaSession();
  }

  close() {
    document.removeEventListener('keydown', this._onKey);
    this.engine.removeEventListener('time', this._onTime);
    for (const [ev, fn] of Object.entries(this._engineH || {})) this.engine.removeEventListener(ev, fn);
    window.removeEventListener('resize', this._onResize);
    clearTimeout(this.autoNext);
    cancelAnimationFrame(this.raf);
    clearInterval(this.meterTimer);
    this.engine.unload();
    this.releaseWake();
    this.el?.remove();
    this.el = null;
    this.song = null;
    if ('mediaSession' in navigator) navigator.mediaSession.metadata = null;
  }

  // ─────────────────────────────────────────────────────── construction ──

  build() {
    const s = this.song;
    const el = document.createElement('section');
    el.className = 'view player';
    el.innerHTML = `
      <header class="topbar">
        <button class="icon-btn" data-act="back" aria-label="Retour à la bibliothèque">${icon('back')}</button>
        <div class="song-title"><b>${esc(s.title || 'Sans titre')}</b><span>${esc(s.artist || '')}${this.ctx.setlist ? ` · ${this.ctx.index + 1}/${this.ctx.setlist.songs.length} · ${esc(this.ctx.setlist.name)}` : ''}</span></div>
        <div class="spacer"></div>
        <div class="top-tools">
          ${this.ctx.setlist ? `<button class="icon-btn" data-act="prev-song" aria-label="Morceau précédent">${icon('prev')}</button><button class="icon-btn" data-act="next-song" aria-label="Morceau suivant">${icon('next')}</button>` : ''}
          <button class="key-chip" data-act="key" aria-label="Tonalité et transposition"></button>
          <div class="seg hide-m" role="tablist" aria-label="Affichage">
            <button data-mode="lyrics" title="Paroles et accords">Paroles</button>
            <button data-mode="stage" title="Mode scène : texte en très grand">Scène</button>
            <button data-mode="grid" title="Grille d’accords par mesure">Grille</button>
          </div>
          <button class="icon-btn" data-act="text" aria-label="Taille du texte">${icon('textsize')}</button>
          <button class="icon-btn" data-act="menu" aria-label="Plus d’actions">${icon('more')}</button>
        </div>
      </header>
      <div class="mob-chord" aria-live="off">
        <div class="now-chord" data-r="now"></div>
        <div class="next-chord" data-r="next"></div>
        <div class="mini" data-r="mini"></div>
      </div>
      <div class="stage">
        <div class="lyrics" tabindex="-1"></div>
        <div class="big"></div>
        <div class="grid-view"></div>
        <button class="btn small follow-btn" data-act="follow" hidden>${icon('sync')} Suivre la lecture</button>
        <div class="countdown" hidden></div>
      </div>
      <aside class="rail" aria-label="Accords et mixage">
        <div class="rail-sec" data-r="chords-sec">
          <h3><span>Accord</span>
            <span class="seg" role="tablist" aria-label="Instrument">
              <button data-inst="guitar">Guitare</button><button data-inst="ukulele">Ukulélé</button><button data-inst="piano">Piano</button>
            </span></h3>
          <div class="now-next">
            <div class="now-chord" data-r="now"></div>
            <div class="next-chord" data-r="next"></div>
            <div class="chord-progress"><i></i></div>
          </div>
          <div class="diagram" data-r="diagram"></div>
          <div class="formula" data-r="formula"></div>
        </div>
        <div class="rail-sec" data-r="mix-sec">
          <h3><span>Mixage</span><button class="btn ghost small" data-act="mix-reset">Tout remettre</button></h3>
          <div class="mixer"></div>
          <div class="presets"></div>
        </div>
        <div class="rail-sec" data-r="opts-sec"></div>
      </aside>
      <footer class="transport">
        <div class="t-left">
          <button class="icon-btn" data-act="back5" aria-label="Reculer de 5 secondes">${icon('back5')}</button>
          <button class="play" data-act="play" aria-label="Lecture">${icon('play')}</button>
          <button class="icon-btn" data-act="fwd5" aria-label="Avancer de 5 secondes">${icon('fwd5')}</button>
        </div>
        <div class="timeline">
          <span class="time" data-r="cur">0:00</span>
          <div class="track" role="slider" tabindex="0" aria-label="Position dans le morceau" aria-valuemin="0">
            <div class="lane-sec"></div>
            <div class="rail-bar"><canvas></canvas></div>
            <div class="done"></div>
            <div class="lane-ch"></div>
            <div class="loop" hidden></div>
            <div class="head"></div>
          </div>
          <span class="time end" data-r="dur">0:00</span>
        </div>
        <div class="t-right">
          <button class="icon-btn" data-act="loop" aria-label="Boucle A-B" title="Boucle A-B (L)">${icon('loop')}</button>
          <button class="rate-btn" data-act="rate" aria-label="Vitesse de lecture" title="Vitesse">1×</button>
          <button class="icon-btn" data-act="metro" aria-label="Métronome" title="Métronome (M)">${icon('metro')}</button>
          <button class="icon-btn only-m" data-act="sheet-mix" aria-label="Mixage">${icon('mix')}</button>
          <button class="icon-btn only-m" data-act="sheet-opts" aria-label="Réglages du morceau">${icon('settings')}</button>
        </div>
      </footer>
      <div class="scrim"></div>
      <div class="sheet-panel" data-sheet="mix" role="dialog" aria-label="Mixage"><div class="grip"></div><div class="rail-sec" style="border:0;padding:4px 0"><h3><span>Mixage</span><button class="btn ghost small" data-act="mix-reset">Tout remettre</button></h3><div class="mixer"></div><div class="presets"></div></div></div>
      <div class="sheet-panel" data-sheet="opts" role="dialog" aria-label="Réglages"><div class="grip"></div><div data-r="opts-m"></div></div>`;
    this.el = el;
    this.app.mount(el);
    this.$lyrics = el.querySelector('.lyrics');
    this.$big = el.querySelector('.big');
    this.$grid = el.querySelector('.grid-view');
    this.$track = el.querySelector('.track');
    this.renderLyrics();
    this.renderOptions();
    this.renderMixer();
    this.setMode(this.mode, false);
    this.setInstrument(this.instrument, false);
    if (this.fontSize) this.el.style.setProperty('--lyrics-size', this.fontSize + 'px');
    this.bind();
  }

  get display() {
    return this._display || (this._display = chordDisplay(this.song, this.song.prefs.transpose, this.song.prefs.capo));
  }

  refreshChords() {
    this._display = null;
    this.renderLyrics();
    this.renderKeyChip();
    this.lastChordIdx = -2;
    this.frame(true);
  }

  renderKeyChip() {
    const d = this.display;
    const p = this.song.prefs;
    const chip = this.el.querySelector('.key-chip');
    const label = d.keyLabel || '—';
    let extra = '';
    if (p.transpose) extra += ` <small>${p.transpose > 0 ? '+' : ''}${p.transpose}</small>`;
    if (p.capo) extra += ` <small>capo ${p.capo}</small>`;
    chip.innerHTML = `${esc(label)}${extra}`;
  }

  renderLyrics() {
    const s = this.song;
    this.timeline = chordTimeline(s.doc, s.duration || this.engine.duration, s.detectedChords);
    this.timedLines = [];
    s.doc.lines.forEach((l, li) => { if (l.type === 'lyric' && l.s != null) this.timedLines.push({ li, s: l.s, e: l.e }); });
    this.timedLines.sort((a, b) => a.s - b.s);
    this.synced = this.timedLines.length > 0;
    this.hasTimedChords = this.timeline.some((c) => c.t != null);
    const hasLines = s.doc.lines.some((l) => l.type === 'lyric' || l.type === 'chords');
    if (hasLines) {
      this.$lyrics.innerHTML = renderSheet(s.doc, { display: this.display });
    } else if (this.timeline.length) {
      // pas de paroles : on affiche la suite d'accords détectés
      this.$lyrics.innerHTML = `<div class="sheet"><p class="ln section">Accords détectés</p>${chunk(this.timeline, 4).map((g) => `<p class="ln chords-only">${g.map((c) => `<span class="cbar" data-t="${c.t}">${esc(this.display(c.name))}</span>`).join('')}</p>`).join('')}
        <p class="note" style="font-size:15px;margin-top:2em">Ajoute les paroles avec <b>Éditer</b> : colle le texte ou une grille d’accords.</p></div>`;
    } else {
      this.$lyrics.innerHTML = `<div class="sheet"><p class="note" style="font-size:17px">Pas encore de paroles pour ce morceau.</p>
        <p><button class="btn" data-act="edit">${icon('edit')} Ajouter paroles et accords</button></p></div>`;
    }
    this.$lyrics.classList.toggle('no-sync', !this.synced);
    this.$lyrics.classList.toggle('hide-chords', !this.showChords);
    this.lineEls = new Map();
    this.$lyrics.querySelectorAll('.ln[data-li]').forEach((p) => this.lineEls.set(+p.dataset.li, p));
    this.chordEls = new Map();
    this.$lyrics.querySelectorAll('[data-ci]').forEach((c) => this.chordEls.set(`${c.dataset.li}|${c.dataset.ci}`, c));
    this.sections = sectionsOf(s.doc, this.timeline);
    this.curLine = -2;
    this.lastChordIdx = -2;
    this.renderLanes();
    this.renderGrid();
    this.renderKeyChip();
  }

  renderLanes() {
    const dur = this.song.duration || this.engine.duration || 1;
    const secs = this.sections;
    const tw = this.$track.clientWidth || 600;
    this.el.querySelector('.lane-sec').innerHTML = secs.map((sec, i) => {
      const end = secs[i + 1]?.t ?? dur;
      const w = (end - sec.t) / dur;
      const txt = w * tw > 7 * Math.min(sec.label.length, 9) + 8 ? esc(sec.label) : '';
      return `<span class="k-${sec.kind || 'verse'}" style="left:${(sec.t / dur) * 100}%;width:${w * 100}%" title="${esc(sec.label)}">${txt}</span>`;
    }).join('');
    this.el.querySelector('.lane-ch').innerHTML = this.hasTimedChords
      ? this.timeline.filter((c) => c.t != null).map((c) => `<i style="left:${(c.t / dur) * 100}%;width:${Math.max(0.2, ((c.e - c.t) / dur) * 100 - 0.15)}%"></i>`).join('')
      : '';
    this.drawPeaks();
  }

  drawPeaks() {
    const peaks = this.song.peaks;
    const cv = this.el.querySelector('.rail-bar canvas');
    if (!peaks?.length || !cv) return;
    const r = cv.getBoundingClientRect();
    cv.width = Math.max(1, r.width * devicePixelRatio);
    cv.height = Math.max(1, r.height * devicePixelRatio);
    const g = cv.getContext('2d');
    g.fillStyle = getComputedStyle(this.el).getPropertyValue('--line-2');
    const n = peaks.length;
    for (let i = 0; i < cv.width; i++) {
      const v = peaks[Math.floor((i / cv.width) * n)] || 0;
      const h = Math.max(1, v * cv.height);
      g.fillRect(i, (cv.height - h) / 2, 1, h);
    }
  }

  // grille de mesures (temps forts → mesures de 4 temps)
  renderGrid() {
    const s = this.song;
    let downs = s.downbeats?.length ? s.downbeats : null;
    if (!downs && s.beats?.length > 8) downs = s.beats.filter((_, i) => i % 4 === 0);
    if (!downs && s.bpm && this.hasTimedChords) {
      const period = (60 / s.bpm) * 4;
      const t0 = this.timeline.find((c) => c.t != null)?.t || 0;
      downs = [];
      for (let t = t0 % period; t < (s.duration || this.engine.duration || 0); t += period) downs.push(t);
    }
    this.bars = [];
    if (!downs || !this.hasTimedChords) {
      this.$grid.innerHTML = `<p class="note" style="font-size:16px;max-width:40ch">La grille par mesure a besoin du tempo et des accords datés. Prépare le morceau avec le Studio, ou indique le tempo dans <b>Éditer → Infos</b>.</p>`;
      return;
    }
    const tl = this.timeline.filter((c) => c.t != null);
    let ci = 0;
    let lastName = null;
    let secI = 0;
    const html = [];
    for (let b = 0; b < downs.length; b++) {
      const a = downs[b];
      const z = downs[b + 1] ?? a + (downs[b] - (downs[b - 1] ?? a - 2));
      const names = [];
      while (ci < tl.length && tl[ci].t < z - 0.12) {
        if (tl[ci].t >= a - 0.12 || !names.length) {
          if (tl[ci].t >= a - 0.12) names.push(tl[ci].name);
        }
        ci++;
      }
      let sec = '';
      while (secI < this.sections.length && this.sections[secI].t < z - 0.1) {
        if (this.sections[secI].t >= a - 0.5 || b === 0) sec = this.sections[secI].label;
        secI++;
      }
      const shown = names.length ? names : lastName ? [lastName] : [];
      if (names.length) lastName = names[names.length - 1];
      this.bars.push({ a, z });
      html.push(`<div class="mbar${names.length ? '' : ' cont'}" data-t="${a}">${sec ? `<span class="sec">${esc(sec)}</span>` : ''}${shown.map((n) => `<b>${esc(this.display(n))}</b>`).join('') || '<b>–</b>'}<span class="n">${b + 1}</span></div>`);
    }
    this.$grid.innerHTML = `<div class="bars">${html.join('')}</div>`;
    this.barEls = [...this.$grid.querySelectorAll('.mbar')];
  }

  renderOptions() {
    const p = this.song.prefs;
    const audioOk = true;
    const html = `
      <h3><span>Réglages du morceau</span></h3>
      <div class="opt-row"><span>Transposer</span><span class="stepper"><button data-act="tr-">−</button><output data-r="tr">${fmtSemi(p.transpose)}</output><button data-act="tr+">+</button></span></div>
      <div class="opt-row"><span>Transposer aussi l’audio</span><label class="switch"><input type="checkbox" data-act="audio-pitch" ${p.audioPitch ? 'checked' : ''} ${audioOk ? '' : 'disabled'}><i></i></label></div>
      <div class="opt-row"><span>Capo</span><span class="stepper"><button data-act="capo-">−</button><output data-r="capo">${p.capo ? p.capo : 'aucun'}</output><button data-act="capo+">+</button></span></div>
      <div class="opt-row"><span>Vitesse</span><span class="stepper"><button data-act="rate-">−</button><output data-r="rate">${Math.round(p.rate * 100)} %</output><button data-act="rate+">+</button></span></div>
      <div class="opt-row"><span>Décompte avant lecture</span><label class="switch"><input type="checkbox" data-act="countin" ${p.countIn ? 'checked' : ''}><i></i></label></div>
      <div class="opt-row"><span>Métronome</span><label class="switch"><input type="checkbox" data-act="metro-switch"><i></i></label></div>
      <div class="opt-row"><span>Afficher les accords</span><label class="switch"><input type="checkbox" data-act="show-chords" ${this.showChords ? 'checked' : ''}><i></i></label></div>
      <div class="opt-row"><span>Décalage paroles</span><span class="stepper"><button data-act="off-">−</button><output data-r="off">${fmtOffset(p.offset)}</output><button data-act="off+">+</button></span></div>
      <div class="opt-row only-m"><span>Affichage</span><span class="seg"><button data-mode="lyrics">Paroles</button><button data-mode="stage">Scène</button><button data-mode="grid">Grille</button></span></div>
      <div class="opt-row only-m"><span>Diagrammes</span><span class="seg"><button data-inst="guitar">Guitare</button><button data-inst="ukulele">Ukulélé</button><button data-inst="piano">Piano</button></span></div>`;
    this.el.querySelector('[data-r="opts-sec"]').innerHTML = html;
    this.el.querySelector('[data-r="opts-m"]').innerHTML = html;
    this.syncModeButtons();
  }

  updateOptionOutputs() {
    const p = this.song.prefs;
    this.el.querySelectorAll('[data-r="tr"]').forEach((o) => { o.textContent = fmtSemi(p.transpose); });
    this.el.querySelectorAll('[data-r="capo"]').forEach((o) => { o.textContent = p.capo ? p.capo : 'aucun'; });
    this.el.querySelectorAll('[data-r="rate"]').forEach((o) => { o.textContent = Math.round(p.rate * 100) + ' %'; });
    this.el.querySelectorAll('[data-r="off"]').forEach((o) => { o.textContent = fmtOffset(p.offset); });
    this.el.querySelectorAll('[data-act="audio-pitch"]').forEach((i) => { i.checked = !!p.audioPitch; });
    this.el.querySelectorAll('[data-act="countin"]').forEach((i) => { i.checked = !!p.countIn; });
    this.el.querySelectorAll('[data-act="show-chords"]').forEach((i) => { i.checked = this.showChords; });
    const rb = this.el.querySelector('.rate-btn');
    rb.textContent = (Math.round(p.rate * 100) / 100).toString().replace('.', ',') + '×';
    rb.classList.toggle('changed', p.rate !== 1);
  }

  renderMixer() {
    const s = this.song;
    const stems = sortStems(s.stems);
    const strips = stems.map((st) => {
      const m = s.mix[st.id] || { vol: 1 };
      const color = STEM_KINDS[st.kind]?.color || 'var(--c-other)';
      return `<div class="strip${m.mute ? ' muted' : ''}" data-id="${st.id}" style="--k:${color}">
        <div class="fader" tabindex="0" role="slider" aria-label="Volume ${esc(st.label)}" aria-valuemin="0" aria-valuemax="150">
          <div class="stem"></div><div class="level"></div><div class="unity"></div><div class="kn"></div>
        </div>
        <span class="pct"></span>
        <div class="ms"><button class="m${m.mute ? ' on' : ''}" data-act="mute" title="Couper">M</button><button class="s${m.solo ? ' on' : ''}" data-act="solo" title="Seul">S</button></div>
        <span class="lbl" title="${esc(st.label)}">${esc(st.label)}</span>
      </div>`;
    }).join('');
    const master = `<div class="strip" data-id="master" style="--k:var(--ink-3)">
        <div class="fader" tabindex="0" role="slider" aria-label="Volume général" aria-valuemin="0" aria-valuemax="150"><div class="stem"></div><div class="unity"></div><div class="kn"></div></div>
        <span class="pct"></span><div class="ms" style="visibility:hidden"><button>M</button></div><span class="lbl">Général</span></div>`;
    const kinds = new Set(stems.map((x) => x.kind));
    const presets = [];
    if (kinds.has('vocals')) presets.push(['karaoke', 'Sans la voix'], ['voice', 'Voix seule']);
    for (const k of ['guitar', 'piano', 'bass', 'drums']) if (kinds.has(k)) presets.push(['no-' + k, 'Sans ' + STEM_KINDS[k].label.toLowerCase()]);
    const presetHtml = presets.map(([k, l]) => `<button class="chip" data-preset="${k}">${esc(l)}</button>`).join('');
    this.el.querySelectorAll('.mixer').forEach((m) => { m.innerHTML = stems.length ? strips + (stems.length > 1 ? master : '') : '<p class="note">Aucune piste audio.</p>'; });
    this.el.querySelectorAll('.presets').forEach((p) => { p.innerHTML = presetHtml; });
    this.el.querySelectorAll('.strip').forEach((strip) => this.bindStrip(strip));
    this.updateStrips();
  }

  updateStrips() {
    const s = this.song;
    this.el.querySelectorAll('.strip').forEach((strip) => {
      const id = strip.dataset.id;
      const v = id === 'master' ? s.master ?? 1 : s.mix[id]?.vol ?? 1;
      const kn = strip.querySelector('.kn');
      const f = strip.querySelector('.fader');
      const h = f.clientHeight || 150;
      const usable = h - 20;
      kn.style.top = `${10 + usable * (1 - v / 1.5)}px`;
      strip.querySelector('.unity').style.top = `${10 + usable * (1 - 1 / 1.5)}px`;
      strip.querySelector('.pct').textContent = Math.round(v * 100) + ' %';
      f.setAttribute('aria-valuenow', Math.round(v * 100));
      if (id !== 'master') {
        const m = s.mix[id] || {};
        strip.classList.toggle('muted', !!m.mute);
        strip.querySelector('.m').classList.toggle('on', !!m.mute);
        strip.querySelector('.s').classList.toggle('on', !!m.solo);
      }
    });
  }

  bindStrip(strip) {
    const id = strip.dataset.id;
    const fader = strip.querySelector('.fader');
    const set = (v) => {
      v = Math.max(0, Math.min(1.5, v));
      if (Math.abs(v - 1) < 0.04) v = 1; // aimant sur 100 %
      if (id === 'master') { this.song.master = v; this.engine.setMaster(v); }
      else { this.song.mix[id] = { ...(this.song.mix[id] || {}), vol: v }; this.engine.setTrack(id, { vol: v }); }
      this.updateStrips();
      this.saveSong();
    };
    const fromY = (e) => {
      const r = fader.getBoundingClientRect();
      return 1.5 * (1 - (e.clientY - r.top - 10) / (r.height - 20));
    };
    drag(fader, { onStart: (e) => set(fromY(e)), onMove: (e) => set(fromY(e)) });
    fader.addEventListener('dblclick', () => set(1));
    fader.addEventListener('keydown', (e) => {
      const cur = id === 'master' ? this.song.master ?? 1 : this.song.mix[id]?.vol ?? 1;
      if (e.key === 'ArrowUp' || e.key === 'ArrowRight') { e.preventDefault(); e.stopPropagation(); set(cur + 0.05); }
      if (e.key === 'ArrowDown' || e.key === 'ArrowLeft') { e.preventDefault(); e.stopPropagation(); set(cur - 0.05); }
      if (e.key === 'Home') set(1);
    });
    strip.querySelector('[data-act="mute"]')?.addEventListener('click', () => this.toggleMix(id, 'mute'));
    strip.querySelector('[data-act="solo"]')?.addEventListener('click', () => this.toggleMix(id, 'solo'));
  }

  toggleMix(id, field) {
    const m = { vol: 1, ...(this.song.mix[id] || {}) };
    m[field] = !m[field];
    this.song.mix[id] = m;
    this.engine.setTrack(id, { [field]: m[field] });
    this.updateStrips();
    this.saveSong();
  }

  applyPreset(k) {
    const s = this.song;
    for (const st of s.stems) {
      const m = (s.mix[st.id] = { ...(s.mix[st.id] || {}), vol: 1, mute: st.kind === 'instrumental' && s.stems.length > 2, solo: false });
      if (k === 'karaoke' && (st.kind === 'vocals' || st.kind === 'backing')) m.mute = true;
      if (k === 'voice') m.solo = st.kind === 'vocals';
      if (k.startsWith('no-') && st.kind === k.slice(3)) m.mute = true;
      this.engine.setTrack(st.id, { vol: m.vol, mute: m.mute, solo: m.solo });
    }
    this.updateStrips();
    this.saveSong();
  }

  // ─────────────────────────────────────────────────────────── audio ──

  async loadAudio() {
    const s = this.song;
    const stems = [];
    for (const st of s.stems) {
      const blob = st.url ? null : await db.getBlob(st.blobId);
      if (!blob && !st.url) continue;
      const m = s.mix[st.id] || {};
      stems.push({ id: st.id, kind: st.kind, label: st.label, blob, url: st.url, vol: m.vol ?? 1, mute: !!m.mute, solo: !!m.solo, pan: m.pan || 0 });
    }
    await this.engine.load(stems, { duration: s.duration });
    if (!s.duration && this.engine.duration) { s.duration = this.engine.duration; this.renderLyrics(); }
    this.engine.setMaster(s.master ?? 1);
    this.engine.setRate(s.prefs.rate || 1);
    this.engine.setSemitones(s.prefs.audioPitch ? s.prefs.transpose : 0);
    this.engine.setBeats(s.beats?.length ? s.beats : beatsFromBpm(s), s.downbeats);
    this.engine.setMetronome(false);
    this.engine.addEventListener('time', this._onTime);
    this._engineH = {};
    for (const ev of ['play', 'pause', 'seek', 'loop', 'rate', 'ended']) {
      this._engineH[ev] = () => this.onEngine(ev);
      this.engine.addEventListener(ev, this._engineH[ev]);
    }
    this._engineH.blocked = () => toast('Touche lecture pour démarrer le son');
    this.engine.addEventListener('blocked', this._engineH.blocked);
    this.el.querySelector('[data-r="dur"]').textContent = fmtTime(s.duration || this.engine.duration);
    this.updateOptionOutputs();
    this.frame(true);
    this.startMeters();
  }

  onEngine(ev) {
    const playBtn = this.el?.querySelector('.play');
    if (!playBtn) return;
    if (ev === 'play' || ev === 'pause' || ev === 'ended') {
      playBtn.innerHTML = icon(this.engine.playing ? 'pause' : 'play');
      playBtn.setAttribute('aria-label', this.engine.playing ? 'Pause' : 'Lecture');
      if (this.engine.playing) this.requestWake(); else this.releaseWake();
      if ('mediaSession' in navigator) navigator.mediaSession.playbackState = this.engine.playing ? 'playing' : 'paused';
    }
    if (ev === 'seek') { this.userScrollAt = 0; this.frame(true); }
    if (ev === 'loop') this.renderLoop();
    if (ev === 'ended') this.onEnded();
  }

  onEnded() {
    if (this.ctx.setlist && this.ctx.index < this.ctx.setlist.songs.length - 1) {
      toast('Morceau suivant dans 3 secondes…');
      this.autoNext = setTimeout(() => this.app.playFromSetlist(this.ctx.setlist, this.ctx.index + 1), 3000);
    }
  }

  async togglePlay() {
    if (this.engine.playing) { this.engine.pause(); return; }
    const p = this.song.prefs;
    if (p.countIn) {
      const bpm = this.song.bpm || 100;
      this.showCountdown(bpm);
      await this.engine.countIn(bpm * 1, 4);
    } else {
      await this.engine.play();
    }
  }

  showCountdown(bpm) {
    const el = this.el.querySelector('.countdown');
    const period = 60 / bpm / this.engine.rate;
    el.hidden = false;
    let n = 4;
    el.textContent = n;
    const iv = setInterval(() => {
      n--;
      if (n <= 0) { clearInterval(iv); el.hidden = true; return; }
      el.textContent = n;
    }, period * 1000);
  }

  startMeters() {
    clearInterval(this.meterTimer);
    this.meterTimer = setInterval(() => {
      if (!this.el || !this.engine.playing) return;
      const lv = this.engine.levels();
      this.el.querySelectorAll('.strip[data-id]').forEach((strip) => {
        const l = strip.querySelector('.level');
        if (!l) return;
        const v = lv[strip.dataset.id] || 0;
        l.style.height = `${Math.round(v * ((strip.querySelector('.fader').clientHeight || 150) - 20))}px`;
      });
    }, 60);
  }

  async requestWake() {
    try { if ('wakeLock' in navigator && !this.wake) { this.wake = await navigator.wakeLock.request('screen'); this.wake.addEventListener('release', () => { this.wake = null; }); } } catch { /* */ }
  }

  releaseWake() { try { this.wake?.release(); } catch { /* */ } this.wake = null; }

  setupMediaSession() {
    if (!('mediaSession' in navigator)) return;
    const s = this.song;
    navigator.mediaSession.metadata = new MediaMetadata({ title: s.title || 'MusiMix', artist: s.artist || '', artwork: [{ src: new URL('assets/icons/icon-512.png', location.href).href, sizes: '512x512', type: 'image/png' }] });
    const h = {
      play: () => this.engine.play(), pause: () => this.engine.pause(),
      seekbackward: () => this.engine.skip(-5), seekforward: () => this.engine.skip(5),
      seekto: (d) => this.engine.seek(d.seekTime),
      previoustrack: this.ctx.setlist ? () => this.app.playFromSetlist(this.ctx.setlist, this.ctx.index - 1) : null,
      nexttrack: this.ctx.setlist ? () => this.app.playFromSetlist(this.ctx.setlist, this.ctx.index + 1) : null,
    };
    for (const [k, fn] of Object.entries(h)) { try { navigator.mediaSession.setActionHandler(k, fn); } catch { /* */ } }
  }

  // ───────────────────────────────────────────────────── synchronisation ──

  get t() { return this.engine.displayTime + (this.song.prefs.offset || 0) / 1000; }

  frame(force = false) {
    if (!this.el) return;
    const t = this.t;
    const dur = this.song.duration || this.engine.duration || 0;
    // barre de lecture
    const pct = dur ? Math.min(100, (this.engine.currentTime / dur) * 100) : 0;
    this.$track.querySelector('.done').style.width = pct + '%';
    this.$track.querySelector('.head').style.left = pct + '%';
    this.$track.setAttribute('aria-valuenow', Math.round(this.engine.currentTime));
    this.$track.setAttribute('aria-valuetext', fmtTime(this.engine.currentTime));
    this.el.querySelector('[data-r="cur"]').textContent = fmtTime(this.engine.currentTime);
    if (dur && !this.$track.getAttribute('aria-valuemax')) this.$track.setAttribute('aria-valuemax', Math.round(dur));

    this.syncLines(t, force);
    this.syncChords(t, force);
    if (this.mode === 'grid') this.syncGrid(t, force);
  }

  syncLines(t, force) {
    if (this.synced) {
      const tl = this.timedLines;
      let i = -1;
      let lo = 0, hi = tl.length - 1;
      while (lo <= hi) { const mid = (lo + hi) >> 1; if (tl[mid].s <= t + 0.05) { i = mid; lo = mid + 1; } else hi = mid - 1; }
      const li = i >= 0 ? tl[i].li : -1;
      if (li !== this.curLine || force) {
        const prev = this.lineEls.get(this.curLine);
        prev?.classList.remove('cur');
        prev?.querySelectorAll('.w').forEach((w) => { w.classList.remove('sung', 'singing'); w.style.removeProperty('--p'); });
        this.lineEls.forEach((p, k) => p.classList.toggle('past', k < li && p.classList.contains('lyric')));
        const cur = this.lineEls.get(li);
        cur?.classList.add('cur');
        this.curLine = li;
        this.curWords = cur ? [...cur.querySelectorAll('.w[data-s]')].map((w) => ({ w, s: +w.dataset.s, e: +w.dataset.e })) : [];
        if (this.mode === 'stage') this.renderBig(i);
      }
      // karaoké mot à mot
      for (const x of this.curWords || []) {
        if (t >= x.e) { if (!x.done) { x.w.classList.add('sung'); x.w.classList.remove('singing'); x.done = true; } }
        else if (t >= x.s) { x.done = false; x.w.classList.remove('sung'); x.w.classList.add('singing'); x.w.style.setProperty('--p', `${((t - x.s) / Math.max(0.05, x.e - x.s)) * 100}%`); }
        else if (x.done !== null) { x.w.classList.remove('sung', 'singing'); x.done = null; }
      }
      if (this.mode === 'stage') this.syncBigWords(t);
      this.autoScroll(this.lineEls.get(this.curLine), force);
    } else if (this.mode === 'lyrics') {
      // sans synchro : défilement proportionnel à la durée, en pause si on fait défiler à la main
      const dur = this.song.duration || this.engine.duration;
      if (!dur || !this.engine.playing || performance.now() - this.userScrollAt < 4000) return;
      const L = this.$lyrics;
      const max = L.scrollHeight - L.clientHeight;
      const target = (t / dur) * max;
      this.smoothScrollTo(target);
    }
  }

  autoScroll(lineEl, force) {
    if (this.mode !== 'lyrics' || !lineEl) return;
    if (!force && performance.now() - this.userScrollAt < 4000) return;
    this.el.querySelector('.follow-btn').hidden = true;
    const L = this.$lyrics;
    const target = lineEl.offsetTop - L.clientHeight * 0.32;
    if (force) { this._scrolling = true; L.scrollTop = target; setTimeout(() => { this._scrolling = false; }, 50); }
    else this.smoothScrollTo(target);
  }

  smoothScrollTo(target) {
    const L = this.$lyrics;
    const cur = L.scrollTop;
    const d = target - cur;
    if (Math.abs(d) < 1) return;
    this._scrolling = true;
    L.scrollTop = cur + d * 0.14;
    clearTimeout(this._scrollT);
    this._scrollT = setTimeout(() => { this._scrolling = false; }, 80);
  }

  renderBig(i) {
    const tl = this.timedLines;
    const doc = this.song.doc;
    const cur = i >= 0 ? doc.lines[tl[i].li] : null;
    const nxt = doc.lines[tl[i + 1]?.li];
    let tag = '';
    if (i >= 0) {
      for (let k = tl[i].li; k >= 0; k--) if (doc.lines[k].type === 'section') { tag = doc.lines[k].label; break; }
    }
    const curHtml = cur ? lyricLine(cur, tl[i].li, this.display, 'cur now-line') : '<p class="ln now-line" style="color:var(--ink-3)">…</p>';
    const nextHtml = nxt ? `<div class="next-line">${esc(nxt.text)}</div>` : '';
    this.$big.innerHTML = `${tag ? `<div class="tag">${esc(tag)}</div>` : ''}${curHtml}${nextHtml}`;
    this.bigWords = [...this.$big.querySelectorAll('.now-line .w[data-s]')].map((w) => ({ w, s: +w.dataset.s, e: +w.dataset.e }));
  }

  syncBigWords(t) {
    for (const x of this.bigWords || []) {
      if (t >= x.e) { x.w.classList.add('sung'); x.w.classList.remove('singing'); }
      else if (t >= x.s) { x.w.classList.add('singing'); x.w.style.setProperty('--p', `${((t - x.s) / Math.max(0.05, x.e - x.s)) * 100}%`); }
      else x.w.classList.remove('sung', 'singing');
    }
  }

  syncChords(t, force) {
    const tl = this.timeline;
    if (!tl.length || !this.hasTimedChords) {
      if (force) this.showAllChords();
      return;
    }
    const times = this._chordTimes || (this._chordTimes = tl.map((c) => c.t ?? Infinity));
    if (this._chordTimesFor !== tl) { this._chordTimes = tl.map((c) => c.t ?? Infinity); this._chordTimesFor = tl; }
    const idx = lowerBound(this._chordTimes, t + 0.06) - 1;
    if (idx !== this.lastChordIdx || force) {
      const prevC = tl[this.lastChordIdx];
      if (prevC) this.chordEls.get(`${prevC.li}|${prevC.ci}`)?.classList.remove('now');
      this.lastChordIdx = idx;
      const c = tl[idx];
      if (c) this.chordEls.get(`${c.li}|${c.ci}`)?.classList.add('now');
      let n = idx + 1;
      while (tl[n] && c && tl[n].name === c.name) n++;
      this.showChord(c ? c.name : null, tl[n]?.name || null);
    }
    const c = tl[idx];
    if (c) {
      const p = Math.min(1, Math.max(0, (t - c.t) / Math.max(0.1, (c.e - c.t))));
      this.el.querySelector('.chord-progress i').style.width = (p * 100) + '%';
    }
  }

  showChord(name, next) {
    const d = this.display;
    const shown = name ? d(name) : '';
    const nextShown = next ? d(next) : '';
    this.el.querySelectorAll('[data-r="now"]').forEach((e) => { e.textContent = shown || '–'; });
    if (this.mode === 'stage' && !this.synced) {
      this.$big.innerHTML = `<div class="tag">Accord</div><div class="now-line big-chord">${esc(shown || '–')}</div>${nextShown ? `<div class="next-line">ensuite ${esc(nextShown)}</div>` : ''}`;
    }
    this.el.querySelectorAll('[data-r="next"]').forEach((e) => { e.innerHTML = nextShown ? `<small>ensuite</small>${esc(nextShown)}` : ''; });
    const key = shown + '|' + this.instrument + '|' + (this.voicingIdx[shown] || 0) + '|' + nextShown;
    if (key === this._diagKey) return;
    this._diagKey = key;
    const dg = this.el.querySelector('[data-r="diagram"]');
    const fm = this.el.querySelector('[data-r="formula"]');
    const mini = this.el.querySelector('[data-r="mini"]');
    if (!shown) { dg.innerHTML = ''; fm.textContent = ''; mini.innerHTML = ''; return; }
    const idx = this.voicingIdx[shown] || 0;
    const nv = this.instrument === 'piano' ? 0 : voicings(shown, this.instrument).length;
    const main = diagramSVG(shown, this.instrument, { index: idx });
    const nextD = nextShown && this.instrument !== 'piano' ? diagramSVG(nextShown, this.instrument, { index: this.voicingIdx[nextShown] || 0 }).replace('class="fretboard"', 'class="fretboard next"') : '';
    dg.innerHTML = `<div>${main}${nv > 1 ? `<div class="alt">Doigté ${idx % nv + 1}/${nv} · touche pour changer</div>` : ''}</div>${nextD}`;
    const f = chordFormula(shown);
    fm.textContent = f ? f.notes.join(' · ') + (f.bass ? ` / basse ${f.bass}` : '') : '';
    mini.innerHTML = diagramSVG(shown, this.instrument, { index: idx });
  }

  /** Sans accords datés : tous les accords du morceau, en diagrammes. */
  showAllChords() {
    const names = uniqueChords(this.song.doc, this.display, this.song.detectedChords);
    const sec = this.el.querySelector('[data-r="chords-sec"]');
    sec.querySelector('.now-next').hidden = true;
    this.el.querySelector('[data-r="formula"]').textContent = names.length ? 'Les accords se suivront en direct une fois le morceau synchronisé (Studio ou Éditer → Synchro).' : '';
    const dg = this.el.querySelector('[data-r="diagram"]');
    dg.style.flexWrap = 'wrap';
    dg.innerHTML = names.map((n) => `<figure style="margin:0;display:grid;justify-items:center;gap:2px"><figcaption style="font-weight:800;color:var(--chord)">${esc(n)}</figcaption>${diagramSVG(n, this.instrument).replace('class="fretboard"', 'class="fretboard" style="width:78px"').replace('class="piano"', 'class="piano" style="width:130px"')}</figure>`).join('');
    this.el.querySelector('.mob-chord').hidden = true;
  }

  syncGrid(t) {
    if (!this.bars?.length) return;
    let i = -1;
    for (let k = 0; k < this.bars.length; k++) if (this.bars[k].a <= t + 0.05) i = k; else break;
    if (i === this.curBar) return;
    this.barEls?.[this.curBar]?.classList.remove('cur');
    this.curBar = i;
    const b = this.barEls?.[i];
    if (b) {
      b.classList.add('cur');
      const G = this.$grid;
      const target = b.offsetTop - G.clientHeight * 0.3;
      if (Math.abs(G.scrollTop - target) > 40) G.scrollTo({ top: target, behavior: 'smooth' });
    }
  }

  renderLoop() {
    const L = this.engine.loop;
    const el = this.$track.querySelector('.loop');
    const btn = this.el.querySelector('[data-act="loop"]');
    const dur = this.song.duration || this.engine.duration || 1;
    if (L) {
      el.hidden = false;
      el.style.left = (L.a / dur) * 100 + '%';
      el.style.width = ((L.b - L.a) / dur) * 100 + '%';
      btn.classList.add('changed');
      btn.title = `Boucle ${fmtTime(L.a)} → ${fmtTime(L.b)} (L pour arrêter)`;
    } else if (this.loopA != null) {
      el.hidden = false;
      el.style.left = (this.loopA / dur) * 100 + '%';
      el.style.width = '2px';
      btn.classList.add('changed');
    } else {
      el.hidden = true;
      btn.classList.remove('changed');
      btn.title = 'Boucle A-B (L)';
    }
  }

  toggleLoop() {
    const t = this.engine.currentTime;
    if (this.engine.loop) { this.engine.setLoop(null, null); this.loopA = null; toast('Boucle arrêtée'); }
    else if (this.loopA == null) { this.loopA = t; this.renderLoop(); toast('Début de boucle posé. Appuie encore pour la fin.'); }
    else {
      const a = Math.min(this.loopA, t), b = Math.max(this.loopA, t);
      this.loopA = null;
      if (b - a < 0.5) { toast('Boucle trop courte'); this.renderLoop(); return; }
      this.engine.setLoop(a, b);
      toast(`Boucle ${fmtTime(a)} → ${fmtTime(b)}`);
      if (!this.engine.playing) this.engine.seek(a);
    }
    this.renderLoop();
  }

  loopSection(sec) {
    const i = this.sections.indexOf(sec);
    const end = this.sections[i + 1]?.t ?? (this.song.duration || this.engine.duration);
    this.loopA = null;
    this.engine.setLoop(sec.t, end);
    this.engine.seek(sec.t);
    toast(`Boucle : ${sec.label}`);
  }

  // ─────────────────────────────────────────────────────────── actions ──

  setMode(mode, save = true) {
    this.mode = mode;
    const stage = this.el.querySelector('.stage');
    stage.classList.toggle('stage-mode', mode === 'stage');
    stage.classList.toggle('grid-mode', mode === 'grid');
    this.syncModeButtons();
    this.curLine = -2;
    this.curBar = -2;
    this.lastChordIdx = -2;
    this.frame(true);
    if (mode === 'stage' && !this.synced && !this.hasTimedChords) this.$big.innerHTML = '<div class="next-line">Le mode scène suit les paroles synchronisées ou les accords datés. Prépare le morceau avec le Studio, ou synchronise-le dans Éditer.</div>';
    if (save) this.app.setPref('viewMode', mode);
  }

  syncModeButtons() {
    this.el.querySelectorAll('[data-mode]').forEach((b) => b.classList.toggle('on', b.dataset.mode === this.mode));
    this.el.querySelectorAll('[data-inst]').forEach((b) => b.classList.toggle('on', b.dataset.inst === this.instrument));
  }

  setInstrument(inst, save = true) {
    this.instrument = inst;
    this._diagKey = null;
    this.syncModeButtons();
    this.lastChordIdx = -2;
    this.frame(true);
    if (!this.hasTimedChords) this.showAllChords();
    if (save) this.app.setPref('instrument', inst);
  }

  async setTranspose(n) {
    const p = this.song.prefs;
    p.transpose = Math.max(-11, Math.min(11, n));
    if (p.audioPitch) await this.engine.setSemitones(p.transpose);
    this.updateOptionOutputs();
    this.refreshChords();
    this.saveSong();
  }

  bind() {
    const el = this.el;
    el.addEventListener('click', (e) => {
      const modeB = e.target.closest('[data-mode]');
      if (modeB) { this.setMode(modeB.dataset.mode); return; }
      const instB = e.target.closest('[data-inst]');
      if (instB) { this.setInstrument(instB.dataset.inst); return; }
      const pre = e.target.closest('[data-preset]');
      if (pre) { this.applyPreset(pre.dataset.preset); return; }
      const chordEl = e.target.closest('.c, .cbar');
      if (chordEl && chordEl.closest('.lyrics')) {
        const li = +chordEl.dataset.li, ci = +chordEl.dataset.ci;
        const c = this.timeline.find((x) => x.li === li && x.ci === ci) || (chordEl.dataset.t ? { t: +chordEl.dataset.t } : null);
        if (c?.t != null) { this.engine.seek(Math.max(0, c.t - 0.05)); return; }
      }
      const line = e.target.closest('.lyrics .ln.lyric');
      if (line && line.dataset.s) { this.engine.seek(Math.max(0, +line.dataset.s - 0.25)); this.userScrollAt = 0; return; }
      const bar = e.target.closest('.mbar[data-t]');
      if (bar) { this.engine.seek(+bar.dataset.t); return; }
      const dg = e.target.closest('[data-r="diagram"], [data-r="mini"]');
      if (dg) {
        const name = this.el.querySelector('[data-r="now"]').textContent;
        this.voicingIdx[name] = (this.voicingIdx[name] || 0) + 1;
        this._diagKey = null;
        this.showChord(this.timeline[this.lastChordIdx]?.name, this.timeline[this.lastChordIdx + 1]?.name);
        return;
      }
      const secSpan = e.target.closest('.lane-sec span');
      if (secSpan) {
        const i = [...secSpan.parentNode.children].indexOf(secSpan);
        const sec = this.sections[i];
        if (sec) openMenu(secSpan, [
          { icon: 'play', label: `Aller à « ${sec.label} »`, action: () => this.engine.seek(sec.t) },
          { icon: 'loop', label: 'Boucler cette partie', action: () => this.loopSection(sec) },
        ]);
        return;
      }
      const b = e.target.closest('[data-act]');
      if (!b) return;
      this.action(b.dataset.act, b, e);
    });
    el.addEventListener('change', (e) => {
      const a = e.target.dataset.act;
      if (a === 'audio-pitch') {
        this.song.prefs.audioPitch = e.target.checked;
        this.engine.setSemitones(e.target.checked ? this.song.prefs.transpose : 0);
        if (e.target.checked && !this.engine.pitchAvailable) toast('Transposition audio indisponible sur ce navigateur');
        this.updateOptionOutputs();
        this.saveSong();
      }
      if (a === 'metro-switch') { this.el.querySelector('.t-right [data-act="metro"]').click(); }
      if (a === 'countin') { this.song.prefs.countIn = e.target.checked; this.updateOptionOutputs(); this.saveSong(); }
      if (a === 'show-chords') {
        this.showChords = e.target.checked;
        this.$lyrics.classList.toggle('hide-chords', !this.showChords);
        this.app.setPref('showChords', this.showChords);
        this.updateOptionOutputs();
      }
    });
    // défilement manuel → on arrête de suivre quelques secondes
    const markUser = () => { if (!this._scrolling) { this.userScrollAt = performance.now(); if (this.engine.playing && this.mode === 'lyrics') el.querySelector('.follow-btn').hidden = false; } };
    this.$lyrics.addEventListener('wheel', markUser, { passive: true });
    this.$lyrics.addEventListener('touchmove', markUser, { passive: true });
    this.$lyrics.addEventListener('keydown', (e) => { if (['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown'].includes(e.key)) markUser(); });
    // barre de progression
    const tr = this.$track;
    const posT = (e) => {
      const r = tr.getBoundingClientRect();
      return Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)) * (this.song.duration || this.engine.duration || 0);
    };
    let wasPlaying = false;
    drag(tr, {
      onStart: (e) => { if (e.target.closest('.lane-sec span')) return; wasPlaying = this.engine.playing; this.scrubT = posT(e); this.showScrub(this.scrubT); },
      onMove: (e) => { if (this.scrubT == null) return; this.scrubT = posT(e); this.showScrub(this.scrubT); },
      onEnd: () => { if (this.scrubT == null) return; this.engine.seek(this.scrubT); this.scrubT = null; this.showScrub(null); if (wasPlaying && !this.engine.playing) this.engine.play(); },
    });
    tr.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft') { e.preventDefault(); e.stopPropagation(); this.engine.skip(-5); }
      if (e.key === 'ArrowRight') { e.preventDefault(); e.stopPropagation(); this.engine.skip(5); }
    });
    el.querySelector('.scrim').addEventListener('click', () => this.closeSheets());
    window.addEventListener('resize', this._onResize = debounce(() => { this.updateStrips(); this.renderLanes(); }, 150));
  }

  showScrub(t) {
    let tip = this.$track.querySelector('.hover-t');
    if (t == null) { tip?.remove(); return; }
    if (!tip) { tip = document.createElement('div'); tip.className = 'hover-t'; this.$track.appendChild(tip); }
    const dur = this.song.duration || this.engine.duration || 1;
    tip.style.left = (t / dur) * 100 + '%';
    tip.textContent = fmtTime(t);
    this.$track.querySelector('.head').style.left = (t / dur) * 100 + '%';
  }

  openSheet(name) {
    this.el.querySelectorAll('.sheet-panel').forEach((p) => p.classList.toggle('open', p.dataset.sheet === name));
    this.el.querySelector('.scrim').classList.add('on');
    setTimeout(() => this.updateStrips(), 30);
  }

  closeSheets() {
    this.el.querySelectorAll('.sheet-panel').forEach((p) => p.classList.remove('open'));
    this.el.querySelector('.scrim').classList.remove('on');
  }

  async action(a, b) {
    const p = this.song.prefs;
    switch (a) {
      case 'back': this.app.go('#/'); break;
      case 'play': this.togglePlay(); break;
      case 'back5': this.engine.skip(-5); break;
      case 'fwd5': this.engine.skip(5); break;
      case 'loop': this.toggleLoop(); break;
      case 'follow': this.userScrollAt = 0; b.hidden = true; this.frame(true); break;
      case 'edit': this.app.go(`#/edit/${this.song.id}`); break;
      case 'tr-': this.setTranspose(p.transpose - 1); break;
      case 'tr+': this.setTranspose(p.transpose + 1); break;
      case 'capo-': p.capo = Math.max(0, (p.capo || 0) - 1); this.updateOptionOutputs(); this.refreshChords(); this.saveSong(); break;
      case 'capo+': p.capo = Math.min(11, (p.capo || 0) + 1); this.updateOptionOutputs(); this.refreshChords(); this.saveSong(); break;
      case 'rate-': case 'rate+': {
        p.rate = Math.round(Math.max(0.5, Math.min(1.5, p.rate + (a === 'rate+' ? 0.05 : -0.05))) * 100) / 100;
        this.engine.setRate(p.rate); this.updateOptionOutputs(); this.saveSong(); break;
      }
      case 'off-': case 'off+': p.offset = (p.offset || 0) + (a === 'off+' ? 50 : -50); this.updateOptionOutputs(); this.frame(true); this.saveSong(); break;
      case 'rate':
        openMenu(b, [0.5, 0.6, 0.7, 0.75, 0.8, 0.85, 0.9, 1, 1.1, 1.25].map((r) => ({
          label: `${Math.round(r * 100)} %${r === 1 ? ' (normal)' : ''}${Math.abs(r - p.rate) < 0.001 ? '  ✓' : ''}`,
          action: () => { p.rate = r; this.engine.setRate(r); this.updateOptionOutputs(); this.saveSong(); },
        })));
        break;
      case 'metro': {
        const on = !this.engine.metronome.on;
        if (on && !this.engine.metronome.beats.length) { toast('Pas de tempo connu pour ce morceau (Éditer → Infos)'); return; }
        await this.engine.ensureContext();
        this.engine.setMetronome(on);
        this.el.querySelector('.t-right [data-act="metro"]').classList.toggle('changed', on);
        this.el.querySelectorAll('[data-act="metro-switch"]').forEach((i) => { i.checked = on; });
        toast(on ? 'Métronome activé' : 'Métronome coupé');
        break;
      }
      case 'key':
        openMenu(b, [
          { label: 'Monter d’un demi-ton', icon: 'plus', action: () => this.setTranspose(p.transpose + 1) },
          { label: 'Descendre d’un demi-ton', icon: 'back', action: () => this.setTranspose(p.transpose - 1) },
          { label: p.audioPitch ? 'Ne transposer que les accords' : 'Transposer aussi l’audio', icon: 'sync', action: () => { p.audioPitch = !p.audioPitch; this.engine.setSemitones(p.audioPitch ? p.transpose : 0); this.updateOptionOutputs(); this.saveSong(); toast(p.audioPitch ? 'L’audio suit la transposition' : 'Seuls les accords sont transposés'); } },
          '-',
          { label: 'Tonalité d’origine', icon: 'undo', action: () => this.setTranspose(0) },
        ]);
        break;
      case 'text': {
        const cur = parseFloat(getComputedStyle(this.el).getPropertyValue('--lyrics-size')) || 26;
        openMenu(b, [
          { label: 'Plus grand', icon: 'plus', action: () => this.setFont(cur + 2) },
          { label: 'Plus petit', icon: 'textsize', action: () => this.setFont(cur - 2) },
          { label: 'Taille normale', icon: 'undo', action: () => this.setFont(null) },
        ]);
        break;
      }
      case 'menu':
        openMenu(b, [
          { icon: 'edit', label: 'Paroles et accords', action: () => this.app.go(`#/edit/${this.song.id}`) },
          { icon: 'tap', label: 'Synchroniser les paroles', action: () => this.app.go(`#/edit/${this.song.id}/sync`) },
          { icon: 'info', label: 'Infos et pistes', action: () => this.app.go(`#/edit/${this.song.id}/info`) },
          '-',
          { icon: 'pdf', label: 'Exporter en PDF', action: () => this.app.printSong(this.song, { transpose: p.transpose - p.capo, instrument: this.instrument }) },
          { icon: 'download', label: 'Télécharger le pack (ZIP)', action: async () => { toast('Préparation du pack…'); const { blob, name } = await exportPack(this.song); download(blob, name); } },
          { icon: 'list', label: 'Ajouter à une setlist', action: () => this.app.addToSetlist(this.song) },
        ]);
        break;
      case 'sheet-mix': this.openSheet('mix'); break;
      case 'sheet-opts': this.openSheet('opts'); break;
      case 'mix-reset': this.applyPreset('all'); break;
      case 'prev-song': if (this.ctx.index > 0) this.app.playFromSetlist(this.ctx.setlist, this.ctx.index - 1); break;
      case 'next-song': if (this.ctx.index < this.ctx.setlist.songs.length - 1) this.app.playFromSetlist(this.ctx.setlist, this.ctx.index + 1); break;
      default: break;
    }
  }

  setFont(px) {
    if (px) px = Math.max(14, Math.min(48, px));
    if (px) this.el.style.setProperty('--lyrics-size', px + 'px'); else this.el.style.removeProperty('--lyrics-size');
    this.app.setPref('fontSize', px);
    this.curLine = -2;
    this.frame(true);
  }

  onKey(e) {
    if (e.target.closest('input, textarea, select, [contenteditable]') || e.metaKey || e.ctrlKey || e.altKey) return;
    if (document.querySelector('dialog[open], .menu')) return;
    const k = e.key;
    if (k === ' ' || k === 'k') { e.preventDefault(); this.togglePlay(); }
    else if (k === 'ArrowLeft') { e.preventDefault(); this.engine.skip(-5); }
    else if (k === 'ArrowRight') { e.preventDefault(); this.engine.skip(5); }
    else if (k === 'l' || k === 'L') this.toggleLoop();
    else if (k === 'm' || k === 'M') this.el.querySelector('[data-act="metro"]').click();
    else if (k === '+' || k === '=') this.setTranspose(this.song.prefs.transpose + 1);
    else if (k === '-' || k === '_') this.setTranspose(this.song.prefs.transpose - 1);
    else if (k === '[') this.action('rate-');
    else if (k === ']') this.action('rate+');
    else if (k === 'f' || k === 'F') this.setMode(this.mode === 'stage' ? 'lyrics' : 'stage');
    else if (k === 'g' || k === 'G') this.setMode(this.mode === 'grid' ? 'lyrics' : 'grid');
    else if (k === 'Escape') { this.closeSheets(); if (this.mode === 'stage') this.setMode('lyrics'); }
    else if (k === 'PageDown' || k === 'ArrowDown' && this.mode === 'stage') { e.preventDefault(); this.pedal(1); }
    else if (k === 'PageUp' || k === 'ArrowUp' && this.mode === 'stage') { e.preventDefault(); this.pedal(-1); }
  }

  /** Pédale Bluetooth (PageDown / PageUp) : morceau suivant en setlist, sinon partie suivante. */
  pedal(dir) {
    if (this.ctx.setlist) {
      const i = this.ctx.index + dir;
      if (i >= 0 && i < this.ctx.setlist.songs.length) this.app.playFromSetlist(this.ctx.setlist, i);
      return;
    }
    const t = this.engine.currentTime;
    const secs = this.sections;
    if (!secs.length) { this.engine.skip(dir * 10); return; }
    if (dir > 0) { const s = secs.find((x) => x.t > t + 0.5); if (s) this.engine.seek(s.t); }
    else { const s = [...secs].reverse().find((x) => x.t < t - 2); this.engine.seek(s ? s.t : 0); }
  }
}

function chunk(arr, n) { const out = []; for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n)); return out; }
function fmtSemi(n) { return n ? (n > 0 ? '+' : '−') + Math.abs(n) : '0'; }
function fmtOffset(ms) { return ms ? `${ms > 0 ? '+' : '−'}${Math.abs(ms / 1000).toFixed(2).replace('.', ',')} s` : '0 s'; }

function beatsFromBpm(song) {
  if (!song.bpm || !song.duration) return [];
  const p = 60 / song.bpm;
  const out = [];
  const t0 = song.downbeats?.[0] ?? 0;
  for (let t = t0 % p; t < song.duration; t += p) out.push(t);
  return out;
}

export { keyName, songKey };
