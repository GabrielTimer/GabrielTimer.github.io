// MusiMix — lecture / écriture de ZIP sans dépendance.
// Lecture : stockés ou compressés (deflate, via DecompressionStream).
// Écriture : sans compression (l'audio est déjà compressé), compatible partout.

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(buf, crc = 0) {
  crc = ~crc >>> 0;
  for (let i = 0; i < buf.length; i++) crc = CRC_TABLE[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  return ~crc >>> 0;
}

/** Lit un ZIP. Retourne [{ name, blob() , text() }]. */
export async function readZip(file) {
  const buf = new Uint8Array(await file.arrayBuffer());
  const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  // fin du répertoire central
  let eocd = -1;
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 65557); i--) {
    if (dv.getUint32(i, true) === 0x06054b50) { eocd = i; break; }
  }
  if (eocd < 0) throw new Error('Ce fichier n’est pas un ZIP lisible.');
  let count = dv.getUint16(eocd + 10, true);
  let off = dv.getUint32(eocd + 16, true);
  // ZIP64 (gros packs)
  if (off === 0xffffffff || count === 0xffff) {
    const loc = eocd - 20;
    if (loc >= 0 && dv.getUint32(loc, true) === 0x07064b50) {
      const z64 = Number(dv.getBigUint64(loc + 8, true));
      count = Number(dv.getBigUint64(z64 + 32, true));
      off = Number(dv.getBigUint64(z64 + 48, true));
    }
  }
  const entries = [];
  const dec = new TextDecoder();
  for (let k = 0; k < count; k++) {
    if (dv.getUint32(off, true) !== 0x02014b50) break;
    const flags = dv.getUint16(off + 8, true);
    const method = dv.getUint16(off + 10, true);
    let csize = dv.getUint32(off + 20, true);
    let usize = dv.getUint32(off + 24, true);
    const nlen = dv.getUint16(off + 28, true);
    const xlen = dv.getUint16(off + 30, true);
    const clen = dv.getUint16(off + 32, true);
    let lho = dv.getUint32(off + 42, true);
    const nameBytes = buf.subarray(off + 46, off + 46 + nlen);
    const name = (flags & 0x800) ? dec.decode(nameBytes) : decodeCp437(nameBytes);
    // champ ZIP64 éventuel
    let x = off + 46 + nlen;
    const xend = x + xlen;
    while (x + 4 <= xend) {
      const id = dv.getUint16(x, true), sz = dv.getUint16(x + 2, true);
      if (id === 0x0001) {
        let p = x + 4;
        if (usize === 0xffffffff) { usize = Number(dv.getBigUint64(p, true)); p += 8; }
        if (csize === 0xffffffff) { csize = Number(dv.getBigUint64(p, true)); p += 8; }
        if (lho === 0xffffffff) { lho = Number(dv.getBigUint64(p, true)); }
      }
      x += 4 + sz;
    }
    off += 46 + nlen + xlen + clen;
    if (name.endsWith('/') || name.startsWith('__MACOSX/') || /(^|\/)\._/.test(name) || /\.DS_Store$/.test(name)) continue;
    const ln = dv.getUint16(lho + 26, true), lx = dv.getUint16(lho + 28, true);
    const start = lho + 30 + ln + lx;
    const data = buf.subarray(start, start + csize);
    entries.push({
      name,
      base: name.split('/').pop(),
      size: usize,
      async blob(type = '') {
        if (method === 0) return new Blob([data], { type });
        if (method === 8) {
          const ds = new DecompressionStream('deflate-raw');
          const out = new Blob([data]).stream().pipeThrough(ds);
          const b = await new Response(out).blob();
          return type ? new Blob([b], { type }) : b;
        }
        throw new Error(`Compression ZIP non gérée (${method}) pour ${name}`);
      },
      async text() { return (await this.blob()).text(); },
    });
  }
  return entries;
}

function decodeCp437(bytes) {
  // les noms ne sont pas toujours en UTF-8 : on tente l'UTF-8 strict, sinon latin-1
  try { return new TextDecoder('utf-8', { fatal: true }).decode(bytes); } catch { return new TextDecoder('latin1').decode(bytes); }
}

/** Crée un ZIP (sans compression). files = [{ name, data: Blob|string|Uint8Array }]. */
export async function writeZip(files) {
  const enc = new TextEncoder();
  const parts = [];
  const central = [];
  let offset = 0;
  const now = new Date();
  const dosTime = (now.getHours() << 11) | (now.getMinutes() << 5) | (now.getSeconds() >> 1);
  const dosDate = ((now.getFullYear() - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate();
  for (const f of files) {
    let data, size, crc;
    if (f.data instanceof Blob) {
      // gros fichiers : CRC calculé par tranches, le Blob reste tel quel (pas de copie en mémoire)
      data = f.data; size = f.data.size; crc = 0;
      for (let o = 0; o < size; o += 8 << 20) crc = crc32(new Uint8Array(await f.data.slice(o, o + (8 << 20)).arrayBuffer()), crc);
    } else {
      data = typeof f.data === 'string' ? enc.encode(f.data) : f.data;
      size = data.length; crc = crc32(data);
    }
    const name = enc.encode(f.name);
    const lh = new DataView(new ArrayBuffer(30));
    lh.setUint32(0, 0x04034b50, true); lh.setUint16(4, 20, true); lh.setUint16(6, 0x800, true); lh.setUint16(8, 0, true);
    lh.setUint16(10, dosTime, true); lh.setUint16(12, dosDate, true); lh.setUint32(14, crc, true);
    lh.setUint32(18, size, true); lh.setUint32(22, size, true); lh.setUint16(26, name.length, true); lh.setUint16(28, 0, true);
    parts.push(lh.buffer, name, data);
    const ch = new DataView(new ArrayBuffer(46));
    ch.setUint32(0, 0x02014b50, true); ch.setUint16(4, 20, true); ch.setUint16(6, 20, true); ch.setUint16(8, 0x800, true); ch.setUint16(10, 0, true);
    ch.setUint16(12, dosTime, true); ch.setUint16(14, dosDate, true); ch.setUint32(16, crc, true);
    ch.setUint32(20, size, true); ch.setUint32(24, size, true); ch.setUint16(28, name.length, true);
    ch.setUint32(42, offset, true);
    central.push(ch.buffer, name);
    offset += 30 + name.length + size;
  }
  const cdSize = central.reduce((s, p) => s + (p.byteLength ?? p.length), 0);
  const end = new DataView(new ArrayBuffer(22));
  end.setUint32(0, 0x06054b50, true); end.setUint16(8, files.length, true); end.setUint16(10, files.length, true);
  end.setUint32(12, cdSize, true); end.setUint32(16, offset, true);
  return new Blob([...parts, ...central, end.buffer], { type: 'application/zip' });
}
