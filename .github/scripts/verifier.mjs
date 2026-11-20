/* Vérification automatique du site, lancée par GitHub à chaque modification (workflow « Vérifier le site »).
   En cas d'erreur, GitHub envoie un e-mail : le message ci-dessous dit quel fichier corriger.
   Peut aussi se lancer à la main : node .github/scripts/verifier.mjs
   Vérifie :
   1. la syntaxe de tous les fichiers .js et des scripts inclus dans les pages .html ;
   2. que les fichiers .json sont valides ;
   3. que les modèles proposés par le bilan (bilan-kine/traitements.js) existent ;
   4. que les progressions (exercises/data/progressions.json) citent des exercices existants, sans mélanger HEP et dessins ;
   5. que les fichiers listés dans sw.js existent. */

import fs from "fs";
import path from "path";
import { execFileSync } from "child_process";
import os from "os";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../..");
const erreurs = [];
const err = m => erreurs.push(m);
const rel = f => path.relative(ROOT, f);
const IGNORE = new Set(["node_modules", ".git", "musimix", "respir"]);

function fichiers(dir, ext){
  const out = [];
  for(const n of fs.readdirSync(dir, { withFileTypes:true })){
    if(IGNORE.has(n.name)) continue;
    const p = path.join(dir, n.name);
    if(n.isDirectory()) out.push(...fichiers(p, ext));
    else if(n.name.endsWith(ext)) out.push(p);
  }
  return out;
}

function syntaxe(code, nom, module){
  const tmp = path.join(os.tmpdir(), `verif-${Math.random().toString(36).slice(2)}.${module ? "mjs" : "cjs"}`);
  fs.writeFileSync(tmp, code);
  try{ execFileSync(process.execPath, ["--check", tmp], { stdio:"pipe" }); }
  catch(e){ err(`Erreur de syntaxe dans ${nom} :\n${String(e.stderr || e.message).split("\n").filter(l => l && !l.includes(tmp)).slice(0, 6).join("\n")}`); }
  finally{ fs.rmSync(tmp, { force:true }); }
}

/* 1. JavaScript */
for(const f of fichiers(ROOT, ".js").concat(fichiers(ROOT, ".mjs"))){
  const code = fs.readFileSync(f, "utf8");
  const module = /^\s*(import|export)\s/m.test(code) || f.endsWith(".mjs");
  syntaxe(code, rel(f), module);
}
for(const f of fs.readdirSync(ROOT).filter(n => n.endsWith(".html")).map(n => path.join(ROOT, n))){
  const html = fs.readFileSync(f, "utf8");
  const re = /<script(\s[^>]*)?>([\s\S]*?)<\/script>/gi;
  let m, k = 0;
  while((m = re.exec(html))){
    const attrs = m[1] || "";
    if(/\bsrc=/.test(attrs) || /type="(application\/ld\+json|importmap|text\/template)"/.test(attrs) || !m[2].trim()) continue;
    k++;
    syntaxe(m[2], `${rel(f)} (script n° ${k})`, /type="module"/.test(attrs));
  }
}

/* 2. JSON */
for(const f of fichiers(ROOT, ".json")){
  try{ JSON.parse(fs.readFileSync(f, "utf8")); }
  catch(e){ err(`Fichier JSON invalide : ${rel(f)} (${e.message})`); }
}

/* 3. Modèles proposés par le bilan */
try{
  const src = fs.readFileSync(path.join(ROOT, "bilan-kine/traitements.js"), "utf8");
  const TX = new Function(src.replace(/^\s*export\s+/gm, "") + "\nreturn TX;")();
  const { MODELES_BASE } = await import(path.join(ROOT, "assets/modeles-base.js"));
  const { PATHOLOGIES } = await import(path.join(ROOT, "assets/pathologies.js"));
  const noms = new Set([...MODELES_BASE, ...PATHOLOGIES].map(m => String(m.nom).replace(/,? ?niveau \d+$/i, "").trim()));
  for(const sec of ["HYP", "REGION", "MOTIF"]) for(const [k, v] of Object.entries(TX[sec] || {})) for(const f of ["modeles", "postop"])
    (v[f] || []).forEach(n => { if(!noms.has(n)) err(`bilan-kine/traitements.js : le modèle « ${n} » (${sec} ${k}) n'existe pas. Vérifiez l'orthographe exacte du nom du modèle.`); });
  const ids = MODELES_BASE.map(m => m.id);
  const vus = new Set(); ids.forEach(id => { if(vus.has(id)) err(`assets/modeles-base.js : identifiant de modèle en double « ${id} ».`); vus.add(id); });
}catch(e){ err(`Impossible de vérifier les modèles du bilan : ${e.message}`); }

/* 4. Progressions d'exercices */
try{
  const cab = JSON.parse(fs.readFileSync(path.join(ROOT, "exercises/data/exercises.json"), "utf8"));
  const hep = JSON.parse(fs.readFileSync(path.join(ROOT, "exercises/data/hep_exercises.json"), "utf8"));
  const liste = a => Array.isArray(a) ? a : (a.exercises || a.exercices || Object.values(a));
  const cles = new Set([...liste(cab).map(e => `CABINET_${e.id}`), ...liste(hep).map(e => `HEP_${e.id}`)]);
  const P = JSON.parse(fs.readFileSync(path.join(ROOT, "exercises/data/progressions.json"), "utf8"));
  const vus = new Map();
  (P.chaines || []).forEach((ch, i) => {
    const sources = new Set(ch.map(k => k.split("_")[0]));
    if(sources.size > 1) err(`progressions.json, chaîne ${i + 1} : HEP et dessins mélangés (${ch.join(", ")}).`);
    ch.forEach(k => {
      if(!cles.has(k)) err(`progressions.json, chaîne ${i + 1} : exercice introuvable « ${k} ».`);
      if(vus.has(k)) err(`progressions.json : « ${k} » est dans deux chaînes (${vus.get(k) + 1} et ${i + 1}).`);
      vus.set(k, i);
    });
  });
}catch(e){ err(`Impossible de vérifier les progressions : ${e.message}`); }

/* 5. Fichiers mis de côté par l'application (sw.js) */
try{
  const sw = fs.readFileSync(path.join(ROOT, "sw.js"), "utf8");
  const listes = [...sw.matchAll(/const (PRECACHE|KINE_EN_PLUS) = \[([\s\S]*?)\];/g)].map(m => m[2]).join(",");
  for(const [, u] of listes.matchAll(/"(\/[^"]*)"/g)){
    if(u === "/") continue;
    if(!fs.existsSync(path.join(ROOT, u))) err(`sw.js : le fichier « ${u} » est listé mais n'existe pas (supprimez la ligne ou remettez le fichier).`);
  }
}catch(e){ err(`Impossible de vérifier sw.js : ${e.message}`); }

if(erreurs.length){
  console.error(`\n❌ ${erreurs.length} problème(s) trouvé(s) :\n`);
  erreurs.forEach((m, i) => console.error(`${i + 1}. ${m}\n`));
  process.exit(1);
}
console.log("✅ Tout est correct : syntaxe, JSON, modèles du bilan, progressions, fichiers de l'application.");
