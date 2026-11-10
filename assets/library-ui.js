/* Composant « bibliothèque d'exercices » : recherche, filtres, fiche détaillée */

import { $, $$, esc, icon, openSheet, exoImageHTML, safeRich, debounce, store, fmtDuree, toast } from "./app.js";
import { loadLibrary, searchLibrary, videoEmbed, norm, findInLibrary, exerciseKey } from "./library.js";
import { isHidden, isFavorite, toggleInList, setHidden } from "./settings.js";
import { ZONES, TYPES, PATHOLOGIES, SPECIALITES, specialitesDe, classer } from "./classement.js";
import { openFilterDrawer, renderActifs, effacerFiltres, filterButtonHTML } from "./filter-drawer.js";

const PAGE = 30;

/* Filtres de la bibliothèque : chacun est un tiroir à cases à cocher dans le panneau « Filtres » */
const FACETS = [
  { k:"source", label:"Source", ph:"Toutes les sources" },
  { k:"spec",   label:"Spécialité", ph:"Toutes les spécialités" },
  { k:"cat",    label:"Zone du corps", ph:"Toutes les zones" },
  { k:"patho",  label:"Pathologie", ph:"Toutes les pathologies", search:true },
  { k:"type",   label:"Type d'exercice", ph:"Tous les types" },
  { k:"niveau", label:"Niveau", ph:"Tous les niveaux" }
];
const SOURCES = [["FAV", "★ Mes favoris"], ["PERSO", "Mes exercices"], ["CABINET", "Cabinet"], ["HEP", "Base HEP"]];
const NIVEAUX = [["1", "Niveau 1"], ["2", "Niveau 2"], ["3", "Niveau 3"], ["4", "Niveau 4 et +"]];
const asList = v => Array.isArray(v) ? v.filter(Boolean).map(String) : (v ? [String(v)] : []);

/**
 * Monte la bibliothèque dans un conteneur.
 * opts : { onAdd(exo), layout:"list"|"grid", addLabel, persistKey }
 */
export async function mountLibrary(root, { onAdd, layout = "list", addLabel = "Ajouter", persistKey = "gt_lib_filters", countIn = null, lieu = null } = {}){
  /* lieu() → "HEP" ou "CABINET" : seuls les exercices de cette source (et ceux créés par le kiné) sont proposés */
  const okLieu = e => { const l = lieu?.(); return !l || e.source === l || e.source === "PERSO"; };
  const saved = store.get(persistKey, {}) || {};
  /* Anciennes préférences (un seul choix par filtre) reprises en listes */
  const src0 = asList(saved.source);
  const state = {
    q: saved.q || "", limit: PAGE,
    masques: !!saved.masques || src0.includes("HIDDEN"),
    source: src0.filter(v => v !== "HIDDEN"),
    spec: asList(saved.spec).filter(x => SPECIALITES.includes(x)),
    cat: asList(saved.cat).filter(x => ZONES.includes(x)),
    patho: asList(saved.patho), type: asList(saved.type), niveau: asList(saved.niveau)
  };

  root.innerHTML = `
    <div class="lib">
      <div class="lib-tools">
        <div class="lib-search-row">
          <label class="input-icon"><span class="sr-only">Rechercher un exercice</span>${icon("search")}<input class="input" type="search" data-q placeholder="Nom, zone, pathologie, matériel…" autocomplete="off" value="${esc(state.q)}"></label>
          ${filterButtonHTML()}
          <button class="btn primary lib-create" type="button" data-create title="Créer un exercice" aria-label="Créer un exercice">${icon("plus")}<span class="lbl">Créer un exercice</span><span class="lbl-short">Créer</span></button>
        </div>
        <div class="lib-active" data-active hidden></div>
      </div>
      <div class="lib-count small muted" data-count></div>
      <div class="lib-results ${layout === "grid" ? "grid" : ""}" data-results><div class="loading"><div class="spinner"></div><span>Chargement des exercices…</span></div></div>
      <div class="center" style="padding:12px 0"><button class="btn" type="button" data-more hidden>Afficher plus</button></div>
    </div>`;

  const all = await loadLibrary();
  all.forEach(e => classer(e));

  const save = () => store.set(persistKey, { q: state.q, masques: state.masques, source: state.source, spec: state.spec, cat: state.cat, patho: state.patho, type: state.type, niveau: state.niveau });

  const match = (e, k, vals) => {
    if(!vals.length) return true;
    switch(k){
      case "source": return vals.some(v => v === "FAV" ? isFavorite(exerciseKey(e)) : e.source === v);
      case "spec":   return vals.some(v => e.specs.includes(v));
      case "cat":    return vals.includes(e.zone);
      case "patho":  return vals.some(v => e.pathos.includes(v));
      case "type":   return vals.some(v => e.types.includes(v));
      case "niveau": return vals.some(v => v === "4" ? e.niveau >= 4 : e.niveau === Number(v));
    }
    return true;
  };
  const base = () => all.filter(e => (state.masques ? isHidden(exerciseKey(e)) : !isHidden(exerciseKey(e))) && okLieu(e));
  /* Exercices qui passent tous les filtres sauf « skip » (sert à compter les choix d'un tiroir) */
  const passe = (e, skip) => FACETS.every(f => f.k === skip || match(e, f.k, state[f.k]));

  const filtered = () => {
    let list = base().filter(e => passe(e));
    list = searchLibrary(list, state.q);
    /* Favoris en tête quand on ne cherche rien de précis */
    if(!state.q) list = [...list.filter(e => isFavorite(exerciseKey(e))), ...list.filter(e => !isFavorite(exerciseKey(e)))];
    return list;
  };

  /* Choix proposés dans un tiroir, avec le nombre d'exercices qu'ils donneraient */
  const options = (k, pool) => {
    const list = pool.filter(e => passe(e, k));
    const n = {};
    const add = v => n[v] = (n[v] || 0) + 1;
    let opts;
    if(k === "source"){
      const l = lieu?.();
      list.forEach(e => { add(e.source); if(isFavorite(exerciseKey(e))) add("FAV"); });
      opts = SOURCES.filter(([v]) => !l || !(v === "HEP" || v === "CABINET") || v === l).map(([v, label]) => ({ v, label }));
    }else if(k === "spec"){
      list.forEach(e => e.specs.forEach(add));
      opts = SPECIALITES.map(v => ({ v, label:v }));
    }else if(k === "cat"){
      list.forEach(e => e.zone && add(e.zone));
      opts = ZONES.map(v => ({ v, label:v }));
    }else if(k === "type"){
      list.forEach(e => e.types.forEach(add));
      opts = TYPES.map(v => ({ v, label:v }));
    }else if(k === "niveau"){
      list.forEach(e => add(e.niveau >= 4 ? "4" : String(e.niveau)));
      opts = NIVEAUX.map(([v, label]) => ({ v, label }));
    }else{
      list.forEach(e => e.pathos.forEach(add));
      /* Zones choisies : seulement leurs pathologies (et les pathologies générales qui les concernent vraiment) */
      const propre = p => (!state.spec.length || specialitesDe(p.nom).some(x => state.spec.includes(x))) && (!state.cat.length || state.cat.includes(p.zone) || (!p.zone && n[p.nom] >= 3));
      const order = [...ZONES, "Général"];
      opts = PATHOLOGIES.filter(p => state.patho.includes(p.nom) || (n[p.nom] && propre(p)))
        .map(p => ({ v:p.nom, label:p.nom, group: state.cat.length === 1 ? "" : (p.zone || "Général") }))
        .sort((a, b) => (order.indexOf(a.group) - order.indexOf(b.group)) || ((n[b.v] || 0) - (n[a.v] || 0)));
    }
    return opts.map(o => ({ ...o, n: n[o.v] || 0 })).filter(o => o.n || state[k].includes(o.v));
  };
  const labelOf = (k, v) => k === "source" ? (SOURCES.find(s => s[0] === v)?.[1] || v) : k === "niveau" ? (NIVEAUX.find(s => s[0] === v)?.[1] || v) : v;

  /* ---------- Panneau « Filtres » ---------- */
  let pool = null;   /* exercices visibles qui correspondent à la recherche (pour compter les choix) */
  const cfg = {
    facets: FACETS, state, labelOf,
    toggles: [{ k:"masques", label:"Afficher seulement les exercices masqués", chip:"Exercices masqués" }],
    options: k => options(k, pool || (pool = (() => { const qs = new Set(searchLibrary(base(), state.q)); return base().filter(e => qs.has(e)); })())),
    total: () => filtered().length,
    unit: ["exercice", "exercices"],
    onChange: () => update()
  };
  let drawer = null;
  const renderActive = () => renderActifs(cfg, $("[data-active]", root), $("[data-filters]", root));
  const renderDrawer = () => { pool = null; drawer?.refresh(); };
  const openDrawer = () => { pool = null; drawer = openFilterDrawer(cfg); };
  const clearAll = () => effacerFiltres(cfg);

  const update = () => { state.limit = PAGE; save(); renderActive(); renderResults(); renderDrawer(); };

  /* Après création, correction ou suppression d'un exercice */
  const changed = (e, info = {}) => {
    all.forEach(x => classer(x));
    renderActive(); renderResults(); renderDrawer();
    if(info.created){
      exerciseSheet(e, { onAdd, addLabel, onEdited: changed });
    }
  };

  const inBadge = e => {
    const n = countIn ? countIn(e) : 0;
    return n ? `<span class="in-badge">${icon("check")}Dans la séance${n > 1 ? ` ×${n}` : ""}</span>` : "";
  };
  const card = e => layout === "grid" ? `
      <article class="lib-card">
        <button class="lib-card-img" type="button" data-open="${esc(e.source + ":" + e.id)}" aria-label="Voir ${esc(e.nom)}">${exoImageHTML(e.image, "")}${inBadge(e)}${isFavorite(exerciseKey(e)) ? `<span class="fav-badge" title="Favori">${icon("starFill")}</span>` : ""}</button>
        <div class="lib-card-body">
          <div class="lib-meta">${esc(e.zone || e.categorie)}${e.mode ? `, ${esc(e.mode.toLowerCase())}` : ""}</div>
          <h3>${esc(e.nom)}</h3>
          <div class="row wrap" style="--gap:6px">${e.materiel.slice(0, 2).map(m => `<span class="badge">${esc(m)}</span>`).join("")}<span class="badge lagon">Niveau ${e.niveau}</span></div>
        </div>
        ${onAdd ? `<button class="btn soft block" type="button" data-add="${esc(e.source + ":" + e.id)}">${icon("plus")}${esc(addLabel)}</button>` : ""}
      </article>`
    : `
      <div class="lib-row">
        <button class="lib-row-main" type="button" data-open="${esc(e.source + ":" + e.id)}">
          ${exoImageHTML(e.image, "", "li-thumb")}
          <span class="li-main"><span class="li-title">${isFavorite(exerciseKey(e)) ? `<span class="fav-inline">${icon("starFill")}</span>` : ""}${esc(e.nom)}</span><span class="li-sub">${countIn && countIn(e) ? `<strong style="color:var(--ok)">Dans la séance</strong>, ` : ""}${esc(e.zone || e.categorie)}, niveau ${e.niveau}${e.materiel[0] ? `, ${esc(e.materiel[0].toLowerCase())}` : ""}</span></span>
        </button>
        ${onAdd ? `<button class="icon-btn filled" type="button" data-add="${esc(e.source + ":" + e.id)}" aria-label="${esc(addLabel)} ${esc(e.nom)}">${icon("plus")}</button>` : ""}
      </div>`;

  const find = key => { const i = key.indexOf(":"); const src = key.slice(0, i), id = key.slice(i + 1); return all.find(e => e.source === src && String(e.id) === id); };

  const renderResults = () => {
    const list = filtered();
    $("[data-count]", root).textContent = `${list.length} exercice${list.length > 1 ? "s" : ""}`;
    const res = $("[data-results]", root);
    res.innerHTML = list.length ? list.slice(0, state.limit).map(card).join("")
      : `<div class="empty"><div class="e-ico">${icon("search")}</div><h3>Aucun exercice</h3><p>Essayez un autre mot ou retirez un filtre.</p></div>`;
    $("[data-more]", root).hidden = list.length <= state.limit;
    $$("[data-add]", res).forEach(b => b.onclick = () => {
      const e = find(b.dataset.add);
      if(e && onAdd){
        onAdd(e);
        b.classList.add("added"); setTimeout(() => b.classList.remove("added"), 900);
        const holder = b.closest(".lib-card");
        const img = holder?.querySelector(".lib-card-img");
        if(img){ img.querySelector(".in-badge")?.remove(); img.insertAdjacentHTML("beforeend", inBadge(e)); }
      }
    });
    $$("[data-open]", res).forEach(b => b.onclick = () => { const e = find(b.dataset.open); if(e) exerciseSheet(e, { onAdd, addLabel, onEdited: changed, onTagged: () => { renderResults(); renderDrawer(); } }); });
  };

  $("[data-q]", root).addEventListener("input", debounce(ev => { state.q = ev.target.value; state.limit = PAGE; save(); renderResults(); renderDrawer(); }, 140));
  $("[data-filters]", root).onclick = openDrawer;
  $("[data-more]", root).onclick = () => { state.limit += PAGE; renderResults(); };
  $("[data-create]", root).onclick = async () => {
    const { openExerciseEditor } = await import("./exercise-editor.js");
    openExerciseEditor(null, { onSaved: changed });
  };

  /* Sources proposées selon le lieu du programme */
  const relieu = () => {
    const l = lieu?.();
    if(l) state.source = state.source.filter(v => !(v === "HEP" || v === "CABINET") || v === l);
    state.limit = PAGE; renderActive(); renderResults(); renderDrawer();
  };
  renderActive();
  renderResults();
  if(lieu) relieu();
  return { focus: () => $("[data-q]", root).focus(), refresh: renderResults, relieu };
}

/** Fiche détaillée d'un exercice de la bibliothèque. */
export function exerciseSheet(e, opts = {}){
  const { onAdd = null, addLabel = "Ajouter", onEdited = null } = opts;
  const vid = videoEmbed(e);
  const li = (title, ico, items) => items && items.length ? `<h3>${icon(ico)}${esc(title)}</h3><ul>${items.map(t => `<li>${esc(t)}</li>`).join("")}</ul>` : "";
  const s = openSheet({
    title: e.nom,
    wide: true,
    tall: true,
    body: `
      <div class="exo-detail">
        <div>${exoImageHTML(e.image, e.nom, "sheet-img")}
          <div class="row wrap" style="--gap:6px;margin-top:10px">
            <span class="badge lagon">${esc(e.categorie)}</span><span class="badge">Niveau ${e.niveau}</span>
            ${e.mode ? `<span class="badge">${esc(e.mode)}</span>` : ""}
            ${e.materiel.map(m => `<span class="badge">${esc(m)}</span>`).join("")}
            <span class="badge">${e.source === "HEP" ? "Base HEP" : e.source === "PERSO" ? "Mes exercices" : "Cabinet"}</span>
            ${e.modifie ? `<span class="badge sun">${icon("edit")}Corrigé</span>` : ""}
            ${e.tags?.length && e.source === "PERSO" ? e.tags.map(t => `<span class="badge">#${esc(t)}</span>`).join("") : ""}
          </div>
          ${vid ? (vid.src ? `<div style="margin-top:12px"><button class="btn soft block" type="button" data-vid>${icon("play")}Voir la vidéo</button><div data-vslot></div></div>` : `<a class="btn soft block" style="margin-top:12px" href="${esc(vid.url)}" target="_blank" rel="noopener">${icon("video")}${esc(vid.title || "Voir la vidéo")}</a>`) : ""}
        </div>
        <div class="tips">
          ${e.description ? `<p>${esc(e.description)}</p>` : ""}
          ${e.descriptionHtml && !e.consignes.length ? `<div class="rich">${safeRich(e.descriptionHtml)}</div>` : ""}
          ${e.position ? `<h3>${icon("body")}Position de départ</h3><p>${esc(e.position)}</p>` : ""}
          ${e.consignes.length ? `<h3>${icon("list")}Consignes</h3><ol class="steps">${e.consignes.map(t => `<li><span>${esc(t)}</span></li>`).join("")}</ol>` : ""}
          ${li("Bonne posture", "checkCircle", e.conseil_posture)}
          ${li("À éviter", "alert", e.erreurs_frequentes)}
          ${li("Précautions", "info", e.precautions)}
          ${li("Contre-indications", "alert", e.contreIndications)}
          ${li("Plus facile", "down", e.version_facile)}
          ${li("Plus difficile", "up", e.version_avancee)}
          ${e.pathologies.length ? `<h3>${icon("stethoscope")}Indications</h3><p class="small muted">${esc(e.pathologies.slice(0, 12).join(", "))}</p>` : ""}
          ${e.muscles.length ? `<h3>${icon("body")}Muscles</h3><p class="small muted">${esc(e.muscles.join(", "))}</p>` : ""}
          <p class="small faint" style="margin-top:14px">Réglage proposé : ${e.reps} × ${esc(fmtDuree(e.ex))}, repos ${esc(fmtDuree(e.repos))}</p>
          ${e.search !== undefined ? `<p class="small faint" style="margin-top:6px"><button class="ee-link" type="button" data-hide>${isHidden(exerciseKey(e)) ? "Réafficher cet exercice dans la bibliothèque" : "Masquer cet exercice de la bibliothèque"}</button></p>` : ""}
        </div>
      </div>`,
    foot: onAdd ? `<button class="btn" type="button" data-close>Fermer</button><button class="btn primary" type="button" data-addone>${icon("plus")}${esc(addLabel)}</button>` : `<button class="btn primary" type="button" data-close>Fermer</button>`
  });
  const v = s.el.querySelector("[data-vid]");
  if(v) v.onclick = () => { s.el.querySelector("[data-vslot]").innerHTML = `<iframe class="video-frame" style="margin-top:10px" src="${esc(vid.src)}" allow="autoplay; fullscreen" allowfullscreen title="Vidéo"></iframe>`; v.remove(); };
  const a = s.el.querySelector("[data-addone]");
  if(a) a.onclick = () => { onAdd(e); s.close(); };
  addEditButton(s, e, opts);
  return s;
}

/* Petit crayon dans l'en-tête de la fiche : corriger l'exercice de la bibliothèque. */
async function addEditButton(s, e, opts){
  const lib = e.search !== undefined ? e : await findInLibrary(e).catch(() => null);
  if(!lib || !s.el.isConnected) return;
  const b = document.createElement("button");
  b.type = "button";
  b.className = "icon-btn sm ee-open";
  b.title = "Modifier l'exercice";
  b.setAttribute("aria-label", "Modifier l'exercice");
  b.innerHTML = icon("edit");
  s.el.querySelector(".sheet-head [data-close]").before(b);

  /* Étoile : exercice favori */
  const key = exerciseKey(lib);
  const star = document.createElement("button");
  star.type = "button";
  star.className = "icon-btn sm ee-open ee-star";
  const paintStar = () => {
    const on = isFavorite(key);
    star.innerHTML = icon(on ? "starFill" : "star");
    star.classList.toggle("on", on);
    star.title = on ? "Retirer des favoris" : "Ajouter aux favoris";
    star.setAttribute("aria-label", star.title);
    star.setAttribute("aria-pressed", String(on));
  };
  paintStar();
  b.before(star);
  const saved = fn => fn.catch(err => { console.error(err); toast("Enregistrement impossible. Vérifiez la règle « reglages » dans Firebase (voir Aide).", { type:"err", duration:7000 }); });
  star.onclick = () => saved(toggleInList("favoris.exercices", key, !isFavorite(key)).then(() => { paintStar(); opts.onTagged?.(); }));

  /* Lien « Masquer de la bibliothèque » */
  const hide = s.el.querySelector("[data-hide]");
  if(hide) hide.onclick = () => saved(setHidden(key, !isHidden(key)).then(() => {
    const now = isHidden(key);
    toast(now ? `« ${lib.nom} » est masqué. Filtre « Exercices masqués » pour le retrouver.` : `« ${lib.nom} » est de nouveau visible.`, { type:"ok", duration:5000 });
    s.close(); opts.onTagged?.();
  }));

  b.onclick = async () => {
    const { openExerciseEditor } = await import("./exercise-editor.js");
    s.close();
    openExerciseEditor(lib, {
      onSaved: (x, info) => {
        opts.onEdited?.(x, info);
        if(lib === e && !info?.deleted) exerciseSheet(x, opts);
      }
    });
  };
}
