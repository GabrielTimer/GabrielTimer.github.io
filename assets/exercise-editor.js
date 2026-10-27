/* =========================================================
   Créer un exercice, ou corriger un exercice de la bibliothèque (kiné)
   Titre, consignes, image, vidéo, mots-clés, réglage proposé…
   ========================================================= */

import { esc, icon, openSheet, toast, confirmDialog, exoImageHTML } from "./app.js";
import { applyEdit, exerciseKey, EDITABLE, fromCustom, addToLibrary, removeFromLibrary, loadLibrary, youtubeId, PERSO } from "./library.js";

const lines = v => String(v || "").split(/\n+/).map(s => s.trim()).filter(Boolean);
const items = v => String(v || "").split(/\s*[,;\n]\s*/).map(s => s.trim()).filter(Boolean);
const num = (v, min, max, def) => { const n = Math.round(Number(v)); return Number.isFinite(n) && String(v).trim() !== "" ? Math.max(min, Math.min(max, n)) : def; };

const MODES = ["Renforcement", "Étirement", "Mobilité", "Proprioception", "Équilibre", "Gainage", "Respiration", "Isométrique", "Dynamique", "Statique"];

const LISTS = [
  ["conseil_posture", "Bonne posture"],
  ["erreurs_frequentes", "À éviter"],
  ["precautions", "Précautions"],
  ["contreIndications", "Contre-indications"],
  ["version_facile", "Plus facile"],
  ["version_avancee", "Plus difficile"]
];

/* ---------- Image : réduite et compressée dans le navigateur ----------
   L'image est copiée dans chaque séance qui utilise l'exercice : on vise
   environ 120 Ko pour rester loin de la limite d'un document Firebase (1 Mo). */

const MAX_BYTES = 120 * 1024;

function loadImage(file){
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("image")); };
    img.src = url;
  });
}

export async function compressImage(file){
  const img = await loadImage(file);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  const webp = document.createElement("canvas").toDataURL("image/webp").startsWith("data:image/webp");
  const type = webp ? "image/webp" : "image/jpeg";
  let side = 900, quality = 0.82, out = "";
  for(let i = 0; i < 8; i++){
    const r = Math.min(1, side / Math.max(img.naturalWidth, img.naturalHeight));
    canvas.width = Math.max(1, Math.round(img.naturalWidth * r));
    canvas.height = Math.max(1, Math.round(img.naturalHeight * r));
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    out = canvas.toDataURL(type, quality);
    if(out.length * 0.75 <= MAX_BYTES) break;
    if(quality > 0.6) quality -= 0.1; else side = Math.round(side * 0.8);
  }
  return out;
}

/* ---------- Vidéo : un seul champ, quel que soit le site ---------- */

const videoValue = e => e.youtube || e.vimeo || e.videos?.[0]?.url || "";

function parseVideo(url){
  url = String(url || "").trim();
  if(!url) return { youtube: "", vimeo: "", videos: [] };
  if(youtubeId(url)) return { youtube: url, vimeo: "", videos: [] };
  if(/vimeo\.com\//.test(url)) return { youtube: "", vimeo: url, videos: [] };
  return { youtube: "", vimeo: "", videos: [{ url, titre: "Voir la vidéo" }] };
}

const plural = (n, w) => `${n} ${w}${n > 1 ? "s" : ""}`;

/**
 * Ouvre le formulaire.
 *   openExerciseEditor(null, …) : création d'un nouvel exercice
 *   openExerciseEditor(e, …)    : correction d'un exercice existant
 * onSaved(e, { before, after, created, deleted }) est appelé après enregistrement.
 */
export async function openExerciseEditor(e, { onSaved = () => {} } = {}){
  const creating = !e;
  const custom = creating || e.source === PERSO;
  const base = e || Object.assign(fromCustom("", { consignes: [], ex: 30, repos: 10, reps: 10, niveau: 1 }), { nom: "", categorie: "" });

  const all = await loadLibrary().catch(() => []);
  const cats = Array.from(new Set(all.map(x => x.categorie).filter(Boolean))).sort((a, b) => a.localeCompare(b, "fr"));
  let image = base.image || "";

  const area = (f, label, hint = "Une ligne par point", rows = 3, ph = "") => `
    <div class="field"><label for="ee-${f}">${esc(label)}</label>
      <textarea class="textarea" id="ee-${f}" data-f="${f}" rows="${rows}" style="min-height:${rows * 26 + 20}px" placeholder="${esc(ph)}">${esc((base[f] || []).join("\n"))}</textarea>
      <span class="hint">${esc(hint)}</span></div>`;
  const text = (f, label, value, { ph = "", hint = "", type = "text", list = "" } = {}) => `
    <div class="field"><label for="ee-${f}">${esc(label)}</label><input class="input" id="ee-${f}" data-f="${f}" type="${type}" value="${esc(value)}" placeholder="${esc(ph)}" ${list ? `list="${list}"` : ""}>${hint ? `<span class="hint">${esc(hint)}</span>` : ""}</div>`;
  const numField = (f, label, min, max) => `
    <div class="field"><label for="ee-${f}">${esc(label)}</label><input class="input" id="ee-${f}" data-f="${f}" type="number" inputmode="numeric" min="${min}" max="${max}" value="${esc(base[f])}"></div>`;
  const filled = LISTS.some(([f]) => (base[f] || []).length);

  const s = openSheet({
    title: creating ? "Créer un exercice" : "Modifier l'exercice",
    wide: true,
    tall: true,
    body: `
      <form class="stack ee-form" style="--gap:16px" novalidate>
        <div class="field"><label for="ee-nom">Titre</label><input class="input" id="ee-nom" data-f="nom" value="${esc(base.nom)}" maxlength="140" placeholder="Ex. Pont fessier unipodal" required></div>

        <div class="field"><span class="label">Image</span>
          <div class="ee-img">
            <div class="ee-img-prev" data-img-prev></div>
            <div class="stack" style="--gap:8px">
              <label class="btn soft sm ee-file">${icon("upload")}<span data-img-label></span><input type="file" accept="image/*" data-img-file hidden></label>
              <button class="btn ghost sm" type="button" data-img-del>${icon("trash")}Retirer l'image</button>
              <span class="hint">Photo ou dessin. Elle est réduite automatiquement.</span>
            </div>
          </div>
        </div>

        ${area("consignes", "Consignes", "Une consigne par ligne, dans l'ordre", 6, "Allongé sur le dos, genoux fléchis\nDécoller le bassin en serrant les fessiers\nRedescendre lentement")}
        ${text("position", "Position de départ", base.position || "", { ph: "Ex. Allongé sur le dos" })}
        <div class="field"><label for="ee-description">Description</label><textarea class="textarea" id="ee-description" data-f="description" rows="2">${esc(base.description || "")}</textarea></div>

        <div>
          <div class="label" style="margin-bottom:6px">Réglage proposé quand on l'ajoute à une séance</div>
          <div class="row wrap ee-nums" style="--gap:10px">
            ${numField("reps", "Répétitions", 1, 200)}
            ${numField("ex", "Effort (s)", 1, 7200)}
            ${numField("repos", "Repos (s)", 0, 7200)}
            <div class="field"><label for="ee-niveau">Niveau</label><select class="select" id="ee-niveau" data-f="niveau">${[1, 2, 3, 4, 5].map(n => `<option value="${n}" ${Number(base.niveau) === n ? "selected" : ""}>${n}</option>`).join("")}</select></div>
          </div>
        </div>

        <div class="row wrap ee-nums" style="--gap:10px">
          ${text("categorie", "Zone du corps", base.categorie || "", { ph: "Ex. Genou", list: "ee-cats" })}
          ${text("mode", "Type", base.mode || "", { ph: "Ex. Renforcement", list: "ee-modes" })}
        </div>
        <datalist id="ee-cats">${cats.map(c => `<option value="${esc(c)}">`).join("")}</datalist>
        <datalist id="ee-modes">${MODES.map(c => `<option value="${esc(c)}">`).join("")}</datalist>

        ${text("tags", "Mots-clés", (base.tags || []).join(", "), { ph: "Ex. sport, debout, sans matériel", hint: "Séparez par des virgules. Ils servent à retrouver l'exercice dans la recherche." })}
        ${text("pathologies", "Indications", (base.pathologies || []).join(", "), { ph: "Ex. Lombalgie, LCA", hint: "Séparez par des virgules" })}
        ${text("materiel", "Matériel", (base.materiel || []).join(", "), { ph: "Ex. Élastique, tapis", hint: "Séparez par des virgules" })}
        ${text("muscles", "Muscles", (base.muscles || []).join(", "), { ph: "Ex. Grand fessier, ischio-jambiers" })}
        ${text("video", "Lien vidéo", videoValue(base), { type: "url", ph: "YouTube, Vimeo ou autre lien", hint: "Les vidéos YouTube et Vimeo s'affichent directement dans l'application." })}

        <details class="ee-more" ${filled ? "open" : ""}><summary class="label" style="cursor:pointer">Conseils, précautions, variantes</summary>
          <div class="stack" style="--gap:16px;margin-top:12px">${LISTS.map(([f, l]) => area(f, l)).join("")}</div>
        </details>

        ${creating ? "" : `<label class="row ee-prop" style="--gap:10px;align-items:flex-start;padding:12px;border-radius:var(--r-sm);background:var(--surface-2)">
          <input type="checkbox" data-propagate checked style="margin-top:3px;width:18px;height:18px;flex:none">
          <span><strong>Corriger aussi les séances déjà envoyées</strong><br><span class="small muted">Séances pas encore faites et modèles. Les réglages et noms que vous avez personnalisés pour un patient sont conservés.</span></span>
        </label>`}
        ${!creating && custom ? `<p class="small faint">Exercice créé par vous. <button class="ee-link" type="button" data-remove>Supprimer cet exercice</button></p>` : ""}
        ${!custom && e.modifie ? `<p class="small faint">Cet exercice a déjà été modifié. <button class="ee-link" type="button" data-reset>Revenir à la version d'origine</button></p>` : ""}
        <p class="small" data-err role="alert" hidden style="color:var(--danger);font-weight:700"></p>
      </form>`,
    foot: `<button class="btn" type="button" data-close>Annuler</button><button class="btn primary" type="button" data-save>${icon(creating ? "plus" : "check")}${creating ? "Créer l'exercice" : "Enregistrer"}</button>`
  });

  const form = s.el.querySelector("form");
  const val = f => form.querySelector(`[data-f="${f}"]`)?.value ?? "";
  const propagateBox = s.el.querySelector("[data-propagate]");
  const saveBtn = s.el.querySelector("[data-save]");
  const saveHTML = saveBtn.innerHTML;
  setTimeout(() => s.el.querySelector("#ee-nom").focus(), 30);

  const showErr = msg => { const p = s.el.querySelector("[data-err]"); p.textContent = msg; p.hidden = !msg; if(msg) p.scrollIntoView({ block: "nearest" }); };
  const busy = (on, label) => {
    saveBtn.disabled = on;
    saveBtn.innerHTML = on ? `<span class="spinner" style="width:18px;height:18px"></span>${esc(label)}` : saveHTML;
  };

  /* Image */
  const renderImg = () => {
    s.el.querySelector("[data-img-prev]").innerHTML = image ? exoImageHTML(image, "") : `<div class="ee-img-empty">${icon("upload")}<span>Aucune image</span></div>`;
    s.el.querySelector("[data-img-label]").textContent = image ? "Changer l'image" : "Ajouter une image";
    s.el.querySelector("[data-img-del]").hidden = !image;
  };
  renderImg();
  s.el.querySelector("[data-img-file]").onchange = async ev => {
    const file = ev.target.files?.[0];
    ev.target.value = "";
    if(!file) return;
    showErr("");
    s.el.querySelector("[data-img-label]").textContent = "Préparation…";
    try{ image = await compressImage(file); }
    catch(err){ showErr("Cette image n'a pas pu être lue. Essayez une photo au format JPEG ou PNG."); }
    renderImg();
  };
  s.el.querySelector("[data-img-del]").onclick = () => { image = ""; renderImg(); };

  const collect = () => ({
    nom: val("nom").trim(),
    consignes: lines(val("consignes")),
    position: val("position").trim(),
    description: val("description").trim(),
    categorie: val("categorie").trim() || (custom ? "Autre" : base.categorie),
    mode: val("mode").trim(),
    tags: items(val("tags")),
    pathologies: items(val("pathologies")),
    materiel: items(val("materiel")),
    muscles: items(val("muscles")),
    image: image || null,
    ...parseVideo(val("video")),
    niveau: num(val("niveau"), 1, 5, base.niveau),
    reps: num(val("reps"), 1, 200, base.reps),
    ex: num(val("ex"), 1, 7200, base.ex),
    repos: num(val("repos"), 0, 7200, base.repos),
    ...Object.fromEntries(LISTS.map(([f]) => [f, lines(val(f))]))
  });

  const failed = err => {
    console.error(err);
    busy(false);
    showErr(err?.code === "permission-denied"
      ? "Firebase refuse l'enregistrement : publiez les règles de sécurité à jour (fichier firestore.rules, voir MISE-EN-SERVICE.md)."
      : "Enregistrement impossible. Vérifiez la connexion et réessayez.");
  };

  async function propagate(C, before, after){
    if(!propagateBox?.checked) return "";
    busy(true, "Mise à jour des séances…");
    const r = await C.propagateExerciseEdit(before, after).catch(err => { console.error(err); return { error: true }; });
    if(r.error) return " Les séances déjà envoyées n'ont pas pu être mises à jour.";
    const parts = [];
    if(r.seances) parts.push(plural(r.seances, "séance"));
    if(r.modeles) parts.push(plural(r.modeles, "modèle"));
    if(!parts.length) return "";
    const fem = r.seances && !r.modeles;
    return ` ${parts.join(" et ")} ${fem ? (r.seances > 1 ? "mises" : "mise") : "mis"} à jour.`;
  }

  const snapshot = () => ({ ...Object.fromEntries(EDITABLE.map(f => [f, base[f]])), id: base.id, source: base.source });

  async function commit(fields, label){
    const C = await import("./cloud.js");
    showErr("");
    busy(true, label);
    try{
      /* Nouvel exercice */
      if(creating){
        const id = C.newId();
        const data = { ...fields, createdAt: Date.now() };
        await C.saveCustomExercise(id, data);
        const ex = fromCustom(id, data);
        await addToLibrary(ex);
        s.close();
        toast(`« ${ex.nom} » ajouté à la bibliothèque.`, { type: "ok", duration: 4200 });
        onSaved(ex, { created: true });
        return;
      }
      const before = snapshot();
      /* Exercice créé par le kiné : on réécrit sa fiche */
      if(custom){
        const data = { ...base.raw, ...fields, createdAt: base.createdAt || Date.now() };
        await C.saveCustomExercise(base.id, data);
        Object.assign(base, fromCustom(base.id, data));
      }
      /* Exercice de la bibliothèque : correction (ou retour à l'original si fields est null) */
      else{
        const key = exerciseKey(base);
        if(fields) await C.saveExerciseEdit(key, { source: base.source, id: base.id, fields });
        else await C.deleteExerciseEdit(key);
        applyEdit(base, fields);
      }
      const after = snapshot();
      const extra = await propagate(C, before, after);
      s.close();
      toast((fields ? "Exercice enregistré." : "Version d'origine rétablie.") + extra, { type: "ok", duration: 4200 });
      onSaved(base, { before, after });
    }catch(err){ failed(err); }
  }

  saveBtn.onclick = () => {
    const fields = collect();
    if(!fields.nom){ showErr("Donnez un titre à l'exercice."); s.el.querySelector("#ee-nom").focus(); return; }
    if(creating && !fields.consignes.length && !fields.description){ showErr("Ajoutez au moins une consigne."); s.el.querySelector("#ee-consignes").focus(); return; }
    commit(fields, creating ? "Création…" : "Enregistrement…");
  };

  const reset = s.el.querySelector("[data-reset]");
  if(reset) reset.onclick = async () => {
    if(!await confirmDialog({ title: "Revenir à la version d'origine ?", message: "Vos corrections sur cet exercice seront effacées.", confirm: "Rétablir" })) return;
    commit(null, "Rétablissement…");
  };

  const remove = s.el.querySelector("[data-remove]");
  if(remove) remove.onclick = async () => {
    if(!await confirmDialog({ title: "Supprimer cet exercice ?", message: "Il disparaît de la bibliothèque. Les séances qui l'utilisent déjà le gardent.", confirm: "Supprimer", danger: true })) return;
    const C = await import("./cloud.js");
    busy(true, "Suppression…");
    try{
      await C.deleteExerciseEdit(exerciseKey(base));
      await removeFromLibrary(base);
      s.close();
      toast(`« ${base.nom} » supprimé de la bibliothèque.`, { type: "ok" });
      onSaved(base, { deleted: true });
    }catch(err){ failed(err); }
  };
  return s;
}
