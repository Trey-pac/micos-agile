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

  useEffect(() => {
    if (!farmId) { setLoading(false); return; }
    setLoading(true);
    let ready = 0;
    const done = () => { if (++ready === 3) setLoading(false); };
    const err  = (label) => (e) => { console.error(`${label} sub error:`, e); setError(e.message); done(); };

    const u1 = subscribeExpenses(farmId,       (d) => { setExpenses(d);       done(); }, err('Expenses'));
    const u2 = subscribeRevenue(farmId,         (d) => { setRevenue(d);        done(); }, err('Revenue'));
    const u3 = subscribeInfrastructure(farmId,  (d) => { setInfrastructure(d); done(); }, err('Infra'));
    return () => { u1(); u2(); u3(); };
  }, [farmId]);

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
