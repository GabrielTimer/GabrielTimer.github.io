/* Affichage d'un programme (semaines et séances), côté patient et côté kiné */

import {
  openSheet, toast, esc, icon, byWeek, fmtDate, fmtShortDate, startOfDay, daysFromToday, evaColor, ressentiLabel,
  sessionDuration, fmtDuree, plural, evaTrend, store
} from "./app.js";

function sessionState(s, next){
  if(s.terminee) return "done";
  if(next && s.id === next.id) return "next";
  if(s.datePrevue && startOfDay(s.datePrevue) < startOfDay(new Date())) return "late";
  return "todo";
}

function sessionRow(s, { role, next }){
  const st = sessionState(s, next);
  const d = s.datePrevue ? daysFromToday(s.datePrevue) : null;
  const isLate = !s.terminee && d !== null && d < 0;
  const when = d === 0 && !s.terminee ? `<span class="badge sun">Aujourd'hui</span>` : isLate ? `<span class="badge danger">En retard</span>` : "";
  const stateIco = st === "done" ? icon("check") : st === "late" ? icon("clock") : st === "next" ? icon("play") : (s.datePrevue ? new Date(s.datePrevue).getDate() : icon("circle"));
  let sub = s.datePrevue ? fmtDate(s.datePrevue, { weekday:"long", day:"numeric", month:"long" }) : fmtDuree(sessionDuration(s.data));
  if(s.terminee){
    const parts = [];
    if(s.dateValidation) parts.push("faite le " + fmtShortDate(s.dateValidation));
    sub = (s.datePrevue ? sub + ", " : "") + parts.join(", ");
  }
  const eva = s.terminee && s.eva !== undefined && s.eva !== null && s.eva !== ""
    ? `<span class="eva-pill" title="Douleur"><i style="background:${evaColor(s.eva)}"></i>${esc(s.eva)}/10</span>` : "";
  const ress = s.ressenti ? `<span class="badge">${esc(ressentiLabel(s.ressenti))}</span>` : "";

  let actions = "";
  if(role === "kine"){
    actions = `
      <button class="btn sm" type="button" data-act="tester" data-id="${esc(s.id)}">${icon("play")}Tester</button>
      <button class="icon-btn sm" type="button" data-act="modifier" data-id="${esc(s.id)}" aria-label="Modifier la séance ${esc(s.label || "")}">${icon("edit")}</button>
      ${!s.terminee ? `<button class="icon-btn sm" type="button" data-act="valider" data-id="${esc(s.id)}" aria-label="Marquer comme faite">${icon("checkCircle")}</button>` : ""}
      <button class="icon-btn sm danger" type="button" data-act="supprimer" data-id="${esc(s.id)}" aria-label="Supprimer la séance ${esc(s.label || "")}">${icon("trash")}</button>`;
  }else{
    actions = s.terminee
      ? `<button class="btn sm ghost" type="button" data-act="lancer" data-id="${esc(s.id)}">${icon("repeat")}Refaire</button>`
      : `<button class="btn sm ${st === "next" ? "primary" : ""}" type="button" data-act="lancer" data-id="${esc(s.id)}">${icon("play")}${st === "next" ? "Commencer" : "Lancer"}</button>
         <button class="btn sm ghost" type="button" data-act="valider" data-id="${esc(s.id)}">À valider</button>`;
  }

  return `
    <div class="session-row is-${st}">
      <span class="s-state">${stateIco}</span>
      <div class="s-main">
        <div class="s-title">${esc(s.label || s.nom || "Séance")} ${when} ${eva} ${ress}</div>
        <div class="s-sub">${esc(sub)}</div>
      </div>
      <div class="s-actions">${actions}</div>
      ${s.commentaire ? `<div class="quote">${icon("message", "ic-inline")} ${esc(s.commentaire)}</div>` : ""}
    </div>`;
}

/** HTML d'un programme complet. */
export function programmeHTML(prog, { role = "patient", open = true } = {}){
  const weeks = byWeek(prog.seances);
  const next = prog.prochaine;
  const today = startOfDay(new Date());
  const firstOpen = weeks.find(w => w.faites < w.seances.length)?.semaine;
  const spine = prog.seances.map(s => {
    const cls = s.terminee ? "done" : next && s.id === next.id ? "now" : s.datePrevue && startOfDay(s.datePrevue) < today ? "late" : "";
    return `<i class="${cls}"></i>`;
  }).join("");
  const tr = evaTrend(prog.evas);
  const trTxt = tr ? (tr.dir === "down" ? `${icon("trendDown")}Douleur en baisse` : tr.dir === "up" ? `${icon("trendUp")}Douleur en hausse` : `${icon("trendFlat")}Douleur stable`) : "";
  const isCourse = prog.categorie === "course";

  const canMove = !prog.termine && prog.seances.some(x => !x.terminee && x.datePrevue);
  const daysBtn = canMove ? `<button class="btn sm" type="button" data-pact="jours">${icon("calendar")}${role === "kine" ? "Changer les jours" : "Changer mes jours"}</button>` : "";
  const actions = role === "kine" ? `
      ${daysBtn}
      <button class="btn sm" type="button" data-pact="pdf">${icon("pdf")}PDF</button>
      <button class="btn sm" type="button" data-pact="copier">${icon("copy")}Copier pour un patient</button>
      ${!isCourse ? `<button class="btn sm" type="button" data-pact="modele">${icon("layers")}Enregistrer comme modèle</button>` : ""}
      <button class="btn sm danger" type="button" data-pact="supprimer">${icon("trash")}Supprimer</button>`
    : `
      ${daysBtn}
      ${prog.faites ? `<button class="btn sm" type="button" data-pact="bilan">${icon("mail")}Envoyer mon bilan</button>` : ""}
      <button class="btn sm" type="button" data-pact="pdf">${icon("pdf")}Fiche PDF</button>`;

  return `
    <article class="prog" data-prog="${esc(prog.id)}">
      <div class="prog-head">
        <div class="prog-title">
          <h2>${isCourse ? icon("run", "ic-inline lagon") + " " : ""}${esc(prog.nom)}</h2>
          ${prog.termine ? `<span class="badge ok">${icon("check")}Terminé</span>` : ""}
        </div>
        <div class="prog-meta">
          <span>${icon("checkCircle")}${prog.faites} sur ${prog.total} séances</span>
          ${prog.debut ? `<span>${icon("calendar")}${esc(fmtShortDate(prog.debut))} au ${esc(fmtShortDate(prog.fin || prog.debut))}</span>` : ""}
          ${trTxt ? `<span>${trTxt}</span>` : ""}
        </div>
        <div class="spine" aria-label="${prog.faites} séances faites sur ${prog.total}">${spine}</div>
        <div class="prog-actions">${actions}</div>
      </div>
      ${weeks.map(w => {
        const dot = w.faites === w.seances.length ? "done" : w.semaine === firstOpen ? (w.faites ? "part" : "now") : w.faites ? "part" : "";
        return `
        <details class="week-block" ${open && w.semaine === firstOpen ? "open" : ""}>
          <summary><span class="wk-dot ${dot}" style="--p:${Math.round(w.faites * 100 / w.seances.length)}%"></span>Semaine ${w.semaine}<span class="wk-count">${w.faites}/${w.seances.length}</span><span class="chev">${icon("down")}</span></summary>
          ${w.seances.map(s => sessionRow(s, { role, next })).join("")}
        </details>`;
      }).join("")}
    </article>`;
}

/** Séances isolées (sans programme). */
export function seulesHTML(seules, { role = "patient" } = {}){
  if(!seules.length) return "";
  return `
    <article class="prog">
      <div class="prog-head"><div class="prog-title"><h2>Séances ponctuelles</h2></div>
      <p class="small muted">${role === "kine" ? "Séances envoyées hors programme." : "À faire quand vous le souhaitez."}</p></div>
      ${seules.map(s => {
        const row = sessionRow({ ...s, label: s.data?.nom || s.nom || "Séance" }, { role, next:null });
        const meta = `${fmtDuree(sessionDuration(s.data))}, ${plural((s.data?.exercices || []).length, "exercice")}`;
        return row.replace(/<div class="s-sub">[^<]*<\/div>/, `<div class="s-sub">${esc(meta)}${s.terminee && s.dateValidation ? ", faite le " + esc(fmtShortDate(s.dateValidation)) : ""}</div>`);
      }).join("")}
    </article>`;
}

/** Ouvre la fiche PDF d'un programme (kiné ou course). */
export function openProgrammePdf(prog, patientNom = ""){
  const first = prog.seances.find(s => s.pdfData) || prog.seances[0];
  if(prog.categorie === "course" && Array.isArray(first.pdfData)){
    store.set("coursePdfData", {
      patient: patientNom || first.patientId, objectif: first.objectif, niveau: first.niveau,
      pathologie: first.pathologie, semaines: first.semainesProgramme, modeAffichage: first.modeAffichage || "temps",
      dateDebut: first.dateDebut, pdfData: first.pdfData
    });
    window.open("/coursepdf.html", "_blank");
    return;
  }
  const data = first.data || {};
  const parSemaine = Math.max(...byWeek(prog.seances).map(w => w.seances.length));
  const nbSemaines = byWeek(prog.seances).length;
  store.set("programme_pdf", {
    ...data,
    nom: prog.nom,
    patient: patientNom,
    duree: nbSemaines > 1 ? `${nbSemaines} semaines` : data.duree || "",
    frequence: parSemaine ? `${parSemaine} séance${parSemaine > 1 ? "s" : ""} par semaine` : data.frequence || "",
    niveau: data.niveau || ""
  });
  window.open("/program_pdf.html", "_blank");
}

export function openSeancePdf(s, patientNom = ""){
  store.set("programme_pdf", { ...(s.data || {}), nom: s.data?.nom || s.nom || "Séance", patient: patientNom });
  window.open("/program_pdf.html", "_blank");
}

/* ---------- Changer les jours d'un programme ---------- */

const JOURS = [[1, "L", "Lundi"], [2, "M", "Mardi"], [3, "M", "Mercredi"], [4, "J", "Jeudi"], [5, "V", "Vendredi"], [6, "S", "Samedi"], [0, "D", "Dimanche"]];

/** Nouvelles dates des séances non faites, à partir d'aujourd'hui, sur les jours choisis. */
export function replanDates(prog, jours){
  const restantes = prog.seances.filter(s => !s.terminee).slice()
    .sort((a, b) => (a.semaine || 0) - (b.semaine || 0) || new Date(a.datePrevue || 0) - new Date(b.datePrevue || 0));
  const today = startOfDay(new Date());
  const faiteAujourdhui = prog.seances.some(s => s.terminee && s.dateValidation && startOfDay(s.dateValidation).getTime() === today.getTime());
  const d = new Date(today); d.setHours(12, 0, 0, 0);
  if(faiteAujourdhui) d.setDate(d.getDate() + 1);
  const out = [];
  let guard = 0;
  while(out.length < restantes.length && guard++ < 800){
    if(jours.includes(d.getDay())) out.push(new Date(d));
    d.setDate(d.getDate() + 1);
  }
  return restantes.map((s, i) => ({ seance: s, date: out[i] }));
}

/** Fenêtre de choix des jours. onSave(changes) reçoit la liste à enregistrer. */
export function changeDaysSheet(prog, { role = "patient", onSave }){
  const weeks = byWeek(prog.seances.slice());
  const n = Math.max(1, ...weeks.map(w => w.seances.length));
  const current = Array.from(new Set(prog.seances.filter(s => !s.terminee && s.datePrevue).map(s => new Date(s.datePrevue).getDay())));
  let jours = current.length === n ? current : [];
  const s = openSheet({
    title: role === "kine" ? "Changer les jours" : "Changer mes jours",
    body: `
      <div class="stack" style="--gap:16px">
        <p>${role === "kine" ? "Choisissez" : "Choisissez les jours qui vous conviennent le mieux :"} <strong>${n} jour${n > 1 ? "s" : ""} par semaine</strong>.</p>
        <div class="days" id="cd-days">${JOURS.map(([v, l, full]) => `<button type="button" data-day="${v}" aria-pressed="${jours.includes(v)}" aria-label="${full}">${l}</button>`).join("")}</div>
        <p class="hint" id="cd-hint"></p>
        <div class="plan-preview" id="cd-prev" style="padding:12px 14px;border-radius:var(--r-md);background:var(--surface-2);font-size:var(--fs-sm);color:var(--ink-2)"></div>
      </div>`,
    foot: `<button class="btn" type="button" data-close>Annuler</button><button class="btn primary" type="button" id="cd-ok">${icon("check")}Enregistrer</button>`
  });
  const render = () => {
    s.el.querySelectorAll("[data-day]").forEach(b => b.setAttribute("aria-pressed", String(jours.includes(+b.dataset.day))));
    const ok = jours.length === n;
    s.el.querySelector("#cd-ok").disabled = !ok;
    const hint = s.el.querySelector("#cd-hint");
    hint.textContent = ok ? "" : `Sélectionnez ${n} jour${n > 1 ? "s" : ""} (${jours.length} choisi${jours.length > 1 ? "s" : ""}).`;
    hint.style.color = ok ? "" : "var(--danger)";
    const prev = s.el.querySelector("#cd-prev");
    if(!ok){ prev.textContent = "Les séances restantes seront replacées à partir d'aujourd'hui."; return; }
    const plan = replanDates(prog, jours);
    const next = plan.slice(0, 3).map(x => fmtDate(x.date, { weekday:"long", day:"numeric", month:"long" }).toLowerCase());
    prev.innerHTML = `<strong>${plan.length} séance${plan.length > 1 ? "s" : ""} à venir</strong> : ${esc(next.join(", "))}${plan.length > 3 ? "…" : ""}<br>Dernière séance le ${esc(fmtDate(plan[plan.length - 1].date, { weekday:"long", day:"numeric", month:"long" }).toLowerCase())}.`;
  };
  s.el.querySelectorAll("[data-day]").forEach(b => b.onclick = () => {
    const v = +b.dataset.day;
    if(jours.includes(v)) jours = jours.filter(x => x !== v);
    else if(jours.length < n) jours = [...jours, v];
    else if(n === 1) jours = [v];
    else { toast(`Retirez d'abord un jour : ${n} jour${n > 1 ? "s" : ""} par semaine.`); return; }
    render();
  });
  s.el.querySelector("#cd-ok").onclick = async () => {
    const btn = s.el.querySelector("#cd-ok");
    btn.disabled = true;
    const noms = JOURS.filter(j => jours.includes(j[0])).map(j => j[2].toLowerCase());
    const changes = replanDates(prog, jours).map(({ seance, date }) => ({
      id: seance.id, datePrevue: date.toISOString(), datePrevueTexte: date.toLocaleDateString("fr-FR"), joursProgramme: noms
    }));
    try{ await onSave(changes); s.close(); }
    catch(err){ btn.disabled = false; toast("Enregistrement impossible. Vérifiez votre connexion.", { type:"err" }); }
  };
  render();
}
