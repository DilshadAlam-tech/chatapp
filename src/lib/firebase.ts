import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDxFAlSwd42XrBbjDniFuFN-NPYfaYaxW8",
  authDomain: "chatapp-481b5.firebaseapp.com",
  databaseURL: "https://chatapp-481b5-default-rtdb.firebaseio.com",
  projectId: "chatapp-481b5",
  storageBucket: "chatapp-481b5.firebasestorage.app",
  messagingSenderId: "197646218670",
  appId: "1:197646218670:web:efec35a95a21b83304c43f",
  measurementId: "G-CSKZ60MZEG",
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export default app;
