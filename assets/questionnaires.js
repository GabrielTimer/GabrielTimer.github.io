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
    consigne: "Pour chaque rubrique, cochez la phrase qui décrit le mieux votre situation aujourd'hui.",
    interpretation: "0–20 % : incapacité minime ; 21–40 % : modérée ; 41–60 % : sévère ; > 60 % : très sévère. Changement cliniquement significatif : environ 10 points.",
    texte: qs(["intensité de la douleur", "soins personnels", "soulever des charges", "marcher", "position assise", "position debout", "sommeil", "vie sexuelle", "vie sociale", "déplacements"], 6)
  },
  {
    cle: "NDI", nom: "Neck Disability Index (NDI)", zone: "Cervicalgie", scoring: "pct", debut: 0, sens: "bas", bilan: "m_ndi",
    consigne: "Pour chaque rubrique, cochez la phrase qui décrit le mieux votre situation aujourd'hui.",
    interpretation: "0–8 % : pas d'incapacité ; 10–28 % : légère ; 30–48 % : modérée ; 50–68 % : sévère ; > 70 % : complète.",
    texte: qs(["intensité de la douleur", "soins personnels", "soulever des charges", "lecture", "maux de tête", "concentration", "travail", "conduite", "sommeil", "loisirs"], 6)
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
