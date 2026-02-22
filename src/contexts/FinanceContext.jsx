/**
 * FinanceContext — Domain context for budget (expenses/revenue/infrastructure) and costs.
 *
 * Owns useBudget and useCosts subscriptions. Provides all finance-domain
 * data, loading, error, and mutation callbacks via useFinanceContext().
 */
import { createContext, useContext, useMemo } from 'react';
import { useBudget } from '../hooks/useBudget';
import { useCosts } from '../hooks/useCosts';

const FinanceContext = createContext(null);

export function FinanceProvider({ farmId, children }) {
  const {
    expenses, revenue, infrastructure,
    loading: budgetLoading, error: budgetError,
    addExpense, editExpense, removeExpense,
    addRevenue,
    addProject, editProject, removeProject,
  } = useBudget(farmId);

  const {
    costs, loading: costsLoading, error: costsError,
    addCost, editCost: editCostFn, removeCost,
  } = useCosts(farmId);

  const value = useMemo(() => ({
    // Budget
    expenses, revenue, infrastructure,
    budgetLoading, budgetError,
    addExpense, editExpense, removeExpense,
    addRevenue,
    addProject, editProject, removeProject,
    // Costs
    costs, costsLoading, costsError,
    addCost, editCostFn, removeCost,
  }), [
    expenses, revenue, infrastructure,
    budgetLoading, budgetError,
    addExpense, editExpense, removeExpense,
    addRevenue,
    addProject, editProject, removeProject,
    costs, costsLoading, costsError,
    addCost, editCostFn, removeCost,
  ]);

  return (
    <FinanceContext.Provider value={value}>
      {children}
    </FinanceContext.Provider>
  );
}

export function useFinanceContext() {
  const ctx = useContext(FinanceContext);
  if (!ctx) throw new Error('useFinanceContext must be used within a FinanceProvider');
  return ctx;
}
