/* Historique et séances favorites enregistrés sur l'appareil */

import {
  $, $$, esc, icon, store, readPatientContext, kineHint, mountShell, registerSW, localProgs, emptyHTML,
  confirmDialog, toast, evaColor, ressentiLabel, sessionDuration, fmtDuree, plural, setRunProgram, fmtShortDate
} from "../app.js";

registerSW();
const mode = document.body.dataset.mode; // "historique" | "favoris"
const app = $("#app");
const ctx = readPatientContext();
const isKine = kineHint.get() && !ctx.apercu;
const role = isKine ? "kine" : ctx.cle ? "patient" : "none";
const keys = new Set(isKine ? ["admin"] : [ctx.cle, store.get("currentPatient")].filter(Boolean));
if(!isKine && !ctx.cle) keys.add("admin");

mountShell({ role, active: isKine ? (mode === "favoris" ? "outils" : "accueil") : "programmes", back: isKine ? "/index.html" : "/cloud.html" });

const mine = type => localProgs.all().map((p, i) => ({ ...p, _i: i })).filter(p => p.type === type && keys.has(p.patientId || "admin"));

function launch(data){
  setRunProgram(data);
  location.href = "/timer.html?from=favoris";
}

function evaDot(v){
  if(v === undefined || v === null || v === "") return "";
  return `<span class="eva-pill"><i style="background:${evaColor(v)}"></i>${esc(v)}/10</span>`;
}

function renderHistorique(){
  const list = mine("historique");
  const groups = new Map();
  list.forEach(p => { const k = p.nom || "Séance"; if(!groups.has(k)) groups.set(k, []); groups.get(k).push(p); });
  app.innerHTML = `
    <div class="page-head"><h1>Historique</h1><p class="lead">Les séances terminées sur cet appareil, regroupées par nom.</p></div>
    ${!list.length ? `<div class="panel">${emptyHTML({ ico:"history", title:"Aucune séance pour l'instant", text:"Vos séances terminées apparaîtront ici." })}</div>` : `
    <div class="stack" style="--gap:14px">
      ${[...groups.entries()].map(([nom, items]) => {
        const evas = items.map(x => x.data?.eva).filter(v => v !== undefined && v !== null && v !== "").map(Number);
        const moy = evas.length ? Math.round(evas.reduce((a, b) => a + b, 0) / evas.length * 10) / 10 : null;
        return `
        <details class="prog">
          <summary class="h-sum"><div class="h-sum-in">
            <span class="li-ico">${icon("history")}</span>
            <span style="flex:1;min-width:0"><strong style="display:block">${esc(nom)}</strong><span class="small muted">${plural(items.length, "séance")}, dernière le ${esc(items[0].date ? String(items[0].date).split(" ")[0] : "")}</span></span>
            ${moy !== null ? evaDot(moy) : ""}
            <span class="chev" style="color:var(--ink-3)">${icon("down")}</span>
          </div></summary>
          ${items.map(p => `
            <div class="session-row">
              <div class="s-main"><div class="s-title">${esc(p.date || "")} ${evaDot(p.data?.eva)} ${p.ressenti ? `<span class="badge">${esc(ressentiLabel(p.ressenti))}</span>` : ""}</div>
              <div class="s-sub">${plural((p.data?.exercices || []).length, "exercice")}, ${esc(fmtDuree(sessionDuration(p.data)))}</div></div>
              <div class="s-actions">
                <button class="btn sm" type="button" data-run="${p._i}">${icon("play")}Refaire</button>
                <button class="icon-btn sm" type="button" data-fav="${p._i}" aria-label="Ajouter aux favoris">${icon("star")}</button>
                <button class="icon-btn sm danger" type="button" data-del="${p._i}" aria-label="Supprimer">${icon("trash")}</button>
              </div>
            </div>`).join("")}
        </details>`;
      }).join("")}
    </div>
    <div class="section"><button class="btn danger" type="button" id="clear">${icon("trash")}Effacer l'historique</button></div>`}`;

  $$("[data-run]").forEach(b => b.onclick = () => { const p = localProgs.all()[b.dataset.run]; if(p) launch(p.data); });
  $$("[data-fav]").forEach(b => b.onclick = () => {
    const p = localProgs.all()[b.dataset.fav]; if(!p) return;
    const exists = mine("favori").some(f => f.nom === p.nom);
    if(exists){ toast("Déjà dans vos favoris."); return; }
    const { eva, ...data } = p.data || {};
    localProgs.add({ type:"favori", patientId:p.patientId, nom:p.nom, date:new Date().toLocaleDateString("fr-FR"), data });
    toast("Ajoutée aux favoris.", { type:"ok" });
    renderHistorique();
  });
  $$("[data-del]").forEach(b => b.onclick = async () => {
    if(!await confirmDialog({ title:"Supprimer cette séance de l'historique ?", confirm:"Supprimer", danger:true })) return;
    localProgs.removeAt(Number(b.dataset.del)); renderHistorique();
  });
  $("#clear")?.addEventListener("click", async () => {
    if(!await confirmDialog({ title:"Effacer tout l'historique ?", message:"Les séances de cet appareil seront supprimées. Les données envoyées à votre kiné ne sont pas concernées.", confirm:"Tout effacer", danger:true })) return;
    localProgs.save(localProgs.all().filter(p => !(p.type === "historique" && keys.has(p.patientId || "admin"))));
    renderHistorique();
  });
}

function renderFavoris(){
  const list = mine("favori");
  app.innerHTML = `
    <div class="page-head"><h1>Séances favorites</h1><p class="lead">${isKine ? "Vos séances enregistrées sur cet appareil, prêtes à lancer ou à modifier." : "Les séances que vous avez gardées pour les refaire."}</p></div>
    ${!list.length ? `<div class="panel">${emptyHTML({ ico:"star", title:"Aucune séance favorite", text: isKine ? "Enregistrez une séance depuis l'écran de création avec « Garder en favori »." : "Depuis l'historique, touchez l'étoile pour garder une séance." })}</div>` : `
    <div class="list">${list.map(p => `
      <div class="list-item" style="flex-wrap:wrap">
        <span class="li-ico">${icon("star")}</span>
        <span class="li-main" style="flex:1 1 170px"><span class="li-title">${esc(p.nom && p.nom !== "undefined" ? p.nom : "Séance")}</span><span class="li-sub">${plural((p.data?.exercices || []).length, "exercice")}, ${esc(fmtDuree(sessionDuration(p.data)))}${p.date ? `, enregistrée le ${esc(p.date)}` : ""}</span></span>
        <span class="row" style="--gap:6px;margin-left:auto">
          <button class="btn sm primary" type="button" data-run="${p._i}">${icon("play")}Lancer</button>
          ${isKine ? `<button class="icon-btn sm" type="button" data-edit="${p._i}" aria-label="Modifier">${icon("edit")}</button><button class="icon-btn sm" type="button" data-dup="${p._i}" aria-label="Dupliquer">${icon("copy")}</button>` : ""}
          <button class="icon-btn sm danger" type="button" data-del="${p._i}" aria-label="Supprimer">${icon("trash")}</button>
        </span>
      </div>`).join("")}</div>`}`;

  $$("[data-run]").forEach(b => b.onclick = () => { const p = localProgs.all()[b.dataset.run]; if(p) launch(p.data || p); });
  $$("[data-edit]").forEach(b => b.onclick = () => {
    const p = localProgs.all()[b.dataset.edit]; if(!p) return;
    store.set("gt_edit", { type:"favori", index:Number(b.dataset.edit) });
    store.set("gt_draft", { ...(p.data || {}), nom:p.nom });
    location.href = "/config.html?draft=1&favori=1";
  });
  $$("[data-dup]").forEach(b => b.onclick = () => {
    const p = localProgs.all()[b.dataset.dup]; if(!p) return;
    store.set("gt_draft", { ...(p.data || {}), nom:(p.nom || "Séance") + " (copie)" });
    location.href = "/config.html?draft=1";
  });
  $$("[data-del]").forEach(b => b.onclick = async () => {
    if(!await confirmDialog({ title:"Supprimer cette séance favorite ?", confirm:"Supprimer", danger:true })) return;
    localProgs.removeAt(Number(b.dataset.del)); renderFavoris();
  });
}

mode === "favoris" ? renderFavoris() : renderHistorique();
