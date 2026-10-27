// Publie firestore.rules dans le projet Firebase désigné par la clé de compte de service.
import { readFileSync } from "node:fs";
import admin from "firebase-admin";

/* Les messages « ::error:: » s'affichent dans le résumé de l'action GitHub. */
const fail = msg => { console.log(`::error::${String(msg).replace(/\r?\n/g, " ")}`); process.exit(1); };

const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
if(!raw){
  fail("Secret FIREBASE_SERVICE_ACCOUNT absent ou vide : voir MISE-EN-SERVICE.md.");
}
let cred;
try{ cred = JSON.parse(raw); }
catch(e){ fail(`Le secret FIREBASE_SERVICE_ACCOUNT n'est pas un JSON valide (collez tout le contenu du fichier). Début reçu : « ${raw.trim().slice(0, 1)} », longueur ${raw.length}.`); }
if(!cred.private_key || !cred.client_email) fail("Le secret ne ressemble pas à une clé de compte de service (private_key ou client_email manquant).");

admin.initializeApp({ credential: admin.credential.cert(cred), projectId: cred.project_id });
const source = readFileSync("firestore.rules", "utf8");
try{
  const ruleset = await admin.securityRules().releaseFirestoreRulesetFromSource(source);
  console.log(`::notice::Règles publiées dans le projet « ${cred.project_id} ».`);
  console.log(`Règles publiées dans le projet « ${cred.project_id} » (${ruleset.name}).`);
}catch(e){
  fail(`Publication refusée (${cred.client_email}) : ${e.code || ""} ${e.message || e}`);
}
