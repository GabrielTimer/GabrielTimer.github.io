// Ponctuel : supprime les copies en double du modèle « Lombalgie » (une copie de sauvegarde est gardée dans prive/corbeille_modeles).
import admin from "firebase-admin";
const MODE = "liste"; // "liste" ou "supprimer"
const cred = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
admin.initializeApp({ credential: admin.credential.cert(cred), projectId: cred.project_id });
const db = admin.firestore();
const norm = s => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
function split(nom){ const s = String(nom || "").trim(); const m = s.match(/^(.*?)[\s_-]+(?:P|N|niveau\s*|phase\s*)?(\d)\s*$/i); return m && m[1].trim() ? { base:m[1].trim(), niveau:+m[2] } : { base:s, niveau:null }; }
const snap = await db.collection("modeles").get();
const lomb = snap.docs.map(d => { const x = d.data(); const p = split(x.nom || x.data?.nom); const niveau = Number(x.niveau) || p.niveau || null; const base = x.niveau ? String(x.nom || "").trim() : p.base;
  const n = (x.exercices || x.data?.exercices || []).length;
  return { id:d.id, base, niveau, createdAt: x.createdAt || 0, n, cat: x.categorie || "", remplace: x.remplace || "", raw:x }; })
  .filter(m => norm(m.base) === "lombalgie");
lomb.sort((a, b) => ((a.niveau || 0) - (b.niveau || 0)) || ((b.createdAt || 0) - (a.createdAt || 0)));
const seen = {};
lomb.forEach(m => { const k = m.niveau || 0; seen[k] = (seen[k] || 0) + 1; m.copie = seen[k]; });
for(const m of lomb) console.log(`::notice::${m.id} | niveau ${m.niveau} copie ${m.copie} | ${m.n} exos | cat ${m.cat} | remplace ${m.remplace} | cree ${m.createdAt ? new Date(m.createdAt).toISOString() : "?"}`);
const garder = lomb.find(m => m.niveau === 1 && m.copie === 1);
const aSupprimer = lomb.filter(m => m !== garder);
console.log(`::notice::Garder : ${garder?.id}. A supprimer : ${aSupprimer.map(m => m.id).join(", ")}`);
if(MODE === "supprimer" && garder){
  await db.doc("prive/corbeille_modeles").set({ [`lombalgie_${Date.now()}`]: aSupprimer.map(m => ({ id:m.id, data:m.raw })) }, { merge:true });
  for(const m of aSupprimer) await db.doc(`modeles/${m.id}`).delete();
  console.log(`::notice::${aSupprimer.length} modèle(s) supprimé(s), sauvegarde dans prive/corbeille_modeles.`);
}
