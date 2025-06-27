//src/firebase/Poster-service.ts
import firestore, { collection, query, where, getDocs, addDoc, updateDoc, deleteDoc, doc, Timestamp, orderBy } from '@react-native-firebase/firestore';
import { db } from './firebase-config';

export interface Poster {
  id: string;
  imageUrl: string;
  title?: string;
  description?: string;
  actionUrl?: string;
  isActive: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// Fetch active posters
export const fetchActivePosters = async (): Promise<Poster[]> => {
  try {
    const postersRef = collection(db, "posters");
    const q = query(postersRef, where("isActive", "==", true));
    const querySnapshot = await getDocs(q);

    return querySnapshot.docs.map(
      (doc) =>
        ({
          id: doc.id,
          ...doc.data(),
        } as Poster)
    );
  } catch (error) {
    console.error("Error fetching posters:", error);
    throw error;
  }
};

// Add a new poster
export const addPoster = async (
  posterData: Omit<Poster, "id" | "createdAt" | "updatedAt">
): Promise<string> => {
  try {
    const postersRef = collection(db, "posters");
    const newPoster = {
      ...posterData,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    };

    const docRef = await addDoc(postersRef, newPoster);
    return docRef.id;
  } catch (error) {
    console.error("Error adding poster:", error);
    throw error;
  }
};

// Update a poster
export const updatePoster = async (
  posterId: string,
  posterData: Partial<Poster>
): Promise<void> => {
  try {
    const posterRef = doc(db, "posters", posterId);
    await updateDoc(posterRef, {
      ...posterData,
      updatedAt: Timestamp.now(),
    });
  } catch (error) {
    console.error("Error updating poster:", error);
    throw error;
  }
};

// Delete a poster
export const deletePoster = async (posterId: string): Promise<void> => {
  try {
    const posterRef = doc(db, "posters", posterId);
    await deleteDoc(posterRef);
  } catch (error) {
    console.error("Error deleting poster:", error);
    throw error;
  }
};

// Toggle poster active status
export const togglePosterActive = async (
  posterId: string,
  isActive: boolean
): Promise<void> => {
  try {
    const posterRef = doc(db, "posters", posterId);
    await updateDoc(posterRef, {
      isActive,
      updatedAt: Timestamp.now(),
    });
  } catch (error) {
    console.error("Error toggling poster status:", error);
    throw error;
  }
};

export const getPosters = async (): Promise<Poster[]> => {
  try {
    const postersRef = collection(db, "posters");
    const q = query(
      postersRef,
      where("isActive", "==", true),
      orderBy("createdAt", "desc")
    );

    const querySnapshot = await getDocs(q);
    const posters: Poster[] = [];

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      posters.push({
        id: doc.id,
        imageUrl: data.imageUrl,
        title: data.title,
        description: data.description,
        actionUrl: data.actionUrl,
        isActive: data.isActive,
        createdAt: data.createdAt.toDate(),
        updatedAt: data.updatedAt.toDate(),
      });
    });

    return posters;
  } catch (error) {
    console.error("Error fetching posters:", error);
    return [];
  }
};