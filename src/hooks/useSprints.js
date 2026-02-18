import { useState, useEffect, useCallback, useRef } from 'react';
import {
  subscribeSprints,
  addSprint as addSprintService,
  updateSprint as updateSprintService,
} from '../services/sprintService';
import { getSprintDates, getAutoSelectedSprint } from '../utils/sprintUtils';

/**
 * Sprint state hook — subscribes to Firestore, auto-creates up to 12 sprints,
 * auto-selects the current sprint.
 *
 * Requires a farmId (from useAuth).
 */
export function useSprints(farmId) {
  const [sprints, setSprints] = useState([]);
  const [selectedSprintId, setSelectedSprintId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const isCreatingSprints = useRef(false);

  // Real-time subscription
  useEffect(() => {
    if (!farmId) {
      setSprints([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const unsubscribe = subscribeSprints(
      farmId,
      (sprintList) => {
        setSprints(sprintList);
        setLoading(false);
      },
      (err) => {
        console.error('Sprint subscription error:', err);
        setError(err.message);
        setLoading(false);
      }
    );

    return unsubscribe;
  }, [farmId]);

  // Auto-select on first load (selectedSprintId is null) or after a re-seed wipe
  // (sprint no longer exists). Uses getAutoSelectedSprint which rolls forward on the
  // last day of a sprint so the NEXT sprint is shown instead of the ending one.
  useEffect(() => {
    if (sprints.length === 0) return;
    const stillExists = sprints.some((s) => s.id === selectedSprintId);
    if (!selectedSprintId || !stillExists) {
      const best = getAutoSelectedSprint(sprints);
      setSelectedSprintId(best.id);
    }
  }, [sprints, selectedSprintId]);

  // Auto-create sprints up to 12 if fewer exist
  // Uses a ref guard to prevent duplicate creation on re-renders
  // Skip if there are no sprints at all — user needs to seed first
  useEffect(() => {
    if (!farmId || loading || sprints.length === 0 || sprints.length >= 12) return;
    if (isCreatingSprints.current) return;

    // Find the highest sprint number already in Firestore
    const maxNumber = sprints.reduce(
      (max, s) => Math.max(max, s.number || 0),
      0
    );

    // Only create if we actually need more
    if (maxNumber >= 12) return;

    isCreatingSprints.current = true;

    const createMissingSprints = async () => {
      try {
        for (let i = maxNumber + 1; i <= 12; i++) {
          const { startDate, endDate } = getSprintDates(i);
          await addSprintService(farmId, {
            number: i,
            name: `Sprint ${i}`,
            goal: '',
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString(),
          });
        }
      } catch (err) {
        console.error('Auto-create sprints error:', err);
      } finally {
        isCreatingSprints.current = false;
      }
    };

    createMissingSprints();
  // sprints.length is intentional — we only care about count, not array identity
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [farmId, loading, sprints.length]);

  // Add a new sprint manually
  const addSprint = useCallback(
    async (sprintData) => {
      if (!farmId) return;
      const nextNumber = sprints.reduce(
        (max, s) => Math.max(max, s.number || 0),
        0
      ) + 1;
      const { startDate, endDate } = getSprintDates(nextNumber);
      try {
        const id = await addSprintService(farmId, {
          number: nextNumber,
          name: sprintData.name || `Sprint ${nextNumber}`,
          goal: sprintData.goal || '',
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
        });
        setSelectedSprintId(id);
      } catch (err) {
        console.error('Add sprint error:', err);
        setError(err.message);
      }
    },
    [farmId, sprints]
  );

  // Update a sprint
  const updateSprint = useCallback(
    async (sprintId, updates) => {
      if (!farmId) return;
      try {
        await updateSprintService(farmId, sprintId, updates);
      } catch (err) {
        console.error('Update sprint error:', err);
        setError(err.message);
      }
    },
    [farmId]
  );

  return {
    sprints,
    selectedSprintId,
    setSelectedSprintId,
    loading,
    error,
    addSprint,
    updateSprint,
  };
}
