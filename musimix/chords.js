let GUITAR_DB = {};
let PIANO_DB = {};

window.currentInstrument = "guitar";
window.currentChords = [];
window.currentVoicingIndex = {};

async function loadChordDatabase() {
  const [guitarRes, pianoRes] = await Promise.all([
    fetch("chords-db.json"),
    fetch("chords-db-piano.json")
  ]);

  GUITAR_DB = await guitarRes.json();
  PIANO_DB = await pianoRes.json();
}

function normalizeChordName(name) {
  const map = {
    "A#":"Bb",
    "C#":"Db",
    "D#":"Eb",
    "F#":"Gb",
    "G#":"Ab"
  };

  for (const [sharp, flat] of Object.entries(map)) {
    if (name.startsWith(sharp)) {
      return name.replace(sharp, flat);
    }
  }

  return name;
}

function extractChordsFromCho(text) {
  const matches = [...text.matchAll(/\[([^\]]+)\]/g)];
  return [...new Set(matches.map(m => m[1].trim()))];
}

function renderChordBar(chords) {
  const bar = document.getElementById("chord-bar");
  if (!bar) return;

  bar.innerHTML = "";

  chords.forEach(chord => {
    const item = document.createElement("div");
    item.className = "chord-item";
    item.innerHTML = `<span>${chord}</span>`;

    item.addEventListener("mouseenter", () => showChordPopup(chord, item));

    item.addEventListener("click", e => {
      e.stopPropagation();
      showChordPopup(chord, item);
    });

    bar.appendChild(item);
  });
}

function showChordPopup(chord, target) {
  hideChordPopup();

  chord = normalizeChordName(chord);

  const popup = document.createElement("div");
  popup.id = "chord-popup";

  const i = window.currentVoicingIndex[chord] || 0;

  popup.innerHTML =
    window.currentInstrument === "guitar"
      ? renderGuitarSVG(chord, i)
      : renderPianoSVG(chord);

  popup.addEventListener("click", e => e.stopPropagation());

  document.body.appendChild(popup);

  const rect = target.getBoundingClientRect();

  let left = rect.left;
  let top = rect.bottom + 10;

  if (window.innerWidth < 700) {
    left = (window.innerWidth - popup.offsetWidth) / 2;
  }

  if (left + popup.offsetWidth > window.innerWidth - 10) {
    left = window.innerWidth - popup.offsetWidth - 10;
  }

  popup.style.left = `${left}px`;
  popup.style.top = `${top}px`;
}

function hideChordPopup() {
  document.getElementById("chord-popup")?.remove();
}

function switchInstrument(type) {
  window.currentInstrument = type;
  renderChordBar(window.currentChords);
}

function changeVoicing(chordName, dir) {
  chordName = normalizeChordName(chordName);

  const voicings = GUITAR_DB[chordName];
  if (!voicings?.length) return;

  let i = window.currentVoicingIndex[chordName] || 0;

  i += dir;

  if (i < 0) i = voicings.length - 1;
  if (i >= voicings.length) i = 0;

  window.currentVoicingIndex[chordName] = i;

  const popup = document.getElementById("chord-popup");
  if (popup) {
    popup.innerHTML = renderGuitarSVG(chordName, i);
  }
}

function renderGuitarSVG(chordName, voicingIndex = 0) {
  chordName = normalizeChordName(chordName);

  const voicings = GUITAR_DB[chordName];
  if (!voicings?.length) return `<div>${chordName}</div>`;

  const chord = voicings[voicingIndex];
  const frets = chord.frets || [];
  const baseFret = chord.baseFret || 1;

  let dots = "";
  let topMarks = "";

  frets.forEach((fret, i) => {
    const x = 22 + i * 18;

    if (fret === "x" || fret === -1) {
      topMarks += `<text x="${x}" y="20" text-anchor="middle" font-size="12">X</text>`;
      return;
    }

    if (fret === 0) {
      topMarks += `<text x="${x}" y="20" text-anchor="middle" font-size="12">O</text>`;
      return;
    }

if (typeof fret === "number" && fret > 0) {
  let relativeFret = fret;

  if (baseFret > 1) {
    relativeFret = fret;
  }

  if (relativeFret >= 1 && relativeFret <= 5) {
    dots += `
      <circle
        cx="${x}"
        cy="${43 + ((relativeFret - 1) * 16)}"
        r="6"
        fill="#2d7cff"
      />
    `;
  }
}
  });

  return `
    <div class="popup-inner">
      <strong>${chordName}</strong>
      <div style="font-size:12px;margin-bottom:4px">${baseFret}fr</div>

      <svg width="140" height="150" viewBox="0 0 140 150">
        ${topMarks}

        ${Array.from({ length: 6 }, (_, i) => `
          <line
            x1="${22+i*18}"
            y1="35"
            x2="${22+i*18}"
            y2="115"
            stroke="#333"
          />
        `).join("")}

        ${Array.from({ length: 6 }, (_, i) => `
          <line
            x1="22"
            y1="${35+i*16}"
            x2="112"
            y2="${35+i*16}"
            stroke="#333"
          />
        `).join("")}

        ${dots}
      </svg>

      ${
        voicings.length > 1
          ? `
          <div style="
            display:flex;
            justify-content:center;
            align-items:center;
            gap:12px;
            margin-top:8px;
          ">
            <button onclick="changeVoicing('${chordName}',-1)">‹</button>
            <span>${voicingIndex + 1}/${voicings.length}</span>
            <button onclick="changeVoicing('${chordName}',1)">›</button>
          </div>
          `
          : ""
      }
    </div>
  `;
}

function renderPianoSVG(chordName) {
  chordName = normalizeChordName(chordName);

  const chord = PIANO_DB[chordName];
  if (!chord) return `<div>${chordName}</div>`;

  const notes = chord.notes || [];

  const frenchMap = {
    C:"Do", Db:"Ré♭", D:"Ré", Eb:"Mi♭", E:"Mi",
    F:"Fa", Gb:"Sol♭", G:"Sol", Ab:"La♭", A:"La",
    Bb:"Si♭", B:"Si"
  };

  let subtitle = chordName;

  Object.entries(frenchMap).forEach(([k,v])=>{
    if (subtitle.startsWith(k)) subtitle = subtitle.replace(k,v);
  });

  subtitle = subtitle
    .replace("maj7"," majeur 7")
    .replace("m7"," mineur 7")
    .replace("m"," mineur");

  const degreesMap = {
    0:"1",
    1:"♭2",
    2:"2",
    3:"♭3",
    4:"3",
    5:"4",
    6:"#4",
    7:"5",
    8:"#5",
    9:"6",
    10:"♭7",
    11:"7"
  };

  const chromatic = ["C","Db","D","Eb","E","F","Gb","G","Ab","A","Bb","B"];

  function idx(n){ return chromatic.indexOf(normalizeChordName(n)); }
  function dist(a,b){ return (idx(b)-idx(a)+12)%12; }

  const degrees = notes.map(n => degreesMap[dist(notes[0], n)] || "");

  const whiteKeys = ["C","D","E","F","G","A","B"];
 const blackKeys = {
  C:["Db","C#"],
  D:["Eb","D#"],
  F:["Gb","F#"],
  G:["Ab","G#"],
  A:["Bb","A#"]
};

  let keysHTML = "";

  for(let o=0;o<2;o++){

    whiteKeys.forEach((n,i)=>{
      const x = o*294 + i*42;
      const active = notes.includes(n);

      keysHTML += `
        <div style="
          position:absolute;
          left:${x}px;
          top:0;
          width:42px;
          height:132px;
          background:${active ? "#2d7cff" : "#fff"};
          border:1px solid #222;
          border-radius:0 0 6px 6px;
          box-sizing:border-box;
        "></div>
      `;
    });

    Object.entries(blackKeys).forEach(([w,b])=>{
      const i = whiteKeys.indexOf(w);
      const x = o*294 + i*42 + 29;
      const active = b.some(note => notes.includes(note));

      keysHTML += `
        <div style="
          position:absolute;
          left:${x}px;
          top:0;
          width:26px;
          height:76px;
          background:${active ? "#2d7cff" : "#111"};
          border-radius:0 0 5px 5px;
          z-index:3;
        "></div>
      `;
    });
  }

  return `
  <div class="popup-inner"
    style="
      width:760px;
      max-width:95vw;
      background:white;
      color:#111;
      border-radius:22px;
      padding:24px;
    ">

    <div style="
      font-size:38px;
      font-weight:700;
      text-align:center;
      margin-bottom:2px;
    ">
      ${chordName}
    </div>

    <div style="
      font-size:18px;
      text-align:center;
      color:#666;
      margin-bottom:18px;
    ">
      ${subtitle}
    </div>

    <div style="
      display:flex;
      justify-content:center;
      gap:70px;
      font-size:18px;
      font-weight:600;
      margin-bottom:8px;
    ">
      ${notes.map(n=>`<span>${n}</span>`).join("")}
    </div>

    <div style="
      position:relative;
      width:588px;
      height:132px;
      margin:auto;
    ">
      ${keysHTML}
    </div>

    <div style="
      display:flex;
      justify-content:space-around;
      width:588px;
      margin:10px auto 0;
      color:#777;
      font-size:15px;
    ">
      <span>DO</span>
      <span>DO</span>
      <span>DO</span>
    </div>

    <div style="
      display:flex;
      align-items:center;
      justify-content:space-between;
      margin-top:26px;
      gap:24px;
    ">

      <svg width="180" height="110" viewBox="0 0 180 110">

        ${[20,35,50,65,80].map(y=>`
          <line
            x1="20"
            y1="${y}"
            x2="170"
            y2="${y}"
            stroke="#666"
            stroke-width="1"
          />
        `).join("")}

        <text
          x="8"
          y="70"
          font-size="46"
          font-family="serif"
        >𝄞</text>

        ${notes.map((n,i)=>`
          <ellipse
            cx="${95 + i*16}"
            cy="${62 - i*8}"
            rx="5.5"
            ry="4.5"
            fill="#111"
          />
        `).join("")}

      </svg>

      <div style="flex:1">

        <div style="
          font-size:30px;
          font-weight:600;
          margin-bottom:8px;
        ">
          ${notes.join(" – ")}
        </div>

        <div style="
          font-size:22px;
          color:#666;
        ">
          ${degrees.join(" – ")}
        </div>

      </div>

    </div>

  </div>
  `;
}
document.addEventListener("click", e => {
  const popup = document.getElementById("chord-popup");

  if (
    popup &&
    !popup.contains(e.target) &&
    !e.target.closest(".chord-item")
  ) {
    hideChordPopup();
  }
});