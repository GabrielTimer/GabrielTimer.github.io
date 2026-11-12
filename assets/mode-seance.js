/* =========================================================
   Mode séance patient
   ---------------------------------------------------------
   Au cabinet, le kiné lance une séance puis prête la tablette au
   patient. Sur un appareil en mode kiné, la séance s'ouvre alors
   en « mode séance » :
   - plein écran, seulement le minuteur et les exercices ;
   - le bouton Retour d'Android ne quitte plus la séance ;
   - pour sortir (arrêter la séance ou revenir à l'espace kiné),
     il faut le code du kiné (4 chiffres, 7777 par défaut, modifiable) ;
   - en fin de séance, écran neutre « rendez la tablette ».
   Réglable dans Réglages du cabinet (activé par défaut).
   ========================================================= */

import { store, session, kineHint, openSheet, esc, icon, toast, verrou } from "./app.js";

const FLAG = "gt_mode_seance";          // sessionStorage : séance verrouillée en cours
const PIN = "gt_pin_seance";            // localStorage : empreinte du code
const OFF = "gt_mode_seance_off";       // localStorage : 1 = mode séance désactivé
export const PIN_DEFAUT = "7777";

/* ---------- Réglages ---------- */

export const reglage = {
  actifParDefaut: () => store.get(OFF) !== 1,
  setActifParDefaut: v => v ? store.del(OFF) : store.set(OFF, 1),
  pinPerso: () => !!store.get(PIN),           // false = code par défaut (7777)
  pinParDefaut: () => store.del(PIN)
};

async function empreinte(code){
  const data = new TextEncoder().encode("apikine|" + code);
  try{
    const buf = await crypto.subtle.digest("SHA-256", data);
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
  }catch(e){
    // Contexte sans crypto (rare) : simple brouillage
    let h = 0; for(const c of data) h = (h * 31 + c) >>> 0; return "x" + h;
  }
}

export async function enregistrerPin(code){ store.set(PIN, await empreinte(code)); }
async function pinCorrect(code){
  const perso = store.get(PIN);
  return perso ? perso === await empreinte(code) : code === PIN_DEFAUT;
}

/* ---------- Fenêtre de saisie du code ---------- */

function demanderCode({ title, texte, confirm = "Valider", annulable = true }){
  return new Promise(resolve => {
    let fini = false;
    const s = openSheet({
      title,
      body: `<p class="muted" style="margin-bottom:12px">${esc(texte)}</p>
        <div class="field"><input class="input" id="ms-pin" type="password" inputmode="numeric" pattern="[0-9]*"
          maxlength="4" autocomplete="off" placeholder="••••" style="font-size:2rem;letter-spacing:.6em;text-align:center"></div>
        <p class="muted" id="ms-err" style="color:var(--danger);min-height:1.4em"></p>`,
      foot: `${annulable ? `<button class="btn" type="button" data-close>Annuler</button>` : ""}<button class="btn primary" type="button" data-yes>${esc(confirm)}</button>`,
      onClose: () => { if(!fini) resolve(null); }
    });
    const input = s.el.querySelector("#ms-pin");
    const err = s.el.querySelector("#ms-err");
    if(!annulable){
      s.el.addEventListener("cancel", e => e.preventDefault(), true);
      s.el.querySelector("[data-close]")?.remove();
      s.el.querySelector(".sheet-head [data-close]")?.remove();
    }
    const ok = () => {
      const v = input.value.trim();
      if(!/^\d{4}$/.test(v)){ err.textContent = "Le code fait 4 chiffres."; input.focus(); return; }
      fini = true; resolve(v); s.close();
    };
    s.el.querySelector("[data-yes]").onclick = ok;
    input.addEventListener("keydown", e => { if(e.key === "Enter") ok(); });
    input.addEventListener("input", () => { err.textContent = ""; if(input.value.length === 4) ok(); });
    s.erreur = t => { err.textContent = t; };
    setTimeout(() => input.focus(), 30);
  });
}

/** Création du code (deux saisies identiques). Renvoie true si un code est enregistré. */
export async function creerPin(){
  const a = await demanderCode({
    title:"Nouveau code du mode séance",
    texte:"Choisissez un code à 4 chiffres. Il sera demandé pour arrêter une séance ou revenir à l'espace kiné quand la tablette est prêtée à un patient."
  });
  if(!a) return false;
  const b = await demanderCode({ title:"Confirmez le code", texte:"Saisissez le même code une deuxième fois." });
  if(!b) return false;
  if(a !== b){ toast("Les deux codes sont différents. Recommencez.", { type:"err" }); return false; }
  await enregistrerPin(a);
  toast("Code enregistré.");
  return true;
}

/** Demande le code du kiné. Renvoie true si le code est bon. */
export async function verifierPin(texte = "Saisissez le code du kiné."){
  for(let essai = 0; essai < 3; essai++){
    const v = await demanderCode({ title:"Réservé au kiné", texte: essai ? "Code incorrect. Réessayez." : texte });
    if(v === null) return false;
    if(await pinCorrect(v)) return true;
  }
  toast("Code incorrect.", { type:"err" });
  return false;
}

/* ---------- Activation / verrouillage ---------- */

export const actif = () => session.get(FLAG) === 1;

/**
 * À appeler au chargement du minuteur.
 * Active le mode séance si l'appareil est en mode kiné (et que l'option n'est pas coupée).
 * Renvoie true si le mode séance est actif.
 */
export async function demarrer({ apercu = false } = {}){
  if(!actif()){
    if(!kineHint.get() || !reglage.actifParDefaut()) return false;
    session.set(FLAG, 1);
  }
  verrou.fermer(location.href);   // l'espace kiné reste fermé, même dans un autre onglet
  verrouiller();
  return true;
}

let verrouille = false;
let pieges = 0;
function verrouiller(){
  if(verrouille) return;
  verrouille = true;
  document.body.classList.add("mode-seance");
  // Bouton Retour d'Android : on reste sur la page
  try{
    history.pushState({ modeSeance:1 }, "", location.href);
    addEventListener("popstate", () => {
      if(!actif()) return;
      history.pushState({ modeSeance:1 }, "", location.href);
      if(++pieges % 2 === 1) toast("Séance en cours : demandez au kiné pour quitter.");
    });
  }catch(e){}
  // Plein écran au premier appui (le navigateur l'exige)
  const plein = () => {
    if(!actif()) return;
    const d = document.documentElement;
    if(!document.fullscreenElement && d.requestFullscreen) d.requestFullscreen({ navigationUI:"hide" }).catch(() => {});
  };
  addEventListener("pointerdown", plein, { capture:true });
  document.addEventListener("visibilitychange", () => { if(document.visibilityState === "visible") document.body.classList.toggle("mode-seance", actif()); });
}

/** Sort du mode séance (après le code). Renvoie true si on peut quitter. */
export async function quitter(texte){
  if(!actif()) return true;
  if(!(await verifierPin(texte))) return false;
  terminer();
  return true;
}

/** Fin du mode séance sans code (appelé après vérification). */
export function terminer(){
  session.del(FLAG);
  verrou.ouvrir();
  document.body.classList.remove("mode-seance");
  try{ if(document.fullscreenElement) document.exitFullscreen(); }catch(e){}
}

/** Écran de fin neutre : rien de privé, retour au kiné par code. */
export function ecranFin(app, { titre = "Séance terminée", suite = "/index.html" } = {}){
  app.innerHTML = `
    <section class="done-screen stack" style="--gap:16px;padding-top:12vh;text-align:center">
      <div class="medal" style="margin:0 auto">${icon("check")}</div>
      <h1>${esc(titre)}</h1>
      <p class="muted" style="font-size:var(--fs-lg)">Bravo ! Vous pouvez rendre la tablette à votre kiné.</p>
      <button class="btn big" type="button" id="ms-kine" style="margin-top:12vh">${icon("lock")}Espace kiné</button>
    </section>`;
  app.querySelector("#ms-kine").onclick = async () => {
    if(await quitter("Saisissez le code du kiné pour revenir à l'espace kiné.")) location.href = suite;
  };
}
