/* Audios de la respiration guidée : rangement automatique.
   La page « Audios de la respiration » (espace kiné → Outils) dépose deux fichiers dans respir/a-convertir/ :
   <nom>.<ext> (l'audio d'origine) et <nom>.json ({ nom, voix }).
   Ce script les compresse (mono 64 kbit/s, largement suffisant pour une voix), les range dans respir/audio/,
   ajoute l'audio à la fin de respir/audios.json, puis efface les fichiers d'origine.
   Lancé par .github/workflows/audios-respir.yml. */
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const ATTENTE = "respir/a-convertir";
const SORTIE = "respir/audio";
const LISTE = "respir/audios.json";

if(!fs.existsSync(ATTENTE)){ console.log("Rien à convertir."); process.exit(0); }
const liste = JSON.parse(fs.readFileSync(LISTE, "utf8"));
const fiches = fs.readdirSync(ATTENTE).filter(f => f.endsWith(".json"));
let ajouts = 0;

for(const fiche of fiches){
  const base = fiche.replace(/\.json$/, "");
  const source = fs.readdirSync(ATTENTE).find(f => f !== fiche && f.startsWith(base + "."));
  if(!source){ console.log(`${base} : audio pas encore arrivé, on attend.`); continue; }
  const meta = JSON.parse(fs.readFileSync(path.join(ATTENTE, fiche), "utf8"));

  let nomFichier = base + ".mp3", n = 2;
  while(fs.existsSync(path.join(SORTIE, nomFichier))) nomFichier = `${base}-${n++}.mp3`;
  const sortie = path.join(SORTIE, nomFichier);
  execFileSync("ffmpeg", ["-nostdin", "-v", "error", "-y", "-i", path.join(ATTENTE, source), "-vn", "-ac", "1", "-ar", "44100", "-b:a", "64k", sortie], { stdio:"inherit" });
  const duree = Number(execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", sortie]).toString().trim());

  let id = base, k = 2;
  while(liste.some(a => a.id === id)) id = `${base}-${k++}`;
  liste.push({ id, nom: String(meta.nom || base).slice(0, 60), voix: String(meta.voix || "").slice(0, 60), min: Math.max(1, Math.round(duree / 60)), f: nomFichier });
  fs.rmSync(path.join(ATTENTE, source));
  fs.rmSync(path.join(ATTENTE, fiche));
  ajouts++;
  console.log(`Ajouté : ${meta.nom} (${Math.round(duree / 60)} min) → ${sortie}`);
}

if(ajouts) fs.writeFileSync(LISTE, "[\n" + liste.map(a => "  " + JSON.stringify(a)).join(",\n") + "\n]\n");
console.log(`${ajouts} audio(s) ajouté(s).`);
