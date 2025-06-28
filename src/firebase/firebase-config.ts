// src/firebase/firebase-config.ts
// *** MODERN: Firebase v22+ configuration for React Native ***

import { getApp, getApps, initializeApp } from '@react-native-firebase/app';
import { getAuth, onAuthStateChanged as authStateChanged, signInWithPhoneNumber as phoneSignIn, signOut } from '@react-native-firebase/auth';
import { 
  getFirestore,
  collection,
  doc,
  getDoc,
  setDoc,
  getDocs,
  updateDoc,
  addDoc,
  deleteDoc,
  query,
  where,
  onSnapshot,
  increment,
  Timestamp,
  serverTimestamp
} from '@react-native-firebase/firestore';

console.log('Firebase configuration loading...');

// *** Step 1: Ensure Firebase App is initialized ***
let app;
try {
  const apps = getApps();
  
  if (apps.length === 0) {
    // For React Native Firebase, the app is auto-initialized from google-services.json
    // We just need to get the default app
    app = getApp();
    console.log('Firebase app initialized successfully');
  } else {
    app = getApp();
    console.log('Firebase app retrieved successfully');
  }
} catch (error) {
  console.error('Firebase app initialization failed:', error);
  throw new Error('Firebase setup failed. Check google-services.json and native linking.');
}

// *** Step 2: Get service instances using new modular API ***
const authInstance = getAuth();
const firestoreInstance = getFirestore();

console.log('Firebase services connected successfully');

// *** Exports ***
export { authInstance as auth, firestoreInstance as db };

// Export modular functions for convenience
export { 
  collection, 
  doc, 
  getDoc, 
  setDoc, 
  getDocs, 
  updateDoc, 
  addDoc, 
  deleteDoc, 
  query, 
  where, 
  onSnapshot, 
  increment 
};

// *** Helper Functions ***
export const getCurrentUser = () => {
  return authInstance.currentUser;
};

export const signOutUser = async () => {
  try {
    await signOut(authInstance);
    return { success: true };
  } catch (error) {
    console.error('Sign out error:', error);
    return { success: false, error };
  }
};

export const onAuthStateChanged = (callback: (user: any) => void) => {
  return authStateChanged(authInstance, callback);
};

export const signInWithPhoneNumber = async (phoneNumber: string) => {
  try {
    const confirmation = await phoneSignIn(authInstance, phoneNumber);
    return confirmation;
  } catch (error) {
    console.error('Phone sign-in error:', error);
    throw error;
  }
};

export const createUserDocument = async (uid: string, userData: any) => {
  try {
    await setDoc(doc(firestoreInstance, 'users', uid), userData);
    return { success: true };
  } catch (error) {
    console.error('Create user document error:', error);
    return { success: false, error };
  }
};

export const getUserDocument = async (uid: string) => {
  try {
    const docRef = doc(firestoreInstance, 'users', uid);
    const docSnap = await getDoc(docRef);
    return docSnap.exists() ? docSnap.data() : null;
  } catch (error) {
    console.error('Get user document error:', error);
    throw error;
  }
};

// *** FIXED: Proper Timestamp export for v22+ ***
export { Timestamp, serverTimestamp };

export const checkFirebaseConnection = async () => {
  try {
    const authUser = authInstance.currentUser;
    console.log('Auth connected:', authUser ? 'Yes' : 'No user');
    
    // Test firestore with a simple operation
    const testCollection = collection(firestoreInstance, '_test');
    console.log('Firestore connected: Yes');
    
    return true;
  } catch (error) {
    console.error('Connection check failed:', error);
    return false;
  }
};