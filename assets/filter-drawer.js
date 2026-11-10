/* Panneau « Filtres » à tiroirs (cases à cocher), commun à la bibliothèque d'exercices et aux modèles.

   cfg = {
     facets:  [{ k, label, ph, search }]       tiroirs, dans l'ordre ; state[k] est une liste de valeurs
     toggles: [{ k, label }]                   cases simples en bas du panneau ; state[k] vaut true/false
     state,                                    objet des filtres, modifié directement
     options(k) → [{ v, label, n, group }]     choix d'un tiroir, avec le nombre de résultats
     labelOf(k, v) → texte d'une valeur
     onChange()                                appelé après chaque modification
     total() → nombre de résultats             pour le bouton « Voir N … »
     unit: ["exercice", "exercices"]
   }
*/
import { $$, esc, icon, openSheet } from "./app.js";
import { norm } from "./library.js";

const openSecs = new Set();   /* tiroirs ouverts, gardés tant que la page reste ouverte */

export const nbFiltres = cfg => cfg.facets.reduce((t, f) => t + cfg.state[f.k].length, 0) + (cfg.toggles || []).filter(t => cfg.state[t.k]).length;
export const effacerFiltres = cfg => { cfg.facets.forEach(f => cfg.state[f.k] = []); (cfg.toggles || []).forEach(t => cfg.state[t.k] = false); };

/** Pastilles des filtres actifs (un clic les retire) + compteur sur le bouton « Filtres ». */
export function renderActifs(cfg, box, btn){
  const n = nbFiltres(cfg);
  const fn = btn?.querySelector("[data-fn]");
  if(fn){ fn.hidden = !n; fn.textContent = n; }
  btn?.classList.toggle("on", !!n);
  box.hidden = !n;
  if(!n){ box.innerHTML = ""; return; }
  box.innerHTML = cfg.facets.flatMap(f => cfg.state[f.k].map(v =>
      `<button class="chip on lib-active-chip" type="button" data-rm="${esc(f.k)}" data-v="${esc(v)}" aria-label="Retirer le filtre ${esc(cfg.labelOf(f.k, v))}">${esc(cfg.labelOf(f.k, v))}${icon("close")}</button>`)).join("") +
    (cfg.toggles || []).filter(t => cfg.state[t.k]).map(t =>
      `<button class="chip on lib-active-chip" type="button" data-rm="${esc(t.k)}" data-tog aria-label="Retirer le filtre ${esc(t.chip || t.label)}">${esc(t.chip || t.label)}${icon("close")}</button>`).join("") +
    `<button class="link-btn small" type="button" data-clear>Tout effacer</button>`;
  $$("[data-rm]", box).forEach(b => b.onclick = () => {
    const k = b.dataset.rm;
    if("tog" in b.dataset) cfg.state[k] = false; else cfg.state[k] = cfg.state[k].filter(v => v !== b.dataset.v);
    cfg.onChange();
  });
  box.querySelector("[data-clear]").onclick = () => { effacerFiltres(cfg); cfg.onChange(); };
}

/** Ouvre le panneau. Renvoie { refresh(), close() } ; refresh() est à appeler quand les résultats changent. */
export function openFilterDrawer(cfg){
  const fq = {};
  const [un, plusieurs] = cfg.unit || ["résultat", "résultats"];
  const resume = f => {
    const v = cfg.state[f.k];
    if(!v.length) return `<span class="fdr-ph">${esc(f.ph)}</span>`;
    return `<span class="fdr-val">${esc(v.length > 2 ? `${v.length} choisis` : v.map(x => cfg.labelOf(f.k, x)).join(", "))}</span>`;
  };
  const s = openSheet({
    title: "Filtres",
    body: `<p class="small muted fdr-intro">Affinez la liste selon vos besoins. Vous pouvez cocher plusieurs choix dans chaque tiroir.</p>
      <div class="fdr">${cfg.facets.map(f => `
        <details class="fdr-sec" data-sec="${esc(f.k)}" ${openSecs.has(f.k) ? "open" : ""}>
          <summary><span class="fdr-t">${esc(f.label)}</span><span class="fdr-box"><span data-sum></span>${icon("down")}</span></summary>
          <div class="fdr-panel">
            ${f.search ? `<label class="input-icon fdr-search"><span class="sr-only">Rechercher dans ${esc(f.label.toLowerCase())}</span>${icon("search")}<input class="input" type="search" data-fq="${esc(f.k)}" placeholder="Rechercher" autocomplete="off"></label>` : ""}
            <div class="fdr-opts" data-opts role="group" aria-label="${esc(f.label)}"></div>
          </div>
        </details>`).join("")}
        ${(cfg.toggles || []).map(t => `<label class="check fdr-masques"><input type="checkbox" data-tog="${esc(t.k)}">${esc(t.label)}</label>`).join("")}
      </div>`,
    foot: `<button class="btn" type="button" data-reset>${icon("repeat")}Réinitialiser</button><button class="btn primary" type="button" data-done>Terminer</button>`,
    onClose: () => { api.open = false; }
  });
  const el = s.el;
  el.classList.add("drawer");

  const renderOpts = f => {
    const sec = el.querySelector(`[data-sec="${CSS.escape(f.k)}"]`);
    const box = sec.querySelector("[data-opts]");
    const top = box.scrollTop;
    const q = norm(fq[f.k] || "");
    const opts = cfg.options(f.k).filter(o => !q || norm(o.label).includes(q));
    let g = null;
    box.innerHTML = opts.length ? opts.map(o => {
      const head = o.group && o.group !== g ? `<div class="fdr-group">${esc(g = o.group)}</div>` : "";
      return head + `<label class="fdr-opt"><input type="checkbox" value="${esc(o.v)}" ${cfg.state[f.k].includes(o.v) ? "checked" : ""}><span class="fdr-lbl">${esc(o.label)}</span><span class="fdr-c">${o.n}</span></label>`;
    }).join("") : `<p class="small muted fdr-none">${q ? "Aucun résultat pour cette recherche." : "Aucun choix avec les autres filtres."}</p>`;
    box.scrollTop = top;
    sec.querySelector("[data-sum]").innerHTML = resume(f);
    sec.classList.toggle("on", !!cfg.state[f.k].length);
  };
  const refresh = () => {
    if(!api.open) return;
    cfg.facets.forEach(renderOpts);
    $$("[data-tog]", el).forEach(i => i.checked = !!cfg.state[i.dataset.tog]);
    el.querySelector("[data-reset]").disabled = !nbFiltres(cfg);
    const n = cfg.total();
    el.querySelector("[data-done]").textContent = `Voir ${n} ${n > 1 ? plusieurs : un}`;
  };

  $$("details", el).forEach(d => d.addEventListener("toggle", () => { d.open ? openSecs.add(d.dataset.sec) : openSecs.delete(d.dataset.sec); }));
  el.addEventListener("change", ev => {
    const t = ev.target;
    if(t.dataset.tog){ cfg.state[t.dataset.tog] = t.checked; cfg.onChange(); return; }
    const sec = t.closest("[data-sec]");
    if(!sec || t.type !== "checkbox") return;
    const k = sec.dataset.sec;
    cfg.state[k] = t.checked ? [...new Set([...cfg.state[k], t.value])] : cfg.state[k].filter(v => v !== t.value);
    cfg.onChange();
  });
  $$("[data-fq]", el).forEach(i => i.addEventListener("input", () => {
    fq[i.dataset.fq] = i.value;
    renderOpts(cfg.facets.find(x => x.k === i.dataset.fq));
  }));
  el.querySelector("[data-reset]").onclick = () => { effacerFiltres(cfg); cfg.onChange(); };
  el.querySelector("[data-done]").onclick = () => s.close();

  const api = { open: true, refresh, close: s.close };
  refresh();
  return api;
}

/** Bouton « Filtres » à placer dans une barre d'outils. */
export const filterButtonHTML = () => `<button class="btn lib-filter-btn" type="button" data-filters aria-haspopup="dialog">${icon("filter")}<span class="lbl">Filtres</span><span class="lib-filter-n" data-fn hidden></span></button>`;
