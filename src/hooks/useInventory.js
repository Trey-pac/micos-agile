/**
 * useInventory — real-time consumable inventory with CRUD.
 *
 * Exposes:
 *   inventory    — full list
 *   alertItems   — items where currentQty < parLevel (sorted most-depleted first)
 *   addItem, editItem, removeItem
 */
import { useState, useEffect, useCallback } from 'react';
import {
  subscribeInventory,
  addInventoryItem as svcAdd,
  updateInventoryItem as svcUpdate,
  deleteInventoryItem as svcDelete,
} from '../services/inventoryService';

export function useInventory(farmId) {
  const [inventory, setInventory] = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState(null);

  useEffect(() => {
    if (!farmId) { setLoading(false); return; }
    setLoading(true);
    const unsub = subscribeInventory(
      farmId,
      (items) => { setInventory(items); setLoading(false); },
      (err)   => { console.error('Inventory sub error:', err); setError(err.message); setLoading(false); }
    );
    return unsub;
  }, [farmId]);

  const addItem = useCallback(async (data) => {
    if (!farmId) return;
    try { await svcAdd(farmId, data); }
    catch (e) { console.error('Add inventory item:', e); setError(e.message); }
  }, [farmId]);

  const editItem = useCallback(async (id, updates) => {
    if (!farmId) return;
    try { await svcUpdate(farmId, id, updates); }
    catch (e) { console.error('Edit inventory item:', e); setError(e.message); }
  }, [farmId]);

  const removeItem = useCallback(async (id) => {
    if (!farmId) return;
    try { await svcDelete(farmId, id); }
    catch (e) { console.error('Remove inventory item:', e); setError(e.message); }
  }, [farmId]);

  // Items below par level, sorted most-depleted first (lowest ratio first)
  const alertItems = inventory
    .filter((i) => (i.currentQty ?? 0) < (i.parLevel ?? 0))
    .sort((a, b) => {
      const ra = (a.currentQty ?? 0) / (a.parLevel ?? 1);
      const rb = (b.currentQty ?? 0) / (b.parLevel ?? 1);
      return ra - rb;
    });

  return { inventory, alertItems, loading, error, addItem, editItem, removeItem };
}
