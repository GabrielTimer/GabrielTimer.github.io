// MusiMix — moteur audio : pistes synchronisées, mixage, vitesse, transposition,
// boucle, métronome. Chaque piste est un <audio> (léger en mémoire, même sur
// téléphone) branché dans la Web Audio API pour régler son volume partout (iPhone compris).

const PITCH_LATENCY = 0.07; // s, retard ajouté par la transposition audio

export class Engine extends EventTarget {
  constructor() {
    super();
    this.ctx = null;
    this.tracks = [];
    this.duration = 0;
    this.rate = 1;
    this.semitones = 0;
    this.playing = false;
    this.loop = null;          // { a, b }
    this.userLatency = 0;      // s (réglage : casque Bluetooth…)
    this._raw = 0; this._rawAt = 0; this._est = 0;
    this._seekToken = 0;
    this._tick = this._tick.bind(this);
    this._lastDrift = 0;
    this.metronome = { on: false, beats: [], downbeats: null, volume: 0.6, scheduled: new Set() };
    this.master = 1;
  }

  async ensureContext() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AC({ latencyHint: 'playback' });
      try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch { /* Safari seulement */ }
      this.masterGain = this.ctx.createGain();
      this.limiter = this.ctx.createDynamicsCompressor();
      this.limiter.threshold.value = -3; this.limiter.knee.value = 6; this.limiter.ratio.value = 8;
      this.limiter.attack.value = 0.003; this.limiter.release.value = 0.15;
      this.clickGain = this.ctx.createGain();
      this.clickGain.connect(this.ctx.destination);
      this.masterGain.connect(this.limiter).connect(this.ctx.destination);
      this.pitchNode = null;
      this._pitchReady = this._initPitch();
    }
    if (this.ctx.state !== 'running') { try { await this.ctx.resume(); } catch { /* geste requis */ } }
    return this.ctx;
  }

  async _initPitch() {
    try {
      await this.ctx.audioWorklet.addModule(new URL('./pitch-worklet.js', import.meta.url));
      this.pitchNode = new AudioWorkletNode(this.ctx, 'musimix-pitch', { outputChannelCount: [2] });
      this.pitchNode.port.postMessage({ semitones: this.semitones });
      // bus : pistes → masterGain → [pitch] → limiter
      this.masterGain.disconnect();
      this.masterGain.connect(this.pitchNode).connect(this.limiter);
      return true;
    } catch (e) {
      console.warn('Transposition audio indisponible', e);
      return false;
    }
  }

  get pitchAvailable() { return !!this.pitchNode; }

  /** stems : [{ id, kind, label, url | blob }] */
  async load(stems, { duration = 0 } = {}) {
    this.unload();
    await this.ensureContext();
    this.duration = duration || 0;
    const loads = stems.map((st) => new Promise((resolve) => {
      const el = new Audio();
      el.preload = 'auto';
      el.crossOrigin = 'anonymous';
      setPreservesPitch(el);
      const url = st.url || URL.createObjectURL(st.blob);
      const tr = { ...st, el, url, owned: !st.url, vol: st.vol ?? 1, mute: !!st.mute, solo: !!st.solo, pan: st.pan ?? 0 };
      tr.node = this.ctx.createMediaElementSource(el);
      tr.gain = this.ctx.createGain();
      tr.panner = this.ctx.createStereoPanner ? this.ctx.createStereoPanner() : null;
      tr.analyser = this.ctx.createAnalyser();
      tr.analyser.fftSize = 512;
      tr.node.connect(tr.gain);
      (tr.panner ? tr.gain.connect(tr.panner) : tr.gain).connect(tr.analyser);
      tr.analyser.connect(this.masterGain);
      if (tr.panner) tr.panner.pan.value = tr.pan;
      this.tracks.push(tr);
      const done = () => { resolve(); };
      el.addEventListener('loadedmetadata', () => { if (isFinite(el.duration)) this.duration = Math.max(this.duration, el.duration); done(); }, { once: true });
      el.addEventListener('error', done, { once: true });
      setTimeout(done, 4000);
      el.addEventListener('ended', () => this._onEnded(tr));
      el.src = url;
      el.load();
    }));
    await Promise.all(loads);
    this._applyGains();
    this._raw = 0; this._est = 0;
    this.dispatchEvent(new Event('loaded'));
  }

  unload() {
    this.pause();
    this._unlocked = false;
    for (const t of this.tracks) {
      try { t.el.pause(); t.el.removeAttribute('src'); t.el.load(); } catch { /* */ }
      try { t.node.disconnect(); t.analyser.disconnect(); } catch { /* */ }
      if (t.owned) URL.revokeObjectURL(t.url);
    }
    this.tracks = [];
    this.loop = null;
    this.duration = 0;
  }

  get masterEl() {
    // la piste la plus longue sert de référence
    let best = null;
    for (const t of this.tracks) if (!best || (t.el.duration || 0) > (best.el.duration || 0)) best = t;
    return best?.el || null;
  }

  // ─────────────────────────────────────────────────────── transport ──

  /** Lance la lecture. Les play() partent tout de suite (dans le geste de l'utilisateur : obligatoire sur iPhone). */
  async play() {
    if (!this.tracks.length) return;
    if (this.ctx && this.ctx.state !== 'running') this.ctx.resume().catch(() => {});
    const t = this.currentTime;
    if (this.duration && t >= this.duration - 0.05) this._setAll(0);
    this.playing = true;
    const ps = this.tracks.map((tr) => tr.el.play().catch((e) => e));
    this._rawAt = performance.now();
    this._resetMetronome();
    requestAnimationFrame(this._tick);
    this.dispatchEvent(new Event('play'));
    const res = await Promise.all(ps);
    const err = res.find((r) => r instanceof Error && r.name === 'NotAllowedError');
    if (err) { this.pause(); this.dispatchEvent(new CustomEvent('blocked')); }
  }

  /** Débloque la lecture différée (iPhone) : un play/pause silencieux pendant le geste. */
  unlock() {
    if (this._unlocked || !this.tracks.length) return;
    this._unlocked = true;
    const t = this.currentTime;
    const g = this.masterGain?.gain;
    if (g) g.value = 0;
    for (const tr of this.tracks) tr.el.play().then(() => { tr.el.pause(); tr.el.currentTime = t; }).catch(() => {});
    setTimeout(() => { if (g) this._applyGains(); }, 120);
  }

  pause() {
    if (!this.playing && this.tracks.every((t) => t.el.paused)) return;
    this.playing = false;
    for (const t of this.tracks) t.el.pause();
    const m = this.masterEl;
    if (m) { this._raw = m.currentTime; this._est = this._raw; }
    this.dispatchEvent(new Event('pause'));
  }

  toggle() { return this.playing ? this.pause() : this.play(); }

  _setAll(t) {
    for (const tr of this.tracks) { try { tr.el.currentTime = Math.min(t, (tr.el.duration || Infinity) - 0.01); } catch { /* */ } }
    this._raw = t; this._est = t; this._rawAt = performance.now();
  }

  async seek(t) {
    t = Math.max(0, Math.min(t, (this.duration || t) - 0.05));
    const token = ++this._seekToken;
    const wasPlaying = this.playing;
    if (wasPlaying) for (const tr of this.tracks) tr.el.pause();
    this._setAll(t);
    this._resetMetronome();
    if (this.pitchNode) this.pitchNode.port.postMessage({ reset: true });
    this.dispatchEvent(new CustomEvent('seek', { detail: t }));
    if (!wasPlaying) return;
    await Promise.all(this.tracks.map((tr) => waitReady(tr.el)));
    if (token !== this._seekToken || !this.playing) return;
    for (const tr of this.tracks) tr.el.play().catch(() => {});
    this._rawAt = performance.now();
  }

  skip(d) { return this.seek(this.currentTime + d); }

  /** Temps courant lissé (60 i/s), avec compensation des latences. */
  get currentTime() { return this._est; }

  get displayTime() {
    const lat = (this.ctx?.outputLatency || this.ctx?.baseLatency || 0) + (this.semitones ? PITCH_LATENCY : 0) + this.userLatency;
    return Math.max(0, this._est - lat * this.rate);
  }

  _tick(now) {
    const m = this.masterEl;
    if (m) {
      const raw = m.currentTime;
      if (raw !== this._raw) { this._raw = raw; this._rawAt = now; }
      if (this.playing && !m.paused) {
        const extrap = this._raw + ((now - this._rawAt) / 1000) * this.rate;
        // ne recule jamais à cause du lissage (sauf saut)
        this._est = Math.abs(extrap - this._est) > 0.3 ? extrap : Math.max(this._est, extrap);
        if (Math.abs(this._est - raw) > 0.25) this._est = raw;
      } else {
        this._est = raw;
      }
      if (this.playing && now - this._lastDrift > 300) { this._lastDrift = now; this._fixDrift(m); }
      if (this.loop && this.playing && this._est >= this.loop.b) this.seek(this.loop.a);
      if (this.metronome.on && this.playing) this._scheduleClicks();
    }
    this.dispatchEvent(new CustomEvent('time', { detail: this._est }));
    if (this.playing) requestAnimationFrame(this._tick);
  }

  _fixDrift(master) {
    const ref = master.currentTime;
    for (const t of this.tracks) {
      const el = t.el;
      if (el === master || el.paused || el.ended) continue;
      if (el.duration && ref > el.duration - 0.2) continue;
      const d = el.currentTime - ref;
      if (Math.abs(d) > 0.25) { try { el.currentTime = ref + 0.02; } catch { /* */ } el.playbackRate = this.rate; }
      else if (Math.abs(d) > 0.012) el.playbackRate = this.rate * (1 - Math.max(-0.04, Math.min(0.04, d * 1.5)));
      else if (el.playbackRate !== this.rate) el.playbackRate = this.rate;
    }
  }

  _onEnded(tr) {
    if (tr.el !== this.masterEl) return;
    if (this.loop) { this.seek(this.loop.a); return; }
    this.playing = false;
    for (const t of this.tracks) t.el.pause();
    this.dispatchEvent(new Event('ended'));
    this.dispatchEvent(new Event('pause'));
  }

  // ─────────────────────────────────────────────────────────── réglages ──

  setRate(r) {
    this.rate = Math.max(0.5, Math.min(1.5, r));
    for (const t of this.tracks) { t.el.playbackRate = this.rate; setPreservesPitch(t.el); }
    this._resetMetronome();
    this.dispatchEvent(new Event('rate'));
  }

  async setSemitones(n) {
    this.semitones = Math.max(-12, Math.min(12, Math.round(n)));
    if (this.ctx && this._pitchReady) await this._pitchReady;
    if (this.pitchNode) this.pitchNode.port.postMessage({ semitones: this.semitones });
    this.dispatchEvent(new Event('pitch'));
  }

  setTrack(id, patch) {
    const t = this.tracks.find((x) => x.id === id);
    if (!t) return;
    Object.assign(t, patch);
    if (t.panner && 'pan' in patch) t.panner.pan.setTargetAtTime(t.pan, this.ctx.currentTime, 0.02);
    this._applyGains();
  }

  setMaster(v) { this.master = v; this._applyGains(); }

  _applyGains() {
    if (!this.ctx) return;
    const anySolo = this.tracks.some((t) => t.solo);
    const now = this.ctx.currentTime;
    for (const t of this.tracks) {
      const audible = !t.mute && (!anySolo || t.solo);
      const g = audible ? curve(t.vol) : 0;
      t.gain.gain.setTargetAtTime(g, now, 0.015);
    }
    this.masterGain.gain.setTargetAtTime(curve(this.master), now, 0.015);
  }

  /** Niveau (0..1) de chaque piste, pour les vumètres. */
  levels() {
    const out = {};
    const buf = this._lvlBuf || (this._lvlBuf = new Float32Array(512));
    for (const t of this.tracks) {
      t.analyser.getFloatTimeDomainData(buf);
      let s = 0;
      for (let i = 0; i < buf.length; i++) s += buf[i] * buf[i];
      out[t.id] = Math.min(1, Math.sqrt(s / buf.length) * 3.2);
    }
    return out;
  }

  setLoop(a, b) {
    this.loop = a != null && b != null && b - a > 0.3 ? { a, b } : null;
    this.dispatchEvent(new Event('loop'));
  }

  // ───────────────────────────────────────────────────────── métronome ──

  setBeats(beats, downbeats) {
    this.metronome.beats = beats || [];
    this.metronome.downbeats = downbeats ? new Set(downbeats.map((d) => Math.round(d * 100))) : null;
    this._resetMetronome();
  }

  setMetronome(on, volume) {
    this.metronome.on = on;
    if (volume != null) this.metronome.volume = volume;
    this._resetMetronome();
  }

  _resetMetronome() { this.metronome.scheduled = new Set(); }

  _scheduleClicks() {
    const m = this.metronome;
    if (!m.beats.length || !this.ctx) return;
    const now = this.currentTime;
    const horizon = now + 0.25 * this.rate;
    let i = lowerBound(m.beats, now);
    for (; i < m.beats.length && m.beats[i] < horizon; i++) {
      if (m.scheduled.has(i)) continue;
      m.scheduled.add(i);
      const b = m.beats[i];
      const when = this.ctx.currentTime + (b - now) / this.rate;
      const accent = m.downbeats ? m.downbeats.has(Math.round(b * 100)) : i % 4 === 0;
      this.click(when, accent);
    }
  }

  click(when, accent = false, vol = this.metronome.volume) {
    const ctx = this.ctx;
    if (!ctx) return;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = 'triangle';
    o.frequency.value = accent ? 1760 : 1175;
    g.gain.setValueAtTime(0, when);
    g.gain.linearRampToValueAtTime(vol * (accent ? 0.9 : 0.55), when + 0.002);
    g.gain.exponentialRampToValueAtTime(0.0001, when + 0.06);
    o.connect(g).connect(this.clickGain);
    o.start(when);
    o.stop(when + 0.08);
  }

  /** Décompte d'une mesure puis lecture. */
  async countIn(bpm, beatsPerBar = 4) {
    this.unlock();
    await this.ensureContext();
    const period = 60 / (bpm || 100) / this.rate;
    const t0 = this.ctx.currentTime + 0.08;
    for (let k = 0; k < beatsPerBar; k++) this.click(t0 + k * period, k === 0, Math.max(0.5, this.metronome.volume));
    this.dispatchEvent(new CustomEvent('countin', { detail: { period, beats: beatsPerBar, start: performance.now() + 80 } }));
    await new Promise((r) => setTimeout(r, (0.08 + beatsPerBar * period) * 1000 - 40));
    return this.play();
  }
}

function setPreservesPitch(el) {
  el.preservesPitch = true;
  el.mozPreservesPitch = true;
  el.webkitPreservesPitch = true;
}

// courbe de volume perceptive : 0..1.5 → gain
function curve(v) { return v <= 0 ? 0 : Math.pow(v, 1.6); }

function waitReady(el) {
  if (el.readyState >= 3 && !el.seeking) return Promise.resolve();
  return new Promise((res) => {
    const done = () => { el.removeEventListener('canplay', done); el.removeEventListener('seeked', done); res(); };
    el.addEventListener('canplay', done);
    el.addEventListener('seeked', done);
    setTimeout(done, 1500);
  });
}

function lowerBound(arr, x) {
  let lo = 0, hi = arr.length;
  while (lo < hi) { const mid = (lo + hi) >> 1; if (arr[mid] < x) lo = mid + 1; else hi = mid; }
  return lo;
}

export { lowerBound };
