/* =========================================================
   Minuteur de séance
   ========================================================= */

import {
  $, esc, icon, params, store, session, getRunProgram, setRunProgram, fmtClock, fmtDuree,
  openSheet, confirmDialog, exoImageHTML, safeRich, vibrate, plural
} from "../app.js";
import { exerciseImage, exerciseSteps, videoEmbed } from "../library.js";

const PREP = 5;                       // secondes pour se mettre en position
const RESP = { RESP_DEBUTER:"beginner", RESP_APAISER:"calm", RESP_EQUILIBRER:"balance" };

/* ---------- Contexte (patient, séance) ---------- */

let ctx;
if(params.get("resume")){
  ctx = session.get("gt_run_ctx") || {};
}else{
  ctx = { cle:params.get("cle"), s:params.get("s"), apercu:params.get("apercu") === "1", from:params.get("from") };
  session.set("gt_run_ctx", ctx);
}

let prog = getRunProgram();
if((!prog || !prog.exercices?.length) && ctx.cle && ctx.s){
  try{
    const C = await import("../cloud.js");
    const s = await C.getSeance(ctx.cle, ctx.s);
    if(s?.data){ prog = s.data; setRunProgram(prog); }
  }catch(e){}
}
if(!prog || !Array.isArray(prog.exercices) || !prog.exercices.length){
  location.replace("/index.html");
  throw new Error("Aucune séance");
}

const exos = prog.exercices.map(e => ({
  ...e,
  ex: Math.max(1, Math.round(Number(e.ex) || 30)),
  repos: Math.max(0, Math.round(Number(e.repos) || 0)),
  reps: Math.max(1, Math.round(Number(e.reps) || 1))
}));
const series = Math.max(1, Math.round(Number(prog.series) || 1));

/* ---------- Déroulé complet de la séance ---------- */

const steps = [];
let occ = 0;
for(let s = 1; s <= series; s++){
  exos.forEach((e, ei) => {
    const o = occ++;
    steps.push({ kind:"prep", e, ei, s, occ:o, dur:PREP });
    for(let r = 1; r <= e.reps; r++){
      steps.push({ kind:"ex", e, ei, s, r, occ:o, dur:e.ex });
      const last = s === series && ei === exos.length - 1 && r === e.reps;
      if(!last && e.repos > 0) steps.push({ kind:"rest", e, ei, s, r, occ:o, dur:e.repos });
    }
  });
}
const totalOcc = occ;
const activeTotal = steps.reduce((a, st) => a + (st.kind === "prep" ? 0 : st.dur), 0);

/* ---------- État ---------- */

let idx = 0;
let remaining = steps[0].dur;
let running = false;
let waiting = true;
let endAt = 0;
let doneActive = 0;           // secondes d'effort et de repos déjà terminées
let lastWhole = null;
let finished = false;
const pref = {
  sound: store.get("gt_sound", 1) !== 0,
  voice: store.get("gt_voice", 1) !== 0,
  auto: store.get("gt_autonext", 0) === 1
};

function stepStartOf(i){
  // Revenir au début de l'exercice en cours
  let j = i;
  while(j > 0 && steps[j].kind !== "prep") j--;
  return j;
}

const signature = (prog.nom || "") + "|" + JSON.stringify(exos.map(e => [e.nom, e.ex, e.reps, e.repos])).length;

/* ---------- Son, voix, vibration, écran allumé ---------- */

let actx = null;
function audio(){
  try{
    if(!actx) actx = new (window.AudioContext || window.webkitAudioContext)();
    if(actx.state === "suspended") actx.resume();
  }catch(e){ actx = null; }
  return actx;
}
function beep(freq = 880, dur = .13, delay = 0, vol = .28){
  if(!pref.sound) return;
  const a = audio(); if(!a) return;
  const t = a.currentTime + delay;
  const o = a.createOscillator(), g = a.createGain();
  o.type = "sine"; o.frequency.value = freq;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(a.destination);
  o.start(t); o.stop(t + dur + 0.02);
}
function speak(text){
  if(!pref.sound || !pref.voice || !("speechSynthesis" in window)) return;
  try{
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "fr-FR"; u.rate = 1;
    speechSynthesis.speak(u);
  }catch(e){}
}
let wakeLock = null;
async function keepAwake(){
  try{ if("wakeLock" in navigator && !wakeLock) wakeLock = await navigator.wakeLock.request("screen"); wakeLock?.addEventListener("release", () => { wakeLock = null; }); }catch(e){}
}
document.addEventListener("visibilitychange", () => {
  if(document.visibilityState === "visible"){
    if(!finished && (running || waiting)) keepAwake();
    tick();
  }
});

/* ---------- Déroulement ---------- */

function goTo(i, { silent = false, wait = null } = {}){
  if(i >= steps.length){ finish(); return; }
  idx = i;
  const st = steps[i];
  remaining = st.dur;
  lastWhole = null;
  if(st.kind === "prep"){
    if(RESP[st.e.id] && !silent){ toRespir(st); return; }
    const mustWait = wait !== null ? wait : !(pref.auto && running);
    if(mustWait){ running = false; waiting = true; }
    else { waiting = false; endAt = performance.now() + remaining * 1000; }
  }else{
    waiting = false;
    endAt = performance.now() + remaining * 1000;
    if(!silent) announce(st);
  }
  session.set("gt_timer_state", { signature, idx, doneActive });
  render(true);
}

function announce(st){
  const nom = String(st.e.nom || "").toLowerCase();
  if(st.kind === "ex"){
    beep(988, .3);
    if(nom.includes("course")) vibrate(800);
    else if(nom.includes("marche")) vibrate([250, 150, 250]);
    else vibrate(120);
    if(st.r === 1) speak(st.e.nom);
    else if(nom.includes("course")) speak("Course");
    else if(nom.includes("marche")) speak("Marche");
  }else if(st.kind === "rest"){
    beep(660, .15); beep(660, .15, .22);
    vibrate([100, 80, 100]);
    const nxt = steps[idx + 1];
    if(nxt && nxt.kind === "prep") speak("Repos. Ensuite : " + nxt.e.nom);
    else speak("Repos");
  }
}

function start(){
  if(finished) return;
  audio();
  if(waiting){
    waiting = false;
    const st = steps[idx];
    if(st.kind === "prep" && RESP[st.e.id]){ toRespir(st); return; }
    if(st.kind === "prep") speak(st.e.nom + ". En position.");
  }
  running = true;
  endAt = performance.now() + remaining * 1000;
  keepAwake();
  render(true);
}
function pause(){
  if(!running) return;
  remaining = Math.max(0, (endAt - performance.now()) / 1000);
  running = false;
  render(true);
}
function toggle(){ running ? pause() : start(); }

function tick(){
  if(!running || finished) return;
  let guard = 0;
  while(running && guard++ < 50){
    remaining = (endAt - performance.now()) / 1000;
    if(remaining > 0) break;
    const st = steps[idx];
    if(st.kind !== "prep") doneActive += st.dur;
    const overflow = -remaining;
    goTo(idx + 1);
    if(running && steps[idx]){ endAt -= overflow * 1000; }
    if(finished) return;
  }
  const whole = Math.ceil(remaining);
  if(whole !== lastWhole){
    const st = steps[idx];
    if(lastWhole !== null && whole <= 3 && whole >= 1){
      if(st.kind === "prep") beep(740, .1);
      else if(st.dur >= 8) beep(880, .07, 0, .18);
    }
    lastWhole = whole;
  }
  render(false);
}
setInterval(tick, 200);

function nextExerciseIndex(from){
  for(let j = from + 1; j < steps.length; j++) if(steps[j].kind === "prep") return j;
  return -1;
}
function skip(){
  const j = nextExerciseIndex(idx);
  if(j === -1){
    confirmDialog({ title:"Terminer la séance ?", message:"C'était le dernier exercice.", confirm:"Terminer" }).then(ok => { if(ok) finish(); });
    return;
  }
  const st = steps[idx];
  if(st.kind !== "prep") doneActive += Math.max(0, st.dur - remaining);
  for(let k = idx + 1; k < j; k++) if(steps[k].kind !== "prep") doneActive += steps[k].dur;
  running = false;
  goTo(j, { wait:true });
}
function prev(){
  let j = stepStartOf(idx);
  if(j === idx || (steps[idx].kind === "ex" && steps[idx].r === 1 && remaining > steps[idx].dur - 2)){
    j = stepStartOf(Math.max(0, j - 1));
  }
  // retirer le temps compté des étapes rejouées
  let t = 0;
  for(let k = j; k < idx; k++) if(steps[k].kind !== "prep") t += steps[k].dur;
  doneActive = Math.max(0, doneActive - t);
  running = false;
  goTo(j, { wait:true, silent:true });
}

function toRespir(st){
  const next = nextExerciseIndex(idx);
  session.set("resumeTimer", { next: next === -1 ? steps.length : next, doneActive: doneActive + st.e.ex });
  location.href = `/respir/index.html?mode=${RESP[st.e.id]}&duree=${st.e.ex}&fromProgram=1&autostart=1`;
}

function finish(){
  if(finished) return;
  finished = true;
  running = false;
  render(true);
  session.del("gt_timer_state");
  beep(784, .18); beep(988, .18, .2); beep(1175, .35, .4);
  vibrate([400, 150, 400, 150, 600]);
  speak("Séance terminée. Bravo !");
  try{ wakeLock?.release(); }catch(e){}
  const q = new URLSearchParams();
  if(ctx.cle && ctx.s) { q.set("cle", ctx.cle); q.set("s", ctx.s); }
  if(ctx.apercu) q.set("apercu", "1");
  if(ctx.from) q.set("from", ctx.from);
  q.set("duree", String(Math.round(doneActive || activeTotal)));
  setTimeout(() => { location.href = "/fin.html?" + q.toString(); }, 1100);
}

/* ---------- Affichage ---------- */

const el = {
  body:document.body, count:$("#count"), spine:$("#spine"), figure:$("#figure"), name:$("#name"), sub:$("#sub"),
  ring:$("#ring"), arc:$("#arc"), phase:$("#phase"), time:$("#time"), hint:$("#hint"), next:$("#next"),
  play:$("#play"), prev:$("#prev"), skip:$("#skip"), info:$("#info"), sound:$("#sound"),
  totalbar:$("#totalbar"), totaltxt:$("#totaltxt")
};
const C = 2 * Math.PI * 90;
el.arc.style.strokeDasharray = C;
el.prev.innerHTML = icon("prev");
el.skip.innerHTML = icon("next");
el.info.innerHTML = icon("info") + "Consignes";
el.spine.innerHTML = Array.from({ length: totalOcc }, () => "<i></i>").join("");
const spineCells = Array.from(el.spine.children);

let shownExo = -1;
function render(full){
  const st = steps[Math.min(idx, steps.length - 1)];
  const e = st.e;
  const phase = finished ? "rest" : st.kind === "prep" ? "prep" : st.kind;
  el.body.dataset.phase = phase;
  el.body.classList.toggle("paused", !running && !waiting && !finished);
  el.body.classList.toggle("waiting", waiting);

  if(full || shownExo !== st.occ){
    shownExo = st.occ;
    el.count.textContent = `Exercice ${st.ei + 1} sur ${exos.length}` + (series > 1 ? `, tour ${st.s} sur ${series}` : "");
    el.figure.innerHTML = exoImageHTML(exerciseImage(e), e.nom) + `<button class="zoom" type="button" aria-label="Voir les consignes">${icon("maximize")}</button>`;
    el.figure.querySelector(".zoom").onclick = openInfo;
    el.name.textContent = e.nom || "Exercice";
  }

  let sub = "";
  if(finished) sub = "Bravo !";
  else if(st.kind === "prep") sub = e.conseil_kine ? e.conseil_kine : `${e.reps} × ${fmtDuree(e.ex)}` + (e.repos ? `, repos ${fmtDuree(e.repos)}` : "");
  else if(st.kind === "ex") sub = e.reps > 1 ? `Répétition ${st.r} sur ${e.reps}` : fmtDuree(e.ex);
  else sub = e.reps > 1 ? `${st.r} sur ${e.reps} faite${st.r > 1 ? "s" : ""}` : "Récupération";
  el.sub.textContent = sub;

  const shown = Math.max(0, Math.ceil(remaining));
  el.time.textContent = finished ? "✓" : fmtClock(shown);
  el.time.classList.toggle("long", shown >= 600);
  el.phase.textContent = finished ? "Terminé" : waiting ? (idx === 0 ? "Prêt ?" : "Exercice suivant") : st.kind === "prep" ? "En position" : st.kind === "ex" ? "Effort" : "Repos";
  el.hint.textContent = finished ? "" : waiting ? "Appuyez pour commencer" : !running ? "En pause, appuyez pour reprendre" : st.kind === "prep" ? "Préparez-vous" : st.kind === "rest" ? "Respirez calmement" : "";
  const p = st.dur ? Math.min(1, Math.max(0, remaining / st.dur)) : 0;
  el.arc.style.strokeDashoffset = finished ? 0 : C * p;

  const label = running ? "Mettre en pause" : "Démarrer";
  if(full || el.play.dataset.state !== String(running)){
    el.play.dataset.state = String(running);
    el.play.innerHTML = icon(running ? "pause" : "play");
    el.play.setAttribute("aria-label", label);
    el.ring.setAttribute("aria-label", label);
  }
  el.prev.disabled = idx === 0 || finished;
  el.skip.disabled = finished;

  /* Exercice suivant pendant le repos */
  const nxt = steps[idx + 1];
  const showNext = !finished && st.kind === "rest" && nxt && nxt.kind === "prep";
  if(showNext){
    if(el.next.dataset.for !== String(nxt.occ)){
      el.next.dataset.for = String(nxt.occ);
      el.next.innerHTML = `${exoImageHTML(exerciseImage(nxt.e), "")}<div><div class="n-lab">À suivre</div><div class="n-name">${esc(nxt.e.nom)}</div></div>`;
    }
    el.next.hidden = false;
  }else el.next.hidden = true;

  /* Colonne de progression */
  spineCells.forEach((c, i) => {
    const cls = i < st.occ || finished ? "done" : i === st.occ ? "part" : "";
    if(c.className !== cls) c.className = cls;
  });
  if(!finished){
    const exoSteps = steps.filter(x => x.occ === st.occ && x.kind !== "prep");
    const tot = exoSteps.reduce((a, x) => a + x.dur, 0) || 1;
    let d = 0;
    for(const x of exoSteps){ if(x === st){ d += x.dur - remaining; break; } d += x.dur; }
    if(st.kind === "prep") d = 0;
    spineCells[st.occ]?.style.setProperty("--p", Math.round(d * 100 / tot) + "%");
  }

  /* Temps total */
  const cur = st.kind === "prep" || finished ? 0 : Math.max(0, st.dur - remaining);
  const done = Math.min(activeTotal, doneActive + cur);
  el.totalbar.style.setProperty("--p", (finished ? 100 : Math.round(done * 100 / (activeTotal || 1))) + "%");
  el.totaltxt.textContent = finished ? "Terminé" : `${fmtDuree(activeTotal - done)} restantes`;
}

function renderSound(){
  el.sound.innerHTML = icon(pref.sound ? "sound" : "mute");
  el.sound.setAttribute("aria-label", pref.sound ? "Couper le son" : "Activer le son");
}
renderSound();

/* ---------- Consignes ---------- */

function list(title, ico, items){
  if(!items || !items.length) return "";
  return `<h3>${icon(ico)}${esc(title)}</h3><ul>${items.map(t => `<li>${esc(t)}</li>`).join("")}</ul>`;
}
function asList(v){ return Array.isArray(v) ? v : v ? [v] : []; }

function openInfo(){
  const wasRunning = running;
  pause();
  const e = steps[idx].e;
  const stepsList = exerciseSteps(e);
  const vid = videoEmbed(e);
  const body = `
    ${exoImageHTML(exerciseImage(e), e.nom, "sheet-img")}
    <div class="tips">
      ${e.conseil_kine ? `<div class="notice" style="margin-top:14px">${icon("message")}<span><strong>Votre kiné :</strong> ${esc(e.conseil_kine)}</span></div>` : ""}
      ${e.position ? `<h3>${icon("body")}Position de départ</h3><p>${esc(e.position)}</p>` : ""}
      ${stepsList.length ? `<h3>${icon("list")}Comment faire</h3><ol class="steps">${stepsList.map(t => `<li><span>${esc(t)}</span></li>`).join("")}</ol>` : ""}
      ${e.description_fr && !stepsList.length ? `<div class="rich">${safeRich(e.description_fr)}</div>` : ""}
      ${list("Bonne posture", "checkCircle", asList(e.conseil_posture))}
      ${list("À éviter", "alert", asList(e.erreurs_frequentes))}
      ${list("Respiration", "wind", asList(e.respiration))}
      ${list("Plus facile", "down", asList(e.version_facile))}
      ${list("Plus difficile", "up", asList(e.version_avancee))}
      ${list("Précautions", "info", asList(e.precautions))}
      ${vid ? `<h3>${icon("video")}Vidéo</h3>${vid.src ? `<button class="btn soft block" type="button" id="play-video">${icon("play")}Lire la vidéo</button><div id="video-slot"></div>` : `<a class="btn soft block" href="${esc(vid.url)}" target="_blank" rel="noopener">${icon("video")}${esc(vid.title || "Voir la vidéo")}</a>`}` : ""}
      ${!stepsList.length && !e.description_fr && !vid ? `<p class="muted">Suivez les indications de votre kiné.</p>` : ""}
    </div>`;
  const s = openSheet({
    title: e.nom || "Consignes",
    tall: true,
    body,
    foot: `<button class="btn primary" type="button" data-close>${wasRunning ? "Reprendre" : "Fermer"}</button>`,
    onClose: () => { if(wasRunning) start(); }
  });
  const pv = s.el.querySelector("#play-video");
  if(pv) pv.onclick = () => {
    s.el.querySelector("#video-slot").innerHTML = `<iframe class="video-frame" src="${esc(vid.src)}" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen title="Vidéo de l'exercice"></iframe>`;
    pv.remove();
  };
}

/* ---------- Commandes ---------- */

el.play.onclick = toggle;
el.ring.onclick = toggle;
el.skip.onclick = skip;
el.prev.onclick = prev;
el.info.onclick = openInfo;
el.sound.onclick = () => {
  pref.sound = !pref.sound;
  store.set("gt_sound", pref.sound ? 1 : 0);
  if(!pref.sound && "speechSynthesis" in window) speechSynthesis.cancel();
  renderSound();
};
$("#quit").onclick = async () => {
  const wasRunning = running;
  pause();
  const ok = await confirmDialog({
    title:"Arrêter la séance ?",
    message:"Votre séance ne sera pas validée. Vous pourrez la recommencer plus tard.",
    confirm:"Arrêter", cancel:"Continuer", danger:true
  });
  if(!ok){ if(wasRunning) start(); return; }
  session.del("gt_timer_state");
  location.href = ctx.from === "config" ? "/config.html" : ctx.from === "favoris" ? "/mes_programmes.html" : ctx.cle ? "/index.html" : "/index.html";
};
document.addEventListener("keydown", e => {
  if(document.querySelector("dialog[open]")) return;
  if(e.code === "Space"){ e.preventDefault(); toggle(); }
  else if(e.key === "ArrowRight") skip();
  else if(e.key === "ArrowLeft") prev();
});

/* Reprise après la respiration guidée ou un rechargement */
const resume = session.get("resumeTimer");
if(params.get("resume") && resume && Number.isInteger(resume.next)){
  goTo(Math.min(resume.next, steps.length), { silent:true, wait:true });
  doneActive = resume.doneActive || 0;
  session.del("resumeTimer");
}else{
  const saved = session.get("gt_timer_state");
  if(saved && saved.signature === signature && saved.idx > 0 && saved.idx < steps.length){
    idx = saved.idx; doneActive = saved.doneActive || 0;
    goTo(stepStartOf(idx), { silent:true, wait:true });
  }
}


render(true);
