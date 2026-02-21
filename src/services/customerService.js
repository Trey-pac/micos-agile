import {
  collection,
  doc,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { getDb } from '../firebase';

const col = (farmId) => collection(getDb(), 'farms', farmId, 'customers');
const dref = (farmId, id) => doc(getDb(), 'farms', farmId, 'customers', id);

/**
 * Subscribe to all chef customer accounts for a farm. Returns unsubscribe.
 */
export function subscribeCustomers(farmId, onData, onError) {
  return onSnapshot(col(farmId), (snap) => {
    onData(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  }, onError);
}

/**
 * Create a new chef customer account.
 * data shape: { name, restaurantName, email, phone, address, deliveryDays, notes }
 */
export async function addCustomer(farmId, data) {
  const docRef = await addDoc(col(farmId), {
    ...data,
    farmId,
    createdAt: serverTimestamp(),
  });
  return docRef.id;
}

/**
 * Update fields on a customer account.
 */
export async function updateCustomer(farmId, customerId, updates) {
  await updateDoc(dref(farmId, customerId), {
    ...updates,
    updatedAt: serverTimestamp(),
  });
}

/**
 * Delete a customer account.
 */
export async function deleteCustomer(farmId, customerId) {
  await deleteDoc(dref(farmId, customerId));
}
