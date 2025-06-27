import React, { createContext, useContext, useState, useEffect } from "react";
import { User } from "firebase/auth";
import { auth } from "../firebase/firebase-config";
import AsyncStorage from '@react-native-async-storage/async-storage';

interface AuthContextType {
  user: User | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log("AuthProvider: Setting up auth state listener");
    
    // Set a timeout to prevent infinite loading state
    const loadingTimeout = setTimeout(() => {
      if (loading) {
        console.log("AuthProvider: Loading timeout reached, setting loading to false");
        setLoading(false);
      }
    }, 5000); // 5 second timeout

    // Check if there's a persisted auth state
    const checkPersistedAuth = async () => {
      try {
        const persistedUser = await AsyncStorage.getItem('@auth_user');
        console.log("AuthProvider: Persisted user state:", persistedUser);
        
        if (persistedUser) {
          const userData = JSON.parse(persistedUser);
          console.log("AuthProvider: Found persisted user:", userData);
        }
      } catch (error) {
        console.error("AuthProvider: Error checking persisted auth:", error);
      }
    };

    checkPersistedAuth();
    
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      console.log("AuthProvider: Auth state changed", {
        user: user ? {
          uid: user.uid,
          email: user.email,
          phoneNumber: user.phoneNumber,
          isAnonymous: user.isAnonymous
        } : null
      });
      
      try {
        if (user) {
          // Store the user's auth state
          const userData = {
            uid: user.uid,
            phoneNumber: user.phoneNumber,
            email: user.email,
            isAnonymous: user.isAnonymous
          };
          await AsyncStorage.setItem('@auth_user', JSON.stringify(userData));
          console.log("AuthProvider: Stored user data:", userData);
        } else {
          // Clear stored auth state
          await AsyncStorage.removeItem('@auth_user');
          console.log("AuthProvider: Cleared stored user data");
        }
      } catch (error) {
        console.error("AuthProvider: Error persisting auth state:", error);
      }
      
      setUser(user);
      setLoading(false);
    });

    return () => {
      console.log("AuthProvider: Cleaning up auth state listener");
      clearTimeout(loadingTimeout);
      unsubscribe();
    };
  }, []);

  // Force loading to false after 5 seconds if still loading
  useEffect(() => {
    if (loading) {
      const timeout = setTimeout(() => {
        console.log("AuthProvider: Force setting loading to false after timeout");
        setLoading(false);
      }, 5000);
      return () => clearTimeout(timeout);
    }
  }, [loading]);

  const value = {
    user,
    loading
  };

  console.log("AuthProvider: Current state", {
    user: user ? {
      uid: user.uid,
      email: user.email,
      phoneNumber: user.phoneNumber,
      isAnonymous: user.isAnonymous
    } : null,
    loading
  });

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
