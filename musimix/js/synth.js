// MusiMix — synthèse des fichiers MIDI : chaque famille d'instruments est rendue
// en une piste audio (batterie, basse, guitare, piano, mélodie, autres) qu'on mixe ensuite.

const SR = 22050;

export async function renderFamily(notes, family, duration) {
  const OAC = window.OfflineAudioContext || window.webkitOfflineAudioContext;
  const len = Math.ceil((duration + 2) * SR);
  const ctx = new OAC(1, len, SR);
  const bus = ctx.createGain();
  bus.gain.value = 0.5;
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -10; comp.ratio.value = 3;
  bus.connect(comp).connect(ctx.destination);
  const noise = family === 'drums' ? noiseBuffer(ctx) : null;
  const play = PLAYERS[family] || PLAYERS.other;
  for (const n of notes) {
    try { play(ctx, bus, n, noise); } catch { /* note ignorée */ }
  }
  const buf = await ctx.startRendering();
  return buf.getChannelData(0);
}

export { SR as SYNTH_RATE };

const hz = (m) => 440 * Math.pow(2, (m - 69) / 12);

function voice(ctx, out, n, { types, detune = [0], filter = null, a = 0.005, d = 0.6, s = 0.4, r = 0.2, gain = 0.25, octave = [0] }) {
  const t = n.t, end = n.t + n.d;
  const g = ctx.createGain();
  const peak = gain * (0.35 + 0.65 * n.vel);
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(peak, t + a);
  g.gain.setTargetAtTime(peak * s, t + a, d / 3);
  g.gain.setTargetAtTime(0, end, r / 3);
  let dest = g;
  if (filter) {
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.setValueAtTime(filter[0], t);
    f.frequency.setTargetAtTime(filter[1], t, filter[2] || 0.15);
    f.Q.value = 0.7;
    f.connect(g);
    dest = f;
  }
  g.connect(out);
  types.forEach((type, k) => {
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.value = hz(n.pitch + 12 * (octave[k] || 0));
    o.detune.value = detune[k] || 0;
    const og = ctx.createGain();
    og.gain.value = 1 / types.length;
    o.connect(og).connect(dest);
    o.start(t);
    o.stop(end + r * 2 + 0.05);
  });
}

const PLAYERS = {
  piano: (ctx, out, n) => voice(ctx, out, n, { types: ['triangle', 'sine'], octave: [0, 1], a: 0.004, d: 1.4, s: 0.15, r: 0.25, gain: 0.3, filter: [5000, 1800, 0.4] }),
  guitar: (ctx, out, n) => voice(ctx, out, n, { types: ['sawtooth', 'triangle'], detune: [0, 6], a: 0.003, d: 1.1, s: 0.12, r: 0.15, gain: 0.22, filter: [3200, 1100, 0.25] }),
  bass: (ctx, out, n) => voice(ctx, out, n, { types: ['triangle', 'sine'], octave: [0, -1], a: 0.006, d: 0.8, s: 0.55, r: 0.08, gain: 0.5, filter: [1200, 500, 0.2] }),
  vocals: (ctx, out, n) => voice(ctx, out, n, { types: ['sine', 'triangle'], detune: [0, 4], a: 0.03, d: 0.4, s: 0.8, r: 0.12, gain: 0.32 }),
  other: (ctx, out, n) => voice(ctx, out, n, { types: ['sawtooth', 'sawtooth'], detune: [-7, 7], a: 0.06, d: 0.6, s: 0.7, r: 0.3, gain: 0.16, filter: [1600, 1600] }),
  drums: (ctx, out, n, noise) => drum(ctx, out, n, noise),
};

function noiseBuffer(ctx) {
  const b = ctx.createBuffer(1, SR, SR);
  const d = b.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  return b;
}

function hit(ctx, out, t, noise, { type = 'highpass', freq = 7000, q = 0.7, dur = 0.08, gain = 0.3 }) {
  const src = ctx.createBufferSource();
  src.buffer = noise;
  const f = ctx.createBiquadFilter();
  f.type = type; f.frequency.value = freq; f.Q.value = q;
  const g = ctx.createGain();
  g.gain.setValueAtTime(gain, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  src.connect(f).connect(g).connect(out);
  src.start(t, Math.random() * 0.5);
  src.stop(t + dur + 0.02);
}

function tone(ctx, out, t, { f0, f1, dur, gain, type = 'sine' }) {
  const o = ctx.createOscillator();
  o.type = type;
  o.frequency.setValueAtTime(f0, t);
  o.frequency.exponentialRampToValueAtTime(f1, t + dur * 0.6);
  const g = ctx.createGain();
  g.gain.setValueAtTime(gain, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  o.connect(g).connect(out);
  o.start(t);
  o.stop(t + dur + 0.02);
}

function drum(ctx, out, n, noise) {
  const t = n.t, v = 0.4 + 0.6 * n.vel, p = n.pitch;
  if (p === 35 || p === 36) tone(ctx, out, t, { f0: 140, f1: 45, dur: 0.35, gain: 0.9 * v });
  else if (p === 38 || p === 40 || p === 37 || p === 39) {
    tone(ctx, out, t, { f0: 220, f1: 160, dur: 0.12, gain: 0.35 * v, type: 'triangle' });
    hit(ctx, out, t, noise, { type: 'bandpass', freq: 2500, q: 0.6, dur: 0.18, gain: 0.55 * v });
  } else if (p === 42 || p === 44) hit(ctx, out, t, noise, { freq: 8000, dur: 0.05, gain: 0.25 * v });
  else if (p === 46) hit(ctx, out, t, noise, { freq: 7000, dur: 0.3, gain: 0.22 * v });
  else if ([49, 51, 52, 53, 55, 57, 59].includes(p)) hit(ctx, out, t, noise, { freq: 5000, dur: p === 51 || p === 59 ? 0.35 : 1.2, gain: 0.2 * v });
  else if ([41, 43, 45, 47, 48, 50].includes(p)) tone(ctx, out, t, { f0: 90 + (p - 41) * 18, f1: 60 + (p - 41) * 10, dur: 0.3, gain: 0.55 * v });
  else hit(ctx, out, t, noise, { type: 'bandpass', freq: 3000 + (p % 12) * 300, q: 2, dur: 0.08, gain: 0.25 * v });
}
