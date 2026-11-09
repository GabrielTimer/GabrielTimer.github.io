/* =========================================================
   Carnet de marches
   ---------------------------------------------------------
   Le patient note ses sorties (durée et/ou distance) depuis son
   accueil, et reçoit un encouragement adapté. Le kiné active le
   carnet dans la fiche patient (Suivi), avec un objectif par
   semaine facultatif, et voit les sorties et les totaux.
   Stockage : patients/{code}/suivis, type « marche »
     { type:"marche", jour:"AAAA-MM-JJ", minutes?, km?, ressenti?, date }
   Réglage sur le patient : patient.marche = { actif, objectif (min / semaine) }
   ========================================================= */

import { esc, icon, openSheet, toast, plural } from "./app.js";

export const RESSENTIS_MARCHE = [
  { id:"facile", label:"Facile" },
  { id:"bien", label:"Bien" },
  { id:"difficile", label:"Difficile" }
];

/* ---------- Dates ---------- */

const pad = n => String(n).padStart(2, "0");
export const isoJour = d => { const x = new Date(d); return `${x.getFullYear()}-${pad(x.getMonth() + 1)}-${pad(x.getDate())}`; };
const deIso = s => { const [y, m, d] = String(s).split("-").map(Number); return new Date(y, (m || 1) - 1, d || 1); };
const lundi = d => { const x = new Date(d); x.setHours(0, 0, 0, 0); x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); return x; };
export const jourDe = m => m.jour ? deIso(m.jour) : new Date(m.date || Date.now());
export function fmtJour(m){
  const d = jourDe(m), auj = new Date(); auj.setHours(0, 0, 0, 0);
  const diff = Math.round((auj - new Date(d).setHours(0, 0, 0, 0)) / 86400000);
  if(diff === 0) return "aujourd'hui";
  if(diff === 1) return "hier";
  return d.toLocaleDateString("fr-FR", { weekday:"long", day:"numeric", month:"long" });
}

/* ---------- Chiffres ---------- */

export const fmtMin = m => { m = Math.round(m || 0); return m >= 60 ? `${Math.floor(m / 60)} h${m % 60 ? " " + pad(m % 60) : ""}` : `${m} min`; };
export const fmtKm = k => `${String(Math.round((k || 0) * 10) / 10).replace(".", ",")} km`;
export const resume = m => [m.minutes ? fmtMin(m.minutes) : "", m.km ? fmtKm(m.km) : ""].filter(Boolean).join(", ") || "sortie";

export const marchesDe = suivis => (suivis || []).filter(s => s.type === "marche")
  .sort((a, b) => (jourDe(b) - jourDe(a)) || ((b.date || 0) - (a.date || 0)));

/** Totaux par semaine (lundi → dimanche), de la plus récente à la plus ancienne. */
export function semaines(marches, n = 6){
  const out = [];
  const l0 = lundi(new Date());
  for(let i = 0; i < n; i++){
    const debut = new Date(l0); debut.setDate(debut.getDate() - 7 * i);
    const fin = new Date(debut); fin.setDate(fin.getDate() + 7);
    const liste = marches.filter(m => { const d = jourDe(m); return d >= debut && d < fin; });
    out.push({ debut, sorties: liste.length, minutes: liste.reduce((t, m) => t + (m.minutes || 0), 0), km: liste.reduce((t, m) => t + (m.km || 0), 0) });
  }
  return out;
}

/** Semaines d'affilée avec au moins une sortie (en comptant la semaine en cours si elle en a une). */
function semainesDAffilee(marches){
  const s = semaines(marches, 52);
  let n = 0;
  for(let i = 0; i < s.length; i++){
    if(s[i].sorties) n++;
    else if(i === 0) continue;   // semaine en cours pas encore commencée
    else break;
  }
  return n;
}

/* ---------- Encouragements ---------- */

const BRAVO = [
  "Bravo, c'est noté !",
  "Une sortie de plus au compteur. Bien joué !",
  "Votre corps vous dit merci.",
  "Chaque pas compte, et vous l'avez fait.",
  "Bel effort aujourd'hui !",
  "Continuez comme ça, c'est comme ça qu'on progresse."
];
const pick = a => a[Math.floor(Math.random() * a.length)];

/** Message après l'enregistrement d'une sortie. `marches` inclut la nouvelle. */
export function encouragement(nouvelle, marches, objectif = 0){
  const lignes = [];
  const sem = semaines(marches, 1)[0];
  const avant = marches.filter(m => m !== nouvelle);
  if(!avant.length){
    lignes.push("Première sortie enregistrée : le plus dur, c'est de commencer, et c'est fait !");
  }else{
    const maxMin = Math.max(0, ...avant.map(m => m.minutes || 0));
    const maxKm = Math.max(0, ...avant.map(m => m.km || 0));
    if(nouvelle.minutes && nouvelle.minutes > maxMin) lignes.push(`Record : c'est votre plus longue marche (${fmtMin(nouvelle.minutes)}) !`);
    else if(nouvelle.km && nouvelle.km > maxKm) lignes.push(`Record : votre plus longue distance (${fmtKm(nouvelle.km)}) !`);
    else lignes.push(pick(BRAVO));
  }
  if(objectif){
    const avantSem = sem.minutes - (nouvelle.minutes || 0);
    if(sem.minutes >= objectif && avantSem < objectif) lignes.push(`Objectif de la semaine atteint : ${fmtMin(sem.minutes)} sur ${fmtMin(objectif)}. Félicitations !`);
    else if(sem.minutes >= objectif) lignes.push(`Déjà ${fmtMin(sem.minutes)} cette semaine, au-delà de votre objectif. Superbe !`);
    else lignes.push(`Cette semaine : ${fmtMin(sem.minutes)} sur ${fmtMin(objectif)}. Plus que ${fmtMin(objectif - sem.minutes)} !`);
  }else if(sem.sorties > 1){
    lignes.push(`${plural(sem.sorties, "sortie")} cette semaine${sem.minutes ? `, ${fmtMin(sem.minutes)} en tout` : ""}${sem.km ? ` et ${fmtKm(sem.km)}` : ""}.`);
  }
  const suite = semainesDAffilee(marches);
  if(suite >= 3) lignes.push(`${suite} semaines d'affilée sans lâcher : l'habitude est prise !`);
  if(nouvelle.ressenti === "difficile") lignes.push("C'était difficile ? C'est normal au début : la prochaine fois, allez-y un peu plus doucement ou faites une pause en route.");
  return lignes;
}

/** Petit mot sur l'accueil, avant la prochaine sortie. */
export function motDuJour(marches, objectif = 0){
  const sem = semaines(marches, 1)[0];
  if(!marches.length) return "Notez ici chaque sortie à pied, même courte : 10 minutes, c'est déjà bien.";
  const der = jourDe(marches[0]); der.setHours(0, 0, 0, 0);
  const jours = Math.round((new Date().setHours(0, 0, 0, 0) - der) / 86400000);
  if(objectif && sem.minutes >= objectif) return "Objectif de la semaine atteint. Bravo, gardez ce rythme !";
  if(jours >= 4) return "Ça fait quelques jours : une petite sortie aujourd'hui, même 10 minutes ? Une marche manquée n'efface rien.";
  if(objectif) return `Encore ${fmtMin(objectif - sem.minutes)} pour atteindre votre objectif de la semaine.`;
  return "Chaque sortie compte. Continuez !";
}

/* ---------- Patient : section de l'accueil ---------- */

export function sectionHTML(marches, reglage = {}){
  const obj = Number(reglage.objectif) || 0;
  const sem = semaines(marches, 1)[0];
  const pct = obj ? Math.min(100, Math.round(sem.minutes / obj * 100)) : 0;
  return `<section class="section" id="mar-sec">
    <div class="section-title">Mes marches</div>
    <div class="panel" style="display:flex;flex-direction:column;gap:12px">
      <div style="display:flex;gap:10px 18px;flex-wrap:wrap;align-items:baseline">
        <span><strong style="font-size:1.6rem">${sem.sorties}</strong> <span class="muted">sortie${sem.sorties > 1 ? "s" : ""} cette semaine</span></span>
        ${sem.minutes ? `<span><strong style="font-size:1.25rem">${esc(fmtMin(sem.minutes))}</strong></span>` : ""}
        ${sem.km ? `<span><strong style="font-size:1.25rem">${esc(fmtKm(sem.km))}</strong></span>` : ""}
      </div>
      ${obj ? `<div>
        <div style="height:12px;border-radius:999px;background:var(--line);overflow:hidden"><div style="height:100%;width:${pct}%;background:${pct >= 100 ? "var(--ok)" : "var(--lagon)"};border-radius:999px"></div></div>
        <div class="small muted" style="margin-top:6px">Objectif de la semaine : ${esc(fmtMin(obj))}${pct >= 100 ? " · atteint !" : ""}</div>
      </div>` : ""}
      <p style="margin:0;display:flex;gap:8px;align-items:flex-start">${icon("heart")}<span>${esc(motDuJour(marches, obj))}</span></p>
      <button class="btn sun big block" type="button" data-marche="add">${icon("plus")}J'ai marché</button>
      ${marches.length ? `<div class="list">${marches.slice(0, 3).map(m => `<div class="list-item"><span class="li-ico">${icon("checkCircle")}</span><span class="li-main"><span class="li-title">${esc(resume(m))}</span><span class="li-sub">${esc(fmtJour(m).charAt(0).toUpperCase() + fmtJour(m).slice(1))}${m.ressenti ? ` · ${esc((RESSENTIS_MARCHE.find(r => r.id === m.ressenti) || {}).label || "")}` : ""}</span></span></div>`).join("")}</div>` : ""}
    </div>
  </section>`;
}

/** Fenêtre « J'ai marché ». onSave(marche) doit enregistrer et renvoyer la liste à jour. */
export function saisir({ derniere = null, onSave }){
  let quand = 0;
  let minutes = derniere?.minutes || 20;
  let km = derniere?.km || 0;
  let ressenti = null;
  const s = openSheet({
    title: "J'ai marché",
    body: `<div class="stack" style="--gap:18px">
      <div><div class="field-label" style="font-weight:800;margin-bottom:8px">Quand ?</div>
        <div class="chips">${["Aujourd'hui", "Hier", "Avant-hier"].map((l, i) => `<button class="chip" type="button" data-q="${i}" aria-pressed="${i === 0}">${l}</button>`).join("")}</div></div>
      <div><div style="font-weight:800;margin-bottom:8px">Combien de temps ?</div>
        <div style="display:flex;align-items:center;gap:14px"><button class="btn" type="button" data-m="-">${icon("minus")}</button><strong id="mm" style="font-size:1.6rem;min-width:5em;text-align:center"></strong><button class="btn" type="button" data-m="+">${icon("plus")}</button></div>
        <label class="check" style="margin-top:8px"><input type="checkbox" id="m-non"> Je ne sais pas</label></div>
      <div><div style="font-weight:800;margin-bottom:8px">Quelle distance ? <span class="muted small" style="font-weight:600">(si vous la connaissez)</span></div>
        <div style="display:flex;align-items:center;gap:14px"><button class="btn" type="button" data-k="-">${icon("minus")}</button><strong id="kk" style="font-size:1.6rem;min-width:5em;text-align:center"></strong><button class="btn" type="button" data-k="+">${icon("plus")}</button></div></div>
      <div><div style="font-weight:800;margin-bottom:8px">C'était…</div>
        <div class="chips">${RESSENTIS_MARCHE.map(r => `<button class="chip" type="button" data-r="${r.id}" aria-pressed="false">${r.label}</button>`).join("")}</div></div>
    </div>`,
    foot: `<button class="btn" type="button" data-close>Annuler</button><button class="btn primary" type="button" data-ok>${icon("check")}Enregistrer</button>`
  });
  const el = s.el;
  const maj = () => {
    const non = el.querySelector("#m-non").checked;
    el.querySelector("#mm").textContent = non ? "–" : fmtMin(minutes);
    el.querySelector("#kk").textContent = km ? fmtKm(km) : "–";
    el.querySelectorAll("[data-m]").forEach(b => b.disabled = non);
  };
  const pasM = () => minutes < 10 ? 1 : 5;
  el.querySelectorAll("[data-q]").forEach(b => b.onclick = () => { quand = Number(b.dataset.q); el.querySelectorAll("[data-q]").forEach(x => x.setAttribute("aria-pressed", String(x === b))); });
  el.querySelector('[data-m="-"]').onclick = () => { minutes = Math.max(1, minutes - (minutes <= 10 ? 1 : 5)); maj(); };
  el.querySelector('[data-m="+"]').onclick = () => { minutes = Math.min(600, minutes + pasM()); maj(); };
  el.querySelector('[data-k="-"]').onclick = () => { km = Math.max(0, Math.round((km - .5) * 10) / 10); maj(); };
  el.querySelector('[data-k="+"]').onclick = () => { km = Math.min(100, Math.round((km + .5) * 10) / 10); maj(); };
  el.querySelector("#m-non").onchange = maj;
  el.querySelectorAll("[data-r]").forEach(b => b.onclick = () => { ressenti = ressenti === b.dataset.r ? null : b.dataset.r; el.querySelectorAll("[data-r]").forEach(x => x.setAttribute("aria-pressed", String(x.dataset.r === ressenti))); });
  maj();
  el.querySelector("[data-ok]").onclick = async () => {
    const non = el.querySelector("#m-non").checked;
    if(non && !km){ toast("Indiquez le temps ou la distance.", { type:"err" }); return; }
    const d = new Date(); d.setDate(d.getDate() - quand);
    const m = { type:"marche", jour: isoJour(d), ...(non ? {} : { minutes }), ...(km ? { km } : {}), ...(ressenti ? { ressenti } : {}) };
    const btn = el.querySelector("[data-ok]");
    btn.disabled = true;
    try{
      const res = await onSave(m);
      s.close();
      if(res) bravo(res.lignes);
    }catch(err){
      console.error(err);
      btn.disabled = false;
      toast(navigator.onLine ? "L'enregistrement n'a pas abouti. Réessayez." : "Pas de connexion. Réessayez une fois connecté.", { type:"err" });
    }
  };
}

function bravo(lignes){
  openSheet({
    title: "Bravo !",
    body: `<div style="text-align:center;padding:6px 0 4px">
      <div style="width:76px;height:76px;border-radius:50%;margin:0 auto 14px;display:grid;place-items:center;background:var(--ok);color:#fff;box-shadow:0 0 0 10px var(--ok-soft)">${icon("check")}</div>
      ${lignes.map((l, i) => `<p style="margin:0 0 10px;${i === 0 ? "font-size:1.2rem;font-weight:800" : ""}">${esc(l)}</p>`).join("")}
    </div>`,
    foot: `<button class="btn primary" type="button" data-close>Merci !</button>`
  });
}

/* ---------- Kiné : bloc de la fiche patient ---------- */

export function panelKineHTML(marches, reglage = {}){
  const actif = !!reglage.actif;
  const obj = Number(reglage.objectif) || 0;
  const sems = semaines(marches, 6);
  const max = Math.max(1, ...sems.map(s => s.minutes), obj);
  return `<section class="panel">
    <div class="panel-head"><h2 style="font-size:var(--fs-lg)">${icon("heart", "ic-inline lagon")} Carnet de marches</h2><button class="btn sm" type="button" data-s="mar-reglage">${icon(actif ? "edit" : "plus")}${actif ? "Régler" : "Activer"}</button></div>
    ${actif || marches.length ? `
      <p class="small muted" style="margin-top:0">${actif ? `Activé sur l'accueil du patient${obj ? `, objectif ${esc(fmtMin(obj))} par semaine` : ", sans objectif"}.` : "Désactivé : le patient ne le voit plus."}</p>
      <div style="display:flex;gap:6px;align-items:flex-end;height:90px;margin:8px 0 4px" aria-label="Minutes de marche par semaine">
        ${sems.slice().reverse().map(s => `<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:4px;height:100%;justify-content:flex-end" title="Semaine du ${esc(s.debut.toLocaleDateString("fr-FR", { day:"numeric", month:"short" }))} : ${plural(s.sorties, "sortie")}, ${esc(fmtMin(s.minutes))}${s.km ? `, ${esc(fmtKm(s.km))}` : ""}">
          <span class="small" style="font-weight:700;white-space:nowrap">${s.minutes ? Math.round(s.minutes) : ""}</span>
          <div style="width:100%;max-width:38px;height:${Math.max(3, Math.round(s.minutes / max * 56))}px;border-radius:6px 6px 2px 2px;background:${obj && s.minutes >= obj ? "var(--ok)" : "var(--lagon)"};opacity:${s.sorties ? 1 : .25}"></div>
        </div>`).join("")}
      </div>
      <div style="display:flex;gap:6px" class="small muted">${sems.slice().reverse().map(s => `<span style="flex:1;text-align:center">${esc(s.debut.toLocaleDateString("fr-FR", { day:"numeric", month:"numeric" }))}</span>`).join("")}</div>
      <p class="small muted" style="margin:6px 0 0">Minutes de marche par semaine (semaine du…)${obj ? ", en vert quand l'objectif est atteint" : ""}.</p>
      ${marches.length ? `<div class="sv-list" style="margin-top:12px">${marches.slice(0, 6).map(m => `<div class="sv-row"><div class="sv-main"><strong>${esc(resume(m))}</strong><span class="small muted">${esc(fmtJour(m))}${m.ressenti ? ` · ${esc((RESSENTIS_MARCHE.find(r => r.id === m.ressenti) || {}).label || "")}` : ""}</span></div><button class="icon-btn sm danger" type="button" data-s="mar-del" data-id="${esc(m.id)}" aria-label="Supprimer">${icon("trash")}</button></div>`).join("")}</div>` : `<p class="muted small" style="margin-top:10px">Aucune sortie notée pour l'instant.</p>`}`
    : `<p class="muted small">Le patient note ses sorties à pied (temps et/ou distance) depuis son accueil et reçoit des encouragements. Vous voyez ici ses sorties et ses totaux par semaine.</p>`}
  </section>`;
}

/** Réglage : activer / désactiver, objectif hebdomadaire en minutes (0 = sans objectif). */
export function reglageSheet(reglage = {}, onSave){
  let actif = reglage.actif !== false;
  let obj = Number(reglage.objectif) || 0;
  const s = openSheet({
    title: "Carnet de marches",
    body: `<div class="stack" style="--gap:16px">
      <label class="check"><input type="checkbox" id="mr-on" ${actif ? "checked" : ""}> Afficher le carnet sur l'accueil du patient</label>
      <div><div style="font-weight:800;margin-bottom:8px">Objectif par semaine</div>
        <div style="display:flex;align-items:center;gap:14px"><button class="btn" type="button" data-o="-">${icon("minus")}</button><strong id="mr-o" style="font-size:1.4rem;min-width:7em;text-align:center"></strong><button class="btn" type="button" data-o="+">${icon("plus")}</button></div>
        <p class="small muted" style="margin:8px 0 0">Facultatif. Repère : 150 minutes par semaine pour la santé. Commencez bas si le patient part de loin, puis augmentez.</p></div>
    </div>`,
    foot: `<button class="btn" type="button" data-close>Annuler</button><button class="btn primary" type="button" data-ok>${icon("check")}Enregistrer</button>`
  });
  const maj = () => { s.el.querySelector("#mr-o").textContent = obj ? fmtMin(obj) : "Sans objectif"; };
  s.el.querySelector('[data-o="-"]').onclick = () => { obj = Math.max(0, obj - (obj <= 60 ? 15 : 30)); maj(); };
  s.el.querySelector('[data-o="+"]').onclick = () => { obj = Math.min(1200, obj + (obj < 60 ? 15 : 30)); maj(); };
  maj();
  s.el.querySelector("[data-ok]").onclick = async () => {
    actif = s.el.querySelector("#mr-on").checked;
    try{ await onSave({ actif, objectif: obj }); s.close(); }
    catch(err){ toast("Enregistrement impossible : " + (err.message || err), { type:"err" }); }
  };
}
