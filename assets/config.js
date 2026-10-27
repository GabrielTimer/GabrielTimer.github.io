/* Réglages généraux de l'application.
   Si tu changes l'adresse e-mail du compte kiné, change-la aussi dans firestore.rules. */

export const KINE = {
  nom: "Gabriel LAVEAU",
  titre: "Masseur-kinésithérapeute",
  email: "kine.laveau@gmail.com"
};

/* Comptes Firebase autorisés à utiliser l'espace kiné */
export const ADMIN_EMAILS = ["kine.laveau@gmail.com"];

/* Adresse publique du site (utilisée pour les liens et QR codes envoyés aux patients) */
export const SITE_URL = "https://gabrieltimer.github.io";

/* Nom de l'application */
export const APP_NAME = "ApiKiné";

export const APP_VERSION = "2.6.0";

export const FIREBASE_CONFIG = {
  apiKey: "AIzaSyAauNHfzBWdVyYH120Cj3ur7gPt7fYQvIw",
  authDomain: "gabrieltimer.firebaseapp.com",
  projectId: "gabrieltimer",
  storageBucket: "gabrieltimer.firebasestorage.app",
  messagingSenderId: "746590580216",
  appId: "1:746590580216:web:7a3e0141fbc43ebdf0fa0d"
};
