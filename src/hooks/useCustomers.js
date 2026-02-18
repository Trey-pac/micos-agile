import { useState, useEffect, useCallback } from 'react';
import {
  subscribeCustomers,
  addCustomer as addCustomerService,
  updateCustomer as updateCustomerService,
  deleteCustomer as deleteCustomerService,
} from '../services/customerService';

/**
 * Chef customer accounts hook — real-time Firestore subscription + CRUD.
 */
export function useCustomers(farmId) {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!farmId) { setCustomers([]); setLoading(false); return; }
    setLoading(true);
    return subscribeCustomers(
      farmId,
      (list) => { setCustomers(list); setLoading(false); },
      (err) => { console.error('Customers subscription error:', err); setError(err.message); setLoading(false); }
    );
  }, [farmId]);

  const addCustomer = useCallback(async (data) => {
    if (!farmId) return;
    try { await addCustomerService(farmId, data); }
    catch (err) { console.error('Add customer error:', err); setError(err.message); }
  }, [farmId]);

  const editCustomer = useCallback(async (customerId, updates) => {
    if (!farmId) return;
    try { await updateCustomerService(farmId, customerId, updates); }
    catch (err) { console.error('Edit customer error:', err); setError(err.message); }
  }, [farmId]);

  const removeCustomer = useCallback(async (customerId) => {
    if (!farmId) return;
    try { await deleteCustomerService(farmId, customerId); }
    catch (err) { console.error('Delete customer error:', err); setError(err.message); }
  }, [farmId]);

  return { customers, loading, error, addCustomer, editCustomer, removeCustomer };
}
