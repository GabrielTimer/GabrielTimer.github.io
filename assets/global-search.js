/* Recherche globale de l'espace kiné : patients, exercices, modèles, fiches conseils et pages de l'appli.
   Ouverte par le champ « Rechercher » du menu, la loupe du haut sur téléphone, ou Ctrl+K (ou « / »). */

import { $$, esc, icon, store, openSheet, debounce } from "./app.js";
import { norm } from "./library.js";

/* Pages et outils de l'appli, avec des mots-clés pour les retrouver */
const PAGES = [
  ["/index.html", "home", "Accueil", "Tableau de bord"],
  ["/patients.html", "users", "Patients", "Liste des patients, ajouter un patient"],
  ["/config.html?nouveau=1", "plus", "Créer un programme", "Nouvelle séance, envoyer des exercices"],
  ["/programmes_admin.html", "layers", "Modèles", "Programmes prêts à l'emploi, pathologies, post-opératoire, prévention"],
  ["/exercises/glossary.html", "book", "Bibliothèque d'exercices", "Tous les exercices, créer un exercice"],
  ["/exercises/historique.html", "history", "Historique des programmes", "Programmes envoyés aux patients"],
  ["/messages.html", "inbox", "Messages des patients", "Questions, bilans, commentaires de séance"],
  ["/questionnaires.html", "list", "Questionnaires", "Oswestry, QuickDASH, KOOS, score"],
  ["/tests.html", "stethoscope", "Tests cliniques et fonctionnels", "Technique, valeurs diagnostiques, vidéo, bilan"],
  ["/nerfs.html", "body", "Territoires nerveux", "Dermatomes, nerfs périphériques, racines, réflexes"],
  ["/conseils.html", "book", "Fiches conseils", "Info kiné du mois, affiches, prévention"],
  ["/salle-attente.html", "maximize", "Mode salle d'attente", "Affiches en plein écran, tablette"],
  ["/ordonnance.html", "file", "Ordonnance", "Ordonnance pré-remplie, Word, PDF"],
  ["/programmescourse.html", "run", "Reprise de course", "Programme progressif course et marche"],
  ["/respir/index.html", "wind", "Respiration guidée", "RespiR, cohérence cardiaque"],
  ["/mes_programmes.html", "star", "Séances favorites", "Enregistrées sur cet appareil"],
  ["/stats.html", "chart", "Statistiques du cabinet", "Assiduité, programmes prescrits, douleur"],
  ["/reglages_cabinet.html", "settings", "Réglages du cabinet", "Nom, logo, textes, annonce, alertes, listes, sauvegarde, remplaçants"],
  ["/corbeille.html", "trash", "Corbeille", "Programmes supprimés, restaurer"],
  ["/reglages.html", "textSize", "Affichage de cet appareil", "Thème, sons, taille du texte"],
  ["/admin_tools.html", "wrench", "Outils", "Tous les outils du cabinet"],
  ["/aide.html", "info", "Aide", "Comment faire, mode d'emploi, Firebase"]
].map(([href, ico, titre, sub]) => ({ href, ico, titre, sub, hay: norm(`${titre} ${sub}`) }));

const PAR_GROUPE = 5;
let sources = null;   /* chargées une fois par page, à la première ouverture */

function charger(){
  if(sources) return sources;
  const patients = import("./cloud.js").then(C => C.listPatients()).catch(() => []);
  const exercices = import("./library.js").then(L => L.loadLibrary()).catch(() => []);
  const modeles = import("./modeles.js").then(async M => {
    const mine = await import("./cloud.js").then(C => C.listModeles()).then(r => r.map(x => M.normModele(x))).catch(() => []);
    const replaced = new Set(mine.map(m => m.remplace).filter(Boolean));
    const all = [...mine, ...M.BUILTIN.filter(b => !replaced.has(b.id) && !M.isBuiltinHidden(b.id))].filter(m => m.exercices?.length);
    /* Un résultat par modèle (ses niveaux regroupés) */
    return M.groupModeles(all).map(g => ({ g, M, hay: norm([g.nom, M.catLabel(g.categorie), g.zoneLabel, ...g.items[0].exercices.map(e => e.nom)].join(" ")) }));
  }).catch(() => []);
  const conseils = Promise.all([import("./conseils-data.js"), import("./cloud.js").then(C => C.listConseils()).catch(() => [])])
    .then(([D, perso]) => D.mergeConseils(perso)).catch(() => []);
  sources = { patients, exercices, modeles, conseils };
  return sources;
}

const mots = q => norm(q).split(/\s+/).filter(Boolean);
const tous = (hay, ws) => ws.every(w => hay.includes(w));
/* Les résultats dont le titre commence par le mot cherché passent devant */
const trier = (list, titre, ws) => list.sort((a, b) => (norm(titre(b)).startsWith(ws[0]) - norm(titre(a)).startsWith(ws[0])));

export async function openGlobalSearch(initial = ""){
  if(document.querySelector("dialog.gsearch")) return;
  const src = charger();
  const s = openSheet({
    title: "Rechercher",
    body: `
      <label class="input-icon gs-field"><span class="sr-only">Rechercher dans l'appli</span>${icon("search")}<input class="input" type="search" data-gq placeholder="Patient, exercice, modèle, fiche, réglage…" autocomplete="off" enterkeyhint="search"></label>
      <div class="gs-results" data-gres role="listbox" aria-label="Résultats"></div>`
  });
  const el = s.el;
  el.classList.add("gsearch");
  const input = el.querySelector("[data-gq]");
  const res = el.querySelector("[data-gres]");
  input.value = initial;
  let actions = [];   /* fonction à lancer pour chaque résultat, dans l'ordre affiché */
  let cur = 0;

  const ligne = (ico, titre, sub, i, thumb = "") => `
    <button class="gs-item" type="button" role="option" data-i="${i}">
      ${thumb || `<span class="gs-ico">${icon(ico)}</span>`}
      <span class="gs-main"><span class="gs-title">${esc(titre)}</span>${sub ? `<span class="gs-sub">${esc(sub)}</span>` : ""}</span>
      ${icon("chevron")}
    </button>`;
  const groupe = (titre, items, plus = null) => items.length
    ? `<section class="gs-group"><h3>${esc(titre)}</h3>${items.join("")}${plus || ""}</section>` : "";

  const vers = href => () => { location.href = href; };

  async function chercher(){
    const q = input.value.trim();
    const ws = mots(q);
    actions = []; cur = 0;
    const add = fn => actions.push(fn) - 1;
    if(!ws.length){
      res.innerHTML = `<p class="small muted gs-hint">Tapez un nom de patient, un exercice, une pathologie, un modèle, une fiche conseil ou une page de l'appli (« réglages », « corbeille »…).</p>` +
        groupe("Raccourcis", PAGES.slice(1, 7).map(p => ligne(p.ico, p.titre, p.sub, add(vers(p.href)))));
      bind(); return;
    }
    res.innerHTML = `<div class="loading"><div class="spinner"></div><span>Recherche…</span></div>`;
    const [patients, exercices, modeles, conseils] = await Promise.all([src.patients, src.exercices, src.modeles, src.conseils]);
    if(input.value.trim() !== q) return;   /* une autre recherche a été tapée entre-temps */
    const html = [];

    const pts = trier(patients.filter(p => tous(norm([p.nom, p.telephone, p.email].join(" ")), ws)), p => p.nom || "", ws);
    html.push(groupe("Patients", pts.slice(0, PAR_GROUPE).map(p => ligne("user", p.nom || "Patient", [p.telephone, p.email].filter(Boolean).join(" · "), add(vers(`/cloud.html?patient=${encodeURIComponent(p.cle)}`))))));

    const { searchLibrary } = await import("./library.js");
    const exos = searchLibrary(exercices, q);
    const { exoImageHTML } = await import("./app.js");
    html.push(groupe("Exercices", exos.slice(0, PAR_GROUPE).map(e => ligne("dumbbell", e.nom, [e.zone || e.categorie, e.niveau ? `niveau ${e.niveau}` : "", e.materiel?.[0]].filter(Boolean).join(", "),
        add(async () => { const { exerciseSheet } = await import("./library-ui.js"); s.close(); exerciseSheet(e); }), exoImageHTML(e.image, "", "gs-thumb"))),
      exos.length > PAR_GROUPE ? `<button class="gs-more" type="button" data-i="${add(() => { store.set("gt_lib_filters", { q }); location.href = "/exercises/glossary.html"; })}">Voir les ${exos.length} exercices${icon("chevron")}</button>` : ""));

    const mods = trier(modeles.filter(x => tous(x.hay, ws)), x => x.g.nom, ws);
    html.push(groupe("Modèles", mods.slice(0, PAR_GROUPE).map(({ g, M }) => {
      const lieu = g.items[0].lieu === "HEP" ? "à la maison" : g.items[0].lieu === "CABINET" ? "au cabinet" : "";
      const sub = [M.catLabel(g.categorie), g.zoneLabel, lieu, g.items.length > 1 ? `${g.items.length} niveaux` : ""].filter(Boolean).join(", ");
      return ligne("layers", g.nom, sub, add(() => { store.set("gt_modeles_filters", { q: g.nom }); location.href = "/programmes_admin.html"; }), M.modelCoverHTML(g.items[0], { small:true }));
    }), mods.length > PAR_GROUPE ? `<button class="gs-more" type="button" data-i="${add(() => { store.set("gt_modeles_filters", { q }); location.href = "/programmes_admin.html"; })}">Voir les ${mods.length} modèles${icon("chevron")}</button>` : ""));

    const fiches = conseils.filter(c => tous(norm([c.titre, c.resume, c.texte].join(" ")), ws));
    html.push(groupe("Fiches conseils", fiches.slice(0, PAR_GROUPE).map(c => ligne(c.ico || "book", c.titre, c.resume || "", add(vers(`/conseils.html?id=${encodeURIComponent(c.id)}`))))));

    const pages = PAGES.filter(p => tous(p.hay, ws));
    html.push(groupe("Pages et outils", pages.slice(0, PAR_GROUPE + 2).map(p => ligne(p.ico, p.titre, p.sub, add(vers(p.href))))));

    res.innerHTML = html.join("") || `<div class="empty"><div class="e-ico">${icon("search")}</div><h3>Aucun résultat</h3><p>Essayez un autre mot, ou une partie du mot seulement.</p></div>`;
    bind();
  }

  function bind(){
    $$("[data-i]", res).forEach(b => {
      b.onclick = () => actions[Number(b.dataset.i)]?.();
      b.onmouseenter = () => marquer(Number(b.dataset.i), false);
    });
    marquer(0, false);
  }
  function marquer(i, scroll = true){
    const items = $$("[data-i]", res);
    if(!items.length) return;
    cur = (i + items.length) % items.length;
    items.forEach(b => b.classList.toggle("on", Number(b.dataset.i) === cur));
    if(scroll) items.find(b => Number(b.dataset.i) === cur)?.scrollIntoView({ block:"nearest" });
  }

  input.addEventListener("input", debounce(chercher, 150));
  input.addEventListener("keydown", e => {
    if(e.key === "ArrowDown"){ e.preventDefault(); marquer(cur + 1); }
    else if(e.key === "ArrowUp"){ e.preventDefault(); marquer(cur - 1); }
    else if(e.key === "Enter"){ e.preventDefault(); actions[cur]?.(); }
  });
  chercher();
  setTimeout(() => input.focus(), 30);
}

/* Ctrl+K (ou Cmd+K) et « / » ouvrent la recherche depuis n'importe quelle page de l'espace kiné */
let raccourci = false;
export function installSearchShortcut(){
  if(raccourci) return; raccourci = true;
  document.addEventListener("keydown", e => {
    const tape = /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName) || e.target.isContentEditable;
    if(((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") || (e.key === "/" && !tape && !document.querySelector("dialog[open]"))){
      e.preventDefault(); openGlobalSearch();
    }
  });
}
