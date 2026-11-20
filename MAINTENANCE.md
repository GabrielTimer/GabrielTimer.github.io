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

Partout, un bouton « Revenir au contenu d'origine » permet d'annuler vos modifications.

## 2. Ce qui demande encore une modification du code
- Vocabulaire de la lettre au médecin : `courrier.html`
- Délais de nettoyage des programmes (21, 28 et 30 jours) : `assets/inactivite.js` et `.github/scripts/nettoyage-programmes.mjs`
- Plage horaire des rappels (7 h – 22 h) : `.github/scripts/rappels.mjs`
- Votre nom et votre e-mail de titulaire : `assets/config.js` **et** `firestore.rules` (les deux, toujours ensemble)
- Une nouvelle fonction ou une nouvelle page.

## 3. Demander une modification à Claude gratuit
1. Ouvrez une **nouvelle conversation** pour chaque modification : Claude gratuit a peu de mémoire.
2. Copiez-collez ce message, en remplaçant la dernière ligne :

> Tu m'aides à entretenir mon application ApiKiné (site statique sur GitHub Pages, sans compilation).
> Lis d'abord ses consignes : https://raw.githubusercontent.com/GabrielTimer/gabrieltimer.github.io/main/CLAUDE.md
> Règles : réponds en français simple ; dis-moi d'abord si ça se fait depuis le site sans code ; sinon donne-moi pour chaque fichier le texte exact à chercher et le texte complet qui le remplace ; ne me demande pas de coller de gros fichiers ; pense à augmenter VERSION dans sw.js.
> Ma demande : …

3. Si Claude a besoin de voir un fichier : ouvrez-le sur GitHub, cliquez sur **Raw** et donnez-lui l'adresse, ou copiez-lui seulement le passage concerné.
4. Une modification à la fois. Testez-la avant de passer à la suivante.

## 4. Modifier un fichier sur GitHub (dans le navigateur)
1. Allez sur https://github.com/GabrielTimer/gabrieltimer.github.io et ouvrez le fichier.
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

## 7. À garder gratuit
- **Google AI Studio** (recherche IA) : ne jamais cliquer sur « Set up billing ». Si le quota gratuit est atteint, la recherche reprend le lendemain.
- **Firebase** : rester sur l'offre gratuite (Spark). Ne pas activer de forfait payant.
- **GitHub** : dépôt et Pages gratuits, rien à faire.
