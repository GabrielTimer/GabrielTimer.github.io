/* =====================================================================
   ENTRETIEN GUIDÉ DU BILAN — questions fermées (clics), aucun code d'interface.
   ---------------------------------------------------------------------
   G : questions générales. [id, étape, question, options, multiple?]
       étapes : "histoire", "douleur", "vie"
   REGQ : questions propres à une région (clés de REG dans data.js).
       [id, question, indices] ; indices = { HYPOTHÈSE: poids } : une réponse
       « Oui » oriente vers cette hypothèse. Orientation INDICATIVE tirée de
       l'interrogatoire (pas de LR) : elle sert à choisir les tests à faire.
   Pour ajouter une question : ajouter une ligne, rien d'autre à toucher.
   ===================================================================== */
const ENT = {
G: [
  ["duree", "histoire", "Depuis quand ?", ["Moins d'1 semaine", "1 à 6 semaines", "6 semaines à 3 mois", "Plus de 3 mois"]],
  ["debut", "histoire", "Comment est-ce arrivé ?", ["Traumatisme / accident", "Progressivement", "Après une opération", "Sans cause retrouvée"]],
  ["evol", "histoire", "Depuis le début, c'est…", ["En amélioration", "Stable", "En aggravation", "Fluctuant"]],
  ["recid", "histoire", "Déjà eu ce problème ?", ["Non, première fois", "Oui, une fois", "Oui, récidives"]],
  ["imag", "histoire", "Examens réalisés", ["Aucun", "Radiographie", "Échographie", "IRM", "Scanner", "EMG"], true],
  ["ttt", "histoire", "Déjà traité par…", ["Rien", "Médicaments", "Kinésithérapie", "Infiltration", "Ostéopathie", "Chirurgie"], true],

  ["horaire", "douleur", "Quand avez-vous mal ?", ["À l'effort, mieux au repos", "Au repos aussi", "Réveils nocturnes", "Raideur le matin < 30 min", "Raideur le matin > 30 min"], true],
  ["irrad", "douleur", "La douleur reste-t-elle sur place ?", ["Oui, localisée", "Irradie un peu autour", "Descend dans le bras ou la jambe"]],
  ["pares", "douleur", "Fourmillements ou engourdissement ?", ["Non", "Oui"]],
  ["soulag", "douleur", "Qu'est-ce qui soulage ?", ["Repos", "Mouvement", "Chaleur", "Froid", "Médicaments", "Rien"], true],

  ["sommeil", "vie", "Sommeil", ["Normal", "Gêné par la douleur"]],
  ["avq", "vie", "Gêne dans la vie quotidienne", ["Aucune", "Un peu", "Beaucoup", "Activités impossibles"]],
  ["travail", "vie", "Travail", ["Non concerné / retraité", "Travaille normalement", "Poste aménagé", "Arrêt de travail"]],
  ["metier", "vie", "Type d'activité professionnelle", ["Sédentaire / bureau", "Physique / port de charges", "Debout prolongé", "Gestes répétitifs", "Conduite"], true],
  ["sport", "vie", "Activité physique", ["Aucune", "Marche / loisir", "Sport régulier", "Compétition"]],
  ["jaunes", "vie", "Drapeaux jaunes (croyances, vécu)", ["Peur de bouger / d'aggraver", "Pense que c'est grave", "Stress / anxiété", "Moral bas", "Conflit ou insatisfaction au travail", "Attend un traitement passif"], true]
],

REGQ: {
  genou: [
    ["torsion", "Torsion avec le pied bloqué au sol (pivot)", { LCA:2, MEN:1 }],
    ["pop", "Craquement (« pop ») au moment de l'accident", { LCA:2 }],
    ["gonfl-rapide", "Gonflement rapide, dans les 2 heures", { LCA:2 }],
    ["gonfl-retard", "Gonflement le lendemain", { MEN:1 }],
    ["derob", "Dérobements, le genou « lâche »", { LCA:2 }],
    ["blocage", "Blocages vrais (genou coincé)", { MEN:2 }],
    ["escaliers", "Douleur aux escaliers, accroupi ou assis longtemps", { SFP:2 }],
    ["avant", "Douleur en avant du genou, autour de la rotule", { SFP:1 }],
    ["age45", "45 ans ou plus", { OA:1 }],
    ["effort", "Douleur à l'effort, raideur matinale courte (< 30 min)", { OA:2 }]
  ],
  epaule: [
    ["luxation", "Luxation ou traumatisme de l'épaule", { INS:2 }],
    ["deboite", "Sensation que l'épaule « se déboîte »", { INS:2 }],
    ["lever", "Douleur pour lever le bras au-dessus de l'épaule", { SA:1, RCD:1 }],
    ["nuit", "Douleur couché sur l'épaule", { RCD:1 }],
    ["faiblesse", "Faiblesse pour lever ou tourner le bras", { TF:2, RCD:1 }],
    ["age60", "60 ans ou plus", { TF:1 }],
    ["chute", "Chute sur le bras tendu", { TF:1 }],
    ["dos-main", "Difficulté pour mettre la main dans le dos", { SSC:1 }]
  ],
  lombes: [
    ["jambe", "Douleur de jambe plus forte que celle du dos", { RAD:2 }],
    ["sousgenou", "La douleur descend sous le genou", { RAD:1 }],
    ["toux", "Toux ou éternuement réveillent la douleur de jambe", { RAD:1 }],
    ["fourmi", "Fourmillements dans la jambe ou le pied", { RAD:1 }],
    ["marche", "Gêne à la marche, soulagée assis ou penché en avant", { STE:2 }],
    ["deuxjambes", "Les deux jambes sont touchées", { STE:1 }],
    ["age65", "65 ans ou plus", { STE:1 }]
  ],
  cerv: [
    ["bras", "Douleur ou fourmillements dans le bras", { RAD:2 }],
    ["faiblesse", "Faiblesse dans le bras ou la main", { RAD:1 }],
    ["cephalee", "Maux de tête partant de la nuque", { CEF:2 }],
    ["posture", "Maux de tête déclenchés par une posture ou un mouvement du cou", { CEF:1 }],
    ["vertige", "Vertiges, troubles de la vue ou de la parole associés", {}]
  ],
  chev: [
    ["inversion", "Entorse, pied tourné en dedans", { ATFL:2 }],
    ["repet", "Entorses à répétition, cheville instable", { ATFL:1 }],
    ["matin", "Douleur du tendon d'Achille aux premiers pas ou en début d'effort", { ACH:2 }],
    ["charge", "Augmentation récente de la course ou du sport", { ACH:1 }]
  ],
  hanche: [
    ["aine", "Douleur au pli de l'aine", { CFA:1, OA:1 }],
    ["cote", "Douleur sur le côté de la hanche", { GTPS:2 }],
    ["couche", "Douleur couché sur le côté", { GTPS:2 }],
    ["assis", "Douleur assis longtemps ou en flexion profonde", { CFA:2 }],
    ["age50", "50 ans ou plus", { OA:1 }],
    ["raideur", "Raideur matinale de moins d'une heure", { OA:1 }]
  ],
  coude: [
    ["externe", "Douleur sur la face externe du coude", { EPI:2 }],
    ["interne", "Douleur sur la face interne du coude", { EPT:2 }],
    ["serrer", "Douleur pour serrer, porter, serrer une main", { EPI:1, EPT:1 }],
    ["repetitif", "Gestes répétitifs (outil, souris, raquette)", { EPI:1, EPT:1 }]
  ],
  main: [
    ["3doigts", "Fourmillements du pouce, de l'index et du majeur", { CC:2 }],
    ["nuit", "Réveils la nuit avec fourmillements, soulagés en secouant la main", { CC:2 }],
    ["radial", "Douleur au bord du pouce, côté poignet", { DQ:2 }],
    ["bebe", "Port d'un nourrisson, période post-partum", { DQ:1 }],
    ["pince", "Douleur à la base du pouce pour pincer, ouvrir un bocal", { RHZ:2 }]
  ],
  vertiges: [
    ["couche", "Vertige rotatoire en se couchant ou en se tournant au lit", { VPPB:2 }],
    ["bref", "Crises brèves, moins d'une minute", { VPPB:2 }],
    ["continu", "Vertige continu plusieurs jours, après un épisode viral", { HYPO:2 }],
    ["tete", "Instabilité aggravée par les mouvements rapides de la tête", { HYPO:1 }]
  ]
}
};
