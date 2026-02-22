import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Cell,
} from 'recharts';
import { Button } from '../ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { Input } from '../ui/Input';

import { toDate } from '../../utils/dateUtils';

// ── Date helpers ───────────────────────────────────────────────────────────────
const fmt$ = (n) => n >= 1000 ? `$${(n / 1000).toFixed(1)}k` : `$${n.toFixed(0)}`;
const fmtFull$ = (n) => `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function startOfWeek(d) {
  const r = new Date(d); r.setHours(0, 0, 0, 0);
  r.setDate(r.getDate() - r.getDay());
  return r;
}

function startOfMonth(d) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function toKey(d, mode) {
  if (mode === 'daily') return d.toISOString().split('T')[0];
  if (mode === 'weekly') {
    const w = startOfWeek(d);
    return `W${w.toISOString().split('T')[0]}`;
  }
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function toLabel(key, mode) {
  if (mode === 'daily') {
    const d = new Date(key + 'T00:00:00');
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }
  if (mode === 'weekly') return key.replace('W', 'Week ').slice(0, 12);
  const [y, m] = key.split('-');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[parseInt(m) - 1]} ${y.slice(2)}`;
}
const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// ── Quick Select date ranges ──────────────────────────────────────────────────
function getQuickRange(key) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  switch (key) {
    case 'week': {
      const s = startOfWeek(today);
      return [s, today];
    }
    case 'month':
      return [new Date(now.getFullYear(), now.getMonth(), 1), today];
    case 'last-month': {
      const s = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const e = new Date(now.getFullYear(), now.getMonth(), 0);
      return [s, e];
    }
    case 'quarter': {
      const q = Math.floor(now.getMonth() / 3) * 3;
      return [new Date(now.getFullYear(), q, 1), today];
    }
    case 'year':
      return [new Date(now.getFullYear(), 0, 1), today];
    case 'all':
    default:
      return [null, null];
  }
}

function getPreviousPeriod(start, end) {
  if (!start || !end) return [null, null];
  const diff = end - start;
  return [new Date(start - diff), new Date(start - 1)];
}

const QUICK_OPTS = [
  { key: 'week', label: 'This Week' },
  { key: 'month', label: 'This Month' },
  { key: 'last-month', label: 'Last Month' },
  { key: 'quarter', label: 'This Quarter' },
  { key: 'year', label: 'This Year' },
  { key: 'all', label: 'All Time' },
];

const CHART_MODES = [
  { key: 'daily', label: 'Daily' },
  { key: 'weekly', label: 'Weekly' },
  { key: 'monthly', label: 'Monthly' },
];

// ── COMPONENT ─────────────────────────────────────────────────────────────────
export default function RevenueDashboard({ shopifyOrders = [], loading = false }) {
  const navigate = useNavigate();
  const [quickRange, setQuickRange] = useState('month');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [chartMode, setChartMode] = useState('monthly');
  const [customerPage, setCustomerPage] = useState(0);
  const PER_PAGE = 20;

  // ── Parse all orders with revenue ─────────────────────────────────────────
  const allRevOrders = useMemo(() =>
    shopifyOrders
      .filter(o => (o.total || 0) > 0)
      .map(o => ({ ...o, _date: toDate(o.createdAt || o.shopifyCreatedAt) }))
      .filter(o => o._date),
    [shopifyOrders]
  );

  // ── Determine date range ──────────────────────────────────────────────────
  const [rangeStart, rangeEnd] = useMemo(() => {
    if (customStart && customEnd) {
      return [new Date(customStart + 'T00:00:00'), new Date(customEnd + 'T23:59:59')];
    }
    return getQuickRange(quickRange);
  }, [quickRange, customStart, customEnd]);

  // ── Filter orders by range ────────────────────────────────────────────────
  const filtered = useMemo(() => {
    if (!rangeStart) return allRevOrders;
    return allRevOrders.filter(o => o._date >= rangeStart && o._date <= rangeEnd);
  }, [allRevOrders, rangeStart, rangeEnd]);

  const prevFiltered = useMemo(() => {
    const [ps, pe] = getPreviousPeriod(rangeStart, rangeEnd);
    if (!ps) return [];
    return allRevOrders.filter(o => o._date >= ps && o._date <= pe);
  }, [allRevOrders, rangeStart, rangeEnd]);

  // ── KPI calculations ─────────────────────────────────────────────────────
  const totalRevenue = filtered.reduce((s, o) => s + (o.total || 0), 0);
  const totalOrders = filtered.length;
  const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
  const uniqueCustomers = new Set(filtered.map(o =>
    (o.customerEmail || o.customerName || o.id).toLowerCase()
  )).size;

  const prevRevenue = prevFiltered.reduce((s, o) => s + (o.total || 0), 0);
  const prevOrders = prevFiltered.length;
  const prevAOV = prevOrders > 0 ? prevRevenue / prevOrders : 0;
  const prevUnique = new Set(prevFiltered.map(o =>
    (o.customerEmail || o.customerName || o.id).toLowerCase()
  )).size;

  const pctChange = (curr, prev) => prev > 0 ? ((curr - prev) / prev * 100) : (curr > 0 ? 100 : 0);

  const kpis = [
    { label: 'Total Revenue', value: fmtFull$(totalRevenue), change: pctChange(totalRevenue, prevRevenue), icon: '💰' },
    { label: 'Total Orders', value: totalOrders.toLocaleString(), change: pctChange(totalOrders, prevOrders), icon: '📦' },
    { label: 'Avg Order Value', value: fmtFull$(avgOrderValue), change: pctChange(avgOrderValue, prevAOV), icon: '📊' },
    { label: 'Unique Customers', value: uniqueCustomers.toLocaleString(), change: pctChange(uniqueCustomers, prevUnique), icon: '👤' },
  ];

  // ── Revenue Over Time ─────────────────────────────────────────────────────
  const revenueOverTime = useMemo(() => {
    const map = {};
    for (const o of filtered) {
      const k = toKey(o._date, chartMode);
      if (!map[k]) map[k] = { key: k, revenue: 0, orders: 0 };
      map[k].revenue += o.total || 0;
      map[k].orders += 1;
    }
    return Object.values(map)
      .sort((a, b) => a.key.localeCompare(b.key))
      .map(d => ({ ...d, label: toLabel(d.key, chartMode) }));
  }, [filtered, chartMode]);

  // ── Revenue by Day of Week ────────────────────────────────────────────────
  const revenueByDow = useMemo(() => {
    const arr = DOW.map((d, i) => ({ day: d, dayIndex: i, revenue: 0, orders: 0 }));
    for (const o of filtered) {
      const idx = o._date.getDay();
      arr[idx].revenue += o.total || 0;
      arr[idx].orders += 1;
    }
    return arr;
  }, [filtered]);

  // ── Top Customers ─────────────────────────────────────────────────────────
  const topCustomers = useMemo(() => {
    const map = {};
    for (const o of filtered) {
      const email = (o.customerEmail || '').toLowerCase();
      const key = email || o.customerName || o.id;
      if (!map[key]) {
        map[key] = {
          key,
          name: o.customerName || o.customerEmail || 'Unknown',
          restaurant: o.restaurant || '',
          totalOrders: 0,
          totalSpent: 0,
          lastOrderDate: null,
        };
      }
      map[key].totalOrders += 1;
      map[key].totalSpent += o.total || 0;
      const od = o._date;
      if (!map[key].lastOrderDate || od > map[key].lastOrderDate) map[key].lastOrderDate = od;
    }
    return Object.values(map)
      .map(c => ({ ...c, avgOrderValue: c.totalOrders > 0 ? c.totalSpent / c.totalOrders : 0 }))
      .sort((a, b) => b.totalSpent - a.totalSpent);
  }, [filtered]);

  const customerPages = Math.ceil(topCustomers.length / PER_PAGE);
  const pagedCustomers = topCustomers.slice(customerPage * PER_PAGE, (customerPage + 1) * PER_PAGE);

  // ── Top Products ──────────────────────────────────────────────────────────
  const topProducts = useMemo(() => {
    const map = {};
    let orderCount = 0;
    for (const o of filtered) {
      orderCount++;
      const items = o.lineItems || o.items || [];
      for (const it of items) {
        const name = it.name || it.title || 'Unknown';
        if (!map[name]) map[name] = { name, unitsSold: 0, totalRevenue: 0, ordersWithProduct: 0 };
        map[name].unitsSold += it.quantity || 1;
        map[name].totalRevenue += (it.lineTotal || ((it.price || 0) * (it.quantity || 1)));
        map[name].ordersWithProduct += 1;
      }
    }
    const total = Object.values(map).reduce((s, p) => s + p.totalRevenue, 0);
    return Object.values(map)
      .map(p => ({
        ...p,
        avgQtyPerOrder: p.ordersWithProduct > 0 ? (p.unitsSold / p.ordersWithProduct).toFixed(1) : '0',
        pctOfTotal: total > 0 ? ((p.totalRevenue / total) * 100).toFixed(1) : '0',
      }))
      .sort((a, b) => b.totalRevenue - a.totalRevenue)
      .slice(0, 20);
  }, [filtered]);

  // ── Loading state ─────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="max-w-6xl mx-auto space-y-4">
        <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-48 animate-pulse" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-28 bg-gray-200 dark:bg-gray-700 rounded-2xl animate-pulse" />)}
        </div>
        <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded-2xl animate-pulse" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-5">
      {/* ── Header ── */}
      <div>
        <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">Revenue Dashboard</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {allRevOrders.length.toLocaleString()} orders with revenue
        </p>
      </div>

      {/* ── Date Range Picker ── */}
      <Card>
        <CardContent>
          <div className="flex flex-wrap gap-1.5 mb-3">
            {QUICK_OPTS.map(o => (
              <Button key={o.key} variant={quickRange === o.key && !customStart ? 'default' : 'outline'} size="sm" onClick={() => { setQuickRange(o.key); setCustomStart(''); setCustomEnd(''); }}>
                {o.label}
              </Button>
            ))}
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-gray-500 dark:text-gray-400">Custom:</span>
            <Input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)} className="w-auto" />
            <span className="text-gray-400">→</span>
            <Input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)} className="w-auto" />
          </div>
        </CardContent>
      </Card>

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {kpis.map(k => (
          <Card key={k.label}>
            <CardContent>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">{k.label}</span>
              <span className="text-lg">{k.icon}</span>
            </div>
            <div className="text-xl font-bold text-gray-800 dark:text-gray-100">{k.value}</div>
            {rangeStart && (
              <div className={`text-xs font-semibold mt-1 ${k.change >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                {k.change >= 0 ? '▲' : '▼'} {Math.abs(k.change).toFixed(1)}% vs prev period
              </div>
            )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── Revenue Over Time ── */}
      <Card>
        <CardContent>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-base font-semibold text-gray-700 dark:text-gray-200">Revenue Over Time</h3>
            <div className="flex gap-1">
              {CHART_MODES.map(m => (
                <Button key={m.key} variant={chartMode === m.key ? 'default' : 'outline'} size="sm" onClick={() => setChartMode(m.key)}>
                  {m.label}
                </Button>
              ))}
            </div>
          </div>
        {revenueOverTime.length === 0 ? (
          <div className="text-gray-400 dark:text-gray-500 text-sm py-12 text-center">No data for selected range</div>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={revenueOverTime}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis tickFormatter={fmt$} tick={{ fontSize: 11 }} />
              <Tooltip
                formatter={(v) => [fmtFull$(v), 'Revenue']}
                labelFormatter={(l, payload) => {
                  const d = payload?.[0]?.payload;
                  return d ? `${l} — ${d.orders} orders` : l;
                }}
                contentStyle={{ borderRadius: 12, fontSize: 12 }}
              />
              <Bar dataKey="revenue" radius={[6, 6, 0, 0]}>
                {revenueOverTime.map((_, i) => (
                  <Cell key={i} fill={i % 2 === 0 ? '#22c55e' : '#16a34a'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
        </CardContent>
      </Card>

      {/* ── Revenue by Day of Week ── */}
      <Card>
        <CardHeader><CardTitle>Revenue by Day of Week</CardTitle></CardHeader>
        <CardContent>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={revenueByDow}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="day" tick={{ fontSize: 11 }} />
            <YAxis tickFormatter={fmt$} tick={{ fontSize: 11 }} />
            <Tooltip formatter={(v) => [fmtFull$(v), 'Revenue']} contentStyle={{ borderRadius: 12, fontSize: 12 }} />
            <Bar dataKey="revenue" radius={[6, 6, 0, 0]} fill="#6366f1" />
          </BarChart>
        </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* ── Top Customers ── */}
      <Card>
        <CardHeader><CardTitle>Top Customers</CardTitle></CardHeader>
        <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700 text-left">
                <th className="py-2 px-2 font-semibold text-gray-500 dark:text-gray-400 w-10">#</th>
                <th className="py-2 px-2 font-semibold text-gray-500 dark:text-gray-400">Customer</th>
                <th className="py-2 px-2 font-semibold text-gray-500 dark:text-gray-400 hidden sm:table-cell">Restaurant</th>
                <th className="py-2 px-2 font-semibold text-gray-500 dark:text-gray-400 text-right">Orders</th>
                <th className="py-2 px-2 font-semibold text-gray-500 dark:text-gray-400 text-right">Total Spent</th>
                <th className="py-2 px-2 font-semibold text-gray-500 dark:text-gray-400 text-right hidden md:table-cell">Avg Order</th>
                <th className="py-2 px-2 font-semibold text-gray-500 dark:text-gray-400 text-right hidden lg:table-cell">Last Order</th>
              </tr>
            </thead>
            <tbody>
              {pagedCustomers.map((c, i) => {
                const rank = customerPage * PER_PAGE + i + 1;
                const isTop10 = rank <= 10;
                return (
                  <tr
                    key={c.key}
                    className={`border-b border-gray-50 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700/30 cursor-pointer transition-colors ${
                      isTop10 ? 'bg-green-50/50 dark:bg-green-900/10' : ''
                    }`}
                    onClick={() => navigate('/customers')}
                  >
                    <td className="py-2.5 px-2 font-bold text-gray-400">{rank}</td>
                    <td className="py-2.5 px-2 font-medium text-gray-800 dark:text-gray-200 truncate max-w-[160px]">{c.name}</td>
                    <td className="py-2.5 px-2 text-gray-500 dark:text-gray-400 truncate max-w-[120px] hidden sm:table-cell">{c.restaurant || '—'}</td>
                    <td className="py-2.5 px-2 text-right text-gray-700 dark:text-gray-300">{c.totalOrders}</td>
                    <td className="py-2.5 px-2 text-right font-semibold text-green-600">{fmtFull$(c.totalSpent)}</td>
                    <td className="py-2.5 px-2 text-right text-gray-500 dark:text-gray-400 hidden md:table-cell">{fmtFull$(c.avgOrderValue)}</td>
                    <td className="py-2.5 px-2 text-right text-gray-400 text-xs hidden lg:table-cell">
                      {c.lastOrderDate ? c.lastOrderDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {customerPages > 1 && (
          <div className="flex items-center justify-center gap-3 mt-3">
            <Button variant="outline" size="sm" onClick={() => setCustomerPage(p => Math.max(0, p - 1))} disabled={customerPage === 0}>←</Button>
            <span className="text-xs text-gray-500">{customerPage + 1} / {customerPages}</span>
            <Button variant="outline" size="sm" onClick={() => setCustomerPage(p => Math.min(customerPages - 1, p + 1))} disabled={customerPage >= customerPages - 1}>→</Button>
          </div>
        )}
        </CardContent>
      </Card>

      {/* ── Top Products ── */}
      <Card>
        <CardHeader><CardTitle>Top Products</CardTitle></CardHeader>
        <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700 text-left">
                <th className="py-2 px-2 font-semibold text-gray-500 dark:text-gray-400">Product</th>
                <th className="py-2 px-2 font-semibold text-gray-500 dark:text-gray-400 text-right">Units Sold</th>
                <th className="py-2 px-2 font-semibold text-gray-500 dark:text-gray-400 text-right">Revenue</th>
                <th className="py-2 px-2 font-semibold text-gray-500 dark:text-gray-400 text-right hidden sm:table-cell">Avg Qty/Order</th>
                <th className="py-2 px-2 font-semibold text-gray-500 dark:text-gray-400 text-right hidden sm:table-cell">% of Total</th>
              </tr>
            </thead>
            <tbody>
              {topProducts.map((p, i) => (
                <tr key={p.name} className="border-b border-gray-50 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                  <td className="py-2.5 px-2 font-medium text-gray-800 dark:text-gray-200 truncate max-w-[200px]">
                    {i < 3 && <span className="mr-1">{['🥇', '🥈', '🥉'][i]}</span>}
                    {p.name}
                  </td>
                  <td className="py-2.5 px-2 text-right text-gray-700 dark:text-gray-300">{p.unitsSold.toLocaleString()}</td>
                  <td className="py-2.5 px-2 text-right font-semibold text-green-600">{fmtFull$(p.totalRevenue)}</td>
                  <td className="py-2.5 px-2 text-right text-gray-500 dark:text-gray-400 hidden sm:table-cell">{p.avgQtyPerOrder}</td>
                  <td className="py-2.5 px-2 text-right text-gray-500 dark:text-gray-400 hidden sm:table-cell">{p.pctOfTotal}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        </CardContent>
      </Card>
    </div>
  );
}
