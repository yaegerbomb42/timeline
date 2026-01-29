import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// Firebase config (public, safe to ship — security is enforced via Firestore rules)
const firebaseConfig = {
  apiKey: "AIzaSyCcyTZJoKlhhltDBf7BEYXBAeqR4IuaKDg",
  authDomain: "timeline-a200d.firebaseapp.com",
  projectId: "timeline-a200d",
  storageBucket: "timeline-a200d.firebasestorage.app",
  messagingSenderId: "744130891056",
  appId: "1:744130891056:web:e3d366d2c08a3f3f7dccf5",
};

export const firebaseApp = getApps().length ? getApps()[0]! : initializeApp(firebaseConfig);
export const auth = getAuth(firebaseApp);
export const db = getFirestore(firebaseApp);
export const storage = getStorage(firebaseApp);


