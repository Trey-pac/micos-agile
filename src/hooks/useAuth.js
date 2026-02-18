import { useState, useEffect } from 'react';
import { onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, googleProvider, db } from '../firebase';

// ─── ALLOWLIST ────────────────────────────────────────────────────────────────
// Only these Google account emails can access the app.
// To add someone: add their Gmail address here and redeploy.
const ALLOWED_EMAILS = [
  // TODO: Replace these placeholders with the real Gmail addresses
  'your-email@gmail.com',   // Trey - Owner
  'halie@gmail.com',        // Halie
  'ricardo@gmail.com',      // Ricardo
];
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Auth hook — Google sign-in popup, user state, farmId resolution.
 *
 * On first login (for allowed users), creates a user profile doc at
 * users/{uid} with a default farmId. Unauthorized accounts are signed out
 * immediately and an access-request email is sent to the admin.
 */
export function useAuth() {
  const [user, setUser] = useState(null);
  const [farmId, setFarmId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // ── ALLOWLIST CHECK ────────────────────────────────────────────────
        // Must happen before setUser. If email is not approved:
        // 1. Sign them out of Firebase immediately
        // 2. Fire-and-forget notification email to admin
        // 3. Show a friendly error — they stay on the login screen
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
        // ──────────────────────────────────────────────────────────────────

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
