/* Petites leçons d'éducation : courtes, débloquées au fil de la prise en charge.
   Le kiné choisit un parcours dans la fiche du patient (Suivi → Petites leçons) :
   patient.lecons = { parcours, debut }. Une nouvelle leçon tous les JOURS_ENTRE jours.
   Pour modifier un texte : changer la ligne ici (titre, texte, retenir). */

export const JOURS_ENTRE = 3;

export const PARCOURS = {
  douleur: {
    nom: "Comprendre sa douleur",
    pour: "Douleurs qui durent, peur de bouger",
    lecons: [
      { titre: "La douleur est un signal d'alarme",
        texte: ["La douleur est fabriquée par le cerveau pour vous protéger. Elle dit « attention », pas forcément « il y a un dégât ».",
          "Quand une douleur dure, l'alarme devient souvent trop sensible : elle sonne fort, même quand le corps n'est pas en danger.",
          "C'est réel, ce n'est pas « dans la tête » : c'est le système nerveux qui s'est mis en mode protection."],
        retenir: "Avoir mal ne veut pas toujours dire se faire du mal." },
      { titre: "Bouger aide à guérir",
        texte: ["Le repos complet prolongé rend les muscles et les articulations plus raides et plus fragiles.",
          "Bouger régulièrement, même un peu, nourrit les tissus et calme l'alarme de la douleur.",
          "Pendant vos exercices, une gêne légère qui disparaît dans les heures qui suivent est acceptable."],
        retenir: "Un peu chaque jour vaut mieux que beaucoup une fois." },
      { titre: "Le bon dosage",
        texte: ["Repère simple : pendant l'exercice, une douleur jusqu'à 3 ou 4 sur 10 est acceptable.",
          "Si la douleur est nettement plus forte le lendemain matin, c'était un peu trop : diminuez légèrement, sans arrêter.",
          "Augmentez ensuite petit à petit. Le corps s'adapte à ce qu'on lui demande."],
        retenir: "Ni trop, ni trop peu : on ajuste, on n'arrête pas." },
      { titre: "Sommeil, stress et douleur",
        texte: ["Mal dormir, être stressé ou inquiet rend l'alarme de la douleur plus sensible.",
          "Des gestes simples aident : horaires de coucher réguliers, moins d'écrans le soir, un moment de détente ou de respiration calme.",
          "La respiration guidée de l'application peut vous aider à vous détendre."],
        retenir: "Prendre soin de son sommeil, c'est aussi soigner sa douleur." },
      { titre: "Les poussées douloureuses",
        texte: ["Il est normal d'avoir de moins bons jours : une poussée ne veut pas dire que tout est à refaire.",
          "Pendant une poussée : réduisez un peu l'activité sans tout arrêter, continuez des mouvements doux, puis reprenez progressivement.",
          "Notez ce qui a pu la déclencher (effort inhabituel, fatigue, stress) et parlez-en à votre kiné."],
        retenir: "Une mauvaise journée n'efface pas les progrès." }
    ]
  },
  dos: {
    nom: "Le mal de dos",
    pour: "Lombalgie, mal au bas du dos",
    lecons: [
      { titre: "Votre dos est solide",
        texte: ["La colonne vertébrale est une structure très solide, faite pour bouger et porter.",
          "La grande majorité des maux de dos ne sont pas dus à une lésion grave, et ils s'améliorent en quelques semaines.",
          "Les images (radio, IRM) montrent souvent de l'« usure » chez des personnes qui n'ont pas mal : c'est en grande partie normal avec l'âge."],
        retenir: "Mal au dos ne veut pas dire dos abîmé." },
      { titre: "Rester actif",
        texte: ["Le repos au lit ralentit la guérison. Continuer ses activités habituelles, en les adaptant, aide à aller mieux plus vite.",
          "La marche est l'une des meilleures activités pour le dos.",
          "Changez souvent de position : le dos n'aime pas rester figé longtemps, assis comme debout."],
        retenir: "Le mouvement est le meilleur ami du dos." },
      { titre: "Porter et se pencher",
        texte: ["Il n'existe pas une seule « bonne » posture : un dos détendu et qui bouge est plus important qu'un dos « droit ».",
          "Pour porter, gardez la charge près du corps et prenez votre temps. Se pencher n'est pas dangereux.",
          "Plus vous serez entraîné, plus votre dos sera à l'aise pour les efforts du quotidien."],
        retenir: "Un dos entraîné supporte mieux les efforts." },
      { titre: "Ce qui aide vraiment",
        texte: ["Les exercices réguliers sont le traitement le plus efficace sur la durée.",
          "La chaleur, les mouvements doux ou des antalgiques conseillés par votre médecin peuvent soulager pendant les périodes difficiles.",
          "Les traitements passifs seuls (massage, appareils) soulagent un temps, mais ne remplacent pas le mouvement."],
        retenir: "Ce que vous faites vous-même compte le plus." },
      { titre: "Quand consulter rapidement",
        texte: ["Consultez sans attendre en cas de : faiblesse d'une jambe qui s'aggrave, engourdissement entre les jambes, difficulté pour uriner ou aller à la selle, fièvre avec le mal de dos.",
          "Ces situations sont rares, mais elles nécessitent un avis médical rapide (appelez le 15 si besoin).",
          "En dehors de ces signes, continuez vos exercices et votre activité."],
        retenir: "Connaître les signes d'alerte, c'est pouvoir bouger sereinement." }
    ]
  },
  arthrose: {
    nom: "Vivre avec l'arthrose",
    pour: "Arthrose du genou, de la hanche",
    lecons: [
      { titre: "L'arthrose, c'est quoi ?",
        texte: ["L'arthrose est une modification de l'articulation qui arrive souvent avec l'âge. Elle n'empire pas forcément avec le temps.",
          "La douleur ne dépend pas seulement de ce que montre la radio : deux personnes avec la même radio peuvent avoir mal très différemment.",
          "On peut agir sur la douleur et sur la gêne, à tout âge."],
        retenir: "L'arthrose n'est pas une fatalité." },
      { titre: "Le mouvement nourrit le cartilage",
        texte: ["Le cartilage n'a pas de vaisseaux sanguins : il se nourrit quand l'articulation bouge et se charge.",
          "Le repos prolongé raidit l'articulation et affaiblit les muscles qui la protègent.",
          "L'exercice est le traitement recommandé en premier dans l'arthrose."],
        retenir: "Une articulation qui bouge est une articulation nourrie." },
      { titre: "Des muscles forts protègent",
        texte: ["Des muscles plus forts autour du genou ou de la hanche soulagent l'articulation.",
          "Les exercices de renforcement donnent des résultats après quelques semaines : la régularité compte plus que l'intensité.",
          "Une petite gêne pendant l'exercice est acceptable si elle reste modérée et disparaît dans les heures qui suivent."],
        retenir: "Plus fort, c'est moins de douleur." },
      { titre: "Poids, marche et quotidien",
        texte: ["Chaque kilo perdu allège la charge sur le genou et la hanche à chaque pas.",
          "La marche, le vélo et l'activité dans l'eau sont très bien tolérés.",
          "De bonnes chaussures, une canne du côté opposé à la douleur si besoin, et des pauses régulières aident au quotidien."],
        retenir: "De petits changements ont un grand effet." },
      { titre: "Les jours de poussée",
        texte: ["L'articulation peut être plus gonflée ou plus douloureuse pendant quelques jours : c'est une poussée.",
          "Pendant ces jours-là : réduisez un peu les efforts, gardez des mouvements doux, le froid peut soulager un genou gonflé.",
          "Reprenez ensuite vos exercices progressivement. Si la poussée dure, parlez-en à votre kiné ou à votre médecin."],
        retenir: "On adapte pendant la poussée, puis on reprend." }
    ]
  }
};

/** Leçons déjà débloquées pour ce patient : [{ i, titre, texte, retenir, jour }] */
export function debloquees(reglage){
  const p = PARCOURS[reglage?.parcours];
  if(!p || !reglage.debut) return [];
  const jours = Math.floor((Date.now() - reglage.debut) / 86400000);
  const n = Math.min(p.lecons.length, Math.floor(jours / JOURS_ENTRE) + 1);
  return p.lecons.slice(0, n).map((l, i) => ({ ...l, i }));
}

/* Lues : gardées sur le téléphone du patient */
const cleLues = r => `gt_lecons_lues_${r?.parcours || ""}`;
export function lues(reglage){ try{ return JSON.parse(localStorage.getItem(cleLues(reglage)) || "[]"); }catch(e){ return []; } }
export function marquerLue(reglage, i){
  const l = lues(reglage);
  if(!l.includes(i)){ l.push(i); try{ localStorage.setItem(cleLues(reglage), JSON.stringify(l)); }catch(e){} }
}
