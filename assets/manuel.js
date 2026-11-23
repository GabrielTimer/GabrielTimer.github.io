/* Lien entre le bilan et le « Manuel de pratique fondée sur les preuves » (document Claude, privé à Gabriel).
   Chaque onglet du manuel a un identifiant : le lien ouvre directement le bon onglet.
   Si le manuel est refait ailleurs, changer MANUEL_URL ; si un onglet est ajouté, l'ajouter dans ONGLETS. */

export const MANUEL_URL = "https://claude.ai/artifact/Wy4rTkPSd4zaA8rDZt76Np";

export const ONGLETS = {
  rachis:    ["54b082ab-418c", "Rachis"],
  epaule:    ["8bb72535-8830", "Épaule"],
  coude:     ["865bcbfb-60e0", "Coude, poignet, main"],
  hanche:    ["29db2587-9112", "Hanche et aine"],
  genou:     ["65627747-1737", "Genou"],
  cheville:  ["b842a137-5939", "Cheville et pied"],
  postop:    ["0342d7f1-f11b", "Post-opératoire"],
  neuro:     ["f35fba16-5326", "Neurologie"],
  vertiges:  ["a5cfe09e-ebc6", "Vertiges, équilibre, os"],
  respi:     ["6b39f5ae-e8cf", "Respiratoire, cœur, forme"],
  autres:    ["e7b373b6-c543", "Autres motifs"],
  scores:    ["f8773a2f-2b38", "Scores et seuils"]
};

export const lienOnglet = o => ONGLETS[o] ? `${MANUEL_URL}#${ONGLETS[o][0]}` : MANUEL_URL;

/* Hypothèse du bilan (« région:code » de bilan-kine/data.js) → [onglet, titre de la fiche] */
const HYP = {
  "genou:LCA": ["genou", "Rupture du LCA non opérée"], "genou:MEN": ["genou", "Lésion méniscale"],
  "genou:SFP": ["genou", "Syndrome fémoro-patellaire"], "genou:OA": ["genou", "Gonarthrose"],
  "genou:COL": ["genou", "Entorse d'un ligament collatéral"],
  "epaule:RCD": ["epaule", "Tendinopathie de la coiffe, conflit"], "epaule:SA": ["epaule", "Tendinopathie de la coiffe, conflit"],
  "epaule:TF": ["epaule", "Rupture de coiffe sans traumatisme"], "epaule:SSC": ["epaule", "Rupture de coiffe sans traumatisme"],
  "epaule:INS": ["epaule", "Instabilité, luxation"],
  "lombes:RAD": ["rachis", "Sciatique, hernie discale, cruralgie"], "lombes:STE": ["rachis", "Canal lombaire étroit"],
  "cerv:RAD": ["rachis", "Névralgie cervico-brachiale"], "cerv:CEF": ["rachis", "Céphalée cervicogénique"],
  "cerv:MYE": ["rachis", "Myélopathie cervicale"],
  "dors:MEC": ["rachis", "Dorsalgie, douleur costale"], "dors:COS": ["rachis", "Dorsalgie, douleur costale"],
  "dors:TAS": ["rachis", "Tassement vertébral ostéoporotique"],
  "chev:ATFL": ["cheville", "Entorse latérale de cheville"], "chev:ACH": ["cheville", "Tendinopathie d'Achille"],
  "hanche:CFA": ["hanche", "Conflit fémoro-acétabulaire"], "hanche:GTPS": ["hanche", "Tendinopathie glutéale"],
  "hanche:OA": ["hanche", "Coxarthrose"],
  "coude:EPI": ["coude", "Épicondylalgie latérale"], "coude:EPT": ["coude", "Épitrochléite"],
  "main:CC": ["coude", "Canal carpien"], "main:DQ": ["coude", "Ténosynovite de De Quervain"],
  "main:RHZ": ["coude", "Rhizarthrose"], "main:TFCC": ["coude", "Douleur ulnaire du poignet (TFCC)"],
  "vertiges:VPPB": ["vertiges", "VPPB"], "vertiges:HYPO": ["vertiges", "Hypofonction vestibulaire"],
  "thorax:PAR": ["respi", "Douleur thoracique d'origine mécanique"], "thorax:COR": ["respi", "Douleur thoracique d'origine mécanique"],
  "atm:MYO": ["autres", "Mâchoire (ATM)"], "atm:ART": ["autres", "Mâchoire (ATM)"],
  "atm:DDR": ["autres", "Mâchoire (ATM)"], "atm:DDNR": ["autres", "Mâchoire (ATM)"],
  "neuro:CEN": ["neuro", "Neurologie"], "neuro:CER": ["neuro", "Neurologie"], "neuro:PRO": ["neuro", "Charcot-Marie-Tooth, neuropathies"]
};

/* Région du bilan sans hypothèse retenue → fiche de base */
const REGION = {
  lombes: ["rachis", "Lombalgie aiguë ou chronique"], cerv: ["rachis", "Cervicalgie"], dors: ["rachis", "Dorsalgie, douleur costale"],
  epaule: ["epaule", "Épaule"], coude: ["coude", "Coude"], main: ["coude", "Poignet et main"], hanche: ["hanche", "Hanche"],
  genou: ["genou", "Genou"], chev: ["cheville", "Cheville et pied"], vertiges: ["vertiges", "Vertiges"],
  thorax: ["respi", "Douleur thoracique d'origine mécanique"], atm: ["autres", "Mâchoire (ATM)"], neuro: ["neuro", "Neurologie"]
};

/* Motif coché au début du bilan → fiche (pour les motifs sans région : neurologie, respiratoire, chutes…) */
const MOTIF = [
  [/ligamentoplastie/i, "postop", "Ligamentoplastie du LCA"], [/prothèse de genou/i, "postop", "Prothèse de genou"],
  [/prothèse de hanche/i, "postop", "Prothèse de hanche"], [/post-?op.*(coiffe|épaule)/i, "postop", "Réparation de la coiffe ou prothèse d'épaule"],
  [/post-?op.*rachis/i, "postop", "Chirurgie du rachis lombaire"], [/ménisc.*(suture|ectomie)/i, "postop", "Méniscectomie, suture méniscale"],
  [/post-?op|prothèse|réparation/i, "postop", "Post-opératoire"],
  [/AVC|hémipl/i, "neuro", "AVC, hémiplégie"], [/parkinson/i, "neuro", "Maladie de Parkinson"],
  [/sclérose en plaques|SEP\b/i, "neuro", "Sclérose en plaques"], [/SLA|charcot(?!-marie)/i, "neuro", "SLA"],
  [/neuropathie|charcot-marie/i, "neuro", "Charcot-Marie-Tooth, neuropathies"], [/paralysie faciale|bell/i, "neuro", "Paralysie faciale périphérique"],
  [/chute|équilibre/i, "vertiges", "Chutes de la personne âgée"], [/ostéopor/i, "vertiges", "Ostéoporose"],
  [/BPCO|réhabilitation respi/i, "respi", "BPCO, réhabilitation respiratoire"], [/encombrement|désencombrement/i, "respi", "Encombrement bronchique"],
  [/remise en forme|reconditionnement|cardiaque/i, "respi", "Remise en forme, reconditionnement"],
  [/lymph/i, "autres", "Lymphœdème après cancer du sein"], [/fibromyalg|douleur chronique/i, "autres", "Douleur chronique, fibromyalgie"],
  [/périn|post-partum/i, "autres", "Périnée, post-partum"], [/enfant|nourrisson|torticolis/i, "autres", "Enfant : développement moteur, torticolis"],
  [/musculaire|déchirure|claquage/i, "autres", "Lésion musculaire"], [/algodystrophie|SDRC/i, "autres", "Syndrome douloureux régional complexe"],
  [/fracture.*poignet|radius/i, "coude", "Fracture du radius distal"], [/fracture.*cheville/i, "cheville", "Fracture de cheville ou du pied"],
  [/fracture.*(épaule|humérus)/i, "epaule", "Fracture de l'humérus proximal"], [/col du fémur|fracture.*hanche/i, "postop", "Fracture du col du fémur"]
];

/**
 * Fiches du manuel utiles pour ce bilan : [{ titre, onglet, nomOnglet, url }], sans doublon.
 * hyps : [{ reg, k }] (bilan-traitement.js) ; regions : régions du bilan ; motifs : motifs cochés ; postop : vrai après une opération.
 */
export function fichesPour({ hyps = [], regions = [], motifs = [], postop = false } = {}){
  const out = [], vu = new Set();
  const add = (o, titre) => {
    if(!ONGLETS[o]) return;
    const cle = o + "|" + titre;
    if(vu.has(cle)) return;
    vu.add(cle);
    out.push({ titre, onglet:o, nomOnglet: ONGLETS[o][1], url: lienOnglet(o) });
  };
  motifs.forEach(m => { const x = MOTIF.find(([re]) => re.test(m)); if(x) add(x[1], x[2]); });
  if(postop && !out.some(f => f.onglet === "postop")) add("postop", "Post-opératoire");
  /* Après une opération, la fiche « non opéré » du même problème ne sert pas */
  const opere = postop ? ["genou:LCA", "genou:MEN", "epaule:TF", "epaule:SSC"] : [];
  hyps.forEach(h => { const c = h.reg + ":" + h.k, x = HYP[c]; if(x && !opere.includes(c)) add(x[0], x[1]); });
  if(!hyps.length) regions.forEach(r => { const x = REGION[r]; if(x) add(x[0], x[1]); });
  return out.slice(0, 4);
}
