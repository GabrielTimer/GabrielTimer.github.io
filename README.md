# Gabriel LAVEAU – Kinésithérapie

Application web (installable sur téléphone) de programmes d'exercices sur mesure pour les patients du cabinet.

- **Patient** : prochaine séance, minuteur guidé (images, consignes, voix, écran toujours allumé), suivi de la douleur, progression, ajout des séances à l'agenda, bilan envoyé au kiné.
- **Kiné** (accès caché : trois appuis sur le logo) : tableau de bord avec alertes, fiches patients, création de séances et de programmes sur plusieurs semaines, bibliothèque de plus de 700 exercices en français, modèles, pathologies, reprise de course, fiches PDF, QR codes d'accès.

Mise en route de la version 2 : voir [MISE-EN-SERVICE.md](MISE-EN-SERVICE.md).

## Organisation du code

| Dossier / fichier | Rôle |
|---|---|
| `*.html` | Pages (les adresses de la version 1 sont conservées) |
| `assets/app.css` | Charte graphique commune (couleurs, typographie, composants) |
| `assets/app.js` | Outils communs : navigation, fenêtres, formats de date, contexte patient |
| `assets/cloud.js` | Accès aux données Firebase |
| `assets/config.js` | Nom du kiné, adresse du site, compte autorisé |
| `assets/library.js` | Bibliothèque d'exercices unifiée (cabinet + HEP, en français) |
| `assets/pages/` | Script et style propres à chaque page |
| `firestore.rules` | Règles de sécurité à publier dans Firebase |
| `respir/` | Respiration guidée (inchangée) |
| `sw.js`, `manifest.json` | Application installable et utilisable hors connexion |
