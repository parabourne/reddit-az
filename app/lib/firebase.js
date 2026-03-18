import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getStorage } from "firebase/storage"; // 1. Bunu əlavə et

const firebaseConfig = {
  apiKey: "AIzaSyBYtAk9usf2yi98M9fecRaI3teMoPEgees",
  authDomain: "reddit-az-8ac11.firebaseapp.com",
  projectId: "reddit-az-8ac11",
  storageBucket: "reddit-az-8ac11.firebasestorage.app",
  messagingSenderId: "862482088263",
  appId: "1:862482088263:web:bef187a757ed979e938c62",
  measurementId: "G-TJHXJQTYQJ"
};

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app); // 2. Bunu eksport et
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });