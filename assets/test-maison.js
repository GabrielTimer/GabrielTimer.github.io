/* « Test du mois » : le patient refait chez lui un test simple, chronométré par l'appli.
   Le kiné le choisit dans la fiche patient (bloc Accompagnement) : patients/{clé}.testMois = { test, jours, debut }.
   Chaque résultat : patients/{clé}/suivis, type "test" (qid = identifiant du test, score, unite, nom).
   Le kiné voit la courbe dans « Avant la séance » ; le patient voit ses propres résultats. */

import { esc, icon, openSheet, toast, fmtShortDate } from "./app.js";

export const TESTS = {
  chaise30: {
    nom: "Lever de chaise en 30 secondes",
    court: "Lever de chaise 30 s",
    unite: "levers", sens: 1, mode: "compte", duree: 30, mcid: 2,
    pour: "Force des jambes (arthrose, personne âgée, remise en forme)",
    consignes: [
      "Chaise sans accoudoirs, calée contre un mur.",
      "Asseyez-vous au milieu, pieds à plat, bras croisés sur la poitrine.",
      "Au signal, levez-vous complètement puis rasseyez-vous, le plus de fois possible en 30 secondes.",
      "Comptez vos levers : vous noterez le nombre à la fin."
    ]
  },
  chaise5: {
    nom: "5 levers de chaise",
    court: "5 levers de chaise",
    unite: "s", sens: -1, mode: "chrono", max: 120, mcid: 2,
    pour: "Force des jambes et équilibre (personne âgée, chutes)",
    consignes: [
      "Chaise sans accoudoirs, calée contre un mur, bras croisés sur la poitrine.",
      "Touchez « Partez » puis levez-vous et rasseyez-vous 5 fois, le plus vite possible en restant en sécurité.",
      "Touchez « Fini » dès que vous êtes assis après le 5e lever (une autre personne peut tenir le téléphone)."
    ]
  },
  unipodal: {
    nom: "Équilibre sur une jambe",
    court: "Équilibre sur une jambe",
    unite: "s", sens: 1, mode: "chrono", max: 60, mcid: 5,
    pour: "Équilibre (chutes, entorse de cheville, vertiges)",
    consignes: [
      "Debout près d'un mur ou d'un plan de travail, pour vous rattraper si besoin.",
      "Mains sur les hanches. Levez un pied (la jambe la plus faible ou celle soignée).",
      "Touchez « Partez » quand le pied est levé, et « Fini » dès que le pied touche le sol ou que vous vous tenez.",
      "Le test s'arrête tout seul à 60 secondes."
    ]
  }
};

export const SECURITE = "Faites ce test seulement si vous vous levez d'une chaise sans aide. Si vous avez peur de tomber, faites-le avec une personne à côté. Arrêtez en cas de douleur forte, de vertige ou d'essoufflement.";

export const testsDe = (suivis, id) => suivis.filter(s => s.type === "test" && (!id || s.qid === id) && typeof s.score === "number").sort((a, b) => a.date - b.date);

/** Le test est-il à faire maintenant ? (jamais fait, ou dernier résultat il y a au moins `jours` jours) */
export function aFaire(reglage, suivis){
  if(!reglage?.test || !TESTS[reglage.test]) return false;
  const res = testsDe(suivis, reglage.test);
  if(!res.length) return true;
  return Date.now() - res[res.length - 1].date >= (reglage.jours || 30) * 864e5 - 12 * 3600e3;
}

export const fmtVal = (v, t) => `${String(Math.round(v * 10) / 10).replace(".", ",")} ${t.unite === "s" ? "s" : t.unite}`;

/** Courbe et lecture de l'évolution (affichées au kiné et au patient). */
export function evolutionHTML(res, t){
  if(!res.length) return "";
  const vals = res.map(r => r.score);
  const d = vals.length > 1 ? Math.round((vals[vals.length - 1] - vals[0]) * 10) / 10 : null;
  const mieux = d !== null && Math.abs(d) >= t.mcid && d * t.sens > 0;
  const moins = d !== null && Math.abs(d) >= t.mcid && d * t.sens < 0;
  return `${vals.map((v, i) => `<strong>${esc(fmtVal(v, t))}</strong> <span class="small muted">(${esc(fmtShortDate(res[i].date))})</span>`).join(" → ")}
    ${d !== null ? `<span class="small" style="margin-left:6px;font-weight:800;color:${mieux ? "var(--ok)" : moins ? "var(--danger)" : "var(--ink-3)"}">${mieux ? "progrès net" : moins ? "en baisse" : "stable"}</span>` : ""}`;
}

/* ---------- Sons et vibration ---------- */
let ac = null;
function bip(f = 880, ms = 180){
  try{
    ac = ac || new (window.AudioContext || window.webkitAudioContext)();
    const o = ac.createOscillator(), g = ac.createGain();
    o.frequency.value = f; o.connect(g); g.connect(ac.destination);
    g.gain.setValueAtTime(.25, ac.currentTime); g.gain.exponentialRampToValueAtTime(.001, ac.currentTime + ms / 1000);
    o.start(); o.stop(ac.currentTime + ms / 1000);
  }catch(e){}
  try{ navigator.vibrate?.(ms); }catch(e){}
}

/**
 * Fait passer le test au patient (feuille plein écran).
 * id : clé de TESTS ; cle : dossier du patient ; apercu : vrai = rien n'est enregistré ; avant : résultats précédents ; apres() : redessiner.
 */
export function passerTest(id, { cle, apercu = false, avant = [], apres = () => {} } = {}){
  const t = TESTS[id];
  if(!t) return;
  let timer = null, t0 = 0, valeur = null, fini = false;
  const stop = () => { clearInterval(timer); timer = null; };
  const s = openSheet({ title: t.nom,
    body: `<div id="tm-zone"></div>`,
    foot: `<button class="btn" type="button" data-close>Plus tard</button><button class="btn primary" type="button" id="tm-go">${icon("play")}Je suis prêt</button>`,
    onClose: stop });
  const zone = s.el.querySelector("#tm-zone"), go = s.el.querySelector("#tm-go");
  const grand = txt => `<div style="font-size:clamp(4rem,22vw,7rem);font-weight:900;text-align:center;line-height:1.1;font-variant-numeric:tabular-nums" id="tm-n">${txt}</div>`;

  zone.innerHTML = `<p class="muted" style="margin-top:0">${esc(t.pour)}</p>
    <ol style="line-height:1.6;padding-left:1.2em">${t.consignes.map(c => `<li>${esc(c)}</li>`).join("")}</ol>
    <div class="notice warn">${icon("alert")}<span class="small">${esc(SECURITE)}</span></div>
    ${avant.length ? `<p class="small" style="margin-top:12px">Vos résultats : ${evolutionHTML(avant, t)}</p>` : ""}`;

  const resultat = () => {
    fini = true;
    if(t.mode === "compte"){
      valeur = 0;
      zone.innerHTML = `<p style="font-weight:800;text-align:center">Combien de fois vous êtes-vous levé ?</p>
        <div class="row" style="justify-content:center;gap:16px;align-items:center">
          <button class="btn" type="button" data-pm="-1" style="min-width:64px;min-height:64px;font-size:1.6rem" aria-label="Moins">−</button>
          ${grand("0")}
          <button class="btn" type="button" data-pm="1" style="min-width:64px;min-height:64px;font-size:1.6rem" aria-label="Plus">+</button></div>`;
      zone.querySelectorAll("[data-pm]").forEach(b => b.onclick = () => { valeur = Math.max(0, Math.min(60, valeur + Number(b.dataset.pm))); zone.querySelector("#tm-n").textContent = valeur; });
    }else{
      zone.innerHTML = `<p style="font-weight:800;text-align:center">Votre temps</p>${grand(String(valeur).replace(".", ",") + " s")}`;
    }
    go.innerHTML = `${icon("check")}Enregistrer`;
    go.hidden = false;
  };

  const lancer = () => {
    go.hidden = true;
    let n = 3;
    zone.innerHTML = `<p class="muted" style="text-align:center">Préparez-vous…</p>${grand("3")}`;
    bip(660, 120);
    timer = setInterval(() => {
      n--;
      if(n > 0){ zone.querySelector("#tm-n").textContent = n; bip(660, 120); return; }
      stop(); bip(990, 300);
      if(t.mode === "compte"){
        let reste = t.duree; t0 = Date.now();
        zone.innerHTML = `<p style="text-align:center;font-weight:800">Partez ! Levez-vous et rasseyez-vous.</p>${grand(String(reste))}<p class="small muted" style="text-align:center">Comptez vos levers.</p>`;
        timer = setInterval(() => {
          reste = t.duree - Math.floor((Date.now() - t0) / 1000);
          const el = zone.querySelector("#tm-n"); if(el) el.textContent = Math.max(0, reste);
          if(reste <= 0){ stop(); bip(440, 600); resultat(); }
        }, 200);
      }else{
        t0 = Date.now();
        zone.innerHTML = `<p style="text-align:center;font-weight:800">C'est parti !</p>${grand("0,0")}
          <button class="btn primary" type="button" id="tm-stop" style="width:100%;min-height:72px;font-size:1.3rem">${icon("check")}Fini</button>`;
        const fin = () => { if(!timer) return; stop(); valeur = Math.round((Date.now() - t0) / 100) / 10; if(t.max) valeur = Math.min(valeur, t.max); bip(440, 400); resultat(); };
        zone.querySelector("#tm-stop").onclick = fin;
        timer = setInterval(() => {
          const v = (Date.now() - t0) / 1000;
          const el = zone.querySelector("#tm-n"); if(el) el.textContent = String(Math.floor(v * 10) / 10).replace(".", ",");
          if(t.max && v >= t.max) fin();
        }, 100);
      }
    }, 1000);
  };

  go.onclick = async () => {
    if(!fini) return lancer();
    if(valeur === null || (t.mode === "compte" && !valeur)){ toast("Indiquez le nombre de levers.", { type:"err" }); return; }
    if(apercu){ toast("Aperçu : le résultat n'est pas enregistré."); s.close(); return; }
    go.disabled = true;
    try{
      const C = await import("./cloud.js");
      await C.addSuivi(cle, { type:"test", qid:id, nom:t.nom, score:valeur, unite:t.unite });
      s.close();
      toast(`Merci ! Résultat enregistré : ${fmtVal(valeur, t)}. Votre kiné le verra à la prochaine séance.`, { type:"ok", duration:6000 });
      apres();
    }catch(err){ go.disabled = false; toast("L'enregistrement n'a pas marché. Vérifiez la connexion et réessayez.", { type:"err" }); }
  };
}
