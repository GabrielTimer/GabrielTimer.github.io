/* =========================================================
   Smileys pour la messagerie : un bouton qui ouvre une petite grille
   et insère le smiley à l'endroit du curseur.
   ========================================================= */

export const SMILEYS = [
  "😀", "😊", "🙂", "😉", "😅", "😂", "🥰", "😍",
  "🤔", "😐", "😕", "😟", "😢", "😣", "😴", "🤒",
  "👍", "👎", "👏", "🙏", "💪", "👌", "✌️", "👋",
  "❤️", "⭐", "🔥", "✅", "❌", "⚠️", "🎉", "🏃",
];

let styleAjoute = false;
function ajouterStyle(){
  if(styleAjoute) return;
  styleAjoute = true;
  const st = document.createElement("style");
  st.textContent = `
    .smil-wrap{ position:relative; display:inline-flex; }
    .smil-btn{ font-size:20px; line-height:1; }
    .smil-pop{ position:absolute; bottom:calc(100% + 8px); left:0; z-index:60; display:grid; grid-template-columns:repeat(8, 36px); gap:2px; padding:8px; background:var(--surface); border:1px solid var(--line); border-radius:14px; box-shadow:0 12px 32px rgba(0,0,0,.18); }
    .smil-pop[hidden]{ display:none; }
    .smil-pop button{ width:36px; height:36px; border:0; background:none; border-radius:8px; font-size:22px; line-height:1; cursor:pointer; padding:0; }
    .smil-pop button:hover, .smil-pop button:focus-visible{ background:var(--surface-2); }
    @media (max-width:420px){ .smil-pop{ grid-template-columns:repeat(8, 32px); } .smil-pop button{ width:32px; height:32px; font-size:20px; } }
  `;
  document.head.appendChild(st);
}

/** Insère du texte à la position du curseur dans un champ. */
export function insererTexte(champ, texte){
  const debut = champ.selectionStart ?? champ.value.length;
  const fin = champ.selectionEnd ?? champ.value.length;
  champ.value = champ.value.slice(0, debut) + texte + champ.value.slice(fin);
  const pos = debut + texte.length;
  champ.focus();
  try{ champ.setSelectionRange(pos, pos); }catch(e){}
  champ.dispatchEvent(new Event("input", { bubbles:true }));
}

/**
 * Ajoute un bouton « smiley » relié au champ de texte.
 * place : élément après lequel (ou dans lequel, si dedans=true) le bouton est mis.
 * vers : "haut" (par défaut) ou "bas" pour l'ouverture de la grille.
 */
export function ajouterSmileys(champ, place, { dedans = false, vers = "haut" } = {}){
  if(!champ || !place) return null;
  ajouterStyle();
  const wrap = document.createElement("span");
  wrap.className = "smil-wrap";
  wrap.innerHTML = `<button class="icon-btn smil-btn" type="button" aria-label="Ajouter un smiley" aria-expanded="false">🙂</button>
    <div class="smil-pop" role="dialog" aria-label="Smileys" hidden>${SMILEYS.map(s => `<button type="button" data-s="${s}" aria-label="${s}">${s}</button>`).join("")}</div>`;
  const btn = wrap.querySelector(".smil-btn");
  const pop = wrap.querySelector(".smil-pop");
  if(vers === "bas"){ pop.style.bottom = "auto"; pop.style.top = "calc(100% + 8px)"; }
  const fermer = () => { pop.hidden = true; btn.setAttribute("aria-expanded", "false"); };
  btn.addEventListener("click", e => {
    e.preventDefault();
    pop.hidden = !pop.hidden;
    btn.setAttribute("aria-expanded", String(!pop.hidden));
  });
  pop.addEventListener("click", e => {
    const b = e.target.closest("[data-s]");
    if(!b) return;
    insererTexte(champ, b.dataset.s);
    fermer();
  });
  document.addEventListener("click", e => { if(!wrap.contains(e.target)) fermer(); });
  wrap.addEventListener("keydown", e => { if(e.key === "Escape"){ fermer(); btn.focus(); } });
  if(dedans) place.appendChild(wrap); else place.after(wrap);
  return wrap;
}
