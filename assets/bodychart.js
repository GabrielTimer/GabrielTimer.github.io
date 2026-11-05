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
  ["M",  107,  44],
  ["C",  107.5,  50,  108,  55,  110,  58],
  ["C",  116,  62,  124,  64,  132,  66],
  ["C",  142,  68,  149,  74,  150,  85],
  ["C",  151.5,  102,  152,  122,  152,  140],
  ["C",  152.5,  148,  153,  152,  154,  158],
  ["C",  156,  176,  159,  192,  161,  206],
  ["C",  165,  212,  169,  222,  169,  234],
  ["C",  169,  244,  165,  253,  159,  253],
  ["C",  154,  253,  152.5,  246,  153,  238],
  ["C",  153.5,  228,  153,  218,  151,  210],
  ["C",  148,  192,  145,  176,  143,  162],
  ["C",  141.5,  156,  140,  151,  139,  146],
  ["C",  137,  130,  135,  114,  132,  102],
  ["C",  131,  118,  129.5,  134,  127.5,  150],
  ["C",  126.5,  160,  126,  168,  127.5,  176],
  ["C",  131,  186,  133.5,  196,  133.5,  210],
  ["C",  133.5,  236,  131,  262,  127.5,  288],
  ["C",  126.5,  298,  126.5,  306,  127.5,  314],
  ["C",  130,  332,  128.5,  352,  122,  376],
  ["C",  120.5,  384,  121,  390,  123.5,  396],
  ["C",  127,  401,  127.5,  408,  123,  410],
  ["L",  108,  410],
  ["C",  106,  404,  106.5,  394,  107,  386],
  ["C",  106,  366,  104.5,  344,  105,  324],
  ["C",  105,  314,  104,  306,  104,  298],
  ["C",  104,  272,  103,  248,  102,  226],
  ["C",  101.5,  222,  101,  220,  100,  220]
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
export const HEAD = `<ellipse cx="100" cy="26" rx="14.5" ry="18.5"/>`;
export const EARS = "";

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
  <path d="M86 69 C92 72 97 72 100 71 C103 72 108 72 114 69" class="bc-soft"/>
  <circle cx="100" cy="166" r="1.4"/>
  <path d="M76 296 q4 -4 8 0 M116 296 q4 -4 8 0" class="bc-soft"/>`;

export const BACK = `
  <path d="M100 60 L100 190" class="bc-spine"/>
  <path d="M82 84 C88 88 90 98 89 108 M118 84 C112 88 110 98 111 108" class="bc-soft"/>
  <path d="M100 196 L100 214" class="bc-soft"/>
  <path d="M72 218 C82 224 92 224 99 220 M128 218 C118 224 108 224 101 220" class="bc-soft"/>
  <path d="M76 304 q4 4 8 0 M116 304 q4 4 8 0" class="bc-soft"/>`;

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
