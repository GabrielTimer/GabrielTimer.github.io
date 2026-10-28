// Rappels de séance : envoie une notification aux patients qui ont une séance
// prévue aujourd'hui, pas encore faite, à l'heure qu'ils ont choisie.
// Lancé chaque heure par .github/workflows/rappels.yml.
// Au premier lancement, crée les clés d'envoi (prive/push, reglages/push).
import admin from "firebase-admin";
import webpush from "web-push";

const fail = msg => { console.log(`::error::${String(msg).replace(/\r?\n/g, " ")}`); process.exit(1); };

const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
if(!raw) fail("Secret FIREBASE_SERVICE_ACCOUNT absent : voir MISE-EN-SERVICE.md.");
let cred;
try{ cred = JSON.parse(raw); }catch(e){ fail("Le secret FIREBASE_SERVICE_ACCOUNT n'est pas un JSON valide."); }

admin.initializeApp({ credential: admin.credential.cert(cred), projectId: cred.project_id });
const db = admin.firestore();
const TZ = "Europe/Paris";

/* ---------- Clés d'envoi (créées une seule fois, jamais lisibles par le site) ---------- */
const priv = db.doc("prive/push");
let keys = (await priv.get()).data();
if(!keys?.privateKey || !keys?.publicKey){
  keys = webpush.generateVAPIDKeys();
  await priv.set({ ...keys, createdAt: Date.now() });
  console.log("Clés d'envoi créées.");
}
const pub = db.doc("reglages/push");
if((await pub.get()).data()?.publicKey !== keys.publicKey) await pub.set({ publicKey: keys.publicKey });

const cabinet = (await db.doc("reglages/cabinet").get()).data()?.cabinet || {};
webpush.setVapidDetails(`mailto:${cabinet.email || "kine.laveau@gmail.com"}`, keys.publicKey, keys.privateKey);

/* ---------- Date et heure à Paris ---------- */
const now = new Date();
const dayOf = d => new Date(d).toLocaleDateString("sv-SE", { timeZone: TZ });   // AAAA-MM-JJ
const today = dayOf(now);
const hour = Number(new Intl.DateTimeFormat("fr-FR", { timeZone: TZ, hour: "2-digit", hourCycle: "h23" }).format(now));
console.log(`Paris : ${today}, ${hour} h.`);

if(process.env.SEULEMENT_CLES === "1"){ console.log("Clés vérifiées, pas d'envoi."); process.exit(0); }
if(hour >= 22 || hour < 7){ console.log("Pas d'envoi la nuit."); process.exit(0); }

/* ---------- Envoi ---------- */
const subs = await db.collectionGroup("rappels").get();
const seancesCache = new Map();
const seancesDe = async cle => {
  if(!seancesCache.has(cle)){
    const snap = await db.collection(`patients/${cle}/seances`).get();
    seancesCache.set(cle, snap.docs.map(d => d.data()));
  }
  return seancesCache.get(cle);
};

let envoyes = 0, retires = 0, erreurs = 0;
for(const d of subs.docs){
  const r = d.data();
  if(!r.actif || !r.endpoint) continue;
  if((Number(r.heure) || 18) > hour) continue;
  if(r.dernierEnvoi === today) continue;
  const cle = d.ref.parent.parent?.id;
  if(!cle) continue;

  const dues = (await seancesDe(cle)).filter(s => !s.terminee && s.datePrevue && dayOf(s.datePrevue) === today);
  if(!dues.length) continue;

  const s = dues[0];
  const nom = (s.label || s.nom || s.data?.nom || "").trim();
  const payload = {
    title: "Votre séance du jour",
    body: dues.length > 1
      ? `${dues.length} séances sont prévues aujourd'hui. Quelques minutes suffisent !`
      : nom ? `« ${nom} » est prévue aujourd'hui. Quelques minutes suffisent !` : "Votre séance d'exercices est prévue aujourd'hui.",
    url: "/index.html",
    tag: `seance-${today}`
  };
  try{
    await webpush.sendNotification({ endpoint: r.endpoint, keys: { p256dh: r.p256dh, auth: r.auth } }, JSON.stringify(payload), { TTL: 6 * 3600 });
    await d.ref.update({ dernierEnvoi: today });
    envoyes++;
  }catch(e){
    if(e.statusCode === 404 || e.statusCode === 410){ await d.ref.delete(); retires++; }
    else{ erreurs++; console.log(`Envoi impossible (${e.statusCode || ""}) : ${e.body || e.message}`); }
  }
}
console.log(`::notice::${envoyes} rappel(s) envoyé(s), ${retires} abonnement(s) expiré(s) retiré(s), ${erreurs} erreur(s). ${subs.size} abonnement(s) au total.`);
