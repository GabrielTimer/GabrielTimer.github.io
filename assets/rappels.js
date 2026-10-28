/* =========================================================
   Rappels de séance (notifications sur le téléphone du patient)
   ---------------------------------------------------------
   Le patient active les rappels dans Réglages : son téléphone reçoit
   une notification le jour de chaque séance prévue, à l'heure choisie.
   L'abonnement est rangé dans patients/{code}/rappels/{id}.
   L'envoi est fait chaque heure par GitHub (.github/workflows/rappels.yml),
   qui crée aussi lui-même les clés nécessaires (reglages/push).
   ========================================================= */

import { db } from "./cloud.js";
import { doc, getDoc, setDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const KEY = "gt_rappel";
export const HEURES = Array.from({ length: 15 }, (_, i) => i + 7);   // 7 h → 21 h

const read = () => { try{ return JSON.parse(localStorage.getItem(KEY) || "null"); }catch(e){ return null; } };
const write = v => { try{ v ? localStorage.setItem(KEY, JSON.stringify(v)) : localStorage.removeItem(KEY); }catch(e){} };

/** Ce que permet ce téléphone. */
export function rappelSupport(){
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const standalone = matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;
  const api = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
  if(api) return { ok:true, ios, standalone };
  if(ios && !standalone) return { ok:false, ios, standalone, raison:"ios-ecran" };
  return { ok:false, ios, standalone, raison:"navigateur" };
}

/** État enregistré sur cet appareil : { cle, id, heure, actif } ou null. */
export function rappelState(cle){
  const s = read();
  if(!s || s.cle !== cle) return null;
  if(s.actif && "Notification" in window && Notification.permission !== "granted") return { ...s, actif:false };
  return s;
}

const b64 = buf => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
function keyBytes(base64url){
  const s = (base64url + "===".slice((base64url.length + 3) % 4)).replace(/-/g, "+").replace(/_/g, "/");
  return Uint8Array.from(atob(s), c => c.charCodeAt(0));
}

async function registration(){
  let reg = await navigator.serviceWorker.getRegistration("/");
  if(!reg) reg = await navigator.serviceWorker.register("/sw.js");
  return navigator.serviceWorker.ready.then(r => r || reg);
}

/** Active (ou met à jour) les rappels. Lance une erreur lisible si ce n'est pas possible. */
export async function activerRappels(cle, heure = 18){
  const sup = rappelSupport();
  if(!sup.ok) throw new Error(sup.raison === "ios-ecran"
    ? "Sur iPhone, ajoutez d'abord l'application à l'écran d'accueil, puis ouvrez-la depuis son icône."
    : "Ce navigateur ne permet pas les notifications. Essayez avec Chrome, Safari ou Firefox à jour.");
  const perm = Notification.permission === "granted" ? "granted" : await Notification.requestPermission();
  if(perm !== "granted") throw new Error("Les notifications sont refusées pour ce site. Autorisez-les dans les réglages du téléphone, puis réessayez.");

  const pub = (await getDoc(doc(db, "reglages", "push")).catch(() => null))?.data()?.publicKey;
  if(!pub) throw new Error("Les rappels ne sont pas encore prêts côté cabinet. Réessayez dans quelques minutes.");

  const reg = await registration();
  let sub = await reg.pushManager.getSubscription();
  /* Abonnement créé avec une autre clé : on le renouvelle */
  if(sub && sub.options?.applicationServerKey && b64(sub.options.applicationServerKey) !== pub){ await sub.unsubscribe().catch(() => {}); sub = null; }
  if(!sub){
    try{ sub = await reg.pushManager.subscribe({ userVisibleOnly:true, applicationServerKey: keyBytes(pub) }); }
    catch(e){ throw new Error("Le téléphone a refusé l'abonnement aux notifications. Vérifiez qu'elles sont autorisées pour l'application (et que vous n'êtes pas en navigation privée), puis réessayez."); }
  }

  const j = sub.toJSON();
  const prev = read();
  const id = prev?.cle === cle && prev.id ? prev.id : (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(36).slice(2));
  await setDoc(doc(db, "patients", cle, "rappels", id), {
    endpoint: j.endpoint, p256dh: j.keys.p256dh, auth: j.keys.auth,
    heure: Number(heure), actif: true, createdAt: Date.now(),
    tz: Intl.DateTimeFormat().resolvedOptions().timeZone || "Europe/Paris"
  }, { merge:true });
  const state = { cle, id, heure: Number(heure), actif:true };
  write(state);
  return state;
}

/** Désactive les rappels sur cet appareil. */
export async function desactiverRappels(cle){
  const s = read();
  if(s?.id && s.cle === cle) await deleteDoc(doc(db, "patients", cle, "rappels", s.id)).catch(() => {});
  try{
    const reg = await navigator.serviceWorker?.getRegistration("/");
    const sub = await reg?.pushManager?.getSubscription();
    await sub?.unsubscribe();
  }catch(e){}
  write(s ? { ...s, actif:false } : null);
}

/** Affiche une notification d'essai sur ce téléphone. */
export async function essaiRappel(){
  const reg = await registration();
  return reg.showNotification("Rappel de séance", {
    body: "C'est ainsi que vous serez prévenu le jour de vos séances.",
    icon: "/icon-192.png", badge: "/icon-192.png", tag: "essai", data:{ url:"/index.html" }
  });
}
