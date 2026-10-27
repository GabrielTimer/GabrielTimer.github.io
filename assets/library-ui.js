/* Composant « bibliothèque d'exercices » : recherche, filtres, fiche détaillée */

import { $, $$, esc, icon, openSheet, exoImageHTML, safeRich, debounce, store, fmtDuree, toast } from "./app.js";
import { loadLibrary, searchLibrary, videoEmbed, norm, findInLibrary, exerciseKey } from "./library.js";
import { isHidden, isFavorite, toggleInList } from "./settings.js";

const PAGE = 30;

/**
 * Monte la bibliothèque dans un conteneur.
 * opts : { onAdd(exo), layout:"list"|"grid", addLabel, persistKey }
 */
export async function mountLibrary(root, { onAdd, layout = "list", addLabel = "Ajouter", persistKey = "gt_lib_filters", countIn = null } = {}){
  const saved = store.get(persistKey, {}) || {};
  const state = { q: saved.q || "", cat: saved.cat || "", source: saved.source || "", niveau: saved.niveau || "", limit: PAGE };

  root.innerHTML = `
    <div class="lib">
      <div class="lib-tools">
        <div class="lib-search-row">
          <label class="input-icon"><span class="sr-only">Rechercher un exercice</span>${icon("search")}<input class="input" type="search" data-q placeholder="Nom, zone, pathologie, matériel…" autocomplete="off" value="${esc(state.q)}"></label>
          <button class="btn primary lib-create" type="button" data-create title="Créer un exercice" aria-label="Créer un exercice">${icon("plus")}<span class="lbl">Créer un exercice</span><span class="lbl-short">Créer</span></button>
        </div>
        <div class="row wrap" style="--gap:8px">
          <select class="select sm-select" data-source aria-label="Source"><option value="">Toutes les sources</option><option value="FAV">★ Mes favoris</option><option value="PERSO">Mes exercices</option><option value="CABINET">Cabinet</option><option value="HEP">Base HEP</option><option value="HIDDEN">Exercices masqués</option></select>
          <select class="select sm-select" data-niveau aria-label="Niveau"><option value="">Tous niveaux</option><option value="1">Niveau 1</option><option value="2">Niveau 2</option><option value="3">Niveau 3</option><option value="4">Niveau 4 et +</option></select>
        </div>
        <div class="chips scroll" data-cats role="group" aria-label="Zone du corps"></div>
      </div>
      <div class="lib-count small muted" data-count></div>
      <div class="lib-results ${layout === "grid" ? "grid" : ""}" data-results><div class="loading"><div class="spinner"></div><span>Chargement des exercices…</span></div></div>
      <div class="center" style="padding:12px 0"><button class="btn" type="button" data-more hidden>Afficher plus</button></div>
    </div>`;

  $("[data-source]", root).value = state.source;
  $("[data-niveau]", root).value = state.niveau;

  const all = await loadLibrary();
  let counts = {}, cats = [];
  const countCats = () => {
    counts = {};
    all.forEach(e => { counts[e.categorie] = (counts[e.categorie] || 0) + 1; });
    cats = Object.entries(counts).sort((a, b) => b[1] - a[1]).map(([c]) => c);
  };
  countCats();
  /* Après création, correction ou suppression d'un exercice */
  const changed = (e, info = {}) => {
    countCats(); renderCats(); renderResults();
    if(info.created){
      exerciseSheet(e, { onAdd, addLabel, onEdited: changed });
    }
  };

  const save = () => store.set(persistKey, { q: state.q, cat: state.cat, source: state.source, niveau: state.niveau });

  const renderCats = () => {
    $("[data-cats]", root).innerHTML =
      `<button class="chip" type="button" data-cat="" aria-pressed="${!state.cat}">Toutes</button>` +
      cats.map(c => `<button class="chip" type="button" data-cat="${esc(c)}" aria-pressed="${state.cat === c}">${esc(c)}<span class="count">${counts[c]}</span></button>`).join("");
    $$("[data-cat]", root).forEach(b => b.onclick = () => { state.cat = b.dataset.cat; state.limit = PAGE; save(); renderCats(); renderResults(); });
  };

  const filtered = () => {
    let list = state.source === "HIDDEN" ? all.filter(e => isHidden(exerciseKey(e))) : all.filter(e => !isHidden(exerciseKey(e)));
    if(state.source === "FAV") list = list.filter(e => isFavorite(exerciseKey(e)));
    else if(state.source && state.source !== "HIDDEN") list = list.filter(e => e.source === state.source);
    if(state.cat) list = list.filter(e => e.categorie === state.cat);
    if(state.niveau) list = list.filter(e => state.niveau === "4" ? e.niveau >= 4 : e.niveau === Number(state.niveau));
    list = searchLibrary(list, state.q);
    /* Favoris en tête quand on ne cherche rien de précis */
    if(!state.q) list = [...list.filter(e => isFavorite(exerciseKey(e))), ...list.filter(e => !isFavorite(exerciseKey(e)))];
    return list;
  };

  const inBadge = e => {
    const n = countIn ? countIn(e) : 0;
    return n ? `<span class="in-badge">${icon("check")}Dans la séance${n > 1 ? ` ×${n}` : ""}</span>` : "";
  };
  const card = e => layout === "grid" ? `
      <article class="lib-card">
        <button class="lib-card-img" type="button" data-open="${esc(e.source + ":" + e.id)}" aria-label="Voir ${esc(e.nom)}">${exoImageHTML(e.image, "")}${inBadge(e)}${isFavorite(exerciseKey(e)) ? `<span class="fav-badge" title="Favori">${icon("starFill")}</span>` : ""}</button>
        <div class="lib-card-body">
          <div class="lib-meta">${esc(e.categorie)}${e.mode ? `, ${esc(e.mode.toLowerCase())}` : ""}</div>
          <h3>${esc(e.nom)}</h3>
          <div class="row wrap" style="--gap:6px">${e.materiel.slice(0, 2).map(m => `<span class="badge">${esc(m)}</span>`).join("")}<span class="badge lagon">Niveau ${e.niveau}</span></div>
        </div>
        ${onAdd ? `<button class="btn soft block" type="button" data-add="${esc(e.source + ":" + e.id)}">${icon("plus")}${esc(addLabel)}</button>` : ""}
      </article>`
    : `
      <div class="lib-row">
        <button class="lib-row-main" type="button" data-open="${esc(e.source + ":" + e.id)}">
          ${exoImageHTML(e.image, "", "li-thumb")}
          <span class="li-main"><span class="li-title">${isFavorite(exerciseKey(e)) ? `<span class="fav-inline">${icon("starFill")}</span>` : ""}${esc(e.nom)}</span><span class="li-sub">${countIn && countIn(e) ? `<strong style="color:var(--ok)">Dans la séance</strong>, ` : ""}${esc(e.categorie)}, niveau ${e.niveau}${e.materiel[0] ? `, ${esc(e.materiel[0].toLowerCase())}` : ""}</span></span>
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
    $$("[data-open]", res).forEach(b => b.onclick = () => { const e = find(b.dataset.open); if(e) exerciseSheet(e, { onAdd, addLabel, onEdited: changed, onTagged: renderResults }); });
  };

  $("[data-q]", root).addEventListener("input", debounce(ev => { state.q = ev.target.value; state.limit = PAGE; save(); renderResults(); }, 140));
  $("[data-source]", root).onchange = ev => { state.source = ev.target.value; state.limit = PAGE; save(); renderResults(); };
  $("[data-niveau]", root).onchange = ev => { state.niveau = ev.target.value; state.limit = PAGE; save(); renderResults(); };
  $("[data-more]", root).onclick = () => { state.limit += PAGE; renderResults(); };
  $("[data-create]", root).onclick = async () => {
    const { openExerciseEditor } = await import("./exercise-editor.js");
    openExerciseEditor(null, { onSaved: changed });
  };

  renderCats();
  renderResults();
  return { focus: () => $("[data-q]", root).focus(), refresh: renderResults };
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
  if(hide) hide.onclick = () => saved(toggleInList("masques.exercices", key, !isHidden(key)).then(() => {
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
