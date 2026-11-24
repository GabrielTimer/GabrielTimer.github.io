# Entretenir ApiKiné soi-même, gratuitement

Ce guide est pour Gabriel. Les consignes pour Claude sont dans [CLAUDE.md](CLAUDE.md).

## 1. D'abord : ce qui se fait depuis le site, sans code
Avant de toucher au code, vérifiez si c'est faisable ici (espace kiné → **Outils**).

| Je veux… | Où |
|---|---|
| Changer le nom, le logo, les textes, l'annonce aux patients, les seuils d'alerte, les listes | Outils → **Réglages du cabinet** |
| Ajouter, modifier ou masquer un exercice (consignes, image, vidéo, matériel) | **Exercices** → fiche de l'exercice → Modifier ; ou « Créer » |
| Créer ou modifier un modèle (y compris un modèle fourni : il est copié) | **Créer** → Modèles, ou Outils → Modèles |
| Changer une progression plus facile / plus difficile | Dans l'éditeur, sur un exercice : **Variantes** → « Modifier cette progression » |
| Modifier les tests, leurs fiches techniques, les hypothèses, les drapeaux rouges | Outils → **Contenu du bilan** → « Tests par région » |
| Modifier les questions de l'entretien | Outils → **Contenu du bilan** → « Questions de l'entretien » |
| Modifier les axes de traitement et les modèles proposés en fin de bilan | Outils → **Contenu du bilan** → « Traitement proposé » |
| Questionnaires, fiches conseils | Outils → Questionnaires / Fiches conseils |
| Clé de la recherche IA | Recherche IA → lien « Réglages de la recherche IA » en bas |
| Donner l'accès à un remplaçant, le retirer | Outils → Réglages du cabinet → **Comptes autorisés** (si l'appli affiche « Encore une étape à faire à la main », suivre les 3 étapes indiquées) |
| Délai de déconnexion automatique de la tablette ou du téléphone | Outils → Réglages du cabinet → **Déconnexion automatique de cet appareil** (12 h conseillées) |
| Code du mode séance (7777 par défaut) | Outils → Réglages du cabinet → **Mode séance** |
| Sauvegarder à la main, restaurer une sauvegarde | Outils → Réglages du cabinet → **Sauvegarde** |
| Fiche « Si ça revient », test du mois à la maison, leçons, questionnaire avant le 1er rendez-vous | Fiche du patient → bloc **Accompagnement** (caché pour l'instant ; pour le réafficher, demander à Claude : `VISIBLE` dans `assets/accompagnement.js`) |
| Voir la part de patients qui progressent vraiment, par pathologie | Outils → **Mes résultats** |
| Mettre les bilans (PDF) et leurs photos dans les dossiers du PC, pour Maiia | Outils → **Mettre dans Maiia** (sur le PC, dans Chrome ou Edge) ; dossiers à choisir sur cette page ou dans Réglages du cabinet → Dossiers d'enregistrement |

Partout, un bouton « Revenir au contenu d'origine » permet d'annuler vos modifications.

## 2. Ce qui demande encore une modification du code
- Vocabulaire de la lettre au médecin : `courrier.html`
- Délais de nettoyage des programmes (21, 28 et 30 jours) : `assets/inactivite.js` et `.github/scripts/nettoyage-programmes.mjs`
- Plage horaire des rappels (7 h – 22 h) : `.github/scripts/rappels.mjs`
- Réglages de la reprise de course (paliers marche/course, hausse de 10 % par semaine, conseils par pathologie) : bloc `REGLAGES` en haut du script de `programmescourse.html`
- Textes de la fiche « Si ça revient » (signes d'alerte, 3 exercices proposés par région) : `assets/rechute.js` ; consignes des tests du mois : `assets/test-maison.js`
- Adresse du Manuel des preuves (si vous le refaites ailleurs) : `MANUEL_URL` dans `assets/manuel.js`
- Votre nom et votre e-mail de titulaire : `assets/config.js` **et** `firestore.rules` (les deux, toujours ensemble)
- Une nouvelle fonction ou une nouvelle page.

## 3. Demander une modification à Claude gratuit
Les deux messages ci-dessous sont aussi dans l'appli, prêts à copier : Outils → **Entretenir l'appli**.

1. Ouvrez une **nouvelle conversation** pour chaque modification : Claude gratuit a peu de mémoire.
2. Copiez-collez ce message, en remplaçant la dernière ligne :

> Tu m'aides à entretenir mon application ApiKiné (site statique sur GitHub Pages, sans compilation).
> Lis d'abord ses consignes : https://raw.githubusercontent.com/GabrielTimer/GabrielTimer.github.io/main/CLAUDE.md
> Règles : réponds en français simple ; dis-moi d'abord si ça se fait depuis le site sans code ; sinon donne-moi pour chaque fichier le texte exact à chercher et le texte complet qui le remplace ; ne me demande pas de coller de gros fichiers ; pense à augmenter VERSION dans sw.js.
> Ma demande : …

3. Si Claude a besoin de voir un fichier : ouvrez-le sur GitHub, cliquez sur **Raw** et donnez-lui l'adresse, ou copiez-lui seulement le passage concerné.
4. Une modification à la fois. Testez-la avant de passer à la suivante.

### Point santé, tous les 3 ou 4 mois
Avant d'écrire à Claude, notez trois choses :
- le numéro de version, affiché en bas de la page **Réglages** ;
- s'il y a du rouge dans l'onglet **Actions** de GitHub, et lesquelles ;
- les bandeaux d'alerte de l'accueil kiné, et ce qui vous gêne en ce moment.

Puis collez ce message dans une nouvelle conversation :

> Tu m'aides à entretenir mon application ApiKiné (site statique sur GitHub Pages, données dans Firebase, tout doit rester gratuit).
> Lis d'abord ses consignes : https://raw.githubusercontent.com/GabrielTimer/GabrielTimer.github.io/main/CLAUDE.md
> Fais un point santé, en cherchant sur internet ce qui a changé depuis la version de l'appli :
> 1. Firebase (offre gratuite Spark) : limites, fin de service ou failles connues pour le SDK web 10.12.2.
> 2. Google AI Studio / Gemini : l'offre gratuite existe-t-elle encore, et les noms de modèles gemini-flash-latest et gemini-2.5-flash marchent-ils encore ?
> 3. GitHub Actions : actions/checkout@v5, actions/setup-node@v5, Node 22 et firebase-admin@12 sont-ils encore pris en charge ? Les tâches programmées restent-elles gratuites pour un dépôt public ?
> 4. html2canvas 1.4.1 et jsPDF 2.5.1 (sur cdnjs) : failles connues ?
> Mes infos : version de l'appli … ; Actions : … ; alertes de l'accueil : … ; ce qui me gêne : …
> Réponds en français simple : ce qui va, puis au plus 3 choses à faire, de la plus urgente à la moins urgente. Pour chacune, donne le fichier, le texte exact à chercher et le texte qui le remplace. Ne me demande pas de coller de gros fichiers.

## 4. Modifier un fichier sur GitHub (dans le navigateur)
1. Allez sur https://github.com/GabrielTimer/GabrielTimer.github.io et ouvrez le fichier.
2. Cliquez sur le **crayon** (Modifier).
3. **Ctrl+F** pour trouver le texte indiqué par Claude. Sélectionnez exactement ce texte et collez le nouveau à la place.
4. Faites de même pour la ligne `const VERSION = "gt-…"` dans `sw.js` : augmentez le dernier chiffre.
5. Cliquez sur **Commit changes** (Valider les modifications), avec une courte phrase qui dit ce que vous avez changé.

## 5. Vérifier
- Onglet **Actions** du dépôt : « Vérifier le site » doit être vert (environ 30 secondes). En cas de problème, GitHub vous envoie aussi un e-mail.
- Le site se met à jour 1 à 2 minutes plus tard. Sur le téléphone ou la tablette : fermez complètement l'appli puis rouvrez-la, deux fois.

## 6. Si quelque chose casse
- **Rouge dans Actions** : ouvrez la ligne rouge, puis « verifier ». Le message dit quel fichier et quelle ligne posent problème. Donnez ce message à Claude.
- **Revenir en arrière sur un fichier** : sur GitHub, ouvrez le fichier puis **History** (Historique). Ouvrez la version d'avant votre modification, puis **Raw**, et copiez tout. Ouvrez le fichier actuel, cliquez sur le crayon, remplacez tout le contenu par la copie, puis faites Commit.
- Vos données (patients, bilans, messages) ne sont **pas** dans les fichiers du site : une erreur dans le code ne les efface pas. Elles sont aussi sauvegardées chaque semaine, chiffrées, dans votre dépôt GitHub privé.

## 7. Les tâches automatiques (onglet Actions de GitHub)
Elles tournent toutes seules, gratuitement. GitHub vous envoie un e-mail si l'une d'elles échoue.

| Tâche | Quand | Rôle |
|---|---|---|
| Vérifier le site | à chaque modification | contrôle les fichiers (voir partie 5) |
| Rappels de séance | toutes les 15 minutes, de 7 h à 22 h | notifications aux patients (séance du jour, message du kiné) |
| Programmes inutilisés | chaque nuit | préavis puis corbeille des programmes maison abandonnés |
| Sauvegarde automatique | chaque dimanche vers 3 h | copie chiffrée de toutes les données dans le dépôt privé `apikine-sauvegardes` (26 gardées) |
| Publier les règles Firebase | quand `firestore.rules` change | met à jour la sécurité de Firebase |
| Garder les tâches actives | le 3 de chaque mois | empêche GitHub de mettre les tâches en pause après 60 jours sans modification du site |

Pour en relancer une à la main : Actions → cliquez sur son nom → **Run workflow**.

### Renouveler le jeton de la sauvegarde automatique
L'accueil kiné prévient 30 jours avant qu'il expire. Il faut environ 5 minutes :
1. Sur GitHub : votre photo (en haut à droite) → **Settings** → **Developer settings** → **Personal access tokens** → **Fine-grained tokens**.
2. Ouvrez le jeton de la sauvegarde → **Regenerate token** → choisissez la durée la plus longue proposée → copiez le jeton affiché (il ne s'affiche qu'une fois).
3. Dépôt `GabrielTimer.github.io` → **Settings** → **Secrets and variables** → **Actions** → `SAUVEGARDE_TOKEN` → crayon → collez le jeton → **Update secret**.
4. Vérifiez : Actions → « Sauvegarde automatique » → **Run workflow**. Elle doit être verte.

Le mot de passe de chiffrement (`SAUVEGARDE_MOT_DE_PASSE`) ne change pas : gardez-le en lieu sûr, il sert à restaurer.

### Restaurer une sauvegarde automatique
1. Dépôt privé `apikine-sauvegardes` → ouvrez le fichier `sauvegarde-kine-AAAA-MM-JJ.apikine` voulu → **Download raw file**.
2. Outils → Réglages du cabinet → Sauvegarde → **Restaurer une sauvegarde…** → choisissez le fichier → saisissez le mot de passe de chiffrement → cochez ce qu'il faut restaurer.

## 8. À garder gratuit
- **Google AI Studio** (recherche IA) : ne jamais cliquer sur « Set up billing ». Si le quota gratuit est atteint, la recherche reprend le lendemain.
- **Firebase** : rester sur l'offre gratuite (Spark). Ne pas activer de forfait payant. Le quota gratuit (50 000 lectures par jour) est très large pour un cabinet ; les rappels automatiques ont été réglés pour lire le moins possible. Si un jour l'appli affiche des erreurs de chargement en fin de journée, c'est peut-être le quota : tout revient le lendemain matin.
- **GitHub** : dépôt et Pages gratuits, rien à faire.
