import { useState } from 'react';
import { EXPENSE_CATEGORIES } from '../hooks/useBudget';
import { Button } from './ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/Card';
import { Input } from './ui/Input';
import { Label } from './ui/Label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/Select';

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
      <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-4">Log Expense</h3>

      <Card>
        <CardContent className="space-y-4">
        {/* Category + Amount */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs">Category</Label>
            <Select value={form.category} onValueChange={(val) => set('category', val)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {EXPENSE_CATEGORIES.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Amount ($)</Label>
            <Input
              type="number" min="0" step="0.01" placeholder="0.00"
              value={form.amount}
              onChange={(e) => set('amount', e.target.value)}
            />
          </div>
        </div>

        {/* Description */}
        <div>
          <Label className="text-xs">Description</Label>
          <Input
            placeholder="What was this expense?"
            value={form.description}
            onChange={(e) => set('description', e.target.value)}
          />
        </div>

        {/* Date + Recurring */}
        <div className="flex items-end gap-3 flex-wrap">
          <div className="flex-1 min-w-[120px]">
            <Label className="text-xs">Date</Label>
            <Input
              type="date" value={form.date}
              onChange={(e) => set('date', e.target.value)}
            />
          </div>
          <label className="flex items-center gap-2 pb-2.5 cursor-pointer">
            <input
              type="checkbox" checked={form.recurring}
              onChange={(e) => set('recurring', e.target.checked)}
              className="w-4 h-4 accent-green-600"
            />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-200">Recurring</span>
          </label>
          {form.recurring && (
            <Select value={form.interval} onValueChange={(val) => set('interval', val)}>
              <SelectTrigger className="w-auto"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
                <SelectItem value="yearly">Yearly</SelectItem>
              </SelectContent>
            </Select>
          )}
        </div>

        {/* Submit */}
        <Button
          onClick={handleSubmit}
          disabled={saving || !form.amount || !form.description.trim()}
          className="w-full"
        >
          {success ? '✓ Logged!' : saving ? 'Saving…' : 'Log Expense'}
        </Button>
        </CardContent>
      </Card>

      {/* Recent entries */}
      {recent.length > 0 && (
        <div className="mt-5">
          <h4 className="text-sm font-semibold text-gray-600 dark:text-gray-300 mb-2">Recent</h4>
          <Card>
            {recent.map((e) => (
              <div key={e.id} className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-700 last:border-0">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-gray-800 dark:text-gray-100 truncate">{e.description}</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500">
                    {catLabel(e.category)} · {e.date}
                    {e.recurring && <span className="ml-1 text-purple-500">↻ {e.interval}</span>}
                  </p>
                </div>
                <p className="font-bold text-gray-800 dark:text-gray-100 ml-3 shrink-0">${e.amount?.toFixed(2)}</p>
              </div>
            ))}
          </Card>
        </div>
      )}
    </div>
  );
}
