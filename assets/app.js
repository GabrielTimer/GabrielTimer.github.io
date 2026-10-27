/* =========================================================
   Outils communs à toutes les pages
   ========================================================= */

import { icon } from "./icons.js";
import { KINE, SITE_URL } from "./config.js";
import { settings, logoSrc } from "./settings.js";

export { icon, KINE, SITE_URL, settings, logoSrc };
export { APP_NAME } from "./config.js";
import { APP_NAME as _APP } from "./config.js";

/** Signature discrète de l'application : logo + nom. */
export function appMarkHTML(extra = ""){
  return `<span class="app-mark ${extra}"><img src="/icon-192.png" alt="" width="18" height="18"><span>${_APP}</span></span>`;
}

/* ---------- DOM ---------- */

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

export function esc(v){
  return String(v ?? "").replace(/[&<>"']/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c]));
}

/** Crée un élément à partir d'un HTML. */
export function h(html){
  const t = document.createElement("template");
  t.innerHTML = html.trim();
  return t.content.firstElementChild;
}

/** HTML « riche » venant de nos fichiers d'exercices : on ne garde que quelques balises sûres. */
export function safeRich(html){
  const allowed = new Set(["P","OL","UL","LI","B","STRONG","I","EM","BR"]);
  const t = document.createElement("template");
  t.innerHTML = String(html || "");
  const walk = node => {
    Array.from(node.childNodes).forEach(ch => {
      if(ch.nodeType === 1){
        if(!allowed.has(ch.tagName)){
          const frag = document.createDocumentFragment();
          while(ch.firstChild) frag.appendChild(ch.firstChild);
          ch.replaceWith(frag);
          walk(node);
          return;
        }
        Array.from(ch.attributes).forEach(a => ch.removeAttribute(a.name));
        walk(ch);
      }else if(ch.nodeType !== 3){
        ch.remove();
      }
    });
  };
  walk(t.content);
  return t.innerHTML;
}

export const params = new URLSearchParams(location.search);

export function debounce(fn, ms = 200){
  let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
}

export function vibrate(pattern){
  try{ if(navigator.vibrate) navigator.vibrate(pattern); }catch(e){}
}

/* ---------- Stockage local sûr ---------- */

export const store = {
  get(key, fallback = null){
    try{
      const v = localStorage.getItem(key);
      if(v === null) return fallback;
      try{ return JSON.parse(v); }catch(e){ return v; }
    }catch(e){ return fallback; }
  },
  set(key, value){
    try{ localStorage.setItem(key, typeof value === "string" ? value : JSON.stringify(value)); }catch(e){}
  },
  del(...keys){ keys.forEach(k => { try{ localStorage.removeItem(k); }catch(e){} }); }
};

export const session = {
  get(key, fallback = null){
    try{ const v = sessionStorage.getItem(key); return v === null ? fallback : JSON.parse(v); }catch(e){ return fallback; }
  },
  set(key, value){ try{ sessionStorage.setItem(key, JSON.stringify(value)); }catch(e){} },
  del(key){ try{ sessionStorage.removeItem(key); }catch(e){} }
};

/* ---------- Thème et confort de lecture ---------- */

export function applyPrefs(){
  const theme = store.get("gt_theme", "auto");
  if(theme === "auto") document.documentElement.removeAttribute("data-theme");
  else document.documentElement.setAttribute("data-theme", theme);
  if(store.get("gt_text") === "large") document.documentElement.setAttribute("data-text", "large");
  else document.documentElement.removeAttribute("data-text");
}
applyPrefs();

export function isDark(){
  const t = document.documentElement.getAttribute("data-theme");
  if(t) return t === "dark";
  return matchMedia("(prefers-color-scheme: dark)").matches;
}

export function toggleTheme(){
  store.set("gt_theme", isDark() ? "light" : "dark");
  applyPrefs();
}

/* ---------- Qui utilise l'application ? ---------- */

const CODE_ALPHABET = /[^23456789ABCDEFGHJKLMNPQRSTUVWXYZ]/g;

export function normCode(v){
  return String(v || "").toUpperCase().replace(CODE_ALPHABET, "").slice(0, 12);
}

export function fmtCode(c){
  return (c || "").replace(/(.{4})(?=.)/g, "$1-");
}

export function accessLink(cle){
  return `${SITE_URL}/?acces=${cle}`;
}

/**
 * Contexte patient de l'onglet.
 *  - ?acces=CODE  : le patient ouvre le lien reçu → mémorisé sur l'appareil
 *  - ?apercu=CODE : le kiné regarde l'application comme le patient (cet onglet seulement)
 */
export function readPatientContext(){
  const acces = params.get("acces");
  if(acces){
    const c = normCode(acces);
    if(c.length === 12){
      store.set("gt_cle", c);
      session.del("gt_apercu");
    }
  }
  const apercu = params.get("apercu");
  if(apercu){
    const c = normCode(apercu);
    if(c.length === 12) session.set("gt_apercu", c);
  }
  const ap = session.get("gt_apercu");
  if(ap) return { cle: ap, apercu: true };
  const cle = store.get("gt_cle");
  return { cle: typeof cle === "string" && cle.length === 12 ? cle : null, apercu: false };
}

export function forgetPatient(){
  store.del("gt_cle", "gt_patient_nom", "gt_patient_cache");
}

export function leaveApercu(){
  session.del("gt_apercu");
  window.close();
  setTimeout(() => { location.href = "/patients.html"; }, 150);
}

/** Indice local (non sécurisé) pour savoir s'il faut attendre la connexion kiné. */
export const kineHint = {
  get: () => store.get("gt_kine") === 1 || store.get("gt_kine") === "1",
  set: v => v ? store.set("gt_kine", 1) : store.del("gt_kine")
};

/* ---------- Mise en forme ---------- */

const DAY = 86400000;

export function startOfDay(d){
  const x = new Date(d); x.setHours(0, 0, 0, 0); return x;
}

export function daysFromToday(d){
  return Math.round((startOfDay(d) - startOfDay(new Date())) / DAY);
}

export function fmtDate(d, opts = { weekday:"long", day:"numeric", month:"long" }){
  if(!d) return "";
  const s = new Date(d).toLocaleDateString("fr-FR", opts);
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function fmtShortDate(d){
  return fmtDate(d, { day:"numeric", month:"short" });
}

export function fmtRelDay(d){
  const n = daysFromToday(d);
  if(n === 0) return "Aujourd'hui";
  if(n === 1) return "Demain";
  if(n === -1) return "Hier";
  if(n > 1 && n < 7) return fmtDate(d, { weekday:"long" });
  if(n < 0) return `Il y a ${-n} jours`;
  return `Dans ${n} jours`;
}

export function fmtDuree(sec){
  sec = Math.max(0, Math.round(sec || 0));
  if(sec < 60) return `${sec} s`;
  const m = Math.round(sec / 60);
  if(m < 60) return `${m} min`;
  const hh = Math.floor(m / 60), mm = m % 60;
  return mm ? `${hh} h ${String(mm).padStart(2, "0")}` : `${hh} h`;
}

export function fmtClock(sec){
  sec = Math.max(0, Math.ceil(sec));
  const m = Math.floor(sec / 60), s = sec % 60;
  return m ? `${m}:${String(s).padStart(2, "0")}` : String(s);
}

export function fmtNum(n){ return (Math.round(Number(n) * 10) / 10).toLocaleString("fr-FR"); }

export function plural(n, one, many){ return `${n} ${n > 1 ? (many || one + "s") : one}`; }

export function prenom(nom){
  const p = String(nom || "").trim().split(/[\s_]+/)[0] || "";
  return p.split("-").map(x => x.charAt(0).toUpperCase() + x.slice(1).toLowerCase()).join("-");
}

/* ---------- Douleur (EVA) ---------- */

export const EVA_LABELS = [
  "Aucune douleur", "Très légère", "Légère", "Légère à modérée", "Modérée",
  "Modérée", "Assez forte", "Forte", "Très forte", "Intense", "Insupportable"
];

export function evaColor(v){
  if(v === null || v === undefined || v === "") return "var(--ink-3)";
  v = Number(v);
  if(v <= 1) return "var(--eva-0)";
  if(v <= 3) return "var(--eva-2)";
  if(v <= 5) return "var(--eva-4)";
  if(v <= 7) return "var(--eva-6)";
  if(v <= 8) return "var(--eva-8)";
  return "var(--eva-10)";
}

export function evaFace(v){
  const step = Math.max(0, Math.min(5, Math.floor(Number(v || 0) / 2)));
  return `/images/eva/${step}.png`;
}

export const RESSENTIS = [
  { id:"facile",  label:"Trop facile" },
  { id:"adapte",  label:"Bien dosé" },
  { id:"difficile", label:"Difficile" },
  { id:"trop_dur", label:"Trop dur" }
];
export const ressentiLabel = id => (RESSENTIS.find(r => r.id === id) || {}).label || "";

/* ---------- Programmes ---------- */

/** Durée d'une séance (en secondes). */
export function sessionDuration(prog){
  if(!prog || !Array.isArray(prog.exercices)) return 0;
  /* Même calcul que le minuteur : chaque répétition = effort + repos, sauf le tout dernier repos. */
  const series = Math.max(1, Number(prog.series) || 1);
  let t = 0;
  prog.exercices.forEach(e => {
    const reps = Math.max(1, Number(e.reps) || 1);
    t += reps * ((Number(e.ex) || 0) + (Number(e.repos) || 0));
  });
  const last = prog.exercices[prog.exercices.length - 1];
  t = t * series - (last ? Number(last.repos) || 0 : 0);
  return Math.max(0, Math.round(t));
}

/** Regroupe les séances d'un patient par programme. */
export function groupProgrammes(seances){
  const groupes = new Map();
  const seules = [];
  seances.forEach(s => {
    if(s.programmeId){
      if(!groupes.has(s.programmeId)) groupes.set(s.programmeId, []);
      groupes.get(s.programmeId).push(s);
    }else{
      seules.push(s);
    }
  });
  const programmes = Array.from(groupes.values()).map(list => {
    list.sort((a, b) => new Date(a.datePrevue || 0) - new Date(b.datePrevue || 0) || (a.semaine || 0) - (b.semaine || 0));
    const faites = list.filter(s => s.terminee).length;
    const premier = list[0];
    const evas = list.filter(s => s.terminee && s.eva !== null && s.eva !== undefined && s.eva !== "")
      .sort((a, b) => (a.dateValidation || 0) - (b.dateValidation || 0))
      .map(s => Number(s.eva)).filter(n => !Number.isNaN(n));
    const prochaine = list.find(s => !s.terminee) || null;
    return {
      id: premier.programmeId,
      nom: premier.programmeNom || premier.data?.nom || "Programme",
      categorie: premier.categorie || premier.data?.categorie || "kine",
      seances: list,
      total: list.length,
      faites,
      pct: list.length ? Math.round(faites * 100 / list.length) : 0,
      termine: faites === list.length,
      evas,
      prochaine,
      debut: premier.datePrevue || premier.dateDebut || null,
      fin: list[list.length - 1].datePrevue || null,
      updatedAt: Math.max(...list.map(s => s.updatedAt || s.createdAt || 0))
    };
  });
  programmes.sort((a, b) => (a.termine - b.termine) || (b.updatedAt - a.updatedAt));
  seules.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
  return { programmes, seules };
}

/** Les séances d'un programme, rangées par semaine avec un nom S1A, S1B… */
export function byWeek(seances){
  const weeks = new Map();
  seances.forEach(s => {
    const w = Number(s.semaine) || 1;
    if(!weeks.has(w)) weeks.set(w, []);
    weeks.get(w).push(s);
  });
  const letters = "ABCDEFG";
  return Array.from(weeks.entries()).sort((a, b) => a[0] - b[0]).map(([w, list]) => {
    list.sort((a, b) => new Date(a.datePrevue || 0) - new Date(b.datePrevue || 0));
    list.forEach((s, i) => { s.label = s.categorie === "course" && s.nom ? s.nom : `S${w}${letters[i] || i + 1}`; });
    return { semaine: w, seances: list, faites: list.filter(s => s.terminee).length };
  });
}

export function evaTrend(evas){
  if(!evas || evas.length < 2) return null;
  const n = Math.min(3, Math.floor(evas.length / 2)) || 1;
  const debut = evas.slice(0, n).reduce((a, b) => a + b, 0) / n;
  const fin = evas.slice(-n).reduce((a, b) => a + b, 0) / n;
  const delta = Math.round((fin - debut) * 10) / 10;
  return { debut, fin, delta, dir: delta <= -1 ? "down" : delta >= 1 ? "up" : "flat" };
}

/* ---------- Historique et favoris (sur l'appareil) ---------- */

export const localProgs = {
  all(){
    const v = store.get("programmes", []);
    return Array.isArray(v) ? v : [];
  },
  save(list){ store.set("programmes", list); },
  forPatient(type, patientKey){
    return this.all().map((p, index) => ({ ...p, _i: index }))
      .filter(p => p.type === type && (p.patientId || "admin") === patientKey);
  },
  add(entry){
    const all = this.all();
    all.unshift({ uid: Date.now().toString(36) + Math.random().toString(36).slice(2, 6), ...entry });
    const hist = all.filter(p => p.type === "historique").slice(0, 60);
    const autres = all.filter(p => p.type !== "historique");
    this.save([...hist, ...autres]);
  },
  removeAt(index){
    const all = this.all(); all.splice(index, 1); this.save(all);
  }
};

/* ---------- Ressenti : stockage de la séance en cours ---------- */

export const RUN_KEY = "programme_temp";

export function setRunProgram(prog){ store.set(RUN_KEY, prog); }
export function getRunProgram(){ return store.get(RUN_KEY, null); }

/* ---------- Notifications à l'écran ---------- */

let toastBox;
export function toast(message, { type = "info", action = null, duration = 3600 } = {}){
  if(!toastBox){
    toastBox = h(`<div class="toasts" role="status" aria-live="polite"></div>`);
    document.body.appendChild(toastBox);
  }
  const ico = type === "ok" ? "checkCircle" : type === "err" ? "alert" : "info";
  const el = h(`<div class="toast ${type}">${icon(ico)}<span class="t-msg">${esc(message)}</span></div>`);
  let timer;
  const close = () => { clearTimeout(timer); el.classList.add("out"); setTimeout(() => el.remove(), 200); };
  if(action){
    const b = h(`<button type="button">${esc(action.label)}</button>`);
    b.onclick = () => { close(); action.run(); };
    el.appendChild(b);
  }
  toastBox.appendChild(el);
  timer = setTimeout(close, action ? Math.max(duration, 6000) : duration);
  return close;
}

/* ---------- Fenêtres de dialogue ---------- */

/**
 * Ouvre une feuille de dialogue.
 * contenu : HTML du corps ; foot : HTML des boutons.
 * Renvoie { el, close, body }.
 */
export function openSheet({ title = "", body = "", foot = "", wide = false, tall = false, onClose = null } = {}){
  const dlg = h(`<dialog class="sheet ${wide ? "wide" : ""} ${tall ? "tall" : ""}" aria-label="${esc(title)}">
    <div class="sheet-head"><h2>${esc(title)}</h2><button class="icon-btn" type="button" data-close aria-label="Fermer">${icon("close")}</button></div>
    <div class="sheet-body"></div>
    ${foot ? `<div class="sheet-foot"></div>` : ""}
  </dialog>`);
  const bodyEl = dlg.querySelector(".sheet-body");
  if(typeof body === "string") bodyEl.innerHTML = body; else if(body) bodyEl.appendChild(body);
  if(foot){
    const f = dlg.querySelector(".sheet-foot");
    if(typeof foot === "string") f.innerHTML = foot; else f.appendChild(foot);
  }
  document.body.appendChild(dlg);
  let closed = false;
  const close = (val) => {
    if(closed) return; closed = true;
    try{ dlg.close(); }catch(e){}
    dlg.remove();
    if(onClose) onClose(val);
  };
  dlg.addEventListener("cancel", e => { e.preventDefault(); close(); });
  dlg.addEventListener("click", e => {
    if(e.target === dlg) close();
    if(e.target.closest("[data-close]")) close();
  });
  dlg.showModal();
  return { el: dlg, body: bodyEl, close };
}

export function confirmDialog({ title = "Confirmer", message = "", confirm = "Confirmer", cancel = "Annuler", danger = false } = {}){
  return new Promise(resolve => {
    let answered = false;
    const s = openSheet({
      title,
      body: `<p class="muted">${esc(message)}</p>`,
      foot: `<button class="btn" type="button" data-no>${esc(cancel)}</button><button class="btn ${danger ? "danger solid" : "primary"}" type="button" data-yes>${esc(confirm)}</button>`,
      onClose: () => { if(!answered) resolve(false); }
    });
    s.el.querySelector("[data-no]").onclick = () => { answered = true; resolve(false); s.close(); };
    s.el.querySelector("[data-yes]").onclick = () => { answered = true; resolve(true); s.close(); };
    setTimeout(() => s.el.querySelector("[data-yes]").focus(), 30);
  });
}

export function promptDialog({ title = "", label = "", value = "", placeholder = "", confirm = "Valider", multiline = false } = {}){
  return new Promise(resolve => {
    let answered = false;
    const field = multiline
      ? `<textarea class="textarea" id="pd-in" placeholder="${esc(placeholder)}">${esc(value)}</textarea>`
      : `<input class="input" id="pd-in" value="${esc(value)}" placeholder="${esc(placeholder)}">`;
    const s = openSheet({
      title,
      body: `<div class="field">${label ? `<label for="pd-in">${esc(label)}</label>` : ""}${field}</div>`,
      foot: `<button class="btn" type="button" data-close>Annuler</button><button class="btn primary" type="button" data-yes>${esc(confirm)}</button>`,
      onClose: () => { if(!answered) resolve(null); }
    });
    const input = s.el.querySelector("#pd-in");
    const ok = () => { answered = true; resolve(input.value); s.close(); };
    s.el.querySelector("[data-yes]").onclick = ok;
    if(!multiline) input.addEventListener("keydown", e => { if(e.key === "Enter") ok(); });
    setTimeout(() => { input.focus(); input.select?.(); }, 30);
  });
}

/* ---------- Coque de l'application (barre du haut + navigation) ---------- */

const NAV = {
  patient: [
    { id:"accueil", label:"Accueil", href:"/index.html", ico:"home" },
    { id:"programmes", label:"Programmes", href:"/cloud.html", ico:"calendar" },
    { id:"progression", label:"Progrès", href:"/progression.html", ico:"chart" }
  ],
  kine: [
    { id:"accueil", label:"Accueil", href:"/index.html", ico:"home" },
    { id:"patients", label:"Patients", href:"/patients.html", ico:"users" },
    { id:"creer", label:"Créer", href:"/config.html?nouveau=1", ico:"plus" },
    { id:"bibliotheque", label:"Exercices", href:"/exercises/glossary.html", ico:"book" },
    { id:"outils", label:"Modèles", href:"/programmes_admin.html", ico:"layers" }
  ]
};

/**
 * Installe la barre du haut et la navigation.
 * opts : { role:"patient"|"kine"|"none", active, title, back, actions }
 */
export function mountShell({ role = "none", active = "", title = "", back = null, actions = "", apercu = false } = {}){
  const body = document.body;
  if(!document.title.includes(_APP)) document.title = document.title ? `${document.title} – ${_APP}` : _APP;
  const main = $("main") || h(`<main class="page"></main>`);
  const shell = h(`<div class="shell"></div>`);
  const brand = `<a class="brand" href="/index.html" aria-label="Accueil">
      <img src="${esc(logoSrc())}" alt="" width="34" height="34">
      <span class="brand-text"><span class="brand-name">${esc(KINE.nom)}</span><span class="brand-sub">${esc(KINE.sousTitre || "")}</span></span>
    </a>`;

  const left = back
    ? `<a class="icon-btn" href="${esc(back)}" aria-label="Retour" data-back>${icon("back")}</a>${title ? `<div class="topbar-title">${esc(title)}</div>` : ""}`
    : (title ? `<div class="topbar-title">${esc(title)}</div>` : brand);

  const themeBtn = `<button class="icon-btn" type="button" data-theme-toggle aria-label="Changer de thème">${icon(isDark() ? "sun" : "moon")}</button>`;
  const topbar = h(`<header class="topbar">${left}<div class="spacer"></div><div class="topbar-actions">${actions}${themeBtn}</div></header>`);

  if(apercu){
    body.prepend(h(`<div class="apercu-band">${icon("eye")}<span>Aperçu : vous voyez l'application comme votre patient</span><button type="button" data-leave-apercu>Quitter</button></div>`));
  }

  main.parentNode ? main.replaceWith(shell) : null;
  shell.appendChild(topbar);
  shell.appendChild(main);
  body.appendChild(shell);

  const items = NAV[role];
  if(items){
    body.classList.add("has-nav");
    const foot = role === "kine"
      ? `<div class="nav-foot">
          <a class="nav-link" href="/admin_tools.html"><span class="nav-ico">${icon("wrench")}</span><span>Outils</span></a>
          <a class="nav-link" href="/aide.html"><span class="nav-ico">${icon("info")}</span><span>Aide</span></a>
          <div class="nav-app">${appMarkHTML()}</div>
        </div>`
      : `<div class="nav-foot">
          <a class="nav-link" href="/reglages.html"><span class="nav-ico">${icon("settings")}</span><span>Réglages</span></a>
          <div class="nav-app">${appMarkHTML()}</div>
        </div>`;
    const nav = h(`<nav class="nav" aria-label="Navigation principale">
      <a class="nav-brand brand" href="/index.html"><img src="${esc(logoSrc())}" alt="" width="40" height="40"><span class="brand-text"><span class="brand-name">${esc(KINE.nom)}</span><span class="brand-sub">${esc(KINE.sousTitre || "")}</span></span></a>
      ${items.map(it => `<a class="nav-link" href="${it.href}" ${it.id === active ? 'aria-current="page"' : ""}><span class="nav-ico">${icon(it.ico)}</span><span>${it.label}</span></a>`).join("")}
      ${foot}
    </nav>`);
    body.appendChild(nav);
  }else{
    main.classList.add("no-nav");
  }

  topbar.querySelector("[data-theme-toggle]").onclick = e => {
    toggleTheme();
    e.currentTarget.innerHTML = icon(isDark() ? "sun" : "moon");
    document.dispatchEvent(new CustomEvent("themechange"));
  };
  const backBtn = topbar.querySelector("[data-back]");
  if(backBtn && back === "history"){
    backBtn.setAttribute("href", "#");
    backBtn.onclick = e => { e.preventDefault(); history.length > 1 ? history.back() : (location.href = "/index.html"); };
  }
  const leave = $("[data-leave-apercu]");
  if(leave) leave.onclick = leaveApercu;

  const onScroll = () => topbar.classList.toggle("scrolled", scrollY > 4);
  addEventListener("scroll", onScroll, { passive:true });
  onScroll();
  return { main, topbar };
}

/* ---------- États d'affichage ---------- */

export function loadingHTML(text = "Chargement…"){
  return `<div class="loading"><div class="spinner"></div><span>${esc(text)}</span></div>`;
}

export function emptyHTML({ ico = "info", title = "", text = "", action = "" } = {}){
  return `<div class="empty"><div class="e-ico">${icon(ico)}</div>${title ? `<h3>${esc(title)}</h3>` : ""}${text ? `<p>${esc(text)}</p>` : ""}${action}</div>`;
}

export function errorHTML(err, retry = true){
  const offline = !navigator.onLine;
  const msg = offline
    ? "Pas de connexion internet. Vérifiez votre réseau puis réessayez."
    : (err && /permission|insufficient/i.test(err.message || err.code || ""))
      ? "Accès refusé. Votre lien n'est peut-être plus valable : demandez-en un nouveau à votre kiné."
      : "Le chargement n'a pas abouti. Réessayez dans un instant.";
  return `<div class="notice danger">${icon("alert")}<div class="stack" style="--gap:8px"><span>${esc(msg)}</span>${retry ? `<div><button class="btn sm" type="button" onclick="location.reload()">Réessayer</button></div>` : ""}</div></div>`;
}

/* ---------- Image d'exercice avec repli ---------- */

export function exoImageHTML(src, alt = "", cls = "", style = ""){
  const ph = `<div class='ph-img ${cls}' style='${style}'>${icon("body").replace(/"/g, "'")}</div>`;
  if(!src) return `<div class="ph-img ${cls}" style="${style}">${icon("body")}</div>`;
  return `<img class="exo-img ${cls}" style="${style}" src="${esc(src)}" alt="${esc(alt)}" loading="lazy" decoding="async" onerror="this.outerHTML=&quot;${ph}&quot;">`;
}

/* ---------- Enregistrement du service worker ---------- */

export function registerSW(){
  if(!("serviceWorker" in navigator)) return;
  if(location.hostname === "localhost" || location.hostname === "127.0.0.1") return;
  navigator.serviceWorker.register("/sw.js").then(reg => {
    reg.addEventListener("updatefound", () => {
      const w = reg.installing;
      if(!w) return;
      w.addEventListener("statechange", () => {
        if(w.state === "installed" && navigator.serviceWorker.controller){
          toast("Une nouvelle version est disponible.", { action:{ label:"Mettre à jour", run:() => { w.postMessage("skipWaiting"); } } });
        }
      });
    });
  }).catch(() => {});
  let reloaded = false;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if(reloaded) return; reloaded = true; location.reload();
  });
}
