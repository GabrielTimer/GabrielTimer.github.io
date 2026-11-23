/* Dictée vocale dans l'espace kiné (notes de séance, bilan, messages…).
   Quand une zone de texte a le curseur, un bouton « Dicter » apparaît en bas de l'écran :
   on parle, le texte s'écrit là où est le curseur. Reconnaissance vocale du navigateur
   (Chrome, Edge, Safari ; gratuite). Rien n'est enregistré à part le texte écrit.
   Pour exclure une zone : attribut data-no-dictee. */

const Reco = typeof window !== "undefined" && (window.SpeechRecognition || window.webkitSpeechRecognition);

let btn = null, cible = null, reco = null, ecoute = false, cacher = null;

const MIC = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21"/></svg>';

function eligible(el){
  return el && el.tagName === "TEXTAREA" && !el.readOnly && !el.disabled && !el.closest("[data-no-dictee]");
}

function bouton(){
  if(btn) return btn;
  btn = document.createElement("button");
  btn.type = "button";
  btn.className = "btn primary";
  btn.style.cssText = "position:fixed;right:max(16px,env(safe-area-inset-right));bottom:calc(var(--nav-h,68px) + 18px + env(safe-area-inset-bottom));z-index:150;display:none;gap:8px;align-items:center;box-shadow:0 6px 20px rgba(0,0,0,.18);border-radius:999px;min-height:48px;padding:0 18px";
  /* Garde le curseur dans la zone de texte quand on touche le bouton */
  btn.addEventListener("pointerdown", e => e.preventDefault());
  btn.addEventListener("mousedown", e => e.preventDefault());
  btn.onclick = () => ecoute ? arreter() : demarrer();
  document.body.append(btn);
  maj();
  return btn;
}

function maj(){
  if(!btn) return;
  btn.innerHTML = MIC + `<span>${ecoute ? "J'écoute… (toucher pour arrêter)" : "Dicter"}</span>`;
  btn.style.background = ecoute ? "var(--danger, #c0392b)" : "";
  btn.style.borderColor = ecoute ? "var(--danger, #c0392b)" : "";
  btn.setAttribute("aria-pressed", String(ecoute));
}

/* Insère le texte dicté à l'endroit du curseur, avec les espaces et majuscules qu'il faut */
function inserer(el, texte){
  if(!el || !texte) return;
  const debut = el.selectionStart ?? el.value.length, fin = el.selectionEnd ?? el.value.length;
  const avant = el.value.slice(0, debut), apres = el.value.slice(fin);
  let t = texte.trim();
  const finPhrase = !avant.trim() || /[.!?\n]\s*$/.test(avant);
  if(finPhrase) t = t.charAt(0).toUpperCase() + t.slice(1);
  if(avant && !/\s$/.test(avant)) t = " " + t;
  if(apres && !/^\s/.test(apres)) t = t + " ";
  el.value = avant + t + apres;
  const pos = (avant + t).length;
  try{ el.setSelectionRange(pos, pos); }catch(e){}
  el.dispatchEvent(new Event("input", { bubbles: true }));   // enregistrement automatique des pages
}

function demarrer(){
  if(!cible) return;
  try{
    reco = new Reco();
    reco.lang = "fr-FR";
    reco.continuous = true;
    reco.interimResults = false;
    reco.onresult = ev => {
      for(let i = ev.resultIndex; i < ev.results.length; i++){
        if(ev.results[i].isFinal) inserer(cible, ev.results[i][0].transcript);
      }
    };
    reco.onerror = ev => {
      if(ev.error === "not-allowed" || ev.error === "service-not-allowed"){
        import("./app.js").then(A => A.toast("Autorisez le micro pour ce site (icône à gauche de l'adresse, ou réglages du navigateur).", { type:"err", duration:7000 })).catch(() => {});
      }
    };
    reco.onend = () => { ecoute = false; maj(); };
    reco.start();
    ecoute = true; maj();
  }catch(e){ ecoute = false; maj(); }
}

function arreter(){
  try{ reco?.stop(); }catch(e){}
  ecoute = false; maj();
}

/* Place le bouton au-dessus des barres fixées en bas de l'écran (« Précédent / Suivant » du bilan,
   menu du bas sur téléphone), quelle que soit la taille de l'écran. */
function placer(){
  if(!btn || btn.style.display === "none") return;
  const H = window.innerHeight;
  let haut = H;   // bord haut de la barre la plus haute posée en bas de l'écran
  document.querySelectorAll(".g-foot, .nav, [data-barre-bas]").forEach(el => {
    const r = el.getBoundingClientRect();
    /* Seulement les barres basses (pas le menu latéral de la tablette, qui prend toute la hauteur) */
    if(r.height && r.height < H / 3 && r.bottom >= H - 2 && getComputedStyle(el).position === "fixed") haut = Math.min(haut, r.top);
  });
  if(haut === H){
    btn.style.bottom = "calc(18px + env(safe-area-inset-bottom))";
  }else{
    btn.style.bottom = `${Math.round(H - haut + 12)}px`;
  }
}

export function init(){
  if(!Reco || init.fait) return;
  init.fait = true;
  document.addEventListener("focusin", e => {
    if(!eligible(e.target)) return;
    clearTimeout(cacher);
    if(ecoute && cible !== e.target) arreter();
    cible = e.target;
    bouton().style.display = "inline-flex";
    placer();
  });
  window.addEventListener("resize", placer);
  window.visualViewport?.addEventListener("resize", placer);
  document.addEventListener("focusout", e => {
    if(e.target !== cible) return;
    /* Petit délai : le focus peut passer à une autre zone de texte */
    cacher = setTimeout(() => {
      if(eligible(document.activeElement)) return;
      if(ecoute) arreter();
      if(btn) btn.style.display = "none";
    }, 250);
  });
}
