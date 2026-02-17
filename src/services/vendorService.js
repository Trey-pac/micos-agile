import {
  collection,
  doc,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../firebase';

const vendorsCollection = (farmId) =>
  collection(db, 'farms', farmId, 'vendors');

const vendorDoc = (farmId, vendorId) =>
  doc(db, 'farms', farmId, 'vendors', vendorId);

/**
 * Subscribe to all vendors for a farm. Returns an unsubscribe function.
 */
export function subscribeVendors(farmId, onData, onError) {
  return onSnapshot(
    vendorsCollection(farmId),
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
  const docRef = await addDoc(vendorsCollection(farmId), {
    ...vendorData,
    farmId,
    createdAt: serverTimestamp(),
  });
  return docRef.id;
}

/**
 * Update specific fields on a vendor.
 */
export async function updateVendor(farmId, vendorId, updates) {
  await updateDoc(vendorDoc(farmId, vendorId), {
    ...updates,
    updatedAt: serverTimestamp(),
  });
}

/**
 * Delete a vendor.
 */
export async function deleteVendor(farmId, vendorId) {
  await deleteDoc(vendorDoc(farmId, vendorId));
}
