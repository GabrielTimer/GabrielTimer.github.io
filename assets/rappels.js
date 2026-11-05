/* =========================================================
   Rappels de séance (notifications sur le téléphone du patient)
   ---------------------------------------------------------
   Le patient active les rappels dans Réglages : son téléphone reçoit
   une notification le jour de chaque séance prévue, à l'heure choisie.
   L'abonnement est rangé dans patients/{code}/rappels/{id}.
   L'envoi est fait tous les quarts d'heure par GitHub (.github/workflows/rappels.yml),
   qui crée aussi lui-même les clés nécessaires (reglages/push).
   ========================================================= */

import { db } from "./cloud.js";
import { openSheet } from "./app.js";
import { doc, getDoc, setDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const KEY = "gt_rappel";
/** Heures proposées, au quart d'heure : 7 → 21,75 (18,5 = 18 h 30). */
export const HEURES = Array.from({ length: 60 }, (_, i) => 7 + i / 4);
/** 18.5 → « 18 h 30 », 18 → « 18 h ». */
export const fmtH = x => { const h = Math.floor(x), m = Math.round((x - h) * 60); return m ? `${h} h ${String(m).padStart(2, "0")}` : `${h} h`; };
const quart = x => Math.round(Number(x) * 4) / 4;
/** Jours de la semaine, numérotés comme la norme ISO (1 = lundi … 7 = dimanche). */
export const JOURS = [["1","Lundi"],["2","Mardi"],["3","Mercredi"],["4","Jeudi"],["5","Vendredi"],["6","Samedi"],["7","Dimanche"]];

/** Nettoie un planning { "1":18, "3":7 } : jours connus, heures 7-21. */
export function nettoyerJours(jours){
  const out = {};
  for(const [j] of JOURS){
    const h = quart(jours?.[j]);
    if(jours && j in jours && h >= 7 && h <= 21.75) out[j] = h;
  }
  return out;
}

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

/** État enregistré sur cet appareil : { cle, id, heure, actif, mode, jours } ou null. */
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
export async function activerRappels(cle, heure = 18, { mode = "seances", jours = {} } = {}){
  jours = nettoyerJours(jours);
  if(mode === "perso" && !Object.keys(jours).length) throw new Error("Cochez au moins un jour.");
  const sup = rappelSupport();
  if(!sup.ok) throw new Error(sup.raison === "ios-ecran"
    ? "Sur iPhone, ajoutez d'abord l'application à l'écran d'accueil, puis ouvrez-la depuis son icône."
    : "Ce navigateur ne permet pas les notifications. Essayez avec Chrome, Safari ou Firefox à jour.");
  const perm = Notification.permission === "granted" ? "granted" : await Notification.requestPermission();
  if(perm !== "granted"){
    const err = new Error("Les notifications sont bloquées sur ce téléphone pour l'application.");
    err.code = "app/notif-bloquees";
    throw err;
  }

  const pub = (await getDoc(doc(db, "reglages", "push")).catch(() => null))?.data()?.publicKey;
  if(!pub) throw new Error("Les rappels ne sont pas encore prêts côté cabinet. Réessayez dans quelques minutes.");

  const reg = await registration();
  let sub = await reg.pushManager.getSubscription();
  /* Abonnement créé avec une autre clé : on le renouvelle */
  if(sub && sub.options?.applicationServerKey && b64(sub.options.applicationServerKey) !== pub){ await sub.unsubscribe().catch(() => {}); sub = null; }
  if(!sub){
    try{ sub = await reg.pushManager.subscribe({ userVisibleOnly:true, applicationServerKey: keyBytes(pub) }); }
    catch(e){
      const err = new Error("Le téléphone a refusé l'abonnement aux notifications. Vérifiez qu'elles sont autorisées pour l'application (et que vous n'êtes pas en navigation privée), puis réessayez.");
      err.code = "app/notif-bloquees";
      throw err;
    }
  }

  const j = sub.toJSON();
  const prev = read();
  const id = prev?.cle === cle && prev.id ? prev.id : (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(36).slice(2));
  await setDoc(doc(db, "patients", cle, "rappels", id), {
    endpoint: j.endpoint, p256dh: j.keys.p256dh, auth: j.keys.auth,
    heure: quart(heure), actif: true, createdAt: Date.now(), mode, jours,
    tz: Intl.DateTimeFormat().resolvedOptions().timeZone || "Europe/Paris"
  }, { merge:true });
  const state = { cle, id, heure: quart(heure), actif:true, mode, jours };
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

/** Phrase qui résume les rappels : « à 18 h les jours de séance » ou « lundi 7 h, mercredi 18 h ». */
export function resumeRappels(st){
  if(!st) return "";
  if(st.mode === "perso"){
    const j = nettoyerJours(st.jours);
    const parts = JOURS.filter(([k]) => k in j).map(([k, nom]) => `${nom.toLowerCase()} ${fmtH(j[k])}`);
    const memes = new Set(Object.values(j)).size === 1;
    if(memes && parts.length > 1) return `${JOURS.filter(([k]) => k in j).map(([, n]) => n.toLowerCase()).join(", ")} à ${fmtH(Object.values(j)[0])}`;
    return parts.join(", ");
  }
  return `à ${fmtH(st.heure)} les jours de séance`;
}


/* ---------- Aide : notifications bloquées ---------- */

/** true si le patient (ou le téléphone) a bloqué les notifications pour l'application. */
export const notifsBloquees = () => "Notification" in window && Notification.permission === "denied";

/** Explique, selon le téléphone, comment autoriser à nouveau les notifications. */
export function aideNotifications(){
  const { ios, standalone } = rappelSupport();
  const etapes = l => `<ol style="margin:0 0 14px;padding-left:1.3em;line-height:1.6">${l.map(e => `<li>${e}</li>`).join("")}</ol>`;
  let corps;
  if(ios){
    corps = `${standalone ? "" : `<p><strong>D'abord :</strong> sur iPhone, les rappels ne marchent que depuis l'icône de l'application.</p>
      ${etapes(["Dans Safari, touchez <strong>Partager</strong> (carré avec une flèche).", "Choisissez <strong>Sur l'écran d'accueil</strong>, puis <strong>Ajouter</strong>.", "Ouvrez l'application depuis sa nouvelle icône."])}`}
      <p><strong>Pour autoriser les notifications :</strong></p>
      ${etapes(["Ouvrez les <strong>Réglages</strong> de l'iPhone.", "Touchez <strong>Notifications</strong>, puis le nom de l'application.", "Activez <strong>Autoriser les notifications</strong>."])}`;
  }else{
    corps = `<p><strong>Si l'application est sur votre écran d'accueil :</strong></p>
      ${etapes(["Faites un <strong>appui long</strong> sur son icône.", "Touchez <strong>ⓘ</strong> ou <strong>Infos sur l'appli</strong>.", "Touchez <strong>Notifications</strong> et activez-les."])}
      <p><strong>Si vous l'ouvrez dans Chrome :</strong></p>
      ${etapes(["Touchez l'icône à gauche de l'adresse, en haut de l'écran.", "Touchez <strong>Autorisations</strong> (ou Paramètres du site).", "Mettez <strong>Notifications</strong> sur <strong>Autoriser</strong>."])}`;
  }
  openSheet({
    title: "Autoriser les notifications",
    body: `<p class="muted" style="margin-bottom:12px">Les notifications ont été bloquées sur ce téléphone. Seul vous pouvez les rétablir, en quelques secondes :</p>
      ${corps}
      <p class="muted">Revenez ensuite ici et réactivez « Me rappeler mes séances ».</p>`,
    foot: `<button class="btn primary" type="button" data-close>J'ai compris</button>`
  });
}
