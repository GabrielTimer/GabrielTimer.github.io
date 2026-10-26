/* Ma progression (patient) */

import {
  $, esc, icon, params, readPatientContext, mountShell, registerSW, loadingHTML, emptyHTML, errorHTML,
  promptDialog, evaFace, fmtNum, evaTrend, fmtShortDate, startOfDay, byWeek, plural
} from "../app.js";
import { renderEvaChart } from "../chart.js";

const app = $("#app");
registerSW();
const ctx = readPatientContext();
if(!ctx.cle){ location.replace("/index.html"); }

mountShell({ role:"patient", active:"progression", apercu:ctx.apercu });
app.innerHTML = `<div class="page-head"><h1>Ma progression</h1></div>${loadingHTML()}`;

const P = await import("../patient.js");
let data;
try{ data = await P.loadPatient(ctx.cle); }
catch(err){ app.querySelector(".loading").outerHTML = errorHTML(err); throw err; }
if(!data){ location.replace("/index.html"); throw new Error("no patient"); }

const progs = data.programmes;
let current = progs.find(p => !p.termine) || progs[0];

function render(){
  if(!progs.length){
    app.innerHTML = `<div class="page-head"><h1>Ma progression</h1></div><div class="panel">${emptyHTML({ ico:"chart", title:"Rien à afficher pour l'instant", text:"Votre progression apparaîtra dès que votre kiné vous aura envoyé un programme et que vous aurez fait vos premières séances." })}</div>`;
    return;
  }
  const p = current;
  byWeek(p.seances);
  const reg = P.regularity(p.seances);
  const tr = evaTrend(p.evas);
  const R = 2 * Math.PI * 76;
  const valides = p.seances.filter(s => s.terminee && s.dateValidation).sort((a, b) => a.dateValidation - b.dateValidation);
  const points = valides.filter(s => s.eva !== null && s.eva !== undefined && s.eva !== "").map(s => ({ label:s.label || s.nom, v:Number(s.eva), date:fmtShortDate(s.dateValidation) }));

  /* Calendrier du programme */
  const dated = p.seances.filter(s => s.datePrevue);
  let cal = "";
  if(dated.length){
    const today = startOfDay(new Date());
    const first = startOfDay(dated[0].datePrevue);
    const last = startOfDay(dated[dated.length - 1].datePrevue);
    const start = new Date(first); start.setDate(first.getDate() - ((first.getDay() + 6) % 7));
    const cells = [];
    let month = -1;
    for(let d = new Date(start); d <= last || d.getDay() !== 1; d.setDate(d.getDate() + 1)){
      if(d.getDay() === 1 && d.getMonth() !== month){
        month = d.getMonth();
        const end = new Date(d); end.setDate(d.getDate() + 6);
        if(cells.length === 0 || end.getMonth() === month) cells.push(`<div class="m">${esc(d.toLocaleDateString("fr-FR", { month:"long", year:"numeric" }).replace(/^./, c => c.toUpperCase()))}</div>`);
      }
      const same = x => startOfDay(x).getTime() === d.getTime();
      const pl = dated.filter(s => same(s.datePrevue));
      let cls = "";
      if(d < first || d > last) cls = "out";
      else if(pl.length && pl.every(s => s.terminee)) cls = "done";
      else if(pl.length && d < today) cls = "missed";
      else if(pl.length) cls = "planned";
      if(d.getTime() === today.getTime()) cls += " today";
      cells.push(`<div class="d ${cls}" title="${esc(d.toLocaleDateString("fr-FR"))}">${d.getDate()}</div>`);
      if(cells.length > 400) break;
    }
    cal = `<div class="cal">${["L","M","M","J","V","S","D"].map(x => `<div class="h">${x}</div>`).join("")}${cells.join("")}</div>
      <div class="legend"><span><i style="background:var(--lagon)"></i>Faite</span><span><i style="box-shadow:inset 0 0 0 2px var(--lagon)"></i>Prévue</span><span><i style="box-shadow:inset 0 0 0 2px var(--danger)"></i>Manquée</span></div>`;
  }

  app.innerHTML = `
    <div class="page-head"><h1>Ma progression</h1></div>
    ${params.get("bravo") && p.termine ? `<div class="notice ok" style="margin-bottom:16px">${icon("starFill")}<span><strong>Félicitations !</strong> Vous avez terminé votre programme. Pensez à envoyer votre bilan à votre kiné.</span></div>` : ""}
    ${progs.length > 1 ? `<div class="field" style="margin-bottom:16px"><label for="sel">Programme</label><select class="select" id="sel">${progs.map(x => `<option value="${esc(x.id)}" ${x.id === p.id ? "selected" : ""}>${esc(x.nom)}${x.termine ? " (terminé)" : ""}</option>`).join("")}</select></div>` : ""}

    <section class="panel raised pg-top">
      <div class="ring-big" role="img" aria-label="${p.pct} % du programme réalisé">
        <svg viewBox="0 0 180 180"><circle class="bg" cx="90" cy="90" r="76"/><circle class="fg" id="arc" cx="90" cy="90" r="76" stroke-dasharray="${R}" stroke-dashoffset="${R}"/></svg>
        <div class="in"><span class="pct">${p.pct}<span style="font-size:.5em">%</span></span><span class="lab">${p.faites} sur ${p.total} séances</span></div>
      </div>
      <div class="stack" style="--gap:14px">
        <h2 style="font-size:var(--fs-xl)">${esc(p.nom)}</h2>
        <div class="kpis" style="grid-template-columns:repeat(2,minmax(0,1fr))">
          <div class="kpi"><span class="k-val">${reg === null ? "–" : reg + "<span style='font-size:.6em'>%</span>"}</span><span class="k-lab">de régularité</span></div>
          <div class="kpi"><span class="k-val">${p.total - p.faites}</span><span class="k-lab">${p.total - p.faites > 1 ? "séances restantes" : "séance restante"}</span></div>
        </div>
      </div>
    </section>

    ${tr ? `
    <section class="panel section">
      <div class="panel-head"><h2 style="font-size:var(--fs-lg)">Votre douleur</h2></div>
      <div class="compare">
        <div class="c-box"><img src="${evaFace(tr.debut)}" alt=""><div><div class="c-lab">Au début</div><div class="c-val">${fmtNum(tr.debut)}</div></div></div>
        <span class="arrow">${icon("chevron")}</span>
        <div class="c-box"><img src="${evaFace(tr.fin)}" alt=""><div><div class="c-lab">Récemment</div><div class="c-val">${fmtNum(tr.fin)}</div></div></div>
      </div>
      <p style="margin-top:12px">${tr.dir === "down" ? `Votre douleur a baissé de <strong>${fmtNum(Math.abs(tr.delta))} point${Math.abs(tr.delta) >= 2 ? "s" : ""}</strong>. Continuez ainsi.` : tr.dir === "up" ? `Votre douleur a augmenté. Parlez-en à votre kiné, il pourra adapter vos exercices.` : "Votre douleur est stable."}</p>
    </section>` : ""}

    <section class="panel section">
      <div class="panel-head"><h2 style="font-size:var(--fs-lg)">Douleur après chaque séance</h2></div>
      <div id="chart"></div>
    </section>

    ${cal ? `<section class="panel section"><div class="panel-head"><h2 style="font-size:var(--fs-lg)">Calendrier</h2></div>${cal}</section>` : ""}

    <section class="section">
      <button class="btn ${p.termine ? "primary" : ""} big block" type="button" id="bilan">${icon("mail")}${p.termine ? "Envoyer mon bilan à mon kiné" : "Envoyer un point d'étape à mon kiné"}</button>
    </section>`;

  renderEvaChart($("#chart"), points);
  requestAnimationFrame(() => setTimeout(() => { const a = $("#arc"); if(a) a.style.strokeDashoffset = R * (1 - p.pct / 100); }, 60));
  $("#sel")?.addEventListener("change", e => { current = progs.find(x => x.id === e.target.value); render(); });
  $("#bilan").onclick = async () => {
    const rem = await promptDialog({ title:"Envoyer mon bilan", label:"Un mot pour votre kiné ? (facultatif)", multiline:true, confirm:"Préparer l'e-mail" });
    if(rem !== null) P.bilanMail({ patientNom:data.patient.nom, programme:p, remarques:rem });
  };
}
render();
