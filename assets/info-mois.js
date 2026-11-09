/* =========================================================
   L'info kiné du mois
   ---------------------------------------------------------
   Les fiches conseils qui ont une affiche (fournies ou vos versions).
   Chaque mois, une affiche apparaît sur l'accueil de tous les patients :
   soit celle choisie dans Réglages du cabinet, soit la suivante dans
   l'ordre (rotation automatique, une par mois).
   Réglage : settings.infoMois = { active, choix }  (choix = "" → rotation)
   ========================================================= */

import { CONSEILS_FOURNIS, mergeConseils } from "./conseils-data.js";

/** Affiches disponibles, dans l'ordre de la rotation. */
export function affiches(perso = []){
  return mergeConseils(perso).filter(c => c.affiche && !c.masque);
}

/** Identifiant à donner au patient (la fiche d'origine si c'est votre version). */
export const idFiche = c => c.remplace || c.id;

/** Affiche de la rotation pour un mois donné (une par mois, dans l'ordre). */
export function rotation(liste, date = new Date()){
  if(!liste.length) return null;
  const n = date.getFullYear() * 12 + date.getMonth();
  return liste[n % liste.length];
}

/** Affiche du mois selon le réglage, ou null si désactivée. */
export function afficheDuMois(liste, reglage = {}, date = new Date()){
  if(reglage?.active === false || !liste.length) return null;
  const choisie = reglage?.choix ? liste.find(c => idFiche(c) === reglage.choix || c.id === reglage.choix) : null;
  return choisie || rotation(liste, date);
}

export const NOM_MOIS = (date = new Date()) => date.toLocaleDateString("fr-FR", { month:"long" });
export { CONSEILS_FOURNIS };
