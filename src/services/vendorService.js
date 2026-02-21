import {
  collection,
  doc,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  query,
  limit,
} from 'firebase/firestore';
import { getDb } from '../firebase';

const vendorsCollection = (farmId) =>
  collection(getDb(), 'farms', farmId, 'vendors');

const vendorDoc = (farmId, vendorId) =>
  doc(getDb(), 'farms', farmId, 'vendors', vendorId);

/**
 * Subscribe to all vendors for a farm. Returns an unsubscribe function.
 */
export function subscribeVendors(farmId, onData, onError) {
  return onSnapshot(
    query(vendorsCollection(farmId), limit(200)),
    (snapshot) => {
      const vendors = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      onData(vendors);
    },
    onError
  );
}

/**
 * Add a new vendor.
 */
export async function addVendor(farmId, vendorData) {
  try {
    const docRef = await addDoc(vendorsCollection(farmId), {
      ...vendorData,
      farmId,
      createdAt: serverTimestamp(),
    });
    return docRef.id;
  } catch (err) {
    console.error('[vendorService] addVendor failed:', err);
    throw err;
  }
}

/**
 * Update specific fields on a vendor.
 */
export async function updateVendor(farmId, vendorId, updates) {
  try {
    await updateDoc(vendorDoc(farmId, vendorId), {
      ...updates,
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    console.error('[vendorService] updateVendor failed:', err);
    throw err;
  }
}

/**
 * Delete a vendor.
 */
export async function deleteVendor(farmId, vendorId) {
  try {
    await deleteDoc(vendorDoc(farmId, vendorId));
  } catch (err) {
    console.error('[vendorService] deleteVendor failed:', err);
    throw err;
  }
}
