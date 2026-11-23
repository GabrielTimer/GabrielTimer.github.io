/* Accompagnement du patient, avant, pendant et après la prise en charge :
   - questionnaire avant le 1er rendez-vous (prebilan.js, page prebilan.html) ;
   - petites leçons d'éducation (lecons.js) ;
   - message de suivi 3 mois après la fin (envoyé par la tâche GitHub « Rappels ») ;
   - fiche « Si ça revient » (textes dans rechute.js) ;
   - test du mois à la maison (test-maison.js).
   Réglages dans le dossier du patient (patients/{clé}) : preBilan { actif, date },
   lecons { parcours, debut }, suivi3m { prevu: "AAAA-MM-JJ" | "fait", fin, envoyeLe },
   rechute { plan, exos, note, date }, testMois { test, jours, debut }.
   Réponses du patient : patients/{clé}/suivis, types "prebilan", "suivi3m" et "test". */

import { esc, icon, openSheet, toast, confirmDialog, fmtShortDate } from "./app.js";
import { PARCOURS, debloquees, lues, marquerLue, JOURS_ENTRE } from "./lecons.js";
import { PLANS, planPropose } from "./rechute.js";
import { TESTS, testsDe, aFaire as testAFaire, evolutionHTML, passerTest } from "./test-maison.js";

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
      ${ligne("heart", "Si ça revient",
        patient.rechute?.plan && PLANS[patient.rechute.plan] ? `Fiche « ${esc(PLANS[patient.rechute.plan].nom)} » sur l'accueil du patient : quoi faire, 3 exercices, signes d'alerte.` : "Petite fiche pour le patient en cas de nouvelle douleur : quoi faire, 3 exercices à reprendre, quand vous recontacter.",
        `<button class="btn sm" type="button" data-s="acc-rech">${icon(patient.rechute?.plan ? "edit" : "plus")}${patient.rechute?.plan ? "Modifier" : "Préparer"}</button>`)}
      ${(() => { const tm = patient.testMois, T = tm && TESTS[tm.test], res = T ? testsDe(suivis, tm.test) : [];
        return ligne("clock", "Test du mois à la maison",
          T ? (res.length ? `${esc(T.court)} : ${evolutionHTML(res.slice(-4), T)}` : `${esc(T.court)} : proposé tous les ${tm.jours || 30} jours, pas encore fait.`) : "Le patient refait un test simple chez lui (lever de chaise, équilibre), chronométré par l'appli. Résultat dans « Avant la séance ».",
          `<button class="btn sm" type="button" data-s="acc-test">${icon(T ? "edit" : "plus")}${T ? "Changer" : "Proposer"}</button>`); })()}
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
    "acc-s3-off": () => savePatient({ suivi3m: null }),
    "acc-rech": async () => {
      let zones = [];
      try{ const C = await import("./cloud.js"); zones = (await C.listBilans(patient.cle))[0]?.zones || []; }catch(e){}
      const r = patient.rechute || {};
      let plan = r.plan && PLANS[r.plan] ? r.plan : planPropose(zones);
      const exosDe = p => (r.plan === p && r.exos?.length ? r.exos : PLANS[p].exos);
      const s = openSheet({ title: "Si ça revient", wide: true,
        body: `<p class="small muted" style="margin-top:0">Le patient retrouve cette fiche sur son accueil, même quand il n'a plus de programme en cours.</p>
          <div class="field"><label>Région</label><div class="chips">${Object.entries(PLANS).map(([k, p]) => `<button type="button" class="chip" data-plan="${k}" aria-pressed="${k === plan}">${esc(p.nom)}</button>`).join("")}</div></div>
          <div id="rc-apercu"></div>
          <div class="field"><label>3 exercices à reprendre tout de suite</label>
            ${[0, 1, 2].map(i => `<input class="input" data-ex="${i}" maxlength="140" style="margin-bottom:6px">`).join("")}</div>
          <div class="field"><label for="rc-note">Un mot de votre part (facultatif)</label><textarea class="textarea" id="rc-note" rows="2" maxlength="400" placeholder="Ex. Reprenez aussi la marche nordique dès que possible.">${esc(r.note || "")}</textarea></div>`,
        foot: `${r.plan ? `<button class="btn danger" type="button" id="rc-off">Retirer</button>` : ""}<button class="btn" type="button" data-close>Annuler</button><button class="btn primary" type="button" data-ok>${icon("check")}Enregistrer</button>` });
      const montrer = () => {
        const P = PLANS[plan];
        s.el.querySelectorAll("[data-plan]").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.plan === plan)));
        s.el.querySelector("#rc-apercu").innerHTML = `<div class="notice" style="margin:10px 0">${icon("info")}<span class="small">${esc(P.rassurer)}<br><strong>Signes d'alerte affichés :</strong> ${P.alerte.map(esc).join(" ")}</span></div>`;
        const ex = exosDe(plan);
        s.el.querySelectorAll("[data-ex]").forEach((el, i) => { el.value = ex[i] || ""; });
      };
      s.el.querySelectorAll("[data-plan]").forEach(b => b.onclick = () => { plan = b.dataset.plan; montrer(); });
      montrer();
      s.el.querySelector("#rc-off")?.addEventListener("click", async () => { await savePatient({ rechute: null }); s.close(); });
      s.el.querySelector("[data-ok]").onclick = async () => {
        const exos = [...s.el.querySelectorAll("[data-ex]")].map(el => el.value.trim()).filter(Boolean);
        try{
          await savePatient({ rechute: { plan, exos, note: s.el.querySelector("#rc-note").value.trim(), date: Date.now() } });
          s.close();
          toast("Fiche « Si ça revient » visible sur l'accueil du patient.", { type:"ok" });
        }catch(err){ toast("Enregistrement impossible : " + (err.message || err), { type:"err" }); }
      };
    },
    "acc-test": () => {
      const tm = patient.testMois || {};
      const s = openSheet({ title: "Test du mois à la maison",
        body: `<div class="stack" style="--gap:10px">
          ${Object.entries(TESTS).map(([id, t]) => `<label class="check" style="align-items:flex-start"><input type="radio" name="tm" value="${id}" ${tm.test === id ? "checked" : ""}><span><strong>${esc(t.nom)}</strong><br><span class="small muted">${esc(t.pour)}</span></span></label>`).join("")}
          <label class="check"><input type="radio" name="tm" value="" ${tm.test ? "" : "checked"}><span>Aucun test</span></label>
          <div class="field"><label for="tm-j">Le patient le refait tous les</label><select class="select" id="tm-j">${[14, 30, 60].map(j => `<option value="${j}" ${(tm.jours || 30) === j ? "selected" : ""}>${j} jours</option>`).join("")}</select></div>
          <p class="small muted">Une carte apparaît sur l'accueil du patient quand c'est le moment. L'appli donne les consignes, le compte à rebours et le chronomètre. Faites-le une première fois avec lui au cabinet.</p></div>`,
        foot: `<button class="btn" type="button" data-close>Annuler</button><button class="btn primary" type="button" data-ok>${icon("check")}Enregistrer</button>` });
      s.el.querySelector("[data-ok]").onclick = async () => {
        const v = s.el.querySelector('input[name="tm"]:checked')?.value || "";
        try{
          await savePatient({ testMois: v ? { test: v, jours: Number(s.el.querySelector("#tm-j").value) || 30, debut: tm.test === v ? (tm.debut || Date.now()) : Date.now() } : null });
          s.close();
        }catch(err){ toast("Enregistrement impossible : " + (err.message || err), { type:"err" }); }
      };
    }
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
  /* Test du mois à la maison */
  if(testAFaire(patient.testMois, suivis)){
    const T = TESTS[patient.testMois.test];
    out.push(`<button class="inbox-banner" type="button" data-acc="test" style="width:100%;text-align:left;font:inherit;color:inherit;cursor:pointer">
      <span class="t-ico">${icon("clock")}</span>
      <span class="li-main"><strong>Votre test du mois</strong><span class="small">${esc(T.nom)} : 2 minutes, l'appli vous guide.</span></span>
      <span class="btn sm primary" style="flex:none">Commencer</span></button>`);
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
  /* Si ça revient (et résultats du test du mois, s'il y en a) */
  const R = patient.rechute, PR = R?.plan && PLANS[R.plan];
  const T = patient.testMois?.test && TESTS[patient.testMois.test];
  const resT = T ? testsDe(suivis, patient.testMois.test) : [];
  if(PR || resT.length){
    out.push(`<section class="section"><div class="list">
      ${PR ? `<button class="list-item" type="button" data-acc="rechute" style="width:100%;text-align:left;font:inherit;color:inherit;border:0;cursor:pointer">
        <span class="li-ico">${icon("heart")}</span>
        <span class="li-main"><span class="li-title">Si ça revient</span><span class="li-sub">${esc(PR.nom)} : que faire, 3 exercices, quand me recontacter</span></span>
        <span class="li-end">${icon("chevron")}</span></button>` : ""}
      ${resT.length ? `<button class="list-item" type="button" data-acc="test-res" style="width:100%;text-align:left;font:inherit;color:inherit;border:0;cursor:pointer">
        <span class="li-ico">${icon("chart")}</span>
        <span class="li-main"><span class="li-title">Mon test du mois</span><span class="li-sub">${esc(T.court)} : dernier résultat ${esc(String(resT[resT.length - 1].score).replace(".", ","))} ${T.unite === "s" ? "s" : esc(T.unite)}</span></span>
        <span class="li-end">${icon("chevron")}</span></button>` : ""}
    </div></section>`);
  }
  return out.join("");
}

function ficheRechute(R, { cle, apercu, nom } = {}){
  const P = PLANS[R.plan];
  const exos = R.exos?.length ? R.exos : P.exos;
  const voix = "speechSynthesis" in window;
  const s = openSheet({ title: "Si ça revient : " + P.nom,
    body: `<p style="line-height:1.6;margin-top:0">${esc(P.rassurer)}</p>
      <h3 style="margin:14px 0 6px">Que faire</h3><ul style="line-height:1.6;padding-left:1.2em">${P.faire.map(x => `<li>${esc(x)}</li>`).join("")}</ul>
      <h3 style="margin:14px 0 6px">Les 3 exercices à reprendre</h3><ol style="line-height:1.6;padding-left:1.2em">${exos.map(x => `<li>${esc(x)}</li>`).join("")}</ol>
      ${R.note ? `<div class="notice" style="margin-top:12px">${icon("message")}<span><strong>Le mot de votre kiné :</strong> ${esc(R.note)}</span></div>` : ""}
      <div class="notice danger" style="margin-top:12px">${icon("alert")}<span><strong>Consultez rapidement si :</strong><br>${P.alerte.map(esc).join("<br>")}</span></div>
      <p style="line-height:1.6;margin-top:12px"><strong>${esc(P.appeler)}</strong></p>
      ${voix ? `<button class="btn soft" type="button" data-lire>${icon("sound")}Écouter</button>` : ""}`,
    foot: `<button class="btn" type="button" data-ecrire>${icon("mail")}Écrire à mon kiné</button><button class="btn primary" type="button" data-close>Fermer</button>`,
    onClose: () => { try{ speechSynthesis.cancel(); }catch(e){} } });
  s.el.querySelector("[data-ecrire]")?.addEventListener("click", async () => {
    s.close();
    const PT = await import("./patient.js");
    PT.writeToKine({ cle, apercu, patientNom: nom });
  });
  s.el.querySelector("[data-lire]")?.addEventListener("click", () => {
    try{ speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance([P.rassurer, "Que faire.", ...P.faire, "Les exercices à reprendre.", ...exos, R.note ? "Le mot de votre kiné : " + R.note : "", "Consultez rapidement si : ", ...P.alerte, P.appeler].filter(Boolean).join(". ")); u.lang = "fr-FR"; u.rate = .95; speechSynthesis.speak(u); }catch(e){}
  });
}

function resultatsTest(patient, suivis){
  const T = TESTS[patient.testMois.test], res = testsDe(suivis, patient.testMois.test);
  openSheet({ title: "Mon test du mois",
    body: `<p class="muted" style="margin-top:0">${esc(T.nom)}</p><p style="line-height:1.8">${evolutionHTML(res, T)}</p>
      <p class="small muted">${T.sens > 0 ? "Plus le chiffre monte, mieux c'est." : "Plus le temps baisse, mieux c'est."} Le prochain test vous sera proposé ici dans ${patient.testMois.jours || 30} jours environ.</p>`,
    foot: `<button class="btn primary" type="button" data-close>Fermer</button>` });
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
export function lierPatient(box, { patient, cle, apercu, suivis = [], apres = () => {} }){
  box.querySelectorAll("[data-acc]").forEach(b => b.addEventListener("click", () => {
    const a = b.dataset.acc;
    if(a === "rechute") ficheRechute(patient.rechute, { cle, apercu, nom: patient.nom });
    if(a === "test") passerTest(patient.testMois.test, { cle, apercu, avant: testsDe(suivis, patient.testMois.test), apres });
    if(a === "test-res") resultatsTest(patient, suivis);
    if(a === "lecon") lireLecon(patient.lecons, Number(b.dataset.i), apres);
    if(a === "lecons") toutesLecons(patient.lecons, apres);
    if(a === "suivi3m") repondreSuivi({ cle, apercu, patient, apres });
  }));
}
