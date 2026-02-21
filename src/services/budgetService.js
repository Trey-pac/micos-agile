import {
  collection, doc, onSnapshot,
  addDoc, updateDoc, deleteDoc, serverTimestamp,
  query, orderBy, limit,
} from 'firebase/firestore';
import { getDb } from '../firebase';

// ── Expenses ──────────────────────────────────────────────────────────────────
const expCol  = (fid) => collection(getDb(), 'farms', fid, 'expenses');
const expDoc  = (fid, id) => doc(getDb(), 'farms', fid, 'expenses', id);

export function subscribeExpenses(farmId, onData, onError) {
  const q = query(expCol(farmId), orderBy('createdAt', 'desc'), limit(500));
  return onSnapshot(q,
    (snap) => onData(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
    onError);
}

export async function addExpense(farmId, data) {
  try {
    const ref = await addDoc(expCol(farmId), { ...data, farmId, createdAt: serverTimestamp() });
    return ref.id;
  } catch (err) {
    console.error('[budgetService] addExpense failed:', err);
    throw err;
  }
}

export async function updateExpense(farmId, expenseId, updates) {
  try {
    await updateDoc(expDoc(farmId, expenseId), { ...updates, updatedAt: serverTimestamp() });
  } catch (err) {
    console.error('[budgetService] updateExpense failed:', err);
    throw err;
  }
}

export async function deleteExpense(farmId, expenseId) {
  try {
    await deleteDoc(expDoc(farmId, expenseId));
  } catch (err) {
    console.error('[budgetService] deleteExpense failed:', err);
    throw err;
  }
}

// ── Revenue ───────────────────────────────────────────────────────────────────
const revCol = (fid) => collection(getDb(), 'farms', fid, 'revenue');

export function subscribeRevenue(farmId, onData, onError) {
  const q = query(revCol(farmId), orderBy('createdAt', 'desc'), limit(500));
  return onSnapshot(q,
    (snap) => onData(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
    onError);
}

export async function addRevenue(farmId, data) {
  try {
    const ref = await addDoc(revCol(farmId), { ...data, farmId, createdAt: serverTimestamp() });
    return ref.id;
  } catch (err) {
    console.error('[budgetService] addRevenue failed:', err);
    throw err;
  }
}

// ── Infrastructure / CapEx ────────────────────────────────────────────────────
const infraCol = (fid) => collection(getDb(), 'farms', fid, 'infrastructure');
const infraDoc = (fid, id) => doc(getDb(), 'farms', fid, 'infrastructure', id);

export function subscribeInfrastructure(farmId, onData, onError) {
  const q = query(infraCol(farmId), orderBy('createdAt', 'desc'), limit(200));
  return onSnapshot(q,
    (snap) => onData(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
    onError);
}

export async function addProject(farmId, data) {
  try {
    const ref = await addDoc(infraCol(farmId), {
      ...data,
      spent: data.spent ?? 0,
      status: data.status ?? 'planned',
      items: data.items ?? [],
      farmId,
      createdAt: serverTimestamp(),
    });
    return ref.id;
  } catch (err) {
    console.error('[budgetService] addProject failed:', err);
    throw err;
  }
}

export async function updateProject(farmId, projectId, updates) {
  try {
    await updateDoc(infraDoc(farmId, projectId), { ...updates, updatedAt: serverTimestamp() });
  } catch (err) {
    console.error('[budgetService] updateProject failed:', err);
    throw err;
  }
}

export async function deleteProject(farmId, projectId) {
  try {
    await deleteDoc(infraDoc(farmId, projectId));
  } catch (err) {
    console.error('[budgetService] deleteProject failed:', err);
    throw err;
  }
}
