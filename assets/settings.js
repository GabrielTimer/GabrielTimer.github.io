/* =========================================================
   Réglages du cabinet, modifiables depuis le site (Outils → Réglages du cabinet)
   ---------------------------------------------------------
   Enregistrés dans Firebase (reglages/cabinet), lisibles par tous les
   appareils, et gardés en mémoire sur l'appareil pour s'afficher tout de
   suite, même hors connexion. Rien de confidentiel n'est rangé ici.
   ========================================================= */

import { KINE } from "./config.js";

const CACHE = "gt_settings";
const CACHE_AT = "gt_settings_at";
const REFRESH_MS = 5 * 60 * 1000;

export const DEFAULTS = {
  cabinet: {
    nom: KINE.nom,
    titre: KINE.titre,
    sousTitre: "Kinésithérapie",
    email: KINE.email,
    telephone: "05 64 72 40 15",
    adresse: "1 avenue de la coopération\n86200 Loudun",
    logo: null
  },
  messages: {
    invitation: "Bonjour {prenom},\n\nVoici votre accès personnel à vos exercices de kinésithérapie :\n{lien}\n\nOuvrez ce lien sur votre téléphone, puis ajoutez l'application à votre écran d'accueil pour la retrouver facilement.\nCe lien est personnel : ne le partagez pas.\n\n{kine}\n{titre}",
    encouragements: ["Excellent travail.", "Très belle séance.", "Chaque séance compte.", "Bravo pour votre régularité."],
    piedPdf: "Programme personnalisé de rééducation",
    annonce: { active: false, texte: "", debut: "", fin: "" }
  },
  exercice: { ex: 30, repos: 10, reps: 10 },
  alertes: { douleur: 7, hausse: 2, retard: 2, joursSans: 10 },
  listes: {
    categories: [
      { id:"pathologie", label:"Pathologies", one:"Pathologie" },
      { id:"postop", label:"Post-opératoire", one:"Post-opératoire" },
      { id:"prevention", label:"Prévention", one:"Prévention" },
      { id:"sport", label:"Sport et reprise", one:"Sport et reprise" },
      { id:"cabinet", label:"Au cabinet", one:"Au cabinet" },
      { id:"autre", label:"Autres", one:"Autre" }
    ],
    zones: ["Épaule", "Coude", "Poignet et main", "Cervicales", "Dos", "Hanche", "Genou", "Cheville et pied", "Tronc", "Corps entier", "Respiratoire"],
    niveaux: [
      { n:1, label:"Niveau 1", sub:"débutant, phase initiale" },
      { n:2, label:"Niveau 2", sub:"intermédiaire" },
      { n:3, label:"Niveau 3", sub:"avancé" },
      { n:4, label:"Niveau 4", sub:"expert, retour au sport" }
    ]
  },
  masques: { exercices: [], modeles: [] },
  favoris: { exercices: [] }
};

const isObj = v => v && typeof v === "object" && !Array.isArray(v);
function merge(base, over){
  if(!isObj(over)) return structuredClone(base);
  const out = structuredClone(base);
  Object.keys(over).forEach(k => {
    if(isObj(base[k]) && isObj(over[k])) out[k] = merge(base[k], over[k]);
    else if(over[k] !== undefined && over[k] !== null) out[k] = structuredClone(over[k]);
  });
  return out;
}

function readCache(){
  try{ return JSON.parse(localStorage.getItem(CACHE) || "null"); }catch(e){ return null; }
}
function writeCache(raw){
  try{ localStorage.setItem(CACHE, JSON.stringify(raw || {})); localStorage.setItem(CACHE_AT, String(Date.now())); }catch(e){}
}

/** Réglages en vigueur (lecture immédiate). */
export const settings = merge(DEFAULTS, readCache());

function replaceSettings(raw){
  const fresh = merge(DEFAULTS, raw);
  Object.keys(settings).forEach(k => delete settings[k]);
  Object.assign(settings, fresh);
  applyToKine();
  document.dispatchEvent(new CustomEvent("settingschange"));
}

/* Le nom, le titre et l'e-mail du cabinet sont repris partout dans l'application. */
function applyToKine(){
  KINE.nom = settings.cabinet.nom || DEFAULTS.cabinet.nom;
  KINE.titre = settings.cabinet.titre || DEFAULTS.cabinet.titre;
  KINE.email = settings.cabinet.email || DEFAULTS.cabinet.email;
  KINE.sousTitre = settings.cabinet.sousTitre || "";
}
applyToKine();

let loading = null;
/** Recharge les réglages depuis Firebase (au plus toutes les 5 minutes, sauf force). */
export function loadSettings({ force = false } = {}){
  const at = Number(localStorage.getItem(CACHE_AT) || 0);
  if(!force && Date.now() - at < REFRESH_MS) return Promise.resolve(settings);
  if(loading) return loading;
  loading = import("./cloud.js")
    .then(C => C.getReglages())
    .then(raw => { writeCache(raw || {}); replaceSettings(raw || {}); return settings; })
    .catch(() => settings)
    .finally(() => { loading = null; });
  return loading;
}

/** Enregistre une partie des réglages : saveSettings({ cabinet:{ nom:"…" } }). */
export async function saveSettings(patch){
  const C = await import("./cloud.js");
  const current = await C.getReglages().catch(() => null);
  const raw = merge(merge({}, current || readCache() || {}), patch);
  await C.saveReglages(raw);
  writeCache(raw);
  replaceSettings(raw);
  return settings;
}

/** Remplace les {mots} d'un modèle de texte. */
export function fillTemplate(text, vars){
  return String(text || "").replace(/\{(\w+)\}/g, (m, k) => (vars[k] ?? m));
}

export const logoSrc = () => settings.cabinet.logo || "/logo.png";

/** Annonce à afficher aux patients aujourd'hui, ou null. */
export function currentAnnonce(){
  const a = settings.messages.annonce || {};
  if(!a.active || !String(a.texte || "").trim()) return null;
  const today = new Date().toISOString().slice(0, 10);
  if(a.debut && today < a.debut) return null;
  if(a.fin && today > a.fin) return null;
  return a;
}

/* ---------- Exercices masqués et favoris ---------- */
export const isHidden = key => settings.masques.exercices.includes(key);
export const isFavorite = key => settings.favoris.exercices.includes(key);

export async function toggleInList(path, key, on){
  const [group, list] = path.split(".");
  const cur = new Set(settings[group][list]);
  on ? cur.add(key) : cur.delete(key);
  return saveSettings({ [group]: { [list]: [...cur] } });
}

/* Rafraîchissement discret en arrière-plan */
setTimeout(() => { loadSettings().catch(() => {}); }, 1500);
