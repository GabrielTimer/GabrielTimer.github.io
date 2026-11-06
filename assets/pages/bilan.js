/* Bilan kiné d'un patient : saisie, enregistrement automatique, PDF, envoi.
   URL : /bilan.html?patient=CODE (nouveau bilan) ou ?patient=CODE&id=ID (bilan existant).
   Les bilans sont dans la collection Firestore « bilans », réservée au compte kiné. */

import {
  $, $$, esc, icon, params, store, mountShell, registerSW, toast, confirmDialog, openSheet,
  errorHTML, emptyHTML, debounce, evaColor, evaFace
} from "../app.js";
import { nomAffiche } from "../noms.js";

const app = $("#app");
registerSW();

const { requireKine } = await import("../kine.js");
await requireKine();
const C = await import("../cloud.js");
const B = await import("../bilan-core.js");
const TC = await import("../tests-catalogue.js");
const BC = await import("../bodychart.js");
const RC = await import("../bilan-recap.js");
{ const st = document.createElement("style"); st.textContent = BC.BODY_CSS + RC.RECAP_CSS; document.head.append(st); }

const cle = params.get("patient");
let id = params.get("id") || null;
if(!cle) location.replace("/patients.html");
const fiche = `/cloud.html?patient=${encodeURIComponent(cle)}`;

/* ---------- Photos (enregistrées seulement sur cet appareil) ---------- */

const PH = await import("../bilan-photos.js");
function badgePhotos(n){ $$("[data-ph-n]").forEach(x => { x.textContent = n; x.hidden = !n; }); }
async function majPhotos(){ badgePhotos(await PH.nombre(patient, S)); }
function ouvrirPhotosBilan(){ PH.ouvrirPhotos({ patient, S, label: B.typeLabel(S.type), onChange: badgePhotos, save: () => changed() }); }

/* ---------- Chargement ---------- */

let patient = null, list = [], rulesErr = null, K;
if(typeof C.listBilans !== "function"){
  mountShell({ role:"kine", active:"patients", back:fiche });
  app.innerHTML = `<div class="notice warn">${icon("alert")}<div class="stack" style="--gap:8px"><span>Une mise à jour de l'application vient d'être publiée et votre navigateur garde encore l'ancienne version d'un fichier.</span><div><button class="btn sm" type="button" onclick="location.reload(true)">Recharger la page</button></div></div></div>`;
  throw new Error("version");
}
try{
  [patient, K] = await Promise.all([C.getPatient(cle, { fiche:true }), B.loadClinic()]);
  list = await C.listBilans(cle).catch(err => { rulesErr = err; return []; });
}catch(err){
  console.error(err);
  mountShell({ role:"kine", active:"patients", back:fiche });
  app.innerHTML = errorHTML(err);
  throw err;
}
if(!patient){
  mountShell({ role:"kine", active:"patients", back:"/patients.html" });
  app.innerHTML = `<div class="panel">${emptyHTML({ ico:"user", title:"Patient introuvable", text:"Ce dossier n'existe pas ou a été supprimé.", action:`<a class="btn primary" href="/patients.html">Voir mes patients</a>` })}</div>`;
  throw new Error("patient");
}

mountShell({ role:"kine", active:"patients", back:fiche, title:patient.nom });
app.classList.add("wide");

let saved = id ? list.find(b => b.id === id) : null;
if(id && !saved && !rulesErr) saved = await C.getBilan(id).catch(() => null);
if(id && !saved && !rulesErr){
  app.innerHTML = `<div class="panel">${emptyHTML({ ico:"file", title:"Bilan introuvable", text:"Ce bilan a peut-être été supprimé.", action:`<a class="btn primary" href="${fiche}">Retour à la fiche</a>` })}</div>`;
  throw new Error("bilan");
}

const draftKey = () => `gt_bilan_draft_${cle}_${id || "nouveau"}`;
let S, info = "", createdAt = saved?.createdAt || null;
if(saved && saved.etat){
  S = saved.etat;
  S.type = S.type || saved.type || "initial";
  S.date = S.date || saved.date || B.todayISO();
}else{
  const last = list.find(b => b.etat);
  S = last ? B.carryOver(last.etat) : B.blankState("initial");
  if(last) info = `Motif, antécédents, médication et médecin sont repris du bilan du ${B.fmtISO(last.date)}. Modifiez-les si besoin.`;
}
const draft = store.get(draftKey(), null);
let restored = false;
if(draft && draft.S && typeof draft.S === "object" && (!saved || draft.at > (saved.updatedAt || 0))){
  S = draft.S; restored = true;
  info = "Des modifications non enregistrées ont été retrouvées sur cet appareil et restaurées.";
}
S.f = S.f || {}; S.c = S.c || {}; S.pain = S.pain || {}; S.cl = S.cl || {};
const ui = { view: S.view === "dos" ? "dos" : "face", sel: null };
delete S.sel;

const prevBilan = () => B.previousOf(list, id, S.date);
const opts = () => { const p = prevBilan(); return p ? { prev:p.etat, prevDate:p.date } : {}; };

/* ---------- Rendu ---------- */

const secHTML = (key, { text = true, label = null } = {}) => {
  const [, title, chips] = K.sec(key);
  const on = S.c[key] || [];
  return `<div class="sec">
    <div class="sub">${esc(label || title)}</div>
    <div class="chips">${chips.map(c => `<button class="chip" type="button" data-chip="${esc(key)}" data-val="${esc(c)}" aria-pressed="${on.includes(c)}">${esc(c)}</button>`).join("")}</div>
    ${text ? `<textarea class="textarea" data-f="${esc(key)}" placeholder="Précisions…" rows="2">${esc(S.f[key] || "")}</textarea>` : ""}
  </div>`;
};

const field = (key, label, { type = "text", value = S.f[key], placeholder = "", mode = "" } = {}) =>
  `<div class="field"><label for="f-${key}">${esc(label)}</label><input class="input" id="f-${key}" data-f="${key}" type="${type}" ${mode ? `inputmode="${mode}"` : ""} placeholder="${esc(placeholder)}" value="${esc(value ?? "")}"></div>`;

function render(){
  app.innerHTML = `
    <div class="bl-head">
      <div class="bl-id">
        <h1 id="h-title">${esc(B.typeLabel(S.type))}</h1>
        <div class="lead"><span>${esc(nomAffiche(patient.nom))}</span><span id="st" class="save-st"></span></div>
      </div>
      <div class="row">
        <button class="btn" type="button" id="a-guide">${icon("list")}Entretien guidé</button>
        <button class="btn" type="button" id="a-photos">${icon("camera")}Photos<span class="badge" data-ph-n hidden></span></button>
        <button class="btn" type="button" id="a-pdf">${icon("pdf")}PDF</button>
        <button class="btn" type="button" id="a-send">${icon("share")}Envoyer</button>
        <button class="btn primary" type="button" id="a-done">${icon("check")}Terminer</button>
      </div>
    </div>
    <div id="notes" class="stack" style="margin-bottom:16px"></div>

    <div class="bl-grid">
      <aside class="bl-side">
        <section class="panel raised">
          <div class="panel-head"><h2>Zones douloureuses</h2></div>
          <div class="segmented block" role="group" aria-label="Vue du schéma">
            <button type="button" data-view="face" aria-pressed="${ui.view === "face"}">Face</button>
            <button type="button" data-view="dos" aria-pressed="${ui.view === "dos"}">Dos</button>
          </div>
          <svg class="body-svg" id="body" viewBox="0 0 200 430" role="img" aria-label="Schéma corporel : touchez une zone douloureuse"></svg>
          <div id="zone"></div>
        </section>
      </aside>

      <div class="bl-main">
        <section class="panel">
          <div class="panel-head"><h2>Informations</h2></div>
          <div class="grid-auto" style="--min:200px">
            <div class="field"><label for="f-type">Type de bilan</label>
              <select class="select" id="f-type" data-f="type">${B.BTYPES.map(([v, l]) => `<option value="${v}" ${S.type === v ? "selected" : ""}>${esc(l)}</option>`).join("")}</select></div>
            ${field("date", "Date du bilan", { type:"date", value:S.date })}
            ${field("prof", "Profession / activité")}
            ${field("naiss", "Date de naissance", { placeholder:"jj/mm/aaaa" })}
            ${field("med", "Médecin prescripteur", { placeholder:"Dr …" })}
            ${field("medmail", "E-mail du médecin", { type:"email", placeholder:"pour l'envoi du bilan" })}
          </div>
        </section>

        <section class="panel">
          <div class="panel-head"><h2>Motif et contexte</h2></div>
          ${secHTML("patho")}${secHTML("atcd")}${secHTML("medic")}
        </section>

        <div id="analysis" class="stack" style="--gap:16px"></div>

        <section class="panel">
          <div class="panel-head"><h2>Examen clinique</h2></div>
          ${secHTML("obs")}
          <div class="sec">
            <div class="sub" style="display:flex;gap:8px;align-items:center">DN4 · douleur neuropathique <span id="dn4" class="badge"></span></div>
            <div class="chips">${K.sec("dn4")[2].map(c => `<button class="chip" type="button" data-chip="dn4" data-val="${esc(c)}" aria-pressed="${(S.c.dn4 || []).includes(c)}">${esc(c)}</button>`).join("")}</div>
            <p class="hint">Seuil ≥ 4/10 (Bouhassira 2005).</p>
          </div>
        </section>


        <section class="panel">
          <div class="panel-head"><h2>Mesures</h2><span class="badge">scores validés</span><span class="spacer"></span><button class="btn sm" type="button" id="a-scores">${icon("download")}Reprendre les réponses du patient</button></div>
          <div class="field" style="margin-bottom:14px"><label>Douleur globale (EVA / NPRS)</label>${smileysHTML("nprs", S.f.m_nprs === undefined || S.f.m_nprs === "" ? null : +S.f.m_nprs)}<span class="hint">Touchez un visage (0, 2, 4, 6, 8 ou 10) ou saisissez la valeur exacte dans « NPRS » ci-dessous.</span></div>
          <div class="mes-grid">${K.MES.map(([k, l]) => `<div class="field"><label for="f-${k}">${esc(l)}</label><input class="input" id="f-${k}" data-f="${k}" inputmode="decimal" value="${esc(S.f[k] ?? "")}"><span class="hint" data-prevm="${k}"></span></div>`).join("")}</div>
          <div id="evo"></div>
          <div id="q-reco"></div>
        </section>

        ${(K.TF || []).length ? `<section class="panel">
          <div class="panel-head"><h2>Tests fonctionnels</h2><span class="badge">protocole · normes · vidéo</span></div>
          <p class="hint" style="margin-bottom:10px">Remplissez seulement les tests réalisés. Touchez le nom d'un test pour voir le protocole, les normes et la vidéo de démonstration. L'évolution s'affiche avec les mesures.</p>
          <div id="tf-box"></div>
        </section>` : ""}

        <section class="panel">
          <div class="panel-head"><h2>Conclusion et projet</h2></div>
          <div class="sec">
            <div class="field"><label for="f-concl">Diagnostic kinésithérapique / conclusion</label>
            <textarea class="textarea" id="f-concl" data-f="concl" placeholder="Synthèse, hypothèse retenue, facteurs contributifs…">${esc(S.f.concl || "")}</textarea></div>
          </div>
          ${secHTML("obj")}${secHTML("plan")}
        </section>

        <section class="panel">
          <div class="panel-head"><h2>Récapitulatif</h2></div>
          <div id="recap"></div>
          <details style="margin-top:14px"><summary class="sub" style="cursor:pointer">Texte pour Maiia</summary>
            <textarea class="textarea" id="resume" readonly aria-label="Résumé du bilan"></textarea></details>
          <div class="btn-row" style="margin-top:12px">
            <button class="btn primary" type="button" id="a-copy">${icon("copy")}Copier le résumé</button>
            <button class="btn" type="button" id="a-pdf2">${icon("pdf")}Télécharger le PDF</button>
          </div>
        </section>

        <div id="danger"></div>
      </div>
    </div>`;
  majPhotos();
  drawNotes(); drawBody(); drawZone(); drawAnalysis(); drawTF(); drawQReco(); drawDN4(); drawEvo(); drawResume(); drawDanger();
  setSt(restored ? "wait" : saved ? "ok" : "", restored ? "Brouillon restauré" : saved ? "Enregistré" : "Nouveau bilan");
}

function drawNotes(){
  if(!$("#notes")) return;
  const n = [];
  if(blocked) n.push(`<div class="notice danger">${icon("alert")}<span><strong>Firebase refuse l'accès aux bilans.</strong> Pour les activer une fois pour toutes : copiez le fichier <em>firestore.rules</em> dans Firebase (Firestore Database → Règles) puis <em>Publier</em>. En attendant, ce bilan est gardé sur cet appareil et le PDF fonctionne.</span></div>`);
  if(info) n.push(`<div class="notice">${icon("info")}<span>${esc(info)}</span></div>`);
  $("#notes").innerHTML = n.join("");
}

function drawBody(){
  $("#body").innerHTML = BC.bodySVG({ Z:K.Z, R:K.R, view:ui.view, pain:S.pain, sel:ui.sel, color:evaColor });
  $$(".segmented [data-view]").forEach(b => { if(!b.closest("#neuro")) b.setAttribute("aria-pressed", b.dataset.view === ui.view); });
}

function drawZone(){
  const el = $("#zone"), n = ui.sel, p = n && S.pain[n];
  const done = Object.entries(S.pain);
  const pills = done.length ? `<div class="zones-done">${done.map(([z, q]) => `<button class="chip" type="button" data-pick="${esc(z)}" aria-pressed="${z === n}"><span class="eva-pill" style="--c:${evaColor(q.eva)}"><i></i>${esc(z)} · ${q.eva}</span></button>`).join("")}</div>` : "";
  if(!p){
    el.innerHTML = `<p class="hint" style="margin-top:6px">${done.length ? "Touchez une zone pour l'ajouter ou la modifier." : "Touchez une zone douloureuse sur le schéma."}</p>${pills}`;
    return;
  }
  el.innerHTML = `<div class="zone-box">
      <h3>${esc(n)}<span class="spacer"></span><img class="eva-now" src="${evaFace(p.eva)}" alt=""><span class="badge" style="background:${evaColor(p.eva)};color:#fff">EVA ${p.eva}/10</span></h3>
      ${smileysHTML("eva", p.eva)}
      <div class="eva-pick" role="group" aria-label="Intensité de la douleur">${[...Array(11).keys()].map(i => `<button type="button" data-eva="${i}" style="--c:${evaColor(i)}" aria-pressed="${p.eva === i}">${i}</button>`).join("")}</div>
      <div class="chips">${K.TYPES.map(t => `<button class="chip" type="button" data-ptype="${esc(t)}" aria-pressed="${(p.types || []).includes(t)}">${esc(t)}</button>`).join("")}</div>
      <button class="btn ghost sm" type="button" data-rmzone style="margin-top:10px">${icon("trash")}Retirer cette zone</button>
    </div>${pills}`;
}

function analysisHTML(n){
  const r = K.REG[B.regionOf(n)], c = B.zoneState(S, n), srcs = B.regionSources(r);
  const rf = r.RF.filter(x => c.s.includes(x));
  const k = B.clusterText(r, c);
  const pc = S.c.prog || [];
  const rows = r.T.map(([t, h, p, m, s, i]) => {
    const v = B.verdict(p, m), cur = c.t[t] || 0;
    return `<div class="test-row">
      <div class="t-main">
        <button class="t-name" type="button" data-info="${esc(t)}">${esc(t)}${icon("info")}</button>
        <div class="t-meta"><span>${esc(h.map(x => r.H[x]).join(", "))}</span>${p == null && m == null ? `<span class="badge">${s === "ajout" ? "pas de données fiables" : "données insuffisantes"}</span>` : `<span class="num">LR+ ${B.f1(p)}</span><span class="num">LR− ${B.f1(m)}</span><span class="badge ${v === "confirm" ? "ok" : v === "exclure" ? "lagon" : ""}">${B.VERDICT[v]}</span>`}${i ? `<span class="faint">${esc(i)}</span>` : ""}<span class="faint">[${srcs.indexOf(s) + 1}]</span></div>
      </div>
      <div class="segmented t-seg" role="group" aria-label="Résultat : ${esc(t)}">${[[0, "·", "Non fait"], [1, "+", "Positif"], [-1, "−", "Négatif"]].map(([val, l, a]) => `<button type="button" data-tz="${esc(n)}" data-tn="${esc(t)}" data-v="${val}" aria-pressed="${cur === val}" aria-label="${a}" title="${a}">${l}</button>`).join("")}</div>
    </div>`;
  }).join("");
  return `<section class="panel" data-an="${esc(n)}">
    <div class="panel-head"><h2>Analyse · ${esc(n)}</h2><span class="badge lagon">${esc(r.n)}</span></div>
    <div class="sub">Drapeaux rouges, à rechercher en premier</div>
    <div class="chips">${r.RF.map(x => `<button class="chip rf" type="button" data-rf="${esc(n)}" data-val="${esc(x)}" aria-pressed="${c.s.includes(x)}">${esc(x)}</button>`).join("")}</div>
    ${rf.length ? `<div class="notice danger" style="margin-top:12px">${icon("alert")}<span><strong>${esc(r.RFm)}</strong></span></div>` : ""}
    ${r.T.length ? `<div class="sub">Tests cliniques</div><p class="hint" style="margin-bottom:4px">Touchez le nom d'un test pour sa technique. « + » positif, « − » négatif. Valeurs de la littérature, sources en bas.</p><div>${rows}</div>` : ""}
    ${k ? `<div class="notice" style="margin-top:12px">${icon("target")}<span><strong>Cluster ${esc(r.CL.n)} : ${esc(k)}</strong><br><span class="small muted">${esc(r.CL.w)}</span></span></div>` : ""}
    ${r.G ? `<div class="sub">Repères de prise en charge</div><p class="hint" style="margin-bottom:8px">Touchez pour les retenir dans le bilan.</p><div class="chips">${r.G.map(x => `<button class="chip" type="button" data-prog="${esc(x)}" aria-pressed="${pc.includes(x)}">${esc(x)}</button>`).join("")}</div>` : ""}
    <div class="sub">Mesures recommandées</div>
    <p class="small muted">${esc(r.Q.map(q => K.PROM[q]).join(" · "))}</p>
    ${r.note ? `<p class="small muted" style="margin-top:8px"><em>${esc(r.note)}</em></p>` : ""}
    <details class="src"><summary>Sources</summary><ol>${srcs.map(s => `<li>${esc(K.SRC[s] || s)}</li>`).join("")}</ol></details>
  </section>`;
}

/* Questionnaires conseillés selon le motif et les zones : proposés au patient en un clic */
let qCabinet = null;
async function drawQReco(){
  const box = $("#q-reco"); if(!box) return;
  const conseils = TC.questionnairesConseilles(S);
  if(!conseils.length){ box.innerHTML = ""; return; }
  if(!qCabinet) qCabinet = await C.listQuestionnaires().catch(() => []);
  const Q = await import("../questionnaires.js");
  const proposes = new Set((patient.questionnaires || []).map(a => a.qid));
  const items = conseils.map(k => {
    const modele = Q.MODELES.find(m => m.cle === k);
    const q = qCabinet.find(x => x.cle === k && !Q.hasPlaceholders(x.items || Q.parseQuestions(x.texte, x.debut || 0)));
    return { k, nom: modele?.nom || k, but: Q.butOf(modele || { cle:k }), q, deja: q && proposes.has(q.id) };
  });
  box.innerHTML = `<div class="sub" style="margin-top:20px">Questionnaires conseillés pour ce bilan</div>
    <div class="stack" style="--gap:8px">${items.map(it => `<div class="row wrap" style="--gap:8px;align-items:center">
      <span style="flex:1 1 220px"><strong>${esc(it.nom)}</strong><span class="small muted"> · ${esc(it.but)}</span></span>
      ${it.deja ? `<span class="badge ok">${icon("check")}Proposé au patient</span>`
        : it.q ? `<button class="btn sm" type="button" data-qprop="${esc(it.q.id)}">${icon("send")}Proposer au patient</button>`
        : `<a class="btn sm" href="/questionnaires.html" title="Ce questionnaire n'est pas encore prêt dans votre cabinet">${icon("plus")}À préparer</a>`}
    </div>`).join("")}</div>
    <p class="hint" style="margin-top:8px">Le patient le remplit sur son téléphone ; « Reprendre les réponses du patient » reporte ensuite les scores ici.</p>`;
  box.querySelectorAll("[data-qprop]").forEach(b => b.onclick = async () => {
    b.disabled = true;
    try{
      const list = (patient.questionnaires || []).filter(a => a.qid !== b.dataset.qprop).concat({ qid: b.dataset.qprop, jours: 28, depuis: Date.now() });
      await C.updatePatient(patient.cle, { questionnaires: list });
      patient.questionnaires = list;
      toast("Questionnaire proposé au patient (à remplir toutes les 4 semaines).", { type:"ok" });
      drawQReco();
    }catch(err){ b.disabled = false; toast("Impossible de proposer le questionnaire.", { type:"err" }); }
  });
}

/* Tests fonctionnels : d'abord ceux qui servent ce bilan (motif + zones), les autres repliés */
let tfOuvert = false;
function drawTF(){
  const box = $("#tf-box"); if(!box) return;
  const reco = TC.tfRecommandes(S);
  const rempli = k => S.f[k] !== undefined && S.f[k] !== "";
  const champ = ([k, nom, u]) => `<div class="field"><label for="f-${k}"><button class="t-name" type="button" data-tf="${esc(nom)}" style="font-size:inherit">${icon("info")}${esc(nom)}</button> <span class="faint">(${esc(u)})</span></label><input class="input" id="f-${k}" data-f="${k}" inputmode="decimal" value="${esc(S.f[k] ?? "")}"><span class="hint" data-prevm="${k}"></span></div>`;
  const haut = K.TF.filter(t => reco.has(t[0]) || rempli(t[0]));
  const bas = K.TF.filter(t => !haut.includes(t));
  if(!haut.length){
    box.innerHTML = `<p class="hint" style="margin-bottom:10px">Cochez un motif (ex. trouble de l'équilibre, reprise du sport) ou une zone douloureuse : les tests utiles à ce bilan s'afficheront en premier.</p>
      <details class="tf-autres" ${tfOuvert ? "open" : ""}><summary class="sub" style="cursor:pointer">Tous les tests fonctionnels (${K.TF.length})</summary><div class="mes-grid">${K.TF.map(champ).join("")}</div></details>`;
  }else{
    box.innerHTML = `<div class="sub">Recommandés pour ce bilan (${haut.length})</div><div class="mes-grid">${haut.map(champ).join("")}</div>
      ${bas.length ? `<details class="tf-autres" style="margin-top:14px" ${tfOuvert ? "open" : ""}><summary class="sub" style="cursor:pointer">Autres tests (${bas.length})</summary><div class="mes-grid">${bas.map(champ).join("")}</div></details>` : ""}`;
  }
  box.querySelector(".tf-autres")?.addEventListener("toggle", e => { tfOuvert = e.target.open; });
  drawEvo();
}

function drawAnalysis(){
  const z = Object.keys(S.pain).filter(B.regionOf);
  const other = Object.keys(S.pain).filter(n => !B.regionOf(n));
  $("#analysis").innerHTML = z.length
    ? z.map(analysisHTML).join("") + (other.length ? `<p class="hint">${esc(other.join(", "))} : pas encore de tests validés intégrés pour cette zone.</p>` : "")
    : `<section class="panel"><div class="panel-head"><h2>Analyse clinique</h2></div><p class="muted small">Touchez une zone (genou, épaule, lombaires, cervicales, cheville/pied) pour afficher les drapeaux rouges, les tests validés et leurs données probantes.</p></section>`;
}

function redrawAnalysis(n){
  const old = $(`[data-an="${CSS.escape(n)}"]`);
  if(old) old.outerHTML = analysisHTML(n); else drawAnalysis();
}

function drawDN4(){
  const d = (S.c.dn4 || []).length, el = $("#dn4");
  el.textContent = `${d}/10${d >= 4 ? " · probable" : ""}`;
  el.className = "badge " + (d >= 4 ? "warn" : "");
}

function drawEvo(){
  const p = prevBilan();
  $$("[data-prevm]").forEach(h => {
    const v = p?.etat?.f?.[h.dataset.prevm];
    h.textContent = p && v !== undefined && v !== "" ? `Bilan du ${B.fmtISO(p.date)} : ${v}` : "";
  });
  if(!p){ $("#evo").innerHTML = list.length ? "" : ""; return; }
  const ev = B.compare(p.etat, S);
  $("#evo").innerHTML = ev.length ? `<div class="sub" style="margin-top:20px">Évolution depuis le bilan du ${esc(B.fmtISO(p.date))}</div>
    <div class="evo">${ev.map(e => `<div class="row"><span class="badge ${e.sens === "mieux" ? "ok" : e.sens === "moins" ? "danger" : ""}">${e.sens === "mieux" ? icon("trendDown") + "mieux" : e.sens === "moins" ? icon("trendUp") + "moins bien" : "="}</span><span>${esc(e.texte)}</span></div>`).join("")}</div>
    <p class="hint" style="margin-top:8px">MID : valeurs de la littérature, variables selon la population et la méthode. Pour l'EVA, un écart de 2 points est signalé.</p>` : "";
}

const drawResume = () => {
  const r = $("#resume"); if(r) r.value = B.summaryText(S, patient, opts());
  const rc = $("#recap"); if(rc) rc.innerHTML = RC.recapHTML(B.report(S, patient, opts()), S, K);
};

function drawDanger(){
  if(!$("#danger")) return;
  $("#danger").innerHTML = id ? `<div class="row" style="justify-content:flex-end"><button class="btn danger sm" type="button" id="a-del">${icon("trash")}Supprimer ce bilan</button></div>` : "";
}

/* ---------- Enregistrement (automatique) ---------- */

let dirty = restored, inflight = null, blocked = !!rulesErr;

let lastSt = ["", ""];
function setSt(kind, txt){
  lastSt = [kind, txt];
  const el = $("#st");
  if(!el) return;
  el.className = "save-st " + (kind || "");
  el.innerHTML = (kind === "ok" ? icon("checkCircle") : kind === "err" ? icon("alert") : kind === "wait" ? icon("clock") : "") + esc(txt);
}

const keepLocal = () => store.set(draftKey(), { at:Date.now(), S });

function changed(){
  dirty = true;
  keepLocal();
  setSt("", "Modifications…");
  queueSave();
  drawResume();
}

async function save(){
  if(inflight) await inflight;
  if(!dirty) return true;
  if(blocked){ setSt("err", "Gardé sur cet appareil"); return false; }
  dirty = false;
  setSt("wait", navigator.onLine ? "Enregistrement…" : "Hors ligne : enregistré au retour du réseau");
  const isNew = !id, oldKey = draftKey();
  if(isNew){ id = C.newId(); createdAt = Date.now(); }
  const S2 = JSON.parse(JSON.stringify(S));
  inflight = C.saveBilan({
    id, cle, type:S.type, date:S.date, etat:S2,
    resume:B.summaryText(S2, patient, opts()), zones:Object.keys(S2.pain), motif:B.shortLine(S2), createdAt
  }).then(() => {
    store.del(oldKey, draftKey());
    if(dirty) keepLocal();
    const i = list.findIndex(b => b.id === id);
    const entry = { id, cle, type:S2.type, date:S2.date, etat:S2, createdAt };
    i < 0 ? list.push(entry) : (list[i] = entry);
    if(isNew){ history.replaceState(null, "", `/bilan.html?patient=${encodeURIComponent(cle)}&id=${encodeURIComponent(id)}`); drawDanger(); }
    setSt("ok", "Enregistré");
    return true;
  }).catch(err => {
    console.error(err);
    dirty = true;
    if(isNew){ id = null; createdAt = null; }
    keepLocal();
    if(/permission|insufficient/i.test(String(err?.code || "") + String(err?.message || ""))){ blocked = true; drawNotes(); setSt("err", "Gardé sur cet appareil"); }
    else setSt("err", "Non enregistré : nouvel essai à la prochaine modification");
    return false;
  }).finally(() => { inflight = null; });
  return inflight;
}
const queueSave = debounce(() => save(), 1200);

async function leave(href){
  const ok = await save();
  if(!ok && dirty){
    const go = await confirmDialog({ title:"Bilan non enregistré dans Firebase", message:"Il reste gardé sur cet appareil et sera repris la prochaine fois que vous ouvrirez un bilan pour ce patient. Quitter quand même ?", confirm:"Quitter" });
    if(!go) return;
  }
  location.href = href;
}

addEventListener("beforeunload", e => {
  if(dirty || inflight){ save(); e.preventDefault(); e.returnValue = ""; }
});
addEventListener("online", () => { if(dirty) save(); });

/* ---------- Interactions ---------- */

function pickZone(n){
  if(!B.zones(ui.view).some(z => z[0] === n)) ui.view = ui.view === "face" ? "dos" : "face";
  ui.sel = n;
  drawBody(); drawZone();
}

app.addEventListener("click", async e => {
  if(e.target.closest("#neuro")) return;
  const b = e.target.closest("button, [data-zone]");
  if(!b) return;
  const d = b.dataset;

  if(d.view){ ui.view = d.view; ui.sel = null; drawBody(); drawZone(); return; }
  if(d.zone){
    if(!S.pain[d.zone]){ S.pain[d.zone] = { eva:5, types:[] }; ui.sel = d.zone; drawBody(); drawZone(); drawAnalysis(); drawTF(); drawQReco(); drawEvo(); changed(); }
    else{ ui.sel = d.zone; drawBody(); drawZone(); }
    return;
  }
  if(d.pick){ pickZone(d.pick); return; }
  if(d.nprs !== undefined){
    S.f.m_nprs = d.nprs; const inp = $("#f-m_nprs"); if(inp) inp.value = d.nprs;
    $$("[data-nprs]").forEach(x => x.setAttribute("aria-pressed", String(x === b)));
    drawEvo(); changed(); return;
  }
  if(d.eva !== undefined && ui.sel){ S.pain[ui.sel].eva = +d.eva; drawBody(); drawZone(); drawEvo(); changed(); return; }
  if(d.ptype && ui.sel){
    const a = S.pain[ui.sel].types = S.pain[ui.sel].types || [], i = a.indexOf(d.ptype);
    i < 0 ? a.push(d.ptype) : a.splice(i, 1);
    b.setAttribute("aria-pressed", i < 0); changed(); return;
  }
  if(d.rmzone !== undefined && ui.sel){
    delete S.pain[ui.sel]; delete S.cl[ui.sel]; ui.sel = null;
    drawBody(); drawZone(); drawAnalysis(); drawTF(); drawQReco(); drawEvo(); changed(); return;
  }
  if(d.chip){
    const a = S.c[d.chip] = S.c[d.chip] || [], i = a.indexOf(d.val);
    i < 0 ? a.push(d.val) : a.splice(i, 1);
    b.setAttribute("aria-pressed", i < 0);
    if(d.chip === "dn4") drawDN4();
    if(d.chip === "patho"){ drawTF(); drawQReco(); }
    changed(); return;
  }
  if(d.rf){
    const a = B.zoneState(S, d.rf).s, i = a.indexOf(d.val);
    i < 0 ? a.push(d.val) : a.splice(i, 1);
    redrawAnalysis(d.rf); changed(); return;
  }
  if(d.tz){
    const t = B.zoneState(S, d.tz).t, v = +d.v;
    if(v) t[d.tn] = v; else delete t[d.tn];
    redrawAnalysis(d.tz); changed(); return;
  }
  if(d.prog){
    const a = S.c.prog = S.c.prog || [], i = a.indexOf(d.prog);
    i < 0 ? a.push(d.prog) : a.splice(i, 1);
    $$(`[data-prog="${CSS.escape(d.prog)}"]`).forEach(x => x.setAttribute("aria-pressed", i < 0));
    changed(); return;
  }
  if(d.info){ testSheet(d.info); return; }

  if(b.id === "a-photos"){ ouvrirPhotosBilan(); return; }
  if(b.id === "a-done"){ leave(fiche); return; }
  if(b.id === "a-guide"){ store.set("gt_bilan_mode", "guide"); start(); window.scrollTo(0, 0); return; }
  if(b.id === "a-copy"){ B.copyText($("#resume").value); return; }
  if(b.id === "a-pdf" || b.id === "a-pdf2"){
    b.disabled = true;
    try{ await B.downloadPdf(S, patient, opts()); }
    catch(err){ console.error(err); toast("Le PDF n'a pas pu être créé. Vérifiez la connexion et réessayez.", { type:"err" }); }
    finally{ b.disabled = false; }
    return;
  }
  if(b.id === "a-send"){ B.sendSheet(S, patient, opts()); save(); return; }
  if(b.id === "a-del"){
    const ok = await confirmDialog({ title:"Supprimer ce bilan ?", message:`Le ${B.typeLabel(S.type).toLowerCase()} du ${B.fmtISO(S.date)} sera définitivement supprimé.`, confirm:"Supprimer", danger:true });
    if(!ok) return;
    try{
      await C.deleteBilan(id);
      store.del(draftKey());
      dirty = false;
      toast("Bilan supprimé.", { type:"ok" });
      setTimeout(() => location.replace(fiche), 500);
    }catch(err){ console.error(err); toast("La suppression n'a pas abouti.", { type:"err" }); }
  }
});

/* Reprendre les derniers scores remplis par le patient dans l'application */
app.addEventListener("click", async e => {
  if(!e.target.closest("#a-scores")) return;
  try{
    const [suivis, qs] = await Promise.all([C.listSuivis(cle), C.listQuestionnaires()]);
    const set = {};
    qs.filter(q => q.bilan).forEach(q => {
      const last = suivis.filter(x => x.type === "questionnaire" && x.qid === q.id && typeof x.score === "number").pop();
      if(last) set[q.bilan] = { v: Math.round(last.score * 10) / 10, src: `${q.nom} du ${new Date(last.date).toLocaleDateString("fr-FR")}` };
    });
    const obj = suivis.filter(x => x.type === "objectifs").pop();
    if(obj && obj.notes){
      const v = Object.values(obj.notes).map(Number).filter(n => !Number.isNaN(n));
      if(v.length) set.m_psfs = { v: Math.round(v.reduce((a, b) => a + b, 0) / v.length * 10) / 10, src: `objectifs du ${new Date(obj.date).toLocaleDateString("fr-FR")}` };
    }
    const keys = Object.keys(set).filter(k => document.getElementById("f-" + k));
    if(!keys.length){ toast("Le patient n'a pas encore rempli de questionnaire relié au bilan, ni noté ses objectifs."); return; }
    keys.forEach(k => { const el = document.getElementById("f-" + k); el.value = String(set[k].v).replace(".", ","); el.dispatchEvent(new Event("input", { bubbles:true })); });
    toast(`Repris : ${keys.map(k => set[k].src).join(", ")}.`, { type:"ok", duration:6000 });
  }catch(err){ console.warn(err); toast("Les réponses du patient n'ont pas pu être chargées.", { type:"err" }); }
});

app.addEventListener("input", e => {
  const el = e.target, k = el.dataset?.f;
  if(!k) return;
  if(k === "type"){ S.type = el.value; $("#h-title").textContent = B.typeLabel(S.type); }
  else if(k === "date"){ S.date = el.value || B.todayISO(); drawEvo(); }
  else{ S.f[k] = el.value; if(K.MES.some(m => m[0] === k) || (K.TF || []).some(m => m[0] === k)) drawEvo();
    if(k === "m_nprs"){ const v = parseFloat(String(el.value).replace(",", ".")); const c = isNaN(v) ? null : Math.min(10, Math.round(v / 2) * 2); $$("[data-nprs]").forEach(x => x.setAttribute("aria-pressed", String(+x.dataset.nprs === c))); } }
  changed();
});

const back = document.querySelector(".topbar [data-back]");
if(back) back.addEventListener("click", e => { e.preventDefault(); leave(fiche); });

/* ---------- Fiche d'un test ---------- */

function tfSheet(n){ TC.ficheTest(K, n, "fonctionnel"); }
document.addEventListener("click", e => { const b = e.target.closest("[data-tf]"); if(b){ e.preventDefault(); tfSheet(b.dataset.tf); } });

function testSheet(n){ TC.ficheTest(K, n, "clinique"); }

/* Entretien guidé (par défaut) ou vue complète */
let L_toProgram = null;
async function start(){
  if(store.get("gt_bilan_mode", "guide") === "full"){ render(); return; }
  const G = await import("../bilan-guide.js");
  G.mountGuide(app, {
    S, K, B, BC, TC, patient,
    photos: ouvrirPhotosBilan, majPhotos,
    changed, save, opts,
    leave: () => leave(fiche),
    statusAgain: () => setSt(...lastSt),
    onFull: () => { store.set("gt_bilan_mode", "full"); render(); window.scrollTo(0, 0); },
    /* Proposition de traitement : modèles (fournis + cabinet), bibliothèque, ouverture dans l'éditeur */
    loadModeles: async () => {
      const M = await import("../modeles.js");
      const own = (await C.listModeles().catch(() => [])).map(r => M.normModele(r));
      const remplaces = new Set(own.map(m => m.remplace).filter(Boolean));
      return [...own, ...M.BUILTIN.filter(b => !M.isBuiltinHidden(b.id) && !remplaces.has(b.id))];
    },
    loadLibrary: async () => {
      const [L, CL, ST] = await Promise.all([import("../library.js"), import("../classement.js"), import("../settings.js")]);
      const list = await L.loadLibrary();
      list.forEach(e => { if(!("zone" in e)) CL.classer(e); });
      L_toProgram = L.toProgramExercise;
      return { list, visible: e => !ST.isHidden(L.exerciseKey(e)) };
    },
    toProgramExercise: (e, o) => L_toProgram(e, o),
    useProgram: (prog, { semaines, parSemaine, origine }) => {
      store.set("gt_draft", { nom: prog.nom, series: prog.series || 1, exercices: prog.exercices, semaines, seancesParSemaine: parSemaine, ...(origine ? { origine } : {}) });
      toast("Le programme s'ouvre dans l'éditeur, avec ce patient : ajustez puis envoyez.", { type:"ok" });
      leave(`/config.html?draft=1&patient=${encodeURIComponent(cle)}`);
    }
  });
  if(!lastSt[1]) setSt(restored ? "wait" : saved ? "ok" : "", restored ? "Brouillon restauré" : saved ? "Enregistré" : "Nouveau bilan");
  else setSt(...lastSt);
}
start();
if(restored) queueSave();


/* ---------- Échelle de smileys (images de l'application) ---------- */
function smileysHTML(kind, val){
  const steps = [0, 2, 4, 6, 8, 10];
  const cur = val === null || val === undefined || isNaN(val) ? null : Math.min(10, Math.round(val / 2) * 2);
  return `<div class="eva-faces" role="group" aria-label="Échelle visuelle de douleur">${steps.map(v => `<button type="button" data-${kind}="${v}" aria-pressed="${cur === v}" aria-label="Douleur ${v} sur 10" style="--c:${evaColor(v)}"><img src="${evaFace(v)}" alt=""><span>${v}</span></button>`).join("")}</div>`;
}
