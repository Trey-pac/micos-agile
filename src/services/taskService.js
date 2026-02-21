import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  writeBatch,
  serverTimestamp,
  query,
  limit,
} from 'firebase/firestore';
import { getDb } from '../firebase';
import { resilientSnapshot } from '../utils/resilientSnapshot';

const tasksCollection = (farmId) =>
  collection(getDb(), 'farms', farmId, 'tasks');

const taskDoc = (farmId, taskId) =>
  doc(getDb(), 'farms', farmId, 'tasks', taskId);

/**
 * Subscribe to all tasks for a farm. Returns an unsubscribe function.
 */
export function subscribeTasks(farmId, onData, onError) {
  return resilientSnapshot(
    query(tasksCollection(farmId), limit(1000)),
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
  try {
    const docRef = await addDoc(tasksCollection(farmId), {
      ...taskData,
      farmId,
      sortOrder: taskData.sortOrder ?? Date.now(),
      createdAt: serverTimestamp(),
    });
    return docRef.id;
  } catch (err) {
    console.error('[taskService] addTask failed:', err);
    throw err;
  }
}

/**
 * Update specific fields on a task.
 */
export async function updateTask(farmId, taskId, updates) {
  try {
    await updateDoc(taskDoc(farmId, taskId), {
      ...updates,
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    console.error('[taskService] updateTask failed:', err);
    throw err;
  }
}

/**
 * Delete a task.
 */
export async function deleteTask(farmId, taskId) {
  try {
    await deleteDoc(taskDoc(farmId, taskId));
  } catch (err) {
    console.error('[taskService] deleteTask failed:', err);
    throw err;
  }
}

/**
 * Batch update multiple tasks at once (e.g., drag-drop reordering).
 * `updates` is an array of { id, ...fields }.
 */
export async function batchUpdateTasks(farmId, updates) {
  try {
    const batch = writeBatch(getDb());
    updates.forEach(({ id, ...fields }) => {
      batch.update(taskDoc(farmId, id), {
        ...fields,
        updatedAt: serverTimestamp(),
      });
    });
    await batch.commit();
  } catch (err) {
    console.error('[taskService] batchUpdateTasks failed:', err);
    throw err;
  }
}
