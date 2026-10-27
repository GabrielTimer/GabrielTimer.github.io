/* =========================================================
   Créer / modifier une séance ou un programme (kiné)
   ========================================================= */

import {
  $, $$, esc, icon, params, store, mountShell, registerSW, toast, confirmDialog, promptDialog, openSheet,
  exoImageHTML, sessionDuration, fmtDuree, plural, setRunProgram, localProgs, prenom, fmtDate, startOfDay,
  emptyHTML, byWeek
} from "../app.js";
import { exerciseImage, toProgramExercise, updateSessionExercise } from "../library.js";
import { mountLibrary, exerciseSheet } from "../library-ui.js";

const { requireKine } = await import("../kine.js");
await requireKine();
registerSW();
const C = await import("../cloud.js");
const app = $("#app");

const STATE_KEY = "gt_config_state";
const JOURS = [[1, "L", "lundi"], [2, "M", "mardi"], [3, "M", "mercredi"], [4, "J", "jeudi"], [5, "V", "vendredi"], [6, "S", "samedi"], [0, "D", "dimanche"]];
const DEFAULT_JOURS = { 1:[3], 2:[2, 5], 3:[1, 3, 5], 4:[1, 2, 4, 5], 5:[1, 2, 3, 4, 5], 6:[1, 2, 3, 4, 5, 6], 7:[1, 2, 3, 4, 5, 6, 0] };
const todayISO = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };

const blank = () => ({ nom:"", series:1, exercices:[], patient:null, type:"unique", semaines:4, parSemaine:3, jours:[1, 3, 5], debut:todayISO() });
const normExo = e => ({ ...e, ex: Math.max(1, Math.round(Number(e.ex) || 30)), repos: Math.max(0, Math.round(Number(e.repos ?? 10))), reps: Math.max(1, Math.round(Number(e.reps) || 1)) });

/* ---------- Chargement du contexte ---------- */

let S = blank();
let mode = { kind:"new" };
let editSeance = null;
let restored = false;

async function init(){
  const edit = store.get("gt_edit");
  if(params.get("edit") && edit){
    if(edit.type === "seance"){
      const s = await C.getSeance(edit.cle, edit.id);
      if(!s){ toast("Séance introuvable.", { type:"err" }); location.replace("/patients.html"); return false; }
      editSeance = s;
      const all = s.programmeId ? (await C.listSeances(edit.cle)).filter(x => x.programmeId === s.programmeId) : [s];
      byWeek(all);
      editSeance.siblings = all;
      editSeance.label = (all.find(x => x.id === s.id) || {}).label || s.nom;
      S = { ...blank(), nom: s.data.nom || s.programmeNom || s.nom || "", series: s.data.series || 1, exercices: (s.data.exercices || []).map(normExo), patient: edit.cle };
      mode = { kind:"edit-seance", ref:edit };
    }else if(edit.type === "modele"){
      const m = (await C.listModeles()).find(x => x.id === edit.id);
      if(!m){ toast("Modèle introuvable.", { type:"err" }); location.replace("/programmes_admin.html"); return false; }
      S = { ...blank(), nom: m.nom || m.data?.nom || "", series: m.data?.series || 1, exercices: (m.data?.exercices || []).map(normExo) };
      mode = { kind:"edit-modele", ref:edit, modele:m };
    }else if(edit.type === "favori"){
      const d = store.get("gt_draft", {});
      S = { ...blank(), nom: d.nom || "", series: d.series || 1, exercices: (d.exercices || []).map(normExo) };
      mode = { kind:"edit-favori", ref:edit };
    }
    return true;
  }
  store.del("gt_edit");

  if(params.get("draft") && store.get("gt_draft")){
    const d = store.get("gt_draft");
    S = { ...blank(), nom: d.nom || "", series: d.series || 1, exercices: (d.exercices || []).map(normExo) };
    if(d.semaines && d.semaines > 1){
      S.type = "programme"; S.semaines = d.semaines; S.parSemaine = d.seancesParSemaine || 3;
      S.jours = d.jours && d.jours.length === S.parSemaine ? d.jours : DEFAULT_JOURS[S.parSemaine] || [1, 3, 5];
    }
    store.del("gt_draft");
  }else if(localStorage.getItem("patho_data") && localStorage.getItem("pathologie")){
    const d = store.get("patho_data", {});
    S = { ...blank(), nom: store.get("pathologie_nom", "") || "", series: d.series || 1, exercices: (d.exercices || []).map(normExo) };
    store.del("patho_data", "pathologie", "pathologie_nom");
  }else if(params.get("libre")){
    S = { ...blank(), nom:"Séance libre", series:3, exercices:[normExo({ nom:"Exercice 1", ex:30, repos:10, reps:10 })] };
  }else{
    const st = store.get(STATE_KEY);
    if(st && st.exercices && st.exercices.length){ S = { ...blank(), ...st }; restored = !params.get("continue"); }
  }
  if(params.get("patient")) S.patient = params.get("patient");
  return true;
}

function persist(){
  if(mode.kind === "new") store.set(STATE_KEY, S);
}

function build(){
  const exos = S.exercices.map(e => ({ ...e, series: S.series }));
  return {
    version: 2,
    nom: S.nom.trim() || "Séance",
    series: S.series,
    date: new Date().toISOString(),
    categorie: "kine",
    objectifs: [], conseils: [], precautions: [], contreIndications: [],
    exercices: exos
  };
}

/* ---------- Rendu ---------- */

let patients = [];
const shell = mountShell({ role:"kine", active: params.get("patient") || mode.kind !== "new" ? "patients" : "creer", back:"history", title: "" });

async function main(){
  if(!(await init())) return;
  mountView();
  C.listPatients().then(list => { patients = list; renderSend(); }).catch(() => {});
}

function titleText(){
  if(mode.kind === "edit-seance") return `Modifier la séance ${editSeance.label || ""}`;
  if(mode.kind === "edit-modele") return "Modifier le modèle";
  if(mode.kind === "edit-favori") return "Modifier la séance favorite";
  return "Nouvelle séance";
}

function mountView(){
  document.title = titleText();
  app.innerHTML = `
    <div class="cfg">
      <section>
        ${restored ? `<div class="notice" style="margin-bottom:14px">${icon("history")}<div class="row wrap" style="flex:1"><span style="flex:1 1 220px">Vous reprenez la séance en cours de préparation.</span><button class="btn sm" type="button" id="restart">${icon("plus")}Repartir de zéro</button></div></div>` : ""}
        <div class="panel cfg-head">
          <span class="cfg-mode badge lagon" style="align-self:flex-start">${esc(titleText())}</span>
          <input class="title-input" id="nom" value="${esc(S.nom)}" placeholder="Nom de la séance, ex. Lombalgie phase 1" aria-label="Nom de la séance" maxlength="80">
          <div class="cfg-summary">
            <span id="sum-dur">${icon("clock")}</span>
            <span id="sum-n">${icon("dumbbell")}</span>
            <div class="series"><span class="small">Tours</span>
              <div class="stepper"><button type="button" data-step="series" data-d="-1" aria-label="Moins de tours">${icon("minus")}</button><input id="series" type="number" inputmode="numeric" min="1" max="20" value="${S.series}" aria-label="Nombre de tours"><button type="button" data-step="series" data-d="1" aria-label="Plus de tours">${icon("plus")}</button></div>
            </div>
          </div>
        </div>
        <div class="exo-list" id="exos"></div>
        <div class="add-row">
          <button class="btn only-mobile" type="button" id="add-lib">${icon("book")}Ajouter depuis la bibliothèque</button>
          <button class="btn" type="button" id="add-custom">${icon("plus")}Exercice personnalisé</button>
        </div>
        <section class="panel send" id="send"></section>
      </section>
      <aside class="panel cfg-lib" aria-label="Bibliothèque d'exercices"><div class="lib-head"><h2>Bibliothèque</h2><button class="btn sm" type="button" id="lib-full" title="Agrandir la bibliothèque">${icon("maximize")}Plein écran</button></div><div id="lib"></div></aside>
    </div>`;

  $("#nom").addEventListener("input", e => { S.nom = e.target.value; persist(); renderSend(false); });
  $("#series").addEventListener("input", e => { S.series = clamp(+e.target.value, 1, 20); persist(); renderSummary(); });
  $("#series").addEventListener("change", e => { e.target.value = S.series; });
  $$("[data-step=series]").forEach(b => b.onclick = () => { S.series = clamp(S.series + Number(b.dataset.d), 1, 20); $("#series").value = S.series; persist(); renderSummary(); });
  $("#add-custom").onclick = () => { addExercise({ nom:`Exercice ${S.exercices.length + 1}`, ex:30, repos:10, reps:10, type:"timer" }); setTimeout(() => { const n = $$(".exo-name"); n[n.length - 1]?.select(); }, 30); };
  $("#add-lib").onclick = () => openLibrarySheet(false);
  $("#lib-full")?.addEventListener("click", () => openLibrarySheet(true));
  $("#restart")?.addEventListener("click", async () => {
    if(!await confirmDialog({ title:"Repartir de zéro ?", message:"La séance en cours de préparation sera effacée.", confirm:"Effacer", danger:true })) return;
    store.del(STATE_KEY); location.replace("/config.html?nouveau=1" + (S.patient ? "&patient=" + S.patient : ""));
  });

  if(matchMedia("(min-width:1100px)").matches){
    sideLib = mountLibrary($("#lib"), { onAdd: e => addExercise(toProgramExercise(e)), addLabel:"Ajouter à la séance", countIn });
  }
  renderExos();
  renderSend();
}

const clamp = (v, a, b) => Math.max(a, Math.min(b, Math.round(Number(v) || a)));

function renderSummary(){
  const prog = build();
  $("#sum-dur").innerHTML = `${icon("clock")}${S.exercices.length ? fmtDuree(sessionDuration(prog)) : "0 min"}`;
  $("#sum-n").innerHTML = `${icon("dumbbell")}${plural(S.exercices.length, "exercice")}`;
}

function stepper(i, field, label, step, min){
  const v = S.exercices[i][field];
  return `<div class="field"><label for="f-${field}-${i}">${label}</label>
    <div class="stepper"><button type="button" data-i="${i}" data-f="${field}" data-d="${-step}" aria-label="Diminuer">${icon("minus")}</button><input id="f-${field}-${i}" type="number" inputmode="numeric" min="${min}" value="${v}" data-i="${i}" data-field="${field}"><button type="button" data-i="${i}" data-f="${field}" data-d="${step}" aria-label="Augmenter">${icon("plus")}</button></div></div>`;
}

function renderExos(){
  const list = $("#exos");
  if(!S.exercices.length){
    list.innerHTML = `<div class="cfg-empty">${icon("dumbbell")}<strong>Aucun exercice pour l'instant</strong><span class="small">Ajoutez des exercices depuis la bibliothèque${matchMedia("(min-width:1100px)").matches ? " (à droite)" : ""} ou créez un exercice personnalisé.</span></div>`;
    renderSummary();
    return;
  }
  list.innerHTML = S.exercices.map((e, i) => `
    <article class="exo" data-i="${i}">
      <button class="grip" type="button" aria-label="Déplacer l'exercice ${i + 1}">${icon("grip")}</button>
      <button class="thumb" type="button" data-view="${i}" aria-label="Voir l'exercice">${exoImageHTML(exerciseImage(e), "")}</button>
      <div class="exo-body">
        <div class="exo-top">
          <span class="exo-num">${i + 1}.</span>
          <input class="exo-name" value="${esc(e.nom)}" data-i="${i}" aria-label="Nom de l'exercice ${i + 1}">
          <div class="exo-actions">
            <button class="icon-btn sm" type="button" data-move="-1" data-i="${i}" aria-label="Monter" ${i === 0 ? "disabled" : ""}>${icon("up")}</button>
            <button class="icon-btn sm" type="button" data-move="1" data-i="${i}" aria-label="Descendre" ${i === S.exercices.length - 1 ? "disabled" : ""}>${icon("down")}</button>
            <button class="icon-btn sm" type="button" data-dup="${i}" aria-label="Dupliquer">${icon("copy")}</button>
            <button class="icon-btn sm danger" type="button" data-del="${i}" aria-label="Supprimer">${icon("trash")}</button>
          </div>
        </div>
        <div class="exo-params">
          ${stepper(i, "ex", "Effort (s)", 5, 1)}
          ${stepper(i, "repos", "Repos (s)", 5, 0)}
          ${stepper(i, "reps", "Répétitions", 1, 1)}
        </div>
        <div class="exo-foot"><span data-total="${i}">${exoTotal(e)}</span></div>
        <details class="exo-note" ${e.conseil_kine ? "open" : ""}><summary>${icon("message")}Consigne personnelle pour le patient</summary>
          <textarea class="textarea" data-note="${i}" maxlength="400" placeholder="Ex. Ne pas dépasser 3/10 de douleur, côté droit uniquement">${esc(e.conseil_kine || "")}</textarea>
        </details>
      </div>
    </article>`).join("");
  bindExos();
  renderSummary();
}

function exoTotal(e){
  return `${e.reps} × ${fmtDuree(e.ex)}${e.repos ? ` avec ${fmtDuree(e.repos)} de repos` : ""}, soit ${fmtDuree(e.reps * e.ex + Math.max(0, e.reps - 1) * e.repos)}`;
}

function bindExos(){
  const list = $("#exos");
  $$(".exo-name", list).forEach(inp => inp.addEventListener("input", () => { S.exercices[inp.dataset.i].nom = inp.value; persist(); }));
  $$("[data-note]", list).forEach(t => t.addEventListener("input", () => { S.exercices[t.dataset.note].conseil_kine = t.value; persist(); }));
  $$("input[data-field]", list).forEach(inp => {
    inp.addEventListener("input", () => setField(+inp.dataset.i, inp.dataset.field, inp.value, false));
    inp.addEventListener("change", () => { inp.value = S.exercices[inp.dataset.i][inp.dataset.field]; });
  });
  $$("button[data-f]", list).forEach(b => b.onclick = () => {
    const i = +b.dataset.i, f = b.dataset.f;
    setField(i, f, S.exercices[i][f] + Number(b.dataset.d), true);
  });
  $$("[data-move]", list).forEach(b => b.onclick = () => move(+b.dataset.i, +b.dataset.i + Number(b.dataset.move)));
  $$("[data-dup]", list).forEach(b => b.onclick = () => {
    const i = +b.dataset.dup;
    S.exercices.splice(i + 1, 0, JSON.parse(JSON.stringify(S.exercices[i])));
    persist(); renderExos();
    toast("Exercice dupliqué.", { type:"ok" });
  });
  $$("[data-del]", list).forEach(b => b.onclick = () => {
    const i = +b.dataset.del;
    const [removed] = S.exercices.splice(i, 1);
    persist(); renderExos(); renderSend(false);
    sideLib?.then(l => l.refresh());
    toast(`« ${removed.nom} » retiré.`, { action:{ label:"Annuler", run:() => { S.exercices.splice(i, 0, removed); persist(); renderExos(); renderSend(false); } } });
  });
  $$("[data-view]", list).forEach(b => b.onclick = () => {
    const e = S.exercices[+b.dataset.view];
    exerciseSheet({
      ...e, image: exerciseImage(e), categorie: e.categorie || "", niveau: e.niveau || 1, mode:"",
      consignes: e.consignes || (e.conseil ? String(e.conseil).split(/<br\s*\/?>/i).filter(Boolean) : []),
      description: e.description_fr || "", descriptionHtml:"", position: e.position || "", precautions: e.precautions || [],
      contreIndications: [], materiel: e.materiel || [], pathologies: [], muscles: [],
      conseil_posture: e.conseil_posture || [], erreurs_frequentes: e.erreurs_frequentes || [], version_facile: e.version_facile || [], version_avancee: e.version_avancee || [],
      videos: e.videos || [], youtube: e.youtube, vimeo: e.vimeo
    }, {
      // Correction de la bibliothèque : on la reporte aussi sur la séance en cours d'édition
      onEdited: (x, { before, after }) => {
        let n = 0;
        S.exercices.forEach(y => { if(updateSessionExercise(y, before, after)) n++; });
        if(n){ persist(); renderExos(); }
        sideLib?.then(l => l.refresh());
      }
    });
  });
  $$(".grip", list).forEach(g => g.addEventListener("pointerdown", startDrag));
}

function setField(i, f, v, rerenderInput){
  const min = f === "repos" ? 0 : 1;
  const max = f === "reps" ? 200 : 7200;
  const val = Math.max(min, Math.min(max, Math.round(Number(v)) || (f === "repos" ? 0 : min)));
  S.exercices[i][f] = val;
  if(rerenderInput){ const inp = $(`#f-${f}-${i}`); if(inp) inp.value = val; }
  const t = $(`[data-total="${i}"]`); if(t) t.textContent = exoTotal(S.exercices[i]);
  persist(); renderSummary();
}

function move(from, to){
  if(to < 0 || to >= S.exercices.length) return;
  const [x] = S.exercices.splice(from, 1);
  S.exercices.splice(to, 0, x);
  persist(); renderExos();
  $(`.exo[data-i="${to}"] [data-move="${to > from ? 1 : -1}"]`)?.focus();
}

/* Glisser-déposer au doigt ou à la souris */
function startDrag(ev){
  ev.preventDefault();
  const grip = ev.currentTarget;
  const card = grip.closest(".exo");
  const list = $("#exos");
  card.classList.add("dragging");
  grip.setPointerCapture(ev.pointerId);
  let scrollTimer = null;
  const onMove = e => {
    const y = e.clientY;
    const others = Array.from(list.children).filter(c => c !== card);
    let before = null;
    for(const c of others){ const r = c.getBoundingClientRect(); if(y < r.top + r.height / 2){ before = c; break; } }
    if(card.nextSibling !== before) list.insertBefore(card, before);
    clearInterval(scrollTimer);
    if(y < 90) scrollTimer = setInterval(() => scrollBy(0, -12), 16);
    else if(y > innerHeight - 90) scrollTimer = setInterval(() => scrollBy(0, 12), 16);
  };
  const onUp = () => {
    clearInterval(scrollTimer);
    grip.removeEventListener("pointermove", onMove);
    grip.removeEventListener("pointerup", onUp);
    grip.removeEventListener("pointercancel", onUp);
    card.classList.remove("dragging");
    const order = Array.from(list.children).map(c => +c.dataset.i);
    if(order.some((v, k) => v !== k)){
      S.exercices = order.map(k => S.exercices[k]);
      persist();
    }
    renderExos();
  };
  grip.addEventListener("pointermove", onMove);
  grip.addEventListener("pointerup", onUp);
  grip.addEventListener("pointercancel", onUp);
}

function addExercise(exo){
  S.exercices.push(normExo(exo));
  persist(); renderExos(); renderSend(false);
  sideLib?.then(l => l.refresh());
  toast(`« ${exo.nom} » ajouté.`, { type:"ok", duration:1800 });
}

let sideLib = null;
const countIn = e => S.exercices.filter(x => String(x.id) === String(e.id) && (x.source || "CABINET") === e.source).length;

function openLibrarySheet(full){
  const head = () => `${plural(S.exercices.length, "exercice")} dans la séance, ${S.exercices.length ? fmtDuree(sessionDuration(build())) : "0 min"}`;
  const s = openSheet({
    title: full ? "Bibliothèque d'exercices" : "Ajouter des exercices",
    wide: true,
    body: `<div id="lib-sheet"></div>`,
    foot: `<span class="lib-sum small muted" id="lib-sum">${head()}</span><button class="btn primary" type="button" data-close>${icon("check")}Terminé</button>`,
    onClose: () => { sideLib?.then(l => l.refresh()); }
  });
  s.el.classList.add("full");
  mountLibrary(s.el.querySelector("#lib-sheet"), {
    onAdd: e => { addExercise(toProgramExercise(e)); s.el.querySelector("#lib-sum").textContent = head(); },
    addLabel: "Ajouter", countIn, layout: full ? "grid" : "list"
  });
}

/* ---------- Envoi / enregistrement ---------- */

function planDates(){
  const total = S.semaines * S.parSemaine;
  const start = new Date(S.debut + "T12:00:00");
  const order = [...S.jours].sort((a, b) => ((a + 6) % 7) - ((b + 6) % 7));
  const monday = new Date(start); monday.setDate(start.getDate() - ((start.getDay() + 6) % 7));
  const dates = [];
  for(let w = 0; dates.length < total && w < S.semaines + 2; w++){
    for(const j of order){
      const d = new Date(monday); d.setDate(monday.getDate() + w * 7 + ((j + 6) % 7));
      if(startOfDay(d) >= startOfDay(start) && dates.length < total) dates.push(d);
    }
  }
  return dates;
}

function renderSend(full = true){
  const box = $("#send");
  if(!box) return;
  const p = patients.find(x => x.cle === S.patient);

  if(mode.kind === "edit-seance"){
    const sib = editSeance.siblings.filter(x => x.id !== editSeance.id && !x.terminee);
    const pt = patients.find(x => x.cle === mode.ref.cle);
    box.innerHTML = `
      <h2>Enregistrer</h2>
      <div class="group">
        <p>Séance <strong>${esc(editSeance.label || "")}</strong>${editSeance.programmeNom ? ` du programme « ${esc(editSeance.programmeNom)} »` : ""}${pt ? `, pour ${esc(pt.nom)}` : ""}.</p>
        ${sib.length ? `<label class="check"><input type="checkbox" id="apply-all" checked> Appliquer aussi aux ${plural(sib.length, "autre séance")} non faite${sib.length > 1 ? "s" : ""} de ce programme</label>` : ""}
      </div>
      <div class="send-actions">
        <button class="btn primary big" type="button" id="save-edit">${icon("check")}Enregistrer les modifications</button>
        <button class="btn" type="button" id="run">${icon("play")}Tester la séance</button>
        <button class="btn" type="button" id="pdf">${icon("pdf")}Fiche PDF</button>
      </div>`;
    $("#save-edit").onclick = saveEditSeance;
    bindCommon();
    return;
  }
  if(mode.kind === "edit-modele" || mode.kind === "edit-favori"){
    box.innerHTML = `
      <h2>Enregistrer</h2>
      <div class="send-actions">
        <button class="btn primary big" type="button" id="save-edit">${icon("check")}Enregistrer ${mode.kind === "edit-modele" ? "le modèle" : "la séance favorite"}</button>
        <button class="btn" type="button" id="run">${icon("play")}Tester la séance</button>
        <button class="btn" type="button" id="pdf">${icon("pdf")}Fiche PDF</button>
      </div>`;
    $("#save-edit").onclick = mode.kind === "edit-modele" ? saveEditModele : saveEditFavori;
    bindCommon();
    return;
  }

  if(!full && box.dataset.ready){ updatePlanPreview(); updatePrimary(); return; }
  box.dataset.ready = "1";
  box.innerHTML = `
    <h2>Envoyer ou lancer</h2>
    <div class="group">
      <div class="field">
        <label for="patient">Patient</label>
        <div class="row">
          <select class="select" id="patient">
            <option value="">Aucun patient (lancer moi-même)</option>
            ${patients.map(x => `<option value="${esc(x.cle)}" ${x.cle === S.patient ? "selected" : ""}>${esc(x.nom)}</option>`).join("")}
            ${S.patient && !p ? `<option value="${esc(S.patient)}" selected>Patient sélectionné</option>` : ""}
          </select>
          <button class="btn" type="button" id="new-patient" aria-label="Nouveau patient">${icon("userPlus")}<span class="nowrap">Nouveau</span></button>
        </div>
      </div>
    </div>
    <div class="group" id="plan-group">
      <div class="segmented block" role="group" aria-label="Type d'envoi">
        <button type="button" data-type="unique" aria-pressed="${S.type === "unique"}">Séance unique</button>
        <button type="button" data-type="programme" aria-pressed="${S.type === "programme"}">Programme sur plusieurs semaines</button>
      </div>
      <div id="plan" ${S.type === "programme" ? "" : "hidden"}>
        <div class="plan-grid">
          <div class="field"><label for="semaines">Semaines</label><div class="stepper"><button type="button" data-pstep="semaines" data-d="-1" aria-label="Moins">${icon("minus")}</button><input id="semaines" type="number" min="1" max="52" value="${S.semaines}"><button type="button" data-pstep="semaines" data-d="1" aria-label="Plus">${icon("plus")}</button></div></div>
          <div class="field"><label for="parSemaine">Séances par semaine</label><div class="stepper"><button type="button" data-pstep="parSemaine" data-d="-1" aria-label="Moins">${icon("minus")}</button><input id="parSemaine" type="number" min="1" max="7" value="${S.parSemaine}"><button type="button" data-pstep="parSemaine" data-d="1" aria-label="Plus">${icon("plus")}</button></div></div>
          <div class="field"><label for="debut">Début</label><input class="input" id="debut" type="date" value="${esc(S.debut)}"></div>
        </div>
        <div class="field" style="margin-top:12px"><span class="label">Jours</span><div class="days" id="days">${JOURS.map(([n, l, full]) => `<button type="button" data-day="${n}" aria-pressed="${S.jours.includes(n)}" aria-label="${full}">${l}</button>`).join("")}</div><span class="hint" id="days-hint"></span></div>
        <div class="plan-preview" id="plan-preview" style="margin-top:12px"></div>
      </div>
    </div>
    <div class="send-actions">
      <button class="btn primary big" type="button" id="send-btn"></button>
      <button class="btn" type="button" id="run">${icon("play")}Lancer maintenant</button>
      <button class="btn" type="button" id="pdf">${icon("pdf")}Fiche PDF</button>
      <button class="btn" type="button" id="as-model">${icon("layers")}Enregistrer comme modèle</button>
      <button class="btn" type="button" id="as-fav">${icon("star")}Garder en favori</button>
      <button class="btn ghost" type="button" id="clear">${icon("trash")}Tout effacer</button>
    </div>`;

  $("#patient").onchange = e => { S.patient = e.target.value || null; persist(); updatePrimary(); };
  $("#new-patient").onclick = async () => {
    const { newPatientSheet } = await import("../kine-ui.js");
    const np = await newPatientSheet();
    if(np){ patients.push(np); patients.sort((a, b) => a.nom.localeCompare(b.nom, "fr")); S.patient = np.cle; persist(); box.dataset.ready = ""; renderSend(); }
  };
  $$("[data-type]").forEach(b => b.onclick = () => {
    S.type = b.dataset.type; persist();
    $$("[data-type]").forEach(x => x.setAttribute("aria-pressed", String(x === b)));
    $("#plan").hidden = S.type !== "programme";
    updatePlanPreview(); updatePrimary();
  });
  const setPlan = (k, v) => {
    const lim = k === "semaines" ? [1, 52] : [1, 7];
    S[k] = clamp(v, lim[0], lim[1]);
    $("#" + k).value = S[k];
    if(k === "parSemaine"){ S.jours = [...(DEFAULT_JOURS[S.parSemaine] || [])]; $$("[data-day]").forEach(b => b.setAttribute("aria-pressed", String(S.jours.includes(+b.dataset.day)))); }
    persist(); updatePlanPreview(); updatePrimary();
  };
  $$("[data-pstep]").forEach(b => b.onclick = () => setPlan(b.dataset.pstep, S[b.dataset.pstep] + Number(b.dataset.d)));
  ["semaines", "parSemaine"].forEach(k => $("#" + k).addEventListener("change", e => setPlan(k, e.target.value)));
  $("#debut").onchange = e => { S.debut = e.target.value || todayISO(); persist(); updatePlanPreview(); };
  $$("[data-day]").forEach(b => b.onclick = () => {
    const n = +b.dataset.day;
    S.jours = S.jours.includes(n) ? S.jours.filter(x => x !== n) : [...S.jours, n];
    b.setAttribute("aria-pressed", String(S.jours.includes(n)));
    persist(); updatePlanPreview(); updatePrimary();
  });
  $("#send-btn").onclick = send;
  $("#as-model").onclick = saveAsModel;
  $("#as-fav").onclick = saveAsFav;
  $("#clear").onclick = async () => {
    if(!await confirmDialog({ title:"Tout effacer ?", message:"Les exercices et réglages de cette séance seront effacés.", confirm:"Tout effacer", danger:true })) return;
    store.del(STATE_KEY); S = { ...blank(), patient:S.patient }; mountView();
  };
  bindCommon();
  updatePlanPreview();
  updatePrimary();
}

function bindCommon(){
  $("#run").onclick = () => {
    if(!S.exercices.length){ toast("Ajoutez au moins un exercice.", { type:"err" }); return; }
    setRunProgram(build());
    location.href = "/timer.html?from=config";
  };
  $("#pdf").onclick = () => {
    if(!S.exercices.length){ toast("Ajoutez au moins un exercice.", { type:"err" }); return; }
    const p = patients.find(x => x.cle === S.patient);
    store.set("programme_pdf", {
      ...build(), patient: p ? p.nom : "",
      duree: S.type === "programme" && mode.kind === "new" ? `${S.semaines} semaine${S.semaines > 1 ? "s" : ""}` : "",
      frequence: S.type === "programme" && mode.kind === "new" ? `${S.parSemaine} séance${S.parSemaine > 1 ? "s" : ""} par semaine` : ""
    });
    window.open("/program_pdf.html", "_blank");
  };
}

function updatePlanPreview(){
  const box = $("#plan-preview");
  if(!box) return;
  const hint = $("#days-hint");
  const n = S.jours.length;
  hint.textContent = n === S.parSemaine ? "" : `Choisissez ${plural(S.parSemaine, "jour")} (${n} sélectionné${n > 1 ? "s" : ""}).`;
  hint.style.color = n === S.parSemaine ? "" : "var(--danger)";
  if(n !== S.parSemaine || !n){ box.innerHTML = "Sélectionnez les jours pour voir le calendrier."; return; }
  const dates = planDates();
  box.innerHTML = `<strong>${plural(dates.length, "séance")}</strong>, du ${esc(fmtDate(dates[0], { weekday:"long", day:"numeric", month:"long" }).toLowerCase())} au ${esc(fmtDate(dates[dates.length - 1], { weekday:"long", day:"numeric", month:"long" }).toLowerCase())}.`;
}

function updatePrimary(){
  const b = $("#send-btn");
  if(!b) return;
  const p = patients.find(x => x.cle === S.patient);
  const ready = !!S.patient && S.exercices.length && (S.type === "unique" || S.jours.length === S.parSemaine);
  b.disabled = !ready;
  b.innerHTML = `${icon("share")}${p ? `Envoyer à ${esc(prenom(p.nom))}` : "Choisissez un patient pour envoyer"}`;
}

async function send(){
  const p = patients.find(x => x.cle === S.patient);
  if(!p || !S.exercices.length) return;
  if(!S.nom.trim()){ const n = await promptDialog({ title:"Nom de la séance", label:"Comment s'appelle cette séance ?", value:"", placeholder:"Ex. Lombalgie phase 1", confirm:"Continuer" }); if(!n) return; S.nom = n; $("#nom").value = n; }
  const btn = $("#send-btn");
  btn.disabled = true; btn.innerHTML = `<span class="spinner" style="border-top-color:currentColor"></span>Envoi…`;
  const data = build();
  const now = Date.now();
  try{
    let count = 1;
    if(S.type === "unique"){
      await C.saveSeance(p.cle, { nom:data.nom, actif:true, createdAt:now, auteur:"gabriel", patientId:p.patientId, categorie:"kine", data });
    }else{
      const dates = planDates();
      const programmeId = C.newId();
      const jourNoms = S.jours.map(n => JOURS.find(j => j[0] === n)[2]);
      const lundi0 = new Date(dates[0]); lundi0.setDate(lundi0.getDate() - ((lundi0.getDay() + 6) % 7)); lundi0.setHours(0, 0, 0, 0);
      const perWeek = {};
      const seances = dates.map(d => {
        const lundi = new Date(d); lundi.setDate(d.getDate() - ((d.getDay() + 6) % 7)); lundi.setHours(0, 0, 0, 0);
        const semaine = Math.round((lundi - lundi0) / (7 * 86400000)) + 1;
        perWeek[semaine] = (perWeek[semaine] || 0) + 1;
        return {
          nom:`S${semaine}${"ABCDEFG"[perWeek[semaine] - 1]}`, actif:true, createdAt:now, auteur:"gabriel",
          patientId:p.patientId, programmeId, programmeNom:data.nom, joursProgramme:jourNoms,
          semaine, ordre:perWeek[semaine], categorie:"kine", dateDebut:S.debut,
          datePrevue:d.toISOString(), datePrevueTexte:d.toLocaleDateString("fr-FR"), terminee:false,
          data:{ ...data, categorie:"kine" }
        };
      });
      count = await C.saveSeances(p.cle, seances);
    }
    store.del(STATE_KEY);
    sentSheet(p, count);
  }catch(err){
    console.error(err);
    toast("L'envoi n'a pas abouti : " + (err.message || err), { type:"err" });
  }finally{
    updatePrimary();
  }
}

async function sentSheet(p, count){
  const { accessSheet } = await import("../kine-ui.js");
  const s = openSheet({
    title:"C'est envoyé",
    body:`<div class="stack" style="--gap:12px;align-items:center;text-align:center;padding:10px 0">
      <div class="empty" style="padding:0"><div class="e-ico" style="background:var(--ok-soft);color:var(--ok)">${icon("check")}</div></div>
      <p><strong>${esc(p.nom)}</strong> a reçu ${count > 1 ? `un programme de ${count} séances` : "une nouvelle séance"}. Elle apparaît déjà dans son application.</p>
      <p class="small muted">Si c'est son premier programme, envoyez-lui son lien d'accès.</p></div>`,
    foot:`<button class="btn" type="button" id="ss-new">${icon("plus")}Nouvelle séance</button><button class="btn" type="button" id="ss-acc">${icon("qr")}Lien d'accès</button><a class="btn primary" href="/cloud.html?patient=${encodeURIComponent(p.cle)}">${icon("user")}Voir la fiche</a>`
  });
  s.el.querySelector("#ss-acc").onclick = () => { s.close(); accessSheet(p); };
  s.el.querySelector("#ss-new").onclick = () => { location.href = "/config.html?nouveau=1&patient=" + encodeURIComponent(p.cle); };
}

async function saveAsModel(){
  if(!S.exercices.length){ toast("Ajoutez au moins un exercice.", { type:"err" }); return; }
  const nom = await promptDialog({ title:"Enregistrer comme modèle", label:"Nom du modèle", value:S.nom, placeholder:"Ex. Lombalgie P1", confirm:"Enregistrer" });
  if(!nom) return;
  await C.saveModele({ nom, patientId:"admin", data:{ ...build(), nom } });
  toast("Modèle enregistré.", { type:"ok", action:{ label:"Voir", run:() => location.href = "/programmes_admin.html" } });
}

function saveAsFav(){
  if(!S.exercices.length){ toast("Ajoutez au moins un exercice.", { type:"err" }); return; }
  const data = build();
  localProgs.add({ type:"favori", patientId:"admin", nom:data.nom, date:new Date().toLocaleDateString("fr-FR"), data });
  toast("Gardée dans vos séances favorites.", { type:"ok", action:{ label:"Voir", run:() => location.href = "/mes_programmes.html" } });
}

async function saveEditSeance(){
  const btn = $("#save-edit");
  btn.disabled = true;
  try{
    const data = build();
    const targets = [editSeance];
    if($("#apply-all")?.checked) targets.push(...editSeance.siblings.filter(x => x.id !== editSeance.id && !x.terminee));
    for(const s of targets){
      const { siblings, label, firebaseId, ...rest } = s;
      await C.saveSeance(mode.ref.cle, { ...rest, programmeNom: rest.programmeNom ? (targets.length > 1 ? data.nom : rest.programmeNom) : rest.programmeNom, data:{ ...data, categorie: s.data?.categorie || "kine" } });
    }
    store.del("gt_edit");
    toast(targets.length > 1 ? `${targets.length} séances mises à jour.` : "Séance mise à jour.", { type:"ok" });
    setTimeout(() => location.href = `/cloud.html?patient=${encodeURIComponent(mode.ref.cle)}`, 700);
  }catch(err){
    btn.disabled = false;
    toast("Enregistrement impossible : " + (err.message || err), { type:"err" });
  }
}

async function saveEditModele(){
  const data = build();
  await C.saveModele({ ...mode.modele, nom:data.nom, data });
  store.del("gt_edit");
  toast("Modèle enregistré.", { type:"ok" });
  setTimeout(() => location.href = "/programmes_admin.html", 600);
}

function saveEditFavori(){
  const all = localProgs.all();
  const i = mode.ref.index;
  const data = build();
  if(all[i] && all[i].type === "favori"){ all[i] = { ...all[i], nom:data.nom, data }; localProgs.save(all); }
  else localProgs.add({ type:"favori", patientId:"admin", nom:data.nom, date:new Date().toLocaleDateString("fr-FR"), data });
  store.del("gt_edit");
  toast("Séance favorite enregistrée.", { type:"ok" });
  setTimeout(() => location.href = "/mes_programmes.html", 600);
}

main();
