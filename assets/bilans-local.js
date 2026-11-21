/* Bilans enregistrés UNIQUEMENT sur cet appareil (IndexedDB du navigateur), jamais dans Firebase.
   Le bilan se fait sur la tablette ; à la fin, son PDF part chiffré vers le PC du cabinet
   (voir transfert.js), puis dans Maiia. Le bilan reste sur la tablette pour comparer
   les bilans suivants (intermédiaire, final).
   Même forme qu'avant dans Firebase : { id, cle, kine, type, date, etat (objet), resume, zones, motif,
   createdAt, updatedAt }. */

const DB = "apikine-bilans", STORE = "bilans";

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

/* Demande au navigateur de ne jamais effacer ces données de lui-même (place libre, appli peu ouverte…) */
let persistDemande = false;
function garder(){
  if(persistDemande) return;
  persistDemande = true;
  try{ navigator.storage?.persist?.().catch(() => {}); }catch(e){}
}

export const disponible = () => typeof indexedDB !== "undefined";

export async function duPatient(cle){
  if(!disponible() || !cle) return [];
  return (await tx("readonly", s => s.index("cle").getAll(cle))) || [];
}

export async function tous(){
  if(!disponible()) return [];
  return (await tx("readonly", s => s.getAll())) || [];
}

export async function lire(id){
  if(!disponible() || !id) return null;
  return (await tx("readonly", s => s.get(id))) || null;
}

export async function ecrire(bilan){
  garder();
  await tx("readwrite", s => s.put(JSON.parse(JSON.stringify(bilan))));
}

export async function effacer(id){
  if(!disponible() || !id) return;
  await tx("readwrite", s => s.delete(id));
}

/** Patient supprimé : ses bilans disparaissent aussi de cet appareil. */
export async function effacerPatient(cle){
  const l = await duPatient(cle);
  for(const b of l) await effacer(b.id);
  return l.length;
}

/** Changement de code du patient : ses bilans suivent le nouveau dossier. */
export async function renommer(ancienne, nouvelle){
  if(!ancienne || !nouvelle || ancienne === nouvelle) return 0;
  const l = await duPatient(ancienne);
  for(const b of l) await ecrire({ ...b, cle: nouvelle });
  return l.length;
}
