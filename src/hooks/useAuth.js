import { useState, useEffect } from 'react';
import { onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, googleProvider, db } from '../firebase';

// ─── ALLOWLIST ─────────────────────────────────────────────────────────────────────────────
// Only these Google account emails can access the app.
// To add someone: add their Gmail address here and redeploy.
const ALLOWED_EMAILS = [
  'trey@micosmicrofarm.com',       // Trey - Owner
  'dmacebeta@gmail.com',           // Dan Mace - Consultant
  'halie@micosmicrofarm.com',      // Halie
  'ricardo@micosmicrofarm.com',    // Ricardo
];
// ─────────────────────────────────────────────────────────────────────────────────

/**
 * Auth hook — Google sign-in popup, user state, farmId + role resolution.
 *
 * On first login (for allowed users), creates a user profile doc at
 * users/{uid} with a default farmId and role:'admin'. Unauthorized accounts
 * are signed out immediately and an access-request email is sent to the admin.
 */
export function useAuth() {
  const [user, setUser] = useState(null);
  const [farmId, setFarmId] = useState(null);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // ── ALLOWLIST CHECK ─────────────────────────────────────────────────────────────────
        if (!ALLOWED_EMAILS.includes(firebaseUser.email)) {
          await signOut(auth);

          fetch('/.netlify/functions/notify-access-request', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: firebaseUser.displayName || 'Unknown',
              email: firebaseUser.email,
            }),
          }).catch((err) => console.error('Notify failed:', err));

          setError(
            `Access denied. This app is private. Your request (${firebaseUser.email}) has been sent to the admin.`
          );
          setLoading(false);
          return;
        }
        // ──────────────────────────────────────────────────────────────────────────────────

        setUser(firebaseUser);
        try {
          const userDocRef = doc(db, 'users', firebaseUser.uid);
          const userSnap = await getDoc(userDocRef);

          if (userSnap.exists()) {
            const profile = userSnap.data();
            setFarmId(profile.farmId);
            setRole(profile.role || 'admin');
          } else {
            // First login — create profile with default farm and role
            const defaultFarmId = 'micos-farm-001';
            await setDoc(userDocRef, {
              email: firebaseUser.email,
              displayName: firebaseUser.displayName,
              photoURL: firebaseUser.photoURL,
              farmId: defaultFarmId,
              role: 'admin',
              createdAt: serverTimestamp(),
            });
            setFarmId(defaultFarmId);
            setRole('admin');
          }
        } catch (err) {
          console.error('Error loading user profile:', err);
          setError(err.message);
        }
      } else {
        setUser(null);
        setFarmId(null);
        setRole(null);
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
      if (err.code !== 'auth/popup-closed-by-user') {
        setError(err.message);
      }
    }
  };

  const logout = async () => {
    await signOut(auth);
  };

  return { user, farmId, role, loading, error, login, logout };
}