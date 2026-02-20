import { useState, useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';

const fmtFull$ = (n) => `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function toDate(v) {
  if (!v) return null;
  if (v.seconds) return new Date(v.seconds * 1000);
  const d = new Date(v);
  return isNaN(d) ? null : d;
}

const HEALTH_DEFS = [
  { key: 'active', label: 'Active', desc: 'Ordered in last 30 days', color: 'bg-green-500', textColor: 'text-green-600 dark:text-green-400', bg: 'bg-green-50 dark:bg-green-900/20', icon: '✅', days: 30, check: (d) => d <= 30 },
  { key: 'at-risk', label: 'At Risk', desc: 'No order in 30–60 days', color: 'bg-amber-500', textColor: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-900/20', icon: '⚠️', check: (d) => d > 30 && d <= 60 },
  { key: 'churned', label: 'Churned', desc: 'No order in 60+ days', color: 'bg-red-500', textColor: 'text-red-600 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-900/20', icon: '🚫', check: (d) => d > 60 },
  { key: 'new', label: 'New', desc: 'First order in last 30 days', color: 'bg-blue-500', textColor: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-900/20', icon: '🆕', check: () => false },
];

const DOW = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
const DOW_INDICES = [1, 2, 3, 4, 5]; // Monday–Friday
const SEGMENT_COLORS = ['#22c55e', '#6366f1', '#f59e0b', '#94a3b8'];
const SEGMENT_LABELS = { chef: 'Chef', retail: 'Retail', subscription: 'Subscriber', unknown: 'Other' };

export default function CustomerAnalytics({ shopifyOrders = [], shopifyCustomers = [], loading = false }) {
  const [expandedHealth, setExpandedHealth] = useState(null);
  const [ltvPage, setLtvPage] = useState(0);
  const [ltvSearch, setLtvSearch] = useState('');
  const PER_PAGE = 20;

  // ── Build customer aggregate map ──────────────────────────────────────────
  const now = new Date();
  const customers = useMemo(() => {
    const map = {};
    for (const o of shopifyOrders) {
      const date = toDate(o.createdAt || o.shopifyCreatedAt);
      if (!date || !(o.total > 0)) continue;
      const email = (o.customerEmail || '').toLowerCase();
      const key = email || o.customerName || o.id;
      if (!map[key]) {
        map[key] = {
          key,
          name: o.customerName || o.customerEmail || 'Unknown',
          restaurant: o.restaurant || '',
          segment: o.segment || 'unknown',
          orders: [],
          totalSpent: 0,
          firstOrder: date,
          lastOrder: date,
        };
      }
      map[key].orders.push({ date, total: o.total || 0, dayOfWeek: date.getDay() });
      map[key].totalSpent += o.total || 0;
      if (date < map[key].firstOrder) map[key].firstOrder = date;
      if (date > map[key].lastOrder) map[key].lastOrder = date;
    }
    return Object.values(map).map(c => {
      const daysSinceLast = Math.floor((now - c.lastOrder) / 86400000);
      const monthsActive = Math.max(1, Math.ceil((now - c.firstOrder) / (30 * 86400000)));
      const avgFreqDays = c.orders.length > 1
        ? Math.floor((c.lastOrder - c.firstOrder) / ((c.orders.length - 1) * 86400000))
        : null;
      return {
        ...c,
        daysSinceLast,
        monthsActive,
        avgFreqDays,
        avgMonthlySpend: c.totalSpent / monthsActive,
        ltvScore: c.totalSpent / monthsActive,
      };
    });
  }, [shopifyOrders]);

  // ── Health segmentation ───────────────────────────────────────────────────
  const healthGroups = useMemo(() => {
    const groups = { active: [], 'at-risk': [], churned: [], new: [] };
    for (const c of customers) {
      const isNew = c.orders.length === 1 && c.daysSinceLast <= 30 && (now - c.firstOrder) / 86400000 <= 30;
      if (isNew) { groups.new.push(c); continue; }
      if (c.daysSinceLast <= 30) groups.active.push(c);
      else if (c.daysSinceLast <= 60) groups['at-risk'].push(c);
      else groups.churned.push(c);
    }
    return groups;
  }, [customers]);

  // ── Segment revenue split ─────────────────────────────────────────────────
  const segmentData = useMemo(() => {
    const map = {};
    for (const c of customers) {
      const seg = c.segment || 'unknown';
      if (!map[seg]) map[seg] = { name: SEGMENT_LABELS[seg] || seg, value: 0 };
      map[seg].value += c.totalSpent;
    }
    return Object.values(map).sort((a, b) => b.value - a.value);
  }, [customers]);

  // ── Order Frequency bar chart (top 20) ────────────────────────────────────
  const freqData = useMemo(() =>
    [...customers]
      .sort((a, b) => b.orders.length - a.orders.length)
      .slice(0, 20)
      .map(c => ({
        name: (c.restaurant || c.name).slice(0, 14),
        orders: c.orders.length,
        fill: c.segment === 'chef' ? '#22c55e' : '#94a3b8',
      })),
    [customers]
  );

  // ── LTV table ─────────────────────────────────────────────────────────────
  const ltvList = useMemo(() => {
    let list = [...customers].sort((a, b) => b.ltvScore - a.ltvScore);
    if (ltvSearch) {
      const q = ltvSearch.toLowerCase();
      list = list.filter(c => c.name.toLowerCase().includes(q) || c.restaurant.toLowerCase().includes(q));
    }
    return list;
  }, [customers, ltvSearch]);
  const ltvPages = Math.ceil(ltvList.length / PER_PAGE);
  const pagedLtv = ltvList.slice(ltvPage * PER_PAGE, (ltvPage + 1) * PER_PAGE);

  // ── Ordering Patterns heatmap ─────────────────────────────────────────────
  const heatmapData = useMemo(() => {
    const top = [...customers].sort((a, b) => b.orders.length - a.orders.length).slice(0, 20);
    return top.map(c => {
      const dayCounts = {};
      for (const idx of DOW_INDICES) dayCounts[idx] = 0;
      for (const o of c.orders) if (DOW_INDICES.includes(o.dayOfWeek)) dayCounts[o.dayOfWeek]++;
      const max = Math.max(1, ...Object.values(dayCounts));
      return {
        name: (c.restaurant || c.name).slice(0, 16),
        days: DOW_INDICES.map(idx => ({ day: DOW[idx - 1], count: dayCounts[idx], intensity: dayCounts[idx] / max })),
      };
    });
  }, [customers]);

  // ── At-Risk Alerts ────────────────────────────────────────────────────────
  const atRiskAlerts = useMemo(() =>
    customers
      .filter(c => {
        if (!c.avgFreqDays || c.avgFreqDays <= 0) return false;
        return c.daysSinceLast > c.avgFreqDays * 1.5;
      })
      .sort((a, b) => b.daysSinceLast - a.daysSinceLast)
      .slice(0, 20),
    [customers]
  );

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto space-y-4">
        <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-48 animate-pulse" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-28 bg-gray-200 dark:bg-gray-700 rounded-2xl animate-pulse" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-5">
      <div>
        <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">Customer Analytics</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">{customers.length} customers tracked</p>
      </div>

      {/* ── 1. Health Scorecard ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {HEALTH_DEFS.map(h => {
          const list = healthGroups[h.key] || [];
          const isOpen = expandedHealth === h.key;
          return (
            <div key={h.key}>
              <button
                onClick={() => setExpandedHealth(isOpen ? null : h.key)}
                className={`w-full ${h.bg} rounded-2xl border border-gray-200 dark:border-gray-700 p-4 text-left cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98]`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-2xl">{h.icon}</span>
                  <span className={`text-2xl font-black ${h.textColor}`}>{list.length}</span>
                </div>
                <div className={`text-sm font-bold ${h.textColor}`}>{h.label}</div>
                <div className="text-[10px] text-gray-500 dark:text-gray-400">{h.desc}</div>
              </button>
              {isOpen && list.length > 0 && (
                <div className="mt-1 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 max-h-48 overflow-y-auto">
                  {list.slice(0, 15).map(c => (
                    <div key={c.key} className="flex items-center justify-between px-3 py-2 border-b border-gray-50 dark:border-gray-800 last:border-0 text-xs">
                      <span className="text-gray-700 dark:text-gray-200 truncate">{c.restaurant || c.name}</span>
                      <span className="text-gray-400 shrink-0 ml-2">{c.daysSinceLast}d ago</span>
                    </div>
                  ))}
                  {list.length > 15 && <div className="text-center text-xs text-gray-400 py-2">+{list.length - 15} more</div>}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── 2. Customer Segments ── */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4">
        <h3 className="text-base font-semibold text-gray-700 dark:text-gray-200 mb-3">Revenue by Customer Segment</h3>
        {segmentData.length === 0 ? (
          <div className="text-gray-400 text-sm py-8 text-center">No segment data</div>
        ) : (
          <div className="flex flex-col md:flex-row items-center gap-4">
            <ResponsiveContainer width="100%" height={220} className="max-w-[280px]">
              <PieChart>
                <Pie data={segmentData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={85} paddingAngle={3}>
                  {segmentData.map((_, i) => <Cell key={i} fill={SEGMENT_COLORS[i % SEGMENT_COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v) => fmtFull$(v)} contentStyle={{ borderRadius: 12, fontSize: 12 }} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex-1 space-y-2">
              {segmentData.map((s, i) => {
                const total = segmentData.reduce((sum, x) => sum + x.value, 0);
                const pct = total > 0 ? ((s.value / total) * 100).toFixed(1) : 0;
                return (
                  <div key={s.name} className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: SEGMENT_COLORS[i % SEGMENT_COLORS.length] }} />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-200 flex-1">{s.name}</span>
                    <span className="text-sm font-bold text-gray-800 dark:text-gray-100">{fmtFull$(s.value)}</span>
                    <span className="text-xs text-gray-400 w-12 text-right">{pct}%</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ── 3. Order Frequency ── */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4">
        <h3 className="text-base font-semibold text-gray-700 dark:text-gray-200 mb-3">Order Frequency — Top 20</h3>
        {freqData.length === 0 ? (
          <div className="text-gray-400 text-sm py-8 text-center">No order data</div>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={freqData} layout="vertical" margin={{ left: 80 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis type="number" tick={{ fontSize: 11 }} />
              <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={75} />
              <Tooltip contentStyle={{ borderRadius: 12, fontSize: 12 }} />
              <Bar dataKey="orders" radius={[0, 6, 6, 0]}>
                {freqData.map((d, i) => <Cell key={i} fill={d.fill} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* ── 4. LTV Table ── */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <h3 className="text-base font-semibold text-gray-700 dark:text-gray-200">Customer Lifetime Value</h3>
          <input
            type="text" placeholder="Search customers…" value={ltvSearch}
            onChange={e => { setLtvSearch(e.target.value); setLtvPage(0); }}
            className="bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 min-h-[44px] text-sm text-gray-700 dark:text-gray-200 w-48"
          />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700 text-left">
                <th className="py-2 px-2 font-semibold text-gray-500 dark:text-gray-400">Customer</th>
                <th className="py-2 px-2 font-semibold text-gray-500 dark:text-gray-400 hidden sm:table-cell">Type</th>
                <th className="py-2 px-2 font-semibold text-gray-500 dark:text-gray-400 hidden md:table-cell">First Order</th>
                <th className="py-2 px-2 font-semibold text-gray-500 dark:text-gray-400 text-right hidden md:table-cell">Months</th>
                <th className="py-2 px-2 font-semibold text-gray-500 dark:text-gray-400 text-right">Orders</th>
                <th className="py-2 px-2 font-semibold text-gray-500 dark:text-gray-400 text-right">Total Spent</th>
                <th className="py-2 px-2 font-semibold text-gray-500 dark:text-gray-400 text-right hidden sm:table-cell">Avg Monthly</th>
                <th className="py-2 px-2 font-semibold text-gray-500 dark:text-gray-400 text-right">LTV Score</th>
              </tr>
            </thead>
            <tbody>
              {pagedLtv.map(c => (
                <tr key={c.key} className="border-b border-gray-50 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                  <td className="py-2.5 px-2 font-medium text-gray-800 dark:text-gray-200 truncate max-w-[160px]">{c.restaurant || c.name}</td>
                  <td className="py-2.5 px-2 hidden sm:table-cell">
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                      c.segment === 'chef' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' :
                      c.segment === 'subscription' ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300' :
                      'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                    }`}>{SEGMENT_LABELS[c.segment] || c.segment}</span>
                  </td>
                  <td className="py-2.5 px-2 text-gray-400 text-xs hidden md:table-cell">
                    {c.firstOrder.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' })}
                  </td>
                  <td className="py-2.5 px-2 text-right text-gray-500 hidden md:table-cell">{c.monthsActive}</td>
                  <td className="py-2.5 px-2 text-right text-gray-700 dark:text-gray-300">{c.orders.length}</td>
                  <td className="py-2.5 px-2 text-right font-semibold text-green-600">{fmtFull$(c.totalSpent)}</td>
                  <td className="py-2.5 px-2 text-right text-gray-500 hidden sm:table-cell">{fmtFull$(c.avgMonthlySpend)}</td>
                  <td className="py-2.5 px-2 text-right font-bold text-gray-800 dark:text-gray-200">{fmtFull$(c.ltvScore)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {ltvPages > 1 && (
          <div className="flex items-center justify-center gap-3 mt-3">
            <button onClick={() => setLtvPage(p => Math.max(0, p - 1))} disabled={ltvPage === 0}
              className="px-3 py-2 min-h-[44px] rounded-lg text-xs font-semibold bg-gray-100 dark:bg-gray-700 disabled:opacity-40 cursor-pointer">←</button>
            <span className="text-xs text-gray-500">{ltvPage + 1} / {ltvPages}</span>
            <button onClick={() => setLtvPage(p => Math.min(ltvPages - 1, p + 1))} disabled={ltvPage >= ltvPages - 1}
              className="px-3 py-2 min-h-[44px] rounded-lg text-xs font-semibold bg-gray-100 dark:bg-gray-700 disabled:opacity-40 cursor-pointer">→</button>
          </div>
        )}
      </div>

      {/* ── 5. Ordering Patterns Heatmap ── */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4">
        <h3 className="text-base font-semibold text-gray-700 dark:text-gray-200 mb-3">Ordering Patterns — Top 20 Customers</h3>
        {heatmapData.length === 0 ? (
          <div className="text-gray-400 text-sm py-8 text-center">No pattern data</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="py-2 px-2 text-left font-semibold text-gray-500 dark:text-gray-400 w-36">Customer</th>
                  {DOW.map(d => <th key={d} className="py-2 px-2 text-center font-semibold text-gray-500 dark:text-gray-400 w-14">{d}</th>)}
                </tr>
              </thead>
              <tbody>
                {heatmapData.map(row => (
                  <tr key={row.name} className="border-b border-gray-50 dark:border-gray-800">
                    <td className="py-2 px-2 font-medium text-gray-700 dark:text-gray-200 truncate">{row.name}</td>
                    {row.days.map(d => (
                      <td key={d.day} className="py-2 px-2 text-center">
                        <div
                          className="w-8 h-8 mx-auto rounded-lg flex items-center justify-center text-[10px] font-bold"
                          style={{
                            backgroundColor: d.count > 0
                              ? `rgba(34, 197, 94, ${0.15 + d.intensity * 0.75})`
                              : 'transparent',
                            color: d.count > 0 ? '#166534' : '#d1d5db',
                          }}
                        >
                          {d.count > 0 ? d.count : '·'}
                        </div>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── 6. At-Risk Alerts ── */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4">
        <h3 className="text-base font-semibold text-gray-700 dark:text-gray-200 mb-3">⚠️ At-Risk Alerts</h3>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">Customers who missed their usual ordering interval (gap &gt; 1.5× normal frequency)</p>
        {atRiskAlerts.length === 0 ? (
          <div className="text-gray-400 text-sm py-8 text-center">No at-risk customers — everyone is ordering on schedule 🎉</div>
        ) : (
          <div className="space-y-2">
            {atRiskAlerts.map(c => (
              <div key={c.key} className="flex items-center gap-3 px-3 py-2.5 min-h-[44px] bg-amber-50 dark:bg-amber-900/10 rounded-xl border border-amber-200 dark:border-amber-800">
                <span className="text-lg">⚠️</span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-gray-800 dark:text-gray-200 truncate">{c.restaurant || c.name}</div>
                  <div className="text-[10px] text-gray-500 dark:text-gray-400">
                    Last order: {c.lastOrder.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} ({c.daysSinceLast}d ago) · Usually every {c.avgFreqDays}d
                  </div>
                </div>
                <button className="px-3 py-2 min-h-[44px] rounded-lg text-xs font-semibold bg-amber-500 text-white cursor-pointer hover:bg-amber-600 transition-colors shrink-0">
                  Send Reminder
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
