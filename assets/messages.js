/* =========================================================
   Messagerie : ce que les patients écrivent au kiné
   ---------------------------------------------------------
   Deux sources, réunies dans une seule boîte :
   - les messages (« Écrire à mon kiné », bilans de programme),
     enregistrés dans patients/{code}/messages ;
   - les commentaires laissés en fin de séance.
   ========================================================= */

const DAY = 864e5;
/** Les commentaires plus anciens sont considérés comme déjà lus. */
export const COMMENT_WINDOW = 30 * DAY;
const CACHE_KEY = "gt_inbox_unread";
const CACHE_TTL = 3 * 60 * 1000;

function seanceNom(s){
  return s.programmeNom || s.data?.nom || s.label || s.nom || "Séance";
}

/**
 * Réunit messages et commentaires, du plus récent au plus ancien.
 * patients : liste des patients (pour ne garder que les patients existants).
 */
export function buildInbox({ patients = [], messages = [], seances = [] }){
  const known = new Map(patients.map(p => [p.cle, p]));
  const now = Date.now();
  const items = [];
  messages.forEach(m => {
    if(!known.has(m.cle)) return;
    items.push({
      kind: "message", key: `m:${m.cle}:${m.id}`, id: m.id, cle: m.cle, patient: known.get(m.cle),
      type: m.type || "message", date: m.date || 0, sujet: m.sujet || "", texte: m.texte || "", lu: !!m.lu
    });
  });
  seances.forEach(s => {
    if(!s.commentaire || !s.terminee || !known.has(s.cle)) return;
    const date = s.dateValidation || 0;
    items.push({
      kind: "commentaire", key: `c:${s.cle}:${s.id}`, id: s.id, cle: s.cle, patient: known.get(s.cle),
      type: "commentaire", date, sujet: seanceNom(s), texte: s.commentaire,
      eva: s.eva, ressenti: s.ressenti,
      lu: !!s.commentaireLu || now - date > COMMENT_WINDOW
    });
  });
  return items.sort((a, b) => b.date - a.date);
}

export async function loadInbox(C){
  const [patients, messages, seances] = await Promise.all([
    C.listPatients(),
    C.listAllMessages().catch(err => { console.warn("Messages :", err); return null; }),
    C.listAllSeances()
  ]);
  const items = buildInbox({ patients, messages: messages || [], seances });
  setUnreadCache(items.filter(i => !i.lu).length);
  return { items, patients, rulesMissing: messages === null };
}

/** Marque un élément comme lu (ou non lu). */
export async function setRead(C, item, lu = true){
  if(item.kind === "message") await C.setMessageLu(item.cle, item.id, lu);
  else await C.setCommentaireLu(item.cle, item.id, lu);
  item.lu = lu;
}

/* ---------- Pastille du nombre de messages non lus ---------- */

export function setUnreadCache(n){
  try{ sessionStorage.setItem(CACHE_KEY, JSON.stringify({ n, t: Date.now() })); }catch(e){}
  paintBadges(n);
}

function readCache(){
  try{
    const c = JSON.parse(sessionStorage.getItem(CACHE_KEY) || "null");
    if(c && Date.now() - c.t < CACHE_TTL) return c.n;
  }catch(e){}
  return null;
}

export function paintBadges(n){
  document.querySelectorAll("[data-inbox-badge]").forEach(b => {
    b.textContent = n > 99 ? "99+" : String(n);
    b.hidden = !n;
  });
  document.querySelectorAll("[data-inbox-link]").forEach(a => {
    a.setAttribute("aria-label", n ? `Messages des patients, ${n} non lu${n > 1 ? "s" : ""}` : "Messages des patients");
  });
}

/** Met à jour la pastille (cache de quelques minutes pour éviter de tout relire à chaque page). */
export async function refreshUnread({ force = false } = {}){
  const cached = force ? null : readCache();
  if(cached !== null){ paintBadges(cached); return cached; }
  try{
    const C = await import("./cloud.js");
    const { items } = await loadInbox(C);
    return items.filter(i => !i.lu).length;
  }catch(e){ return 0; }
}

export const TYPE_LABEL = { message: "Message", bilan: "Bilan de programme", commentaire: "Commentaire de séance" };
export const TYPE_ICON = { message: "mail", bilan: "chart", commentaire: "message" };
