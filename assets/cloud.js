/* =========================================================
   Accès aux données (Firebase)
   ---------------------------------------------------------
   Organisation dans Firestore :
     patients/{code}                 → nom du patient (lisible par lui seul)
     fiches/{code}                   → coordonnées et note privée (kiné uniquement)
     patients/{code}/seances/{id}    → séances prescrites à ce patient
     modeles/{id}                    → programmes modèles du cabinet
     programmes/{id}                 → ancienne collection (avant migration)
   Le « code » est un identifiant secret de 12 caractères : seul le patient
   qui l'a reçu (lien ou QR code) peut lire son dossier.
   ========================================================= */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  initializeFirestore, persistentLocalCache, persistentMultipleTabManager, getFirestore,
  collection, collectionGroup, doc, getDoc, getDocs, setDoc, deleteDoc, writeBatch
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import {
  getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged, sendPasswordResetEmail
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import { FIREBASE_CONFIG, ADMIN_EMAILS } from "./config.js";

const app = initializeApp(FIREBASE_CONFIG);

let db;
try{
  db = initializeFirestore(app, {
    localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() })
  });
}catch(e){
  db = getFirestore(app);
}
export { db };
export const auth = getAuth(app);

/* ---------- Authentification du kiné ---------- */

const authReady = new Promise(resolve => {
  const stop = onAuthStateChanged(auth, user => { stop(); resolve(user); });
});

export function isKineUser(user){
  return !!(user && user.email && ADMIN_EMAILS.map(e => e.toLowerCase()).includes(user.email.toLowerCase()));
}

/** Renvoie l'utilisateur kiné connecté, ou null. */
export async function currentKine(){
  const user = await authReady;
  return isKineUser(auth.currentUser || user) ? (auth.currentUser || user) : null;
}

export async function loginKine(email, password){
  const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
  if(!isKineUser(cred.user)){
    await signOut(auth);
    const err = new Error("Ce compte n'a pas accès à l'espace kiné.");
    err.code = "app/not-kine";
    throw err;
  }
  return cred.user;
}

export function logoutKine(){ return signOut(auth); }

export function resetPassword(email){ return sendPasswordResetEmail(auth, email.trim()); }

/* ---------- Outils ---------- */

const ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";

/** Nouveau code d'accès patient : 12 caractères, 60 bits d'aléa. */
export function newAccessCode(){
  const bytes = crypto.getRandomValues(new Uint8Array(12));
  return Array.from(bytes, b => ALPHABET[b % 32]).join("");
}

export function newId(){
  return (crypto.randomUUID ? crypto.randomUUID() : newAccessCode() + Date.now().toString(36));
}

export function slugPatient(nom){
  return String(nom || "")
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .trim().toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export function nomDepuisSlug(slug){
  return String(slug || "")
    .split(/[_\s]+/).filter(Boolean)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

/* Firestore refuse les valeurs undefined : on nettoie avant d'écrire. */
function clean(obj){
  return JSON.parse(JSON.stringify(obj, (k, v) => (v === undefined ? null : v)));
}

function withData(d){
  const data = d.data || d["données"] || null;
  return { ...d, data };
}

/* ---------- Patients ----------
   patients/{code} : ce que le patient peut lire (son nom).
   fiches/{code}   : coordonnées et note privée, réservées au kiné. */

const PRIVATE = ["telephone", "email", "note", "legacyId"];
function split(data){
  const pub = {}, priv = {};
  Object.entries(data).forEach(([k, v]) => { (PRIVATE.includes(k) ? priv : pub)[k] = v; });
  return { pub, priv };
}

export async function getPatient(cle, { fiche = false } = {}){
  if(!cle) return null;
  const snap = await getDoc(doc(db, "patients", cle));
  if(!snap.exists()) return null;
  const p = { cle: snap.id, ...snap.data() };
  if(fiche){
    const f = await getDoc(doc(db, "fiches", cle)).catch(() => null);
    if(f && f.exists()) Object.assign(p, f.data());
  }
  return p;
}

export async function listPatients(){
  const [snap, fiches] = await Promise.all([
    getDocs(collection(db, "patients")),
    getDocs(collection(db, "fiches")).catch(() => ({ docs: [] }))
  ]);
  const byCle = new Map(fiches.docs.map(d => [d.id, d.data()]));
  return snap.docs.map(d => ({ cle: d.id, ...d.data(), ...(byCle.get(d.id) || {}) }))
    .sort((a, b) => (a.nom || "").localeCompare(b.nom || "", "fr"));
}

export async function createPatient({ nom, telephone = "", email = "", note = "", legacyId = "" }){
  const cle = newAccessCode();
  const now = Date.now();
  const pub = { nom: String(nom).trim(), patientId: slugPatient(nom), createdAt: now, updatedAt: now };
  const priv = { telephone, email, note, legacyId: legacyId || null, updatedAt: now };
  await setDoc(doc(db, "patients", cle), clean(pub));
  await setDoc(doc(db, "fiches", cle), clean(priv));
  return { cle, ...pub, ...priv };
}

export async function updatePatient(cle, patch){
  const { pub, priv } = split(patch);
  const now = Date.now();
  if(Object.keys(pub).length) await setDoc(doc(db, "patients", cle), clean({ ...pub, updatedAt: now }), { merge: true });
  if(Object.keys(priv).length) await setDoc(doc(db, "fiches", cle), clean({ ...priv, updatedAt: now }), { merge: true });
}

export async function deletePatient(cle){
  const seances = await listSeances(cle);
  await batchDelete(seances.map(s => doc(db, "patients", cle, "seances", s.id)));
  await deleteDoc(doc(db, "fiches", cle)).catch(() => {});
  await deleteDoc(doc(db, "patients", cle));
}

/** Change le code d'accès d'un patient (l'ancien lien cesse de fonctionner). */
export async function renewAccessCode(cle){
  const patient = await getPatient(cle, { fiche: true });
  if(!patient) throw new Error("Patient introuvable");
  const seances = await listSeances(cle);
  const nouveau = newAccessCode();
  const { cle: _old, ...data } = patient;
  const { pub, priv } = split(data);
  await setDoc(doc(db, "patients", nouveau), clean({ ...pub, updatedAt: Date.now() }));
  await setDoc(doc(db, "fiches", nouveau), clean(priv));
  await batchWrite(seances.map(s => {
    const { id, cle: _c, firebaseId, ...rest } = s;
    return [doc(db, "patients", nouveau, "seances", id), { ...rest, cle: nouveau }];
  }));
  await batchDelete(seances.map(s => doc(db, "patients", cle, "seances", s.id)));
  await deleteDoc(doc(db, "fiches", cle)).catch(() => {});
  await deleteDoc(doc(db, "patients", cle));
  return nouveau;
}

/* ---------- Séances ---------- */

function mapSeance(d, cle){
  const s = withData(d.data());
  return { ...s, id: d.id, firebaseId: d.id, cle: s.cle || cle };
}

export async function listSeances(cle){
  const snap = await getDocs(collection(db, "patients", cle, "seances"));
  return snap.docs.map(d => mapSeance(d, cle));
}

export async function getSeance(cle, id){
  const snap = await getDoc(doc(db, "patients", cle, "seances", id));
  return snap.exists() ? mapSeance(snap, cle) : null;
}

/** Toutes les séances de tous les patients (kiné uniquement). */
export async function listAllSeances(){
  const snap = await getDocs(collectionGroup(db, "seances"));
  return snap.docs.map(d => mapSeance(d, d.ref.parent.parent?.id));
}

export async function saveSeance(cle, seance){
  const id = seance.id || newId();
  const { firebaseId, ...rest } = seance;
  await setDoc(doc(db, "patients", cle, "seances", id), clean({ ...rest, id, cle, updatedAt: Date.now() }));
  return id;
}

export async function saveSeances(cle, seances){
  const ops = seances.map(s => {
    const id = s.id || newId();
    const { firebaseId, ...rest } = s;
    return [doc(db, "patients", cle, "seances", id), { ...rest, id, cle, updatedAt: Date.now() }];
  });
  await batchWrite(ops);
  return ops.length;
}

export async function deleteSeance(cle, id){
  await deleteDoc(doc(db, "patients", cle, "seances", id));
}

export async function deleteProgramme(cle, programmeId){
  const seances = (await listSeances(cle)).filter(s => s.programmeId === programmeId);
  await batchDelete(seances.map(s => doc(db, "patients", cle, "seances", s.id)));
  return seances.length;
}

/**
 * Validation d'une séance par le patient.
 * Renvoie { programmeTermine } pour savoir si tout le programme est fait.
 */
export async function validateSeance(cle, id, { eva = null, ressenti = null, commentaire = null, dureeReelle = null } = {}){
  const patch = { terminee: true, dateValidation: Date.now() };
  if(eva !== null && eva !== undefined && !Number.isNaN(Number(eva))) patch.eva = Math.round(Number(eva));
  if(ressenti) patch.ressenti = String(ressenti).slice(0, 30);
  if(commentaire) patch.commentaire = String(commentaire).slice(0, 1000);
  if(dureeReelle) patch.dureeReelle = Math.round(Number(dureeReelle)) || null;

  await setDoc(doc(db, "patients", cle, "seances", id), patch, { merge: true });

  const seances = await listSeances(cle);
  const seance = seances.find(s => s.id === id);
  if(!seance || !seance.programmeId) return { programmeTermine: false };
  const programme = seances.filter(s => s.programmeId === seance.programmeId);
  return { programmeTermine: programme.every(s => s.terminee === true) };
}

/* ---------- Modèles du cabinet ---------- */

export async function listModeles(){
  const snap = await getDocs(collection(db, "modeles"));
  return snap.docs.map(d => ({ ...withData(d.data()), id: d.id, firebaseId: d.id }))
    .sort((a, b) => (a.nom || "").localeCompare(b.nom || "", "fr", { numeric: true }));
}

export async function saveModele(modele){
  const id = modele.id || newId();
  const { firebaseId, ...rest } = modele;
  await setDoc(doc(db, "modeles", id), clean({ ...rest, id, updatedAt: Date.now() }));
  return id;
}

export async function deleteModele(id){
  await deleteDoc(doc(db, "modeles", id));
}

/* ---------- Écritures groupées ---------- */

async function batchWrite(ops){
  for(let i = 0; i < ops.length; i += 400){
    const batch = writeBatch(db);
    ops.slice(i, i + 400).forEach(([ref, data]) => batch.set(ref, clean(data)));
    await batch.commit();
  }
}

async function batchDelete(refs){
  for(let i = 0; i < refs.length; i += 400){
    const batch = writeBatch(db);
    refs.slice(i, i + 400).forEach(ref => batch.delete(ref));
    await batch.commit();
  }
}

/* ---------- Migration depuis l'ancienne collection « programmes » ---------- */

export async function listLegacy(){
  const snap = await getDocs(collection(db, "programmes"));
  return snap.docs.map(d => ({ ...withData(d.data()), firebaseId: d.id }));
}

/**
 * Copie l'ancienne collection vers la nouvelle organisation.
 * Sans danger si relancée : un patient déjà migré est réutilisé,
 * les séances gardent le même identifiant.
 */
export async function migrateLegacy(onProgress = () => {}){
  const legacy = (await listLegacy()).filter(p => p.data && Array.isArray(p.data.exercices));
  const patients = await listPatients();
  const byLegacy = new Map(patients.filter(p => p.legacyId).map(p => [p.legacyId, p]));

  const groupes = new Map();
  legacy.forEach(p => {
    const pid = String(p.patientId || p.data?.patientId || "").trim().toLowerCase();
    if(!pid) return;
    if(!groupes.has(pid)) groupes.set(pid, []);
    groupes.get(pid).push(p);
  });

  const rapport = { patients: 0, seances: 0, modeles: 0, ignores: legacy.length };
  let n = 0;
  for(const [pid, docs] of groupes){
    n++;
    onProgress(`${n}/${groupes.size} : ${pid}`);
    if(pid === "admin"){
      for(const m of docs){
        const { firebaseId, ...rest } = m;
        await saveModele({ ...rest, id: firebaseId, patientId: "admin" });
        rapport.modeles++;
      }
      continue;
    }
    let patient = byLegacy.get(pid);
    if(!patient){
      patient = await createPatient({ nom: nomDepuisSlug(pid), legacyId: pid });
      byLegacy.set(pid, patient);
      rapport.patients++;
    }
    await saveSeances(patient.cle, docs.map(({ firebaseId, ...rest }) => ({ ...rest, id: firebaseId, patientId: patient.patientId })));
    rapport.seances += docs.length;
  }
  rapport.ignores = legacy.length - rapport.seances - rapport.modeles;
  return rapport;
}
