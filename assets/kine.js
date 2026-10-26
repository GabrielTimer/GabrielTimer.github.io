/* =========================================================
   Outils de l'espace kiné : suivi des patients et alertes
   ========================================================= */

import { currentKine } from "./cloud.js";
import { groupProgrammes, startOfDay, evaTrend, kineHint } from "./app.js";

/** À appeler en haut de chaque page réservée au kiné. */
export async function requireKine(){
  const user = await currentKine().catch(() => null);
  if(!user){
    kineHint.set(false);
    location.replace("/login.html?next=" + encodeURIComponent(location.pathname + location.search));
    throw new Error("redirect");
  }
  kineHint.set(true);
  return user;
}

const DAY = 86400000;

/** Résumé de suivi d'un patient : progression, douleur, alertes. */
export function summarize(patient, seances){
  const { programmes, seules } = groupProgrammes(seances);
  const actif = programmes.find(p => !p.termine) || null;
  const today = startOfDay(new Date());
  const valides = seances.filter(s => s.terminee && s.dateValidation).sort((a, b) => a.dateValidation - b.dateValidation);
  const derniere = valides[valides.length - 1] || null;
  const evas = valides.filter(s => s.eva !== null && s.eva !== undefined && s.eva !== "").map(s => Number(s.eva)).filter(n => !Number.isNaN(n));
  const lastEva = evas.length ? evas[evas.length - 1] : null;
  const trend = evaTrend(evas);
  const retard = (actif ? actif.seances : []).filter(s => !s.terminee && s.datePrevue && new Date(s.datePrevue) < today).length;
  const joursSans = derniere ? Math.floor((Date.now() - derniere.dateValidation) / DAY) : null;
  const commentaires = valides.filter(s => s.commentaire).slice(-5).reverse();

  const alertes = [];
  if(lastEva !== null && lastEva >= 7 && derniere && Date.now() - derniere.dateValidation < 14 * DAY){
    alertes.push({ niveau:"danger", ico:"alert", texte:`Douleur forte : ${lastEva}/10` });
  }
  if(trend && trend.delta >= 2){
    alertes.push({ niveau:"warn", ico:"trendUp", texte:"Douleur en hausse" });
  }
  if(derniere && derniere.ressenti === "trop_dur" && Date.now() - derniere.dateValidation < 14 * DAY){
    alertes.push({ niveau:"warn", ico:"flag", texte:"Séance jugée trop dure" });
  }
  if(retard >= 2){
    alertes.push({ niveau:"warn", ico:"clock", texte:`${retard} séances en retard` });
  }else if(actif && joursSans !== null && joursSans >= 10 && retard >= 1){
    alertes.push({ niveau:"warn", ico:"clock", texte:`Pas de séance depuis ${joursSans} jours` });
  }
  const recentComment = commentaires.find(s => Date.now() - s.dateValidation < 7 * DAY);
  if(recentComment){
    alertes.push({ niveau:"info", ico:"message", texte:"Nouveau commentaire" });
  }
  const termineRecent = programmes.find(p => p.termine && Date.now() - p.updatedAt < 10 * DAY);
  if(termineRecent){
    alertes.push({ niveau:"ok", ico:"checkCircle", texte:"Programme terminé" });
  }

  const score = alertes.reduce((a, x) => a + ({ danger:100, warn:20, info:5, ok:2 }[x.niveau] || 0), 0);
  return {
    patient, seances, programmes, seules, actif, derniere, evas, lastEva, trend,
    retard, joursSans, commentaires, alertes, score
  };
}

/** Résumés de tous les patients à partir de toutes les séances. */
export function summarizeAll(patients, seances){
  const byCle = new Map(patients.map(p => [p.cle, []]));
  seances.forEach(s => {
    if(!s.data || !Array.isArray(s.data.exercices)) return;
    if(byCle.has(s.cle)) byCle.get(s.cle).push(s);
  });
  return patients.map(p => summarize(p, byCle.get(p.cle) || []));
}

/** Activité récente : dernières séances validées, tous patients confondus. */
export function recentActivity(patients, seances, limit = 8){
  const noms = new Map(patients.map(p => [p.cle, p]));
  return seances.filter(s => s.terminee && s.dateValidation && noms.has(s.cle))
    .sort((a, b) => b.dateValidation - a.dateValidation)
    .slice(0, limit)
    .map(s => ({ seance: s, patient: noms.get(s.cle) }));
}
