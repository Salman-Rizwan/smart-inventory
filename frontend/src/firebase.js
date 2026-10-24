import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Web config is not secret; access is controlled by Firebase security rules.
const firebaseConfig = {
  apiKey: "AIzaSyDt4tp3SSIG88dCqwUsLNral7peL2pE9no",
  authDomain: "smart-inventory-da834.firebaseapp.com",
  projectId: "smart-inventory-da834",
  storageBucket: "smart-inventory-da834.firebasestorage.app",
  messagingSenderId: "898681540405",
  appId: "1:898681540405:web:8c03cfc48a694df224867c",
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
