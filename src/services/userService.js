import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  serverTimestamp,
  orderBy,
  limit,
} from 'firebase/firestore';
import { getDb } from '../firebase';

/**
 * Check whether a uid is the farm owner. Owners cannot be demoted or removed.
 */
async function isOwnerOfFarm(uid) {
  try {
    const userSnap = await getDoc(doc(getDb(), 'users', uid));
    if (!userSnap.exists()) return false;
    const { farmId } = userSnap.data();
    if (!farmId) return false;
    const farmSnap = await getDoc(doc(getDb(), 'farms', farmId));
    return farmSnap.exists() && farmSnap.data().ownerId === uid;
  } catch {
    return false;
  }
}

// ── Farm Members ────────────────────────────────────────────────────

/**
 * Real-time listener for all users belonging to a farm.
 * Returns unsubscribe function.
 */
export function subscribeFarmMembers(farmId, onData, onError) {
  if (!farmId) return () => {};
  const q = query(
    collection(getDb(), 'users'),
    where('farmId', '==', farmId),
    limit(200)
  );
  return onSnapshot(
    q,
    (snap) => {
      const members = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      onData(members);
    },
    onError
  );
}

/**
 * Change a member's role. Blocks demoting the farm owner.
 */
export async function updateMemberRole(uid, newRole) {
  try {
    if (newRole !== 'admin' && await isOwnerOfFarm(uid)) {
      throw new Error('Cannot change the farm owner\'s role. The owner is always admin.');
    }
    await updateDoc(doc(getDb(), 'users', uid), {
      role: newRole,
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    console.error('[userService] updateMemberRole failed:', err);
    throw err;
  }
}

/**
 * Remove a member from the farm. Blocks removing the farm owner.
 */
export async function removeMember(uid) {
  try {
    if (await isOwnerOfFarm(uid)) {
      throw new Error('Cannot remove the farm owner.');
    }
    await updateDoc(doc(getDb(), 'users', uid), {
      farmId: null,
      role: null,
      removedAt: serverTimestamp(),
    });
  } catch (err) {
    console.error('[userService] removeMember failed:', err);
    throw err;
  }
}

// ── Invites ─────────────────────────────────────────────────────────

/**
 * Real-time listener for pending invites on a farm.
 */
export function subscribeFarmInvites(farmId, onData, onError) {
  if (!farmId) return () => {};
  const q = query(
    collection(getDb(), 'farms', farmId, 'invites'),
    orderBy('createdAt', 'desc'),
    limit(200)
  );
  return onSnapshot(
    q,
    (snap) => {
      const invites = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      onData(invites);
    },
    onError
  );
}

/**
 * Revoke (delete) a pending invite.
 */
export async function revokeInvite(farmId, inviteId) {
  try {
    await deleteDoc(doc(getDb(), 'farms', farmId, 'invites', inviteId));
  } catch (err) {
    console.error('[userService] revokeInvite failed:', err);
    throw err;
  }
}
