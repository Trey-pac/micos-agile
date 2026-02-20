/**
 * useLearningEngine.js — React hooks for reading Learning Engine stats.
 *
 * Subscribes to stats/ subcollection documents in real-time.
 * Read-only — all writes happen server-side.
 */

import { useState, useEffect, useMemo } from 'react';
import { doc, collection, query, where, onSnapshot, getDocs, orderBy, limit } from 'firebase/firestore';
import { db } from '../firebase';

/**
 * Subscribe to the Learning Engine dashboard document.
 * Returns aggregate stats for the entire farm.
 */
export function useLearningDashboard(farmId) {
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!farmId) { setLoading(false); return; }
    const ref = doc(db, 'farms', farmId, 'stats', 'dashboard');
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
    const statsCol = collection(db, 'farms', farmId, 'stats');
    // We can't do where() on ccs_ prefix docs easily, so load all ccs_ docs
    // and filter client-side. For a small number of docs this is fine.
    const unsub = onSnapshot(statsCol, (snap) => {
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
    const ref = doc(db, 'farms', farmId, 'stats', docId);
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
    const ref = doc(db, 'farms', farmId, 'stats', `yp_${cropId}`);
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
      collection(db, 'farms', farmId, 'alerts'),
      where('status', '==', 'pending')
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
      collection(db, 'farms', farmId, 'alerts'),
      where('status', '==', 'pending'),
      where('type', '==', 'order_anomaly')
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
 */
export function useAllCustomerCropStats(farmId) {
  const [allStats, setAllStats] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!farmId) { setAllStats([]); setLoading(false); return; }
    const col = collection(db, 'farms', farmId, 'stats');
    const unsub = onSnapshot(col, (snap) => {
      const results = [];
      snap.forEach(d => {
        if (d.id.startsWith('ccs_')) {
          results.push({ id: d.id, ...d.data() });
        }
      });
      setAllStats(results);
      setLoading(false);
    }, () => setLoading(false));
    return unsub;
  }, [farmId]);

  return { allStats, loading };
}
