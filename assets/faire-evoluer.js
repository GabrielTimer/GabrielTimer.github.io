/* =========================================================
   Faire évoluer les programmes selon le temps et le ressenti
   ---------------------------------------------------------
   D'après les séances faites (EVA, ressenti « Trop facile / Bien dosé /
   Difficile / Trop dur ») sur les derniers jours, propose au kiné :
   - monter : niveau suivant du même modèle (sinon + 1 série)
   - alleger : niveau précédent (sinon − 1 série ou moins de répétitions)
   - fin : programme terminé → bilan intermédiaire et programme suivant
   Le kiné valide toujours (un clic) ; rien ne change tout seul.
   Seuils modifiables : Outils → Réglages du cabinet → Évolution des programmes.
   ========================================================= */

import { settings } from "./settings.js";
import { filtrerOptions, choixDuNom } from "./modeles.js";
import { openSheet, toast, esc, icon } from "./app.js";

const DAY = 864e5;
const norm = s => String(s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

export const REGLES_DEFAUT = { jours: 14, minSeances: 4, evaMax: 3, hausse: 2, tropDur: 2 };
export const regles = () => ({ ...REGLES_DEFAUT, ...(settings.evolution || {}) });

/** « Gonarthrose, niveau 2 », « Lombalgie N1 », « Épaule 3 » → { base, niveau } */
export function nomNiveau(nom){
  const s = String(nom || "").trim();
  const m = s.match(/^(.*?)[\s,_-]+(?:P|N|niveau\s*|phase\s*)?(\d)\s*$/i);
  return m && m[1].trim() ? { base: m[1].replace(/[,\s]+$/, "").trim(), niveau: Number(m[2]) } : { base: s, niveau: null };
}

/** Le modèle d'origine d'un programme : enregistré à sa création, sinon retrouvé par son nom. */
export function origineDe(prog, modeles){
  const o = prog.seances.find(s => s.origine)?.origine;
  if(o?.modeleId){
    const m = modeles.find(x => String(x.id) === String(o.modeleId));
    if(m) return { modele: m, niveau: m.niveau || o.niveau || null, base: m.nom, choix: o.choix || choixDuNom(m, prog.nom) };
  }
  const nn = o?.nom ? { base: o.nom, niveau: o.niveau } : nomNiveau(prog.nom);
  let base = String(nn.base).replace(/\s*\([^)]*\)\s*$/, ""), niveau = nn.niveau;   // « Névralgie cervico-brachiale (médian) »
  if(!niveau) return { modele: null, niveau: null, base };
  const lieu = lieuProg(prog);
  /* Ancien modèle maison « Sciatique et hernie discale » (7 nov. 2026) : séparé en « Sciatique » et « Hernie discale » */
  if(lieu === "HEP" && norm(base) === norm("Sciatique et hernie discale")) base = "Sciatique";
  const cands = modeles.filter(m => norm(m.nom) === norm(base) && m.niveau === niveau);
  const m = cands.find(x => x.lieu === lieu) || cands[0] || null;
  return { modele: m, niveau, base, choix: choixDuNom(m, prog.nom) };
}

function lieuProg(prog){
  const ex = prog.seances[0]?.data?.exercices || [];
  const src = new Set(ex.map(e => e.source).filter(Boolean));
  return src.size === 1 ? [...src][0] : null;
}

/** Modèle du même nom au niveau voulu (même lieu de préférence). */
function auNiveau(modeles, base, niveau, lieu){
  const c = modeles.filter(m => norm(m.nom) === norm(base) && m.niveau === niveau);
  /* Même lieu (maison / cabinet) : une progression ne change pas de lieu */
  return lieu ? (c.find(m => m.lieu === lieu) || c.find(m => m.lieu === "MIXTE" || !m.lieu) || null) : (c[0] || null);
}

const ignoreKey = (prog, type) => `gt_evol_ignore_${prog.id}_${type}`;
export function ignorer(prog, type, jours = 7){ try{ localStorage.setItem(ignoreKey(prog, type), String(Date.now() + jours * DAY)); }catch(e){} }
const ignore = (prog, type) => { try{ return Number(localStorage.getItem(ignoreKey(prog, type)) || 0) > Date.now(); }catch(e){ return false; } };

/**
 * Proposition pour un programme, ou null.
 * { type, titre, raison, cible (modèle) | null, series (nouveau nombre de séries) | null }
 */
export function proposer(prog, modeles = []){
  const R = regles();
  const now = Date.now();
  const faites = prog.seances.filter(s => s.terminee && s.dateValidation).sort((a, b) => a.dateValidation - b.dateValidation);

  if(prog.termine){
    const fin = faites[faites.length - 1]?.dateValidation || prog.updatedAt;
    if(now - fin > 21 * DAY || ignore(prog, "fin")) return null;
    return { type: "fin", titre: "Programme terminé", raison: "Bilan intermédiaire et programme suivant à prévoir.", cible: suivant(prog, modeles) };
  }

  const recentes = faites.filter(s => now - s.dateValidation <= R.jours * DAY);
  const evaNum = s => (s.eva === null || s.eva === undefined || s.eva === "") ? null : Number(s.eva);
  const toutes = faites.map(evaNum).filter(n => n !== null && !Number.isNaN(n));
  const recEvas = recentes.map(evaNum).filter(n => n !== null && !Number.isNaN(n));
  const derniere = toutes[toutes.length - 1];
  if(derniere !== undefined && derniere >= (settings.alertes?.douleur || 7)) return null;   // alerte douleur forte : pas de changement proposé

  /* Alléger : « Trop dur » plusieurs fois de suite, ou douleur en hausse */
  const ress = faites.map(s => s.ressenti).filter(Boolean);
  const dursDeSuite = (() => { let n = 0; for(let i = ress.length - 1; i >= 0 && ress[i] === "trop_dur"; i--) n++; return n; })();
  const base = toutes.slice(0, 2);
  const depart = base.length ? base.reduce((a, b) => a + b, 0) / base.length : null;
  const hausse = depart !== null && recEvas.length >= 2 && (recEvas.slice(-2).reduce((a, b) => a + b, 0) / 2) - depart >= R.hausse;
  if((dursDeSuite >= R.tropDur || hausse) && !ignore(prog, "alleger")){
    const raison = dursDeSuite >= R.tropDur ? `${dursDeSuite} séances « Trop dur » d'affilée.` : `Douleur en hausse depuis le début du programme (${fmt(depart)} → ${fmt(recEvas[recEvas.length - 1])}).`;
    return { type: "alleger", titre: "Alléger le programme", raison, ...niveauVoisin(prog, modeles, -1) };
  }

  /* Monter : assez de séances, douleur basse et pas en hausse, souvent « Trop facile » */
  if(recentes.length >= R.minSeances && !ignore(prog, "monter")){
    const maxEva = recEvas.length ? Math.max(...recEvas) : 0;
    const faciles = recentes.filter(s => s.ressenti === "facile").length;
    const durs = recentes.filter(s => s.ressenti === "difficile" || s.ressenti === "trop_dur").length;
    const pasEnHausse = recEvas.length < 2 || recEvas[recEvas.length - 1] <= recEvas[0];
    if(maxEva <= R.evaMax && pasEnHausse && faciles >= Math.ceil(recentes.length / 2) && !durs){
      return { type: "monter", titre: "Faire progresser", raison: `${recentes.length} séances en ${R.jours} jours, douleur ≤ ${maxEva}/10, ressenti « Trop facile » ${faciles} fois.`, ...niveauVoisin(prog, modeles, +1) };
    }
  }
  return null;
}

const fmt = n => n === null || n === undefined ? "–" : String(Math.round(n * 10) / 10).replace(".", ",");

function niveauVoisin(prog, modeles, sens){
  const o = origineDe(prog, modeles);
  const series = Number(prog.seances.find(s => !s.terminee)?.data?.series || prog.seances[0]?.data?.series || 1);
  if(o.niveau){
    const c = auNiveau(modeles, o.base, o.niveau + sens, o.modele?.lieu || lieuProg(prog));
    if(c) return { cible: filtrerOptions(c, o.choix), series: null };
  }
  if(sens > 0) return { cible: null, series: Math.min(series + 1, 5) };
  return { cible: null, series: series > 1 ? series - 1 : null, reps: series > 1 ? null : 0.7 };
}

function suivant(prog, modeles){
  const o = origineDe(prog, modeles);
  return o.niveau ? filtrerOptions(auNiveau(modeles, o.base, o.niveau + 1, o.modele?.lieu || lieuProg(prog)), o.choix) : null;
}

/** Texte court du changement proposé. */
export function changementTexte(p){
  if(p.cible) return `Passer à « ${p.cible.titre} »`;
  if(p.series) return `${p.type === "monter" ? "Ajouter" : "Retirer"} une série (${p.series} série${p.series > 1 ? "s" : ""})`;
  if(p.reps) return "Réduire les répétitions et les durées d'environ 30 %";
  return "";
}

/**
 * Applique le changement aux séances non faites du programme.
 * Renvoie les modifications à enregistrer avec C.replanSeances(cle, changes).
 */
export function changements(prog, p){
  return prog.seances.filter(s => !s.terminee).map(s => {
    const data = { ...s.data };
    const patch = { id: s.id };
    if(p.cible){
      data.exercices = p.cible.exercices.map(e => ({ type: "timer", ...e }));
      data.series = p.cible.series || 1;
      data.nom = p.cible.titre;
      patch.programmeNom = p.cible.titre;
      patch.origine = { modeleId: String(p.cible.id), nom: p.cible.nom, niveau: p.cible.niveau || null, ...(p.cible.choix ? { choix: p.cible.choix } : {}) };
    }else if(p.series){
      data.series = p.series;
    }else if(p.reps){
      data.exercices = (data.exercices || []).map(e => ({ ...e,
        reps: Math.max(1, Math.round((Number(e.reps) || 1) * p.reps)),
        ex: Math.max(5, Math.round((Number(e.ex) || 30) * p.reps / 5) * 5) }));
    }
    patch.data = data;
    return patch;
  });
}

/** Message au patient quand le programme évolue. */
export function messagePatient(p){
  if(p.type === "monter") return p.cible ? `Bravo pour votre régularité ! Votre programme passe au ${p.cible.niveau ? "niveau " + p.cible.niveau : "niveau suivant"} à partir de la prochaine séance.` : "Bravo pour votre régularité ! Vos exercices sont un peu plus soutenus à partir de la prochaine séance.";
  if(p.type === "alleger") return "J'ai allégé votre programme à partir de la prochaine séance. N'hésitez pas à m'écrire si la douleur persiste.";
  return "";
}

/** Tous les modèles : ceux du cabinet (prioritaires) et ceux fournis, non masqués ni remplacés. */
export async function chargerModeles(C){
  const M = await import("./modeles.js");
  const own = (await C.listModeles().catch(() => [])).map(r => M.normModele(r));
  const remplaces = new Set(own.map(m => m.remplace).filter(Boolean));
  return [...own, ...M.BUILTIN.filter(b => !M.isBuiltinHidden(b.id) && !remplaces.has(b.id))];
}

/**
 * Fenêtre de validation : montre le changement, propose d'écrire au patient, applique.
 * onDone(changes) après l'enregistrement.
 */
export function valider(C, cle, prog, p, { onDone = null, onIgnore = null } = {}){
  const msg = messagePatient(p);
  const sh = openSheet({
    title: p.titre,
    body: `<div class="stack" style="--gap:12px">
      <p><strong>${esc(prog.nom)}</strong></p>
      <p class="muted">${esc(p.raison)}</p>
      ${p.type !== "fin" ? `<div class="notice">${icon(p.type === "monter" ? "trendUp" : "trendDown")}<span>${esc(changementTexte(p)) || "Aucun changement automatique possible : modifiez le programme dans l'éditeur."}</span></div>
      <p class="small muted">Seules les séances pas encore faites changent. Les séances faites restent dans l'historique.</p>
      ${msg ? `<label class="check"><input type="checkbox" id="ev-msg" checked> Prévenir le patient : « ${esc(msg)} »</label>` : ""}`
      : `${p.cible ? `<div class="notice">${icon("trendUp")}<span>Programme suivant possible : « ${esc(p.cible.titre)} »</span></div>` : ""}`}
    </div>`,
    foot: `<button class="btn" type="button" data-ign>Plus tard</button>${p.type === "fin"
      ? `<a class="btn" href="/bilan.html?patient=${encodeURIComponent(cle)}">${icon("file")}Bilan</a>${p.cible ? `<button class="btn primary" type="button" data-next>${icon("check")}Programme suivant</button>` : ""}`
      : (p.cible || p.series || p.reps) ? `<button class="btn primary" type="button" data-ok>${icon("check")}Appliquer</button>` : `<a class="btn primary" href="/cloud.html?patient=${encodeURIComponent(cle)}">Ouvrir la fiche</a>`}`
  });
  sh.el.querySelector("[data-ign]").onclick = () => { ignorer(prog, p.type); sh.close(); onIgnore?.(); };
  sh.el.querySelector("[data-next]")?.addEventListener("click", () => {
    const n = prog.seances.length, sem = Math.max(...prog.seances.map(s => s.semaine || 1));
    try{ localStorage.setItem("gt_draft", JSON.stringify({ nom: p.cible.titre, series: p.cible.series || 1, exercices: p.cible.exercices, semaines: sem, seancesParSemaine: Math.max(1, Math.round(n / sem)),
      origine: { modeleId: String(p.cible.id), nom: p.cible.nom, niveau: p.cible.niveau || null, ...(p.cible.choix ? { choix: p.cible.choix } : {}) } })); }catch(e){}
    location.href = `/config.html?draft=1&patient=${encodeURIComponent(cle)}`;
  });
  sh.el.querySelector("[data-ok]")?.addEventListener("click", async e => {
    const b = e.currentTarget; b.disabled = true;
    try{
      const ch = changements(prog, p);
      await C.replanSeances(cle, ch);
      if(sh.el.querySelector("#ev-msg")?.checked && msg) await C.addMessage(cle, { texte: msg, sujet: prog.nom, de: "kine" }).catch(() => {});
      ignorer(prog, p.type, 10);
      sh.close();
      toast(p.type === "monter" ? "Programme mis à jour : niveau supérieur." : "Programme allégé.", { type: "ok" });
      onDone?.(ch);
    }catch(err){ console.error(err); b.disabled = false; toast("La mise à jour n'a pas abouti.", { type: "err" }); }
  });
  return sh;
}
