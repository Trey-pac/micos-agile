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

const col = (farmId) => collection(getDb(), 'farms', farmId, 'products');
const dref = (farmId, id) => doc(getDb(), 'farms', farmId, 'products', id);

/**
 * Subscribe to all products for a farm. Returns unsubscribe function.
 */
export function subscribeProducts(farmId, onData, onError) {
  return onSnapshot(col(farmId), (snap) => {
    onData(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  }, onError);
}

/**
 * Add a new product to the catalog.
 * data shape: { name, category, unit, pricePerUnit, available, description, imageUrl, sortOrder }
 */
export async function addProduct(farmId, data) {
  const docRef = await addDoc(col(farmId), {
    ...data,
    farmId,
    available: data.available ?? true,
    sortOrder: data.sortOrder ?? Date.now(),
    createdAt: serverTimestamp(),
  });
  return docRef.id;
}

/**
 * Update specific fields on a product.
 */
export async function updateProduct(farmId, productId, updates) {
  await updateDoc(dref(farmId, productId), {
    ...updates,
    updatedAt: serverTimestamp(),
  });
}

/**
 * Delete a product from the catalog.
 */
export async function deleteProduct(farmId, productId) {
  await deleteDoc(dref(farmId, productId));
}
