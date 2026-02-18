import { useState } from 'react';
import { EXPENSE_CATEGORIES } from '../hooks/useBudget';

const today = () => new Date().toISOString().split('T')[0];

export default function ExpenseLogger({ expenses = [], onAdd }) {
  const [form, setForm] = useState({
    category: 'seeds',
    amount: '',
    description: '',
    date: today(),
    recurring: false,
    interval: 'monthly',
  });
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async () => {
    if (!form.amount || !form.description.trim()) return;
    setSaving(true);
    try {
      await onAdd({
        ...form,
        amount: parseFloat(form.amount),
        interval: form.recurring ? form.interval : null,
      });
      setSuccess(true);
      setForm((f) => ({ ...f, amount: '', description: '', recurring: false }));
      setTimeout(() => setSuccess(false), 2500);
    } finally {
      setSaving(false);
    }
  };

  const recent = [...expenses]
    .sort((a, b) =>
      new Date(b.date) - new Date(a.date) ||
      (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0)
    )
    .slice(0, 5);

  const catLabel = (id) => EXPENSE_CATEGORIES.find((c) => c.id === id)?.label ?? id;

  return (
    <div className="max-w-lg mx-auto">
      <h3 className="text-lg font-bold text-gray-800 mb-4">Log Expense</h3>

      <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4">
        {/* Category + Amount */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold text-gray-600 block mb-1">Category</label>
            <select
              value={form.category}
              onChange={(e) => set('category', e.target.value)}
              className="w-full border-2 border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:border-green-400 focus:outline-none"
            >
              {EXPENSE_CATEGORIES.map((c) => (
                <option key={c.id} value={c.id}>{c.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-600 block mb-1">Amount ($)</label>
            <input
              type="number" min="0" step="0.01" placeholder="0.00"
              value={form.amount}
              onChange={(e) => set('amount', e.target.value)}
              className="w-full border-2 border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:border-green-400 focus:outline-none"
            />
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="text-xs font-semibold text-gray-600 block mb-1">Description</label>
          <input
            placeholder="What was this expense?"
            value={form.description}
            onChange={(e) => set('description', e.target.value)}
            className="w-full border-2 border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:border-green-400 focus:outline-none"
          />
        </div>

        {/* Date + Recurring */}
        <div className="flex items-end gap-3 flex-wrap">
          <div className="flex-1 min-w-[120px]">
            <label className="text-xs font-semibold text-gray-600 block mb-1">Date</label>
            <input
              type="date" value={form.date}
              onChange={(e) => set('date', e.target.value)}
              className="w-full border-2 border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:border-green-400 focus:outline-none"
            />
          </div>
          <label className="flex items-center gap-2 pb-2.5 cursor-pointer">
            <input
              type="checkbox" checked={form.recurring}
              onChange={(e) => set('recurring', e.target.checked)}
              className="w-4 h-4 accent-green-600"
            />
            <span className="text-sm font-medium text-gray-700">Recurring</span>
          </label>
          {form.recurring && (
            <select
              value={form.interval}
              onChange={(e) => set('interval', e.target.value)}
              className="border-2 border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:border-green-400 focus:outline-none"
            >
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="yearly">Yearly</option>
            </select>
          )}
        </div>

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={saving || !form.amount || !form.description.trim()}
          className="w-full py-3 bg-green-600 text-white font-bold rounded-xl text-sm hover:bg-green-700 disabled:opacity-50 transition-colors cursor-pointer"
        >
          {success ? '✅ Logged!' : saving ? 'Saving…' : 'Log Expense'}
        </button>
      </div>

      {/* Recent entries */}
      {recent.length > 0 && (
        <div className="mt-5">
          <h4 className="text-sm font-semibold text-gray-600 mb-2">Recent</h4>
          <div className="bg-white rounded-2xl border border-gray-200 divide-y divide-gray-100">
            {recent.map((e) => (
              <div key={e.id} className="flex items-center justify-between px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-gray-800 truncate">{e.description}</p>
                  <p className="text-xs text-gray-400">
                    {catLabel(e.category)} · {e.date}
                    {e.recurring && <span className="ml-1 text-purple-500">↻ {e.interval}</span>}
                  </p>
                </div>
                <p className="font-bold text-gray-800 ml-3 shrink-0">${e.amount?.toFixed(2)}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
