/* Fin de séance : ressenti, douleur, message au kiné */

import {
  $, $$, esc, icon, params, getRunProgram, fmtDuree, plural, EVA_LABELS, evaFace, RESSENTIS,
  localProgs, toast, vibrate, session, KINE, prenom, store
} from "../app.js";

const app = $("#app");
const prog = getRunProgram() || { nom:"Séance", exercices:[] };
const cle = params.get("cle");
const sid = params.get("s");
const apercu = params.get("apercu") === "1";
const from = params.get("from");
const duree = Number(params.get("duree")) || 0;
const cloud = !!(cle && sid);
const messages = ["Excellent travail.", "Très belle séance.", "Chaque séance compte.", "Bravo pour votre régularité."];

let eva = null;
let ressenti = null;

app.innerHTML = `
  <header class="fin-head">
    <div class="medal">${icon("check")}</div>
    <h1>Séance terminée</h1>
    <p class="muted">${esc(messages[Math.floor(Math.random() * messages.length)])}</p>
    <div class="fin-stats">
      ${duree ? `<span class="badge lagon">${icon("clock")}${esc(fmtDuree(duree))}</span>` : ""}
      <span class="badge lagon">${icon("dumbbell")}${plural((prog.exercices || []).length, "exercice")}</span>
      ${Number(prog.series) > 1 ? `<span class="badge lagon">${icon("repeat")}${plural(Number(prog.series), "tour")}</span>` : ""}
    </div>
  </header>

  ${apercu ? `<div class="notice warn">${icon("eye")}<span>Aperçu : rien ne sera enregistré dans le dossier du patient.</span></div>` : ""}

  <section class="panel raised">
    <div class="q-title" id="eva-q">Quelle est votre douleur maintenant ?</div>
    <p class="q-sub">De 0 (aucune douleur) à 10 (douleur maximale imaginable).</p>
    <div class="eva-top">
      <img class="eva-face" id="face" src="/images/eva/0.png" alt="">
      <div>
        <div class="eva-val" id="val">?<small>/10</small></div>
        <div class="eva-lab" id="lab">Déplacez le curseur</div>
      </div>
    </div>
    <input class="eva-range untouched" id="range" type="range" min="0" max="10" step="1" value="0" aria-labelledby="eva-q" aria-valuetext="non renseigné">
    <div class="eva-scale" aria-hidden="true"><span>0</span><span>5</span><span>10</span></div>
    <div class="eva-steps">
      <button class="btn sm" type="button" id="minus" aria-label="Diminuer">${icon("minus")}</button>
      <button class="btn sm" type="button" id="plus" aria-label="Augmenter">${icon("plus")}</button>
    </div>
  </section>

  <section class="panel">
    <div class="q-title">Et la séance, c'était…</div>
    <p class="q-sub">Pour aider votre kiné à ajuster le programme.</p>
    <div class="chips ressenti" role="group" aria-label="Difficulté de la séance">
      ${RESSENTIS.map(r => `<button class="chip" type="button" aria-pressed="false" data-r="${r.id}">${esc(r.label)}</button>`).join("")}
    </div>
  </section>

  ${cloud ? `
  <section class="panel" id="msg-box" hidden>
    <label class="q-title" for="msg" style="display:block">Un message pour ${esc(prenom(KINE.nom))} ?</label>
    <p class="q-sub">Facultatif : une gêne, une question, un exercice difficile…</p>
    <textarea class="textarea" id="msg" maxlength="1000" placeholder="Votre message"></textarea>
  </section>` : ""}

  <button class="btn primary big block" type="button" id="save" disabled>${icon("check")}Enregistrer ma séance</button>
  <p class="center small faint" id="save-hint">Indiquez votre douleur pour enregistrer.</p>
`;

/* Le message au kiné n'est proposé qu'à la dernière séance d'un programme */
if(cloud){
  import("../cloud.js").then(C => C.listSeances(cle)).then(seances => {
    const s = seances.find(x => x.id === sid);
    if(!s || !s.programmeId) return;
    const autres = seances.filter(x => x.programmeId === s.programmeId && x.id !== sid);
    if(autres.every(x => x.terminee === true)) $("#msg-box").hidden = false;
  }).catch(() => {});
}

const range = $("#range"), face = $("#face"), val = $("#val"), lab = $("#lab"), save = $("#save");
const preload = [0,1,2,3,4,5].map(i => { const im = new Image(); im.src = `/images/eva/${i}.png`; return im; });

function setEva(v){
  v = Math.max(0, Math.min(10, Math.round(v)));
  const first = eva === null;
  eva = v;
  range.value = v;
  range.classList.remove("untouched");
  range.setAttribute("aria-valuetext", `${v} sur 10, ${EVA_LABELS[v]}`);
  face.src = evaFace(v);
  val.innerHTML = `${v}<small>/10</small>`;
  lab.textContent = EVA_LABELS[v];
  if(first){
    save.disabled = false;
    $("#save-hint").textContent = "";
    vibrate(30);
  }
}
range.addEventListener("input", () => setEva(Number(range.value)));
range.addEventListener("pointerdown", () => { if(eva === null) setEva(Number(range.value)); });
$("#minus").onclick = () => setEva(eva === null ? 0 : eva - 1);
$("#plus").onclick = () => setEva(eva === null ? 1 : eva + 1);

$$("[data-r]").forEach(b => b.addEventListener("click", () => {
  ressenti = ressenti === b.dataset.r ? null : b.dataset.r;
  $$("[data-r]").forEach(x => x.setAttribute("aria-pressed", String(x.dataset.r === ressenti)));
}));

const withTimeout = (p, ms) => Promise.race([p, new Promise(r => setTimeout(() => r("timeout"), ms))]);

save.addEventListener("click", async () => {
  if(eva === null) return;
  save.disabled = true;
  save.innerHTML = `<span class="spinner" style="border-top-color:currentColor"></span>Enregistrement…`;
  const commentaire = $("#msg")?.value.trim() || null;

  localProgs.add({
    type:"historique",
    patientId: cle || "admin",
    nom: prog.nom || "Séance",
    date: new Date().toLocaleString("fr-FR"),
    dateISO: new Date().toISOString(),
    categorie: prog.categorie || "kine",
    ressenti,
    data: { ...prog, eva }
  });

  let programmeTermine = false;
  let offline = false;
  if(cloud && !apercu){
    try{
      const C = await import("../cloud.js");
      const r = await withTimeout(C.validateSeance(cle, sid, { eva, ressenti, commentaire, dureeReelle:duree || null }), 8000);
      if(r === "timeout") offline = true; else programmeTermine = r.programmeTermine;
    }catch(err){
      console.error(err);
      save.disabled = false;
      save.innerHTML = `${icon("check")}Réessayer`;
      toast(navigator.onLine ? "L'enregistrement n'a pas abouti. Réessayez." : "Pas de connexion. Réessayez une fois connecté.", { type:"err" });
      return;
    }
  }
  session.del("gt_run_ctx");
  done({ programmeTermine, offline });
});

function done({ programmeTermine, offline }){
  if(programmeTermine) confetti();
  const next = programmeTermine ? "/progression.html?bravo=1"
    : from === "config" ? "/config.html"
    : from === "favoris" ? "/mes_programmes.html"
    : "/index.html";
  app.innerHTML = `
    <section class="done-screen stack" style="--gap:16px;padding-top:12vh">
      <div class="medal" style="margin:0 auto">${icon(programmeTermine ? "starFill" : "check")}</div>
      <h1>${programmeTermine ? "Programme terminé !" : "Séance enregistrée"}</h1>
      <p class="muted">${programmeTermine
        ? "Vous avez réalisé toutes les séances prévues. Découvrez votre progression et envoyez votre bilan à votre kiné."
        : offline ? "Vous êtes hors connexion : la séance sera transmise automatiquement dès le retour du réseau."
        : cloud && !apercu ? "Votre kiné peut voir votre séance et votre ressenti." : "Votre séance est ajoutée à l'historique de cet appareil."}</p>
      <a class="btn primary big block" href="${next}">${programmeTermine ? icon("chart") + "Voir ma progression" : icon("home") + "Retour à l'accueil"}</a>
    </section>`;
  if(!programmeTermine && !offline) setTimeout(() => { location.href = next; }, 2600);
}

function confetti(){
  if(matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const box = document.createElement("div");
  box.className = "confetti";
  const colors = ["var(--lagon)", "var(--soleil)", "var(--ok)", "#fff", "var(--eva-6)"];
  for(let i = 0; i < 70; i++){
    const c = document.createElement("i");
    c.style.left = Math.random() * 100 + "vw";
    c.style.background = colors[i % colors.length];
    c.style.animationDuration = 2.4 + Math.random() * 2 + "s";
    c.style.animationDelay = Math.random() * .6 + "s";
    box.appendChild(c);
  }
  document.body.appendChild(box);
  setTimeout(() => box.remove(), 5200);
}
