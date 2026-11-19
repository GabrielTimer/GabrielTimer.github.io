/* Recherche IA de l'espace kiné : appel direct à Google Gemini (offre gratuite) depuis le navigateur.
   La clé est créée par le titulaire sur aistudio.google.com (sans carte bancaire, donc jamais facturée)
   et rangée dans acces/ia : lisible par les kinés du cabinet seulement, jamais dans le code public. */

import { store } from "./app.js";

const LOCAL = "gt_ia_cle";
const DERNIER = "gt_ia_modele";
/* Modèles gratuits, du meilleur au plus léger : si l'un est indisponible ou à court de quota, on passe au suivant */
const MODELES = ["gemini-flash-latest", "gemini-flash-lite-latest", "gemini-2.5-flash", "gemini-2.5-flash-lite"];
const API = "https://generativelanguage.googleapis.com/v1beta/models/";

export const LIEN_CLE = "https://aistudio.google.com/apikey";

/* ---------- Clé ---------- */

/** Clé enregistrée (copie locale d'abord, puis celle du cabinet si elle a changé). */
export async function getCle(){
  const local = store.get(LOCAL, "") || "";
  try{
    const C = await import("./cloud.js");
    const d = await C.getIA();
    const cle = String(d?.cle || "");
    if(cle !== local){ if(cle) store.set(LOCAL, cle); else store.del(LOCAL); }
    return cle;
  }catch(e){
    return local;   // hors connexion : la copie de cet appareil
  }
}

export async function setCle(cle){
  const C = await import("./cloud.js");
  await C.saveIA({ cle: cle || "" });
  if(cle) store.set(LOCAL, cle); else store.del(LOCAL);
}

/* ---------- Erreurs lisibles ---------- */

export class ErreurIA extends Error{
  constructor(type, message){ super(message); this.type = type; }
}
const MSG = {
  cle: "La clé Gemini n'est pas valide. Vérifiez-la dans les réglages de la recherche IA.",
  refus: "Google refuse cette clé. Recréez-en une sur aistudio.google.com, dans un projet sans facturation.",
  jeton: "Google refuse pour l'instant cette clé de nouveau format (« AQ. ») : erreur connue chez Google sur certains comptes. Créez une nouvelle clé dans AI Studio, ou réessayez plus tard.",
  delai: "Google met trop de temps à répondre. Réessayez dans un instant.",
  quota: "Le quota gratuit de Google est atteint pour le moment. Réessayez dans une minute (ou demain si la limite du jour est atteinte).",
  reseau: "Pas de connexion internet : la recherche IA a besoin du réseau.",
  bloque: "Google n'a pas voulu répondre à cette question. Reformulez-la.",
  vide: "Google n'a renvoyé aucune réponse. Réessayez.",
  autre: "La recherche IA n'a pas abouti. Réessayez dans un instant."
};

async function appel(modele, cle, body){
  let r;
  const ctrl = new AbortController();
  const minuteur = setTimeout(() => ctrl.abort(), 45000);
  try{
    r = await fetch(`${API}${modele}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": cle },
      body: JSON.stringify(body),
      signal: ctrl.signal
    });
  }catch(e){ throw e.name === "AbortError" ? new ErreurIA("delai", MSG.delai) : new ErreurIA("reseau", MSG.reseau); }
  finally{ clearTimeout(minuteur); }
  if(r.ok) return r.json();
  let err = {};
  try{ err = (await r.json()).error || {}; }catch(e){}
  const txt = `${err.status || ""} ${err.message || ""}`.toLowerCase();
  if(r.status === 429 || txt.includes("resource_exhausted")) throw new ErreurIA("quota", MSG.quota);
  if(txt.includes("access_token_type_unsupported")) throw new ErreurIA("jeton", MSG.jeton);
  if(r.status === 401) throw new ErreurIA("cle", MSG.cle);
  if(txt.includes("api_key_invalid") || txt.includes("api key not valid")) throw new ErreurIA("cle", MSG.cle);
  if(r.status === 404 || txt.includes("not found") || txt.includes("is not supported")) throw new ErreurIA("modele", err.message || "modèle indisponible");
  if(r.status === 403 || txt.includes("permission")) throw new ErreurIA("refus", MSG.refus);
  if(r.status === 400 && (txt.includes("tool") || txt.includes("search") || txt.includes("grounding"))) throw new ErreurIA("outil", err.message || "outil indisponible");
  if(r.status >= 500) throw new ErreurIA("serveur", MSG.autre);
  throw new ErreurIA("autre", err.message ? `${MSG.autre} (${err.message})` : MSG.autre);
}

/**
 * Pose une question à Gemini.
 * json : réponse au format JSON ; web : recherche Google pour appuyer la réponse (sources renvoyées).
 * Renvoie { texte, sources:[{ titre, url }], modele, web }.
 */
export async function demander({ cle, systeme = "", texte, json = false, web = false, temperature = 0.3 }){
  if(!cle) throw new ErreurIA("cle", MSG.cle);
  const ordre = [...new Set([store.get(DERNIER, ""), ...MODELES].filter(Boolean))];
  let derniere = null;
  for(const modele of ordre){
    let avecWeb = web;
    for(let essai = 0; essai < 2; essai++){
      const body = {
        ...(systeme ? { systemInstruction: { parts: [{ text: systeme }] } } : {}),
        contents: [{ role: "user", parts: [{ text: texte }] }],
        generationConfig: { temperature, ...(json ? { responseMimeType: "application/json" } : {}) },
        ...(avecWeb ? { tools: [{ google_search: {} }] } : {})
      };
      try{
        const d = await appel(modele, cle, body);
        const c = d.candidates?.[0];
        if(!c){
          if(d.promptFeedback?.blockReason) throw new ErreurIA("bloque", MSG.bloque);
          throw new ErreurIA("vide", MSG.vide);
        }
        const out = (c.content?.parts || []).map(p => p.text || "").join("").trim();
        if(!out) throw new ErreurIA(c.finishReason === "SAFETY" ? "bloque" : "vide", c.finishReason === "SAFETY" ? MSG.bloque : MSG.vide);
        const vus = new Set();
        const sources = (c.groundingMetadata?.groundingChunks || []).map(g => g.web).filter(w => w?.uri)
          .filter(w => { const k = w.title || w.uri; if(vus.has(k)) return false; vus.add(k); return true; })
          .map(w => ({ titre: w.title || w.uri, url: w.uri }));
        store.set(DERNIER, modele);
        return { texte: out, sources, modele, web: avecWeb };
      }catch(e){
        if(!(e instanceof ErreurIA)) throw e;
        derniere = e;
        /* Recherche Google refusée pour ce modèle : même question sans elle */
        if(e.type === "outil" && avecWeb){ avecWeb = false; continue; }
        if(["cle", "refus", "reseau", "bloque", "jeton"].includes(e.type)) throw e;
        break;   // modèle indisponible ou quota épuisé : modèle suivant
      }
    }
  }
  if(derniere?.type === "modele" || derniere?.type === "outil") throw new ErreurIA("autre", MSG.autre);
  throw derniere || new ErreurIA("autre", MSG.autre);
}

/** Lit une réponse JSON, même entourée de ```json … ```. */
export function lireJSON(texte){
  const t = String(texte || "").trim().replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "");
  try{ return JSON.parse(t); }catch(e){}
  const a = t.indexOf("{"), b = t.lastIndexOf("}");
  if(a >= 0 && b > a){ try{ return JSON.parse(t.slice(a, b + 1)); }catch(e){} }
  return null;
}

/** Vérifie une clé avec une toute petite question. */
export async function testerCle(cle){
  await demander({ cle, texte: "Réponds seulement : OK", temperature: 0 });
  return true;
}
