/* =====================================================================
   CONTENU CLINIQUE DU BILAN — aucun code d'interface ici.
   Pour AJOUTER UNE RÉGION :
   1. Ajouter ses zones cliquables dans Z (si besoin)
   2. Ajouter une entrée dans REG (H = hypothèses, S = signes, T = tests,
      RF = drapeaux rouges, P = pistes thérapeutiques par hypothèse)
      Les chiffres {HYP:2} = poids de l'item pour cette hypothèse.
   3. Ajouter une ligne dans MAPPING pour relier le nom de zone à la région
   ===================================================================== */
const ID=[["code","Code patient (initiales + année, sans nom)"],["nom","Nom"],["prenom","Prénom"],["naiss","Date de naissance"],["prof","Profession"]];
// Mesures : [id, libellé, MID, sens(1 = plus haut est mieux)] ; MID 0 = pas de seuil retenu
const MES=[["m_nprs","NPRS (0-10)",2,-1],["m_psfs","PSFS (0-10)",2,1],["m_odi","Oswestry (%)",11,-1],["m_ndi","NDI (%)",0,-1],["m_qdash","QuickDASH (%)",8,-1],["m_lefs","LEFS (/80)",9,1]];
const SEC=[
["patho","Pathologie / motif",["Lombalgie","Cervicalgie","Dorsalgie","Sciatique","Gonalgie","Entorse","Tendinopathie","Post-opératoire","Fracture","Trouble de l’équilibre"]],
["atcd","Antécédents",["HTA","Diabète","Cardiopathie","Chirurgie","Traumatisme","Asthme","Grossesse","Ostéoporose","Cancer"]],
["medic","Médication",["Anticoagulants","AINS","Antalgiques","Corticoïdes","Myorelaxants","Aucune"]],
["obs","Bilan observationnel",["Boiterie","Attitude antalgique","Raideur","Œdème","Contracture","Amplitude limitée","Force diminuée","Troubles sensitifs"]],
["obj","Objectifs",["Réduire la douleur","Récupérer la mobilité","Renforcement","Reprise du sport","Reprise du travail","Autonomie"]],
["plan","Traitement prévu",["Massage","Mobilisations","Renforcement","Étirements","Électrothérapie","Éducation","Exercices à domicile","2 séances/sem","3 séances/sem"]],
["dn4","DN4 — douleur neuropathique (≥ 4 sur 10)",["Brûlure","Sensation de froid douloureux","Décharges électriques","Fourmillements","Picotements","Engourdissement","Démangeaisons","Hypoesthésie au tact","Hypoesthésie à la piqûre","Douleur provoquée ou augmentée par le frottement"]]];
const TYPES=["Mécanique","Inflammatoire","Neuropathique","Nocturne","Irradiante"];
// zones : [nom,x,y,w,h,r] ; mid = centrées, side = moitié gauche du dessin
const Z={face:{mid:[["Tête",80,8,40,48,20],["Cou",91,58,18,20,7],["Thorax",68,80,64,60,10],["Abdomen",72,142,56,44,8]],
side:[["Épaule",44,80,24,28,12],["Bras",40,110,22,52,9],["Avant-bras",36,164,20,50,9],["Main",32,216,20,32,9],["Hanche",64,188,35,28,10],["Cuisse",64,218,35,70,12],["Genou",66,290,31,30,12],["Jambe",67,322,28,64,10],["Pied",62,388,34,22,9]],L:"D"},
dos:{mid:[["Occiput",80,8,40,48,20],["Cervicales",91,58,18,22,7],["Dorsales",68,82,64,56,10],["Lombaires",72,140,56,40,8]],
side:[["Épaule",44,80,24,28,12],["Bras",40,110,22,52,9],["Avant-bras",36,164,20,50,9],["Main",32,216,20,32,9],["Fessier",64,182,35,36,12],["Cuisse post.",64,220,35,68,12],["Creux poplité",66,290,31,28,12],["Mollet",67,320,28,66,10],["Talon/pied",62,388,34,22,9]],L:"G"}};
const R={D:"G",G:"D"};
// Nom de zone du schéma -> clé de région dans REG
const MAPPING=[[/^(Genou|Creux)/,"genou"],[/^Épaule/,"epaule"],[/^Lombaires$/,"lombes"],[/^(Cervicales|Cou)/,"cerv"],[/^(Pied|Talon)/,"chev"]];
// ===== DONNÉES PROBANTES — test : [nom, hypothèses, LR+, LR−, source, précision] =====
// LR calculés depuis Se/Sp poolées quand l’étude ne les donne pas : LR+ = Se/(1−Sp) ; LR− = (1−Se)/Sp
const SRC={
sokal:"Sokal PA et al. Knee Surg Sports Traumatol Arthrosc 2022;30(10) — méta-analyse bivariée (LCA)",
tanaka:"Tanaka S et al. Int J Sports Phys Ther 2022;17(5) — méta-analyse, LCA en phase aiguë",
smith:"Smith BE et al. Evid Based Med 2015;20(3):88-97 — tests méniscaux",
blyth:"Blyth M et al. Health Technol Assess 2015;19(62) — Thessaly non supérieur aux autres tests en soins primaires",
stiell:"Stiell IG et al. Ann Emerg Med 1995;26:405-13 (règle d’Ottawa genou) ; méta-analyse : Se 0,99, Sp 0,49, LR− 0,07",
jama23:"Evaluation and Treatment of Knee Pain: A Review. JAMA 2023;330(16):1568-80",
nice:"NICE NG226 (2022) Osteoarthritis in over 16s : diagnostic clinique sans imagerie si ≥ 45 ans + douleur à l’effort + raideur matinale ≤ 30 min",
willy:"Willy RW et al. Patellofemoral Pain. J Orthop Sports Phys Ther 2019;49(9):CPG1-CPG95",
hermans:"Hermans J et al. JAMA 2013;310(8):837-47 — Rational Clinical Examination, coiffe des rotateurs",
hegedus:"Hegedus EJ et al. Br J Sports Med 2012 — méta-analyse des tests d’épaule (Neer, Hawkins, arc douloureux)",
farber:"Farber AJ et al. J Bone Joint Surg Am 2006;88:1467-74 — instabilité antérieure traumatique (n = 363)",
windt:"van der Windt DAWM et al. Cochrane Database Syst Rev 2010;CD007431 — populations chirurgicales, biais de spectre possible",
suri:"Suri P et al. JAMA 2010;304(23):2628-36 — sténose lombaire, 4 études (741 patients), centres spécialisés",
has:"HAS. Fiche mémo « Prise en charge du patient présentant une lombalgie commune », mars 2019",
wainner:"Wainner RS et al. Spine 2003;28(1):52-62 (cluster). Se/Sp individuelles : source secondaire (Physiotutors), à vérifier dans l’article",
grondin:"Grondin et al. Braz J Phys Ther 2026 — validation externe (n = 85, résumé secondaire)",
ogince:"Ogince M et al. Man Ther 2007;12(3) — flexion-rotation test (valeurs relevées via Physiotutors, source secondaire) ; Hall T et al. 2010 (seuil 30°)",
blanpied:"Blanpied PR et al. Neck Pain: Revision 2017. J Orthop Sports Phys Ther 2017;47(7):A1-A83",
ifompt:"Rushton A et al. IFOMPT International Cervical Framework (vascular pathologies of the neck), 2020",
bachmann:"Bachmann LM et al. BMJ 2003;326:417 — règles d’Ottawa cheville : Se poolée 97,6 %, LR− 0,08",
ankle:"Revue systématique de 14 études (6 302 observations) sur les tests cliniques des entorses de cheville, PMC9109591 ; Beynon A et al. Chiropr Man Ther 2022;30:58 ; Baltes TPA et al. Knee Surg Sports Traumatol Arthrosc 2024;32(3)",
reiman:"Reiman M et al. J Athl Train 2014;49(6):820-9 — méta-analyse, tendon d’Achille",
dn4:"Bouhassira D et al. Pain 2005;114:29-36 — DN4 (validation française) : seuil ≥ 4/10, Se 82,9 %, Sp 89,9 %",
abbott:"Abbott JH, Schmitt J. J Orthop Sports Phys Ther 2014 — MID PSFS, NPRS, ODI, NDI",
ijspt:"Int J Sports Phys Ther 2017;12(6):931-47 — MCID par région"};
const PROM={PSFS:"PSFS (MID 1,3–2,7 pts selon l’ancrage)",NPRS:"NPRS (MID 1,5–3,5 pts)",ODI:"Oswestry (MID ≈ 11–12 %)",NDI:"NDI (MID 8,5–19 % selon la population ; vérifier l’échelle /50 ou /100)",QDASH:"QuickDASH (MCID ≈ 8 %)",LEFS:"LEFS (MCID ≈ 9 pts)",AKPS:"Anterior Knee Pain Scale (recommandée par le CPG SFP 2019)"};
const REG={
genou:{n:"Genou",H:{LCA:"Rupture du LCA",MEN:"Lésion méniscale",SFP:"Douleur fémoro-patellaire",OA:"Gonarthrose"},
RF:["Âge ≥ 55 ans","Douleur isolée de la rotule","Douleur de la tête du péroné","Flexion à 90° impossible","Incapacité de faire 4 pas (immédiat et à l’examen)"],
RFm:"Règle d’Ottawa genou positive : radiographie à envisager.",
T:[["Lachman",["LCA"],5.4,0.22,"sokal","Se 81 % · Sp 85 %"],["Tiroir antérieur",["LCA"],5.5,0.20,"sokal","Se 83 % · Sp 85 %"],["Pivot shift",["LCA"],11.6,0.47,"tanaka","phase aiguë · Se 55 % · Sp 96 %"],["Lever sign",["LCA"],null,0.21,"tanaka","phase aiguë · Se 82 %"],
["McMurray",["MEN"],3.8,0.46,"smith","Se 61 % · Sp 84 %"],["Palpation de l’interligne",["MEN"],4.9,0.20,"smith","Se 83 % · Sp 83 %"],["Thessaly 20°",["MEN"],5.8,0.29,"smith","Se 75 % · Sp 87 % ; non reproduit en soins primaires"],
["Douleur à l’accroupissement (squat)",["SFP"],1.8,0.18,"jama23","Se 91 % · Sp 50 %"],["Critères cliniques NICE de gonarthrose",["OA"],3.1,0.07,"jama23","≥ 45 ans · Se 95 % · Sp 69 %"]],
G:["SFP : renforcement hanche + genou, avec orthèses plantaires ou taping (JAMA 2023, CPG 2019)","SFP : pas d’orthèse de genou, pas de biofeedback EMG, pas d’aiguilles sèches (CPG JOSPT 2019)","Gonarthrose : thérapie manuelle seulement en complément de l’exercice thérapeutique (NICE NG226)","Gonarthrose : pas d’imagerie systématique ni pour le suivi (NICE NG226)"],
Q:["PSFS","NPRS","LEFS","AKPS"],src:["stiell","blyth","nice","willy"],
note:"Précision des tests méniscaux jugée faible dans la littérature : à croiser avec l’histoire et l’épanchement. Le Lachman a longtemps été surestimé (Sokal 2022). Ligaments collatéraux : aucune donnée vérifiée intégrée."},
epaule:{n:"Épaule",H:{RCD:"Atteinte de la coiffe",TF:"Rupture transfixiante supra/infra-épineux",SSC:"Rupture du subscapulaire",SA:"Conflit sous-acromial",INS:"Instabilité antérieure traumatique"},
RF:["Déformation après traumatisme","Douleur thoracique associée"],RFm:"Signe d’alerte : orientation médicale à envisager.",
T:[["Arc douloureux",["RCD"],3.7,0.36,"hermans",""],["Drop arm",["RCD"],3.3,null,"hermans","IC 95 % 1,0–11"],["Rotation externe contrariée",["RCD"],2.6,0.49,"hermans",""],
["Lag test rotation externe",["TF"],7.2,null,"hermans","rupture transfixiante"],["Jobe (faiblesse)",["TF"],2.1,0.31,"hermans","rupture transfixiante"],
["Lag test rotation interne",["SSC"],5.6,0.04,"hermans",""],["Lift-off (avec lag)",["SSC"],8.5,0.27,"hermans",""],
["Neer",["SA"],1.8,0.47,"hegedus","Se 72 % · Sp 60 %"],["Hawkins-Kennedy",["SA"],1.9,0.36,"hegedus","Se 79 % · Sp 59 %"],
["Appréhension",["INS"],20.2,0.29,"farber","Se 72 % · Sp 96 % (critère : appréhension, pas la douleur)"],["Relocation",["INS"],10.4,0.21,"farber","Se 81 % · Sp 92 %"],["Tiroir antérieur de l’épaule",["INS"],3.6,0.55,"farber","Se 53 % · Sp 85 %"]],
Q:["PSFS","NPRS","QDASH"],src:[],
note:"Neer et Hawkins : apport limité (LR+ < 2). Capsulite : pas de LR vérifié ; critère clinique = limitation passive de la rotation externe (schéma capsulaire). Les tests d’instabilité sont spécifiques mais peu sensibles."},
lombes:{n:"Lombaires",H:{RAD:"Radiculopathie (hernie discale)",STE:"Syndrome de sténose lombaire"},
RF:["Douleur non mécanique (progressive, repos, nocturne)","Déficit neurologique (sphincters, moteur, queue-de-cheval)","Paresthésie du pubis / périnée","Traumatisme important","Perte de poids inexpliquée","ATCD de cancer ou fièvre","Drogue IV ou corticoïdes prolongés","Âge < 20 ou > 55 ans","Douleur thoracique associée","Altération de l’état général"],
RFm:"Drapeau rouge : la HAS souligne que c’est leur combinaison qui doit alerter ; avis médical à envisager.",
T:[["Lasègue (SLR)",["RAD"],1.3,0.29,"windt","Se 92 % · Sp 28 %"],["Lasègue croisé",["RAD"],2.8,0.80,"windt","Se 28 % · Sp 90 %"],
["Pas de douleur en position assise",["STE"],7.4,null,"suri","IC 1,9–30"],["Amélioration en flexion avant",["STE"],6.4,null,"suri",""],["Douleur bilatérale fesses / jambes",["STE"],6.3,null,"suri",""],["Claudication neurogène",["STE"],3.7,0.23,"suri",""],["Démarche à base élargie",["STE"],13,null,"suri","IC 1,9–95"],["Romberg anormal",["STE"],4.2,null,"suri",""]],
G:["Activité physique = traitement principal (HAS 2019)","Sans drapeau rouge : pas d’imagerie en poussée aiguë (grade C)","Évaluer les drapeaux jaunes : STarT Back, Örebro court, FABQ, HAD","Réévaluer 2 à 4 semaines après une poussée aiguë","Kinésithérapie active si lombalgie chronique ou à risque de chronicité","Prise en charge pluridisciplinaire si chronique ou à risque"],
Q:["ODI","PSFS","NPRS"],src:["has"],
note:"Isolément, la plupart des tests physiques lombaires ont une faible performance (Cochrane). Un Lasègue positif diminue la probabilité de sténose (Suri). Sans drapeau rouge : lombalgie commune (HAS)."},
cerv:{n:"Cervicales",H:{RAD:"Radiculopathie cervicale",CEF:"Céphalée cervicogénique"},
RF:["Atteinte vasculaire du cou suspectée (cadre IFOMPT 2020)","Insuffisance ligamentaire cervicale haute","Atteinte inexpliquée des nerfs crâniens","Fracture suspectée / traumatisme"],RFm:"Drapeau rouge (CPG JOSPT 2017) : orientation médicale à envisager.",
T:[["ULNT A (ULNT1)",["RAD"],1.2,0.14,"wainner","Se 97 % · Sp 22 %"],["Rotation cervicale < 60°",["RAD"],1.7,0.22,"wainner","Se 89 % · Sp 49 %"],["Distraction cervicale",["RAD"],null,null,"grondin","meilleur test d’exclusion isolé (2026)"],["Spurling A",["RAD"],3.6,0.58,"wainner","Se 50 % · Sp 86 %"],
["Flexion-rotation test",["CEF"],9.1,0.1,"ogince","Se 91 % · Sp 90 % (source secondaire) ; sépare mal les autres céphalées ; seuil 30° : Se 70 %, Sp 70 %"]],
CL:{n:"de Wainner",items:["ULNT A (ULNT1)","Rotation cervicale < 60°","Distraction cervicale","Spurling A"],rules:[[3,6.1],[4,30.3]],w:"IC très larges (4/4 : 1,7–538) ; validation externe 2026 : sensibilité limitée. À utiliser pour appuyer une hypothèse, jamais seul."},
G:["Cervicalgie chronique : approche multimodale, mobilisation/manipulation + exercices cervico-scapulo-thoraciques (CPG 2017)","Cervicalgie chronique : éducation et exercices selon les principes de la TCC (CPG 2017)"],
Q:["NDI","PSFS","NPRS"],src:["blanpied","ifompt","abbott","ogince"],
note:"Tests d’irradiation retenus par le CPG 2017 : neurodynamique, Spurling, distraction, Valsalva."},
chev:{n:"Cheville / pied",H:{ATFL:"Lésion ligamentaire latérale",ACH:"Tendinopathie d’Achille"},
RF:["Incapacité de faire 4 pas (immédiat et à l’examen)","Douleur osseuse : bord postérieur / pointe d’une malléole","Douleur osseuse : naviculaire","Douleur osseuse : base du 5e métatarsien"],
RFm:"Règle d’Ottawa cheville positive : radiographie à envisager (Se ≈ 98 %, LR− 0,08).",
T:[["Tiroir antérieur de la cheville",["ATFL"],4.1,0.53,"ankle","Se 54 % · Sp 87 % ; plus performant à ≈ 5 jours qu’en aigu"],["Palpation du tendon d’Achille",["ACH"],3.2,0.48,"reiman","Se 64 % · Sp 81 %"],["Royal London Hospital test",["ACH"],3.8,null,"reiman",""],["Arc sign",["ACH"],null,null,"reiman","Sp 88 %"]],
Q:["PSFS","NPRS","LEFS"],src:["bachmann"],
note:"Les tests de cheville ne doivent pas être utilisés seuls mais avec l’histoire. Recommandations à consulter : CPG JOSPT Achille (2018) et entorses latérales (2021), contenu non intégré."}};
