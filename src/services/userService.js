import {
  collection,
  query,
  where,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  serverTimestamp,
  orderBy,
} from 'firebase/firestore';
import { db } from '../firebase';

// ── Farm Members ────────────────────────────────────────────────────

/**
 * Real-time listener for all users belonging to a farm.
 * Returns unsubscribe function.
 */
export function subscribeFarmMembers(farmId, onData, onError) {
  if (!farmId) return () => {};
  const q = query(
    collection(db, 'users'),
    where('farmId', '==', farmId)
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
 * Change a member's role.
 */
export async function updateMemberRole(uid, newRole) {
  await updateDoc(doc(db, 'users', uid), {
    role: newRole,
    updatedAt: serverTimestamp(),
  });
}

/**
 * Remove a member from the farm (deletes their user doc link).
 */
export async function removeMember(uid) {
  await updateDoc(doc(db, 'users', uid), {
    farmId: null,
    role: null,
    removedAt: serverTimestamp(),
  });
}

// ── Invites ─────────────────────────────────────────────────────────

/**
 * Real-time listener for pending invites on a farm.
 */
export function subscribeFarmInvites(farmId, onData, onError) {
  if (!farmId) return () => {};
  const q = query(
    collection(db, 'farms', farmId, 'invites'),
    orderBy('createdAt', 'desc')
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
  await deleteDoc(doc(db, 'farms', farmId, 'invites', inviteId));
}
