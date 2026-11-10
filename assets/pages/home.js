/* Accueil : patient, kiné ou première visite */

import {
  $, esc, icon, appMarkHTML, h, params, store, kineHint, readPatientContext, mountShell, registerSW, toast,
  fmtDate, fmtRelDay, fmtDuree, prenom, sessionDuration, startOfDay, daysFromToday, evaFace, evaColor,
  plural, loadingHTML, emptyHTML, errorHTML, exoImageHTML, normCode, fmtCode, KINE, byWeek, evaTrend,
  ressentiLabel, forgetPatient, logoSrc
} from "../app.js";
import { currentAnnonce, loadSettings, settings as reglages } from "../settings.js";
import { exerciseImage } from "../library.js";
import * as Hor from "../horaires.js";
import * as V from "../variantes.js";
import { nomAffiche } from "../noms.js";
import * as Installer from "../installer.js";

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
          <button class="btn block" type="button" id="code-paste" hidden>${icon("copy")}Coller mon lien ou mon code</button>
        </form>
      </div>
      <p class="center small faint">Vos données restent privées : seul votre kiné et vous y avez accès.</p>
      <footer class="app-foot" style="margin-top:4px">${appMarkHTML("lg")}<span>L'application de suivi de votre kiné</span><a class="small" href="/confidentialite.html">Vos données personnelles</a></footer>
    </section>`;
  secretLogo($("#logo"));

  const input = $("#code"), msg = $("#code-msg");
  /* Application installée (surtout iPhone) : le lien a été copié avant l'installation. */
  if("clipboard" in navigator && navigator.clipboard.readText){
    const bp = $("#code-paste"); bp.hidden = false;
    bp.onclick = async () => {
      const c = await Installer.lireCodeCopie();
      if(!c){ msg.textContent = "Aucun code trouvé. Copiez le lien reçu de votre kiné, puis réessayez."; return; }
      input.value = fmtCode(c);
      $("#code-form").requestSubmit();
    };
  }
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

function horairesHTML(h){
  const st = Hor.etat(h);
  return `<div class="list-item hor"><span class="li-ico">${icon("clock")}</span><span class="li-main">
    <span class="li-title">${icon("clock")}Horaires</span>
    <span class="hor-etat ${st.cls}">${esc(st.texte)}</span>
    ${Hor.tableauHTML(h)}
  </span></div>`;
}

/* Coordonnées du cabinet (Outils → Réglages du cabinet), en bas de l'accueil patient */
function showCabinet(){
  const box = document.getElementById("cabinet");
  if(!box) return;
  const c = reglages.cabinet || {};
  const tel = String(c.telephone || "").trim();
  const adr = String(c.adresse || "").trim();
  const hor = Hor.renseignes(c.horaires);
  const item = (href, ico, title, sub, ext) => `<a class="list-item" href="${esc(href)}"${ext ? ' target="_blank" rel="noopener"' : ""}><span class="li-ico">${icon(ico)}</span><span class="li-main"><span class="li-title">${title}</span><span class="li-sub">${sub}</span></span><span class="li-end">${icon("chevron")}</span></a>`;
  box.innerHTML = `
    <section class="section">
      <div class="section-title">Le cabinet</div>
      <div class="list">
        ${tel ? item("tel:" + tel.replace(/[^\d+]/g, ""), "call", esc(tel), "Appeler le cabinet") : ""}
        ${hor ? horairesHTML(c.horaires) : ""}
        ${adr ? item("https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(adr.replace(/\s*\n\s*/g, ", ")), "pin", esc(adr).replace(/\n/g, "<br>"), "Voir sur la carte, itinéraire", true) : ""}
        ${item("/cabinet.html", "home", "Page du cabinet", "Coordonnées, horaires et photos, à partager à vos proches", true)}
        ${item("/confidentialite.html", "lock", "Vos données personnelles", "Ce qui est enregistré, qui y a accès, vos droits")}
      </div>
    </section>`;
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
  /* Hors ligne : les images des séances à venir sont mises de côté sur le téléphone */
  try{
    const aVenir = [...programmes.filter(p => !p.termine).flatMap(p => p.seances), ...(seules || [])].filter(s => !s.terminee);
    const urls = [...new Set(aVenir.flatMap(s => (s.data?.exercices || []).map(e => exerciseImage(e))).filter(Boolean))];
    if(urls.length && navigator.serviceWorker?.controller) navigator.serviceWorker.controller.postMessage({ type:"precache-media", urls });
  }catch(e){ console.warn("Hors ligne :", e); }
  if(!navigator.onLine) toast("Pas de réseau : vos exercices restent disponibles. Votre séance sera enregistrée au retour du réseau.", { duration:6000 });
  const next = P.nextSession(programmes);
  try{ V.setContextePatient?.(ctx.cle, patient.genre, (next?.seance || programmes.find(p => !p.termine)?.seances?.[0] || seules?.[0])?.data, patient.genreMaj); }catch(e){ console.warn("Illustrations :", e); }
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

  /* Séances libres (sans dates) : même présentation que les séances programmées. */
  const vignettes = (exos, n = 4) => exos.slice(0, n).map(e => exoImageHTML(exerciseImage(e), "")).join("") + (exos.length > n ? `<span class="more">+${exos.length - n}</span>` : "");
  const seuleHero = s => {
    const exos = s.data.exercices || [];
    return `
      <section class="hero" aria-labelledby="hero-${esc(s.id)}">
        <div class="hero-top">
          <span class="tag">${icon(s.terminee ? "checkCircle" : "play")}${s.terminee ? "Déjà faite, à refaire quand vous voulez" : "À faire quand vous voulez"}</span>
        </div>
        <h2 class="hero-title" id="hero-${esc(s.id)}">${esc(s.data.nom || s.nom || "Séance")}</h2>
        <div class="hero-meta">
          <span>${icon("clock")}${esc(fmtDuree(sessionDuration(s.data)))}</span>
          <span>${icon("dumbbell")}${plural(exos.length, "exercice")}</span>
          ${Number(s.data.series) > 1 ? `<span>${icon("repeat")}${plural(Number(s.data.series), "tour")}</span>` : ""}
        </div>
        <div class="thumbs" aria-hidden="true">${vignettes(exos)}</div>
        <button class="btn sun big block" type="button" data-seule="${esc(s.id)}">${icon("play")}Commencer la séance</button>
      </section>`;
  };
  const seuleCarte = s => {
    const exos = s.data.exercices || [];
    return `
      <button class="seule-card" type="button" data-seule="${esc(s.id)}">
        <span class="sc-head"><span class="sc-title">${esc(s.data.nom || s.nom || "Séance")}</span><span class="sc-play">${icon("play")}</span></span>
        <span class="sc-sub">${esc(fmtDuree(sessionDuration(s.data)))}, ${plural(exos.length, "exercice")}${s.terminee ? ", déjà faite" : ""}</span>
        <span class="sc-thumbs" aria-hidden="true">${vignettes(exos, 5)}</span>
      </button>`;
  };
  // Pas de séance programmée : la première séance libre prend la place de la grande carte.
  const seuleEnTete = !next && !hero && seules.length ? seules[0] : null;
  if(seuleEnTete) hero = seuleHero(seuleEnTete);
  const autresSeules = seules.filter(s => s !== seuleEnTete);
  const seulesHTML = autresSeules.length ? `
    <section class="section">
      <div class="section-title">${seuleEnTete ? "Autres séances à faire quand vous voulez" : "Séances à faire quand vous voulez"}</div>
      <div class="seule-grid">${autresSeules.map(seuleCarte).join("")}</div>
    </section>` : "";

  const futures = seances.filter(s => !s.terminee && s.datePrevue && new Date(s.datePrevue) >= today).length;

  app.innerHTML = `
    <div class="hello"><p class="date">${esc(fmtDate(new Date()))}</p><h1>Bonjour ${esc(prenom(patient.nom))}</h1></div>
    <div id="inst-slot"></div>
    <div id="annonce"></div>
    <div id="msg-kine"></div>
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
        ${futures ? `<button class="list-item" type="button" id="agenda"><span class="li-ico">${icon("calendarPlus")}</span><span class="li-main"><span class="li-title">Ajouter à mon agenda</span><span class="li-sub">${plural(futures, "séance")} avec un rappel</span></span><span class="li-end">${icon("chevron")}</span></button>
        <button class="list-item" type="button" id="gagenda"><span class="li-ico">${icon("calendar")}</span><span class="li-main"><span class="li-title">Ajouter à Google Agenda</span><span class="li-sub">les jours de séance, jusqu'à la fin du programme</span></span><span class="li-end">${icon("chevron")}</span></button>` : ""}
        <button class="list-item" type="button" id="ecrire"><span class="li-ico">${icon("mail")}</span><span class="li-main"><span class="li-title">Écrire à mon kiné</span><span class="li-sub">Une question, une remarque : ${esc(KINE.nom)} la retrouvera dans l'application</span></span><span class="li-end">${icon("chevron")}</span></button>
      </div>
    </section>
    <div id="cabinet"></div>
    <footer class="app-foot">${appMarkHTML()}</footer>`;
  showAnnonce();
  showCabinet();
  loadSettings({ force:true }).then(() => { showAnnonce(); showCabinet(); });
  if(!ctx.apercu) messagesDuKine(ctx, patient).catch(e => console.warn("Messages :", e));
  homeSuivi(ctx, patient, seances, actif).catch(e => console.warn("Suivi :", e));

  $("#start")?.addEventListener("click", () => P.launchSeance(next.seance, { cle:ctx.cle, apercu:ctx.apercu }));
  $("#rp-later")?.addEventListener("click", () => { store.set("gt_rappel_vu", 1); $("#rp-invite")?.remove(); });
  if(!ctx.apercu){ try{ Installer.proposerInstallation(ctx.cle, $("#inst-slot")); }catch(e){ console.warn("Installation :", e); } }
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
  $("#gagenda")?.addEventListener("click", () => {
    const g = P.googleCalendarUrl(seances);
    if(!g){ toast("Aucune séance à venir.", { type:"info" }); return; }
    window.open(g.url, "_blank", "noopener");
  });
  $("#agenda")?.addEventListener("click", () => {
    const n = P.downloadCalendar(seances);
    toast(n ? `${plural(n, "séance")} ajoutée${n > 1 ? "s" : ""} au fichier agenda. Ouvrez-le pour l'importer.` : "Aucune séance à venir.", { type: n ? "ok" : "info" });
  });
}

/* =========================================================
   Accueil kiné
   ========================================================= */

/* Rappel de sauvegarde : plus de 30 jours sans « Tout sauvegarder » (Réglages du cabinet → Sauvegarde).
   « Plus tard » le cache 7 jours sur cet appareil. */
const SAUVEGARDE_JOURS = 30;
function rappelSauvegarde(){
  const show = () => {
    const box = document.getElementById("backup-banner");
    if(!box) return;
    const last = Math.max(Number(store.get("gt_last_backup", 0)) || 0, Number(reglages.sauvegarde?.derniere || 0));
    const jours = last ? Math.floor((Date.now() - last) / 86400000) : null;
    const snooze = Number(store.get("gt_backup_snooze", 0)) || 0;
    if((jours !== null && jours < SAUVEGARDE_JOURS) || Date.now() < snooze){ box.innerHTML = ""; return; }
    box.innerHTML = `<div class="inbox-banner backup-banner">
      <span class="t-ico">${icon("download")}</span>
      <span class="li-main"><strong>${jours === null ? "Aucune sauvegarde enregistrée" : `Dernière sauvegarde il y a ${jours} jours`}</strong>
      <span class="small">Gardez une copie de vos données sur l'ordinateur ou une clé USB.</span></span>
      <span style="display:flex;gap:8px;flex:none"><a class="btn sm primary" href="/reglages_cabinet.html#backup">Sauvegarder</a><button class="btn sm" type="button" id="bk-later">Plus tard</button></span></div>`;
    box.querySelector("#bk-later").onclick = () => { store.set("gt_backup_snooze", Date.now() + 7 * 86400000); box.innerHTML = ""; };
  };
  show();
  loadSettings({ force:true }).then(show).catch(() => {});
}

async function renderKine(user){
  mountShell({ role:"kine", active:"accueil" });
  app.classList.add("wide");
  app.innerHTML = `
    <div class="hello"><p class="date">${esc(fmtDate(new Date()))}</p><h1 id="hello-nom">Bonjour ${esc(prenom(KINE.nom))}</h1></div>
    <div id="inbox-banner"></div>
    <div id="backup-banner"></div>
    <div class="tiles">
      <button data-tile="nouveau" class="tile main" type="button" id="t-new">${`<span class="t-ico">${icon("userPlus")}</span>`}<strong>Nouveau patient</strong><span class="t-sub">Dossier et lien d'accès</span></button>
      <a data-tile="libre" class="tile" href="/config.html?libre=1"><span class="t-ico">${icon("zap")}</span><strong>Mode libre</strong><span class="t-sub">Minuteur immédiat</span></a>
      <a data-tile="course" class="tile" href="/programmescourse.html"><span class="t-ico">${icon("run")}</span><strong>Reprise de course</strong><span class="t-sub">Générateur</span></a>
      <a data-tile="ressources" class="tile" href="/ressources.html"><span class="t-ico">${icon("library")}</span><strong>Ressources</strong><span class="t-sub">Tests, nerfs, questionnaires, modèles, fiches</span></a>
      <a data-tile="respir" class="tile" href="/respir/index.html"><span class="t-ico">${icon("wind")}</span><strong>Respiration</strong><span class="t-sub">RespiR</span></a>
      <a data-tile="outils" class="tile" href="/admin_tools.html"><span class="t-ico">${icon("settings")}</span><strong>Outils et réglages</strong><span class="t-sub">Cabinet, statistiques, corbeille, aide</span></a>
    </div>
    <section class="section" id="jour-sec" hidden><div class="section-title">Aujourd'hui<span class="badge" id="jour-n"></span></div><div id="jour"></div></section>
    <section class="section" id="evol-sec" hidden><div class="section-title">À faire évoluer<span class="badge" id="evol-n"></span></div><div id="evol"></div></section>
    <div class="kine-cols section">
      <section><div class="section-title">À surveiller</div><div id="watch">${loadingHTML()}</div></section>
      <section><div class="section-title">Activité récente</div><div id="activity">${loadingHTML()}</div></section>
    </div>
    <footer class="app-foot">${appMarkHTML()}</footer>`;

  import("../tiles-reorder.js").then(R => {
    const S = import("../settings.js");
    const ctl = R.enableTileReorder(document.querySelector(".tiles"), {
      key: "gt_home_tiles_kine",
      load: () => reglages.accueil?.tuiles,
      save: ids => S.then(m => m.saveSettings({ accueil: { tuiles: ids } }))
    });
    // Ordre changé sur un autre appareil : reprise des réglages à jour
    loadSettings({ force: true }).then(st => { const ids = st?.accueil?.tuiles; if(ids?.length) ctl?.refresh(ids); }).catch(() => {});
  }).catch(() => {});
  /* Compte du titulaire ou compte autorisé (remplaçant, associé) */
  import("../cloud.js").then(C => {
    if(C.estTitulaire()){ C.migrerKine().catch(e => console.warn("Migration :", e)); rappelSauvegarde(); return; }
    const h = document.getElementById("hello-nom"); if(h) h.textContent = "Bonjour " + prenom(C.monNom());
    document.querySelectorAll('[data-tile="outils"] .t-sub').forEach(x => { x.textContent = "Affichage, aide"; });
  });
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
    const inbox = M.buildInbox({ patients: patients.filter(C.estSien), messages, seances });
    const unread = inbox.filter(i => !i.lu);
    M.setUnreadCache(unread.length);
    /* Retour sur l'accueil (bouton précédent) : remettre le chiffre à jour */
    addEventListener("pageshow", e => { if(e.persisted) M.refreshUnread({ force:true }); });
    if(unread.length){
      const who = [...new Set(unread.map(i => i.patient.nom))];
      $("#inbox-banner").innerHTML = `<a class="inbox-banner" href="/messages.html">
        <span class="t-ico">${icon("inbox")}</span>
        <span class="li-main"><strong>${unread.length} message${unread.length > 1 ? "s" : ""} non lu${unread.length > 1 ? "s" : ""}</strong>
        <span class="small">De ${esc(who.slice(0, 3).join(", "))}${who.length > 3 ? ` et ${who.length - 3} autre${who.length > 4 ? "s" : ""}` : ""}</span></span>
        <span class="btn sm primary">Lire</span></a>`;
    }
    const watch = sums.filter(s => s.alertes.some(a => a.niveau === "danger" || a.niveau === "warn")).sort((a, b) => b.score - a.score).slice(0, 8);
    afficherEvolutions(C, sums).catch(e => console.warn("Évolution :", e));
    afficherAujourdhui(C, patients, sums).catch(e => console.warn("Aujourd'hui :", e));

    if(!patients.length){
      $("#watch").innerHTML = `<div class="panel">${emptyHTML({ ico:"users", title:"Aucun patient pour l'instant", text:"Créez un patient, ou importez vos anciens programmes depuis les outils.", action:`<a class="btn primary" href="/admin_tools.html#migration">${icon("upload")}Importer mes anciens programmes</a>` })}</div>`;
    }else if(!watch.length){
      $("#watch").innerHTML = `<div class="panel">${emptyHTML({ ico:"checkCircle", title:"Rien à signaler", text:"Aucun patient ne présente de douleur forte, de retard ou de difficulté." })}</div>`;
    }else{
      $("#watch").innerHTML = `<div class="list">${watch.map(s => `
        <a class="list-item alert-row" href="/cloud.html?patient=${encodeURIComponent(s.patient.cle)}">
          <span class="avatar">${esc(initials(s.patient.nom))}</span>
          <span class="li-main"><span class="li-title">${esc(nomAffiche(s.patient.nom))}</span>
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
  const [suivis, perso, IM] = await Promise.all([
    C.listSuivis(ctx.cle).catch(() => []),
    C.listConseils().catch(() => []),
    import("../info-mois.js")
  ]);
  /* L'info kiné du mois (Réglages du cabinet) */
  const duMois = IM.afficheDuMois(IM.affiches(perso), reglages.infoMois);
  /* Questionnaires déjà remplis : le patient peut réimprimer ses réponses (sans score) */
  const remplis = suivis.filter(x => x.type === "questionnaire" && Array.isArray(x.reponses)).sort((a, b) => (b.date || 0) - (a.date || 0));
  const questionnaires = needQ || remplis.length ? await C.listQuestionnaires().catch(() => []) : [];
  const todo = S.todoList(patient, suivis, questionnaires);
  const streak = S.streakMessage(S.weekStreak(actif ? actif.seances : seances));
  const resolve = id => perso.find(c => c.remplace === id) || perso.find(c => c.id === id) || CONSEILS_FOURNIS.find(c => c.id === id);
  const fiches = (patient.conseils || []).map(id => ({ id, c: resolve(id) })).filter(x => x.c);
  /* Carnet de marches : activé par le kiné dans la fiche patient */
  const M = patient.marche?.actif ? await import("../marches.js") : null;
  let marches = M ? M.marchesDe(suivis) : [];
  box.innerHTML = `
    ${M ? `<div id="mar-box">${M.sectionHTML(marches, patient.marche)}</div>` : ""}
    ${streak ? `<div class="streak section">${icon("starFill")}<span>${esc(streak)}</span></div>` : ""}
    ${todo.length ? `<section class="section"><div class="section-title">À faire pour votre kiné</div>
      <div class="list">${todo.map(t => `<a class="list-item" href="${t.href}"><span class="li-ico" style="background:var(--soleil-soft);color:var(--soleil-strong)">${icon(t.ico)}</span><span class="li-main"><span class="li-title">${esc(t.titre)}</span><span class="li-sub">${esc(t.sous)}</span></span><span class="li-end">${icon("chevron")}</span></a>`).join("")}</div></section>` : ""}
    ${duMois ? `<section class="section"><div class="section-title">L'info kiné de ${esc(IM.NOM_MOIS())}</div>
      <a class="info-mois" href="/conseils.html?id=${encodeURIComponent(IM.idFiche(duMois))}">
        <img src="${esc(duMois.affiche)}" alt="" loading="lazy">
        <span class="li-main"><span class="li-title">${esc(duMois.titre)}</span><span class="li-sub">${esc(duMois.resume || "")}</span><span class="btn sm" style="align-self:flex-start;margin-top:8px">${icon("eye")}Voir l'affiche</span></span>
      </a></section>` : ""}
    ${remplis.length ? `<section class="section"><div class="section-title">Mes questionnaires remplis</div>
      <div class="list">${remplis.slice(0, 6).map((r, i) => `<button class="list-item" type="button" data-qpdf="${i}" style="width:100%;text-align:left;font:inherit;color:inherit;border:0;cursor:pointer"><span class="li-ico">${icon("list")}</span><span class="li-main"><span class="li-title">${esc(r.nom || questionnaires.find(q => q.id === r.qid)?.nom || "Questionnaire")}</span><span class="li-sub">Rempli le ${esc(new Date(r.date).toLocaleDateString("fr-FR", { day:"numeric", month:"long", year:"numeric" }))} · imprimer mes réponses</span></span><span class="li-end">${icon("print")}</span></button>`).join("")}</div>
      <p class="small muted" style="margin-top:8px">Un PDF avec votre score, les questions et vos réponses, à montrer à un autre soignant si vous le souhaitez.</p></section>` : ""}
    ${fiches.length ? `<section class="section"><div class="section-title">Conseils de votre kiné<span class="spacer"></span>${fiches.length > 3 ? `<a class="btn sm ghost" href="/conseils.html">Tout voir</a>` : ""}</div>
      <div class="list">${fiches.slice(0, 3).map(({ id, c }) => `<a class="list-item" href="/conseils.html?id=${encodeURIComponent(id)}"><span class="li-ico">${icon(c.ico || "book")}</span><span class="li-main"><span class="li-title">${esc(c.titre)}</span><span class="li-sub">${esc(c.resume || "")}</span></span><span class="li-end">${icon("chevron")}</span></a>`).join("")}</div></section>` : ""}`;

  if(M){
    const lierMarche = () => {
      box.querySelector('[data-marche="add"]')?.addEventListener("click", () => M.saisir({
        derniere: marches[0] || null,
        onSave: async m => {
          if(ctx.apercu){ toast("Aperçu : la sortie n'est pas enregistrée."); return null; }
          const id = await C.addSuivi(ctx.cle, m);
          const nouvelle = { ...m, id, date: Date.now() };
          marches = M.marchesDe([...marches, nouvelle]);
          box.querySelector("#mar-box").innerHTML = M.sectionHTML(marches, patient.marche);
          lierMarche();
          return { lignes: M.encouragement(nouvelle, marches, Number(patient.marche.objectif) || 0) };
        }
      }));
    };
    lierMarche();
  }
  box.querySelectorAll("[data-qpdf]").forEach(b => b.addEventListener("click", async () => {
    const r = remplis[Number(b.dataset.qpdf)];
    const q = questionnaires.find(x => x.id === r.qid) || await C.getQuestionnaire(r.qid).catch(() => null);
    if(!q?.items?.length){ toast("Ce questionnaire n'existe plus : impossible de refaire la feuille.", { type:"err" }); return; }
    b.disabled = true;
    try{
      const Q = await import("../questionnaire-pdf.js");
      await Q.partagerPdf(await Q.questionnairePdf(q, r.reponses, { patient: patient.nom || "", date: new Date(r.date), score: r.score ?? null, sousScores: r.sousScores || null }), q.nom);
    }catch(err){ toast(err.message || "Le PDF n'a pas pu être créé.", { type:"err" }); }
    finally{ b.disabled = false; }
  }));
}

/* ---------- Messages du kiné au patient ---------- */
async function messagesDuKine(ctx, patient){
  const box = document.getElementById("msg-kine"); if(!box) return;
  const C = await import("../cloud.js");
  const all = await C.listMessages(ctx.cle);
  const recus = all.filter(m => m.de === "kine");
  if(!recus.length) return;
  const nonLus = recus.filter(m => !m.lu);
  const dernier = recus[0];
  box.innerHTML = `<button class="notice ${nonLus.length ? "" : "soft"}" type="button" id="mk-open" style="width:100%;text-align:left;margin-bottom:16px;cursor:pointer;border:0;font:inherit;color:inherit">
    ${icon("mail")}<span style="flex:1"><strong>${nonLus.length ? (nonLus.length > 1 ? `${nonLus.length} nouveaux messages de votre kiné` : "Nouveau message de votre kiné") : "Messages de votre kiné"}</strong><br><span class="small">${esc(String(dernier.texte).slice(0, 90))}${String(dernier.texte).length > 90 ? "…" : ""}</span></span>${icon("chevron")}</button>`;
  document.getElementById("mk-open").onclick = async () => {
    const { openSheet } = await import("../app.js");
    const fil = all.filter(m => m.de === "kine" || m.type === "message").slice().sort((a, b) => (a.date || 0) - (b.date || 0)).slice(-20);
    const s = openSheet({
      title: "Messages avec votre kiné",
      body: `<div class="stack" style="--gap:10px">${fil.map(m => `<div style="max-width:88%;${m.de === "kine" ? "" : "margin-left:auto;"}padding:10px 12px;border-radius:var(--r-md);background:${m.de === "kine" ? "var(--surface-2)" : "var(--lagon-soft, var(--surface-2))"}">
        <div class="small muted">${m.de === "kine" ? "Votre kiné" : "Vous"} · ${esc(new Date(m.date).toLocaleDateString("fr-FR", { day:"numeric", month:"short" }))}</div>
        <div style="white-space:pre-wrap">${esc(m.texte)}</div></div>`).join("")}</div>`,
      foot: `<button class="btn" type="button" data-close>Fermer</button><button class="btn primary" type="button" id="mk-rep">${icon("send")}Répondre</button>`
    });
    s.el.querySelector("#mk-rep").onclick = async () => { s.close(); const P = await import("../patient.js"); P.writeToKine({ cle: ctx.cle, apercu: ctx.apercu, patientNom: patient.nom, sujet: dernier.sujet ? `Re: ${dernier.sujet.replace(/^Re: /, "")}` : "" }); };
    await Promise.all(nonLus.map(m => C.setMessageLu(ctx.cle, m.id, true).catch(() => {})));
    nonLus.forEach(m => m.lu = true);
    box.querySelector(".notice")?.classList.add("soft");
  };
}


/* ---------- Tableau de bord du matin : bilans à refaire, programmes qui se terminent, questionnaires reçus ---------- */
async function afficherAujourdhui(C, patients, sums){
  const [bilans, suivis, T] = await Promise.all([
    C.listAllBilans ? C.listAllBilans().catch(() => []) : [],
    C.listAllSuivis().catch(() => []),
    import("../bilan-traitement.js")
  ]);
  const J = 864e5, now = Date.now(), today = startOfDay(new Date()).getTime();
  const parCle = Object.fromEntries(patients.map(p => [p.cle, p]));
  const actifs = new Set(sums.filter(sm => sm.programmes.some(pr => !pr.termine)).map(sm => sm.patient.cle));
  const fmtJ = t => new Date(t).toLocaleDateString("fr-FR", { weekday:"short", day:"numeric", month:"short" });
  const items = [];

  /* Bilans à refaire : dernier bilan (non final) + délai de réévaluation prévu */
  const derniers = {};
  bilans.filter(b => b.etat && parCle[b.cle]).forEach(b => { if(!derniers[b.cle] || String(b.date) > String(derniers[b.cle].date)) derniers[b.cle] = b; });
  Object.values(derniers).forEach(b => {
    if(b.etat.type === "final" || !actifs.has(b.cle)) return;
    let sem = 6; try{ sem = (b.etat.tx?.init ? T.profil(b.etat) : T.profilAuto(b.etat)).reeval || 6; }catch(e){}
    const [y, m, d] = String(b.date).split("-").map(Number);
    const due = new Date(y, m - 1, d).getTime() + sem * 7 * J;
    if(due > today + 7 * J) return;
    const retard = Math.round((today - due) / J);
    items.push({ ordre: retard > 0 ? 0 : 1, cle:b.cle, ico:"stethoscope", couleur: retard > 7 ? "var(--warn)" : "var(--lagon-strong)",
      titre:"Bilan intermédiaire à faire", sub: retard > 0 ? `prévu le ${fmtJ(due)}, ${retard} jour${retard > 1 ? "s" : ""} de retard` : `prévu ${retard === 0 ? "aujourd'hui" : "le " + fmtJ(due)}`,
      href:`/bilan.html?patient=${encodeURIComponent(b.cle)}` });
  });
  /* Patients avec un programme en cours mais sans bilan */
  actifs.forEach(cle => {
    const p = parCle[cle];
    if(derniers[cle] || !p || (p.createdAt && p.createdAt < now - 60 * J)) return;
    items.push({ ordre:3, cle, ico:"stethoscope", couleur:"var(--ink-3)", titre:"Pas encore de bilan", sub:"programme en cours", href:`/bilan.html?patient=${encodeURIComponent(cle)}` });
  });
  /* Programmes qui se terminent dans les 7 jours */
  sums.forEach(sm => sm.programmes.filter(pr => !pr.termine).forEach(pr => {
    const fin = Math.max(...pr.seances.map(x => x.datePrevue ? new Date(x.datePrevue).getTime() : 0));
    if(!fin || fin < today || fin > today + 7 * J) return;
    items.push({ ordre:2, cle:sm.patient.cle, ico:"calendar", couleur:"var(--lagon-strong)", titre:`Programme qui se termine ${startOfDay(new Date(fin)).getTime() === today ? "aujourd'hui" : "le " + fmtJ(fin)}`,
      sub:`${pr.nom} · ${pr.faites}/${pr.total} séances : prévoir la suite`, href:`/cloud.html?patient=${encodeURIComponent(sm.patient.cle)}` });
  }));
  /* Questionnaires remplis ces 7 derniers jours */
  suivis.filter(x => x.type === "questionnaire" && x.date >= now - 7 * J && parCle[x.cle]).sort((a, b) => b.date - a.date).forEach(x => {
    items.push({ ordre:4, cle:x.cle, ico:"list", couleur:"var(--ok)", titre:`Questionnaire rempli : ${x.nom || "questionnaire"}`,
      sub:`${x.score != null ? `score ${String(x.score).replace(".", ",")}${x.unite || ""}, ` : ""}${fmtRelDay(x.date).toLowerCase()}`, href:`/cloud.html?patient=${encodeURIComponent(x.cle)}` });
  });

  items.sort((a, b) => a.ordre - b.ordre);
  const sec = document.getElementById("jour-sec"), box = document.getElementById("jour");
  if(!sec || !box) return;
  sec.hidden = !items.length;
  document.getElementById("jour-n").textContent = items.length || "";
  const max = 8, html = it => `
    <a class="list-item" href="${it.href}">
      <span class="li-ico" style="color:${it.couleur}">${icon(it.ico)}</span>
      <span class="li-main"><span class="li-title">${esc(nomAffiche(parCle[it.cle]?.nom || ""))} · ${esc(it.titre)}</span><span class="li-sub">${esc(it.sub)}</span></span>
      <span class="li-end">${icon("chevron")}</span>
    </a>`;
  box.innerHTML = `<div class="list">${items.slice(0, max).map(html).join("")}</div>${items.length > max ? `<details class="g-more" style="margin-top:8px"><summary class="btn sm ghost">Voir les ${items.length - max} autres</summary><div class="list" style="margin-top:8px">${items.slice(max).map(html).join("")}</div></details>` : ""}`;
}

/* ---------- Programmes à faire évoluer (proposés, validés par le kiné) ---------- */
async function afficherEvolutions(C, sums){
  const E = await import("../faire-evoluer.js");
  const modeles = await E.chargerModeles(C);
  const items = [];
  sums.forEach(sm => sm.programmes.forEach(prog => {
    const p = E.proposer(prog, modeles);
    if(p) items.push({ sm, prog, p });
  }));
  const ordre = { alleger:0, monter:1, fin:2 };
  items.sort((a, b) => ordre[a.p.type] - ordre[b.p.type]);
  const sec = document.getElementById("evol-sec"), box = document.getElementById("evol");
  if(!sec || !box) return;
  const paint = () => {
    sec.hidden = !items.length;
    document.getElementById("evol-n").textContent = items.length || "";
    box.innerHTML = `<div class="list">${items.map(({ sm, prog, p }, i) => `
      <button class="list-item" type="button" data-evi="${i}">
        <span class="li-ico" style="color:${p.type === "alleger" ? "var(--warn)" : p.type === "monter" ? "var(--ok)" : "var(--lagon-strong)"}">${icon(p.type === "alleger" ? "trendDown" : p.type === "monter" ? "trendUp" : "checkCircle")}</span>
        <span class="li-main"><span class="li-title">${esc(sm.patient.nom)} · ${esc(p.titre)}</span><span class="li-sub">${esc(prog.nom)} — ${esc(E.changementTexte(p) || p.raison)}</span></span>
        <span class="li-end">${icon("chevron")}</span>
      </button>`).join("")}</div>`;
    box.querySelectorAll("[data-evi]").forEach(b => b.onclick = () => {
      const it = items[+b.dataset.evi];
      const retirer = () => { items.splice(items.indexOf(it), 1); paint(); };
      E.valider(C, it.sm.patient.cle, it.prog, it.p, { onDone: retirer, onIgnore: retirer });
    });
  };
  paint();
}
