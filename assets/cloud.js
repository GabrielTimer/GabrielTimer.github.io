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
  getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged, sendPasswordResetEmail,
  createUserWithEmailAndPassword, sendEmailVerification
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import { FIREBASE_CONFIG, ADMIN_EMAILS, KINE } from "./config.js";
import { updateSessionExercise } from "./library.js";
import { compareNoms } from "./noms.js";

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

/** Titulaire du cabinet (adresse inscrite dans config.js et dans les règles). */
export function isOwnerUser(user){
  return !!(user && user.email && ADMIN_EMAILS.map(e => e.toLowerCase()).includes(user.email.toLowerCase()));
}
/* Synchrone : le titulaire, ou un compte autorisé déjà vérifié pendant cette visite */
const autorises = new Set();
let MON_ACCES = null;   // document acces/comptes lu à la connexion (comptes autorisés)

/* ---------- Chaque kiné ses patients ----------
   patients/{cle}.kine = e-mail du kiné du patient (absent = le titulaire).
   Le titulaire peut ouvrir ses patients à un compte (« délégué ») : il les voit
   et les suit, sans la messagerie ni les notes de séance. */
export const OWNER = String(ADMIN_EMAILS[0] || "").toLowerCase();
export const moi = () => String(auth.currentUser?.email || "").toLowerCase();
export const estTitulaire = () => isOwnerUser(auth.currentUser);
export const estDelegue = () => !estTitulaire() && (MON_ACCES?.delegues || []).includes(moi());
export const kineDe = p => String(p?.kine || OWNER).toLowerCase();
/** Patient dont je suis le kiné (messagerie, notes privées, suppression). */
export const estSien = p => kineDe(p) === moi();
/** Nom du compte connecté (accueil) : le titulaire, ou le nom donné dans Comptes autorisés. */
export const monNom = () => estTitulaire() ? "" : ((MON_ACCES?.comptes || []).find(c => c.email === moi())?.nom || moi());
export const OWNER_NOM = String(KINE.nom || "").split(/\s+/)[0] || "le titulaire";
export function isKineUser(user){
  return isOwnerUser(user) || !!(user?.email && autorises.has(user.email.toLowerCase()));
}
/** Titulaire, ou compte présent dans acces/comptes (remplaçant, associé). */
async function verifierKine(user){
  if(!user?.email) return false;
  if(isOwnerUser(user)) return true;
  if(autorises.has(user.email.toLowerCase()) && MON_ACCES) return true;
  if(!user.emailVerified) return false;   // les règles exigent une adresse vérifiée
  try{
    const snap = await getDoc(doc(db, "acces", "comptes"));   // refusé par les règles si le compte n'est pas autorisé
    const ok = (snap.data()?.emails || []).includes(user.email.toLowerCase());
    if(ok){ autorises.add(user.email.toLowerCase()); MON_ACCES = snap.data(); }
    return ok;
  }catch(e){ return false; }
}

/** Renvoie l'utilisateur kiné connecté, ou null. */
export async function currentKine(){
  const user = auth.currentUser || await authReady;
  return await verifierKine(user) ? user : null;
}

/* ---------- Migration : chaque patient existant appartient au titulaire ----------
   Une seule fois, au premier passage du titulaire : ajoute kine = titulaire aux
   patients, fiches et bilans qui n'ont pas encore ce champ. */
export async function migrerKine(){
  if(!estTitulaire()) return 0;
  try{ if(localStorage.getItem("gt_migration_kine") === "2") return 0; }catch(e){}
  let n = 0;
  for(const name of ["patients", "fiches", "bilans"]){
    const snap = await getDocs(collection(db, name));
    const a = snap.docs.filter(d => !d.data().kine);
    for(let i = 0; i < a.length; i += 400){
      const b = writeBatch(db);
      a.slice(i, i + 400).forEach(d => b.set(d.ref, { kine: OWNER }, { merge: true }));
      await b.commit(); n += Math.min(400, a.length - i);
    }
  }
  try{ localStorage.setItem("gt_migration_kine", "2"); }catch(e){}
  return n;
}

/* ---------- Comptes autorisés (titulaire seulement) ---------- */

export async function getComptes(){
  const snap = await getDoc(doc(db, "acces", "comptes"));
  return snap.exists() ? (snap.data().comptes || []) : [];
}
async function setComptes(comptes){
  await setDoc(doc(db, "acces", "comptes"), clean({
    comptes, emails: comptes.map(c => c.email),
    delegues: comptes.filter(c => c.voitMesPatients).map(c => c.email),   // voient les patients du titulaire
    updatedAt: Date.now()
  }), { merge: true });
}
/** Ouvre (ou ferme) les patients du titulaire à un compte autorisé. */
export async function setVoitMesPatients(email, oui){
  const comptes = await getComptes();
  const c = comptes.find(x => x.email === String(email).toLowerCase()); if(!c) return;
  c.voitMesPatients = !!oui;
  if(oui) c.aVuMesPatients = true;   // gardé ensuite : il connaît les dossiers de vos patients
  await setComptes(comptes);
}
/**
 * Donne l'accès à un compte : crée le compte de connexion s'il n'existe pas
 * (sans déconnecter le titulaire), puis envoie un e-mail pour choisir le mot de passe.
 */
export async function ajouterCompte({ email, nom = "" }){
  email = String(email || "").trim().toLowerCase();
  if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new Error("Adresse e-mail invalide.");
  const comptes = await getComptes();
  if(!comptes.some(c => c.email === email)) comptes.push({ email, nom: String(nom || "").trim(), depuis: Date.now() });
  await setComptes(comptes);
  /* Compte de connexion créé dans une instance à part, pour ne pas changer l'utilisateur connecté */
  const second = getAuth(initializeApp(FIREBASE_CONFIG, "creation-" + Date.now()));
  let cree = false;
  try{
    const mdp = Array.from(crypto.getRandomValues(new Uint8Array(18)), b => b.toString(36)).join("") + "A1!";
    await createUserWithEmailAndPassword(second, email, mdp);
    cree = true;
  }catch(e){
    if(e?.code !== "auth/email-already-in-use") console.warn("Création du compte :", e?.code || e);
  }finally{ try{ await signOut(second); }catch(e){} }
  await sendPasswordResetEmail(auth, email);
  return { cree };
}
export async function retirerCompte(email){
  const comptes = (await getComptes()).filter(c => c.email !== String(email).toLowerCase());
  await setComptes(comptes);
}

export async function loginKine(email, password){
  const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
  /* Compte autorisé (remplaçant…) dont l'adresse n'est pas encore vérifiée : on envoie le lien */
  if(!isOwnerUser(cred.user) && !cred.user.emailVerified){
    try{ await sendEmailVerification(cred.user); }catch(e){}
    await signOut(auth);
    const err = new Error("Première connexion : un e-mail de vérification vient de vous être envoyé. Cliquez sur le lien qu'il contient, puis reconnectez-vous.");
    err.code = "app/verify-email";
    throw err;
  }
  if(!await verifierKine(cred.user)){
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

/**
 * Mes patients. Titulaire : les siens (pas ceux des autres kinés).
 * Autre compte : les siens, plus ceux du titulaire s'il les lui a ouverts (duTitulaire: true).
 */
let patientsCache = null;
export async function listPatients(){
  const run = async () => {
    let pDocs, fDocs;
    if(estTitulaire()){
      const [snap, fiches] = await Promise.all([getDocs(collection(db, "patients")), getDocs(collection(db, "fiches")).catch(() => ({ docs: [] }))]);
      pDocs = snap.docs; fDocs = fiches.docs;
    }else{
      const kines = [moi(), ...(estDelegue() ? [OWNER] : [])];
      const res = await Promise.all(kines.flatMap(k => [
        getDocs(query(collection(db, "patients"), where("kine", "==", k))),
        getDocs(query(collection(db, "fiches"), where("kine", "==", k))).catch(() => ({ docs: [] }))
      ]));
      pDocs = res.filter((_, i) => i % 2 === 0).flatMap(r => r.docs);
      fDocs = res.filter((_, i) => i % 2 === 1).flatMap(r => r.docs);
    }
    const byCle = new Map(fDocs.map(d => [d.id, d.data()]));
    return pDocs.map(d => ({ cle: d.id, ...d.data(), ...(byCle.get(d.id) || {}) }))
      .filter(p => estTitulaire() ? estSien(p) : true)
      .map(p => ({ ...p, duTitulaire: !estTitulaire() && kineDe(p) === OWNER }))
      .sort(compareNoms);
  };
  /* Plusieurs appels à la suite (tableau de bord) : une seule lecture */
  if(!patientsCache || Date.now() - patientsCache.t > 5000) patientsCache = { t: Date.now(), p: run() };
  try{ return await patientsCache.p; }catch(e){ patientsCache = null; throw e; }
}
const mesCles = async ({ messagerie = false } = {}) =>
  new Set((await listPatients()).filter(p => !messagerie || estSien(p)).map(p => p.cle));
/* Lecture patient par patient (comptes autres que le titulaire : pas de vue d'ensemble) */
async function parPatient(fn){
  const ps = await listPatients();
  const out = [];
  for(let i = 0; i < ps.length; i += 8){
    const part = await Promise.all(ps.slice(i, i + 8).map(p => fn(p).catch(() => [])));
    part.forEach(x => out.push(...x));
  }
  return out;
}

/* ---------- Code d'accès du patient et messagerie ----------
   Depuis la version 2.29, le code donné au patient (lien, QR code, carte) est
   différent de l'identifiant du dossier (cle) :
     codes/{code}              → { cle, kine } : le patient retrouve son dossier
     codes/{code}/messages/{id} → la messagerie avec son kiné
   Un compte autorisé qui suit vos patients connaît leur cle, jamais leur code :
   il ne peut donc pas lire vos messages, même en contournant l'application.
   Patients plus anciens (sans document codes, champ codeV2 absent) : code = cle,
   messages dans patients/{cle}/messages, jusqu'au prochain « Nouveau code d'accès ». */
const codesCache = new Map();   // cle → code
const CODE_LOCAL = "gt_code";   // appareil du patient : { code, cle }
function codeLocal(cle){
  try{ const v = JSON.parse(localStorage.getItem(CODE_LOCAL) || "null"); return v && v.cle === cle && v.code ? v.code : null; }catch(e){ return null; }
}

/**
 * Côté patient : code reçu (lien) ou tapé → identifiant du dossier, ou null s'il n'existe pas.
 * Mémorise le code sur l'appareil pour la messagerie.
 */
export async function ouvrirCode(code){
  code = String(code || "").toUpperCase();
  const c = await getDoc(doc(db, "codes", code));
  if(c.exists() && c.data().cle){
    try{ localStorage.setItem(CODE_LOCAL, JSON.stringify({ code, cle: c.data().cle })); }catch(e){}
    return c.data().cle;
  }
  const p = await getDoc(doc(db, "patients", code));
  return p.exists() ? code : null;
}

/** Code d'accès à donner au patient (lien, QR, carte). Ancien patient : sa cle. */
export async function codeAcces(cle, patient = null){
  if(!cle) return null;
  if(codesCache.has(cle)) return codesCache.get(cle);
  const local = codeLocal(cle);
  if(local) return local;
  const p = patient || (await getDoc(doc(db, "patients", cle))).data() || {};
  if(!p.codeV2){ codesCache.set(cle, cle); return cle; }
  const snap = await getDocs(query(collection(db, "codes"), where("cle", "==", cle), where("kine", "==", kineDe(p))));
  const code = snap.docs[0]?.id;
  if(!code) throw new Error("Code d'accès introuvable.");
  codesCache.set(cle, code);
  return code;
}

/** Les patients qui ont encore un ancien lien (messagerie non protégée des autres comptes). */
export const ancienLien = p => !p?.codeV2;

/** Où sont rangés les messages de ce patient. */
async function boite(cle){
  const code = await codeAcces(cle);
  return code && code !== cle ? collection(db, "codes", code, "messages") : collection(db, "patients", cle, "messages");
}

export async function createPatient({ nom, telephone = "", email = "", note = "", legacyId = "", genre = "" }){
  const cle = newAccessCode();
  const code = newAccessCode();
  const now = Date.now();
  const pub = { nom: String(nom).trim(), patientId: slugPatient(nom), kine: moi() || OWNER, codeV2: true, createdAt: now, updatedAt: now };
  if(genre === "h" || genre === "f"){ pub.genre = genre; pub.genreMaj = now; }
  const priv = { telephone, email, note, legacyId: legacyId || null, kine: pub.kine, updatedAt: now };
  patientsCache = null;
  await setDoc(doc(db, "patients", cle), clean(pub));
  await setDoc(doc(db, "fiches", cle), clean(priv));
  try{
    await setDoc(doc(db, "codes", code), { cle, kine: pub.kine, createdAt: now });
  }catch(e){
    /* Règles Firebase pas encore à jour : patient créé à l'ancienne (code = identifiant) */
    console.warn("Code d'accès séparé impossible :", e?.code || e);
    await setDoc(doc(db, "patients", cle), { codeV2: false }, { merge: true });
    codesCache.set(cle, cle);
    return { cle, code: cle, ...pub, codeV2: false, ...priv };
  }
  codesCache.set(cle, code);
  return { cle, code, ...pub, ...priv };
}

export async function updatePatient(cle, patch){
  const { pub, priv } = split(patch);
  const now = Date.now();
  if(Object.keys(pub).length) await setDoc(doc(db, "patients", cle), clean({ ...pub, updatedAt: now }), { merge: true });
  if(Object.keys(priv).length) await setDoc(doc(db, "fiches", cle), clean({ ...priv, updatedAt: now }), { merge: true });
}

/* Sous-collections rattachées au code : suivis et messages (patients/), notes (fiches/) */
const SUBS = [["patients", "suivis"], ["patients", "messages"], ["fiches", "notes"]];
async function subDocs(root, cle, name){
  const snap = await getDocs(collection(db, root, cle, name)).catch(() => ({ docs: [] }));
  return snap.docs;
}

export async function deletePatient(cle){
  const patient = (await getDoc(doc(db, "patients", cle))).data() || {};
  const code = await codeAcces(cle, patient).catch(() => cle);
  const erreurs = [];
  const efface = p => p.catch(e => { erreurs.push(e); });
  if(code !== cle){
    const msgs = await getDocs(collection(db, "codes", code, "messages")).catch(() => ({ docs: [] }));
    await efface(batchDelete(msgs.docs.map(d => d.ref)));
  }
  for(const [root, name] of [...SUBS, ["patients", "rappels"]]){
    const docs = await subDocs(root, cle, name);
    await efface(batchDelete(docs.map(d => d.ref)));
  }
  const seances = await listSeances(cle);
  await batchDelete(seances.map(s => doc(db, "patients", cle, "seances", s.id)));
  const bilans = await bilanDocs(cle);
  await efface(batchDelete(bilans.map(d => d.ref)));
  if(code !== cle) await efface(deleteDoc(doc(db, "codes", code)));
  await efface(deleteDoc(doc(db, "fiches", cle)));
  await deleteDoc(doc(db, "patients", cle));
  codesCache.delete(cle);
  patientsCache = null;
  if(erreurs.length) console.warn("Suppression du patient : éléments non effacés", erreurs);
  return { incomplet: erreurs.length > 0 };
}

/**
 * Change le code d'accès d'un patient : l'ancien lien cesse de fonctionner, et l'identifiant
 * du dossier change aussi (un compte qui le connaissait n'y a plus accès).
 * Ancien patient : sa messagerie passe sous le nouveau code (protégée des autres comptes).
 * Tout est d'abord copié ; l'ancien dossier n'est effacé que si la copie a réussi.
 */
export async function renewAccessCode(cle){
  const patient = await getPatient(cle, { fiche: true });
  if(!patient) throw new Error("Patient introuvable");
  const ancienCode = await codeAcces(cle, patient);
  const seances = await listSeances(cle);
  const nouveau = newAccessCode();
  const nouveauCode = newAccessCode();
  const { cle: _old, code: _code, duTitulaire: _dt, ...data } = patient;
  const { pub, priv } = split(data);
  const kine = kineDe(patient);
  const anciensMsg = await getDocs(await boite(cle)).catch(() => ({ docs: [] }));
  const copies = [];   // ce qui a été écrit, pour annuler si la copie échoue
  try{
    await setDoc(doc(db, "patients", nouveau), clean({ ...pub, codeV2: true, nouveauLien: Date.now(), updatedAt: Date.now() }));
    copies.push(doc(db, "patients", nouveau));
    await setDoc(doc(db, "fiches", nouveau), clean({ ...priv, kine, updatedAt: Date.now() }));
    copies.push(doc(db, "fiches", nouveau));
    await setDoc(doc(db, "codes", nouveauCode), { cle: nouveau, kine, createdAt: Date.now() });
    copies.push(doc(db, "codes", nouveauCode));
    const seancesW = seances.map(s => {
      const { id, cle: _c, firebaseId, ...rest } = s;
      return [doc(db, "patients", nouveau, "seances", id), { ...rest, cle: nouveau }];
    });
    await batchWrite(seancesW); copies.push(...seancesW.map(w => w[0]));
    const msgW = anciensMsg.docs.map(d => [doc(db, "codes", nouveauCode, "messages", d.id), d.data()]);
    await batchWrite(msgW); copies.push(...msgW.map(w => w[0]));
    for(const [root, name] of [["patients", "suivis"], ["fiches", "notes"], ["patients", "rappels"]]){
      const docs = await subDocs(root, cle, name);
      const w = docs.map(d => [doc(db, root, nouveau, name, d.id), d.data()]);
      await batchWrite(w); copies.push(...w.map(x => x[0]));
    }
  }catch(e){
    /* Copie incomplète : on efface la copie, l'ancien dossier reste intact */
    await batchDelete([...copies].reverse()).catch(() => {});
    throw new Error("Le changement de code n'a pas pu se faire (connexion ?). Le dossier et l'ancien lien sont inchangés.");
  }
  /* Bilans : rattachés au nouveau dossier */
  const bilans = await bilanDocs(cle);
  await batchWrite(bilans.map(d => [d.ref, { ...d.data(), cle: nouveau }])).catch(() => {});
  /* Effacement de l'ancien dossier et de l'ancien code */
  await batchDelete(anciensMsg.docs.map(d => d.ref)).catch(() => {});
  for(const [root, name] of [["patients", "suivis"], ["fiches", "notes"], ["patients", "rappels"], ["patients", "messages"]]){
    const docs = await subDocs(root, cle, name);
    await batchDelete(docs.map(d => d.ref)).catch(() => {});
  }
  await batchDelete(seances.map(s => doc(db, "patients", cle, "seances", s.id)));
  if(ancienCode && ancienCode !== cle) await deleteDoc(doc(db, "codes", ancienCode)).catch(() => {});
  await deleteDoc(doc(db, "fiches", cle)).catch(() => {});
  await deleteDoc(doc(db, "patients", cle));
  codesCache.delete(cle);
  codesCache.set(nouveau, nouveauCode);
  patientsCache = null;
  return nouveau;
}

/** Nouveau code pour plusieurs patients (par exemple quand un remplaçant s'en va). */
export async function renouvelerCodes(cles, onProgress = () => {}){
  const faits = [], erreurs = [];
  for(let i = 0; i < cles.length; i++){
    onProgress(i, cles.length);
    try{ faits.push(await renewAccessCode(cles[i])); }catch(e){ erreurs.push(cles[i]); }
  }
  onProgress(cles.length, cles.length);
  return { faits, erreurs };
}

/** Le kiné a ouvert la fenêtre d'accès après un changement de code : rappel effacé. */
export async function lienEnvoye(cle){
  await setDoc(doc(db, "patients", cle), { nouveauLien: null }, { merge: true });
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
  if(!estTitulaire()) return parPatient(p => listSeances(p.cle));
  const [snap, cles] = await Promise.all([getDocs(collectionGroup(db, "seances")), mesCles()]);
  return snap.docs.map(d => mapSeance(d, d.ref.parent.parent?.id)).filter(s => cles.has(s.cle));
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

/* ---------- Corbeille des programmes (kiné uniquement) ----------
   corbeille/{idSéance} : la séance telle quelle + corbeilleProgramme, corbeilleNom, deletedAt, raison.
   Gardée 30 jours puis effacée par la tâche automatique de nettoyage. */
export async function mettreEnCorbeille(cle, programmeId, { raison = "kine" } = {}){
  const seances = (await listSeances(cle)).filter(s => s.programmeId === programmeId);
  if(!seances.length) return 0;
  const deletedAt = Date.now();
  await batchWrite(seances.map(s => {
    const { firebaseId, ...rest } = s;
    return [doc(db, "corbeille", s.id), { ...rest, cle, corbeilleProgramme: programmeId, corbeilleNom: s.programmeNom || s.data?.nom || "Programme", deletedAt, raison }];
  }));
  await batchDelete(seances.map(s => doc(db, "patients", cle, "seances", s.id)));
  return seances.length;
}
export async function listCorbeille(){
  if(!estTitulaire()) return [];
  const snap = await getDocs(collection(db, "corbeille"));
  return snap.docs.map(d => ({ ...d.data(), id: d.id }));
}
export async function restaurerCorbeille(items){
  await batchWrite(items.map(({ corbeilleProgramme, corbeilleNom, deletedAt, raison, ...s }) => [doc(db, "patients", s.cle, "seances", s.id), { ...s, updatedAt: Date.now() }]));
  await batchDelete(items.map(s => doc(db, "corbeille", s.id)));
}
export async function viderCorbeille(items){
  await batchDelete(items.map(s => doc(db, "corbeille", s.id)));
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

/* Les requêtes des comptes autres que le titulaire doivent filtrer sur le kiné du patient */
async function kineDuPatient(cle){ return kineDe(await getPatient(cle).catch(() => null)); }
async function bilanQuery(cle){
  return estTitulaire()
    ? query(collection(db, "bilans"), where("cle", "==", cle))
    : query(collection(db, "bilans"), where("cle", "==", cle), where("kine", "==", await kineDuPatient(cle)));
}
async function bilanDocs(cle){
  try{ return (await getDocs(await bilanQuery(cle))).docs; }
  catch(e){ return []; }
}

function mapBilan(d){
  const b = { ...d.data(), id: d.id };
  try{ b.etat = typeof b.etat === "string" ? JSON.parse(b.etat) : (b.etat || null); }catch(e){ b.etat = null; }
  return b;
}

export async function listBilans(cle){
  const snap = await getDocs(await bilanQuery(cle));
  return snap.docs.map(mapBilan)
    .sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")) || (b.createdAt || 0) - (a.createdAt || 0));
}

/** Tous les bilans du cabinet (tableau de bord du kiné). */
export async function listAllBilans(){
  if(!estTitulaire()){
    const kines = [moi(), ...(estDelegue() ? [OWNER] : [])];
    const res = await Promise.all(kines.map(k => getDocs(query(collection(db, "bilans"), where("kine", "==", k)))));
    return res.flatMap(r => r.docs).map(mapBilan);
  }
  const [snap, cles] = await Promise.all([getDocs(collection(db, "bilans")), mesCles()]);
  return snap.docs.map(mapBilan).filter(b => cles.has(b.cle));
}

export async function getBilan(id){
  const snap = await getDoc(doc(db, "bilans", id));
  return snap.exists() ? mapBilan(snap) : null;
}

export async function saveBilan(bilan){
  const id = bilan.id || newId();
  const now = Date.now();
  const { etat, ...rest } = bilan;
  const kine = bilan.kine || (bilan.cle ? await kineDuPatient(bilan.cle) : (moi() || OWNER));
  await setDoc(doc(db, "bilans", id), clean({ ...rest, id, kine, etat: JSON.stringify(etat || {}), createdAt: bilan.createdAt || now, updatedAt: now }));
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
  const [seances, modeles] = await Promise.all([
    estTitulaire() ? getDocs(collectionGroup(db, "seances")) : { docs: [] },
    getDocs(collection(db, "modeles"))
  ]);
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

/* ---------- Photos du cabinet (page publique) ----------
   reglages/photos : { liste:[{ id, legende }] } (ordre d'affichage)
   reglages/photo_<id> : { data } (image compressée, un document par photo : limite de 1 Mo par document) */

export async function getPhotosIndex(){
  const snap = await getDoc(doc(db, "reglages", "photos"));
  return snap.exists() ? (snap.data().liste || []) : [];
}
export async function savePhotosIndex(liste){
  await setDoc(doc(db, "reglages", "photos"), { liste: liste.map(p => ({ id: p.id, legende: String(p.legende || "") })), updatedAt: Date.now() });
}
export async function getPhotosCabinet(){
  const liste = await getPhotosIndex();
  const docs = await Promise.all(liste.map(p => getDoc(doc(db, "reglages", "photo_" + p.id)).catch(() => null)));
  return liste.map((p, i) => ({ ...p, data: docs[i]?.exists() ? docs[i].data().data : "" })).filter(p => p.data);
}
export async function addPhotoCabinet(data, legende = ""){
  const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  await setDoc(doc(db, "reglages", "photo_" + id), { data, createdAt: Date.now() });
  const liste = await getPhotosIndex();
  liste.push({ id, legende });
  await savePhotosIndex(liste);
  return id;
}
export async function deletePhotoCabinet(id){
  const liste = (await getPhotosIndex()).filter(p => p.id !== id);
  await savePhotosIndex(liste);
  await deleteDoc(doc(db, "reglages", "photo_" + id)).catch(() => {});
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
  if(!estTitulaire()) return parPatient(p => listSuivis(p.cle));
  const [snap, cles] = await Promise.all([getDocs(collectionGroup(db, "suivis")), mesCles()]);
  return snap.docs.map(d => ({ ...d.data(), id: d.id, cle: d.ref.parent.parent?.id })).filter(x => cles.has(x.cle));
}

export async function addSuivi(cle, suivi){
  const id = newId();
  await setDoc(doc(db, "patients", cle, "suivis", id), clean({ ...suivi, date: Date.now() }));
  return id;
}

export async function deleteSuivi(cle, id){
  await deleteDoc(doc(db, "patients", cle, "suivis", id));
}

/* ---------- Messages du patient (copie dans ApiKiné) ----------
   codes/{code}/messages/{id} (ancien patient : patients/{cle}/messages/{id}) :
   { type:"message"|"bilan", sujet, texte, date, lu } — voir « Code d'accès » plus haut. */

export async function addMessage(cle, { type = "message", sujet = "", texte = "", de = null }){
  const id = newId();
  /* de: "kine" → message du kiné au patient (lu = lu par le patient) ; sinon message du patient */
  await setDoc(doc(await boite(cle), id), clean({ type, sujet: String(sujet).slice(0, 200), texte: String(texte).slice(0, 5000), date: Date.now(), lu: false, ...(de === "kine" ? { de:"kine" } : {}) }));
  return id;
}

export async function listMessages(cle){
  const snap = await getDocs(await boite(cle));
  return snap.docs.map(d => ({ ...d.data(), id: d.id, cle })).sort((a, b) => (b.date || 0) - (a.date || 0));
}

/** Codes d'accès (titulaire) : code → cle, pour retrouver le patient d'un message. */
async function tousLesCodes(){
  const snap = await getDocs(collection(db, "codes")).catch(() => ({ docs: [] }));
  const parCode = new Map();
  snap.docs.forEach(d => { const c = d.data(); if(c.cle){ parCode.set(d.id, c.cle); } });
  return parCode;
}
/** Patient d'un message lu « en vrac » (vue d'ensemble) */
function cleDuMessage(d, parCode){
  const parent = d.ref.parent.parent;
  if(!parent) return null;
  return parent.parent.id === "codes" ? (parCode.get(parent.id) || null) : parent.id;
}

/** Ma messagerie : les messages de MES patients seulement (jamais ceux d'un autre kiné). */
export async function listAllMessages(){
  if(!estTitulaire()){
    const ps = (await listPatients()).filter(estSien);
    const all = (await Promise.all(ps.map(p => listMessages(p.cle).catch(() => [])))).flat();
    return all.sort((a, b) => (b.date || 0) - (a.date || 0));
  }
  const [snap, cles, parCode] = await Promise.all([getDocs(collectionGroup(db, "messages")), mesCles({ messagerie:true }), tousLesCodes()]);
  return snap.docs.map(d => ({ ...d.data(), id: d.id, cle: cleDuMessage(d, parCode) })).filter(m => cles.has(m.cle)).sort((a, b) => (b.date || 0) - (a.date || 0));
}

export async function setMessageLu(cle, id, lu = true){
  await setDoc(doc(await boite(cle), id), { lu }, { merge: true });
}

export async function deleteMessage(cle, id){
  await deleteDoc(doc(await boite(cle), id));
}

/** Commentaire laissé en fin de séance : marqué comme lu par le kiné. */
export async function setCommentaireLu(cle, seanceId, lu = true){
  await setDoc(doc(db, "patients", cle, "seances", seanceId), { commentaireLu: lu }, { merge: true });
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
  await grab("codes").catch(() => { out.collections.codes = []; });   // codes d'accès des patients (messagerie)
  await grab("bilans").catch(() => { out.collections.bilans = []; });
  await grab("questionnaires").catch(() => { out.collections.questionnaires = []; });
  await grab("conseils").catch(() => { out.collections.conseils = []; });
  onProgress("suivis");
  const suivis = await getDocs(collectionGroup(db, "suivis")).catch(() => ({ docs: [] }));
  out.collections.suivis = suivis.docs.map(d => ({ id: d.id, cle: d.ref.parent.parent?.id, data: d.data() }));
  onProgress("messages");
  const [messages, parCode] = await Promise.all([getDocs(collectionGroup(db, "messages")).catch(() => ({ docs: [] })), tousLesCodes()]);
  out.collections.messages = messages.docs.map(d => {
    const code = d.ref.parent.parent?.parent.id === "codes" ? d.ref.parent.parent.id : null;
    return { id: d.id, cle: cleDuMessage(d, parCode), ...(code ? { code } : {}), data: d.data() };
  });
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
  ["patients", "fiches", "codes", "modeles", "exercices", "reglages", "bilans", "questionnaires", "conseils"].forEach(name => {
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
  if(want("messages")){
    (backup.collections.messages || []).forEach(d => {
      if(!d.cle && !d.code) return;
      ops.push([d.code ? doc(db, "codes", d.code, "messages", d.id) : doc(db, "patients", d.cle, "messages", d.id), d.data]);
      count.messages = (count.messages || 0) + 1;
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
