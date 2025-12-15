import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  signInWithPopup, 
  signOut as firebaseSignOut,
  onAuthStateChanged 
} from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { auth, googleProvider, db } from '../lib/firebase';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // Create/update user document in Firestore
        const userRef = doc(db, 'users', firebaseUser.uid);
        const userSnap = await getDoc(userRef);
        
        const userData = {
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          displayName: firebaseUser.displayName,
          photoURL: firebaseUser.photoURL,
          lastLoginAt: serverTimestamp(),
        };

        if (!userSnap.exists()) {
          // New user
          await setDoc(userRef, {
            ...userData,
            createdAt: serverTimestamp(),
            preferences: {
              currentGroupId: null,
              currentResumeId: null,
              selectedModel: 'gemini-2.5-pro', // Default AI model
            }
          });
        } else {
          // Existing user - update last login
          await setDoc(userRef, userData, { merge: true });
        }

        setUser({
          ...userData,
          preferences: userSnap.exists() ? userSnap.data().preferences : {}
        });
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      return result.user;
    } catch (error) {
      console.error('Sign in error:', error);
      throw error;
    }
  };

  const signOut = async () => {
    try {
      await firebaseSignOut(auth);
    } catch (error) {
      console.error('Sign out error:', error);
      throw error;
    }
  };

  const updatePreferences = async (preferences) => {
    if (!user) return;
    
    const userRef = doc(db, 'users', user.uid);
    await setDoc(userRef, { preferences }, { merge: true });
    setUser(prev => ({ ...prev, preferences: { ...prev.preferences, ...preferences } }));
  };

  const value = {
    user,
    loading,
    signInWithGoogle,
    signOut,
    updatePreferences,
    isAuthenticated: !!user,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
