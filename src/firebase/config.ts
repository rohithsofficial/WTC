import { initializeApp } from 'firebase/app';
import { initializeAuth, getReactNativePersistence } from 'firebase/auth';
import { getFirestore } from "firebase/firestore";
import AsyncStorage from '@react-native-async-storage/async-storage';

// Your web app's Firebase configuration
const firebaseConfig = {
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

// Initialize Auth with AsyncStorage persistence
const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage)
});

// Initialize Firestore
const db = getFirestore(app);

// Export the Firebase instances
export { app, auth, db }; 