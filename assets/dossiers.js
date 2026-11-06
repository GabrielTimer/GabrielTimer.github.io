/* Dossiers d'enregistrement des documents (bilans, programmes PDF).
   Le kiné choisit une fois le dossier (ex. Documents/ApiKiné/Bilans) dans Réglages du cabinet ;
   les fichiers y sont ensuite enregistrés directement, sans fenêtre « Enregistrer sous ».
   Possible seulement dans Chrome / Edge sur ordinateur (API « File System Access ») :
   ailleurs (Android, iPhone, Safari, Firefox), les fichiers vont dans Téléchargements.
   Le choix est propre à chaque appareil (il est gardé dans le navigateur, pas dans le compte). */

export const TYPES = {
  bilans: "Bilans",
  documents: "Programmes et autres documents"
};

export const supporte = () => typeof window !== "undefined" && "showDirectoryPicker" in window;

/* ---------- Petite base IndexedDB pour garder les dossiers choisis ---------- */
const DB = "apikine-dossiers", STORE = "dossiers";
function base(){
  return new Promise((resolve, reject) => {
    const r = indexedDB.open(DB, 1);
    r.onupgradeneeded = () => r.result.createObjectStore(STORE);
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
}
async function idb(mode, fn){
  const db = await base();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, mode);
    const req = fn(tx.objectStore(STORE));
    tx.oncomplete = () => resolve(req?.result);
    tx.onerror = () => reject(tx.error);
  });
}

export async function dossier(type){
  if(!supporte()) return null;
  try{ return (await idb("readonly", s => s.get(type))) || null; }catch(e){ return null; }
}

/** Ouvre le sélecteur de dossier (à appeler depuis un clic) et garde le choix. */
export async function choisir(type){
  const actuel = await dossier(type);
  const h = await window.showDirectoryPicker({ id: "apikine-" + type, mode: "readwrite", startIn: actuel || "documents" });
  await idb("readwrite", s => s.put(h, type));
  return h;
}

export async function oublier(type){
  try{ await idb("readwrite", s => s.delete(type)); }catch(e){}
}

/** Vérifie (et demande si besoin) le droit d'écrire dans le dossier. À appeler dès le clic, avant un long calcul. */
export async function autoriser(type){
  const h = await dossier(type);
  if(!h) return null;
  try{
    const opt = { mode: "readwrite" };
    if(await h.queryPermission(opt) === "granted") return h;
    if(await h.requestPermission(opt) === "granted") return h;
  }catch(e){}
  return null;
}

function telecharger(blob, nom){
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = nom;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 60000);
}

/**
 * Enregistre le fichier dans le dossier choisi pour ce type, sinon le télécharge.
 * Renvoie { dossier: "Bilans" } si enregistré dans le dossier, { dossier: null } sinon.
 */
export async function enregistrer(type, blob, nom){
  const h = await autoriser(type);
  if(h){
    try{
      const fh = await h.getFileHandle(nom, { create: true });
      const w = await fh.createWritable();
      await w.write(blob);
      await w.close();
      return { dossier: h.name };
    }catch(e){ console.warn("Enregistrement dans le dossier impossible, téléchargement à la place", e); }
  }
  telecharger(blob, nom);
  return { dossier: null };
}
