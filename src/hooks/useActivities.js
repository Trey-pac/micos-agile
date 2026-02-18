/**
 * useActivities — real-time activity subscription with CRUD + client-side queries.
 *
 * All filter helpers work client-side on the already-loaded activities array,
 * avoiding extra Firestore round-trips.
 */
import { useState, useEffect, useCallback } from 'react';
import {
  subscribeActivities,
  addActivity    as svcAdd,
  updateActivity as svcUpdate,
  deleteActivity as svcDelete,
} from '../services/activityService';

function toDate(val) {
  if (!val) return null;
  if (val.toDate)  return val.toDate();
  if (val.seconds) return new Date(val.seconds * 1000);
  return new Date(val);
}

export function useActivities(farmId) {
  const [activities, setActivities] = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState(null);

  useEffect(() => {
    if (!farmId) { setLoading(false); return; }
    setLoading(true);
    const unsub = subscribeActivities(
      farmId,
      (items) => { setActivities(items); setLoading(false); },
      (err)   => { console.error('Activities sub error:', err); setError(err.message); setLoading(false); }
    );
    return unsub;
  }, [farmId]);

  const addActivity = useCallback(async (data) => {
    if (!farmId) return;
    try { return await svcAdd(farmId, data); }
    catch (e) { console.error('Add activity:', e); setError(e.message); }
  }, [farmId]);

  const editActivity = useCallback(async (id, updates) => {
    if (!farmId) return;
    try { await svcUpdate(farmId, id, updates); }
    catch (e) { console.error('Edit activity:', e); setError(e.message); }
  }, [farmId]);

  const deleteActivityItem = useCallback(async (id) => {
    if (!farmId) return;
    try { await svcDelete(farmId, id); }
    catch (e) { console.error('Delete activity:', e); setError(e.message); }
  }, [farmId]);

  // ── Client-side query helpers ────────────────────────────────────────────

  const getActivitiesByContact = useCallback((contactId) =>
    [...activities]
      .filter((a) => a.contactId === contactId)
      .sort((a, b) => (toDate(a.createdAt) || 0) - (toDate(b.createdAt) || 0)),
  [activities]);

  const getActivitiesByType = useCallback((type) =>
    activities.filter((a) => a.type === type),
  [activities]);

  const getActivitiesByDateRange = useCallback((start, end) =>
    activities.filter((a) => {
      const d = toDate(a.createdAt);
      return d && d >= start && d <= end;
    }),
  [activities]);

  const searchActivities = useCallback((query) => {
    if (!query.trim()) return activities;
    const q = query.toLowerCase();
    return activities.filter((a) =>
      a.note?.toLowerCase().includes(q) ||
      a.taskTitle?.toLowerCase().includes(q) ||
      a.contactName?.toLowerCase().includes(q) ||
      (a.tags || []).some((t) => t.toLowerCase().includes(q))
    );
  }, [activities]);

  return {
    activities,
    loading,
    error,
    addActivity,
    editActivity,
    deleteActivity: deleteActivityItem,
    getActivitiesByContact,
    getActivitiesByType,
    getActivitiesByDateRange,
    searchActivities,
  };
}
