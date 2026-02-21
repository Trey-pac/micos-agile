/**
 * activityService.js — Firestore CRUD for the institutional knowledge layer.
 *
 * Collection: farms/{farmId}/activities/{activityId}
 */
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  query,
  orderBy,
  limit,
} from 'firebase/firestore';
import { getDb } from '../firebase';
import { resilientSnapshot } from '../utils/resilientSnapshot';

// ── Enum-style constants (shared with UI components) ────────────────────────

export const ACTIVITY_TYPES = [
  { id: 'completion_note', label: 'Completion Note', icon: '✅' },
  { id: 'communication',   label: 'Communication',   icon: '💬' },
  { id: 'decision',        label: 'Decision',         icon: '🧭' },
  { id: 'research',        label: 'Research',         icon: '🔬' },
  { id: 'price_quote',     label: 'Price Quote',      icon: '💰' },
  { id: 'commitment',      label: 'Commitment',       icon: '🤝' },
];

export const CONTACT_GROUPS = [
  { id: 'harvest-today', label: 'Harvest Today' },
  { id: 'aubergine',     label: 'Aubergine' },
  { id: 'greenduct',     label: 'GreenDuct' },
  { id: 'ductsox',       label: 'DuctSox' },
  { id: 'prihoda',       label: 'Prihoda' },
  { id: 'oneseason',     label: 'OneSeason' },
  { id: 'customer',      label: 'Customer' },
  { id: 'other',         label: 'Other' },
];

/** Infer a contactGroup from a vendor/customer name (fuzzy). */
export function inferContactGroup(name = '') {
  const lower = name.toLowerCase();
  for (const g of CONTACT_GROUPS) {
    if (lower.includes(g.id) || lower.includes(g.label.toLowerCase())) return g.id;
  }
  return 'other';
}

// ── Firestore helpers ────────────────────────────────────────────────────────

const activitiesCol = (farmId) =>
  collection(getDb(), 'farms', farmId, 'activities');

const activityDoc = (farmId, activityId) =>
  doc(getDb(), 'farms', farmId, 'activities', activityId);

/**
 * Subscribe to all activities, ordered newest-first.
 * Returns the unsubscribe function.
 */
export function subscribeActivities(farmId, onData, onError) {
  return resilientSnapshot(
    query(activitiesCol(farmId), orderBy('createdAt', 'desc'), limit(200)),
    (snapshot) => {
      const items = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      onData(items);
    },
    onError
  );
}

/**
 * Add a new activity entry.
 * data shape: { type, note, taskId?, taskTitle?, contactId?, contactName?,
 *               contactGroup?, tags?, createdBy?, epicId?, featureId? }
 */
export async function addActivity(farmId, data) {
  try {
    const ref = await addDoc(activitiesCol(farmId), {
      type:          data.type          || 'completion_note',
      note:          data.note          || '',
      taskId:        data.taskId        || null,
      taskTitle:     data.taskTitle     || null,
      contactId:     data.contactId     || null,
      contactName:   data.contactName   || null,
      contactGroup:  data.contactGroup  || null,
      tags:          Array.isArray(data.tags) ? data.tags : [],
      createdBy:     data.createdBy     || null,
      epicId:        data.epicId        || null,
      featureId:     data.featureId     || null,
      farmId,
      createdAt:     serverTimestamp(),
    });
    return ref.id;
  } catch (err) {
    console.error('[activityService] addActivity failed:', err);
    throw err;
  }
}

/** Update an existing activity. */
export async function updateActivity(farmId, activityId, updates) {
  try {
    await updateDoc(activityDoc(farmId, activityId), {
      ...updates,
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    console.error('[activityService] updateActivity failed:', err);
    throw err;
  }
}

/** Delete an activity. */
export async function deleteActivity(farmId, activityId) {
  try {
    await deleteDoc(activityDoc(farmId, activityId));
  } catch (err) {
    console.error('[activityService] deleteActivity failed:', err);
    throw err;
  }
}
