import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Firebase configuration
export const firebaseConfig = {
  apiKey: "AIzaSyAWopSV8beuX9HY3GaezbCENx1RijJSaPE",
  authDomain: "wtc-application-710fa.firebaseapp.com",
  projectId: "wtc-application-710fa",
  storageBucket: "wtc-application-710fa.firebasestorage.app",
  messagingSenderId: "369861087422",
  appId: "1:369861087422:web:fdb63d157c8f40ab6fceef",
  measurementId: "G-B49SJXM861"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Auth
const auth = getAuth(app);

// Initialize Firestore
const db = getFirestore(app);

export { app, auth, db }; 