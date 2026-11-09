/* =========================================================
   Programme marche : du déconditionnement total à 2 h de marche.
   ---------------------------------------------------------
   Le patient marche SANS l'application : elle l'aide au départ
   (ce qu'il fait aujourd'hui, encouragement, conseils) et il valide
   au retour (durée, douleur, ressenti). Le minuteur reste possible
   pour le fractionné (marche / pause).
   Un modèle « Programme marche » par niveau (14 niveaux), catégorie
   Prévention. Le passage au niveau suivant passe par l'évolution
   des programmes (« Trop facile » → validé par le kiné).
   ========================================================= */

export const MARCHE_ID = "MARCHE";
export const MARCHE_NOM = "Programme marche";

/* reps × ex minutes de marche, pause en minutes entre deux (0 = d'une traite) */
export const NIVEAUX = [
  { n:1,  reps:5, ex:1,   pause:1, titre:"Premiers pas",
    message:"Aujourd'hui, le but n'est pas d'aller loin : c'est de commencer. Cinq petites marches d'une minute, avec une pause à chaque fois. Dans le couloir, autour de la maison ou devant chez vous : tout compte.",
    astuce:"Gardez une chaise à portée de main pour vos pauses." },
  { n:2,  reps:5, ex:2,   pause:1, titre:"L'habitude s'installe",
    message:"Vous avez fait le plus difficile : démarrer. Les marches passent à deux minutes. Allez-y à votre rythme, sans chercher la vitesse.",
    astuce:"Toujours le même moment de la journée : l'habitude se prend plus vite." },
  { n:3,  reps:5, ex:3,   pause:1, titre:"Un quart d'heure en tout",
    message:"Trois minutes à chaque fois, et déjà un quart d'heure de marche au total. Votre corps s'adapte un peu plus à chaque sortie.",
    astuce:"Choisissez un parcours plat, avec un banc ou un muret pour les pauses." },
  { n:4,  reps:4, ex:5,   pause:1, titre:"Cinq minutes d'affilée",
    message:"Cinq minutes sans vous arrêter, quatre fois. Si vous pouvez parler en marchant, c'est la bonne allure.",
    astuce:"Faites une boucle près de chez vous : vous n'êtes jamais loin de la maison." },
  { n:5,  reps:3, ex:8,   pause:1, titre:"Vingt-quatre minutes",
    message:"Trois marches de huit minutes : près d'une demi-heure de marche. Vous êtes bien plus endurant qu'au premier jour.",
    astuce:"Pendant la pause, restez debout si vous le pouvez, ou asseyez-vous si besoin." },
  { n:6,  reps:2, ex:15,  pause:2, titre:"Deux fois un quart d'heure",
    message:"Deux marches de quinze minutes : la demi-heure est à portée. Prenez votre pause sans culpabiliser, elle fait partie du programme.",
    astuce:"Allongez un peu votre parcours habituel, ou essayez-en un nouveau." },
  { n:7,  reps:1, ex:30,  pause:0, titre:"Trente minutes d'une traite",
    message:"Le cap est là : trente minutes sans vous arrêter. C'est la durée que recommandent les médecins pour la santé. Bravo d'être arrivé jusqu'ici.",
    astuce:"Si c'est trop long aujourd'hui, faites une petite pause à mi-parcours : ce n'est pas un échec." },
  { n:8,  reps:1, ex:40,  pause:0, titre:"Quarante minutes",
    message:"Dix minutes de plus que la dernière fois. À ce stade, la marche devient un vrai moment pour vous.",
    astuce:"Variez les parcours : un peu de dénivelé doux, un chemin, un parc." },
  { n:9,  reps:1, ex:50,  pause:0, titre:"Cinquante minutes",
    message:"Presque une heure. Vous marchez aujourd'hui ce qui vous paraissait impossible au début.",
    astuce:"Emportez de l'eau, surtout s'il fait chaud." },
  { n:10, reps:1, ex:60,  pause:0, titre:"Une heure de marche",
    message:"Une heure ! C'est un vrai objectif atteint. Prenez le temps d'en être fier.",
    astuce:"Marchez avec quelqu'un : la conversation fait passer le temps." },
  { n:11, reps:1, ex:75,  pause:0, titre:"Une heure et quart",
    message:"Vous allez au-delà de l'heure. Gardez une allure confortable : l'endurance se construit sans forcer.",
    astuce:"Prévoyez un petit encas si vous partez en fin de matinée ou d'après-midi." },
  { n:12, reps:1, ex:90,  pause:0, titre:"Une heure et demie",
    message:"Une heure trente : c'est une vraie randonnée. Écoutez vos pieds et vos genoux, et ralentissez si besoin.",
    astuce:"De bonnes chaussures de marche et des chaussettes sans couture évitent les ampoules." },
  { n:13, reps:1, ex:105, pause:0, titre:"Presque deux heures",
    message:"Encore un palier. Vous avez maintenant la forme pour de belles balades en famille ou entre amis.",
    astuce:"Une courte pause pour boire à mi-chemin est tout à fait permise." },
  { n:14, reps:1, ex:120, pause:0, titre:"Deux heures de marche",
    message:"Deux heures : le sommet du programme. Le plus important maintenant, c'est de garder ce plaisir de marcher, semaine après semaine.",
    astuce:"Pour entretenir : 3 à 5 marches par semaine, dont une longue." }
];

/* Messages tournants, choisis d'après le numéro de la séance */
export const AVANT = [
  "Chaque pas compte. Aujourd'hui encore, vous faites du bien à votre cœur, vos muscles et votre moral.",
  "Pas besoin d'aller vite : l'important, c'est d'y aller.",
  "Dix minutes de marche valent toujours mieux que zéro.",
  "Vous n'avez pas besoin d'être motivé pour commencer : la motivation vient souvent en marchant.",
  "Profitez du trajet : l'air, la lumière, les gens que vous croisez.",
  "Votre seul adversaire, c'est le canapé. Et vous allez gagner.",
  "Vos progrès ne se voient pas d'un jour à l'autre, mais semaine après semaine ils sont bien là.",
  "Respirez, regardez autour de vous, et allez à votre rythme."
];
export const APRES = [
  "Bravo, c'est fait !",
  "Une marche de plus au compteur. Bien joué !",
  "Vous l'avez fait : soyez-en fier.",
  "Encore un pas vers votre objectif. Bravo !",
  "Votre corps vous dit merci.",
  "Bel effort aujourd'hui !"
];

export const CONSEILS = {
  avant: [
    "Des chaussures confortables et une tenue adaptée à la météo.",
    "Un peu d'eau, et votre téléphone sur vous.",
    "Au début, un parcours plat, avec des endroits pour vous asseoir."
  ],
  pendant: [
    "La bonne allure : vous pouvez parler, mais pas chanter.",
    "Un essoufflement léger à modéré, c'est normal et c'est ce qui fait progresser.",
    "Si une douleur augmente nettement, ralentissez ou faites une pause."
  ],
  stop: [
    "Douleur ou serrement dans la poitrine",
    "Malaise, vertige ou sueurs inhabituelles",
    "Essoufflement anormal qui ne passe pas au repos, ou palpitations"
  ],
  sansEnvie: "Jour sans envie ? Faites seulement la première partie. Souvent l'envie revient en route, et sinon, c'est déjà ça de pris. Une marche manquée n'efface rien : reprenez simplement à la prochaine."
};

/* ---------- Modèles ---------- */

const consignes = [
  "Marchez à une allure confortable, où vous pouvez encore parler.",
  "Entre deux marches, faites votre pause (debout, ou assis si besoin), puis repartez.",
  "Vous pouvez marcher dehors ou à l'intérieur, selon la météo et votre forme."
];

export function exoMarche(N){
  return {
    id: MARCHE_ID, source: "HEP", marche: true, type: "timer",
    nom: "Marche",
    image: "/exercises/images/cabinet/marche.png",
    position: "Debout, dehors ou à l'intérieur",
    consignes,
    conseil: consignes.join("<br>"),
    reps: N.reps, ex: N.ex * 60, repos: N.pause * 60,
    conseil_kine: N.message
  };
}

export const MODELES_MARCHE = NIVEAUX.map(N => ({
  id: `base_marche_${N.n}`, nom: MARCHE_NOM, niveau: N.n,
  categorie: "prevention", zoneLabel: "Corps entier", series: 1,
  exercices: [exoMarche(N)]
}));

/* ---------- Côté patient ---------- */

/** La séance est-elle une marche ? */
export const estMarche = data => (data?.exercices || []).some(e => e.marche || e.id === MARCHE_ID);
export const exoDe = data => (data?.exercices || []).find(e => e.marche || e.id === MARCHE_ID) || null;

/** Niveau d'après l'origine ou le nom (« Programme marche, niveau 4 »). */
export function niveauDe(seance){
  const n = Number(seance?.origine?.niveau) || Number(String(seance?.programmeNom || seance?.data?.nom || "").match(/niveau\s*(\d+)/i)?.[1]);
  return NIVEAUX.find(x => x.n === n) || null;
}

const min = s => Math.round((Number(s) || 0) / 60);
const fmtMin = m => m >= 60 ? (m % 60 ? `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, "0")}` : `${m / 60} h`) : `${m} minute${m > 1 ? "s" : ""}`;
export { fmtMin };

/** Ce que le patient fait aujourd'hui, d'après l'exercice (le kiné a pu ajuster). */
export function planDuJour(exo, series = 1){
  const reps = Math.max(1, Number(exo?.reps) || 1) * Math.max(1, Number(series) || 1);
  const m = Math.max(1, min(exo?.ex));
  const p = min(exo?.repos);
  const total = reps * m;
  if(reps === 1) return { total, texte: `${fmtMin(m)} de marche, sans vous arrêter`, court: fmtMin(m) };
  return { total,
    texte: `${reps} fois ${fmtMin(m)} de marche${p ? `, avec ${fmtMin(p)} de pause entre chaque` : ""}`,
    court: `${reps} × ${m} min` };
}

export const choisir = (liste, i) => liste[Math.abs(Number(i) || 0) % liste.length];
