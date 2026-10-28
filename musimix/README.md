# MusiMix

Joue tes morceaux : paroles synchronisées mot à mot, accords guitare / ukulélé / piano,
volume de chaque piste (voix, batterie, basse, guitare, piano…), export PDF.
Fonctionne sur PC, tablette et téléphone, et hors ligne une fois ouvert.

## Déployer

Copier tout le contenu de ce dossier dans `musimix/` du dépôt `gabrieltimer.github.io`
(garder `vocals.mp3` et `instrumental.mp3` déjà présents : ce sont les pistes de la démo).

Fichiers de l'ancienne version à supprimer : `chords.js`, `chords-db.json`, `chords-db-piano.json`,
`service-worker.js`, `manifest.json`, `musimix-studio.html`, `{title Eu}.txt`, `tools/`, `icon-*.png`
(les icônes sont maintenant dans `assets/icons/`).

## Structure

| Dossier / fichier | Rôle |
|---|---|
| `index.html`, `css/app.css` | page et styles (thème clair / sombre) |
| `js/main.js` | navigation, import, Studio, réglages |
| `js/engine.js`, `js/pitch-worklet.js` | lecture multipiste, vitesse, transposition audio, boucle, métronome |
| `js/sheet.js`, `js/theory.js`, `js/render.js` | paroles, accords, synchro, transposition, affichage |
| `js/diagrams.js`, `data/guitar.json` | diagrammes guitare / ukulélé / piano |
| `js/views/` | bibliothèque, setlists, lecteur, éditeur |
| `js/print.js` | export PDF |
| `js/studio.js` | connexion au Studio (direct ou par fenêtre depuis un téléphone) |
| `sw.js`, `manifest.webmanifest` | appli installable et hors ligne |
| `musimix-studio.zip` | le Studio à télécharger depuis l'appli (Réglages → Studio) |
