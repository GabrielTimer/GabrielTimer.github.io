// Programmes inutilisés : chaque nuit
// - 3 semaines sans activité : notification au patient (s'il a activé les rappels), une fois ;
// - 4 semaines sans activité : le programme part dans la corbeille (collection « corbeille ») ;
// - corbeille de plus de 30 jours : effacée.
// Même règle que assets/inactivite.js (programmes terminés non concernés ; « Garder » et « Ne jamais supprimer » respectés).
// SIMULATION=1 : affiche seulement ce qui serait fait.
import admin from "firebase-admin";
import webpush from "web-push";

const SIMU = process.env.SIMULATION === "1";
const DAY = 86400000, J_ALERTE = 21, J_SUPPR = 28, J_CORBEILLE = 30;
const DEBUT_REGLE = Date.UTC(2026, 10, 5);
const fail = m => { console.log(`::error::${m}`); process.exit(1); };
const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
if(!raw) fail("Secret FIREBASE_SERVICE_ACCOUNT absent.");
const cred = JSON.parse(raw);
admin.initializeApp({ credential: admin.credential.cert(cred), projectId: cred.project_id });
const db = admin.firestore();
const now = Date.now();

const keys = (await db.doc("prive/push").get()).data();
const cabinet = (await db.doc("reglages/cabinet").get()).data()?.cabinet || {};
if(keys?.publicKey) webpush.setVapidDetails(`mailto:${cabinet.email || "kine.laveau@gmail.com"}`, keys.publicKey, keys.privateKey);

let alertes = 0, corbeille = 0, effaces = 0;
const patients = await db.collection("patients").get();
for(const pd of patients.docs){
  const patient = pd.data(), cle = pd.id;
  const seances = (await pd.ref.collection("seances").get()).docs.map(d => ({ ...d.data(), id: d.id }));
  const progs = new Map();
  seances.forEach(s => { if(s.programmeId){ if(!progs.has(s.programmeId)) progs.set(s.programmeId, []); progs.get(s.programmeId).push(s); } });
  const preavis = { ...(patient.preavisProgrammes || {}) };
  let preavisChange = false;
  for(const [pid, list] of progs){
    if(list.every(s => s.terminee)) continue;                       // programme terminé : conservé
    const garder = patient.garderProgrammes?.[pid];
    if(garder === "toujours") continue;
    let t = Math.max(Number(garder) || 0, DEBUT_REGLE);
    list.forEach(s => { t = Math.max(t, s.dateValidation || 0, s.updatedAt || 0, s.createdAt || 0); });
    /* En pause ou pas encore commencé : l'inactivité ne compte qu'à partir de la reprise (comme assets/inactivite.js) */
    const prochaine = Math.min(...list.filter(s => !s.terminee && s.datePrevue).map(s => new Date(s.datePrevue).getTime()).filter(Number.isFinite));
    if(Number.isFinite(prochaine)) t = Math.max(t, Math.min(now, prochaine));
    const jours = Math.floor((now - t) / DAY);
    const nom = list[0].programmeNom || list[0].data?.nom || "Programme";
    if(jours >= J_SUPPR){
      console.log(`::notice::Corbeille : ${patient.nom || cle} — « ${nom} » (${jours} j sans activité)`);
      corbeille++;
      if(SIMU) continue;
      const batch = db.batch();
      list.forEach(s => {
        batch.set(db.doc(`corbeille/${s.id}`), { ...s, cle, corbeilleProgramme: pid, corbeilleNom: nom, deletedAt: now, raison: "inactivite" });
        batch.delete(pd.ref.collection("seances").doc(s.id));
      });
      await batch.commit();
      delete preavis[pid]; preavisChange = true;
    }else if(jours >= J_ALERTE && preavis[pid] !== t){
      alertes++;
      console.log(`::notice::Préavis : ${patient.nom || cle} — « ${nom} » (${jours} j, retrait dans ${J_SUPPR - jours} j)`);
      if(SIMU) continue;
      preavis[pid] = t; preavisChange = true;
      if(!keys?.publicKey) continue;
      const subs = await pd.ref.collection("rappels").get();
      for(const sd of subs.docs){
        const r = sd.data();
        if(!r.actif || !r.endpoint) continue;
        const payload = { title: "Vos exercices vous attendent", body: `Pas de séance depuis ${jours} jours : sans nouvelle séance, « ${nom} » sera retiré dans ${J_SUPPR - jours} jours.`, url: "/cloud.html", tag: `preavis-${pid}` };
        try{ await webpush.sendNotification({ endpoint: r.endpoint, keys: { p256dh: r.p256dh, auth: r.auth } }, JSON.stringify(payload), { TTL: 24 * 3600 }); }
        catch(e){ if(e.statusCode === 404 || e.statusCode === 410) await sd.ref.delete(); }
      }
    }
  }
  if(preavisChange && !SIMU) await pd.ref.set({ preavisProgrammes: preavis }, { merge: true });
}

/* Corbeille de plus de 30 jours */
const vieux = (await db.collection("corbeille").get()).docs.filter(d => now - (d.data().deletedAt || 0) >= J_CORBEILLE * DAY);
effaces = vieux.length;
if(!SIMU) for(let i = 0; i < vieux.length; i += 400){ const b = db.batch(); vieux.slice(i, i + 400).forEach(d => b.delete(d.ref)); await b.commit(); }
console.log(`::notice::${SIMU ? "[simulation] " : ""}${alertes} préavis, ${corbeille} programme(s) mis à la corbeille, ${effaces} séance(s) effacée(s) de la corbeille.`);
