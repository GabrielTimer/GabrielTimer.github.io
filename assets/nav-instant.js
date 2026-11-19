/* Menu de l'espace kiné affiché dès le tout début du chargement de la page.
   Copie du menu gardée par mountShell (app.js) la dernière fois : le menu reste ainsi
   à l'écran d'une page à l'autre, sans disparaître ni clignoter. mountShell le remplace
   ensuite par le vrai menu (identique), dans la même image. Script classique, volontairement
   minuscule et sans dépendance : il doit s'exécuter avant le premier affichage. */
(function(){
  try{
    var html = document.documentElement;
    /* Thème et taille du texte tout de suite (sinon appliqués un instant plus tard par app.js) */
    var theme = localStorage.getItem("gt_theme");
    try{ theme = JSON.parse(theme); }catch(e){}
    if(theme && theme !== "auto") html.setAttribute("data-theme", theme);
    var texte = localStorage.getItem("gt_text");
    try{ texte = JSON.parse(texte); }catch(e){}
    if(texte === "large") html.setAttribute("data-text", "large");

    if(/[?&]apercu/.test(location.search)) return;
    var kine = localStorage.getItem("gt_kine");
    if(kine !== "1") return;
    if(localStorage.getItem("gt_mode_patient") === "1") return;
    var c = JSON.parse(localStorage.getItem("gt_nav_kine") || "null");
    if(!c || !c.html || !c.pages) return;
    var chemin = location.pathname === "/" ? "/index.html" : location.pathname;
    if(!Object.prototype.hasOwnProperty.call(c.pages, chemin)) return;
    var actif = c.pages[chemin];
    var poser = function(){
      var body = document.body;
      if(!body) return false;
      if(document.getElementById("nav-instant")) return true;
      var t = document.createElement("div");
      t.innerHTML = c.html;
      var nav = t.firstElementChild;
      if(!nav) return true;
      nav.id = "nav-instant";
      if(actif){
        var a = nav.querySelector('[data-nav="' + actif + '"]');
        if(a) a.setAttribute("aria-current", "page");
      }
      body.classList.add("has-nav");
      body.appendChild(nav);
      return true;
    };
    if(!poser()){
      var mo = new MutationObserver(function(){ if(poser()) mo.disconnect(); });
      mo.observe(html, { childList:true, subtree:true });
    }
  }catch(e){ /* au pire, le menu arrive comme avant */ }
})();
