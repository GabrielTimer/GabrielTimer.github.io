/* =========================================================
   Données et actions côté patient
   ========================================================= */

import { getPatient, listSeances, addMessage } from "./cloud.js";
import { store, groupProgrammes, setRunProgram, KINE, SITE_URL, startOfDay, sessionDuration, evaTrend, fmtNum, openSheet, toast, esc, icon } from "./app.js";

/** Charge la fiche et les séances du patient. */
export async function loadPatient(cle){
  const [patient, seances] = await Promise.all([getPatient(cle), listSeances(cle)]);
  if(!patient) return null;
  store.set("gt_patient_nom", patient.nom || "");
  const usable = seances.filter(s => s.data && Array.isArray(s.data.exercices));
  return { patient, seances: usable, ...groupProgrammes(usable) };
}

/** Choisit la séance à mettre en avant sur l'accueil. */
export function nextSession(programmes){
  const actifs = programmes.filter(p => !p.termine);
  const candidates = actifs.map(p => p.prochaine).filter(Boolean);
  candidates.sort((a, b) => new Date(a.datePrevue || 8.64e15) - new Date(b.datePrevue || 8.64e15));
  const s = candidates[0] || null;
  if(!s) return null;
  const prog = actifs.find(p => p.id === s.programmeId);
  return { seance: s, programme: prog };
}

export function lateCount(seances){
  const today = startOfDay(new Date());
  return seances.filter(s => !s.terminee && s.datePrevue && new Date(s.datePrevue) < today).length;
}

/** Régularité : séances faites parmi celles qui étaient prévues jusqu'à aujourd'hui. */
export function regularity(seances){
  const end = new Date(); end.setHours(23, 59, 59, 999);
  const due = seances.filter(s => s.datePrevue && new Date(s.datePrevue) <= end);
  if(!due.length) return null;
  return Math.round(due.filter(s => s.terminee).length * 100 / due.length);
}

/** Lance une séance : respiration guidée ou minuteur. */
export function launchSeance(seance, { cle = null, apercu = false } = {}){
  const data = { ...seance.data, nom: seance.data?.nom || seance.programmeNom || seance.nom || "Séance" };
  const exos = data.exercices || [];
  const resp = { RESP_DEBUTER:"beginner", RESP_APAISER:"calm", RESP_EQUILIBRER:"balance" };
  if(exos.length === 1 && resp[exos[0].id]){
    location.href = `/respir/index.html?mode=${resp[exos[0].id]}&duree=${exos[0].ex}&fromProgram=1&autostart=1`;
    return;
  }
  setRunProgram(data);
  const q = new URLSearchParams();
  if(cle && seance.id) { q.set("cle", cle); q.set("s", seance.id); }
  if(apercu) q.set("apercu", "1");
  location.href = "/timer.html?" + q.toString();
}

/* ---------- Ajout des séances à l'agenda du téléphone (.ics) ---------- */

function icsDate(d){
  const x = new Date(d);
  return `${x.getFullYear()}${String(x.getMonth() + 1).padStart(2, "0")}${String(x.getDate()).padStart(2, "0")}`;
}
function icsEscape(s){ return String(s || "").replace(/[\\;,]/g, m => "\\" + m).replace(/\n/g, "\\n"); }

export function downloadCalendar(seances, { heure = 18 } = {}){
  const now = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d+/, "");
  const futures = seances.filter(s => !s.terminee && s.datePrevue && new Date(s.datePrevue) >= startOfDay(new Date()));
  if(!futures.length) return 0;
  const lines = [
    "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Gabriel LAVEAU//Kine//FR", "CALSCALE:GREGORIAN", "METHOD:PUBLISH"
  ];
  futures.forEach(s => {
    const d = new Date(s.datePrevue);
    const start = `${icsDate(d)}T${String(heure).padStart(2, "0")}0000`;
    const minutes = Math.max(10, Math.round(sessionDuration(s.data) / 60) + 5);
    const endD = new Date(d); endD.setHours(heure, minutes, 0, 0);
    const end = `${icsDate(endD)}T${String(endD.getHours()).padStart(2, "0")}${String(endD.getMinutes()).padStart(2, "0")}00`;
    lines.push(
      "BEGIN:VEVENT",
      `UID:${s.id}@gabrieltimer`,
      `DTSTAMP:${now}`,
      `DTSTART:${start}`,
      `DTEND:${end}`,
      `SUMMARY:${icsEscape("Exercices kiné – " + (s.programmeNom || s.data?.nom || "Séance"))}`,
      `DESCRIPTION:${icsEscape("Ouvrir l'application pour faire la séance : " + SITE_URL)}`,
      `URL:${SITE_URL}`,
      "BEGIN:VALARM", "TRIGGER:-PT0M", "ACTION:DISPLAY", `DESCRIPTION:${icsEscape("C'est l'heure de vos exercices")}`, "END:VALARM",
      "END:VEVENT"
    );
  });
  lines.push("END:VCALENDAR");
  const blob = new Blob([lines.join("\r\n")], { type:"text/calendar;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "seances-kine.ics";
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  return futures.length;
}

/* ---------- Bilan envoyé au kiné ---------- */

/**
 * Enregistre une copie du message dans ApiKiné (visible par le kiné),
 * puis ouvre la messagerie du patient. L'e-mail part même si la copie échoue.
 * cle : code du patient (absent en aperçu kiné : pas de copie).
 */
export async function sendToKine({ cle, type = "message", sujet, texte, mail = true }){
  let saved = false;
  if(cle){
    try{ await Promise.race([addMessage(cle, { type, sujet, texte }), new Promise((_, r) => setTimeout(() => r(new Error("délai")), 6000))]); saved = true; }
    catch(e){ console.warn("Copie du message impossible", e); }
  }
  if(mail) location.href = `mailto:${KINE.email}?subject=${encodeURIComponent(sujet)}&body=${encodeURIComponent(texte)}`;
  return saved;
}

/** Fenêtre « Écrire à mon kiné » : le message est gardé dans ApiKiné et, au choix, envoyé par e-mail. */
export function writeToKine({ cle, apercu = false, patientNom = "", sujet = "" } = {}){
  const s = openSheet({
    title: "Écrire à mon kiné",
    body: `<form id="wk" class="stack" style="--gap:14px">
      <div class="field"><label for="wk-s">Sujet</label><input class="input" id="wk-s" maxlength="120" value="${esc(sujet)}" placeholder="Question sur mes exercices"></div>
      <div class="field"><label for="wk-t">Votre message</label><textarea class="textarea" id="wk-t" required maxlength="4000" style="min-height:160px" placeholder="Écrivez ici votre question ou votre remarque…"></textarea></div>
      <label class="check"><input type="checkbox" id="wk-m" checked> Ouvrir aussi ma messagerie pour l'envoyer par e-mail</label>
      <p class="small muted">${icon("info")} ${esc(KINE.nom)} retrouvera votre message dans l'application. Pour une urgence, appelez le cabinet.</p>
    </form>`,
    foot: `<button class="btn" type="button" data-close>Annuler</button><button class="btn primary" type="submit" form="wk">${icon("send")}Envoyer</button>`
  });
  const t = s.el.querySelector("#wk-t");
  setTimeout(() => t.focus(), 50);
  s.el.querySelector("#wk").addEventListener("submit", async e => {
    e.preventDefault();
    const texte = t.value.trim();
    if(!texte){ t.focus(); return; }
    const sj = s.el.querySelector("#wk-s").value.trim() || "Question sur mes exercices";
    const mail = s.el.querySelector("#wk-m").checked;
    const btn = s.el.querySelector("[type=submit]"); btn.disabled = true;
    if(apercu){ s.close(); toast("Aperçu : le message n'est pas envoyé."); return; }
    const corps = `${texte}\n\n${patientNom || ""}`.trim();
    const saved = await sendToKine({ cle, type: "message", sujet: sj, texte: mail ? corps : texte, mail });
    s.close();
    if(saved) toast(mail ? "Message enregistré. Votre messagerie s'ouvre pour l'e-mail." : "Message envoyé à votre kiné.", { type: "ok", duration: 5000 });
    else if(!mail) toast("Envoi impossible pour le moment. Vérifiez votre connexion, ou cochez l'envoi par e-mail.", { type: "err", duration: 7000 });
  });
  return s;
}

export function bilanMail({ cle, patientNom, programme, remarques = "" }){
  const evas = programme.evas;
  const moy = evas.length ? fmtNum(evas.reduce((a, b) => a + b, 0) / evas.length) : "–";
  const tr = evaTrend(evas);
  const lignes = programme.seances.filter(s => s.terminee).map(s => {
    const d = s.dateValidation ? new Date(s.dateValidation).toLocaleDateString("fr-FR") : "–";
    return `- ${d} : ${s.label || s.nom || "Séance"}, douleur ${s.eva ?? "–"}/10${s.commentaire ? ` (« ${s.commentaire} »)` : ""}`;
  }).join("\n");
  const sujet = `${programme.termine ? "Programme terminé" : "Point d'étape"} – ${programme.nom}`;
  const corps = `Bonjour ${KINE.nom.split(" ")[0]},

${programme.termine ? "J'ai terminé mon programme" : "Voici où j'en suis de mon programme"} « ${programme.nom} ».

Séances réalisées : ${programme.faites}/${programme.total}
Douleur moyenne : ${moy}/10${tr ? `\nDouleur au début : ${fmtNum(tr.debut)}/10, récemment : ${fmtNum(tr.fin)}/10` : ""}

Détail des séances :
${lignes || "Aucune séance validée pour l'instant."}

Remarques :
${remarques || "Aucune remarque."}

Cordialement,
${patientNom || ""}`;
  return sendToKine({ cle, type: "bilan", sujet, texte: corps });
}
