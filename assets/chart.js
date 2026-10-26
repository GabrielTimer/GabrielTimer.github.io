/* Courbe d'évolution de la douleur (EVA 0–10), en SVG, avec info-bulle au survol. */

import { esc, evaColor } from "./app.js";

/**
 * points : [{ label, v, date }]
 * Dessine dans el (largeur réelle du conteneur), redessine au redimensionnement.
 */
export function renderEvaChart(el, points, { height = 220 } = {}){
  const data = points.filter(p => p.v !== null && p.v !== undefined && !Number.isNaN(Number(p.v)));
  if(!data.length){
    el.innerHTML = `<p class="muted small" style="padding:24px 0;text-align:center">La courbe apparaîtra après vos premières séances.</p>`;
    return;
  }
  const draw = () => {
    const W = Math.max(260, el.clientWidth || 320);
    const H = height;
    const pad = { l:30, r:16, t:16, b:30 };
    const iw = W - pad.l - pad.r, ih = H - pad.t - pad.b;
    const x = i => pad.l + (data.length === 1 ? iw / 2 : (i * iw) / (data.length - 1));
    const y = v => pad.t + ih - (Number(v) / 10) * ih;

    let grid = "";
    for(let v = 0; v <= 10; v += 2){
      grid += `<line x1="${pad.l}" x2="${W - pad.r}" y1="${y(v)}" y2="${y(v)}" stroke="var(--line)" stroke-width="1" ${v ? 'stroke-dasharray="2 4"' : ""}/>`;
      grid += `<text x="${pad.l - 8}" y="${y(v) + 4}" text-anchor="end" font-size="11" fill="var(--ink-3)">${v}</text>`;
    }
    /* Zone « douleur forte » discrète */
    grid = `<rect x="${pad.l}" y="${y(10)}" width="${iw}" height="${y(7) - y(10)}" fill="var(--danger-soft)" opacity=".55"/>` + grid;

    const line = data.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)} ${y(p.v).toFixed(1)}`).join(" ");
    const area = `${line} L${x(data.length - 1).toFixed(1)} ${y(0)} L${x(0).toFixed(1)} ${y(0)} Z`;

    /* Étiquettes : première, dernière, et la plus haute si différente */
    const maxI = data.reduce((m, p, i) => (Number(p.v) > Number(data[m].v) ? i : m), 0);
    const labelled = new Set([0, data.length - 1, maxI]);

    const every = Math.ceil(data.length / Math.max(1, Math.floor(iw / 56)));
    const xl = data.map((p, i) => (i % every === 0 || i === data.length - 1)
      ? `<text x="${x(i)}" y="${H - 8}" text-anchor="middle" font-size="11" fill="var(--ink-3)">${esc(p.label)}</text>` : "").join("");

    el.innerHTML = `
      <div class="chart-wrap" style="position:relative">
        <svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="Évolution de la douleur sur ${data.length} séances, de ${data[0].v} à ${data[data.length - 1].v} sur 10">
          ${grid}
          <path d="${area}" fill="var(--lagon)" opacity=".08"/>
          <path d="${line}" fill="none" stroke="var(--lagon)" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>
          <line class="cross" x1="0" x2="0" y1="${pad.t}" y2="${pad.t + ih}" stroke="var(--ink-3)" stroke-width="1" opacity="0"/>
          ${data.map((p, i) => `<circle cx="${x(i)}" cy="${y(p.v)}" r="${data.length > 30 ? 4 : 6}" fill="${evaColor(p.v)}" stroke="var(--surface)" stroke-width="2"/>`).join("")}
          ${[...labelled].map(i => `<text x="${x(i)}" y="${y(data[i].v) - 12}" text-anchor="middle" font-size="12" font-weight="700" fill="var(--ink)">${esc(data[i].v)}</text>`).join("")}
          ${xl}
          <rect class="hit" x="${pad.l - 10}" y="0" width="${iw + 20}" height="${H}" fill="transparent"/>
        </svg>
        <div class="chart-tip" hidden></div>
      </div>`;

    const svg = el.querySelector("svg"), tip = el.querySelector(".chart-tip"), cross = el.querySelector(".cross");
    const hit = el.querySelector(".hit");
    const show = clientX => {
      const r = svg.getBoundingClientRect();
      const px = (clientX - r.left) * (W / r.width);
      let best = 0, d = Infinity;
      data.forEach((p, i) => { const dd = Math.abs(x(i) - px); if(dd < d){ d = dd; best = i; } });
      const p = data[best];
      cross.setAttribute("x1", x(best)); cross.setAttribute("x2", x(best)); cross.setAttribute("opacity", ".5");
      tip.hidden = false;
      tip.innerHTML = `<strong>${esc(p.label)}</strong>${p.date ? `<span>${esc(p.date)}</span>` : ""}<span>Douleur : <b>${esc(p.v)}/10</b></span>`;
      const left = (x(best) / W) * r.width;
      tip.style.left = Math.min(Math.max(left, 70), r.width - 70) + "px";
      tip.style.top = Math.max(0, (y(p.v) / H) * r.height - 70) + "px";
    };
    const hide = () => { tip.hidden = true; cross.setAttribute("opacity", "0"); };
    hit.addEventListener("pointermove", e => show(e.clientX));
    hit.addEventListener("pointerdown", e => show(e.clientX));
    hit.addEventListener("pointerleave", hide);
  };
  draw();
  if(!el._chartObs){
    let last = el.clientWidth;
    el._chartObs = new ResizeObserver(() => { if(Math.abs(el.clientWidth - last) > 4){ last = el.clientWidth; draw(); } });
    el._chartObs.observe(el);
  }
}
