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
8. Après chaque modification, **augmenter `VERSION` dans `sw.js`** (ex. `gt-2.51.0` → `gt-2.51.1`). Sinon les téléphones gardent l'ancienne version un peu plus longtemps : ce n'est pas bloquant, mais c'est mieux. C'est le seul numéro à changer : la page Réglages l'affiche (`APP_VERSION` de `config.js` n'est qu'un numéro de secours).
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
| Mettre dans Maiia : PDF des bilans et photos rangés dans les dossiers du PC (une fois par semaine) | `maiia.html`, `assets/vers-maiia.js` ; photos des bilans (qualité d'origine, sur la tablette) : `assets/bilan-photos.js` ; dossiers : `assets/dossiers.js` (bilans, photos, documents) ; rappel : `rappelMaiia` dans `assets/pages/home.js` |
| Accompagnement : questionnaire avant le 1er rendez-vous, petites leçons, nouvelles à 3 mois | `assets/accompagnement.js` (bloc de la fiche patient + cartes de l'accueil patient), `prebilan.html` + `assets/prebilan.js` (questions, reprises dans l'entretien du bilan), `assets/lecons.js` (textes des leçons), envoi à 3 mois : `.github/scripts/rappels.mjs` (`suivi3m`) |
| Encouragements (paliers de séances avec un mot du kiné, série de jours, objectif de la semaine) | `assets/encouragements.js` (textes dans `PALIERS`) ; affichés dans `assets/pages/home.js` et `assets/pages/fin.js` |
| Lecture des consignes à voix haute (séance) ; dictée vocale (espace kiné) | `assets/pages/timer.js` (`lireConsignes`) ; `assets/dictee.js` |
| Avant la séance (résumé en haut de la fiche patient) | `avantSeanceHTML` dans `assets/pages/cloud.js` |
| Contenu du bilan d'origine | `bilan-kine/data.js` (régions, tests, LR), `guide.js` (fiches techniques), `entretien.js` (questions), `traitements.js` (modèles proposés), `fonctionnels.js` (tests fonctionnels) ; modifiable depuis le site : page `contenu-bilan.html` |
| Lettre au médecin, ordonnance, tableau des scores | `courrier.html`, `ordonnance.html`, `compte-rendu.html` |
| Messages patients | `messages.html`, `assets/messages.js` |
| Questionnaires (scores) | `questionnaires.html`, `assets/questionnaires.js` |
| Fiches conseils | `conseils.html`, `assets/conseils-data.js`, `assets/fiches-patho.js` |
| Recherche IA (Google Gemini gratuit) | `recherche-ia.html`, `assets/ia.js` |
| Reprise de course (générateur + fiche PDF) | `programmescourse.html` (réglages en haut du script : paliers, hausses, conseils par pathologie), `coursepdf.html` (fiche A4, se resserre seule pour les longs programmes) |
| Réglages du cabinet | `reglages_cabinet.html`, `assets/settings.js` |
| Hors connexion et mises à jour | `sw.js` (liste des fichiers mis de côté + `VERSION`) |
| Tâches automatiques GitHub (rappels, sauvegarde, nettoyage, règles, vérification, maintien actif) | `.github/workflows/`, `.github/scripts/` (tableau dans MAINTENANCE.md, partie 7) |
| Déconnexion automatique du kiné (12 h par défaut, réglable par appareil) | `deconnexionAuto` dans `assets/cloud.js` ; réglage dans `reglages_cabinet.html` (`#deco`) ; message dans `login.html` (`?expire=1`) |
| Sauvegardes | à la main : `exportAll` / `importAll` dans `assets/cloud.js` (+ `reglages_cabinet.html`) ; automatique : `.github/scripts/sauvegarde.mjs` (même liste de collections, à garder identique) et `etat-sauvegarde.mjs` (date affichée sur l'accueil kiné) |

## Données Firebase (collections principales)
`patients/{clé}` (séances, messages, rappels, suivis), `codes/{code}` (accès patient), `fiches/{clé}` (dossier kiné, notes), `bilans`, `modeles`, `exercices` (modifications du kiné), `questionnaires`, `conseils`, `programmes`, `corbeille`, `reglages` (lisibles par les patients : rien de confidentiel), `acces/{id}` (réservé aux kinés, modifiable par le titulaire seul) : `acces/comptes`, `acces/ia` (clé Gemini), `acces/bilan` (contenu du bilan modifié), `acces/progressions` (progressions modifiées). `reglages/sauvegarde` (date de la dernière sauvegarde automatique, expiration du jeton), `photos_pc/{photo}_{n}` (photos des bilans en route de la tablette vers le PC, en morceaux de moins de 1 Mo, effacées par le PC après rangement ; `bilans/{id}.maiiaAt` = date du dernier export pour Maiia), champs du dossier patient `preBilan`, `lecons`, `suivi3m` (accompagnement) ; suivis de types `prebilan` et `suivi3m` (réponses du patient), `notifs/{id}` (avis « nouveau message du kiné », lus puis effacés par la tâche Rappels : économise le quota gratuit de 50 000 lectures par jour).

## Fichiers à laisser tels quels
- `folder.html`, `glossary.html`, `pathologies.html`, `liste_pathologies.html`, `programs.html` : petites pages de redirection pour les anciens liens. Ne pas supprimer.
- `images/<pathologie>/` (lombalgie_1, capsulite…) : anciennes copies gardées pour les vieux programmes enregistrés chez les patients. Les images à jour sont dans `exercises/images/`.
- `musimix/` : autre appli de Gabriel, déménagée sur musimix-app.github.io (page d'aiguillage + ancienne version pour récupérer les morceaux). Ne pas toucher.
- `respir/` : module « Respiration guidée », utilisé par l'appli.

## Demandes courantes : où chercher
| Demande | Fichier | Texte à chercher (Ctrl+F) |
|---|---|---|
| Délais du nettoyage des programmes maison (21, 28, 30 jours) | `assets/inactivite.js` **et** `.github/scripts/nettoyage-programmes.mjs` | `JOURS_ALERTE` / `J_ALERTE` |
| Heure des rappels par défaut (18 h) ou plage 7 h – 22 h | `.github/scripts/rappels.mjs` | `Number(r.heure) \|\| 18` / `hour >= 22` |
| Boutons du menu kiné (5 au plus sur téléphone) | `assets/app.js` | `const NAV = {` |
| Paliers et conseils de la reprise de course | `programmescourse.html` | `REGLAGES` |
| Textes de la fiche PDF course | `coursepdf.html` | le texte affiché |
| Texte d'un écran (accueil kiné ou patient) | `assets/pages/home.js` | le texte affiché |
| Écran de séance (minuteur) | `assets/pages/timer.js`, `timer.css` | le texte affiché |
| Vocabulaire de la lettre au médecin | `courrier.html` | le mot à changer |
| Message à un remplaçant, comptes autorisés | `reglages_cabinet.html` (`#cp-add`), `ajouterCompte` dans `assets/cloud.js` | |
| Ajouter une page | nouvelle page `.html` + l'ajouter dans `sw.js` | `KINE_EN_PLUS` ou `PRECACHE` |

Avant de proposer du code, toujours vérifier dans MAINTENANCE.md (partie 1) si ça se fait depuis le site.

## Conventions de code
- Modules ES, `import` relatifs ; pas de dépendance à installer. Les pages chargent `/assets/app.css` et appellent `mountShell({ role:"kine" })` ou `role:"patient"`.
- Pages réservées au kiné : `const { requireKine } = await import("/assets/kine.js"); await requireKine();`
- Textes à l'écran en français, phrases courtes ; dates en format français.
- Clé d'un exercice : `exerciseKey(e)`, sous la forme `HEP_<id>` ou `CABINET_<id>`.
- Nouvelle page ou nouveau fichier : l'ajouter dans `sw.js` (`PRECACHE` pour le patient, `KINE_EN_PLUS` pour le kiné).
- Avant de proposer une modification, relire le passage concerné (demander à Gabriel le lien « Raw » du fichier, ou un extrait autour du texte cherché).

Voir **MAINTENANCE.md** : ce qui se fait sans code, comment modifier un fichier sur GitHub, que faire si quelque chose casse.
