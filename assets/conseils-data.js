/* =========================================================
   Fiches conseils fournies avec l'application
   ---------------------------------------------------------
   Texte simple : "## Titre" pour un intertitre, "- " pour une
   liste, une ligne vide entre deux paragraphes.
   Le kiné peut les copier pour en faire sa propre version
   (Ressources > Fiches conseils).
   ========================================================= */

export const CONSEILS_FOURNIS = [
  /* Affiches « L'info kiné du mois » : l'image est la fiche, le texte la reprend (lecture à l'écran, accessibilité) */
  {
    id: "c-info-arthrose",
    titre: "L'arthrose n'aime pas l'inactivité",
    resume: "Bouger est un traitement : moins de douleur, plus de mobilité, plus d'autonomie.",
    ico: "heart",
    affiche: "/images/conseils/arthrose.jpg",
    serie: "L'info kiné du mois",
    texte: `Bouger est un traitement.

- Moins de douleur
- Plus de mobilité
- Plus d'autonomie

L'activité physique est l'un des traitements les plus efficaces contre l'arthrose.

## Quelques idées
- Marche, vélo, natation, aquagym
- Renforcement musculaire adapté`
  },
  {
    id: "c-info-course-genoux",
    titre: "Courir n'use pas les genoux",
    resume: "Une progression adaptée protège davantage qu'elle n'abîme.",
    ico: "run",
    affiche: "/images/conseils/course-genoux.jpg",
    serie: "L'info kiné du mois",
    texte: `Une progression adaptée protège davantage qu'elle n'abîme.

- Santé cardiovasculaire
- Contrôle du poids
- Renforcement musculaire

De nombreuses études montrent que la course à pied n'augmente pas le risque d'arthrose du genou, même à long terme.

## Les clés
- Progression, renforcement, souplesse, récupération`
  },
  {
    id: "c-info-equilibre",
    titre: "L'équilibre se travaille à tout âge",
    resume: "La prévention commence avant la première chute.",
    ico: "target",
    affiche: "/images/conseils/equilibre.jpg",
    serie: "L'info kiné du mois",
    texte: `La prévention commence avant la première chute.

- Plus de stabilité
- Plus de confiance
- Plus d'autonomie

L'activité physique adaptée améliore l'équilibre, la force musculaire et la coordination. Elle réduit le risque de chute et préserve l'autonomie.

## À travailler
- Équilibre, renforcement, coordination, mobilité`
  },
  {
    id: "c-info-chaque-mouvement",
    titre: "Chaque mouvement compte",
    resume: "L'activité physique agit sur tout votre corps, à tout âge.",
    ico: "heart",
    affiche: "/images/conseils/chaque-mouvement.jpg",
    serie: "L'info kiné du mois",
    texte: `L'activité physique agit sur tout votre corps.

- Santé physique
- Santé mentale
- Autonomie

Pas besoin d'en faire beaucoup. Pas besoin d'être sportif. Chaque mouvement compte, à tout âge.

## Quelques idées
- Marche, vélo, jardinage, natation, renforcement musculaire`
  },
  {
    id: "c-info-dos-solide",
    titre: "Votre dos est plus solide que vous ne le pensez",
    resume: "Bouger est souvent la meilleure solution.",
    ico: "body",
    affiche: "/images/conseils/dos-solide.jpg",
    serie: "L'info kiné du mois",
    texte: `Bouger est souvent la meilleure solution.

- Moins de douleur
- Plus de confiance
- Plus d'autonomie

L'activité physique est l'un des traitements les plus efficaces contre les douleurs de dos.

## Quelques idées
- Marche, renforcement, étirements, mobilité`
  },
  {
    id: "c-info-sommeil",
    titre: "Mieux dormir, c'est souvent moins souffrir",
    resume: "Le sommeil fait partie du traitement de la douleur.",
    ico: "moon",
    affiche: "/images/conseils/sommeil.jpg",
    serie: "L'info kiné du mois",
    texte: `- Meilleure récupération
- Moins de fatigue
- Meilleure gestion de la douleur

Le sommeil joue un rôle essentiel dans la guérison, la régulation de la douleur et le bien-être général. Des habitudes de sommeil de qualité font partie du traitement.

## Les leviers
- Routine, environnement, activité physique, gestion du stress`
  },
  {
    id: "c-info-tendon",
    titre: "Le tendon a besoin de charge",
    resume: "Le repos complet n'est généralement pas la solution.",
    ico: "dumbbell",
    affiche: "/images/conseils/tendon.jpg",
    serie: "L'info kiné du mois",
    texte: `Le repos complet n'est généralement pas la solution.

- Plus de résistance
- Plus de capacité
- Retour progressif aux activités

L'activité physique adaptée permet au tendon de retrouver progressivement sa capacité à supporter les contraintes du quotidien et du sport.

## Les clés
- Marche, renforcement, exercices progressifs, reprise adaptée`
  },
  {
    id: "c-bouger-mal-dos",
    titre: "Mal de dos : bouger pour guérir",
    resume: "Pourquoi rester actif aide le dos à récupérer, et comment s'y prendre.",
    ico: "body",
    texte: `La grande majorité des douleurs de dos ne sont pas graves, même lorsqu'elles sont intenses. Le dos est une structure solide, faite pour bouger.

## Ce qui aide
- Rester actif autant que possible : marcher, continuer ses activités du quotidien en les adaptant.
- Faire vos exercices régulièrement, même quand la douleur est un peu présente.
- Reprendre le travail dès que possible, en aménageant si besoin.
- Alterner les positions plutôt que rester longtemps immobile.

## Ce qui freine la guérison
- Le repos au lit prolongé : il raidit le dos et affaiblit les muscles.
- La peur de bouger : une douleur pendant un mouvement ne veut pas dire que vous vous abîmez.
- Attendre de ne plus avoir mal du tout pour reprendre ses activités.

## Quand consulter rapidement
Contactez votre médecin sans attendre en cas de perte de force dans une jambe, de troubles pour uriner ou aller à la selle, d'engourdissement entre les cuisses, de fièvre, ou de douleur qui s'aggrave nettement la nuit.`
  },
  {
    id: "c-douleur-exercice",
    titre: "Douleur pendant les exercices : comment se repérer",
    resume: "Une douleur modérée est souvent acceptable. Voici comment savoir si vous en faites trop.",
    ico: "info",
    texte: `Ressentir un peu de douleur pendant les exercices est fréquent et souvent sans danger. L'important est de savoir doser.

## La règle simple
Pendant l'exercice, une douleur jusqu'à 3 sur 10 est en général acceptable. Elle doit revenir à son niveau habituel dans l'heure qui suit, et ne pas être plus forte le lendemain matin.

## Si vous avez plus mal
- Réduisez l'amplitude du mouvement ou le nombre de répétitions.
- Ralentissez le mouvement et respirez calmement.
- Choisissez la version facile de l'exercice si elle est proposée.
- Signalez-le à votre kiné en fin de séance (« Difficile » ou « Trop dur »), il adaptera le programme.

## Arrêtez et parlez-en à votre kiné si
- La douleur dépasse 5 sur 10 ou devient vive, comme une décharge.
- Elle persiste plus de 24 heures après la séance.
- Un gonflement, une rougeur ou un fourmillement nouveau apparaît.`
  },
  {
    id: "c-posture-bureau",
    titre: "Bien installé au bureau",
    resume: "Réglages simples du poste de travail et pauses actives.",
    ico: "settings",
    texte: `Il n'existe pas de posture parfaite : la meilleure posture, c'est la suivante. Changer souvent de position compte plus que tenir une position « idéale ».

## Réglages du poste
- Écran face à vous, à une longueur de bras, le haut de l'écran à hauteur des yeux.
- Avant-bras posés sur le bureau, épaules relâchées.
- Pieds à plat au sol ou sur un repose-pieds, genoux à peu près à hauteur des hanches.
- Dossier réglé pour soutenir le bas du dos.
- Avec un ordinateur portable, utilisez si possible un clavier et une souris séparés.

## Bouger régulièrement
- Levez-vous toutes les 30 à 45 minutes, même une minute.
- Profitez des appels téléphoniques pour marcher.
- Faites quelques mouvements d'épaules, de nuque et de dos plusieurs fois par jour.
- Pensez à cligner des yeux et à regarder au loin de temps en temps.`
  },
  {
    id: "c-sommeil",
    titre: "Mieux dormir quand on a mal",
    resume: "Le sommeil aide le corps à récupérer. Quelques habitudes qui font la différence.",
    ico: "moon",
    texte: `Douleur et sommeil sont liés : mal dormir rend plus sensible à la douleur, et la douleur gêne le sommeil. Améliorer ses nuits fait partie du traitement.

## Les bonnes habitudes
- Se coucher et se lever à heures régulières, y compris le week-end.
- Garder la chambre calme, sombre et plutôt fraîche.
- Éviter les écrans dans l'heure qui précède le coucher.
- Limiter le café, le thé et les sodas après le milieu d'après-midi.
- Éviter les repas lourds et l'alcool le soir.

## Trouver une position confortable
- Sur le dos : un coussin sous les genoux soulage souvent le bas du dos.
- Sur le côté : un coussin entre les genoux garde le bassin aligné.
- Pour l'épaule : sur le dos ou du côté non douloureux, le bras posé sur un coussin.

## Si vous n'arrivez pas à dormir
Après 20 minutes environ, levez-vous, faites une activité calme dans une lumière douce, puis recouchez-vous quand le sommeil revient. La respiration guidée de l'application peut aussi aider à se détendre.`
  },
  {
    id: "c-reprise-sport",
    titre: "Reprendre le sport progressivement",
    resume: "Revenir à son activité sans rechute : les principes d'une reprise réussie.",
    ico: "run",
    texte: `Le corps s'adapte aux efforts qu'on lui demande, à condition d'augmenter la charge progressivement. La plupart des rechutes viennent d'une reprise trop rapide.

## Les principes
- Augmentez la durée ou l'intensité d'environ 10 % par semaine, pas plus.
- Changez une seule chose à la fois : la durée, la vitesse ou la fréquence.
- Gardez au moins un jour de récupération entre deux séances intenses.
- Échauffez-vous toujours 5 à 10 minutes.

## Écouter les signaux
- Une gêne légère qui disparaît le lendemain est acceptable.
- Une douleur qui augmente pendant l'effort ou dure plus de 24 heures : revenez à l'étape précédente.
- La fatigue compte aussi : un mauvais sommeil ou une période de stress demandent d'alléger.

## Le jour où tout va bien
C'est souvent là que l'on en fait trop. Respectez votre plan, même quand vous vous sentez en forme : la régularité l'emporte toujours.`
  },
  {
    id: "c-chaud-froid",
    titre: "Chaud ou froid ?",
    resume: "Quand utiliser une poche de glace ou une bouillotte pour soulager.",
    ico: "sun",
    texte: `Le chaud et le froid ne guérissent pas, mais ils peuvent soulager et aider à bouger plus facilement.

## Le froid
Plutôt utile juste après un choc, une entorse, ou quand une articulation est gonflée et chaude.
- 10 à 15 minutes, jamais directement sur la peau : enveloppez la glace dans un linge.
- Peut être répété plusieurs fois par jour.

## La chaleur
Plutôt utile pour les douleurs musculaires, les raideurs et les douleurs installées depuis longtemps.
- 15 à 20 minutes avec une bouillotte ou un coussin chauffant, à une température agréable.
- Intéressante avant les exercices pour assouplir.

## Précautions
N'utilisez ni chaud ni froid sur une zone où la sensibilité est diminuée, ni sur une plaie. En cas de troubles de la circulation ou de diabète, demandez d'abord conseil à votre kiné ou à votre médecin.`
  },
  {
    id: "c-regularite",
    titre: "Faire ses exercices régulièrement",
    resume: "Quelques astuces pour tenir dans la durée.",
    ico: "calendar",
    texte: `Les exercices font effet quand ils sont faits régulièrement, pendant plusieurs semaines. Mieux vaut une séance courte bien faite qu'une longue séance de temps en temps.

## Astuces qui marchent
- Choisissez un moment fixe de la journée, et associez-le à une habitude : après le café du matin, avant le dîner…
- Ajoutez vos séances à l'agenda de votre téléphone, avec un rappel (depuis l'accueil de l'application).
- Préparez votre tapis ou votre matériel à l'avance, à un endroit visible.
- Si vous manquez une séance, ne cherchez pas à rattraper : reprenez simplement à la suivante.

## Si le programme ne vous convient pas
Trop long, trop difficile, des jours qui ne vous arrangent pas ? Dites-le à votre kiné : il peut l'adapter. Vous pouvez aussi changer vous-même vos jours de séance dans « Mes programmes ».`
  },
  {
    id: "c-respiration",
    titre: "Respirer pour se détendre",
    resume: "Une respiration lente calme le corps et aide à moins ressentir la douleur.",
    ico: "wind",
    texte: `Le stress et la douleur s'entretiennent : quand on a mal, on se crispe et on respire vite, ce qui augmente les tensions. Une respiration lente aide à rompre ce cercle.

## L'exercice de base
- Installez-vous confortablement, assis ou allongé.
- Posez une main sur le ventre.
- Inspirez doucement par le nez en laissant le ventre se gonfler.
- Expirez lentement, un peu plus longtemps que l'inspiration.
- Continuez 3 à 5 minutes, sans forcer.

## Quand l'utiliser
- Avant ou après vos exercices.
- Au moment du coucher.
- Lors d'un pic de douleur ou de stress.

La respiration guidée de l'application (RespiR) vous accompagne avec une bille qui monte et descend : suivez-la simplement des yeux.`
  }
];

/* ---------- Petit format de texte → HTML ---------- */

const escHTML = v => String(v ?? "").replace(/[&<>"']/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c]));

export function conseilHTML(texte){
  const lines = String(texte || "").replace(/\r/g, "").split("\n");
  let html = "", list = false, para = [];
  const flushPara = () => { if(para.length){ html += `<p>${escHTML(para.join(" "))}</p>`; para = []; } };
  const closeList = () => { if(list){ html += "</ul>"; list = false; } };
  lines.forEach(raw => {
    const l = raw.trim();
    if(!l){ flushPara(); closeList(); return; }
    if(l.startsWith("## ")){ flushPara(); closeList(); html += `<h2>${escHTML(l.slice(3))}</h2>`; return; }
    if(/^[-•]\s+/.test(l)){ flushPara(); if(!list){ html += "<ul>"; list = true; } html += `<li>${escHTML(l.replace(/^[-•]\s+/, ""))}</li>`; return; }
    closeList(); para.push(l);
  });
  flushPara(); closeList();
  return html;
}

/** Toutes les fiches : fournies (sauf celles remplacées par une version perso) + personnelles. */
export function mergeConseils(perso = []){
  const replaced = new Set(perso.map(c => c.remplace).filter(Boolean));
  return [
    ...CONSEILS_FOURNIS.filter(c => !replaced.has(c.id)).map(c => ({ ...c, fourni: true })),
    ...perso.filter(c => !c.masque)
  ];
}
