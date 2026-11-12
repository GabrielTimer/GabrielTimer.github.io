// Sauvegarde automatique chiffrée, chaque semaine (voir .github/workflows/sauvegarde.yml).
// - Lit toutes les données du cabinet dans Firebase, au même format que « Tout sauvegarder »
//   (Réglages du cabinet → Sauvegarde), pour pouvoir la restaurer depuis l'application.
// - La compresse puis la chiffre (AES-256-GCM, clé tirée du mot de passe SAUVEGARDE_MOT_DE_PASSE).
// - Vérifie qu'elle se déchiffre, puis l'écrit dans le dossier donné en argument.
// Confidentialité : le dépôt est public, donc ses journaux aussi : on n'y écrit que des nombres.
import admin from "firebase-admin";
import { gzipSync, gunzipSync } from "node:zlib";
import { randomBytes, pbkdf2Sync, createCipheriv, createDecipheriv } from "node:crypto";
import { writeFileSync, mkdirSync } from "node:fs";

const fail = m => { console.log(`::error::${m}`); process.exit(1); };
const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
if(!raw) fail("Secret FIREBASE_SERVICE_ACCOUNT absent.");
const motDePasse = process.env.SAUVEGARDE_MOT_DE_PASSE || "";
if(motDePasse.length < 12) fail("Secret SAUVEGARDE_MOT_DE_PASSE absent ou trop court (12 caractères au moins) : voir MISE-EN-SERVICE.md.");
const dossier = process.argv[2] || "sortie";

const cred = JSON.parse(raw);
admin.initializeApp({ credential: admin.credential.cert(cred), projectId: cred.project_id });
const db = admin.firestore();

/* ---------- Lecture : même format que exportAll() dans assets/cloud.js ---------- */
const out = { format: "gabrieltimer-sauvegarde", version: 1, date: new Date().toISOString(), automatique: true, collections: {} };
const docs = async name => (await db.collection(name).get()).docs.map(d => ({ id: d.id, data: d.data() }));
for(const name of ["patients", "fiches", "codes", "modeles", "exercices", "reglages", "bilans", "questionnaires", "conseils"]){
  out.collections[name] = await docs(name);
}
const parCode = new Map(out.collections.codes.map(c => [c.id, c.data.cle]));
const groupe = async name => (await db.collectionGroup(name).get()).docs.map(d => {
  const parent = d.ref.parent.parent;
  const sousCode = parent?.parent.id === "codes";
  return { id: d.id, cle: sousCode ? (parCode.get(parent.id) || null) : parent?.id, ...(sousCode ? { code: parent.id } : {}), data: d.data() };
});
for(const name of ["suivis", "messages", "notes", "seances"]) out.collections[name] = await groupe(name);

/* ---------- Chiffrement ---------- */
const ITERATIONS = 600000;
const clair = gzipSync(Buffer.from(JSON.stringify(out), "utf8"));
const salt = randomBytes(16), iv = randomBytes(12);
const cle = pbkdf2Sync(motDePasse, salt, ITERATIONS, 32, "sha256");
const c = createCipheriv("aes-256-gcm", cle, iv);
const chiffre = Buffer.concat([c.update(clair), c.final(), c.getAuthTag()]);   // étiquette à la fin, comme WebCrypto
const enveloppe = {
  format: "apikine-sauvegarde-chiffree", version: 1, date: out.date,
  kdf: { name: "PBKDF2", hash: "SHA-256", iterations: ITERATIONS },
  salt: salt.toString("base64"), iv: iv.toString("base64"), data: chiffre.toString("base64")
};

/* ---------- Vérification : elle se déchiffre et redonne les mêmes données ---------- */
{
  const d = createDecipheriv("aes-256-gcm", cle, iv);
  d.setAuthTag(chiffre.subarray(chiffre.length - 16));
  const relu = JSON.parse(gunzipSync(Buffer.concat([d.update(chiffre.subarray(0, chiffre.length - 16)), d.final()])).toString("utf8"));
  if(relu.collections.patients.length !== out.collections.patients.length) fail("Vérification de la sauvegarde impossible.");
}

mkdirSync(dossier, { recursive: true });
const nom = `sauvegarde-kine-${out.date.slice(0, 10)}.apikine`;
writeFileSync(`${dossier}/${nom}`, JSON.stringify(enveloppe));
const n = k => out.collections[k].length;
console.log(`::notice::Sauvegarde chiffrée : ${n("patients")} patients, ${n("seances")} séances, ${n("bilans")} bilans, ${n("messages")} messages, ${n("modeles")} modèles (${(chiffre.length / 1048576).toFixed(1)} Mo).`);
