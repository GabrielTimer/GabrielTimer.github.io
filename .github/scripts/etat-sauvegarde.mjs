// Note la date de la dernière sauvegarde automatique réussie (et l'expiration du jeton GitHub)
// dans reglages/sauvegarde : l'accueil kiné s'en sert pour ne plus demander de sauvegarde à la main,
// et pour prévenir si la sauvegarde automatique s'arrête ou si le jeton va expirer.
// Rien de confidentiel : seulement des dates.
import admin from "firebase-admin";

const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
if(!raw){ console.log("::warning::Secret FIREBASE_SERVICE_ACCOUNT absent."); process.exit(0); }
const cred = JSON.parse(raw);
admin.initializeApp({ credential: admin.credential.cert(cred), projectId: cred.project_id });

const exp = Date.parse(String(process.env.JETON_EXPIRE || "").replace(" UTC", "Z").replace(" ", "T"));
const etat = { auto: Date.now(), jetonExpire: Number.isFinite(exp) ? exp : null };
await admin.firestore().doc("reglages/sauvegarde").set(etat);
if(etat.jetonExpire){
  const jours = Math.floor((etat.jetonExpire - Date.now()) / 86400000);
  console.log(`Jeton SAUVEGARDE_TOKEN : expire dans ${jours} jours.`);
  if(jours < 30) console.log(`::warning::Le jeton SAUVEGARDE_TOKEN expire dans ${jours} jours : le renouveler (voir MAINTENANCE.md, « Sauvegarde automatique »).`);
}
