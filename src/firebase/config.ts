import { initializeApp, FirebaseApp, getApps } from 'firebase/app';
import { initializeAuth, getReactNativePersistence, Auth } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getStorage, FirebaseStorage } from 'firebase/storage';

// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyAWopSV8beuX9HY3GaezbCENx1RijJSaPE",
  authDomain: "wtc-application-710fa.firebaseapp.com",
  projectId: "wtc-application-710fa",
  storageBucket: "wtc-application-710fa.firebasestorage.app",
  messagingSenderId: "369861087422",
  appId: "1:369861087422:web:fdb63d157c8f40ab6fceef",
  measurementId: "G-B49SJXM861"
};

// Initialize Firebase only once
let app: FirebaseApp;
if (getApps().length === 0) {
  app = initializeApp(firebaseConfig);
  console.log('Firebase initialized successfully');
} else {
  app = getApps()[0];
  console.log('Using existing Firebase app');
}

// ✅ Use AsyncStorage-based persistence for React Native Auth
const auth: Auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage),
});

// Other services
const db: Firestore = getFirestore(app);
const storage: FirebaseStorage = getStorage(app);

export { app, auth, db, storage, firebaseConfig };
