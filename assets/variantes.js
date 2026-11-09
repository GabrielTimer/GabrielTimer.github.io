/* Illustrations des exercices : version homme / femme.
 *
 * /exercises/data/variantes.json associe une image (ancienne ou actuelle) à ses versions :
 *   { "/exercises/images/genou/squat.png": { "defaut": "…/squat-h.webp", "h": "…/squat-h.webp", "f": "…/squat-f.webp" } }
 * « defaut » sert quand aucune préférence n'est choisie (et remplace les anciennes images
 * déjà enregistrées dans les programmes). Le choix « h » / « f » se fait dans les Réglages
 * et vaut pour l'appareil (patient ou kiné).
 */

const CLE_CARTE = "gt_variantes";
const CLE_CHOIX = "gt_illus";

function lire(cle, defaut){
  try{ const v = localStorage.getItem(cle); return v === null ? defaut : JSON.parse(v); }catch(e){ return defaut; }
}

let carte = lire(CLE_CARTE, {}) || {};

// Mise à jour de la carte en arrière-plan (prise en compte dès l'affichage suivant).
export const variantesPretes = fetch("/exercises/data/variantes.json", { cache:"no-cache" })
  .then(r => r.ok ? r.json() : null)
  .then(m => {
    if(m && typeof m === "object"){
      carte = m;
      try{ localStorage.setItem(CLE_CARTE, JSON.stringify(m)); }catch(e){}
    }
  })
  .catch(() => {});

/** "auto", "h" ou "f". */
export function choixIllustrations(){
  const v = lire(CLE_CHOIX, "auto");
  return v === "h" || v === "f" ? v : "auto";
}

export function setChoixIllustrations(v){
  try{ localStorage.setItem(CLE_CHOIX, JSON.stringify(v === "h" || v === "f" ? v : "auto")); }catch(e){}
}

/* Côté patient : le kiné choisit (fiche du patient ou envoi du programme), le patient peut
 * changer dans ses Réglages. Le choix le plus récent l'emporte : un nouveau choix du kiné
 * repasse au-dessus de celui du patient. */
const CLE_CHOIX_PATIENT = "gt_illus_choix_patient";   // { v:"h"|"f", at:ms }
const CLE_PATIENT = "gt_illus_patient";               // { cle, genre, at } dernier patient vu sur l'appareil
let contexte = null;                                  // { illus, at }
let modePatient = false;

function choixPatient(){
  const c = lire(CLE_CHOIX_PATIENT, null);
  return c && (c.v === "h" || c.v === "f") ? c : null;
}

/** À appeler quand une séance / un programme s'affiche (data = séance.data). */
export function setContexteIllustrations(data){
  const illus = data?.illus;
  contexte = illus === "h" || illus === "f" ? { illus, at: Number(data.illusAt || data.illusRef) || 0 } : null;
  appliquer();
}

/** Pages du patient : le genre de sa fiche prime, sinon celui du programme. */
export function setContextePatient(cle, genre, data, genreMaj = 0){
  modePatient = true;
  if(genre === "h" || genre === "f"){
    const at = Number(genreMaj) || 0;
    try{ localStorage.setItem(CLE_PATIENT, JSON.stringify({ cle, genre, at })); }catch(e){}
    setContexteIllustrations({ illus: genre, illusAt: at });
  }else setContexteIllustrations(data);
}
/** Séance et Réglages : le genre du patient s'il est connu sur l'appareil, sinon celui du programme. */
export function setContexteSeance(cle, data){
  if(cle) modePatient = true;
  const m = cle ? lire(CLE_PATIENT, null) : null;
  if(m && m.cle === cle) setContexteIllustrations({ illus: m.genre, illusAt: m.at });
  else setContexteIllustrations(data);
}

/** "h" ou "f" : la version à montrer maintenant (toujours la même pour tous les exercices). */
export function illustrationsActives(){
  if(contexte){
    const c = choixPatient();
    return c && c.at >= contexte.at ? c.v : contexte.illus;
  }
  if(modePatient){ const c = choixPatient(); if(c) return c.v; }
  const c = choixIllustrations();
  return c === "f" ? "f" : "h";
}

function choisir(v){
  if(v !== "h" && v !== "f") return;
  if(modePatient || contexte){
    try{ localStorage.setItem(CLE_CHOIX_PATIENT, JSON.stringify({ v, at: Date.now() })); }catch(e){}
  }
  setChoixIllustrations(v);
  appliquer();
}
export { choisir as choisirIllustrations };

/** Vrai si l'image existe en version femme et en version homme. */
export function aVariantes(src){
  if(!src || typeof src !== "string") return false;
  return !!entreePour(src.replace(/^https?:\/\/[^/]+/, ""));
}

/** Renvoie l'illustration à afficher pour une image d'exercice. */
export function variante(src){
  if(!src || typeof src !== "string") return src;
  const cle = src.replace(/^https?:\/\/[^/]+/, "");
  const m = carte[cle];
  if(!m) return src;
  return m[illustrationsActives()] || m.defaut || src;
}

/* ---------- Bouton « Femme / Homme » affiché dès qu'une illustration a deux versions ----------
 * Bascule instantanée de toutes les images de la page, sans rechargement.
 * Le choix est mémorisé sur l'appareil (le même que dans les Réglages). */

let inverse = null, inverseDe = null;
function entreePour(chemin){
  if(inverseDe !== carte){
    inverse = new Map(); inverseDe = carte;
    for(const [cle, m] of Object.entries(carte)){
      if(!m || !m.h || !m.f) continue;
      for(const p of [cle, m.defaut, m.h, m.f]) if(p) inverse.set(p, m);
    }
  }
  return inverse.get(chemin) || null;
}

function cheminImg(img){
  try{ return new URL(img.getAttribute("src") || "", location.href).pathname; }catch(e){ return ""; }
}

function imagesAvecVariantes(){
  if(typeof document === "undefined") return [];
  return [...document.querySelectorAll("img")].filter(img => entreePour(cheminImg(img)));
}

function appliquer(){
  if(typeof document === "undefined") return;
  const c = illustrationsActives();
  for(const img of imagesAvecVariantes()){
    const m = entreePour(cheminImg(img));
    const cible = m[c] || m.defaut;
    if(cible && cheminImg(img) !== cible) img.src = cible;
  }
  majBouton();
}

let bouton = null;
function majBouton(){
  if(!bouton) return;
  const c = illustrationsActives();
  bouton.querySelectorAll("button").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.illus === c)));
}

function creerBouton(){
  if(bouton || !document.body) return;
  const st = document.createElement("style");
  st.textContent = `
    .illus-bascule{ position:fixed; z-index:44; left:max(12px,env(safe-area-inset-left));
      bottom:calc(var(--nav-h,68px) + 12px + env(safe-area-inset-bottom));
      display:inline-flex; gap:4px; padding:4px; border-radius:999px;
      background:var(--surface,#fff); border:1px solid var(--line,#D5E2E5); box-shadow:0 4px 14px rgba(0,0,0,.14); }
    .illus-bascule button{ min-height:36px; padding:0 12px; border:0; border-radius:999px; background:transparent;
      color:var(--ink-2,#3a5560); font:inherit; font-size:.875rem; font-weight:700; cursor:pointer; }
    .illus-bascule button[aria-pressed="true"]{ background:var(--lagon,#138FA6); color:var(--on-lagon,#fff); }
    .illus-bascule button:focus-visible{ outline:none; box-shadow:var(--focus,0 0 0 3px #138FA6); }
    @media (min-width:960px){ .illus-bascule{ left:auto; right:24px; bottom:24px; } }
    @media print{ .illus-bascule{ display:none; } }`;
  document.head.appendChild(st);
  bouton = document.createElement("div");
  bouton.className = "illus-bascule";
  bouton.setAttribute("role", "group");
  bouton.setAttribute("aria-label", "Illustrations des exercices");
  bouton.innerHTML = `<button type="button" data-illus="f" title="Montrer les exercices réalisés par une femme">Femme</button><button type="button" data-illus="h" title="Montrer les exercices réalisés par un homme">Homme</button>`;
  bouton.addEventListener("click", e => {
    const b = e.target.closest("button[data-illus]");
    if(!b) return;
    choisir(b.dataset.illus);
  });
  document.body.appendChild(bouton);
  majBouton();
}

function surveiller(){
  let attente = null;
  const verifier = () => {
    attente = null;
    const present = !modePatient && imagesAvecVariantes().length > 0;
    if(present){ creerBouton(); bouton.hidden = false; }
    else if(bouton) bouton.hidden = true;
  };
  const planifier = () => { if(!attente) attente = setTimeout(verifier, 250); };
  new MutationObserver(planifier).observe(document.body, { childList:true, subtree:true, attributes:true, attributeFilter:["src"] });
  variantesPretes.then(planifier);
  planifier();
  // Choix modifié dans un autre onglet (ou dans les Réglages).
  window.addEventListener("storage", e => { if(e.key === CLE_CHOIX || e.key === CLE_CHOIX_PATIENT) appliquer(); });
}

if(typeof document !== "undefined" && !/\/(impression|program_pdf|coursepdf|timer|marche)\.html$/.test(location.pathname)){
  if(document.body) surveiller();
  else document.addEventListener("DOMContentLoaded", surveiller, { once:true });
}
