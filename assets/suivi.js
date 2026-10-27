/* =========================================================
   Suivi du patient : objectifs, questionnaires, conseils,
   notes privées, encouragements
   ========================================================= */

import { esc, icon, openSheet, toast, confirmDialog, promptDialog, fmtShortDate, fmtDate, startOfDay, plural } from "./app.js";
import { fmtScore, isDue, unitOf } from "./questionnaires.js";
import { CONSEILS_FOURNIS, mergeConseils } from "./conseils-data.js";

const DAY = 864e5;
export const OBJ_JOURS = 14;

/* ---------- Petite courbe SVG ---------- */

export function sparkHTML(values, { min = 0, max = 10, w = 120, h = 44, better = "haut" } = {}){
  const v = values.filter(x => x !== null && x !== undefined && !Number.isNaN(Number(x))).map(Number);
  if(v.length < 2) return "";
  const x = i => 4 + i * (w - 8) / (v.length - 1);
  const y = val => h - 4 - (Math.min(max, Math.max(min, val)) - min) / ((max - min) || 1) * (h - 8);
  const d = v.map((val, i) => `${i ? "L" : "M"}${x(i).toFixed(1)} ${y(val).toFixed(1)}`).join(" ");
  const good = better === "haut" ? v[v.length - 1] >= v[0] : v[v.length - 1] <= v[0];
  const col = v[v.length - 1] === v[0] ? "var(--ink-3)" : good ? "var(--ok)" : "var(--danger)";
  return `<svg class="spark" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" aria-hidden="true"><path d="${d}" fill="none" stroke="${col}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>${v.map((val, i) => `<circle cx="${x(i).toFixed(1)}" cy="${y(val).toFixed(1)}" r="${i === v.length - 1 ? 3.5 : 2.2}" fill="${col}"/>`).join("")}</svg>`;
}

/* ---------- Côté patient : ce qui est à faire, encouragements ---------- */

export function todoList(patient, suivis, questionnaires){
  const out = [];
  const goals = patient.objectifs || [];
  if(goals.length){
    const last = suivis.filter(s => s.type === "objectifs").pop();
    if(isDue(last?.date, patient.objectifsJours || OBJ_JOURS)){
      out.push({ ico:"target", titre:"Faire le point sur mes objectifs", sous: plural(goals.length, "objectif") + ", 1 minute", href:"/suivi.html?objectifs=1" });
    }
  }
  (patient.questionnaires || []).forEach(a => {
    const q = questionnaires.find(x => x.id === a.qid);
    if(!q) return;
    const last = suivis.filter(s => s.type === "questionnaire" && s.qid === a.qid).pop();
    if(isDue(last?.date, a.jours)){
      out.push({ ico:"list", titre:`Questionnaire : ${q.nom}`, sous: plural((q.items || []).length, "question"), href:`/suivi.html?q=${encodeURIComponent(q.id)}` });
    }
  });
  return out;
}

/**
 * Semaines consécutives sans séance manquée, en remontant depuis la semaine dernière
 * (la semaine en cours compte si toutes ses séances déjà passées sont faites).
 */
export function weekStreak(seances){
  const dated = seances.filter(s => s.datePrevue);
  if(!dated.length) return 0;
  const today = startOfDay(new Date());
  const monday = d => { const x = startOfDay(d); x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); return x.getTime(); };
  const weeks = new Map();
  dated.forEach(s => { const k = monday(s.datePrevue); if(!weeks.has(k)) weeks.set(k, []); weeks.get(k).push(s); });
  const keys = [...weeks.keys()].filter(k => k <= monday(today)).sort((a, b) => b - a);
  let n = 0;
  for(const k of keys){
    const list = weeks.get(k);
    const due = list.filter(s => startOfDay(s.datePrevue) < today || s.terminee);
    if(k === monday(today)){
      if(due.some(s => !s.terminee)) break;
      if(due.length) n++;
      continue;
    }
    if(list.every(s => s.terminee)) n++; else break;
  }
  return n;
}

export function streakMessage(n){
  if(n < 2) return null;
  if(n >= 8) return `${n} semaines sans manquer une séance. Remarquable.`;
  if(n >= 4) return `${n} semaines de suite sans séance manquée. Belle régularité.`;
  return `${n} semaines de suite sans séance manquée. Continuez ainsi.`;
}

/* ---------- Côté kiné : bloc « Suivi » de la fiche patient ---------- */

/**
 * Affiche le bloc de suivi dans `box`.
 * C : module cloud ; patient : fiche (modifiée sur place) ; onPatient(patch) : après mise à jour.
 */
export async function mountKineSuivi(box, patient, C){
  let suivis = [], questionnaires = [], notes = [], perso = [];
  let err = null;
  box.innerHTML = `<div class="loading"><div class="spinner"></div><span>Chargement du suivi…</span></div>`;
  try{
    [suivis, questionnaires, notes, perso] = await Promise.all([
      C.listSuivis(patient.cle), C.listQuestionnaires(), C.listNotes(patient.cle), C.listConseils().catch(() => [])
    ]);
  }catch(e){ err = e; }

  if(err){
    const perm = /permission|insufficient/i.test(String(err.code || "") + String(err.message || ""));
    box.innerHTML = `<div class="notice warn">${icon("alert")}<span>${perm
      ? "Le suivi (objectifs, questionnaires, notes) n'est pas encore activé dans Firebase : copiez le fichier <em>firestore.rules</em> dans Firebase (Firestore Database → Règles) puis <em>Publier</em>."
      : "Le suivi n'a pas pu être chargé. Réessayez dans un instant."}</span></div>`;
    return;
  }

  const allConseils = mergeConseils(perso);
  const resolveConseil = id => perso.find(c => c.remplace === id) || perso.find(c => c.id === id) || CONSEILS_FOURNIS.find(c => c.id === id);

  const savePatient = async patch => {
    await C.updatePatient(patient.cle, patch);
    Object.assign(patient, patch);
    render();
  };

  const render = () => {
    const goals = patient.objectifs || [];
    const objSuivis = suivis.filter(s => s.type === "objectifs");
    const lastObj = objSuivis[objSuivis.length - 1];
    const assigned = patient.questionnaires || [];
    const qSuivis = suivis.filter(s => s.type === "questionnaire");
    const qids = [...new Set([...assigned.map(a => a.qid), ...qSuivis.map(s => s.qid)])];

    box.innerHTML = `
      <div class="suivi-grid">
        <section class="panel">
          <div class="panel-head"><h2 style="font-size:var(--fs-lg)">${icon("target", "ic-inline lagon")} Objectifs</h2><button class="btn sm" type="button" data-s="obj-add">${icon("plus")}Ajouter</button></div>
          ${goals.length ? `<div class="sv-list">${goals.map(g => {
            const vals = objSuivis.map(s => s.notes?.[g.id]).filter(v => v !== undefined);
            const lastV = vals[vals.length - 1];
            return `<div class="sv-row">
              <div class="sv-main"><strong>${esc(g.texte)}</strong><span class="small muted">${vals.length ? `${vals[0]}/10 au départ, ${lastV}/10 aujourd'hui` : "Pas encore noté"}</span></div>
              ${sparkHTML(vals, { better:"haut" })}
              <span class="sv-val num">${lastV === undefined ? "–" : lastV}</span>
              <button class="icon-btn sm" type="button" data-s="obj-edit" data-id="${esc(g.id)}" aria-label="Modifier">${icon("edit")}</button>
            </div>`; }).join("")}</div>
            <p class="small muted" style="margin-top:10px">${lastObj ? `Dernier point le ${esc(fmtShortDate(lastObj.date).replace(/\.$/, ""))}.` : "Le patient sera invité à les noter sur son accueil."} Il les note de 0 (impossible) à 10 (comme avant), toutes les ${patient.objectifsJours || OBJ_JOURS} jours.</p>`
          : `<p class="muted small">Définissez avec le patient 1 à 3 activités importantes pour lui (ex. « Porter mon petit-fils », « Courir 20 minutes »). Il les notera de 0 à 10 toutes les deux semaines.</p>`}
        </section>

        <section class="panel">
          <div class="panel-head"><h2 style="font-size:var(--fs-lg)">${icon("list", "ic-inline lagon")} Questionnaires</h2><button class="btn sm" type="button" data-s="q-add">${icon("plus")}Proposer</button></div>
          ${qids.length ? `<div class="sv-list">${qids.map(id => {
            const q = questionnaires.find(x => x.id === id) || { id, nom: qSuivis.find(s => s.qid === id)?.nom || "Questionnaire supprimé" };
            const res = qSuivis.filter(s => s.qid === id);
            const a = assigned.find(x => x.qid === id);
            const last = res[res.length - 1];
            const lo = q.scoring === "somme" && q.items ? 0 : 0;
            const hi = unitOf(q) === "/24" ? 24 : unitOf(q) === "/80" ? 80 : 100;
            return `<div class="sv-row">
              <div class="sv-main"><strong>${esc(q.nom)}</strong><span class="small muted">${res.length ? `${plural(res.length, "réponse")}, la dernière le ${esc(fmtShortDate(last.date))}` : "En attente de réponse"}${a ? (a.jours ? `, tous les ${a.jours} jours` : ", une fois") : ", plus proposé"}</span></div>
              ${(() => { const sc = res.map(r => r.score).filter(v => typeof v === "number"); const pad = Math.max(2, (hi - lo) * .08); return sparkHTML(sc, { min:Math.max(lo, Math.min(...sc) - pad), max:Math.min(hi, Math.max(...sc) + pad), better:q.sens === "haut" ? "haut" : "bas" }); })()}
              <span class="sv-val num">${last ? esc(fmtScore(last.score, q)) : "–"}</span>
              <button class="icon-btn sm" type="button" data-s="q-detail" data-id="${esc(id)}" aria-label="Détail">${icon("chevron")}</button>
            </div>`; }).join("")}</div>`
          : `<p class="muted small">Proposez un questionnaire validé (Oswestry, QuickDASH…) : le patient le remplit sur son téléphone et le score s'affiche ici.${questionnaires.length ? "" : ` Préparez d'abord vos questionnaires dans <a href="/questionnaires.html">Outils, Questionnaires</a>.`}</p>`}
        </section>

        <section class="panel">
          <div class="panel-head"><h2 style="font-size:var(--fs-lg)">${icon("book", "ic-inline lagon")} Fiches conseils</h2><button class="btn sm" type="button" data-s="c-edit">${icon("edit")}Choisir</button></div>
          ${(patient.conseils || []).length ? `<div class="chips">${patient.conseils.map(resolveConseil).filter(Boolean).map(c => `<a class="chip" href="/conseils.html?id=${encodeURIComponent(c.id)}" target="_blank" rel="noopener">${icon(c.ico || "book")}${esc(c.titre)}</a>`).join("")}</div><p class="small muted" style="margin-top:10px">Le patient les retrouve sur son accueil.</p>`
          : `<p class="muted small">Aucune fiche pour l'instant. Choisissez celles à lui transmettre : il les retrouvera sur son accueil.</p>`}
        </section>

        <section class="panel">
          <div class="panel-head"><h2 style="font-size:var(--fs-lg)">${icon("lock", "ic-inline lagon")} Notes de séance</h2><button class="btn sm" type="button" data-s="n-add">${icon("plus")}Ajouter</button></div>
          ${notes.length ? `<div class="notes">${notes.slice(0, 6).map(n => `
            <div class="note">
              <div class="note-head"><span class="small" style="font-weight:700">${esc(fmtDate(n.date, { weekday:"short", day:"numeric", month:"short", year:"numeric" }))}</span>
                <span class="spacer"></span>
                <button class="icon-btn sm" type="button" data-s="n-edit" data-id="${esc(n.id)}" aria-label="Modifier">${icon("edit")}</button>
                <button class="icon-btn sm danger" type="button" data-s="n-del" data-id="${esc(n.id)}" aria-label="Supprimer">${icon("trash")}</button></div>
              <div class="note-txt">${esc(n.texte).replace(/\n/g, "<br>")}</div>
            </div>`).join("")}${notes.length > 6 ? `<button class="btn sm ghost" type="button" data-s="n-all">Voir les ${notes.length} notes</button>` : ""}</div>`
          : `<p class="muted small">Notes datées, visibles par vous seul : ce qui a été fait au cabinet, les réactions, la suite prévue.</p>`}
        </section>
      </div>`;
    bind();
  };

  const bind = () => {
    box.querySelectorAll("[data-s]").forEach(b => b.addEventListener("click", () => actions[b.dataset.s]?.(b.dataset.id)));
  };

  const goalSheet = (goal = null) => {
    const s = openSheet({
      title: goal ? "Modifier l'objectif" : "Nouvel objectif",
      body: `<form id="gf" class="stack" style="--gap:14px">
        <div class="field"><label for="g-t">Activité importante pour le patient</label><input class="input" id="g-t" value="${esc(goal?.texte || "")}" maxlength="120" placeholder="Ex. Porter mon petit-fils sans douleur" required></div>
        ${!goal ? `<div class="field"><label for="g-j">Le patient fait le point tous les</label><select class="select" id="g-j">${[7, 14, 21, 28].map(j => `<option value="${j}" ${j === (patient.objectifsJours || OBJ_JOURS) ? "selected" : ""}>${j} jours</option>`).join("")}</select></div>` : ""}
      </form>`,
      foot: `${goal ? `<button class="btn danger" type="button" id="g-del">${icon("trash")}Retirer</button>` : ""}<button class="btn" type="button" data-close>Annuler</button><button class="btn primary" type="submit" form="gf">${icon("check")}Enregistrer</button>`
    });
    s.el.querySelector("#gf").addEventListener("submit", async e => {
      e.preventDefault();
      const texte = s.el.querySelector("#g-t").value.trim();
      if(!texte) return;
      const goals = (patient.objectifs || []).slice();
      if(goal) goals[goals.findIndex(g => g.id === goal.id)] = { ...goal, texte };
      else goals.push({ id: Date.now().toString(36), texte, createdAt: Date.now() });
      const patch = { objectifs: goals };
      const j = s.el.querySelector("#g-j"); if(j) patch.objectifsJours = Number(j.value);
      try{ await savePatient(patch); s.close(); toast("Objectif enregistré.", { type:"ok" }); }
      catch(err){ toast("Enregistrement impossible.", { type:"err" }); }
    });
    s.el.querySelector("#g-del")?.addEventListener("click", async () => {
      if(!await confirmDialog({ title:"Retirer cet objectif ?", message:"Les notes déjà données restent dans l'historique.", confirm:"Retirer", danger:true })) return;
      await savePatient({ objectifs: (patient.objectifs || []).filter(g => g.id !== goal.id) }); s.close();
    });
  };

  const noteSheet = (note = null) => {
    const today = new Date(); const iso = d => { const x = new Date(d); return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`; };
    const s = openSheet({
      title: note ? "Modifier la note" : "Note de séance",
      body: `<form id="nf" class="stack" style="--gap:14px">
        <div class="field"><label for="n-d">Date</label><input class="input" id="n-d" type="date" value="${iso(note?.date || today)}"></div>
        <div class="field"><label for="n-t">Note</label><textarea class="textarea" id="n-t" style="min-height:180px" placeholder="Ce qui a été fait, réaction du patient, suite prévue…" required>${esc(note?.texte || "")}</textarea><span class="hint">${icon("lock", "ic-inline")} Visible par vous seul.</span></div>
      </form>`,
      foot: `<button class="btn" type="button" data-close>Annuler</button><button class="btn primary" type="submit" form="nf">${icon("check")}Enregistrer</button>`
    });
    setTimeout(() => s.el.querySelector("#n-t").focus(), 50);
    s.el.querySelector("#nf").addEventListener("submit", async e => {
      e.preventDefault();
      const texte = s.el.querySelector("#n-t").value.trim();
      if(!texte) return;
      const [y, m, d] = s.el.querySelector("#n-d").value.split("-").map(Number);
      const date = y ? new Date(y, m - 1, d, 12).getTime() : Date.now();
      try{
        const id = await C.saveNote(patient.cle, { ...(note || {}), texte, date });
        notes = notes.filter(n => n.id !== id).concat({ ...(note || {}), id, texte, date }).sort((a, b) => b.date - a.date);
        s.close(); render(); toast("Note enregistrée.", { type:"ok" });
      }catch(err){ toast("Enregistrement impossible. Avez-vous publié les nouvelles règles Firebase ?", { type:"err", duration:7000 }); }
    });
  };

  const actions = {
    "obj-add": () => goalSheet(),
    "obj-edit": id => goalSheet((patient.objectifs || []).find(g => g.id === id)),
    "q-add": () => {
      if(!questionnaires.length){ location.href = "/questionnaires.html"; return; }
      const s = openSheet({
        title: "Proposer un questionnaire",
        body: `<form id="qa" class="stack" style="--gap:14px">
          <div class="field"><label for="qa-q">Questionnaire</label><select class="select" id="qa-q">${questionnaires.map(q => `<option value="${esc(q.id)}">${esc(q.nom)}</option>`).join("")}</select></div>
          <div class="field"><label for="qa-j">Fréquence</label><select class="select" id="qa-j"><option value="0">Une seule fois</option><option value="14">Toutes les 2 semaines</option><option value="21">Toutes les 3 semaines</option><option value="28" selected>Toutes les 4 semaines</option><option value="42">Toutes les 6 semaines</option></select></div>
          <p class="small muted">Le patient le voit sur son accueil quand c'est le moment de le remplir.</p>
        </form>`,
        foot: `<button class="btn" type="button" data-close>Annuler</button><button class="btn primary" type="submit" form="qa">${icon("check")}Proposer</button>`
      });
      s.el.querySelector("#qa").addEventListener("submit", async e => {
        e.preventDefault();
        const qid = s.el.querySelector("#qa-q").value, jours = Number(s.el.querySelector("#qa-j").value);
        const list = (patient.questionnaires || []).filter(a => a.qid !== qid).concat({ qid, jours, depuis: Date.now() });
        await savePatient({ questionnaires: list }); s.close(); toast("Questionnaire proposé au patient.", { type:"ok" });
      });
    },
    "q-detail": id => {
      const q = questionnaires.find(x => x.id === id) || { id, nom:"Questionnaire" };
      const res = suivis.filter(s => s.type === "questionnaire" && s.qid === id).slice().reverse();
      const a = (patient.questionnaires || []).find(x => x.qid === id);
      const s = openSheet({
        title: q.nom,
        body: `<div class="stack" style="--gap:14px">
          ${q.interpretation ? `<p class="small muted">${esc(q.interpretation)}</p>` : ""}
          ${res.length ? `<table class="tbl"><thead><tr><th>Date</th><th>Score</th>${res.some(r => r.sousScores) ? "<th>Détail</th>" : ""}</tr></thead><tbody>${res.map((r, k) => {
            const prev = res[k + 1];
            const delta = prev && r.score !== undefined && prev.score !== undefined ? Math.round((r.score - prev.score) * 10) / 10 : null;
            return `<tr><td>${esc(fmtShortDate(r.date))}</td><td class="num"><strong>${esc(fmtScore(r.score, q))}</strong>${delta ? ` <span class="faint">(${delta > 0 ? "+" : ""}${String(delta).replace(".", ",")})</span>` : ""}</td>${r.sousScores ? `<td class="small">${Object.entries(r.sousScores).map(([k2, v]) => `${esc(k2)} ${v === null ? "–" : String(v).replace(".", ",")}`).join(" ; ")}</td>` : (res.some(x => x.sousScores) ? "<td></td>" : "")}</tr>`; }).join("")}</tbody></table>`
          : `<p class="muted">Pas encore de réponse.</p>`}
          <a class="btn" href="/suivi.html?q=${encodeURIComponent(id)}&pour=${encodeURIComponent(patient.cle)}">${icon("edit")}Remplir avec le patient, ici</a>
        </div>`,
        foot: `${a ? `<button class="btn danger" type="button" id="qd-stop">Ne plus proposer</button>` : ""}<button class="btn primary" type="button" data-close>Fermer</button>`
      });
      s.el.querySelector("#qd-stop")?.addEventListener("click", async () => {
        await savePatient({ questionnaires: (patient.questionnaires || []).filter(x => x.qid !== id) }); s.close(); toast("Le questionnaire n'est plus proposé.", { type:"ok" });
      });
    },
    "c-edit": () => {
      let chosen = new Set(patient.conseils || []);
      const keyOf = c => c.remplace || c.id;
      const s = openSheet({
        title: "Fiches conseils du patient",
        body: `<div class="stack" style="--gap:8px">${allConseils.map(c => `
          <label class="check" style="align-items:flex-start;padding:6px 0"><input type="checkbox" value="${esc(keyOf(c))}" ${chosen.has(keyOf(c)) ? "checked" : ""}><span><strong>${esc(c.titre)}</strong><br><span class="small muted">${esc(c.resume || "")}</span></span></label>`).join("")}
          <a class="small" href="/conseils.html" target="_blank" rel="noopener">Gérer et créer des fiches</a></div>`,
        foot: `<button class="btn" type="button" data-close>Annuler</button><button class="btn primary" type="button" id="ce-ok">${icon("check")}Enregistrer</button>`
      });
      s.el.querySelector("#ce-ok").onclick = async () => {
        const ids = [...s.el.querySelectorAll("input:checked")].map(i => i.value);
        await savePatient({ conseils: ids }); s.close(); toast("Fiches conseils mises à jour.", { type:"ok" });
      };
    },
    "n-add": () => noteSheet(),
    "n-edit": id => noteSheet(notes.find(n => n.id === id)),
    "n-del": async id => {
      if(!await confirmDialog({ title:"Supprimer cette note ?", confirm:"Supprimer", danger:true })) return;
      await C.deleteNote(patient.cle, id); notes = notes.filter(n => n.id !== id); render();
    },
    "n-all": () => openSheet({ title:"Notes de séance", wide:true, body:`<div class="notes">${notes.map(n => `<div class="note"><div class="small" style="font-weight:700">${esc(fmtDate(n.date, { weekday:"long", day:"numeric", month:"long", year:"numeric" }))}</div><div class="note-txt">${esc(n.texte).replace(/\n/g, "<br>")}</div></div>`).join("")}</div>` })
  };

  render();
  return { suivis: () => suivis };
}
