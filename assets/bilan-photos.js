/* Photos du bilan (posture, cicatrice, œdème, amplitude…).
   Enregistrées UNIQUEMENT sur cet appareil (IndexedDB du navigateur) :
   jamais envoyées dans le cloud, ni mises dans le PDF ou le résumé.
   Chaque photo est rattachée au patient (clé d'accès) et au bilan (S.pk, identifiant local du bilan). */

import { esc, icon, toast, openSheet, confirmDialog } from "./app.js";

const DB = "apikine-photos", STORE = "photos", MAX = 1600, QUALITE = .85;

function base(){
  return new Promise((resolve, reject) => {
    const r = indexedDB.open(DB, 1);
    r.onupgradeneeded = () => r.result.createObjectStore(STORE, { keyPath: "id" }).createIndex("cle", "cle");
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
}
async function tx(mode, fn){
  const db = await base();
  return new Promise((resolve, reject) => {
    const t = db.transaction(STORE, mode);
    const req = fn(t.objectStore(STORE));
    t.oncomplete = () => resolve(req?.result);
    t.onerror = () => reject(t.error);
  });
}
const photosDuPatient = cle => tx("readonly", s => s.index("cle").getAll(cle)).then(l => (l || []).sort((a, b) => b.date - a.date));
const ajouter = p => tx("readwrite", s => s.put(p));
const supprimer = id => tx("readwrite", s => s.delete(id));

/** Identifiant local du bilan (gardé dans l'état du bilan ; ne contient aucune image). */
export function cleBilan(S){
  if(!S.pk) S.pk = "pk" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  return S.pk;
}

export async function nombre(patient, S){
  if(!S.pk) return 0;
  try{ return (await photosDuPatient(patient.cle)).filter(p => p.pk === S.pk).length; }catch(e){ return 0; }
}

/* Réduit la photo (1600 px au plus, JPEG) : assez pour zoomer, sans remplir la tablette. */
function reduire(file){
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const k = Math.min(1, MAX / Math.max(img.naturalWidth, img.naturalHeight));
      const c = document.createElement("canvas");
      c.width = Math.round(img.naturalWidth * k); c.height = Math.round(img.naturalHeight * k);
      c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      c.toBlob(b => b ? resolve(b) : reject(new Error("photo")), "image/jpeg", QUALITE);
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("photo")); };
    img.src = url;
  });
}

const fmt = t => new Date(t).toLocaleString("fr-FR", { day:"2-digit", month:"2-digit", year:"numeric", hour:"2-digit", minute:"2-digit" });
const nomFichier = (patient, p) => `Photo ${patient.nom || "patient"} ${new Date(p.date).toLocaleDateString("fr-FR").replace(/\//g, "-")} ${new Date(p.date).toTimeString().slice(0, 5).replace(":", "h")}.jpg`.replace(/[\\/:*?"<>|]/g, "");

function telecharger(blob, nom){
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob); a.download = nom;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 60000);
}

const CSS = `
.ph-actions{display:flex;flex-wrap:wrap;gap:10px;margin-bottom:12px}
.ph-actions label{cursor:pointer}
.ph-actions input{position:absolute;width:1px;height:1px;opacity:0;pointer-events:none}
.ph-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(120px,1fr));gap:10px}
.ph-grid button{position:relative;padding:0;border:1px solid var(--line);border-radius:12px;overflow:hidden;background:var(--bg-soft,#f4f8f9);aspect-ratio:1;cursor:pointer}
.ph-grid img{width:100%;height:100%;object-fit:cover;display:block}
.ph-grid small{position:absolute;left:0;right:0;bottom:0;padding:3px 6px;background:rgba(0,0,0,.55);color:#fff;font-size:11px;text-align:left}
.ph-view img{display:block;max-width:100%;max-height:70vh;margin:0 auto;border-radius:10px}
.ph-sub{margin:16px 0 8px;font-weight:600}`;
let cssOk = false;

/**
 * Ouvre la fenêtre des photos du bilan.
 * onChange(nombre) est appelé après chaque ajout ou suppression (pour le badge du bouton).
 */
export async function ouvrirPhotos({ patient, S, label = "Bilan", onChange = () => {}, save = () => {} }){
  if(!cssOk){ const st = document.createElement("style"); st.textContent = CSS; document.head.append(st); cssOk = true; }
  if(!S.pk){ cleBilan(S); save(); }
  try{ navigator.storage?.persist?.(); }catch(e){}
  const urls = [];
  const libere = () => { urls.splice(0).forEach(u => URL.revokeObjectURL(u)); };
  const sh = openSheet({ title: "Photos du bilan", wide: true, tall: true, onClose: libere,
    body: `<div class="notice">${icon("lock")}<span>Les photos restent <strong>uniquement sur cet appareil</strong> : elles ne sont envoyées ni dans le cloud, ni dans le PDF. Elles disparaissent si les données du navigateur sont effacées ou l'application désinstallée.</span></div>
      <div class="ph-actions" style="margin-top:12px">
        <label class="btn primary">${icon("camera")}Prendre une photo<input type="file" accept="image/*" capture="environment" data-ph-in></label>
        <label class="btn">${icon("image")}Depuis la galerie<input type="file" accept="image/*" multiple data-ph-in></label>
      </div>
      <div data-ph-list></div>`,
    foot: `<button class="btn" type="button" data-close>Fermer</button>` });

  async function dessiner(){
    libere();
    let toutes = [];
    try{ toutes = await photosDuPatient(patient.cle); }
    catch(e){ sh.body.querySelector("[data-ph-list]").innerHTML = `<div class="notice danger">${icon("alert")}<span>Ce navigateur ne permet pas d'enregistrer des photos sur l'appareil.</span></div>`; return; }
    const ici = toutes.filter(p => p.pk === S.pk), autres = toutes.filter(p => p.pk !== S.pk);
    const grille = l => `<div class="ph-grid">${l.map(p => { const u = URL.createObjectURL(p.blob); urls.push(u); return `<button type="button" data-ph="${esc(p.id)}" aria-label="Voir la photo du ${esc(fmt(p.date))}"><img src="${u}" alt=""><small>${esc(fmt(p.date))}${p.pk !== S.pk && p.bilan ? ` · ${esc(p.bilan)}` : ""}</small></button>`; }).join("")}</div>`;
    sh.body.querySelector("[data-ph-list]").innerHTML =
      (ici.length ? grille(ici) : `<p class="muted">Aucune photo pour ce bilan.</p>`) +
      (autres.length ? `<p class="ph-sub">Photos des autres bilans de ce patient (${autres.length})</p>${grille(autres)}` : "");
    sh.body.querySelectorAll("[data-ph]").forEach(b => b.onclick = () => voir(toutes.find(p => p.id === b.dataset.ph)));
    onChange(ici.length);
  }

  function voir(p){
    const u = URL.createObjectURL(p.blob);
    const v = openSheet({ title: `Photo du ${fmt(p.date)}`, wide: true, onClose: () => URL.revokeObjectURL(u),
      body: `<div class="ph-view"><img src="${u}" alt="Photo du bilan"></div>${p.bilan ? `<p class="hint" style="margin-top:8px">${esc(p.bilan)}</p>` : ""}`,
      foot: `<button class="btn danger" type="button" data-del>${icon("trash")}Supprimer</button><span class="spacer"></span><button class="btn" type="button" data-dl>${icon("download")}Télécharger</button><button class="btn primary" type="button" data-close>Fermer</button>` });
    v.el.querySelector("[data-dl]").onclick = () => telecharger(p.blob, nomFichier(patient, p));
    v.el.querySelector("[data-del]").onclick = async () => {
      if(!(await confirmDialog({ title: "Supprimer la photo ?", message: "Elle sera effacée de cet appareil.", confirm: "Supprimer", danger: true }))) return;
      await supprimer(p.id); v.close(); toast("Photo supprimée."); dessiner();
    };
  }

  sh.body.querySelectorAll("[data-ph-in]").forEach(inp => inp.onchange = async () => {
    const files = [...(inp.files || [])]; inp.value = "";
    if(!files.length) return;
    let ok = 0;
    for(const f of files){
      try{
        const blob = await reduire(f);
        await ajouter({ id: "ph" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), cle: patient.cle, pk: S.pk,
          bilan: [label, S.date ? new Date(S.date).toLocaleDateString("fr-FR") : ""].filter(Boolean).join(" du "), date: Date.now(), blob });
        ok++;
      }catch(e){ console.error(e); }
    }
    if(ok) toast(ok > 1 ? `${ok} photos enregistrées sur cet appareil.` : "Photo enregistrée sur cet appareil.", { type: "ok" });
    else toast("La photo n'a pas pu être enregistrée.", { type: "err" });
    dessiner();
  });

  dessiner();
}
