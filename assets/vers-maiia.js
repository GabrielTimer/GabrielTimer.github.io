/* Mettre les bilans et leurs photos dans Maiia, depuis le PC du cabinet.

   - Bilans : ils sont dans Firebase. Le PC crée lui-même leurs PDF et les range dans le dossier
     « Bilans » (Réglages du cabinet → Dossiers d'enregistrement). Chaque bilan exporté reçoit
     maiiaAt ; il revient dans la liste s'il est modifié ensuite.
   - Photos : prises sur la tablette (qualité d'origine, gardées sur la tablette). Une copie part
     dans Firebase (photos_pc, morceaux de moins de 1 Mo). Le PC la range dans le dossier « Photos »,
     identique à l'original, puis l'efface de Firebase.
   Page : maiia.html. Rappel : accueil kiné. */

const MORCEAU = 680 * 1024;            // 680 Ko par document (≈ 907 000 caractères en base64 ; limite Firestore : 1 Mo)
const K_ATT = "gt_photos_a_envoyer";   // photos de cet appareil pas encore parties vers le PC
const K_MIGR = "gt_photos_pc_v1";      // photos prises avant cette version : envoyées une fois

/* ---------- Outils ---------- */

const lireLS = k => { try{ return JSON.parse(localStorage.getItem(k) || "null"); }catch(e){ return null; } };
const ecrireLS = (k, v) => { try{ localStorage.setItem(k, JSON.stringify(v)); }catch(e){} };

function b64(u8){
  let s = "";
  for(let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000));
  return btoa(s);
}
function deb64(s){
  const bin = atob(s), u8 = new Uint8Array(bin.length);
  for(let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
  return u8;
}
const propre = nom => String(nom || "").replace(/[\\/:*?"<>|]/g, "").replace(/\s+/g, " ").trim();
const iso = t => { const d = new Date(t), z = n => String(n).padStart(2, "0"); return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}`; };
const heure = t => { const d = new Date(t), z = n => String(n).padStart(2, "0"); return `${z(d.getHours())}h${z(d.getMinutes())}`; };

/* ---------- Tablette : envoi des photos ---------- */

const enAttente = () => lireLS(K_ATT) || [];

/** Une photo vient d'être prise : elle part vers le PC (tout de suite, ou au retour du réseau). */
export function photoAEnvoyer(id){
  const l = enAttente();
  if(!l.includes(id)){ l.push(id); ecrireLS(K_ATT, l); }
  return relancerPhotos();
}

let enCours = false;
/** Envoie les photos qui attendent. Renvoie le nombre de photos parties. */
export async function relancerPhotos(){
  if(enCours) return 0;
  enCours = true;
  let n = 0;
  try{
    const P = await import("./bilan-photos.js");
    /* Une seule fois : les photos déjà sur la tablette avant cette version partent aussi */
    if(!lireLS(K_MIGR)){
      const ids = await P.idsPhotos().catch(() => []);
      const l = enAttente();
      ids.forEach(id => { if(!l.includes(id)) l.push(id); });
      ecrireLS(K_ATT, l); ecrireLS(K_MIGR, Date.now());
    }
    if(!enAttente().length || navigator.onLine === false) return 0;
    const C = await import("./cloud.js");
    for(const id of [...enAttente()]){
      const p = await P.lirePhoto(id).catch(() => null);
      if(p?.blob){
        const octets = new Uint8Array(await p.blob.arrayBuffer());
        const total = Math.max(1, Math.ceil(octets.length / MORCEAU));
        const parts = [];
        for(let i = 0; i < total; i++){
          parts.push({ photo: id, n: i, total, cle: p.cle || "", bilan: p.bilan || "", date: p.date || Date.now(),
            type: p.blob.type || "image/jpeg", data: b64(octets.subarray(i * MORCEAU, (i + 1) * MORCEAU)) });
        }
        try{ await C.photosPcEcrire(parts); }
        catch(e){ console.warn("Photos : envoi remis à plus tard", e); break; }
        n++;
      }
      /* Partie (ou supprimée de la tablette entre-temps) : on ne la renvoie plus */
      ecrireLS(K_ATT, enAttente().filter(x => x !== id));
    }
  }finally{ enCours = false; }
  return n;
}

export const photosNonParties = () => enAttente().length;

/* ---------- PC : ce qui reste à mettre dans Maiia ---------- */

/** Bilan jamais exporté, ou modifié depuis son dernier export. */
export const aExporter = b => !b.maiiaAt || (b.updatedAt || 0) > b.maiiaAt + 5000;

/** { bilans: [à exporter], exportes: [déjà exportés, du plus récent au plus ancien], photos: nombre, patients: Map } */
export async function etat(){
  const C = await import("./cloud.js");
  const [bilans, patients, morceaux] = await Promise.all([
    C.listAllBilans(), C.listPatients().catch(() => []), C.photosPcLister().catch(() => [])
  ]);
  const P = new Map(patients.map(p => [p.cle, p]));
  const tri = (a, b) => String(a.date || "").localeCompare(String(b.date || "")) || (a.createdAt || 0) - (b.createdAt || 0);
  return {
    bilans: bilans.filter(aExporter).sort(tri),
    exportes: bilans.filter(b => !aExporter(b)).sort((a, b) => (b.maiiaAt || 0) - (a.maiiaAt || 0)),
    photos: new Set(morceaux.filter(m => m.n === 0).map(m => m.photo)).size,
    tous: bilans, patients: P
  };
}

/** Nombre de bilans et de photos à mettre dans Maiia (rappel de l'accueil). */
export async function aFaire(){
  const e = await etat();
  return { bilans: e.bilans.length, photos: e.photos, plusAncien: e.bilans[0]?.updatedAt || e.bilans[0]?.createdAt || 0 };
}

/* ---------- PC : export ---------- */

async function pdfDuBilan(b, patient, tous){
  const B = await import("./bilan-core.js");
  const S = { ...(b.etat || {}) };
  S.f = S.f || {}; S.c = S.c || {}; S.pain = S.pain || {}; S.cl = S.cl || {};
  S.type = S.type || b.type; S.date = S.date || b.date;
  const liste = tous.filter(x => x.cle === b.cle);
  const prev = B.previousOf(liste, b.id, S.date);
  const d = await B.bilanPdf(S, patient, prev ? { prev: prev.etat, prevDate: prev.date } : {});
  return { blob: d.output("blob"), nom: B.pdfName(S, patient) };
}

/** Enregistre un bilan en PDF dans le dossier « Bilans » et le marque comme exporté. */
export async function exporterBilan(b, { patients, tous }){
  const C = await import("./cloud.js");
  const D = await import("./dossiers.js");
  const patient = patients.get(b.cle) || { cle: b.cle, nom: "Patient" };
  const { blob, nom } = await pdfDuBilan(b, patient, tous);
  const r = await D.enregistrer("bilans", blob, nom);
  await C.marquerBilanMaiia(b.id);
  return { nom, dossier: r.dossier || "" };
}

/** Range toutes les photos arrivées dans le dossier « Photos », puis les efface de Firebase. */
export async function exporterPhotos({ patients, onProgress = () => {} }){
  const C = await import("./cloud.js");
  const D = await import("./dossiers.js");
  const P = await import("./bilan-photos.js");
  const morceaux = await C.photosPcLister();
  const groupes = new Map();
  morceaux.forEach(m => { if(!groupes.has(m.photo)) groupes.set(m.photo, []); groupes.get(m.photo).push(m); });
  let faites = 0, incompletes = 0, dossier = "";
  for(const [photo, parts] of groupes){
    const p0 = parts.find(x => x.n === 0);
    if(!p0 || parts.length < p0.total){ incompletes++; continue; }   // encore en cours d'envoi depuis la tablette
    const bouts = parts.sort((a, b) => a.n - b.n).map(x => deb64(x.data));
    const tout = new Uint8Array(bouts.reduce((t, x) => t + x.length, 0));
    let o = 0; bouts.forEach(x => { tout.set(x, o); o += x.length; });
    const nomPatient = patients.get(p0.cle)?.nom || "Patient";
    const nom = propre(`${iso(p0.date)} ${heure(p0.date)} ${nomPatient}${p0.bilan ? ` - ${p0.bilan.replace(/\//g, "-")}` : ""}`) + "." + P.extension(p0.type);
    const r = await D.enregistrer("photos", new Blob([tout], { type: p0.type || "image/jpeg" }), nom);
    dossier = r.dossier || dossier;
    await C.photosPcEffacer(photo, p0.total);
    faites++;
    onProgress(faites, groupes.size);
  }
  return { faites, incompletes, dossier };
}
