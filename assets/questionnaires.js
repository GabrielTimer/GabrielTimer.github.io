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
    consigne: "Évaluez votre capacité à réaliser les activités suivantes au cours de la semaine passée.",
    interpretation: "0 = aucune incapacité, 100 = incapacité maximale. Score non calculable s'il manque plus d'une réponse.",
    texte: sharedQs(11, ["Réponse 1 : texte " + PLACEHOLDER, "Réponse 2 : texte " + PLACEHOLDER, "Réponse 3 : texte " + PLACEHOLDER, "Réponse 4 : texte " + PLACEHOLDER, "Réponse 5 : texte " + PLACEHOLDER])
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
    consigne: "Cochez « Oui » pour chaque phrase qui vous décrit aujourd'hui.",
    interpretation: "Score de 0 à 24 : plus il est élevé, plus l'incapacité est importante.",
    texte: sharedQs(24, ["Non = 0", "Oui = 1"])
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
    consigne: "Indiquez votre niveau de difficulté aujourd'hui pour chaque activité.",
    interpretation: "Score de 0 à 80 : plus il est élevé, meilleure est la fonction. Changement cliniquement significatif : environ 9 points.",
    texte: sharedQs(20, ["Réponse 0 : texte " + PLACEHOLDER, "Réponse 1 : texte " + PLACEHOLDER, "Réponse 2 : texte " + PLACEHOLDER, "Réponse 3 : texte " + PLACEHOLDER, "Réponse 4 : texte " + PLACEHOLDER])
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
