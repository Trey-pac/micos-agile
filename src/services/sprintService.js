import {
  collection,
  doc,
  onSnapshot,
  addDoc,
  updateDoc,
  serverTimestamp,
  query,
  limit,
} from 'firebase/firestore';
import { getDb } from '../firebase';

const sprintsCollection = (farmId) =>
  collection(getDb(), 'farms', farmId, 'sprints');

const sprintDoc = (farmId, sprintId) =>
  doc(getDb(), 'farms', farmId, 'sprints', sprintId);

/**
 * Subscribe to all sprints for a farm. Returns an unsubscribe function.
 */
export function subscribeSprints(farmId, onData, onError) {
  return onSnapshot(
    query(sprintsCollection(farmId), limit(100)),
    (snapshot) => {
      const sprints = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      // Sort by sprint number so they display in order
      sprints.sort((a, b) => a.number - b.number);
      onData(sprints);
    },
    onError
  );
}

/**
 * Add a new sprint.
 */
export async function addSprint(farmId, sprintData) {
  try {
    const docRef = await addDoc(sprintsCollection(farmId), {
      ...sprintData,
      farmId,
      createdAt: serverTimestamp(),
    });
    return docRef.id;
  } catch (err) {
    console.error('[sprintService] addSprint failed:', err);
    throw err;
  }
}

/**
 * Update specific fields on a sprint.
 */
export async function updateSprint(farmId, sprintId, updates) {
  try {
    await updateDoc(sprintDoc(farmId, sprintId), {
      ...updates,
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    console.error('[sprintService] updateSprint failed:', err);
    throw err;
  }
}
