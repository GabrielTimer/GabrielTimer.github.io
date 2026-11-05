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
  tf_wblt:      { m:[EN, TE], z:ZC, zoneSeule:true, s:["Traumatologie", "Sport", "Rhumatologie"] },
  tf_grip:      { m:[CH, FR], z:ZM, zoneSeule:true, s:["Gériatrie et chutes", "Rhumatologie", "Traumatologie"] }
};
/* Hypothèses des tests cliniques → spécialités */
const SPEC_HYP = {
  LCA:["Traumatologie", "Sport", "Orthopédie"], MEN:["Traumatologie", "Sport"], SFP:["Rhumatologie", "Sport"], OA:["Rhumatologie"],
  RCD:["Rhumatologie"], TF:["Rhumatologie", "Orthopédie"], SSC:["Rhumatologie", "Orthopédie"], SA:["Rhumatologie"], INS:["Traumatologie", "Sport"],
  RAD:["Rhumatologie"], STE:["Rhumatologie", "Gériatrie et chutes"], CEF:["Rhumatologie"], ATFL:["Traumatologie", "Sport"], ACH:["Rhumatologie", "Sport"]
};

/** Tests fonctionnels recommandés pour un bilan : motifs cochés + zones douloureuses. Renvoie un Set d'id. */
export function tfRecommandes(S){
  const motifs = new Set(S?.c?.patho || []);
  const zones = Object.keys(S?.pain || {}).map(z => z.replace(/ [DG]$/, ""));
  const out = new Set();
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
