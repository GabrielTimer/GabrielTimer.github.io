/* =========================================================
   Récapitulatif du bilan : mise en page soignée + silhouettes
   ---------------------------------------------------------
   - silhouettes face / dos avec les zones douloureuses colorées
     selon l'EVA (SVG autonome : même rendu à l'écran et dans le PDF)
   - en-tête, hypothèse retenue, douleurs, sections en cartes
   Contenu : celui du rapport (bilan-core.report), rien n'est dupliqué.
   ========================================================= */

import { bodySVG } from "./bodychart.js";

const esc = v => String(v ?? "").replace(/[&<>"']/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c]));

/* Couleurs EVA en clair (le SVG autonome ne connaît pas les variables CSS de l'appli) */
export function evaHex(v){
  v = Number(v);
  if(isNaN(v)) return "#8FA6AD";
  return v <= 1 ? "#2E9E5B" : v <= 3 ? "#7CB518" : v <= 5 ? "#E2B100" : v <= 7 ? "#F08A24" : v <= 8 ? "#E4572E" : "#C62828";
}

const SVG_STYLE = `
  .bc-sil{ fill:#DCE6E9; }
  .bc-zone{ fill:transparent; stroke:rgba(60,100,112,.14); stroke-width:.8; }
  .bc-zone.pain{ fill-opacity:.88; stroke:rgba(255,255,255,.7); stroke-width:1; }
  .bc-marks{ fill:none; stroke:#9DB2B8; stroke-width:1.1; stroke-linecap:round; }
  .bc-marks .bc-soft{ stroke-opacity:.6; }
  .bc-marks .bc-spine{ stroke-dasharray:2 3.2; stroke-width:1.4; }
  .bc-marks circle,.bc-marks ellipse{ fill:none; }
  .bc-outline{ fill:none; stroke:#7E98A1; stroke-width:1.5; stroke-linejoin:round; }
  .bc-side{ font-family:Helvetica,Arial,sans-serif; font-size:14px; font-weight:700; fill:#7E98A1; }
  .bc-view{ font-family:Helvetica,Arial,sans-serif; font-size:9px; font-weight:700; letter-spacing:.18em; fill:#7E98A1; }`;

/** SVG autonome d'une vue (face / dos), zones douloureuses colorées. */
export function silhouetteSVG(K, view, pain = {}){
  const inner = bodySVG({ Z:K.Z, R:K.R, view, pain, sel:null, color: evaHex })
    .replace(/id="bc-clip-/g, `id="rc-clip-${view}-`).replace(/url\(#bc-clip-/g, `url(#rc-clip-${view}-`);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 430" width="400" height="860"><style>${SVG_STYLE}</style>${inner}</svg>`;
}
export const svgDataURL = svg => "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);

/** Vues à montrer : celles qui portent une zone douloureuse (face par défaut). */
export function vuesUtiles(K, pain = {}){
  const noms = view => {
    const d = K.Z[view];
    return new Set([...d.mid.map(z => z[0]), ...d.side.flatMap(z => [z[0] + " " + d.L, z[0] + " " + K.R[d.L]])]);
  };
  const zones = Object.keys(pain);
  const v = ["face", "dos"].filter(view => zones.some(z => noms(view).has(z)));
  return v.length ? v : ["face", "dos"];
}

/** PNG (pour le PDF) d'une vue. Résout null si le navigateur refuse. */
export function silhouettePNG(K, view, pain, scale = 2, jpeg = 0){
  return new Promise(resolve => {
    const img = new Image();
    img.onload = () => {
      try{
        const c = document.createElement("canvas");
        c.width = 400 * scale; c.height = 860 * scale;
        const g = c.getContext("2d");
        if(jpeg){ g.fillStyle = "#fff"; g.fillRect(0, 0, c.width, c.height); }
        g.drawImage(img, 0, 0, c.width, c.height);
        resolve(jpeg ? c.toDataURL("image/jpeg", jpeg) : c.toDataURL("image/png"));
      }catch(e){ resolve(null); }
    };
    img.onerror = () => resolve(null);
    img.src = svgDataURL(silhouetteSVG(K, view, pain));
  });
}

/**
 * Récapitulatif HTML.
 * R : rapport (B.report), S : état du bilan, K : contenu clinique.
 */
export function recapHTML(R, S, K){
  const pain = S.pain || {};
  const zones = Object.entries(pain);
  const vues = vuesUtiles(K, pain);
  const hyp = (S.c?.hyp || []);
  const sections = R.sections.filter(s => s.h !== "Douleur et examen" || s.rows.some(r => r[0] !== "Douleur"));
  const rowsHTML = rows => rows.map(([l, v]) => `<div class="rc-row"><span class="rc-l">${esc(l)}</span><span class="rc-v">${esc(v)}</span></div>`).join("");
  return `<div class="rc">
    <header class="rc-head">
      <div>
        <div class="rc-kicker">${esc(R.titre)} · ${esc(R.date)}</div>
        <h2 class="rc-name">${esc((R.patient.find(p => p[0] === "Patient") || [])[1] || "")}</h2>
        <div class="rc-meta">${R.patient.filter(p => p[0] !== "Patient").map(([l, v]) => `<span><b>${esc(l)}</b> ${esc(v)}</span>`).join("")}</div>
      </div>
      ${hyp.length ? `<div class="rc-hyp"><span>Hypothèse retenue</span><strong>${hyp.map(esc).join(" · ")}</strong></div>` : ""}
    </header>

    ${zones.length ? `<section class="rc-body">
      <div class="rc-figs">${vues.map(v => `<figure><img src="${svgDataURL(silhouetteSVG(K, v, pain))}" alt="Schéma ${v === "dos" ? "de dos" : "de face"} avec les zones douloureuses"></figure>`).join("")}</div>
      <div class="rc-pains">
        <div class="rc-h">Douleurs</div>
        ${zones.map(([z, p]) => `<div class="rc-pain"><span class="rc-eva" style="background:${evaHex(p.eva)}">${esc(p.eva)}</span><span><strong>${esc(z)}</strong>${(p.types || []).length ? `<small>${esc(p.types.join(", "))}</small>` : ""}</span></div>`).join("")}
        <div class="rc-scale">${[0, 2, 4, 6, 8, 10].map(v => `<i style="background:${evaHex(v)}"></i>`).join("")}<span>0</span><span>10</span></div>
      </div>
    </section>` : ""}

    <div class="rc-grid">${sections.map(s => `<section class="rc-card ${s.h.startsWith("Plan de traitement") || s.h.startsWith("Conclusion") ? "rc-wide" : ""}">
      <div class="rc-h">${esc(s.h)}</div>
      ${s.alerte ? `<div class="rc-alert">${esc(s.alerte)}</div>` : ""}
      ${rowsHTML(s.rows.filter(r => !(s.h === "Douleur et examen" && r[0] === "Douleur")))}
    </section>`).join("")}</div>
  </div>`;
}

/** Feuille de style du récapitulatif (une fois par page). */
export const RECAP_CSS = `
  .rc{ display:flex; flex-direction:column; gap:16px; }
  .rc-head{ display:flex; flex-wrap:wrap; gap:14px; align-items:flex-end; justify-content:space-between; padding:18px 20px; border-radius:var(--r-lg);
    background:linear-gradient(135deg, var(--lagon-soft), var(--surface)); border:1px solid var(--line); }
  .rc-kicker{ font-size:var(--fs-sm); font-weight:800; letter-spacing:.06em; text-transform:uppercase; color:var(--lagon-strong); }
  .rc-name{ font-size:1.7rem; margin:4px 0 6px; }
  .rc-meta{ display:flex; flex-wrap:wrap; gap:4px 16px; font-size:var(--fs-sm); color:var(--ink-2); }
  .rc-meta b{ font-weight:700; color:var(--ink-3); margin-right:4px; }
  .rc-hyp{ display:flex; flex-direction:column; gap:2px; padding:10px 14px; border-radius:var(--r-md); background:var(--lagon); color:var(--on-lagon); max-width:100%; }
  .rc-hyp span{ font-size:var(--fs-xs); font-weight:700; opacity:.85; text-transform:uppercase; letter-spacing:.06em; }
  .rc-hyp strong{ font-size:1.05rem; }
  .rc-body{ display:grid; gap:16px; align-items:center; padding:16px; border-radius:var(--r-lg); background:var(--surface); border:1px solid var(--line); }
  @media (min-width:640px){ .rc-body{ grid-template-columns:auto minmax(0,1fr); } }
  .rc-figs{ display:flex; gap:10px; justify-content:center; }
  .rc-figs figure{ margin:0; width:150px; }
  .rc-figs img{ width:100%; height:auto; display:block; }
  .rc-pains{ display:flex; flex-direction:column; gap:10px; }
  .rc-pain{ display:flex; align-items:center; gap:12px; }
  .rc-pain strong{ display:block; }
  .rc-pain small{ color:var(--ink-2); }
  .rc-eva{ flex:none; width:42px; height:42px; border-radius:12px; display:grid; place-items:center; color:#fff; font-weight:800; font-family:var(--mono); font-size:1.1rem; }
  .rc-scale{ display:grid; grid-template-columns:repeat(6,1fr); gap:3px; max-width:220px; margin-top:6px; font-size:var(--fs-xs); color:var(--ink-3); }
  .rc-scale i{ height:6px; border-radius:3px; }
  .rc-scale span:first-of-type{ grid-column:1; } .rc-scale span:last-of-type{ grid-column:6; text-align:right; }
  .rc-grid{ display:grid; gap:12px; }
  @media (min-width:760px){ .rc-grid{ grid-template-columns:repeat(2,minmax(0,1fr)); } .rc-wide{ grid-column:1 / -1; } }
  .rc-card{ padding:14px 16px; border-radius:var(--r-lg); background:var(--surface); border:1px solid var(--line); }
  .rc-h{ font-weight:800; font-size:var(--fs-sm); text-transform:uppercase; letter-spacing:.06em; color:var(--lagon-strong); margin-bottom:8px; }
  .rc-row{ display:grid; grid-template-columns:minmax(110px,38%) minmax(0,1fr); gap:10px; padding:6px 0; border-top:1px solid var(--line); font-size:var(--fs-sm); }
  .rc-h + .rc-row, .rc-alert + .rc-row{ border-top:0; }
  .rc-l{ color:var(--ink-3); font-weight:700; }
  .rc-v{ color:var(--ink); }
  .rc-alert{ margin:0 0 8px; padding:8px 10px; border-radius:var(--r-md); background:color-mix(in srgb, var(--danger) 12%, var(--surface)); color:var(--danger); font-weight:700; font-size:var(--fs-sm); }
`;
