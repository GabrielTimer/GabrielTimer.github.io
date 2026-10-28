/* =========================================================
   Classement des exercices pour les filtres de la bibliothèque :
   - zone du corps (Épaule, Dos, Genou…)
   - pathologies principales (les ~430 intitulés d'origine, souvent en
     doublon ou en abrégé anglais, sont regroupés en une quarantaine)
   - type d'exercice (renforcement, étirement, équilibre…)
   ========================================================= */

const norm = s => String(s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

export const ZONES = ["Cervicales", "Épaule", "Coude", "Poignet et main", "Dos", "Tronc", "Hanche", "Genou", "Cheville et pied", "Corps entier"];

/* Anciennes « catégories » qui ne sont pas des zones du corps */
const CAT_VERS_ZONE = {
  "gainage": "Tronc", "post-partum": "Tronc", "pubalgie": "Hanche", "adducteurs": "Hanche", "fessiers": "Hanche",
  "lombalgie": "Dos", "cheville": "Cheville et pied", "pied": "Cheville et pied", "main": "Poignet et main", "poignet": "Poignet et main",
  "cou": "Cervicales", "nuque": "Cervicales", "rachis": "Dos", "abdominaux": "Tronc", "perinee": "Tronc", "perinee ": "Tronc"
};
const CAT_VERS_TYPE = {
  "gainage": "Gainage", "equilibre": "Équilibre et proprioception", "proprioception": "Équilibre et proprioception",
  "respiration": "Respiration", "cardio": "Cardio", "controle moteur": "Contrôle moteur", "ludique": "Ludique",
  "fauteuil": "Au fauteuil (seniors)", "cabinet": "Au cabinet"
};
const MODE_VERS_TYPE = {
  "renforcement": "Renforcement", "etirement": "Étirement", "mobilite": "Mobilité", "proprioception": "Équilibre et proprioception",
  "equilibre": "Équilibre et proprioception", "gainage": "Gainage", "respiration": "Respiration", "isometrique": "Isométrique",
  "statique": "Isométrique", "pnf": "Étirement"
};
export const TYPES = ["Renforcement", "Étirement", "Mobilité", "Gainage", "Équilibre et proprioception", "Isométrique", "Respiration", "Cardio", "Contrôle moteur", "Au fauteuil (seniors)", "Ludique", "Au cabinet"];

/* Pathologies principales : [nom affiché, zone, motif reconnu dans les intitulés d'origine] */
export const PATHOLOGIES = [
  ["Cervicalgie", "Cervicales", /cervicalg|douleur (au|du) cou|douleur cervicale|torticolis|whiplash|coup du lapin|arthrose cervicale|cervicarthrose/],
  ["Névralgie cervico-brachiale", "Cervicales", /cervico-?brachial|\bncb\b|radiculopathie cervicale/],
  ["Tendinopathie de la coiffe / conflit", "Épaule", /coiffe|\brtc\b|sous-?acromial|impingement|conflit.*epaule|tendinopathie (d'|de l')epaule|tendinite.*epaule|bursite (d'|de l'|sous-?acromiale|.*epaule)|sus-?epineux/],
  ["Capsulite rétractile", "Épaule", /capsulite|epaule gelee|frozen/],
  ["Tendinopathie du biceps", "Épaule", /biceps/],
  ["Instabilité / luxation d'épaule", "Épaule", /instabilite.*epaule|luxation.*epaule|bankart|labr.*epaule|slap/],
  ["Arthrose / prothèse d'épaule", "Épaule", /arthrose gleno|omarthrose|prothese.*epaule|arthroplastie.*epaule/],
  ["Épicondylite (tennis elbow)", "Coude", /epicondyl|tennis elbow|coude du tennis|bursite.*coude|tendon du coude|triceps/],
  ["Épitrochléite (golf elbow)", "Coude", /epitrochl|golf(eur)? elbow|coude du golf/],
  ["Canal carpien", "Poignet et main", /canal carpien|carpal/],
  ["Tendinite de De Quervain", "Poignet et main", /quervain/],
  ["Arthrose de la main / rhizarthrose", "Poignet et main", /rhizarthr|arthrose (de la |du |des )?(main|pouce|doigt|poignet)/],
  ["Fracture du poignet", "Poignet et main", /fracture.*(poignet|radius|pouteau)/],
  ["Lombalgie", "Dos", /lombalg|douleurs? lombaire|douleurs? dorsale|mal de dos|\blbp\b|lumbago|dorsalg/],
  ["Hernie discale", "Dos", /hernie|\bhnp\b|discal|discopathie|\bddd\b/],
  ["Sciatique / radiculalgie", "Dos", /sciat|sciath|radicul|cruralg/],
  ["Canal lombaire étroit", "Dos", /stenose|canal lombaire|canal etroit/],
  ["Spondylolisthèse", "Dos", /spondylolisth|spondylolyse/],
  ["Spondylarthrite", "Dos", /spondylarthrite|spondyloarthrite|pelvispondyl/],
  ["Scoliose / posture", "Dos", /scoliose|cyphose|hypercyphose|posture/],
  ["Arthrose lombaire", "Dos", /arthrose lombaire|arthrose (du |de la )?(dos|rachis|colonne)/],
  ["Post-partum / périnée", "Tronc", /post-?partum|perinee|grossesse|prenat|postnat|diastasis/],
  ["Coxarthrose / prothèse de hanche", "Hanche", /coxarthr|arthrose (de la )?hanche|prothese (totale )?de hanche|\bpth\b|\btha\b/],
  ["Conflit fémoro-acétabulaire", "Hanche", /femoro-?ace|\bcfa\b|\bfai\b|labr(um|ale).*hanche|reparation labrale/],
  ["Tendinopathie du moyen fessier", "Hanche", /moyen fessier|trochant|bursite (de la |de )?hanche/],
  ["Syndrome du piriforme", "Hanche", /piriform|pyramidal/],
  ["Pubalgie", "Hanche", /pubalg|adducteur/],
  ["Gonarthrose / prothèse de genou", "Genou", /gonarthr|arthrose (du )?genou|\bptg\b|\btka\b|prothese.*genou|arthroplastie.*genou/],
  ["Ligament croisé (LCA)", "Genou", /\blca\b|\bacl\b|croise|ligamentoplastie/],
  ["Lésion méniscale", "Genou", /menisc/],
  ["Syndrome fémoro-patellaire", "Genou", /femoro-?patell|patell?o-?femor|patellafr|\bsfp\b|\bpfps\b|syndrome rotulien|chondropathie/],
  ["Tendinopathie rotulienne", "Genou", /tendinopathie rotul|tendinite rotul|tendon rotulien|patellar|jumper/],
  ["Entorse du genou (LLI/LLE)", "Genou", /entorse.*\b(lli|lle|mcl|lcl)\b|\blli\b|\bmcl\b/],
  ["Syndrome de l'essuie-glace", "Genou", /essuie-?glace|bandelette|tfl|ilio-?tibial/],
  ["Entorse / instabilité de cheville", "Cheville et pied", /entorse.*cheville|instabilite.*cheville|ligament lateral.*cheville/],
  ["Tendinopathie d'Achille", "Cheville et pied", /achill/],
  ["Fasciite plantaire", "Cheville et pied", /fasci|aponevros|epine calcan/],
  ["Fracture de cheville", "Cheville et pied", /fracture.*(cheville|malleol|tibia|peron)/],
  ["Mâchoire (ATM) / céphalées", "", /temporo-?mandib|machoire|\batm\b|douleur de tete|tension de tete|cephal|migraine/],
  ["Paralysie faciale", "", /paralysie faciale|faiblesse faciale|bell/],
  ["Arthrose (générale)", "", /arthrose|\boa\b|osteoarthr/],
  ["Prévention des chutes / équilibre", "", /chute|trouble de l'equilibre|equilibre|senior/],
  ["Vertiges / vestibulaire", "", /vertig|vestibul|\bbppv\b|\bvppb\b/],
  ["Respiratoire (BPCO, asthme…)", "", /respirat|bpco|asthme|hyperventil|dyspnee|thoraci/],
  ["Post-opératoire", "", /post-?op|chirurgi|reparation/],
  ["Ostéoporose", "", /osteopor/],
  ["Déconditionnement / reprise", "", /deconditionn|reprise|sedentar/]
].map(([nom, zone, re]) => ({ nom, zone, re }));

/** Ajoute à un exercice de la bibliothèque : e.zone, e.types[], e.pathos[] (noms des pathologies principales). */
export function classer(e){
  const cat = norm(e.categorie).trim();
  const zone = ZONES.find(z => norm(z) === cat) || CAT_VERS_ZONE[cat] || (/epaule/.test(cat) ? "Épaule" : /genou/.test(cat) ? "Genou" : /hanche/.test(cat) ? "Hanche" : /dos|lomb/.test(cat) ? "Dos" : /cheville|pied/.test(cat) ? "Cheville et pied" : /coude/.test(cat) ? "Coude" : /poignet|main/.test(cat) ? "Poignet et main" : /cervic|cou\b/.test(cat) ? "Cervicales" : /tronc|abdo/.test(cat) ? "Tronc" : /corps/.test(cat) ? "Corps entier" : "");
  const types = new Set();
  if(CAT_VERS_TYPE[cat]) types.add(CAT_VERS_TYPE[cat]);
  const mode = MODE_VERS_TYPE[norm(e.mode)];
  if(mode) types.add(mode);
  if(e.source === "CABINET" && e.raw?.categorie === "cabinet") types.add("Au cabinet");
  const sources = [...(e.pathologies || []), cat === "post-partum" ? "post-partum" : "", cat === "pubalgie" ? "pubalgie" : ""].map(norm).filter(Boolean);
  const pathos = PATHOLOGIES.filter(p => sources.some(s => p.re.test(s))).map(p => p.nom);
  e.zone = zone;
  e.types = [...types];
  e.pathos = pathos;
  return e;
}
