// src/firebase.jsx
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getAnalytics } from "firebase/analytics";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCrTzllqSEb-yr6D3A9XBL5_dLRTlGBU60",
  authDomain: "mywebapp-c0729.firebaseapp.com",
  projectId: "mywebapp-c0729",
  storageBucket: "mywebapp-c0729.firebasestorage.app",
  messagingSenderId: "944144586796",
  appId: "1:944144586796:web:7d37f6110e42628f179989",
  measurementId: "G-8DN5J1V8JT"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

// Initialize Firebase Auth and export it
export const auth = getAuth(app);
