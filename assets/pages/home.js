/* Accueil : patient, kiné ou première visite */

import {
  $, esc, icon, appMarkHTML, h, params, store, kineHint, readPatientContext, mountShell, registerSW, toast,
  fmtDate, fmtRelDay, fmtDuree, prenom, sessionDuration, startOfDay, daysFromToday, evaFace, evaColor,
  plural, loadingHTML, emptyHTML, errorHTML, exoImageHTML, normCode, fmtCode, KINE, byWeek, evaTrend,
  ressentiLabel, forgetPatient, logoSrc
} from "../app.js";
import { currentAnnonce, loadSettings } from "../settings.js";
import { exerciseImage } from "../library.js";

const app = $("#app");
registerSW();

/* Accès caché à l'espace kiné : trois appuis rapides sur le logo */
/* Le logo est un lien vers l'accueil : on bloque toujours la navigation
   (on y est déjà), sinon chaque appui rechargeait la page et le compteur
   repartait de zéro. touch-action évite que le double appui zoome. */
function secretLogo(...els){
  let n = 0, t;
  const onTap = e => {
    e.preventDefault();
    n++;
    clearTimeout(t);
    t = setTimeout(() => { n = 0; }, 1000);
    if(n >= 3){ n = 0; location.href = "/login.html"; }
  };
  els.filter(Boolean).forEach(el => {
    el.style.touchAction = "manipulation";
    el.addEventListener("click", onTap);
  });
}

async function main(){
  const ctx = readPatientContext();

  /* Le kiné connecté voit son tableau de bord (sauf en aperçu patient) */
  if(!ctx.apercu && kineHint.get()){
    const { currentKine } = await import("../cloud.js");
    const user = await currentKine().catch(() => null);
    if(user){ return renderKine(user); }
    kineHint.set(false);
  }

  if(ctx.cle) return renderPatient(ctx);
  return renderWelcome();
}

/* =========================================================
   Première visite / code d'accès
   ========================================================= */

function renderWelcome(){
  const legacy = params.get("patient") || store.get("currentPatient");
  document.body.classList.add("welcome-page");
  app.classList.add("no-nav");
  app.innerHTML = `
    <section class="welcome">
      <img class="welcome-logo" src="${esc(logoSrc())}" alt="" id="logo">
      <div class="welcome-head">
        <h1>${esc(KINE.nom)}</h1>
        <p>${esc(KINE.titre)}</p>
      </div>
      ${legacy ? `<div class="notice warn">${icon("info")}<span>L'application a été mise à jour pour mieux protéger vos données. Demandez à votre kiné votre nouveau lien personnel, ou saisissez le code qu'il vous a donné.</span></div>` : ""}
      <div class="panel raised stack" style="--gap:14px">
        <h2 style="font-size:var(--fs-lg)">Accéder à mes exercices</h2>
        <p class="muted">Ouvrez le lien envoyé par votre kiné, scannez le QR code qu'il vous a remis, ou saisissez votre code d'accès.</p>
        <form id="code-form" class="stack" style="--gap:12px" novalidate>
          <label class="sr-only" for="code">Code d'accès</label>
          <input class="input code-input" id="code" autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="XXXX-XXXX-XXXX" maxlength="14" inputmode="text">
          <p class="hint" id="code-msg" role="alert"></p>
          <button class="btn primary big block" type="submit">${icon("key")}Valider mon code</button>
        </form>
      </div>
      <p class="center small faint">Vos données restent privées : seul votre kiné et vous y avez accès.</p>
      <footer class="app-foot" style="margin-top:4px">${appMarkHTML("lg")}<span>L'application de suivi de votre kiné</span></footer>
    </section>`;
  secretLogo($("#logo"));

  const input = $("#code"), msg = $("#code-msg");
  input.addEventListener("input", () => {
    const c = normCode(input.value);
    input.value = fmtCode(c);
    msg.textContent = "";
  });
  $("#code-form").addEventListener("submit", async e => {
    e.preventDefault();
    const c = normCode(input.value);
    if(c.length !== 12){ msg.textContent = "Le code comporte 12 caractères."; input.focus(); return; }
    msg.textContent = "Vérification…";
    try{
      const { getPatient } = await import("../cloud.js");
      const p = await getPatient(c);
      if(!p){ msg.textContent = "Ce code ne correspond à aucun dossier. Vérifiez-le ou demandez-le à votre kiné."; return; }
      store.set("gt_cle", c);
      store.del("currentPatient");
      location.replace("/index.html");
    }catch(err){
      msg.textContent = navigator.onLine ? "Vérification impossible pour le moment. Réessayez." : "Pas de connexion internet.";
    }
  });
}

/* =========================================================
   Accueil patient
   ========================================================= */

/* Annonce du cabinet (Outils → Réglages du cabinet), affichée en haut de l'accueil patient */
function showAnnonce(){
  const box = document.getElementById("annonce");
  if(!box) return;
  const a = currentAnnonce();
  box.innerHTML = a ? `<div class="notice annonce" style="margin-bottom:16px">${icon("bell")}<span>${esc(a.texte).replace(/\n/g, "<br>")}</span></div>` : "";
}

async function renderPatient(ctx){
  mountShell({ role:"patient", active:"accueil", apercu:ctx.apercu });
  secretLogo(...document.querySelectorAll(".brand"));
  const cachedName = store.get("gt_patient_nom", "");
  app.innerHTML = `
    <div class="hello"><p class="date">${esc(fmtDate(new Date()))}</p><h1>Bonjour${cachedName ? " " + esc(prenom(cachedName)) : ""}</h1></div>
    ${loadingHTML()}`;

  let data;
  try{
    const { loadPatient } = await import("../patient.js");
    data = await loadPatient(ctx.cle);
  }catch(err){
    app.querySelector(".loading").outerHTML = errorHTML(err);
    return;
  }
  if(!data){
    if(!ctx.apercu) forgetPatient();
    app.innerHTML = `<section class="welcome">${emptyHTML({ ico:"lock", title:"Ce lien n'est plus valable", text:"Votre kiné a peut-être renouvelé votre accès. Demandez-lui votre nouveau lien ou votre nouveau code." , action:`<a class="btn primary" href="/index.html">Saisir un code</a>`})}</section>`;
    return;
  }

  const { patient, seances, programmes, seules } = data;
  const P = await import("../patient.js");
  const next = P.nextSession(programmes);
  const actif = programmes.find(p => !p.termine) || null;
  const today = startOfDay(new Date());
  const doneToday = seances.filter(s => s.terminee && s.dateValidation && startOfDay(s.dateValidation).getTime() === today.getTime());

  let hero = "";
  if(next){
    const s = next.seance, prog = next.programme;
    byWeek(prog.seances);
    const label = s.label || s.nom;
    const exos = s.data.exercices || [];
    const n = s.datePrevue ? daysFromToday(s.datePrevue) : 0;
    const late = s.datePrevue && n < 0;
    const tag = !s.datePrevue ? "À faire" : late ? `En retard (${fmtDate(s.datePrevue, { weekday:"long", day:"numeric", month:"short" })})` : fmtRelDay(s.datePrevue);
    const thumbs = exos.slice(0, 4).map(e => exoImageHTML(exerciseImage(e), "")).join("") + (exos.length > 4 ? `<span class="more">+${exos.length - 4}</span>` : "");
    const spine = prog.seances.map(x => {
      const cls = x.terminee ? "done" : x.id === s.id ? "now" : (x.datePrevue && new Date(x.datePrevue) < today ? "late" : "");
      return `<i class="${cls}"></i>`;
    }).join("");
    const doneTodayBanner = doneToday.length && !late && n > 0
      ? `<div class="notice ok" style="margin-bottom:14px">${icon("checkCircle")}<span>Séance du jour faite. Bravo ! La prochaine est prévue ${esc(fmtRelDay(s.datePrevue).toLowerCase())}.</span></div>` : "";
    hero = `
      ${doneTodayBanner}
      <section class="hero" aria-labelledby="hero-title">
        <div class="hero-top">
          <span class="tag ${late ? "late" : ""}">${icon(late ? "clock" : "calendar")}${esc(tag)}</span>
          <span class="hero-prog">${esc(prog.nom)}</span>
        </div>
        <h2 class="hero-title" id="hero-title">Séance ${esc(label)}</h2>
        <div class="hero-meta">
          <span>${icon("clock")}${esc(fmtDuree(sessionDuration(s.data)))}</span>
          <span>${icon("dumbbell")}${plural(exos.length, "exercice")}</span>
          ${Number(s.data.series) > 1 ? `<span>${icon("repeat")}${plural(Number(s.data.series), "tour")}</span>` : ""}
        </div>
        <div class="thumbs" aria-hidden="true">${thumbs}</div>
        <button class="btn sun big block" type="button" id="start">${icon("play")}Commencer la séance</button>
        <div class="spine" aria-hidden="true" style="margin-top:18px">${spine}</div>
        <div class="hero-foot"><span>${prog.faites} sur ${prog.total} séances faites</span><span>${prog.pct} %</span></div>
      </section>`;
  }else if(programmes.length && programmes.every(p => p.termine)){
    const last = programmes[0];
    hero = `
      <section class="hero finished">
        <div class="hero-top"><span class="tag">${icon("checkCircle")}Programme terminé</span></div>
        <h2 class="hero-title">Bravo, vous avez terminé « ${esc(last.nom)} »</h2>
        <p style="margin-top:8px;opacity:.92">${last.total} séances réalisées. Envoyez votre bilan à votre kiné pour préparer la suite.</p>
        <div class="btn-row" style="margin-top:18px">
          <button class="btn sun" type="button" id="bilan">${icon("mail")}Envoyer mon bilan</button>
          <a class="btn on-hero" href="/progression.html">${icon("chart")}Voir mes progrès</a>
        </div>
      </section>`;
  }else if(!seules.length){
    hero = `<div class="panel">${emptyHTML({ ico:"calendar", title:"Pas encore de programme", text:"Votre kiné ne vous a pas encore envoyé d'exercices. Ils apparaîtront ici automatiquement." })}</div>`;
  }

  /* Semaine en cours */
  const monday = new Date(today); monday.setDate(today.getDate() - ((today.getDay() + 6) % 7));
  const weekCells = [];
  for(let i = 0; i < 7; i++){
    const d = new Date(monday); d.setDate(monday.getDate() + i);
    const same = x => x && startOfDay(x).getTime() === d.getTime();
    const planned = seances.filter(s => same(s.datePrevue));
    const validated = seances.filter(s => same(s.dateValidation));
    let cls = "", content = d.getDate();
    if(planned.length && planned.every(s => s.terminee) || (!planned.length && validated.length)){ cls = "done"; content = icon("check"); }
    else if(planned.length && d < today){ cls = "missed"; }
    else if(planned.length){ cls = "planned"; }
    if(d.getTime() === today.getTime()) cls += " today";
    const lab = d.toLocaleDateString("fr-FR", { weekday:"short" }).replace(".", "");
    weekCells.push(`<div class="wday ${cls}" title="${esc(fmtDate(d))}"><span class="wl">${esc(lab.charAt(0).toUpperCase() + lab.slice(1))}</span><span class="wn">${content}</span></div>`);
  }

  /* Chiffres clés */
  const reg = P.regularity(actif ? actif.seances : seances);
  const evas = actif ? actif.evas : (programmes[0]?.evas || []);
  const lastEva = evas.length ? evas[evas.length - 1] : null;
  const tr = evaTrend(evas);
  const trendIco = tr ? (tr.dir === "down" ? `<span style="color:var(--ok)" title="En baisse">${icon("trendDown")}</span>` : tr.dir === "up" ? `<span style="color:var(--danger)" title="En hausse">${icon("trendUp")}</span>` : "") : "";

  const kpis = `
    <div class="kpis">
      <div class="kpi"><span class="k-val">${actif ? `${actif.faites}<span class="faint" style="font-size:.7em">/${actif.total}</span>` : seances.filter(s => s.terminee).length}</span><span class="k-lab">séances faites</span></div>
      <div class="kpi"><span class="k-val">${reg === null ? "–" : reg + "<span style='font-size:.6em'>%</span>"}</span><span class="k-lab">de régularité</span></div>
      <div class="kpi"><span class="k-val">${lastEva === null ? "–" : `<img src="${evaFace(lastEva)}" alt="">${lastEva}`}${trendIco}</span><span class="k-lab">douleur récente</span></div>
    </div>`;

  const seulesHTML = seules.length ? `
    <section class="section">
      <div class="section-title">Séances à faire quand vous voulez</div>
      <div class="list">
        ${seules.map(s => `
          <button class="list-item" type="button" data-seule="${esc(s.id)}">
            <span class="li-ico">${icon("play")}</span>
            <span class="li-main"><span class="li-title">${esc(s.data.nom || s.nom || "Séance")}</span><span class="li-sub">${esc(fmtDuree(sessionDuration(s.data)))}, ${plural((s.data.exercices || []).length, "exercice")}${s.terminee ? ", déjà faite" : ""}</span></span>
            <span class="li-end">${icon("chevron")}</span>
          </button>`).join("")}
      </div>
    </section>` : "";

  const futures = seances.filter(s => !s.terminee && s.datePrevue && new Date(s.datePrevue) >= today).length;

  app.innerHTML = `
    <div class="hello"><p class="date">${esc(fmtDate(new Date()))}</p><h1>Bonjour ${esc(prenom(patient.nom))}</h1></div>
    <div id="annonce"></div>
    ${futures && !ctx.apercu && !store.get("gt_rappel_vu", 0) && !(store.get("gt_rappel", null) || {}).actif && "serviceWorker" in navigator ? `
    <div class="notice" id="rp-invite" style="margin-bottom:16px;align-items:center;flex-wrap:wrap">${icon("bell")}<span style="flex:1 1 180px">Recevoir un rappel sur ce téléphone le jour de vos séances ?</span>
      <span style="display:flex;gap:8px"><a class="btn sm primary" href="/reglages.html#rappels">Activer</a><button class="btn sm" type="button" id="rp-later">Non merci</button></span></div>` : ""}
    ${hero}
    <div id="sv-home"></div>
    ${seances.some(s => s.datePrevue) ? `
    <section class="section">
      <div class="section-title">Cette semaine</div>
      <div class="panel tight">
        <div class="week">${weekCells.join("")}</div>
        <div class="legend"><span><i style="background:var(--lagon)"></i>Faite</span><span><i style="box-shadow:inset 0 0 0 2px var(--lagon)"></i>Prévue</span><span><i style="box-shadow:inset 0 0 0 2px var(--danger)"></i>Manquée</span></div>
      </div>
    </section>` : ""}
    ${programmes.length ? `<section class="section">${kpis}</section>` : ""}
    ${seulesHTML}
    <section class="section">
      <div class="list">
        <a class="list-item" href="/cloud.html"><span class="li-ico">${icon("calendar")}</span><span class="li-main"><span class="li-title">Mes programmes</span><span class="li-sub">Toutes les séances, semaine par semaine</span></span><span class="li-end">${icon("chevron")}</span></a>
        <a class="list-item" href="/progression.html"><span class="li-ico">${icon("chart")}</span><span class="li-main"><span class="li-title">Ma progression</span><span class="li-sub">Évolution de la douleur et régularité</span></span><span class="li-end">${icon("chevron")}</span></a>
        <a class="list-item" href="/respir/index.html"><span class="li-ico">${icon("wind")}</span><span class="li-main"><span class="li-title">Respiration guidée</span><span class="li-sub">Pour se détendre, à utiliser librement</span></span><span class="li-end">${icon("chevron")}</span></a>
        ${futures ? `<button class="list-item" type="button" id="agenda"><span class="li-ico">${icon("calendarPlus")}</span><span class="li-main"><span class="li-title">Ajouter à mon agenda</span><span class="li-sub">${plural(futures, "séance")} avec un rappel</span></span><span class="li-end">${icon("chevron")}</span></button>` : ""}
        <button class="list-item" type="button" id="ecrire"><span class="li-ico">${icon("mail")}</span><span class="li-main"><span class="li-title">Écrire à mon kiné</span><span class="li-sub">Une question, une remarque : ${esc(KINE.nom)} la retrouvera dans l'application</span></span><span class="li-end">${icon("chevron")}</span></button>
      </div>
    </section>
    <footer class="app-foot">${appMarkHTML()}</footer>`;
  showAnnonce();
  loadSettings({ force:true }).then(showAnnonce);
  homeSuivi(ctx, patient, seances, actif).catch(e => console.warn("Suivi :", e));

  $("#start")?.addEventListener("click", () => P.launchSeance(next.seance, { cle:ctx.cle, apercu:ctx.apercu }));
  $("#rp-later")?.addEventListener("click", () => { store.set("gt_rappel_vu", 1); $("#rp-invite")?.remove(); });
  $("#ecrire")?.addEventListener("click", () => P.writeToKine({ cle: ctx.cle, apercu: ctx.apercu, patientNom: patient.nom }));
  $("#bilan")?.addEventListener("click", async () => {
    const { promptDialog } = await import("../app.js");
    const rem = await promptDialog({ title:"Envoyer mon bilan", label:"Un mot pour votre kiné ? (facultatif)", multiline:true, confirm:"Envoyer" });
    if(rem === null) return;
    P.bilanMail({ cle: ctx.apercu ? null : ctx.cle, patientNom: patient.nom, programme: programmes[0], remarques: rem });
  });
  app.querySelectorAll("[data-seule]").forEach(b => b.addEventListener("click", () => {
    const s = seules.find(x => x.id === b.dataset.seule);
    P.launchSeance(s, { cle:ctx.cle, apercu:ctx.apercu });
  }));
  $("#agenda")?.addEventListener("click", () => {
    const n = P.downloadCalendar(seances);
    toast(n ? `${plural(n, "séance")} ajoutée${n > 1 ? "s" : ""} au fichier agenda. Ouvrez-le pour l'importer.` : "Aucune séance à venir.", { type: n ? "ok" : "info" });
  });
}

/* =========================================================
   Accueil kiné
   ========================================================= */

async function renderKine(user){
  mountShell({ role:"kine", active:"accueil" });
  app.classList.add("wide");
  app.innerHTML = `
    <div class="hello"><p class="date">${esc(fmtDate(new Date()))}</p><h1>Bonjour ${esc(prenom(KINE.nom))}</h1></div>
    <div id="inbox-banner"></div>
    <div class="tiles">
      <button class="tile main" type="button" id="t-new">${`<span class="t-ico">${icon("userPlus")}</span>`}<strong>Nouveau patient</strong><span class="t-sub">Dossier et lien d'accès</span></button>
      <a class="tile" href="/config.html?nouveau=1"><span class="t-ico">${icon("edit")}</span><strong>Créer un programme</strong><span class="t-sub">Pour un patient</span></a>
      <a class="tile" href="/patients.html"><span class="t-ico">${icon("users")}</span><strong>Mes patients</strong><span class="t-sub">Suivi et alertes</span></a>
      <a class="tile" href="/config.html?libre=1"><span class="t-ico">${icon("zap")}</span><strong>Mode libre</strong><span class="t-sub">Minuteur immédiat</span></a>
      <a class="tile" href="/programmes_admin.html"><span class="t-ico">${icon("layers")}</span><strong>Modèles</strong><span class="t-sub">Pathologies, post-op, prévention</span></a>
      <a class="tile" href="/exercises/glossary.html"><span class="t-ico">${icon("book")}</span><strong>Exercices</strong><span class="t-sub">Bibliothèque complète</span></a>
      <a class="tile" href="/programmescourse.html"><span class="t-ico">${icon("run")}</span><strong>Reprise de course</strong><span class="t-sub">Générateur</span></a>
      <a class="tile" href="/respir/index.html"><span class="t-ico">${icon("wind")}</span><strong>Respiration</strong><span class="t-sub">RespiR</span></a>
      <a class="tile" href="/admin_tools.html"><span class="t-ico">${icon("settings")}</span><strong>Outils et réglages</strong><span class="t-sub">Cabinet, sauvegarde, aide</span></a>
    </div>
    <div class="kine-cols section">
      <section><div class="section-title">À surveiller</div><div id="watch">${loadingHTML()}</div></section>
      <section><div class="section-title">Activité récente</div><div id="activity">${loadingHTML()}</div></section>
    </div>
    <footer class="app-foot">${appMarkHTML()}</footer>`;

  const { newPatientSheet, accessSheet } = await import("../kine-ui.js");
  $("#t-new").onclick = async () => {
    const p = await newPatientSheet();
    if(p){ accessSheet(p); }
  };

  try{
    const C = await import("../cloud.js");
    const K = await import("../kine.js");
    const M = await import("../messages.js");
    const [patients, seances, messages] = await Promise.all([C.listPatients(), C.listAllSeances(), C.listAllMessages().catch(() => [])]);
    const sums = K.summarizeAll(patients, seances);
    const inbox = M.buildInbox({ patients, messages, seances });
    const unread = inbox.filter(i => !i.lu);
    M.setUnreadCache(unread.length);
    if(unread.length){
      const who = [...new Set(unread.map(i => i.patient.nom))];
      $("#inbox-banner").innerHTML = `<a class="inbox-banner" href="/messages.html">
        <span class="t-ico">${icon("inbox")}</span>
        <span class="li-main"><strong>${unread.length} message${unread.length > 1 ? "s" : ""} non lu${unread.length > 1 ? "s" : ""}</strong>
        <span class="small">De ${esc(who.slice(0, 3).join(", "))}${who.length > 3 ? ` et ${who.length - 3} autre${who.length > 4 ? "s" : ""}` : ""}</span></span>
        <span class="btn sm primary">Lire</span></a>`;
    }
    const watch = sums.filter(s => s.alertes.some(a => a.niveau === "danger" || a.niveau === "warn")).sort((a, b) => b.score - a.score).slice(0, 8);

    if(!patients.length){
      $("#watch").innerHTML = `<div class="panel">${emptyHTML({ ico:"users", title:"Aucun patient pour l'instant", text:"Créez un patient, ou importez vos anciens programmes depuis les outils.", action:`<a class="btn primary" href="/admin_tools.html#migration">${icon("upload")}Importer mes anciens programmes</a>` })}</div>`;
    }else if(!watch.length){
      $("#watch").innerHTML = `<div class="panel">${emptyHTML({ ico:"checkCircle", title:"Rien à signaler", text:"Aucun patient ne présente de douleur forte, de retard ou de difficulté." })}</div>`;
    }else{
      $("#watch").innerHTML = `<div class="list">${watch.map(s => `
        <a class="list-item alert-row" href="/cloud.html?patient=${encodeURIComponent(s.patient.cle)}">
          <span class="avatar">${esc(initials(s.patient.nom))}</span>
          <span class="li-main"><span class="li-title">${esc(s.patient.nom)}</span>
            <span class="li-sub">${s.alertes.filter(a => a.niveau !== "ok").map(a => `<span class="badge ${a.niveau === "danger" ? "danger" : a.niveau === "warn" ? "warn" : "lagon"}">${icon(a.ico)}${esc(a.texte)}</span>`).join("")}</span>
          </span>
          <span class="li-end">${icon("chevron")}</span>
        </a>`).join("")}</div>`;
    }

    const act = K.recentActivity(patients, seances, 8);
    $("#activity").innerHTML = act.length ? `<div class="list">${act.map(({ seance:s, patient:p }) => `
      <a class="list-item" href="/cloud.html?patient=${encodeURIComponent(p.cle)}" style="align-items:flex-start">
        <span class="avatar">${esc(initials(p.nom))}</span>
        <span class="li-main">
          <span class="li-title">${esc(p.nom)}</span>
          <span class="li-sub">${esc(s.programmeNom || s.data?.nom || "Séance")}, ${esc(fmtRelDay(s.dateValidation).toLowerCase())}</span>
          ${s.commentaire ? `<div class="quote">${esc(s.commentaire)}</div>` : ""}
        </span>
        <span class="li-end stack" style="--gap:4px;align-items:flex-end">
          ${s.eva !== undefined && s.eva !== null ? `<span class="eva-pill"><i style="background:${evaColor(s.eva)}"></i>${esc(s.eva)}/10</span>` : ""}
          ${s.ressenti ? `<span class="badge">${esc(ressentiLabel(s.ressenti))}</span>` : ""}
        </span>
      </a>`).join("")}</div>` : `<div class="panel">${emptyHTML({ ico:"history", title:"Pas encore d'activité", text:"Les séances validées par vos patients apparaîtront ici." })}</div>`;
  }catch(err){
    console.error(err);
    $("#watch").innerHTML = errorHTML(err);
    $("#activity").innerHTML = "";
  }
}

function initials(nom){
  return String(nom || "?").split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join("");
}

main();

/* ---------- À faire, encouragements et fiches conseils (accueil patient) ---------- */
async function homeSuivi(ctx, patient, seances, actif){
  const box = document.getElementById("sv-home");
  if(!box) return;
  const S = await import("../suivi.js");
  const { CONSEILS_FOURNIS } = await import("../conseils-data.js");
  const C = await import("../cloud.js");
  const needQ = (patient.questionnaires || []).length > 0;
  const [suivis, questionnaires, perso] = await Promise.all([
    (patient.objectifs || []).length || needQ ? C.listSuivis(ctx.cle).catch(() => []) : [],
    needQ ? C.listQuestionnaires().catch(() => []) : [],
    (patient.conseils || []).length ? C.listConseils().catch(() => []) : []
  ]);
  const todo = S.todoList(patient, suivis, questionnaires);
  const streak = S.streakMessage(S.weekStreak(actif ? actif.seances : seances));
  const resolve = id => perso.find(c => c.remplace === id) || perso.find(c => c.id === id) || CONSEILS_FOURNIS.find(c => c.id === id);
  const fiches = (patient.conseils || []).map(id => ({ id, c: resolve(id) })).filter(x => x.c);
  box.innerHTML = `
    ${streak ? `<div class="streak section">${icon("starFill")}<span>${esc(streak)}</span></div>` : ""}
    ${todo.length ? `<section class="section"><div class="section-title">À faire pour votre kiné</div>
      <div class="list">${todo.map(t => `<a class="list-item" href="${t.href}"><span class="li-ico" style="background:var(--soleil-soft);color:var(--soleil-strong)">${icon(t.ico)}</span><span class="li-main"><span class="li-title">${esc(t.titre)}</span><span class="li-sub">${esc(t.sous)}</span></span><span class="li-end">${icon("chevron")}</span></a>`).join("")}</div></section>` : ""}
    ${fiches.length ? `<section class="section"><div class="section-title">Conseils de votre kiné<span class="spacer"></span>${fiches.length > 3 ? `<a class="btn sm ghost" href="/conseils.html">Tout voir</a>` : ""}</div>
      <div class="list">${fiches.slice(0, 3).map(({ id, c }) => `<a class="list-item" href="/conseils.html?id=${encodeURIComponent(id)}"><span class="li-ico">${icon(c.ico || "book")}</span><span class="li-main"><span class="li-title">${esc(c.titre)}</span><span class="li-sub">${esc(c.resume || "")}</span></span><span class="li-end">${icon("chevron")}</span></a>`).join("")}</div></section>` : ""}`;
}
