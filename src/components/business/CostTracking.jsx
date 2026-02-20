import { useState, useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Line, ComposedChart, Legend,
} from 'recharts';
import { COST_CATEGORIES } from '../../services/costService';

const fmtFull$ = (n) => `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmt$ = (n) => n >= 1000 ? `$${(n / 1000).toFixed(1)}k` : `$${n.toFixed(0)}`;
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function toDate(v) {
  if (!v) return null;
  if (v.seconds) return new Date(v.seconds * 1000);
  const d = new Date(v);
  return isNaN(d) ? null : d;
}

function monthKey(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}
function monthLabel(k) {
  const [y, m] = k.split('-');
  return `${MONTHS[parseInt(m) - 1]} ${y.slice(2)}`;
}

const catLabel = (id) => COST_CATEGORIES.find(c => c.id === id)?.label || id;
const isCogs = (id) => COST_CATEGORIES.find(c => c.id === id)?.cogs || false;

const COST_COLORS = {
  seeds: '#22c55e', 'growing-medium': '#16a34a', packaging: '#84cc16',
  labor: '#6366f1', utilities: '#f59e0b', delivery: '#06b6d4',
  equipment: '#8b5cf6', rent: '#ef4444', supplies: '#ec4899', other: '#94a3b8',
};

const btnCls = (active) =>
  `px-3 py-2 min-h-[44px] rounded-lg text-xs font-semibold cursor-pointer transition-all ${
    active ? 'bg-green-600 text-white' : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-green-300'
  }`;

export default function CostTracking({
  costs = [], shopifyOrders = [], cropProfiles = [],
  onAddCost, onEditCost, onRemoveCost,
  onEditCropProfile,
  loading = false,
}) {
  const [tab, setTab] = useState('overview');
  // Form state
  const [formCat, setFormCat] = useState('seeds');
  const [formAmount, setFormAmount] = useState('');
  const [formDate, setFormDate] = useState(new Date().toISOString().split('T')[0]);
  const [formDesc, setFormDesc] = useState('');
  const [formRecurring, setFormRecurring] = useState(false);
  const [formFreq, setFormFreq] = useState('monthly');
  // List filters
  const [filterCat, setFilterCat] = useState('all');
  const [filterRecurring, setFilterRecurring] = useState('all');
  const [sortField, setSortField] = useState('date');
  const [sortDir, setSortDir] = useState('desc');
  // P&L month selector
  const [plMonth, setPlMonth] = useState(monthKey(new Date()));
  // Edit state
  const [editingId, setEditingId] = useState(null);
  const [editAmount, setEditAmount] = useState('');
  const [editDesc, setEditDesc] = useState('');

  // ── Helpers ───────────────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formAmount || !onAddCost) return;
    await onAddCost({
      category: formCat,
      amount: parseFloat(formAmount),
      date: formDate,
      description: formDesc,
      recurring: formRecurring,
      frequency: formRecurring ? formFreq : null,
    });
    setFormAmount('');
    setFormDesc('');
    setFormRecurring(false);
  };

  // ── Filtered & sorted cost list ───────────────────────────────────────────
  const filteredCosts = useMemo(() => {
    let list = [...costs];
    if (filterCat !== 'all') list = list.filter(c => c.category === filterCat);
    if (filterRecurring === 'recurring') list = list.filter(c => c.recurring);
    if (filterRecurring === 'one-time') list = list.filter(c => !c.recurring);
    list.sort((a, b) => {
      const m = sortDir === 'desc' ? -1 : 1;
      if (sortField === 'date') return m * ((a.date || '').localeCompare(b.date || ''));
      if (sortField === 'amount') return m * ((a.amount || 0) - (b.amount || 0));
      return m * ((a.category || '').localeCompare(b.category || ''));
    });
    return list;
  }, [costs, filterCat, filterRecurring, sortField, sortDir]);

  const runningTotal = filteredCosts.reduce((s, c) => s + (c.amount || 0), 0);

  // ── P&L ───────────────────────────────────────────────────────────────────
  const pnl = useMemo(() => {
    // Revenue from delivered orders in selected month
    let revenue = 0;
    for (const o of shopifyOrders) {
      const d = toDate(o.createdAt || o.shopifyCreatedAt);
      if (!d || !(o.total > 0)) continue;
      if (monthKey(d) === plMonth) revenue += o.total;
    }
    // Costs in selected month
    const monthCosts = costs.filter(c => (c.date || '').startsWith(plMonth));
    const cogs = monthCosts.filter(c => isCogs(c.category)).reduce((s, c) => s + (c.amount || 0), 0);
    const opex = monthCosts.filter(c => !isCogs(c.category)).reduce((s, c) => s + (c.amount || 0), 0);
    const grossProfit = revenue - cogs;
    const grossMargin = revenue > 0 ? (grossProfit / revenue * 100) : 0;
    const netProfit = grossProfit - opex;
    const netMargin = revenue > 0 ? (netProfit / revenue * 100) : 0;
    return { revenue, cogs, grossProfit, grossMargin, opex, netProfit, netMargin };
  }, [shopifyOrders, costs, plMonth]);

  // ── Available months for P&L ──────────────────────────────────────────────
  const availableMonths = useMemo(() => {
    const set = new Set();
    for (const c of costs) if (c.date) set.add(c.date.slice(0, 7));
    for (const o of shopifyOrders) {
      const d = toDate(o.createdAt);
      if (d) set.add(monthKey(d));
    }
    return [...set].sort().reverse();
  }, [costs, shopifyOrders]);

  // ── Cost Trends — stacked bar + revenue line ──────────────────────────────
  const costTrends = useMemo(() => {
    const last6 = availableMonths.slice(0, 6).reverse();
    return last6.map(mk => {
      const row = { month: monthLabel(mk) };
      const monthCosts = costs.filter(c => (c.date || '').startsWith(mk));
      for (const cat of COST_CATEGORIES) {
        row[cat.id] = monthCosts.filter(c => c.category === cat.id).reduce((s, c) => s + (c.amount || 0), 0);
      }
      // Revenue
      let rev = 0;
      for (const o of shopifyOrders) {
        const d = toDate(o.createdAt || o.shopifyCreatedAt);
        if (d && monthKey(d) === mk) rev += o.total || 0;
      }
      row.revenue = rev;
      return row;
    });
  }, [availableMonths, costs, shopifyOrders]);

  // ── Per-Crop Cost Analysis ────────────────────────────────────────────────
  const [editingCrop, setEditingCrop] = useState(null);
  const [cropCostForm, setCropCostForm] = useState({});

  const saveCropCosts = async (profile) => {
    if (!onEditCropProfile) return;
    await onEditCropProfile(profile.id, {
      seedCostPerTray: parseFloat(cropCostForm.seedCostPerTray) || 0,
      mediumCostPerTray: parseFloat(cropCostForm.mediumCostPerTray) || 0,
      packagingCostPerUnit: parseFloat(cropCostForm.packagingCostPerUnit) || 0,
      laborMinutesPerTray: parseFloat(cropCostForm.laborMinutesPerTray) || 0,
    });
    setEditingCrop(null);
  };

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto space-y-4">
        <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-48 animate-pulse" />
        <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded-2xl animate-pulse" />
      </div>
    );
  }

  const TABS = [
    { key: 'overview', label: '📊 P&L' },
    { key: 'add', label: '+ Add Cost' },
    { key: 'list', label: '📋 Cost List' },
    { key: 'trends', label: '📈 Trends' },
    { key: 'per-crop', label: '🌱 Per Crop' },
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      <div>
        <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">Cost Tracking</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">{costs.length} cost entries</p>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-1.5">
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} className={btnCls(tab === t.key)}>{t.label}</button>
        ))}
      </div>

      {/* ── 1. Cost Entry Form ── */}
      {tab === 'add' && (
        <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 space-y-4">
          <h3 className="text-base font-semibold text-gray-700 dark:text-gray-200">Add Cost Entry</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">Category</label>
              <select value={formCat} onChange={e => setFormCat(e.target.value)}
                className="w-full px-3 py-2.5 min-h-[44px] rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-sm text-gray-800 dark:text-gray-200">
                {COST_CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">Amount ($)</label>
              <input type="number" step="0.01" min="0" value={formAmount} onChange={e => setFormAmount(e.target.value)} required placeholder="0.00"
                className="w-full px-3 py-2.5 min-h-[44px] rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-sm text-gray-800 dark:text-gray-200" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">Date</label>
              <input type="date" value={formDate} onChange={e => setFormDate(e.target.value)}
                className="w-full px-3 py-2.5 min-h-[44px] rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-sm text-gray-800 dark:text-gray-200" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">Description</label>
              <input type="text" value={formDesc} onChange={e => setFormDesc(e.target.value)} placeholder="Notes…"
                className="w-full px-3 py-2.5 min-h-[44px] rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-sm text-gray-800 dark:text-gray-200" />
            </div>
          </div>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={formRecurring} onChange={e => setFormRecurring(e.target.checked)}
                className="w-5 h-5 rounded border-gray-300 text-green-600 cursor-pointer" />
              <span className="text-sm text-gray-700 dark:text-gray-200">Recurring</span>
            </label>
            {formRecurring && (
              <select value={formFreq} onChange={e => setFormFreq(e.target.value)}
                className="px-3 py-2 min-h-[44px] rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-sm text-gray-800 dark:text-gray-200">
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            )}
          </div>
          <button type="submit"
            className="bg-green-600 text-white font-bold px-6 py-2.5 min-h-[44px] rounded-lg hover:bg-green-700 transition-colors cursor-pointer text-sm">
            Add Cost
          </button>
        </form>
      )}

      {/* ── 2. Cost List ── */}
      {tab === 'list' && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex flex-wrap gap-2 mb-3">
            <select value={filterCat} onChange={e => setFilterCat(e.target.value)}
              className="px-3 py-2 min-h-[44px] rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-xs text-gray-700 dark:text-gray-200">
              <option value="all">All Categories</option>
              {COST_CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
            <select value={filterRecurring} onChange={e => setFilterRecurring(e.target.value)}
              className="px-3 py-2 min-h-[44px] rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-xs text-gray-700 dark:text-gray-200">
              <option value="all">All Types</option>
              <option value="recurring">Recurring</option>
              <option value="one-time">One-Time</option>
            </select>
            <div className="flex gap-1">
              {[{ f: 'date', l: 'Date' }, { f: 'amount', l: 'Amount' }, { f: 'category', l: 'Category' }].map(s => (
                <button key={s.f} onClick={() => { setSortField(s.f); setSortDir(d => d === 'desc' ? 'asc' : 'desc'); }}
                  className={btnCls(sortField === s.f)}>
                  {s.l} {sortField === s.f ? (sortDir === 'desc' ? '↓' : '↑') : ''}
                </button>
              ))}
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700 text-left">
                  <th className="py-2 px-2 font-semibold text-gray-500 dark:text-gray-400">Date</th>
                  <th className="py-2 px-2 font-semibold text-gray-500 dark:text-gray-400">Category</th>
                  <th className="py-2 px-2 font-semibold text-gray-500 dark:text-gray-400 hidden sm:table-cell">Description</th>
                  <th className="py-2 px-2 font-semibold text-gray-500 dark:text-gray-400 text-right">Amount</th>
                  <th className="py-2 px-2 font-semibold text-gray-500 dark:text-gray-400 text-center w-24">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredCosts.map(c => (
                  <tr key={c.id} className="border-b border-gray-50 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                    <td className="py-2.5 px-2 text-gray-700 dark:text-gray-300 text-xs">{c.date}</td>
                    <td className="py-2.5 px-2">
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                        {catLabel(c.category)}
                      </span>
                      {c.recurring && <span className="ml-1 text-[10px] text-purple-600">🔄 {c.frequency}</span>}
                    </td>
                    <td className="py-2.5 px-2 text-gray-500 dark:text-gray-400 text-xs hidden sm:table-cell truncate max-w-[200px]">
                      {editingId === c.id ? (
                        <input value={editDesc} onChange={e => setEditDesc(e.target.value)}
                          className="w-full px-2 py-1 rounded border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-xs" />
                      ) : (c.description || '—')}
                    </td>
                    <td className="py-2.5 px-2 text-right font-semibold text-red-500">
                      {editingId === c.id ? (
                        <input type="number" step="0.01" value={editAmount} onChange={e => setEditAmount(e.target.value)}
                          className="w-20 px-2 py-1 rounded border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-xs text-right" />
                      ) : fmtFull$(c.amount || 0)}
                    </td>
                    <td className="py-2.5 px-2 text-center">
                      {editingId === c.id ? (
                        <div className="flex gap-1 justify-center">
                          <button onClick={async () => {
                            await onEditCost(c.id, { amount: parseFloat(editAmount) || c.amount, description: editDesc });
                            setEditingId(null);
                          }} className="text-[10px] text-green-600 font-bold cursor-pointer">Save</button>
                          <button onClick={() => setEditingId(null)} className="text-[10px] text-gray-400 cursor-pointer">Cancel</button>
                        </div>
                      ) : (
                        <div className="flex gap-1 justify-center">
                          <button onClick={() => { setEditingId(c.id); setEditAmount(String(c.amount || 0)); setEditDesc(c.description || ''); }}
                            className="text-[10px] text-sky-600 font-bold cursor-pointer">Edit</button>
                          <button onClick={() => onRemoveCost(c.id)}
                            className="text-[10px] text-red-500 font-bold cursor-pointer">Del</button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-3 text-right text-sm font-bold text-gray-700 dark:text-gray-200">
            Running Total: <span className="text-red-500">{fmtFull$(runningTotal)}</span>
          </div>
        </div>
      )}

      {/* ── 3. Monthly P&L ── */}
      {tab === 'overview' && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h3 className="text-base font-semibold text-gray-700 dark:text-gray-200">Monthly P&L</h3>
            <select value={plMonth} onChange={e => setPlMonth(e.target.value)}
              className="px-3 py-2 min-h-[44px] rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-sm text-gray-700 dark:text-gray-200">
              {availableMonths.map(m => <option key={m} value={m}>{monthLabel(m)}</option>)}
              {availableMonths.length === 0 && <option value={plMonth}>{monthLabel(plMonth)}</option>}
            </select>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-3 text-center">
              <p className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase">Revenue</p>
              <p className="text-lg font-bold text-green-600">{fmtFull$(pnl.revenue)}</p>
            </div>
            <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl p-3 text-center">
              <p className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase">COGS</p>
              <p className="text-lg font-bold text-amber-600">{fmtFull$(pnl.cogs)}</p>
            </div>
            <div className={`rounded-xl p-3 text-center ${pnl.grossProfit >= 0 ? 'bg-green-50 dark:bg-green-900/20' : 'bg-red-50 dark:bg-red-900/20'}`}>
              <p className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase">Gross Profit</p>
              <p className={`text-lg font-bold ${pnl.grossProfit >= 0 ? 'text-green-600' : 'text-red-500'}`}>{fmtFull$(pnl.grossProfit)}</p>
              <p className="text-[10px] text-gray-400">{pnl.grossMargin.toFixed(1)}% margin</p>
            </div>
            <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-xl p-3 text-center">
              <p className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase">Op. Expenses</p>
              <p className="text-lg font-bold text-indigo-600">{fmtFull$(pnl.opex)}</p>
            </div>
          </div>

          <div className={`rounded-2xl border-2 p-4 text-center ${pnl.netProfit >= 0 ? 'border-green-300 dark:border-green-700 bg-green-50 dark:bg-green-900/20' : 'border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-900/20'}`}>
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-1">Net Profit</p>
            <p className={`text-2xl font-black ${pnl.netProfit >= 0 ? 'text-green-600' : 'text-red-500'}`}>{fmtFull$(pnl.netProfit)}</p>
            <p className="text-xs text-gray-400 mt-0.5">{pnl.netMargin.toFixed(1)}% net margin</p>
          </div>
        </div>
      )}

      {/* ── 4. Cost Trends ── */}
      {tab === 'trends' && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4">
          <h3 className="text-base font-semibold text-gray-700 dark:text-gray-200 mb-3">Cost Trends — Last 6 Months</h3>
          {costTrends.length === 0 ? (
            <div className="text-gray-400 text-sm py-12 text-center">Add costs to see trends</div>
          ) : (
            <ResponsiveContainer width="100%" height={320}>
              <ComposedChart data={costTrends}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tickFormatter={fmt$} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v) => fmtFull$(v)} contentStyle={{ borderRadius: 12, fontSize: 12 }} />
                <Legend />
                {COST_CATEGORIES.map(cat => (
                  <Bar key={cat.id} dataKey={cat.id} stackId="costs" fill={COST_COLORS[cat.id] || '#94a3b8'} name={cat.label} />
                ))}
                <Line type="monotone" dataKey="revenue" stroke="#22c55e" strokeWidth={3} dot={{ r: 4 }} name="Revenue" />
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </div>
      )}

      {/* ── 5. Per-Crop Cost Analysis ── */}
      {tab === 'per-crop' && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4">
          <h3 className="text-base font-semibold text-gray-700 dark:text-gray-200 mb-3">Per-Crop Cost Analysis</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">Assign costs to crop profiles to calculate margins</p>
          {cropProfiles.length === 0 ? (
            <div className="text-gray-400 text-sm py-8 text-center">No crop profiles — create them in Crop Profiles first</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700 text-left">
                    <th className="py-2 px-2 font-semibold text-gray-500 dark:text-gray-400">Crop</th>
                    <th className="py-2 px-2 font-semibold text-gray-500 dark:text-gray-400 text-right">Seed/Tray</th>
                    <th className="py-2 px-2 font-semibold text-gray-500 dark:text-gray-400 text-right">Medium/Tray</th>
                    <th className="py-2 px-2 font-semibold text-gray-500 dark:text-gray-400 text-right hidden sm:table-cell">Pkg/Unit</th>
                    <th className="py-2 px-2 font-semibold text-gray-500 dark:text-gray-400 text-right hidden sm:table-cell">Labor min</th>
                    <th className="py-2 px-2 font-semibold text-gray-500 dark:text-gray-400 text-right">Cost/Tray</th>
                    <th className="py-2 px-2 font-semibold text-gray-500 dark:text-gray-400 text-center w-16">Edit</th>
                  </tr>
                </thead>
                <tbody>
                  {cropProfiles.map(cp => {
                    const seed = cp.seedCostPerTray || 0;
                    const medium = cp.mediumCostPerTray || 0;
                    const pkg = cp.packagingCostPerUnit || 0;
                    const labor = cp.laborMinutesPerTray || 0;
                    const totalPerTray = seed + medium + pkg;
                    const isEditing = editingCrop === cp.id;
                    return (
                      <tr key={cp.id} className="border-b border-gray-50 dark:border-gray-800">
                        <td className="py-2.5 px-2 font-medium text-gray-800 dark:text-gray-200">{cp.name}</td>
                        {isEditing ? (
                          <>
                            <td className="py-2.5 px-2 text-right"><input type="number" step="0.01" value={cropCostForm.seedCostPerTray ?? ''} onChange={e => setCropCostForm(f => ({ ...f, seedCostPerTray: e.target.value }))} className="w-16 px-1 py-1 rounded border text-xs text-right bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600" /></td>
                            <td className="py-2.5 px-2 text-right"><input type="number" step="0.01" value={cropCostForm.mediumCostPerTray ?? ''} onChange={e => setCropCostForm(f => ({ ...f, mediumCostPerTray: e.target.value }))} className="w-16 px-1 py-1 rounded border text-xs text-right bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600" /></td>
                            <td className="py-2.5 px-2 text-right hidden sm:table-cell"><input type="number" step="0.01" value={cropCostForm.packagingCostPerUnit ?? ''} onChange={e => setCropCostForm(f => ({ ...f, packagingCostPerUnit: e.target.value }))} className="w-16 px-1 py-1 rounded border text-xs text-right bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600" /></td>
                            <td className="py-2.5 px-2 text-right hidden sm:table-cell"><input type="number" step="1" value={cropCostForm.laborMinutesPerTray ?? ''} onChange={e => setCropCostForm(f => ({ ...f, laborMinutesPerTray: e.target.value }))} className="w-16 px-1 py-1 rounded border text-xs text-right bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600" /></td>
                            <td className="py-2.5 px-2 text-right text-gray-400">—</td>
                            <td className="py-2.5 px-2 text-center">
                              <button onClick={() => saveCropCosts(cp)} className="text-[10px] text-green-600 font-bold cursor-pointer mr-1">Save</button>
                              <button onClick={() => setEditingCrop(null)} className="text-[10px] text-gray-400 cursor-pointer">✕</button>
                            </td>
                          </>
                        ) : (
                          <>
                            <td className="py-2.5 px-2 text-right text-gray-600 dark:text-gray-300">{seed > 0 ? fmtFull$(seed) : '—'}</td>
                            <td className="py-2.5 px-2 text-right text-gray-600 dark:text-gray-300">{medium > 0 ? fmtFull$(medium) : '—'}</td>
                            <td className="py-2.5 px-2 text-right text-gray-600 dark:text-gray-300 hidden sm:table-cell">{pkg > 0 ? fmtFull$(pkg) : '—'}</td>
                            <td className="py-2.5 px-2 text-right text-gray-600 dark:text-gray-300 hidden sm:table-cell">{labor > 0 ? `${labor}m` : '—'}</td>
                            <td className="py-2.5 px-2 text-right font-semibold text-gray-800 dark:text-gray-200">{totalPerTray > 0 ? fmtFull$(totalPerTray) : '—'}</td>
                            <td className="py-2.5 px-2 text-center">
                              <button onClick={() => {
                                setEditingCrop(cp.id);
                                setCropCostForm({
                                  seedCostPerTray: cp.seedCostPerTray || '',
                                  mediumCostPerTray: cp.mediumCostPerTray || '',
                                  packagingCostPerUnit: cp.packagingCostPerUnit || '',
                                  laborMinutesPerTray: cp.laborMinutesPerTray || '',
                                });
                              }} className="text-[10px] text-sky-600 font-bold cursor-pointer">Edit</button>
                            </td>
                          </>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
