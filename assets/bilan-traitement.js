/* =========================================================
   Bilan → proposition de traitement
   ---------------------------------------------------------
   - profil du patient (phase, irritabilité) tiré de l'entretien
   - plan de traitement kiné (axes, à éviter, avis, rythme)
   - modèles d'exercices adaptés (hypothèse, motif, région, niveau, lieu)
   - programme « sur mesure » composé dans la bibliothèque
   Le contenu clinique est dans /bilan-kine/traitements.js.
   ========================================================= */

const norm = s => String(s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
const uniq = a => [...new Set(a.filter(Boolean))];

export const isPostOp = S => (S.c?.patho || []).includes("Post-opératoire") || S.q?.debut === "Après une opération";

/* ---------- Profil ---------- */

/** Phase, irritabilité et réglages proposés, d'après l'entretien. */
export function profilAuto(S){
  const d = S.q?.duree;
  const phase = d === "Plus de 3 mois" ? "Chronique" : d === "6 semaines à 3 mois" ? "Subaiguë" : d ? "Aiguë" : null;
  const evas = Object.values(S.pain || {}).map(p => +p.eva).filter(n => !isNaN(n));
  const eva = evas.length ? Math.max(...evas) : null;
  const h = S.q?.horaire || [];
  let sc = 0;
  if(eva !== null) sc += eva >= 7 ? 2 : eva >= 4 ? 1 : 0;
  if(h.includes("Réveils nocturnes")) sc++;
  if(h.includes("Au repos aussi")) sc++;
  if(S.q?.evol === "En aggravation") sc++;
  if(["Beaucoup", "Activités impossibles"].includes(S.q?.avq)) sc++;
  const irrit = sc >= 4 ? "Élevée" : sc >= 2 ? "Modérée" : "Faible";
  const niveau = irrit === "Élevée" ? 1 : irrit === "Modérée" ? 2 : phase === "Aiguë" ? 2 : 3;
  const freq = isPostOp(S) || (irrit === "Élevée" && phase === "Aiguë") ? 3 : 2;
  const sem = phase === "Chronique" ? 12 : phase === "Subaiguë" ? 8 : 6;
  return { phase, irrit, niveau, freq, sem, reeval: sem >= 8 ? 6 : 4, eva };
}

/** Valeur en vigueur : celle choisie par le kiné, sinon la proposition. */
export function profil(S){
  const a = profilAuto(S), t = S.tx || {};
  return {
    auto: a,
    phase: t.phase ?? a.phase, irrit: t.irrit ?? a.irrit, niveau: t.niveau ?? a.niveau,
    freq: t.freq ?? a.freq, sem: t.sem ?? a.sem, reeval: t.reeval ?? a.reeval,
    lieu: t.lieu || "HEP"
  };
}

/* ---------- Hypothèses et proposition ---------- */

/** Hypothèses retenues (Synthèse), sinon les mieux orientées par l'entretien. [{ reg, k, label }] */
export function hypotheses(S, K, B){
  const regs = B.bilanRegions(S), out = [];
  const retenues = S.c?.hyp || [];
  regs.forEach(reg => {
    const H = K.REG[reg]?.H || {};
    Object.entries(H).forEach(([k, label]) => { if(retenues.includes(label)) out.push({ reg, k, label, retenue:true }); });
  });
  if(out.length) return out;
  regs.forEach(reg => {
    const o = B.orientation(S, reg);
    if(o[0] && o[0].score > 0) out.push({ reg, k:o[0].k, label:o[0].label, retenue:false });
  });
  return out;
}

/** Tout ce que le bilan propose : axes, à éviter, avis, modèles, pathologies de la bibliothèque. */
export function proposition(S, K, B){
  const TX = K.TX || { HYP:{}, REGION:{}, MOTIF:{}, PROFIL:{} };
  const hyps = hypotheses(S, K, B);
  const p = profil(S);
  const post = isPostOp(S);
  const regs = B.bilanRegions(S);
  const motifs = S.c?.patho || [];
  const axes = [], eviter = [], avis = [], modeles = [], autres = [], pathos = [];

  hyps.forEach(h => {
    const t = TX.HYP[h.reg + ":" + h.k];
    if(!t) return;
    axes.push(...(t.axes || []));
    eviter.push(...(t.eviter || []));
    if(t.avis) avis.push(t.avis);
    if(post) modeles.push(...(t.postop || []));
    modeles.push(...(t.modeles || []));
    if(t.patho) pathos.push(t.patho);
  });
  motifs.forEach(m => {
    const t = TX.MOTIF[m];
    if(!t) return;
    modeles.push(...(t.modeles || []));
    if(t.patho) pathos.push(t.patho);
  });
  regs.forEach(reg => {
    const r = TX.REGION[reg];
    if(!r) return;
    if(post) autres.push(...(r.postop || []));
    autres.push(...(r.modeles || []));
  });

  /* Profil : axes communs */
  if(p.irrit === "Élevée") axes.push(...(TX.PROFIL.irritHaute || []));
  if(p.phase === "Chronique") axes.push(...(TX.PROFIL.chronique || []));
  if((S.q?.jaunes || []).length >= 2) axes.push(...(TX.PROFIL.jaunes || []));
  const rf = Object.values(S.cl || {}).some(c => (c.s || []).length);
  const zones = uniq(regs.map(r => TX.REGION[r]?.zone));

  return {
    hyps, profil:p, post, rf, rfTexte: TX.PROFIL.rf,
    axes: uniq(axes), eviter: uniq(eviter), avis: uniq(avis),
    modeles: uniq(modeles), autres: uniq(autres).filter(n => !modeles.includes(n)),
    pathos: uniq(pathos), zones
  };
}

/* ---------- Modèles ---------- */

/** Cherche les modèles par nom, pour un lieu donné ; renvoie un groupe par nom avec ses niveaux. */
export function modelesPour(noms, tous, lieu){
  return noms.map(nom => {
    const items = tous.filter(m => norm(m.nom) === norm(nom))
      .filter(m => !lieu || m.lieu === lieu || m.lieu === "MIXTE" || !m.lieu)
      .sort((a, b) => (b.mine - a.mine) || ((a.niveau || 0) - (b.niveau || 0)));
    return items.length ? { nom, items } : null;
  }).filter(Boolean);
}

/** Le niveau le plus proche de celui proposé (de préférence en dessous). */
export function choisirNiveau(items, niveau){
  const exact = items.find(m => (m.niveau || 1) === niveau);
  if(exact) return exact;
  const dessous = items.filter(m => (m.niveau || 1) < niveau).pop();
  return dessous || items[0];
}

/* ---------- Programme sur mesure (bibliothèque) ---------- */

const QUOTAS = {
  1: [["Mobilité", 2], ["Isométrique", 2], ["Étirement", 1], ["Renforcement", 1]],
  2: [["Mobilité", 1], ["Renforcement", 3], ["Contrôle moteur", 1], ["Étirement", 1]],
  3: [["Renforcement", 3], ["Équilibre et proprioception", 1], ["Gainage", 1], ["Étirement", 1]]
};
const DOSAGE = { 1: { reps:2, ex:30, repos:15 }, 2: { reps:3, ex:40, repos:15 }, 3: { reps:3, ex:45, repos:20 } };

/* Petit générateur pseudo-aléatoire reproductible : « Autre proposition » change la graine */
function rng(seed){ let x = (seed * 9301 + 49297) % 233280 || 1; return () => (x = (x * 9301 + 49297) % 233280) / 233280; }

/**
 * Compose 6 exercices adaptés : pathologie de la bibliothèque d'abord, puis la zone,
 * répartis par type selon le niveau (protection → charge progressive).
 * lib : bibliothèque classée (e.zone, e.types, e.pathos) ; visible(e) : exercice non masqué.
 */
export function composer(lib, { pathos = [], zones = [], lieu = "HEP", niveau = 2, seed = 1, n = 6, visible = () => true, postop = false }){
  const src = lieu === "CABINET" ? "CABINET" : "HEP";
  /* Hors post-opératoire : pas d'exercices de marche avec aides ni propres aux suites d'opération */
  const postOnly = e => /b[ée]quille|d[ée]ambulateur|canne|post-?op/i.test(e.nom || "") || ((e.pathos || []).includes("Post-opératoire") && !(e.pathos || []).some(p => pathos.includes(p)));
  /* Exercices en piscine : jamais proposés d'office */
  const eau = e => /dans l'eau|piscine|aquatique|en bassin/i.test(e.nom || "");
  const ok = lib.filter(e => e.source === src && e.image && visible(e) && !eau(e) && (postop || !postOnly(e)));
  const rand = rng(seed);
  const score = e => {
    let s = 0;
    if(e.pathos?.some(p => pathos.includes(p))) s += 10;
    if(zones.includes(e.zone)) s += 4;
    s -= Math.abs((e.niveau || 2) - niveau) * 2;
    return s + rand() * 3;
  };
  let pool = ok.filter(e => e.pathos?.some(p => pathos.includes(p)) || zones.includes(e.zone));
  if(pool.length < n) pool = pool.concat(ok.filter(e => !pool.includes(e) && zones.includes(e.zone)));
  pool = pool.map(e => ({ e, s: score(e) })).sort((a, b) => b.s - a.s).map(x => x.e);

  const pris = [], noms = new Set();
  const prendre = e => { const k = norm(e.nom); if(noms.has(k)) return false; noms.add(k); pris.push(e); return true; };
  (QUOTAS[niveau] || QUOTAS[2]).forEach(([type, q]) => {
    let c = 0;
    for(const e of pool){ if(c >= q || pris.length >= n) break; if(!pris.includes(e) && (e.types || []).includes(type) && prendre(e)) c++; }
  });
  for(const e of pool){ if(pris.length >= n) break; if(!pris.includes(e)) prendre(e); }
  return pris;
}

export const dosage = niveau => DOSAGE[niveau] || DOSAGE[2];

/* ---------- Texte pour le résumé et le PDF ---------- */

export function lignesPlan(S, K, B){
  if(!S.tx?.init) return [];
  const p = profil(S);
  const t = S.tx;
  return [
    ["Profil", [p.phase ? `phase ${p.phase.toLowerCase()}` : "", `irritabilité ${p.irrit.toLowerCase()}`].filter(Boolean).join(", ")],
    ["Axes de traitement", (t.axes || []).join(" ; ")],
    ["Rythme", `${p.freq} séance${p.freq > 1 ? "s" : ""} par semaine pendant ${p.sem} semaines`],
    ["Réévaluation", `bilan intermédiaire dans ${p.reeval} semaines`],
    ["Programme d'exercices", t.prog ? `${t.prog.nom}${t.prog.src === "sur-mesure" ? " (composé sur mesure)" : ""}` : ""]
  ];
}
