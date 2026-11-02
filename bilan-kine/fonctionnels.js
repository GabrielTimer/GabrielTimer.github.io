/* =====================================================================
   TESTS FONCTIONNELS DU BILAN — aucun code d'interface ici.
   TF : [id, nom (= clé de la fiche), unité, MID (0 = pas de seuil retenu), sens (1 = plus haut est mieux)]
   GUIDE_TF : fiche de chaque test.
     t = protocole, n = normes et seuils, v = vidéo de démonstration (chaîne indiquée en commentaire),
     src = références principales.
   Valeurs issues de la littérature : à confronter à votre pratique et à la population.
   ===================================================================== */
const TF=[
["tf_tug","Timed Up and Go (TUG)","s",0,-1],
["tf_6mwt","Test de marche de 6 minutes","m",30,1],
["tf_10mwt","Vitesse de marche sur 10 m","m/s",0.1,1],
["tf_5sts","5 assis-debout (5xSTS)","s",0,-1],
["tf_30sts","Assis-debout en 30 secondes","rép.",2,1],
["tf_sls","Appui unipodal yeux ouverts","s",0,1],
["tf_berg","Échelle de Berg","/56",0,1],
["tf_minibest","Mini-BESTest","/28",4,1],
["tf_dgi","Dynamic Gait Index (DGI)","/24",0,1],
["tf_tinetti","Test de Tinetti (POMA)","/28",0,1],
["tf_ybal","Y-Balance : score composite","%",0,1],
["tf_ybalasym","Y-Balance : asymétrie antérieure","cm",0,-1],
["tf_hop","Single hop test (LSI)","%",0,1],
["tf_triplehop","Triple hop test (LSI)","%",0,1],
["tf_wblt","Fente en charge (knee to wall)","cm",0,1],
["tf_grip","Force de préhension (dynamomètre)","kg",5,1]
];
const GUIDE_TF={
"Timed Up and Go (TUG)":{
 t:"Patient assis sur une chaise avec accoudoirs (≈ 46 cm), dos contre le dossier, chaussé, avec son aide technique habituelle. Au signal, il se lève, marche 3 m à vitesse habituelle et sûre, fait demi-tour, revient et s'assoit. Chronométrer du signal jusqu'au contact du dos avec le dossier. Un essai d'entraînement.",
 n:"≤ 10 s : mobilité normale chez la personne âgée autonome. ≥ 12 s : seuil de dépistage du risque de chute (CDC STEADI). ≥ 13,5 s : risque de chute accru chez la personne âgée vivant à domicile (Shumway-Cook 2000).",
 v:"https://www.youtube.com/watch?v=lAkVr5l7vOs", // The Chartered Society of Physiotherapy
 src:"Podsiadlo & Richardson 1991 ; Shumway-Cook et al. 2000 ; CDC STEADI"},
"Test de marche de 6 minutes":{
 t:"Couloir plat de 30 m balisé, demi-tours aux plots. Consigne : marcher le plus loin possible en 6 minutes, sans courir ; les pauses sont autorisées, le chrono continue. Encouragements standardisés chaque minute (recommandations ATS 2002). Noter la distance totale, la FC, la SpO2 et la dyspnée (Borg) avant et après.",
 n:"Adulte sain : environ 400 à 700 m selon l'âge, la taille et le sexe (équations d'Enright & Sherrill 1998). Changement cliniquement important : ≈ 14 à 30 m selon la population (Bohannon & Crouch 2017).",
 v:"https://www.youtube.com/watch?v=mUjohztAguw", // Filière de santé FAI²R (en français)
 src:"ATS 2002 ; Enright & Sherrill 1998 ; Bohannon & Crouch 2017"},
"Vitesse de marche sur 10 m":{
 t:"Parcours de 10 m avec 2 m d'accélération et 2 m de décélération : chronométrer uniquement les 6 m centraux. Vitesse confortable (et/ou maximale), 2 à 3 essais, moyenne. Vitesse = 6 ÷ temps (m/s). Noter l'aide technique.",
 n:"Après AVC : < 0,4 m/s déplacements à domicile ; 0,4 à 0,8 m/s déplacements limités à l'extérieur ; > 0,8 m/s déplacements extérieurs (Perry 1995). Personne âgée : < 0,8 m/s associé à un risque accru d'événements défavorables. Changement : ≈ 0,05 m/s petit, ≈ 0,10 m/s important (Perera 2006).",
 v:"https://www.youtube.com/watch?v=_kE-Nkx13TQ", // American Academy of Orthotists and Prosthetists
 src:"Perry et al. 1995 ; Perera et al. 2006"},
"5 assis-debout (5xSTS)":{
 t:"Chaise sans accoudoirs (≈ 43 à 45 cm) contre un mur, bras croisés sur la poitrine. Se lever complètement et se rasseoir 5 fois le plus vite possible. Chronométrer du signal jusqu'à la 5e position assise (préciser le protocole utilisé et le garder identique).",
 n:"Valeurs moyennes : 60–69 ans ≈ 11,4 s ; 70–79 ans ≈ 12,6 s ; 80–89 ans ≈ 14,8 s (Bohannon 2006). > 12 s : risque de chute accru chez la personne âgée (Tiedemann 2008). > 15 s : risque de chutes répétées (Buatois 2008).",
 v:"https://www.youtube.com/watch?v=_jPl-IuRJ5A", // American Academy of Orthotists and Prosthetists
 src:"Bohannon 2006 ; Tiedemann et al. 2008 ; Buatois et al. 2008"},
"Assis-debout en 30 secondes":{
 t:"Chaise sans accoudoirs (≈ 43 cm) contre un mur, bras croisés sur la poitrine. Compter le nombre de levers complets en 30 secondes. Un lever commencé à plus de mi-chemin à la fin du temps compte.",
 n:"Normes (Rikli & Jones) : 60–64 ans F 12–17, H 14–19 ; 65–69 ans F 11–16, H 12–18 ; 70–74 ans F 10–15, H 12–17 ; 75–79 ans F 10–15, H 11–17 ; 80–84 ans F 9–14, H 10–15. < 8 levers : faiblesse importante des membres inférieurs.",
 v:"https://www.youtube.com/watch?v=sxPJ8vBCCvk", // Measurement & Evaluation Techniques
 src:"Jones, Rikli & Beam 1999 ; Rikli & Jones 2013"},
"Appui unipodal yeux ouverts":{
 t:"Pieds nus, mains sur les hanches. Lever un pied sans que la jambe libre touche la jambe d'appui. Chronométrer jusqu'à la perte d'équilibre (pied posé, appui des mains, déplacement du pied d'appui), maximum 45 s. Meilleur de 3 essais, chaque côté.",
 n:"Moyennes (Springer 2007, yeux ouverts) : 18–39 ans ≈ 43 s ; 40–49 ans ≈ 40 s ; 50–59 ans ≈ 36 s ; 60–69 ans ≈ 25 s ; 70–79 ans ≈ 11 s ; 80 ans et plus ≈ 7 s. < 5 s : risque de chute accru chez la personne âgée (Vellas 1997).",
 v:"https://www.youtube.com/watch?v=HTVVv4ESgms", // National Stroke Association
 src:"Springer et al. 2007 ; Vellas et al. 1997"},
"Échelle de Berg":{
 t:"14 tâches d'équilibre statique et dynamique cotées de 0 à 4 (transferts, station debout sans appui, yeux fermés, pieds joints, se pencher, se retourner, pied sur un marchepied, tandem, unipodal…). Matériel : chronomètre, règle, marchepied, 2 chaises. Durée ≈ 15 à 20 min.",
 n:"Total /56. ≤ 45 : risque de chute accru (Berg 1992). < 40 : risque élevé. Variation minimale détectable ≈ 4 à 7 points selon le score de départ (Donoghue 2009).",
 v:"https://www.youtube.com/watch?v=OX1Ojheirek", // Dr. Galatea Strong, PT, DPT
 src:"Berg et al. 1992 ; Donoghue & Stokes 2009"},
"Mini-BESTest":{
 t:"14 items cotés de 0 à 2 en 4 domaines : ajustements anticipatoires, réactions posturales (poussées dans les 4 directions), orientation sensorielle (mousse, plan incliné, yeux fermés), marche dynamique (changements de vitesse, de direction, double tâche, TUG cognitif). Pour le côté le plus faible quand la tâche est unilatérale.",
 n:"Total /28. Changement cliniquement important ≈ 4 points (Godi 2013). Parkinson : ≤ 19 associé aux chutes (Leddy 2011).",
 v:"https://www.youtube.com/watch?v=CiZMkq4m9qs", // Jonathan Rodriguez
 src:"Franchignoni et al. 2010 ; Godi et al. 2013 ; Leddy et al. 2011"},
"Dynamic Gait Index (DGI)":{
 t:"8 tâches de marche cotées de 0 à 3 sur 6 m : marche normale, changement de vitesse, rotations de tête horizontales puis verticales, demi-tour et arrêt, enjamber un obstacle, contourner des obstacles, escaliers.",
 n:"Total /24. ≤ 19 : risque de chute accru (Shumway-Cook 1997). Très utilisé en rééducation vestibulaire, AVC, Parkinson, SEP.",
 v:"https://www.youtube.com/watch?v=eKDQEu5QOsc", // American Academy of Orthotists and Prosthetists
 src:"Shumway-Cook & Woollacott 1995 ; Shumway-Cook et al. 1997"},
"Test de Tinetti (POMA)":{
 t:"Partie équilibre (9 items, /16) : assis, se lever, équilibre debout, poussée sternale, yeux fermés, tour complet, s'asseoir. Partie marche (7 items, /12) : initiation, longueur et hauteur du pas, symétrie, continuité, trajectoire, tronc, écartement des pieds.",
 n:"Total /28. < 19 : risque de chute élevé ; 19 à 23 : risque modéré ; ≥ 24 : risque faible (Tinetti 1986).",
 v:"https://www.youtube.com/watch?v=unCgzLuQ02U", // HELHa (Haute École Louvain en Hainaut), en français
 src:"Tinetti 1986"},
"Y-Balance : score composite":{
 t:"Appui unipodal au centre du kit (ou de bandes au sol), pousser le plus loin possible le curseur avec le pied libre dans 3 directions : antérieure, postéro-médiale, postéro-latérale, sans prendre appui. 3 essais par direction, meilleur retenu. Score composite = (ANT + PM + PL) ÷ (3 × longueur du membre inférieur) × 100. Longueur : épine iliaque antéro-supérieure à la malléole médiale.",
 n:"Composite < 94 % associé à un risque de blessure accru chez des basketteuses (Plisky 2006). Comparer au côté sain et suivre l'évolution.",
 v:"https://www.youtube.com/watch?v=Dyl0oEknmnw", // Physiotutors
 src:"Plisky et al. 2006 ; Plisky et al. 2009"},
"Y-Balance : asymétrie antérieure":{
 t:"Différence (en cm) entre côté droit et côté gauche dans la direction antérieure du Y-Balance (meilleur essai de chaque côté).",
 n:"Asymétrie ≥ 4 cm associée à un risque de blessure des membres inférieurs accru (Plisky 2006).",
 v:"https://www.youtube.com/watch?v=Dyl0oEknmnw", // Physiotutors
 src:"Plisky et al. 2006"},
"Single hop test (LSI)":{
 t:"Sauter le plus loin possible sur une jambe et se réceptionner sur la même jambe, stable 2 s. 1 essai d'entraînement puis 2 à 3 essais par côté. LSI = moyenne côté atteint ÷ moyenne côté sain × 100.",
 n:"LSI ≥ 90 % : critère habituellement retenu pour la reprise du sport (reconstruction du LCA), à associer aux autres critères (force, questionnaires, ACL-RSI).",
 v:"https://www.youtube.com/watch?v=FX9tNjrW2RI", // Sportsmetrics ACL Injury Prevention
 src:"Noyes et al. 1991 ; Grindem et al. 2016"},
"Triple hop test (LSI)":{
 t:"Trois sauts consécutifs sur la même jambe, le plus loin possible, réception stable. 2 à 3 essais par côté. LSI = moyenne côté atteint ÷ moyenne côté sain × 100.",
 n:"LSI ≥ 90 % : critère habituellement retenu pour la reprise du sport, avec les autres hop tests.",
 v:"https://www.youtube.com/watch?v=2JgKSPO95Hc", // Sportsmetrics ACL Injury Prevention
 src:"Noyes et al. 1991"},
"Fente en charge (knee to wall)":{
 t:"Fente face au mur, pied testé en avant, talon au sol, genou dans l'axe du 2e orteil. Avancer le pied jusqu'à la distance maximale où le genou touche encore le mur sans décoller le talon. Mesurer la distance gros orteil – mur (cm). Chaque côté.",
 n:"Fiabilité excellente (Bennell 1998). Interpréter surtout par comparaison au côté sain et dans le temps (entorse, tendinopathie d'Achille, reprise de course).",
 v:"https://www.youtube.com/watch?v=G-Fq5ocF2GM", // KPD sport (en français)
 src:"Bennell et al. 1998"},
"Force de préhension (dynamomètre)":{
 t:"Dynamomètre type Jamar, poignée en position 2. Assis, épaule en adduction, coude à 90°, avant-bras et poignet en position neutre. 3 essais par main, encouragement standard, moyenne (ou meilleur essai, à préciser). Protocole ASHT.",
 n:"Faiblesse musculaire (sarcopénie) : < 27 kg chez l'homme, < 16 kg chez la femme (EWGSOP2 2019). Comparer aux normes par âge et sexe. Changement cliniquement important ≈ 5 à 6,5 kg (Bohannon 2019).",
 v:"https://www.youtube.com/watch?v=XJ4TcueMfRg", // Measurement & Evaluation Techniques
 src:"Fess (ASHT) 1992 ; Cruz-Jentoft et al. 2019 ; Bohannon 2019"}
};
