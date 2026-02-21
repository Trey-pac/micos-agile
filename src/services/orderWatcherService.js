/**
 * orderWatcherService.js — Real-time order watcher that auto-triggers
 * harvest planning when orders are confirmed.
 *
 * Call `startOrderWatcher(farmId)` once at app mount.
 * Returns an unsubscribe function.
 */
import {
  collection,
  query,
  where,
  onSnapshot,
} from 'firebase/firestore';
import { getDb } from '../firebase';
import {
  generateHarvestPlan,
  autoCreateProductionTasks,
} from './harvestPlanningService';
import { addActivity } from './activityService';

// ── Debounce configuration ──────────────────────────────────────────────────
const DEBOUNCE_MS = 30_000; // 30 seconds per delivery date
const _timers = {};         // deliveryDate → timeout

function debounceByDate(deliveryDate, fn) {
  if (_timers[deliveryDate]) clearTimeout(_timers[deliveryDate]);
  _timers[deliveryDate] = setTimeout(fn, DEBOUNCE_MS);
}

// ── Public API ──────────────────────────────────────────────────────────────

/**
 * Start watching confirmed orders in real-time.
 * When new/changed confirmed orders are detected, debounce per delivery date,
 * then generate + write production tasks.
 *
 * @param {string} farmId
 * @returns {Function} unsubscribe
 */
export function startOrderWatcher(farmId) {
  const ordersRef = collection(getDb(), 'farms', farmId, 'orders');
  const q = query(ordersRef, where('status', '==', 'confirmed'));

  const unsubscribe = onSnapshot(q, (snap) => {
    // Group changed docs by delivery date
    const deliveryDates = new Set();
    snap.docChanges().forEach((change) => {
      if (change.type === 'added' || change.type === 'modified') {
        const data = change.doc.data();
        if (data.requestedDeliveryDate) {
          deliveryDates.add(data.requestedDeliveryDate);
        }
      }
    });

    // Debounce planning per delivery date
    for (const date of deliveryDates) {
      debounceByDate(date, async () => {
        try {
          const plan = await generateHarvestPlan(farmId, date);
          if (plan.length === 0) return;

          const result = await autoCreateProductionTasks(farmId, plan);
          if (result.scheduleEntries > 0 || result.crewTasks > 0) {
            await addActivity(farmId, {
              type: 'system',
              title: `Auto-planned harvest for ${date}`,
              description: `Created ${result.scheduleEntries} sowing entries & ${result.crewTasks} crew tasks`,
              category: 'production',
            });
          }
        } catch (err) {
          console.error(`[OrderWatcher] Failed to plan for ${date}:`, err);
        }
      });
    }
  }, (err) => {
    // Firestore permission errors must be caught here — onSnapshot has no
    // implicit error handling and an unhandled error kills the whole app.
    console.error('[OrderWatcher] Firestore subscription error:', err);
  });

  return () => {
    // Cleanup timers + unsubscribe
    Object.values(_timers).forEach(clearTimeout);
    Object.keys(_timers).forEach(k => delete _timers[k]);
    unsubscribe();
  };
}
