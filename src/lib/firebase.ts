import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBvrqMGgDp6P4yyWoWx3gxWL-beWXwxsCw",
  authDomain: "st-esport-team-finder.firebaseapp.com",
  projectId: "st-esport-team-finder",
  storageBucket: "st-esport-team-finder.firebasestorage.app",
  messagingSenderId: "110544426628",
  appId: "1:110544426628:web:df48a422c328cada37d4d1",
  measurementId: "G-7SMJP4NNYL",
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export default app;
