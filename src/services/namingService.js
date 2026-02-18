/**
 * namingService — stores epic/feature name overrides in Firestore.
 * The static epicFeatureHierarchy.js defines defaults; these override them.
 * Stored at: farms/{farmId}/settings/naming
 *   { epics: { "E1": "New Name", ... }, features: { "E1-F1": "New Name", ... } }
 */
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';

const ref = (farmId) => doc(db, 'farms', farmId, 'settings', 'naming');

export async function getNamingOverrides(farmId) {
  try {
    const snap = await getDoc(ref(farmId));
    return snap.exists() ? snap.data() : { epics: {}, features: {} };
  } catch {
    return { epics: {}, features: {} };
  }
}

export async function setEpicName(farmId, epicId, name) {
  const cur = await getNamingOverrides(farmId);
  await setDoc(ref(farmId), {
    ...cur,
    epics: { ...(cur.epics || {}), [epicId]: name },
  });
}

export async function setFeatureName(farmId, featureId, name) {
  const cur = await getNamingOverrides(farmId);
  await setDoc(ref(farmId), {
    ...cur,
    features: { ...(cur.features || {}), [featureId]: name },
  });
}
