import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged, signInWithPopup, signOut, googleProvider, auth, db } from '../services/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../services/firestoreErrorHandler';

export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  preferredMode?: 'both' | 'potholes' | 'speed';
}

interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  isLoading: boolean;
  signInWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  updatePreferredMode: (mode: 'both' | 'potholes' | 'speed') => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  userProfile: null,
  isLoading: true,
  signInWithGoogle: async () => {},
  logout: async () => {},
  updatePreferredMode: async () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        const userDocRef = doc(db, 'users', currentUser.uid);
        try {
          const userSnap = await getDoc(userDocRef);
          if (userSnap.exists()) {
            setUserProfile(userSnap.data() as UserProfile);
          } else {
            // Initialize new user profile in Firestore
            const initialProfile: UserProfile = {
              uid: currentUser.uid,
              email: currentUser.email || '',
              displayName: currentUser.displayName || 'RoadGuard Driver',
              photoURL: currentUser.photoURL || '',
              preferredMode: 'both',
            };
            await setDoc(userDocRef, {
              ...initialProfile,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            });
            setUserProfile(initialProfile);
          }
        } catch (err) {
          console.warn('Could not sync user profile with Firestore:', err);
          setUserProfile({
            uid: currentUser.uid,
            email: currentUser.email,
            displayName: currentUser.displayName,
            photoURL: currentUser.photoURL,
            preferredMode: 'both',
          });
        }
      } else {
        setUserProfile(null);
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    try {
      setIsLoading(true);
      await signInWithPopup(auth, googleProvider);
    } catch (err: any) {
      console.error('Google sign in error:', err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
      setUser(null);
      setUserProfile(null);
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  const updatePreferredMode = async (mode: 'both' | 'potholes' | 'speed') => {
    if (!user) return;
    try {
      const userDocRef = doc(db, 'users', user.uid);
      await setDoc(userDocRef, { preferredMode: mode, updatedAt: new Date().toISOString() }, { merge: true });
      setUserProfile((prev) => (prev ? { ...prev, preferredMode: mode } : null));
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${user.uid}`);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        userProfile,
        isLoading,
        signInWithGoogle,
        logout,
        updatePreferredMode,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
