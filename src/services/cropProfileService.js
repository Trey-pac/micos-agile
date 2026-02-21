import {
  collection,
  doc,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  serverTimestamp,
  query,
  limit,
} from 'firebase/firestore';
import { getDb } from '../firebase';

const col = (farmId) => collection(getDb(), 'farms', farmId, 'cropProfiles');
const dref = (farmId, id) => doc(getDb(), 'farms', farmId, 'cropProfiles', id);

/**
 * Subscribe to all crop profiles. Returns unsubscribe function.
 */
export function subscribeCropProfiles(farmId, onData, onError) {
  return onSnapshot(query(col(farmId), limit(200)), (snap) => {
    onData(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  }, onError);
}

/**
 * Add a new crop profile.
 */
export async function addCropProfile(farmId, data) {
  try {
    const docRef = await addDoc(col(farmId), {
      ...data,
      farmId,
      active: data.active ?? true,
      createdAt: serverTimestamp(),
    });
    return docRef.id;
  } catch (err) {
    console.error('[cropProfileService] addCropProfile failed:', err);
    throw err;
  }
}

/**
 * Update specific fields on a crop profile.
 */
export async function updateCropProfile(farmId, profileId, updates) {
  try {
    await updateDoc(dref(farmId, profileId), {
      ...updates,
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    console.error('[cropProfileService] updateCropProfile failed:', err);
    throw err;
  }
}

/**
 * Delete a crop profile.
 */
export async function deleteCropProfile(farmId, profileId) {
  try {
    await deleteDoc(dref(farmId, profileId));
  } catch (err) {
    console.error('[cropProfileService] deleteCropProfile failed:', err);
    throw err;
  }
}

/**
 * Seed the default 10 crop profiles if none exist.
 * Idempotent: checks if collection already has docs.
 */
export async function seedDefaultCropProfiles(farmId) {
  try {
    const snap = await getDocs(col(farmId));
    if (snap.size > 0) {
      return { seeded: false, existing: snap.size };
    }

  const defaults = [
    {
      name: 'Sunflower',
      category: 'microgreens',
      daysToMaturity: 9,
      harvestWindow: 3,
      soakHours: 8,
      blackoutDays: 3,
      seedDensity: '1 oz per 1020 tray',
      yieldPerTray: '8-10 oz',
      notes: 'Heavy seed; weight or dome for blackout. Great beginner crop.',
      active: true,
    },
    {
      name: 'Pea Shoots',
      category: 'microgreens',
      daysToMaturity: 9,
      harvestWindow: 3,
      soakHours: 8,
      blackoutDays: 3,
      seedDensity: '3.5 oz per 1020 tray',
      yieldPerTray: '6-8 oz',
      notes: 'Soak 8-12 hours. Tendrils are the product. Popular with chefs.',
      active: true,
    },
    {
      name: 'Radish (Daikon)',
      category: 'microgreens',
      daysToMaturity: 8,
      harvestWindow: 2,
      soakHours: 0,
      blackoutDays: 3,
      seedDensity: '1 oz per 1020 tray',
      yieldPerTray: '7-9 oz',
      notes: 'No soak needed. Fast grower with spicy flavor. Very reliable.',
      active: true,
    },
    {
      name: 'Broccoli',
      category: 'microgreens',
      daysToMaturity: 10,
      harvestWindow: 3,
      soakHours: 0,
      blackoutDays: 3,
      seedDensity: '0.75 oz per 1020 tray',
      yieldPerTray: '6-8 oz',
      notes: 'Nutritional powerhouse. One of the best-selling microgreens.',
      active: true,
    },
    {
      name: 'Kale',
      category: 'microgreens',
      daysToMaturity: 10,
      harvestWindow: 3,
      soakHours: 0,
      blackoutDays: 3,
      seedDensity: '0.75 oz per 1020 tray',
      yieldPerTray: '4-6 oz',
      notes: 'Mild flavor. Often blended into mixes. Slower than radish.',
      active: true,
    },
    {
      name: 'Basil',
      category: 'microgreens',
      daysToMaturity: 24,
      harvestWindow: 5,
      soakHours: 0,
      blackoutDays: 4,
      seedDensity: '0.5 oz per 1020 tray',
      yieldPerTray: '3-5 oz',
      notes: 'Mucilaginous seed — do not soak. Needs warmth (75°F+). Slow but premium.',
      active: true,
    },
    {
      name: 'Cilantro',
      category: 'microgreens',
      daysToMaturity: 17,
      harvestWindow: 4,
      soakHours: 8,
      blackoutDays: 5,
      seedDensity: '1.5 oz per 1020 tray',
      yieldPerTray: '4-6 oz',
      notes: 'Crush whole coriander seed before sowing. Long blackout.',
      active: true,
    },
    {
      name: 'Arugula',
      category: 'microgreens',
      daysToMaturity: 8,
      harvestWindow: 3,
      soakHours: 0,
      blackoutDays: 3,
      seedDensity: '0.5 oz per 1020 tray',
      yieldPerTray: '4-6 oz',
      notes: 'Peppery flavor. Grows fast. Thin stems — harvest early.',
      active: true,
    },
    {
      name: 'Red Cabbage',
      category: 'microgreens',
      daysToMaturity: 10,
      harvestWindow: 3,
      soakHours: 0,
      blackoutDays: 3,
      seedDensity: '0.75 oz per 1020 tray',
      yieldPerTray: '5-7 oz',
      notes: 'Vibrant purple stems — great for color. Mild brassica flavor.',
      active: true,
    },
    {
      name: 'Nasturtium',
      category: 'microgreens',
      daysToMaturity: 12,
      harvestWindow: 3,
      soakHours: 8,
      blackoutDays: 4,
      seedDensity: '2.5 oz per 1020 tray',
      yieldPerTray: '5-7 oz',
      notes: 'Peppery-sweet. Large seed, needs soak. Beautiful plate garnish.',
      active: true,
    },
  ];

    let count = 0;
    for (const profile of defaults) {
      await addDoc(col(farmId), {
        ...profile,
        farmId,
        createdAt: serverTimestamp(),
      });
      count++;
    }
    return { seeded: true, count };
  } catch (err) {
    console.error('[cropProfileService] seedDefaultCropProfiles failed:', err);
    throw err;
  }
}
