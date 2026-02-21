import { useState, useEffect, useCallback } from 'react';
import {
  subscribeCosts, addCost as addCostService,
  updateCost as updateCostService, deleteCost as deleteCostService,
} from '../services/costService';

export function useCosts(farmId) {
  const [costs, setCosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!farmId) { setCosts([]); setLoading(false); return; }
    setLoading(true);
    return subscribeCosts(
      farmId,
      (data) => { setCosts(data); setLoading(false); },
      (err) => { console.error('[useCosts] error:', err); setError(err.message); setLoading(false); },
    );
  }, [farmId]);

  const addCost = useCallback(async (data) => {
    if (!farmId) return;
    try { return await addCostService(farmId, data); }
    catch (err) { console.error('[useCosts] add error:', err); setError(err.message); }
  }, [farmId]);

  const editCost = useCallback(async (id, updates) => {
    if (!farmId) return;
    try { return await updateCostService(farmId, id, updates); }
    catch (err) { console.error('[useCosts] edit error:', err); setError(err.message); }
  }, [farmId]);

  const removeCost = useCallback(async (id) => {
    if (!farmId) return;
    try { return await deleteCostService(farmId, id); }
    catch (err) { console.error('[useCosts] remove error:', err); setError(err.message); }
  }, [farmId]);

  return { costs, loading, error, addCost, editCost, removeCost };
}
