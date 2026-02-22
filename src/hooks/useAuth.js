import { useState, useEffect, useCallback } from 'react';
import { onAuthStateChanged, signInWithPopup, signInWithRedirect, getRedirectResult, signOut } from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { getFirebaseAuth, getGoogleProvider, getDb } from '../firebase';

/** Default farm — all users are linked here (single-tenant for now) */
const DEFAULT_FARM_ID = 'micos-farm-001';

/** Hardcoded fallback — used ONLY when approvedEmails field doesn't exist yet */
const INITIAL_APPROVED_EMAILS = [
  'trey@micosmicrofarm.com',
  'halie@micosmicrofarm.com',
  'ricardo@micosmicrofarm.com',
];

// The farm document lives at farms/{farmId} and has an ownerId field.
// If the current user IS the owner, they are ALWAYS admin — no exceptions.
async function resolveRole(profile, uid) {
  const storedRole = profile.role || 'admin';
  if (!profile.farmId) return storedRole;

  try {
    const farmSnap = await getDoc(doc(getDb(), 'farms', profile.farmId));
    if (farmSnap.exists() && farmSnap.data().ownerId === uid) {
      // Owner must always be admin. Auto-fix if drifted.
      if (storedRole !== 'admin') {
        await updateDoc(doc(getDb(), 'users', uid), { role: 'admin', updatedAt: serverTimestamp() });
      }
      return 'admin';
    }
  } catch {
    // If farm doc read fails, fall through to stored role
  }
  return storedRole;
}

/**
 * Auth hook — Google sign-in, user state, farmId + role resolution.
 *
 * Single-tenant: every authenticated user is linked to DEFAULT_FARM_ID.
 * If a user profile exists, we use its role; otherwise we create one as admin.
 */
export function useAuth() {
  const [user, setUser] = useState(null);
  const [farmId, setFarmId] = useState(null);
  const [role, setRole] = useState(null);
  const [approved, setApproved] = useState(true); // assume true until checked
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Handle redirect result (if login fell back to signInWithRedirect)
    getRedirectResult(getFirebaseAuth()).catch(() => {});

    const unsubscribe = onAuthStateChanged(getFirebaseAuth(), async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);

        // ── 1. Approval check — is this email in the allowlist? ─────────
        try {
          const configRef = doc(getDb(), 'farms', DEFAULT_FARM_ID, 'meta', 'config');
          const configSnap = await getDoc(configRef);
          const configData = configSnap.exists() ? configSnap.data() : {};
          const approvedList = configData.approvedEmails;
          const email = (firebaseUser.email || '').toLowerCase();

          if (Array.isArray(approvedList) && approvedList.length > 0) {
            // List exists in Firestore — enforce it
            if (!approvedList.map(e => e.toLowerCase()).includes(email)) {
              console.warn('[useAuth] Access denied — email not in approvedEmails:', email);
              setApproved(false);
              setFarmId(null);
              setRole(null);
              setLoading(false);
              return;
            }
          } else {
            // No list yet — use hardcoded fallback for bootstrapping
            if (!INITIAL_APPROVED_EMAILS.map(e => e.toLowerCase()).includes(email)) {
              console.warn('[useAuth] Access denied — email not in hardcoded allowlist:', email);
              setApproved(false);
              setFarmId(null);
              setRole(null);
              setLoading(false);
              return;
            }
            // Auto-seed approvedEmails so Firestore rules kick in immediately
            try {
              await updateDoc(configRef, { approvedEmails: INITIAL_APPROVED_EMAILS });
              console.log('[useAuth] Auto-seeded approvedEmails to config doc');
            } catch (seedErr) {
              console.warn('[useAuth] Could not auto-seed approvedEmails:', seedErr.message);
            }
          }

          setApproved(true);
        } catch (err) {
          // If config read fails entirely, block access for safety
          console.error('[useAuth] Failed to check approval:', err);
          setApproved(false);
          setFarmId(null);
          setRole(null);
          setLoading(false);
          return;
        }

        // ── 2. User profile setup (only reached if approved) ────────────
        try {
          const userDocRef = doc(getDb(), 'users', firebaseUser.uid);
          const userSnap = await getDoc(userDocRef);

          if (userSnap.exists()) {
            // ── Returning user ──────────────────────────────────────────────
            const profile = userSnap.data();
            const effectiveFarmId = profile.farmId || DEFAULT_FARM_ID;
            const resolvedRole = await resolveRole(profile, firebaseUser.uid);

            // Patch Firestore doc if farmId or role is missing/wrong —
            // Firestore rules check the STORED value, not what JS resolves.
            const needsPatch = {};
            if (!profile.farmId) needsPatch.farmId = DEFAULT_FARM_ID;
            if (!profile.role)   needsPatch.role = 'admin';
            if (Object.keys(needsPatch).length > 0) {
              needsPatch.updatedAt = serverTimestamp();
              await updateDoc(userDocRef, needsPatch);
            }

            setFarmId(effectiveFarmId);
            setRole(resolvedRole);
          } else {
            // ── New approved user — auto-provision with default farm ─────────
            await setDoc(userDocRef, {
              email: firebaseUser.email,
              displayName: firebaseUser.displayName,
              photoURL: firebaseUser.photoURL,
              farmId: DEFAULT_FARM_ID,
              role: 'employee',
              createdAt: serverTimestamp(),
            });
            setFarmId(DEFAULT_FARM_ID);
            setRole('employee');
          }
        } catch (err) {
          console.error('[useAuth] Error loading user profile:', err.code, err.message);
          // Permission error = blocked by Firestore rules → deny access
          if (err.code === 'permission-denied' || err.message?.includes('permission')) {
            console.warn('[useAuth] Permission denied by Firestore rules');
            setApproved(false);
            setFarmId(null);
            setRole(null);
          } else {
            setError(err.message);
          }
        }
      } else {
        setUser(null);
        setFarmId(null);
        setRole(null);
        setApproved(true);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const login = async () => {
    setError(null);
    try {
      await signInWithPopup(getFirebaseAuth(), getGoogleProvider());
    } catch (err) {
      if (err.code === 'auth/popup-blocked' || err.code === 'auth/popup-closed-by-user') {
        // Popup was blocked or closed — fall back to redirect
        try {
          await signInWithRedirect(getFirebaseAuth(), getGoogleProvider());
        } catch (redirectErr) {
          setError(redirectErr.message);
        }
      } else {
        setError(err.message);
      }
    }
  };

  const logout = async () => {
    await signOut(getFirebaseAuth());
  };

  /**
   * Update own role in Firestore and local state.
   * Works because rules allow isOwner(userId) to write their own doc.
   */
  const updateOwnRole = useCallback(async (newRole) => {
    if (!user) return;
    try {
      await updateDoc(doc(getDb(), 'users', user.uid), {
        role: newRole,
        updatedAt: serverTimestamp(),
      });
      setRole(newRole);
    } catch (err) {
      console.error('Failed to update role:', err);
    }
  }, [user]);

  return {
    user,
    farmId,
    role,
    approved,
    loading,
    error,
    login,
    logout,
    updateOwnRole,
  };
}