/* =========================================================
   Correction d'un exercice de la bibliothèque (kiné)
   Titre, consignes, conseils, réglage proposé, vidéo…
   ========================================================= */

import { esc, icon, openSheet, toast, confirmDialog } from "./app.js";
import { applyEdit, exerciseKey, EDITABLE } from "./library.js";

const lines = v => String(v || "").split(/\n+/).map(s => s.trim()).filter(Boolean);
const items = v => String(v || "").split(/\s*[,;\n]\s*/).map(s => s.trim()).filter(Boolean);
const num = (v, min, max, def) => { const n = Math.round(Number(v)); return Number.isFinite(n) ? Math.max(min, Math.min(max, n)) : def; };

const LISTS = [
  ["conseil_posture", "Bonne posture"],
  ["erreurs_frequentes", "À éviter"],
  ["precautions", "Précautions"],
  ["version_facile", "Plus facile"],
  ["version_avancee", "Plus difficile"]
];

/**
 * Ouvre le formulaire de correction.
 * onSaved(e, { before, after, propagate }) est appelé après enregistrement.
 */
export function openExerciseEditor(e, { onSaved = () => {} } = {}){
  const area = (f, label, hint = "Une ligne par point", rows = 3) => `
    <div class="field"><label for="ee-${f}">${esc(label)}</label>
      <textarea class="textarea" id="ee-${f}" data-f="${f}" rows="${rows}" style="min-height:${rows * 26 + 20}px">${esc((e[f] || []).join("\n"))}</textarea>
      <span class="hint">${esc(hint)}</span></div>`;
  const numField = (f, label, min, max) => `
    <div class="field"><label for="ee-${f}">${esc(label)}</label><input class="input" id="ee-${f}" data-f="${f}" type="number" inputmode="numeric" min="${min}" max="${max}" value="${esc(e[f])}"></div>`;
  const filled = LISTS.some(([f]) => (e[f] || []).length);

  const s = openSheet({
    title: "Modifier l'exercice",
    wide: true,
    tall: true,
    body: `
      <form class="stack ee-form" style="--gap:16px" novalidate>
        <div class="field"><label for="ee-nom">Titre</label><input class="input" id="ee-nom" data-f="nom" value="${esc(e.nom)}" maxlength="140" required></div>
        ${area("consignes", "Consignes", "Une consigne par ligne, dans l'ordre", 6)}
        <div class="field"><label for="ee-position">Position de départ</label><input class="input" id="ee-position" data-f="position" value="${esc(e.position || "")}"></div>
        <div class="field"><label for="ee-description">Description</label><textarea class="textarea" id="ee-description" data-f="description" rows="2">${esc(e.description || "")}</textarea></div>
        <div>
          <div class="label" style="margin-bottom:6px">Réglage proposé quand on l'ajoute à une séance</div>
          <div class="row wrap ee-nums" style="--gap:10px">
            ${numField("reps", "Répétitions", 1, 200)}
            ${numField("ex", "Effort (s)", 1, 7200)}
            ${numField("repos", "Repos (s)", 0, 7200)}
            <div class="field"><label for="ee-niveau">Niveau</label><select class="select" id="ee-niveau" data-f="niveau">${[1, 2, 3, 4, 5].map(n => `<option value="${n}" ${Number(e.niveau) === n ? "selected" : ""}>${n}</option>`).join("")}</select></div>
          </div>
        </div>
        <div class="field"><label for="ee-materiel">Matériel</label><input class="input" id="ee-materiel" data-f="materiel" value="${esc((e.materiel || []).join(", "))}" placeholder="Ex. Élastique, tapis"><span class="hint">Séparez par des virgules</span></div>
        <div class="field"><label for="ee-youtube">Vidéo YouTube</label><input class="input" id="ee-youtube" data-f="youtube" type="url" value="${esc(e.youtube || "")}" placeholder="https://youtu.be/…"></div>
        <details class="ee-more" ${filled ? "open" : ""}><summary class="label" style="cursor:pointer">Conseils, précautions, variantes</summary>
          <div class="stack" style="--gap:16px;margin-top:12px">${LISTS.map(([f, l]) => area(f, l)).join("")}</div>
        </details>
        <label class="row ee-prop" style="--gap:10px;align-items:flex-start;padding:12px;border-radius:var(--r-sm);background:var(--surface-2)">
          <input type="checkbox" data-propagate checked style="margin-top:3px;width:18px;height:18px;flex:none">
          <span><strong>Corriger aussi les séances déjà envoyées</strong><br><span class="small muted">Séances pas encore faites et modèles. Les réglages et noms que vous avez personnalisés pour un patient sont conservés.</span></span>
        </label>
        ${e.modifie ? `<p class="small faint">Cet exercice a déjà été modifié. <button class="link" type="button" data-reset style="background:none;border:0;padding:0;color:var(--lagon-strong);text-decoration:underline;cursor:pointer;font:inherit">Revenir à la version d'origine</button></p>` : ""}
        <p class="small" data-err role="alert" hidden style="color:var(--danger);font-weight:700"></p>
      </form>`,
    foot: `<button class="btn" type="button" data-close>Annuler</button><button class="btn primary" type="button" data-save>${icon("check")}Enregistrer</button>`
  });

  const form = s.el.querySelector("form");
  const val = f => form.querySelector(`[data-f="${f}"]`)?.value ?? "";
  const propagateBox = s.el.querySelector("[data-propagate]");
  setTimeout(() => s.el.querySelector("#ee-nom").focus(), 30);

  const collect = () => ({
    nom: val("nom").trim(),
    consignes: lines(val("consignes")),
    position: val("position").trim(),
    description: val("description").trim(),
    materiel: items(val("materiel")),
    youtube: val("youtube").trim(),
    niveau: num(val("niveau"), 1, 5, e.niveau),
    reps: num(val("reps"), 1, 200, e.reps),
    ex: num(val("ex"), 1, 7200, e.ex),
    repos: num(val("repos"), 0, 7200, e.repos),
    ...Object.fromEntries(LISTS.map(([f]) => [f, lines(val(f))]))
  });

  const showErr = msg => { const p = s.el.querySelector("[data-err]"); p.textContent = msg; p.hidden = !msg; if(msg) p.scrollIntoView({ block: "nearest" }); };

  const busy = (on, label) => {
    const b = s.el.querySelector("[data-save]");
    b.disabled = on;
    b.innerHTML = on ? `<span class="spinner" style="width:18px;height:18px"></span>${esc(label)}` : `${icon("check")}Enregistrer`;
  };

  async function commit(fields, label){
    const C = await import("./cloud.js");
    const key = exerciseKey(e);
    const before = {};
    EDITABLE.forEach(f => { before[f] = e[f]; });
    showErr("");
    busy(true, label);
    try{
      if(fields) await C.saveExerciseEdit(key, { source: e.source, id: e.id, fields });
      else await C.deleteExerciseEdit(key);
      applyEdit(e, fields);
      const after = { ...Object.fromEntries(EDITABLE.map(f => [f, e[f]])), id: e.id, source: e.source };
      let report = null;
      if(propagateBox?.checked){
        busy(true, "Mise à jour des séances…");
        report = await C.propagateExerciseEdit({ ...before, id: e.id, source: e.source }, after).catch(err => { console.error(err); return { error: true }; });
      }
      s.close();
      let msg = fields ? "Exercice corrigé." : "Version d'origine rétablie.";
      if(report?.error) msg += " Les séances déjà envoyées n'ont pas pu être mises à jour.";
      else if(report && (report.seances || report.modeles)){
        const parts = [];
        if(report.seances) parts.push(`${report.seances} séance${report.seances > 1 ? "s" : ""}`);
        if(report.modeles) parts.push(`${report.modeles} modèle${report.modeles > 1 ? "s" : ""}`);
        msg += ` ${parts.join(" et ")} mis à jour.`;
      }
      toast(msg, { type: report?.error ? "warn" : "ok", duration: 4200 });
      onSaved(e, { before, after });
    }catch(err){
      console.error(err);
      busy(false);
      showErr(err?.code === "permission-denied"
        ? "Firebase refuse l'enregistrement : publiez les nouvelles règles de sécurité (fichier firestore.rules, voir MISE-EN-SERVICE.md)."
        : "Enregistrement impossible. Vérifiez la connexion et réessayez.");
    }
  }

  s.el.querySelector("[data-save]").onclick = () => {
    const fields = collect();
    if(!fields.nom){ showErr("Le titre ne peut pas être vide."); s.el.querySelector("#ee-nom").focus(); return; }
    commit(fields, "Enregistrement…");
  };
  const reset = s.el.querySelector("[data-reset]");
  if(reset) reset.onclick = async () => {
    if(!await confirmDialog({ title: "Revenir à la version d'origine ?", message: "Vos corrections sur cet exercice seront effacées.", confirm: "Rétablir" })) return;
    commit(null, "Rétablissement…");
  };
  return s;
}
