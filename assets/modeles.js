/* =========================================================
   Modèles : programmes prêts à l'emploi (fournis avec l'application)
   et modèles du cabinet (Firebase), présentés de la même façon.
   ========================================================= */

import { PATHOLOGIES } from "./pathologies.js";
import { norm } from "./library.js";
import { settings } from "./settings.js";

/* Listes modifiables dans Outils → Réglages du cabinet */
export const categories = () => settings.listes.categories;
export const niveaux = () => settings.listes.niveaux;
export const zones = () => settings.listes.zones;
export const catLabel = id => {
  const list = categories();
  return (list.find(c => c.id === id) || list.find(c => c.id === "autre") || { one: "Autre" }).one || id;
};
export const niveauLabel = n => (niveaux().find(x => x.n === Number(n)) || {}).label || `Niveau ${n}`;
/** Libellé du bouton de niveau d'un modèle (avec le numéro de copie s'il y a des doublons). */
export const levelButton = m => `${m.niveau ? niveauLabel(m.niveau) : "Sans niveau"}${m.doublon ? ` (${m.doublon})` : ""}`;

/** « Lombalgie P2 », « Épaule 1 », « Genou niveau 3 » → { base, niveau } */
export function splitLevel(nom){
  const s = String(nom || "").trim();
  const m = s.match(/^(.*?)[\s_-]+(?:P|N|niveau\s*|phase\s*)?(\d)\s*$/i);
  if(m && m[1].trim()) return { base: m[1].trim(), niveau: Number(m[2]) };
  return { base: s || "Sans nom", niveau: null };
}

/* Réglages des programmes fournis avec l'application */
const BUILTIN_META = {
  etirements_bureau: { categorie:"prevention", zoneLabel:"Corps entier" },
  epaule_1: { categorie:"cabinet", zoneLabel:"Épaule" },
  epaule_2: { categorie:"cabinet", zoneLabel:"Épaule" },
  gainage_1: { categorie:"cabinet", zoneLabel:"Tronc" }
};

/** Un modèle, quelle que soit son origine, au même format. */
export function normModele(raw, { builtin = false } = {}){
  const exercices = Array.isArray(raw.exercices) ? raw.exercices : (raw.data?.exercices || []);
  const series = Number(raw.series ?? raw.data?.series) || 1;
  const parsed = splitLevel(raw.nom || raw.data?.nom);
  const meta = builtin ? (BUILTIN_META[raw.id] || {}) : {};
  const niveau = Number(raw.niveau) || parsed.niveau || null;
  const base = raw.niveau ? String(raw.nom || "").trim() || parsed.base : parsed.base;
  let categorie = meta.categorie || raw.categorie || (raw.type === "pathologie" || builtin ? "pathologie" : "autre");
  if(!categories().some(c => c.id === categorie)) categorie = "autre";
  const zoneLabel = meta.zoneLabel || raw.zoneLabel || "";
  return {
    id: raw.id, raw, builtin, mine: !builtin,
    nom: base, niveau, categorie, zoneLabel, zoneKey: norm(zoneLabel),
    cover: raw.cover || null, pdf: raw.pdf || null,
    series, exercices,
    titre: niveau ? `${base}, ${niveauLabel(niveau).toLowerCase()}` : base,
    remplace: raw.remplace || null,
    createdAt: raw.createdAt || null
  };
}

export const BUILTIN = PATHOLOGIES.map(p => normModele(p, { builtin:true }));

/** Modèles fournis : masqués par le kiné, ou remplacés par sa propre version. */
export const isBuiltinHidden = id => settings.masques.modeles.includes(id);

export const coverOf = m => m.cover || m.exercices?.[0]?.image || null;

/** Regroupe les niveaux d'un même modèle (même nom, même catégorie). */
export function groupModeles(list){
  const groups = new Map();
  list.forEach(m => {
    /* Vos modèles et ceux fournis avec l'application ne sont jamais mélangés sur une même carte */
    const k = `${m.mine ? "m" : "b"}|${m.categorie}|${norm(m.nom)}`;
    if(!groups.has(k)) groups.set(k, { key:k, nom:m.nom, categorie:m.categorie, mine:m.mine, items:[] });
    groups.get(k).items.push(m);
  });
  const out = [...groups.values()];
  out.forEach(g => {
    g.items.sort((a, b) => ((a.niveau || 0) - (b.niveau || 0)) || ((b.createdAt || 0) - (a.createdAt || 0)));
    /* Plusieurs versions au même niveau : « Niveau 1 », « Niveau 1 (2) »… */
    const seen = {};
    g.items.forEach(x => { const k = x.niveau || 0; seen[k] = (seen[k] || 0) + 1; x.doublon = seen[k] > 1 ? seen[k] : 0; });
    g.zoneLabel = g.items.find(x => x.zoneLabel)?.zoneLabel || "";
  });
  return out;
}

/** Programme prêt à être lancé ou copié dans une séance. */
export const asProgram = m => ({ nom: m.titre, series: m.series, exercices: m.exercices.map(e => ({ type:"timer", ...e })) });
