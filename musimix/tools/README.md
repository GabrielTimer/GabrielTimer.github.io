# MusiMix v2 — guide

## Installer la nouvelle version

Dans le dépôt `gabrieltimer.github.io`, dossier `musimix/` :

| Fichier | Action |
|---|---|
| `index.html` | remplacer |
| `chords.js` | remplacer |
| `service-worker.js` | remplacer (important : l’ancien servait toujours la vieille version en cache) |
| `tools/` | ajouter (script de préparation + notebook Colab) |
| `chords-db*.json`, icônes, `manifest.json`, mp3 de démo, `{title Eu}.txt` | inchangés |

Après le déploiement, recharger une fois la page : le nouveau service worker prend la main tout seul.

## Ce qui change dans l’app

**Lecture**
- Les pistes passent par la Web Audio API : le volume marche enfin sur iPhone (où `audio.volume` est ignoré), et une correction de dérive garde les pistes calées entre elles.
- Barre de progression + temps (aussi sur mobile, où il n’y avait aucun moyen de se déplacer).
- Boucle A-B pour travailler un passage (bouton ou touche **L**).
- Volume général, réglages de mix mémorisés par morceau, double-clic sur un curseur = 100 %.
- Raccourcis : Espace (lecture), ← → (±5 s), L (boucle), Échap (fermer le diagramme).

**Paroles et accords**
- Lit `song.json` (produit par le script) : surlignage **mot à mot** (karaoké), **accord joué maintenant + suivant** en gros, accord surligné dans la grille, couloir d’accords dans la timeline.
- Clic sur une ligne synchronisée = aller à ce moment du morceau.
- Défilement automatique sans synchro : calé sur la durée du morceau (plus de vitesse fixe), et il se met en pause 3 s si tu fais défiler à la main.
- Synchro manuelle améliorée : les lignes vides ne comptent plus, clic sur une ligne pour la recaler, export LRC avec horodatage mot à mot si disponible.
- 📝 **Grille** : colle une grille « accords au-dessus des paroles » (Cifra Club, Ultimate Guitar…) → convertie en ChordPro. Gère `7M`, `°`, `ø`, `(9)`, `[Intro]`, `[Refrão]`, tablatures ignorées. Sert aussi à corriger les accords d’un morceau.
- 🔎 **LRCLIB** (dans l’éditeur) : récupère des paroles déjà synchronisées par titre/artiste.
- Transposition correcte : ♯/♭ selon la tonalité, basse des accords slash (`D/F#`), barre d’accords et diagrammes transposés, tonalité affichée.
- `{start_of_chorus}` affiché (« Refrain »), refrains marqués d’un filet.

**Diagrammes**
- Guitare : barrés, numéros de doigts, sillet, case de départ. Corrige un bug : tous les accords en C#/Db et F#/Gb (ex. `F#m`, `C#m7`) étaient introuvables. Si un accord manque, on montre l’accord le plus proche (ex. `D9(11)` → `D11`).
- Piano : calculé depuis la formule de l’accord (plus de dépendance à la base), basse des slash en orange, vraie portée.

**Bibliothèque**
- Tout morceau ouvert (ZIP, fichiers séparés, grille collée) est gardé, avec son mix et sa synchro.
- ⬇ télécharge le pack ZIP d’un morceau (pratique pour le passer sur le téléphone).

**Formats acceptés** : pistes mp3/wav/flac/m4a/ogg (noms reconnus : vocals/voix, drums, bass, guitar, piano, other, instrumental/no_vocals, backing vocals…), `.cho/.chopro/.txt`, `.lrc` (y compris mot à mot), `song.json`.

## Automatiser : audio → pack MusiMix

`tools/musimix_prep.py` fait toute la chaîne :

1. **Séparation des pistes** — Demucs `htdemucs_6s` : voix, batterie, basse, guitare, piano, autre (ou 4 pistes, ou voix + instru).
2. **Paroles synchronisées mot à mot** — Whisper via stable-ts, sur la voix isolée :
   - si tu fournis le texte → *alignement forcé* (fiable, garde tes lignes) ;
   - sinon → transcription (à relire).
3. **Accords** :
   - si tu fournis une grille → les accords sont **datés grâce aux mots** (le plus fiable) ;
   - sinon → détection dans l’audio (chroma + gabarits + Viterbi calé sur les mesures), sur la somme basse+guitare+piano+autre (sans voix ni batterie).
4. **Tempo, pulsations, tonalité**.
5. Sortie : `Artiste - Titre.zip` = pistes nommées pour MusiMix + `.cho` + `.lrc` + `song.json`.

### Trois façons de le lancer

- **Google Colab (recommandé, rien à installer, GPU gratuit)** : ouvrir `tools/MusiMix_Prep_Colab.ipynb` dans Colab, envoyer l’audio (+ grille), télécharger le ZIP.
- **Sur ton ordinateur** :
  ```
  pip install -r tools/requirements.txt     # + ffmpeg installé
  python tools/musimix_prep.py "Mari Froes - Eu.mp3" --chords eu.txt --lang pt --capo 2
  ```
  Sans GPU : compter ~5-10 min par morceau (Demucs + Whisper medium).
- **Stems déjà faits** (Moises, UVR, lalal.ai…) : `--stems-dir dossier_des_stems`.

Options utiles : `--model htdemucs|two`, `--whisper-model large-v3`, `--vocab simple|jazz|full`, `--lrclib`, `--no-stems`, `--no-lyrics`, `--keep-files`, plusieurs fichiers ou un dossier entier en une commande.

### Ce qu’il faut savoir (fiabilité)

| Étape | Qualité attendue |
|---|---|
| Séparation Demucs | très bonne pour voix/batterie/basse ; guitare/piano plus approximatifs |
| Alignement de paroles fournies | très bon (quelques mots décalés sur les passages chargés) |
| Transcription sans texte | correcte, à relire (surtout hors anglais) |
| Accords depuis une grille | aussi justes que la grille |
| Accords détectés dans l’audio | ~60-75 % justes : bonne base, à corriger dans 📝 Grille |

Test sur « Eu » (instrumental seul, sans piste de basse séparée) : la détection retrouve bien le vocabulaire du morceau (Gmaj7, Cmaj7, Bm7, A#m7, Am7, D), avec des confusions entre accords voisins (Gmaj7/D, Cmaj7/Em7). Avec la basse séparée par Demucs, les fondamentales sont mieux identifiées.

**Le meilleur flux** : audio + grille copiée d’un site → script → pack parfait en quelques minutes.

## Pistes pour la suite

- Hors ligne complet : précharger la démo et les packs dans le cache.
- Lecture plus lente sans changer la hauteur (apprentissage) : possible avec les `<audio>` (`preservesPitch`).
- Transposer aussi l’audio : nécessite un pitch-shift (SoundTouch/Rubber Band en WebAssembly).
- Détection d’accords plus précise : modèles entraînés (BTC, Chordino) ou service payant (Moises/Chordify), à brancher dans le script.
- Préparer les packs via un serveur ou une GitHub Action pour ne plus rien lancer à la main.
