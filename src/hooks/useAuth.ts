import { useState, useEffect } from 'react';
import authModule, {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
  updateProfile,
  FirebaseAuthTypes,
} from '@react-native-firebase/auth';
import { db } from '../firebase/firebase-config';
import { User } from '../types/interfaces';

interface AuthState {
  user: User | null;
  loading: boolean;
  error: string | null;
}

interface SignUpData {
  email: string;
  password: string;
  displayName: string;
  phoneNumber: string;
}

export const useAuth = () => {
  const [state, setState] = useState<AuthState>({
    user: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(authModule(), async (firebaseUser) => {
      if (firebaseUser) {
        const userData = await getUserData(firebaseUser);
        setState({
          user: userData,
          loading: false,
          error: null,
        });
      } else {
        setState({
          user: null,
          loading: false,
          error: null,
        });
      }
    });

    return () => unsubscribe();
  }, []);

  const getUserData = async (firebaseUser: FirebaseAuthTypes.User): Promise<User> => {
    const userDoc = await db.collection('users').doc(firebaseUser.uid).get();
    if (userDoc.exists) {
      return userDoc.data() as User;
    }
    return {
      id: firebaseUser.uid,
      email: firebaseUser.email || '',
      displayName: firebaseUser.displayName || '',
      phoneNumber: firebaseUser.phoneNumber || '',
      loyaltyPoints: 0,
      favorites: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  };

  const signUp = async ({ email, password, displayName, phoneNumber }: SignUpData) => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));
      const { user: firebaseUser } = await createUserWithEmailAndPassword(authModule(), email, password);
      
      await updateProfile(firebaseUser, { displayName });
      
      const userData: User = {
        id: firebaseUser.uid,
        email,
        displayName,
        phoneNumber,
        loyaltyPoints: 0,
        favorites: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await db.collection('users').doc(firebaseUser.uid).set(userData);
      
      setState({
        user: userData,
        loading: false,
        error: null,
      });
    } catch (error) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: (error as Error).message,
      }));
      throw error;
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));
      await signInWithEmailAndPassword(authModule(), email, password);
    } catch (error) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: (error as Error).message,
      }));
      throw error;
    }
  };

  const logout = async () => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));
      await signOut(authModule());
      setState({
        user: null,
        loading: false,
        error: null,
      });
    } catch (error) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: (error as Error).message,
      }));
      throw error;
    }
  };

  const resetPassword = async (email: string) => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));
      await sendPasswordResetEmail(authModule(), email);
      setState(prev => ({ ...prev, loading: false }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: (error as Error).message,
      }));
      throw error;
    }
  };

  const updateUserData = async (updates: Partial<User>) => {
    if (!state.user) return;

    try {
      setState(prev => ({ ...prev, loading: true, error: null }));
      
      const userRef = db.collection('users').doc(state.user.id);
      const updatedUser = {
        ...state.user,
        ...updates,
        updatedAt: new Date(),
      };
      
      await userRef.set(updatedUser, { merge: true });
      
      setState(prev => ({
        ...prev,
        user: updatedUser,
        loading: false,
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: (error as Error).message,
      }));
      throw error;
    }
  };

  return {
    user: state.user,
    loading: state.loading,
    error: state.error,
    signUp,
    signIn,
    logout,
    resetPassword,
    updateUserData,
  };
}; 