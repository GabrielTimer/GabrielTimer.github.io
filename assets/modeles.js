/* =========================================================
   Modèles : programmes prêts à l'emploi (fournis avec l'application)
   et modèles du cabinet (Firebase), présentés de la même façon.
   ========================================================= */

import { PATHOLOGIES } from "./pathologies.js";
import { MODELES_BASE } from "./modeles-base.js";
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

/** « HEP » (à la maison), « CABINET », « MIXTE » ou null (seulement des exercices personnalisés). */
export function lieuDesExercices(exercices){
  const l = new Set();
  (exercices || []).forEach(e => {
    const img = e.image || "";
    const s = e.source || (/\/HEP\//.test(img) ? "HEP" : /^\/?(exercises\/)?images\/(?!eva\/)/.test(img) ? "CABINET" : null);
    if(s === "HEP" || s === "CABINET") l.add(s);
  });
  return l.size === 2 ? "MIXTE" : l.size ? [...l][0] : null;
}

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
    lieu: lieuDesExercices(exercices),
    id: raw.id, raw, builtin, mine: !builtin,
    nom: base, niveau, categorie, zoneLabel, zoneKey: norm(zoneLabel),
    cover: raw.cover || null, pdf: raw.pdf || null,
    series, exercices,
    titre: niveau ? `${base}, ${niveauLabel(niveau).toLowerCase()}` : base,
    remplace: raw.remplace || null,
    options: raw.options || null,
    createdAt: raw.createdAt || null
  };
}

export const BUILTIN = [...MODELES_BASE, ...PATHOLOGIES].map(p => normModele(p, { builtin:true }));

/** Modèles fournis : masqués par le kiné, ou remplacés par sa propre version. */
export const isBuiltinHidden = id => settings.masques.modeles.includes(id);

export const coverOf = m => m.cover || m.exercices?.[0]?.image || null;

/** Regroupe les niveaux d'un même modèle (même nom, même catégorie). */
export function groupModeles(list){
  const groups = new Map();
  list.forEach(m => {
    /* Vos modèles et ceux fournis avec l'application ne sont jamais mélangés sur une même carte */
    /* … ni les versions maison et cabinet d'une même pathologie */
    const lieu = m.lieu === "HEP" || m.lieu === "CABINET" ? m.lieu : "";
    const k = `${m.mine ? "m" : "b"}|${m.categorie}|${norm(m.nom)}|${lieu}`;
    if(!groups.has(k)) groups.set(k, { key:k, nom:m.nom, categorie:m.categorie, mine:m.mine, lieu, items:[] });
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
/* ---------- Modèles à options (ex. névralgie cervico-brachiale : nerf médian, ulnaire, radial) ----------
   Le modèle porte options = { titre, choix:[{ k, l, court }] } ; un exercice propre à une option porte opt:"k".
   Au moment d'utiliser le modèle, le kiné coche une ou plusieurs options : seuls les exercices communs
   et ceux des options cochées sont gardés, et le nom du programme les rappelle :
   « Névralgie cervico-brachiale (médian, radial), niveau 2 ». */
export function filtrerOptions(m, choix){
  if(!m?.options || !choix?.length) return m;
  const ch = m.options.choix.filter(c => choix.includes(c.k));
  const lab = ch.map(c => c.court || c.l).join(", ");
  return { ...m, choix: ch.map(c => c.k),
    exercices: m.exercices.filter(e => !e.opt || choix.includes(e.opt)),
    titre: m.niveau ? `${m.nom} (${lab}), ${niveauLabel(m.niveau).toLowerCase()}` : `${m.nom} (${lab})` };
}
/** Retrouve les options d'après le nom d'un programme : « … (médian, radial), niveau 2 » → ["median","radial"]. */
export function choixDuNom(m, nomProgramme){
  if(!m?.options) return null;
  const x = String(nomProgramme || "").match(/\(([^)]*)\)/);
  if(!x) return null;
  const mots = x[1].split(",").map(t => norm(t));
  const ks = m.options.choix.filter(c => mots.includes(norm(c.court || c.l))).map(c => c.k);
  return ks.length ? ks : null;
}
/** Fenêtre de choix (cases à cocher). Renvoie le modèle filtré, le modèle tel quel s'il n'a pas d'options, ou null si annulé. */
export async function choisirOptions(m){
  if(!m?.options) return m;
  const { openSheet, toast, esc, icon, store } = await import("./app.js");
  const memo = `gt_opt_${norm(m.nom)}`;
  const avant = store.get(memo, []) || [];
  return new Promise(resolve => {
    let fini = false;
    const s = openSheet({
      title: m.titre,
      body: `<p class="muted" style="margin-top:0">${esc(m.options.titre)} : cochez un ou plusieurs choix. Les exercices s'adaptent.</p>
        <div class="stack" style="--gap:10px">${m.options.choix.map(c => `<label class="check" style="min-height:48px;padding:10px 14px;border:1.5px solid var(--line-strong);border-radius:var(--r-md)"><input type="checkbox" value="${esc(c.k)}" ${avant.includes(c.k) ? "checked" : ""}> <span><strong>${esc(c.l)}</strong>${c.aide ? `<br><span class="small muted">${esc(c.aide)}</span>` : ""}</span></label>`).join("")}</div>`,
      foot: `<button class="btn" type="button" data-close>Annuler</button><button class="btn primary" type="button" data-ok>${icon("check")}Valider</button>`,
      onClose: () => { if(!fini) resolve(null); }
    });
    s.el.querySelector("[data-ok]").onclick = () => {
      const choix = [...s.el.querySelectorAll("input:checked")].map(x => x.value);
      if(!choix.length){ toast("Cochez au moins un choix.", { type:"err" }); return; }
      store.set(memo, choix);
      fini = true; s.close(); resolve(filtrerOptions(m, choix));
    };
  });
}

export const asProgram = m => ({ nom: m.titre, series: m.series, exercices: m.exercices.map(e => ({ type:"timer", ...e })) });
