/* =========================================================
   Horaires du cabinet (Réglages du cabinet → Horaires)
   ---------------------------------------------------------
   settings.cabinet.horaires = {
     jours: [ dimanche, lundi, …, samedi ]   (index = Date.getDay())
            chaque jour : [ { lieu:"cabinet"|"domicile"|"ferme", de:"08:00", a:"12:00" }, … ] (2 créneaux : matin, après-midi)
     note: "Fermé les jours fériés…"
   }
   ========================================================= */

export const JOURS = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];
/** Ordre d'affichage : lundi → dimanche */
export const ORDRE = [1, 2, 3, 4, 5, 6, 0];
export const LIEUX = { cabinet:"Au cabinet", domicile:"Soins à domicile", ferme:"Fermé" };

const vide = () => [{ lieu:"ferme", de:"", a:"" }, { lieu:"ferme", de:"", a:"" }];

/** Horaires complets (7 jours × 2 créneaux), même si rien n'est encore saisi. */
export function normaliser(h){
  const jours = Array.isArray(h?.jours) ? h.jours : [];
  return {
    jours: [0, 1, 2, 3, 4, 5, 6].map(i => {
      const j = Array.isArray(jours[i]) ? jours[i] : [];
      return vide().map((v, k) => ({ ...v, ...(j[k] || {}) }));
    }),
    note: String(h?.note || "")
  };
}

const actif = c => c && c.lieu !== "ferme" && c.de && c.a;
const hm = s => String(s || "").replace(/^0(\d)/, "$1").replace(":", "h").replace(/h00$/, "h");

/** Y a-t-il au moins un créneau renseigné ? */
export function renseignes(h){
  const n = normaliser(h);
  return n.jours.some(j => j.some(actif)) || !!n.note.trim();
}

/** Texte d'un jour : « 8h – 12h, 14h – 19h (à domicile) » ou « Fermé ». */
export function texteJour(creneaux){
  const c = (creneaux || []).filter(actif);
  if(!c.length) return "Fermé";
  return c.map(x => `${hm(x.de)} – ${hm(x.a)}${x.lieu === "domicile" ? " (à domicile)" : ""}`).join(", ");
}

/** Où en est le cabinet maintenant : { lieu, a } pendant un créneau, sinon null. */
export function maintenant(h, d = new Date()){
  const n = normaliser(h);
  const t = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  return n.jours[d.getDay()].filter(actif).find(c => c.de <= t && t < c.a) || null;
}

/** Phrase d'état pour les patients. */
export function etat(h, d = new Date()){
  const c = maintenant(h, d);
  if(!c) return { cls:"ferme", texte:"Fermé en ce moment" };
  if(c.lieu === "domicile") return { cls:"domicile", texte:`En soins à domicile jusqu'à ${hm(c.a)} : laissez un message` };
  return { cls:"ouvert", texte:`Ouvert jusqu'à ${hm(c.a)}` };
}

/** Lignes à afficher, jours consécutifs identiques regroupés : [{ jours:"Lundi – Vendredi", texte, domicile }]. */
export function lignes(h){
  const n = normaliser(h), out = [];
  ORDRE.forEach(i => {
    const texte = texteJour(n.jours[i]), last = out[out.length - 1];
    if(last && last.texte === texte){ last.fin = i; return; }
    out.push({ debut:i, fin:i, texte, domicile: n.jours[i].some(c => actif(c) && c.lieu === "domicile") });
  });
  return out.map(l => ({ ...l, jours: l.debut === l.fin ? JOURS[l.debut] : `${JOURS[l.debut]} – ${JOURS[l.fin]}` }));
}
