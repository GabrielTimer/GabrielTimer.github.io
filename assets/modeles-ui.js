/* =========================================================
   Choisir un modèle depuis l'éditeur de séance
   (panneau « Modèles » à côté de la bibliothèque d'exercices)
   ========================================================= */

import { $, $$, esc, icon, store, openSheet, exoImageHTML, sessionDuration, fmtDuree, plural, debounce } from "./app.js";
import { norm } from "./library.js";
import { categories, BUILTIN, normModele, groupModeles, coverOf, catLabel, niveauLabel, levelButton, isBuiltinHidden } from "./modeles.js";

let cache = null;
/** Tous les modèles visibles : les vôtres + ceux fournis (sauf masqués ou remplacés). */
export function loadModeles({ force = false } = {}){
  if(cache && !force) return cache;
  cache = import("./cloud.js")
    .then(C => C.listModeles())
    .then(list => list.map(r => normModele(r)).filter(m => m.exercices.length))
    .catch(() => [])
    .then(mine => {
      const replaced = new Set(mine.map(m => m.remplace).filter(Boolean));
      return [...mine, ...BUILTIN.filter(b => !replaced.has(b.id) && !isBuiltinHidden(b.id))];
    });
  return cache;
}

const KEY = "gt_cfg_modeles";

/**
 * Monte la liste des modèles dans root.
 * onPick(modele) : le kiné a choisi un modèle (et un niveau).
 */
export async function mountModelPicker(root, { onPick } = {}){
  const F = { q:"", cat:"", ...(store.get(KEY, {}) || {}) };
  const chosen = new Map();
  root.innerHTML = `
    <div class="lib mp">
      <div class="lib-tools">
        <label class="input-icon"><span class="sr-only">Rechercher un modèle</span>${icon("search")}<input class="input" type="search" data-q placeholder="Lombalgie, LCA, épaule…" autocomplete="off" value="${esc(F.q)}"></label>
        <div class="chips scroll" data-cats role="group" aria-label="Catégorie"></div>
      </div>
      <div class="lib-count small muted" data-count></div>
      <div data-results><div class="loading"><div class="spinner"></div><span>Chargement des modèles…</span></div></div>
    </div>`;

  const all = await loadModeles();
  const save = () => store.set(KEY, F);

  const renderCats = () => {
    const counts = {};
    all.forEach(m => { counts[m.categorie] = (counts[m.categorie] || 0) + 1; });
    $("[data-cats]", root).innerHTML = `<button class="chip" type="button" data-c="" aria-pressed="${!F.cat}">Tous</button>` +
      categories().filter(c => counts[c.id]).map(c => `<button class="chip" type="button" data-c="${esc(c.id)}" aria-pressed="${F.cat === c.id}">${esc(c.label)}<span class="count">${counts[c.id]}</span></button>`).join("");
    $$("[data-c]", root).forEach(b => b.onclick = () => { F.cat = b.dataset.c; save(); renderCats(); render(); });
  };

  const matches = m => {
    if(F.cat && m.categorie !== F.cat) return false;
    if(!F.q) return true;
    const hay = norm([m.nom, m.titre, catLabel(m.categorie), m.zoneLabel, ...m.exercices.map(e => e.nom)].join(" "));
    return norm(F.q).split(/\s+/).filter(Boolean).every(w => hay.includes(w));
  };

  const render = () => {
    const groups = groupModeles(all.filter(matches)).sort((a, b) => (b.mine - a.mine) || a.nom.localeCompare(b.nom, "fr", { numeric:true }));
    $("[data-count]", root).textContent = plural(groups.length, "modèle");
    const res = $("[data-results]", root);
    if(!groups.length){
      res.innerHTML = `<div class="empty"><div class="e-ico">${icon("layers")}</div><h3>Aucun modèle</h3><p>Essayez un autre mot, ou créez vos modèles dans la page Modèles.</p></div>`;
      return;
    }
    res.innerHTML = groups.map(g => {
      const cur = g.items.find(x => x.id === chosen.get(g.key)) || g.items[0];
      const levels = g.items.length > 1 || cur.niveau;
      return `
        <div class="mp-row">
          <button class="lib-row-main" type="button" data-see="${esc(g.key)}">
            ${exoImageHTML(coverOf(cur), "", "li-thumb")}
            <span class="li-main"><span class="li-title">${esc(g.nom)}</span>
              <span class="li-sub">${g.mine ? `<strong style="color:var(--soleil-strong)">Mon modèle</strong> · ` : ""}${esc(catLabel(g.categorie))}${g.zoneLabel ? `, ${esc(g.zoneLabel.toLowerCase())}` : ""} · ${plural(cur.exercices.length, "exercice")}, ${esc(fmtDuree(sessionDuration(cur)))}</span></span>
          </button>
          <button class="icon-btn filled" type="button" data-pick="${esc(cur.id)}" aria-label="Utiliser ${esc(cur.titre)}" title="Utiliser ce modèle">${icon("plus")}</button>
          ${levels ? `<div class="mo-levels mp-levels" role="group" aria-label="Niveau">${g.items.map(x => `<button type="button" data-lv="${esc(g.key)}" data-id="${esc(x.id)}" aria-pressed="${x === cur}">${esc(levelButton(x))}</button>`).join("")}</div>` : ""}
        </div>`;
    }).join("");
    const byKey = new Map(groups.map(g => [g.key, g]));
    const find = id => all.find(m => m.id === id);
    $$("[data-lv]", res).forEach(b => b.onclick = () => { chosen.set(b.dataset.lv, b.dataset.id); render(); });
    $$("[data-pick]", res).forEach(b => b.onclick = () => onPick?.(find(b.dataset.pick)));
    $$("[data-see]", res).forEach(b => b.onclick = () => {
      const g = byKey.get(b.dataset.see);
      preview(g.items.find(x => x.id === chosen.get(g.key)) || g.items[0]);
    });
  };

  const preview = m => {
    const s = openSheet({
      title: m.titre,
      body: `<div class="mo-exos">${m.exercices.map((e, i) => `<div class="mo-exo">${exoImageHTML(e.image, "")}<div><strong>${i + 1}. ${esc(e.nom)}</strong><div class="small muted">${e.reps} × ${esc(fmtDuree(e.ex))}, repos ${esc(fmtDuree(e.repos))}</div></div></div>`).join("")}</div>`,
      foot: `<button class="btn" type="button" data-close>Fermer</button><button class="btn primary" type="button" data-use>${icon("plus")}Utiliser ce modèle</button>`
    });
    s.el.querySelector("[data-use]").onclick = () => { s.close(); onPick?.(m); };
  };

  $("[data-q]", root).addEventListener("input", debounce(e => { F.q = e.target.value.trim(); save(); render(); }, 140));
  renderCats();
  render();
}
