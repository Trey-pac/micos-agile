/**
 * useLearningEngine.js — React hooks for reading Learning Engine stats.
 *
 * Subscribes to stats/ subcollection documents in real-time.
 * Read-only — all writes happen server-side.
 */

import { useState, useEffect, useMemo } from 'react';
import { doc, collection, query, where, onSnapshot, getDocs, orderBy, limit } from 'firebase/firestore';
import { getDb } from '../firebase';

/**
 * Subscribe to the Learning Engine dashboard document.
 * Returns aggregate stats for the entire farm.
 */
export function useLearningDashboard(farmId) {
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!farmId) { setLoading(false); return; }
    const ref = doc(getDb(), 'farms', farmId, 'stats', 'dashboard');
    const unsub = onSnapshot(ref, (snap) => {
      setDashboard(snap.exists() ? snap.data() : null);
      setLoading(false);
    }, () => setLoading(false));
    return unsub;
  }, [farmId]);

  return { dashboard, loading };
}

/**
 * Get customerCropStats for a specific customer (by email key).
 * Returns array of stats docs for all crops that customer orders.
 */
export function useCustomerStats(farmId, customerKey) {
  const [stats, setStats] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!farmId || !customerKey) { setStats([]); setLoading(false); return; }
    setLoading(true);

    // Query all ccs_ docs where customerKey matches
    const statsCol = collection(getDb(), 'farms', farmId, 'stats');
    // We can't do where() on ccs_ prefix docs easily, so load all ccs_ docs
    // and filter client-side. For a small number of docs this is fine.
    const q = query(statsCol, limit(500));
    const unsub = onSnapshot(q, (snap) => {
      const results = [];
      snap.forEach(d => {
        if (d.id.startsWith('ccs_')) {
          const data = d.data();
          if (data.customerKey === customerKey) {
            results.push({ id: d.id, ...data });
          }
        }
      });
      results.sort((a, b) => (b.count || 0) - (a.count || 0));
      setStats(results);
      setLoading(false);
    }, () => setLoading(false));
    return unsub;
  }, [farmId, customerKey]);

  return { stats, loading };
}

/**
 * Get customerCropStats for a specific customer + crop pair.
 * Used in SowingCalculator for demand prediction.
 */
export function useCustomerCropStats(farmId, customerKey, cropKey) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!farmId || !customerKey || !cropKey) { setStats(null); setLoading(false); return; }
    const safeKey = (s) => String(s).replace(/[\/\\.\s@]+/g, '_').substring(0, 100);
    const docId = `ccs_${safeKey(customerKey)}__${safeKey(cropKey)}`;
    const ref = doc(getDb(), 'farms', farmId, 'stats', docId);
    const unsub = onSnapshot(ref, (snap) => {
      setStats(snap.exists() ? snap.data() : null);
      setLoading(false);
    }, () => setLoading(false));
    return unsub;
  }, [farmId, customerKey, cropKey]);

  return { stats, loading };
}

/**
 * Get yield profile for a specific crop.
 */
export function useYieldProfile(farmId, cropId) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!farmId || !cropId) { setProfile(null); setLoading(false); return; }
    const ref = doc(getDb(), 'farms', farmId, 'stats', `yp_${cropId}`);
    const unsub = onSnapshot(ref, (snap) => {
      setProfile(snap.exists() ? snap.data() : null);
      setLoading(false);
    }, () => setLoading(false));
    return unsub;
  }, [farmId, cropId]);

  return { profile, loading };
}

/**
 * Get pending alerts count (for badge display).
 */
export function useAlertCount(farmId) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!farmId) return;
    const q = query(
      collection(getDb(), 'farms', farmId, 'alerts'),
      where('status', '==', 'pending'),
      limit(200)
    );
    const unsub = onSnapshot(q, (snap) => {
      setCount(snap.size);
    }, () => {});
    return unsub;
  }, [farmId]);

  return count;
}

/**
 * Get pending order-anomaly alerts as a Map<orderId, alertData>.
 * Used by Order Board to show warning icons on flagged orders.
 */
export function useOrderAnomalyAlerts(farmId) {
  const [alertMap, setAlertMap] = useState(new Map());

  useEffect(() => {
    if (!farmId) return;
    const q = query(
      collection(getDb(), 'farms', farmId, 'alerts'),
      where('status', '==', 'pending'),
      where('type', '==', 'order_anomaly'),
      limit(200)
    );
    const unsub = onSnapshot(q, (snap) => {
      const m = new Map();
      snap.forEach(d => {
        const data = d.data();
        if (data.orderId) m.set(data.orderId, { id: d.id, ...data });
      });
      setAlertMap(m);
    }, () => {});
    return unsub;
  }, [farmId]);

  return alertMap;
}

/**
 * Get all customerCropStats docs (for BI dashboard).
 * Returns aggregated metrics.
 *
 * @deprecated Use useStatsCollection() instead to avoid duplicate subscriptions.
 */
export function useAllCustomerCropStats(farmId) {
  const { ccsStats: allStats, loading } = useStatsCollection(farmId);
  return { allStats, loading };
}

/**
 * Get all yield profiles (yp_ docs). Returns a Map<cropId, yieldProfile>.
 *
 * @deprecated Use useStatsCollection() instead to avoid duplicate subscriptions.
 */
export function useYieldProfiles(farmId) {
  const { yieldProfiles } = useStatsCollection(farmId);
  return yieldProfiles;
}

/**
 * Combined stats collection subscription. Subscribes once and partitions
 * the docs by prefix (ccs_ for customer-crop stats, yp_ for yield profiles).
 * Replaces calling useAllCustomerCropStats + useYieldProfiles separately,
 * which opened duplicate Firestore listeners on the same collection.
 */
export function useStatsCollection(farmId) {
  const [ccsStats, setCcsStats] = useState([]);
  const [yieldProfiles, setYieldProfiles] = useState(new Map());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!farmId) { setCcsStats([]); setYieldProfiles(new Map()); setLoading(false); return; }
    const col = collection(getDb(), 'farms', farmId, 'stats');
    const unsub = onSnapshot(query(col, limit(500)), (snap) => {
      const ccs = [];
      const yp = new Map();
      snap.forEach(d => {
        if (d.id.startsWith('ccs_')) {
          ccs.push({ id: d.id, ...d.data() });
        } else if (d.id.startsWith('yp_')) {
          const cropId = d.id.replace('yp_', '');
          const data = d.data();
          let adjustedBuffer = 15;
          if (data.yieldCount >= 3 && data.yieldMean > 0) {
            const cv = (data.yieldStddev || 0) / data.yieldMean;
            adjustedBuffer = Math.round(Math.min(30, Math.max(5, cv * 100 * 1.5)));
          }
          yp.set(cropId, { ...data, adjustedBuffer });
        }
      });
      setCcsStats(ccs);
      setYieldProfiles(yp);
      setLoading(false);
    }, () => setLoading(false));
    return unsub;
  }, [farmId]);

  return { ccsStats, yieldProfiles, loading };
}
