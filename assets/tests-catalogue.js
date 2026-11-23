/* =========================================================
   Catalogue des tests (bilan et page « Tests »)
   - tests cliniques orthopédiques (bilan-kine/data.js, fiches guide.js)
   - tests fonctionnels (bilan-kine/fonctionnels.js)
   Ajoute à chaque test : spécialités, régions, motifs de bilan pour
   lesquels il est recommandé ; et une fiche commune avec vidéo intégrée.
   ========================================================= */

import { esc, icon, openSheet } from "./app.js";
import { youtubeId } from "./library.js";

/* ---------- Tests fonctionnels : à quoi ils servent ---------- */
/* m = motifs du bilan (chips « Pathologie / motif ») ; z = zones douloureuses (motif) ; s = spécialités */
const EQ = "Trouble de l’équilibre", NEU = "Neurologie (AVC, Parkinson, SEP…)", CH = "Chutes / personne âgée",
  VE = "Vertiges", RE = "Respiratoire", SP = "Reprise du sport", PO = "Post-opératoire", EN = "Entorse",
  GO = "Gonalgie", TE = "Tendinopathie", FR = "Fracture";
/* Motifs cochés + motifs parents (alias définis dans bilan-kine/data.js) */
const eff = l => typeof globalThis.motifsEffectifs === "function" ? globalThis.motifsEffectifs(l || []) : (l || []);
export const MOTIFS_EN_PLUS = [NEU, CH, VE, RE, SP];   // ajoutés à la liste des motifs du bilan

const ZG = /^(Genou|Creux|Cuisse)/, ZC = /^(Pied|Talon|Jambe|Mollet)/, ZM = /^(Main|Avant-bras|Bras)/, ZMI = /^(Hanche|Fessier|Cuisse|Genou|Creux|Jambe|Mollet|Pied|Talon)/;
const TF_TAGS = {
  tf_tug:       { m:[EQ, NEU, CH, PO], s:["Gériatrie et chutes", "Neurologie", "Orthopédie"] },
  tf_6mwt:      { m:[RE, NEU, CH], s:["Cardio et reconditionnement", "Respiratoire", "Neurologie", "Gériatrie et chutes"] },
  tf_10mwt:     { m:[NEU, CH, EQ], s:["Neurologie", "Gériatrie et chutes"] },
  tf_5sts:      { m:[CH, NEU, PO, GO], s:["Gériatrie et chutes", "Neurologie", "Rhumatologie"] },
  tf_30sts:     { m:[CH, GO, PO, RE], s:["Gériatrie et chutes", "Rhumatologie", "Orthopédie", "Cardio et reconditionnement"] },
  tf_sls:       { m:[EQ, CH, EN, VE], z:ZC, s:["Gériatrie et chutes", "Traumatologie", "Vestibulaire"] },
  tf_berg:      { m:[EQ, CH, NEU], s:["Gériatrie et chutes", "Neurologie"] },
  tf_minibest:  { m:[EQ, NEU, VE], s:["Neurologie", "Vestibulaire", "Gériatrie et chutes"] },
  tf_dgi:       { m:[EQ, NEU, VE], s:["Vestibulaire", "Neurologie"] },
  tf_tinetti:   { m:[EQ, CH], s:["Gériatrie et chutes"] },
  tf_ybal:      { m:[SP, EN], z:ZMI, s:["Sport", "Traumatologie"] },
  tf_ybalasym:  { m:[SP, EN], z:ZMI, s:["Sport", "Traumatologie"] },
  tf_hop:       { m:[SP, PO], z:ZG, s:["Sport", "Orthopédie"] },
  tf_triplehop: { m:[SP, PO], z:ZG, s:["Sport", "Orthopédie"] },
  tf_quadlsi:   { m:[SP, PO], z:ZG, s:["Sport", "Orthopédie"] },
  tf_ischiolsi: { m:[SP, PO], z:ZG, s:["Sport", "Orthopédie"] },
  tf_wblt:      { m:[EN, TE], z:ZC, zoneSeule:true, s:["Traumatologie", "Sport", "Rhumatologie"] },
  tf_grip:      { m:[CH, FR], z:ZM, zoneSeule:true, s:["Gériatrie et chutes", "Rhumatologie", "Traumatologie"] }
};
/* Hypothèses des tests cliniques → spécialités */
const SPEC_HYP = {
  LCA:["Traumatologie", "Sport", "Orthopédie"], MEN:["Traumatologie", "Sport"], SFP:["Rhumatologie", "Sport"], OA:["Rhumatologie"],
  RCD:["Rhumatologie"], TF:["Rhumatologie", "Orthopédie"], SSC:["Rhumatologie", "Orthopédie"], SA:["Rhumatologie"], INS:["Traumatologie", "Sport"],
  RAD:["Rhumatologie"], STE:["Rhumatologie", "Gériatrie et chutes"], CEF:["Rhumatologie"], ATFL:["Traumatologie", "Sport"], ACH:["Rhumatologie", "Sport"],
  CFA:["Orthopédie", "Sport"], GTPS:["Rhumatologie"], EPI:["Rhumatologie", "Sport"], EPT:["Rhumatologie", "Sport"],
  CC:["Rhumatologie", "Orthopédie"], DQ:["Rhumatologie"], RHZ:["Rhumatologie"], VPPB:["Vestibulaire"], HYPO:["Vestibulaire"],
  COL:["Traumatologie", "Sport"], MYE:["Neurologie", "Rhumatologie"], TFCC:["Traumatologie", "Sport"],
  MEC:["Rhumatologie", "Prévention et posture"], COS:["Rhumatologie", "Respiratoire"], TAS:["Gériatrie et chutes", "Rhumatologie"],
  PAR:["Rhumatologie"], COR:["Cardio et reconditionnement"],
  MYO:["Rhumatologie"], ART:["Rhumatologie"], DDR:["Rhumatologie"], DDNR:["Rhumatologie"],
  CEN:["Neurologie"], CER:["Neurologie"], PRO:["Neurologie", "Gériatrie et chutes"]
};

/* Motif précis → tests fonctionnels utiles (2 à 4, du plus utile au moins utile).
   Un motif précis absent de cette liste passe par ses motifs parents (TF_TAGS). [] = aucun test fonctionnel. */
const TF_MOTIF = {
  "Lombalgie":[], "Lombalgie chronique":[], "Lumbago (lombalgie aiguë)":[], "Sciatique":[], "Hernie discale":[], "Cruralgie":[],
  "Canal lombaire étroit":["tf_6mwt", "tf_tug"], "Cervicalgie":[], "Névralgie cervico-brachiale":["tf_grip"], "Céphalées":[], "Coup du lapin (whiplash)":[],
  "Dorsalgie":[], "Scoliose / posture":[], "Tassement vertébral":["tf_tug", "tf_sls"],
  "Épaule douloureuse (coiffe, conflit)":[], "Rupture de la coiffe":[], "Capsulite rétractile":[], "Instabilité / luxation d’épaule":[], "Fracture de l’épaule (humérus, clavicule)":[],
  "Épicondylalgie (tennis elbow)":["tf_grip"], "Épitrochléite (golf elbow)":["tf_grip"], "Canal carpien":["tf_grip"], "Tendinite de De Quervain":["tf_grip"],
  "Rhizarthrose":["tf_grip"], "Douleur du poignet côté petit doigt (TFCC)":["tf_grip"], "Fracture du poignet":["tf_grip"], "Doigt (entorse, fracture, tendon)":["tf_grip"],
  "Coxarthrose":["tf_30sts", "tf_tug", "tf_6mwt"], "Tendinopathie du moyen fessier":["tf_sls", "tf_30sts"], "Conflit fémoro-acétabulaire":["tf_ybal"], "Pubalgie":["tf_ybal", "tf_ybalasym"],
  "Gonalgie":["tf_30sts"], "Gonarthrose":["tf_30sts", "tf_tug", "tf_6mwt"], "Syndrome fémoro-patellaire":["tf_ybal", "tf_5sts"],
  "Entorse du genou / LCA":["tf_ybal", "tf_hop", "tf_triplehop", "tf_quadlsi", "tf_ischiolsi"], "Entorse d’un ligament collatéral (LLI / LLE)":["tf_ybal", "tf_sls"],
  "Lésion méniscale":["tf_ybal", "tf_5sts"], "Tendinopathie rotulienne":["tf_ybal", "tf_hop", "tf_quadlsi"],
  "Entorse de cheville":["tf_sls", "tf_ybal", "tf_wblt"], "Tendinopathie d’Achille":["tf_wblt", "tf_sls"], "Fasciite / épine calcanéenne":["tf_wblt"],
  "Fracture de cheville ou du pied":["tf_wblt", "tf_sls", "tf_tug"],
  "Post-op : prothèse de hanche":["tf_tug", "tf_30sts", "tf_10mwt"], "Post-op : prothèse de genou":["tf_tug", "tf_30sts", "tf_10mwt"],
  "Post-op : ligamentoplastie du LCA":["tf_ybal", "tf_hop", "tf_triplehop", "tf_quadlsi", "tf_ischiolsi"], "Post-op : épaule (coiffe, stabilisation)":[], "Post-op : rachis":["tf_tug", "tf_6mwt"],
  "Post-op : main, poignet":["tf_grip"], "Post-op : cheville, pied":["tf_wblt", "tf_sls", "tf_tug"],
  "AVC / hémiplégie":["tf_10mwt", "tf_tug", "tf_berg", "tf_6mwt"], "Maladie de Parkinson":["tf_tug", "tf_10mwt", "tf_minibest", "tf_5sts"],
  "Sclérose en plaques":["tf_10mwt", "tf_6mwt", "tf_berg"], "SLA (maladie de Charcot)":["tf_10mwt", "tf_tug", "tf_grip"],
  "Charcot-Marie-Tooth / neuropathie":["tf_10mwt", "tf_sls", "tf_berg"], "Paralysie faciale":[],
  "Vertiges":["tf_dgi", "tf_sls"], "VPPB (vertige positionnel)":["tf_dgi"], "Déficit vestibulaire (névrite…)":["tf_dgi", "tf_minibest", "tf_sls"],
  "Trouble de l’équilibre":["tf_tug", "tf_berg", "tf_sls", "tf_minibest"], "Chutes / personne âgée":["tf_tug", "tf_30sts", "tf_sls", "tf_10mwt"],
  "Ostéoporose":["tf_tug", "tf_30sts", "tf_sls"],
  "Respiratoire":["tf_6mwt", "tf_30sts"], "BPCO / réhabilitation respiratoire":["tf_6mwt", "tf_30sts"], "Encombrement bronchique":[], "Respiratoire après une opération":["tf_30sts"],
  "Douleur thoracique":[], "Remise en forme / reconditionnement":["tf_6mwt", "tf_30sts"],
  "Mâchoire (ATM)":[], "Lymphœdème / après cancer du sein":["tf_grip"], "Douleur chronique / fibromyalgie":["tf_6mwt", "tf_30sts"],
  "Périnée / post-partum":[], "Enfant (développement moteur)":[]
};

/** Tests fonctionnels recommandés pour un bilan : motifs cochés + zones douloureuses. Renvoie un Set d'id (dans l'ordre d'utilité). */
export function tfRecommandes(S){
  const choisis = S?.c?.patho || [];
  const precis = choisis.filter(m => TF_MOTIF[m]);
  const out = new Set(precis.flatMap(m => TF_MOTIF[m]));
  /* Motifs généraux (et motifs précis non listés) : règles par motif parent */
  const motifs = new Set(eff(choisis.filter(m => !TF_MOTIF[m])));
  const zones = Object.keys(S?.pain || {}).map(z => z.replace(/ [DG]$/, ""));
  for(const [id, t] of Object.entries(TF_TAGS)){
    const parMotif = t.m.some(m => motifs.has(m));
    const parZone = !!t.z && zones.some(z => t.z.test(z));
    /* Test lié à une zone (hop, Y-balance…) : motif + zone concernée (ou aucune zone notée).
       Fente en charge et préhension : la zone douloureuse suffit. */
    if(!t.z ? parMotif : (parMotif && (parZone || !zones.length)) || (parZone && t.zoneSeule)) out.add(id);
  }
  return out;
}

/** Catalogue complet, pour la page Tests. */
export function catalogue(K){
  const list = [];
  for(const [rk, r] of Object.entries(K.REG || {})){
    for(const [nom, hyps, lrp, lrm, src, prec] of r.T || []){
      list.push({
        kind:"clinique", nom, region:r.n, regionKey:rk,
        hyp: hyps.map(h => r.H[h] || h),
        specs:[...new Set(hyps.flatMap(h => SPEC_HYP[h] || []))],
        lrp, lrm, prec, src: K.SRC?.[src] || "", g: K.GUIDE?.[nom] || {}
      });
    }
  }
  for(const [id, nom, unite, mid] of K.TF || []){
    const t = TF_TAGS[id] || { m:[], s:[] };
    list.push({ kind:"fonctionnel", id, nom, unite, mid, region:"Fonction", specs:t.s, motifs:t.m, g: K.GUIDE_TF?.[nom] || {} });
  }
  return list;
}

/* ---------- Fiche d'un test, avec la vidéo dans la fiche ---------- */

function videoBlock(url, nom){
  const yt = youtubeId(url);
  if(yt) return `<div class="tc-video"><iframe src="https://www.youtube-nocookie.com/embed/${yt}?rel=0" title="Vidéo : ${esc(nom)}" loading="lazy" allow="accelerometer; encrypted-media; gyroscope; picture-in-picture; fullscreen" allowfullscreen></iframe></div>`;
  return "";
}
const CSS = `.tc-video{ position:relative; aspect-ratio:16/9; margin:4px 0 14px; border-radius:var(--r-md); overflow:hidden; background:#000; }
.tc-video iframe{ position:absolute; inset:0; width:100%; height:100%; border:0; }`;
let cssOk = false;
const css = () => { if(cssOk) return; cssOk = true; const s = document.createElement("style"); s.textContent = CSS; document.head.append(s); };

/** Ouvre la fiche d'un test (kind = "clinique" ou "fonctionnel"). */
export function ficheTest(K, nom, kind){
  css();
  const fonctionnel = kind === "fonctionnel" || (!K.GUIDE?.[nom] && K.GUIDE_TF?.[nom]);
  const g = (fonctionnel ? K.GUIDE_TF : K.GUIDE)?.[nom] || {};
  const yt = youtubeId(g.v);
  const recherche = "https://www.youtube.com/results?search_query=" + encodeURIComponent(nom + (fonctionnel ? " test" : " test kinésithérapie"));
  const lien = g.v || recherche;
  const body = fonctionnel ? `
      ${videoBlock(g.v, nom)}
      ${g.t ? `<p><strong>Protocole</strong><br>${esc(g.t)}</p>` : ""}
      ${g.n ? `<p><strong>Normes et seuils</strong><br>${esc(g.n)}</p>` : ""}
      ${g.src ? `<p class="hint">Références : ${esc(g.src)}</p>` : ""}
      <p class="hint">Valeurs de la littérature, à interpréter selon la population et le protocole utilisé.</p>` : `
      ${videoBlock(g.v, nom)}
      ${g.t ? `<p><strong>Technique</strong><br>${esc(g.t)}</p>` : `<p class="muted">Description à compléter dans bilan-kine/guide.js.</p>`}
      ${g.p ? `<p><strong>Positif si</strong><br>${esc(g.p)}</p>` : ""}
      ${g.i ? `<img src="/bilan-kine/${esc(g.i)}" alt="${esc(nom)}">` : ""}
      <p class="hint">Résumé pédagogique, à confronter à la technique que vous pratiquez.</p>`;
  return openSheet({
    title: nom,
    body: `<div class="g-sheet">${body}</div>`,
    foot: `${yt ? `<a class="btn" href="${esc(lien)}" target="_blank" rel="noopener">${icon("video")}Ouvrir sur YouTube</a>` : `<a class="btn" href="${esc(lien)}" target="_blank" rel="noopener">${icon("video")}${g.v ? "Voir la vidéo" : "Chercher une vidéo"}</a>`}${g.r ? `<a class="btn" href="${esc(g.r)}" target="_blank" rel="noopener">${icon("link")}Fiche de référence</a>` : ""}<button class="btn primary" type="button" data-close>Fermer</button>`
  });
}

/* ---------- Questionnaires conseillés pour un bilan ---------- */
/* clé du modèle (assets/questionnaires.js) ← motifs du bilan et zones douloureuses */
const Q_MOTIFS = {
  "Lombalgie":["ODI", "STARTBACK", "TSK"], "Sciatique":["ODI", "STARTBACK"], "Dorsalgie":["STARTBACK"],
  "Cervicalgie":["NDI", "TSK"], "Gonalgie":["KOOS", "LEFS"], "Entorse":["LEFS"], "Post-opératoire":["LEFS"],
  [EQ]:["FESI", "ABC"], [CH]:["FESI", "ABC"], [NEU]:["ABC", "FESI"], [VE]:["DHI", "ABC"], [RE]:["MMRC", "CAT"],
  [SP]:["LEFS"], "Tendinopathie":[], "Fracture":[]
};
const Q_ZONES = [
  [/^(Lombaires)$/, ["ODI", "STARTBACK"]], [/^(Cervicales|Cou)$/, ["NDI"]],
  [/^Épaule$/, ["QDASH", "SPADI"]], [/^(Bras|Avant-bras|Main)$/, ["QDASH"]],
  [/^(Genou|Creux)/, ["KOOS", "LEFS"]], [/^(Hanche|Fessier|Cuisse|Jambe|Mollet|Pied|Talon)/, ["LEFS"]]
];
/** Clés des questionnaires conseillés, dans l'ordre de pertinence. */
export function questionnairesConseilles(S){
  const out = [];
  const add = l => l.forEach(k => { if(!out.includes(k)) out.push(k); });
  const motifs = eff(S?.c?.patho);
  const zones = Object.keys(S?.pain || {}).map(z => z.replace(/ [DG]$/, ""));
  zones.forEach(z => Q_ZONES.forEach(([re, l]) => { if(re.test(z)) add(l); }));
  motifs.forEach(m => add(Q_MOTIFS[m] || []));
  /* Retour au sport après LCA : genou + reprise du sport */
  if(motifs.includes(SP) && zones.some(z => /^(Genou|Creux)/.test(z))) add(["ACLRSI"]);
  /* Douleur qui dure : facteurs psychosociaux */
  if(motifs.some(m => ["Lombalgie", "Cervicalgie", "Sciatique"].includes(m))) add(["PCS"]);
  return out;
}

/* ---------- Symétrie gauche / droite (LSI) ---------- */

/** Le test se calcule-t-il en symétrie (LSI) ? */
export const estLSI = nom => /\(LSI\)/.test(String(nom || ""));

/**
 * Calculette LSI : jusqu'à 3 essais par côté → moyenne côté atteint ÷ moyenne côté sain × 100.
 * onOk(valeur arrondie) remplit le champ du bilan.
 */
export function calculLSI(nom, onOk){
  const essai = (c, i) => `<input class="input" inputmode="decimal" data-c="${c}" data-i="${i}" aria-label="${c === "a" ? "Côté atteint" : "Côté sain"}, essai ${i + 1}" placeholder="Essai ${i + 1}" style="text-align:center">`;
  const s = openSheet({ title: "Calculer la symétrie (LSI)",
    body: `<p class="small muted" style="margin-top:0">${esc(nom)} : notez 1 à 3 essais de chaque côté (distance, temps ou force, même unité des deux côtés).</p>
      <div style="display:grid;grid-template-columns:auto repeat(3,minmax(0,1fr));gap:8px;align-items:center">
        <strong>Atteint</strong>${[0, 1, 2].map(i => essai("a", i)).join("")}
        <strong>Sain</strong>${[0, 1, 2].map(i => essai("s", i)).join("")}
      </div>
      <div id="lsi-out" class="notice" style="margin-top:14px">${icon("info")}<span>Remplissez au moins un essai de chaque côté.</span></div>`,
    foot: `<button class="btn" type="button" data-close>Annuler</button><button class="btn primary" type="button" data-ok disabled>${icon("check")}Reporter dans le bilan</button>` });
  let lsi = null;
  const moy = c => { const v = [...s.el.querySelectorAll(`[data-c="${c}"]`)].map(x => parseFloat(x.value.replace(",", "."))).filter(x => !isNaN(x) && x > 0); return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null; };
  s.el.addEventListener("input", () => {
    const a = moy("a"), b = moy("s");
    const ok = s.el.querySelector("[data-ok]");
    if(a === null || b === null){ lsi = null; ok.disabled = true; return; }
    lsi = Math.round(a / b * 1000) / 10;
    const f = n => String(Math.round(n * 10) / 10).replace(".", ",");
    s.el.querySelector("#lsi-out").className = "notice " + (lsi >= 90 ? "" : "warn");
    s.el.querySelector("#lsi-out").innerHTML = `${icon(lsi >= 90 ? "checkCircle" : "alert")}<span>Moyenne atteint ${f(a)}, sain ${f(b)} : <strong>LSI ${f(lsi)} %</strong>${lsi >= 90 ? " (seuil de reprise du sport atteint)" : " (sous le seuil de 90 % habituel pour la reprise du sport)"}.</span>`;
    ok.disabled = false;
  });
  s.el.querySelector("[data-ok]").onclick = () => { if(lsi !== null){ onOk(lsi); s.close(); } };
}
