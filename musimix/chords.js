/* MusiMix — théorie des accords + diagrammes guitare / piano
   - transposition avec la bonne orthographe (♯ ou ♭ selon la tonalité, basse des accords slash)
   - notation brésilienne / variantes (7M, 7+, °, ø, (9)…) normalisée
   - recherche tolérante dans chords-db.json (C#, Db, Csharp…) + simplification si l'accord manque
   - piano calculé depuis la formule de l'accord (plus besoin que la base soit complète) */

let GUITAR_DB = {};
let PIANO_DB = {};
let chordDbPromise = null;

window.currentInstrument = localStorage.getItem('musimixInstrument') || 'guitar';
window.currentChords = [];
window.currentVoicingIndex = {};

const SHARPS = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
const FLATS  = ['C','Db','D','Eb','E','F','Gb','G','Ab','A','Bb','B'];
const NOTE_INDEX = {C:0,'B#':0,'C#':1,Db:1,D:2,'D#':3,Eb:3,E:4,Fb:4,'E#':5,F:5,'F#':6,Gb:6,G:7,'G#':8,Ab:8,A:9,'A#':10,Bb:10,B:11,Cb:11};
const FLAT_KEYS = new Set(['F','Bb','Eb','Ab','Db','Gb','Cb','Dm','Gm','Cm','Fm','Bbm','Ebm','Abm']);
const GUITAR_ROOT = ['C','Csharp','D','Eb','E','F','Fsharp','G','Ab','A','Bb','B'];
const FR_NAMES = {C:'Do',D:'Ré',E:'Mi',F:'Fa',G:'Sol',A:'La',B:'Si'};

const QUALITY = {               // demi-tons depuis la fondamentale
  '':[0,4,7], 'm':[0,3,7], '5':[0,7], 'dim':[0,3,6], 'aug':[0,4,8],
  'sus2':[0,2,7], 'sus4':[0,5,7], '6':[0,4,7,9], 'm6':[0,3,7,9], '69':[0,4,7,9,14], 'm69':[0,3,7,9,14],
  '7':[0,4,7,10], 'maj7':[0,4,7,11], 'm7':[0,3,7,10], 'mmaj7':[0,3,7,11], 'dim7':[0,3,6,9],
  'm7b5':[0,3,6,10], 'aug7':[0,4,8,10], '7sus4':[0,5,7,10], '7b5':[0,4,6,10], 'maj7#5':[0,4,8,11],
  'maj7b5':[0,4,6,11], 'add9':[0,4,7,14], 'madd9':[0,3,7,14], 'add11':[0,4,7,17],
  '9':[0,4,7,10,14], 'maj9':[0,4,7,11,14], 'm9':[0,3,7,10,14], '7b9':[0,4,7,10,13], '7#9':[0,4,7,10,15],
  '11':[0,4,7,10,14,17], 'm11':[0,3,7,10,14,17], 'maj11':[0,4,7,11,14,17],
  '13':[0,4,7,10,14,21], 'maj13':[0,4,7,11,14,21], '7#11':[0,4,7,10,18], '9#11':[0,4,7,10,14,18]
};
const QUALITY_ALIAS = {
  'M':'', 'maj':'', 'min':'m', 'mi':'m', '-':'m', 'm7(b5)':'m7b5', 'ø':'m7b5', '°':'dim', 'o':'dim',
  '°7':'dim7', 'o7':'dim7', '+':'aug', '#5':'aug', '7+5':'aug7', '7#5':'aug7', '+7':'aug7',
  'sus':'sus4', '4':'sus4', '7sus':'7sus4', '7(4)':'7sus4', '2':'add9', 'add2':'add9', '(9)':'add9',
  'm(9)':'madd9', 'm(add9)':'madd9', 'madd2':'madd9', '6/9':'69', 'm6/9':'m69', '7(9)':'9', '7/9':'9',
  'maj7(9)':'maj9', 'm7(9)':'m9', 'm7/9':'m9', 'm(maj7)':'mmaj7', 'mM7':'mmaj7', 'm7M':'mmaj7',
  '7(b9)':'7b9', '7(#9)':'7#9', '7(13)':'13', '7(11)':'11', 'm7(11)':'m11', 'maj7(#11)':'maj7',
  '9(11)':'11', 'dim(b13)':'dim'
};
const DEGREES = {0:'1',1:'♭2',2:'2',3:'♭3',4:'3',5:'4',6:'♭5',7:'5',8:'♯5',9:'6',10:'♭7',11:'7',
                 13:'♭9',14:'9',15:'♯9',17:'11',18:'♯11',21:'13'};

/* ───────────────────────────── base de données ── */
function loadChordDatabase(){
  if(!chordDbPromise){
    chordDbPromise = Promise.all([
      fetch('chords-db.json').then(r=>r.json()).catch(()=>({})),
      fetch('chords-db-piano.json').then(r=>r.json()).catch(()=>({}))
    ]).then(([g,p])=>{ GUITAR_DB=g; PIANO_DB=p; });
  }
  return chordDbPromise;
}

/* ───────────────────────────── théorie ── */
function normalizeChord(c){
  c = String(c||'').trim().replace(/[♯]/g,'#').replace(/[♭]/g,'b');
  c = c.replace(/º/g,'°');
  c = c.replace(/7M|7\+(?!5)|M7(?!\w)|Δ7?/g,'maj7');
  c = c.replace(/^([A-G][#b]?)(min|-)(?=\d|$|\/|\()/, '$1m');
  return c;
}

function parseChord(name){
  const m = normalizeChord(name).match(/^([A-G](?:#|b)?)([^/]*)(?:\/([A-G](?:#|b)?))?$/);
  if(!m) return null;
  let q = m[2] || '';
  if(QUALITY_ALIAS[q] !== undefined) q = QUALITY_ALIAS[q];
  q = q.replace(/^\((.*)\)$/,'$1');
  if(QUALITY_ALIAS[q] !== undefined) q = QUALITY_ALIAS[q];
  return { root:m[1], rootIdx:NOTE_INDEX[m[1]], quality:q, rawQuality:m[2]||'',
           bass:m[3]||null, bassIdx:m[3]!=null ? NOTE_INDEX[m[3]] : null };
}

function spell(idx, flats){ return (flats ? FLATS : SHARPS)[((idx%12)+12)%12]; }

/** flats : true/false impose l'orthographe ; null = garde le style de l'accord d'origine */
function transposeChord(name, n, flats=null){
  const p = parseChord(name);
  if(!p || p.rootIdx === undefined) return name;
  if(!n && flats === null) return normalizeChord(name);
  const useFlats = flats === null ? p.root.includes('b') : flats;
  let out = spell(p.rootIdx + n, useFlats) + p.rawQuality;
  if(p.bass) out += '/' + spell(p.bassIdx + n, useFlats);
  return out;
}

function transposeKey(key, n){
  if(!key) return '';
  const p = parseChord(key);
  if(!p) return key;
  const minor = /^m(?!aj)/.test(p.rawQuality);
  const sharpName = spell(p.rootIdx+n,false)+(minor?'m':'');
  const flatName  = spell(p.rootIdx+n,true)+(minor?'m':'');
  return FLAT_KEYS.has(flatName) ? flatName : sharpName;
}

function keyPrefersFlats(key){
  if(!key) return null;
  return FLAT_KEYS.has(key) ? true : (/^[A-G]#/.test(key) ? false : null);
}

function chordIntervals(p){
  if(QUALITY[p.quality]) return QUALITY[p.quality];
  // accord inconnu : on garde la base reconnaissable
  const q = p.quality;
  if(/^m(?!aj)/.test(q)) return q.includes('7') ? QUALITY.m7 : QUALITY.m;
  if(/maj7|maj9|maj13/.test(q)) return QUALITY.maj7;
  if(/7|9|11|13/.test(q)) return QUALITY['7'];
  if(/dim/.test(q)) return QUALITY.dim;
  if(/sus/.test(q)) return QUALITY.sus4;
  return QUALITY[''];
}

function chordUsesFlats(p){
  if(p.root.includes('b')) return true;
  if(p.root.includes('#')) return false;
  const minorish = /^(m(?!aj)|dim)/.test(p.quality);
  return minorish ? ['C','D','F','G'].includes(p.root) : p.root === 'F';
}

function chordNotes(name){
  const p = parseChord(name);
  if(!p || p.rootIdx === undefined) return null;
  const iv = chordIntervals(p);
  const flats = chordUsesFlats(p);
  return {
    parsed:p, intervals:iv, flats,
    notes: iv.map(i=>spell(p.rootIdx+i, flats)),
    degrees: iv.map(i=>DEGREES[i] || '')
  };
}

/* ───────────────────────────── recherche guitare ── */
function guitarCandidates(name){
  const p = parseChord(name);
  if(!p || p.rootIdx === undefined) return [];
  const roots = [GUITAR_ROOT[p.rootIdx], SHARPS[p.rootIdx], FLATS[p.rootIdx]];
  const qs = [p.quality, p.rawQuality];
  const simpler = { 'maj9':'maj7','maj13':'maj7','maj11':'maj7','13':'7','11':'7','9':'7','m11':'m7',
                    'm9':'m7','7b9':'7','7#9':'7','madd9':'m','add9':'','add11':'','69':'6','m69':'m6' };
  if(simpler[p.quality]!==undefined) qs.push(simpler[p.quality]);
  qs.push(/^m(?!aj)/.test(p.quality) ? 'm' : '');
  const out = [];
  for(const q of qs){
    for(const r of roots){
      if(p.bass){
        for(const b of [SHARPS[p.bassIdx], FLATS[p.bassIdx]]) out.push(`${r}${q}/${b}`);
      }
      out.push(r+q);
    }
  }
  return [...new Set(out)];
}

function lookupGuitar(name){
  for(const k of guitarCandidates(name)){
    if(GUITAR_DB[k]?.length) return {key:k, voicings:GUITAR_DB[k], exact:k===guitarCandidates(name)[0]};
  }
  return null;
}

/* ───────────────────────────── barre d'accords ── */
function extractChordsFromCho(text){
  const matches = [...String(text).matchAll(/\[([^\]]+)\]/g)];
  return [...new Set(matches.map(m=>m[1].trim()).filter(c=>parseChord(c)))];
}

function renderChordBar(chords){
  const bar = document.getElementById('chord-bar');
  if(!bar) return;
  bar.innerHTML = '';
  chords.forEach(chord=>{
    const item = document.createElement('button');
    item.className = 'chord-item';
    item.textContent = chord;
    item.dataset.chord = chord;
    item.addEventListener('click', e=>{ e.stopPropagation(); showChordPopup(chord, item); });
    if(matchMedia('(hover:hover)').matches){
      item.addEventListener('mouseenter', ()=>showChordPopup(chord, item));
    }
    bar.appendChild(item);
  });
}

/* ───────────────────────────── popup ── */
function showChordPopup(chord, target){
  hideChordPopup();
  const popup = document.createElement('div');
  popup.id = 'chord-popup';
  popup.dataset.chord = chord;
  popup.innerHTML = window.currentInstrument === 'guitar'
    ? renderGuitarSVG(chord, window.currentVoicingIndex[chord] || 0)
    : renderPianoSVG(chord);
  popup.addEventListener('click', e=>e.stopPropagation());
  document.body.appendChild(popup);

  const rect = target.getBoundingClientRect();
  let left = rect.left;
  let top = rect.bottom + 10;
  if(left + popup.offsetWidth > innerWidth - 10) left = innerWidth - popup.offsetWidth - 10;
  if(innerWidth < 700) left = (innerWidth - popup.offsetWidth)/2;
  if(top + popup.offsetHeight > innerHeight - 10) top = Math.max(10, rect.top - popup.offsetHeight - 10);
  popup.style.left = `${Math.max(10,left)}px`;
  popup.style.top = `${top}px`;
}

function hideChordPopup(){ document.getElementById('chord-popup')?.remove(); }

function switchInstrument(type){
  window.currentInstrument = type;
  localStorage.setItem('musimixInstrument', type);
  document.querySelectorAll('[data-instrument]').forEach(b=>b.classList.toggle('active', b.dataset.instrument===type));
  const popup = document.getElementById('chord-popup');
  if(popup){
    const chord = popup.dataset.chord;
    popup.innerHTML = type==='guitar' ? renderGuitarSVG(chord, window.currentVoicingIndex[chord]||0) : renderPianoSVG(chord);
  }
}

function changeVoicing(chordName, dir){
  const hit = lookupGuitar(chordName);
  if(!hit) return;
  let i = (window.currentVoicingIndex[chordName] || 0) + dir;
  if(i < 0) i = hit.voicings.length - 1;
  if(i >= hit.voicings.length) i = 0;
  window.currentVoicingIndex[chordName] = i;
  const popup = document.getElementById('chord-popup');
  if(popup) popup.innerHTML = renderGuitarSVG(chordName, i);
}

function escAttr(s){ return String(s).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/'/g,'&#39;').replace(/</g,'&lt;'); }

/* ───────────────────────────── guitare ── */
function renderGuitarSVG(chordName, voicingIndex=0){
  const hit = lookupGuitar(chordName);
  const notes = chordNotes(chordName);
  const subtitle = notes ? notes.notes.join(' · ') : '';
  if(!hit){
    return `<div class="popup-inner"><strong class="pop-title">${escAttr(chordName)}</strong>
      <div class="pop-sub">${subtitle}</div><div class="pop-missing">Diagramme non disponible</div></div>`;
  }
  const v = hit.voicings[Math.min(voicingIndex, hit.voicings.length-1)];
  const frets = v.frets || [], fingers = v.fingers || [], base = v.baseFret || 1;
  const X0 = 30, DX = 20, Y0 = 34, DY = 22, NF = 5;
  let s = '';
  for(let i=0;i<6;i++) s += `<line x1="${X0+i*DX}" y1="${Y0}" x2="${X0+i*DX}" y2="${Y0+NF*DY}" stroke="#444" stroke-width="1.2"/>`;
  for(let f=0;f<=NF;f++) s += `<line x1="${X0}" y1="${Y0+f*DY}" x2="${X0+5*DX}" y2="${Y0+f*DY}" stroke="#444" stroke-width="${f===0&&base===1?5:1.2}"/>`;
  if(base > 1) s += `<text x="${X0-8}" y="${Y0+DY*0.7}" text-anchor="end" font-size="12" fill="#555">${base}fr</text>`;
  (v.barres||[]).forEach(b=>{
    const idx = frets.map((f,i)=>f===b?i:-1).filter(i=>i>=0);
    if(idx.length>1){
      const x1 = X0+Math.min(...idx)*DX, x2 = X0+Math.max(...idx)*DX, y = Y0+(b-0.5)*DY;
      s += `<rect x="${x1-7}" y="${y-7}" width="${x2-x1+14}" height="14" rx="7" fill="#2d7cff"/>`;
    }
  });
  frets.forEach((f,i)=>{
    const x = X0+i*DX;
    if(f === -1 || f === 'x') s += `<text x="${x}" y="${Y0-10}" text-anchor="middle" font-size="13" fill="#666">✕</text>`;
    else if(f === 0) s += `<circle cx="${x}" cy="${Y0-14}" r="5" fill="none" stroke="#666" stroke-width="1.5"/>`;
    else if(f > 0 && f <= NF){
      const y = Y0+(f-0.5)*DY;
      s += `<circle cx="${x}" cy="${y}" r="8" fill="#2d7cff"/>`;
      if(fingers[i]) s += `<text x="${x}" y="${y+4}" text-anchor="middle" font-size="11" font-weight="700" fill="#fff">${fingers[i]}</text>`;
    }
  });
  const n = hit.voicings.length;
  const label = hit.key.replace('sharp','#');
  return `<div class="popup-inner">
    <strong class="pop-title">${escAttr(chordName)}</strong>
    <div class="pop-sub">${label!==chordName ? `≈ ${escAttr(label)} · ` : ''}${subtitle}</div>
    <svg width="150" height="160" viewBox="0 0 150 160">${s}</svg>
    ${n>1 ? `<div class="pop-nav">
      <button onclick="changeVoicing('${escAttr(chordName)}',-1)">‹</button>
      <span>${Math.min(voicingIndex,n-1)+1}/${n}</span>
      <button onclick="changeVoicing('${escAttr(chordName)}',1)">›</button></div>` : ''}
  </div>`;
}

/* ───────────────────────────── piano ── */
function frenchName(chordName){
  const p = parseChord(chordName);
  if(!p) return chordName;
  let root = FR_NAMES[p.root[0]] + (p.root[1]==='#'?'♯':p.root[1]==='b'?'♭':'');
  const q = p.quality;
  const qName = {'':' majeur','m':' mineur','7':' septième','maj7':' majeur 7','m7':' mineur 7',
    'dim':' diminué','dim7':' diminué 7','m7b5':' demi-diminué','aug':' augmenté','sus2':' sus2','sus4':' sus4',
    '6':' sixte','m6':' mineur 6','9':' neuvième','maj9':' majeur 9','m9':' mineur 9','add9':' add9','madd9':' mineur add9',
    '7sus4':' 7 sus4','mmaj7':' mineur majeur 7','5':' quinte (power chord)'}[q] ?? ` ${q}`;
  let out = root + qName;
  if(p.bass) out += ` / basse ${FR_NAMES[p.bass[0]]}${p.bass[1]==='#'?'♯':p.bass[1]==='b'?'♭':''}`;
  return out;
}

function renderPianoSVG(chordName){
  const info = chordNotes(chordName);
  if(!info) return `<div class="popup-inner"><strong class="pop-title">${escAttr(chordName)}</strong></div>`;
  const p = info.parsed;
  const useFlats = info.flats;
  // voicing : basse éventuelle, puis accord empilé au-dessus (do3 = 0)
  let base = p.rootIdx;
  const keys = [];
  if(p.bass){ keys.push({semi:p.bassIdx, bass:true}); if(base <= p.bassIdx) base += 12; }
  info.intervals.forEach((iv,i)=>keys.push({semi:base+iv, degree:info.degrees[i]}));
  const maxSemi = Math.max(...keys.map(k=>k.semi));
  const octaves = maxSemi >= 24 ? 3 : 2;
  const whiteOrder = [0,2,4,5,7,9,11];
  const W = 30, H = 120, BW = 19, BH = 74;
  const nWhite = 7*octaves;
  const active = new Map(keys.map(k=>[k.semi,k]));
  let white = '', black = '', labels = '';
  for(let o=0;o<octaves;o++){
    whiteOrder.forEach((semi,i)=>{
      const abs = o*12+semi, x = (o*7+i)*W, k = active.get(abs);
      white += `<rect x="${x}" y="0" width="${W}" height="${H}" rx="4" fill="${k?(k.bass?'#ff9f1c':'#2d7cff'):'#fff'}" stroke="#222"/>`;
      if(k) labels += `<text x="${x+W/2}" y="${H-10}" text-anchor="middle" font-size="11" font-weight="700" fill="#fff">${spell(abs,useFlats)}</text>`;
      if(semi===0) labels += `<text x="${x+W/2}" y="${H+14}" text-anchor="middle" font-size="10" fill="#888">Do${o+3}</text>`;
    });
    [1,3,6,8,10].forEach(semi=>{
      const abs = o*12+semi, k = active.get(abs);
      const leftWhite = whiteOrder.filter(w=>w<semi).length;
      const x = (o*7+leftWhite)*W - BW/2;
      black += `<rect x="${x}" y="0" width="${BW}" height="${BH}" rx="3" fill="${k?(k.bass?'#ff9f1c':'#2d7cff'):'#111'}"/>`;
      if(k) labels += `<text x="${x+BW/2}" y="${BH-8}" text-anchor="middle" font-size="9" font-weight="700" fill="#fff">${spell(abs,useFlats)}</text>`;
    });
  }
  const kb = `<svg class="piano-svg" viewBox="-1 -1 ${nWhite*W+2} ${H+20}" width="100%">${white}${black}${labels}</svg>`;

  // portée (clé de sol), notes réellement placées
  const letters = ['C','D','E','F','G','A','B'];
  const staffNotes = keys.map(k=>{
    const midi = 48 + 12 + k.semi;           // une octave au-dessus pour la clé de sol
    const name = spell(midi, useFlats);
    const octave = Math.floor(midi/12) - 1;
    const step = octave*7 + letters.indexOf(name[0]) - (4*7+2);   // 0 = mi4 (ligne du bas)
    return {name, step, bass:k.bass};
  });
  const SY = 70, HS = 5;                     // y de la ligne du bas, demi-interligne
  let staff = '';
  for(let l=0;l<5;l++) staff += `<line x1="10" y1="${SY-l*2*HS}" x2="190" y2="${SY-l*2*HS}" stroke="#666"/>`;
  staff += `<text x="12" y="${SY+6}" font-size="48" font-family="serif" fill="#111">𝄞</text>`;
  staffNotes.forEach((n,i)=>{
    const x = 95 + (staffNotes.slice(0,i).some(m=>Math.abs(m.step-n.step)===1) && i%2 ? 13 : 0);
    const y = SY - n.step*HS;
    for(let s=-2; s>=n.step; s-=2) staff += `<line x1="${x-9}" y1="${SY-s*HS}" x2="${x+9}" y2="${SY-s*HS}" stroke="#666"/>`;
    for(let s=10; s<=n.step; s+=2) staff += `<line x1="${x-9}" y1="${SY-s*HS}" x2="${x+9}" y2="${SY-s*HS}" stroke="#666"/>`;
    staff += `<ellipse cx="${x}" cy="${y}" rx="6" ry="4.5" fill="${n.bass?'#ff9f1c':'#111'}" transform="rotate(-20 ${x} ${y})"/>`;
    if(n.name.length>1) staff += `<text x="${x-16}" y="${y+4}" font-size="13" fill="#111">${n.name[1]==='#'?'♯':'♭'}</text>`;
  });

  return `<div class="popup-inner piano-pop">
    <div class="pop-title big">${escAttr(chordName)}</div>
    <div class="pop-sub">${frenchName(chordName)}</div>
    ${kb}
    <div class="piano-bottom">
      <svg width="200" height="110" viewBox="0 -15 200 110">${staff}</svg>
      <div>
        <div class="piano-notes">${keys.map(k=>spell(k.semi,useFlats)).join(' – ')}</div>
        <div class="piano-degrees">${keys.map(k=>k.bass?'basse':k.degree).join(' – ')}</div>
      </div>
    </div>
  </div>`;
}

document.addEventListener('click', e=>{
  const popup = document.getElementById('chord-popup');
  if(popup && !popup.contains(e.target) && !e.target.closest('.chord-item,.chord,.instrument-switch,#nowChord,#miniChord')) hideChordPopup();
});
