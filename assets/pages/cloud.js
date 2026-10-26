/* Programmes : vue patient (« Mes programmes ») et fiche patient côté kiné */

import {
  $, $$, esc, icon, params, store, readPatientContext, mountShell, registerSW, toast, confirmDialog, promptDialog,
  openSheet, loadingHTML, emptyHTML, errorHTML, groupProgrammes, fmtRelDay, fmtShortDate, evaFace, evaColor,
  plural, ressentiLabel, kineHint, byWeek, fmtNum
} from "../app.js";
import { programmeHTML, seulesHTML, openProgrammePdf, openSeancePdf, changeDaysSheet } from "../programmes-view.js";

const app = $("#app");
registerSW();

const ctx = readPatientContext();
const pParam = params.get("patient");

if(pParam && !ctx.apercu){
  kineView(pParam);
}else if(ctx.cle){
  patientView(ctx);
}else{
  location.replace("/index.html");
}

/* =========================================================
   Patient : mes programmes
   ========================================================= */

async function patientView(ctx){
  mountShell({ role:"patient", active:"programmes", apercu:ctx.apercu });
  app.innerHTML = `<div class="page-head"><h1>Mes programmes</h1></div>${loadingHTML()}`;
  const P = await import("../patient.js");
  let data;
  try{ data = await P.loadPatient(ctx.cle); }
  catch(err){ app.querySelector(".loading").outerHTML = errorHTML(err); return; }
  if(!data){ location.replace("/index.html"); return; }

  const render = () => {
    const { programmes, seules } = data;
    app.innerHTML = `
      <div class="page-head"><h1>Mes programmes</h1><p class="lead">Vos séances semaine par semaine. Touchez « Commencer » pour lancer la suivante.</p></div>
      ${!programmes.length && !seules.length ? `<div class="panel">${emptyHTML({ ico:"calendar", title:"Aucun programme pour l'instant", text:"Votre kiné ne vous a pas encore envoyé d'exercices." })}</div>` : ""}
      ${programmes.map(p => programmeHTML(p, { role:"patient" })).join("")}
      ${seules.length ? `<div class="section">${seulesHTML(seules, { role:"patient" })}</div>` : ""}
      <section class="section">
        <div class="section-title">Sur cet appareil</div>
        <div class="list">
          <a class="list-item" href="/historique.html"><span class="li-ico">${icon("history")}</span><span class="li-main"><span class="li-title">Historique</span><span class="li-sub">Les séances faites sur ce téléphone</span></span><span class="li-end">${icon("chevron")}</span></a>
          <a class="list-item" href="/mes_programmes.html"><span class="li-ico">${icon("star")}</span><span class="li-main"><span class="li-title">Séances favorites</span><span class="li-sub">Pour refaire une séance quand vous voulez</span></span><span class="li-end">${icon("chevron")}</span></a>
        </div>
      </section>`;
    bindPatient();
  };

  const all = () => data.seances;
  const bindPatient = () => {
    $$("[data-act]").forEach(b => b.addEventListener("click", async () => {
      const s = all().find(x => x.id === b.dataset.id);
      if(!s) return;
      if(b.dataset.act === "lancer") P.launchSeance(s, { cle:ctx.cle, apercu:ctx.apercu });
      if(b.dataset.act === "valider"){
        const ok = await confirmDialog({ title:"Valider cette séance ?", message:"Utilisez cette option si vous avez fait la séance sans le minuteur, par exemple au cabinet.", confirm:"Oui, je l'ai faite" });
        if(ok) location.href = `/fin.html?cle=${encodeURIComponent(ctx.cle)}&s=${encodeURIComponent(s.id)}${ctx.apercu ? "&apercu=1" : ""}`;
      }
    }));
    $$("[data-prog]").forEach(article => {
      const prog = data.programmes.find(p => p.id === article.dataset.prog);
      article.querySelectorAll("[data-pact]").forEach(b => b.addEventListener("click", async () => {
        if(b.dataset.pact === "pdf") openProgrammePdf(prog, data.patient.nom);
        if(b.dataset.pact === "jours"){
          changeDaysSheet(prog, { role:"patient", onSave: async changes => {
            if(ctx.apercu){ toast("Aperçu : les jours ne sont pas modifiés."); return; }
            const C = await import("../cloud.js");
            await C.replanSeances(ctx.cle, changes);
            changes.forEach(c => { const x = data.seances.find(s => s.id === c.id); if(x) Object.assign(x, c); });
            Object.assign(data, groupProgrammes(data.seances));
            toast("Vos jours sont enregistrés. Votre kiné verra le nouveau planning.", { type:"ok" });
            render();
          }});
        }
        if(b.dataset.pact === "bilan"){
          const rem = await promptDialog({ title:"Envoyer mon bilan", label:"Un mot pour votre kiné ? (facultatif)", multiline:true, confirm:"Préparer l'e-mail" });
          if(rem !== null) P.bilanMail({ patientNom:data.patient.nom, programme:prog, remarques:rem });
        }
      }));
    });
  };
  render();
}

/* =========================================================
   Kiné : fiche patient
   ========================================================= */

async function kineView(param){
  const { requireKine } = await import("../kine.js");
  await requireKine();
  const C = await import("../cloud.js");

  let patient = null;
  try{
    if(param.length === 12) patient = await C.getPatient(param, { fiche:true });
    if(!patient){
      const list = await C.listPatients();
      const p = list.find(x => x.patientId === param.toLowerCase() || x.legacyId === param.toLowerCase());
      if(p){ location.replace(`/cloud.html?patient=${p.cle}`); return; }
    }
  }catch(err){
    mountShell({ role:"kine", active:"patients", back:"/patients.html" });
    app.innerHTML = errorHTML(err);
    return;
  }
  if(!patient){
    mountShell({ role:"kine", active:"patients", back:"/patients.html" });
    app.innerHTML = `<div class="panel">${emptyHTML({ ico:"user", title:"Patient introuvable", text:"Ce dossier n'existe pas ou a été supprimé.", action:`<a class="btn primary" href="/patients.html">Voir mes patients</a>` })}</div>`;
    return;
  }

  mountShell({ role:"kine", active:"patients", back:"/patients.html", title:patient.nom });
  app.classList.add("wide");
  const K = await import("../kine.js");
  const UI = await import("../kine-ui.js");
  const { renderEvaChart } = await import("../chart.js");
  const P = await import("../patient.js");

  let seances = [];
  const load = async () => {
    seances = (await C.listSeances(patient.cle)).filter(s => s.data && Array.isArray(s.data.exercices));
  };

  const render = () => {
    const sum = K.summarize(patient, seances);
    const { programmes, seules } = sum;
    const actif = sum.actif;
    const reg = P.regularity(actif ? actif.seances : seances);
    const tr = sum.trend;
    const valides = seances.filter(s => s.terminee && s.dateValidation).sort((a, b) => a.dateValidation - b.dateValidation);
    programmes.forEach(p => byWeek(p.seances));
    const points = valides.filter(s => s.eva !== null && s.eva !== undefined && s.eva !== "").map(s => ({
      label: s.label || s.nom || fmtShortDate(s.dateValidation), v: Number(s.eva), date: fmtShortDate(s.dateValidation)
    }));
    const initials = String(patient.nom || "?").split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join("");

    app.innerHTML = `
      <section class="panel raised">
        <div class="pt-head">
          <span class="avatar">${esc(initials)}</span>
          <div class="pt-id">
            <h1>${esc(patient.nom)}</h1>
            <div class="pt-contact">
              ${patient.telephone ? `<a href="tel:${esc(patient.telephone)}">${icon("phone")}${esc(patient.telephone)}</a>` : ""}
              ${patient.email ? `<a href="mailto:${esc(patient.email)}">${icon("mail")}${esc(patient.email)}</a>` : ""}
              ${patient.note ? `<span>${icon("info")}${esc(patient.note)}</span>` : ""}
            </div>
          </div>
        </div>
        ${sum.alertes.length ? `<div class="chips" style="margin-top:14px">${sum.alertes.map(a => `<span class="badge ${a.niveau === "danger" ? "danger" : a.niveau === "warn" ? "warn" : a.niveau === "ok" ? "ok" : "lagon"}">${icon(a.ico)}${esc(a.texte)}</span>`).join("")}</div>` : ""}
        <div class="pt-actions">
          <a class="btn primary" href="/config.html?patient=${encodeURIComponent(patient.cle)}">${icon("plus")}Nouveau programme</a>
          <button class="btn" type="button" id="acces">${icon("qr")}Accès patient</button>
          <button class="btn" type="button" id="apercu">${icon("eye")}Vue patient</button>
          <button class="btn" type="button" id="edit">${icon("edit")}Modifier</button>
          <button class="btn ghost" type="button" id="more">${icon("settings")}Plus</button>
        </div>
      </section>

      <section class="section kpis four">
        <div class="kpi"><span class="k-val">${actif ? `${actif.faites}<span class="faint" style="font-size:.7em">/${actif.total}</span>` : seances.filter(s => s.terminee).length}</span><span class="k-lab">séances faites${actif ? " (programme en cours)" : ""}</span></div>
        <div class="kpi"><span class="k-val">${reg === null ? "–" : reg + "<span style='font-size:.6em'>%</span>"}</span><span class="k-lab">de régularité</span></div>
        <div class="kpi"><span class="k-val">${sum.lastEva === null ? "–" : `<img src="${evaFace(sum.lastEva)}" alt="">${sum.lastEva}`}${tr ? (tr.dir === "down" ? `<span style="color:var(--ok)">${icon("trendDown")}</span>` : tr.dir === "up" ? `<span style="color:var(--danger)">${icon("trendUp")}</span>` : "") : ""}</span><span class="k-lab">dernière douleur</span></div>
        <div class="kpi"><span class="k-val" style="font-size:1.15rem;font-family:var(--font)">${sum.derniere ? esc(fmtRelDay(sum.derniere.dateValidation)) : "Jamais"}</span><span class="k-lab">dernière séance</span></div>
      </section>

      <div class="cols section">
        <section class="panel">
          <div class="panel-head"><h2 style="font-size:var(--fs-lg)">Évolution de la douleur</h2>${tr ? `<span class="badge ${tr.dir === "down" ? "ok" : tr.dir === "up" ? "danger" : ""}">${fmtNum(tr.debut)} → ${fmtNum(tr.fin)}</span>` : ""}</div>
          <div id="chart"></div>
        </section>
        <section class="panel">
          <div class="panel-head"><h2 style="font-size:var(--fs-lg)">Messages et ressentis</h2></div>
          ${sum.commentaires.length || valides.some(s => s.ressenti) ? `<div class="msg-list">${valides.slice().reverse().filter(s => s.commentaire || s.ressenti).slice(0, 8).map(s => `
            <div>
              <div class="m-meta">${esc(fmtShortDate(s.dateValidation))}, ${esc(s.label || s.nom || "séance")}${s.ressenti ? ` : ${esc(ressentiLabel(s.ressenti).toLowerCase())}` : ""}${s.eva !== undefined && s.eva !== null ? `, douleur ${esc(s.eva)}/10` : ""}</div>
              ${s.commentaire ? `<div class="quote">${esc(s.commentaire)}</div>` : ""}
            </div>`).join("")}</div>` : `<p class="muted small">Le patient n'a pas encore laissé de message.</p>`}
        </section>
      </div>

      <section class="section">
        <div class="section-title">Programmes<span class="spacer"></span><a class="btn sm" href="/config.html?patient=${encodeURIComponent(patient.cle)}">${icon("plus")}Ajouter</a></div>
        ${!programmes.length && !seules.length ? `<div class="panel">${emptyHTML({ ico:"calendar", title:"Aucun programme", text:"Créez un premier programme pour ce patient.", action:`<a class="btn primary" href="/config.html?patient=${encodeURIComponent(patient.cle)}">${icon("plus")}Créer un programme</a>` })}</div>` : ""}
        ${programmes.map(p => programmeHTML(p, { role:"kine" })).join("")}
        ${seules.length ? `<div style="margin-top:16px">${seulesHTML(seules, { role:"kine" })}</div>` : ""}
      </section>`;

    renderEvaChart($("#chart"), points);
    bind(sum);
  };

  const bind = (sum) => {
    $("#acces").onclick = () => UI.accessSheet(patient);
    $("#apercu").onclick = () => window.open(`/index.html?apercu=${patient.cle}`, "_blank");
    $("#edit").onclick = editPatient;
    $("#more").onclick = morePatient;

    $$("[data-act]").forEach(b => b.addEventListener("click", async () => {
      const s = seances.find(x => x.id === b.dataset.id);
      if(!s) return;
      const act = b.dataset.act;
      if(act === "tester") P.launchSeance(s, { cle:patient.cle, apercu:true });
      if(act === "modifier"){
        store.set("gt_edit", { type:"seance", cle:patient.cle, id:s.id });
        location.href = "/config.html?edit=1";
      }
      if(act === "valider"){
        const ok = await confirmDialog({ title:"Marquer comme faite ?", message:"La séance sera validée pour le patient (par exemple si elle a été faite au cabinet). Vous indiquerez la douleur ressentie.", confirm:"Valider" });
        if(ok) location.href = `/fin.html?cle=${encodeURIComponent(patient.cle)}&s=${encodeURIComponent(s.id)}`;
      }
      if(act === "supprimer"){
        const ok = await confirmDialog({ title:"Supprimer cette séance ?", message:`La séance ${s.label || s.nom || ""} sera définitivement supprimée.`, confirm:"Supprimer", danger:true });
        if(!ok) return;
        await C.deleteSeance(patient.cle, s.id);
        seances = seances.filter(x => x.id !== s.id);
        toast("Séance supprimée.", { type:"ok" });
        render();
      }
    }));

    $$("[data-prog]").forEach(article => {
      const prog = sum.programmes.find(p => p.id === article.dataset.prog);
      article.querySelectorAll("[data-pact]").forEach(b => b.addEventListener("click", async () => {
        const act = b.dataset.pact;
        const first = prog.seances[0];
        if(act === "pdf") openProgrammePdf(prog, patient.nom);
        if(act === "jours"){
          changeDaysSheet(prog, { role:"kine", onSave: async changes => {
            await C.replanSeances(patient.cle, changes);
            changes.forEach(c => { const x = seances.find(s => s.id === c.id); if(x) Object.assign(x, c); });
            toast("Planning mis à jour.", { type:"ok" });
            render();
          }});
        }
        if(act === "copier"){
          const weeks = byWeek(prog.seances);
          const jours = Array.from(new Set(weeks[0].seances.map(s => s.datePrevue ? new Date(s.datePrevue).getDay() : null).filter(x => x !== null)));
          store.set("gt_draft", {
            nom: prog.nom, series: first.data.series, exercices: first.data.exercices,
            semaines: weeks.length, seancesParSemaine: Math.max(...weeks.map(w => w.seances.length)), jours
          });
          location.href = "/config.html?draft=1";
        }
        if(act === "modele"){
          const nom = await promptDialog({ title:"Enregistrer comme modèle", label:"Nom du modèle", value:prog.nom, confirm:"Enregistrer" });
          if(!nom) return;
          await C.saveModele({ nom, patientId:"admin", data:{ ...first.data, nom } });
          toast("Modèle enregistré.", { type:"ok", action:{ label:"Voir", run:() => location.href = "/programmes_admin.html" } });
        }
        if(act === "supprimer"){
          const ok = await confirmDialog({ title:"Supprimer ce programme ?", message:`« ${prog.nom} » et ses ${prog.total} séances seront définitivement supprimés, y compris l'historique de douleur.`, confirm:"Supprimer le programme", danger:true });
          if(!ok) return;
          await C.deleteProgramme(patient.cle, prog.id);
          seances = seances.filter(s => s.programmeId !== prog.id);
          toast("Programme supprimé.", { type:"ok" });
          render();
        }
      }));
    });
  };

  const editPatient = () => {
    const s = openSheet({
      title:"Modifier le patient",
      body:`<form id="ep" class="stack" style="--gap:14px">
        <div class="field"><label for="ep-nom">Prénom et nom</label><input class="input" id="ep-nom" value="${esc(patient.nom)}" required></div>
        <div class="grid-2">
          <div class="field"><label for="ep-tel">Téléphone</label><input class="input" id="ep-tel" type="tel" value="${esc(patient.telephone || "")}"></div>
          <div class="field"><label for="ep-mail">E-mail</label><input class="input" id="ep-mail" type="email" value="${esc(patient.email || "")}"></div>
        </div>
        <div class="field"><label for="ep-note">Note</label><input class="input" id="ep-note" value="${esc(patient.note || "")}"></div>
      </form>`,
      foot:`<button class="btn" type="button" data-close>Annuler</button><button class="btn primary" type="submit" form="ep">Enregistrer</button>`
    });
    s.el.querySelector("#ep").addEventListener("submit", async e => {
      e.preventDefault();
      const patch = {
        nom: s.el.querySelector("#ep-nom").value.trim() || patient.nom,
        telephone: s.el.querySelector("#ep-tel").value.trim(),
        email: s.el.querySelector("#ep-mail").value.trim(),
        note: s.el.querySelector("#ep-note").value.trim()
      };
      await C.updatePatient(patient.cle, patch);
      Object.assign(patient, patch);
      s.close();
      toast("Fiche mise à jour.", { type:"ok" });
      document.querySelector(".topbar-title") && (document.querySelector(".topbar-title").textContent = patient.nom);
      render();
    });
  };

  const morePatient = () => {
    const s = openSheet({
      title:"Plus d'options",
      body:`<div class="list">
        <button class="list-item" type="button" id="mo-print"><span class="li-ico">${icon("print")}</span><span class="li-main"><span class="li-title">Imprimer une carte d'accès</span><span class="li-sub">Avec le QR code, à remettre au patient</span></span></button>
        <button class="list-item" type="button" id="mo-renew"><span class="li-ico">${icon("key")}</span><span class="li-main"><span class="li-title">Générer un nouveau code d'accès</span><span class="li-sub">L'ancien lien ne fonctionnera plus</span></span></button>
        <button class="list-item" type="button" id="mo-del"><span class="li-ico" style="background:var(--danger-soft);color:var(--danger)">${icon("trash")}</span><span class="li-main"><span class="li-title" style="color:var(--danger)">Supprimer le patient</span><span class="li-sub">Avec tous ses programmes</span></span></button>
      </div>`
    });
    s.el.querySelector("#mo-print").onclick = () => { s.close(); UI.printAccessCard(patient); };
    s.el.querySelector("#mo-renew").onclick = async () => {
      s.close();
      const ok = await confirmDialog({ title:"Nouveau code d'accès ?", message:`Le lien actuel de ${patient.nom} cessera de fonctionner. Il faudra lui envoyer le nouveau.`, confirm:"Générer" });
      if(!ok) return;
      const n = await C.renewAccessCode(patient.cle);
      toast("Nouveau code créé.", { type:"ok" });
      location.replace(`/cloud.html?patient=${n}&acces=1`);
    };
    s.el.querySelector("#mo-del").onclick = async () => {
      s.close();
      const nom = await promptDialog({ title:"Supprimer le patient", label:`Pour confirmer, tapez le nom : ${patient.nom}`, confirm:"Supprimer définitivement" });
      if(nom === null) return;
      if(nom.trim().toLowerCase() !== String(patient.nom).trim().toLowerCase()){ toast("Le nom ne correspond pas. Rien n'a été supprimé.", { type:"err" }); return; }
      await C.deletePatient(patient.cle);
      toast("Patient supprimé.", { type:"ok" });
      setTimeout(() => location.replace("/patients.html"), 600);
    };
  };

  app.innerHTML = loadingHTML();
  try{ await load(); }catch(err){ app.innerHTML = errorHTML(err); return; }
  render();
  if(params.get("acces")) UI.accessSheet(patient);
}
