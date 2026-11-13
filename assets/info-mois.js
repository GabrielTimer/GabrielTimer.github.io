/* =========================================================
   L'info kiné du mois
   ---------------------------------------------------------
   Les fiches conseils qui ont une affiche (fournies ou vos versions).
   Chaque mois, une affiche apparaît sur l'accueil de tous les patients :
   soit celle choisie dans Réglages du cabinet, soit la suivante dans
   l'ordre (rotation automatique, une par mois).
   Une affiche avec un mois de campagne (moisAuto 1-12, ex. Octobre rose → 10)
   passe d'elle-même ce mois-là, avant la rotation.
   Réglage : settings.infoMois = { active, choix }  (choix = "" → automatique)
   ========================================================= */

import { CONSEILS_FOURNIS, mergeConseils } from "./conseils-data.js";

/** Affiches disponibles, dans l'ordre de la rotation. */
export function affiches(perso = []){
  return mergeConseils(perso).filter(c => c.affiche && !c.masque && !c.fichePatho);   // les fiches par pathologie ne tournent pas
}

/** Identifiant à donner au patient (la fiche d'origine si c'est votre version). */
export const idFiche = c => c.remplace || c.id;

/** Affiche automatique d'un mois : affiche de campagne de ce mois, sinon rotation (une par mois, dans l'ordre). */
export function rotation(liste, date = new Date()){
  if(!liste.length) return null;
  const campagne = liste.find(c => Number(c.moisAuto) === date.getMonth() + 1);
  if(campagne) return campagne;
  const tour = liste.filter(c => !c.moisAuto);   // les affiches de campagne ne tournent pas le reste de l'année
  const l = tour.length ? tour : liste;
  const n = date.getFullYear() * 12 + date.getMonth();
  return l[n % l.length];
}
export const MOIS = ["janvier","février","mars","avril","mai","juin","juillet","août","septembre","octobre","novembre","décembre"];

/** Affiche du mois selon le réglage, ou null si désactivée. */
export function afficheDuMois(liste, reglage = {}, date = new Date()){
  if(reglage?.active === false || !liste.length) return null;
  const choisie = reglage?.choix ? liste.find(c => idFiche(c) === reglage.choix || c.id === reglage.choix) : null;
  return choisie || rotation(liste, date);
}

export const NOM_MOIS = (date = new Date()) => date.toLocaleDateString("fr-FR", { month:"long" });
export { CONSEILS_FOURNIS };
