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

/* ---------- Messages du kiné : notification au patient ----------
   Économie de lectures Firebase (quota gratuit : 50 000 par jour) : quand le kiné écrit,
   l'appli dépose un petit avis dans notifs/{id}. On ne lit donc que ces avis à chaque passage.
   Une fois par jour (vers midi), on relit tous les messages pour rattraper un avis manqué. */
{
  const notifs = await db.collection("notifs").get();
  const aTraiter = [];
  for(const nd of notifs.docs){
    const chemin = nd.data()?.chemin;
    if(chemin){ const md = await db.doc(chemin).get().catch(() => null); if(md?.exists) aTraiter.push(md); }
    await nd.ref.delete();
  }
  if(hour === 12 && minute < 15){
    const tous = (await db.collectionGroup("messages").get()).docs;
    const deja = new Set(aTraiter.map(d => d.ref.path));
    tous.forEach(d => { if(!deja.has(d.ref.path)) aTraiter.push(d); });
  }
  const msgs = aTraiter.filter(d => { const m = d.data(); return m.de === "kine" && !m.notifie && !m.lu && Date.now() - (m.date || 0) < 3 * 864e5; });
  let n = 0;
  for(const d of msgs){
    /* Messagerie rangée sous le code du patient (codes/{code}) : ses rappels sont dans son dossier */
    let pref = d.ref.parent.parent;
    if(pref.parent.id === "codes"){
      const cle = (await pref.get()).data()?.cle;
      if(!cle){ await d.ref.update({ notifie: true }); continue; }
      pref = db.doc(`patients/${cle}`);
    }
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

/* ---------- Nouvelles 3 mois après la fin de la prise en charge ----------
   patients/{clé}.suivi3m.prevu = "AAAA-MM-JJ" (posé par le bilan de fin de traitement ou la fiche) :
   le jour venu, un message du kiné arrive dans la messagerie du patient, avec une notification,
   puis prevu passe à "fait" (« fait » est après toute date : la requête ne le relit plus).
   Mis de côté le 24/11/2026 (bloc Accompagnement caché) : remettre true pour réactiver. */
const SUIVI3M_ACTIF = false;
if(SUIVI3M_ACTIF){
  const dus = await db.collection("patients").where("suivi3m.prevu", "<=", today).get().catch(e => { console.log(`Suivi 3 mois : ${e.message}`); return { docs: [] }; });
  let n = 0;
  for(const pd of dus.docs){
    const p = pd.data(), cle = pd.id;
    if(!p.suivi3m?.prevu || p.suivi3m.prevu === "fait") continue;
    let boite = db.collection(`patients/${cle}/messages`);
    if(p.codeV2){
      const c = await db.collection("codes").where("cle", "==", cle).limit(1).get();
      if(!c.empty) boite = c.docs[0].ref.collection("messages");
    }
    const mots = String(p.nom || "").trim().split(/\s+/);
    const prenom = mots.find(m => m !== m.toUpperCase()) || "";
    const texte = `Bonjour${prenom ? " " + prenom : ""}, cela fait 3 mois que nos séances sont terminées. Comment allez-vous ? Vous pouvez me répondre en 1 minute depuis l'accueil de l'application (« Votre kiné prend de vos nouvelles »).`;
    await boite.add({ type: "message", sujet: "Des nouvelles ?", texte, date: Date.now(), lu: false, de: "kine", notifie: true });
    const subsP = await db.collection(`patients/${cle}/rappels`).get();
    for(const sd of subsP.docs){
      const r = sd.data();
      if(!r.actif || !r.endpoint) continue;
      const payload = { title: "Votre kiné prend de vos nouvelles", body: "Comment allez-vous depuis la fin des séances ? 1 minute pour répondre.", url: "/index.html", tag: `suivi3m-${cle}` };
      try{ await webpush.sendNotification({ endpoint: r.endpoint, keys: { p256dh: r.p256dh, auth: r.auth } }, JSON.stringify(payload), { TTL: 24 * 3600 }); }
      catch(e){ if(e.statusCode === 404 || e.statusCode === 410) await sd.ref.delete(); }
    }
    await pd.ref.update({ "suivi3m.prevu": "fait", "suivi3m.envoyeLe": today });
    n++;
  }
  if(n) console.log(`::notice::${n} message(s) de suivi à 3 mois envoyé(s).`);
}

/* ---------- Envoi ---------- */
const subs = await db.collectionGroup("rappels").get();
const seancesCache = new Map();
const seancesDe = async cle => {
  if(!seancesCache.has(cle)){
    const snap = await db.collection(`patients/${cle}/seances`).get();
    seancesCache.set(cle, snap.docs.map(d => d.data()).filter(s => s.cabinet !== true && !s.archive));   // archivés : plus de rappel   // séances au cabinet : faites avec le kiné, pas de rappel
  }
  return seancesCache.get(cle);
};

/* Rien à envoyer aujourd'hui : noté, pour ne pas relire ses séances à chaque passage (quota gratuit) */
const rienAujourdhui = d => d.ref.update({ dernierControle: today }).catch(() => {});

let envoyes = 0, retires = 0, erreurs = 0;
for(const d of subs.docs){
  const r = d.data();
  if(!r.actif || !r.endpoint) continue;
  if(r.dernierEnvoi === today || r.dernierControle === today) continue;
  const perso = r.mode === "perso" && r.jours && typeof r.jours === "object";
  const heureDuJour = perso ? Number(r.jours[JOUR]) : (Number(r.heure) || 18);
  if(!heureDuJour || heureDuJour > maintenant) continue;
  const cle = d.ref.parent.parent?.id;
  if(!cle) continue;

  const seances = await seancesDe(cle);
  let payload;
  if(perso){
    const restantes = seances.filter(s => !s.terminee);
    if(!restantes.length){ await rienAujourdhui(d); continue; }             // programme terminé
    if(seances.some(s => s.terminee && s.dateValidation && dayOf(s.dateValidation) === today)){ await rienAujourdhui(d); continue; }   // déjà faite aujourd'hui
    payload = {
      title: "C'est l'heure de vos exercices",
      body: "Votre séance vous attend. Quelques minutes suffisent !",
      url: "/index.html",
      tag: `seance-${today}`
    };
  }else{
  const dues = seances.filter(s => !s.terminee && s.datePrevue && dayOf(s.datePrevue) === today);
  if(!dues.length){ await rienAujourdhui(d); continue; }

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
