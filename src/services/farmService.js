import {
  doc,
  getDoc,
  updateDoc,
  serverTimestamp,
  collection,
  addDoc,
} from 'firebase/firestore';
import { getDb } from '../firebase';

// ── Farm config doc path ──────────────────────────────────────────────
const farmConfigRef = (farmId) => doc(getDb(), 'farms', farmId, 'meta', 'config');
const farmDoc = (farmId) => doc(getDb(), 'farms', farmId);

/**
 * Get the farm root document (plan, status, etc.).
 * Used by billing screens. Returns null if not found.
 */
export async function getFarmRoot(farmId) {
  try {
    if (!farmId) return null;
    const snap = await getDoc(farmDoc(farmId));
    return snap.exists() ? { id: snap.id, ...snap.data() } : null;
  } catch (err) {
    console.error('[farmService] getFarmRoot failed:', err);
    throw err;
  }
}

/**
 * Load farm config. Returns null if not found.
 */
export async function getFarmConfig(farmId) {
  try {
    if (!farmId) return null;
    const snap = await getDoc(farmConfigRef(farmId));
    return snap.exists() ? { id: snap.id, ...snap.data() } : null;
  } catch (err) {
    console.error('[farmService] getFarmConfig failed:', err);
    throw err;
  }
}

/**
 * Update farm config fields (partial merge).
 */
export async function updateFarmConfig(farmId, updates) {
  try {
    await updateDoc(farmConfigRef(farmId), {
      ...updates,
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    console.error('[farmService] updateFarmConfig failed:', err);
    throw err;
  }
}

/**
 * Mark onboarding as complete.
 */
export async function completeOnboarding(farmId) {
  try {
    await updateDoc(farmConfigRef(farmId), {
      onboardingComplete: true,
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    console.error('[farmService] completeOnboarding failed:', err);
    throw err;
  }
}

/**
 * Invite a user to a farm — creates a user doc linking them.
 * The invited user will be associated with this farm on next login.
 */
export async function inviteUserToFarm(farmId, { email, role = 'employee', displayName = '' }) {
  try {
    const inviteRef = await addDoc(collection(getDb(), 'farms', farmId, 'invites'), {
      email: email.toLowerCase().trim(),
      role,
      displayName,
      status: 'pending',
      createdAt: serverTimestamp(),
    });
    return inviteRef.id;
  } catch (err) {
    console.error('[farmService] inviteUserToFarm failed:', err);
    throw err;
  }
}
