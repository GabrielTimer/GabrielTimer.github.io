# ApiKiné : consignes pour Claude (à lire en premier)

Application web de Gabriel LAVEAU, masseur-kinésithérapeute à Loudun. Les patients y suivent leurs programmes d'exercices ; l'« espace kiné » sert au kiné seul (patients, bilans, programmes, messages). Le site est **statique** et hébergé sur GitHub Pages (https://gabrieltimer.github.io). Les données sont dans **Firebase** (Firestore et Auth). Il n'y a **ni compilation, ni npm, ni framework** : HTML, CSS et JavaScript (modules ES) servis tels quels.

## Règles absolues
1. **Répondre et écrire en français**, avec des mots simples. Gabriel n'est pas développeur.
2. **Toujours vérifier d'abord si la demande se fait depuis le site, sans code** (voir MAINTENANCE.md, partie 1). Si oui, expliquer où cliquer au lieu de modifier le code.
3. **Modifications chirurgicales.** Ne jamais demander de coller un gros fichier en entier (`assets/modeles-base.js` fait 2 Mo). Pour chaque modification, donner : le fichier, le texte exact à chercher (Ctrl+F dans l'éditeur GitHub) et le texte complet qui le remplace. Gabriel modifie dans l'éditeur de GitHub, dans le navigateur.
4. **Ne jamais mélanger** exercices HEP (photos) et exercices dessinés dans un même programme, modèle ou progression. HEP passe toujours en priorité. Ne pas appeler « Cabinet » les dessins (dire « Dessins »).
5. **Ne jamais montrer aux patients** ce qui est réservé au kiné : bilans, notes, messages d'autres patients, programmes « au cabinet ».
6. Le visuel actuel plaît à Gabriel : pas de refonte graphique. Les images et illustrations se font dans ChatGPT, pas par Claude.
7. **Tout doit rester gratuit** (pas de service payant, pas de facturation Google, pas d'abonnement).
8. Après chaque modification, **augmenter `VERSION` dans `sw.js`** (ex. `gt-2.48.0` → `gt-2.48.1`). Sinon les téléphones gardent l'ancienne version un peu plus longtemps : ce n'est pas bloquant, mais c'est mieux.
9. Une vérification automatique tourne sur GitHub à chaque modification (onglet **Actions**, « Vérifier le site »). Si elle est rouge, lire son message : il dit quel fichier corriger.

## Carte de l'appli (où chercher)
| Sujet | Fichiers |
|---|---|
| Commun à toutes les pages : menu, fenêtres, formats, `store` (stockage local) | `assets/app.js`, `assets/app.css`, `assets/icons.js` (icônes au trait) |
| Nom du kiné, e-mail titulaire, numéro de version affiché | `assets/config.js` |
| Firebase : lecture et écriture de toutes les données | `assets/cloud.js` ; règles de sécurité : `firestore.rules` (publiées automatiquement par GitHub) |
| Connexion kiné, accès réservé | `assets/kine.js`, `login.html` |
| Accueil kiné et accueil patient | `index.html` + `assets/pages/home.js`, `home.css` |
| Écran de séance (minuteur) côté patient | `timer.html` + `assets/pages/timer.js`, `timer.css` |
| Créer ou modifier une séance, un programme ou un modèle (éditeur) | `config.html` + `assets/pages/config.js`, `config.css` |
| Bibliothèque d'exercices (HEP et dessins, recherche, variantes) | `assets/library.js` (données), `assets/library-ui.js` (affichage), `assets/exercise-editor.js` |
| Données des exercices | `exercises/data/exercises.json` (dessins), `hep_exercises.json` + `hep_nettoyage.json` (HEP, noms français), `variantes.json` (images homme/femme) |
| Progressions plus facile / plus difficile | `exercises/data/progressions.json` (version d'origine) ; modifiables depuis l'éditeur (bouton « Variantes ») |
| Modèles fournis | `assets/modeles-base.js` (énorme : ne jamais le coller en entier), `assets/pathologies.js`, `assets/modeles.js` (logique) |
| Bilan kiné (entretien guidé, tests, traitement proposé) | `bilan.html` + `assets/pages/bilan.js`, `assets/bilan-core.js`, `assets/bilan-guide.js`, `assets/bilan-traitement.js` |
| Contenu du bilan d'origine | `bilan-kine/data.js` (régions, tests, LR), `guide.js` (fiches techniques), `entretien.js` (questions), `traitements.js` (modèles proposés), `fonctionnels.js` (tests fonctionnels) ; modifiable depuis le site : page `contenu-bilan.html` |
| Lettre au médecin, ordonnance, tableau des scores | `courrier.html`, `ordonnance.html`, `compte-rendu.html` |
| Messages patients | `messages.html`, `assets/messages.js` |
| Questionnaires (scores) | `questionnaires.html`, `assets/questionnaires.js` |
| Fiches conseils | `conseils.html`, `assets/conseils-data.js`, `assets/fiches-patho.js` |
| Recherche IA (Google Gemini gratuit) | `recherche-ia.html`, `assets/ia.js` |
| Reprise de course (générateur + fiche PDF) | `programmescourse.html` (réglages en haut du script : paliers, hausses, conseils par pathologie), `coursepdf.html` (fiche A4, se resserre seule pour les longs programmes) |
| Réglages du cabinet | `reglages_cabinet.html`, `assets/settings.js` |
| Hors connexion et mises à jour | `sw.js` (liste des fichiers mis de côté + `VERSION`) |
| Tâches automatiques GitHub (rappels, sauvegarde, nettoyage, règles, vérification) | `.github/workflows/`, `.github/scripts/` |

## Données Firebase (collections principales)
`patients/{clé}` (séances, messages, rappels, suivis), `codes/{code}` (accès patient), `fiches/{clé}` (dossier kiné, notes), `bilans`, `modeles`, `exercices` (modifications du kiné), `questionnaires`, `conseils`, `programmes`, `corbeille`, `reglages` (lisibles par les patients : rien de confidentiel), `acces/{id}` (réservé aux kinés, modifiable par le titulaire seul) : `acces/comptes`, `acces/ia` (clé Gemini), `acces/bilan` (contenu du bilan modifié), `acces/progressions` (progressions modifiées).

## Conventions de code
- Modules ES, `import` relatifs ; pas de dépendance à installer. Les pages chargent `/assets/app.css` et appellent `mountShell({ role:"kine" })` ou `role:"patient"`.
- Pages réservées au kiné : `const { requireKine } = await import("/assets/kine.js"); await requireKine();`
- Textes à l'écran en français, phrases courtes ; dates en format français.
- Clé d'un exercice : `exerciseKey(e)`, sous la forme `HEP_<id>` ou `CABINET_<id>`.
- Nouvelle page ou nouveau fichier : l'ajouter dans `sw.js` (`PRECACHE` pour le patient, `KINE_EN_PLUS` pour le kiné).
- Avant de proposer une modification, relire le passage concerné (demander à Gabriel le lien « Raw » du fichier, ou un extrait autour du texte cherché).

Voir **MAINTENANCE.md** : ce qui se fait sans code, comment modifier un fichier sur GitHub, que faire si quelque chose casse.
