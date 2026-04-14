import { getApp, getApps, initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCPhLRs2rqoF_71cDCzADAlUkOWPGAr4PE",
  authDomain: "skillbridge-ad868.firebaseapp.com",
  projectId: "skillbridge-ad868",
  storageBucket: "skillbridge-ad868.firebasestorage.app",
  messagingSenderId: "856417948140",
  appId: "1:856417948140:web:b72ac2f7d8ef11aa8e70c9",
  measurementId: "G-WZFYB33FNC",
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
export const auth = getAuth(app);
export const db = getFirestore(app);
export default app;
