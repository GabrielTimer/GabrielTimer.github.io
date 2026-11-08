/* =========================================================
   Horaires du cabinet (Réglages du cabinet → Horaires)
   ---------------------------------------------------------
   settings.cabinet.horaires = {
     jours: { "0": dimanche, "1": lundi, …, "6": samedi }   (clé = Date.getDay() ; objet et non liste : Firebase refuse les listes de listes)
            chaque jour : [ { lieu:"cabinet"|"domicile"|"ferme", de:"08:00", a:"12:00" }, … ] (2 créneaux : matin, après-midi)
     note: "Fermé les jours fériés…"
   }
   ========================================================= */

import { icon } from "./icons.js";

export const JOURS = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];
/** Ordre d'affichage : lundi → dimanche */
export const ORDRE = [1, 2, 3, 4, 5, 6, 0];
export const LIEUX = { cabinet:"Au cabinet", domicile:"Soins à domicile", ferme:"Fermé" };

const vide = () => [{ lieu:"ferme", de:"", a:"" }, { lieu:"ferme", de:"", a:"" }];

/** Horaires complets (7 jours × 2 créneaux), même si rien n'est encore saisi. */
export function normaliser(h){
  const jours = h?.jours && typeof h.jours === "object" ? h.jours : {};
  return {
    jours: [0, 1, 2, 3, 4, 5, 6].map(i => {
      const j = Array.isArray(jours[i]) ? jours[i] : Array.isArray(jours[String(i)]) ? jours[String(i)] : [];
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

/* ---------- Affichage commun (accueil patient et page publique du cabinet) ---------- */
const escH = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;" }[c]));
const COURT = ["Dim.", "Lun.", "Mar.", "Mer.", "Jeu.", "Ven.", "Sam."];

/** Tableau des horaires : un jour par ligne (aujourd'hui mis en avant), un créneau par pastille. */
export function tableauHTML(h, d = new Date()){
  const n = normaliser(h), auj = d.getDay();
  const jours = ORDRE.map(i => {
    const c = n.jours[i].filter(actif);
    const slots = c.length
      ? c.map(x => `<span class="hs ${x.lieu}"${x.lieu === "domicile" ? ' title="Soins à domicile"' : ""}>${x.lieu === "domicile" ? icon("home") : ""}${escH(hm(x.de))} – ${escH(hm(x.a))}</span>`).join("")
      : `<span class="hs ferme">Fermé</span>`;
    return `<div class="hd-row${i === auj ? " auj" : ""}${c.length ? "" : " ferme"}"><span class="hd"><span class="hd-l">${JOURS[i]}</span><span class="hd-c">${COURT[i]}</span>${i === auj ? `<small>Aujourd'hui</small>` : ""}</span><span class="hd-slots">${slots}</span></div>`;
  }).join("");
  const note = n.note.trim();
  const dom = n.jours.some(j => j.some(c => actif(c) && c.lieu === "domicile"));
  const legende = dom ? `<p class="hor-leg"><span class="hs domicile">${icon("home")}</span>Soins à domicile : cabinet fermé, laissez un message</p>` : "";
  return `<div class="hor-tab">${jours}</div>${legende}${note ? `<p class="hor-note">${escH(note).replace(/\n/g, "<br>")}</p>` : ""}`;
}
