/* =========================================================
   Bibliothèque d'exercices
   Réunit les exercices du cabinet et ceux de la base HEP
   dans un format unique, en français.
   ========================================================= */

const CAT_LABELS = {
  hanche:"Hanche", epaule:"Épaule", Epaule:"Épaule", dos:"Dos", cheville_pied:"Cheville et pied",
  genou:"Genou", Genou:"Genou", corps_entier:"Corps entier", poignet_main:"Poignet et main",
  cervicales:"Cervicales", equilibre:"Équilibre", respiration:"Respiration", Respiration:"Respiration",
  fauteuil:"Fauteuil", fun:"Ludique", Cheville:"Cheville et pied", Lombalgie:"Dos", Tronc:"Tronc",
  coude:"Coude", "Contrôle moteur":"Contrôle moteur"
};

const MODES = {
  renforcement:"Renforcement", "étirement":"Étirement", etirement:"Étirement", "étirements":"Étirement",
  proprioception:"Proprioception", "propriocétion":"Proprioception", propriception:"Proprioception",
  "propriétécception":"Proprioception", gainage:"Gainage", equilibre:"Équilibre", "équilibre":"Équilibre",
  respiration:"Respiration", mobilite:"Mobilité", isometrique:"Isométrique", PNF:"PNF",
  dynamique:"Dynamique", statique:"Statique", temps:"Durée", repetitions:"Répétitions"
};

export const norm = s => String(s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

const cap = s => { s = String(s || "").trim(); return s ? s.charAt(0).toUpperCase() + s.slice(1) : s; };

/** Les champs HEP sont parfois des listes écrites comme du texte : "['a', 'b']". */
export function toList(v){
  if(v === null || v === undefined || v === "") return [];
  if(Array.isArray(v)) return v.map(x => String(x).trim()).filter(Boolean);
  const s = String(v).trim();
  if(s.startsWith("[")){
    try{ const j = JSON.parse(s); if(Array.isArray(j)) return j.map(x => String(x).trim()).filter(Boolean); }catch(e){}
    const out = [];
    s.replace(/'((?:[^'\\]|\\.)*)'|"((?:[^"\\]|\\.)*)"/g, (_, a, b) => { out.push((a ?? b).trim()); return ""; });
    if(out.length) return out.filter(Boolean);
  }
  return s.split(/\s*[,;]\s*/).map(x => x.trim()).filter(Boolean);
}

function imgPath(p, hep){
  if(!p) return null;
  if(/^https?:/.test(p)) return p;
  if(hep && !p.includes("/")) return "/exercises/images/HEP/" + p;
  return p.startsWith("/") ? p : "/" + p;
}

export function youtubeId(url){
  if(!url) return null;
  const m = String(url).match(/(?:youtube\.com\/(?:embed\/|watch\?v=|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/);
  return m ? m[1] : null;
}

export function videoEmbed(ex){
  const yt = youtubeId(ex.youtube) || youtubeId(ex.videos?.[0]?.url);
  if(yt) return { type:"youtube", src:`https://www.youtube-nocookie.com/embed/${yt}?autoplay=1&rel=0`, url:`https://www.youtube.com/watch?v=${yt}` };
  const vm = String(ex.vimeo || "").match(/vimeo\.com\/(?:video\/)?(\d+)/);
  if(vm) return { type:"vimeo", src:`https://player.vimeo.com/video/${vm[1]}?autoplay=1`, url:`https://vimeo.com/${vm[1]}` };
  const other = ex.videos?.[0]?.url;
  if(other) return { type:"link", src:null, url:other, title:ex.videos[0].titre || "Voir la vidéo" };
  return null;
}

function sentences(text){
  return String(text || "")
    .split(/(?<=[.!?])\s+(?=[A-ZÀ-Ý])/)
    .map(s => s.trim()).filter(Boolean);
}

function fromCabinet(x){
  const tc = x.timer_config || {};
  const categorie = CAT_LABELS[x.categorie] || cap(x.categorie) || "Autre";
  return {
    id: x.id,
    source: "CABINET",
    nom: String(x.nom || "").replace(/^[^\p{L}\d]+/u, "").trim(),
    categorie,
    niveau: Number(x.niveau) || 1,
    mode: MODES[x.exercise_mode] || MODES[tc.mode] || "",
    image: imgPath(x.image, false),
    consignes: toList(x.consignes),
    description: x.description || "",
    descriptionHtml: "",
    position: "",
    precautions: toList(x.precautions),
    contreIndications: toList(x.contre_indications),
    objectifs: toList(x.objectifs?.length ? x.objectifs : x.objectif).map(cap),
    pathologies: toList(x.pathologies).map(cap),
    materiel: toList(x.materiel),
    muscles: toList(x.muscles_cibles),
    tags: toList(x.tags),
    conseil_posture: toList(x.conseil_posture),
    erreurs_frequentes: toList(x.erreurs_frequentes),
    respiration: toList(x.respiration),
    version_facile: toList(x.version_facile),
    version_avancee: toList(x.version_avancee),
    videos: Array.isArray(x.videos) ? x.videos : [],
    youtube: x.youtube || "",
    vimeo: x.vimeo || "",
    ex: Number(x.ex) || Number(tc.maintien) || 30,
    repos: Number(x.repos) || 10,
    reps: Number(x.reps) || Number(tc.cycles) || 10,
    raw: x
  };
}

function fromHep(x){
  const instructions = x.instructions_fr || "";
  const categorie = CAT_LABELS[x.categorie] || cap(x.categorie) || "Autre";
  const pathos = [...toList(x.pathologies_principales), ...toList(x.pathologies), ...toList(x.pathologies_secondaires)];
  return {
    id: String(x.id),
    source: "HEP",
    nom: x.nom_fr || x.nom,
    nomOriginal: x.nom,
    categorie,
    niveau: Number(x.difficulte) || 2,
    mode: MODES[x.exercise_mode] || cap(x.exercise_mode),
    image: imgPath(x.image, true),
    consignes: sentences(instructions),
    description: x.description_fr && !/<[a-z]/i.test(x.description_fr) ? x.description_fr : "",
    descriptionHtml: /<[a-z]/i.test(x.description_fr || "") ? x.description_fr : "",
    position: x.position_depart || "",
    precautions: toList(x.precautions).length > 1 ? toList(x.precautions) : (x.precautions ? [x.precautions] : []),
    contreIndications: x.contre_indications ? [String(x.contre_indications)] : [],
    objectifs: toList(x.objectifs).map(cap),
    pathologies: Array.from(new Set(pathos.map(cap))),
    materiel: toList(x.materiel),
    muscles: toList(x.muscles_principaux),
    tags: toList(x.tags_fr),
    conseil_posture: [], erreurs_frequentes: [], respiration: [], version_facile: [],
    version_avancee: (() => {
      const p = String(x.progression || "");
      const m = p.match(/'principale':\s*["']([^"']+)/);
      return m ? [m[1]] : [];
    })(),
    videos: [],
    youtube: x.youtube || "",
    vimeo: x.vimeo || "",
    ex: 30, repos: 10, reps: 10,
    raw: x
  };
}

/* ---------- Corrections du kiné ----------
   Les fichiers JSON ne changent pas : les corrections faites depuis le site
   sont enregistrées dans Firebase (collection « exercices ») et appliquées
   par-dessus au chargement de la bibliothèque. */

/** Champs modifiables depuis le site. */
export const EDITABLE = [
  "nom", "consignes", "position", "description", "conseil_posture", "erreurs_frequentes",
  "precautions", "version_facile", "version_avancee", "materiel", "niveau", "youtube", "ex", "repos", "reps"
];

/** Correspondance bibliothèque → exercice enregistré dans une séance (réglages ex/repos/reps exclus :
    ils sont choisis pour chaque patient). */
const TO_SESSION = {
  nom:"nom", consignes:"consignes", position:"position", description:"description_fr",
  conseil_posture:"conseil_posture", erreurs_frequentes:"erreurs_frequentes", precautions:"precautions",
  version_facile:"version_facile", version_avancee:"version_avancee", materiel:"materiel", youtube:"youtube"
};

export const exerciseKey = e => `${e.source || "CABINET"}_${e.id}`;

const same = (a, b) => JSON.stringify(a ?? "") === JSON.stringify(b ?? "");
const isEmpty = v => v === undefined || v === null || v === "" || (Array.isArray(v) && !v.length);

function snapshot(e){
  const o = {};
  EDITABLE.forEach(f => { o[f] = Array.isArray(e[f]) ? [...e[f]] : e[f]; });
  return o;
}

function indexSearch(e){
  e.search = norm([e.nom, e.nomOriginal, e.categorie, e.mode, ...e.pathologies, ...e.objectifs, ...e.tags, ...e.materiel, ...e.muscles].join(" "));
}

/** Applique une correction (ou la retire si fields est null) à un exercice de la bibliothèque. */
export function applyEdit(e, fields){
  if(!e.original) e.original = snapshot(e);
  Object.assign(e, e.original);
  if(fields) EDITABLE.forEach(f => { if(f in fields) e[f] = fields[f]; });
  e.modifie = !!fields;
  indexSearch(e);
  return e;
}

/**
 * Reporte une correction sur un exercice déjà placé dans une séance.
 * Un champ n'est remplacé que s'il n'avait pas été personnalisé dans la séance
 * (sa valeur est encore celle de l'ancienne version de la bibliothèque).
 * Renvoie true si l'exercice a changé.
 */
export function updateSessionExercise(x, before, after){
  if(String(x.id) !== String(after.id) || (x.source || "CABINET") !== (after.source || "CABINET")) return false;
  let changed = false;
  Object.entries(TO_SESSION).forEach(([f, sf]) => {
    if(same(before[f], after[f])) return;
    const current = f === "consignes" ? exerciseSteps(x) : x[sf];
    if(!same(current, before[f]) && !(isEmpty(current) && isEmpty(before[f]))) return;
    x[sf] = Array.isArray(after[f]) ? [...after[f]] : after[f];
    if(f === "consignes") x.conseil = after.consignes.join("<br>");
    changed = true;
  });
  return changed;
}

let cache = null;

export function loadLibrary(){
  if(cache) return cache;
  const edits = import("./cloud.js").then(C => C.listExerciseEdits()).catch(() => ({}));
  cache = Promise.all([
    fetch("/exercises/data/exercises.json").then(r => r.json()).catch(() => []),
    fetch("/exercises/data/hep_exercises.json").then(r => r.json()).catch(() => []),
    edits
  ]).then(([cab, hep, ed]) => {
    const list = [...cab.map(fromCabinet), ...hep.map(fromHep)];
    list.forEach(e => {
      const fix = ed[exerciseKey(e)];
      if(fix) applyEdit(e, fix);
      else indexSearch(e);
    });
    return list;
  });
  return cache;
}

/** Retrouve l'exercice de la bibliothèque qui correspond à un exercice de séance. */
export async function findInLibrary(x){
  if(!x || x.id === undefined || x.id === null || x.id === "") return null;
  const list = await loadLibrary();
  return list.find(e => e.source === (x.source || "CABINET") && String(e.id) === String(x.id)) || null;
}

/** Recherche plein texte tolérante (accents, ordre des mots). */
export function searchLibrary(list, q){
  const words = norm(q).split(/\s+/).filter(Boolean);
  if(!words.length) return list;
  return list.filter(e => words.every(w => e.search.includes(w)))
    .sort((a, b) => {
      const na = norm(a.nom), nb = norm(b.nom), w = words[0];
      return (nb.startsWith(w) - na.startsWith(w)) || (nb.includes(w) - na.includes(w));
    });
}

/** Format enregistré dans une séance (compatible avec les anciens programmes). */
export function toProgramExercise(e, overrides = {}){
  return {
    id: e.id,
    source: e.source,
    type: "timer",
    nom: e.nom,
    image: e.image || "",
    conseil: e.consignes.join("<br>"),
    consignes: e.consignes,
    description_fr: e.description || "",
    position: e.position || "",
    precautions: e.precautions,
    conseil_posture: e.conseil_posture,
    erreurs_frequentes: e.erreurs_frequentes,
    respiration: e.respiration,
    version_facile: e.version_facile,
    version_avancee: e.version_avancee,
    materiel: e.materiel,
    videos: e.videos,
    youtube: e.youtube,
    vimeo: e.vimeo,
    ex: e.ex, repos: e.repos, reps: e.reps,
    ...overrides
  };
}

/** Chemin d'image utilisable, quel que soit l'ancien format enregistré. */
export function exerciseImage(exo){
  const src = exo?.image;
  if(!src) return null;
  if(/^https?:|^data:/.test(src)) return src;
  if(exo.source === "HEP" && !src.includes("/")) return "/exercises/images/HEP/" + src;
  return src.startsWith("/") ? src : "/" + src.replace(/^\.\.\//, "");
}

/** Consignes d'un exercice enregistré (ancien ou nouveau format) sous forme de liste. */
export function exerciseSteps(exo){
  if(Array.isArray(exo.consignes) && exo.consignes.length) return exo.consignes;
  if(exo.instructions_fr) return sentences(exo.instructions_fr);
  if(exo.conseil){
    return String(exo.conseil).split(/<br\s*\/?>|\n/i).map(s => s.replace(/<[^>]+>/g, "").trim()).filter(Boolean);
  }
  return [];
}
