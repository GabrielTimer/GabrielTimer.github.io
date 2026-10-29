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

/** Renvoie l'illustration à afficher pour une image d'exercice. */
export function variante(src){
  if(!src || typeof src !== "string") return src;
  const cle = src.replace(/^https?:\/\/[^/]+/, "");
  const m = carte[cle];
  if(!m) return src;
  const c = choixIllustrations();
  return (c !== "auto" && m[c]) || m.defaut || src;
}
