/* =========================================================
   Outil « Nerfs » : dermatomes, nerfs périphériques, moteur
   ---------------------------------------------------------
   mountNerfs(el, { state, onChange })
   - state (facultatif) : objet où sont notés les constats
     { "<calque>:<id>:<côté>": { sens:[], mrc:0-5, reflexe } }
     sans state : simple atlas consultable.
   ========================================================= */

import { SIL, HEAD, EARS, mirror, FACE, BACK } from "./bodychart.js";
import { ROOTS, ROOT_ORDER, NERVES, GROUPS, ROOT_TERR, NERVE_TERR, rootColor, nerveColor } from "./nerfs-data.js";

const esc = v => String(v ?? "").replace(/[&<>"']/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c]));
const SIDE_L = { face: "D", dos: "G" };
const OTHER = { D: "G", G: "D" };
export const SENS = ["Hypoesthésie", "Anesthésie", "Paresthésies", "Hyperesthésie / allodynie", "Douleur neuropathique"];
export const REFLEXES = ["Normal", "Vif", "Diminué", "Aboli"];
const MRC = [0, 1, 2, 3, 4, 5];

/* Myotomes testés (ordre ASIA, plus quelques compléments) */
const MOTOR_ROOTS = ["C4", "C5", "C6", "C7", "C8", "T1", "L2", "L3", "L4", "L5", "S1", "S2", "S4-S5"];

const poly = pts => "M" + pts.map(p => p.join(" ")).join(" L") + " Z";
const polyM = pts => poly(pts.map(([x, y]) => [mirror(x), y]));

function centroid(pts){
  let a = 0, cx = 0, cy = 0;
  for(let i = 0; i < pts.length; i++){
    const [x0, y0] = pts[i], [x1, y1] = pts[(i + 1) % pts.length];
    const f = x0 * y1 - x1 * y0;
    a += f; cx += (x0 + x1) * f; cy += (y0 + y1) * f;
  }
  a /= 2;
  if(Math.abs(a) < 1e-6) return { x: pts[0][0], y: pts[0][1], a: 0 };
  return { x: cx / (6 * a), y: cy / (6 * a), a: Math.abs(a) };
}

/* Partie du territoire réellement visible (dans la silhouette) : on évite d'y poser
   l'étiquette au milieu du vide. Point de repère simple : centre clampé dans le corps. */
const BODY_X = y => {
  if(y < 52) return [83, 117];
  if(y < 66) return [88, 112];
  if(y < 86) return [52, 148];
  if(y < 150) return [47, 153];
  if(y < 212) return [38, 162];
  if(y < 256) return [29, 171];
  return [56, 144];
};

function labelPoint(pts){
  const c = centroid(pts);
  const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
  const y = Math.max(Math.min(...ys) + 4, Math.min(Math.max(...ys) - 3, c.y));
  const [bx0] = BODY_X(y);
  let x = Math.max(c.x, bx0 + 4, Math.min(...xs) + 3);
  x = Math.min(x, Math.max(...xs) - 3);
  return { x, y, a: c.a };
}

export const NERFS_CSS = `
  .nf{ display:flex; flex-direction:column; gap:12px; }
  .nf-bar{ display:flex; flex-wrap:wrap; gap:8px; align-items:center; }
  .nf-bar .segmented{ flex:1 1 auto; }
  .nf-map{ position:relative; }
  .nf-svg{ width:100%; max-height:70vh; max-height:70dvh; display:block; margin:0 auto; touch-action:manipulation; }
  .nf-svg .bc-sil{ fill:var(--bc-skin); }
  .nf-svg .nf-t{ fill-opacity:.5; stroke:#fff; stroke-width:.6; cursor:pointer; transition:fill-opacity .15s; }
  .nf-svg .nf-t:hover{ fill-opacity:.75; }
  .nf-svg .nf-t.dim{ fill-opacity:.18; }
  .nf-svg .nf-t.on{ fill-opacity:.92; }
  .nf-svg .nf-hatch{ fill:url(#nf-hatch); pointer-events:none; }
  .nf-svg .nf-lab{ font-family:var(--font); font-size:5.4px; font-weight:800; fill:#10303a; text-anchor:middle; dominant-baseline:central; pointer-events:none; paint-order:stroke; stroke:rgba(255,255,255,.7); stroke-width:1.4px; }
  .nf-svg .nf-lab.small{ font-size:4.4px; }
  .nf-svg .bc-marks{ fill:none; stroke:var(--bc-mark); stroke-width:.9; stroke-linecap:round; pointer-events:none; opacity:.55; }
  .nf-svg .bc-marks .bc-hair{ display:none; }
  .nf-svg .bc-marks .bc-spine{ stroke-dasharray:2 3.2; }
  .nf-svg .bc-outline{ fill:none; stroke:var(--bc-line); stroke-width:1.4; stroke-linejoin:round; pointer-events:none; }
  .nf-svg .bc-side{ font-family:var(--font); font-size:14px; font-weight:800; fill:var(--ink-3); pointer-events:none; }
  .nf-svg .bc-view{ font-family:var(--font); font-size:9px; font-weight:800; letter-spacing:.18em; fill:var(--ink-3); pointer-events:none; }
  .nf-card{ padding:14px; border-radius:var(--r-md); background:var(--surface-2); display:flex; flex-direction:column; gap:8px; }
  .nf-card h3{ display:flex; align-items:center; gap:8px; flex-wrap:wrap; font-size:var(--fs-lg); }
  .nf-card .sw{ width:14px; height:14px; border-radius:4px; flex:none; }
  .nf-card dl{ display:grid; grid-template-columns:auto minmax(0,1fr); gap:4px 12px; margin:0; font-size:var(--fs-sm); }
  .nf-card dt{ color:var(--ink-3); font-weight:700; }
  .nf-card dd{ margin:0; }
  .nf-card ul{ margin:0; padding-left:1.1em; }
  .nf-rec{ display:flex; flex-direction:column; gap:8px; padding-top:8px; border-top:1px solid var(--line); }
  .nf-rec .lbl{ font-size:var(--fs-xs); font-weight:800; color:var(--ink-3); text-transform:uppercase; letter-spacing:.04em; }
  .nf-mrc{ display:flex; gap:4px; flex-wrap:wrap; }
  .nf-mrc button{ min-width:34px; height:34px; border-radius:10px; border:1px solid var(--line-strong); background:var(--surface); font:inherit; font-weight:800; cursor:pointer; }
  .nf-mrc button[aria-pressed="true"]{ background:var(--ink); color:var(--surface); border-color:var(--ink); }
  .nf-legend{ display:flex; flex-wrap:wrap; gap:6px; }
  .nf-legend .chip i{ width:10px; height:10px; border-radius:3px; display:inline-block; }
  .nf-legend .chip.found{ box-shadow:inset 0 0 0 2px var(--danger); }
  .nf-legend h4{ width:100%; font-size:var(--fs-xs); color:var(--ink-3); text-transform:uppercase; letter-spacing:.05em; margin-top:6px; }
  .nf-tbl{ width:100%; border-collapse:collapse; font-size:var(--fs-sm); }
  .nf-tbl th,.nf-tbl td{ padding:8px 6px; border-bottom:1px solid var(--line); text-align:left; vertical-align:top; }
  .nf-tbl th{ font-size:var(--fs-xs); color:var(--ink-3); }
  .nf-tbl td.r{ font-weight:800; white-space:nowrap; }
  .nf-tbl select{ font:inherit; padding:4px 6px; border-radius:8px; border:1px solid var(--line-strong); background:var(--surface); color:var(--ink); max-width:100%; }
  .nf-tbl select.bad{ border-color:var(--danger); color:var(--danger); font-weight:800; }
  .nf-note{ font-size:var(--fs-xs); color:var(--ink-3); }
  .nf-tabs-wrap{ overflow-x:auto; }
`;

const keyOf = (layer, id, side) => `${layer}:${id}:${side}`;

export { neuroSummary } from "./nerfs-data.js";

export function mountNerfs(root, { state = null, onChange = () => {} } = {}){
  const ui = { tab: "racine", view: "face", sel: null };
  const editable = !!state;
  const S = state || {};

  const get = k => S[k] || {};
  const set = (k, patch) => {
    const v = { ...get(k), ...patch };
    const empty = !(v.sens?.length) && (v.mrc === undefined || v.mrc === null || v.mrc === "") && !v.reflexe;
    if(empty) delete S[k]; else S[k] = v;
    onChange(S);
  };
  const hasFinding = (layer, id, side) => {
    const v = S[keyOf(layer, id, side)];
    return !!(v && (v.sens?.length || (v.mrc !== undefined && v.mrc !== null && v.mrc !== "" && v.mrc < 5) || (v.reflexe && v.reflexe !== "Normal")));
  };

  let labelGroups = [];

  /* Point de la partie visible d'un territoire le plus éloigné de ses bords (échantillonnage) */
  function placeLabels(){
    const svgEl = root.querySelector(".nf-svg");
    if(!svgEl) return;
    const shapes = [...svgEl.querySelectorAll(":scope > .bc-sil")];
    const pt = svgEl.createSVGPoint ? svgEl.createSVGPoint() : null;
    const inBody = (x, y) => {
      if(!pt || !shapes[0].isPointInFill) return true;
      pt.x = x; pt.y = y;
      return shapes.some(sh => sh.isPointInFill(pt));
    };
    const inPoly = (x, y, pts) => {
      let c = false;
      for(let i = 0, j = pts.length - 1; i < pts.length; j = i++){
        const [xi, yi] = pts[i], [xj, yj] = pts[j];
        if(((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) c = !c;
      }
      return c;
    };
    labelGroups.forEach((g, i) => {
      const el = svgEl.querySelector(`[data-lab="${i}"]`);
      if(!el) return;
      const xs = g.polys.flat().map(p => p[0]), ys = g.polys.flat().map(p => p[1]);
      const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
      const step = Math.max(1, Math.min(x1 - x0, y1 - y0) / 14);
      const inside = [];
      for(let y = y0 + step / 2; y < y1; y += step) for(let x = x0 + step / 2; x < x1; x += step){
        if(g.polys.some(p => inPoly(x, y, p)) && inBody(x, y)) inside.push([x, y]);
      }
      if(inside.length < 4){ el.remove(); return; }
      const set = new Set(inside.map(([x, y]) => `${Math.round(x / step)},${Math.round(y / step)}`));
      let best = inside[0], bestD = -1;
      inside.forEach(([x, y]) => {
        let d = 0;
        const gx = Math.round(x / step), gy = Math.round(y / step);
        while(d < 30 && [[1, 0], [-1, 0], [0, 1], [0, -1]].every(([dx, dy]) => set.has(`${gx + dx * (d + 1)},${gy + dy * (d + 1)}`))) d++;
        if(d > bestD){ bestD = d; best = [x, y]; }
      });
      const area = inside.length * step * step;
      el.setAttribute("x", best[0].toFixed(1));
      el.setAttribute("y", best[1].toFixed(1));
      if(area < 90 || el.textContent.length > 3) el.classList.add("small");
      if(bestD * step < 1.6 && el.textContent.length > 2) el.remove();
    });
  }

  function territories(){
    const list = ui.tab === "racine" ? ROOT_TERR[ui.view] : NERVE_TERR[ui.view];
    const L = SIDE_L[ui.view], Rr = OTHER[L];
    const out = [];
    list.forEach(t => {
      const color = ui.tab === "racine" ? rootColor(t.id) : nerveColor(t.id);
      t.polys.forEach(p => {
        out.push({ id: t.id, side: L, d: poly(p), pts: p, color, seg: t.seg });
        out.push({ id: t.id, side: Rr, d: polyM(p), pts: p.map(([x, y]) => [mirror(x), y]), color, seg: t.seg });
      });
    });
    return out;
  }

  function svg(){
    const terr = territories();
    const layer = ui.tab;
    const sel = ui.sel;
    const shapes = terr.map(t => {
      const on = sel && sel.id === t.id && sel.side === t.side;
      const dim = sel && !(sel.id === t.id);
      const found = hasFinding(layer, t.id, t.side);
      const title = layer === "racine" ? `${t.id} ${t.side}` : `${NERVES[t.id]?.nom || t.id}${t.seg && /^T/.test(t.seg) ? ` (${t.seg})` : ""} ${t.side}`;
      return `<path class="nf-t${on ? " on" : ""}${dim ? " dim" : ""}" d="${t.d}" style="fill:${t.color}" data-t="${esc(t.id)}" data-side="${t.side}"><title>${esc(title)}</title></path>${found ? `<path class="nf-hatch" d="${t.d}"/>` : ""}`;
    }).join("");
    /* Une étiquette par territoire et par côté, placée ensuite dans la partie visible */
    const groups = new Map();
    terr.forEach(t => {
      const k = `${t.id}|${t.side}|${t.seg || ""}`;
      if(!groups.has(k)) groups.set(k, { t, polys: [] });
      groups.get(k).polys.push(t.pts);
    });
    labelGroups = [...groups.values()];
    const labels = labelGroups.map((g, i) => {
      const t = g.t;
      const txt = layer === "racine" ? t.id : (t.seg && /^T/.test(t.seg) ? t.seg : (NERVES[t.id]?.abbr || t.id));
      return `<text class="nf-lab" data-lab="${i}" x="-50" y="-50">${esc(txt)}</text>`;
    }).join("");
    const L = SIDE_L[ui.view];
    return `<svg class="nf-svg" viewBox="0 0 200 430" role="img" aria-label="Territoires ${layer === "racine" ? "des racines" : "des nerfs"}, vue de ${ui.view === "dos" ? "dos" : "face"}">
      <defs>
        <clipPath id="nf-clip"><path d="${SIL}"/>${HEAD}${EARS}</clipPath>
        <pattern id="nf-hatch" width="4" height="4" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="1.6" height="4" fill="#B3261E" opacity=".75"/></pattern>
      </defs>
      <path class="bc-sil" d="${SIL}"/>${HEAD.replace("<ellipse", '<ellipse class="bc-sil"')}${EARS.replace(/<ellipse/g, '<ellipse class="bc-sil"')}
      <g clip-path="url(#nf-clip)">${shapes}<g class="bc-marks">${ui.view === "dos" ? BACK : FACE}</g>${labels}</g>
      <g class="bc-outline"><path d="${SIL}"/>${HEAD}${EARS}</g>
      <text class="bc-side" x="6" y="22">${L}</text><text class="bc-side" x="194" y="22" text-anchor="end">${OTHER[L]}</text>
      <text class="bc-view" x="100" y="425" text-anchor="middle">${ui.view === "dos" ? "DOS" : "FACE"}</text>
    </svg>`;
  }

  function info(){
    if(!ui.sel) return `<p class="nf-note">${ui.tab === "racine" ? "Touchez une zone pour voir la racine, son point clé sensitif, ses muscles et son réflexe." : "Touchez une zone, ou un nerf dans la liste, pour voir ses racines, son territoire sensitif et ses muscles."}${editable ? " Vous pourrez y noter vos constats." : ""}</p>`;
    const { id, side } = ui.sel;
    const layer = ui.tab;
    let html = "";
    if(layer === "racine"){
      const d = ROOTS[id] || {};
      html = `<h3><span class="sw" style="background:${rootColor(id)}"></span>Racine ${esc(id)}${side ? ` <span class="badge">${side === "D" ? "droite" : "gauche"}</span>` : ""}</h3>
        <dl>
          <dt>Sensitif</dt><dd>${esc(d.sens || "—")}</dd>
          ${d.point ? `<dt>Point clé</dt><dd>${esc(d.point)}</dd>` : ""}
          ${d.mvt ? `<dt>Mouvement</dt><dd>${esc(d.mvt)}</dd>` : ""}
          ${d.muscles ? `<dt>Muscles</dt><dd>${esc(d.muscles)}</dd>` : ""}
          ${d.reflexe ? `<dt>Réflexe</dt><dd>${esc(d.reflexe)}</dd>` : ""}
        </dl>`;
    }else{
      const n = NERVES[id] || {};
      html = `<h3><span class="sw" style="background:${nerveColor(id)}"></span>${esc(n.nom || id)}${side ? ` <span class="badge">${side === "D" ? "droit" : "gauche"}</span>` : ""}</h3>
        <dl>
          <dt>Racines</dt><dd><strong>${esc(n.racines || "—")}</strong></dd>
          <dt>Sensitif</dt><dd>${esc(n.sens || "—")}</dd>
          <dt>Moteur</dt><dd>${n.motor?.length ? `<ul>${n.motor.map(m => `<li>${esc(m)}</li>`).join("")}</ul>` : "Pas de muscle (nerf sensitif)."}</dd>
          ${n.test ? `<dt>Test</dt><dd>${esc(n.test)}</dd>` : ""}
          ${n.reflexe ? `<dt>Réflexe</dt><dd>${esc(n.reflexe)}</dd>` : ""}
          ${n.clinique ? `<dt>Clinique</dt><dd>${esc(n.clinique)}</dd>` : ""}
        </dl>`;
    }
    if(editable && side){
      const k = keyOf(layer, id, side), v = get(k);
      const hasMotor = layer === "racine" ? !!ROOTS[id]?.mvt : !!NERVES[id]?.motor?.length;
      const hasReflex = layer === "racine" ? !!ROOTS[id]?.reflexe : !!NERVES[id]?.reflexe;
      html += `<div class="nf-rec">
        <span class="lbl">Constats ${side === "D" ? "à droite" : "à gauche"}</span>
        <div class="chips">${SENS.map(t => `<button class="chip" type="button" data-sens="${esc(t)}" aria-pressed="${(v.sens || []).includes(t)}">${esc(t)}</button>`).join("")}</div>
        ${hasMotor ? `<span class="lbl">Force (cotation MRC)</span><div class="nf-mrc">${MRC.map(m => `<button type="button" data-mrc="${m}" aria-pressed="${v.mrc === m}">${m}</button>`).join("")}</div>` : ""}
        ${hasReflex ? `<span class="lbl">Réflexe</span><div class="chips">${REFLEXES.map(t => `<button class="chip" type="button" data-refl="${esc(t)}" aria-pressed="${v.reflexe === t}">${esc(t)}</button>`).join("")}</div>` : ""}
        <button class="btn sm" type="button" data-other>Voir le côté ${side === "D" ? "gauche" : "droit"}</button>
      </div>`;
    }else if(side){
      html += `<button class="btn sm" type="button" data-other style="align-self:flex-start">Voir le côté ${side === "D" ? "gauche" : "droit"}</button>`;
    }
    return `<div class="nf-card">${html}</div>`;
  }

  function legend(){
    if(ui.tab === "racine"){
      return `<div class="nf-legend">${ROOT_ORDER.map(id => {
        const f = hasFinding("racine", id, "D") || hasFinding("racine", id, "G");
        return `<button class="chip${f ? " found" : ""}" type="button" data-pick="${esc(id)}" aria-pressed="${ui.sel?.id === id}"><i style="background:${rootColor(id)}"></i>${esc(id)}</button>`;
      }).join("")}</div>`;
    }
    return `<div class="nf-legend">${GROUPS.map(([g, lab]) => `<h4>${esc(lab)}</h4>${Object.entries(NERVES).filter(([, n]) => n.groupe === g).map(([id, n]) => {
      const f = hasFinding("nerf", id, "D") || hasFinding("nerf", id, "G");
      return `<button class="chip${f ? " found" : ""}" type="button" data-pick="${esc(id)}" aria-pressed="${ui.sel?.id === id}" title="${esc(n.racines)}"><i style="background:${n.seulMoteur ? "transparent;border:1.5px solid " + nerveColor(id) : nerveColor(id)}"></i>${esc(n.nom.replace(/^Nerfs? /, ""))} <span class="count">${esc(n.racines.replace(/ \(.*\)$/, ""))}</span></button>`;
    }).join("")}`).join("")}<p class="nf-note" style="width:100%">Les pastilles vides désignent les nerfs purement moteurs (pas de territoire cutané).</p></div>`;
  }

  function motorTab(){
    const sel = (k, opts, val, cls = "") => `<select data-k="${esc(k)}" class="${cls}" aria-label="${esc(k)}"><option value="">–</option>${opts.map(o => `<option ${String(val) === String(o) ? "selected" : ""}>${o}</option>`).join("")}</select>`;
    const row = (layer, id, label, mvt, reflex) => {
      const cells = ["D", "G"].map(sd => {
        const v = get(keyOf(layer, id, sd));
        return `<td>${editable ? sel(`${keyOf(layer, id, sd)}|mrc`, MRC, v.mrc ?? "", v.mrc !== undefined && v.mrc < 5 ? "bad" : "") : ""}${editable && reflex ? `<br>${sel(`${keyOf(layer, id, sd)}|reflexe`, REFLEXES, v.reflexe ?? "", v.reflexe && v.reflexe !== "Normal" ? "bad" : "")}` : ""}</td>`;
      }).join("");
      return `<tr><td class="r"><button class="link-btn" type="button" data-goto="${layer}:${esc(id)}">${esc(label)}</button></td><td>${esc(mvt || "—")}${reflex ? `<br><span class="nf-note">Réflexe : ${esc(reflex)}</span>` : ""}</td>${editable ? cells : ""}</tr>`;
    };
    return `
      <div class="nf-tabs-wrap"><table class="nf-tbl">
        <thead><tr><th>Racine</th><th>Mouvement testé, muscle clé</th>${editable ? `<th>Droite</th><th>Gauche</th>` : ""}</tr></thead>
        <tbody>${MOTOR_ROOTS.map(id => row("racine", id, id, `${ROOTS[id].mvt || ""}${ROOTS[id].muscles ? ` · ${ROOTS[id].muscles}` : ""}`, ROOTS[id].reflexe)).join("")}</tbody>
      </table></div>
      <div class="nf-tabs-wrap"><table class="nf-tbl" style="margin-top:12px">
        <thead><tr><th>Nerf</th><th>Test moteur</th>${editable ? `<th>Droite</th><th>Gauche</th>` : ""}</tr></thead>
        <tbody>${Object.entries(NERVES).filter(([, n]) => n.motor?.length).map(([id, n]) => row("nerf", id, `${n.nom.replace(/^Nerfs? /, "")} (${n.racines.replace(/ \(.*\)$/, "")})`, n.test || n.motor.join(", "), n.reflexe)).join("")}</tbody>
      </table></div>
      <p class="nf-note">Cotation MRC : 0 aucune contraction, 1 contraction sans mouvement, 2 mouvement sans pesanteur, 3 contre la pesanteur, 4 contre une résistance modérée, 5 force normale.</p>`;
  }

  function render(){
    root.innerHTML = `<div class="nf">
      <div class="nf-bar">
        <div class="segmented" role="group" aria-label="Affichage">
          <button type="button" data-tab="racine" aria-pressed="${ui.tab === "racine"}">Racines</button>
          <button type="button" data-tab="nerf" aria-pressed="${ui.tab === "nerf"}">Nerfs</button>
          <button type="button" data-tab="moteur" aria-pressed="${ui.tab === "moteur"}">Moteur</button>
        </div>
        ${ui.tab !== "moteur" ? `<div class="segmented" role="group" aria-label="Vue"><button type="button" data-view="face" aria-pressed="${ui.view === "face"}">Face</button><button type="button" data-view="dos" aria-pressed="${ui.view === "dos"}">Dos</button></div>` : ""}
      </div>
      ${ui.tab === "moteur" ? motorTab() : `<div class="nf-map">${svg()}</div><div data-info>${info()}</div>${legend()}
      <p class="nf-note">Territoires approximatifs : ils varient d'une personne à l'autre et selon les atlas. Points et muscles clés d'après la classification ISNCSCI (ASIA).</p>`}
    </div>`;
    if(ui.tab !== "moteur") placeLabels();
  }

  root.addEventListener("click", e => {
    const t = e.target.closest("[data-t]");
    if(t){ ui.sel = { id: t.dataset.t, side: t.dataset.side }; render(); return; }
    const b = e.target.closest("button");
    if(!b) return;
    const d = b.dataset;
    if(d.tab){ ui.tab = d.tab; ui.sel = null; render(); return; }
    if(d.view){ ui.view = d.view; render(); return; }
    if(d.pick){
      const side = ui.sel?.side || SIDE_L[ui.view];
      ui.sel = { id: d.pick, side };
      /* Le territoire est-il visible sur cette vue ? sinon on bascule */
      const list = ui.tab === "racine" ? ROOT_TERR : NERVE_TERR;
      const here = list[ui.view].some(x => x.id === d.pick), there = list[ui.view === "face" ? "dos" : "face"].some(x => x.id === d.pick);
      if(!here && there) ui.view = ui.view === "face" ? "dos" : "face";
      render(); return;
    }
    if(d.goto){ const [layer, id] = d.goto.split(":"); ui.tab = layer === "nerf" ? "nerf" : "racine"; ui.sel = { id, side: SIDE_L[ui.view] }; render(); return; }
    if(d.other !== undefined && ui.sel){ ui.sel = { ...ui.sel, side: OTHER[ui.sel.side] }; render(); return; }
    if(!ui.sel || !editable) return;
    const k = keyOf(ui.tab, ui.sel.id, ui.sel.side);
    if(d.sens){ const cur = new Set(get(k).sens || []); cur.has(d.sens) ? cur.delete(d.sens) : cur.add(d.sens); set(k, { sens: [...cur] }); render(); return; }
    if(d.mrc !== undefined){ const m = Number(d.mrc); set(k, { mrc: get(k).mrc === m ? null : m }); render(); return; }
    if(d.refl){ set(k, { reflexe: get(k).reflexe === d.refl ? null : d.refl }); render(); return; }
  });
  root.addEventListener("change", e => {
    const s = e.target.closest("select[data-k]");
    if(!s) return;
    const [k, field] = s.dataset.k.split("|");
    const val = s.value === "" ? null : field === "mrc" ? Number(s.value) : s.value;
    set(k, { [field]: val });
    s.classList.toggle("bad", field === "mrc" ? val !== null && val < 5 : !!val && val !== "Normal");
  });

  render();
  return { render, setView: v => { ui.view = v; render(); } };
}
