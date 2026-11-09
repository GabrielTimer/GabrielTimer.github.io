/* =========================================================
   Questionnaire rempli → PDF pour le patient
   ---------------------------------------------------------
   Score brut, questions et réponses choisies, sans interprétation :
   le patient peut le montrer à un autre professionnel de santé.
   Partage (iPhone / Android : imprimer, enregistrer, envoyer) ou téléchargement.
   ========================================================= */

import { KINE, settings } from "./app.js";
import { fmtScore } from "./questionnaires.js";

const JSPDF = "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js";
let jspdf = null;
const charger = () => jspdf || (jspdf = new Promise((ok, ko) => {
  if(window.jspdf) return ok();
  const s = document.createElement("script");
  s.src = JSPDF; s.onload = ok; s.onerror = () => { jspdf = null; ko(new Error("Le PDF n'a pas pu être préparé. Vérifiez la connexion.")); };
  document.head.appendChild(s);
}));

/* Police standard du PDF : caractères latins seulement */
const MAP = { "≥":">=", "≤":"<=", "→":"->", "≈":"~", "−":"-", "–":"-", "—":"-", "‘":"'", "’":"'", "“":"\"", "”":"\"", "…":"...", " ":" ", " ":" ", "œ":"oe", "Œ":"OE", "•":"-" };
const t = s => String(s ?? "").replace(/[^\x00-\xFF]/g, ch => MAP[ch] ?? "");

const slug = s => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-|-$/g, "").toLowerCase();

/** Construit le PDF : { blob, nom }. q = questionnaire, rep = valeurs choisies (null = sans réponse). */
export async function questionnairePdf(q, rep, { patient = "", date = new Date(), score = null, sousScores = null } = {}){
  await charger();
  const { jsPDF } = window.jspdf;
  const d = new jsPDF({ unit:"mm", format:"a4", compress:true });
  const W = 210, H = 297, M = 18, CW = W - 2 * M;
  const INK = [20, 48, 58], INK2 = [71, 97, 107], LAGON = [11, 110, 128], LINE = [213, 226, 229];
  let y = M;
  const page = () => { d.addPage(); y = M; };
  const ensure = h => { if(y + h > H - 18) page(); };

  /* En-tête : cabinet */
  const c = settings.cabinet || {};
  d.setFont("helvetica", "bold"); d.setFontSize(11); d.setTextColor(...INK);
  d.text(t(c.nom || KINE.nom), M, y + 4);
  d.setFont("helvetica", "normal"); d.setFontSize(9); d.setTextColor(...INK2);
  d.text(t(c.titre || KINE.titre || ""), M, y + 9);
  const coord = [c.adresse, c.telephone].filter(Boolean).join("\n");
  if(coord) d.text(t(coord).split("\n"), W - M, y + 4, { align:"right", lineHeightFactor:1.35 });
  y += 17;
  d.setDrawColor(...LINE); d.setLineWidth(.4); d.line(M, y, W - M, y);
  y += 10;

  /* Titre, patient, date */
  d.setFont("helvetica", "bold"); d.setFontSize(16); d.setTextColor(...LAGON);
  const titre = d.splitTextToSize(t(q.nom || "Questionnaire"), CW);
  d.text(titre, M, y); y += titre.length * 6.5 + 1;
  d.setFont("helvetica", "normal"); d.setFontSize(10.5); d.setTextColor(...INK2);
  const quand = date.toLocaleDateString("fr-FR", { day:"numeric", month:"long", year:"numeric" });
  d.text(t([patient ? `Rempli par ${patient}` : "", `le ${quand}`].filter(Boolean).join(", ")), M, y);
  y += 9;

  /* Score brut (et sous-scores), sans interprétation */
  const sous = Object.entries(sousScores || {}).filter(([, v]) => v !== null && v !== undefined);
  if((score !== null && score !== undefined) || sous.length){
    const lignes = [];
    if(score !== null && score !== undefined) lignes.push(["Score", fmtScore(score, q)]);
    sous.forEach(([k, v]) => lignes.push([k, fmtScore(v, q)]));
    const h = lignes.length * 6 + 5;
    d.setFillColor(244, 248, 249); d.setDrawColor(...LINE); d.roundedRect(M, y, CW, h, 2.5, 2.5, "FD");
    let sy = y + 7;
    lignes.forEach(([k, v], i) => {
      d.setFont("helvetica", "bold"); d.setFontSize(i === 0 && k === "Score" ? 11 : 10); d.setTextColor(...INK2);
      d.text(t(k), M + 4, sy);
      d.setTextColor(...INK); d.text(t(v), W - M - 4, sy, { align:"right" });
      sy += 6;
    });
    y += h + 8;
  }

  /* Questions et réponses */
  let section = null;
  (q.items || []).forEach((it, i) => {
    if(it.section && it.section !== section){
      section = it.section;
      ensure(16);
      y += 2;
      d.setFont("helvetica", "bold"); d.setFontSize(11); d.setTextColor(...LAGON);
      const sl = d.splitTextToSize(t(section), CW); d.text(sl, M, y); y += sl.length * 5;
      d.setDrawColor(...LINE); d.setLineWidth(.3); d.line(M, y - 2.5, W - M, y - 2.5); y += 3;
    }
    const v = rep[i];
    const opt = v === null || v === undefined ? null : (it.options || []).find(o => o.valeur === v);
    const qLines = d.splitTextToSize(t(`${i + 1}. ${it.texte || ""}`), CW);
    const aLines = d.splitTextToSize(t(opt ? opt.texte : "Sans réponse"), CW - 6);
    ensure(qLines.length * 4.9 + aLines.length * 4.9 + 6);
    d.setFont("helvetica", "bold"); d.setFontSize(10); d.setTextColor(...INK);
    d.text(qLines, M, y); y += qLines.length * 4.9;
    d.setFont("helvetica", opt ? "normal" : "italic"); d.setFontSize(10); d.setTextColor(...(opt ? LAGON : INK2));
    d.text(aLines, M + 6, y); y += aLines.length * 4.9 + 4;
  });

  /* Pied de page : numéros */
  const n = d.getNumberOfPages();
  for(let p = 1; p <= n; p++){
    d.setPage(p);
    d.setFont("helvetica", "normal"); d.setFontSize(8); d.setTextColor(...INK2);
    d.text(t(`${q.nom || "Questionnaire"} · ${quand}${n > 1 ? ` · page ${p}/${n}` : ""}`), W / 2, H - 10, { align:"center" });
  }
  const iso = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  return { blob: d.output("blob"), nom: `${slug(q.nom) || "questionnaire"}-${iso}.pdf` };
}

/** Partage (menu du téléphone : imprimer, enregistrer, envoyer…) ou, à défaut, téléchargement. */
export async function partagerPdf({ blob, nom }, titre = "Mes réponses"){
  const file = typeof File !== "undefined" ? new File([blob], nom, { type:"application/pdf" }) : null;
  if(file && navigator.canShare?.({ files:[file] })){
    try{ await navigator.share({ files:[file], title:titre }); return "partage"; }
    catch(e){ if(e?.name === "AbortError") return "annule"; }
  }
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob); a.download = nom;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 10000);
  return "telechargement";
}
