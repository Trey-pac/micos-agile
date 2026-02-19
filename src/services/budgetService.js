import {
  collection, doc, onSnapshot,
  addDoc, updateDoc, deleteDoc, serverTimestamp,
  query, orderBy, limit,
} from 'firebase/firestore';
import { db } from '../firebase';

// ── Expenses ──────────────────────────────────────────────────────────────────
const expCol  = (fid) => collection(db, 'farms', fid, 'expenses');
const expDoc  = (fid, id) => doc(db, 'farms', fid, 'expenses', id);

export function subscribeExpenses(farmId, onData, onError) {
  const q = query(expCol(farmId), orderBy('createdAt', 'desc'), limit(500));
  return onSnapshot(q,
    (snap) => onData(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
    onError);
}

export async function addExpense(farmId, data) {
  const ref = await addDoc(expCol(farmId), { ...data, farmId, createdAt: serverTimestamp() });
  return ref.id;
}

export async function updateExpense(farmId, expenseId, updates) {
  await updateDoc(expDoc(farmId, expenseId), { ...updates, updatedAt: serverTimestamp() });
}

export async function deleteExpense(farmId, expenseId) {
  await deleteDoc(expDoc(farmId, expenseId));
}

// ── Revenue ───────────────────────────────────────────────────────────────────
const revCol = (fid) => collection(db, 'farms', fid, 'revenue');

export function subscribeRevenue(farmId, onData, onError) {
  const q = query(revCol(farmId), orderBy('createdAt', 'desc'), limit(500));
  return onSnapshot(q,
    (snap) => onData(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
    onError);
}

export async function addRevenue(farmId, data) {
  const ref = await addDoc(revCol(farmId), { ...data, farmId, createdAt: serverTimestamp() });
  return ref.id;
}

// ── Infrastructure / CapEx ────────────────────────────────────────────────────
const infraCol = (fid) => collection(db, 'farms', fid, 'infrastructure');
const infraDoc = (fid, id) => doc(db, 'farms', fid, 'infrastructure', id);

export function subscribeInfrastructure(farmId, onData, onError) {
  const q = query(infraCol(farmId), orderBy('createdAt', 'desc'), limit(200));
  return onSnapshot(q,
    (snap) => onData(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
    onError);
}

export async function addProject(farmId, data) {
  const ref = await addDoc(infraCol(farmId), {
    ...data,
    spent: data.spent ?? 0,
    status: data.status ?? 'planned',
    items: data.items ?? [],
    farmId,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateProject(farmId, projectId, updates) {
  await updateDoc(infraDoc(farmId, projectId), { ...updates, updatedAt: serverTimestamp() });
}

export async function deleteProject(farmId, projectId) {
  await deleteDoc(infraDoc(farmId, projectId));
}
