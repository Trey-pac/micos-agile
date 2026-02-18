import { useState, useMemo } from 'react';
import { EXPENSE_CATEGORIES } from '../hooks/useBudget';
import ExpenseLogger from './ExpenseLogger';
import InfrastructureTracker from './InfrastructureTracker';

const PERIODS = [
  { key: 'week',    label: 'Week' },
  { key: 'month',   label: 'Month' },
  { key: 'quarter', label: 'Quarter' },
];

function periodStart(period) {
  const now = new Date();
  if (period === 'week') {
    const d = new Date(now);
    d.setDate(d.getDate() - 6);
    d.setHours(0, 0, 0, 0);
    return d;
  }
  if (period === 'month') return new Date(now.getFullYear(), now.getMonth(), 1);
  return new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
}

export default function BudgetTracker({
  expenses = [], revenue = [], infrastructure = [],
  onAddExpense,
  onAddProject, onEditProject, onDeleteProject,
}) {
  const [tab, setTab]       = useState('overview');
  const [period, setPeriod] = useState('month');

  const start = useMemo(() => periodStart(period), [period]);

  const periodExp = expenses.filter((e) => new Date(e.date) >= start);
  const periodRev = revenue.filter((r)  => new Date(r.date) >= start);
  const totalExp  = periodExp.reduce((s, e) => s + (e.amount || 0), 0);
  const totalRev  = periodRev.reduce((s, r) => s + (r.amount || 0), 0);
  const profit    = totalRev - totalExp;

  const catTotals   = periodExp.reduce((acc, e) => {
    acc[e.category] = (acc[e.category] || 0) + (e.amount || 0);
    return acc;
  }, {});
  const sortedCats = Object.entries(catTotals).sort((a, b) => b[1] - a[1]);
  const maxCat     = sortedCats[0]?.[1] || 1;
  const catLabel   = (id) => EXPENSE_CATEGORIES.find((c) => c.id === id)?.label ?? id;

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header row */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Budget & Finances</h2>
          <p className="text-sm text-gray-500">
            {expenses.length} expenses · {revenue.length} revenue entries
          </p>
        </div>
        <div className="flex gap-1.5">
          {PERIODS.map((p) => (
            <button
              key={p.key}
              onClick={() => setPeriod(p.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
                period === p.key
                  ? 'bg-green-600 text-white'
                  : 'bg-white border border-gray-200 text-gray-600 hover:border-green-300'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab nav */}
      <div className="flex gap-2 mb-5">
        {[
          { key: 'overview', label: '📊 Overview' },
          { key: 'expense',  label: '+ Log Expense' },
          { key: 'infra',    label: '🏗️ Projects' },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold cursor-pointer transition-all ${
              tab === t.key
                ? 'bg-green-600 text-white'
                : 'bg-white border border-gray-200 text-gray-600 hover:border-green-300'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Overview ── */}
      {tab === 'overview' && (
        <div className="space-y-4">
          {/* Summary cards */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-white rounded-2xl border border-gray-200 p-4 text-center">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Revenue</p>
              <p className="text-xl font-bold text-green-600">${totalRev.toFixed(2)}</p>
            </div>
            <div className="bg-white rounded-2xl border border-gray-200 p-4 text-center">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Expenses</p>
              <p className="text-xl font-bold text-red-500">${totalExp.toFixed(2)}</p>
            </div>
            <div className={`rounded-2xl border p-4 text-center ${profit >= 0 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Net Profit</p>
              <p className={`text-xl font-bold ${profit >= 0 ? 'text-green-700' : 'text-red-600'}`}>
                {profit < 0 ? '-' : ''}${Math.abs(profit).toFixed(2)}
              </p>
            </div>
          </div>

          {/* Category breakdown */}
          {sortedCats.length > 0 ? (
            <div className="bg-white rounded-2xl border border-gray-200 p-5">
              <h3 className="font-bold text-gray-700 text-sm mb-4">Expenses by Category</h3>
              <div className="space-y-3">
                {sortedCats.map(([catId, amount]) => (
                  <div key={catId}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-medium text-gray-700">{catLabel(catId)}</span>
                      <span className="font-bold text-gray-800">${amount.toFixed(2)}</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-green-500 rounded-full transition-all"
                        style={{ width: `${(amount / maxCat) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-4xl mb-3">💰</p>
              <p className="text-gray-500 text-sm mb-4">No expenses logged for this period.</p>
              <button
                onClick={() => setTab('expense')}
                className="bg-green-600 text-white font-bold px-5 py-2 rounded-xl text-sm hover:bg-green-700 cursor-pointer"
              >
                Log First Expense
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Log Expense ── */}
      {tab === 'expense' && (
        <ExpenseLogger expenses={expenses} onAdd={onAddExpense} />
      )}

      {/* ── Infrastructure ── */}
      {tab === 'infra' && (
        <InfrastructureTracker
          projects={infrastructure}
          onAdd={onAddProject}
          onEdit={onEditProject}
          onDelete={onDeleteProject}
        />
      )}
    </div>
  );
}
