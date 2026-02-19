/**
 * harvestPlanningService.js — Converts confirmed orders into production plans.
 *
 * Core flow:
 *   1. generateHarvestPlan(farmId, deliveryDate)  → plan array
 *   2. autoCreateProductionTasks(farmId, plan)     → writes to Firestore
 *
 * Collections written:
 *   - farms/{farmId}/sowingSchedule/{id}
 *   - farms/{farmId}/crewTasks/{id}
 */
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../firebase';
import { getAllVarieties } from '../data/cropConfig';

// ── Yield override table (oz per tray) — production-calibrated ──────────────
// For herbs that are listed with yieldPerPort in cropConfig, we maintain
// tray-equivalent yields here so harvest planning works in oz/tray units.
const YIELD_PER_TRAY_OVERRIDES = {
  basil:    3.5,
  cilantro: 5,
};

// ── Helpers ─────────────────────────────────────────────────────────────────

function addDays(dateStr, days) {
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

/** Round n UP to nearest multiple of m */
function ceilToMultiple(n, m) {
  return Math.ceil(n / m) * m;
}

/** Get yield in oz per tray for a variety */
function getYieldPerTray(variety) {
  if (YIELD_PER_TRAY_OVERRIDES[variety.id]) return YIELD_PER_TRAY_OVERRIDES[variety.id];
  if (variety.yieldPerTray) return variety.yieldPerTray;
  // Fallback: convert yieldPerPort (lbs) to oz — 1 port ≈ 1 tray slot
  if (variety.yieldPerPort) return variety.yieldPerPort * 16;
  return 8; // safe default
}

// ── 1. Generate Harvest Plan ────────────────────────────────────────────────

/**
 * Query confirmed/packed orders for a delivery date, group by product,
 * and calculate trays/dates needed.
 *
 * @returns {Array<{ crop, cropId, cropName, totalOz, traysNeeded, soakDate,
 *                   sowDate, uncoverDate, harvestDate, orders }>}
 */
export async function generateHarvestPlan(farmId, deliveryDate) {
  // Fetch orders for this delivery date
  const ordersRef = collection(db, 'farms', farmId, 'orders');
  const q = query(
    ordersRef,
    where('requestedDeliveryDate', '==', deliveryDate),
  );
  const snap = await getDocs(q);
  const orders = snap.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .filter(o => o.status === 'confirmed' || o.status === 'packed');

  if (orders.length === 0) return [];

  // Group line items by product name (case-insensitive)
  const productMap = {}; // productName → { totalOz, orderIds }
  for (const order of orders) {
    for (const item of (order.items || [])) {
      const key = (item.name || item.product || '').toLowerCase().trim();
      if (!key) continue;
      if (!productMap[key]) {
        productMap[key] = { totalOz: 0, orderIds: new Set(), displayName: item.name || item.product };
      }
      // Quantity is in oz (or units — treat as oz for microgreens)
      productMap[key].totalOz += (item.quantity || 0) * (item.unitOz || 1);
      productMap[key].orderIds.add(order.id);
    }
  }

  // Match products to cropConfig varieties
  const allVarieties = getAllVarieties();
  const plan = [];

  for (const [key, data] of Object.entries(productMap)) {
    // Fuzzy match: check if variety name contains the key or vice versa
    const variety = allVarieties.find(v =>
      v.name.toLowerCase().includes(key) ||
      key.includes(v.name.toLowerCase()) ||
      v.id === key
    );

    const yieldPerTray = variety ? getYieldPerTray(variety) : 8;
    const growDays = variety?.growDays || 10;
    const blackoutDays = variety?.blackoutDays || 3;
    const needsSoak = variety ? ['sunflower', 'pea'].includes(variety.id) : false;

    // 15% buffer, round up to nearest 3 (tray stack multiple)
    const rawTrays = Math.ceil((data.totalOz / yieldPerTray) * 1.15);
    const traysNeeded = ceilToMultiple(rawTrays, 3);

    const sowDate = addDays(deliveryDate, -growDays);
    const soakDate = needsSoak ? addDays(sowDate, -1) : null;
    const uncoverDate = addDays(sowDate, blackoutDays);
    const harvestDate = deliveryDate;

    plan.push({
      cropId: variety?.id || key,
      cropName: variety?.name || data.displayName,
      category: variety?.category || 'microgreens',
      totalOz: data.totalOz,
      yieldPerTray,
      traysNeeded,
      soakDate,
      sowDate,
      uncoverDate,
      harvestDate,
      orders: [...data.orderIds],
    });
  }

  return plan;
}

// ── 2. Auto-Create Production Tasks ─────────────────────────────────────────

/**
 * Takes a harvest plan and writes Firestore docs:
 *   - sowingSchedule entries (one per crop)
 *   - crewTasks (soak/sow/uncover/harvest per crop)
 *
 * Deduplicates by checking existing docs with same crop + date + type.
 *
 * @returns {{ scheduleEntries: number, crewTasks: number }}
 */
export async function autoCreateProductionTasks(farmId, harvestPlan) {
  const sowingCol = collection(db, 'farms', farmId, 'sowingSchedule');
  const crewCol = collection(db, 'farms', farmId, 'crewTasks');

  // Fetch existing to deduplicate
  const [existingSowing, existingCrew] = await Promise.all([
    getDocs(sowingCol),
    getDocs(crewCol),
  ]);

  const sowingSet = new Set(
    existingSowing.docs.map(d => {
      const data = d.data();
      return `${data.crop || data.cropId}|${data.sowDate}`;
    })
  );
  const crewSet = new Set(
    existingCrew.docs.map(d => {
      const data = d.data();
      return `${data.crop}|${data.date}|${data.type}`;
    })
  );

  let scheduleCount = 0;
  let crewCount = 0;

  for (const item of harvestPlan) {
    // ── Sowing schedule entry ──
    const sowKey = `${item.cropId}|${item.sowDate}`;
    if (!sowingSet.has(sowKey)) {
      await addDoc(sowingCol, {
        crop: item.cropId,
        cropName: item.cropName,
        traysNeeded: item.traysNeeded,
        sowDate: item.sowDate,
        estimatedHarvestDate: item.harvestDate,
        linkedOrderIds: item.orders,
        status: 'planned',
        autoGenerated: true,
        farmId,
        createdAt: serverTimestamp(),
      });
      sowingSet.add(sowKey);
      scheduleCount++;
    }

    // ── Crew tasks ──
    const tasks = [];

    if (item.soakDate) {
      tasks.push({
        title: `Soak ${item.traysNeeded} trays ${item.cropName}`,
        date: item.soakDate,
        type: 'soak',
      });
    }

    tasks.push({
      title: `Sow ${item.traysNeeded} trays ${item.cropName}`,
      date: item.sowDate,
      type: 'sow',
    });

    tasks.push({
      title: `Uncover ${item.traysNeeded} trays ${item.cropName}`,
      date: item.uncoverDate,
      type: 'uncover',
    });

    tasks.push({
      title: `Harvest ${item.traysNeeded} trays ${item.cropName} — ${item.totalOz} oz for ${item.harvestDate}`,
      date: item.harvestDate,
      type: 'harvest',
    });

    for (const task of tasks) {
      const crewKey = `${item.cropId}|${task.date}|${task.type}`;
      if (!crewSet.has(crewKey)) {
        await addDoc(crewCol, {
          title: task.title,
          date: task.date,
          type: task.type,
          crop: item.cropId,
          cropName: item.cropName,
          trayCount: item.traysNeeded,
          linkedOrderIds: item.orders,
          status: 'pending',
          autoGenerated: true,
          farmId,
          createdAt: serverTimestamp(),
        });
        crewSet.add(crewKey);
        crewCount++;
      }
    }
  }

  return { scheduleEntries: scheduleCount, crewTasks: crewCount };
}
