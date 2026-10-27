/* =========================================================
   Accès aux données (Firebase)
   ---------------------------------------------------------
   Organisation dans Firestore :
     patients/{code}                 → nom du patient (lisible par lui seul)
     fiches/{code}                   → coordonnées et note privée (kiné uniquement)
     patients/{code}/seances/{id}    → séances prescrites à ce patient
     modeles/{id}                    → programmes modèles du cabinet
     programmes/{id}                 → ancienne collection (avant migration)
     exercices/{SOURCE_id}           → corrections du kiné sur la bibliothèque
     bilans/{id}                     → bilans kiné (champ cle = patient), kiné uniquement
   Le « code » est un identifiant secret de 12 caractères : seul le patient
   qui l'a reçu (lien ou QR code) peut lire son dossier.
   ========================================================= */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  initializeFirestore, persistentLocalCache, persistentMultipleTabManager, getFirestore,
  collection, collectionGroup, doc, getDoc, getDocs, setDoc, deleteDoc, writeBatch, query, where
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import {
  getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged, sendPasswordResetEmail
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import { FIREBASE_CONFIG, ADMIN_EMAILS } from "./config.js";
import { updateSessionExercise } from "./library.js";

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
  const bilans = await bilanDocs(cle);
  await batchDelete(bilans.map(d => d.ref)).catch(() => {});
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
  const bilans = await bilanDocs(cle);
  await batchWrite(bilans.map(d => [d.ref, { ...d.data(), cle: nouveau }])).catch(() => {});
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

/** Nouvelles dates pour des séances non faites : [{ id, datePrevue, datePrevueTexte, joursProgramme }]. */
export async function replanSeances(cle, changes){
  for(let i = 0; i < changes.length; i += 400){
    const batch = writeBatch(db);
    changes.slice(i, i + 400).forEach(({ id, ...patch }) => batch.set(doc(db, "patients", cle, "seances", id), clean({ ...patch, updatedAt: Date.now() }), { merge: true }));
    await batch.commit();
  }
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

/* ---------- Bilans (réservés au kiné) ----------
   bilans/{id} : { id, cle, type, date (AAAA-MM-JJ), etat (JSON du formulaire),
   resume (texte), zones, motif, createdAt, updatedAt }.
   Collection à part : les patients lisent patients/{code}, jamais celle-ci. */

async function bilanDocs(cle){
  try{ return (await getDocs(query(collection(db, "bilans"), where("cle", "==", cle)))).docs; }
  catch(e){ return []; }
}

function mapBilan(d){
  const b = { ...d.data(), id: d.id };
  try{ b.etat = typeof b.etat === "string" ? JSON.parse(b.etat) : (b.etat || null); }catch(e){ b.etat = null; }
  return b;
}

export async function listBilans(cle){
  const snap = await getDocs(query(collection(db, "bilans"), where("cle", "==", cle)));
  return snap.docs.map(mapBilan)
    .sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")) || (b.createdAt || 0) - (a.createdAt || 0));
}

export async function getBilan(id){
  const snap = await getDoc(doc(db, "bilans", id));
  return snap.exists() ? mapBilan(snap) : null;
}

export async function saveBilan(bilan){
  const id = bilan.id || newId();
  const now = Date.now();
  const { etat, ...rest } = bilan;
  await setDoc(doc(db, "bilans", id), clean({ ...rest, id, etat: JSON.stringify(etat || {}), createdAt: bilan.createdAt || now, updatedAt: now }));
  return id;
}

export async function deleteBilan(id){
  await deleteDoc(doc(db, "bilans", id));
}

/* ---------- Modèles du cabinet ---------- */

/* Format actuel : { type:"modele", nom, categorie, zoneLabel, niveau, cover, series, exercices }.
   Les anciens modèles ({ nom, data:{ series, exercices } }) et les anciennes
   « pathologies » restent lisibles : voir normModele() dans modeles.js. */

export async function listModeles(){
  const snap = await getDocs(collection(db, "modeles"));
  return snap.docs.map(d => ({ ...withData(d.data()), id: d.id, firebaseId: d.id }))
    .sort((a, b) => (a.nom || "").localeCompare(b.nom || "", "fr", { numeric: true }));
}

export async function getModele(id){
  const snap = await getDoc(doc(db, "modeles", id));
  return snap.exists() ? { ...withData(snap.data()), id: snap.id } : null;
}

export async function saveModele(modele){
  const id = modele.id || newId();
  const { firebaseId, data, ...rest } = modele;
  const m = { ...rest };
  if(!Array.isArray(m.exercices) && data){ m.exercices = data.exercices || []; m.series = m.series || data.series || 1; }
  await setDoc(doc(db, "modeles", id), clean({ ...m, id, type: "modele", patientId: "admin", createdAt: m.createdAt || Date.now(), updatedAt: Date.now() }));
  return id;
}

export async function deleteModele(id){
  await deleteDoc(doc(db, "modeles", id));
}

/* ---------- Corrections de la bibliothèque d'exercices ---------- */

/** Corrections et exercices créés : [{ key, source, id, cree, fields }]. */
export async function listExerciseEdits(){
  const snap = await getDocs(collection(db, "exercices"));
  return snap.docs.map(d => ({ key: d.id, ...d.data() })).filter(d => d.fields);
}

export async function saveExerciseEdit(key, { source, id, fields }){
  await setDoc(doc(db, "exercices", key), clean({ source, id: String(id), fields, updatedAt: Date.now() }));
}

/** Nouvel exercice (ou mise à jour d'un exercice créé). La clé est PERSO_{id}. */
export async function saveCustomExercise(id, fields){
  await setDoc(doc(db, "exercices", `PERSO_${id}`), clean({ source: "PERSO", id: String(id), cree: true, fields, updatedAt: Date.now() }));
}

export async function deleteExerciseEdit(key){
  await deleteDoc(doc(db, "exercices", key));
}

/**
 * Reporte une correction dans les séances pas encore faites de tous les patients
 * et dans les modèles. Renvoie { seances, modeles } : le nombre de documents mis à jour.
 */
export async function propagateExerciseEdit(before, after){
  const touch = data => {
    if(!data || !Array.isArray(data.exercices)) return null;
    const exercices = data.exercices.map(x => ({ ...x }));
    let changed = false;
    exercices.forEach(x => { if(updateSessionExercise(x, before, after)) changed = true; });
    return changed ? { ...data, exercices } : null;
  };
  const ops = [];
  const [seances, modeles] = await Promise.all([getDocs(collectionGroup(db, "seances")), getDocs(collection(db, "modeles"))]);
  let nS = 0, nM = 0;
  seances.docs.forEach(d => {
    const raw = d.data();
    if(raw.terminee === true) return;
    const key = raw.data ? "data" : (raw["données"] ? "données" : null);
    const next = key && touch(raw[key]);
    if(next){ ops.push([d.ref, { ...raw, [key]: next, updatedAt: Date.now() }]); nS++; }
  });
  modeles.docs.forEach(d => {
    const raw = d.data();
    if(Array.isArray(raw.exercices)){
      const next = touch(raw);
      if(next){ ops.push([d.ref, { ...next, updatedAt: Date.now() }]); nM++; }
      return;
    }
    const key = raw.data ? "data" : (raw["données"] ? "données" : null);
    const next = key && touch(raw[key]);
    if(next){ ops.push([d.ref, { ...raw, [key]: next, updatedAt: Date.now() }]); nM++; }
  });
  await batchWrite(ops);
  return { seances: nS, modeles: nM };
}

/* ---------- Réglages du cabinet (reglages/cabinet, lisibles par tous) ---------- */

export async function getReglages(){
  const snap = await getDoc(doc(db, "reglages", "cabinet"));
  return snap.exists() ? snap.data() : null;
}

export async function saveReglages(data){
  await setDoc(doc(db, "reglages", "cabinet"), clean({ ...data, updatedAt: Date.now() }));
}

/* ---------- Suivi du patient : objectifs, questionnaires ----------
   patients/{code}/suivis/{id} : réponses du patient (il peut en ajouter, pas les modifier)
   { type:"objectifs", notes:{ idObjectif: 0-10 }, date }
   { type:"questionnaire", qid, nom, reponses:[…], score, unite, date } */

export async function listSuivis(cle){
  const snap = await getDocs(collection(db, "patients", cle, "suivis"));
  return snap.docs.map(d => ({ ...d.data(), id: d.id, cle })).sort((a, b) => (a.date || 0) - (b.date || 0));
}

export async function listAllSuivis(){
  const snap = await getDocs(collectionGroup(db, "suivis"));
  return snap.docs.map(d => ({ ...d.data(), id: d.id, cle: d.ref.parent.parent?.id }));
}

export async function addSuivi(cle, suivi){
  const id = newId();
  await setDoc(doc(db, "patients", cle, "suivis", id), clean({ ...suivi, date: Date.now() }));
  return id;
}

export async function deleteSuivi(cle, id){
  await deleteDoc(doc(db, "patients", cle, "suivis", id));
}

/* ---------- Questionnaires (définitions, lisibles par les patients) ---------- */

export async function listQuestionnaires(){
  const snap = await getDocs(collection(db, "questionnaires"));
  return snap.docs.map(d => ({ ...d.data(), id: d.id })).sort((a, b) => (a.nom || "").localeCompare(b.nom || "", "fr"));
}

export async function getQuestionnaire(id){
  const snap = await getDoc(doc(db, "questionnaires", id));
  return snap.exists() ? { ...snap.data(), id: snap.id } : null;
}

export async function saveQuestionnaire(q){
  const id = q.id || newId();
  await setDoc(doc(db, "questionnaires", id), clean({ ...q, id, updatedAt: Date.now() }));
  return id;
}

export async function deleteQuestionnaire(id){
  await deleteDoc(doc(db, "questionnaires", id));
}

/* ---------- Fiches conseils personnelles (lisibles par les patients) ---------- */

export async function listConseils(){
  const snap = await getDocs(collection(db, "conseils"));
  return snap.docs.map(d => ({ ...d.data(), id: d.id }));
}

export async function saveConseil(c){
  const id = c.id || newId();
  await setDoc(doc(db, "conseils", id), clean({ ...c, id, perso: true, updatedAt: Date.now() }));
  return id;
}

export async function deleteConseil(id){
  await deleteDoc(doc(db, "conseils", id));
}

/* ---------- Notes de séance privées (kiné uniquement) ---------- */

export async function listNotes(cle){
  const snap = await getDocs(collection(db, "fiches", cle, "notes"));
  return snap.docs.map(d => ({ ...d.data(), id: d.id })).sort((a, b) => (b.date || 0) - (a.date || 0));
}

export async function saveNote(cle, note){
  const id = note.id || newId();
  await setDoc(doc(db, "fiches", cle, "notes", id), clean({ ...note, id, updatedAt: Date.now(), date: note.date || Date.now() }));
  return id;
}

export async function deleteNote(cle, id){
  await deleteDoc(doc(db, "fiches", cle, "notes", id));
}

/* ---------- Sauvegarde complète et restauration (kiné) ---------- */

/** Toutes les données du cabinet, dans un seul objet à enregistrer en fichier. */
export async function exportAll(onProgress = () => {}){
  const out = { format: "gabrieltimer-sauvegarde", version: 1, date: new Date().toISOString(), collections: {} };
  const grab = async name => {
    onProgress(name);
    const snap = await getDocs(collection(db, name));
    out.collections[name] = snap.docs.map(d => ({ id: d.id, data: d.data() }));
  };
  for(const name of ["patients", "fiches", "modeles", "exercices", "reglages"]) await grab(name);
  await grab("bilans").catch(() => { out.collections.bilans = []; });
  await grab("questionnaires").catch(() => { out.collections.questionnaires = []; });
  await grab("conseils").catch(() => { out.collections.conseils = []; });
  onProgress("suivis");
  const suivis = await getDocs(collectionGroup(db, "suivis")).catch(() => ({ docs: [] }));
  out.collections.suivis = suivis.docs.map(d => ({ id: d.id, cle: d.ref.parent.parent?.id, data: d.data() }));
  onProgress("notes");
  const notes = await getDocs(collectionGroup(db, "notes")).catch(() => ({ docs: [] }));
  out.collections.notes = notes.docs.map(d => ({ id: d.id, cle: d.ref.parent.parent?.id, data: d.data() }));
  onProgress("seances");
  const seances = await getDocs(collectionGroup(db, "seances"));
  out.collections.seances = seances.docs.map(d => ({ id: d.id, cle: d.ref.parent.parent?.id, data: d.data() }));
  return out;
}

/**
 * Restaure une sauvegarde. Les documents de la sauvegarde remplacent ceux qui
 * portent le même identifiant ; rien n'est effacé.
 * only : liste des parties à restaurer (par défaut toutes).
 */
export async function importAll(backup, { only = null, onProgress = () => {} } = {}){
  if(!backup || backup.format !== "gabrieltimer-sauvegarde" || !backup.collections) throw new Error("Ce fichier n'est pas une sauvegarde de l'application.");
  const want = name => !only || only.includes(name);
  const ops = [];
  const count = {};
  ["patients", "fiches", "modeles", "exercices", "reglages", "bilans", "questionnaires", "conseils"].forEach(name => {
    if(!want(name)) return;
    (backup.collections[name] || []).forEach(d => { ops.push([doc(db, name, d.id), d.data]); count[name] = (count[name] || 0) + 1; });
  });
  if(want("seances")){
    (backup.collections.seances || []).forEach(d => {
      if(!d.cle) return;
      ops.push([doc(db, "patients", d.cle, "seances", d.id), d.data]);
      count.seances = (count.seances || 0) + 1;
    });
  }
  if(want("suivis")){
    (backup.collections.suivis || []).forEach(d => {
      if(!d.cle) return;
      ops.push([doc(db, "patients", d.cle, "suivis", d.id), d.data]);
      count.suivis = (count.suivis || 0) + 1;
    });
  }
  if(want("notes")){
    (backup.collections.notes || []).forEach(d => {
      if(!d.cle) return;
      ops.push([doc(db, "fiches", d.cle, "notes", d.id), d.data]);
      count.notes = (count.notes || 0) + 1;
    });
  }
  /* Lots de 300 documents au plus, et environ 4 Mo au plus (les images comptent) */
  let batch = writeBatch(db), n = 0, size = 0, done = 0;
  for(const [ref, data] of ops){
    const c = clean(data);
    const sz = JSON.stringify(c).length;
    if(n && (n >= 300 || size + sz > 4e6)){ await batch.commit(); batch = writeBatch(db); n = 0; size = 0; onProgress(done, ops.length); }
    batch.set(ref, c); n++; size += sz; done++;
  }
  if(n) await batch.commit();
  onProgress(ops.length, ops.length);
  return count;
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
