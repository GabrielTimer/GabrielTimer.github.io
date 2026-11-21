/* Transfert des bilans : tablette → PC du cabinet, chiffré, en passant quelques instants par Firebase.

   - Tablette (« envoi ») : à la fin du bilan, le PDF est chiffré avec le code de transfert
     puis déposé dans Firebase (collection transit). Sans réseau, il attend sur la tablette
     et part tout seul au retour du réseau.
   - PC (« réception ») : tant qu'une page de l'espace kiné est ouverte, chaque bilan qui arrive
     est déchiffré, rangé dans le dossier « Bilans » choisi dans Réglages du cabinet,
     puis effacé de Firebase. Il ne reste plus qu'à le glisser dans Maiia.

   Le code de transfert (ex. 7KQ4-M2XP-...) est créé sur le PC et tapé une fois sur la tablette.
   Il reste sur ces deux appareils : il n'est jamais envoyé à Firebase. Sans lui, impossible de lire
   les bilans en transit (chiffrement AES-GCM 256 bits, clé tirée du code par PBKDF2). */

import { toast, esc, icon } from "./app.js";

const K_CODE = "gt_transfert_code", K_ROLE = "gt_transfert_role";
const MORCEAU = 600 * 1024;                 // 600 Ko par document Firestore (limite : 1 Mo)
const ALPHA = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";   // sans 0/O, 1/I/L : pas de confusion à la saisie

/* ---------- Réglages de cet appareil ---------- */

const lireLS = k => { try{ return localStorage.getItem(k) || ""; }catch(e){ return ""; } };
const ecrireLS = (k, v) => { try{ v ? localStorage.setItem(k, v) : localStorage.removeItem(k); }catch(e){} };

/** "envoi" (tablette), "reception" (PC du cabinet) ou "" (rien). */
export const role = () => lireLS(K_ROLE);
export const code = () => lireLS(K_CODE);
export const pret = () => !!(role() && normaliser(code()).length === 16);

export function regler({ role: r, code: c }){
  if(r !== undefined) ecrireLS(K_ROLE, r);
  if(c !== undefined) ecrireLS(K_CODE, c ? formater(c) : "");
}

export const normaliser = c => String(c || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
export const formater = c => normaliser(c).replace(/(.{4})(?=.)/g, "$1-");
export const codeValide = c => { const n = normaliser(c); return n.length === 16 && [...n].every(ch => ALPHA.includes(ch)); };

export function nouveauCode(){
  const v = crypto.getRandomValues(new Uint8Array(16));
  return formater([...v].map(x => ALPHA[x % ALPHA.length]).join(""));
}

/* ---------- Chiffrement ---------- */

const enc = new TextEncoder(), dec = new TextDecoder();
const cles = new Map();
async function cleDe(c){
  const n = normaliser(c);
  if(!cles.has(n)){
    cles.set(n, (async () => {
      const base = await crypto.subtle.importKey("raw", enc.encode(n), "PBKDF2", false, ["deriveKey"]);
      return crypto.subtle.deriveKey({ name: "PBKDF2", salt: enc.encode("ApiKine-transfert-bilans-v1"), iterations: 200000, hash: "SHA-256" },
        base, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
    })());
  }
  return cles.get(n);
}
/* Empreinte courte du code : le PC reconnaît un envoi fait avec un autre code, sans rien révéler du code */
export async function empreinte(c){
  const h = new Uint8Array(await crypto.subtle.digest("SHA-256", enc.encode("empreinte:" + normaliser(c))));
  return [...h.slice(0, 4)].map(x => x.toString(16).padStart(2, "0")).join("");
}

function b64(u8){
  let s = "";
  for(let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000));
  return btoa(s);
}
function deb64(s){
  const bin = atob(s), u8 = new Uint8Array(bin.length);
  for(let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
  return u8;
}

async function chiffrer(c, octets){
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const data = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, await cleDe(c), octets));
  return { iv: b64(iv), data };
}
async function dechiffrer(c, iv, octets){
  return new Uint8Array(await crypto.subtle.decrypt({ name: "AES-GCM", iv: deb64(iv) }, await cleDe(c), octets));
}

/* ---------- File d'attente de la tablette (envois pas encore partis) ---------- */

const DB = "apikine-transfert", STORE = "attente";
function base(){
  return new Promise((resolve, reject) => {
    const r = indexedDB.open(DB, 1);
    r.onupgradeneeded = () => r.result.createObjectStore(STORE, { keyPath: "envoi" });
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
}
async function tx(mode, fn){
  const db = await base();
  return new Promise((resolve, reject) => {
    const t = db.transaction(STORE, mode);
    const req = fn(t.objectStore(STORE));
    t.oncomplete = () => resolve(req?.result);
    t.onerror = () => reject(t.error);
  });
}
export const enAttente = () => tx("readonly", s => s.getAll()).then(l => l || []).catch(() => []);

/* Un même bilan renvoyé remplace l'envoi précédent pas encore parti */
const idEnvoi = bilanId => `${String(bilanId || "b").replace(/[^A-Za-z0-9]/g, "").slice(0, 30)}${Date.now().toString(36)}`;

/**
 * Tablette : envoie un PDF au PC du cabinet. Renvoie "envoye" ou "attente" (pas de réseau :
 * il partira tout seul). Lance une erreur si cet appareil n'est pas réglé pour envoyer.
 */
export async function envoyer({ blob, nom, bilanId }){
  if(role() !== "envoi" || !pret()) throw new Error("Transfert non réglé sur cet appareil");
  const c = code();
  const octets = new Uint8Array(await blob.arrayBuffer());
  const contenu = await chiffrer(c, octets);
  const titre = await chiffrer(c, enc.encode(nom));
  const item = { envoi: idEnvoi(bilanId), bilanId: bilanId || "", empreinte: await empreinte(c),
    iv: contenu.iv, data: contenu.data, ivNom: titre.iv, nom: b64(titre.data), date: Date.now() };
  /* Ancien envoi du même bilan encore en attente : remplacé */
  for(const a of await enAttente()) if(bilanId && a.bilanId === bilanId) await tx("readwrite", s => s.delete(a.envoi)).catch(() => {});
  await tx("readwrite", s => s.put(item));
  return (await expedier(item)) ? "envoye" : "attente";
}

async function expedier(item){
  if(typeof navigator !== "undefined" && navigator.onLine === false) return false;
  const C = await import("./cloud.js");
  const total = Math.max(1, Math.ceil(item.data.length / MORCEAU));
  const parts = [];
  for(let n = 0; n < total; n++){
    parts.push({ envoi: item.envoi, n, total, empreinte: item.empreinte,
      data: b64(item.data.subarray(n * MORCEAU, (n + 1) * MORCEAU)),
      ...(n === 0 ? { iv: item.iv, ivNom: item.ivNom, nom: item.nom } : {}) });
  }
  try{
    /* Délai de garde : sans réponse de Firebase, l'envoi reste en attente sur la tablette */
    await Promise.race([C.transitEcrire(parts), new Promise((_, rej) => setTimeout(() => rej(new Error("délai")), 60000))]);
  }catch(e){ console.warn("Transfert : envoi remis à plus tard", e); return false; }
  await tx("readwrite", s => s.delete(item.envoi)).catch(() => {});
  return true;
}

let relanceEnCours = false;
/** Tablette : renvoie ce qui attend (appelé à l'ouverture des pages kiné et au retour du réseau). */
export async function relancer(){
  if(relanceEnCours || role() !== "envoi" || !pret()) return 0;
  relanceEnCours = true;
  let n = 0;
  try{ for(const item of await enAttente()) if(await expedier(item)) n++; }
  finally{ relanceEnCours = false; }
  if(n) toast(n > 1 ? `${n} bilans en attente sont partis vers le PC du cabinet.` : "Le bilan en attente est parti vers le PC du cabinet.", { type: "ok" });
  return n;
}

/* ---------- Réception sur le PC ---------- */

let arret = null, enCours = new Set(), bandeau = null, enAttenteDossier = [];

function montrerBandeau(html, onClick){
  if(!bandeau){
    bandeau = document.createElement("div");
    bandeau.className = "notice warn";
    bandeau.style.cssText = "position:fixed;left:50%;transform:translateX(-50%);bottom:calc(84px + env(safe-area-inset-bottom));z-index:60;max-width:min(560px,calc(100vw - 24px));box-shadow:0 6px 24px rgba(0,0,0,.18);display:flex;gap:10px;align-items:center";
    document.body.append(bandeau);
  }
  bandeau.innerHTML = html;
  const b = bandeau.querySelector("button");
  if(b) b.onclick = onClick;
}
function cacherBandeau(){ bandeau?.remove(); bandeau = null; }

async function recevoir(envoi, parts){
  const D = await import("./dossiers.js");
  const C = await import("./cloud.js");
  const c = code();
  const p0 = parts.find(p => p.n === 0);
  if(p0.empreinte !== await empreinte(c)){
    montrerBandeau(`${icon("alert")}<span class="small"><strong>Un bilan a été envoyé avec un autre code de transfert.</strong> Vérifiez que la tablette et ce PC ont le même code (Réglages du cabinet → Transfert des bilans).</span>`);
    return "code";
  }
  const h = await D.autoriser("bilans").catch(() => null);
  if(!h) return "dossier";
  const brut = parts.sort((a, b) => a.n - b.n).map(p => deb64(p.data));
  const tout = new Uint8Array(brut.reduce((t, x) => t + x.length, 0));
  let o = 0; brut.forEach(x => { tout.set(x, o); o += x.length; });
  let pdf, nom;
  try{
    pdf = await dechiffrer(c, p0.iv, tout);
    nom = dec.decode(await dechiffrer(c, p0.ivNom, deb64(p0.nom)));
  }catch(e){ console.warn("Transfert : déchiffrement impossible", e); return "code"; }
  nom = (nom || "Bilan.pdf").replace(/[\\/:*?"<>|]/g, "");
  const r = await D.enregistrer("bilans", new Blob([pdf], { type: "application/pdf" }), nom);
  if(!r.dossier) return "dossier";
  await C.transitEffacer(envoi, p0.total);
  toast(`Bilan reçu : « ${nom} » est dans le dossier ${r.dossier}.`, { type: "ok", duration: 8000 });
  return "ok";
}

async function traiter(docs){
  const groupes = new Map();
  docs.forEach(p => { if(!groupes.has(p.envoi)) groupes.set(p.envoi, []); groupes.get(p.envoi).push(p); });
  enAttenteDossier = [];
  let codeFaux = false;
  for(const [envoi, parts] of groupes){
    const p0 = parts.find(p => p.n === 0);
    if(!p0 || parts.length < p0.total || enCours.has(envoi)) continue;   // morceaux pas encore tous arrivés
    enCours.add(envoi);
    try{
      const r = await recevoir(envoi, parts);
      if(r === "dossier") enAttenteDossier.push(envoi);
      if(r === "code") codeFaux = true;
    }catch(e){ console.warn("Transfert : réception impossible", e); }
    finally{ enCours.delete(envoi); }
  }
  if(codeFaux) return;
  if(enAttenteDossier.length){
    const D = await import("./dossiers.js");
    const choisi = await D.dossier("bilans");
    const n = enAttenteDossier.length, txt = n > 1 ? `${n} bilans attendent` : "Un bilan attend";
    if(!D.supporte()) montrerBandeau(`${icon("alert")}<span class="small"><strong>${txt}.</strong> Ce navigateur ne permet pas de ranger les bilans dans un dossier : ouvrez l'espace kiné dans Chrome ou Edge sur ce PC.</span>`);
    else if(!choisi) montrerBandeau(`${icon("folder")}<span class="small"><strong>${txt}.</strong> Choisissez d'abord le dossier des bilans.</span><a class="btn sm primary" href="/reglages_cabinet.html#transfert">Choisir</a>`);
    else montrerBandeau(`${icon("download")}<span class="small"><strong>${txt}.</strong> Chrome demande votre accord pour écrire dans le dossier « ${esc(choisi.name)} ».</span><button class="btn sm primary" type="button">Recevoir</button>`,
      async () => { if(await D.autoriser("bilans")){ cacherBandeau(); traiter(dernier); } });
  }else cacherBandeau();
}

let dernier = [];
/** PC : écoute les bilans qui arrivent (appelé sur chaque page de l'espace kiné). */
export async function demarrerReception(){
  if(arret || role() !== "reception" || !pret()) return;
  const C = await import("./cloud.js");
  arret = C.transitEcouter(docs => { dernier = docs; traiter(docs); },
    e => console.warn("Transfert : écoute impossible (règles Firebase publiées ?)", e));
}

/** À appeler une fois par page kiné : réception sur le PC, renvoi des bilans en attente sur la tablette. */
export function demarrer(){
  if(role() === "reception") demarrerReception().catch(e => console.warn(e));
  if(role() === "envoi"){
    relancer().catch(() => {});
    addEventListener("online", () => relancer().catch(() => {}));
  }
}
