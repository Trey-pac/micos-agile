import { useState, useEffect, useCallback } from 'react';
import {
  subscribeOrders,
  subscribeChefOrders,
  addOrder as addOrderService,
  updateOrderStatus as updateOrderStatusService,
  updateOrder as updateOrderService,
} from '../services/orderService';

/**
 * Orders hook — real-time Firestore subscription + CRUD.
 *
 * Pass customerId to get a single chef's orders (chef view).
 * Omit customerId (or pass null) to get all orders (admin view).
 *
 * Orders are returned sorted newest-first.
 */
export function useOrders(farmId, customerId = null) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!farmId) { setOrders([]); setLoading(false); return; }
    setLoading(true);
    const unsubscribe = customerId
      ? subscribeChefOrders(farmId, customerId,
          (list) => { setOrders(list); setLoading(false); },
          (err) => { console.error('Chef orders error:', err); setError(err.message); setLoading(false); })
      : subscribeOrders(farmId,
          (list) => { setOrders(list); setLoading(false); },
          (err) => { console.error('Orders error:', err); setError(err.message); setLoading(false); });
    return unsubscribe;
  }, [farmId, customerId]);

  const addOrder = useCallback(async (orderData) => {
    if (!farmId) return null;
    try { return await addOrderService(farmId, orderData); }
    catch (err) { console.error('Add order error:', err); setError(err.message); return null; }
  }, [farmId]);

  const advanceOrderStatus = useCallback(async (orderId, newStatus) => {
    if (!farmId) return;
    try { await updateOrderStatusService(farmId, orderId, newStatus); }
    catch (err) { console.error('Advance order status error:', err); setError(err.message); }
  }, [farmId]);

  const updateOrder = useCallback(async (orderId, updates) => {
    if (!farmId) return;
    try { await updateOrderService(farmId, orderId, updates); }
    catch (err) { console.error('Update order error:', err); setError(err.message); }
  }, [farmId]);

  // Newest first
  const sorted = [...orders].sort((a, b) =>
    (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0)
  );

  return { orders: sorted, loading, error, addOrder, advanceOrderStatus, updateOrder };
}
