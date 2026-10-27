/* =========================================================
   Bilans kiné : contenu clinique, résumé, comparaison, PDF, envoi
   ---------------------------------------------------------
   Le contenu clinique (régions, tests, LR, sources) reste dans
   /bilan-kine/data.js et les fiches de tests dans /bilan-kine/guide.js :
   on les modifie sans toucher au code de l'application.
   ========================================================= */

import { esc, icon, toast, openSheet, KINE, settings, logoSrc } from "./app.js";
import { neuroSummary } from "./nerfs-data.js";

/* ---------- Chargement du contenu clinique ---------- */

const scripts = {};
function loadScript(src){
  return scripts[src] || (scripts[src] = new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = src;
    s.onload = resolve;
    s.onerror = () => { delete scripts[src]; reject(new Error("Chargement impossible : " + src)); };
    document.head.appendChild(s);
  }));
}

export let K = null;
export async function loadClinic(){
  if(K) return K;
  await loadScript("/bilan-kine/data.js");
  await loadScript("/bilan-kine/guide.js").catch(() => {});
  K = new Function("return { MES, SEC, TYPES, Z, R, MAPPING, SRC, PROM, REG, GUIDE: typeof GUIDE !== 'undefined' ? GUIDE : {} }")();
  K.sec = key => K.SEC.find(s => s[0] === key) || [key, key, []];
  return K;
}

/* ---------- Types de bilan et état vide ---------- */

export const BTYPES = [
  ["initial", "Bilan initial"],
  ["intermediaire", "Bilan intermédiaire"],
  ["final", "Bilan de fin de traitement"]
];
export const typeLabel = t => (BTYPES.find(x => x[0] === t) || BTYPES[0])[1];

export const todayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
export const fmtISO = iso => {
  if(!iso) return "";
  const [y, m, d] = String(iso).split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1).toLocaleDateString("fr-FR");
};
export const fmtISOLong = iso => {
  if(!iso) return "";
  const [y, m, d] = String(iso).split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1).toLocaleDateString("fr-FR", { day:"numeric", month:"long", year:"numeric" });
};

export function blankState(type = "initial"){
  return { type, date: todayISO(), f:{}, c:{}, pain:{}, cl:{}, view:"face" };
}

/** Pour un nouveau bilan : reprend ce qui change peu (contexte, antécédents, médecin). */
export function carryOver(prev){
  const S = blankState("intermediaire");
  if(!prev) return S;
  ["prof", "naiss", "med", "medmail", "patho", "atcd", "medic"].forEach(k => { if(prev.f?.[k]) S.f[k] = prev.f[k]; });
  ["patho", "atcd", "medic"].forEach(k => { if(prev.c?.[k]?.length) S.c[k] = [...prev.c[k]]; });
  return S;
}

/* ---------- Zones, régions, tests ---------- */

export function zones(view){
  const d = K.Z[view], out = [];
  d.mid.forEach(z => out.push([z[0], ...z.slice(1)]));
  d.side.forEach(z => {
    out.push([z[0] + " " + d.L, ...z.slice(1)]);
    out.push([z[0] + " " + K.R[d.L], 200 - z[1] - z[3], ...z.slice(2)]);
  });
  return out;
}

export const regionOf = n => {
  const b = String(n).replace(/ [DG]$/, "");
  const m = K.MAPPING.find(([re]) => re.test(b));
  return m ? m[1] : null;
};

export const zoneState = (S, n) => {
  S.cl = S.cl || {};
  return S.cl[n] = S.cl[n] || { s:[], t:{} };
};
const zoneRead = (S, n) => (S.cl && S.cl[n]) || { s:[], t:{} };

export const f1 = x => x == null ? "–" : String(x).replace(".", ",");
export const verdict = (p, m) => p != null && p >= 5 ? "confirm" : m != null && m <= 0.2 ? "exclure" : "limite";
export const VERDICT = { confirm:"aide à confirmer", exclure:"aide à exclure", limite:"apport limité" };

export function clusterText(r, c){
  const k = r.CL;
  if(!k) return "";
  const p = k.items.filter(x => c.t[x] === 1).length;
  if(!p) return "";
  const u = [...k.rules].reverse().find(x => p >= x[0]);
  return p + "/" + k.items.length + " positifs" + (u ? " → LR+ " + f1(u[1]) : " (seuil de " + k.rules[0][0] + " non atteint)");
}

export const regionSources = r => [...new Set(r.T.map(t => t[4]).concat(r.src || []))];

/* ---------- Comparaison avec un bilan précédent ---------- */

export function compare(prev, cur){
  const out = [];
  if(!prev || !cur) return out;
  K.MES.forEach(([k, l, mid, dir]) => {
    const x = parseFloat(String(prev.f?.[k] ?? "").replace(",", ".")), y = parseFloat(String(cur.f?.[k] ?? "").replace(",", "."));
    if(isNaN(x) || isNaN(y)) return;
    const d = Math.round((y - x) * 10) / 10;
    const sens = mid && Math.abs(d) >= mid ? (d * dir > 0 ? "mieux" : "moins") : null;
    out.push({ label:l, from:x, to:y, delta:d, sens, texte:`${l} : ${f1(x)} → ${f1(y)} (${d > 0 ? "+" : ""}${f1(d)})${sens === "mieux" ? " — amélioration ≥ MID" : sens === "moins" ? " — aggravation ≥ MID" : ""}` });
  });
  Object.keys({ ...(prev.pain || {}), ...(cur.pain || {}) }).forEach(n => {
    const x = prev.pain?.[n]?.eva, y = cur.pain?.[n]?.eva;
    const d = x != null && y != null ? y - x : null;
    out.push({ label:"EVA " + n, from:x, to:y, delta:d, sens: d != null && Math.abs(d) >= 2 ? (d < 0 ? "mieux" : "moins") : null, texte:`EVA ${n} : ${x == null ? "–" : x} → ${y == null ? "–" : y}` });
  });
  return out;
}

/* ---------- Contenu du bilan (pour le résumé et le PDF) ---------- */

const joinSec = (S, key) => {
  const a = [...(S.c?.[key] || [])], x = String(S.f?.[key] || "").trim();
  if(x) a.push(x);
  return a.join(", ");
};

/**
 * Le bilan mis en forme : { titre, date, patient:[[libellé, valeur]], sections:[{ h, rows:[[libellé, valeur]], alerte }] }
 * prev : état du bilan précédent (pour l'évolution), prevDate : sa date.
 */
export function report(S, patient = {}, { prev = null, prevDate = "" } = {}){
  const f = S.f || {};
  const R = { titre: typeLabel(S.type), date: fmtISO(S.date), patient:[], sections:[] };
  const add = (h, rows, extra = {}) => { rows = rows.filter(r => r && r[1]); if(rows.length || extra.texte) R.sections.push({ h, rows, ...extra }); };

  R.patient.push(["Patient", patient.nom || ""]);
  if(f.naiss) R.patient.push(["Naissance", f.naiss]);
  if(f.prof) R.patient.push(["Profession", f.prof]);
  if(f.med) R.patient.push(["Prescripteur", f.med]);

  add("Motif et contexte", [
    ["Motif", joinSec(S, "patho")],
    ["Antécédents", joinSec(S, "atcd")],
    ["Médication", joinSec(S, "medic")]
  ]);

  const pz = Object.entries(S.pain || {}).map(([n, p]) => n + " : EVA " + p.eva + "/10" + (p.types?.length ? " (" + p.types.join(", ").toLowerCase() + ")" : ""));
  const d4 = (S.c?.dn4 || []).length;
  add("Douleur et examen", [
    ["Douleur", pz.join(" ; ")],
    ["Observation", joinSec(S, "obs")],
    ["DN4", d4 ? `${d4}/10 ${d4 >= 4 ? "(douleur neuropathique probable, seuil ≥ 4)" : "(seuil ≥ 4 non atteint)"}` + (S.c.dn4.length ? " : " + S.c.dn4.join(", ").toLowerCase() : "") : ""]
  ]);

  const neuro = neuroSummary(S.neuro || {});
  if(neuro.length) add("Examen neurologique", neuro.map(l => { const i = l.indexOf(" : "); return [l.slice(0, i), l.slice(i + 3)]; }));

  Object.keys(S.pain || {}).filter(regionOf).forEach(n => {
    const r = K.REG[regionOf(n)], c = zoneRead(S, n);
    const rf = c.s.filter(x => r.RF.includes(x));
    const tests = r.T.filter(t => c.t[t[0]]).map(t => t[0] + (c.t[t[0]] > 0 ? " positif (LR+ " + f1(t[2]) + ")" : " négatif (LR− " + f1(t[3]) + ")"));
    const k = clusterText(r, c);
    add("Analyse · " + n, [
      ["Drapeaux rouges", rf.join(", ")],
      ["Tests", tests.join(" ; ")],
      ["Cluster", k ? r.CL.n + " : " + k : ""]
    ], rf.length ? { alerte: r.RFm } : {});
  });

  const mes = K.MES.filter(([k]) => String(f[k] ?? "").trim() !== "").map(([k, l]) => [l, String(f[k])]);
  if(mes.length) add("Mesures", mes);

  if(prev){
    const ev = compare(prev, S);
    if(ev.length) add("Évolution depuis le " + fmtISO(prevDate), ev.map(e => [e.label, e.texte.replace(e.label + " : ", "")]));
  }

  add("Conclusion et projet", [
    ["Diagnostic kiné", String(f.concl || "").trim()],
    ["Objectifs", joinSec(S, "obj")],
    ["Traitement prévu", joinSec(S, "plan")],
    ["Repères retenus", (S.c?.prog || []).join(" ; ")]
  ]);
  return R;
}

/** Texte à coller dans Maiia. */
export function summaryText(S, patient, opts){
  const R = report(S, patient, opts);
  const L = [`${R.titre.toUpperCase()} — ${R.date}`, R.patient.map(([l, v]) => l === "Patient" ? v : `${l.toLowerCase()} : ${v}`).join(" · ")];
  R.sections.forEach(s => {
    L.push("");
    L.push(s.h.toUpperCase());
    if(s.alerte) L.push("! " + s.alerte);
    s.rows.forEach(([l, v]) => L.push(`${l} : ${v}`));
  });
  return L.join("\n");
}

/** Une ligne de description pour les listes : « Genou D EVA 6 · Gonalgie ». */
export function shortLine(S){
  const z = Object.entries(S?.pain || {}).map(([n, p]) => `${n} ${p.eva}/10`).slice(0, 3).join(", ");
  const m = [...(S?.c?.patho || [])].concat(S?.f?.patho ? [S.f.patho] : []).join(", ");
  return [m, z].filter(Boolean).join(" · ") || "Bilan vide";
}

/* ---------- PDF (texte sélectionnable, pagination automatique) ---------- */

const PDF_MAP = { "≥":">=", "≤":"<=", "→":"->", "≈":"~", "−":"-", "–":"-", "—":"-", "‘":"'", "’":"'", "“":"\"", "”":"\"", "…":"...", " ":" ", " ":" ", "œ":"oe", "Œ":"OE", "•":"-" };
const pdfSafe = s => String(s ?? "").replace(/[^\x00-\xFF]/g, ch => PDF_MAP[ch] ?? "");

function imageData(src){
  return new Promise(resolve => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try{
        const c = document.createElement("canvas");
        c.width = img.naturalWidth; c.height = img.naturalHeight;
        c.getContext("2d").drawImage(img, 0, 0);
        resolve({ data: c.toDataURL("image/png"), ratio: img.naturalWidth / img.naturalHeight || 1 });
      }catch(e){ resolve(null); }
    };
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

export async function bilanPdf(S, patient, opts = {}){
  await loadScript("https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js");
  const { jsPDF } = window.jspdf;
  const R = report(S, patient, opts);
  const d = new jsPDF({ unit:"mm", format:"a4" });
  const W = 210, H = 297, M = 18, CW = W - 2 * M, LAB = 40;
  const INK = [20, 48, 58], INK2 = [71, 97, 107], LAGON = [11, 110, 128], LINE = [213, 226, 229], DANGER = [201, 58, 58];
  const t = pdfSafe;
  let y = M;
  const ensure = h => { if(y + h > H - 20){ d.addPage(); y = M; } };

  /* En-tête : logo, praticien, coordonnées */
  const logo = await imageData(logoSrc());
  let x0 = M;
  if(logo){ const h = 14, w = Math.min(28, h * logo.ratio); d.addImage(logo.data, "PNG", M, y, w, h); x0 = M + w + 4; }
  d.setFont("helvetica", "bold"); d.setFontSize(12); d.setTextColor(...INK);
  d.text(t(KINE.nom), x0, y + 5.5);
  d.setFont("helvetica", "normal"); d.setFontSize(9); d.setTextColor(...INK2);
  d.text(t(KINE.titre), x0, y + 10.5);
  const coord = [settings.cabinet?.adresse, settings.cabinet?.telephone, settings.cabinet?.email || KINE.email].filter(Boolean).join("\n");
  if(coord){ d.setFontSize(8.5); d.text(t(coord).split("\n"), W - M, y + 4, { align:"right", lineHeightFactor:1.35 }); }
  y += 20;
  d.setDrawColor(...LINE); d.setLineWidth(.4); d.line(M, y, W - M, y);
  y += 10;

  /* Titre */
  d.setFont("helvetica", "bold"); d.setFontSize(17); d.setTextColor(...LAGON);
  d.text(t(R.titre), M, y);
  d.setFont("helvetica", "normal"); d.setFontSize(10); d.setTextColor(...INK2);
  d.text(t(R.date), W - M, y, { align:"right" });
  y += 7;

  /* Encadré patient */
  const pLines = R.patient.map(([l, v]) => [t(l), d.splitTextToSize(t(v), CW - LAB - 8)]);
  const boxH = pLines.reduce((a, [, v]) => a + v.length * 4.8, 0) + 5;
  d.setFillColor(244, 248, 249); d.setDrawColor(...LINE); d.roundedRect(M, y, CW, boxH, 2.5, 2.5, "FD");
  let py = y + 6.5;
  pLines.forEach(([l, v]) => {
    d.setFont("helvetica", "bold"); d.setFontSize(10); d.setTextColor(...INK2); d.text(l, M + 4, py);
    d.setFont("helvetica", l === "Patient" ? "bold" : "normal"); d.setTextColor(...INK); d.text(v, M + 4 + LAB, py);
    py += v.length * 4.8;
  });
  y += boxH + 8;

  /* Sections */
  R.sections.forEach(s => {
    ensure(18);
    d.setFont("helvetica", "bold"); d.setFontSize(11.5); d.setTextColor(...LAGON);
    d.text(t(s.h), M, y);
    y += 2; d.setDrawColor(...LINE); d.setLineWidth(.3); d.line(M, y, W - M, y); y += 5.5;
    if(s.alerte){
      const a = d.splitTextToSize(t(s.alerte), CW - 8);
      ensure(a.length * 4.6 + 5);
      d.setFillColor(251, 227, 225); d.roundedRect(M, y - 4, CW, a.length * 4.6 + 3.5, 1.5, 1.5, "F");
      d.setFont("helvetica", "bold"); d.setFontSize(9.5); d.setTextColor(...DANGER); d.text(a, M + 4, y);
      y += a.length * 4.6 + 3.5;
    }
    s.rows.forEach(([l, v]) => {
      d.setFontSize(10);
      d.setFont("helvetica", "bold");
      const ll = d.splitTextToSize(t(l), LAB - 3);
      d.setFont("helvetica", "normal");
      const vl = d.splitTextToSize(t(v), CW - LAB);
      const n = Math.max(ll.length, vl.length);
      for(let i = 0; i < n; i++){
        ensure(5);
        if(ll[i]){ d.setFont("helvetica", "bold"); d.setTextColor(...INK2); d.text(ll[i], M, y); }
        if(vl[i]){ d.setFont("helvetica", "normal"); d.setTextColor(...INK); d.text(vl[i], M + LAB, y); }
        y += 4.8;
      }
      y += 1.6;
    });
    y += 4;
  });

  /* Signature */
  ensure(22);
  y += 4;
  d.setFont("helvetica", "normal"); d.setFontSize(10); d.setTextColor(...INK);
  d.text(t(`Fait le ${R.date}`), W - M, y, { align:"right" });
  d.setFont("helvetica", "bold"); d.text(t(KINE.nom), W - M, y + 5.5, { align:"right" });

  /* Pied de page */
  const pages = d.getNumberOfPages();
  for(let i = 1; i <= pages; i++){
    d.setPage(i);
    d.setDrawColor(...LINE); d.line(M, H - 14, W - M, H - 14);
    d.setFont("helvetica", "normal"); d.setFontSize(8); d.setTextColor(...INK2);
    d.text(t(`${R.titre} · ${patient.nom || ""} · ${R.date}`), M, H - 9.5);
    d.text(t(`Document confidentiel : données de santé · ${i}/${pages}`), W - M, H - 9.5, { align:"right" });
  }
  return d;
}

export const pdfName = (S, patient) =>
  `${typeLabel(S.type)} ${patient.nom || ""} ${fmtISO(S.date).replace(/\//g, "-")}`.replace(/[\\/:*?"<>|]/g, "").replace(/\s+/g, " ").trim() + ".pdf";

export async function downloadPdf(S, patient, opts){
  const d = await bilanPdf(S, patient, opts);
  d.save(pdfName(S, patient));
}

/* ---------- Fenêtre « Envoyer » ---------- */

export function sendSheet(S, patient, opts = {}){
  const text = summaryText(S, patient, opts);
  const probe = typeof File !== "undefined" ? new File(["x"], "x.pdf", { type:"application/pdf" }) : null;
  const canFiles = !!(probe && navigator.canShare && navigator.canShare({ files:[probe] }));
  const subject = `${typeLabel(S.type)} : ${patient.nom || ""} (${fmtISO(S.date)})`;
  const s = openSheet({
    title:"Envoyer le bilan",
    body:`<div class="stack" style="--gap:16px">
      <div class="field">
        <label for="sb-to">Destinataire</label>
        <input class="input" id="sb-to" type="email" autocomplete="off" placeholder="adresse e-mail du médecin, du patient…" value="${esc(S.f?.medmail || "")}">
      </div>
      <div class="btn-row">
        ${canFiles ? `<button class="btn primary" type="button" id="sb-share">${icon("share")}Partager le PDF</button>` : ""}
        <button class="btn ${canFiles ? "" : "primary"}" type="button" id="sb-mail">${icon("mail")}E-mail</button>
        <button class="btn" type="button" id="sb-pdf">${icon("download")}Télécharger le PDF</button>
        <button class="btn" type="button" id="sb-copy">${icon("copy")}Copier pour Maiia</button>
      </div>
      <p class="hint">« E-mail » ouvre votre messagerie avec le résumé du bilan et télécharge le PDF en même temps : il ne reste qu'à le joindre au message.${canFiles ? " « Partager le PDF » l'envoie directement en pièce jointe (Mail, WhatsApp, Messages…)." : ""}</p>
      <div class="notice warn">${icon("alert")}<span class="small">Données de santé : vérifiez le destinataire. Pour un médecin, une messagerie sécurisée de santé (MSSanté) est préférable à un e-mail classique.</span></div>
    </div>`,
    foot:`<button class="btn" type="button" data-close>Fermer</button>`
  });
  const $s = sel => s.el.querySelector(sel);
  const busy = async (btn, fn) => {
    btn.disabled = true;
    try{ await fn(); }
    catch(err){ if(err?.name !== "AbortError"){ console.error(err); toast("L'opération n'a pas abouti. Réessayez.", { type:"err" }); } }
    finally{ btn.disabled = false; }
  };
  const share = $s("#sb-share");
  if(share) share.onclick = () => busy(share, async () => {
    const d = await bilanPdf(S, patient, opts);
    const file = new File([d.output("blob")], pdfName(S, patient), { type:"application/pdf" });
    await navigator.share({ files:[file], title:subject, text:subject });
  });
  $s("#sb-mail").onclick = () => busy($s("#sb-mail"), async () => {
    const to = $s("#sb-to").value.trim();
    const body = `Bonjour,\n\nVeuillez trouver ci-joint le ${typeLabel(S.type).toLowerCase()} de ${patient.nom || "notre patient"}.\n\n${text}\n\nBien cordialement,\n${KINE.nom}\n${KINE.titre}`;
    await downloadPdf(S, patient, opts);
    location.href = `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  });
  $s("#sb-pdf").onclick = () => busy($s("#sb-pdf"), () => downloadPdf(S, patient, opts));
  $s("#sb-copy").onclick = () => copyText(text);
  return s;
}

export async function copyText(text){
  try{ await navigator.clipboard.writeText(text); }
  catch(e){
    const ta = document.createElement("textarea");
    ta.value = text; ta.style.position = "fixed"; ta.style.opacity = "0";
    document.body.appendChild(ta); ta.select();
    try{ document.execCommand("copy"); }catch(x){}
    ta.remove();
  }
  toast("Résumé copié : collez-le dans Maiia.", { type:"ok" });
}

/** Le bilan précédent (par date) d'une liste, hors celui en cours. */
export function previousOf(list, id, date){
  return list.filter(b => b.id !== id && b.etat && String(b.date || "") <= String(date || "9999") )
    .sort((a, b) => String(b.date).localeCompare(String(a.date)) || (b.createdAt || 0) - (a.createdAt || 0))[0] || null;
}
