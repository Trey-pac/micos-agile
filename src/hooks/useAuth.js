import { useState, useEffect } from 'react';
import { onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, googleProvider, db } from '../firebase';

/**
 * Auth hook — Google sign-in popup, user state, farmId resolution.
 *
 * On first login, creates a user profile doc at users/{uid} with a default
 * farmId. The farmId is what all service calls use for multi-tenancy.
 */
export function useAuth() {
  const [user, setUser] = useState(null);
  const [farmId, setFarmId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        try {
          // Look up or create user profile to get farmId
          const userDocRef = doc(db, 'users', firebaseUser.uid);
          const userSnap = await getDoc(userDocRef);

          if (userSnap.exists()) {
            setFarmId(userSnap.data().farmId);
          } else {
            // First login — create profile with default farm
            const defaultFarmId = 'micos-farm-001';
            await setDoc(userDocRef, {
              email: firebaseUser.email,
              displayName: firebaseUser.displayName,
              photoURL: firebaseUser.photoURL,
              farmId: defaultFarmId,
              createdAt: serverTimestamp(),
            });
            setFarmId(defaultFarmId);
          }
        } catch (err) {
          console.error('Error loading user profile:', err);
          setError(err.message);
        }
      } else {
        setUser(null);
        setFarmId(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const login = async () => {
    setError(null);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      // Don't treat popup-closed as an error
      if (err.code !== 'auth/popup-closed-by-user') {
        setError(err.message);
      }
    }
  };

  const logout = async () => {
    await signOut(auth);
  };

  return { user, farmId, loading, error, login, logout };
}
