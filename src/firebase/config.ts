import { initializeApp, FirebaseApp, getApps } from 'firebase/app';
import { initializeAuth, getReactNativePersistence, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import * as FirebaseCore from 'expo-firebase-core';

import {
  FIREBASE_API_KEY,
  FIREBASE_AUTH_DOMAIN,
  FIREBASE_PROJECT_ID,
  FIREBASE_STORAGE_BUCKET,
  FIREBASE_MESSAGING_SENDER_ID,
  FIREBASE_APP_ID,
  FIREBASE_MEASUREMENT_ID,
} from '@env';

// Get Firebase config from Expo config if available
const firebaseConfig = FirebaseCore.DEFAULT_WEB_APP_OPTIONS || {
  apiKey: FIREBASE_API_KEY,
  authDomain: FIREBASE_AUTH_DOMAIN,
  projectId: FIREBASE_PROJECT_ID,
  storageBucket: FIREBASE_STORAGE_BUCKET,
  messagingSenderId: FIREBASE_MESSAGING_SENDER_ID,
  appId: FIREBASE_APP_ID,
  measurementId: FIREBASE_MEASUREMENT_ID,
};

// Initialize Firebase only if it hasn't been initialized
let app: FirebaseApp;
try {
  if (getApps().length === 0) {
    app = initializeApp(firebaseConfig);
    console.log('Firebase initialized successfully');
  } else {
    app = getApps()[0];
    console.log('Using existing Firebase app');
  }
} catch (error) {
  console.error('Error initializing Firebase:', error);
  throw error;
}

// Initialize Auth with AsyncStorage persistence
let auth: Auth;
try {
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage)
  });
  console.log('Firebase Auth initialized with AsyncStorage persistence');
} catch (error) {
  console.error('Error initializing Firebase Auth:', error);
  throw error;
}

// Setup Firestore
const db: Firestore = getFirestore(app);

export { app, auth, db, firebaseConfig };
