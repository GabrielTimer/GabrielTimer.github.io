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
      cur = { texte: l.slice(1).trim(), options: [], section };
      items.push(cur);
      return;
    }
    if(/^[-•]\s*/.test(l) && cur){
      cur.options.push(opt(l.replace(/^[-•]\s*/, ""), cur.options.length));
    }
  });
  items.forEach(it => { if(!it.options.length && shared) it.options = shared.map(o => ({ ...o })); });
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
    cle: "EIFEL", nom: "EIFEL (Roland-Morris)", zone: "Lombalgie", scoring: "somme", debut: 0, sens: "bas", max: 24, unite: "/24",
    consigne: "Cochez « Oui » pour chaque phrase qui vous décrit aujourd'hui.",
    interpretation: "Score de 0 à 24 : plus il est élevé, plus l'incapacité est importante.",
    texte: sharedQs(24, ["Non = 0", "Oui = 1"])
  },
  {
    cle: "KOOS", nom: "KOOS (genou)", zone: "Genou", scoring: "koos", debut: 0, sens: "haut",
    consigne: "Répondez en pensant à votre genou au cours de la semaine passée.",
    interpretation: "Un score par section, de 0 (problèmes extrêmes) à 100 (aucun problème).",
    aideKine: "Attention : dans la version officielle, deux questions de la section Symptômes ont une cotation inversée. Indiquez leurs valeurs avec « = » (par exemple « - Toujours = 0 »).",
    texte: sharedQs(42, ["Réponse 0 : texte " + PLACEHOLDER, "Réponse 1 : texte " + PLACEHOLDER, "Réponse 2 : texte " + PLACEHOLDER, "Réponse 3 : texte " + PLACEHOLDER, "Réponse 4 : texte " + PLACEHOLDER],
      [["Symptômes", 7], ["Douleur", 9], ["Vie quotidienne", 17], ["Sport et loisirs", 5], ["Qualité de vie", 4]])
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
  const sousScores = q.scoring === "koos" ? sousScoresKoos(items, reponses) : null;
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
