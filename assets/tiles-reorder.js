/* =========================================================
   Tuiles de l'accueil rangeables comme les icônes d'un téléphone
   ---------------------------------------------------------
   - appui long (≈ 0,45 s) sur une tuile : mode rangement, les tuiles
     frétillent et celle sous le doigt se soulève ;
   - glisser : les autres tuiles s'écartent en douceur (animation FLIP) ;
   - « Terminé » ou toucher à côté : fin du rangement ;
   - l'ordre est gardé sur l'appareil et, si load/save sont fournis,
     dans le compte (même ordre sur tous les appareils).
   Chaque tuile porte data-tile="identifiant".
   ========================================================= */

const LONG_PRESS = 450;      // ms
const MOVE_TOLERANCE = 10;   // px avant l'appui long : au-delà, c'est un défilement
const ANIM = 260;            // ms

function readOrder(key){ try{ return JSON.parse(localStorage.getItem(key) || "null"); }catch(e){ return null; } }
function writeOrder(key, ids){ try{ localStorage.setItem(key, JSON.stringify(ids)); }catch(e){} }
function clearOrder(key){ try{ localStorage.removeItem(key); }catch(e){} }

export function enableTileReorder(grid, { key = "gt_home_tiles", onEdit = null, load = null, save = null } = {}){
  if(!grid) return null;
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const tiles = () => [...grid.querySelectorAll(":scope > [data-tile]")];
  const defaultOrder = tiles().map(t => t.dataset.tile);

  /* Ordre enregistré (les tuiles ajoutées plus tard vont à la fin) */
  function applyOrder(ids){
    if(!Array.isArray(ids) || !ids.length) return;
    const map = new Map(tiles().map(t => [t.dataset.tile, t]));
    ids.forEach(id => { const t = map.get(id); if(t){ grid.appendChild(t); map.delete(id); } });
    map.forEach(t => grid.appendChild(t));
  }
  const fromAccount = load?.();
  applyOrder(Array.isArray(fromAccount) && fromAccount.length ? fromAccount : readOrder(key));
  function persist(ids){
    ids ? writeOrder(key, ids) : clearOrder(key);
    try{ Promise.resolve(save?.(ids || [])).catch(() => {}); }catch(e){}
  }

  /* Barre du mode rangement */
  const bar = document.createElement("div");
  bar.className = "tiles-edit-bar";
  bar.innerHTML = `<span>Glissez pour ranger</span>
    <button class="btn sm" type="button" data-reset>Par défaut</button>
    <button class="btn sm primary" type="button" data-done>Terminé</button>`;
  grid.before(bar);

  let editing = false;
  let press = null;   // appui en attente
  let drag = null;    // tuile en cours de déplacement
  let scrollRaf = 0;

  function startEdit(){
    if(editing) return;
    editing = true;
    grid.classList.add("editing");
    bar.classList.add("show");
    tiles().forEach((t, i) => t.style.setProperty("--wd", `${(i % 3) * -0.09}s`));
    onEdit?.(true);
  }
  function stopEdit(){
    if(!editing || drag) return;
    editing = false;
    grid.classList.remove("editing");
    bar.classList.remove("show");
    onEdit?.(false);
  }

  /* Position « naturelle » (sans transform) d'une tuile, en coordonnées écran */
  function natural(el){
    const g = grid.getBoundingClientRect();
    return { x: g.left + el.offsetLeft, y: g.top + el.offsetTop, w: el.offsetWidth, h: el.offsetHeight };
  }

  /* Déplace la tuile dans la grille en animant les autres (FLIP) */
  function moveTo(el, target, before){
    const others = tiles().filter(t => t !== el);
    const first = new Map(others.map(t => [t, t.getBoundingClientRect()]));
    before ? grid.insertBefore(el, target) : grid.insertBefore(el, target.nextSibling);
    if(reduce) return;
    others.forEach(t => {
      const a = first.get(t), b = natural(t);
      const dx = a.left - b.x, dy = a.top - b.y;
      if(!dx && !dy) return;
      t.style.transition = "none";
      t.style.transform = `translate(${dx}px,${dy}px)`;
    });
    grid.offsetWidth; // applique la position de départ
    others.forEach(t => {
      if(!t.style.transform) return;
      t.style.transition = `transform ${ANIM}ms cubic-bezier(.2,.8,.2,1)`;
      t.style.transform = "";
      clearTimeout(t._flip);
      t._flip = setTimeout(() => { t.style.transition = ""; }, ANIM + 30);
    });
  }

  function placeDragged(){
    if(!drag) return;
    const n = natural(drag.el);
    drag.el.style.transform = `translate(${drag.px - drag.gx - n.x}px,${drag.py - drag.gy - n.y}px) scale(1.06)`;
  }

  /* Tuile sous le doigt → nouvelle place */
  function hitTest(){
    const { el, px, py } = drag;
    const list = tiles();
    for(const t of list){
      if(t === el) continue;
      const r = natural(t);
      if(px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h){
        const from = list.indexOf(el), to = list.indexOf(t);
        moveTo(el, t, to < from);
        placeDragged();
        return;
      }
    }
  }

  /* Défilement automatique près des bords pendant le déplacement */
  function autoScroll(){
    scrollRaf = 0;
    if(!drag) return;
    const nav = document.querySelector(".nav");
    const bottomEdge = innerHeight - (nav && getComputedStyle(nav).position === "fixed" && nav.getBoundingClientRect().top > innerHeight / 2 ? innerHeight - nav.getBoundingClientRect().top : 0);
    let dy = 0;
    if(drag.py < 70) dy = -Math.ceil((70 - drag.py) / 6);
    else if(drag.py > bottomEdge - 70) dy = Math.ceil((drag.py - (bottomEdge - 70)) / 6);
    if(dy){
      scrollBy(0, dy);
      placeDragged(); hitTest();
      scrollRaf = requestAnimationFrame(autoScroll);
    }
  }

  function beginDrag(el, x, y){
    const n = natural(el);
    drag = { el, gx: x - n.x, gy: y - n.y, px: x, py: y };
    el.classList.add("dragging");
    el.style.transition = reduce ? "none" : "transform .15s ease";
    placeDragged();
    setTimeout(() => { if(drag && drag.el === el) el.style.transition = "none"; }, 160);
    navigator.vibrate?.(12);
  }

  function endDrag(){
    if(!drag) return;
    const el = drag.el;
    drag = null;
    cancelAnimationFrame(scrollRaf); scrollRaf = 0;
    el.style.transition = reduce ? "none" : `transform ${ANIM}ms cubic-bezier(.2,.8,.2,1)`;
    el.style.transform = "";
    setTimeout(() => { el.classList.remove("dragging"); el.style.transition = ""; }, reduce ? 0 : ANIM);
    persist(tiles().map(t => t.dataset.tile));
  }

  grid.addEventListener("pointerdown", e => {
    if(e.button > 0) return;
    const el = e.target.closest("[data-tile]");
    if(!el || drag) return;
    if(editing){
      // En mode rangement : on attrape directement
      press = { el, x: e.clientX, y: e.clientY, id: e.pointerId, armed: true };
      return;
    }
    press = { el, x: e.clientX, y: e.clientY, id: e.pointerId, armed: false };
    el.classList.add("pressing");
    press.timer = setTimeout(() => {
      if(!press || press.el !== el) return;
      el.classList.remove("pressing");
      startEdit();
      press.armed = true;
      beginDrag(el, press.x, press.y);
    }, LONG_PRESS);
  });

  addEventListener("pointermove", e => {
    if(drag && e.pointerId === press?.id){
      drag.px = e.clientX; drag.py = e.clientY;
      placeDragged(); hitTest();
      if(!scrollRaf) scrollRaf = requestAnimationFrame(autoScroll);
      return;
    }
    if(!press || e.pointerId !== press.id) return;
    const moved = Math.hypot(e.clientX - press.x, e.clientY - press.y);
    if(press.armed && !drag && moved > 4){ beginDrag(press.el, press.x, press.y); drag.px = e.clientX; drag.py = e.clientY; placeDragged(); return; }
    if(!press.armed && moved > MOVE_TOLERANCE){ clearTimeout(press.timer); press.el.classList.remove("pressing"); press = null; }
  }, { passive: true });

  const release = e => {
    if(!press || (e && e.pointerId !== press.id)) return;
    clearTimeout(press.timer);
    press.el.classList.remove("pressing");
    press = null;
    endDrag();
  };
  addEventListener("pointerup", release);
  addEventListener("pointercancel", release);

  /* Empêche le défilement de la page pendant le déplacement (tactile) */
  document.addEventListener("touchmove", e => { if(drag || (editing && press)) e.preventDefault(); }, { passive: false });

  /* Pas d'ouverture de la tuile ni de menu contextuel pendant le rangement */
  grid.addEventListener("click", e => {
    if(editing){ e.preventDefault(); e.stopImmediatePropagation(); }
  }, true);
  grid.addEventListener("contextmenu", e => { if(e.target.closest("[data-tile]")) e.preventDefault(); });

  /* Sortie du mode rangement */
  bar.querySelector("[data-done]").onclick = () => stopEdit();
  bar.querySelector("[data-reset]").onclick = () => {
    const map = new Map(tiles().map(t => [t.dataset.tile, t]));
    const before = new Map(tiles().map(t => [t, t.getBoundingClientRect()]));
    defaultOrder.forEach(id => { const t = map.get(id); if(t) grid.appendChild(t); });
    persist(defaultOrder.slice());
    if(!reduce) tiles().forEach(t => {
      const a = before.get(t), b = natural(t);
      t.style.transition = "none"; t.style.transform = `translate(${a.left - b.x}px,${a.top - b.y}px)`;
      grid.offsetWidth;
      t.style.transition = `transform ${ANIM + 80}ms cubic-bezier(.2,.8,.2,1)`; t.style.transform = "";
      setTimeout(() => { t.style.transition = ""; }, ANIM + 120);
    });
  };
  document.addEventListener("pointerdown", e => {
    if(editing && !drag && !e.target.closest("[data-tile], .tiles-edit-bar")) stopEdit();
  });
  document.addEventListener("keydown", e => { if(e.key === "Escape") stopEdit(); });

  /* Ordre reçu d'un autre appareil : appliqué si on n'est pas en train de ranger */
  return {
    refresh(ids){
      if(editing || drag || !Array.isArray(ids)) return;
      const cur = tiles().map(t => t.dataset.tile).join();
      applyOrder(ids.length ? ids : defaultOrder);
      if(tiles().map(t => t.dataset.tile).join() !== cur) ids.length ? writeOrder(key, ids) : clearOrder(key);
    }
  };
}
