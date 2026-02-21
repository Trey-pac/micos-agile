import {
  collection,
  doc,
  getDocs,
  writeBatch,
  serverTimestamp,
} from 'firebase/firestore';
import { getDb } from '../firebase';
import { initialTasks } from '../data/initialTasks';
import { initialSprints } from '../data/initialSprints';
import { devSprints, devTasksContinued } from '../data/devSprintPlan';
import { chefAppTasks } from '../data/chefAppTasks';
import { taskEpicMapping } from '../data/epicFeatureHierarchy';
import { vendors } from '../data/vendors';

/**
 * Seed (or re-seed) a farm's Firestore collections.
 *
 * First wipes all existing sprints, tasks, and vendors, then writes
 * the initial data. This ensures a clean slate even if the DB was
 * partially populated by the useSprints auto-create hook.
 *
 * Uses a single writeBatch for atomicity.
 * Total ops: worst-case deletes + ~235 writes (12 sprints + ~167 tasks + vendors) — well under 500 limit.
 */
export async function seedDatabase(farmId) {
  try {
    const batch = writeBatch(getDb());
    const now = serverTimestamp();

  // --- Wipe existing collections first ---
  const [existingSprints, existingTasks, existingVendors] = await Promise.all([
    getDocs(collection(getDb(), 'farms', farmId, 'sprints')),
    getDocs(collection(getDb(), 'farms', farmId, 'tasks')),
    getDocs(collection(getDb(), 'farms', farmId, 'vendors')),
  ]);

  existingSprints.docs.forEach((d) => batch.delete(d.ref));
  existingTasks.docs.forEach((d) => batch.delete(d.ref));
  existingVendors.docs.forEach((d) => batch.delete(d.ref));

  // --- Seed sprints (business ops sprints 1-4 + dev sprints 5-12) ---
  // Use the original numeric ID (as a string) as the doc ID
  // so that task.sprintId references match
  for (const sprint of [...initialSprints, ...devSprints]) {
    const { id, ...data } = sprint;
    const sprintRef = doc(getDb(), 'farms', farmId, 'sprints', String(id));
    batch.set(sprintRef, {
      ...data,
      farmId,
      createdAt: now,
    });
  }

  // --- Seed tasks (business ops + dev + chef app tasks) ---
  // Use original numeric ID as doc ID; convert sprintId to string for consistency
  for (const task of [...initialTasks, ...devTasksContinued, ...chefAppTasks]) {
    const { id, sprintId, ...data } = task;
    const mapping = taskEpicMapping[id] || {};
    const taskRef = doc(getDb(), 'farms', farmId, 'tasks', String(id));
    batch.set(taskRef, {
      ...data,
      sprintId: sprintId ? String(sprintId) : null,
      epicId: mapping.epicId || null,
      featureId: mapping.featureId || null,
      farmId,
      createdAt: now,
    });
  }

  // --- Seed vendors ---
  for (const vendor of vendors) {
    const { id, ...data } = vendor;
    const vendorRef = doc(getDb(), 'farms', farmId, 'vendors', String(id));
    batch.set(vendorRef, {
      ...data,
      farmId,
      createdAt: now,
    });
  }

  await batch.commit();

  return {
    sprints: initialSprints.length + devSprints.length,
    tasks: initialTasks.length + devTasksContinued.length + chefAppTasks.length,
    vendors: vendors.length,
  };
  } catch (err) {
    console.error('[seedService] seedDatabase failed:', err);
    throw err;
  }
}
