/* =========================================================
   Atlas neurologique : racines (dermatomes, myotomes) et
   nerfs périphériques (territoires sensitifs, muscles).
   ---------------------------------------------------------
   Les territoires sont dessinés pour la moitié gauche du
   schéma (x < 100, repère 200 × 414 de assets/bodychart.js)
   et recopiés en symétrie. Ce sont des repères cliniques
   approximatifs : il existe une grande variabilité entre les
   personnes et entre les cartes publiées.
   Repères des points clés et muscles clés : classification
   ISNCSCI (ASIA). Myotomes et réflexes : sémiologie classique.
   ========================================================= */

/* ---------- Racines ---------- */
export const ROOTS = {
  C2: { sens: "Région occipitale.", point: "Protubérance occipitale, à au moins 1 cm de la ligne médiane.", mvt: "Flexion de la tête (avec C1).", muscles: "Muscles profonds du cou." },
  C3: { sens: "Cou, région sous-mandibulaire.", point: "Fosse supra-claviculaire, sur la ligne médio-claviculaire.", mvt: "Inclinaison latérale du cou.", muscles: "Muscles du cou, diaphragme (C3-C5)." },
  C4: { sens: "« Pèlerine » : base du cou, haut des épaules, région claviculaire.", point: "Sommet de l'articulation acromio-claviculaire.", mvt: "Élévation des épaules (haussement).", muscles: "Trapèze supérieur, élévateur de la scapula, diaphragme." },
  C5: { sens: "Face latérale du bras (moignon de l'épaule, région deltoïdienne).", point: "Côté latéral de la fosse cubitale (pli du coude).", mvt: "Abduction de l'épaule ; flexion du coude.", muscles: "Deltoïde, biceps brachial (muscle clé ASIA : fléchisseurs du coude), coiffe des rotateurs.", reflexe: "Bicipital (C5-C6)." },
  C6: { sens: "Face latérale de l'avant-bras, pouce (et index).", point: "Face dorsale de la première phalange du pouce.", mvt: "Extension du poignet ; flexion du coude.", muscles: "Long et court extenseurs radiaux du carpe (muscle clé ASIA : extenseurs du poignet), brachio-radial.", reflexe: "Stylo-radial (C5-C6)." },
  C7: { sens: "Majeur, face postérieure de l'avant-bras (partie médiane).", point: "Face dorsale de la première phalange du majeur.", mvt: "Extension du coude ; flexion du poignet ; extension des doigts.", muscles: "Triceps brachial (muscle clé ASIA : extenseurs du coude), fléchisseurs du poignet.", reflexe: "Tricipital (C7)." },
  C8: { sens: "Bord médial de l'avant-bras et de la main, auriculaire.", point: "Face dorsale de la première phalange de l'auriculaire.", mvt: "Flexion des doigts (prise) ; extension du pouce.", muscles: "Fléchisseur profond des doigts (muscle clé ASIA : fléchisseur profond du majeur)." },
  T1: { sens: "Face médiale du bras, jusqu'au coude.", point: "Côté médial de la fosse cubitale, juste au-dessus de l'épicondyle médial.", mvt: "Abduction et adduction des doigts.", muscles: "Interosseux, abducteur du 5e doigt (muscle clé ASIA)." },
  T2: { sens: "Creux axillaire, haut de la face médiale du bras, haut du thorax.", point: "Sommet du creux axillaire.", mvt: "—", muscles: "Muscles intercostaux." },
  T3: { sens: "Bande thoracique au niveau du 3e espace intercostal.", point: "3e espace intercostal, ligne médio-claviculaire.", muscles: "Muscles intercostaux." },
  T4: { sens: "Bande thoracique passant par les mamelons.", point: "4e espace intercostal (ligne mamelonnaire).", muscles: "Muscles intercostaux." },
  T5: { sens: "Bande thoracique sous les mamelons.", point: "5e espace intercostal, ligne médio-claviculaire.", muscles: "Muscles intercostaux." },
  T6: { sens: "Bande au niveau de l'appendice xiphoïde.", point: "Niveau de l'appendice xiphoïde.", muscles: "Intercostaux, partie haute des abdominaux." },
  T7: { sens: "Bande sous-xiphoïdienne.", point: "Ligne médio-claviculaire, à mi-chemin entre T6 et T8.", muscles: "Intercostaux, abdominaux." },
  T8: { sens: "Bande épigastrique.", point: "Ligne médio-claviculaire, à mi-chemin entre T6 et T10.", muscles: "Abdominaux.", reflexe: "Cutané abdominal supérieur (T7-T9)." },
  T9: { sens: "Bande épigastrique basse.", point: "Ligne médio-claviculaire, à mi-chemin entre T8 et T10.", muscles: "Abdominaux." },
  T10: { sens: "Bande passant par l'ombilic.", point: "Ombilic.", muscles: "Abdominaux.", reflexe: "Cutané abdominal moyen (T9-T11)." },
  T11: { sens: "Bande sous-ombilicale.", point: "Ligne médio-claviculaire, à mi-chemin entre T10 et T12.", muscles: "Abdominaux.", reflexe: "Cutané abdominal inférieur (T11-T12)." },
  T12: { sens: "Bande sus-inguinale.", point: "Milieu du ligament inguinal.", muscles: "Abdominaux, carré des lombes." },
  L1: { sens: "Pli inguinal, haut de la face antéro-médiale de la cuisse.", point: "À mi-distance entre T12 et L2.", mvt: "Flexion de la hanche (avec L2).", muscles: "Ilio-psoas.", reflexe: "Crémastérien (L1-L2)." },
  L2: { sens: "Face antérieure et médiale du haut de la cuisse.", point: "Face antéro-médiale de la cuisse, à mi-hauteur.", mvt: "Flexion de la hanche.", muscles: "Ilio-psoas (muscle clé ASIA : fléchisseurs de hanche), adducteurs." },
  L3: { sens: "Bas de la cuisse, face antérieure et médiale du genou.", point: "Condyle fémoral médial, au-dessus du genou.", mvt: "Extension du genou.", muscles: "Quadriceps (muscle clé ASIA : extenseurs du genou), adducteurs.", reflexe: "Rotulien (L3-L4)." },
  L4: { sens: "Face médiale de la jambe, malléole médiale, bord médial du pied.", point: "Malléole médiale.", mvt: "Flexion dorsale de la cheville.", muscles: "Tibial antérieur (muscle clé ASIA : fléchisseurs dorsaux de cheville), quadriceps.", reflexe: "Rotulien (L3-L4)." },
  L5: { sens: "Face latérale de la jambe, dos du pied, gros orteil.", point: "Dos du pied, au niveau de la 3e articulation métatarso-phalangienne.", mvt: "Extension du gros orteil ; abduction de hanche.", muscles: "Long extenseur de l'hallux (muscle clé ASIA), moyen fessier, ischio-jambiers médiaux.", reflexe: "Médio-plantaire, ischio-jambiers médiaux (peu fiables)." },
  S1: { sens: "Bord latéral du pied, 5e orteil, talon, plante ; face postéro-latérale du mollet.", point: "Face latérale du talon (calcanéus).", mvt: "Flexion plantaire de la cheville ; éversion.", muscles: "Triceps sural (muscle clé ASIA : fléchisseurs plantaires), fibulaires, grand fessier.", reflexe: "Achilléen (S1)." },
  S2: { sens: "Face postérieure de la cuisse, creux poplité.", point: "Milieu du creux poplité.", mvt: "Flexion du genou ; flexion des orteils.", muscles: "Ischio-jambiers, fléchisseurs des orteils." },
  S3: { sens: "Partie médiale de la fesse, région ischiatique.", point: "Tubérosité ischiatique ou pli infra-fessier.", muscles: "Muscles du plancher pelvien." },
  "S4-S5": { sens: "Région périanale.", point: "Région périanale, à moins de 1 cm de la jonction cutanéo-muqueuse.", mvt: "Contraction volontaire du sphincter anal.", muscles: "Sphincter anal externe, plancher pelvien.", reflexe: "Bulbo-caverneux, anal (S2-S4)." }
};
export const ROOT_ORDER = Object.keys(ROOTS);

/* ---------- Nerfs ---------- */
export const NERVES = {
  /* Tête et cou */
  v1: { nom: "Nerf ophtalmique (V1)", abbr: "V1", racines: "Nerf crânien V (trijumeau)", sens: "Front, paupière supérieure, dos du nez, cuir chevelu jusqu'au vertex.", motor: [], test: "Réflexe cornéen (afférence V1).", groupe: "tete" },
  v2: { nom: "Nerf maxillaire (V2)", abbr: "V2", racines: "Nerf crânien V (trijumeau)", sens: "Paupière inférieure, joue, aile du nez, lèvre supérieure.", motor: [], groupe: "tete" },
  v3: { nom: "Nerf mandibulaire (V3)", abbr: "V3", racines: "Nerf crânien V (trijumeau)", sens: "Menton, lèvre inférieure, région mandibulaire (sauf l'angle), tempe.", motor: ["Masséter", "Temporal", "Ptérygoïdiens"], test: "Serrer les dents : palper masséters et temporaux ; ouverture de la bouche.", reflexe: "Massétérin.", groupe: "tete" },
  facial: { nom: "Nerf facial (VII)", abbr: "VII", racines: "Nerf crânien VII", sens: "Petite zone de la conque de l'oreille.", motor: ["Muscles de la mimique (frontal, orbiculaires, zygomatiques…)", "Platysma"], test: "Plisser le front, fermer fort les yeux, sourire, gonfler les joues.", groupe: "tete", seulMoteur: true },
  accessoire: { nom: "Nerf accessoire (XI)", abbr: "XI", racines: "Nerf crânien XI (+ C2-C4)", sens: "—", motor: ["Trapèze", "Sterno-cléido-mastoïdien"], test: "Hausser les épaules contre résistance ; rotation de la tête contre résistance.", clinique: "Atteinte après chirurgie du triangle postérieur du cou : chute de l'épaule, scapula alata latérale.", groupe: "tete", seulMoteur: true },
  grandOccipital: { nom: "Nerf grand occipital (d'Arnold)", abbr: "GO", racines: "C2 (rameau dorsal)", sens: "Cuir chevelu de la région occipitale, jusqu'au vertex.", motor: [], clinique: "Névralgie d'Arnold : douleur occipitale en décharge, point douloureux à l'émergence.", groupe: "tete" },
  petitOccipital: { nom: "Nerf petit occipital", abbr: "PO", racines: "C2-C3 (plexus cervical)", sens: "Région rétro-auriculaire et occipitale latérale.", motor: [], groupe: "tete" },
  grandAuriculaire: { nom: "Nerf grand auriculaire", abbr: "GA", racines: "C2-C3 (plexus cervical)", sens: "Pavillon de l'oreille, angle de la mandibule, région parotidienne.", motor: [], groupe: "tete" },
  transverseCou: { nom: "Nerf transverse du cou", abbr: "TC", racines: "C2-C3 (plexus cervical)", sens: "Face antérieure et latérale du cou.", motor: [], groupe: "tete" },
  supraClav: { nom: "Nerfs supra-claviculaires", abbr: "SC", racines: "C3-C4 (plexus cervical)", sens: "Région claviculaire, haut du thorax, sommet de l'épaule.", motor: [], groupe: "tete" },
  phrenique: { nom: "Nerf phrénique", abbr: "Phr", racines: "C3-C5", sens: "— (sensibilité du diaphragme et de la plèvre : douleur projetée à l'épaule)", motor: ["Diaphragme"], test: "Ampliation abdominale à l'inspiration, toux, mesure de la capacité vitale.", groupe: "tete", seulMoteur: true },
  /* Ceinture scapulaire et membre supérieur */
  dorsalScap: { nom: "Nerf dorsal de la scapula", abbr: "DS", racines: "C5", sens: "—", motor: ["Rhomboïdes", "Élévateur de la scapula"], test: "Adduction de la scapula, main dans le dos poussée vers l'arrière.", groupe: "ms", seulMoteur: true },
  longThoracique: { nom: "Nerf long thoracique", abbr: "LT", racines: "C5-C7", sens: "—", motor: ["Dentelé antérieur"], test: "Pompes contre un mur : recherche d'une scapula alata (bord médial décollé).", clinique: "Atteinte fréquente après port de charges sur l'épaule ou chirurgie axillaire.", groupe: "ms", seulMoteur: true },
  supraScap: { nom: "Nerf supra-scapulaire", abbr: "SS", racines: "C5-C6", sens: "— (sensibilité articulaire de l'épaule)", motor: ["Supra-épineux", "Infra-épineux"], test: "Abduction initiale et rotation latérale contre résistance ; recherche d'une amyotrophie des fosses.", clinique: "Compression à l'incisure scapulaire ou spino-glénoïdale (sportifs de lancer, volleyeurs).", groupe: "ms", seulMoteur: true },
  thoracoDorsal: { nom: "Nerf thoraco-dorsal", abbr: "TD", racines: "C6-C8", sens: "—", motor: ["Grand dorsal"], test: "Adduction et extension de l'épaule contre résistance ; palper le grand dorsal à la toux.", groupe: "ms", seulMoteur: true },
  pectoraux: { nom: "Nerfs pectoraux médial et latéral", abbr: "Pec", racines: "C5-T1", sens: "—", motor: ["Grand pectoral", "Petit pectoral"], test: "Adduction horizontale contre résistance (mains jointes, pousser).", groupe: "ms", seulMoteur: true },
  axillaire: { nom: "Nerf axillaire", abbr: "Ax", racines: "C5-C6", sens: "Moignon de l'épaule (zone du « badge régimentaire ») par le nerf cutané latéral supérieur du bras.", motor: ["Deltoïde", "Petit rond"], test: "Abduction de l'épaule à 90° contre résistance ; rotation latérale.", clinique: "Atteinte après luxation antérieure d'épaule ou fracture du col chirurgical de l'humérus : vérifier la sensibilité du badge.", groupe: "ms" },
  musculoCutane: { nom: "Nerf musculo-cutané", abbr: "MC", racines: "C5-C7", sens: "Face latérale de l'avant-bras (nerf cutané latéral de l'avant-bras).", motor: ["Biceps brachial", "Brachial", "Coraco-brachial"], test: "Flexion du coude avant-bras en supination contre résistance.", reflexe: "Bicipital (C5-C6).", groupe: "ms" },
  radial: { nom: "Nerf radial", abbr: "Rad", racines: "C5-T1", sens: "Faces postérieures du bras et de l'avant-bras (nerfs cutanés postérieurs), partie inférieure de la face latérale du bras, dos de la main côté radial (branche superficielle : premier espace dorsal).", motor: ["Triceps brachial", "Anconé", "Brachio-radial", "Long et court extenseurs radiaux du carpe", "Supinateur", "Extenseurs des doigts", "Extenseur ulnaire du carpe", "Long abducteur, court et long extenseurs du pouce"], test: "Extension du coude, du poignet et des métacarpo-phalangiennes ; extension du pouce.", reflexe: "Tricipital (C7), stylo-radial (C5-C6).", clinique: "Paralysie « du samedi soir » ou fracture de la diaphyse humérale : main tombante. Branche profonde (nerf interosseux postérieur) : doigts tombants sans main tombante ni trouble sensitif.", groupe: "ms" },
  median: { nom: "Nerf médian", abbr: "Méd", racines: "C6-T1", sens: "Paume côté radial, face palmaire des 3 premiers doigts et de la moitié radiale de l'annulaire, extrémités dorsales de ces doigts.", motor: ["Rond et carré pronateurs", "Fléchisseur radial du carpe", "Long palmaire", "Fléchisseur superficiel des doigts", "Fléchisseur profond des doigts II-III", "Long fléchisseur du pouce", "Court abducteur et opposant du pouce", "Lombricaux 1-2"], test: "Opposition et abduction palmaire du pouce ; signe du « OK » (pince pouce-index arrondie, nerf interosseux antérieur).", clinique: "Syndrome du canal carpien : paresthésies nocturnes des 3 premiers doigts, tests de Phalen et de Tinel, amyotrophie thénarienne tardive.", groupe: "ms" },
  ulnaire: { nom: "Nerf ulnaire", abbr: "Uln", racines: "C8-T1", sens: "Bord ulnaire de la main, auriculaire et moitié ulnaire de l'annulaire (faces palmaire et dorsale).", motor: ["Fléchisseur ulnaire du carpe", "Fléchisseur profond des doigts IV-V", "Muscles hypothénariens", "Interosseux", "Lombricaux 3-4", "Adducteur du pouce"], test: "Écartement et rapprochement des doigts contre résistance ; signe de Froment (pince pouce-index).", clinique: "Compression au coude (gouttière épitrochléo-olécranienne) ou au poignet (canal de Guyon) : paresthésies des 4e-5e doigts, griffe ulnaire, amyotrophie des interosseux.", groupe: "ms" },
  cutMedBras: { nom: "Nerf cutané médial du bras et nerf intercosto-brachial", abbr: "CMB", racines: "C8-T2", sens: "Face médiale du bras et creux axillaire.", motor: [], clinique: "Zone parfois hypoesthésique après curage axillaire.", groupe: "ms" },
  cutMedAvBras: { nom: "Nerf cutané médial de l'avant-bras", abbr: "CMA", racines: "C8-T1", sens: "Face médiale de l'avant-bras.", motor: [], groupe: "ms" },
  /* Tronc */
  intercostaux: { nom: "Nerfs intercostaux", abbr: "IC", racines: "T2-T11", sens: "Bandes du thorax et de l'abdomen, chacune correspondant à sa racine (rameaux cutanés latéraux et antérieurs).", motor: ["Muscles intercostaux", "Muscles abdominaux (T7-T11)"], test: "Toux, ampliation thoracique ; signe de Beevor (déplacement de l'ombilic lors du relevé de buste).", clinique: "Névralgie intercostale, zona (éruption sur une bande), douleur post-thoracotomie.", groupe: "tronc" },
  subcostal: { nom: "Nerf subcostal", abbr: "SCo", racines: "T12", sens: "Bande sous-ombilicale basse et région de la crête iliaque.", motor: ["Partie basse des abdominaux"], groupe: "tronc" },
  rameauxDorsaux: { nom: "Rameaux dorsaux des nerfs spinaux", abbr: "RD", racines: "C4-L3 (selon l'étage)", sens: "Peau du dos de part et d'autre de la colonne, étage par étage.", motor: ["Muscles érecteurs du rachis", "Multifides"], groupe: "tronc" },
  /* Membre inférieur */
  iliohypogastrique: { nom: "Nerf ilio-hypogastrique", abbr: "IH", racines: "T12-L1", sens: "Région sus-pubienne, partie latérale de la fesse.", motor: ["Transverse et oblique interne (partie basse)"], clinique: "Douleur après chirurgie de la paroi abdominale basse (incision de Pfannenstiel).", groupe: "mi" },
  ilioinguinal: { nom: "Nerf ilio-inguinal", abbr: "II", racines: "L1", sens: "Haut de la face médiale de la cuisse, racine des organes génitaux externes.", motor: ["Transverse et oblique interne (partie basse)"], clinique: "Douleur inguinale après cure de hernie.", groupe: "mi" },
  genitofemoral: { nom: "Nerf génito-fémoral", abbr: "GF", racines: "L1-L2", sens: "Petite zone de la face antérieure de la cuisse sous le ligament inguinal (branche fémorale) ; organes génitaux externes (branche génitale).", motor: ["Crémaster"], reflexe: "Crémastérien (L1-L2).", groupe: "mi" },
  cutLatCuisse: { nom: "Nerf cutané latéral de la cuisse", abbr: "CLC", racines: "L2-L3", sens: "Face antéro-latérale de la cuisse.", motor: [], clinique: "Méralgie paresthésique : brûlures et engourdissement de la face latérale de la cuisse (ceinture serrée, grossesse, surpoids), sans déficit moteur.", groupe: "mi" },
  femoral: { nom: "Nerf fémoral", abbr: "Fém", racines: "L2-L4", sens: "Faces antérieure et médiale de la cuisse (rameaux cutanés antérieurs) ; se prolonge par le nerf saphène.", motor: ["Ilio-psoas (en partie)", "Quadriceps", "Sartorius", "Pectiné"], test: "Extension du genou contre résistance ; montée d'une marche, accroupissement.", reflexe: "Rotulien (L3-L4).", clinique: "Atteinte après hématome du psoas ou chirurgie de hanche : genou qui se dérobe, réflexe rotulien diminué.", groupe: "mi" },
  saphene: { nom: "Nerf saphène", abbr: "Sa", racines: "L3-L4 (branche du fémoral)", sens: "Face médiale du genou (rameau infra-patellaire), de la jambe et du bord médial du pied.", motor: [], clinique: "Hypoesthésie sous la rotule après arthroscopie ou prélèvement du tendon de la patte d'oie.", groupe: "mi" },
  obturateur: { nom: "Nerf obturateur", abbr: "Obt", racines: "L2-L4", sens: "Partie moyenne de la face médiale de la cuisse.", motor: ["Long, court et grand adducteurs", "Gracile", "Obturateur externe"], test: "Adduction de la hanche contre résistance.", clinique: "Douleur de la face médiale de la cuisse (accouchement, chirurgie pelvienne, sportifs).", groupe: "mi" },
  gluteoSup: { nom: "Nerf glutéal supérieur", abbr: "GS", racines: "L4-S1", sens: "—", motor: ["Moyen et petit fessiers", "Tenseur du fascia lata"], test: "Abduction de hanche en décubitus latéral ; appui unipodal (signe de Trendelenburg).", groupe: "mi", seulMoteur: true },
  gluteoInf: { nom: "Nerf glutéal inférieur", abbr: "GI", racines: "L5-S2", sens: "—", motor: ["Grand fessier"], test: "Extension de hanche genou fléchi, en procubitus ; se relever d'une chaise sans les mains.", groupe: "mi", seulMoteur: true },
  sciatique: { nom: "Nerf sciatique", abbr: "Sci", racines: "L4-S3", sens: "Par ses branches tibiale et fibulaire commune : presque toute la jambe et le pied, sauf la face médiale (saphène).", motor: ["Ischio-jambiers", "Grand adducteur (partie ischiatique)", "Tous les muscles de la jambe et du pied (par ses branches)"], test: "Flexion du genou contre résistance ; puis tests des branches tibiale et fibulaire.", clinique: "Atteinte après luxation postérieure ou chirurgie de hanche, injection fessière, syndrome du piriforme (discuté).", groupe: "mi", seulMoteur: true },
  cutPostCuisse: { nom: "Nerf cutané postérieur de la cuisse", abbr: "CPC", racines: "S1-S3", sens: "Face postérieure de la cuisse et creux poplité ; bas de la fesse (nerfs cluniaux inférieurs).", motor: [], groupe: "mi" },
  cluniauxSup: { nom: "Nerfs cluniaux supérieurs", abbr: "ClS", racines: "L1-L3 (rameaux dorsaux)", sens: "Partie haute de la fesse, sous la crête iliaque.", motor: [], clinique: "Leur compression sur la crête iliaque peut mimer une lombalgie basse ou une sciatalgie.", groupe: "mi" },
  cluniauxMoy: { nom: "Nerfs cluniaux moyens", abbr: "ClM", racines: "S1-S3 (rameaux dorsaux)", sens: "Partie médiale de la fesse, sur le sacrum.", motor: [], groupe: "mi" },
  fibulaireCommun: { nom: "Nerf fibulaire commun (cutané latéral sural)", abbr: "FC", racines: "L4-S2", sens: "Face latérale du tiers supérieur de la jambe ; puis territoires des branches superficielle et profonde.", motor: ["Chef court du biceps fémoral (avant sa division)", "Muscles des loges latérale et antérieure (par ses branches)"], test: "Flexion dorsale et éversion de la cheville ; extension des orteils.", clinique: "Compression au col de la fibula (jambes croisées, plâtre, perte de poids) : pied tombant, steppage, hypoesthésie du dos du pied.", groupe: "mi" },
  fibulaireSup: { nom: "Nerf fibulaire superficiel", abbr: "FS", racines: "L4-S1", sens: "Face antéro-latérale du bas de la jambe et dos du pied (sauf le 1er espace).", motor: ["Long et court fibulaires"], test: "Éversion du pied contre résistance.", clinique: "Atteinte possible lors des entorses de cheville en inversion.", groupe: "mi" },
  fibulaireProf: { nom: "Nerf fibulaire profond", abbr: "FP", racines: "L4-L5", sens: "Premier espace interdigital dorsal (entre le gros orteil et le 2e orteil).", motor: ["Tibial antérieur", "Long extenseur de l'hallux", "Long extenseur des orteils", "Troisième fibulaire", "Court extenseur des orteils"], test: "Flexion dorsale de la cheville ; extension du gros orteil.", clinique: "Syndrome de loge antérieure, chaussures serrées (syndrome du tunnel tarsien antérieur).", groupe: "mi" },
  tibial: { nom: "Nerf tibial", abbr: "Tib", racines: "L4-S3", sens: "Talon (rameaux calcanéens médiaux) et plante du pied (nerfs plantaires médial et latéral).", motor: ["Triceps sural", "Poplité", "Tibial postérieur", "Long fléchisseur des orteils", "Long fléchisseur de l'hallux", "Muscles plantaires du pied"], test: "Flexion plantaire (montée sur la pointe des pieds), inversion ; flexion des orteils.", reflexe: "Achilléen (S1).", clinique: "Syndrome du tunnel tarsien : brûlures et paresthésies plantaires, Tinel rétro-malléolaire médial.", groupe: "mi" },
  sural: { nom: "Nerf sural", abbr: "Sur", racines: "S1-S2", sens: "Face postéro-latérale du bas de la jambe, bord latéral du pied et du 5e orteil.", motor: [], clinique: "Lésion possible après chirurgie du tendon d'Achille ou entorse ; souvent prélevé pour les biopsies nerveuses.", groupe: "mi" },
  pudendal: { nom: "Nerf pudendal", abbr: "Pud", racines: "S2-S4", sens: "Périnée, organes génitaux externes, région anale.", motor: ["Sphincter anal externe", "Sphincter de l'urètre", "Muscles du périnée"], test: "Contraction volontaire du sphincter anal ; testing périnéal.", reflexe: "Bulbo-caverneux, anal.", clinique: "Névralgie pudendale : douleur périnéale aggravée en position assise. Toute atteinte sphinctérienne aiguë est une urgence (syndrome de la queue de cheval).", groupe: "mi", seulMoteur: true }
};

export const GROUPS = [["tete", "Tête et cou"], ["ms", "Membre supérieur"], ["tronc", "Tronc"], ["mi", "Membre inférieur"]];

/* ---------- Territoires dessinés (moitié gauche du schéma) ---------- */

const r = (x1, y1, x2, y2) => [[x1, y1], [x2, y1], [x2, y2], [x1, y2]];

/* Bandes thoraciques, de face et de dos */
const BANDS_FACE = { T2: [82, 96], T3: [96, 104], T4: [104, 113], T5: [113, 121], T6: [121, 129], T7: [129, 137], T8: [137, 145], T9: [145, 154], T10: [154, 166], T11: [166, 178] };
const BANDS_DOS = { T2: [80, 91], T3: [91, 101], T4: [101, 111], T5: [111, 120], T6: [120, 129], T7: [129, 138], T8: [138, 147], T9: [147, 156], T10: [156, 165], T11: [165, 174], T12: [174, 183] };

/* Ligne inguinale (de face) et lignes obliques de la cuisse */
const ING = [[66, 192], [78, 198], [88, 206], [96, 212], [100, 214]];
const OBL1 = [[100, 228], [90, 222], [78, 214], [62, 207]];
const OBL2 = [[100, 254], [80, 246], [58, 238]];
const OBL3 = [[100, 306], [84, 304], [58, 296]];

export const ROOT_TERR = {
  face: [
    { id: "C3", polys: [r(84, 49, 100, 64)] },
    { id: "C4", polys: [[[40, 62], [100, 62], [100, 82], [67, 82], [58, 86], [40, 86]]] },
    { id: "C5", polys: [[[20, 86], [58, 86], [62, 96], [56.5, 120], [51, 150], [20, 150]]] },
    { id: "T2", polys: [[[67, 82], [100, 82], [100, 96], [67, 96], [62, 96], [58, 86]], [[62, 96], [70, 96], [66, 118], [56.5, 120]]] },
    { id: "T1", polys: [[[56.5, 120], [70, 118], [64, 160], [51, 150]]] },
    { id: "C6", polys: [[[0, 150], [51, 150], [45, 182], [40, 212], [0, 212]], r(0, 212, 36, 262)] },
    { id: "C8", polys: [[[51, 150], [64, 158], [62, 212], [40, 212], [45, 182]], r(42, 212, 62, 262)] },
    { id: "C7", polys: [r(36, 212, 42, 262)] },
    ...["T3", "T4", "T5", "T6", "T7", "T8", "T9", "T10", "T11"].map(t => ({ id: t, polys: [r(66, BANDS_FACE[t][0], 100, BANDS_FACE[t][1])] })),
    { id: "T12", polys: [[[66, 178], [100, 178], ...ING.slice().reverse()]] },
    { id: "L1", polys: [[...ING, ...OBL1]] },
    { id: "L2", polys: [[...OBL1.slice().reverse(), ...OBL2]] },
    { id: "L3", polys: [[...OBL2.slice().reverse(), ...OBL3]] },
    { id: "L4", polys: [[[84, 304], [100, 306], [100, 414], [89, 414], [89, 398], [86, 384], [84, 340]]] },
    { id: "L5", polys: [[[52, 296], [84, 304], [84, 340], [86, 384], [89, 398], [89, 414], [79, 414], [79, 384], [52, 384]]] },
    { id: "S1", polys: [r(52, 384, 79, 414)] }
  ],
  dos: [
    { id: "C2", polys: [r(70, 0, 100, 47)] },
    { id: "C3", polys: [r(80, 47, 100, 60)] },
    { id: "C4", polys: [[[40, 60], [100, 60], [100, 80], [67, 80], [58, 86], [40, 86]]] },
    { id: "C5", polys: [[[20, 86], [58, 86], [62, 96], [56.5, 120], [51, 150], [20, 150]]] },
    { id: "T2", polys: [[[67, 80], [100, 80], [100, 91], [67, 91], [62, 96], [58, 86]], [[62, 96], [67, 91], [70, 96], [66, 118], [56.5, 120]]] },
    { id: "T1", polys: [[[56.5, 120], [70, 118], [64, 160], [51, 150]]] },
    { id: "C6", polys: [[[0, 150], [49, 150], [39.7, 212], [36, 212], [36, 262], [0, 262]]] },
    { id: "C7", polys: [[[49, 150], [53, 152], [43.3, 212], [42, 212], [42, 262], [36, 262], [36, 212], [39.7, 212]]] },
    { id: "C8", polys: [[[53, 152], [64, 158], [62, 212], [60, 262], [42, 262], [42, 212], [43.3, 212]]] },
    ...["T3", "T4", "T5", "T6", "T7", "T8", "T9", "T10", "T11", "T12"].map(t => ({ id: t, polys: [r(66, BANDS_DOS[t][0], 100, BANDS_DOS[t][1])] })),
    { id: "L1", polys: [r(64, 183, 100, 191)] },
    { id: "L2", polys: [[[60, 191], [100, 191], [100, 196], [84, 196], [84, 199], [60, 199]]] },
    { id: "L3", polys: [r(56, 199, 84, 222)] },
    { id: "S3", polys: [[[84, 196], [100, 196], [100, 207], [96, 207], [96, 224], [84, 224]]] },
    { id: "S4-S5", polys: [r(96, 207, 100, 224)] },
    { id: "S2", polys: [[[56, 222], [84, 222], [84, 224], [100, 224], [100, 318], [56, 318]]] },
    { id: "L5", polys: [r(52, 318, 74, 384)] },
    { id: "S1", polys: [[[74, 318], [88, 318], [88, 384], [100, 384], [100, 414], [52, 414], [52, 384], [74, 384]]] },
    { id: "L4", polys: [r(88, 318, 100, 384)] }
  ]
};

export const NERVE_TERR = {
  face: [
    { id: "v1", polys: [r(70, 0, 100, 29)] },
    { id: "v2", polys: [[[86, 29], [100, 29], [100, 39], [86, 39]]] },
    { id: "v3", polys: [[[86, 39], [100, 39], [100, 50], [88, 50]], [[78, 20], [86, 20], [86, 32], [78, 32]]] },
    { id: "grandAuriculaire", polys: [[[70, 32], [86, 32], [86, 39], [88, 50], [86, 54], [70, 54]]] },
    { id: "transverseCou", polys: [r(82, 50, 100, 64)] },
    { id: "supraClav", polys: [[[40, 62], [100, 62], [100, 84], [67, 84], [58, 88], [40, 88]]] },
    { id: "axillaire", polys: [[[20, 88], [58, 88], [60, 96], [56, 116], [20, 118]]] },
    { id: "radial", polys: [[[20, 118], [56, 116], [53, 140], [51, 150], [20, 150]]] },
    { id: "cutMedBras", polys: [[[58, 88], [67, 84], [70, 96], [70, 118], [64, 160], [51, 150], [53, 140], [56, 116], [60, 96]]] },
    { id: "musculoCutane", polys: [[[0, 150], [51, 150], [45, 182], [40, 212], [0, 212]]] },
    { id: "cutMedAvBras", polys: [[[51, 150], [64, 158], [62, 212], [40, 212], [45, 182]]] },
    { id: "median", polys: [r(0, 212, 41, 262)] },
    { id: "ulnaire", polys: [r(41, 212, 62, 262)] },
    ...["T2", "T3", "T4", "T5", "T6", "T7", "T8", "T9", "T10", "T11"].map(t => ({ id: "intercostaux", seg: t, polys: [r(66, Math.max(BANDS_FACE[t][0], t === "T2" ? 84 : 0), 100, BANDS_FACE[t][1])] })),
    { id: "subcostal", polys: [[[66, 178], [100, 178], [100, 188], [74, 188], [66, 186]]] },
    { id: "iliohypogastrique", polys: [[[66, 186], [74, 188], [100, 188], [100, 214], ...ING.slice(0, 4).reverse()]] },
    { id: "genitofemoral", polys: [[[78, 198], [88, 206], [90, 222], [78, 214]]] },
    { id: "ilioinguinal", polys: [[[88, 206], [96, 212], [100, 214], [100, 236], [92, 232], [90, 222]]] },
    { id: "cutLatCuisse", polys: [[[56, 192], [66, 192], [78, 198], [78, 214], [76, 240], [72, 280], [56, 280]]] },
    { id: "femoral", polys: [[[78, 214], [90, 222], [92, 232], [92, 280], [94, 300], [84, 304], [56, 296], [56, 280], [72, 280], [76, 240]]] },
    { id: "obturateur", polys: [[[92, 232], [100, 236], [100, 290], [94, 300], [92, 280]]] },
    { id: "saphene", polys: [[[94, 300], [100, 290], [100, 414], [92, 414], [90, 398], [87, 384], [85, 340], [84, 304]]] },
    { id: "fibulaireCommun", polys: [[[52, 296], [84, 304], [84, 336], [52, 336]]] },
    { id: "fibulaireSup", polys: [[[52, 336], [84, 336], [85, 340], [87, 384], [90, 398], [86, 400], [86, 414], [79, 414], [79, 384], [52, 384]]] },
    { id: "fibulaireProf", polys: [[[86, 400], [90, 398], [92, 414], [86, 414]]] },
    { id: "sural", polys: [r(52, 384, 79, 414)] }
  ],
  dos: [
    { id: "grandOccipital", polys: [r(88, 0, 100, 47)] },
    { id: "petitOccipital", polys: [r(70, 0, 88, 36)] },
    { id: "grandAuriculaire", polys: [r(70, 36, 88, 52)] },
    { id: "rameauxDorsaux", polys: [[[88, 47], [100, 47], [100, 191], [84, 191], [84, 60], [88, 60]]] },
    { id: "transverseCou", polys: [r(70, 47, 88, 60)] },
    { id: "supraClav", polys: [[[40, 60], [84, 60], [84, 80], [67, 80], [58, 86], [40, 86]]] },
    { id: "intercostaux", polys: [[[67, 80], [84, 80], [84, 176], [66, 176]]] },
    { id: "axillaire", polys: [[[20, 86], [58, 86], [60, 96], [56, 116], [20, 118]]] },
    { id: "radial", polys: [[[20, 118], [56, 116], [53, 140], [51, 150], [49, 150], [39.7, 212], [36, 212], [36, 238], [0, 238], [0, 150], [20, 150]]] },
    { id: "cutMedBras", polys: [[[58, 86], [67, 80], [70, 96], [70, 118], [64, 160], [53, 152], [51, 150], [53, 140], [56, 116], [60, 96]]] },
    { id: "radial", seg: "post", polys: [[[49, 150], [53, 152], [43.3, 212], [39.7, 212]]] },
    { id: "cutMedAvBras", polys: [[[53, 152], [64, 158], [62, 212], [43.3, 212]]] },
    { id: "median", polys: [r(0, 238, 41, 262)] },
    { id: "ulnaire", polys: [r(41, 212, 62, 262), r(36, 212, 41, 238)] },
    { id: "cluniauxSup", polys: [[[60, 176], [84, 176], [84, 191], [88, 191], [88, 200], [60, 200]]] },
    { id: "cluniauxMoy", polys: [[[88, 191], [100, 191], [100, 222], [88, 222]]] },
    { id: "cutPostCuisse", polys: [[[56, 200], [88, 200], [88, 222], [100, 222], [100, 318], [56, 318]]] },
    { id: "fibulaireCommun", polys: [r(52, 318, 76, 348)] },
    { id: "sural", polys: [[[52, 348], [76, 348], [76, 318], [86, 318], [86, 384], [80, 384], [80, 414], [52, 414]]] },
    { id: "saphene", polys: [r(86, 318, 100, 384)] },
    { id: "tibial", polys: [r(80, 384, 100, 414)] }
  ]
};

/* Couleurs : par racine (cervical → sacré) et par nerf (famille) */
const PAL = ["#5B8DEF", "#38B2AC", "#F2A541", "#E0607E", "#8E7CC3", "#4CAF7A", "#E8805A", "#3FA7D6", "#C77DBA", "#9BBF4B"];
export function rootColor(id){
  const i = ROOT_ORDER.indexOf(id);
  const fam = id[0];
  const base = { C: 210, T: 160, L: 30, S: 285 }[fam] ?? 0;
  const light = 58 + ((i % 3) * 9);
  return `hsl(${base + (i % 2) * 14} 62% ${light}%)`;
}
export function nerveColor(id){
  const keys = Object.keys(NERVES);
  return PAL[keys.indexOf(id) % PAL.length];
}

/** Résumé texte des constats (pour le bilan). */
export function neuroSummary(state = {}){
  const out = [];
  Object.entries(state).forEach(([k, v]) => {
    if(!v) return;
    const [layer, id, side] = k.split(":");
    const parts = [];
    if(v.sens?.length) parts.push(v.sens.join(", ").toLowerCase());
    if(v.mrc !== undefined && v.mrc !== null && v.mrc !== "") parts.push(`force ${v.mrc}/5`);
    if(v.reflexe && v.reflexe !== "Normal") parts.push(`réflexe ${v.reflexe.toLowerCase()}`);
    if(!parts.length) return;
    const name = layer === "nerf" ? (NERVES[id]?.nom || id) : `Racine ${id}`;
    out.push(`${name} ${side} : ${parts.join(", ")}`);
  });
  return out;
}

