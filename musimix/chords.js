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

  // si accord en position haute
  if (baseFret > 1) {
    relativeFret = fret;
  }

  if (relativeFret >= 1 && relativeFret <= 5) {
    dots += `
      <circle
        cx="${x}"
        cy="${35 + ((relativeFret - 1) * 16) + 35}"
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

  const keyboard = [
    "C","C#","D","Eb","E","F",
    "F#","G","Ab","A","Bb","B"
  ];

  return `
    <div class="popup-inner">
      <strong>${chordName}</strong>

      <div style="display:flex;gap:2px;margin-top:12px;">
        ${keyboard.map(n => `
          <div
            style="
              width:24px;
              height:${n.includes('#') || n.includes('b') ? '55px':'90px'};
              background:${notes.includes(n) ? '#2d7cff' : 'white'};
              border:1px solid #222;
              border-radius:4px;
            ">
          </div>
        `).join("")}
      </div>

      <div style="margin-top:8px;font-size:13px">
        ${notes.join(" – ")}
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