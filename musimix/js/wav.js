// MusiMix — encodage WAV (PCM 16 ou 24 bits) et décodage audio à une fréquence donnée.

/** channels : tableau de Float32Array (même longueur). Retourne un Blob audio/wav. */
export function encodeWav(channels, sampleRate, bits = 16) {
  const n = channels[0].length;
  const nch = channels.length;
  const bps = bits / 8;
  const dataLen = n * nch * bps;
  const buf = new ArrayBuffer(44 + dataLen);
  const v = new DataView(buf);
  const w = (o, s) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
  w(0, 'RIFF'); v.setUint32(4, 36 + dataLen, true); w(8, 'WAVE');
  w(12, 'fmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, nch, true);
  v.setUint32(24, sampleRate, true); v.setUint32(28, sampleRate * nch * bps, true); v.setUint16(32, nch * bps, true); v.setUint16(34, bits, true);
  w(36, 'data'); v.setUint32(40, dataLen, true);
  const out = new Uint8Array(buf);
  let o = 44;
  for (let i = 0; i < n; i++) {
    for (let c = 0; c < nch; c++) {
      let x = channels[c][i];
      x = x > 1 ? 1 : x < -1 ? -1 : x;
      if (bits === 16) {
        const s = Math.round(x * 32767);
        out[o++] = s & 255; out[o++] = (s >> 8) & 255;
      } else {
        const s = Math.round(x * 8388607);
        out[o++] = s & 255; out[o++] = (s >> 8) & 255; out[o++] = (s >> 16) & 255;
      }
    }
  }
  return new Blob([buf], { type: 'audio/wav' });
}

/** Décode un fichier audio et le rééchantillonne (ex. 44 100 Hz pour le Zoom R20). */
export async function decodeAt(blob, sampleRate) {
  const ab = await blob.arrayBuffer();
  const OAC = window.OfflineAudioContext || window.webkitOfflineAudioContext;
  const ctx = new OAC(2, 1, sampleRate);
  return new Promise((resolve, reject) => ctx.decodeAudioData(ab, resolve, reject));
}
