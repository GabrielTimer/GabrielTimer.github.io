/* Accompagnement du patient, avant, pendant et après la prise en charge :
   - questionnaire avant le 1er rendez-vous (prebilan.js, page prebilan.html) ;
   - petites leçons d'éducation (lecons.js) ;
   - message de suivi 3 mois après la fin (envoyé par la tâche GitHub « Rappels »).
   Réglages dans le dossier du patient (patients/{clé}) : preBilan { actif, date },
   lecons { parcours, debut }, suivi3m { prevu: "AAAA-MM-JJ" | "fait", fin, envoyeLe }.
   Réponses du patient : patients/{clé}/suivis, types "prebilan" et "suivi3m". */

import { esc, icon, openSheet, toast, confirmDialog, fmtShortDate } from "./app.js";
import { PARCOURS, debloquees, lues, marquerLue, JOURS_ENTRE } from "./lecons.js";

const DAY = 86400000;
const iso = t => { const d = new Date(t), z = n => String(n).padStart(2, "0"); return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}`; };
const frDate = s => { const [y, m, d] = String(s).split("-").map(Number); return new Date(y, (m || 1) - 1, d || 1).toLocaleDateString("fr-FR", { day:"numeric", month:"long", year:"numeric" }); };
export const SUIVI_JOURS = 90;

/** Fin de prise en charge : programme le message « Comment allez-vous ? » 3 mois plus tard. */
export const programmeSuivi = (fin = Date.now()) => ({ prevu: iso(fin + SUIVI_JOURS * DAY), fin: iso(fin) });

export const SUIVI_Q = [
  ["evol", "Depuis la fin de vos séances, votre problème va…", ["Beaucoup mieux", "Mieux", "Pareil", "Moins bien", "Beaucoup moins bien"]],
  ["exos", "Faites-vous encore vos exercices ?", ["Régulièrement", "De temps en temps", "Plus du tout"]]
];

export function resumeSuivi(d = {}){
  return [
    d.evol ? `Évolution : ${d.evol}` : "",
    d.eva !== undefined && d.eva !== "" ? `Douleur ces derniers jours : ${d.eva}/10` : "",
    d.exos ? `Exercices : ${d.exos}` : "",
    d.mot ? `Message : ${d.mot}` : ""
  ].filter(Boolean).join("\n");
}

/* =========================================================
   Kiné : bloc « Accompagnement » de la fiche patient
   ========================================================= */

export function panelKineHTML(patient, suivis){
  const pre = suivis.filter(s => s.type === "prebilan").pop();
  const s3 = suivis.filter(s => s.type === "suivi3m").pop();
  const lec = patient.lecons;
  const P = lec ? PARCOURS[lec.parcours] : null;
  const nDeb = P ? debloquees(lec).length : 0;
  const sv = patient.suivi3m;
  const ligne = (ico, titre, etat, boutons) => `<div class="sv-row" style="align-items:center;flex-wrap:wrap;gap:8px">
    <div class="sv-main" style="min-width:200px"><strong>${icon(ico, "ic-inline lagon")} ${titre}</strong><span class="small muted">${etat}</span></div>
    <div class="row wrap" style="--gap:6px">${boutons}</div></div>`;
  return `<section class="panel">
    <div class="panel-head"><h2 style="font-size:var(--fs-lg)">${icon("sparkle", "ic-inline lagon")} Accompagnement</h2></div>
    <div class="sv-list">
      ${ligne("list", "Questionnaire avant le 1er rendez-vous",
        pre ? `Rempli le ${esc(fmtShortDate(pre.date))}` : patient.preBilan?.actif ? "Demandé : en attente. Envoyez-lui son lien (Accès patient)." : "Le patient répond chez lui avant le bilan ; l'entretien est pré-rempli.",
        pre ? `<button class="btn sm primary" type="button" data-s="acc-pre-voir">Voir les réponses</button>`
          : patient.preBilan?.actif ? `<button class="btn sm" type="button" data-s="acc-pre-off">Annuler</button>` : `<button class="btn sm" type="button" data-s="acc-pre-on">${icon("plus")}Demander</button>`)}
      ${ligne("book", "Petites leçons",
        P ? `${esc(P.nom)} : ${nDeb} leçon${nDeb > 1 ? "s" : ""} sur ${P.lecons.length} débloquée${nDeb > 1 ? "s" : ""} (une tous les ${JOURS_ENTRE} jours)` : "Courtes leçons sur la douleur, le dos, l'arthrose, débloquées au fil des séances.",
        `<button class="btn sm" type="button" data-s="acc-lecons">${icon(P ? "edit" : "plus")}${P ? "Changer" : "Choisir"}</button>`)}
      ${ligne("message", "Nouvelles 3 mois après la fin",
        s3 ? `Réponse du ${esc(fmtShortDate(s3.date))} : ${esc(resumeSuivi(s3.donnees).replace(/\n/g, " · "))}`
          : sv?.prevu === "fait" ? `Message envoyé le ${esc(frDate(sv.envoyeLe || sv.fin))} : en attente de réponse.`
          : sv?.prevu ? `Message prévu le ${esc(frDate(sv.prevu))}${sv.fin ? ` (fin de prise en charge le ${esc(frDate(sv.fin))})` : ""}.`
          : "Programmé tout seul avec le bilan de fin de traitement, ou à la main ici.",
        s3 ? "" : sv?.prevu && sv.prevu !== "fait" ? `<button class="btn sm" type="button" data-s="acc-s3-off">Annuler</button>`
          : sv?.prevu === "fait" ? "" : `<button class="btn sm" type="button" data-s="acc-s3-on">${icon("calendar")}Programmer</button>`)}
    </div></section>`;
}

/** Actions des boutons data-s du bloc. savePatient(patch) enregistre et redessine. */
export function actionsKine({ patient, suivis, savePatient }){
  return {
    "acc-pre-on": async () => {
      await savePatient({ preBilan: { actif: true, date: Date.now() } });
      toast("Questionnaire demandé : il apparaît sur l'accueil du patient. Envoyez-lui son lien (Accès patient).", { type:"ok", duration:7000 });
    },
    "acc-pre-off": () => savePatient({ preBilan: { actif: false } }),
    "acc-pre-voir": async () => {
      const pre = suivis.filter(s => s.type === "prebilan").pop();
      const { resume } = await import("./prebilan.js");
      openSheet({ title: "Questionnaire avant le 1er rendez-vous", wide: true,
        body: `<p class="small muted">Rempli le ${esc(fmtShortDate(pre.date))}. Les réponses aux questions fermées sont reprises dans l'entretien du bilan initial.</p>
          <div class="pre" style="white-space:pre-wrap;line-height:1.6">${esc(resume(pre.donnees))}</div>`,
        foot: `<button class="btn primary" type="button" data-close>Fermer</button>` });
    },
    "acc-lecons": () => {
      const actuel = patient.lecons?.parcours || "";
      const s = openSheet({ title: "Petites leçons",
        body: `<div class="stack" style="--gap:10px">
          ${Object.entries(PARCOURS).map(([id, p]) => `<label class="check" style="align-items:flex-start"><input type="radio" name="lc" value="${id}" ${actuel === id ? "checked" : ""}><span><strong>${esc(p.nom)}</strong><br><span class="small muted">${esc(p.pour)} · ${p.lecons.length} leçons : ${p.lecons.map(l => esc(l.titre)).join(", ")}</span></span></label>`).join("")}
          <label class="check"><input type="radio" name="lc" value="" ${actuel ? "" : "checked"}><span>Aucune leçon</span></label>
          <p class="small muted">Une leçon apparaît sur l'accueil du patient, puis une nouvelle tous les ${JOURS_ENTRE} jours.</p></div>`,
        foot: `<button class="btn" type="button" data-close>Annuler</button><button class="btn primary" type="button" data-ok>${icon("check")}Enregistrer</button>` });
      s.el.querySelector("[data-ok]").onclick = async () => {
        const v = s.el.querySelector('input[name="lc"]:checked')?.value || "";
        try{
          await savePatient({ lecons: v ? { parcours: v, debut: v === actuel ? (patient.lecons?.debut || Date.now()) : Date.now() } : null });
          s.close();
        }catch(err){ toast("Enregistrement impossible : " + (err.message || err), { type:"err" }); }
      };
    },
    "acc-s3-on": async () => {
      if(!(await confirmDialog({ title: "Programmer les nouvelles à 3 mois ?", message: `La prise en charge est considérée comme terminée aujourd'hui. Le ${frDate(programmeSuivi().prevu)}, le patient recevra un message (et une notification s'il les a activées) avec 3 questions rapides. Sa réponse arrivera dans vos messages.`, confirm: "Programmer" }))) return;
      await savePatient({ suivi3m: programmeSuivi() });
    },
    "acc-s3-off": () => savePatient({ suivi3m: null })
  };
}

/* =========================================================
   Patient : cartes de l'accueil
   ========================================================= */

export function cartesPatientHTML(patient, suivis, { cle } = {}){
  const out = [];
  /* Questionnaire avant le 1er rendez-vous */
  const preFait = suivis.some(s => s.type === "prebilan") || localStorage.getItem("gt_prebilan_fait") === String(cle);
  if(patient.preBilan?.actif && !preFait){
    out.push(`<a class="inbox-banner" href="/prebilan.html" style="text-decoration:none;color:inherit">
      <span class="t-ico">${icon("list")}</span>
      <span class="li-main"><strong>Avant votre premier rendez-vous</strong><span class="small">Quelques questions pour préparer votre bilan (3 minutes).</span></span>
      <span class="btn sm primary" style="flex:none">Répondre</span></a>`);
  }
  /* Nouvelles 3 mois après la fin */
  const sv = patient.suivi3m;
  const du = sv && (sv.prevu === "fait" || (sv.prevu && sv.prevu <= iso(Date.now())));
  if(du && !suivis.some(s => s.type === "suivi3m")){
    out.push(`<button class="inbox-banner" type="button" data-acc="suivi3m" style="width:100%;text-align:left;font:inherit;color:inherit;cursor:pointer">
      <span class="t-ico">${icon("message")}</span>
      <span class="li-main"><strong>Votre kiné prend de vos nouvelles</strong><span class="small">3 questions, 1 minute.</span></span>
      <span class="btn sm primary" style="flex:none">Répondre</span></button>`);
  }
  /* Petites leçons */
  const deb = debloquees(patient.lecons);
  if(deb.length){
    const l = lues(patient.lecons);
    const nouvelle = deb.filter(x => !l.includes(x.i)).pop();
    const P = PARCOURS[patient.lecons.parcours];
    out.push(`<section class="section"><div class="section-title">Petites leçons<span class="spacer"></span><button class="btn sm ghost" type="button" data-acc="lecons">Toutes (${deb.length}/${P.lecons.length})</button></div>
      <button class="list-item" type="button" data-acc="lecon" data-i="${(nouvelle || deb[deb.length - 1]).i}" style="width:100%;text-align:left;font:inherit;color:inherit;border:0;cursor:pointer">
        <span class="li-ico">${icon("book")}</span>
        <span class="li-main"><span class="li-title">${esc((nouvelle || deb[deb.length - 1]).titre)}${nouvelle ? ` <span class="badge lagon">Nouvelle</span>` : ""}</span><span class="li-sub">${esc(P.nom)} · 1 minute de lecture</span></span>
        <span class="li-end">${icon("chevron")}</span></button></section>`);
  }
  return out.join("");
}

function lireLecon(reglage, i, apres = () => {}){
  const L = debloquees(reglage).find(x => x.i === i);
  if(!L) return;
  const P = PARCOURS[reglage.parcours];
  marquerLue(reglage, i);
  const voix = "speechSynthesis" in window;
  const s = openSheet({ title: L.titre,
    body: `<p class="small muted" style="margin-top:0">${esc(P.nom)} · leçon ${i + 1} sur ${P.lecons.length}</p>
      ${L.texte.map(t => `<p style="line-height:1.6">${esc(t)}</p>`).join("")}
      <div class="notice" style="margin-top:12px">${icon("star")}<span><strong>À retenir :</strong> ${esc(L.retenir)}</span></div>
      ${voix ? `<button class="btn soft" type="button" data-lire style="margin-top:12px">${icon("sound")}Écouter</button>` : ""}`,
    foot: `<button class="btn primary" type="button" data-close>J'ai compris</button>`,
    onClose: () => { try{ speechSynthesis.cancel(); }catch(e){} apres(); } });
  s.el.querySelector("[data-lire]")?.addEventListener("click", () => {
    try{ speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance([L.titre, ...L.texte, "À retenir : " + L.retenir].join(". ")); u.lang = "fr-FR"; u.rate = .95; speechSynthesis.speak(u); }catch(e){}
  });
}

function toutesLecons(reglage, apres){
  const deb = debloquees(reglage), P = PARCOURS[reglage.parcours], l = lues(reglage);
  const s = openSheet({ title: P.nom,
    body: `<div class="list">${P.lecons.map((x, i) => i < deb.length
      ? `<button class="list-item" type="button" data-i="${i}" style="width:100%;text-align:left;font:inherit;color:inherit;border:0;cursor:pointer"><span class="li-ico">${icon(l.includes(i) ? "checkCircle" : "book")}</span><span class="li-main"><span class="li-title">${esc(x.titre)}</span></span><span class="li-end">${icon("chevron")}</span></button>`
      : `<div class="list-item" style="opacity:.55"><span class="li-ico">${icon("lock")}</span><span class="li-main"><span class="li-title">${esc(x.titre)}</span><span class="li-sub">Bientôt</span></span></div>`).join("")}</div>`,
    foot: `<button class="btn primary" type="button" data-close>Fermer</button>` });
  s.el.querySelectorAll("[data-i]").forEach(b => b.onclick = () => { s.close(); lireLecon(reglage, Number(b.dataset.i), apres); });
}

function repondreSuivi({ cle, apercu, patient, apres }){
  const R = {};
  const s = openSheet({ title: "Comment allez-vous ?",
    body: `<p class="muted" style="margin-top:0">Cela fait environ 3 mois que vos séances sont terminées. Votre kiné aimerait avoir de vos nouvelles.</p>
      ${SUIVI_Q.map(([id, q, opts]) => `<div style="margin:14px 0"><div style="font-weight:800;margin-bottom:8px">${esc(q)}</div><div class="chips">${opts.map(o => `<button type="button" class="chip" data-q="${id}" data-v="${esc(o)}" aria-pressed="false">${esc(o)}</button>`).join("")}</div></div>`).join("")}
      <div style="margin:14px 0"><div style="font-weight:800;margin-bottom:8px">Votre douleur ces derniers jours</div>
        <div style="display:grid;grid-template-columns:repeat(11,minmax(0,1fr));gap:4px">${Array.from({ length: 11 }, (_, i) => `<button type="button" class="chip" data-eva="${i}" aria-pressed="false" style="justify-content:center;padding:0;min-height:42px">${i}</button>`).join("")}</div></div>
      <div class="field"><label for="s3-mot">Un mot pour votre kiné ? (facultatif)</label><textarea class="textarea" id="s3-mot" rows="2" maxlength="800"></textarea></div>`,
    foot: `<button class="btn" type="button" data-close>Plus tard</button><button class="btn primary" type="button" data-ok>${icon("send")}Envoyer</button>` });
  s.el.addEventListener("click", e => {
    const c = e.target.closest("[data-q]");
    if(c){ R[c.dataset.q] = c.dataset.v; s.el.querySelectorAll(`[data-q="${c.dataset.q}"]`).forEach(b => b.setAttribute("aria-pressed", String(b === c))); }
    const v = e.target.closest("[data-eva]");
    if(v){ R.eva = Number(v.dataset.eva); s.el.querySelectorAll("[data-eva]").forEach(b => b.setAttribute("aria-pressed", String(b === v))); }
  });
  s.el.querySelector("[data-ok]").onclick = async () => {
    const mot = s.el.querySelector("#s3-mot").value.trim();
    if(mot) R.mot = mot;
    if(!R.evol && R.eva === undefined){ toast("Répondez au moins à la première question.", { type:"err" }); return; }
    if(apercu){ toast("Aperçu : la réponse n'est pas envoyée."); return; }
    try{
      const C = await import("./cloud.js");
      await C.addSuivi(cle, { type:"suivi3m", donnees: R });
      await C.addMessage(cle, { type:"message", sujet:"Nouvelles 3 mois après la fin des séances", texte: resumeSuivi(R) }).catch(() => {});
      s.close();
      toast("Merci ! Votre kiné a bien reçu vos nouvelles.", { type:"ok" });
      apres();
    }catch(err){ toast("L'envoi n'a pas marché. Vérifiez la connexion et réessayez.", { type:"err" }); }
  };
}

/** Branche les boutons des cartes. apres() : redessine l'accueil (ex. carte « Nouvelle » lue). */
export function lierPatient(box, { patient, cle, apercu, apres = () => {} }){
  box.querySelectorAll("[data-acc]").forEach(b => b.addEventListener("click", () => {
    const a = b.dataset.acc;
    if(a === "lecon") lireLecon(patient.lecons, Number(b.dataset.i), apres);
    if(a === "lecons") toutesLecons(patient.lecons, apres);
    if(a === "suivi3m") repondreSuivi({ cle, apercu, patient, apres });
  }));
}
