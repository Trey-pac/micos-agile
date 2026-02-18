import {
  collection,
  doc,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  writeBatch,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../firebase';

const tasksCollection = (farmId) =>
  collection(db, 'farms', farmId, 'tasks');

const taskDoc = (farmId, taskId) =>
  doc(db, 'farms', farmId, 'tasks', taskId);

/**
 * Subscribe to all tasks for a farm. Returns an unsubscribe function.
 */
export function subscribeTasks(farmId, onData, onError) {
  return onSnapshot(
    tasksCollection(farmId),
    (snapshot) => {
      const tasks = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      onData(tasks);
    },
    onError
  );
}

/**
 * Add a new task.
 */
export async function addTask(farmId, taskData) {
  const docRef = await addDoc(tasksCollection(farmId), {
    ...taskData,
    farmId,
    sortOrder: taskData.sortOrder ?? Date.now(),
    createdAt: serverTimestamp(),
  });
  return docRef.id;
}

/**
 * Update specific fields on a task.
 */
export async function updateTask(farmId, taskId, updates) {
  await updateDoc(taskDoc(farmId, taskId), {
    ...updates,
    updatedAt: serverTimestamp(),
  });
}

/**
 * Delete a task.
 */
export async function deleteTask(farmId, taskId) {
  await deleteDoc(taskDoc(farmId, taskId));
}

/**
 * Batch update multiple tasks at once (e.g., drag-drop reordering).
 * `updates` is an array of { id, ...fields }.
 */
export async function batchUpdateTasks(farmId, updates) {
  const batch = writeBatch(db);
  updates.forEach(({ id, ...fields }) => {
    batch.update(taskDoc(farmId, id), {
      ...fields,
      updatedAt: serverTimestamp(),
    });
  });
  await batch.commit();
}
