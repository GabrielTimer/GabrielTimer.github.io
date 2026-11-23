/* Questionnaire « avant votre premier rendez-vous ».
   Le kiné l'active dans la fiche du patient (Avant la séance → Demander), puis envoie le lien
   d'accès habituel (SMS, e-mail). Le patient répond chez lui (page prebilan.html) ;
   les réponses vont dans patients/{clé}/suivis (type "prebilan") et un message prévient le kiné.
   Au bilan initial, les réponses aux questions fermées pré-remplissent l'entretien guidé :
   mêmes identifiants et mêmes réponses que bilan-kine/entretien.js (ENT.G). */

/* [id, question pour le patient, réponses (identiques à ENT.G), plusieurs réponses ?] */
export const FERMEES = [
  ["duree", "Depuis quand avez-vous ce problème ?", ["Moins d'1 semaine", "1 à 6 semaines", "6 semaines à 3 mois", "Plus de 3 mois"]],
  ["debut", "Comment est-ce arrivé ?", ["Traumatisme / accident", "Progressivement", "Après une opération", "Sans cause retrouvée"]],
  ["evol", "Depuis le début, c'est…", ["En amélioration", "Stable", "En aggravation", "Fluctuant"]],
  ["recid", "Avez-vous déjà eu ce problème ?", ["Non, première fois", "Oui, une fois", "Oui, récidives"]],
  ["imag", "Examens déjà réalisés", ["Aucun", "Radiographie", "Échographie", "IRM", "Scanner", "EMG"], true],
  ["ttt", "Déjà traité par…", ["Rien", "Médicaments", "Kinésithérapie", "Infiltration", "Ostéopathie", "Chirurgie"], true],
  ["horaire", "Quand avez-vous mal ?", ["À l'effort, mieux au repos", "Au repos aussi", "Réveils nocturnes", "Raideur le matin < 30 min", "Raideur le matin > 30 min"], true],
  ["irrad", "La douleur reste-t-elle sur place ?", ["Oui, localisée", "Irradie un peu autour", "Descend dans le bras ou la jambe"]],
  ["pares", "Avez-vous des fourmillements ou un engourdissement ?", ["Non", "Oui"]],
  ["soulag", "Qu'est-ce qui vous soulage ?", ["Repos", "Mouvement", "Chaleur", "Froid", "Médicaments", "Rien"], true],
  ["sommeil", "Votre sommeil", ["Normal", "Gêné par la douleur"]],
  ["avq", "Gêne dans la vie de tous les jours", ["Aucune", "Un peu", "Beaucoup", "Activités impossibles"]],
  ["travail", "Votre travail", ["Non concerné / retraité", "Travaille normalement", "Poste aménagé", "Arrêt de travail"]],
  ["sport", "Votre activité physique", ["Aucune", "Marche / loisir", "Sport régulier", "Compétition"]],
  ["aide", "Pour marcher", ["Sans aide", "1 canne", "2 cannes", "Déambulateur", "Au fauteuil", "Alité"]]
];

export const ZONES = ["Cou", "Haut du dos", "Bas du dos", "Épaule", "Coude", "Poignet ou main", "Hanche", "Genou", "Cheville ou pied", "Tête / vertiges", "Autre"];

/* Signes à signaler : le kiné les voit en premier */
export const SIGNES = [
  "Fièvre ou frissons",
  "Perte de poids sans raison",
  "Douleur la nuit qui ne se calme dans aucune position",
  "Faiblesse d'un bras ou d'une jambe",
  "Troubles pour uriner ou aller à la selle",
  "Engourdissement entre les jambes",
  "Antécédent de cancer"
];

export const TEXTES = [
  ["motif", "Pourquoi venez-vous ? En quelques mots", "Ex. : douleur au genou droit depuis une chute au ski"],
  ["objectif", "Qu'aimeriez-vous pouvoir refaire grâce aux séances ?", "Ex. : jardiner, porter mes petits-enfants, reprendre la course"],
  ["atcd", "Opérations ou problèmes de santé importants", ""],
  ["medic", "Médicaments pris en ce moment", ""]
];

/** Résumé lisible (message au kiné, fiche patient). */
export function resume(d = {}){
  const L = [];
  if(d.t?.motif) L.push(`Motif : ${d.t.motif}`);
  if(d.zones?.length) L.push(`Zones : ${d.zones.join(", ")}`);
  if(d.eva !== undefined && d.eva !== null && d.eva !== "") L.push(`Douleur habituelle : ${d.eva}/10${d.evaMax !== undefined && d.evaMax !== "" ? ` (la pire : ${d.evaMax}/10)` : ""}`);
  const sig = (d.signes || []).filter(x => x !== "Aucun");
  L.push(sig.length ? `⚠ Signes signalés : ${sig.join(", ")}` : "Signes à signaler : aucun");
  FERMEES.forEach(([id, q]) => { const v = d.q?.[id]; if(v && (!Array.isArray(v) || v.length)) L.push(`${q} ${Array.isArray(v) ? v.join(", ") : v}`); });
  if(d.t?.objectif) L.push(`Objectif : ${d.t.objectif}`);
  if(d.t?.atcd) L.push(`Antécédents : ${d.t.atcd}`);
  if(d.t?.medic) L.push(`Médicaments : ${d.t.medic}`);
  return L.join("\n");
}

/** Pré-remplit l'entretien du bilan (seulement les questions encore sans réponse). Renvoie le nombre de réponses reprises. */
export function preremplir(S, d){
  if(!d?.q) return 0;
  S.q = S.q || {};
  let n = 0;
  FERMEES.forEach(([id, , opts, multi]) => {
    const v = d.q[id];
    if(v === undefined || S.q[id] !== undefined) return;
    if(multi){ const l = (Array.isArray(v) ? v : [v]).filter(x => opts.includes(x)); if(l.length){ S.q[id] = l; n++; } }
    else if(opts.includes(v)){ S.q[id] = v; n++; }
  });
  S.f = S.f || {};
  if(d.t?.atcd && !S.f.atcd){ S.f.atcd = d.t.atcd; n++; }
  if(d.t?.medic && !S.f.medic){ S.f.medic = d.t.medic; n++; }
  return n;
}
