/* Tri des patients par nom de famille (et non par prénom).
   Le nom est saisi en un seul champ, en général « Prénom Nom » (« Marie Dupont », « Jean-Pierre Le Gall »).
   S'il commence par un mot en MAJUSCULES (« DUPONT Marie »), ce mot est pris comme nom de famille. */

const sansAccent = s => String(s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

export function nomDeFamille(nom){
  const mots = String(nom || "").trim().split(/[\s_]+/).filter(Boolean);
  if(mots.length < 2) return mots[0] || "";
  const majuscules = w => w.length > 1 && w === w.toUpperCase() && w !== w.toLowerCase();
  if(majuscules(mots[0]) && !majuscules(mots[mots.length - 1])){
    const i = mots.findIndex(w => !majuscules(w));
    return mots.slice(0, i).join(" ");
  }
  return mots.slice(1).join(" ");
}

/** Compare deux noms complets : d'abord le nom de famille, puis le nom complet (prénom). */
export function compareNoms(a, b){
  const na = typeof a === "string" ? a : a?.nom, nb = typeof b === "string" ? b : b?.nom;
  return sansAccent(nomDeFamille(na)).localeCompare(sansAccent(nomDeFamille(nb)), "fr")
    || sansAccent(na).localeCompare(sansAccent(nb), "fr");
}
