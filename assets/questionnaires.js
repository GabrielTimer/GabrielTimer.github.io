/* =========================================================
   Questionnaires validés : format, modèles, calcul des scores
   ---------------------------------------------------------
   Les textes officiels des questionnaires sont protégés et
   leur formulation validée doit être respectée : le kiné les
   colle une fois depuis sa version officielle. Ce module fournit
   la structure (nombre de questions et de réponses) et la règle
   de calcul de chaque score.

   Format du texte (éditeur) :
     # Nom de section            (facultatif, pour les sous-scores)
     @options A | B | C | D      (réponses communes aux questions suivantes)
     ? Texte de la question
     - Texte d'une réponse       (réponses propres à cette question)
     - Texte d'une réponse = 3   (valeur imposée, facultatif)
   ========================================================= */

export const SCORINGS = {
  pct: {
    label: "Pourcentage (somme ÷ maximum possible des questions répondues × 100)",
    unite: "%",
    calc(items, rep){
      let sum = 0, max = 0;
      items.forEach((it, i) => { if(rep[i] === null || rep[i] === undefined) return; sum += rep[i]; max += Math.max(...it.options.map(o => o.valeur)); });
      return max ? Math.round(sum * 1000 / max) / 10 : null;
    }
  },
  quickdash: {
    label: "QuickDASH : ((somme ÷ nombre de réponses) − 1) × 25",
    unite: "/100",
    calc(items, rep){
      const v = rep.filter(x => x !== null && x !== undefined);
      if(!v.length) return null;
      return Math.round(((v.reduce((a, b) => a + b, 0) / v.length) - 1) * 25 * 10) / 10;
    }
  },
  somme: {
    label: "Somme des réponses",
    unite: "",
    calc(items, rep){
      const v = rep.filter(x => x !== null && x !== undefined);
      return v.length ? v.reduce((a, b) => a + b, 0) : null;
    }
  },
  startback: {
    label: "STarT Back : score total (9 items) et sous-score psychosocial (items 5 à 9) → risque faible, moyen ou élevé",
    unite: "/9",
    calc(items, rep){
      const v = rep.filter(x => x !== null && x !== undefined);
      return v.length === items.length ? v.reduce((a, b) => a + b, 0) : null;
    },
    sous(items, rep){
      if(rep.filter(x => x !== null && x !== undefined).length !== items.length) return null;
      const total = rep.reduce((a, b) => a + b, 0), psy = rep.slice(4, 9).reduce((a, b) => a + b, 0);
      return { "Psychosocial (5–9)": psy, "Risque": total <= 3 ? "faible" : psy <= 3 ? "moyen" : "élevé" };
    }
  },
  sections: {
    label: "Somme totale, et somme de chaque section (ex. HAD : anxiété, dépression)",
    unite: "",
    calc(items, rep){
      const v = rep.filter(x => x !== null && x !== undefined);
      return v.length ? v.reduce((a, b) => a + b, 0) : null;
    },
    sous(items, rep){
      const out = {};
      items.forEach((it, i) => { const k = it.section || "Score"; if(rep[i] !== null && rep[i] !== undefined) out[k] = (out[k] || 0) + rep[i]; });
      return Object.keys(out).length ? out : null;
    }
  },
  koos: {
    label: "KOOS : 100 − (moyenne de la section × 25), par section",
    unite: "/100",
    sections: true,
    calc(items, rep){
      const sub = sousScoresKoos(items, rep);
      const vals = Object.values(sub).filter(x => x !== null);
      return vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length * 10) / 10 : null;
    }
  }
};

export function sousScoresKoos(items, rep){
  const by = {};
  items.forEach((it, i) => {
    const s = it.section || "Score";
    by[s] = by[s] || [];
    if(rep[i] !== null && rep[i] !== undefined) by[s].push(rep[i]);
  });
  const out = {};
  Object.entries(by).forEach(([s, v]) => {
    const n = items.filter(it => (it.section || "Score") === s).length;
    out[s] = v.length >= Math.ceil(n / 2) ? Math.round((100 - (v.reduce((a, b) => a + b, 0) / v.length) * 25) * 10) / 10 : null;
  });
  return out;
}

/* ---------- Lecture / écriture du format texte ---------- */

export function parseQuestions(texte, debut = 0){
  const items = [];
  let shared = null, section = "", cur = null;
  const opt = (raw, idx) => {
    const m = raw.match(/^(.*?)\s*=\s*(-?\d+(?:[.,]\d+)?)\s*$/);
    return m ? { texte: m[1].trim(), valeur: Number(m[2].replace(",", ".")) } : { texte: raw.trim(), valeur: debut + idx };
  };
  String(texte || "").replace(/\r/g, "").split("\n").forEach(line => {
    const l = line.trim();
    if(!l) return;
    if(l.startsWith("#")){ section = l.replace(/^#+\s*/, ""); return; }
    if(l.toLowerCase().startsWith("@options")){
      const list = l.slice(8).split("|").map(x => x.trim()).filter(Boolean);
      shared = list.map(opt);
      return;
    }
    if(l.startsWith("?")){
      cur = { texte: l.slice(1).trim(), options: [], section, _shared: shared };
      items.push(cur);
      return;
    }
    if(/^[-•]\s*/.test(l) && cur){
      cur.options.push(opt(l.replace(/^[-•]\s*/, ""), cur.options.length));
    }
  });
  // Chaque question prend les réponses communes déclarées juste avant elle (« @options »).
  items.forEach(it => { const sh = it._shared || shared; delete it._shared; if(!it.options.length && sh) it.options = sh.map(o => ({ ...o })); });
  return items;
}

export function writeQuestions(items){
  let out = "", section = "";
  const sharedOf = it => it.options.map(o => o.texte).join(" | ");
  let lastShared = null;
  items.forEach((it, i) => {
    if((it.section || "") !== section){ section = it.section || ""; if(section) out += `\n# ${section}\n`; lastShared = null; }
    const same = i > 0 && sharedOf(items[i - 1]) === sharedOf(it);
    const next = items[i + 1] && sharedOf(items[i + 1]) === sharedOf(it);
    if(same || next){
      if(lastShared !== sharedOf(it)){ out += `@options ${sharedOf(it)}\n`; lastShared = sharedOf(it); }
      out += `? ${it.texte}\n`;
    }else{
      lastShared = null;
      out += `? ${it.texte}\n` + it.options.map(o => `- ${o.texte} = ${o.valeur}`).join("\n") + "\n";
    }
  });
  return out.trim() + "\n";
}

export const PLACEHOLDER = "à remplacer";
export const hasPlaceholders = items => items.some(it => it.texte.toLowerCase().includes(PLACEHOLDER) || it.options.some(o => o.texte.toLowerCase().includes(PLACEHOLDER)));

/* ---------- Modèles : structure et calcul, sans les textes officiels ---------- */

const qs = (topics, nOptions) => topics.map((t, i) =>
  `? Question ${i + 1} (${t}) : texte ${PLACEHOLDER}\n` + Array.from({ length: nOptions }, (_, k) => `- Réponse ${k} : texte ${PLACEHOLDER}`).join("\n")).join("\n");
const sharedQs = (n, opts, sections = null) => {
  let out = `@options ${opts.join(" | ")}\n`;
  let k = 0;
  if(sections){
    sections.forEach(([name, count]) => {
      out += `\n# ${name}\n@options ${opts.join(" | ")}\n`;
      for(let j = 0; j < count; j++) out += `? Question ${++k} : texte ${PLACEHOLDER}\n`;
    });
    return out;
  }
  for(let j = 0; j < n; j++) out += `? Question ${j + 1} : texte ${PLACEHOLDER}\n`;
  return out;
};

export const MODELES = [
  {
    cle: "ODI", nom: "Oswestry (ODI)", zone: "Lombalgie", scoring: "pct", debut: 0, sens: "bas", bilan: "m_odi",
    consigne: "Ce questionnaire est conçu pour nous informer de l’effet de votre problème de dos (ou de jambe) dans votre vie de tous les jours. Pour chaque section, choisissez la seule réponse qui vous décrit le mieux aujourd’hui. Si deux réponses semblent correspondre, choisissez celle qui décrit le plus précisément votre problème.",
    interpretation: "0–20 % : incapacité minime ; 21–40 % : modérée ; 41–60 % : sévère ; > 60 % : très sévère. Changement cliniquement significatif : environ 10 points. Une section sans réponse (ex. vie sexuelle) est exclue du calcul.",
    aideKine: "Textes de l’échelle d’incapacité d’Oswestry en français déjà intégrés (version fournie par le cabinet). La section « Vie sexuelle » peut être passée par le patient.",
    texte: `? Intensité de la douleur
- Je n’ai pas de douleur en ce moment. = 0
- La douleur est très légère en ce moment. = 1
- La douleur est modérée en ce moment. = 2
- La douleur est assez forte en ce moment. = 3
- La douleur est très forte en ce moment. = 4
- La douleur est la pire qu’on puisse imaginer en ce moment. = 5
? Soins personnels (se laver, s’habiller, etc)
- Je peux faire mes soins personnels sans augmenter la douleur. = 0
- Je peux faire mes soins personnels mais cela augmente la douleur. = 1
- C’est douloureux de faire mes soins personnels et je les fais lentement et avec précaution. = 2
- J’ai besoin d’un peu d’aide mais je peux faire la plupart de mes soins personnels. = 3
- J’ai besoin d’aide tous les jours pour la plupart de mes soins personnels. = 4
- Je ne m’habille pas, je me lave avec difficulté et je reste au lit. = 5
? Soulever des objets
- Je peux soulever des objets lourds sans augmenter la douleur. = 0
- Je peux soulever des objets lourds mais cela augmente la douleur. = 1
- La douleur m’empêche de soulever des objets lourds à partir du sol mais je peux les soulever s’ils sont bien placés, par exemple sur une table. = 2
- La douleur m’empêche de soulever des objets lourds mais je peux soulever des objets légers ou moyens s’ils sont bien placés. = 3
- Je peux seulement soulever des objets très légers. = 4
- Je ne peux rien soulever ni transporter. = 5
? Marcher
- La douleur ne m’empêche pas de marcher peu importe la distance. = 0
- La douleur m’empêche de marcher plus d’un mille (1,5 kilomètres). = 1
- La douleur m’empêche de marcher plus d’un demi-mille (0,75 kilomètre). = 2
- La douleur m’empêche de marcher plus de 100 verges (100 mètres). = 3
- Je peux marcher seulement à l’aide d’une canne ou de béquilles. = 4
- Je suis au lit la plupart du temps et je dois ramper pour aller aux toilettes. = 5
? S’asseoir
- Je peux m’asseoir sur n’importe quel fauteuil aussi longtemps que je le veux. = 0
- Je peux m’asseoir sur mon fauteuil préféré aussi longtemps que je le veux. = 1
- La douleur m’empêche de m’asseoir plus d’une heure. = 2
- La douleur m’empêche de m’asseoir plus d’une demi-heure. = 3
- La douleur m’empêche de m’asseoir plus de 10 minutes. = 4
- La douleur m’empêche complètement de m’asseoir. = 5
? Se tenir debout
- Je peux me tenir debout aussi longtemps que je le veux sans augmenter la douleur. = 0
- Je peux me tenir debout aussi longtemps que je le veux mais cela augmente la douleur. = 1
- La douleur m’empêche de me tenir debout plus d’une heure. = 2
- La douleur m’empêche de me tenir debout plus d’une demi-heure. = 3
- La douleur m’empêche de me tenir debout plus de 10 minutes. = 4
- La douleur m’empêche complètement de me tenir debout. = 5
? Dormir
- Mon sommeil n’est jamais perturbé par la douleur. = 0
- Mon sommeil est parfois perturbé par la douleur. = 1
- À cause de la douleur, j’ai moins de 6 heures de sommeil. = 2
- À cause de la douleur, j’ai moins de 4 heures de sommeil. = 3
- À cause de la douleur, j’ai moins de 2 heures de sommeil. = 4
- La douleur m’empêche complètement de dormir. = 5
? Vie sexuelle (si s’applique)
- Ma vie sexuelle est normale et elle ne cause pas d’augmentation de la douleur. = 0
- Ma vie sexuelle est normale mais elle cause une certaine augmentation de la douleur. = 1
- Ma vie sexuelle est presque normale mais elle est très douloureuse. = 2
- Ma vie sexuelle est très limitée par la douleur. = 3
- Ma vie sexuelle est presqu’absente à cause de la douleur. = 4
- La douleur empêche toute vie sexuelle. = 5
? Vie sociale
- Ma vie sociale est normale et ne me cause pas d’augmentation de la douleur. = 0
- Ma vie sociale est normale mais elle augmente le niveau de la douleur. = 1
- La douleur n’a pas d’effet important sur ma vie sociale à part de limiter mes activités les plus vigoureuses, par exemple le sport, etc. = 2
- La douleur a limité ma vie sociale et je ne sors plus autant qu’avant. = 3
- La douleur a limité ma vie sociale à mon domicile. = 4
- Je n’ai pas de vie sociale à cause de la douleur. = 5
? Se déplacer
- Je peux me déplacer n’importe où sans douleur. = 0
- Je peux me déplacer n’importe où mais cela augmente la douleur. = 1
- La douleur est forte mais je peux me déplacer plus de deux heures. = 2
- La douleur me limite à des déplacements de moins d’une heure. = 3
- La douleur me limite à de courts déplacements nécessaires de moins de 30 minutes. = 4
- La douleur m’empêche de me déplacer sauf pour recevoir des traitements. = 5
`
  },
  {
    cle: "NDI", nom: "Neck Disability Index (NDI)", zone: "Cervicalgie", scoring: "pct", debut: 0, sens: "bas", bilan: "m_ndi",
    consigne: "Ce questionnaire est conçu pour nous informer de l’effet de vos douleurs cervicales dans votre vie de tous les jours. Répondez à chacune des sections en choisissant la seule réponse qui vous décrit le mieux à ce moment-même.",
    interpretation: "0–8 % : pas d'incapacité ; 10–28 % : légère ; 30–48 % : modérée ; 50–68 % : sévère ; > 70 % : complète. Changement cliniquement significatif : environ 10 points.",
    aideKine: "Textes de l’échelle d’incapacité cervicale (NDI) en français déjà intégrés (version fournie par le cabinet).",
    texte: `? Intensité des douleurs cervicales
- Je n’ai pas de douleur en ce moment. = 0
- La douleur est très légère en ce moment. = 1
- La douleur est modérée en ce moment. = 2
- La douleur est assez forte en ce moment. = 3
- La douleur est très forte en ce moment. = 4
- La douleur est la pire qu’on puisse imaginer en ce moment. = 5
? Soins personnels (ex. se laver, s’habiller)
- Je peux faire mes soins personnels sans augmenter la douleur. = 0
- Je peux faire mes soins personnels, mais cela augmente la douleur. = 1
- C’est douloureux de faire mes soins personnels et je les fais lentement et avec précaution. = 2
- J’ai besoin d’un peu d’aide, mais je peux faire la plupart de mes soins personnels. = 3
- J’ai besoin d’aide tous les jours pour la plupart de mes soins personnels. = 4
- Je ne m’habille pas, je me lave avec difficulté et je reste au lit. = 5
? Soulever des charges
- Je peux soulever des objets lourds sans augmenter la douleur. = 0
- Je peux soulever des objets lourds mais cela augmente la douleur. = 1
- La douleur m’empêche de soulever des objets lourds à partir du sol, mais je peux les soulever s’ils sont bien placés (ex. sur une table). = 2
- La douleur m’empêche de soulever des objets lourds, mais je peux soulever des objets légers ou moyens s’ils sont bien placés (ex. sur une table). = 3
- Je peux seulement soulever des objets très légers. = 4
- Je ne peux rien soulever, ni transporter. = 5
? Lecture
- Je peux lire autant que je le veux, sans douleurs cervicales. = 0
- Je peux lire autant que je le veux, avec de légères douleurs cervicales. = 1
- Je peux lire autant que je le veux, avec des douleurs cervicales modérées. = 2
- Je ne peux pas lire autant que je le veux, à cause de douleurs cervicales modérées. = 3
- Je peux à peine lire, à cause de mes douleurs cervicales intenses. = 4
- Je ne peux aucunement lire, à cause de mes douleurs cervicales. = 5
? Maux de tête
- Je n’ai aucun maux de tête. = 0
- J’ai des maux de tête légers et peu fréquents. = 1
- J’ai des maux de tête modérés et peu fréquents. = 2
- J’ai des maux de tête modérés et fréquents. = 3
- J’ai des maux de tête intenses et fréquents. = 4
- J’ai presque tout le temps des maux de tête. = 5
? Concentration
- Je peux me concentrer complètement sans difficulté, quand je le veux. = 0
- Je peux me concentrer complètement avec de légères difficultés, quand je le veux. = 1
- Il m’est relativement difficile de me concentrer, quand je le veux. = 2
- J’ai beaucoup de difficultés à me concentrer, quand je le veux. = 3
- J’ai d’énormes difficultés à me concentrer, quand je le veux. = 4
- Je n’arrive aucunement à me concentrer. = 5
? Travail (professionnel ou personnel)
- Je peux travailler autant que je le veux. = 0
- Je ne peux faire que mon travail courant, mais rien de plus. = 1
- Je peux faire la plus grande partie de mon travail courant, mais rien de plus. = 2
- Je ne peux pas faire mon travail courant. = 3
- Je peux à peine travailler. = 4
- Je ne peux aucunement travailler. = 5
? Conduite
- Je peux conduire ma voiture sans aucune douleur. = 0
- Je peux conduire ma voiture autant que je le veux, avec de légères douleurs. = 1
- Je peux conduire ma voiture autant que je le veux, avec des douleurs modérées. = 2
- Je ne peux pas conduire ma voiture autant que je le veux, en raison des douleurs modérées. = 3
- Je ne peux à peine conduire en raison des douleurs intenses. = 4
- Je ne conduit aucunement, à cause des douleurs. = 5
? Sommeil (avec ou sans prise médicamenteuse)
- Mon sommeil n’est pas perturbé. = 0
- Mon sommeil est à peine perturbé, moins de 1 heure sans dormir. = 1
- Mon sommeil est un peu perturbé, 1-2 heures sans dormir. = 2
- Mon sommeil est modérément perturbé, 2-3 heures sans dormir. = 3
- Mon sommeil est très perturbé, 3-5 heures sans dormir. = 4
- Mon sommeil est complètement perturbé, 5-7 heures sans dormir. = 5
? Loisirs (cuisine, sport, activités manuelles)
- Je peux participer à toutes mes activités de loisirs sans aucune douleur. = 0
- Je peux participer à toutes mes activités de loisirs, avec quelques douleurs. = 1
- Je peux participer à la plupart de mes activités habituelles de loisirs, mais pas à toutes, à cause de la douleur. = 2
- Je participe qu’à quelques unes de mes activités de loisirs habituelles, à cause de mes douleur. = 3
- Je peux à peine participer à des activités de loisirs, à cause de mes douleurs. = 4
- Je ne peux pas participer à aucune activité de loisir, à cause de mes douleurs. = 5
`
  },
  {
    cle: "QDASH", nom: "QuickDASH", zone: "Membre supérieur", scoring: "quickdash", debut: 1, sens: "bas", bilan: "m_qdash", minRep: 10,
    consigne: "Ce questionnaire va nous aider à apprécier votre état de santé général et vos problèmes musculo-articulaires en particulier. Veuillez évaluer vos possibilités d’effectuer les activités suivantes au cours des 7 derniers jours. Il n’y a pas de réponses justes ou fausses : si vous hésitez, donnez la réponse qui vous semble la plus adaptée.",
    interpretation: "0 = aucune incapacité, 100 = incapacité maximale. Score non calculable s'il manque plus d'une réponse.",
    aideKine: "Textes du QuickDASH en français déjà intégrés (version Réseau Prévention Main Île-de-France fournie par le cabinet).",
    texte: `@options Aucune difficulté = 1 | Difficulté légère = 2 | Difficulté moyenne = 3 | Difficulté importante = 4 | Impossible = 5
? Dévisser un couvercle serré ou neuf
? Effectuer des tâches ménagères lourdes (nettoyage des sols ou des murs)
? Porter des sacs de provisions ou une mallette
? Se laver le dos
? Couper la nourriture avec un couteau
? Activités de loisir nécessitant une certaines force ou avec des chocs au niveau de l’épaule, du bras ou de la main (bricolage, tennis, golf etc.)
@options Pas du tout = 1 | Légèrement = 2 | Moyennement = 3 | Beaucoup = 4 | Extrêmement = 5
? Pendant les 7 derniers jours, à quel point votre épaule, votre bras ou votre main vous a-t-elle géné dans vos relations avec votre famille, vos amis ou vos voisins
@options Pas du tout limité = 1 | Légèrement limité = 2 | Moyennement limité = 3 | Très limité = 4 | Incapable = 5
? Avez-vous été limité dans votre travail ou une de vos activités quotidiennes habituelles en raison de problèmes à votre épaule, votre bras ou votre main ?
@options Aucune = 1 | Légère = 2 | Moyenne = 3 | Importante = 4 | Extrême = 5
? Veuillez évaluer la sévérité des symptômes suivants durant les 7 derniers jours : douleur de l’épaule, du bras ou de la main
? Picotements ou fourmillements douloureux de l’épaule, du bras, ou de la main
@options Pas du tout perturbé = 1 | Un peu perturbé = 2 | Moyennement perturbé = 3 | Très perturbé = 4 | Tellement perturbé que je ne peux pas dormir = 5
? Pendant les 7 derniers jours, votre sommeil a-t-il été perturbé par une douleur de votre épaule, de votre bras ou de votre main ?
`
  },
  {
    cle: "STARTBACK", nom: "STarT Back (risque de chronicité)", zone: "Lombalgie", scoring: "startback", debut: 0, sens: "bas", minRep: 9, unite: "/9",
    consigne: "Cochez la case en fonction de votre accord ou désaccord aux affirmations suivantes en vous référant à ces 2 dernières semaines.",
    interpretation: "Total ≤ 3 : risque faible. Total ≥ 4 et sous-score psychosocial (items 5 à 9) ≤ 3 : risque moyen. Sous-score ≥ 4 : risque élevé. Version française validée (Bruyère et al., 2012).",
    aideKine: "Textes de la version française officielle (Keele STarT Back Screening Tool – Fr) déjà intégrés. Le sous-score psychosocial et la catégorie de risque sont calculés automatiquement.",
    texte: `@options Pas d’accord = 0 | D’accord = 1
? 1. À un moment donné, au cours des 2 dernières semaines, mon mal de dos s’est propagé dans mon/mes membre(s) inférieur(s).
? 2. À un moment donné, au cours des 2 dernières semaines, j’ai eu mal à l’épaule ou au cou.
? 3. Je n’ai parcouru à pied que de courtes distances à cause de mon mal de dos.
? 4. Au cours des 2 dernières semaines, je me suis habillé(e) plus lentement que d’habitude à cause de mon mal de dos.
? 5. Il n’est pas vraiment prudent pour une personne dans mon état d’être actif sur le plan physique.
? 6. J’ai souvent été préoccupé(e) par mon mal de dos.
? 7. Je considère que mon mal de dos est épouvantable et j’ai l’impression que cela ne s’améliorera jamais.
? 8. De manière générale, je n’ai pas apprécié toutes les choses comme j’en avais l’habitude à cause de mon mal de dos.
? 9. Globalement, à quel point votre mal de dos vous a-t-il gêné(e) au cours des 2 dernières semaines ?
- Pas du tout = 0
- Un peu = 0
- Modérément = 0
- Beaucoup = 1
- Extrêmement = 1
`
  },
  {
    cle: "EIFEL", nom: "EIFEL (Roland-Morris)", zone: "Lombalgie", scoring: "somme", debut: 0, sens: "bas", max: 24, unite: "/24",
    consigne: "Ces phrases exposent certaines difficultés à effectuer une activité physique quotidienne en rapport avec votre douleur lombaire. Lorsqu’une phrase correspond à une difficulté qui vous affecte aujourd’hui, répondez « Oui ». Dans le cas contraire, répondez « Non ».",
    interpretation: "Score de 0 à 24 : plus il est élevé, plus l'incapacité est importante (24 = incapacité totale). Changement cliniquement significatif : au moins 2 à 3 points. Version française validée (Coste et al., 1993).",
    aideKine: "Textes de l’EIFEL (version française du Roland-Morris) déjà intégrés.",
    texte: `@options Non = 0 | Oui = 1
? 1. Je reste pratiquement tout le temps à la maison à cause de mon dos
? 2. Je change souvent de position pour soulager mon dos
? 3. Je marche plus lentement que d’habitude à cause de mon dos
? 4. A cause de mon dos, je n’effectue aucune des tâches que j’ai l’habitude de faire à la maison
? 5. A cause de mon dos, je m’aide de la rampe pour monter les escaliers
? 6. A cause de mon dos, je m’allonge plus souvent pour me reposer
? 7. A cause de mon dos, je suis obligé(e) de prendre un appui pour sortir d’un fauteuil
? 8. A cause de mon dos, j’essaie d’obtenir que d’autres fassent des choses à ma place
? 9. A cause de mon dos, je m’habille plus lentement que d’habitude
? 10. Je ne reste debout que de courts moments à cause de mon dos
? 11. A cause de mon dos, j’essaie de ne pas me baisser ni de m’agenouiller
? 12. A cause de mon dos, j’ai du mal à me lever d’une chaise
? 13. J’ai mal au dos la plupart du temps
? 14. A cause de mon dos, j’ai des difficultés à me retourner dans mon lit
? 15. J’ai moins d’appétit à cause de mon mal de dos
? 16. A cause de mon dos, j’ai du mal à mettre mes chaussettes (ou bas collants)
? 17. Je ne peux marcher que sur de courtes distances à cause de mon mal de dos
? 18. Je dors moins à cause de mon mal de dos
? 19. A cause de mon dos, quelqu’un m’aide pour m’habiller
? 20. A cause de mon dos, je reste assis(e) la plus grande partie de la journée
? 21. A cause de mon dos, j’évite de faire de gros travaux à la maison
? 22. A cause de mon mal de dos, je suis plus irritable que d’habitude et de mauvaise humeur avec les gens
? 23. A cause de mon dos, je monte les escaliers plus lentement que d’habitude
? 24. A cause de mon dos, je reste au lit la plupart du temps
`
  },
  {
    cle: "KOOS", nom: "KOOS (genou)", zone: "Genou", scoring: "koos", debut: 0, sens: "haut",
    consigne: "Ce questionnaire vous demande votre opinion sur votre genou. Il nous permettra de mieux connaître ce que vous ressentez et ce que vous êtes capable de faire dans votre activité de tous les jours. Répondez à chaque question en pensant aux huit derniers jours. En cas de doute, choisissez la réponse qui vous semble la plus adaptée à votre cas.",
    interpretation: "Un score par section, de 0 (problèmes extrêmes) à 100 (aucun problème). Version française LK 1.0 (J.-F. Maillefert, CHU Dijon).",
    aideKine: "Textes de la version française officielle KOOS LK 1.0 déjà intégrés. Les questions S4 et S5 sont cotées à l'envers (« Toujours » = 0), comme dans la version officielle.",
    texte: `# Symptômes
? S1. Est-ce que votre genou gonfle ?
- Jamais = 0
- Rarement = 1
- Parfois = 2
- Souvent = 3
- Tout le temps = 4
@options Jamais | Rarement | Parfois | Souvent | Toujours
? S2. Ressentez-vous des ou entendez-vous des craquements ou n’importe quel autre type de bruit en bougeant le genou ?
? S3. Est-ce que votre genou accroche ou se bloque en bougeant ?
@options Toujours = 0 | Souvent = 1 | Parfois = 2 | Rarement = 3 | Jamais = 4
? S4. Pouvez-vous étendre votre genou complètement ?
? S5. Pouvez-vous plier votre genou complètement ?
@options Absente | Légère | Modérée | Forte | Extrême
? S6. Raideur (sensation d’avoir du mal à bouger le genou) : le matin au réveil, la raideur de votre genou est :
? S7. Après être resté(e) assis(e), couché(e), ou au repos pendant la journée, la raideur de votre genou est :

# Douleur
@options Jamais | Une fois par mois | Une fois par semaine | Tous les jours | Tout le temps
? P1. Avez-vous souvent mal au genou ?
@options Absente | Légère | Modérée | Forte | Extrême
? P2. Au cours des huit derniers jours, quelle a été l’importance de votre douleur du genou en tournant, pivotant sur votre jambe ?
? P3. … en étendant complètement le genou
? P4. … en pliant complètement le genou
? P5. … en marchant sur un terrain plat
? P6. … en montant ou en descendant les escaliers
? P7. … au lit la nuit
? P8. … en restant assis(e) ou couché(e)
? P9. … en restant debout

# Vie quotidienne
@options Absente | Légère | Modérée | Forte | Extrême
? A1. Au cours des huit derniers jours, quelle a été votre difficulté pour descendre les escaliers ?
? A2. … monter les escaliers
? A3. … vous relever d’une position assise
? A4. … rester debout
? A5. … vous pencher en avant pour ramasser un objet
? A6. … marcher sur un terrain plat
? A7. … monter ou descendre de voiture
? A8. … faire vos courses
? A9. … mettre vos chaussettes ou vos collants
? A10. … sortir du lit
? A11. … enlever vos chaussettes ou vos collants
? A12. … vous retourner ou garder le genou dans la même position en étant couché(e)
? A13. … entrer ou sortir d’une baignoire
? A14. … rester assis(e)
? A15. … vous asseoir ou vous relever des toilettes
? A16. … faire de gros travaux ménagers (déplacer des objets lourds, récurer les sols,…)
? A17. … faire des petits travaux ménagers (faire la cuisine, faire la poussière,…)

# Sport et loisirs
@options Absente | Légère | Modérée | Forte | Extrême
? SP1. Au cours des huit derniers jours, quelle a été votre difficulté pour rester accroupi(e) ?
? SP2. … courir
? SP3. … sauter
? SP4. … tourner, pivoter sur votre jambe
? SP5. … rester à genoux

# Qualité de vie
@options Jamais | Une fois par mois | Une fois par semaine | Tous les jours | Tout le temps
? Q1. Pensez-vous souvent à votre problème de genou ?
@options Pas du tout | Un peu | Modérément | Beaucoup | Totalement
? Q2. Avez-vous modifié votre façon de vivre pour éviter les activités qui pourraient aggraver votre problème de genou ?
? Q3. Est-ce qu’un manque de confiance dans votre genou vous gêne ?
@options Pas du tout | Un peu | Modérément | Beaucoup | Extrêmement
? Q4. Finalement, êtes-vous gêné(e) par votre genou ?
`
  },
  {
    cle: "LEFS", nom: "LEFS (membre inférieur)", zone: "Membre inférieur", scoring: "somme", debut: 0, sens: "haut", max: 80, unite: "/80", bilan: "m_lefs",
    consigne: "Nous sommes intéressés à savoir si vous avez de la difficulté à réaliser les activités énumérées ci-dessous en rapport avec votre problème au(x) membre(s) inférieur(s) pour lequel vous consultez actuellement. Veuillez fournir une réponse pour chacune des activités. Aujourd’hui, avez-vous ou auriez-vous de la difficulté à :",
    interpretation: "Score de 0 à 80 : plus il est élevé, meilleure est la fonction. Changement cliniquement significatif : environ 9 points. Version canadienne-française ÉFMI (René et al.).",
    aideKine: "Textes de l’Échelle fonctionnelle des membres inférieurs (ÉFMI, version française du LEFS) déjà intégrés.",
    texte: `@options Extrêmement difficile ou incapable de réaliser l’activité = 0 | Beaucoup de difficulté = 1 | Difficulté modérée = 2 | Un peu de difficulté = 3 | Aucune difficulté = 4
? Faire vos activités habituelles au travail, à la maison ou à l’école.
? Participer à vos passe-temps, vos loisirs ou vos activités sportives habituelles.
? Entrer ou sortir de la baignoire.
? Marcher d’une pièce à l’autre à la maison.
? Mettre vos souliers ou vos bas.
? Vous accroupir.
? Soulever un objet du plancher, par exemple un sac d’épicerie.
? Effectuer des activités légères autour de la maison, par exemple laver le comptoir.
? Effectuer des activités lourdes autour de la maison, par exemple passer l’aspirateur.
? Entrer ou sortir de la voiture.
? Marcher une distance de deux coins de rue.
? Marcher une distance d’un mille (1.6 km).
? Monter ou descendre 10 marches (environ un étage).
? Vous tenir debout pendant 1 heure.
? Rester assis pendant 1 heure.
? Courir sur un terrain plat.
? Courir sur un terrain inégal.
? Changer brusquement de direction lors d’une course rapide.
? Sautiller.
? Vous retourner dans le lit.
`
  },

  /* ---------- Modèles ajoutés le 5 nov. 2026 : structure et calcul seulement.
     Les textes officiels sont protégés : collez-les depuis la version française validée. ---------- */
  {
    cle: "DHI", nom: "Dizziness Handicap Inventory (DHI)", zone: "Vertiges", scoring: "somme", debut: 0, sens: "bas", max: 100, unite: "/100",
    consigne: "Ces questions portent sur les difficultés liées à vos vertiges ou à vos troubles de l'équilibre. Répondez à chaque question.",
    interpretation: "0–30 : handicap léger ; 31–60 : modéré ; 61–100 : sévère. Écart cliniquement important : environ 18 points.",
    aideKine: "25 questions, réponses Oui (4), Parfois (2), Non (0). Collez les 25 questions de la version française validée.",
    texte: `@options Oui = 4 | Parfois = 2 | Non = 0\n` + Array.from({ length: 25 }, (_, i) => `? Question ${i + 1} : texte ${PLACEHOLDER}`).join("\n")
  },
  {
    cle: "FESI", nom: "FES-I (peur de chuter)", zone: "Chutes", scoring: "somme", debut: 1, sens: "bas", max: 64, unite: "/64",
    consigne: "Pour chaque activité, indiquez à quel point vous êtes inquiet(e) de tomber en la faisant, même si vous ne la faites pas habituellement.",
    interpretation: "16–19 : préoccupation faible ; 20–27 : modérée ; 28–64 : élevée (Delbaere 2010).",
    aideKine: "16 activités notées de 1 (pas du tout inquiet) à 4 (très inquiet). Collez les 16 activités de la version française validée.",
    texte: `@options Pas du tout inquiet(e) = 1 | Un peu inquiet(e) = 2 | Assez inquiet(e) = 3 | Très inquiet(e) = 4\n` + Array.from({ length: 16 }, (_, i) => `? Activité ${i + 1} : texte ${PLACEHOLDER}`).join("\n")
  },
  {
    cle: "ABC", nom: "ABC Scale (confiance en son équilibre)", zone: "Chutes", scoring: "pct", debut: 0, sens: "haut", unite: "%",
    consigne: "Pour chaque activité, indiquez votre degré de confiance à la réaliser sans perdre l'équilibre, de 0 % (aucune confiance) à 100 % (confiance totale).",
    interpretation: "Score moyen de 0 à 100 %. Un score inférieur à 67 % est associé à un risque de chute accru chez la personne âgée (Lajoie et Gallagher 2004).",
    aideKine: "16 activités notées de 0 à 100 % par paliers de 10. Collez les 16 activités de la version française validée.",
    texte: `@options 0 % = 0 | 10 % = 10 | 20 % = 20 | 30 % = 30 | 40 % = 40 | 50 % = 50 | 60 % = 60 | 70 % = 70 | 80 % = 80 | 90 % = 90 | 100 % = 100\n` + Array.from({ length: 16 }, (_, i) => `? Activité ${i + 1} : texte ${PLACEHOLDER}`).join("\n")
  },
  {
    cle: "TSK", nom: "Échelle de Tampa (kinésiophobie)", zone: "Douleur chronique", scoring: "somme", debut: 1, sens: "bas", max: 68, unite: "/68",
    consigne: "Indiquez pour chaque affirmation dans quelle mesure vous êtes d'accord, en pensant à votre douleur.",
    interpretation: "Score de 17 à 68. Au-dessus de 37 : peur du mouvement élevée (Vlaeyen 1995).",
    aideKine: "17 affirmations notées de 1 (pas du tout d'accord) à 4 (tout à fait d'accord). Les affirmations 4, 8, 12 et 16 sont inversées (déjà réglé ici). Collez les textes de la version française validée.",
    texte: Array.from({ length: 17 }, (_, i) => {
      const inv = [4, 8, 12, 16].includes(i + 1);
      const v = inv ? [4, 3, 2, 1] : [1, 2, 3, 4];
      return `? ${i + 1}. Affirmation : texte ${PLACEHOLDER}\n- Pas du tout d'accord = ${v[0]}\n- Plutôt pas d'accord = ${v[1]}\n- Plutôt d'accord = ${v[2]}\n- Tout à fait d'accord = ${v[3]}`;
    }).join("\n")
  },
  {
    cle: "PCS", nom: "Échelle de catastrophisme (PCS)", zone: "Douleur chronique", scoring: "somme", debut: 0, sens: "bas", max: 52, unite: "/52",
    consigne: "Indiquez à quel point vous avez ces pensées ou ces sentiments quand vous avez mal.",
    interpretation: "Score de 0 à 52. À partir de 30 : catastrophisme cliniquement important (Sullivan 1995).",
    aideKine: "13 affirmations notées de 0 (pas du tout) à 4 (tout le temps). Collez les textes de la version française validée.",
    texte: `@options Pas du tout = 0 | Quelque peu = 1 | De façon modérée = 2 | Beaucoup = 3 | Tout le temps = 4\n` + Array.from({ length: 13 }, (_, i) => `? ${i + 1}. Affirmation : texte ${PLACEHOLDER}`).join("\n")
  },
  {
    cle: "HAD", nom: "HAD (anxiété et dépression)", zone: "Douleur chronique", scoring: "sections", debut: 0, sens: "bas", max: 42, unite: "/42",
    consigne: "Pour chaque question, choisissez la réponse qui décrit le mieux ce que vous avez ressenti au cours de la semaine passée.",
    interpretation: "Deux sous-scores de 0 à 21. Pour chacun : ≤ 7 absence de symptomatologie ; 8–10 symptomatologie douteuse ; ≥ 11 symptomatologie certaine (Zigmond et Snaith 1983).",
    aideKine: "14 questions (7 anxiété, 7 dépression), 4 réponses notées de 0 à 3. Le sens change selon la question : lors du collage, gardez la valeur « = x » de chaque réponse de la version officielle.",
    texte: `# Anxiété\n` + Array.from({ length: 7 }, (_, i) => `? A${i + 1}. Question : texte ${PLACEHOLDER}\n` + [0, 1, 2, 3].map(k => `- Réponse : texte ${PLACEHOLDER} = ${k}`).join("\n")).join("\n")
      + `\n# Dépression\n` + Array.from({ length: 7 }, (_, i) => `? D${i + 1}. Question : texte ${PLACEHOLDER}\n` + [0, 1, 2, 3].map(k => `- Réponse : texte ${PLACEHOLDER} = ${k}`).join("\n")).join("\n")
  },
  {
    cle: "MMRC", nom: "Échelle de dyspnée mMRC", zone: "Respiratoire", scoring: "somme", debut: 0, sens: "bas", max: 4, unite: "/4",
    consigne: "Choisissez la phrase qui décrit le mieux votre essoufflement.",
    interpretation: "Stade 0 à 4. À partir du stade 2 : dyspnée importante (GOLD).",
    aideKine: "Une seule question, 5 stades de 0 à 4. Collez les 5 descriptions de la version française.",
    texte: `? Votre essoufflement\n` + [0, 1, 2, 3, 4].map(k => `- Stade ${k} : texte ${PLACEHOLDER} = ${k}`).join("\n")
  },
  {
    cle: "CAT", nom: "CAT (BPCO)", zone: "Respiratoire", scoring: "somme", debut: 0, sens: "bas", max: 40, unite: "/40",
    consigne: "Pour chaque ligne, choisissez le chiffre qui décrit le mieux votre état actuel.",
    interpretation: "< 10 : impact faible ; 10–20 : moyen ; 21–30 : élevé ; > 30 : très élevé. Écart cliniquement important : 2 points.",
    aideKine: "8 lignes notées de 0 à 5 entre deux affirmations opposées. Collez les textes de la version française officielle (outil gratuit pour le soin, sous conditions de son éditeur).",
    texte: `@options 0 | 1 | 2 | 3 | 4 | 5\n` + Array.from({ length: 8 }, (_, i) => `? ${i + 1}. Texte ${PLACEHOLDER} (0) ↔ texte ${PLACEHOLDER} (5)`).join("\n")
  },
  {
    cle: "SPADI", nom: "SPADI (épaule)", zone: "Épaule", scoring: "pct", debut: 0, sens: "bas", unite: "%",
    consigne: "Notez de 0 à 10 votre douleur et vos difficultés à l'épaule au cours de la semaine passée.",
    interpretation: "Score de 0 à 100 % : plus il est élevé, plus l'atteinte est importante. Écart cliniquement important : environ 8 à 13 points.",
    aideKine: "13 questions notées de 0 à 10 : 5 sur la douleur, 8 sur les difficultés. Collez les textes de la version française validée.",
    texte: `# Douleur\n@options 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10\n` + Array.from({ length: 5 }, (_, i) => `? D${i + 1}. Texte ${PLACEHOLDER}`).join("\n")
      + `\n# Incapacité\n@options 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10\n` + Array.from({ length: 8 }, (_, i) => `? I${i + 1}. Texte ${PLACEHOLDER}`).join("\n")
  },
  {
    cle: "OSS", nom: "Oxford Shoulder Score", zone: "Épaule", scoring: "somme", debut: 0, sens: "haut", max: 48, unite: "/48",
    consigne: "Répondez en pensant à votre épaule au cours des 4 dernières semaines.",
    interpretation: "Score de 0 (le plus sévère) à 48 (meilleure fonction).",
    aideKine: "12 questions, 5 réponses notées de 4 (meilleur) à 0 (pire). Collez les textes de la version française validée en gardant les valeurs.",
    texte: Array.from({ length: 12 }, (_, i) => `? ${i + 1}. Question : texte ${PLACEHOLDER}\n` + [4, 3, 2, 1, 0].map(k => `- Réponse : texte ${PLACEHOLDER} = ${k}`).join("\n")).join("\n")
  },
  {
    cle: "ACLRSI", nom: "ACL-RSI (retour au sport après LCA)", zone: "Genou", scoring: "pct", debut: 0, sens: "haut", unite: "%",
    consigne: "Répondez en pensant au sport que vous pratiquiez avant votre blessure.",
    interpretation: "Score de 0 à 100 % : plus il est élevé, plus la préparation psychologique au retour au sport est bonne.",
    aideKine: "12 questions notées de 0 à 10 (certaines échelles sont présentées à l'envers sur la version papier : gardez le sens de la version validée). Collez les textes de la version française validée.",
    texte: `@options 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10\n` + Array.from({ length: 12 }, (_, i) => `? ${i + 1}. Question : texte ${PLACEHOLDER}`).join("\n")
  },
  {
    cle: "ICIQ", nom: "ICIQ-SF (incontinence urinaire)", zone: "Périnée", scoring: "somme", debut: 0, sens: "bas", max: 21, unite: "/21",
    consigne: "Répondez en pensant aux 4 dernières semaines.",
    interpretation: "Score de 0 à 21 : 1–5 léger ; 6–12 modéré ; 13–18 sévère ; 19–21 très sévère.",
    aideKine: "3 questions comptées : fréquence des fuites (0–5), quantité (0, 2, 4, 6), gêne (0–10). La question sur les circonstances n'entre pas dans le score. Collez les textes de la version française validée.",
    texte: `? Fréquence des fuites : texte ${PLACEHOLDER}\n` + [0, 1, 2, 3, 4, 5].map(k => `- Réponse : texte ${PLACEHOLDER} = ${k}`).join("\n")
      + `\n? Quantité : texte ${PLACEHOLDER}\n` + [0, 2, 4, 6].map(k => `- Réponse : texte ${PLACEHOLDER} = ${k}`).join("\n")
      + `\n? Gêne dans la vie de tous les jours (0 = pas du tout, 10 = énormément)\n@options 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10`
  }
];

/* ---------- Calcul ---------- */

export function unitOf(q){
  if(q.unite) return q.unite;
  return SCORINGS[q.scoring]?.unite || "";
}

export function computeScore(q, reponses){
  const items = q.items || parseQuestions(q.texte, q.debut || 0);
  const answered = reponses.filter(x => x !== null && x !== undefined).length;
  if(q.minRep && answered < q.minRep) return { score:null, sousScores:null };
  const sc = SCORINGS[q.scoring] || SCORINGS.somme;
  const score = sc.calc(items, reponses);
  const sousScores = q.scoring === "koos" ? sousScoresKoos(items, reponses) : (sc.sous ? sc.sous(items, reponses) : null);
  return { score, sousScores };
}

export function fmtScore(score, q){
  if(score === null || score === undefined) return "–";
  const u = unitOf(q);
  return `${(Math.round(score * 10) / 10).toLocaleString("fr-FR")}${u === "%" ? " %" : u}`;
}

/** Est-ce le moment de proposer ce questionnaire ? */
export function isDue(lastDate, jours){
  if(!lastDate) return true;
  if(!jours) return false;
  return Date.now() - lastDate >= jours * 864e5 - 6 * 3600e3;
}

/* ---------- Comparaison avant / après ---------- */

/** Écart cliniquement important (MCID) par questionnaire, dans l'unité du score. */
export const MCID = { ODI:10, NDI:7.5, QDASH:8, EIFEL:3, LEFS:9, KOOS:8, DHI:18, CAT:2, SPADI:13 };
const mcidOf = q => q.mcid ?? MCID[q.cle] ?? MCID[String(q.cle || "").toUpperCase()] ?? null;

/** Lecture d'un écart : "mieux", "moins", "stable" (écart < MCID) ou null (pas de seuil connu). */
export function verdictEcart(q, d, mcid = mcidOf(q)){
  if(d === null || d === undefined || isNaN(d)) return null;
  const bon = q.sens === "haut" ? d > 0 : d < 0;
  if(mcid === null) return d === 0 ? "stable" : (bon ? "mieux?" : "moins?");
  if(Math.abs(d) < mcid) return "stable";
  return bon ? "mieux" : "moins";
}

/**
 * Compare deux réponses (a = avant, b = après) d'un même questionnaire.
 * Renvoie l'écart global, les sections et les questions qui ont le plus changé.
 */
export function comparer(q, a, b){
  const r1 = n => Math.round(n * 10) / 10;
  const d = typeof a?.score === "number" && typeof b?.score === "number" ? r1(b.score - a.score) : null;
  const mcid = mcidOf(q);
  const sous = [];
  const sa = a?.sousScores || {}, sb = b?.sousScores || {};
  [...new Set([...Object.keys(sa), ...Object.keys(sb)])].forEach(k => {
    const x = sa[k], y = sb[k];
    const num = typeof x === "number" && typeof y === "number";
    sous.push({ nom:k, a:x ?? null, b:y ?? null, d: num ? r1(y - x) : null, v: num ? verdictEcart({ sens: q.scoring === "koos" ? "haut" : q.sens }, r1(y - x), q.scoring === "koos" ? mcid : null) : null });
  });
  // Questions : pour toutes les échelles, une valeur plus basse = moins de gêne, sauf LEFS / scores « plus haut est mieux » non KOOS.
  const basMieux = q.scoring === "koos" || q.sens !== "haut";
  const items = (q.items || []).map((it, i) => {
    const x = a?.reponses?.[i], y = b?.reponses?.[i];
    if(x === null || x === undefined || y === null || y === undefined || x === y) return null;
    const lib = v => (it.options.find(o => o.valeur === v) || {}).texte || String(v);
    return { texte: it.texte, a: lib(x), b: lib(y), ecart: Math.abs(y - x), mieux: basMieux ? y < x : y > x };
  }).filter(Boolean).sort((u, v) => v.ecart - u.ecart);
  return { d, mcid, verdict: verdictEcart(q, d, mcid), sous, items };
}

export const VERDICT_TXT = {
  mieux: "amélioration cliniquement significative", moins: "aggravation cliniquement significative",
  stable: "écart inférieur au seuil cliniquement significatif", "mieux?": "amélioration", "moins?": "aggravation"
};

/** À quoi sert chaque questionnaire (une phrase courte, affichée au kiné). */
export const BUT = {
  ODI: "Lombalgie : incapacité dans la vie quotidienne",
  NDI: "Cervicalgie : incapacité dans la vie quotidienne",
  QDASH: "Épaule, coude, main : incapacité du membre supérieur",
  EIFEL: "Lombalgie : retentissement sur les activités du jour",
  KOOS: "Genou : symptômes, douleur, fonction, sport, qualité de vie",
  LEFS: "Hanche, genou, cheville : fonction du membre inférieur",
  STARTBACK: "Lombalgie : risque de passage à la chronicité",
  DHI: "Vertiges : retentissement sur la vie quotidienne",
  FESI: "Personne âgée : peur de chuter",
  ABC: "Équilibre : confiance dans les activités du quotidien",
  TSK: "Douleur chronique : peur du mouvement (kinésiophobie)",
  PCS: "Douleur chronique : pensées catastrophistes",
  HAD: "Anxiété et dépression (dépistage)",
  MMRC: "Respiratoire : niveau d'essoufflement",
  CAT: "BPCO : retentissement sur la vie quotidienne",
  SPADI: "Épaule : douleur et incapacité",
  OSS: "Épaule : douleur et fonction",
  ACLRSI: "LCA : préparation psychologique au retour au sport",
  ICIQ: "Périnée : fuites urinaires et gêne"
};
export const butOf = q => q.but || BUT[String(q.cle || "").toUpperCase()] || q.zone || "";
