/* =========================================================
   Données et actions côté patient
   ========================================================= */

import { getPatient, listSeances } from "./cloud.js";
import { store, groupProgrammes, setRunProgram, KINE, SITE_URL, startOfDay, sessionDuration, evaTrend, fmtNum } from "./app.js";

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

export function bilanMail({ patientNom, programme, remarques = "" }){
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
  location.href = `mailto:${KINE.email}?subject=${encodeURIComponent(sujet)}&body=${encodeURIComponent(corps)}`;
}
