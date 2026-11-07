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
    modeles: ["Rupture du LCA (sans opération)"], postop: ["Ligamentoplastie du LCA"], patho: "Ligament croisé (LCA)"
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
    modeles: ["Syndrome fémoro-patellaire"], patho: "Syndrome fémoro-patellaire"
  },
  "genou:OA": {
    axes: ["Exercice thérapeutique : renforcement + activité aérobie", "Éducation, gestion du poids et de l'activité", "Thérapie manuelle seulement en complément de l'exercice"],
    eviter: ["Imagerie systématique, y compris pour le suivi"],
    modeles: ["Gonarthrose"], postop: ["Prothèse totale de genou (PTG)"], patho: "Gonarthrose / prothèse de genou"
  },

  "epaule:RCD": {
    axes: ["Exercices progressifs de la coiffe et des stabilisateurs de l'omoplate", "Gestion de la charge, éviter le repos strict", "Éducation sur l'évolution et les positions"],
    modeles: ["Tendinopathie de la coiffe et conflit"], postop: ["Réparation de la coiffe des rotateurs"], patho: "Tendinopathie de la coiffe / conflit"
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
    modeles: ["Tendinopathie de la coiffe et conflit"], patho: "Tendinopathie de la coiffe / conflit"
  },
  "epaule:INS": {
    axes: ["Renforcement de la coiffe et des stabilisateurs scapulaires", "Proprioception et contrôle dynamique", "Reprise progressive des positions à risque"],
    avis: "Avis chirurgical si luxations récidivantes, surtout chez le jeune sportif.",
    modeles: ["Instabilité d'épaule"], patho: "Instabilité / luxation d'épaule"
  },

  "lombes:RAD": {
    axes: ["Éducation, rester actif", "Exercices dirigés selon la réponse (centralisation, mobilité neurale)", "Surveillance neurologique à chaque séance"],
    eviter: ["Repos au lit prolongé"],
    avis: "Avis urgent si déficit moteur progressif ou signes de queue-de-cheval.",
    modeles: ["Sciatique", "Hernie discale", "Sciatique et hernie discale", "Cruralgie"], patho: "Sciatique / radiculalgie"
  },
  "lombes:STE": {
    axes: ["Exercices en flexion, mobilité lombaire", "Renforcement des membres inférieurs et du tronc", "Endurance : vélo, marche fractionnée"],
    patho: "Canal lombaire étroit", modeles: ["Lombalgie"]
  },

  "cerv:RAD": {
    axes: ["Mobilité cervicale et mobilisations neurales", "Renforcement des fléchisseurs profonds du cou", "Thérapie manuelle associée à l'exercice"],
    avis: "Avis médical si déficit moteur progressif.",
    modeles: ["Névralgie cervico-brachiale", "Cervicalgie"], patho: "Névralgie cervico-brachiale"
  },
  "cerv:CEF": {
    axes: ["Thérapie manuelle cervicale haute", "Exercices des fléchisseurs profonds (flexion cranio-cervicale)", "Posture et ergonomie"],
    modeles: ["Cervicalgie"], patho: "Cervicalgie"
  },

  "chev:ATFL": {
    axes: ["Mise en charge précoce avec protection fonctionnelle (strapping, attelle)", "Proprioception et renforcement des fibulaires (prévention des récidives)", "Reprise du sport progressive"],
    eviter: ["Immobilisation stricte prolongée"],
    modeles: ["Entorse de cheville"], patho: "Entorse / instabilité de cheville"
  },
  "chev:ACH": {
    axes: ["Renforcement progressif du triceps (isométrique puis lourd lent ou excentrique)", "Gestion de la charge, notamment en course", "Douleur tolérée pendant l'exercice si elle redescend le lendemain"],
    eviter: ["Repos complet prolongé"],
    modeles: ["Tendinopathie d'Achille"], patho: "Tendinopathie d'Achille"
  },

  "hanche:CFA": {
    axes: ["Renforcement de la hanche et du tronc, contrôle moteur", "Adapter les positions de flexion profonde douloureuses"],
    avis: "Avis spécialisé si blocages ou échec du traitement conservateur.",
    modeles: ["Conflit fémoro-acétabulaire"], patho: "Conflit fémoro-acétabulaire"
  },
  "hanche:GTPS": {
    axes: ["Éducation : éviter la compression du tendon (jambes croisées, couché sur le côté atteint)", "Renforcement progressif des abducteurs (isométrique puis dynamique)"],
    eviter: ["Étirements en adduction du côté douloureux"],
    modeles: ["Tendinopathie du moyen fessier"], patho: "Tendinopathie du moyen fessier"
  },
  "hanche:OA": {
    axes: ["Exercice thérapeutique : renforcement + activité aérobie", "Éducation, gestion du poids et de l'activité"],
    modeles: ["Coxarthrose"], postop: ["Prothèse totale de hanche (PTH)"], patho: "Coxarthrose / prothèse de hanche"
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
  "vertiges:HYPO": {
    axes: ["Rééducation vestibulaire : stabilisation du regard", "Habituation aux mouvements de tête", "Équilibre et marche"],
    modeles: ["Rééducation vestibulaire"], patho: "Vertiges / vestibulaire"
  }
},

REGION: {
  genou: { zone: "Genou", modeles: ["Syndrome fémoro-patellaire", "Gonarthrose", "Lésion méniscale", "Rupture du LCA (sans opération)"], postop: ["Ligamentoplastie du LCA", "Prothèse totale de genou (PTG)"] },
  epaule: { zone: "Épaule", modeles: ["Tendinopathie de la coiffe et conflit", "Capsulite rétractile", "Instabilité d'épaule"], postop: ["Réparation de la coiffe des rotateurs"] },
  lombes: { zone: "Dos", modeles: ["Lombalgie", "Sciatique", "Hernie discale", "Sciatique et hernie discale", "Cruralgie", "Dos au travail"] },
  cerv: { zone: "Cervicales", modeles: ["Cervicalgie", "Névralgie cervico-brachiale"] },
  chev: { zone: "Cheville et pied", modeles: ["Entorse de cheville", "Tendinopathie d'Achille", "Fasciite plantaire", "Épine calcanéenne"] },
  hanche: { zone: "Hanche", modeles: ["Coxarthrose", "Tendinopathie du moyen fessier", "Conflit fémoro-acétabulaire"], postop: ["Prothèse totale de hanche (PTH)"] },
  coude: { zone: "Coude", modeles: ["Épicondylite (tennis elbow)", "Épitrochléite (golf elbow)"] },
  main: { zone: "Poignet et main", modeles: ["Canal carpien", "Tendinite de De Quervain", "Rhizarthrose"] },
  vertiges: { zone: "Corps entier", modeles: ["Rééducation vestibulaire", "VPPB (après manœuvre)"] }
},

MOTIF: {
  "Lombalgie": { modeles: ["Lombalgie"], patho: "Lombalgie" },
  "Cervicalgie": { modeles: ["Cervicalgie"], patho: "Cervicalgie" },
  "Sciatique": { modeles: ["Sciatique", "Hernie discale", "Sciatique et hernie discale"], patho: "Sciatique / radiculalgie" },
  "Trouble de l’équilibre": { modeles: ["Prévention des chutes"], patho: "Prévention des chutes / équilibre" },
  "Chutes / personne âgée": { modeles: ["Prévention des chutes"], patho: "Prévention des chutes / équilibre" },
  "Neurologie (AVC, Parkinson, SEP…)": { modeles: ["Maladie de Parkinson", "Sclérose en plaques", "Hémiplégie (AVC)", "SLA (maladie de Charcot)", "Charcot-Marie-Tooth"] },
  "Vertiges": { modeles: ["Rééducation vestibulaire"], patho: "Vertiges / vestibulaire" },
  "Respiratoire": { patho: "Respiratoire (BPCO, asthme…)" },
  "Remise en forme / reconditionnement": { modeles: ["Remise en forme (gym adaptée)"] }
},

PROFIL: {
  irritHaute: ["Doser sous le seuil douloureux, phase de protection courte", "Antalgie : techniques passives en appoint seulement"],
  chronique: ["Exposition graduée aux activités évitées", "Autonomisation : programme à domicile régulier"],
  jaunes: ["Éducation à la douleur, approche active", "Objectifs fonctionnels choisis avec le patient"],
  rf: "Drapeau rouge relevé : avis médical avant de débuter ou de poursuivre le traitement."
}
};
