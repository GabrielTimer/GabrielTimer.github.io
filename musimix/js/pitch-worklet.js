// MusiMix — transposition de l'audio en temps réel (sans changer la vitesse).
// WSOLA (étirement temporel par recouvrement de trames calées par corrélation)
// suivi d'un rééchantillonnage : la hauteur change, la durée reste la même.

const N = 2048;          // taille de trame
const HS = N / 2;        // pas de synthèse (fenêtre de Hann à 50 % → somme constante)
const SEEK = 384;        // recherche de la meilleure position ± SEEK échantillons
const CORR_LEN = 768;    // longueur comparée
const DEC = 4;           // décimation pour la recherche (coût / 16)
const IN_CAP = 1 << 16;
const ST_CAP = 1 << 15;

class Ring {
  constructor(cap, ch) { this.cap = cap; this.data = Array.from({ length: ch }, () => new Float32Array(cap)); this.start = 0; this.len = 0; this.base = 0; }
  // base = indice absolu du premier échantillon conservé
  push(chans, n) {
    if (this.len + n > this.cap) this.drop(this.len + n - this.cap);
    for (let c = 0; c < this.data.length; c++) {
      const src = chans[Math.min(c, chans.length - 1)];
      const d = this.data[c];
      let w = (this.start + this.len) % this.cap;
      for (let i = 0; i < n; i++) { d[w] = src ? src[i] : 0; if (++w === this.cap) w = 0; }
    }
    this.len += n;
  }
  drop(n) { n = Math.min(n, this.len); this.start = (this.start + n) % this.cap; this.len -= n; this.base += n; }
  get end() { return this.base + this.len; }
  at(c, abs) { return this.data[c][(this.start + (abs - this.base)) % this.cap]; }
}

class PitchShifter extends AudioWorkletProcessor {
  constructor() {
    super();
    this.ratio = 1;
    this.win = new Float32Array(N);
    for (let i = 0; i < N; i++) this.win[i] = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / N);
    this.reset();
    this.port.onmessage = (e) => {
      if (e.data && typeof e.data.semitones === 'number') {
        const r = Math.pow(2, e.data.semitones / 12);
        if (Math.abs(r - this.ratio) > 1e-6) { this.ratio = r; if (r === 1) this.reset(); }
      }
      if (e.data && e.data.reset) this.reset();
    };
  }

  reset() {
    this.inp = new Ring(IN_CAP, 2);
    this.st = new Ring(ST_CAP, 2);
    this.anaPos = 0;
    this.prevPos = -1;
    this.ola = [new Float32Array(N), new Float32Array(N)];
    this.readPos = 0;      // position (absolue, fractionnaire) de lecture dans le flux étiré
    this.primed = false;
  }

  findBest(center) {
    if (this.prevPos < 0) return center;
    const target = this.prevPos + HS;
    let best = center, bestV = -Infinity;
    const lo = Math.max(this.inp.base, center - SEEK);
    const hi = Math.min(this.inp.end - N, center + SEEK);
    for (let p = lo; p <= hi; p += DEC) {
      let v = 0;
      for (let i = 0; i < CORR_LEN; i += DEC) {
        v += (this.inp.at(0, p + i) + this.inp.at(1, p + i)) * (this.inp.at(0, target + i) + this.inp.at(1, target + i));
      }
      if (v > bestV) { bestV = v; best = p; }
    }
    return best;
  }

  stretch() {
    const ha = HS / this.ratio; // pas d'analyse
    for (;;) {
      const center = Math.round(this.anaPos);
      const needEnd = Math.max(center + SEEK + N, this.prevPos >= 0 ? this.prevPos + HS + CORR_LEN : 0);
      if (needEnd > this.inp.end) break;
      if (center - SEEK < this.inp.base && this.prevPos >= 0) { this.anaPos = this.inp.base + SEEK; continue; }
      const pos = this.findBest(Math.max(center, this.inp.base));
      for (let c = 0; c < 2; c++) {
        const o = this.ola[c];
        for (let i = 0; i < N; i++) o[i] += this.inp.at(c, pos + i) * this.win[i];
      }
      // les HS premiers échantillons sont définitifs
      this.st.push([this.ola[0].subarray(0, HS), this.ola[1].subarray(0, HS)], HS);
      for (let c = 0; c < 2; c++) { const o = this.ola[c]; o.copyWithin(0, HS); o.fill(0, N - HS); }
      this.prevPos = pos;
      this.anaPos += ha;
      const keep = Math.min(this.prevPos + HS, Math.round(this.anaPos)) - SEEK - 8;
      if (keep > this.inp.base) this.inp.drop(keep - this.inp.base);
    }
  }

  process(inputs, outputs) {
    const input = inputs[0];
    const output = outputs[0];
    const n = output[0].length;
    if (this.ratio === 1) {
      for (let c = 0; c < output.length; c++) {
        const src = input[Math.min(c, input.length - 1)];
        if (src) output[c].set(src); else output[c].fill(0);
      }
      return true;
    }
    this.inp.push(input.length ? input : [new Float32Array(n)], n);
    this.stretch();
    // rééchantillonnage : on lit le flux étiré à la vitesse « ratio »
    if (!this.primed) {
      if (this.st.len < HS * 2) { output.forEach((o) => o.fill(0)); return true; }
      this.primed = true;
      this.readPos = this.st.base;
    }
    const r = this.ratio;
    for (let i = 0; i < n; i++) {
      const ip = Math.floor(this.readPos);
      const f = this.readPos - ip;
      if (ip + 1 >= this.st.end) {
        for (let c = 0; c < output.length; c++) output[c][i] = 0;
        continue;
      }
      for (let c = 0; c < output.length; c++) {
        const ch = Math.min(c, 1);
        const a = this.st.at(ch, ip), b = this.st.at(ch, ip + 1);
        output[c][i] = a + (b - a) * f;
      }
      this.readPos += r;
    }
    const used = Math.floor(this.readPos) - 1 - this.st.base;
    if (used > 0) this.st.drop(used);
    return true;
  }
}

registerProcessor('musimix-pitch', PitchShifter);
