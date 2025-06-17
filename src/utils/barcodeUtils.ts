import { doc, updateDoc, setDoc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/config';

// ✅ CORRECT: Update existing document
export const updateUserBarcodeCorrect = async (userId: string, barcodeToken: string) => {
  try {
    const userDocRef = doc(db, 'users', userId);
    await updateDoc(userDocRef, {
      currentBarcodeToken: barcodeToken,
      barcodeExpiry: new Date(Date.now() + 3600000), // 1 hour from now
      updatedAt: new Date()
    });
    console.log('User barcode updated successfully');
  } catch (error) {
    console.error('Error updating user barcode:', error);
    throw error;
  }
};

// ✅ CORRECT: Create or update document (upsert)
export const upsertUserBarcode = async (userId: string, barcodeToken: string) => {
  try {
    const userDocRef = doc(db, 'users', userId);
    await setDoc(userDocRef, {
      currentBarcodeToken: barcodeToken,
      barcodeExpiry: new Date(Date.now() + 3600000),
      updatedAt: new Date()
    }, { merge: true }); // merge: true means it won't overwrite existing fields
    console.log('User barcode upserted successfully');
  } catch (error) {
    console.error('Error upserting user barcode:', error);
    throw error;
  }
};

// ✅ CORRECT: Check if document exists before updating
export const safeUpdateUserBarcode = async (userId: string, barcodeToken: string) => {
  try {
    const userDocRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userDocRef);
    
    if (!userDoc.exists()) {
      throw new Error(`User with ID ${userId} does not exist`);
    }
    
    await updateDoc(userDocRef, {
      currentBarcodeToken: barcodeToken,
      barcodeExpiry: new Date(Date.now() + 3600000),
      updatedAt: new Date()
    });
    console.log('User barcode updated safely');
  } catch (error) {
    console.error('Error safely updating user barcode:', error);
    throw error;
  }
};

// ❌ WRONG: This will cause the error you're seeing
export const wrongUpdatePattern = async (userId: string) => {
  try {
    let userDocRef; // undefined
    // userDocRef is never assigned a value
    
    // This will fail with "userDocRef.update is not a function"
    await userDocRef.update({
      someField: 'someValue'
    });
  } catch (error) {
    console.error('This will fail:', error);
  }
};

// ❌ WRONG: Using old Firebase v8 syntax in v9+
export const oldSyntaxPattern = async (userId: string) => {
  try {
    const userDocRef = doc(db, 'users', userId);
    
    // This doesn't exist in Firebase v9+
    // await userDocRef.update({ ... }); // ❌ Wrong
    
    // Use updateDoc instead
    await updateDoc(userDocRef, { someField: 'value' }); // ✅ Correct
  } catch (error) {
    console.error('Error:', error);
  }
};