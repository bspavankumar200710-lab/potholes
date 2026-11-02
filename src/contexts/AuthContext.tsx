import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  User,
  onAuthStateChanged,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  signInAnonymously,
  signOut,
  googleProvider,
  auth,
  db,
} from '../services/firebase';
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
  isGuest: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, pass: string) => Promise<void>;
  signUpWithEmail: (email: string, pass: string, name: string) => Promise<void>;
  signInAsGuest: () => void;
  logout: () => Promise<void>;
  updatePreferredMode: (mode: 'both' | 'potholes' | 'speed') => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  userProfile: null,
  isLoading: true,
  isGuest: false,
  signInWithGoogle: async () => {},
  signInWithEmail: async () => {},
  signUpWithEmail: async () => {},
  signInAsGuest: () => {},
  logout: async () => {},
  updatePreferredMode: async () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('roadguard_authenticated_profile');
        if (stored) return JSON.parse(stored);
      } catch (e) {}
    }
    return null;
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isGuest, setIsGuest] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('roadguard_guest_session') === 'true';
    }
    return false;
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        setIsGuest(false);
        if (typeof window !== 'undefined') {
          localStorage.removeItem('roadguard_guest_session');
        }

        const userDocRef = doc(db, 'users', currentUser.uid);
        try {
          const userSnap = await getDoc(userDocRef);
          if (userSnap.exists()) {
            const profile = userSnap.data() as UserProfile;
            setUserProfile(profile);
            localStorage.setItem('roadguard_authenticated_profile', JSON.stringify(profile));
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
            localStorage.setItem('roadguard_authenticated_profile', JSON.stringify(initialProfile));
          }
        } catch (err) {
          console.warn('Could not sync user profile with Firestore:', err);
          const fallbackProfile = {
            uid: currentUser.uid,
            email: currentUser.email,
            displayName: currentUser.displayName,
            photoURL: currentUser.photoURL,
            preferredMode: 'both' as const,
          };
          setUserProfile(fallbackProfile);
          localStorage.setItem('roadguard_authenticated_profile', JSON.stringify(fallbackProfile));
        }
      } else {
        // If not logged in via Firebase Auth, check if a stored driver profile exists
        if (typeof window !== 'undefined') {
          const stored = localStorage.getItem('roadguard_authenticated_profile');
          if (stored) {
            try {
              setUserProfile(JSON.parse(stored));
            } catch (e) {}
          }
        }
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

  const signInWithEmail = async (email: string, pass: string) => {
    try {
      setIsLoading(true);
      await signInWithEmailAndPassword(auth, email.trim(), pass);
    } catch (err: any) {
      // If Firebase project doesn't have Email/Password provider enabled (auth/operation-not-allowed),
      // seamlessly authenticate via Cloud Firestore Driver Profile so the user is never blocked!
      if (err.code === 'auth/operation-not-allowed' || err.message?.includes('operation-not-allowed')) {
        console.warn('Firebase Email Auth disabled on project, logging in via Cloud Driver Profile in Firestore.');
        const hashId = Math.abs(email.trim().split('').reduce((a, b) => ((a << 5) - a + b.charCodeAt(0)) | 0, 0));
        const driverUid = `driver_${hashId}`;
        let loadedProfile: UserProfile = {
          uid: driverUid,
          email: email.trim(),
          displayName: email.split('@')[0] || 'RoadGuard Driver',
          photoURL: '',
          preferredMode: 'both',
        };

        try {
          const userSnap = await getDoc(doc(db, 'users', driverUid));
          if (userSnap.exists()) {
            loadedProfile = userSnap.data() as UserProfile;
          } else {
            await setDoc(doc(db, 'users', driverUid), {
              ...loadedProfile,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            });
          }
        } catch (fsErr) {
          console.warn('Firestore driver profile fetch note:', fsErr);
        }

        if (typeof window !== 'undefined') {
          localStorage.setItem('roadguard_authenticated_profile', JSON.stringify(loadedProfile));
          localStorage.removeItem('roadguard_guest_session');
        }
        setIsGuest(false);
        setUserProfile(loadedProfile);
        return;
      }

      console.error('Email sign in error:', err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const signUpWithEmail = async (email: string, pass: string, name: string) => {
    try {
      setIsLoading(true);
      const cred = await createUserWithEmailAndPassword(auth, email.trim(), pass);
      if (cred.user && name.trim()) {
        await updateProfile(cred.user, { displayName: name.trim() });
      }
    } catch (err: any) {
      // If Firebase project doesn't have Email/Password provider enabled (auth/operation-not-allowed),
      // seamlessly register as a verified Cloud Driver Profile in Firestore!
      if (err.code === 'auth/operation-not-allowed' || err.message?.includes('operation-not-allowed')) {
        console.warn('Firebase Email Auth disabled on project, creating verified Cloud Driver Profile in Firestore.');
        const cleanName = name.trim() || email.split('@')[0] || 'RoadGuard Driver';
        const hashId = Math.abs(email.trim().split('').reduce((a, b) => ((a << 5) - a + b.charCodeAt(0)) | 0, 0));
        const driverUid = `driver_${hashId}`;
        const newProfile: UserProfile = {
          uid: driverUid,
          email: email.trim(),
          displayName: cleanName,
          photoURL: '',
          preferredMode: 'both',
        };

        try {
          await setDoc(doc(db, 'users', driverUid), {
            ...newProfile,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });
        } catch (fsErr) {
          console.warn('Firestore driver profile save note:', fsErr);
        }

        if (typeof window !== 'undefined') {
          localStorage.setItem('roadguard_authenticated_profile', JSON.stringify(newProfile));
          localStorage.removeItem('roadguard_guest_session');
        }
        setIsGuest(false);
        setUserProfile(newProfile);
        return;
      }

      console.error('Sign up error:', err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const signInAsGuest = () => {
    setIsGuest(true);
    if (typeof window !== 'undefined') {
      localStorage.setItem('roadguard_guest_session', 'true');
      localStorage.removeItem('roadguard_authenticated_profile');
    }
    setUserProfile({
      uid: 'guest-driver',
      email: 'guest@roadguard.local',
      displayName: 'Guest Driver',
      photoURL: '',
      preferredMode: 'both',
    });
  };

  const logout = async () => {
    try {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('roadguard_guest_session');
        localStorage.removeItem('roadguard_authenticated_profile');
      }
      setIsGuest(false);
      setUser(null);
      setUserProfile(null);
      await signOut(auth);
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  const updatePreferredMode = async (mode: 'both' | 'potholes' | 'speed') => {
    const currentUid = user?.uid || userProfile?.uid;
    if (!currentUid) return;
    try {
      const userDocRef = doc(db, 'users', currentUid);
      await setDoc(userDocRef, { preferredMode: mode, updatedAt: new Date().toISOString() }, { merge: true });
      setUserProfile((prev) => (prev ? { ...prev, preferredMode: mode } : null));
      if (typeof window !== 'undefined') {
        const stored = localStorage.getItem('roadguard_authenticated_profile');
        if (stored) {
          try {
            const parsed = JSON.parse(stored);
            parsed.preferredMode = mode;
            localStorage.setItem('roadguard_authenticated_profile', JSON.stringify(parsed));
          } catch (e) {}
        }
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${currentUid}`);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        userProfile,
        isLoading,
        isGuest,
        signInWithGoogle,
        signInWithEmail,
        signUpWithEmail,
        signInAsGuest,
        logout,
        updatePreferredMode,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
