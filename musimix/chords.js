let CHORD_DB = {};
window.currentInstrument = "guitar";
window.currentChords = [];

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

    item.addEventListener("mouseenter", () => showChordPopup(chord, item));
    item.addEventListener("mouseleave", hideChordPopup);

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

  popup.innerHTML =
    window.currentInstrument === "guitar"
      ? renderGuitarSVG(chord)
      : renderPianoSVG(chord);

  document.body.appendChild(popup);

  const rect = target.getBoundingClientRect();

  let left = rect.left;
  let top = rect.bottom + 10;

  const popupWidth = 170;

  if (left + popupWidth > window.innerWidth - 10) {
    left = window.innerWidth - popupWidth - 10;
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

function renderGuitarSVG(chordName) {
  const chord = CHORD_DB[chordName];
  if (!chord) return `<div class="missing-chord">${chordName}</div>`;

  const { frets } = chord;

  let dots = "";

  frets.forEach((fret, i) => {
    if (fret > 0) {
      dots += `
        <circle
          cx="${22 + i * 18}"
          cy="${35 + fret * 16}"
          r="6"
          fill="black"
        />
      `;
    }
  });

  return `
    <div class="popup-inner">
      <strong>${chordName}</strong>
      <svg width="140" height="150">
        ${Array.from({length:6}, (_,i)=>`
          <line x1="${22+i*18}" y1="35"
                x2="${22+i*18}" y2="115"
                stroke="black"/>
        `).join("")}

        ${Array.from({length:6}, (_,i)=>`
          <line x1="22" y1="${35+i*16}"
                x2="112" y2="${35+i*16}"
                stroke="black"/>
        `).join("")}

        ${dots}
      </svg>
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
  const notes = ["C","C#","D","Eb","E","F","F#","G","Ab","A","Bb","B"];

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

document.addEventListener("click", hideChordPopup);