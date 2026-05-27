let CHORD_DB = {};
window.currentInstrument = "guitar";
window.currentChords = [];
window.currentVoicingIndex = {};

async function loadChordDatabase() {
  const res = await fetch("chords-db.json");
  CHORD_DB = await res.json();
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

    item.addEventListener("mouseenter", () => {
      showChordPopup(chord, item);
    });

    item.addEventListener("click", e => {
      e.stopPropagation();
      showChordPopup(chord, item);
    });

    bar.appendChild(item);
  });
}

function showChordPopup(chord, target) {
  hideChordPopup();

  const popup = document.createElement("div");
  popup.id = "chord-popup";

  const currentIndex =
    window.currentVoicingIndex[chord] || 0;

  popup.innerHTML =
    window.currentInstrument === "guitar"
      ? renderGuitarSVG(chord, currentIndex)
      : renderPianoSVG(chord);

  popup.addEventListener("click", e => {
    e.stopPropagation();
  });

  document.body.appendChild(popup);

  const rect = target.getBoundingClientRect();

  let left = rect.left;
  let top = rect.bottom + 10;

  if (left + 180 > window.innerWidth) {
    left = window.innerWidth - 190;
  }

  popup.style.left = left + "px";
  popup.style.top = top + "px";
}

function hideChordPopup() {
  document.getElementById("chord-popup")?.remove();
}

function switchInstrument(type) {
  window.currentInstrument = type;
  renderChordBar(window.currentChords);
}

function changeVoicing(chordName, dir) {
  let voicings = CHORD_DB[chordName];
  if (!Array.isArray(voicings)) return;

  let i = window.currentVoicingIndex[chordName] || 0;

  i += dir;

  if (i < 0) i = voicings.length - 1;
  if (i >= voicings.length) i = 0;

  window.currentVoicingIndex[chordName] = i;

  const popup = document.getElementById("chord-popup");
  if (popup) {
    popup.innerHTML = renderGuitarSVG(chordName, i);

    popup.addEventListener("click", e => {
      e.stopPropagation();
    });
  }
}

function renderGuitarSVG(chordName, voicingIndex = 0) {
  let voicings = CHORD_DB[chordName];
  if (!voicings) return `<div>${chordName}</div>`;

  if (!Array.isArray(voicings)) {
    voicings = [voicings];
  }

  const chord = voicings[voicingIndex];
  const { frets } = chord;

  let dots = "";

  frets.forEach((fret, i) => {
    if (fret > 0) {
      dots += `
        <circle
          cx="${22 + i * 18}"
          cy="${35 + fret * 16}"
          r="5"
          fill="#2d7cff"
        />
      `;
    }
  });

  return `
    <div class="popup-inner">
      <strong>${chordName}</strong>

      <svg width="140" height="150">
        ${Array.from({ length: 6 }, (_, i) => `
          <line
            x1="${22 + i * 18}"
            y1="35"
            x2="${22 + i * 18}"
            y2="115"
            stroke="black"
          />
        `).join("")}

        ${Array.from({ length: 6 }, (_, i) => `
          <line
            x1="22"
            y1="${35 + i * 16}"
            x2="112"
            y2="${35 + i * 16}"
            stroke="black"
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
            <span>${voicingIndex + 1} / ${voicings.length}</span>
            <button onclick="changeVoicing('${chordName}',1)">›</button>
          </div>
        `
          : ""
      }
    </div>
  `;
}

function renderPianoSVG(chordName) {
  const notes = getPianoNotes(chordName);

  return `
    <div class="popup-inner">
      <strong>${chordName}</strong>
      <div>${notes.join(" - ")}</div>
    </div>
  `;
}

function getPianoNotes(chord) {
  const notes = [
    "C","C#","D","Eb","E","F",
    "F#","G","Ab","A","Bb","B"
  ];

  const root = chord.match(/^[A-G][#b]?/)?.[0];
  if (!root) return [];

  let i = notes.indexOf(root);

  if (chord.includes("m") && !chord.includes("maj")) {
    return [
      notes[i],
      notes[(i+3)%12],
      notes[(i+7)%12]
    ];
  }

  return [
    notes[i],
    notes[(i+4)%12],
    notes[(i+7)%12]
  ];
}

document.addEventListener("click", (e) => {
  const popup = document.getElementById("chord-popup");

  if (
    popup &&
    !popup.contains(e.target) &&
    !e.target.closest(".chord-item")
  ) {
    hideChordPopup();
  }
});