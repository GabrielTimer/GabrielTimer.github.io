/* « Si ça revient » : petite fiche pour le patient, en cas de nouvelle douleur après la fin des séances.
   Textes seulement (aucun code d'interface) : modifiables ici sans risque.
   Le kiné choisit un plan dans la fiche patient (bloc Accompagnement) et peut changer les 3 exercices
   et ajouter un mot. Enregistré dans patients/{clé}.rechute = { plan, exos:[3 textes], note, date }. */

export const PLANS = {
  dos: {
    nom: "Mal de dos",
    rassurer: "Une nouvelle douleur de dos est fréquente. Dans la grande majorité des cas, elle n'est pas grave et passe en quelques jours à quelques semaines.",
    faire: [
      "Restez actif : marchez un peu plusieurs fois par jour, même si ça tire.",
      "Évitez de rester couché : le repos au lit ralentit la guérison.",
      "La chaleur (20 minutes) peut soulager.",
      "Reprenez tout de suite les exercices ci-dessous, doucement."
    ],
    exos: [
      "Bascule du bassin, couché sur le dos : 10 fois, 2 fois par jour",
      "Genoux vers la poitrine : 10 fois, 2 fois par jour",
      "Marche : 10 minutes 3 fois par jour, un peu plus chaque jour"
    ],
    alerte: [
      "Perte de contrôle des urines ou des selles, ou engourdissement entre les jambes : urgences tout de suite.",
      "Faiblesse d'une jambe qui augmente (le pied accroche).",
      "Fièvre, ou douleur la nuit qui ne se calme dans aucune position.",
      "Douleur après une chute ou un choc."
    ],
    appeler: "Contactez votre kiné si ça ne va pas mieux après 1 à 2 semaines, ou si la douleur descend dans la jambe."
  },
  cou: {
    nom: "Mal au cou",
    rassurer: "Un torticolis ou une douleur du cou qui revient est fréquent et passe en général en quelques jours.",
    faire: [
      "Continuez à bouger la tête doucement, sans forcer.",
      "Évitez de garder la même position longtemps (écran, téléphone) : faites une pause toutes les 30 minutes.",
      "La chaleur (20 minutes) peut soulager.",
      "Reprenez tout de suite les exercices ci-dessous."
    ],
    exos: [
      "Tourner la tête doucement à droite et à gauche : 10 fois, 3 fois par jour",
      "Rentrer le menton (petit « oui ») en tenant 5 secondes : 10 fois",
      "Rouler les épaules en arrière : 10 fois, plusieurs fois par jour"
    ],
    alerte: [
      "Vertige, vision double, trouble de la parole ou faiblesse d'un côté : appelez le 15.",
      "Fourmillements ou maladresse des deux mains, marche instable.",
      "Fièvre, ou douleur après une chute ou un choc."
    ],
    appeler: "Contactez votre kiné si ça ne va pas mieux après 1 semaine, ou si la douleur descend dans le bras."
  },
  epaule: {
    nom: "Épaule",
    rassurer: "Une épaule qui redevient douloureuse après un effort inhabituel n'est en général pas grave.",
    faire: [
      "Ne bloquez pas l'épaule : gardez-la en mouvement sans forcer.",
      "Réduisez quelques jours ce qui fait très mal (bras en l'air, port lourd), gardez le reste.",
      "La nuit, dormez sur l'autre côté avec un coussin sous le bras.",
      "Reprenez tout de suite les exercices ci-dessous."
    ],
    exos: [
      "Pendulaire : bras pendant, petits cercles, 1 minute, 3 fois par jour",
      "Lever le bras en s'aidant de l'autre main ou d'un bâton : 10 fois, 2 fois par jour",
      "Tourner le bras vers l'extérieur coude au corps, avec un élastique léger : 2 × 10"
    ],
    alerte: [
      "Impossible de lever le bras après une chute.",
      "Douleur qui va vers la poitrine ou la mâchoire, essoufflement : appelez le 15.",
      "Épaule rouge, chaude, avec de la fièvre."
    ],
    appeler: "Contactez votre kiné si ça ne va pas mieux après 2 semaines, ou si la nuit devient difficile."
  },
  genou: {
    nom: "Genou",
    rassurer: "Un genou qui redevient douloureux après plus d'activité que d'habitude va souvent mieux en adaptant la charge quelques jours.",
    faire: [
      "Réduisez quelques jours ce qui fait mal (course, escaliers, accroupi), sans arrêter de marcher.",
      "Le froid (15 minutes) peut soulager si le genou est gonflé.",
      "Reprenez tout de suite les exercices ci-dessous, puis vos activités petit à petit."
    ],
    exos: [
      "Contracter la cuisse jambe tendue, tenir 5 secondes : 10 fois",
      "Plier et tendre le genou, assis : 20 fois",
      "Se lever d'une chaise : 2 × 10, sans les mains si possible"
    ],
    alerte: [
      "Genou qui gonfle beaucoup d'un coup, ou qui se bloque.",
      "Genou rouge, chaud, avec de la fièvre.",
      "Mollet gonflé, chaud et douloureux : consultez le jour même."
    ],
    appeler: "Contactez votre kiné si ça ne va pas mieux après 2 semaines, ou si le genou se dérobe."
  },
  cheville: {
    nom: "Cheville et pied",
    rassurer: "Une nouvelle petite entorse ou une douleur qui revient se soigne bien en bougeant tôt.",
    faire: [
      "Marchez dès que possible, avec une chevillère si besoin.",
      "Surélevez le pied et mettez du froid (15 minutes) les premiers jours.",
      "Reprenez tout de suite les exercices ci-dessous, puis l'équilibre."
    ],
    exos: [
      "Dessiner l'alphabet avec le pied : 2 fois par jour",
      "Montées sur la pointe des pieds : 2 × 10",
      "Tenir sur une jambe 30 secondes, en vous tenant si besoin : 5 fois"
    ],
    alerte: [
      "Impossible de poser le pied et de faire 4 pas.",
      "Douleur forte quand on appuie sur l'os.",
      "Mollet gonflé, chaud et douloureux : consultez le jour même."
    ],
    appeler: "Contactez votre kiné si vous boitez encore après 1 semaine, ou si la cheville tourne souvent."
  },
  hanche: {
    nom: "Hanche",
    rassurer: "Une hanche qui redevient douloureuse va souvent mieux en restant actif et en adaptant la charge.",
    faire: [
      "Continuez à marcher, par périodes plus courtes si besoin.",
      "Évitez quelques jours de croiser les jambes et de rester assis bas trop longtemps.",
      "Reprenez tout de suite les exercices ci-dessous."
    ],
    exos: [
      "Pont fessier, couché sur le dos : 2 × 10",
      "Écarter la jambe, couché sur le côté : 2 × 10",
      "Marche : 10 minutes 3 fois par jour"
    ],
    alerte: [
      "Douleur de l'aine après une chute, ou marche impossible.",
      "Fièvre avec une douleur de la hanche.",
      "Douleur la nuit très inhabituelle."
    ],
    appeler: "Contactez votre kiné si ça ne va pas mieux après 2 semaines."
  },
  autre: {
    nom: "Autre douleur",
    rassurer: "Quand une douleur revient, ce n'est en général pas grave : le corps a souvent juste besoin de reprendre ses exercices.",
    faire: [
      "Ne vous arrêtez pas complètement : réduisez ce qui fait très mal et gardez le reste.",
      "Reprenez tout de suite les exercices ci-dessous, à moitié de la dose habituelle, puis augmentez.",
      "Une douleur jusqu'à 3 ou 4 sur 10 pendant l'exercice est acceptable si elle redescend le lendemain."
    ],
    exos: [
      "Bouger doucement la zone dans toutes les directions : 10 fois, 3 fois par jour",
      "Les exercices de renforcement de votre dernier programme, à moitié de la dose",
      "Marche ou vélo : 10 à 20 minutes par jour"
    ],
    alerte: [
      "Fièvre, rougeur ou chaleur de la zone.",
      "Douleur après une chute ou un choc.",
      "Faiblesse ou engourdissement qui augmente."
    ],
    appeler: "Contactez votre kiné si ça ne va pas mieux après 1 à 2 semaines."
  }
};

/** Plan proposé d'après les zones notées au dernier bilan (sinon « autre »). */
export function planPropose(zones = []){
  const z = zones.join(" ").toLowerCase();
  if(/lomb|sacr|fess|dos|dorsa/.test(z)) return "dos";
  if(/cerv|cou|nuque/.test(z)) return "cou";
  if(/épaule|epaule/.test(z)) return "epaule";
  if(/genou/.test(z)) return "genou";
  if(/cheville|pied|talon/.test(z)) return "cheville";
  if(/hanche|aine/.test(z)) return "hanche";
  return "autre";
}
