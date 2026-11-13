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
      "Hernie discale"
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
  },
  {
    "id": "c-fiche-prevention-chutes",
    "titre": "Prévenir les chutes (équilibre et autonomie)",
    "resume": "L'équilibre s'entretient à tout âge.",
    "ico": "book",
    "affiche": "/images/conseils/fiches/prevention-chutes.jpg",
    "serie": "Fiche conseils patient",
    "fichePatho": true,
    "modeles": [
      "Prévention des chutes"
    ],
    "texte": "L'équilibre s'entretient à tout âge.\n\n## De quoi s'agit-il ?\nAvec l'âge, la force et l'équilibre diminuent si on ne les entraîne pas. Quelques exercices et un logement sûr réduisent fortement le risque de chute.\n\n## Mes bons réflexes\n- Travailler l'équilibre : Tenez sur une jambe en vous tenant à une chaise.\n- Renforcer les jambes : Levez-vous et asseyez-vous plusieurs fois.\n- Marcher chaque jour : La marche entretient force et équilibre.\n- Sécuriser la maison : Retirez les tapis, éclairez bien, installez des barres.\n\n## À retenir\n- La plupart des chutes peuvent être évitées.\n- Quelques minutes d'exercice par jour suffisent.\n- Faites vérifier régulièrement votre vue et vos médicaments.\n\n## Consultez sans attendre si\n- vous chutez souvent ou avez peur de tomber\n- des vertiges ou malaises apparaissent\n- après une chute, une douleur vive empêche de marcher"
  },
  {
    "id": "c-fiche-osteoporose",
    "titre": "Ostéoporose (fragilité des os)",
    "resume": "L'exercice renforce les os.",
    "ico": "book",
    "affiche": "/images/conseils/fiches/osteoporose.jpg",
    "serie": "Fiche conseils patient",
    "fichePatho": true,
    "modeles": [
      "Ostéoporose"
    ],
    "texte": "L'exercice renforce les os.\n\n## De quoi s'agit-il ?\nLes os deviennent moins denses et plus fragiles, avec un risque de fracture. L'activité physique et l'équilibre aident à les protéger.\n\n## Mes bons réflexes\n- Marcher et porter : Marchez et portez de petites charges régulièrement.\n- Renforcer vos muscles : Faites vos exercices de renforcement 2 à 3 fois par semaine.\n- Travailler l'équilibre : Un bon équilibre évite les chutes.\n- Bien se nourrir : Calcium, protéines et vitamine D nourrissent les os.\n\n## À retenir\n- Les os se renforcent quand ils travaillent.\n- Muscles et équilibre protègent des fractures.\n- Parlez avec votre médecin de votre traitement.\n\n## Consultez sans attendre si\n- une douleur brutale du dos sans raison apparente\n- une douleur vive après une chute, même légère\n- une perte de taille ou un dos qui se voûte"
  },
  {
    "id": "c-fiche-lesion-meniscale",
    "titre": "Lésion méniscale (ménisque du genou)",
    "resume": "Beaucoup de lésions se soignent sans opération.",
    "ico": "book",
    "affiche": "/images/conseils/fiches/lesion-meniscale.jpg",
    "serie": "Fiche conseils patient",
    "fichePatho": true,
    "modeles": [
      "Lésion méniscale"
    ],
    "texte": "Beaucoup de lésions se soignent sans opération.\n\n## De quoi s'agit-il ?\nLe ménisque, petit coussin entre le fémur et le tibia, est abîmé. Le genou peut être douloureux, gonfler ou parfois accrocher.\n\n## Mes bons réflexes\n- Renforcer la cuisse : Des cuisses fortes protègent le ménisque.\n- Bouger le genou : Pliez et tendez le genou chaque jour.\n- Éviter les torsions : Limitez les pivots brusques au début.\n- Reprendre progressivement : Revenez au sport par étapes.\n\n## À retenir\n- La rééducation est le premier traitement.\n- Un genou bien musclé compense souvent la lésion.\n- La récupération prend quelques semaines à quelques mois.\n\n## Consultez sans attendre si\n- le genou se bloque et ne se tend plus\n- le genou est très gonflé après un choc\n- de la fièvre avec un genou rouge et chaud"
  },
  {
    "id": "c-fiche-tendinopathie-rotulienne",
    "titre": "Tendinopathie rotulienne (tendon sous la rotule)",
    "resume": "Le tendon a besoin de charge, pas de repos.",
    "ico": "book",
    "affiche": "/images/conseils/fiches/tendinopathie-rotulienne.jpg",
    "serie": "Fiche conseils patient",
    "fichePatho": true,
    "modeles": [
      "Tendinopathie rotulienne"
    ],
    "texte": "Le tendon a besoin de charge, pas de repos.\n\n## De quoi s'agit-il ?\nLe tendon situé sous la rotule est surchargé, souvent par les sauts ou la course. La douleur apparaît à l'effort, juste sous la rotule.\n\n## Mes bons réflexes\n- Renforcer la cuisse : Faites vos exercices de squat lent, progressivement.\n- Adapter les sauts : Réduisez temporairement sauts et réceptions.\n- Suivre la douleur : Une douleur légère pendant l'effort est acceptable.\n- Reprendre progressivement : Revenez au sport par étapes.\n\n## À retenir\n- Le repos complet n'est pas la solution.\n- Une douleur qui passe en 24 heures est acceptable.\n- La guérison prend souvent plusieurs mois.\n\n## Consultez sans attendre si\n- un claquement avec une douleur brutale\n- vous ne pouvez plus tendre la jambe\n- le genou est rouge, chaud et très gonflé"
  },
  {
    "id": "c-fiche-rhizarthrose",
    "titre": "Rhizarthrose (arthrose du pouce)",
    "resume": "Un pouce qui bouge souffre moins.",
    "ico": "book",
    "affiche": "/images/conseils/fiches/rhizarthrose.jpg",
    "serie": "Fiche conseils patient",
    "fichePatho": true,
    "modeles": [
      "Rhizarthrose"
    ],
    "texte": "Un pouce qui bouge souffre moins.\n\n## De quoi s'agit-il ?\nLe cartilage à la base du pouce s'use. Pincer, ouvrir un bocal ou tourner une clé devient douloureux.\n\n## Mes bons réflexes\n- Renforcer la main : Faites vos exercices pour les muscles du pouce.\n- Utiliser des aides : Ouvre-bocal, gros manches, ciseaux adaptés.\n- Porter l'orthèse : Portez-la si elle vous a été conseillée.\n- Alterner effort et repos : Faites des pauses pendant les gestes de pince.\n\n## À retenir\n- Le mouvement doux entretient l'articulation.\n- Les aides techniques soulagent au quotidien.\n- La chaleur détend souvent la main.\n\n## Consultez sans attendre si\n- le pouce devient rouge, chaud et très gonflé\n- une douleur brutale après une chute\n- des fourmillements ou une perte de force dans la main"
  },
  {
    "id": "c-fiche-de-quervain",
    "titre": "Tendinite de De Quervain (tendons du pouce)",
    "resume": "Le tendon a besoin de calme, puis de mouvement.",
    "ico": "book",
    "affiche": "/images/conseils/fiches/de-quervain.jpg",
    "serie": "Fiche conseils patient",
    "fichePatho": true,
    "modeles": [
      "Tendinite de De Quervain"
    ],
    "texte": "Le tendon a besoin de calme, puis de mouvement.\n\n## De quoi s'agit-il ?\nLes tendons qui passent au bord du poignet, côté pouce, sont irrités. C'est fréquent après une naissance ou des gestes répétés.\n\n## Mes bons réflexes\n- Limiter la pince : Réduisez les gestes de pince et de torsion.\n- Porter l'attelle : Portez-la si elle vous a été conseillée.\n- Porter autrement : Portez bébé ou les charges à deux mains, paumes vers le haut.\n- Reprendre progressivement : Faites vos exercices doux conseillés.\n\n## À retenir\n- La douleur s'améliore avec des gestes adaptés.\n- Le repos relatif aide au début.\n- Un renforcement progressif évite les rechutes.\n\n## Consultez sans attendre si\n- le poignet est rouge, chaud et très gonflé\n- une douleur brutale après une chute\n- des fourmillements permanents dans les doigts"
  },
  {
    "id": "c-fiche-moyen-fessier",
    "titre": "Tendinopathie du moyen fessier (douleur sur le côté de la hanche)",
    "resume": "Un tendon de hanche qui guérit en travaillant.",
    "ico": "book",
    "affiche": "/images/conseils/fiches/moyen-fessier.jpg",
    "serie": "Fiche conseils patient",
    "fichePatho": true,
    "modeles": [
      "Tendinopathie du moyen fessier"
    ],
    "texte": "Un tendon de hanche qui guérit en travaillant.\n\n## De quoi s'agit-il ?\nLe tendon du muscle fessier, sur le côté de la hanche, est surchargé. La douleur est souvent présente couché sur le côté ou en montant les escaliers.\n\n## Mes bons réflexes\n- Ne pas croiser les jambes : Gardez les genoux écartés, assis comme debout.\n- Bien dormir : Dormez avec un coussin entre les genoux.\n- Renforcer le fessier : Faites vos exercices progressivement.\n- Se tenir droit : Évitez de vous déhancher en position debout.\n\n## À retenir\n- Changer ses postures diminue la douleur.\n- Le renforcement progressif guérit le tendon.\n- La récupération prend souvent quelques mois.\n\n## Consultez sans attendre si\n- une douleur brutale après une chute\n- de la fièvre avec une hanche très douloureuse\n- vous ne pouvez plus du tout appuyer sur la jambe"
  },
  {
    "id": "c-fiche-reparation-coiffe",
    "titre": "Réparation de la coiffe (après l'opération de l'épaule)",
    "resume": "Respecter les délais, c'est protéger la réparation.",
    "ico": "book",
    "affiche": "/images/conseils/fiches/reparation-coiffe.jpg",
    "serie": "Fiche conseils patient",
    "fichePatho": true,
    "modeles": [
      "Réparation de la coiffe des rotateurs"
    ],
    "texte": "Respecter les délais, c'est protéger la réparation.\n\n## De quoi s'agit-il ?\nLe tendon de l'épaule a été recousu sur l'os. Il met plusieurs mois à cicatriser solidement : chaque étape de la rééducation arrive au bon moment.\n\n## Mes bons réflexes\n- Porter l'attelle : Gardez-la comme prescrit par votre chirurgien.\n- Bouger sans forcer : Faites seulement les exercices autorisés.\n- Pas de charge : Attendez l'accord avant de porter.\n- Être patient : La récupération prend 6 mois à 1 an.\n\n## À retenir\n- Respecter les délais protège la suture.\n- La douleur diminue progressivement.\n- La force revient en dernier, plusieurs mois après.\n\n## Consultez sans attendre si\n- la cicatrice coule, rougit ou de la fièvre apparaît\n- une douleur brutale avec un claquement\n- la main devient froide, gonflée ou insensible"
  },
  {
    "id": "c-fiche-instabilite-epaule",
    "titre": "Instabilité d'épaule (épaule qui se déboîte)",
    "resume": "Une épaule stable se muscle.",
    "ico": "book",
    "affiche": "/images/conseils/fiches/instabilite-epaule.jpg",
    "serie": "Fiche conseils patient",
    "fichePatho": true,
    "modeles": [
      "Instabilité d'épaule"
    ],
    "texte": "Une épaule stable se muscle.\n\n## De quoi s'agit-il ?\nL'épaule s'est déboîtée ou a tendance à se déplacer. Les muscles autour de l'articulation peuvent apprendre à mieux la tenir.\n\n## Mes bons réflexes\n- Renforcer l'épaule : Faites vos exercices avec élastique.\n- Contrôler les gestes : Travaillez des mouvements lents et précis.\n- Éviter les positions à risque : Bras levé et tourné en arrière au début.\n- Reprendre progressivement : Revenez au sport par étapes.\n\n## À retenir\n- Des muscles forts limitent les récidives.\n- Le travail régulier redonne confiance.\n- Parlez au chirurgien si l'épaule se déboîte souvent.\n\n## Consultez sans attendre si\n- l'épaule se déboîte et ne se remet pas en place\n- le bras devient insensible ou froid\n- une douleur intense après une chute"
  },
  {
    "id": "c-fiche-epitrochleite",
    "titre": "Épitrochléite (golf elbow)",
    "resume": "Renforcez votre avant-bras.",
    "ico": "book",
    "affiche": "/images/conseils/fiches/epitrochleite.jpg",
    "serie": "Fiche conseils patient",
    "fichePatho": true,
    "modeles": [
      "Épitrochléite (golf elbow)"
    ],
    "texte": "Renforcez votre avant-bras.\n\n## De quoi s'agit-il ?\nLes tendons qui s'attachent à l'intérieur du coude sont surchargés, souvent par des gestes répétés de serrage. Porter ou serrer devient douloureux.\n\n## Mes bons réflexes\n- Renforcer l'avant-bras : Faites vos exercices avec un petit poids, lentement.\n- Éviter les serrages forts : Réduisez les prises fortes et prolongées.\n- Faire des pauses : Interrompez les gestes répétés régulièrement.\n- Augmenter pas à pas : Augmentez la charge progressivement.\n\n## À retenir\n- Ni repos total, ni effort douloureux.\n- Une douleur légère pendant l'effort est acceptable.\n- La guérison prend souvent plusieurs semaines.\n\n## Consultez sans attendre si\n- le coude est très gonflé, rouge ou chaud\n- des fourmillements dans l'annulaire et l'auriculaire\n- une douleur brutale après un choc ou une chute"
  },
  {
    "id": "c-fiche-cruralgie",
    "titre": "Cruralgie (douleur du nerf crural)",
    "resume": "Une douleur du nerf, le plus souvent passagère.",
    "ico": "book",
    "affiche": "/images/conseils/fiches/cruralgie.jpg",
    "serie": "Fiche conseils patient",
    "fichePatho": true,
    "modeles": [
      "Cruralgie"
    ],
    "texte": "Une douleur du nerf, le plus souvent passagère.\n\n## De quoi s'agit-il ?\nUn nerf est irrité au niveau du dos. La douleur descend à l'avant de la cuisse, parfois jusqu'au genou.\n\n## Mes bons réflexes\n- Rester actif : Marchez un peu plusieurs fois par jour.\n- Trouver les bonnes positions : Repérez les positions qui soulagent la cuisse.\n- Bouger en douceur : Faites les exercices doux conseillés par votre kiné.\n- Éviter le repos au lit : Rester allongé longtemps retarde la guérison.\n\n## À retenir\n- Le mouvement doux aide le nerf à se calmer.\n- La douleur diminue le plus souvent en quelques semaines.\n- Si elle persiste au-delà de 6 semaines, consultez un professionnel de santé.\n\n## Consultez sans attendre si\n- le genou lâche ou la cuisse perd de la force\n- des troubles pour uriner ou aller à la selle apparaissent\n- de la fièvre ou un amaigrissement inexpliqué"
  },
  {
    "id": "c-fiche-vppb",
    "titre": "Vertige positionnel (VPPB, après la manœuvre)",
    "resume": "Après la manœuvre, reprenez vos activités.",
    "ico": "book",
    "affiche": "/images/conseils/fiches/vppb.jpg",
    "serie": "Fiche conseils patient",
    "fichePatho": true,
    "modeles": [
      "VPPB (après manœuvre)"
    ],
    "texte": "Après la manœuvre, reprenez vos activités.\n\n## De quoi s'agit-il ?\nDe petits cristaux de l'oreille interne se sont déplacés et donnent des vertiges brefs en bougeant la tête. La manœuvre les a remis en place.\n\n## Mes bons réflexes\n- Reprendre vos activités : Vous pouvez vivre normalement dès aujourd'hui.\n- Bouger la tête normalement : Ne restez pas raide par peur du vertige.\n- Se lever doucement : Asseyez-vous quelques secondes avant de vous lever.\n- Revenir si besoin : Si les vertiges reviennent, la manœuvre peut être refaite.\n\n## À retenir\n- Une gêne légère peut persister quelques jours.\n- Le VPPB n'est pas grave.\n- Il peut récidiver : la manœuvre se refait facilement.\n\n## Consultez sans attendre si\n- une faiblesse d'un bras ou d'une jambe apparaît\n- des troubles de la parole ou de la vue apparaissent\n- un mal de tête brutal et intense"
  },
  {
    "id": "c-fiche-epine-calcaneenne",
    "titre": "Épine calcanéenne (douleur du talon)",
    "resume": "L'épine n'est pas toujours la cause de la douleur.",
    "ico": "book",
    "affiche": "/images/conseils/fiches/epine-calcaneenne.jpg",
    "serie": "Fiche conseils patient",
    "fichePatho": true,
    "modeles": [
      "Épine calcanéenne"
    ],
    "texte": "L'épine n'est pas toujours la cause de la douleur.\n\n## De quoi s'agit-il ?\nUne petite pointe osseuse s'est formée sous le talon. Beaucoup de personnes en ont une sans douleur : la gêne vient surtout de la membrane sous le pied.\n\n## Mes bons réflexes\n- Étirer le mollet : Étirez mollet et voûte plantaire chaque jour.\n- Bien se chausser : Choisissez des chaussures qui amortissent.\n- Renforcer le pied : Montez sur la pointe des pieds lentement.\n- Adapter l'activité : Réduisez temporairement les longues stations debout.\n\n## À retenir\n- L'épine elle-même ne disparaît pas, la douleur oui.\n- Les exercices soulagent le talon.\n- L'amélioration prend souvent quelques mois.\n\n## Consultez sans attendre si\n- le talon est rouge, chaud et gonflé\n- une douleur brutale après une chute\n- des fourmillements ou une perte de sensibilité du pied"
  },
  {
    "id": "c-fiche-parkinson",
    "titre": "Maladie de Parkinson (bouger pour garder son autonomie)",
    "resume": "L'activité physique est un vrai traitement.",
    "ico": "book",
    "affiche": "/images/conseils/fiches/parkinson.jpg",
    "serie": "Fiche conseils patient",
    "fichePatho": true,
    "modeles": [
      "Maladie de Parkinson"
    ],
    "texte": "L'activité physique est un vrai traitement.\n\n## De quoi s'agit-il ?\nLa maladie ralentit et rend les mouvements plus petits, avec parfois des tremblements. L'exercice régulier améliore la marche, l'équilibre et le moral.\n\n## Mes bons réflexes\n- Faire de grands gestes : Bougez avec des mouvements amples.\n- Marcher à grands pas : Marchez chaque jour en faisant de grands pas.\n- Travailler l'équilibre : Entraînez-vous près d'un appui.\n- Garder le rythme : La musique aide à marcher en rythme.\n\n## À retenir\n- L'exercice complète votre traitement.\n- La régularité compte plus que l'intensité.\n- Prévenez votre médecin si les chutes se multiplient.\n\n## Consultez sans attendre si\n- vous chutez souvent\n- une gêne pour avaler ou des fausses routes apparaissent\n- une aggravation rapide ou une confusion"
  },
  {
    "id": "c-fiche-sclerose-en-plaques",
    "titre": "Sclérose en plaques (rester actif à son rythme)",
    "resume": "L'activité adaptée aide à lutter contre la fatigue.",
    "ico": "book",
    "affiche": "/images/conseils/fiches/sclerose-en-plaques.jpg",
    "serie": "Fiche conseils patient",
    "fichePatho": true,
    "modeles": [
      "Sclérose en plaques"
    ],
    "texte": "L'activité adaptée aide à lutter contre la fatigue.\n\n## De quoi s'agit-il ?\nLa maladie touche le système nerveux et peut donner fatigue, faiblesse ou troubles de l'équilibre. Une activité régulière et dosée aide à garder ses capacités.\n\n## Mes bons réflexes\n- Doser l'effort : Alternez effort et pauses.\n- Renforcer les jambes : Faites vos exercices de renforcement.\n- Travailler l'équilibre : Entraînez-vous près d'un appui.\n- Éviter la forte chaleur : Hydratez-vous et restez au frais pendant l'effort.\n\n## À retenir\n- L'activité physique est bénéfique et sans danger.\n- La fatigue passagère après l'effort est normale.\n- Adaptez l'effort selon les jours.\n\n## Consultez sans attendre si\n- une nouvelle faiblesse, une baisse de la vue ou des troubles de l'équilibre\n- des symptômes qui durent plus de 24 heures\n- de la fièvre avec une aggravation"
  },
  {
    "id": "c-fiche-hemiplegie-avc",
    "titre": "Hémiplégie après un AVC (récupérer ses gestes)",
    "resume": "Chaque geste compte.",
    "ico": "book",
    "affiche": "/images/conseils/fiches/hemiplegie-avc.jpg",
    "serie": "Fiche conseils patient",
    "fichePatho": true,
    "modeles": [
      "Hémiplégie (AVC)"
    ],
    "texte": "Chaque geste compte.\n\n## De quoi s'agit-il ?\nUn AVC a abîmé une partie du cerveau, ce qui rend un côté du corps plus faible. Le cerveau peut réapprendre par la répétition des gestes.\n\n## Mes bons réflexes\n- Utiliser le côté atteint : Servez-vous-en dans les gestes du quotidien.\n- Répéter chaque jour : Faites vos exercices régulièrement.\n- Marcher en sécurité : Marchez avec votre aide technique si besoin.\n- Se lever seul : Entraînez-vous à vous lever d'une chaise.\n\n## À retenir\n- La récupération se poursuit des mois après l'AVC.\n- La répétition fait les progrès.\n- Même de petits progrès comptent.\n\n## Consultez sans attendre si\n- une nouvelle faiblesse ou un visage qui se déforme\n- des troubles de la parole apparaissent\n- une perte de vision ou un mal de tête brutal : appelez le 15"
  },
  {
    "id": "c-fiche-sla",
    "titre": "SLA (maladie de Charcot)",
    "resume": "Bouger sans s'épuiser.",
    "ico": "book",
    "affiche": "/images/conseils/fiches/sla.jpg",
    "serie": "Fiche conseils patient",
    "fichePatho": true,
    "modeles": [
      "SLA (maladie de Charcot)"
    ],
    "texte": "Bouger sans s'épuiser.\n\n## De quoi s'agit-il ?\nLa maladie affaiblit progressivement les muscles. Une activité douce et adaptée aide à garder le confort, la souplesse et l'autonomie.\n\n## Mes bons réflexes\n- Exercices doux : Bougez chaque jour, sans forcer.\n- Éviter l'épuisement : Arrêtez-vous avant la fatigue.\n- Garder la souplesse : Étirez doucement vos articulations.\n- Bien respirer : Faites vos exercices de respiration.\n\n## À retenir\n- L'objectif est de garder le confort et l'autonomie.\n- La fatigue doit être évitée.\n- Votre kiné adapte les exercices à chaque étape.\n\n## Consultez sans attendre si\n- un essoufflement ou une gêne pour respirer\n- des fausses routes en mangeant ou en buvant\n- de la fièvre ou un encombrement des bronches"
  },
  {
    "id": "c-fiche-charcot-marie-tooth",
    "titre": "Charcot-Marie-Tooth (maladie des nerfs des membres)",
    "resume": "Gardez force et équilibre.",
    "ico": "book",
    "affiche": "/images/conseils/fiches/charcot-marie-tooth.jpg",
    "serie": "Fiche conseils patient",
    "fichePatho": true,
    "modeles": [
      "Charcot-Marie-Tooth"
    ],
    "texte": "Gardez force et équilibre.\n\n## De quoi s'agit-il ?\nCette maladie héréditaire touche les nerfs des pieds et des mains, avec une faiblesse et parfois des pieds creux. L'exercice adapté aide à garder la marche.\n\n## Mes bons réflexes\n- Renforcer sans s'épuiser : Faites vos exercices, sans aller à la fatigue.\n- Étirer les mollets : Étirez mollets et pieds chaque jour.\n- Travailler l'équilibre : Entraînez-vous près d'un appui.\n- Bien se chausser : Portez des chaussures stables ou vos orthèses.\n\n## À retenir\n- L'activité adaptée protège votre autonomie.\n- Les étirements limitent les raideurs.\n- Les orthèses peuvent sécuriser la marche.\n\n## Consultez sans attendre si\n- des chutes répétées\n- une plaie au pied qui ne guérit pas\n- une aggravation rapide de la faiblesse"
  },
  {
    "id": "c-fiche-rupture-lca",
    "titre": "Rupture du LCA (sans opération)",
    "resume": "Les muscles prennent le relais du ligament.",
    "ico": "book",
    "affiche": "/images/conseils/fiches/rupture-lca.jpg",
    "serie": "Fiche conseils patient",
    "fichePatho": true,
    "modeles": [
      "Rupture du LCA (sans opération)"
    ],
    "texte": "Les muscles prennent le relais du ligament.\n\n## De quoi s'agit-il ?\nLe ligament croisé antérieur du genou est rompu. Beaucoup de personnes retrouvent un genou stable grâce au travail musculaire et à l'équilibre.\n\n## Mes bons réflexes\n- Renforcer les cuisses : Faites vos exercices pour cuisses et fessiers.\n- Travailler l'équilibre : Tenez sur une jambe chaque jour.\n- Éviter les pivots : Limitez les changements de direction au début.\n- Reprendre par étapes : Revenez au sport après les tests.\n\n## À retenir\n- Un genou bien musclé peut rester stable.\n- L'équilibre fait la différence.\n- Le chirurgien peut être revu si le genou lâche souvent.\n\n## Consultez sans attendre si\n- le genou se bloque\n- le genou lâche souvent malgré la rééducation\n- le genou est très gonflé, rouge ou chaud"
  },
  {
    "id": "c-fiche-conflit-femoro-acetabulaire",
    "titre": "Conflit fémoro-acétabulaire (hanche qui accroche)",
    "resume": "Adapter les mouvements, pas tout arrêter.",
    "ico": "book",
    "affiche": "/images/conseils/fiches/conflit-femoro-acetabulaire.jpg",
    "serie": "Fiche conseils patient",
    "fichePatho": true,
    "modeles": [
      "Conflit fémoro-acétabulaire"
    ],
    "texte": "Adapter les mouvements, pas tout arrêter.\n\n## De quoi s'agit-il ?\nLa tête du fémur et le bord de la hanche se touchent en fin de mouvement. La douleur, souvent dans l'aine, apparaît en pliant fort la hanche.\n\n## Mes bons réflexes\n- Limiter les flexions profondes : Évitez de vous asseoir très bas au début.\n- Renforcer la hanche : Faites vos exercices pour les fessiers.\n- Gainage : Renforcez aussi le tronc.\n- Reprendre progressivement : Revenez au sport par étapes.\n\n## À retenir\n- Un renforcement ciblé soulage souvent.\n- Adapter les gestes permet de rester actif.\n- La chirurgie n'est utile que pour certains cas.\n\n## Consultez sans attendre si\n- une douleur brutale et intense\n- de la fièvre avec une hanche très douloureuse\n- vous ne pouvez plus du tout appuyer sur la jambe"
  },
  {
    "id": "c-fiche-reeducation-vestibulaire",
    "titre": "Vertiges et équilibre (rééducation vestibulaire)",
    "resume": "Le cerveau s'habitue en s'entraînant.",
    "ico": "book",
    "affiche": "/images/conseils/fiches/reeducation-vestibulaire.jpg",
    "serie": "Fiche conseils patient",
    "fichePatho": true,
    "modeles": [
      "Rééducation vestibulaire"
    ],
    "texte": "Le cerveau s'habitue en s'entraînant.\n\n## De quoi s'agit-il ?\nL'oreille interne, qui aide à garder l'équilibre, fonctionne moins bien. Les exercices répétés aident le cerveau à compenser.\n\n## Mes bons réflexes\n- Faire vos exercices : Répétez-les chaque jour, même s'ils gênent un peu.\n- Bouger la tête : Ne bloquez pas la tête par peur du vertige.\n- Marcher chaque jour : La marche entraîne l'équilibre.\n- Sécuriser : Gardez un appui à portée au début.\n\n## À retenir\n- Éviter les mouvements entretient les vertiges.\n- Une gêne légère pendant les exercices est normale.\n- Les progrès viennent en quelques semaines.\n\n## Consultez sans attendre si\n- une faiblesse d'un bras ou d'une jambe\n- des troubles de la parole ou de la vue\n- un mal de tête brutal et intense"
  },
  {
    "id": "c-fiche-remise-en-forme",
    "titre": "Remise en forme (gym adaptée)",
    "resume": "Il n'est jamais trop tard pour bouger.",
    "ico": "run",
    "affiche": "/images/conseils/fiches/remise-en-forme.jpg",
    "serie": "Fiche conseils patient",
    "fichePatho": true,
    "modeles": [
      "Remise en forme (gym adaptée)"
    ],
    "texte": "Il n'est jamais trop tard pour bouger.\n\n## De quoi s'agit-il ?\nL'activité physique régulière améliore le cœur, les muscles, l'équilibre, le moral et le sommeil, à tout âge.\n\n## Mes bons réflexes\n- Bouger chaque jour : Au moins 30 minutes d'activité par jour.\n- Renforcer vos muscles : 2 séances par semaine.\n- Garder la souplesse : Étirez-vous doucement.\n- Se faire plaisir : Choisissez une activité qui vous plaît.\n\n## À retenir\n- Chaque mouvement compte.\n- La régularité compte plus que l'intensité.\n- Commencez doucement et augmentez progressivement.\n\n## Consultez sans attendre si\n- une douleur dans la poitrine à l'effort\n- un essoufflement inhabituel ou un malaise\n- des palpitations ou des vertiges à l'effort"
  },
  {
    "id": "c-fiche-post-partum",
    "titre": "Après l'accouchement (abdos profonds et périnée)",
    "resume": "Le périnée d'abord, le sport ensuite.",
    "ico": "book",
    "affiche": "/images/conseils/fiches/post-partum.jpg",
    "serie": "Fiche conseils patient",
    "fichePatho": true,
    "modeles": [
      "Abdos profonds et périnée (post-partum sportive)"
    ],
    "texte": "Le périnée d'abord, le sport ensuite.\n\n## De quoi s'agit-il ?\nAprès une grossesse, le périnée et les abdominaux profonds ont besoin d'être renforcés avant de reprendre la course ou les sauts.\n\n## Mes bons réflexes\n- Activer le périnée : Contractez-le en soufflant, plusieurs fois par jour.\n- Abdos profonds : Rentrez le nombril en expirant doucement.\n- Éviter les abdos classiques : Pas de crunchs au début.\n- Reprendre par étapes : Marche, puis renforcement, puis course.\n\n## À retenir\n- Les fuites ne sont pas une fatalité.\n- La rééducation du périnée se fait avant le sport.\n- Comptez souvent 3 à 6 mois avant la course.\n\n## Consultez sans attendre si\n- des fuites ou une pesanteur qui persistent\n- une douleur intense au ventre ou au périnée\n- de la fièvre ou une cicatrice qui coule"
  },
  {
    "id": "c-fiche-bpco",
    "titre": "Réhabilitation respiratoire (BPCO)",
    "resume": "L'effort aide à mieux respirer.",
    "ico": "heart",
    "affiche": "/images/conseils/fiches/bpco.jpg",
    "serie": "Fiche conseils patient",
    "fichePatho": true,
    "modeles": [
      "Réhabilitation respiratoire (BPCO)"
    ],
    "texte": "L'effort aide à mieux respirer.\n\n## De quoi s'agit-il ?\nLa BPCO réduit le souffle. L'entraînement physique diminue l'essoufflement et améliore la vie de tous les jours.\n\n## Mes bons réflexes\n- Marcher ou pédaler : Entraînez-vous régulièrement.\n- Lèvres pincées : Soufflez doucement par la bouche à l'effort.\n- Renforcer les jambes : Des jambes fortes demandent moins d'air.\n- Arrêter le tabac : C'est le geste le plus important.\n\n## À retenir\n- S'essouffler un peu à l'effort, c'est normal.\n- L'entraînement régulier améliore le souffle.\n- Prenez vos traitements inhalés comme prescrit.\n\n## Consultez sans attendre si\n- un essoufflement qui s'aggrave nettement\n- des crachats qui changent de couleur avec de la fièvre\n- des lèvres bleues ou une confusion"
  },
  {
    "id": "c-fiche-desencombrement",
    "titre": "Désencombrement bronchique (libérer ses bronches)",
    "resume": "Bien souffler pour mieux cracher.",
    "ico": "heart",
    "affiche": "/images/conseils/fiches/desencombrement.jpg",
    "serie": "Fiche conseils patient",
    "fichePatho": true,
    "modeles": [
      "Désencombrement bronchique"
    ],
    "texte": "Bien souffler pour mieux cracher.\n\n## De quoi s'agit-il ?\nDes sécrétions encombrent les bronches. Les techniques de souffle aident à les décoller et à les évacuer.\n\n## Mes bons réflexes\n- Souffler longtemps : Expirez lentement, bouche ouverte.\n- Tousser efficacement : Toussez après avoir décollé les sécrétions.\n- Boire suffisamment : L'eau fluidifie les sécrétions.\n- Bouger : La marche aide au désencombrement.\n\n## À retenir\n- Les exercices se font chaque jour.\n- Boire et bouger aident les bronches.\n- Se moucher souvent aide aussi.\n\n## Consultez sans attendre si\n- de la fièvre qui persiste\n- un essoufflement important\n- du sang dans les crachats"
  },
  {
    "id": "c-fiche-respiratoire-post-op",
    "titre": "Respirer après une opération (kiné respiratoire)",
    "resume": "Bien respirer aide à récupérer.",
    "ico": "heart",
    "affiche": "/images/conseils/fiches/respiratoire-post-op.jpg",
    "serie": "Fiche conseils patient",
    "fichePatho": true,
    "modeles": [
      "Kiné respiratoire après une opération"
    ],
    "texte": "Bien respirer aide à récupérer.\n\n## De quoi s'agit-il ?\nAprès une opération, on respire moins profondément. Les exercices de respiration et le lever précoce évitent les complications.\n\n## Mes bons réflexes\n- Respirer profondément : Faites vos exercices plusieurs fois par heure.\n- Se lever tôt : Levez-vous et marchez dès que possible.\n- Tousser en protégeant : Tenez la cicatrice avec un coussin.\n- Utiliser l'appareil : Utilisez votre spiromètre si on vous l'a donné.\n\n## À retenir\n- Respirer à fond protège les poumons.\n- Bouger tôt accélère la récupération.\n- Une gêne à la cicatrice est normale.\n\n## Consultez sans attendre si\n- un essoufflement brutal ou une douleur dans la poitrine\n- de la fièvre qui monte\n- un mollet douloureux, chaud ou gonflé"
  },
  {
    "id": "c-fiche-retour-au-sport",
    "titre": "Retour au sport (membre inférieur)",
    "resume": "Progresser par étapes, sur des critères.",
    "ico": "run",
    "affiche": "/images/conseils/fiches/retour-au-sport.jpg",
    "serie": "Fiche conseils patient",
    "fichePatho": true,
    "modeles": [
      "Retour au sport (membre inférieur)"
    ],
    "texte": "Progresser par étapes, sur des critères.\n\n## De quoi s'agit-il ?\nAprès une blessure de la jambe, revenir trop vite expose à une nouvelle blessure. Un retour planifié vous rend plus solide.\n\n## Mes bons réflexes\n- Force et équilibre : Retrouvez la force des deux jambes.\n- Augmenter la charge : Progressez semaine après semaine.\n- Sauter et courir : Réintroduisez les sauts progressivement.\n- Valider les tests : Faites les tests avant la compétition.\n\n## À retenir\n- Le retour se fait sur des critères, pas seulement des dates.\n- Un échauffement complet protège.\n- Une douleur qui augmente doit faire ralentir.\n\n## Consultez sans attendre si\n- une douleur brutale avec un claquement\n- un gonflement important après l'effort\n- l'articulation lâche ou se bloque"
  },
  {
    "id": "c-fiche-reconditionnement",
    "titre": "Reconditionnement à l'effort (retrouver de l'énergie)",
    "resume": "L'endurance se reconstruit pas à pas.",
    "ico": "book",
    "affiche": "/images/conseils/fiches/reconditionnement.jpg",
    "serie": "Fiche conseils patient",
    "fichePatho": true,
    "modeles": [
      "Reconditionnement à l'effort"
    ],
    "texte": "L'endurance se reconstruit pas à pas.\n\n## De quoi s'agit-il ?\nAprès une maladie ou une période d'inactivité, le corps s'est déconditionné. Il se réhabitue à l'effort avec un entraînement progressif.\n\n## Mes bons réflexes\n- Augmenter progressivement : Un peu plus chaque semaine.\n- Alterner effort et repos : Faites des pauses quand il le faut.\n- Marcher ou pédaler : Choisissez une activité d'endurance.\n- Être régulier : Mieux vaut souvent qu'intensément.\n\n## À retenir\n- La régularité fait les progrès.\n- Une fatigue légère après l'effort est normale.\n- Les progrès se voient en quelques semaines.\n\n## Consultez sans attendre si\n- une douleur dans la poitrine à l'effort\n- un essoufflement inhabituel ou un malaise\n- des palpitations ou des vertiges"
  },
  {
    "id": "c-fiche-ischio-jambiers",
    "titre": "Lésion des ischio-jambiers (arrière de la cuisse)",
    "resume": "Une reprise progressive évite la récidive.",
    "ico": "run",
    "affiche": "/images/conseils/fiches/ischio-jambiers.jpg",
    "serie": "Fiche conseils patient",
    "fichePatho": true,
    "modeles": [
      "Lésion des ischio-jambiers"
    ],
    "texte": "Une reprise progressive évite la récidive.\n\n## De quoi s'agit-il ?\nUn muscle de l'arrière de la cuisse a été étiré ou déchiré, souvent lors d'un sprint. Il cicatrise mieux quand il est sollicité de façon adaptée.\n\n## Mes bons réflexes\n- Bouger tôt : Marchez dès que la douleur le permet.\n- Renforcer : Faites vos exercices pour l'arrière de la cuisse.\n- Étirer doucement : Sans douleur forte.\n- Reprendre la course : Augmentez la vitesse par étapes.\n\n## À retenir\n- Le renforcement protège des rechutes.\n- La vitesse revient en dernier.\n- Comptez quelques semaines à quelques mois.\n\n## Consultez sans attendre si\n- un gros hématome ou un creux dans la cuisse\n- une douleur brutale avec un claquement fort\n- des fourmillements dans la jambe"
  },
  {
    "id": "c-fiche-pubalgie",
    "titre": "Pubalgie (douleur de l'aine du sportif)",
    "resume": "Un retour au sport par étapes.",
    "ico": "run",
    "affiche": "/images/conseils/fiches/pubalgie.jpg",
    "serie": "Fiche conseils patient",
    "fichePatho": true,
    "modeles": [
      "Pubalgie"
    ],
    "texte": "Un retour au sport par étapes.\n\n## De quoi s'agit-il ?\nLes muscles et tendons autour du pubis sont surchargés, souvent par la course et les changements de direction. La douleur se situe dans l'aine.\n\n## Mes bons réflexes\n- Renforcer les adducteurs : Faites vos exercices pour l'intérieur des cuisses.\n- Gainage : Renforcez les abdominaux.\n- Réduire les efforts douloureux : Limitez sprints et frappes au début.\n- Reprendre pas à pas : Augmentez la charge progressivement.\n\n## À retenir\n- La pubalgie vient d'une surcharge.\n- Le renforcement permet de revenir durablement.\n- La reprise prend souvent quelques semaines à quelques mois.\n\n## Consultez sans attendre si\n- une boule dans l'aine qui grossit\n- de la fièvre avec une douleur de l'aine\n- une douleur brutale et intense"
  },
  {
    "id": "c-fiche-motricite-enfant",
    "titre": "Motricité de l'enfant (bouger pour grandir)",
    "resume": "Le jeu est le meilleur exercice.",
    "ico": "book",
    "affiche": "/images/conseils/fiches/motricite-enfant.jpg",
    "serie": "Fiche conseils patient",
    "fichePatho": true,
    "modeles": [
      "Motricité de l'enfant"
    ],
    "texte": "Le jeu est le meilleur exercice.\n\n## De quoi s'agit-il ?\nL'enfant développe ses capacités motrices en jouant, grimpant et sautant. Chaque enfant progresse à son rythme.\n\n## Mes bons réflexes\n- Jouer en bougeant : Proposez des jeux de ballon, de course, d'équilibre.\n- Grimper et sauter : Laissez-le explorer en sécurité.\n- Encourager : Félicitez les efforts, sans forcer.\n- Limiter les écrans : Préférez le jeu libre.\n\n## À retenir\n- Chaque progrès compte.\n- Le plaisir motive l'enfant.\n- Parlez à votre kiné des exercices à faire à la maison.\n\n## Consultez sans attendre si\n- l'enfant perd une capacité qu'il avait\n- des chutes très fréquentes ou une boiterie\n- une douleur qui réveille la nuit"
  },
  {
    "id": "c-fiche-lymphoedeme",
    "titre": "Lymphœdème du bras (après un cancer du sein)",
    "resume": "Bouger aide la lymphe à circuler.",
    "ico": "book",
    "affiche": "/images/conseils/fiches/lymphoedeme.jpg",
    "serie": "Fiche conseils patient",
    "fichePatho": true,
    "modeles": [
      "Lymphœdème du bras (après cancer du sein)"
    ],
    "texte": "Bouger aide la lymphe à circuler.\n\n## De quoi s'agit-il ?\nAprès le traitement d'un cancer du sein, la lymphe peut mal circuler dans le bras, qui gonfle. Le mouvement, la compression et le soin de la peau aident.\n\n## Mes bons réflexes\n- Bouger le bras : Faites vos exercices chaque jour.\n- Protéger la peau : Évitez coupures, brûlures et piqûres.\n- Porter la compression : Portez le manchon si prescrit.\n- Rester active : L'activité physique est conseillée.\n\n## À retenir\n- L'activité adaptée ne fait pas gonfler le bras.\n- Hydratez la peau chaque jour.\n- Signalez vite tout changement du bras.\n\n## Consultez sans attendre si\n- le bras devient rouge, chaud et douloureux\n- de la fièvre apparaît\n- le bras gonfle brutalement"
  },
  {
    "id": "c-fiche-atm",
    "titre": "Mâchoire (articulation temporo-mandibulaire)",
    "resume": "Dents séparées, lèvres jointes.",
    "ico": "book",
    "affiche": "/images/conseils/fiches/atm.jpg",
    "serie": "Fiche conseils patient",
    "fichePatho": true,
    "modeles": [
      "Mâchoire (ATM)"
    ],
    "texte": "Dents séparées, lèvres jointes.\n\n## De quoi s'agit-il ?\nL'articulation de la mâchoire et ses muscles sont tendus, souvent avec le stress ou le serrage des dents. Cela donne douleur, craquements ou blocages.\n\n## Mes bons réflexes\n- Relâcher la mâchoire : Gardez les dents séparées au repos.\n- Éviter les aliments durs : Limitez chewing-gums et aliments durs.\n- Exercices doux : Ouvrez et fermez la bouche lentement.\n- Se détendre : Respiration et chaleur détendent les muscles.\n\n## À retenir\n- Le serrage des dents entretient la douleur.\n- Les exercices doux aident.\n- Parlez du serrage nocturne à votre dentiste.\n\n## Consultez sans attendre si\n- la bouche reste bloquée ouverte ou fermée\n- un gonflement du visage avec de la fièvre\n- une douleur après un choc sur la mâchoire"
  },
  {
    "id": "c-fiche-paralysie-faciale",
    "titre": "Paralysie faciale (récupérer les mouvements du visage)",
    "resume": "Des exercices doux, devant un miroir.",
    "ico": "book",
    "affiche": "/images/conseils/fiches/paralysie-faciale.jpg",
    "serie": "Fiche conseils patient",
    "fichePatho": true,
    "modeles": [
      "Paralysie faciale"
    ],
    "texte": "Des exercices doux, devant un miroir.\n\n## De quoi s'agit-il ?\nLe nerf du visage fonctionne moins bien, ce qui affaiblit un côté du visage. La récupération prend souvent plusieurs semaines à plusieurs mois.\n\n## Mes bons réflexes\n- Exercices au miroir : Travaillez chaque mouvement lentement.\n- Protéger l'œil : Utilisez larmes artificielles et lunettes.\n- Éviter les grimaces forcées : La précision compte plus que la force.\n- Masser doucement : Massez les joues et le front.\n\n## À retenir\n- La récupération est souvent progressive.\n- Des exercices précis valent mieux que des efforts intenses.\n- Protéger l'œil est essentiel.\n\n## Consultez sans attendre si\n- une faiblesse d'un bras ou d'une jambe apparaît\n- l'œil devient rouge et douloureux\n- des troubles de la parole apparaissent"
  },
  {
    "id": "c-fiche-sciatique-hernie",
    "titre": "Sciatique et hernie discale (douleur du dos vers la jambe)",
    "resume": "La hernie peut se résorber d'elle-même.",
    "ico": "book",
    "affiche": "/images/conseils/fiches/sciatique-hernie.jpg",
    "serie": "Fiche conseils patient",
    "fichePatho": true,
    "modeles": [
      "Sciatique et hernie discale"
    ],
    "texte": "La hernie peut se résorber d'elle-même.\n\n## De quoi s'agit-il ?\nUn disque du bas du dos fait saillie et irrite le nerf sciatique. La douleur descend dans la jambe ; le plus souvent, elle diminue avec le temps.\n\n## Mes bons réflexes\n- Rester actif : Continuez vos activités, sans forcer.\n- Trouver les bonnes positions : Repérez les positions qui soulagent la jambe.\n- Bouger en douceur : Faites les exercices doux conseillés.\n- Éviter le repos au lit : Rester allongé longtemps retarde la guérison.\n\n## À retenir\n- Beaucoup de hernies diminuent en quelques mois.\n- Le mouvement doux aide le nerf à se calmer.\n- L'opération n'est nécessaire que rarement.\n\n## Consultez sans attendre si\n- la jambe devient faible ou le pied tombe\n- des troubles pour uriner ou aller à la selle apparaissent\n- une perte de sensibilité entre les cuisses apparaît"
  }
];

const norm = s => String(s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

/** Identifiants des fiches à joindre pour un modèle (nom du modèle, sans le niveau). */
export function fichesDuModele(nom){
  const n = norm(nom);
  if(!n) return [];
  return FICHES_PATHO.filter(f => f.modeles.some(m => norm(m) === n)).map(f => f.id);
}
