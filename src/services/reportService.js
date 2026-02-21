import {
  collection, onSnapshot, addDoc, serverTimestamp,
} from 'firebase/firestore';
import { getDb } from '../firebase';

const reportsCol = (farmId) => collection(getDb(), 'farms', farmId, 'reports');

export function subscribeReports(farmId, onData, onError) {
  return onSnapshot(
    reportsCol(farmId),
    (snap) => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      list.sort((a, b) => {
        const aDate = a.generatedAt || '';
        const bDate = b.generatedAt || '';
        return bDate > aDate ? 1 : bDate < aDate ? -1 : 0;
      });
      onData(list);
    },
    onError,
  );
}

export async function saveReportSnapshot(farmId, data) {
  try {
    const ref = await addDoc(reportsCol(farmId), {
      ...data,
      generatedAt: new Date().toISOString(),
      _createdAt: serverTimestamp(),
    });
    return ref.id;
  } catch (err) {
    console.error('[reportService] saveReportSnapshot failed:', err);
    throw err;
  }
}
