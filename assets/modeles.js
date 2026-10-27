/* =========================================================
   Modèles : programmes prêts à l'emploi (fournis avec l'application)
   et modèles du cabinet (Firebase), présentés de la même façon.
   ========================================================= */

import { PATHOLOGIES } from "./pathologies.js";
import { norm } from "./library.js";

export const CATEGORIES = [
  { id:"pathologie", label:"Pathologies", one:"Pathologie", ico:"stethoscope" },
  { id:"postop", label:"Post-opératoire", one:"Post-opératoire", ico:"heart" },
  { id:"prevention", label:"Prévention", one:"Prévention", ico:"checkCircle" },
  { id:"sport", label:"Sport et reprise", one:"Sport et reprise", ico:"run" },
  { id:"cabinet", label:"Au cabinet", one:"Au cabinet", ico:"dumbbell" },
  { id:"autre", label:"Autres", one:"Autre", ico:"layers" }
];
export const catLabel = id => (CATEGORIES.find(c => c.id === id) || CATEGORIES[CATEGORIES.length - 1]).one;

export const NIVEAUX = [
  { n:1, label:"Niveau 1", sub:"débutant, phase initiale" },
  { n:2, label:"Niveau 2", sub:"intermédiaire" },
  { n:3, label:"Niveau 3", sub:"avancé" },
  { n:4, label:"Niveau 4", sub:"expert, retour au sport" }
];

export const ZONES = ["Épaule", "Coude", "Poignet et main", "Cervicales", "Dos", "Hanche", "Genou", "Cheville et pied", "Tronc", "Corps entier", "Respiratoire"];

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
  const categorie = meta.categorie || raw.categorie || (raw.type === "pathologie" || builtin ? "pathologie" : "autre");
  const zoneLabel = meta.zoneLabel || raw.zoneLabel || "";
  return {
    id: raw.id, raw, builtin, mine: !builtin,
    nom: base, niveau, categorie, zoneLabel, zoneKey: norm(zoneLabel),
    cover: raw.cover || null, pdf: raw.pdf || null,
    series, exercices,
    titre: niveau ? `${base}, niveau ${niveau}` : base,
    createdAt: raw.createdAt || null
  };
}

export const BUILTIN = PATHOLOGIES.map(p => normModele(p, { builtin:true }));

export const coverOf = m => m.cover || m.exercices?.[0]?.image || null;

/** Regroupe les niveaux d'un même modèle (même nom, même catégorie). */
export function groupModeles(list){
  const groups = new Map();
  list.forEach(m => {
    const k = `${m.mine ? "m" : "b"}|${m.categorie}|${norm(m.nom)}`;
    if(!groups.has(k)) groups.set(k, { key:k, nom:m.nom, categorie:m.categorie, mine:m.mine, items:[] });
    groups.get(k).items.push(m);
  });
  const out = [...groups.values()];
  out.forEach(g => {
    g.items.sort((a, b) => (a.niveau || 0) - (b.niveau || 0));
    g.zoneLabel = g.items.find(x => x.zoneLabel)?.zoneLabel || "";
  });
  return out;
}

/** Programme prêt à être lancé ou copié dans une séance. */
export const asProgram = m => ({ nom: m.titre, series: m.series, exercices: m.exercices.map(e => ({ type:"timer", ...e })) });
