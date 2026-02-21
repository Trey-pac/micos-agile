import { useState, useEffect, useCallback } from 'react';
import { onAuthStateChanged, signInWithPopup, signInWithRedirect, getRedirectResult, signOut } from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { getFirebaseAuth, getGoogleProvider, getDb } from '../firebase';
import { checkInviteForEmail } from '../services/farmService';

/** Default farm — all users are linked here (single-tenant for now) */
const DEFAULT_FARM_ID = 'micos-farm-001';

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
 * Flow for returning users:
 *   1. Firebase auth resolves → load users/{uid} profile
 *   2. If profile exists with farmId → set user + farmId + role, done
 *
 * Flow for new users:
 *   1. Firebase auth resolves → no users/{uid} doc
 *   2. Check for pending invite (collectionGroup query on invites)
 *   3a. If invite found → create user profile linked to that farm + role, done
 *   3b. If no invite → show access-pending screen
 */
export function useAuth() {
  const [user, setUser] = useState(null);
  const [farmId, setFarmId] = useState(null);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Handle redirect result (if login fell back to signInWithRedirect)
    getRedirectResult(getFirebaseAuth()).catch(() => {});

    const unsubscribe = onAuthStateChanged(getFirebaseAuth(), async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        try {
          const userDocRef = doc(getDb(), 'users', firebaseUser.uid);
          const userSnap = await getDoc(userDocRef);

          if (userSnap.exists()) {
            // ── Returning user ──────────────────────────────────────────────
            const profile = userSnap.data();
            setFarmId(profile.farmId || DEFAULT_FARM_ID);
            // Owner is always admin, even if the doc drifted
            const resolvedRole = await resolveRole(profile, firebaseUser.uid);
            setRole(resolvedRole);
          } else {
            // ── New user — check for invite ─────────────────────────────────

            let invite = null;
            try {
              invite = await checkInviteForEmail(firebaseUser.email);
            } catch (invErr) {
              // collectionGroup query on invites can fail if rules restrict it
              // — this is expected for users with no matching invite
              console.warn('[useAuth] Invite check failed (expected for new users):', invErr.code || invErr.message);
            }

            if (invite) {
              // Invited user — create profile linked to inviting farm
              await setDoc(userDocRef, {
                email: firebaseUser.email,
                displayName: firebaseUser.displayName,
                photoURL: firebaseUser.photoURL,
                farmId: invite.farmId,
                role: invite.role,
                createdAt: serverTimestamp(),
              });
              setFarmId(invite.farmId);
              setRole(invite.role);
            } else {
              // No invite — no farm access
              setFarmId(null);
              setRole(null);
            }
          }
        } catch (err) {
          console.error('[useAuth] Error loading user profile:', err.code, err.message);
          // If permission error, don't block sign-in — show setup flow instead
          if (err.code === 'permission-denied' || err.message?.includes('permission')) {
            console.warn('[useAuth] Permission denied reading profile — no farm access');
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
    loading,
    error,
    login,
    logout,
    updateOwnRole,
  };
}