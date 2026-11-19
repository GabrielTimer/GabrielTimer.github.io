/* =====================================================================
   PROPOSITION DE TRAITEMENT APRÈS LE BILAN — contenu clinique, pas de code.
   ---------------------------------------------------------------------
   HYP["région:HYPOTHÈSE"] (clés de REG dans data.js) :
     axes    : axes de traitement proposés (pré-cochés, modifiables d'un clic)
     eviter  : ce qui n'est pas recommandé (affiché pour information)
     avis    : quand orienter vers le médecin / chirurgien
     modeles : noms des modèles à proposer (tels qu'affichés dans Modèles)
     postop  : modèles à proposer seulement après une opération
     patho   : pathologie de la bibliothèque pour composer un programme sur mesure
     stop    : true = avis médical d'abord, aucun programme proposé
   REGION : zone de la bibliothèque + modèles de la région (proposés en second).
   MOTIF  : modèles et pathologie selon le motif coché au début du bilan.
   PROFIL : axes ajoutés selon le profil (irritabilité, chronicité, drapeaux jaunes).
   Sources principales : repères déjà cités dans data.js (CPG JOSPT, NICE,
   JAMA 2023…) et recommandations usuelles ; à adapter au patient.
   ===================================================================== */
const TX = {
HYP: {
  "genou:LCA": {
    axes: ["Contrôle de l'épanchement, récupération de l'extension complète", "Renforcement quadriceps et ischio-jambiers (chaîne fermée puis ouverte)", "Contrôle neuromusculaire et proprioception", "Retour au sport sur critères objectifs (force, hop tests)"],
    eviter: ["Retour au pivot sans critères objectifs de récupération"],
    avis: "Avis chirurgical selon l'instabilité, le niveau d'activité et les lésions associées.",
    modeles: ["Rupture du LCA (sans opération)", "Progression : squat", "Pliométrie : programme progressif"], postop: ["Ligamentoplastie du LCA", "Mobilité : extension du genou", "Mobilité : flexion du genou"], patho: "Ligament croisé (LCA)"
  },
  "genou:MEN": {
    axes: ["Exercice thérapeutique en première intention (renforcement, contrôle moteur)", "Gestion de la charge, reprise progressive", "Récupération des amplitudes"],
    eviter: ["Arthroscopie d'emblée pour une lésion dégénérative"],
    avis: "Avis chirurgical si blocages vrais persistants.",
    modeles: ["Lésion méniscale"], patho: "Lésion méniscale"
  },
  "genou:SFP": {
    axes: ["Renforcement hanche et genou combinés", "Éducation et gestion de la charge (escaliers, accroupi, course)", "Orthèses plantaires ou taping à court terme si besoin"],
    eviter: ["Orthèse de genou", "Biofeedback EMG", "Aiguilles sèches"],
    modeles: ["Syndrome fémoro-patellaire", "Progression : chaise et squat espagnol", "Progression : abduction de hanche"], patho: "Syndrome fémoro-patellaire"
  },
  "genou:OA": {
    axes: ["Exercice thérapeutique : renforcement + activité aérobie", "Éducation, gestion du poids et de l'activité", "Thérapie manuelle seulement en complément de l'exercice"],
    eviter: ["Imagerie systématique, y compris pour le suivi"],
    modeles: ["Gonarthrose", "Progression : squat", "Mobilité : flexion du genou"], postop: ["Prothèse totale de genou (PTG)", "Mobilité : extension du genou", "Mobilité : flexion du genou"], patho: "Gonarthrose / prothèse de genou"
  },

  "epaule:RCD": {
    axes: ["Exercices progressifs de la coiffe et des stabilisateurs de l'omoplate", "Gestion de la charge, éviter le repos strict", "Éducation sur l'évolution et les positions"],
    modeles: ["Tendinopathie de la coiffe et conflit", "Progression : rotation externe de l'épaule", "Progression : trapèze moyen et inférieur"], postop: ["Réparation de la coiffe des rotateurs"], patho: "Tendinopathie de la coiffe / conflit"
  },
  "epaule:TF": {
    axes: ["Renforcement progressif de la coiffe et des scapulaires", "Gestion de la douleur et de la charge"],
    avis: "Rupture transfixiante suspectée : avis médical et imagerie si faiblesse nette, surtout après un traumatisme ou chez un sujet jeune.",
    modeles: ["Tendinopathie de la coiffe et conflit"], postop: ["Réparation de la coiffe des rotateurs"], patho: "Tendinopathie de la coiffe / conflit"
  },
  "epaule:SSC": {
    axes: ["Renforcement progressif des rotateurs internes et des scapulaires", "Gestion de la charge"],
    avis: "Rupture du subscapulaire suspectée : avis médical et imagerie.",
    modeles: ["Tendinopathie de la coiffe et conflit"], postop: ["Réparation de la coiffe des rotateurs"], patho: "Tendinopathie de la coiffe / conflit"
  },
  "epaule:SA": {
    axes: ["Exercices progressifs de la coiffe et des scapulaires", "Contrôle de l'omoplate et posture", "Gestion de la charge (gestes au-dessus de la tête)"],
    modeles: ["Tendinopathie de la coiffe et conflit", "Progression : rotation externe de l'épaule", "Progression : trapèze moyen et inférieur"], patho: "Tendinopathie de la coiffe / conflit"
  },
  "epaule:INS": {
    axes: ["Renforcement de la coiffe et des stabilisateurs scapulaires", "Proprioception et contrôle dynamique", "Reprise progressive des positions à risque"],
    avis: "Avis chirurgical si luxations récidivantes, surtout chez le jeune sportif.",
    modeles: ["Instabilité d'épaule", "Prévention de l'épaule du sportif (type 11+ Shoulder, OSTRC)"], postop: ["Post-opératoire : butée coracoïdienne (Latarjet)"], patho: "Instabilité / luxation d'épaule"
  },

  "lombes:RAD": {
    axes: ["Éducation, rester actif", "Exercices dirigés selon la réponse (centralisation, mobilité neurale)", "Surveillance neurologique à chaque séance"],
    eviter: ["Repos au lit prolongé"],
    avis: "Avis urgent si déficit moteur progressif ou signes de queue-de-cheval.",
    modeles: ["Sciatique", "Hernie discale", "Sciatique et hernie discale", "Cruralgie"], patho: "Sciatique / radiculalgie"
  },
  "lombes:STE": {
    axes: ["Exercices en flexion, mobilité lombaire", "Renforcement des membres inférieurs et du tronc", "Endurance : vélo, marche fractionnée"],
    patho: "Canal lombaire étroit", modeles: ["Canal lombaire étroit", "Lombalgie"]
  },

  "cerv:RAD": {
    axes: ["Mobilité cervicale et mobilisations neurales", "Renforcement des fléchisseurs profonds du cou", "Thérapie manuelle associée à l'exercice"],
    avis: "Avis médical si déficit moteur progressif.",
    modeles: ["Névralgie cervico-brachiale", "Cervicalgie"], patho: "Névralgie cervico-brachiale"
  },
  "cerv:CEF": {
    axes: ["Thérapie manuelle cervicale haute", "Exercices des fléchisseurs profonds (flexion cranio-cervicale)", "Posture et ergonomie"],
    modeles: ["Céphalées de tension et cervicogéniques", "Cervicalgie"], patho: "Cervicalgie"
  },

  "chev:ATFL": {
    axes: ["Mise en charge précoce avec protection fonctionnelle (strapping, attelle)", "Proprioception et renforcement des fibulaires (prévention des récidives)", "Reprise du sport progressive"],
    eviter: ["Immobilisation stricte prolongée"],
    modeles: ["Entorse de cheville", "Équilibre : programme progressif", "Mobilité : flexion dorsale de la cheville"], patho: "Entorse / instabilité de cheville"
  },
  "chev:ACH": {
    axes: ["Renforcement progressif du triceps (isométrique puis lourd lent ou excentrique)", "Gestion de la charge, notamment en course", "Douleur tolérée pendant l'exercice si elle redescend le lendemain"],
    eviter: ["Repos complet prolongé"],
    modeles: ["Tendinopathie d'Achille", "Progression : montée sur la pointe des pieds"], postop: ["Post-opératoire : rupture du tendon d'Achille"], patho: "Tendinopathie d'Achille"
  },

  "hanche:CFA": {
    axes: ["Renforcement de la hanche et du tronc, contrôle moteur", "Adapter les positions de flexion profonde douloureuses"],
    avis: "Avis spécialisé si blocages ou échec du traitement conservateur.",
    modeles: ["Conflit fémoro-acétabulaire", "Progression : pont fessier et hip thrust"], patho: "Conflit fémoro-acétabulaire"
  },
  "hanche:GTPS": {
    axes: ["Éducation : éviter la compression du tendon (jambes croisées, couché sur le côté atteint)", "Renforcement progressif des abducteurs (isométrique puis dynamique)"],
    eviter: ["Étirements en adduction du côté douloureux"],
    modeles: ["Tendinopathie du moyen fessier", "Progression : abduction de hanche", "Progression : pont fessier et hip thrust"], patho: "Tendinopathie du moyen fessier"
  },
  "hanche:OA": {
    axes: ["Exercice thérapeutique : renforcement + activité aérobie", "Éducation, gestion du poids et de l'activité"],
    modeles: ["Coxarthrose", "Mobilité : hanche"], postop: ["Prothèse totale de hanche (PTH)"], patho: "Coxarthrose / prothèse de hanche"
  },

  "coude:EPI": {
    axes: ["Renforcement progressif des extenseurs du poignet (isométrique puis excentrique)", "Gestion de la charge, ergonomie des gestes répétitifs"],
    modeles: ["Épicondylite (tennis elbow)"], patho: "Épicondylite (tennis elbow)"
  },
  "coude:EPT": {
    axes: ["Renforcement progressif des fléchisseurs du poignet", "Gestion de la charge, ergonomie"],
    modeles: ["Épitrochléite (golf elbow)"], patho: "Épitrochléite (golf elbow)"
  },

  "main:CC": {
    axes: ["Orthèse de repos nocturne, poignet en position neutre", "Mobilisations des tendons et du nerf médian", "Éducation, adaptation des gestes"],
    avis: "Avis chirurgical si déficit moteur ou fonte de l'éminence thénar.",
    modeles: ["Canal carpien"], patho: "Canal carpien"
  },
  "main:DQ": {
    axes: ["Orthèse de repos pouce-poignet", "Exercices progressifs, adaptation des gestes (port du bébé)"],
    modeles: ["Tendinite de De Quervain"], patho: "Tendinite de De Quervain"
  },
  "main:RHZ": {
    axes: ["Orthèse de pouce", "Exercices de stabilisation du pouce", "Éducation : économie articulaire, aides techniques"],
    modeles: ["Rhizarthrose"], patho: "Arthrose de la main / rhizarthrose"
  },

  "vertiges:VPPB": {
    axes: ["Manœuvre de repositionnement selon le canal (Epley, Semont)", "Réévaluation à une semaine"],
    eviter: ["Exercices d'habituation seuls à la place de la manœuvre"],
    modeles: ["VPPB (après manœuvre)"], patho: "Vertiges / vestibulaire"
  },
  "genou:COL": {
    axes: ["Protection relative courte (attelle articulée si laxité importante)", "Récupération des amplitudes, renforcement du quadriceps", "Reprise progressive des appuis et des changements de direction"],
    avis: "Laxité nette en extension (0°) : lésion associée possible (croisés, coque), avis médical.",
    modeles: ["Gonarthrose", "Rupture du LCA (sans opération)"], patho: "Entorse du genou (LLI/LLE)"
  },
  "cerv:MYE": {
    axes: ["Orientation médicale avant toute rééducation", "Pas de manipulation cervicale", "Éducation sur les signes d'aggravation (marche, mains)"],
    eviter: ["Manipulations et tractions cervicales"],
    avis: "Myélopathie cervicale suspectée : avis médical rapide (IRM, avis chirurgical).",
    modeles: [], stop: true
  },
  "main:TFCC": {
    axes: ["Repos relatif et orthèse de poignet (ou bracelet) si douloureux", "Renforcement progressif des stabilisateurs du poignet et de l'avant-bras", "Adaptation des gestes en rotation et en appui"],
    avis: "Instabilité de l'articulation radio-ulnaire distale ou douleur persistante : avis chirurgical (imagerie).",
    modeles: ["Fracture du poignet", "Canal carpien"], patho: "Fracture du poignet"
  },
  "dors:MEC": {
    axes: ["Mobilité thoracique et exercices posturaux", "Renforcement des muscles du haut du dos", "Ergonomie du poste et pauses actives"],
    modeles: ["Dorsalgie et raideur du haut du dos", "Dos au travail", "Cervicalgie", "Mobilité : colonne thoracique"], patho: "Scoliose / posture"
  },
  "dors:COS": {
    axes: ["Mobilisation costale et thoracique", "Respiration ample, mobilité en rotation"],
    modeles: ["Dorsalgie et raideur du haut du dos", "Dos au travail"], patho: "Scoliose / posture"
  },
  "dors:TAS": {
    axes: ["Antalgie et position de confort, sans flexion du tronc en charge", "Reprise de la marche, puis renforcement des extenseurs du dos", "Prévention des chutes"],
    eviter: ["Flexion du tronc en charge (soulever penché, crunch)", "Manipulations vertébrales"],
    avis: "Tassement suspecté : avis médical et imagerie, bilan d'ostéoporose.",
    modeles: ["Ostéoporose", "Prévention des chutes"], patho: "Ostéoporose"
  },
  "thorax:PAR": {
    axes: ["Éducation : douleur de la paroi, rassurer une fois le cœur écarté", "Mobilité thoracique et respiration", "Renforcement progressif du haut du corps"],
    modeles: ["Réhabilitation respiratoire (BPCO)"], patho: "Respiratoire (BPCO, asthme…)"
  },
  "thorax:COR": {
    axes: ["Pas de rééducation avant avis médical"],
    avis: "Origine cardiaque possible : avis médical ; en cas de douleur au repos, prolongée ou avec malaise, appeler le 15.",
    modeles: [], stop: true
  },
  "atm:MYO": {
    axes: ["Éducation : repos de la mâchoire, langue au palais, éviter de serrer", "Massage et étirements des masticateurs", "Gestion du stress et du sommeil"],
    modeles: ["Mâchoire (ATM)"], patho: "Mâchoire (ATM) / céphalées"
  },
  "atm:ART": {
    axes: ["Alimentation molle temporairement, éviter les grandes ouvertures", "Exercices d'ouverture contrôlée sans douleur", "Thérapie manuelle de l'ATM"],
    modeles: ["Mâchoire (ATM)"], patho: "Mâchoire (ATM) / céphalées"
  },
  "atm:DDR": {
    axes: ["Ouverture contrôlée en ligne droite devant un miroir", "Éducation : le claquement indolore n'est pas grave"],
    modeles: ["Mâchoire (ATM)"], patho: "Mâchoire (ATM) / céphalées"
  },
  "atm:DDNR": {
    axes: ["Mobilisations de l'ATM pour gagner l'ouverture", "Exercices d'ouverture progressifs"],
    avis: "Blocage récent ou persistant : avis dentaire ou maxillo-facial.",
    modeles: ["Mâchoire (ATM)"], patho: "Mâchoire (ATM) / céphalées"
  },
  "neuro:CEN": {
    axes: ["Travail de la marche et de l'équilibre", "Étirements des muscles spastiques, renforcement fonctionnel", "Transferts et autonomie"],
    avis: "Signe central d'apparition récente : avis médical.",
    modeles: ["Hémiplégie (AVC)", "Sclérose en plaques"], patho: "AVC / hémiplégie"
  },
  "neuro:CER": {
    axes: ["Coordination et précision des gestes", "Équilibre et marche avec repères visuels", "Exercices lents et répétés"],
    modeles: ["Sclérose en plaques", "Prévention des chutes"], patho: "Sclérose en plaques"
  },
  "neuro:PRO": {
    axes: ["Équilibre avec contrôle visuel, puis yeux fermés près d'un appui", "Sensibilité des pieds, chaussage", "Prévention des chutes"],
    modeles: ["Charcot-Marie-Tooth", "Prévention des chutes"], patho: "Prévention des chutes / équilibre"
  },
  "vertiges:HYPO": {
    axes: ["Rééducation vestibulaire : stabilisation du regard", "Habituation aux mouvements de tête", "Équilibre et marche"],
    modeles: ["Rééducation vestibulaire"], patho: "Vertiges / vestibulaire"
  }
},

REGION: {
  genou: { zone: "Genou", modeles: ["Syndrome fémoro-patellaire", "Gonarthrose", "Lésion méniscale", "Rupture du LCA (sans opération)", "Tendinopathie rotulienne", "Lésion des ischio-jambiers", "Retour au sport (membre inférieur)", "Syndrome de l'essuie-glace (bandelette ilio-tibiale)", "Progression : squat", "Progression : chaise et squat espagnol", "Progression : fente et split squat", "Progression : montée de marche (step-up)", "Progression : pont pour les ischio-jambiers", "Mobilité : flexion du genou", "Mobilité : extension du genou", "Pliométrie : programme progressif"], postop: ["Ligamentoplastie du LCA", "Prothèse totale de genou (PTG)"] },
  epaule: { zone: "Épaule", modeles: ["Tendinopathie de la coiffe et conflit", "Capsulite rétractile", "Instabilité d'épaule", "Renforcement de l'épaule (coiffe et omoplate)", "Progression : rotation externe de l'épaule", "Progression : trapèze moyen et inférieur", "Progression : pompes", "Mobilité : épaule", "Prévention de l'épaule du sportif (type 11+ Shoulder, OSTRC)", "Cancer du sein : mobilité de l'épaule et reprise d'activité"], postop: ["Réparation de la coiffe des rotateurs", "Post-opératoire : butée coracoïdienne (Latarjet)"] },
  lombes: { zone: "Dos", modeles: ["Lombalgie", "Lumbago (lombalgie aiguë)", "Lombalgie chronique (reconditionnement)", "Canal lombaire étroit", "Sciatique", "Hernie discale", "Sciatique et hernie discale", "Cruralgie", "Dos au travail", "Flexion lombaire : réexposition progressive", "Pilates : programme progressif"] },
  cerv: { zone: "Cervicales", modeles: ["Cervicalgie", "Névralgie cervico-brachiale", "Mâchoire (ATM)", "Céphalées de tension et cervicogéniques"] },
  chev: { zone: "Cheville et pied", modeles: ["Entorse de cheville", "Tendinopathie d'Achille", "Fasciite plantaire", "Épine calcanéenne", "Progression : montée sur la pointe des pieds", "Mobilité : flexion dorsale de la cheville", "Fracture du calcanéum ou du talus"], postop: ["Post-opératoire : rupture du tendon d'Achille", "Fracture du calcanéum ou du talus"] },
  hanche: { zone: "Hanche", modeles: ["Coxarthrose", "Tendinopathie du moyen fessier", "Conflit fémoro-acétabulaire", "Pubalgie", "Syndrome du piriforme", "Progression : abduction de hanche", "Progression : pont fessier et hip thrust", "Progression : soulevé de terre roumain sur une jambe", "Tendinopathie proximale des ischio-jambiers", "Mobilité : hanche"], postop: ["Prothèse totale de hanche (PTH)"] },
  coude: { zone: "Coude", modeles: ["Épicondylite (tennis elbow)", "Épitrochléite (golf elbow)"] },
  main: { zone: "Poignet et main", modeles: ["Canal carpien", "Tendinite de De Quervain", "Rhizarthrose", "Fracture du poignet"] },
  vertiges: { zone: "Corps entier", modeles: ["Rééducation vestibulaire", "VPPB (après manœuvre)", "Équilibre : programme progressif"] },
  dors: { zone: "Dos", modeles: ["Dorsalgie et raideur du haut du dos", "Dos au travail", "Ostéoporose", "Lombalgie chronique (reconditionnement)", "Mobilité : colonne thoracique"] },
  thorax: { zone: "Tronc", modeles: ["Réhabilitation respiratoire (BPCO)"] },
  atm: { zone: "Cervicales", modeles: ["Mâchoire (ATM)"] },
  neuro: { zone: "Corps entier", modeles: ["Maladie de Parkinson", "Sclérose en plaques", "Hémiplégie (AVC)", "SLA (maladie de Charcot)", "Charcot-Marie-Tooth"] }
},

MOTIF: {
  /* Motifs précis (liste par groupe du bilan) : modèles et pathologie du sur mesure */
  "Lombalgie chronique": { modeles: ["Lombalgie chronique (reconditionnement)", "Lombalgie", "Flexion lombaire : réexposition progressive", "Pilates : programme progressif"], patho: "Lombalgie" },
  "Lumbago (lombalgie aiguë)": { modeles: ["Lumbago (lombalgie aiguë)", "Lombalgie"], patho: "Lombalgie" },
  "Hernie discale": { modeles: ["Hernie discale", "Sciatique et hernie discale"], patho: "Hernie discale" },
  "Cruralgie": { modeles: ["Cruralgie"], patho: "Sciatique / radiculalgie" },
  "Canal lombaire étroit": { modeles: ["Canal lombaire étroit"], patho: "Canal lombaire étroit" },
  "Névralgie cervico-brachiale": { modeles: ["Névralgie cervico-brachiale"], patho: "Névralgie cervico-brachiale" },
  "Céphalées": { modeles: ["Céphalées de tension et cervicogéniques", "Cervicalgie", "Mâchoire (ATM)"], patho: "Mâchoire (ATM) / céphalées" },
  "Coup du lapin (whiplash)": { modeles: ["Cervicalgie"], patho: "Cervicalgie" },
  "Scoliose / posture": { modeles: ["Dorsalgie et raideur du haut du dos", "Dos au travail"], patho: "Scoliose / posture" },
  "Tassement vertébral": { modeles: ["Ostéoporose", "Prévention des chutes"], patho: "Ostéoporose" },
  "Épaule douloureuse (coiffe, conflit)": { modeles: ["Tendinopathie de la coiffe et conflit", "Renforcement de l'épaule (coiffe et omoplate)"], patho: "Tendinopathie de la coiffe / conflit" },
  "Rupture de la coiffe": { modeles: ["Tendinopathie de la coiffe et conflit"], patho: "Tendinopathie de la coiffe / conflit" },
  "Capsulite rétractile": { modeles: ["Capsulite rétractile"], patho: "Capsulite rétractile" },
  "Instabilité / luxation d’épaule": { modeles: ["Instabilité d'épaule", "Prévention de l'épaule du sportif (type 11+ Shoulder, OSTRC)"], patho: "Instabilité / luxation d'épaule" },
  "Fracture de l’épaule (humérus, clavicule)": { modeles: ["Capsulite rétractile", "Mobilité : épaule"], patho: "Post-opératoire" },
  "Épicondylalgie (tennis elbow)": { modeles: ["Épicondylite (tennis elbow)"], patho: "Épicondylite (tennis elbow)" },
  "Épitrochléite (golf elbow)": { modeles: ["Épitrochléite (golf elbow)"], patho: "Épitrochléite (golf elbow)" },
  "Canal carpien": { modeles: ["Canal carpien"], patho: "Canal carpien" },
  "Tendinite de De Quervain": { modeles: ["Tendinite de De Quervain"], patho: "Tendinite de De Quervain" },
  "Rhizarthrose": { modeles: ["Rhizarthrose"], patho: "Arthrose de la main / rhizarthrose" },
  "Douleur du poignet côté petit doigt (TFCC)": { modeles: ["Fracture du poignet", "Canal carpien"], patho: "Fracture du poignet" },
  "Fracture du poignet": { modeles: ["Fracture du poignet", "Canal carpien"], patho: "Fracture du poignet" },
  "Doigt (entorse, fracture, tendon)": { modeles: ["Rhizarthrose"], patho: "Arthrose de la main / rhizarthrose" },
  "Coxarthrose": { modeles: ["Coxarthrose"], patho: "Coxarthrose / prothèse de hanche" },
  "Tendinopathie du moyen fessier": { modeles: ["Tendinopathie du moyen fessier", "Progression : abduction de hanche"], patho: "Tendinopathie du moyen fessier" },
  "Conflit fémoro-acétabulaire": { modeles: ["Conflit fémoro-acétabulaire"], patho: "Conflit fémoro-acétabulaire" },
  "Pubalgie": { modeles: ["Pubalgie"], patho: "Pubalgie" },
  "Gonarthrose": { modeles: ["Gonarthrose", "Mobilité : flexion du genou"], patho: "Gonarthrose / prothèse de genou" },
  "Syndrome fémoro-patellaire": { modeles: ["Syndrome fémoro-patellaire", "Progression : chaise et squat espagnol"], patho: "Syndrome fémoro-patellaire" },
  "Entorse du genou / LCA": { modeles: ["Rupture du LCA (sans opération)"], patho: "Ligament croisé (LCA)" },
  "Entorse d’un ligament collatéral (LLI / LLE)": { modeles: ["Rupture du LCA (sans opération)", "Gonarthrose"], patho: "Entorse du genou (LLI/LLE)" },
  "Lésion méniscale": { modeles: ["Lésion méniscale"], patho: "Lésion méniscale" },
  "Tendinopathie rotulienne": { modeles: ["Tendinopathie rotulienne", "Progression : chaise et squat espagnol"], patho: "Tendinopathie rotulienne" },
  "Entorse de cheville": { modeles: ["Entorse de cheville", "Équilibre : programme progressif", "Mobilité : flexion dorsale de la cheville"], patho: "Entorse / instabilité de cheville" },
  "Tendinopathie d’Achille": { modeles: ["Tendinopathie d'Achille", "Progression : montée sur la pointe des pieds"], patho: "Tendinopathie d'Achille" },
  "Fasciite / épine calcanéenne": { modeles: ["Épine calcanéenne", "Fasciite plantaire"], patho: "Fasciite plantaire" },
  "Fracture de cheville ou du pied": { modeles: ["Fracture du calcanéum ou du talus", "Mobilité : flexion dorsale de la cheville", "Entorse de cheville"], patho: "Fracture de cheville" },
  "Post-op : prothèse de hanche": { modeles: ["Prothèse totale de hanche (PTH)", "Béquilles et cannes (après une opération)"], patho: "Coxarthrose / prothèse de hanche" },
  "Post-op : prothèse de genou": { modeles: ["Prothèse totale de genou (PTG)", "Béquilles et cannes (après une opération)", "Mobilité : extension du genou", "Mobilité : flexion du genou"], patho: "Gonarthrose / prothèse de genou" },
  "Post-op : ligamentoplastie du LCA": { modeles: ["Ligamentoplastie du LCA", "Béquilles et cannes (après une opération)", "Mobilité : extension du genou"], patho: "Ligament croisé (LCA)" },
  "Post-op : épaule (coiffe, stabilisation)": { modeles: ["Réparation de la coiffe des rotateurs", "Post-opératoire : butée coracoïdienne (Latarjet)"], patho: "Tendinopathie de la coiffe / conflit" },
  "Post-op : rachis": { modeles: ["Lombalgie chronique (reconditionnement)", "Lombalgie"], patho: "Lombalgie" },
  "Post-op : main, poignet": { modeles: ["Fracture du poignet", "Canal carpien"], patho: "Fracture du poignet" },
  "Post-op : cheville, pied": { modeles: ["Post-opératoire : rupture du tendon d'Achille", "Fracture du calcanéum ou du talus", "Entorse de cheville", "Béquilles et cannes (après une opération)"], patho: "Fracture de cheville" },
  "Lésion musculaire (déchirure, claquage)": { modeles: ["Lésion des ischio-jambiers", "Progression : pont pour les ischio-jambiers", "Tendinopathie proximale des ischio-jambiers"], patho: "Lésion des ischio-jambiers" },
  "AVC / hémiplégie": { modeles: ["Hémiplégie (AVC)"], patho: "AVC / hémiplégie" },
  "Maladie de Parkinson": { modeles: ["Maladie de Parkinson"], patho: "Maladie de Parkinson" },
  "Sclérose en plaques": { modeles: ["Sclérose en plaques"], patho: "Sclérose en plaques" },
  "SLA (maladie de Charcot)": { modeles: ["SLA (maladie de Charcot)"], patho: "SLA (maladie de Charcot)" },
  "Charcot-Marie-Tooth / neuropathie": { modeles: ["Charcot-Marie-Tooth"], patho: "Charcot-Marie-Tooth" },
  "Paralysie faciale": { modeles: ["Paralysie faciale"], patho: "Paralysie faciale" },
  "VPPB (vertige positionnel)": { modeles: ["VPPB (après manœuvre)", "Rééducation vestibulaire"], patho: "Vertiges / vestibulaire" },
  "Déficit vestibulaire (névrite…)": { modeles: ["Rééducation vestibulaire"], patho: "Vertiges / vestibulaire" },
  "Ostéoporose": { modeles: ["Ostéoporose", "Prévention des chutes"], patho: "Ostéoporose" },
  "BPCO / réhabilitation respiratoire": { modeles: ["Réhabilitation respiratoire (BPCO)"], patho: "Respiratoire (BPCO, asthme…)" },
  "Encombrement bronchique": { modeles: ["Désencombrement bronchique"], patho: "Respiratoire (BPCO, asthme…)" },
  "Respiratoire après une opération": { modeles: ["Kiné respiratoire après une opération"], patho: "Respiratoire (BPCO, asthme…)" },
  "Douleur thoracique": { modeles: [], patho: "Respiratoire (BPCO, asthme…)" },
  "Lymphœdème / après cancer du sein": { modeles: ["Lymphœdème du bras (après cancer du sein)", "Cancer du sein : mobilité de l'épaule et reprise d'activité"], patho: "Lymphœdème / après cancer" },
  "Douleur chronique / fibromyalgie": { modeles: ["Fibromyalgie et hypersensibilité à la douleur", "Remise en forme (gym adaptée)", "Reconditionnement à l'effort", "Relaxation et respiration", "Exercices en piscine"], patho: "Déconditionnement / reprise" },
  "Périnée / post-partum": { modeles: ["Post-partum : reprise abdominale et gainage", "Abdos profonds et périnée (post-partum sportive)"], patho: "Post-partum / périnée" },
  "Enfant (développement moteur)": { modeles: ["Motricité de l'enfant"], patho: "Développement moteur de l'enfant" },
  "Lombalgie": { modeles: ["Lombalgie", "Lombalgie chronique (reconditionnement)"], patho: "Lombalgie" },
  "Cervicalgie": { modeles: ["Cervicalgie"], patho: "Cervicalgie" },
  "Sciatique": { modeles: ["Sciatique", "Hernie discale", "Sciatique et hernie discale"], patho: "Sciatique / radiculalgie" },
  "Trouble de l’équilibre": { modeles: ["Prévention des chutes", "Équilibre : programme progressif"], patho: "Prévention des chutes / équilibre" },
  "Chutes / personne âgée": { modeles: ["Prévention des chutes", "Ostéoporose", "Équilibre : programme progressif"], patho: "Prévention des chutes / équilibre" },
  "Neurologie (AVC, Parkinson, SEP…)": { modeles: ["Maladie de Parkinson", "Sclérose en plaques", "Hémiplégie (AVC)", "SLA (maladie de Charcot)", "Charcot-Marie-Tooth"] },
  "Vertiges": { modeles: ["Rééducation vestibulaire"], patho: "Vertiges / vestibulaire" },
  "Respiratoire": { modeles: ["Réhabilitation respiratoire (BPCO)", "Désencombrement bronchique", "Kiné respiratoire après une opération"], patho: "Respiratoire (BPCO, asthme…)" },
  "Remise en forme / reconditionnement": { modeles: ["Remise en forme (gym adaptée)", "Reconditionnement à l'effort", "Pilates : programme progressif", "Yoga : programme progressif"] },
  "Mâchoire (ATM)": { modeles: ["Mâchoire (ATM)"], patho: "Mâchoire (ATM) / céphalées" },
  "Dorsalgie": { modeles: ["Dorsalgie et raideur du haut du dos", "Dos au travail", "Mobilité : colonne thoracique"], patho: "Scoliose / posture" },
  "Reprise du sport": { modeles: ["Retour au sport (membre inférieur)", "Lésion des ischio-jambiers", "Pubalgie", "Pliométrie : programme progressif", "Échauffement de prévention football (type FIFA 11+)", "Prévention de l'épaule du sportif (type 11+ Shoulder, OSTRC)", "Progression : squat"] }
},

PROFIL: {
  irritHaute: ["Doser sous le seuil douloureux, phase de protection courte", "Antalgie : techniques passives en appoint seulement"],
  chronique: ["Exposition graduée aux activités évitées", "Autonomisation : programme à domicile régulier"],
  jaunes: ["Éducation à la douleur, approche active", "Objectifs fonctionnels choisis avec le patient"],
  rf: "Drapeau rouge relevé : avis médical avant de débuter ou de poursuivre le traitement."
}
};
