import { useState, useEffect, useCallback } from 'react';
import {
  subscribeSprints,
  addSprint as addSprintService,
  updateSprint as updateSprintService,
} from '../services/sprintService';
import { getSprintDates, getCurrentSprint } from '../utils/sprintUtils';

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

  // Auto-select current sprint when sprints load
  useEffect(() => {
    if (sprints.length > 0 && !selectedSprintId) {
      const current = getCurrentSprint(sprints);
      setSelectedSprintId(current ? current.id : sprints[0].id);
    }
  }, [sprints, selectedSprintId]);

  // Auto-create sprints up to 12 if fewer exist
  useEffect(() => {
    if (!farmId || loading || sprints.length >= 12) return;

    const createMissingSprints = async () => {
      const startNumber = sprints.length + 1;
      for (let i = startNumber; i <= 12; i++) {
        const { startDate, endDate } = getSprintDates(i);
        try {
          await addSprintService(farmId, {
            number: i,
            name: `Sprint ${i}`,
            goal: '',
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString(),
          });
        } catch (err) {
          console.error(`Error creating Sprint ${i}:`, err);
        }
      }
    };

    createMissingSprints();
  }, [farmId, loading, sprints.length]);

  // Add a new sprint manually
  const addSprint = useCallback(
    async (sprintData) => {
      if (!farmId) return;
      const { startDate, endDate } = getSprintDates(sprints.length + 1);
      try {
        const id = await addSprintService(farmId, {
          number: sprints.length + 1,
          name: sprintData.name || `Sprint ${sprints.length + 1}`,
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
    [farmId, sprints.length]
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
