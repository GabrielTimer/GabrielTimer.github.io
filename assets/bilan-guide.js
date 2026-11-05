/* =========================================================
   Bilan : entretien guidé, face au patient (pensé pour la tablette)
   ---------------------------------------------------------
   Une étape à la fois, presque tout en clics :
   motif → zones → histoire → douleur → questions ciblées
   → contexte → tests (à la fin, choisis d'après l'entretien) → synthèse.
   Même état S que la vue complète : résumé, PDF, comparaison inchangés.
   Questions modifiables dans /bilan-kine/entretien.js.
   ========================================================= */

import { esc, icon, toast, openSheet, evaColor } from "./app.js";
import * as TX from "./bilan-traitement.js";
import { exerciseImage } from "./library.js";

const STEPS = [
  ["motif", "Motif"],
  ["zones", "Zones"],
  ["histoire", "Histoire"],
  ["douleur", "Douleur"],
  ["cible", "Questions ciblées"],
  ["vie", "Contexte"],
  ["tests", "Tests"],
  ["synthese", "Synthèse"],
  ["traitement", "Traitement"]
];

export function mountGuide(app, ctx){
  const { S, K, B, BC, TC, patient } = ctx;
  S.q = S.q || {}; S.c = S.c || {}; S.f = S.f || {}; S.pain = S.pain || {}; S.cl = S.cl || {};
  const ui = { step: Math.max(0, STEPS.findIndex(s => s[0] === S.gstep)), view: "face", sel: null,
    modeles: null, lib: null, choix: {}, gen: null, seed: 1, loading: false };
  if(ui.step < 0) ui.step = 0;

  const root = document.createElement("div");
  root.className = "g-wrap";
  app.innerHTML = "";
  app.appendChild(root);

  const changed = () => ctx.changed();
  const has = (arr, v) => (arr || []).includes(v);
  const toggle = (arr, v) => { const i = arr.indexOf(v); i < 0 ? arr.push(v) : arr.splice(i, 1); return i < 0; };

  /* ---------- Briques ---------- */

  const chipsMulti = (key, opts, store = "c") => `<div class="g-chips">${opts.map(o =>
    `<button type="button" class="g-chip" data-${store === "c" ? "gc" : "gm"}="${esc(key)}" data-v="${esc(o)}" aria-pressed="${has(store === "c" ? S.c[key] : S.q[key], o)}">${esc(o)}</button>`).join("")}</div>`;

  function question([id, , q, opts, multi]){
    const v = S.q[id];
    return `<div class="g-q">
      <div class="g-qt">${esc(q)}${multi ? `<span class="g-multi">plusieurs choix</span>` : ""}</div>
      <div class="g-chips">${opts.map(o => `<button type="button" class="g-chip" data-${multi ? "gm" : "g1"}="${esc(id)}" data-v="${esc(o)}" aria-pressed="${multi ? has(v, o) : v === o}">${esc(o)}</button>`).join("")}</div>
    </div>`;
  }

  const yesNo = (key, label, extra = "") => {
    const v = S.q[key];
    return `<div class="g-yn ${v === "Oui" ? "oui" : ""}">
      <span class="g-ynl">${esc(label)}${extra}</span>
      <span class="g-ynb"><button type="button" data-yn="${esc(key)}" data-v="Oui" aria-pressed="${v === "Oui"}">Oui</button><button type="button" data-yn="${esc(key)}" data-v="Non" aria-pressed="${v === "Non"}">Non</button></span>
    </div>`;
  };

  const regions = () => B.bilanRegions(S);
  const zonesTestees = () => {
    const z = Object.keys(S.pain).filter(n => B.regionOf(n));
    if(regions().includes("vertiges")) z.push("Vertiges");
    return z;
  };
  const regOfZone = n => n === "Vertiges" ? "vertiges" : B.regionOf(n);

  /* ---------- Étapes ---------- */

  const views = {
    motif(){
      return `<h2 class="g-h">Pourquoi venez-vous ?</h2>
        <div class="g-q"><div class="g-qt">Type de bilan</div>
          <div class="g-chips">${B.BTYPES.map(([v, l]) => `<button type="button" class="g-chip" data-gtype="${v}" aria-pressed="${S.type === v}">${esc(l)}</button>`).join("")}</div></div>
        <div class="g-q"><div class="g-qt">Motif<span class="g-multi">plusieurs choix</span></div>${chipsMulti("patho", K.sec("patho")[2])}</div>`;
    },

    zones(){
      const z = Object.entries(S.pain), n = ui.sel, p = n && S.pain[n];
      return `<h2 class="g-h">Où avez-vous mal ?</h2>
        <div class="g-zones">
          <div class="g-body">
            <div class="g-chips g-seg">${["face", "dos"].map(v => `<button type="button" class="g-chip" data-gview="${v}" aria-pressed="${ui.view === v}">${v === "face" ? "Face" : "Dos"}</button>`).join("")}</div>
            <svg class="body-svg" viewBox="0 0 200 430" role="img" aria-label="Schéma corporel">${BC.bodySVG({ Z:K.Z, R:K.R, view:ui.view, pain:S.pain, sel:n, color:evaColor })}</svg>
          </div>
          <div class="g-zpanel">
            ${p ? `<div class="g-q"><div class="g-qt">${esc(n)} : intensité (EVA)</div>
                <div class="g-eva">${[...Array(11).keys()].map(i => `<button type="button" data-geva="${i}" style="--c:${evaColor(i)}" aria-pressed="${p.eva === i}">${i}</button>`).join("")}</div></div>
              <div class="g-q"><div class="g-qt">Type de douleur<span class="g-multi">plusieurs choix</span></div>
                <div class="g-chips">${K.TYPES.map(t => `<button type="button" class="g-chip" data-gptype="${esc(t)}" aria-pressed="${has(p.types, t)}">${esc(t)}</button>`).join("")}</div></div>
              <button type="button" class="btn ghost sm" data-grm>${icon("trash")}Retirer ${esc(n)}</button>`
            : `<p class="g-hint">${z.length ? "Touchez une zone pour la modifier, ou une autre zone pour l'ajouter." : "Touchez la zone douloureuse sur le schéma."}</p>`}
            ${z.length ? `<div class="g-qt" style="margin-top:18px">Zones notées</div><div class="g-chips">${z.map(([zn, q]) => `<button type="button" class="g-chip" data-gpick="${esc(zn)}" aria-pressed="${zn === n}"><span class="eva-pill" style="--c:${evaColor(q.eva)}"><i></i>${esc(zn)} · ${q.eva}</span></button>`).join("")}</div>` : ""}
          </div>
        </div>`;
    },

    histoire(){
      return `<h2 class="g-h">Histoire du problème</h2>${K.ENT.G.filter(g => g[1] === "histoire").map(question).join("")}`;
    },

    douleur(){
      const neuro = S.q.pares === "Oui" || S.q.irrad === "Descend dans le bras ou la jambe" || Object.values(S.pain).some(p => has(p.types, "Neuropathique"));
      const d4 = (S.c.dn4 || []).length;
      return `<h2 class="g-h">La douleur</h2>${K.ENT.G.filter(g => g[1] === "douleur").map(question).join("")}
        ${neuro ? `<div class="g-q g-box"><div class="g-qt">DN4 : douleur neuropathique ? <span class="badge ${d4 >= 4 ? "warn" : ""}">${d4}/10${d4 >= 4 ? " · probable" : ""}</span></div>
          <p class="g-hint">Proposé car la douleur irradie ou s'accompagne de fourmillements. Seuil ≥ 4 (Bouhassira 2005).</p>${chipsMulti("dn4", K.sec("dn4")[2])}</div>` : ""}`;
    },

    cible(){
      const regs = regions();
      if(!regs.length) return `<h2 class="g-h">Questions ciblées</h2><p class="g-hint">Pas de questions ciblées pour l'instant : notez une zone (genou, épaule, dos, nuque, cheville, hanche, coude, main) ou cochez « Vertiges » dans le motif.</p>`;
      return `<h2 class="g-h">Questions ciblées</h2>` + regs.map(reg => {
        const r = K.REG[reg], qs = K.ENT.REGQ[reg] || [];
        const zs = B.zonesOfRegion(S, reg);
        const rfOn = r.RF.filter(x => zs.some(z => has(B.zoneState(S, z).s, x)));
        return `<section class="g-card">
          <h3>${esc(r.n)}</h3>
          ${qs.length ? `<div class="g-yns">${qs.map(([id, q]) => yesNo(reg + ":" + id, q)).join("")}</div>` : ""}
          <div class="g-qt" style="margin-top:16px">Drapeaux rouges<span class="g-multi">touchez ceux qui sont présents</span></div>
          <div class="g-chips">${r.RF.map(x => `<button type="button" class="g-chip rf" data-grf="${esc(reg)}" data-v="${esc(x)}" aria-pressed="${rfOn.includes(x)}">${esc(x)}</button>`).join("")}</div>
          ${rfOn.length ? `<div class="notice danger" style="margin-top:12px">${icon("alert")}<span><strong>${esc(r.RFm)}</strong></span></div>` : ""}
        </section>`;
      }).join("");
    },

    vie(){
      return `<h2 class="g-h">Vie quotidienne et contexte</h2>${K.ENT.G.filter(g => g[1] === "vie").map(question).join("")}
        <div class="g-q"><div class="g-qt">Antécédents<span class="g-multi">plusieurs choix</span></div>${chipsMulti("atcd", K.sec("atcd")[2])}</div>
        <div class="g-q"><div class="g-qt">Médicaments<span class="g-multi">plusieurs choix</span></div>${chipsMulti("medic", K.sec("medic")[2])}</div>`;
    },

    tests(){
      const zs = zonesTestees();
      const reco = TC.tfRecommandes(S);
      const tf = (K.TF || []).filter(t => reco.has(t[0]) || (S.f[t[0]] ?? "") !== "");
      const cliniques = zs.map(n => {
        const reg = regOfZone(n), r = K.REG[reg];
        if(!r) return "";
        const o = B.orientation(S, reg), score = Object.fromEntries(o.map(h => [h.k, h.score]));
        const pri = t => Math.max(0, ...t[1].map(k => score[k] || 0));
        const T = r.T.slice().sort((a, b) => pri(b) - pri(a));
        const top = T.filter(t => pri(t) > 0), rest = T.filter(t => !pri(t));
        const c = B.zoneState(S, n);
        const row = ([t, h, lrp, lrm]) => {
          const cur = c.t[t] || 0;
          return `<div class="g-test">
            <button type="button" class="g-tname" data-ginfo="${esc(t)}">${esc(t)}${icon("info")}</button>
            <span class="g-tmeta">${esc(h.map(x => r.H[x]).join(", "))}${lrp != null || lrm != null ? ` · LR+ ${B.f1(lrp)} · LR− ${B.f1(lrm)}` : ""}</span>
            <span class="g-ynb g-pm">${[[1, "+", "Positif"], [-1, "−", "Négatif"]].map(([v, l, a]) => `<button type="button" data-gtz="${esc(n)}" data-tn="${esc(t)}" data-v="${v}" aria-pressed="${cur === v}" aria-label="${a}">${l}</button>`).join("")}</span>
          </div>`;
        };
        const ori = o.filter(h => h.score > 0);
        return `<section class="g-card">
          <h3>${esc(n === "Vertiges" ? "Vertiges" : n)} <span class="badge lagon">${esc(r.n)}</span></h3>
          ${ori.length ? `<p class="g-ori">${icon("target")}<span>D'après l'entretien : <strong>${ori.map(h => esc(h.label)).join(", ")}</strong></span></p>` : `<p class="g-hint">Pas d'orientation particulière d'après l'entretien : tous les tests sont proposés.</p>`}
          ${top.length ? `<div class="g-qt">À faire en priorité</div>${top.map(row).join("")}` : ""}
          ${rest.length ? (top.length ? `<details class="g-more"><summary>Autres tests (${rest.length})</summary>${rest.map(row).join("")}</details>` : rest.map(row).join("")) : ""}
        </section>`;
      }).join("");
      return `<h2 class="g-h">Tests</h2>
        ${cliniques || `<p class="g-hint">Pas de tests cliniques pour les zones notées.</p>`}
        ${tf.length ? `<section class="g-card"><h3>Tests fonctionnels conseillés</h3>
          <p class="g-hint">Remplissez seulement ceux réalisés. Touchez le nom pour le protocole et la vidéo.</p>
          <div class="mes-grid">${tf.map(([k, nom, u]) => `<div class="field"><label for="g-${k}"><button class="t-name" type="button" data-tf="${esc(nom)}" style="font-size:inherit">${icon("info")}${esc(nom)}</button> <span class="faint">(${esc(u)})</span></label><input class="input" id="g-${k}" data-gf="${k}" inputmode="decimal" value="${esc(S.f[k] ?? "")}"></div>`).join("")}</div>
        </section>` : ""}`;
    },

    synthese(){
      const regs = regions();
      const hyps = regs.map(reg => {
        const r = K.REG[reg], o = B.orientation(S, reg);
        const zs = B.zonesOfRegion(S, reg).concat(reg === "vertiges" ? ["Vertiges"] : []);
        return `<div class="g-q"><div class="g-qt">${esc(r.n)}</div><div class="g-chips">${o.map(h => {
          const pos = r.T.filter(t => t[1].includes(h.k) && zs.some(z => (S.cl[z]?.t || {})[t[0]] === 1)).map(t => t[0]);
          const lab = h.label + (h.score ? ` · ${h.pour.length} indice${h.pour.length > 1 ? "s" : ""}` : "") + (pos.length ? ` · test + : ${pos.join(", ")}` : "");
          return `<button type="button" class="g-chip" data-gc="hyp" data-v="${esc(h.label)}" aria-pressed="${has(S.c.hyp, h.label)}">${esc(lab)}</button>`;
        }).join("")}</div></div>`;
      }).join("");
      return `<h2 class="g-h">Synthèse</h2>
        ${hyps ? `<div class="g-q"><div class="g-qt" style="font-size:var(--fs-md)">Hypothèse retenue<span class="g-multi">indices de l'entretien et tests positifs</span></div></div>${hyps}` : ""}
        <div class="g-q"><div class="g-qt">Objectifs<span class="g-multi">plusieurs choix</span></div>${chipsMulti("obj", K.sec("obj")[2])}</div>
        <div class="g-q"><div class="g-qt">Traitement prévu<span class="g-multi">plusieurs choix</span></div>${chipsMulti("plan", K.sec("plan")[2])}</div>
        <details class="g-more" ${S.f.concl ? "open" : ""}><summary>Ajouter une note (facultatif)</summary>
          <textarea class="textarea" data-gf="concl" rows="3" placeholder="Diagnostic kiné, précision…">${esc(S.f.concl || "")}</textarea></details>
        <p class="g-hint" style="margin-top:18px">Étape suivante : la proposition de traitement (plan kiné et programme d'exercices).</p>`;
    },

    traitement(){
      const P = TX.proposition(S, K, B);
      if(!S.tx?.init){ S.tx = { init:true, axes: P.axes.slice() }; changed(); }
      S.tx.avis = P.avis;
      const p = P.profil, a = p.auto, t = S.tx;
      const opt = (key, vals, cur, auto, fmt = v => v) => `<div class="g-chips">${vals.map(v => `<button type="button" class="g-chip" data-gtx="${key}" data-v="${esc(String(v))}" aria-pressed="${cur === v}">${esc(fmt(v))}${auto === v ? `<span class="g-auto">proposé</span>` : ""}</button>`).join("")}</div>`;
      const axesTous = [...new Set([...P.axes, ...(t.axes || [])])];
      if(!ui.modeles && !ui.loading) chargerTraitement();

      const lieu = p.lieu;
      const groupes = ui.modeles ? TX.modelesPour(P.modeles, ui.modeles, lieu) : [];
      const autres = ui.modeles ? TX.modelesPour(P.autres, ui.modeles, lieu) : [];
      const carte = (g, gi, zone) => {
        const m = g.items.find(x => x.id === ui.choix[g.nom]) || TX.choisirNiveau(g.items, p.niveau);
        const imgs = m.exercices.slice(0, 5).map(e => exerciseImage(e)).filter(Boolean);
        const pris = t.prog?.nom === m.titre;
        return `<div class="g-model ${pris ? "pris" : ""}">
          <div class="g-mtop"><strong>${esc(g.nom)}</strong>${m.mine ? `<span class="badge">votre modèle</span>` : ""}${pris ? `<span class="badge ok">${icon("check")}choisi</span>` : ""}</div>
          <div class="g-chips g-lv">${g.items.map(x => `<button type="button" class="g-chip" data-gmodlv="${esc(g.nom)}" data-v="${esc(x.id)}" aria-pressed="${x.id === m.id}">${esc(x.niveau ? "Niveau " + x.niveau : "Sans niveau")}${x.doublon ? ` (${x.doublon})` : ""}${x.niveau === p.niveau ? `<span class="g-auto">proposé</span>` : ""}</button>`).join("")}</div>
          <div class="g-thumbs">${imgs.map(src => `<img src="${esc(src)}" alt="" loading="lazy">`).join("")}<span class="g-nb">${m.exercices.length} exercices</span></div>
          <button type="button" class="btn primary" data-gusemod="${esc(zone)}" data-i="${gi}" data-id="${esc(m.id)}">${icon("check")}Utiliser ce modèle</button>
        </div>`;
      };
      /* Meilleur modèle : celui de l'hypothèse, sinon le plus proche de la région */
      const best = groupes[0] || autres[0] || null;
      const proche = !groupes.length && !!autres.length;
      const reste = [...groupes, ...autres].filter(g => g !== best);
      /* Sur mesure composé d'office, à côté du modèle */
      if(ui.lib && !ui.gen){
        ui.gen = TX.composer(ui.lib.list, { pathos:P.pathos, zones:P.zones, lieu, niveau:p.niveau, seed:ui.seed, visible:ui.lib.visible, postop:P.post });
      }
      const gen = ui.gen;
      const titreSM = (P.hyps[0]?.label || P.pathos[0] || "Programme") + " · sur mesure";
      return `<h2 class="g-h">Proposition de traitement</h2>
        ${P.rf ? `<div class="notice danger" style="margin-bottom:12px">${icon("alert")}<span><strong>${esc(P.rfTexte || "")}</strong></span></div>` : ""}
        ${P.avis.length ? `<div class="notice warn" style="margin-bottom:12px">${icon("alert")}<span>${P.avis.map(esc).join("<br>")}</span></div>` : ""}

        <section class="g-card">
          <h3>Profil du patient</h3>
          <p class="g-hint">${P.hyps.length ? `Hypothèse${P.hyps.length > 1 ? "s" : ""} : <strong>${P.hyps.map(h => esc(h.label)).join(", ")}</strong>${P.hyps.some(h => !h.retenue) ? " (d'après l'entretien, à confirmer dans la synthèse)" : ""}` : "Aucune hypothèse retenue : la proposition s'appuie sur le motif et les zones."}</p>
          <div class="g-q"><div class="g-qt">Phase</div>${opt("phase", ["Aiguë", "Subaiguë", "Chronique"], p.phase, a.phase)}</div>
          <div class="g-q"><div class="g-qt">Irritabilité<span class="g-multi">douleur, nuit, repos, évolution, gêne</span></div>${opt("irrit", ["Élevée", "Modérée", "Faible"], p.irrit, a.irrit)}</div>
        </section>

        <section class="g-card">
          <h3>Plan de traitement kiné</h3>
          <div class="g-qt">Axes<span class="g-multi">pré-cochés d'après le bilan, touchez pour retirer ou ajouter</span></div>
          <div class="g-chips g-axes">${axesTous.map(x => `<button type="button" class="g-chip" data-gtxa="${esc(x)}" aria-pressed="${(t.axes || []).includes(x)}">${esc(x)}</button>`).join("") || `<span class="g-hint">Choisissez une hypothèse dans la synthèse pour des axes ciblés.</span>`}</div>
          ${P.eviter.length ? `<p class="g-eviter">${icon("alert")}<span><strong>Non recommandé :</strong> ${P.eviter.map(esc).join(" ; ")}</span></p>` : ""}
          <div class="g-q" style="margin-top:18px"><div class="g-qt">Séances au cabinet par semaine</div>${opt("freq", [1, 2, 3, 4], p.freq, a.freq)}</div>
          <div class="g-q"><div class="g-qt">Durée</div>${opt("sem", [4, 6, 8, 12], p.sem, a.sem, v => v + " semaines")}</div>
          <div class="g-q"><div class="g-qt">Bilan intermédiaire dans</div>${opt("reeval", [2, 4, 6, 8], p.reeval, a.reeval, v => v + " semaines")}</div>
          <button type="button" class="btn ghost sm" data-gact="txreset">${icon("repeat")}Recalculer la proposition</button>
        </section>

        <section class="g-card">
          <h3>Programme d'exercices</h3>
          <div class="g-q"><div class="g-qt">Où ?</div><div class="g-chips">${[["HEP", "À la maison · peu de matériel"], ["CABINET", "Au cabinet · tout le matériel"]].map(([v, l]) => `<button type="button" class="g-chip" data-gtx="lieu" data-v="${v}" aria-pressed="${lieu === v}">${l}</button>`).join("")}</div></div>
          <div class="g-q"><div class="g-qt">Niveau de départ</div>${opt("niveau", [1, 2, 3], p.niveau, a.niveau, v => "Niveau " + v)}</div>
          ${t.prog ? `<p class="g-ori">${icon("check")}<span>Programme choisi : <strong>${esc(t.prog.nom)}</strong></span></p>` : ""}
          ${!ui.modeles ? `<p class="g-hint">${icon("clock")} Recherche des modèles et de la bibliothèque…</p>` : `
          <div class="g-qt">Deux propositions<span class="g-multi">choisissez, puis ajustez dans l'éditeur</span></div>
          <div class="g-duo">
            <div class="g-pick">
              <div class="g-tag">${icon("layers")}Modèle existant${proche ? ` <span class="g-multi">le plus proche pour la région</span>` : ""}</div>
              ${best ? carte(best, 0, "p") : `<div class="g-model"><p class="g-hint" style="margin:0">Pas de modèle ${lieu === "HEP" ? "maison" : "cabinet"} pour cette région. Le programme sur mesure est à côté.</p></div>`}
            </div>
            <div class="g-pick">
              <div class="g-tag">${icon("sparkle")}Sur mesure</div>
              ${gen && gen.length ? `<div class="g-model">
                <div class="g-mtop"><strong>${esc(titreSM)}</strong><span class="badge">niveau ${p.niveau}</span></div>
                <ol class="g-genlist">${gen.map(e => `<li>${exerciseImage(e) ? `<img src="${esc(exerciseImage(e))}" alt="" loading="lazy">` : ""}<span>${esc(e.nom)}<small>${esc((e.types || []).slice(0, 2).join(", "))}</small></span></li>`).join("")}</ol>
                <button type="button" class="btn" data-gact="gen">${icon("repeat")}Autre proposition</button>
                <button type="button" class="btn primary" data-gact="genuse">${icon("check")}Utiliser ce programme</button>
              </div>`
              : ui.lib ? `<div class="g-model"><p class="g-hint" style="margin:0">Pas assez d'exercices trouvés dans la bibliothèque pour cette zone.</p><button type="button" class="btn" data-gact="gen">${icon("repeat")}Réessayer</button></div>`
              : `<div class="g-model"><p class="g-hint" style="margin:0">${icon("clock")} Composition…</p></div>`}
            </div>
          </div>
          <p class="g-hint" style="margin-top:10px">Les deux s'ouvrent dans l'éditeur avec ce patient : vous retirez, ajoutez ou dosez chaque exercice avant l'envoi.</p>
          ${reste.length ? `<details class="g-more"><summary>Autres modèles (${reste.length})</summary><div class="g-models">${reste.map((g, i) => carte(g, i, "a")).join("")}</div></details>` : ""}`}
        </section>

        <div class="g-actions">
          <button class="btn" type="button" data-gact="resume">${icon("file")}Voir le récapitulatif</button>
          <button class="btn" type="button" data-gact="pdf">${icon("pdf")}PDF</button>
          <button class="btn" type="button" data-gact="send">${icon("share")}Envoyer</button>
        </div>`;
    }
  };

  /* Modèles (fournis + cabinet) et bibliothèque : chargés à l'arrivée sur l'étape Traitement */
  async function chargerTraitement(){
    ui.loading = true;
    try{
      const [mods, lib] = await Promise.all([ctx.loadModeles(), ctx.loadLibrary().catch(() => null)]);
      ui.modeles = mods || []; ui.lib = lib;
    }catch(e){ console.warn(e); ui.modeles = []; }
    ui.loading = false;
    if(STEPS[ui.step][0] === "traitement") refresh();
  }

  function utiliser(nom, exercices, series, src, origine = null){
    const p = TX.profil(S);
    S.tx.prog = { nom, src };
    changed();
    ctx.useProgram({ nom, series: series || 1, exercices }, { semaines: p.sem, parSemaine: p.lieu === "HEP" ? 3 : p.freq, origine });
  }

  /* ---------- Rendu ---------- */

  function render(){
    const k = STEPS[ui.step][0];
    S.gstep = k;
    root.innerHTML = `
      <div class="g-top">
        <div class="g-id"><strong>${esc(B.typeLabel(S.type))}</strong><span>${esc(patient.nom || "")}</span><span id="st" class="save-st"></span></div>
        <button class="btn sm" type="button" data-gact="full">${icon("list")}Vue complète</button>
      </div>
      <nav class="g-steps" aria-label="Étapes du bilan">${STEPS.map(([sk, l], i) => `<button type="button" data-gstep="${i}" aria-current="${i === ui.step ? "step" : "false"}" class="${stepDone(sk) ? "done" : ""}"><b>${stepDone(sk) && i !== ui.step ? icon("check") : i + 1}</b><span>${esc(l)}</span></button>`).join("")}</nav>
      <div class="g-body-step">${views[k]()}</div>
      <div class="g-foot">
        <button class="btn" type="button" data-gnav="-1" ${ui.step === 0 ? "disabled" : ""}>${icon("back")}Précédent</button>
        <span class="g-count">${ui.step + 1} / ${STEPS.length}</span>
        ${ui.step < STEPS.length - 1
          ? `<button class="btn primary" type="button" data-gnav="1">Suivant${icon("chevron")}</button>`
          : `<button class="btn primary" type="button" data-gact="done">${icon("check")}Terminer</button>`}
      </div>`;
    ctx.statusAgain?.();
    root.querySelector('.g-steps [aria-current="step"]')?.scrollIntoView({ block:"nearest", inline:"center" });
  }

  function stepDone(k){
    const g = id => S.q[id] !== undefined && !(Array.isArray(S.q[id]) && !S.q[id].length);
    if(k === "motif") return (S.c.patho || []).length > 0;
    if(k === "zones") return Object.keys(S.pain).length > 0;
    if(k === "histoire" || k === "douleur" || k === "vie") return K.ENT.G.filter(x => x[1] === k).some(x => g(x[0]));
    if(k === "cible") return regions().some(reg => (K.ENT.REGQ[reg] || []).some(([id]) => S.q[reg + ":" + id]));
    if(k === "tests") return Object.values(S.cl).some(c => Object.keys(c.t || {}).length) || (K.TF || []).some(t => (S.f[t[0]] ?? "") !== "");
    if(k === "synthese") return (S.c.hyp || []).length > 0 || (S.c.obj || []).length > 0;
    if(k === "traitement") return !!S.tx?.prog;
    return false;
  }

  const go = i => {
    ui.step = Math.max(0, Math.min(STEPS.length - 1, i));
    render();
    window.scrollTo({ top:0, behavior:"smooth" });
    changed();
  };

  /* Re-rend seulement le contenu de l'étape (garde le défilement) */
  function refresh(){
    const y = scrollY;
    render();
    window.scrollTo(0, y);
  }

  /* ---------- Interactions ---------- */

  root.addEventListener("click", async e => {
    e.stopPropagation();
    const b = e.target.closest("button, [data-zone]");
    if(!b || !root.contains(b)) return;
    const d = b.dataset;

    if(d.gnav){ go(ui.step + Number(d.gnav)); return; }
    if(d.gstep){ go(+d.gstep); return; }
    if(d.gtype){ S.type = d.gtype; changed(); refresh(); return; }
    if(d.gc){ toggle(S.c[d.gc] = S.c[d.gc] || [], d.v); changed(); refresh(); return; }
    if(d.gm){ toggle(S.q[d.gm] = Array.isArray(S.q[d.gm]) ? S.q[d.gm] : [], d.v); changed(); refresh(); return; }
    if(d.g1){ S.q[d.g1] === d.v ? delete S.q[d.g1] : (S.q[d.g1] = d.v); changed(); refresh(); return; }
    if(d.yn){ S.q[d.yn] === d.v ? delete S.q[d.yn] : (S.q[d.yn] = d.v); changed(); refresh(); return; }
    if(d.gview){ ui.view = d.gview; ui.sel = null; refresh(); return; }
    if(d.zone){
      if(!S.pain[d.zone]){ S.pain[d.zone] = { eva:5, types:[] }; changed(); }
      ui.sel = d.zone; refresh(); return;
    }
    if(d.gpick){
      ui.sel = d.gpick;
      if(!B.zones(ui.view).some(z => z[0] === d.gpick)) ui.view = ui.view === "face" ? "dos" : "face";
      refresh(); return;
    }
    if(d.geva !== undefined && ui.sel){ S.pain[ui.sel].eva = +d.geva; changed(); refresh(); return; }
    if(d.gptype && ui.sel){ toggle(S.pain[ui.sel].types = S.pain[ui.sel].types || [], d.gptype); changed(); refresh(); return; }
    if(d.grm !== undefined && ui.sel){ delete S.pain[ui.sel]; delete S.cl[ui.sel]; ui.sel = null; changed(); refresh(); return; }
    if(d.grf){
      const zs = B.zonesOfRegion(S, d.grf).concat(d.grf === "vertiges" ? [] : []);
      const on = zs.some(z => has(B.zoneState(S, z).s, d.v));
      zs.forEach(z => { const a = B.zoneState(S, z).s, i = a.indexOf(d.v); if(on && i >= 0) a.splice(i, 1); if(!on && i < 0) a.push(d.v); });
      changed(); refresh(); return;
    }
    if(d.gtz){
      const t = B.zoneState(S, d.gtz).t, v = +d.v;
      t[d.tn] === v ? delete t[d.tn] : (t[d.tn] = v);
      changed(); refresh(); return;
    }
    if(d.ginfo){ TC.ficheTest(K, d.ginfo, "clinique"); return; }
    if(d.tf){ TC.ficheTest(K, d.tf, "fonctionnel"); return; }

    if(d.gtx){
      const num = ["freq", "sem", "reeval", "niveau"].includes(d.gtx);
      const v = num ? +d.v : d.v;
      S.tx[d.gtx] = S.tx[d.gtx] === v && d.gtx !== "lieu" ? null : v;
      if(d.gtx === "niveau" || d.gtx === "lieu"){ ui.choix = {}; ui.gen = null; }
      changed(); refresh(); return;
    }
    if(d.gtxa){ toggle(S.tx.axes = S.tx.axes || [], d.gtxa); changed(); refresh(); return; }
    if(d.gmodlv){ ui.choix[d.gmodlv] = d.v; refresh(); return; }
    if(d.gusemod){
      const m = (ui.modeles || []).find(x => String(x.id) === d.id);
      if(m) utiliser(m.titre, m.exercices.map(e => ({ type:"timer", ...e })), m.series, "modele", { modeleId:String(m.id), nom:m.nom, niveau:m.niveau || null });
      return;
    }

    const act = d.gact;
    if(act === "txreset"){ const keep = S.tx?.prog; S.tx = { init:false }; if(keep) S.tx.prog = keep; ui.gen = null; ui.choix = {}; refresh(); return; }
    if(act === "gen" && ui.lib){
      const P = TX.proposition(S, K, B), p = P.profil;
      ui.seed++;
      ui.gen = TX.composer(ui.lib.list, { pathos:P.pathos, zones:P.zones, lieu:p.lieu, niveau:p.niveau, seed:ui.seed, visible:ui.lib.visible, postop:P.post });
      refresh(); return;
    }
    if(act === "genuse" && ui.gen?.length){
      const P = TX.proposition(S, K, B), p = P.profil, dose = TX.dosage(p.niveau);
      const nom = (P.hyps[0]?.label || P.pathos[0] || "Programme") + ` niveau ${p.niveau}`;
      utiliser(nom, ui.gen.map(e => ctx.toProgramExercise(e, dose)), 1, "sur-mesure");
      return;
    }
    if(act === "full"){ ctx.onFull(); return; }
    if(act === "done"){ ctx.leave(); return; }
    if(act === "resume"){
      const RC = await import("./bilan-recap.js");
      const text = B.summaryText(S, patient, ctx.opts());
      const sh = openSheet({ title:"Récapitulatif du bilan", wide:true, tall:true,
        body: RC.recapHTML(B.report(S, patient, ctx.opts()), S, K),
        foot:`<button class="btn" type="button" data-close>Fermer</button><button class="btn" type="button" data-rpdf>${icon("pdf")}PDF</button><button class="btn primary" type="button" data-copy>${icon("copy")}Copier pour Maiia</button>` });
      sh.el.querySelector("[data-copy]").onclick = () => B.copyText(text);
      sh.el.querySelector("[data-rpdf]").onclick = async ev => { const x = ev.currentTarget; x.disabled = true; try{ await B.downloadPdf(S, patient, ctx.opts()); }catch(err){ toast("Le PDF n'a pas pu être créé.", { type:"err" }); } finally{ x.disabled = false; } };
      return;
    }
    if(act === "pdf"){
      b.disabled = true;
      try{ await B.downloadPdf(S, patient, ctx.opts()); }
      catch(err){ console.error(err); toast("Le PDF n'a pas pu être créé. Vérifiez la connexion et réessayez.", { type:"err" }); }
      finally{ b.disabled = false; }
      return;
    }
    if(act === "send"){ B.sendSheet(S, patient, ctx.opts()); ctx.save(); return; }
  });

  root.addEventListener("input", e => {
    e.stopPropagation();
    const k = e.target.dataset?.gf;
    if(!k) return;
    S.f[k] = e.target.value;
    changed();
  });

  render();
  return { render };
}
