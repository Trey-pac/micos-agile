import { useState, useMemo } from 'react';
import { Banknote } from 'lucide-react';
import { EXPENSE_CATEGORIES } from '../hooks/useBudget';
import { Button } from './ui/Button';
import { Card, CardContent } from './ui/Card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from './ui/Tabs';
import ExpenseLogger from './ExpenseLogger';
import { BudgetSkeleton } from './ui/Skeletons';
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
  loading = false,
}) {
  const [period, setPeriod] = useState('month');

  const startStr = useMemo(() => {
    const s = periodStart(period);
    return [
      s.getFullYear(),
      String(s.getMonth() + 1).padStart(2, '0'),
      String(s.getDate()).padStart(2, '0'),
    ].join('-');
  }, [period]);

  if (loading) return <BudgetSkeleton />;

  const periodExp = expenses.filter((e) => e.date >= startStr);
  const periodRev = revenue.filter((r)  => r.date >= startStr);
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
          <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">Budget & Finances</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {expenses.length} expenses · {revenue.length} revenue entries
          </p>
        </div>
        <div className="flex gap-1.5">
          {PERIODS.map((p) => (
            <Button
              key={p.key}
              variant={period === p.key ? 'default' : 'outline'}
              size="sm"
              onClick={() => setPeriod(p.key)}
            >
              {p.label}
            </Button>
          ))}
        </div>
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">📊 Overview</TabsTrigger>
          <TabsTrigger value="expense">+ Log Expense</TabsTrigger>
          <TabsTrigger value="infra">🏗️ Projects</TabsTrigger>
        </TabsList>

      <TabsContent value="overview">
        <div className="space-y-4">
          {/* Summary cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Card>
              <CardContent className="text-center">
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Revenue</p>
                <p className="text-xl font-bold text-green-600">${totalRev.toFixed(2)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="text-center">
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Expenses</p>
                <p className="text-xl font-bold text-red-500">${totalExp.toFixed(2)}</p>
              </CardContent>
            </Card>
            <Card className={profit >= 0 ? 'bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-700' : 'bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-700'}>
              <CardContent className="text-center">
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Net Profit</p>
                <p className={`text-xl font-bold ${profit >= 0 ? 'text-green-700 dark:text-green-300' : 'text-red-600 dark:text-red-400'}`}>
                  {profit < 0 ? '-' : ''}${Math.abs(profit).toFixed(2)}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Category breakdown */}
          {sortedCats.length > 0 ? (
            <Card>
              <CardContent>
                <h3 className="font-bold text-gray-700 dark:text-gray-200 text-sm mb-4">Expenses by Category</h3>
              <div className="space-y-3">
                {sortedCats.map(([catId, amount]) => (
                  <div key={catId}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-medium text-gray-700 dark:text-gray-200">{catLabel(catId)}</span>
                      <span className="font-bold text-gray-800 dark:text-gray-100">${amount.toFixed(2)}</span>
                    </div>
                    <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-green-500 rounded-full transition-all"
                        style={{ width: `${(amount / maxCat) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
              </CardContent>
            </Card>
          ) : (
            <div className="text-center py-12">
              <Banknote className="w-12 h-12 mx-auto mb-3 text-gray-300 dark:text-gray-600" />
              <p className="text-gray-500 dark:text-gray-400 text-sm mb-4">No expenses logged for this period.</p>
              <Button onClick={() => {
                const tabsEl = document.querySelector('[data-state]');
                // Programmatic trigger not needed - use the Tabs defaultValue
              }}>
                Log First Expense
              </Button>
            </div>
          )}
        </div>
      </TabsContent>

      <TabsContent value="expense">
        <ExpenseLogger expenses={expenses} onAdd={onAddExpense} />
      </TabsContent>

      <TabsContent value="infra">
        <InfrastructureTracker
          projects={infrastructure}
          onAdd={onAddProject}
          onEdit={onEditProject}
          onDelete={onDeleteProject}
        />
      </TabsContent>
      </Tabs>
    </div>
  );
}
