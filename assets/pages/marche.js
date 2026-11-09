/* Ma marche du jour : ce que le patient fait aujourd'hui, encouragement, conseils.
   Il marche sans l'application, puis valide au retour (fin.html?marche=1).
   Le minuteur reste possible pour le fractionné. */

import { $, esc, icon, params, getRunProgram } from "../app.js";
import { variante } from "../variantes.js";
import * as MS from "../mode-seance.js";
import { NIVEAUX, AVANT, CONSEILS, exoDe, planDuJour, choisir } from "../marche.js";

if(MS.actif()) MS.demarrer();
const app = $("#app");
const prog = getRunProgram() || { nom:"Marche", exercices:[] };
const exo = exoDe(prog);
const cle = params.get("cle"), sid = params.get("s"), apercu = params.get("apercu") === "1";
const num = Number(params.get("n")) || Math.floor(Date.now() / 86400000);
const niv = Number(params.get("niveau")) || Number(String(prog.nom || "").match(/niveau\s*(\d+)/i)?.[1]) || 0;
const N = NIVEAUX.find(x => x.n === niv) || null;

const q = new URLSearchParams();
if(cle && sid){ q.set("cle", cle); q.set("s", sid); }
if(apercu) q.set("apercu", "1");

if(!exo){
  app.innerHTML = `<div class="notice warn">${icon("alert")}<span>Cette séance n'est pas une marche.</span></div><a class="btn" href="/index.html">${icon("back")}Retour</a>`;
}else{
  const plan = planDuJour(exo, prog.series);
  const img = (() => { try{ return variante(exo.image) || exo.image; }catch(e){ return exo.image; } })();
  const message = exo.conseil_kine || N?.message || "";
  app.innerHTML = `
    <div class="mar-top"><button class="btn ghost" type="button" id="back">${icon("back")}Retour</button></div>
    ${apercu ? `<div class="notice warn">${icon("eye")}<span>Aperçu : rien ne sera enregistré dans le dossier du patient.</span></div>` : ""}

    <section class="mar-hero">
      ${img ? `<img src="${esc(img)}" alt="">` : ""}
      <div>
        <div class="lv">${N ? `Niveau ${N.n} sur ${NIVEAUX.length}` : "Ma marche du jour"}</div>
        <h1>${esc(N?.titre || "Ma marche du jour")}</h1>
        <div class="mar-plan">${esc(plan.texte.charAt(0).toUpperCase() + plan.texte.slice(1))}.<small>Soit ${plan.total} minute${plan.total > 1 ? "s" : ""} de marche en tout.</small></div>
      </div>
    </section>

    ${message ? `<p class="mar-msg">${esc(message)}</p>` : ""}
    <div class="mar-boost">${icon("heart")}<span>${esc(choisir(AVANT, num))}</span></div>

    <section class="panel">
      <h2>${icon("checkCircle")}Avant de partir</h2>
      <ul class="mar-list">${CONSEILS.avant.map(c => `<li>${esc(c)}</li>`).join("")}</ul>
      ${N?.astuce ? `<p class="mar-astuce" style="margin:10px 0 0;display:flex;gap:8px;align-items:flex-start">${icon("sparkle")}<span>${esc(N.astuce)}</span></p>` : ""}
    </section>

    <section class="panel">
      <h2>${icon("info")}Pendant la marche</h2>
      <ul class="mar-list">${CONSEILS.pendant.map(c => `<li>${esc(c)}</li>`).join("")}</ul>
    </section>

    <section class="mar-stop">
      <h2>${icon("alert")}Arrêtez-vous et appelez le 15 si</h2>
      <ul class="mar-list">${CONSEILS.stop.map(c => `<li>${esc(c)}</li>`).join("")}</ul>
    </section>

    <p class="mar-astuce">${esc(CONSEILS.sansEnvie)}</p>

    <div class="mar-actions">
      <a class="btn primary big block" href="/fin.html?${q.toString()}&marche=1">${icon("check")}Je suis rentré : je valide ma marche</a>
      <a class="btn block" href="/timer.html?${q.toString()}">${icon("clock")}Marcher avec le minuteur${exo.reps > 1 ? " (marche et pauses)" : ""}</a>
      <p class="center small faint" style="margin:0">Le minuteur est facultatif : vous pouvez laisser le téléphone dans la poche et valider au retour.</p>
    </div>`;
  $("#back").onclick = () => { if(history.length > 1) history.back(); else location.href = "/index.html"; };
}
