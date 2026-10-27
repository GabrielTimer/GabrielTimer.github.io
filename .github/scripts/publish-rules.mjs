// Publie firestore.rules dans le projet Firebase désigné par la clé de compte de service.
import { readFileSync } from "node:fs";
import admin from "firebase-admin";

const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
if(!raw){
  console.error("Secret FIREBASE_SERVICE_ACCOUNT absent : voir MISE-EN-SERVICE.md.");
  process.exit(1);
}
let cred;
try{ cred = JSON.parse(raw); }
catch(e){ console.error("Le secret FIREBASE_SERVICE_ACCOUNT n'est pas un JSON valide (collez tout le contenu du fichier)."); process.exit(1); }

admin.initializeApp({ credential: admin.credential.cert(cred), projectId: cred.project_id });
const source = readFileSync("firestore.rules", "utf8");
try{
  const ruleset = await admin.securityRules().releaseFirestoreRulesetFromSource(source);
  console.log(`Règles publiées dans le projet « ${cred.project_id} » (${ruleset.name}).`);
}catch(e){
  console.error("Publication refusée :", e.message || e);
  process.exit(1);
}
