// Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";

import {
  getFirestore,
  collection,
  addDoc,
  getDocs
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

import {
  getAuth,
  signInWithEmailAndPassword,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";


// CONFIG FIREBASE
const firebaseConfig = {
  apiKey: "AIzaSyAauNHfzBWdVyYH120Cj3ur7gPt7fYQvIw",
  authDomain: "gabrieltimer.firebaseapp.com",
  projectId: "gabrieltimer",
  storageBucket: "gabrieltimer.firebasestorage.app",
  messagingSenderId: "746590580216",
  appId: "1:746590580216:web:7a3e0141fbc43ebdf0fa0d"
};


// Initialisation
const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const auth = getAuth(app);


// TEST CONNEXION
console.log("Firebase connecté");