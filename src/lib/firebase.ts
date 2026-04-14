import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCPhLRS2rq0F_71cDCzADALuK0WPGAr4PE",
  authDomain: "skillbridge-ad868.firebaseapp.com",
  projectId: "skillbridge-ad868",
  storageBucket: "skillbridge-ad868.firebasestorage.app",
  messagingSenderId: "856417948140",
  appId: "1:856417948140:web:b72ac2f7d8ef11aa8e70c9",
  measurementId: "G-WZFYB33FNC",
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export default app;
