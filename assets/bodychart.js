/* =========================================================
   Schéma corporel du bilan (face / dos)
   ---------------------------------------------------------
   Une silhouette humaine dessinée en courbes. Les zones
   cliquables sont des bandes découpées à la forme du corps
   (clipPath) : elles suivent donc le contour de la silhouette.
   Les noms de zones restent ceux de bilan-kine/data.js.
   Repère : viewBox 0 0 200 414, axe du corps en x = 100.
   ========================================================= */

const esc = v => String(v ?? "").replace(/[&<>"']/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c]));

/* Contour du côté droit du dessin (x ≥ 100), du cou jusqu'à l'entrejambe.
   Le côté gauche est obtenu par symétrie. */
const HALF = [
  ["M", 108, 50],
  ["C", 108, 56, 109, 62, 112, 65],          // cou
  ["C", 118, 69, 128, 70, 136, 73],          // trapèze
  ["C", 144, 76, 149, 83, 149, 93],          // moignon de l'épaule
  ["C", 150, 108, 152, 122, 153, 136],       // deltoïde, bras
  ["C", 154, 146, 156, 152, 157, 160],       // coude
  ["C", 159, 176, 162, 192, 164, 210],       // avant-bras
  ["C", 165, 216, 170, 222, 171, 232],       // poignet, main
  ["C", 172, 242, 168, 252, 162, 254],       // doigts
  ["C", 157, 255, 154, 248, 154, 240],
  ["C", 154, 232, 155, 222, 153, 214],       // bord interne de la main
  ["C", 150, 196, 147, 180, 145, 164],       // avant-bras, bord interne
  ["C", 144, 156, 141, 150, 140, 142],       // pli du coude
  ["C", 138, 128, 136, 116, 133, 106],       // bras, bord interne
  ["C", 132, 116, 131, 130, 129, 146],       // aisselle, flanc
  ["C", 127, 158, 125, 166, 126, 174],       // taille
  ["C", 130, 186, 134, 196, 134, 210],       // hanche
  ["C", 134, 236, 131, 262, 128, 288],       // cuisse
  ["C", 127, 296, 127, 304, 128, 312],       // genou
  ["C", 131, 330, 129, 352, 123, 374],       // mollet
  ["C", 121, 382, 121, 390, 124, 398],       // cheville
  ["C", 128, 403, 128, 409, 122, 410],       // pied
  ["L", 108, 410],
  ["C", 105, 404, 106, 394, 107, 384],       // talon, bord interne
  ["C", 106, 364, 104, 344, 105, 322],       // jambe, bord interne
  ["C", 105, 312, 104, 304, 104, 296],       // genou, bord interne
  ["C", 104, 270, 103, 246, 102, 222],       // cuisse, bord interne
  ["C", 101.5, 218, 101, 216, 100, 216]      // entrejambe
];

export const mirror = x => +(200 - x).toFixed(1);

function silhouettePath(){
  const right = HALF.map(([c, ...p]) => `${c}${p.join(" ")}`).join(" ");
  /* Côté gauche : on reparcourt la moitié droite à l'envers, en symétrie */
  const pts = [];
  HALF.forEach(([c, ...p]) => { pts.push({ c, p }); });
  let left = "";
  for(let i = pts.length - 1; i > 0; i--){
    const { c, p } = pts[i];
    const prevEnd = pts[i - 1].p.slice(-2);
    if(c === "C"){
      left += ` C${mirror(p[2])} ${p[3]} ${mirror(p[0])} ${p[1]} ${mirror(prevEnd[0])} ${prevEnd[1]}`;
    }else{
      left += ` L${mirror(prevEnd[0])} ${prevEnd[1]}`;
    }
  }
  return `${right}${left} Z`;
}

export const SIL = silhouettePath();
export const HEAD = `<ellipse cx="100" cy="30" rx="17" ry="21.5"/>`;
export const EARS = `<ellipse cx="83" cy="32" rx="3.2" ry="6"/><ellipse cx="117" cy="32" rx="3.2" ry="6"/>`;

/* Bandes des zones, pour la moitié gauche du dessin (x < 100) ; symétrie pour l'autre côté.
   Même ordre que bilan-kine/data.js : mid = [tête, cou, tronc haut, tronc bas],
   side = [épaule, bras, avant-bras, main, hanche, cuisse, genou, jambe, pied]. */
const MID = [
  [[60, 0], [140, 0], [140, 51], [60, 51]],                     // tête
  [[86, 51], [114, 51], [114, 67], [86, 67]],                   // cou
  [[72, 67], [128, 67], [131, 146], [69, 146]],                 // thorax / dorsales
  [[69, 146], [131, 146], [134, 190], [66, 190]]                // abdomen / lombaires
];
const SIDE = [
  [[30, 58], [86, 58], [86, 67], [72, 67], [69, 112], [30, 112]],   // épaule
  [[20, 112], [69, 112], [64, 152], [20, 152]],                     // bras
  [[10, 152], [64, 152], [56, 212], [10, 212]],                     // avant-bras
  [[0, 212], [56, 212], [56, 262], [0, 262]],                       // main
  [[60, 190], [100, 190], [100, 220], [60, 220]],                   // hanche / fessier
  [[58, 220], [100, 220], [100, 286], [58, 286]],                   // cuisse
  [[58, 286], [100, 286], [100, 318], [58, 318]],                   // genou / creux poplité
  [[58, 318], [100, 318], [100, 382], [58, 382]],                   // jambe / mollet
  [[50, 382], [100, 382], [100, 414], [50, 414]]                    // pied
];

const poly = pts => "M" + pts.map(p => p.join(" ")).join(" L") + " Z";
const polyMirror = pts => poly(pts.map(([x, y]) => [mirror(x), y]));

/** Géométrie de chaque zone du schéma, d'après les listes de data.js. */
export function zoneShapes(Z, R, view){
  const d = Z[view];
  const out = [];
  d.mid.forEach((z, i) => MID[i] && out.push({ name: z[0], d: poly(MID[i]) }));
  d.side.forEach((z, i) => {
    if(!SIDE[i]) return;
    out.push({ name: `${z[0]} ${d.L}`, d: poly(SIDE[i]) });
    out.push({ name: `${z[0]} ${R[d.L]}`, d: polyMirror(SIDE[i]) });
  });
  return out;
}

/* Repères anatomiques (traits fins, non cliquables) */
export const FACE = `
  <g class="bc-face">
    <path d="M83 29 C81 13 91 7.5 100 7.5 C109 7.5 119 13 117 29 C115 22 110 18.5 104 19 C100 17 92 17.5 88 21 C85 23 84 26 83 29 Z" class="bc-hair"/>
    <path d="M91 30.5 q2.6 -2 5.2 0 M103.8 30.5 q2.6 -2 5.2 0"/>
    <path d="M100 33 l-1.6 6.5 q1.6 1 3.2 0"/>
    <path d="M95 44 q5 3 10 0"/>
  </g>
  <path d="M88 76 C94 79 98 79 100 78 C102 79 106 79 112 76"/>
  <path d="M76 110 C84 117 94 117 99 112 M124 110 C116 117 106 117 101 112"/>
  <path d="M100 80 L100 112" class="bc-soft"/>
  <path d="M86 132 C92 134 108 134 114 132" class="bc-soft"/>
  <circle cx="100" cy="164" r="1.6"/>
  <path d="M78 196 C86 206 94 212 100 214 C106 212 114 206 122 196" class="bc-soft"/>
  <ellipse cx="80" cy="301" rx="7" ry="8.5"/><ellipse cx="120" cy="301" rx="7" ry="8.5"/>
  <path d="M44 236 q-5 6 -3 12 M156 236 q5 6 3 12" class="bc-soft"/>
  <path d="M112 405 l0 4 M116 405 l0 4 M120 404 l0 5 M88 405 l0 4 M84 405 l0 4 M80 404 l0 5" class="bc-soft"/>`;

export const BACK = `
  <path d="M83.5 30 C82 8 118 8 116.5 30 C117 40 113 47 108 50 L92 50 C87 47 83 40 83.5 30 Z" class="bc-hair"/>
  <path d="M100 56 L100 186" class="bc-spine"/>
  <path d="M80 84 C88 86 92 96 92 108 C88 120 80 124 76 122 C74 110 75 94 80 84 Z"/>
  <path d="M120 84 C112 86 108 96 108 108 C112 120 120 124 124 122 C126 110 125 94 120 84 Z"/>
  <path d="M84 168 C90 172 96 174 100 174 C104 174 110 172 116 168" class="bc-soft"/>
  <path d="M100 192 L100 214"/>
  <path d="M70 214 C80 222 92 222 99 216 M130 214 C120 222 108 222 101 216"/>
  <path d="M70 303 C76 307 84 307 90 303 M110 303 C116 307 124 307 130 303"/>
  <path d="M72 336 C76 350 80 352 86 348 M128 336 C124 350 120 352 114 348" class="bc-soft"/>
  <path d="M112 396 C114 403 120 405 124 402 M88 396 C86 403 80 405 76 402" class="bc-soft"/>`;

/**
 * Contenu SVG du schéma.
 * opts : { Z, R, view: "face"|"dos", pain: {nom: {eva}}, sel, color: eva => couleur }
 */
export function bodySVG({ Z, R, view, pain = {}, sel = null, color = () => "#e66" }){
  const d = Z[view];
  const shapes = zoneShapes(Z, R, view);
  const zonesHTML = shapes.map(s => {
    const p = pain[s.name];
    return `<path class="bc-zone${sel === s.name ? " sel" : ""}${p ? " pain" : ""}" data-zone="${esc(s.name)}" d="${s.d}" ${p ? `style="fill:${color(p.eva)}"` : ""}><title>${esc(s.name)}${p ? ` : EVA ${p.eva}` : ""}</title></path>`;
  }).join("");
  const selShape = shapes.find(s => s.name === sel);
  const id = `bc-clip-${view}`;
  return `
    <defs><clipPath id="${id}"><path d="${SIL}"/>${HEAD}${EARS}</clipPath></defs>
    <g class="bc-body">
      <path class="bc-sil" d="${SIL}"/>${HEAD.replace("<ellipse", '<ellipse class="bc-sil"')}${EARS.replace(/<ellipse/g, '<ellipse class="bc-sil"')}
    </g>
    <g clip-path="url(#${id})">${zonesHTML}
      <g class="bc-marks">${view === "dos" ? BACK : FACE}</g>
      ${selShape ? `<path class="bc-selfill" d="${selShape.d}"/><path class="bc-selring" d="${selShape.d}"/>` : ""}
    </g>
    ${selShape ? `<defs><clipPath id="${id}-sel"><path d="${selShape.d}"/></clipPath></defs><g clip-path="url(#${id}-sel)" class="bc-selout"><path d="${SIL}"/>${HEAD}${EARS}</g>` : ""}
    <g class="bc-outline"><path d="${SIL}"/>${HEAD}${EARS}</g>
    <text class="bc-side" x="6" y="22">${esc(d.L)}</text><text class="bc-side" x="194" y="22" text-anchor="end">${esc(R[d.L])}</text>
    <text class="bc-view" x="100" y="425" text-anchor="middle">${view === "dos" ? "DOS" : "FACE"}</text>`;
}

/** Feuille de style du schéma (à insérer une fois dans la page). */
export const BODY_CSS = `
  .body-svg .bc-sil{ fill:var(--bc-skin); }
  .body-svg .bc-zone{ fill:transparent; stroke:var(--bc-grid); stroke-width:.8; cursor:pointer; transition:fill .15s; }
  .body-svg .bc-zone:hover{ fill:var(--bc-hover); }
  .body-svg .bc-zone.pain{ fill-opacity:.82; }
  .body-svg .bc-selring{ fill:none; stroke:var(--lagon); stroke-width:2.4; pointer-events:none; }
  .body-svg .bc-selfill{ fill:var(--lagon); fill-opacity:.16; pointer-events:none; }
  .body-svg .bc-selout{ fill:none; stroke:var(--lagon); stroke-width:3; pointer-events:none; }
  .body-svg .bc-marks{ fill:none; stroke:var(--bc-mark); stroke-width:1.1; stroke-linecap:round; pointer-events:none; }
  .body-svg .bc-marks .bc-soft{ stroke-opacity:.6; }
  .body-svg .bc-marks .bc-spine{ stroke-dasharray:2 3.2; stroke-width:1.4; }
  .body-svg .bc-marks .bc-hair{ fill:var(--bc-hair); stroke:none; }
  .body-svg .bc-marks circle,.body-svg .bc-marks ellipse{ fill:none; }
  .body-svg .bc-outline{ fill:none; stroke:var(--bc-line); stroke-width:1.5; stroke-linejoin:round; pointer-events:none; }
  .body-svg .bc-side{ font-family:var(--font); font-size:14px; font-weight:800; fill:var(--ink-3); pointer-events:none; }
  .body-svg .bc-view{ font-family:var(--font); font-size:9px; font-weight:800; letter-spacing:.18em; fill:var(--ink-3); pointer-events:none; }
`;
