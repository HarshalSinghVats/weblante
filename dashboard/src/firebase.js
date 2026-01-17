import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBvm214L-3rBAdHGZ738SRc5wKZ-9jG5ow",
  authDomain: "weblante-2e331.firebaseapp.com",
  projectId: "weblante-2e331",
  storageBucket: "weblante-2e331.firebasestorage.app",
  messagingSenderId: "681259544461",
  appId: "1:681259544461:web:945ce6f0dda2eff01fd7c4",
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
