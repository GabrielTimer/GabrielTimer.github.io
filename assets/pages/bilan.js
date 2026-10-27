/* Bilan kiné d'un patient : saisie, enregistrement automatique, PDF, envoi.
   URL : /bilan.html?patient=CODE (nouveau bilan) ou ?patient=CODE&id=ID (bilan existant).
   Les bilans sont dans la collection Firestore « bilans », réservée au compte kiné. */

import {
  $, $$, esc, icon, params, store, mountShell, registerSW, toast, confirmDialog, openSheet,
  errorHTML, emptyHTML, debounce, evaColor
} from "../app.js";

const app = $("#app");
registerSW();

const { requireKine } = await import("../kine.js");
await requireKine();
const C = await import("../cloud.js");
const B = await import("../bilan-core.js");

const cle = params.get("patient");
let id = params.get("id") || null;
if(!cle) location.replace("/patients.html");
const fiche = `/cloud.html?patient=${encodeURIComponent(cle)}`;

/* ---------- Chargement ---------- */

let patient = null, list = [], rulesErr = null, K;
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
        <div class="lead"><span>${esc(patient.nom)}</span><span id="st" class="save-st"></span></div>
      </div>
      <div class="row">
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
          <svg class="body-svg" id="body" viewBox="0 0 200 414" role="img" aria-label="Schéma corporel : touchez une zone douloureuse"></svg>
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
          <div class="panel-head"><h2>Mesures</h2><span class="badge">scores validés</span></div>
          <div class="mes-grid">${K.MES.map(([k, l]) => `<div class="field"><label for="f-${k}">${esc(l)}</label><input class="input" id="f-${k}" data-f="${k}" inputmode="decimal" value="${esc(S.f[k] ?? "")}"><span class="hint" data-prevm="${k}"></span></div>`).join("")}</div>
          <div id="evo"></div>
        </section>

        <section class="panel">
          <div class="panel-head"><h2>Conclusion et projet</h2></div>
          <div class="sec">
            <div class="field"><label for="f-concl">Diagnostic kinésithérapique / conclusion</label>
            <textarea class="textarea" id="f-concl" data-f="concl" placeholder="Synthèse, hypothèse retenue, facteurs contributifs…">${esc(S.f.concl || "")}</textarea></div>
          </div>
          ${secHTML("obj")}${secHTML("plan")}
        </section>

        <section class="panel">
          <div class="panel-head"><h2>Résumé pour Maiia</h2></div>
          <textarea class="textarea" id="resume" readonly aria-label="Résumé du bilan"></textarea>
          <div class="btn-row" style="margin-top:12px">
            <button class="btn primary" type="button" id="a-copy">${icon("copy")}Copier le résumé</button>
            <button class="btn" type="button" id="a-pdf2">${icon("pdf")}Télécharger le PDF</button>
          </div>
        </section>

        <div id="danger"></div>
      </div>
    </div>`;
  drawNotes(); drawBody(); drawZone(); drawAnalysis(); drawDN4(); drawEvo(); drawResume(); drawDanger();
  setSt(restored ? "wait" : saved ? "ok" : "", restored ? "Brouillon restauré" : saved ? "Enregistré" : "Nouveau bilan");
}

function drawNotes(){
  const n = [];
  if(blocked) n.push(`<div class="notice danger">${icon("alert")}<span><strong>Firebase refuse l'accès aux bilans.</strong> Pour les activer une fois pour toutes : copiez le fichier <em>firestore.rules</em> dans Firebase (Firestore Database → Règles) puis <em>Publier</em>. En attendant, ce bilan est gardé sur cet appareil et le PDF fonctionne.</span></div>`);
  if(info) n.push(`<div class="notice">${icon("info")}<span>${esc(info)}</span></div>`);
  $("#notes").innerHTML = n.join("");
}

function drawBody(){
  const d = K.Z[ui.view];
  $("#body").innerHTML = B.zones(ui.view).map(([n, x, y, w, h, r]) => {
    const p = S.pain[n];
    return `<rect class="${ui.sel === n ? "sel" : ""}" data-zone="${esc(n)}" x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" style="${p ? `fill:${evaColor(p.eva)}` : ""}"><title>${esc(n)}${p ? ` : EVA ${p.eva}` : ""}</title></rect>`;
  }).join("") + `<text x="4" y="20">${d.L}</text><text x="186" y="20">${K.R[d.L]}</text>`;
  $$(".segmented [data-view]").forEach(b => b.setAttribute("aria-pressed", b.dataset.view === ui.view));
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
      <h3>${esc(n)}<span class="spacer"></span><span class="badge" style="background:${evaColor(p.eva)};color:#fff">EVA ${p.eva}/10</span></h3>
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
        <div class="t-meta"><span>${esc(h.map(x => r.H[x]).join(", "))}</span><span class="num">LR+ ${B.f1(p)}</span><span class="num">LR− ${B.f1(m)}</span><span class="badge ${v === "confirm" ? "ok" : v === "exclure" ? "lagon" : ""}">${B.VERDICT[v]}</span>${i ? `<span class="faint">${esc(i)}</span>` : ""}<span class="faint">[${srcs.indexOf(s) + 1}]</span></div>
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

const drawResume = () => { $("#resume").value = B.summaryText(S, patient, opts()); };

function drawDanger(){
  $("#danger").innerHTML = id ? `<div class="row" style="justify-content:flex-end"><button class="btn danger sm" type="button" id="a-del">${icon("trash")}Supprimer ce bilan</button></div>` : "";
}

/* ---------- Enregistrement (automatique) ---------- */

let dirty = restored, inflight = null, blocked = !!rulesErr;

function setSt(kind, txt){
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
  const b = e.target.closest("button, rect");
  if(!b) return;
  const d = b.dataset;

  if(d.view){ ui.view = d.view; ui.sel = null; drawBody(); drawZone(); return; }
  if(d.zone){
    if(!S.pain[d.zone]){ S.pain[d.zone] = { eva:5, types:[] }; ui.sel = d.zone; drawBody(); drawZone(); drawAnalysis(); drawEvo(); changed(); }
    else{ ui.sel = d.zone; drawBody(); drawZone(); }
    return;
  }
  if(d.pick){ pickZone(d.pick); return; }
  if(d.eva !== undefined && ui.sel){ S.pain[ui.sel].eva = +d.eva; drawBody(); drawZone(); drawEvo(); changed(); return; }
  if(d.ptype && ui.sel){
    const a = S.pain[ui.sel].types = S.pain[ui.sel].types || [], i = a.indexOf(d.ptype);
    i < 0 ? a.push(d.ptype) : a.splice(i, 1);
    b.setAttribute("aria-pressed", i < 0); changed(); return;
  }
  if(d.rmzone !== undefined && ui.sel){
    delete S.pain[ui.sel]; delete S.cl[ui.sel]; ui.sel = null;
    drawBody(); drawZone(); drawAnalysis(); drawEvo(); changed(); return;
  }
  if(d.chip){
    const a = S.c[d.chip] = S.c[d.chip] || [], i = a.indexOf(d.val);
    i < 0 ? a.push(d.val) : a.splice(i, 1);
    b.setAttribute("aria-pressed", i < 0);
    if(d.chip === "dn4") drawDN4();
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

  if(b.id === "a-done"){ leave(fiche); return; }
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

app.addEventListener("input", e => {
  const el = e.target, k = el.dataset?.f;
  if(!k) return;
  if(k === "type"){ S.type = el.value; $("#h-title").textContent = B.typeLabel(S.type); }
  else if(k === "date"){ S.date = el.value || B.todayISO(); drawEvo(); }
  else{ S.f[k] = el.value; if(K.MES.some(m => m[0] === k)) drawEvo(); }
  changed();
});

const back = document.querySelector(".topbar [data-back]");
if(back) back.addEventListener("click", e => { e.preventDefault(); leave(fiche); });

/* ---------- Fiche d'un test ---------- */

function testSheet(n){
  const g = K.GUIDE[n] || {};
  const video = g.v || "https://www.youtube.com/results?search_query=" + encodeURIComponent(n + " test kinésithérapie");
  openSheet({
    title:n,
    body:`<div class="g-sheet">
      ${g.t ? `<p><strong>Technique</strong><br>${esc(g.t)}</p>` : `<p class="muted">Description à compléter dans bilan-kine/guide.js.</p>`}
      ${g.p ? `<p><strong>Positif si</strong><br>${esc(g.p)}</p>` : ""}
      ${g.i ? `<img src="/bilan-kine/${esc(g.i)}" alt="${esc(n)}">` : ""}
      <p class="hint">Résumé pédagogique, à confronter à la technique que vous pratiquez.</p>
    </div>`,
    foot:`<a class="btn" href="${esc(video)}" target="_blank" rel="noopener">${icon("video")}${g.v ? "Voir la vidéo" : "Chercher une vidéo"}</a>${g.r ? `<a class="btn" href="${esc(g.r)}" target="_blank" rel="noopener">${icon("link")}Fiche de référence</a>` : ""}<button class="btn primary" type="button" data-close>Fermer</button>`
  });
}

render();
if(restored) queueSave();
