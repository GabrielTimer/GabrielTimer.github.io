/* =========================================================
   Exercices évolutifs : charge et vitesse d'exécution
   ---------------------------------------------------------
   Pensé pour le renforcement excentrique des tendinopathies
   (protocole de type Stanish) :
   - la charge augmente chaque semaine ;
   - la vitesse augmente au fil des séances de la semaine
     (lente, puis moyenne, puis rapide), et repart en lent
     la semaine suivante avec une charge plus lourde.

   Sur un exercice (modèle ou programme) :
     evol = {
       charge:  { depart: 0.5, pas: 0.5, max: null, unite: "kg" } | null,
       vitesse: true | false
     }
   Sur chaque séance envoyée, l'exercice reçoit en plus :
     charge  (nombre), unite, vitesse ("lente" | "moyenne" | "rapide")
   ========================================================= */

export const VITESSES = {
  lente:   { id: "lente",   label: "Lente",   detail: "descente en 3 secondes", parole: "vitesse lente" },
  moyenne: { id: "moyenne", label: "Moyenne", detail: "descente en 2 secondes", parole: "vitesse moyenne" },
  rapide:  { id: "rapide",  label: "Rapide",  detail: "descente en 1 seconde, sans à-coup", parole: "vitesse rapide" }
};

const num = (v, d = 0) => { const n = Number(String(v ?? "").replace(",", ".")); return Number.isFinite(n) ? n : d; };
export const fmtKg = n => (Math.round(num(n) * 100) / 100).toLocaleString("fr-FR");

export function defaultEvol(){
  return { charge: { depart: 0.5, pas: 0.5, max: null, unite: "kg" }, vitesse: true };
}

export function hasEvol(e){
  return !!(e && e.evol && (e.evol.charge || e.evol.vitesse));
}

/** Nettoie les réglages saisis. */
export function normEvol(evol){
  if(!evol) return null;
  const out = { charge: null, vitesse: !!evol.vitesse };
  if(evol.charge){
    const c = evol.charge;
    const depart = Math.max(0, num(c.depart, 0));
    const pas = Math.max(0, num(c.pas, 0));
    const max = c.max === null || c.max === "" || c.max === undefined ? null : Math.max(depart, num(c.max, depart));
    out.charge = { depart, pas, max, unite: String(c.unite || "kg").slice(0, 12) };
  }
  return out.charge || out.vitesse ? out : null;
}

/** Charge de la semaine n (1 = première semaine). */
export function chargeFor(charge, semaine = 1){
  if(!charge) return null;
  const v = num(charge.depart) + Math.max(0, (semaine || 1) - 1) * num(charge.pas);
  return charge.max !== null && charge.max !== undefined ? Math.min(v, num(charge.max)) : v;
}

/**
 * Vitesse de la séance n° ordre sur nb séances dans la semaine.
 * Premier tiers lent, deuxième moyen, dernier rapide (7 séances : 2 lentes, 3 moyennes, 2 rapides).
 */
export function vitesseFor(ordre = 1, nb = 1){
  if(nb <= 1) return "lente";
  const p = (Math.max(1, ordre) - 1) / (nb - 1);
  return p < 1 / 3 ? "lente" : p <= 2 / 3 ? "moyenne" : "rapide";
}

/** Applique la progression à une séance : renvoie une copie de data avec charge et vitesse calculées. */
export function applyEvol(data, { semaine = 1, ordre = 1, nb = 1 } = {}){
  if(!data || !Array.isArray(data.exercices)) return data;
  return {
    ...data,
    exercices: data.exercices.map(e => {
      const { charge, unite, vitesse, ...rest } = e;
      const ev = normEvol(e.evol);
      if(!ev){ const { evol, ...clean } = rest; return clean; }
      const out = { ...rest, evol: ev };
      if(ev.charge){ out.charge = chargeFor(ev.charge, semaine); out.unite = ev.charge.unite; }
      if(ev.vitesse) out.vitesse = vitesseFor(ordre, nb);
      return out;
    })
  };
}

/** Ce que le patient doit faire pour cet exercice, dans cette séance. */
export function doseOf(e){
  if(!e) return null;
  const ev = normEvol(e.evol);
  const charge = e.charge !== undefined && e.charge !== null ? num(e.charge) : ev?.charge ? ev.charge.depart : null;
  const unite = e.unite || ev?.charge?.unite || "kg";
  const vid = e.vitesse || (ev?.vitesse ? "lente" : null);
  if(charge === null && !vid) return null;
  return {
    charge, unite,
    chargeTxt: charge === null ? "" : `${fmtKg(charge)} ${unite}`,
    vitesse: vid ? VITESSES[vid] || VITESSES.lente : null
  };
}

/** Une ligne courte : « 1,5 kg · vitesse lente » */
export function doseShort(e){
  const d = doseOf(e);
  if(!d) return "";
  return [d.chargeTxt, d.vitesse ? `vitesse ${d.vitesse.label.toLowerCase()}` : ""].filter(Boolean).join(" · ");
}

/** Phrase lue par le minuteur. */
export function doseParole(e){
  const d = doseOf(e);
  if(!d) return "";
  const kg = d.charge === null ? "" : `${fmtKg(d.charge)} ${d.unite === "kg" ? (d.charge > 1 ? "kilos" : "kilo") : d.unite}`;
  return [kg, d.vitesse ? d.vitesse.parole : ""].filter(Boolean).join(", ");
}

/** Description de la progression complète (fiche PDF, aperçu kiné). */
export function evolTexte(e){
  const ev = normEvol(e?.evol);
  if(!ev) return "";
  const parts = [];
  if(ev.charge){
    const c = ev.charge;
    parts.push(c.pas
      ? `Charge : ${fmtKg(c.depart)} ${c.unite} la première semaine, puis + ${fmtKg(c.pas)} ${c.unite} chaque semaine${c.max !== null ? ` (jusqu'à ${fmtKg(c.max)} ${c.unite})` : ""}.`
      : `Charge : ${fmtKg(c.depart)} ${c.unite}.`);
  }
  if(ev.vitesse) parts.push("Vitesse : lente en début de semaine, puis moyenne, puis rapide. On repart en lent la semaine suivante.");
  return parts.join(" ");
}

/** Aperçu semaine par semaine pour le kiné. */
export function evolPreview(e, { semaines = 4, parSemaine = 3 } = {}){
  const ev = normEvol(e?.evol);
  if(!ev) return "";
  const out = [];
  if(ev.charge){
    const n = Math.min(semaines, 12);
    out.push(Array.from({ length: n }, (_, i) => `S${i + 1} : ${fmtKg(chargeFor(ev.charge, i + 1))} ${ev.charge.unite}`).join(" · ") + (semaines > n ? " …" : ""));
  }
  if(ev.vitesse){
    out.push(`Chaque semaine : ${Array.from({ length: parSemaine }, (_, i) => VITESSES[vitesseFor(i + 1, parSemaine)].label.toLowerCase()).join(", ")}`);
  }
  return out.join("\n");
}
