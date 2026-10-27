/* =====================================================================
   FICHES D'EXPLICATION DES TESTS (infobulle au survol sur PC, au clic sur tactile)
   Clé = nom exact du test dans data.js. Champs :
     t = technique, p = positif si, r = lien fiche de référence (optionnel),
     v = lien vidéo précis (optionnel ; sinon recherche YouTube automatique),
     i = chemin d'une image dans ce dossier, ex. "img/lachman.jpg" (optionnel)
   Résumés pédagogiques : à confronter à la technique enseignée dans ton école.
   ===================================================================== */
const GUIDE={
"Lachman":{t:"Patient en décubitus, genou fléchi à 20-30°. Une main stabilise le fémur, l’autre tire le tibia proximal vers l’avant.",p:"Translation antérieure du tibia avec arrêt mou ou absent, comparée au côté sain."},
"Tiroir antérieur":{t:"Patient en décubitus, hanche à 45°, genou à 90°, pied posé sur la table, ischio-jambiers relâchés. Tirer le tibia proximal vers l’avant.",p:"Translation antérieure excessive comparée au côté sain."},
"Pivot shift":{t:"Genou en extension : rotation interne du tibia et valgus, puis flexion progressive.",p:"Subluxation antérieure du plateau tibial externe, réduite brusquement en flexion (≈ 20-40°)."},
"Lever sign":{t:"Patient en décubitus, jambes en extension. Poing de l’examinateur sous le mollet (tiers proximal de la jambe) comme point d’appui ; pression modérée vers le bas sur le tiers distal de la cuisse (Lelli 2014).",p:"Le talon ne se soulève pas de la table (LCA rompu). Si le talon se soulève, le test est négatif.",r:"https://carepatron.com/templates/lever-sign-test"},
"McMurray":{t:"Patient en décubitus, genou fléchi au maximum. Rotation du tibia (externe pour le ménisque médial, interne pour le latéral) en ramenant le genou vers l’extension. Les protocoles varient selon les études.",p:"Claquement ou douleur sur l’interligne reproduisant les symptômes."},
"Palpation de l’interligne":{t:"Genou fléchi à 90° : palper l’interligne articulaire médial puis latéral.",p:"Douleur localisée reproduisant la douleur du patient."},
"Thessaly 20°":{t:"Patient debout sur la jambe atteinte, tenu par les mains de l’examinateur, genou fléchi à 20°. Rotation du corps et du genou en dedans puis en dehors (3 fois).",p:"Douleur de l’interligne, sensation de blocage ou d’accrochage."},
"Douleur à l’accroupissement (squat)":{t:"Demander au patient de s’accroupir (squat) en observant la douleur.",p:"Douleur antérieure de genou (rotule) reproduite."},
"Critères cliniques NICE de gonarthrose":{t:"Interrogatoire, sans geste ni imagerie.",p:"Âge ≥ 45 ans + douleur liée à l’activité + raideur matinale absente ou ≤ 30 minutes."},
"Arc douloureux":{t:"Le patient élève activement le bras en abduction, éventuellement contre légère résistance (description variable selon les études).",p:"Douleur entre environ 60° et 120° d’abduction.",r:"https://apta.org/patient-care/evidence-based-practice-resources/test-measures/arc-sign"},
"Drop arm":{t:"Bras amené à 90° d’abduction ; demander au patient de le redescendre lentement.",p:"Le bras chute ou ne peut être contrôlé, avec douleur."},
"Rotation externe contrariée":{t:"Coude fléchi à 90° contre le corps ; le patient résiste à une poussée en rotation externe.",p:"Douleur ou faiblesse (critère composite chez Hermans 2013)."},
"Lag test rotation externe":{t:"Coude à 90°, épaule en légère élévation dans le plan scapulaire. L’examinateur amène passivement l’épaule en rotation externe quasi maximale, puis lâche.",p:"Le patient ne maintient pas la position : retour en rotation interne (lag)."},
"Jobe (faiblesse)":{t:"Bras à 90° d’abduction dans le plan scapulaire, pouces vers le bas (« empty can ») ; résistance vers le bas.",p:"Faiblesse (critère de rupture dans Hermans 2013) ; la douleur seule n’a pas la même valeur."},
"Lag test rotation interne":{t:"Dos de la main placé par l’examinateur dans le dos (région lombaire), coude à 90°, main décollée passivement du dos, puis lâchée.",p:"Le patient ne maintient pas la main décollée du dos."},
"Lift-off (avec lag)":{t:"Dos de la main contre la région lombaire ; le patient doit décoller la main du dos (Gerber). Version avec lag : la main est amenée passivement puis le patient doit maintenir.",p:"Incapacité de décoller ou de maintenir la main (subscapulaire)."},
"Neer":{t:"Bras en rotation interne, élévation passive maximale dans le plan scapulaire, scapula stabilisée.",p:"Douleur à l’élévation."},
"Hawkins-Kennedy":{t:"Bras à 90° d’élévation antérieure, coude à 90° : rotation interne passive de l’épaule.",p:"Douleur."},
"Appréhension":{t:"Patient avec le bras à 90° d’abduction et le coude à 90° : rotation externe lente de l’épaule.",p:"Sensation d’appréhension du patient. La douleur seule n’est pas un signe positif.",r:"https://www.ptprogress.com/special-tests/shoulder-special-tests/apprehension-test/"},
"Relocation":{t:"À réaliser après une appréhension positive : force dirigée vers l’arrière sur la tête humérale.",p:"Disparition de l’appréhension."},
"Tiroir antérieur de l’épaule":{t:"Patient en décubitus, épaule en légère abduction. Une main stabilise la scapula, l’autre pousse la tête humérale vers l’avant.",p:"Reproduction des symptômes d’instabilité (critère de Farber 2006)."},
"Lasègue (SLR)":{t:"Patient en décubitus, genou en extension. Flexion de hanche passive lente, en observant la réaction.",p:"Reproduction de la douleur de jambe habituelle du patient. Une douleur d’étirement des ischio-jambiers peut donner des faux positifs.",r:"https://www.physiotutors.com/wiki/straight-leg-raise-test/"},
"Lasègue croisé":{t:"Même geste que le Lasègue, réalisé sur la jambe saine.",p:"Reproduction de la douleur dans la jambe douloureuse (côté opposé)."},
"Pas de douleur en position assise":{t:"Interrogatoire : la douleur de jambe est-elle absente assis ?",p:"Réponse oui (critère de Suri 2010)."},
"Amélioration en flexion avant":{t:"Interrogatoire : les symptômes de jambe diminuent-ils quand le patient se penche en avant ?",p:"Réponse oui."},
"Douleur bilatérale fesses / jambes":{t:"Interrogatoire : douleur des deux fesses ou des deux jambes.",p:"Présence d’une douleur bilatérale."},
"Claudication neurogène":{t:"Interrogatoire : gêne de jambe à la marche ou debout, soulagée par la position assise ou la flexion lombaire, aggravée par l’extension.",p:"Tableau typique présent."},
"Démarche à base élargie":{t:"Observer la marche du patient.",p:"Écartement des pieds augmenté."},
"Romberg anormal":{t:"Patient debout pieds joints, yeux ouverts puis fermés.",p:"Perte d’équilibre ou oscillations importantes yeux fermés."},
"ULNT A (ULNT1)":{t:"Patient en décubitus : ceinture scapulaire abaissée, abduction d’épaule ≈ 90°, rotation externe, supination, extension du poignet et des doigts, puis extension du coude ; l’inclinaison cervicale sert de sensibilisation.",p:"Reproduction des symptômes du patient, modifiés par l’inclinaison cervicale.",r:"https://www.physiotutors.com/wiki/cluster-of-wainner/"},
"Rotation cervicale < 60°":{t:"Mesurer la rotation active vers le côté symptomatique, idéalement à l’inclinomètre ou au CROM.",p:"Rotation inférieure à 60° (environ 80° chez le sujet sain).",r:"https://www.physiotutors.com/wiki/cluster-of-wainner/"},
"Distraction cervicale":{t:"Patient assis ou en décubitus ; une main sous le menton, l’autre sous l’occiput : traction douce vers le haut.",p:"Diminution de la douleur familière du bras (si douleur présente au moment du test).",r:"https://www.physiotutors.com/wiki/cluster-of-wainner/"},
"Spurling A":{t:"Patient assis : inclinaison latérale du cou vers le côté symptomatique, puis compression axiale douce. Arrêter dès que les symptômes sont reproduits.",p:"Reproduction de la douleur du bras.",r:"https://www.physiotutors.com/wiki/cluster-of-wainner/"},
"Flexion-rotation test":{t:"Patient en décubitus, rachis cervical en flexion maximale ; rotation passive de la tête à droite puis à gauche.",p:"Rotation réduite d’au moins 10° par rapport à la valeur normale (≈ 44°), ou céphalée reproduite.",r:"https://www.physiotutors.com/wiki/flexion-rotation-test/"},
"Tiroir antérieur de la cheville":{t:"Cheville en légère flexion plantaire (≈ 20°), tibia stabilisé ; tirer le talon vers l’avant.",p:"Translation antérieure excessive comparée au côté sain. Plus performant environ 5 jours après le traumatisme."},
"Palpation du tendon d’Achille":{t:"Palper le tendon 2 à 6 cm au-dessus de son insertion calcanéenne.",p:"Douleur localisée reproduisant les symptômes.",r:"https://apta.org/patient-care/evidence-based-practice-resources/test-measures/achilles-tendon-palpation-test"},
"Royal London Hospital test":{t:"Repérer la zone tendineuse douloureuse cheville en position neutre, puis amener la cheville en flexion dorsale (tendon en tension) et palper de nouveau.",p:"La douleur diminue nettement ou disparaît quand le tendon est en tension.",r:"https://www.carepatron.com/templates/royal-london-hospital-test"},
"Arc sign":{t:"Palper la zone de tuméfaction intratendineuse pendant des mouvements de flexion dorsale et plantaire.",p:"Le gonflement suit le mouvement du tendon.",r:"https://apta.org/patient-care/evidence-based-practice-resources/test-measures/arc-sign"}
};
