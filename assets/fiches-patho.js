/* =========================================================
   Fiches conseils par pathologie (affiches « Fiche conseils pour patient »)
   ---------------------------------------------------------
   Chaque fiche porte la liste des modèles (par leur nom) auxquels
   elle est jointe d'office : charger le modèle pour un patient
   coche la fiche dans « Fiches conseils à joindre ».
   Elles ne passent pas en « info kiné du mois ».
   ========================================================= */

export const FICHES_PATHO = [
  {
    "id": "c-fiche-lombalgie-aigue",
    "titre": "Lombalgie aiguë (lumbago)",
    "resume": "Douleur récente du bas du dos, le plus souvent sans gravité.",
    "ico": "book",
    "affiche": "/images/conseils/fiches/lombalgie-aigue.jpg",
    "serie": "Fiche conseils patient",
    "fichePatho": true,
    "modeles": [
      "Lombalgie"
    ],
    "texte": "Douleur récente du bas du dos, le plus souvent sans gravité.\n\n## De quoi s'agit-il ?\nDouleur du bas du dos (zone lombaire) apparue depuis quelques jours, liée le plus souvent à une tension des muscles et des tissus.\n\n## Mes bons réflexes\n- Rester actif : Continuez vos activités quotidiennes, sans forcer.\n- Soulager la douleur : Utilisez du froid ou de la chaleur selon ce qui vous fait du bien.\n- Bouger en douceur : Reprenez progressivement des mouvements et des exercices simples.\n- Varier les positions : Alternez régulièrement entre assis, debout et marche, et évitez les postures prolongées.\n\n## À retenir\n- Le mouvement aide à récupérer.\n- La douleur s'améliore généralement en quelques jours.\n- Si elle persiste au-delà de 4 à 6 semaines, consultez un professionnel de santé.\n\n## Consultez sans attendre si\n- la douleur descend dans une jambe\n- des troubles pour uriner ou aller à la selle apparaissent\n- de la fièvre, ou un état général altéré"
  },
  {
    "id": "c-fiche-sciatique",
    "titre": "Sciatique (douleur du nerf sciatique)",
    "resume": "Douleur du bas du dos qui descend dans la jambe, le plus souvent passagère.",
    "ico": "book",
    "affiche": "/images/conseils/fiches/sciatique.jpg",
    "serie": "Fiche conseils patient",
    "fichePatho": true,
    "modeles": [
      "Sciatique"
    ],
    "texte": "Douleur du bas du dos qui descend dans la jambe, le plus souvent passagère.\n\n## De quoi s'agit-il ?\nLe nerf sciatique est irrité au niveau du bas du dos, souvent par un disque. La douleur descend dans la fesse et la jambe, parfois avec des fourmillements.\n\n## Mes bons réflexes\n- Rester actif : Marchez un peu plusieurs fois par jour, sans forcer.\n- Trouver les bonnes positions : Repérez les positions qui soulagent la jambe.\n- Bouger en douceur : Faites les exercices doux conseillés par votre kiné.\n- Éviter le repos au lit : Rester allongé longtemps retarde la guérison.\n\n## À retenir\n- Le mouvement doux aide le nerf à se calmer.\n- La douleur diminue le plus souvent en quelques semaines.\n- Si elle persiste au-delà de 6 semaines, consultez un professionnel de santé.\n\n## Consultez sans attendre si\n- la jambe devient faible ou le pied tombe\n- des troubles pour uriner ou aller à la selle apparaissent\n- une perte de sensibilité entre les cuisses apparaît"
  },
  {
    "id": "c-fiche-cervicalgie",
    "titre": "Cervicalgie (douleur du cou)",
    "resume": "Douleur du cou, le plus souvent sans gravité.",
    "ico": "book",
    "affiche": "/images/conseils/fiches/cervicalgie.jpg",
    "serie": "Fiche conseils patient",
    "fichePatho": true,
    "modeles": [
      "Cervicalgie"
    ],
    "texte": "Douleur du cou, le plus souvent sans gravité.\n\n## De quoi s'agit-il ?\nDouleur de la nuque liée le plus souvent à une tension des muscles et des articulations du cou, parfois avec une raideur.\n\n## Mes bons réflexes\n- Bouger le cou : Tournez et inclinez doucement la tête plusieurs fois par jour.\n- Relâcher les épaules : Détendez les épaules et respirez calmement.\n- Faire des pauses : Levez les yeux de l'écran toutes les 30 minutes.\n- Soulager la douleur : Utilisez la chaleur si elle vous fait du bien.\n\n## À retenir\n- Le mouvement aide à récupérer.\n- La douleur s'améliore généralement en quelques jours à quelques semaines.\n- Si elle persiste au-delà de 4 à 6 semaines, consultez un professionnel de santé.\n\n## Consultez sans attendre si\n- la douleur descend dans un bras avec perte de force\n- des vertiges, des troubles de la vue ou de la parole apparaissent\n- de la fièvre ou une douleur après un choc violent"
  },
  {
    "id": "c-fiche-coiffe",
    "titre": "Tendinopathie de la coiffe (douleur de l'épaule)",
    "resume": "Douleur de l'épaule liée aux tendons, qui guérit en travaillant.",
    "ico": "book",
    "affiche": "/images/conseils/fiches/coiffe.jpg",
    "serie": "Fiche conseils patient",
    "fichePatho": true,
    "modeles": [
      "Tendinopathie de la coiffe et conflit"
    ],
    "texte": "Douleur de l'épaule liée aux tendons, qui guérit en travaillant.\n\n## De quoi s'agit-il ?\nLes tendons qui entourent l'épaule sont irrités, souvent par des gestes répétés ou un effort inhabituel. La douleur est surtout présente quand on lève le bras.\n\n## Mes bons réflexes\n- Renforcer l'épaule : Faites vos exercices avec élastique, progressivement.\n- Adapter les gestes : Limitez temporairement les gestes au-dessus de la tête.\n- Accepter une gêne légère : Une douleur modérée pendant l'effort est acceptable.\n- Garder le bras actif : Évitez d'immobiliser le bras contre vous.\n\n## À retenir\n- Le tendon se renforce quand on le sollicite.\n- Une douleur qui passe en 24 heures est acceptable.\n- La récupération prend souvent plusieurs semaines à quelques mois.\n\n## Consultez sans attendre si\n- vous ne pouvez plus lever le bras après une chute\n- l'épaule est déformée ou très gonflée\n- de la fièvre ou une épaule rouge et chaude"
  },
  {
    "id": "c-fiche-gonarthrose",
    "titre": "Arthrose du genou (gonarthrose)",
    "resume": "L'activité est un traitement de l'arthrose.",
    "ico": "book",
    "affiche": "/images/conseils/fiches/gonarthrose.jpg",
    "serie": "Fiche conseils patient",
    "fichePatho": true,
    "modeles": [
      "Gonarthrose"
    ],
    "texte": "L'activité est un traitement de l'arthrose.\n\n## De quoi s'agit-il ?\nLe cartilage du genou s'use progressivement. Cela peut donner douleur, raideur et gonflement, surtout après l'effort ou le matin.\n\n## Mes bons réflexes\n- Rester actif : Marchez chaque jour, à votre rythme.\n- Renforcer les cuisses : Des cuisses fortes protègent le genou.\n- Pédaler ou nager : Le vélo et la natation ménagent l'articulation.\n- Doser l'effort : Alternez activité et repos selon la douleur.\n\n## À retenir\n- Le mouvement nourrit le cartilage.\n- Une activité régulière diminue la douleur.\n- Garder un poids de forme soulage le genou.\n\n## Consultez sans attendre si\n- le genou devient rouge, chaud et très gonflé\n- de la fièvre apparaît\n- vous ne pouvez plus du tout poser le pied"
  },
  {
    "id": "c-fiche-coxarthrose",
    "titre": "Arthrose de la hanche (coxarthrose)",
    "resume": "Une hanche qui bouge souffre moins.",
    "ico": "book",
    "affiche": "/images/conseils/fiches/coxarthrose.jpg",
    "serie": "Fiche conseils patient",
    "fichePatho": true,
    "modeles": [
      "Coxarthrose"
    ],
    "texte": "Une hanche qui bouge souffre moins.\n\n## De quoi s'agit-il ?\nLe cartilage de la hanche s'use progressivement. La douleur se situe souvent dans l'aine ou la cuisse, avec une raideur pour mettre les chaussettes ou monter en voiture.\n\n## Mes bons réflexes\n- Marcher régulièrement : Marchez chaque jour, avec des chaussures confortables.\n- Renforcer la hanche : Faites vos exercices pour les fessiers et les cuisses.\n- Pédaler ou nager : Le vélo et l'eau ménagent l'articulation.\n- Garder la souplesse : Étirez doucement la hanche chaque jour.\n\n## À retenir\n- L'activité physique est un traitement de l'arthrose.\n- Une activité régulière vaut mieux qu'un grand effort.\n- Garder un poids de forme soulage la hanche.\n\n## Consultez sans attendre si\n- une douleur brutale et intense après une chute\n- de la fièvre avec une hanche très douloureuse\n- vous ne pouvez plus du tout appuyer sur la jambe"
  },
  {
    "id": "c-fiche-entorse-cheville",
    "titre": "Entorse de cheville (ligaments de la cheville)",
    "resume": "Une cheville qui guérit en bougeant.",
    "ico": "run",
    "affiche": "/images/conseils/fiches/entorse-cheville.jpg",
    "serie": "Fiche conseils patient",
    "fichePatho": true,
    "modeles": [
      "Entorse de cheville"
    ],
    "texte": "Une cheville qui guérit en bougeant.\n\n## De quoi s'agit-il ?\nLes ligaments de la cheville ont été étirés lors d'une torsion du pied. La cheville gonfle et devient douloureuse, surtout à la marche.\n\n## Mes bons réflexes\n- Appuyer tôt : Posez le pied et marchez dès que possible.\n- Lutter contre le gonflement : Surélevez la jambe et appliquez du froid.\n- Travailler l'équilibre : Tenez sur une jambe chaque jour.\n- Reprendre progressivement : Revenez au sport par étapes.\n\n## À retenir\n- Bouger tôt aide la cicatrisation.\n- L'équilibre évite les récidives.\n- La guérison prend souvent quelques semaines.\n\n## Consultez sans attendre si\n- vous ne pouvez pas faire 4 pas après la torsion\n- une douleur vive sur un os de la cheville ou du pied\n- le pied devient froid, pâle ou insensible"
  },
  {
    "id": "c-fiche-canal-carpien",
    "titre": "Syndrome du canal carpien (nerf comprimé au poignet)",
    "resume": "Des fourmillements dans la main qui peuvent se soulager.",
    "ico": "book",
    "affiche": "/images/conseils/fiches/canal-carpien.jpg",
    "serie": "Fiche conseils patient",
    "fichePatho": true,
    "modeles": [
      "Canal carpien"
    ],
    "texte": "Des fourmillements dans la main qui peuvent se soulager.\n\n## De quoi s'agit-il ?\nLe nerf médian est comprimé au niveau du poignet. Il donne des fourmillements dans le pouce, l'index et le majeur, souvent la nuit.\n\n## Mes bons réflexes\n- Poignet droit la nuit : Portez une attelle de repos si elle est conseillée.\n- Faire des pauses : Interrompez les gestes répétés régulièrement.\n- Bouger doigts et poignet : Faites vos exercices de glissement du nerf.\n- Adapter vos gestes : Évitez de garder le poignet plié longtemps.\n\n## À retenir\n- Les fourmillements nocturnes sont fréquents.\n- Positions et pauses soulagent souvent les symptômes.\n- Parlez-en à votre médecin s'ils persistent.\n\n## Consultez sans attendre si\n- la main perd de la force ou lâche les objets\n- le muscle à la base du pouce fond\n- les doigts deviennent insensibles en permanence"
  },
  {
    "id": "c-fiche-epicondylite",
    "titre": "Épicondylite (tennis elbow)",
    "resume": "Une douleur du coude qui guérit avec une charge adaptée.",
    "ico": "book",
    "affiche": "/images/conseils/fiches/epicondylite.jpg",
    "serie": "Fiche conseils patient",
    "fichePatho": true,
    "modeles": [
      "Épicondylite (tennis elbow)"
    ],
    "texte": "Une douleur du coude qui guérit avec une charge adaptée.\n\n## De quoi s'agit-il ?\nLes tendons qui s'attachent à l'extérieur du coude sont surchargés, souvent par des gestes répétés de la main. Serrer ou porter devient douloureux.\n\n## Mes bons réflexes\n- Renforcer l'avant-bras : Faites vos exercices avec un petit poids, lentement.\n- Adapter les gestes : Portez les charges paume vers le haut.\n- Faire des pauses : Interrompez les gestes répétés régulièrement.\n- Patienter : La guérison prend souvent plusieurs semaines.\n\n## À retenir\n- Ni repos total, ni effort douloureux.\n- Une douleur légère pendant l'effort est acceptable.\n- La régularité des exercices fait la guérison.\n\n## Consultez sans attendre si\n- le coude est très gonflé, rouge ou chaud\n- une douleur brutale après un choc ou une chute\n- des fourmillements ou une perte de force dans la main"
  },
  {
    "id": "c-fiche-fasciite-plantaire",
    "titre": "Fasciite plantaire (douleur sous le talon)",
    "resume": "Une douleur du talon qui s'améliore avec des exercices réguliers.",
    "ico": "run",
    "affiche": "/images/conseils/fiches/fasciite-plantaire.jpg",
    "serie": "Fiche conseils patient",
    "fichePatho": true,
    "modeles": [
      "Fasciite plantaire"
    ],
    "texte": "Une douleur du talon qui s'améliore avec des exercices réguliers.\n\n## De quoi s'agit-il ?\nLa membrane sous le pied est irritée là où elle s'attache au talon. La douleur est typique aux premiers pas le matin.\n\n## Mes bons réflexes\n- Étirer le mollet : Étirez mollet et voûte plantaire chaque jour.\n- Bien se chausser : Portez des chaussures qui amortissent le talon.\n- Renforcer le pied : Montez sur la pointe des pieds lentement.\n- Adapter l'activité : Réduisez temporairement course et longues stations debout.\n\n## À retenir\n- La douleur au réveil est typique.\n- Elle s'améliore le plus souvent en quelques mois.\n- La régularité des exercices est la clé.\n\n## Consultez sans attendre si\n- le talon est rouge, chaud et gonflé\n- une douleur brutale avec un claquement\n- des fourmillements ou une perte de sensibilité du pied"
  },
  {
    "id": "c-fiche-femoro-patellaire",
    "titre": "Syndrome fémoro-patellaire (douleur à l'avant du genou)",
    "resume": "Une douleur du genou qui diminue en dosant l'effort.",
    "ico": "book",
    "affiche": "/images/conseils/fiches/femoro-patellaire.jpg",
    "serie": "Fiche conseils patient",
    "fichePatho": true,
    "modeles": [
      "Syndrome fémoro-patellaire"
    ],
    "texte": "Une douleur du genou qui diminue en dosant l'effort.\n\n## De quoi s'agit-il ?\nLa rotule et le fémur sont surchargés, souvent par les escaliers, les accroupissements ou la course. La douleur se situe autour de la rotule.\n\n## Mes bons réflexes\n- Doser l'effort : Réduisez temporairement escaliers et accroupis.\n- Renforcer les cuisses : Faites vos exercices pour les cuisses et les fessiers.\n- Éviter l'immobilité : Allongez les jambes quand vous restez assis longtemps.\n- Reprendre progressivement : Augmentez la course ou le sport pas à pas.\n\n## À retenir\n- La douleur vient d'une surcharge, pas d'une usure.\n- Un renforcement adapté la fait diminuer.\n- La reprise se fait par étapes.\n\n## Consultez sans attendre si\n- le genou se bloque ou lâche\n- le genou est très gonflé après un choc\n- de la fièvre avec un genou rouge et chaud"
  },
  {
    "id": "c-fiche-hernie-discale",
    "titre": "Hernie discale (disque du bas du dos)",
    "resume": "La plupart des hernies guérissent sans opération.",
    "ico": "book",
    "affiche": "/images/conseils/fiches/hernie-discale.jpg",
    "serie": "Fiche conseils patient",
    "fichePatho": true,
    "modeles": [
      "Hernie discale",
      "Sciatique et hernie discale"
    ],
    "texte": "La plupart des hernies guérissent sans opération.\n\n## De quoi s'agit-il ?\nUne partie du disque entre deux vertèbres fait saillie et peut irriter un nerf. La douleur peut toucher le dos et descendre dans la jambe.\n\n## Mes bons réflexes\n- Rester actif : Continuez vos activités, sans forcer.\n- Trouver les bonnes positions : Repérez les positions qui vous soulagent.\n- Renforcer le tronc : Faites vos exercices de gainage doux.\n- Varier les positions : Alternez assis, debout et marche.\n\n## À retenir\n- Le disque cicatrise avec le temps.\n- Beaucoup de hernies diminuent en quelques mois.\n- Le mouvement adapté accompagne la guérison.\n\n## Consultez sans attendre si\n- la jambe devient faible ou le pied tombe\n- des troubles pour uriner ou aller à la selle apparaissent\n- une perte de sensibilité entre les cuisses apparaît"
  },
  {
    "id": "c-fiche-lombalgie-chronique",
    "titre": "Lombalgie chronique (mal de dos qui dure)",
    "resume": "Un dos solide se reconstruit pas à pas.",
    "ico": "book",
    "affiche": "/images/conseils/fiches/lombalgie-chronique.jpg",
    "serie": "Fiche conseils patient",
    "fichePatho": true,
    "modeles": [
      "Lombalgie chronique (reconditionnement)"
    ],
    "texte": "Un dos solide se reconstruit pas à pas.\n\n## De quoi s'agit-il ?\nDouleur du bas du dos présente depuis plus de 3 mois. Elle n'est pas le signe d'une lésion qui s'aggrave : le dos a surtout perdu force et endurance.\n\n## Mes bons réflexes\n- Bouger chaque jour : Marchez ou pédalez un peu plus chaque semaine.\n- Renforcer le dos : Faites vos exercices de renforcement régulièrement.\n- Doser l'effort : Augmentez progressivement, même les jours difficiles.\n- Prendre soin de soi : Sommeil, détente et activités plaisir aident le dos.\n\n## À retenir\n- Douleur ne veut pas dire danger.\n- La régularité compte plus que l'intensité.\n- Les progrès viennent en quelques semaines d'entraînement.\n\n## Consultez sans attendre si\n- une douleur dans la jambe avec perte de force\n- des troubles pour uriner ou aller à la selle apparaissent\n- de la fièvre ou un amaigrissement inexpliqué"
  },
  {
    "id": "c-fiche-dos-au-travail",
    "titre": "Le dos au travail (prévention)",
    "resume": "La meilleure position, c'est la suivante.",
    "ico": "heart",
    "affiche": "/images/conseils/fiches/dos-au-travail.jpg",
    "serie": "Fiche conseils patient",
    "fichePatho": true,
    "modeles": [
      "Dos au travail"
    ],
    "texte": "La meilleure position, c'est la suivante.\n\n## De quoi s'agit-il ?\nRester longtemps dans la même position ou porter mal fatigue le dos. De petites habitudes au quotidien le protègent.\n\n## Mes bons réflexes\n- Changer de position : Levez-vous et bougez toutes les 30 minutes.\n- Bien porter : Pliez les jambes et gardez la charge près du corps.\n- Régler son poste : Écran à hauteur des yeux, pieds à plat.\n- Bouger en pause : Étirez-vous et marchez pendant les pauses.\n\n## À retenir\n- Aucune posture n'est parfaite si on la garde trop longtemps.\n- Le mouvement est le meilleur protecteur du dos.\n- Une activité physique régulière réduit le mal de dos.\n\n## Consultez sans attendre si\n- une douleur dans la jambe avec perte de force\n- des troubles pour uriner ou aller à la selle apparaissent\n- une douleur intense qui ne cède pas au repos"
  },
  {
    "id": "c-fiche-nevralgie-cervico-brachiale",
    "titre": "Névralgie cervico-brachiale (douleur du cou vers le bras)",
    "resume": "Une douleur du nerf, le plus souvent passagère.",
    "ico": "book",
    "affiche": "/images/conseils/fiches/nevralgie-cervico-brachiale.jpg",
    "serie": "Fiche conseils patient",
    "fichePatho": true,
    "modeles": [
      "Névralgie cervico-brachiale"
    ],
    "texte": "Une douleur du nerf, le plus souvent passagère.\n\n## De quoi s'agit-il ?\nUn nerf est irrité à sa sortie du cou. La douleur descend dans l'épaule et le bras, parfois avec des fourmillements dans la main.\n\n## Mes bons réflexes\n- Bouger doucement : Mobilisez le cou et le bras sans forcer.\n- Trouver les bonnes positions : Repérez les positions qui soulagent le bras.\n- Bien dormir : Utilisez un oreiller qui soutient le cou.\n- Faire des pauses : Évitez de rester longtemps tête penchée.\n\n## À retenir\n- Le mouvement doux aide le nerf à se calmer.\n- La douleur diminue le plus souvent en quelques semaines.\n- Une gêne peut persister quelques mois, c'est fréquent.\n\n## Consultez sans attendre si\n- le bras ou la main perd de la force\n- des troubles de la marche ou de l'équilibre apparaissent\n- de la fièvre ou une douleur après un choc violent"
  },
  {
    "id": "c-fiche-capsulite",
    "titre": "Capsulite rétractile (épaule gelée)",
    "resume": "Une guérison lente, mais presque toujours complète.",
    "ico": "book",
    "affiche": "/images/conseils/fiches/capsulite.jpg",
    "serie": "Fiche conseils patient",
    "fichePatho": true,
    "modeles": [
      "Capsulite rétractile"
    ],
    "texte": "Une guérison lente, mais presque toujours complète.\n\n## De quoi s'agit-il ?\nL'enveloppe de l'épaule s'enflamme puis se rétracte. L'épaule devient douloureuse puis raide, avant de récupérer sur plusieurs mois.\n\n## Mes bons réflexes\n- Bouger sans forcer : Faites vos exercices doux, sans douleur forte.\n- Garder le quotidien : Utilisez votre bras pour les gestes simples.\n- Soulager la douleur : La chaleur détend souvent l'épaule.\n- Être patient : La récupération prend plusieurs mois.\n\n## À retenir\n- La capsulite passe par 3 phases : douleur, raideur, récupération.\n- Forcer n'accélère pas la guérison.\n- La grande majorité des épaules récupèrent.\n\n## Consultez sans attendre si\n- l'épaule est rouge, chaude, avec de la fièvre\n- une douleur brutale après une chute\n- une douleur dans la poitrine ou un essoufflement"
  },
  {
    "id": "c-fiche-ptg",
    "titre": "Prothèse de genou (PTG)",
    "resume": "Votre nouveau genou se travaille chaque jour.",
    "ico": "book",
    "affiche": "/images/conseils/fiches/ptg.jpg",
    "serie": "Fiche conseils patient",
    "fichePatho": true,
    "modeles": [
      "Prothèse totale de genou (PTG)"
    ],
    "texte": "Votre nouveau genou se travaille chaque jour.\n\n## De quoi s'agit-il ?\nL'articulation usée du genou a été remplacée par une prothèse. La rééducation permet de retrouver la souplesse, la force et la marche.\n\n## Mes bons réflexes\n- Plier et tendre : Travaillez la flexion et l'extension chaque jour.\n- Renforcer la cuisse : Faites vos exercices de renforcement.\n- Glacer si besoin : Le froid limite le gonflement après les exercices.\n- Marcher un peu plus : Augmentez la distance chaque jour.\n\n## À retenir\n- La régularité des exercices fait la qualité du résultat.\n- Le gonflement peut durer plusieurs semaines.\n- La récupération complète prend plusieurs mois.\n\n## Consultez sans attendre si\n- le mollet devient douloureux, chaud ou gonflé\n- la cicatrice coule, rougit ou de la fièvre apparaît\n- un essoufflement ou une douleur dans la poitrine"
  },
  {
    "id": "c-fiche-pth",
    "titre": "Prothèse de hanche (PTH)",
    "resume": "Marcher tôt, progresser chaque jour.",
    "ico": "book",
    "affiche": "/images/conseils/fiches/pth.jpg",
    "serie": "Fiche conseils patient",
    "fichePatho": true,
    "modeles": [
      "Prothèse totale de hanche (PTH)"
    ],
    "texte": "Marcher tôt, progresser chaque jour.\n\n## De quoi s'agit-il ?\nL'articulation usée de la hanche a été remplacée par une prothèse. La rééducation aide à retrouver une marche fluide et l'autonomie.\n\n## Mes bons réflexes\n- Marcher régulièrement : Marchez un peu plus chaque jour.\n- Renforcer la hanche : Faites vos exercices pour les fessiers et les cuisses.\n- Respecter les consignes : Suivez les précautions données par votre chirurgien.\n- Travailler l'équilibre : Retrouvez confiance en vous sur vos jambes.\n\n## À retenir\n- Plus vous restez actif, plus vous récupérez vite.\n- La boiterie diminue avec le renforcement.\n- La récupération complète prend quelques mois.\n\n## Consultez sans attendre si\n- le mollet devient douloureux, chaud ou gonflé\n- la cicatrice coule, rougit ou de la fièvre apparaît\n- une douleur brutale ou la jambe se raccourcit"
  },
  {
    "id": "c-fiche-ligamentoplastie-lca",
    "titre": "Ligamentoplastie du LCA (reconstruction du ligament croisé)",
    "resume": "Le nouveau ligament se construit étape par étape.",
    "ico": "book",
    "affiche": "/images/conseils/fiches/ligamentoplastie-lca.jpg",
    "serie": "Fiche conseils patient",
    "fichePatho": true,
    "modeles": [
      "Ligamentoplastie du LCA"
    ],
    "texte": "Le nouveau ligament se construit étape par étape.\n\n## De quoi s'agit-il ?\nLe ligament croisé antérieur rompu a été remplacé par une greffe. Elle met plusieurs mois à devenir solide.\n\n## Mes bons réflexes\n- Tendre le genou : Retrouvez d'abord l'extension complète.\n- Renforcer la cuisse : Faites vos exercices de renforcement progressifs.\n- Travailler l'équilibre : Tenez sur une jambe chaque jour.\n- Respecter les étapes : Attendez les tests avant de reprendre le sport.\n\n## À retenir\n- Chaque étape a son moment.\n- Le retour au sport se fait sur des critères, pas seulement des dates.\n- Comptez au moins 9 mois avant les sports de pivot.\n\n## Consultez sans attendre si\n- le mollet devient douloureux, chaud ou gonflé\n- la cicatrice coule, rougit ou de la fièvre apparaît\n- le genou gonfle fortement ou se bloque"
  },
  {
    "id": "c-fiche-tendinopathie-achille",
    "titre": "Tendinopathie d'Achille (douleur du tendon d'Achille)",
    "resume": "Le tendon a besoin de charge, pas de repos.",
    "ico": "run",
    "affiche": "/images/conseils/fiches/tendinopathie-achille.jpg",
    "serie": "Fiche conseils patient",
    "fichePatho": true,
    "modeles": [
      "Tendinopathie d'Achille"
    ],
    "texte": "Le tendon a besoin de charge, pas de repos.\n\n## De quoi s'agit-il ?\nLe tendon d'Achille, à l'arrière du talon, est surchargé. Il est souvent raide et douloureux le matin ou au début de l'effort.\n\n## Mes bons réflexes\n- Renforcer le mollet : Montez et descendez lentement sur la pointe des pieds.\n- Adapter la course : Réduisez temporairement la course et les sauts.\n- Bien se chausser : Choisissez des chaussures confortables.\n- Patienter : La guérison prend souvent plusieurs mois.\n\n## À retenir\n- Le repos complet n'est pas la solution.\n- Une douleur qui passe en 24 heures est acceptable.\n- La régularité des exercices fait la guérison.\n\n## Consultez sans attendre si\n- un claquement avec une douleur brutale du mollet\n- vous ne pouvez plus monter sur la pointe du pied\n- le talon est rouge, chaud et très gonflé"
  }
];

const norm = s => String(s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

/** Identifiants des fiches à joindre pour un modèle (nom du modèle, sans le niveau). */
export function fichesDuModele(nom){
  const n = norm(nom);
  if(!n) return [];
  return FICHES_PATHO.filter(f => f.modeles.some(m => norm(m) === n)).map(f => f.id);
}
