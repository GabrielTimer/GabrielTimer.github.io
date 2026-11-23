/* « Mes résultats » (page Statistiques du cabinet, en bas) : ce que gagnent les patients, par pathologie.
   Pour chaque patient : premier et dernier bilan (douleur), premier et dernier questionnaire,
   première et dernière note des objectifs. Un patient « progresse vraiment » quand le changement
   dépasse la différence qui compte (MCID) : 2 points de douleur ou d'objectif, seuil propre à chaque questionnaire. */

import { esc, icon, fmtNum } from "./app.js";
import { verdictEcart, fmtScore } from "./questionnaires.js";

const DAY = 864e5;
const isoMs = d => { const t = Date.parse(d); return isNaN(t) ? 0 : t; };
const pct = (a, n) => n ? Math.round(a / n * 100) : null;
const moy = v => v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;

/** Douleur la plus forte notée sur le schéma du bilan (0 à 10), ou l'EVN générale. */
function evaBilan(b){
  const S = b.etat || {};
  const v = Object.values(S.pain || {}).map(p => Number(p?.eva)).filter(x => !isNaN(x));
  if(v.length) return Math.max(...v);
  const n = parseFloat(String(S.f?.m_nprs ?? "").replace(",", "."));
  return isNaN(n) ? null : n;
}

function motifDe(bilans){
  const b = bilans[0];
  if(!b) return "Sans bilan";
  const m = b.etat?.c?.patho?.[0];
  if(m) return String(m);
  const z = (b.zones || Object.keys(b.etat?.pain || {}))[0];
  return z ? String(z).replace(/ [DG]$/, "") : "Motif non précisé";
}

/** Calcule une ligne par patient (patients avec au moins une mesure avant / après). */
export function calculer({ patients, suivis, questionnaires, bilans, depuis = 0 }){
  const qDef = id => questionnaires.find(q => q.id === id);
  const lignes = [];
  patients.forEach(p => {
    const bl = bilans.filter(b => b.cle === p.cle).sort((a, b) => isoMs(a.date) - isoMs(b.date) || (a.createdAt || 0) - (b.createdAt || 0));
    const sv = suivis.filter(s => s.cle === p.cle).sort((a, b) => a.date - b.date);
    const debut = Math.min(...[isoMs(bl[0]?.date), sv[0]?.date].filter(Boolean), Infinity);
    if(depuis && (!isFinite(debut) || debut < depuis)) return;
    const L = { cle: p.cle, nom: p.nom || "", motif: motifDe(bl), eva: null, q: [], obj: null };
    /* Douleur : premier bilan → dernier bilan */
    const ev = bl.map(evaBilan).filter(x => x !== null);
    if(bl.length >= 2 && ev.length >= 2) L.eva = { a: ev[0], b: ev[ev.length - 1] };
    /* Questionnaires : premier → dernier score de chacun */
    const parQ = {};
    sv.filter(s => s.type === "questionnaire" && typeof s.score === "number").forEach(s => (parQ[s.qid] = parQ[s.qid] || []).push(s));
    Object.entries(parQ).forEach(([qid, r]) => {
      if(r.length < 2) return;
      const q = qDef(qid) || { id: qid, nom: r[0].nom || "Questionnaire", sens: "bas" };
      const d = Math.round((r[r.length - 1].score - r[0].score) * 10) / 10;
      L.q.push({ q, a: r[0].score, b: r[r.length - 1].score, d, v: verdictEcart(q, d) });
    });
    /* Objectifs (0 à 10) : moyenne des objectifs, premier → dernier point */
    const ob = sv.filter(s => s.type === "objectifs" && s.notes);
    if(ob.length >= 2){
      const m = o => moy(Object.values(o.notes).map(Number).filter(x => !isNaN(x)));
      const a = m(ob[0]), b = m(ob[ob.length - 1]);
      if(a !== null && b !== null) L.obj = { a, b };
    }
    if(L.eva || L.q.length || L.obj) lignes.push(L);
  });
  return lignes;
}

/** Regroupe par motif : nombre de patients, part qui progresse vraiment pour chaque mesure. */
export function parMotif(lignes){
  const g = {};
  lignes.forEach(L => (g[L.motif] = g[L.motif] || []).push(L));
  return Object.entries(g).map(([motif, L]) => {
    const eva = L.filter(x => x.eva), q = L.filter(x => x.q.some(y => y.v === "mieux" || y.v === "moins" || y.v === "stable")), ob = L.filter(x => x.obj);
    return {
      motif, n: L.length, lignes: L,
      eva: eva.length ? { n: eva.length, d: moy(eva.map(x => x.eva.b - x.eva.a)), ok: pct(eva.filter(x => x.eva.a - x.eva.b >= 2).length, eva.length) } : null,
      q: q.length ? { n: q.length, ok: pct(q.filter(x => x.q.some(y => y.v === "mieux")).length, q.length) } : null,
      obj: ob.length ? { n: ob.length, d: moy(ob.map(x => x.obj.b - x.obj.a)), ok: pct(ob.filter(x => x.obj.b - x.obj.a >= 2).length, ob.length) } : null
    };
  }).sort((a, b) => b.n - a.n || a.motif.localeCompare(b.motif, "fr"));
}

/** Par questionnaire : gain moyen et répartition mieux / stable / moins. */
export function parQuestionnaire(lignes){
  const g = {};
  lignes.forEach(L => L.q.forEach(x => (g[x.q.id] = g[x.q.id] || { q: x.q, r: [] }).r.push(x)));
  return Object.values(g).map(({ q, r }) => ({
    q, n: r.length, a: moy(r.map(x => x.a)), b: moy(r.map(x => x.b)),
    mieux: pct(r.filter(x => x.v === "mieux").length, r.length), stable: pct(r.filter(x => x.v === "stable").length, r.length),
    moins: pct(r.filter(x => x.v === "moins").length, r.length), seuil: r.some(x => x.v === "mieux" || x.v === "moins" || x.v === "stable")
  })).sort((a, b) => b.n - a.n);
}

const barre = v => v === null ? "–" : `<span class="meter"><i style="width:${v}%"></i></span>${v} %`;
const signe = d => d === null ? "–" : `${d > 0 ? "+" : ""}${fmtNum(Math.round(d * 10) / 10)}`;

/** Affiche la section dans `box` (avec le choix de période). */
export function monter(box, data){
  let periode = "12";
  const draw = () => {
    const depuis = periode === "12" ? Date.now() - 365 * DAY : 0;
    const lignes = calculer({ ...data, depuis });
    const M = parMotif(lignes), Q = parQuestionnaire(lignes);
    box.innerHTML = `<section class="panel section" id="resultats">
      <div class="panel-head"><h2 style="font-size:var(--fs-lg)">${icon("target", "ic-inline lagon")} Mes résultats par pathologie</h2>
        <div class="chips"><button type="button" class="chip" data-per="12" aria-pressed="${periode === "12"}">12 derniers mois</button><button type="button" class="chip" data-per="tout" aria-pressed="${periode === "tout"}">Tout</button></div></div>
      <p class="small muted">Part des patients qui progressent vraiment : douleur en baisse d'au moins 2 points entre le premier et le dernier bilan, questionnaire amélioré d'au moins la différence qui compte, objectifs en hausse d'au moins 2 points. Seuls les patients mesurés au moins deux fois comptent.</p>
      ${M.length ? `<div style="overflow-x:auto"><table class="tbl"><thead><tr><th>Motif (1er bilan)</th><th class="n">Patients</th><th class="n">Douleur</th><th class="n">Questionnaires</th><th class="n">Objectifs</th></tr></thead><tbody>
        ${M.map((r, i) => `<tr><td><button class="btn sm ghost" type="button" data-motif="${i}" style="padding:0;min-height:0;font-weight:800;text-align:left">${esc(r.motif)}</button></td><td class="n">${r.n}</td>
          <td class="n">${r.eva ? `${barre(r.eva.ok)}<br><span class="small muted">${signe(r.eva.d)} pt en moyenne (${r.eva.n})</span>` : "–"}</td>
          <td class="n">${r.q ? `${barre(r.q.ok)}<br><span class="small muted">${r.q.n} patient${r.q.n > 1 ? "s" : ""}</span>` : "–"}</td>
          <td class="n">${r.obj ? `${barre(r.obj.ok)}<br><span class="small muted">${signe(r.obj.d)} pt en moyenne (${r.obj.n})</span>` : "–"}</td></tr>`).join("")}
      </tbody></table></div>` : `<p class="muted small">Pas encore assez de mesures : il faut au moins deux bilans, deux questionnaires ou deux points sur les objectifs pour un même patient.</p>`}
      ${Q.length ? `<h3 style="margin:18px 0 8px;font-size:var(--fs-md)">Par questionnaire</h3>
        <div style="overflow-x:auto"><table class="tbl"><thead><tr><th>Questionnaire</th><th class="n">Patients</th><th class="n">Avant → après</th><th class="n">Progrès net</th><th class="n">Stable</th><th class="n">En baisse</th></tr></thead><tbody>
        ${Q.map(r => `<tr><td><strong>${esc(r.q.nom)}</strong></td><td class="n">${r.n}</td><td class="n">${esc(fmtScore(r.a, r.q))} → ${esc(fmtScore(r.b, r.q))}</td>
          ${r.seuil ? `<td class="n">${barre(r.mieux)}</td><td class="n">${r.stable} %</td><td class="n">${r.moins} %</td>` : `<td class="n" colspan="3"><span class="small muted">pas de différence qui compte connue pour ce questionnaire</span></td>`}</tr>`).join("")}
        </tbody></table></div>` : ""}
      <div id="res-detail"></div>
      <div class="notice" style="margin-top:14px">${icon("info")}<span class="small">À lire avec prudence : petits nombres, patients qui ne remplissent pas tous les questionnaires, pas de groupe témoin. Utile surtout pour repérer ce qui marche le mieux chez vous et ce qui mérite d'être revu.</span></div>
    </section>`;
    box.querySelectorAll("[data-per]").forEach(b => b.onclick = () => { periode = b.dataset.per; draw(); });
    box.querySelectorAll("[data-motif]").forEach(b => b.onclick = () => {
      const r = M[Number(b.dataset.motif)];
      box.querySelector("#res-detail").innerHTML = `<h3 style="margin:18px 0 8px;font-size:var(--fs-md)">${esc(r.motif)} : détail par patient</h3>
        <div style="overflow-x:auto"><table class="tbl"><thead><tr><th>Patient</th><th class="n">Douleur</th><th>Questionnaires</th><th class="n">Objectifs</th></tr></thead><tbody>
        ${r.lignes.map(L => `<tr><td><a href="/cloud.html?patient=${encodeURIComponent(L.cle)}">${esc(L.nom || "Patient")}</a></td>
          <td class="n">${L.eva ? `${fmtNum(L.eva.a)} → ${fmtNum(L.eva.b)}` : "–"}</td>
          <td class="small">${L.q.map(x => `${esc(x.q.nom)} : ${esc(fmtScore(x.a, x.q))} → ${esc(fmtScore(x.b, x.q))}${x.v === "mieux" ? " ✓" : ""}`).join("<br>") || "–"}</td>
          <td class="n">${L.obj ? `${fmtNum(Math.round(L.obj.a * 10) / 10)} → ${fmtNum(Math.round(L.obj.b * 10) / 10)}` : "–"}</td></tr>`).join("")}
        </tbody></table></div>`;
      box.querySelector("#res-detail").scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };
  draw();
}
