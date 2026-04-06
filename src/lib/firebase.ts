import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCPeNJBGrLmtDi6O_5vDruceV0l8M9THkg",
  authDomain: "st-team-finder.firebaseapp.com",
  projectId: "st-team-finder",
  storageBucket: "st-team-finder.firebasestorage.app",
  messagingSenderId: "949260366780",
  appId: "1:949260366780:web:e3a445b3654909d646f1b9",
  measurementId: "G-RSE0NY3JQE",
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export default app;
