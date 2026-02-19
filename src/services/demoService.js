import { db } from '../firebase';
import { doc, setDoc, collection, addDoc, serverTimestamp } from 'firebase/firestore';

/**
 * Creates a temporary demo farm with sample data.
 * Returns the farmId so the app can render in demo mode.
 *
 * Demo farms use a prefix so they can be periodically cleaned up.
 */
export async function createDemoFarm() {
  const farmId = `demo-${Date.now().toString(36)}`;

  // Create farm root doc
  await setDoc(doc(db, 'farms', farmId), {
    name: 'Demo Farm',
    ownerId: 'demo',
    ownerEmail: 'demo@farmworkspace.app',
    location: 'Boise, Idaho',
    farmType: 'microgreens',
    createdAt: serverTimestamp(),
    plan: 'pro', // demo gets pro features
    status: 'demo',
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24h
  });

  // Farm config
  await setDoc(doc(db, 'farms', farmId, 'meta', 'config'), {
    name: 'Demo Farm',
    logo: null,
    primaryColor: '#16a34a',
    accentColor: '#06b6d4',
    tagline: 'Experience the full platform — no signup required',
    timezone: 'America/Boise',
    cutoffTime: '14:00',
    deliveryDays: ['tuesday', 'friday'],
    units: 'imperial',
    onboardingComplete: true,
    createdAt: serverTimestamp(),
  });

  const col = (sub) => collection(db, 'farms', farmId, sub);

  // ── Sample products ──────────────────────────────────────────
  const products = [
    { name: 'Broccoli Microgreens', category: 'microgreens', unit: 'oz', pricePerUnit: 4.00, available: true, description: 'Mild, crunchy, packed with nutrients' },
    { name: 'Radish Microgreens', category: 'microgreens', unit: 'oz', pricePerUnit: 4.00, available: true, description: 'Spicy kick, great on tacos' },
    { name: 'Sunflower Shoots', category: 'microgreens', unit: 'oz', pricePerUnit: 5.00, available: true, description: 'Nutty flavor, substantial crunch' },
    { name: 'Pea Shoots', category: 'microgreens', unit: 'oz', pricePerUnit: 5.00, available: true, description: 'Sweet and tender, classic garnish' },
    { name: 'Mixed Micro Blend', category: 'microgreens', unit: 'oz', pricePerUnit: 4.50, available: true, description: 'Seasonal variety mix' },
    { name: 'Cilantro Microgreens', category: 'microgreens', unit: 'oz', pricePerUnit: 5.50, available: true, description: 'Bright cilantro flavor' },
  ];
  for (const p of products) {
    await addDoc(col('products'), { ...p, createdAt: serverTimestamp() });
  }

  // ── Sample customers ─────────────────────────────────────────
  const customers = [
    { name: 'Chef Marco', restaurantName: 'Bistro Verde', email: 'marco@bistroverde.com', phone: '208-555-0101', address: '123 Main St, Boise ID', deliveryDays: ['tuesday'], notes: 'Prefers early delivery' },
    { name: 'Sarah Chen', restaurantName: 'The Golden Fork', email: 'sarah@goldenfork.com', phone: '208-555-0202', address: '456 Elm Ave, Boise ID', deliveryDays: ['tuesday', 'friday'], notes: '' },
    { name: 'James Rivera', restaurantName: 'Farm & Table', email: 'james@farmtable.com', phone: '208-555-0303', address: '789 Oak Blvd, Meridian ID', deliveryDays: ['friday'], notes: 'Text before delivery' },
  ];
  for (const c of customers) {
    await addDoc(col('customers'), { ...c, createdAt: serverTimestamp() });
  }

  // ── Sample orders ────────────────────────────────────────────
  const now = new Date();
  const orders = [
    { customerName: 'Chef Marco', restaurantName: 'Bistro Verde', items: [{ name: 'Broccoli Microgreens', quantity: 8, unit: 'oz', pricePerUnit: 4 }, { name: 'Sunflower Shoots', quantity: 4, unit: 'oz', pricePerUnit: 5 }], status: 'confirmed', total: 52, requestedDelivery: now.toISOString().split('T')[0] },
    { customerName: 'Sarah Chen', restaurantName: 'The Golden Fork', items: [{ name: 'Mixed Micro Blend', quantity: 12, unit: 'oz', pricePerUnit: 4.5 }, { name: 'Radish Microgreens', quantity: 6, unit: 'oz', pricePerUnit: 4 }], status: 'new', total: 78, requestedDelivery: now.toISOString().split('T')[0] },
    { customerName: 'James Rivera', restaurantName: 'Farm & Table', items: [{ name: 'Pea Shoots', quantity: 10, unit: 'oz', pricePerUnit: 5 }], status: 'new', total: 50, requestedDelivery: now.toISOString().split('T')[0] },
  ];
  for (const o of orders) {
    await addDoc(col('orders'), { ...o, createdAt: serverTimestamp() });
  }

  // ── Sample batches (production) ──────────────────────────────
  const dayMs = 86400000;
  const batches = [
    { cropName: 'Broccoli', variety: 'broccoli', quantity: 6, unit: 'tray', sowDate: new Date(now - 8 * dayMs).toISOString(), stage: 'light', estimatedHarvestStart: new Date(now + 2 * dayMs).toISOString() },
    { cropName: 'Radish', variety: 'radish', quantity: 4, unit: 'tray', sowDate: new Date(now - 5 * dayMs).toISOString(), stage: 'blackout', estimatedHarvestStart: new Date(now + 3 * dayMs).toISOString() },
    { cropName: 'Sunflower', variety: 'sunflower', quantity: 8, unit: 'tray', sowDate: new Date(now - 10 * dayMs).toISOString(), stage: 'ready', estimatedHarvestStart: new Date(now - 1 * dayMs).toISOString() },
    { cropName: 'Pea Shoots', variety: 'pea', quantity: 5, unit: 'tray', sowDate: new Date(now - 3 * dayMs).toISOString(), stage: 'germination', estimatedHarvestStart: new Date(now + 7 * dayMs).toISOString() },
  ];
  for (const b of batches) {
    await addDoc(col('batches'), { ...b, createdAt: serverTimestamp() });
  }

  // ── Sample sprints ───────────────────────────────────────────
  await addDoc(col('sprints'), {
    number: 1,
    name: 'Sprint 1',
    goal: 'Get the demo farm operational',
    startDate: new Date(now - 7 * dayMs).toISOString(),
    endDate: new Date(now + 7 * dayMs).toISOString(),
    createdAt: serverTimestamp(),
  });

  // ── Sample tasks ─────────────────────────────────────────────
  const tasks = [
    { title: 'Review morning harvest list', status: 'done', priority: 'high', owner: 'team', size: 'S' },
    { title: 'Confirm tomorrow\'s orders', status: 'in-progress', priority: 'high', owner: 'trey', size: 'M' },
    { title: 'Update product photos', status: 'not-started', priority: 'medium', owner: 'halie', size: 'M' },
    { title: 'Clean grow room B', status: 'not-started', priority: 'low', owner: 'ricardo', size: 'S' },
    { title: 'Restock sunflower seeds', status: 'not-started', priority: 'medium', owner: 'trey', size: 'S' },
  ];
  for (const t of tasks) {
    await addDoc(col('tasks'), { ...t, createdAt: serverTimestamp() });
  }

  return farmId;
}
