/* =========================================================
   Programmes inutilisés : supprimés après 4 semaines sans activité
   ---------------------------------------------------------
   Activité = séance faite par le patient, programme créé ou modifié
   par le kiné, ou « Garder » choisi par le kiné.
   - à 3 semaines : alerte au kiné (Garder / Supprimer / Ne jamais supprimer)
     et message au patient ;
   - à 4 semaines : le programme part dans la corbeille (30 jours pour
     le restaurer), par la tâche automatique .github/scripts/nettoyage-programmes.mjs.
   patient.garderProgrammes = { [programmeId]: date du « Garder » | "toujours" }
   ========================================================= */

export const JOURS_SUPPRESSION = 28;
export const JOURS_ALERTE = 21;
export const JOURS_CORBEILLE = 30;
/* Mise en route de la règle (5 nov. 2026) : l'inactivité ne compte qu'à partir de cette date,
   pour que les anciens programmes ne partent pas tous d'un coup sans alerte. */
export const DEBUT_REGLE = Date.UTC(2026, 10, 5);
const DAY = 86400000;

/** Date de la dernière activité d'un programme (ms), ou null s'il ne doit jamais être supprimé. */
export function derniereActivite(prog, patient){
  const garder = patient?.garderProgrammes?.[prog.id];
  if(garder === "toujours") return null;
  let t = Math.max(Number(garder) || 0, DEBUT_REGLE);
  (prog.seances || []).forEach(s => { t = Math.max(t, s.dateValidation || 0, s.updatedAt || 0, s.createdAt || 0); });
  /* En pause ou pas encore commencé (prochaine séance dans le futur) : l'inactivité ne compte qu'à partir de la reprise */
  const prochaine = Math.min(...(prog.seances || []).filter(s => !s.terminee && s.datePrevue).map(s => new Date(s.datePrevue).getTime()).filter(Number.isFinite));
  if(Number.isFinite(prochaine)) t = Math.max(t, Math.min(Date.now(), prochaine));
  return t;
}

/** { jamais, jours (sans activité), reste (jours avant suppression), alerte } */
export function etatSuppression(prog, patient, now = Date.now()){
  const t = derniereActivite(prog, patient);
  if(t === null) return { jamais: patient?.garderProgrammes?.[prog.id] === "toujours", jours: 0, reste: null, alerte: false };
  const jours = Math.floor((now - t) / DAY);
  const reste = Math.max(0, JOURS_SUPPRESSION - jours);
  return { jamais: false, jours, reste, alerte: jours >= JOURS_ALERTE };
}

export const resteTexte = r => r <= 0 ? "aujourd'hui" : r === 1 ? "demain" : `dans ${r} jours`;
