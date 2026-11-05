/* =========================================================
   Installation de l'application sur le téléphone du patient
   ---------------------------------------------------------
   - Android (Chrome, Edge, Samsung…) : un bouton « Installer » quand le navigateur le permet.
   - iPhone : 3 gestes illustrés (Partager → Sur l'écran d'accueil → Ajouter).
   - Navigateur intégré (WhatsApp, Gmail, Facebook…) : « Ouvrir dans Chrome / Safari ».
   - iPhone : l'icône installée a sa propre mémoire, séparée de Safari. Pour qu'elle
     s'ouvre directement sur l'espace du patient, l'adresse de départ contient son code,
     et le code est copié pour pouvoir le coller en un appui au besoin.
   ========================================================= */

import { icon, store, openSheet, toast, fmtCode, normCode } from "./app.js";

const ua = navigator.userAgent || "";
export const estIOS = /iphone|ipad|ipod/i.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
export const estAndroid = /android/i.test(ua);
export const estInstallee = () => matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;
export const estSamsung = /SamsungBrowser/i.test(ua);
/* Android 8 et plus ancien + Chrome : l'application installée par Chrome peut s'arrêter au lancement
   (constaté sur Galaxy Tab, Chrome 138). Samsung Internet ou Firefox installent sans souci. */
const versionAndroid = Number((/Android (\d+)/i.exec(ua) || [])[1]) || 0;
export const ancienAndroidChrome = estAndroid && versionAndroid > 0 && versionAndroid <= 8 && !estSamsung && /Chrome\//.test(ua) && !/Firefox/i.test(ua);
// Navigateurs intégrés aux applis (on ne peut pas installer depuis ceux-là)
const integre = /FBAN|FBAV|FB_IAB|Instagram|Line\/|WhatsApp|Snapchat|Messenger|LinkedInApp|GSA\/|; wv\)/i.test(ua);

let invite = null;
addEventListener("beforeinstallprompt", e => { e.preventDefault(); invite = e; document.dispatchEvent(new Event("gt-installable")); });
addEventListener("appinstalled", () => { invite = null; store.set("gt_install_ok", 1); });

/** iPhone : l'icône s'ouvrira directement sur l'espace du patient. */
function preparerIOS(cle){
  if(!estIOS || !cle) return;
  const depart = `${location.origin}/?acces=${cle}`;
  try{
    // L'adresse affichée contient le code : c'est elle qu'iOS retient sans manifeste exploitable.
    if(!new URLSearchParams(location.search).get("acces")) history.replaceState(null, "", `/?acces=${cle}`);
    const m = {
      name:"ApiKiné", short_name:"ApiKiné", lang:"fr", display:"standalone",
      start_url: depart, scope: `${location.origin}/`, id: "/",
      background_color:"#EDF3F4", theme_color:"#138FA6",
      icons:[{ src:`${location.origin}/icon-192.png`, sizes:"192x192", type:"image/png" }, { src:`${location.origin}/icon-512.png`, sizes:"512x512", type:"image/png" }]
    };
    let link = document.querySelector('link[rel="manifest"]');
    if(!link){ link = document.createElement("link"); link.rel = "manifest"; document.head.appendChild(link); }
    link.href = "data:application/manifest+json;charset=utf-8," + encodeURIComponent(JSON.stringify(m));
  }catch(e){}
}

async function copierCode(cle){
  try{ await navigator.clipboard.writeText(`${location.origin}/?acces=${cle}`); return true; }catch(e){ return false; }
}

function etapesIOS(){
  const chrome = /CriOS|FxiOS|EdgiOS/i.test(ua);
  return `<ol class="inst-steps">
    <li><span class="inst-n">1</span><span>Touchez <strong>Partager</strong> <span class="inst-ico">${icon("share")}</span> ${chrome ? "en haut à droite, dans la barre d'adresse" : "en bas de l'écran (ou en haut sur iPad)"}.</span></li>
    <li><span class="inst-n">2</span><span>Faites défiler et choisissez <strong>Sur l'écran d'accueil</strong> <span class="inst-ico">${icon("plus")}</span>.</span></li>
    <li><span class="inst-n">3</span><span>Touchez <strong>Ajouter</strong> en haut à droite. C'est tout !</span></li>
  </ol>
  <p class="small muted">Vous ne voyez pas « Partager » ? Touchez l'icône Safari ${icon("link", "ic-inline")} pour ouvrir cette page dans Safari, puis recommencez.</p>
`;
}

function etapesSamsung(){
  return `<ol class="inst-steps">
    <li><span class="inst-n">1</span><span>Touchez le menu <strong>☰</strong> en bas à droite de Samsung Internet.</span></li>
    <li><span class="inst-n">2</span><span>Choisissez <strong>Ajouter la page à</strong>, puis <strong>Écran d'accueil</strong>.</span></li>
    <li><span class="inst-n">3</span><span>Confirmez. L'icône ApiKiné apparaît sur votre écran.</span></li>
  </ol>`;
}
const noteAncienAndroid = () => `<div class="notice warn" style="margin-top:10px">${icon("info")}<span>Sur cet appareil (Android ${versionAndroid}), l'application installée avec Chrome peut refuser de s'ouvrir. Dans ce cas, ouvrez ce lien avec <strong>Samsung Internet</strong> (icône violette) ou <strong>Firefox</strong>, puis ajoutez-le à l'écran d'accueil depuis leur menu.</span></div>`;

function etapesAndroidMenu(){
  if(estSamsung) return etapesSamsung();
  return `<ol class="inst-steps">
    <li><span class="inst-n">1</span><span>Touchez le menu <strong>⋮</strong> en haut à droite du navigateur.</span></li>
    <li><span class="inst-n">2</span><span>Choisissez <strong>Installer l'application</strong> ou <strong>Ajouter à l'écran d'accueil</strong>.</span></li>
    <li><span class="inst-n">3</span><span>Confirmez. L'icône ApiKiné apparaît sur votre écran.</span></li>
  </ol>`;
}

const STYLE = `
.inst-intro{ display:flex; gap:12px; align-items:center; margin-bottom:14px; }
.inst-intro img{ width:56px; height:56px; border-radius:14px; flex:none; box-shadow:0 2px 8px rgba(0,0,0,.12); }
.inst-steps{ list-style:none; padding:0; margin:0 0 12px; display:flex; flex-direction:column; gap:12px; }
.inst-steps li{ display:flex; gap:12px; align-items:flex-start; line-height:1.4; }
.inst-n{ flex:none; width:28px; height:28px; border-radius:50%; background:var(--lagon); color:var(--on-lagon); display:grid; place-items:center; font-weight:800; }
.inst-ico{ display:inline-grid; place-items:center; width:26px; height:26px; border-radius:8px; background:var(--lagon-soft); color:var(--lagon-strong); vertical-align:middle; }
.inst-ico svg{ width:16px; height:16px; }
.inst-arrow{ position:fixed; left:50%; bottom:calc(6px + env(safe-area-inset-bottom)); translate:-50% 0; width:44px; height:44px; border-radius:50%; background:var(--lagon); color:#fff; display:grid; place-items:center; z-index:1000; animation:inst-bounce 1.2s ease-in-out infinite; pointer-events:none; }
.inst-arrow svg{ width:26px; height:26px; }
@keyframes inst-bounce{ 50%{ transform:translateY(8px); } }
@media (prefers-reduced-motion:reduce){ .inst-arrow{ animation:none; } }
.inst-banner{ display:flex; gap:12px; align-items:center; }
.inst-banner .grow{ flex:1; min-width:0; }
`;
function style(){ if(!document.getElementById("inst-style")){ const s = document.createElement("style"); s.id = "inst-style"; s.textContent = STYLE; document.head.appendChild(s); } }

/** Fenêtre d'installation adaptée au téléphone. */
export function ouvrirInstallation(cle){
  style();
  preparerIOS(cle);
  let body, foot;
  const intro = `<div class="inst-intro"><img src="/icon-192.png" alt=""><p>Ajoutez <strong>ApiKiné</strong> à votre écran d'accueil : vos exercices s'ouvriront d'un appui, comme une application, et vous pourrez recevoir les rappels de séance.</p></div>`;
  if(integre){
    body = `${intro}<div class="notice warn">${icon("info")}<span>Ce lien s'est ouvert dans une autre application. Pour installer ApiKiné, ouvrez-le dans ${estIOS ? "<strong>Safari</strong>" : "<strong>Chrome</strong>"} : touchez le menu <strong>⋮</strong> ou <strong>…</strong> puis <strong>Ouvrir dans ${estIOS ? "Safari" : "le navigateur"}</strong>.</span></div>
      <p class="small muted" style="margin-top:10px">Ou copiez le lien et collez-le dans ${estIOS ? "Safari" : "Chrome"}.</p>`;
    foot = `<button class="btn" type="button" data-close>Plus tard</button><button class="btn primary" type="button" id="inst-copy">${icon("copy")}Copier le lien</button>`;
  }else if(estIOS){
    body = `${intro}${etapesIOS()}`;
    foot = `<button class="btn" type="button" data-close>Plus tard</button><button class="btn primary" type="button" data-close>J'ai compris</button>`;
  }else if(invite){
    body = `${intro}<p>Un seul appui suffit.</p>${ancienAndroidChrome ? noteAncienAndroid() : ""}`;
    foot = `<button class="btn" type="button" data-close>Plus tard</button><button class="btn primary big" type="button" id="inst-go">${icon("download")}Installer</button>`;
  }else{
    body = `${intro}${etapesAndroidMenu()}${ancienAndroidChrome ? noteAncienAndroid() : ""}`;
    foot = `<button class="btn" type="button" data-close>Plus tard</button><button class="btn primary" type="button" data-close>J'ai compris</button>`;
  }
  const s = openSheet({ title:"Installer l'application", body, foot, onClose: () => s?.el?.querySelector(".inst-arrow")?.remove() });
  // La flèche iPhone doit rester au-dessus de la barre de Safari, hors de la fenêtre.
  const fl = s.el.querySelector(".inst-arrow"); if(fl) document.body.appendChild(fl);
  const fermer = s.close; s.close = () => { document.querySelectorAll(".inst-arrow").forEach(x => x.remove()); fermer(); };
  s.el.querySelectorAll("[data-close]").forEach(b => b.addEventListener("click", () => document.querySelectorAll(".inst-arrow").forEach(x => x.remove())));
  if(estIOS && cle) copierCode(cle);
  s.el.querySelector("#inst-copy")?.addEventListener("click", async () => {
    const ok = await copierCode(cle);
    toast(ok ? "Lien copié. Collez-le dans votre navigateur." : "Copie impossible : appuyez longuement sur l'adresse pour la copier.", { type: ok ? "ok" : "info" });
  });
  s.el.querySelector("#inst-go")?.addEventListener("click", async () => {
    if(!invite) return;
    invite.prompt();
    const r = await invite.userChoice.catch(() => null);
    invite = null;
    s.close();
    if(r?.outcome === "accepted"){ store.set("gt_install_ok", 1); toast("ApiKiné est installée sur votre écran d'accueil.", { type:"ok" }); }
  });
  store.set("gt_install_vu", Date.now());
  return s;
}

/** Bandeau + ouverture automatique (une fois par jour au plus) sur l'accueil du patient. */
export function proposerInstallation(cle, conteneur){
  if(estInstallee() || store.get("gt_install_ok")) return;
  style();
  preparerIOS(cle);
  if(conteneur){
    const b = document.createElement("div");
    b.className = "panel inst-banner";
    b.style.marginBottom = "14px";
    b.innerHTML = `<img src="/icon-192.png" alt="" width="40" height="40" style="border-radius:10px;flex:none"><div class="grow"><strong>Installer l'application</strong><br><span class="small muted">Vos exercices en un appui depuis l'écran d'accueil.</span></div><button class="btn primary sm" type="button">Installer</button>`;
    b.querySelector("button").onclick = () => ouvrirInstallation(cle);
    conteneur.prepend(b);
  }
  const vu = Number(store.get("gt_install_vu", 0)) || 0;
  if(Date.now() - vu > 20 * 3600 * 1000) setTimeout(() => { if(!document.querySelector("dialog[open]")) ouvrirInstallation(cle); }, 900);
}

/** Écran « code d'accès » dans l'application installée : coller le lien ou le code copié. */
export async function lireCodeCopie(){
  try{
    const t = await navigator.clipboard.readText();
    const m = /acces=([A-Za-z0-9-]{12,14})/.exec(t);
    const c = normCode(m ? m[1] : t);
    return c.length === 12 ? c : null;
  }catch(e){ return null; }
}
export { fmtCode };
