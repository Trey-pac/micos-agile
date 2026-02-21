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

const col = (farmId) => collection(getDb(), 'farms', farmId, 'customers');
const dref = (farmId, id) => doc(getDb(), 'farms', farmId, 'customers', id);

/**
 * Subscribe to all chef customer accounts for a farm. Returns unsubscribe.
 */
export function subscribeCustomers(farmId, onData, onError) {
  return onSnapshot(query(col(farmId), limit(500)), (snap) => {
    onData(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  }, onError);
}

/**
 * Create a new chef customer account.
 * data shape: { name, restaurantName, email, phone, address, deliveryDays, notes }
 */
export async function addCustomer(farmId, data) {
  try {
    const docRef = await addDoc(col(farmId), {
      ...data,
      farmId,
      createdAt: serverTimestamp(),
    });
    return docRef.id;
  } catch (err) {
    console.error('[customerService] addCustomer failed:', err);
    throw err;
  }
}

/**
 * Update fields on a customer account.
 */
export async function updateCustomer(farmId, customerId, updates) {
  try {
    await updateDoc(dref(farmId, customerId), {
      ...updates,
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    console.error('[customerService] updateCustomer failed:', err);
    throw err;
  }
}

/**
 * Delete a customer account.
 */
export async function deleteCustomer(farmId, customerId) {
  try {
    await deleteDoc(dref(farmId, customerId));
  } catch (err) {
    console.error('[customerService] deleteCustomer failed:', err);
    throw err;
  }
}
