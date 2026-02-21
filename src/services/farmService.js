import {
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  serverTimestamp,
  collection,
  addDoc,
  query,
  where,
  collectionGroup,
} from 'firebase/firestore';
import { getDb } from '../firebase';

// ── Farm config doc path ──────────────────────────────────────────────
const farmConfigRef = (farmId) => doc(getDb(), 'farms', farmId, 'meta', 'config');
const farmDoc = (farmId) => doc(getDb(), 'farms', farmId);

/**
 * Create a new farm with default config and link the owner user doc.
 * Returns the new farmId.
 */
export async function createFarm({ farmName, ownerName, ownerEmail, ownerUid, location, farmType }) {
  try {
    // Generate a URL-friendly slug from the farm name
    const slug = farmName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 40);
    const farmId = `${slug}-${Date.now().toString(36)}`;

    // Create farm root doc (for querying / listing farms)
    await setDoc(farmDoc(farmId), {
      name: farmName,
      ownerId: ownerUid,
      ownerEmail,
      location: location || '',
      farmType: farmType || 'microgreens',
      createdAt: serverTimestamp(),
      plan: 'free',        // free | pro | business
      status: 'active',
    });

    // Create farm config doc (for white-label + settings)
    await setDoc(farmConfigRef(farmId), {
      name: farmName,
      logo: null,
      primaryColor: '#16a34a',   // green-600
      accentColor: '#06b6d4',    // cyan-500
      tagline: 'Farm-to-Table, Simplified',
      timezone: 'America/Boise',
      cutoffTime: '14:00',
      deliveryDays: ['tuesday', 'friday'],
      units: 'imperial',
      onboardingComplete: false,
      createdAt: serverTimestamp(),
    });

    // Create / update the owner's user doc
    await setDoc(doc(getDb(), 'users', ownerUid), {
      email: ownerEmail,
      displayName: ownerName,
      farmId,
      role: 'admin',
      createdAt: serverTimestamp(),
    }, { merge: true });

    return farmId;
  } catch (err) {
    console.error('[farmService] createFarm failed:', err);
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

/**
 * Check if an email has a pending invite to any farm.
 * Used during login to auto-associate new users with their farm.
 */
export async function checkInviteForEmail(email) {
  try {
    const q = query(
      collectionGroup(getDb(), 'invites'),
      where('email', '==', email.toLowerCase().trim()),
      where('status', '==', 'pending')
    );
    const snap = await getDocs(q);
    if (snap.empty) return null;

    const inviteDoc = snap.docs[0];
    const inviteData = inviteDoc.data();
    // Extract farmId from the path: farms/{farmId}/invites/{inviteId}
    const farmId = inviteDoc.ref.parent.parent.id;

    // Mark invite as accepted
    await updateDoc(inviteDoc.ref, { status: 'accepted', acceptedAt: serverTimestamp() });

    return { farmId, role: inviteData.role, inviteId: inviteDoc.id };
  } catch (err) {
    console.error('[farmService] checkInviteForEmail failed:', err);
    throw err;
  }
}
