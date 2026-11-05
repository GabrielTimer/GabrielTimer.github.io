// Rappels de séance : envoie une notification aux patients
// - mode « seances » (par défaut) : le jour d'une séance prévue, pas encore faite, à l'heure choisie ;
// - mode « perso » : les jours de la semaine choisis par le patient, à l'heure choisie pour chaque jour,
//   tant qu'il reste des séances à faire et si aucune séance n'a déjà été faite ce jour-là.
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
const minute = Number(new Intl.DateTimeFormat("fr-FR", { timeZone: TZ, minute: "2-digit" }).format(now));
const maintenant = hour + minute / 60;       // ex. 18,28 pour 18 h 17
const JOUR = String(["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].indexOf(new Intl.DateTimeFormat("en-US", { timeZone: TZ, weekday: "short" }).format(now)) + 1);   // 1 = lundi
console.log(`Paris : ${today}, ${hour} h ${String(minute).padStart(2, "0")}.`);

if(process.env.SEULEMENT_CLES === "1"){ console.log("Clés vérifiées, pas d'envoi."); process.exit(0); }
if(hour >= 22 || hour < 7){ console.log("Pas d'envoi la nuit."); process.exit(0); }

/* ---------- Messages du kiné : notification au patient ---------- */
{
  const msgs = (await db.collectionGroup("messages").get()).docs
    .filter(d => { const m = d.data(); return m.de === "kine" && !m.notifie && !m.lu && Date.now() - (m.date || 0) < 3 * 864e5; });
  let n = 0;
  for(const d of msgs){
    const pref = d.ref.parent.parent;
    const subs = await pref.collection("rappels").get();
    for(const sd of subs.docs){
      const r = sd.data();
      if(!r.actif || !r.endpoint) continue;
      const payload = { title: "Message de votre kiné", body: String(d.data().texte || "").slice(0, 120), url: "/index.html", tag: `msg-${d.id}` };
      try{ await webpush.sendNotification({ endpoint: r.endpoint, keys: { p256dh: r.p256dh, auth: r.auth } }, JSON.stringify(payload), { TTL: 24 * 3600 }); n++; }
      catch(e){ if(e.statusCode === 404 || e.statusCode === 410) await sd.ref.delete(); }
    }
    await d.ref.update({ notifie: true });
  }
  if(msgs.length) console.log(`::notice::${msgs.length} message(s) du kiné, ${n} notification(s) envoyée(s).`);
}

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
  if(r.dernierEnvoi === today) continue;
  const perso = r.mode === "perso" && r.jours && typeof r.jours === "object";
  const heureDuJour = perso ? Number(r.jours[JOUR]) : (Number(r.heure) || 18);
  if(!heureDuJour || heureDuJour > maintenant) continue;
  const cle = d.ref.parent.parent?.id;
  if(!cle) continue;

  const seances = await seancesDe(cle);
  let payload;
  if(perso){
    const restantes = seances.filter(s => !s.terminee);
    if(!restantes.length) continue;                                         // programme terminé
    if(seances.some(s => s.terminee && s.dateValidation && dayOf(s.dateValidation) === today)) continue;   // déjà faite aujourd'hui
    payload = {
      title: "C'est l'heure de vos exercices",
      body: "Votre séance vous attend. Quelques minutes suffisent !",
      url: "/index.html",
      tag: `seance-${today}`
    };
  }else{
  const dues = seances.filter(s => !s.terminee && s.datePrevue && dayOf(s.datePrevue) === today);
  if(!dues.length) continue;

  const s = dues[0];
  const nom = (s.label || s.nom || s.data?.nom || "").trim();
  payload = {
    title: "Votre séance du jour",
    body: dues.length > 1
      ? `${dues.length} séances sont prévues aujourd'hui. Quelques minutes suffisent !`
      : nom ? `« ${nom} » est prévue aujourd'hui. Quelques minutes suffisent !` : "Votre séance d'exercices est prévue aujourd'hui.",
    url: "/index.html",
    tag: `seance-${today}`
  };
  }
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
