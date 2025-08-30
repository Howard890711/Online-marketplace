import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
    apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
    authDomain: "kumquat-store-754f6.firebaseapp.com",
    projectId: "kumquat-store-754f6",
    storageBucket: "kumquat-store-754f6.firebasestorage.app",
    messagingSenderId: "1030523598629",
    appId: "1:1030523598629:web:da4af12ee1d3be33384ccc"
  };

const app=initializeApp(firebaseConfig)
const db=getFirestore(app)
const auth=getAuth(app)
export {app,db,auth};