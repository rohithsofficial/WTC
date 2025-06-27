// src/firebase/firebase-config.ts
// *** UPDATED: Firebase configuration for React Native ***

// 1. Import the core Firebase App module! This is crucial.
import firebase from '@react-native-firebase/app'; 
import { FirebaseAuthTypes } from '@react-native-firebase/auth'; // Keep these for types
import { FirebaseFirestoreTypes } from '@react-native-firebase/firestore'; // Keep these for types

// *** IMPORTANT: Make sure Firebase is properly initialized ***
// For React Native Firebase, ensure you have:
// 1. google-services.json in android/app/ (for Android)
// 2. GoogleService-Info.plist in ios/ (for iOS)
// 3. Proper native module linking (e.g., react-native link @react-native-firebase/app)

// Optional: Explicitly initialize if needed. 
// For most React Native Firebase setups with proper native config, 
// the default app is initialized automatically.
// However, if you keep getting "No Firebase App", uncomment and adjust this:
/*
if (!firebase.apps.length) {
  firebase.initializeApp({
    // Your Firebase config (apiKey, projectId, etc.) can go here if not using native files,
    // but typically the native setup handles this for React Native Firebase.
    // For now, let's trust the native setup is doing its job.
  });
}
*/

// 2. Get Firebase service instances from the 'firebase' app instance!
// This aligns with the modular SDK pattern.
const firebaseAuth = firebase.auth();
const firebaseFirestore = firebase.firestore();

// Export the initialized instances with proper error handling
export const getAuthInstance = () => {
  try {
    return firebaseAuth;
  } catch (error) {
    console.error('Firebase Auth initialization error:', error);
    throw error;
  }
};

export const getFirestoreInstance = () => {
  try {
    return firebaseFirestore;
  } catch (error) {
    console.error('Firebase Firestore initialization error:', error);
    throw error;
  }
};

export const getStorageInstance = () => {
  try {
    // For now, return null since @react-native-firebase/storage is not installed
    // You can install it with: npm install @react-native-firebase/storage
    // Then uncomment the import below and change 'storage' here.
    // import storageModule from '@react-native-firebase/storage';
    // const firebaseStorage = firebase.storage(); // Get storage from the app instance
    console.warn('Firebase Storage not available - @react-native-firebase/storage not installed');
    return null;
  } catch (error) {
    console.error('Firebase Storage initialization error:', error);
    throw error;
  }
};

// Direct exports for convenience (standardized names)
export const auth = firebaseAuth;
export const db = firebaseFirestore;
export const storage = null; // Will be null until storage package is installed

// Export types for TypeScript
export type {
  FirebaseAuthTypes,
  FirebaseFirestoreTypes,
};

// Helper functions for common operations
export const getCurrentUser = () => {
  return firebaseAuth.currentUser;
};

export const signOutUser = async () => {
  try {
    await firebaseAuth.signOut();
    return { success: true };
  } catch (error) {
    console.error('Sign out error:', error);
    return { success: false, error };
  }
};

// Auth state change listener helper
export const onAuthStateChanged = (callback: (user: FirebaseAuthTypes.User | null) => void) => {
  return firebaseAuth.onAuthStateChanged(callback);
};

// Phone authentication helpers
export const signInWithPhoneNumber = async (phoneNumber: string) => {
  try {
    const confirmation = await firebaseAuth.signInWithPhoneNumber(phoneNumber);
    return confirmation;
  } catch (error) {
    console.error('Phone sign-in error:', error);
    throw error;
  }
};

// Firestore helpers
export const createUserDocument = async (uid: string, userData: any) => {
  try {
    await firebaseFirestore.collection('users').doc(uid).set(userData);
    return { success: true };
  } catch (error) {
    console.error('Create user document error:', error);
    return { success: false, error };
  }
};

export const getUserDocument = async (uid: string) => {
  try {
    const doc = await firebaseFirestore.collection('users').doc(uid).get();
    // Firestore doc.exists may be a method in some versions
    return doc.exists ? doc.data() : null; // Changed doc.exists() to doc.exists if it's a property
  } catch (error) {
    console.error('Get user document error:', error);
    throw error;
  }
};

// Check if Firebase is properly initialized
export const checkFirebaseConnection = async () => {
  try {
    // Test auth connection
    const authUser = firebaseAuth.currentUser;
    console.log('Firebase Auth connected:', authUser ? 'Yes' : 'No current user');
    
    // Test firestore connection (optional)
    await firebaseFirestore.collection('_test').limit(1).get();
    console.log('Firebase Firestore connected: Yes');
    
    return true;
  } catch (error) {
    console.error('Firebase connection check failed:', error);
    return false;
  }
};
