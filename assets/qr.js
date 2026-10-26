/* =========================================================
   Générateur de QR code (mode octets, correction M, versions 1 à 10)
   Suffisant pour les liens d'accès patient. Sans dépendance.
   ========================================================= */

const TOTAL = [0, 26, 44, 70, 100, 134, 172, 196, 242, 292, 346];
const EC    = [0, 10, 16, 26, 18, 24, 16, 18, 22, 22, 26];
const BLOCKS= [0, 1, 1, 1, 2, 2, 4, 4, 4, 5, 5];
const ALIGN = [[], [], [6,18], [6,22], [6,26], [6,30], [6,34], [6,22,38], [6,24,42], [6,26,46], [6,28,50]];

function gfMul(x, y){
  let z = 0;
  for(let i = 7; i >= 0; i--){
    z = (z << 1) ^ ((z >>> 7) * 0x11D);
    z ^= ((y >>> i) & 1) * x;
  }
  return z & 0xFF;
}

function rsDivisor(degree){
  const r = new Array(degree).fill(0);
  r[degree - 1] = 1;
  let root = 1;
  for(let i = 0; i < degree; i++){
    for(let j = 0; j < degree; j++){
      r[j] = gfMul(r[j], root);
      if(j + 1 < degree) r[j] ^= r[j + 1];
    }
    root = gfMul(root, 2);
  }
  return r;
}

function rsRemainder(data, div){
  const r = new Array(div.length).fill(0);
  for(const b of data){
    const f = b ^ r.shift();
    r.push(0);
    for(let i = 0; i < div.length; i++) r[i] ^= gfMul(div[i], f);
  }
  return r;
}

function encodeData(bytes, version){
  const capacity = TOTAL[version] - EC[version] * BLOCKS[version];
  const bits = [];
  const put = (val, len) => { for(let i = len - 1; i >= 0; i--) bits.push((val >>> i) & 1); };
  put(4, 4);
  put(bytes.length, version < 10 ? 8 : 16);
  bytes.forEach(b => put(b, 8));
  const maxBits = capacity * 8;
  put(0, Math.min(4, maxBits - bits.length));
  while(bits.length % 8) bits.push(0);
  const out = [];
  for(let i = 0; i < bits.length; i += 8) out.push(parseInt(bits.slice(i, i + 8).join(""), 2));
  for(let pad = 0xEC; out.length < capacity; pad ^= 0xEC ^ 0x11) out.push(pad);
  return out;
}

function interleave(data, version){
  const nb = BLOCKS[version], ecLen = EC[version], total = TOTAL[version];
  const shortLen = Math.floor(total / nb), numShort = nb - (total % nb);
  const div = rsDivisor(ecLen);
  const blocks = [];
  let k = 0;
  for(let i = 0; i < nb; i++){
    const len = shortLen - ecLen + (i < numShort ? 0 : 1);
    const d = data.slice(k, k + len); k += len;
    blocks.push({ d, e: rsRemainder(d, div) });
  }
  const res = [];
  const maxD = Math.max(...blocks.map(b => b.d.length));
  for(let i = 0; i < maxD; i++) blocks.forEach(b => { if(i < b.d.length) res.push(b.d[i]); });
  for(let i = 0; i < ecLen; i++) blocks.forEach(b => res.push(b.e[i]));
  return res;
}

function build(codewords, version, mask){
  const size = version * 4 + 17;
  const m = Array.from({ length:size }, () => new Array(size).fill(false));
  const fn = Array.from({ length:size }, () => new Array(size).fill(false));
  const set = (x, y, dark) => { m[y][x] = dark; fn[y][x] = true; };

  for(let i = 0; i < size; i++){ set(6, i, i % 2 === 0); set(i, 6, i % 2 === 0); }
  [[3, 3], [size - 4, 3], [3, size - 4]].forEach(([cx, cy]) => {
    for(let dy = -4; dy <= 4; dy++) for(let dx = -4; dx <= 4; dx++){
      const x = cx + dx, y = cy + dy;
      if(x < 0 || y < 0 || x >= size || y >= size) continue;
      const d = Math.max(Math.abs(dx), Math.abs(dy));
      set(x, y, d !== 2 && d !== 4);
    }
  });
  const al = ALIGN[version], n = al.length;
  for(let i = 0; i < n; i++) for(let j = 0; j < n; j++){
    if((i === 0 && j === 0) || (i === 0 && j === n - 1) || (i === n - 1 && j === 0)) continue;
    for(let dy = -2; dy <= 2; dy++) for(let dx = -2; dx <= 2; dx++){
      set(al[i] + dx, al[j] + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
    }
  }
  const drawFormat = msk => {
    const data = (0 << 3) | msk; // niveau M = 00
    let rem = data;
    for(let i = 0; i < 10; i++) rem = (rem << 1) ^ ((rem >>> 9) * 0x537);
    const bits = ((data << 10) | rem) ^ 0x5412;
    const b = i => ((bits >>> i) & 1) === 1;
    for(let i = 0; i <= 5; i++) set(8, i, b(i));
    set(8, 7, b(6)); set(8, 8, b(7)); set(7, 8, b(8));
    for(let i = 9; i < 15; i++) set(14 - i, 8, b(i));
    for(let i = 0; i < 8; i++) set(size - 1 - i, 8, b(i));
    for(let i = 8; i < 15; i++) set(8, size - 15 + i, b(i));
    set(8, size - 8, true);
  };
  drawFormat(0);
  if(version >= 7){
    let rem = version;
    for(let i = 0; i < 12; i++) rem = (rem << 1) ^ ((rem >>> 11) * 0x1F25);
    const bits = (version << 12) | rem;
    for(let i = 0; i < 18; i++){
      const bit = ((bits >>> i) & 1) === 1;
      const a = size - 11 + (i % 3), c = Math.floor(i / 3);
      set(a, c, bit); set(c, a, bit);
    }
  }
  let i = 0;
  for(let right = size - 1; right >= 1; right -= 2){
    if(right === 6) right = 5;
    for(let vert = 0; vert < size; vert++){
      for(let j = 0; j < 2; j++){
        const x = right - j;
        const upward = ((right + 1) & 2) === 0;
        const y = upward ? size - 1 - vert : vert;
        if(!fn[y][x] && i < codewords.length * 8){
          m[y][x] = ((codewords[i >>> 3] >>> (7 - (i & 7))) & 1) === 1;
          i++;
        }
      }
    }
  }
  const cond = [
    (x, y) => (x + y) % 2 === 0, (x, y) => y % 2 === 0, (x) => x % 3 === 0, (x, y) => (x + y) % 3 === 0,
    (x, y) => (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0, (x, y) => (x * y) % 2 + (x * y) % 3 === 0,
    (x, y) => ((x * y) % 2 + (x * y) % 3) % 2 === 0, (x, y) => ((x + y) % 2 + (x * y) % 3) % 2 === 0
  ][mask];
  for(let y = 0; y < size; y++) for(let x = 0; x < size; x++){
    if(!fn[y][x] && cond(x, y)) m[y][x] = !m[y][x];
  }
  drawFormat(mask);
  return m;
}

function penalty(m){
  const size = m.length;
  let p = 0;
  const lines = [];
  for(let y = 0; y < size; y++) lines.push(m[y]);
  for(let x = 0; x < size; x++) lines.push(m.map(r => r[x]));
  lines.forEach(line => {
    let run = 1;
    for(let i = 1; i <= size; i++){
      if(i < size && line[i] === line[i - 1]) run++;
      else { if(run >= 5) p += 3 + run - 5; run = 1; }
    }
    const s = line.map(v => v ? 1 : 0).join("");
    let idx = -1;
    while((idx = s.indexOf("1011101", idx + 1)) !== -1){
      const before = s.slice(Math.max(0, idx - 4), idx), after = s.slice(idx + 7, idx + 11);
      if((idx < 4 || before === "0000") || (idx + 11 > size || after === "0000")) p += 40;
    }
  });
  for(let y = 0; y < size - 1; y++) for(let x = 0; x < size - 1; x++){
    const c = m[y][x];
    if(c === m[y][x + 1] && c === m[y + 1][x] && c === m[y + 1][x + 1]) p += 3;
  }
  let dark = 0;
  m.forEach(r => r.forEach(v => { if(v) dark++; }));
  p += Math.floor(Math.abs(dark * 20 - size * size * 10) / (size * size)) * 10;
  return p;
}

/** Renvoie la matrice du QR code (tableau de lignes de booléens). */
export function qrMatrix(text){
  const bytes = Array.from(new TextEncoder().encode(String(text)));
  let version = 1;
  while(version <= 10){
    const cap = TOTAL[version] - EC[version] * BLOCKS[version];
    const need = Math.ceil((4 + (version < 10 ? 8 : 16) + bytes.length * 8) / 8);
    if(need <= cap) break;
    version++;
  }
  if(version > 10) throw new Error("Texte trop long pour le QR code");
  const cw = interleave(encodeData(bytes, version), version);
  let best = null, bestP = Infinity;
  for(let mask = 0; mask < 8; mask++){
    const m = build(cw, version, mask);
    const p = penalty(m);
    if(p < bestP){ bestP = p; best = m; }
  }
  return best;
}

/** QR code en SVG (noir sur blanc, marge réglementaire). */
export function qrSVG(text, { size = 220, margin = 4, label = "QR code" } = {}){
  const m = qrMatrix(text);
  const n = m.length + margin * 2;
  let path = "";
  m.forEach((row, y) => row.forEach((v, x) => { if(v) path += `M${x + margin} ${y + margin}h1v1h-1z`; }));
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${n} ${n}" width="${size}" height="${size}" shape-rendering="crispEdges" role="img" aria-label="${label}"><rect width="${n}" height="${n}" fill="#fff"/><path d="${path}" fill="#000"/></svg>`;
}
