# Mise en service de la version 2

Cette version protège les données de santé de vos patients. Avant de la mettre en ligne, il faut faire trois réglages dans Firebase (environ 10 minutes), puis importer vos anciens programmes.

Faites toutes les étapes à la suite, de préférence à un moment calme : entre l'étape 3 et l'étape 5, vos patients ne verront plus leurs programmes tant que vous ne leur aurez pas envoyé leur nouveau lien.

## 1. Créer votre compte kiné dans Firebase

1. Ouvrez la [console Firebase](https://console.firebase.google.com/) et choisissez le projet **gabrieltimer**.
2. Menu **Authentication** (Authentification), onglet **Sign-in method** : activez **E-mail/Mot de passe**.
3. Onglet **Users** : **Ajouter un utilisateur** avec l'adresse `kine.laveau@gmail.com` et un mot de passe solide (celui que vous utiliserez pour vous connecter).
4. Onglet **Settings**, rubrique **User actions** : décochez **Enable create (sign-up)**. Ainsi, personne d'autre ne peut se créer un compte.

Pour utiliser une autre adresse e-mail, remplacez `kine.laveau@gmail.com` dans deux fichiers : `assets/config.js` (`ADMIN_EMAILS`) et `firestore.rules` (fonction `isKine`).

## 2. Publier les règles de sécurité

1. Menu **Firestore Database**, onglet **Règles**.
2. Remplacez tout le contenu par celui du fichier [`firestore.rules`](firestore.rules).
3. Cliquez sur **Publier**.

À partir de là, seul votre compte peut lire et modifier les données. Chaque patient ne voit que son propre dossier, grâce à son code d'accès personnel.

## 3. Mettre le site en ligne

Fusionnez la pull request sur GitHub. GitHub Pages publie le site en une à deux minutes.

## 4. Importer vos anciens programmes

1. Ouvrez le site, touchez trois fois le logo, connectez-vous.
2. Allez dans **Outils** puis **Importer les anciens programmes**.
3. Un dossier est créé pour chaque patient, avec ses séances, son historique de douleur et un code d'accès. Vos séances « admin » deviennent des **modèles**.

Les anciens documents ne sont pas effacés. Vous pouvez relancer l'import sans créer de doublon.

## 5. Envoyer leur nouveau lien aux patients

Dans **Patients**, ouvrez chaque fiche, puis **Accès patient** : envoyez le lien par SMS, e-mail ou WhatsApp, ou faites scanner le QR code au cabinet. Vous pouvez aussi imprimer une carte d'accès (menu **Plus**).

Pensez à compléter la fiche de chaque patient importé (nom complet, téléphone) avec **Modifier**.

## Corriger un exercice de la bibliothèque

Dans la fiche d'un exercice (bibliothèque, ou bouton « Voir » d'un exercice dans une séance), le petit crayon en haut à droite permet de corriger le titre, les consignes, la position, les conseils, le matériel, la vidéo et le réglage proposé (répétitions, effort, repos, niveau).

- Les corrections sont enregistrées dans Firebase (collection `exercices`) : les fichiers d'exercices du site ne sont pas modifiés et vous pouvez toujours revenir à la version d'origine.
- Si la case « Corriger aussi les séances déjà envoyées » est cochée, la correction est reportée dans les séances pas encore faites de vos patients et dans vos modèles. Ce que vous avez personnalisé pour un patient (nom changé, réglages) n'est pas touché.
- **À faire une fois** : ces corrections demandent la règle `exercices` ajoutée dans [`firestore.rules`](firestore.rules). Recopiez le fichier dans Firebase (étape 2 ci-dessus) puis **Publier**. Sans cela, le formulaire affiche « Firebase refuse l'enregistrement ».

## Créer un exercice

Dans **Exercices** (ou dans la bibliothèque d'une séance en préparation), le bouton **Créer un exercice** ouvre une fiche à remplir : titre, image, consignes, position, réglage proposé (répétitions, effort, repos, niveau), zone du corps, type, mots-clés, indications, matériel, muscles, lien vidéo, conseils et variantes.

- L'exercice apparaît aussitôt dans la bibliothèque, avec le badge « Mes exercices » (filtre « Mes exercices » dans la liste des sources). Les mots-clés servent à le retrouver dans la recherche.
- L'image est réduite automatiquement (environ 100 Ko au maximum) et enregistrée avec l'exercice dans Firebase.
- Le crayon de sa fiche permet de le modifier ou de le supprimer. Les séances qui l'utilisent déjà le gardent.
- Il utilise la même règle `exercices` que les corrections : rien de plus à publier.

## Créer une pathologie

Dans **Pathologies**, le bouton **Créer une pathologie** ouvre l'éditeur de séance : nom, exercices de la bibliothèque (y compris les vôtres), réglages, tours, consigne personnelle. En bas, choisissez la zone du corps (existante ou nouvelle) et, si vous voulez, une image pour la carte (sinon celle du premier exercice), puis **Enregistrer la pathologie**.

- Elle apparaît dans la liste avec le badge « Créée par vous » ; le crayon permet de la modifier ou de la supprimer.
- Pour partir d'une pathologie existante : ouvrez-la puis **Copier et adapter**.
- Elles sont rangées avec vos modèles dans Firebase (même accès réservé au kiné) : rien à changer dans les règles.

## Bon à savoir

- **Code d'accès perdu ou partagé** : dans la fiche du patient, **Plus** puis **Générer un nouveau code d'accès**. L'ancien lien cesse de fonctionner.
- **Aperçu patient** : le bouton **Vue patient** ouvre l'application telle que votre patient la voit. Rien n'est enregistré dans son dossier quand vous testez une séance depuis l'aperçu.
- **Mot de passe oublié** : lien sous le formulaire de connexion.
