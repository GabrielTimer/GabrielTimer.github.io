/* Bouton « Retour » pour les pages ouvertes à part (PDF, impression…).
   Dans l'application installée sur l'écran d'accueil, il n'y a pas de barre
   de navigation : sans ce bouton, impossible de revenir. Masqué à l'impression. */
(function(){
  var dansAppli = (window.matchMedia && matchMedia("(display-mode: standalone)").matches) || navigator.standalone === true;
  if(!dansAppli && !window.opener && history.length > 1) return;   // navigateur normal : boutons du navigateur
  function poser(){
    if(document.getElementById("gt-retour")) return;
    var b = document.createElement("button");
    b.id = "gt-retour"; b.type = "button";
    b.setAttribute("aria-label", "Retour");
    b.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5 8 12l7 7"/></svg><span>Retour</span>';
    b.style.cssText = "position:fixed;top:calc(10px + env(safe-area-inset-top));left:10px;z-index:9999;display:flex;align-items:center;gap:6px;padding:9px 14px 9px 10px;border-radius:999px;border:1px solid #D5E2E5;background:#fff;color:#14303A;font:600 15px/1 system-ui,-apple-system,Segoe UI,sans-serif;box-shadow:0 2px 10px rgba(11,40,50,.15);cursor:pointer";
    b.onclick = function(){
      if(window.opener){ try{ window.close(); }catch(e){} }
      if(history.length > 1){ history.back(); return; }
      location.href = "/index.html";
    };
    document.body.appendChild(b);
    var st = document.createElement("style");
    st.textContent = "@media print{#gt-retour{display:none!important}}";
    document.head.appendChild(st);
  }
  if(document.body) poser(); else document.addEventListener("DOMContentLoaded", poser);
})();
