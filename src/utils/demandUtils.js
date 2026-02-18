/**
 * demandUtils.js — pure demand analysis, no Firestore calls.
 *
 * Takes the delivered-orders array already loaded by useOrders and
 * returns per-crop demand stats suitable for sowingUtils to consume.
 */
import { getAllVarieties } from '../data/cropConfig';

const DEFAULT_BUFFER = 0.20; // 20% safety buffer
const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** Parse a Firestore Timestamp, seconds-epoch object, or ISO string → Date. */
function toDate(val) {
  if (!val) return null;
  if (val.toDate) return val.toDate();          // Firestore Timestamp
  if (val.seconds) return new Date(val.seconds * 1000); // plain seconds object
  return new Date(val);
}

/**
 * Try to match a product name to a cropConfig variety.
 * Tries exact match, then "variety name contained in product name",
 * then "variety id contained in product name".
 */
function matchToCrop(productName) {
  const lower = productName.toLowerCase();
  const varieties = getAllVarieties();

  let match = varieties.find((v) => v.name.toLowerCase() === lower);
  if (match) return match;

  match = varieties.find((v) => lower.includes(v.name.toLowerCase()));
  if (match) return match;

  match = varieties.find((v) => lower.includes(v.id.toLowerCase()));
  return match || null;
}

/**
 * Analyze delivered orders to calculate demand per crop/product.
 *
 * @param {Array}  orders - all orders from useOrders (any status)
 * @param {number} weeks  - look-back window in weeks (default 4)
 * @param {number} buffer - fractional safety buffer (default 0.20)
 *
 * @returns {Array} sorted by weeklyDemand desc, each item:
 *   { cropId, cropName, varietyCategory, unit,
 *     weeklyDemand, bufferedDemand, trend, peakDays }
 */
export function queryDemand(orders, weeks = 4, buffer = DEFAULT_BUFFER) {
  const now = new Date();
  const cutoffMs = now.getTime() - weeks * 7 * 24 * 60 * 60 * 1000;

  // Only delivered orders inside the look-back window
  const relevant = orders.filter((o) => {
    if (o.status !== 'delivered') return false;
    const d = toDate(o.createdAt);
    return d && d.getTime() >= cutoffMs;
  });

  // Accumulate per product name:
  // { unit, weekBuckets: number[weeks], dayTotals: number[7] }
  const map = {};

  relevant.forEach((order) => {
    const d = toDate(order.createdAt);
    if (!d) return;

    // week bucket: 0 = most recent week, weeks-1 = oldest
    const ageDays = (now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24);
    const bucketIdx = Math.min(weeks - 1, Math.floor(ageDays / 7));
    const dayOfWeek = d.getDay();

    (order.items || []).forEach((item) => {
      const key = item.name;
      if (!map[key]) {
        map[key] = {
          name: key,
          unit: item.unit || '',
          weekBuckets: Array(weeks).fill(0),
          dayTotals: Array(7).fill(0),
        };
      }
      map[key].weekBuckets[bucketIdx] += item.quantity || 0;
      map[key].dayTotals[dayOfWeek] += item.quantity || 0;
    });
  });

  return Object.values(map).map((entry) => {
    const { name, unit, weekBuckets, dayTotals } = entry;

    const totalQty = weekBuckets.reduce((s, w) => s + w, 0);
    const weeklyDemand = Math.round((totalQty / weeks) * 10) / 10;
    const bufferedDemand = Math.round(weeklyDemand * (1 + buffer) * 10) / 10;

    // Trend: recent half vs older half
    const half = Math.max(1, Math.floor(weeks / 2));
    const recentSum = weekBuckets.slice(0, half).reduce((s, w) => s + w, 0);
    const olderSum = weekBuckets.slice(half).reduce((s, w) => s + w, 0);
    let trend;
    if (olderSum === 0) {
      trend = recentSum > 0 ? 'growing' : 'stable';
    } else {
      const change = (recentSum - olderSum) / olderSum;
      trend = change > 0.1 ? 'growing' : change < -0.1 ? 'declining' : 'stable';
    }

    // Peak delivery days (any day with ≥ 70% of the max-day total)
    const maxDay = Math.max(...dayTotals);
    const peakDays = maxDay > 0
      ? dayTotals
          .map((qty, i) => ({ day: DAY_NAMES[i], qty }))
          .filter((d) => d.qty >= maxDay * 0.7)
          .map((d) => d.day)
      : [];

    // Match to cropConfig variety
    const variety = matchToCrop(name);

    return {
      cropId:          variety?.id       || null,
      cropName:        name,
      varietyCategory: variety?.category || null,
      unit,
      weeklyDemand,
      bufferedDemand,
      trend,
      peakDays,
    };
  }).sort((a, b) => b.weeklyDemand - a.weeklyDemand);
}
