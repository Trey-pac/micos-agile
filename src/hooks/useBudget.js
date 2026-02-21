import { useState, useEffect, useCallback } from 'react';
import {
  subscribeExpenses, addExpense as svcAddExpense,
  updateExpense as svcUpdateExpense, deleteExpense as svcDeleteExpense,
  subscribeRevenue, addRevenue as svcAddRevenue,
  subscribeInfrastructure, addProject as svcAddProject,
  updateProject as svcUpdateProject, deleteProject as svcDeleteProject,
} from '../services/budgetService';

export const EXPENSE_CATEGORIES = [
  { id: 'seeds',     label: 'Seeds' },
  { id: 'soil',      label: 'Soil / Media' },
  { id: 'labor',     label: 'Labor' },
  { id: 'utilities', label: 'Utilities' },
  { id: 'equipment', label: 'Equipment' },
  { id: 'packaging', label: 'Packaging' },
  { id: 'delivery',  label: 'Delivery' },
  { id: 'other',     label: 'Other' },
];

/**
 * Budget hook — real-time subscriptions to expenses, revenue, and
 * infrastructure projects. Exposes CRUD for all three plus the
 * EXPENSE_CATEGORIES constant.
 */
export function useBudget(farmId) {
  const [expenses,       setExpenses]       = useState([]);
  const [revenue,        setRevenue]        = useState([]);
  const [infrastructure, setInfrastructure] = useState([]);
  const [loading,        setLoading]        = useState(true);
  const [error,          setError]          = useState(null);

  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    if (!farmId) { setLoading(false); return; }
    setLoading(true);
    setError(null);
    let ready = 0;
    let retryTimer;
    const done = () => { if (++ready === 3) setLoading(false); };
    const onErr = (label) => (e) => {
      console.error(`${label} sub error:`, e?.code, e?.message);
      setError(e.message); done();
      if (retryKey < 3) retryTimer = setTimeout(() => setRetryKey(k => k + 1), 3000);
    };

    const u1 = subscribeExpenses(farmId,       (d) => { setExpenses(d);       setError(null); done(); }, onErr('Expenses'));
    const u2 = subscribeRevenue(farmId,         (d) => { setRevenue(d);        setError(null); done(); }, onErr('Revenue'));
    const u3 = subscribeInfrastructure(farmId,  (d) => { setInfrastructure(d); setError(null); done(); }, onErr('Infra'));
    return () => { u1(); u2(); u3(); if (retryTimer) clearTimeout(retryTimer); };
  }, [farmId, retryKey]);

  // ── Expense CRUD ──────────────────────────────────────────────────────────
  const addExpense = useCallback(async (data) => {
    if (!farmId) return;
    try { await svcAddExpense(farmId, data); }
    catch (e) { console.error('Add expense:', e); setError(e.message); }
  }, [farmId]);

  const editExpense = useCallback(async (id, updates) => {
    if (!farmId) return;
    try { await svcUpdateExpense(farmId, id, updates); }
    catch (e) { console.error('Edit expense:', e); setError(e.message); }
  }, [farmId]);

  const removeExpense = useCallback(async (id) => {
    if (!farmId) return;
    try { await svcDeleteExpense(farmId, id); }
    catch (e) { console.error('Remove expense:', e); setError(e.message); }
  }, [farmId]);

  // ── Revenue ───────────────────────────────────────────────────────────────
  const addRevenue = useCallback(async (data) => {
    if (!farmId) return;
    try { await svcAddRevenue(farmId, data); }
    catch (e) { console.error('Add revenue:', e); setError(e.message); }
  }, [farmId]);

  // ── Infrastructure CRUD ───────────────────────────────────────────────────
  const addProject = useCallback(async (data) => {
    if (!farmId) return;
    try { await svcAddProject(farmId, data); }
    catch (e) { console.error('Add project:', e); setError(e.message); }
  }, [farmId]);

  const editProject = useCallback(async (id, updates) => {
    if (!farmId) return;
    try { await svcUpdateProject(farmId, id, updates); }
    catch (e) { console.error('Edit project:', e); setError(e.message); }
  }, [farmId]);

  const removeProject = useCallback(async (id) => {
    if (!farmId) return;
    try { await svcDeleteProject(farmId, id); }
    catch (e) { console.error('Remove project:', e); setError(e.message); }
  }, [farmId]);

  return {
    expenses, revenue, infrastructure, loading, error,
    addExpense, editExpense, removeExpense,
    addRevenue,
    addProject, editProject, removeProject,
  };
}
