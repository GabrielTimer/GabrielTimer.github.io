/* Encouragements du patient : paliers de séances (avec un mot du kiné), série de jours,
   objectif de la semaine. Calculés à partir des séances du patient, rien n'est enregistré à part.
   Pour modifier un mot du kiné : changer le texte dans PALIERS. */

const DAY = 86400000;
const jour = t => { const d = new Date(t); d.setHours(0, 0, 0, 0); return d.getTime(); };

/* [nombre de séances faites, mot du kiné] */
export const PALIERS = [
  [1, "Première séance faite : le plus dur, c'est de commencer. Bravo !"],
  [5, "5 séances ! Votre corps commence déjà à s'adapter. Continuez comme ça."],
  [10, "10 séances : la régularité, c'est exactement ce qui fait la différence."],
  [20, "20 séances, quelle constance ! Les progrès se construisent séance après séance."],
  [30, "30 séances : vous faites partie des patients les plus réguliers. Chapeau."],
  [50, "50 séances ! Ces exercices font maintenant partie de votre routine : gardez-la."],
  [75, "75 séances. Impressionnant : votre investissement paie."],
  [100, "100 séances ! Un vrai cap. Merci pour votre confiance et votre persévérance."]
];

export const faites = seances => seances.filter(s => s.terminee && s.dateValidation);

/** Palier atteint exactement par la dernière séance (ou null). */
export function palierAtteint(seances){
  const n = faites(seances).length;
  const p = PALIERS.find(([k]) => k === n);
  return p ? { n, mot: p[1] } : null;
}

/** Jours d'affilée avec au moins une séance faite (jusqu'à aujourd'hui ou hier). */
export function serieJours(seances){
  const jours = new Set(faites(seances).map(s => jour(s.dateValidation)));
  let d = jour(Date.now());
  if(!jours.has(d)) d -= DAY;
  let n = 0;
  while(jours.has(d)){ n++; d -= DAY; }
  return n;
}

/** Séances prévues cette semaine (lundi → dimanche) : { prevues, faites } ou null si rien de prévu. */
export function objectifSemaine(seances){
  const lundi = jour(Date.now()) - ((new Date().getDay() + 6) % 7) * DAY, fin = lundi + 7 * DAY;
  const dans = s => { const t = s.datePrevue ? new Date(s.datePrevue).getTime() : NaN; return t >= lundi && t < fin; };
  const prev = seances.filter(dans);
  if(!prev.length) return null;
  return { prevues: prev.length, faites: prev.filter(s => s.terminee).length };
}

/** Petit bloc de l'accueil patient : objectif de la semaine + série de jours. */
export function blocAccueilHTML(seances, { esc, icon }){
  const o = objectifSemaine(seances), sj = serieJours(seances);
  if(!o && sj < 2) return "";
  const pct = o ? Math.round(o.faites / o.prevues * 100) : 0;
  const fini = o && o.faites >= o.prevues;
  return `<section class="section panel tight" style="display:flex;flex-direction:column;gap:10px">
    ${o ? `<div><div style="display:flex;justify-content:space-between;gap:10px;font-weight:800"><span>${icon("target")} Objectif de la semaine</span><span>${o.faites} / ${o.prevues}</span></div>
      <div style="height:10px;border-radius:6px;background:var(--surface-3);margin-top:6px;overflow:hidden"><div style="height:100%;width:${pct}%;background:${fini ? "var(--ok)" : "var(--lagon)"};border-radius:6px"></div></div>
      <div class="small muted" style="margin-top:4px">${fini ? "Objectif atteint, bravo !" : `Encore ${o.prevues - o.faites} séance${o.prevues - o.faites > 1 ? "s" : ""} prévue${o.prevues - o.faites > 1 ? "s" : ""} cette semaine.`}</div></div>` : ""}
    ${sj >= 2 ? `<div style="font-weight:700">${icon("zap")} ${sj} jours d'affilée avec une séance. ${esc(sj >= 7 ? "Une semaine entière, superbe !" : "Belle série, continuez !")}</div>` : ""}
  </section>`;
}
