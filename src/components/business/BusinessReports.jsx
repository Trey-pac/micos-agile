import { useState, useMemo, useCallback } from 'react';
import { COST_CATEGORIES } from '../../services/costService';

const fmtFull$ = (n) => `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
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
function startOfWeek() {
  const d = new Date(); d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - d.getDay());
  return d;
}

const catLabel = (id) => COST_CATEGORIES.find(c => c.id === id)?.label || id;
const isCogs = (id) => COST_CATEGORIES.find(c => c.id === id)?.cogs || false;

const REPORT_TEMPLATES = [
  { key: 'weekly-sales', label: 'Weekly Sales Summary', icon: '📊', desc: 'Orders, revenue, top products & customers this week' },
  { key: 'monthly-customer', label: 'Monthly Customer Report', icon: '👥', desc: 'Customer health, revenue by customer, new acquisitions' },
  { key: 'product-performance', label: 'Product Performance', icon: '📦', desc: 'Units sold, revenue, trends, best & worst performers' },
  { key: 'pnl', label: 'Profit & Loss Report', icon: '💰', desc: 'Full monthly P&L with revenue and cost breakdowns' },
];

const btnCls = (active) =>
  `px-3 py-2 min-h-[44px] rounded-lg text-xs font-semibold cursor-pointer transition-all ${
    active ? 'bg-green-600 text-white' : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-green-300'
  }`;

// ── CSV Export utility ──────────────────────────────────────────────────────
function downloadCSV(filename, headers, rows) {
  const escape = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const lines = [headers.map(escape).join(',')];
  for (const row of rows) lines.push(row.map(escape).join(','));
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

export default function BusinessReports({
  shopifyOrders = [], shopifyCustomers = [], costs = [],
  reports = [], saveReport, user,
  loading = false,
}) {
  const [activeReport, setActiveReport] = useState(null);
  const [reportStart, setReportStart] = useState('');
  const [reportEnd, setReportEnd] = useState('');

  // ── Generate default date range ───────────────────────────────────────────
  const openReport = useCallback((key) => {
    const now = new Date();
    let start, end;
    if (key === 'weekly-sales') {
      start = startOfWeek();
      end = now;
    } else if (key === 'monthly-customer' || key === 'pnl') {
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      end = now;
    } else {
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      end = now;
    }
    setReportStart(start.toISOString().split('T')[0]);
    setReportEnd(end.toISOString().split('T')[0]);
    setActiveReport(key);
  }, []);

  // ── Filter orders by report range ─────────────────────────────────────────
  const rangedOrders = useMemo(() => {
    if (!reportStart || !reportEnd) return [];
    const s = new Date(reportStart + 'T00:00:00');
    const e = new Date(reportEnd + 'T23:59:59');
    return shopifyOrders.filter(o => {
      const d = toDate(o.createdAt || o.shopifyCreatedAt);
      return d && d >= s && d <= e && (o.total || 0) > 0;
    });
  }, [shopifyOrders, reportStart, reportEnd]);

  // ── Metrics reusable across reports ───────────────────────────────────────
  const totalRevenue = rangedOrders.reduce((s, o) => s + (o.total || 0), 0);
  const totalOrders = rangedOrders.length;
  const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

  // Orders by day
  const ordersByDay = useMemo(() => {
    const map = {};
    for (const o of rangedOrders) {
      const d = toDate(o.createdAt)?.toISOString().split('T')[0];
      if (!d) continue;
      if (!map[d]) map[d] = { date: d, orders: 0, revenue: 0 };
      map[d].orders++;
      map[d].revenue += o.total || 0;
    }
    return Object.values(map).sort((a, b) => a.date.localeCompare(b.date));
  }, [rangedOrders]);

  // Top products
  const topProducts = useMemo(() => {
    const map = {};
    for (const o of rangedOrders) {
      for (const it of (o.lineItems || o.items || [])) {
        const n = it.name || it.title || 'Unknown';
        if (!map[n]) map[n] = { name: n, units: 0, revenue: 0 };
        map[n].units += it.quantity || 1;
        map[n].revenue += it.lineTotal || ((it.price || 0) * (it.quantity || 1));
      }
    }
    return Object.values(map).sort((a, b) => b.revenue - a.revenue);
  }, [rangedOrders]);

  // Customer aggregates
  const customerAgg = useMemo(() => {
    const map = {};
    for (const o of rangedOrders) {
      const key = (o.customerEmail || o.customerName || '').toLowerCase();
      if (!key) continue;
      if (!map[key]) map[key] = { name: o.restaurant || o.customerName || key, segment: o.segment, orders: 0, revenue: 0, firstOrder: null, lastOrder: null };
      map[key].orders++;
      map[key].revenue += o.total || 0;
      const d = toDate(o.createdAt);
      if (d) {
        if (!map[key].firstOrder || d < map[key].firstOrder) map[key].firstOrder = d;
        if (!map[key].lastOrder || d > map[key].lastOrder) map[key].lastOrder = d;
      }
    }
    return Object.values(map).sort((a, b) => b.revenue - a.revenue);
  }, [rangedOrders]);

  // Health counts
  const now = new Date();
  const healthCounts = useMemo(() => {
    let active = 0, atRisk = 0, churned = 0, newCust = 0;
    for (const c of customerAgg) {
      const days = c.lastOrder ? Math.floor((now - c.lastOrder) / 86400000) : 999;
      const isNew = c.orders === 1 && days <= 30;
      if (isNew) newCust++;
      else if (days <= 30) active++;
      else if (days <= 60) atRisk++;
      else churned++;
    }
    return { active, atRisk, churned, new: newCust };
  }, [customerAgg]);

  // P&L for range
  const pnl = useMemo(() => {
    const rangedCosts = costs.filter(c => c.date && c.date >= reportStart && c.date <= reportEnd);
    const cogs = rangedCosts.filter(c => isCogs(c.category)).reduce((s, c) => s + (c.amount || 0), 0);
    const opex = rangedCosts.filter(c => !isCogs(c.category)).reduce((s, c) => s + (c.amount || 0), 0);
    const catBreakdown = {};
    for (const c of rangedCosts) {
      catBreakdown[c.category] = (catBreakdown[c.category] || 0) + (c.amount || 0);
    }
    return {
      revenue: totalRevenue, cogs, grossProfit: totalRevenue - cogs,
      grossMargin: totalRevenue > 0 ? ((totalRevenue - cogs) / totalRevenue * 100) : 0,
      opex, netProfit: totalRevenue - cogs - opex,
      netMargin: totalRevenue > 0 ? ((totalRevenue - cogs - opex) / totalRevenue * 100) : 0,
      catBreakdown,
    };
  }, [costs, reportStart, reportEnd, totalRevenue]);

  // ── Save & Export ─────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!saveReport) return;
    await saveReport({
      reportType: activeReport,
      dateRange: { start: reportStart, end: reportEnd },
      generatedBy: user?.displayName || user?.email || 'Unknown',
    });
  };

  const handleExportCSV = () => {
    if (activeReport === 'weekly-sales') {
      downloadCSV('weekly-sales.csv',
        ['Date', 'Orders', 'Revenue'],
        ordersByDay.map(d => [d.date, d.orders, d.revenue.toFixed(2)])
      );
    } else if (activeReport === 'monthly-customer') {
      downloadCSV('customer-report.csv',
        ['Customer', 'Segment', 'Orders', 'Revenue', 'Last Order'],
        customerAgg.map(c => [c.name, c.segment || '', c.orders, c.revenue.toFixed(2), c.lastOrder?.toISOString().split('T')[0] || ''])
      );
    } else if (activeReport === 'product-performance') {
      downloadCSV('product-performance.csv',
        ['Product', 'Units Sold', 'Revenue'],
        topProducts.map(p => [p.name, p.units, p.revenue.toFixed(2)])
      );
    } else if (activeReport === 'pnl') {
      downloadCSV('pnl-report.csv',
        ['Line Item', 'Amount'],
        [
          ['Revenue', pnl.revenue.toFixed(2)], ['COGS', pnl.cogs.toFixed(2)],
          ['Gross Profit', pnl.grossProfit.toFixed(2)], ['Gross Margin', pnl.grossMargin.toFixed(1) + '%'],
          ['Operating Expenses', pnl.opex.toFixed(2)], ['Net Profit', pnl.netProfit.toFixed(2)],
          ['Net Margin', pnl.netMargin.toFixed(1) + '%'],
          ...Object.entries(pnl.catBreakdown).map(([k, v]) => [`Cost: ${catLabel(k)}`, v.toFixed(2)]),
        ]
      );
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto space-y-4">
        <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-48 animate-pulse" />
        <div className="grid grid-cols-2 gap-3">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-32 bg-gray-200 dark:bg-gray-700 rounded-2xl animate-pulse" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-5 print:max-w-none print:p-0">
      <div className="print:hidden">
        <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">Reports</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">Pre-built report templates with export</p>
      </div>

      {/* ── Template Cards ── */}
      {!activeReport && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 print:hidden">
            {REPORT_TEMPLATES.map(t => (
              <button
                key={t.key}
                onClick={() => openReport(t.key)}
                className="w-full text-left bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 hover:border-green-300 dark:hover:border-green-600 hover:scale-[1.01] active:scale-[0.99] transition-all cursor-pointer"
              >
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-2xl">{t.icon}</span>
                  <span className="text-base font-bold text-gray-800 dark:text-gray-100">{t.label}</span>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400">{t.desc}</p>
              </button>
            ))}
          </div>

          {/* Report History */}
          {reports.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4 print:hidden">
              <h3 className="text-base font-semibold text-gray-700 dark:text-gray-200 mb-3">Previously Generated Reports</h3>
              <div className="space-y-1.5">
                {reports.slice(0, 20).map(r => (
                  <button
                    key={r.id}
                    onClick={() => {
                      setReportStart(r.dateRange?.start || '');
                      setReportEnd(r.dateRange?.end || '');
                      setActiveReport(r.reportType);
                    }}
                    className="w-full text-left flex items-center gap-3 px-3 py-2.5 min-h-[44px] rounded-xl bg-gray-50 dark:bg-gray-700/30 hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors cursor-pointer"
                  >
                    <span className="text-sm">{REPORT_TEMPLATES.find(t => t.key === r.reportType)?.icon || '📄'}</span>
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-200 flex-1">
                      {REPORT_TEMPLATES.find(t => t.key === r.reportType)?.label || r.reportType}
                    </span>
                    <span className="text-[10px] text-gray-400">{r.dateRange?.start} → {r.dateRange?.end}</span>
                    <span className="text-[10px] text-gray-400">{r.generatedAt?.split('T')[0]}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* ── Active Report ── */}
      {activeReport && (
        <>
          {/* Report header toolbar */}
          <div className="flex flex-wrap items-center gap-2 print:hidden">
            <button onClick={() => setActiveReport(null)} className={btnCls(false)}>← Back</button>
            <span className="text-sm font-bold text-gray-700 dark:text-gray-200">
              {REPORT_TEMPLATES.find(t => t.key === activeReport)?.icon} {REPORT_TEMPLATES.find(t => t.key === activeReport)?.label}
            </span>
            <div className="flex-1" />
            <input type="date" value={reportStart} onChange={e => setReportStart(e.target.value)}
              className="px-2 py-1.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-sm" />
            <span className="text-gray-400">→</span>
            <input type="date" value={reportEnd} onChange={e => setReportEnd(e.target.value)}
              className="px-2 py-1.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-sm" />
            <button onClick={handleExportCSV} className={btnCls(false)}>📥 Export CSV</button>
            <button onClick={handlePrint} className={btnCls(false)}>🖨️ Print</button>
            <button onClick={handleSave} className="px-3 py-2 min-h-[44px] rounded-lg text-xs font-semibold bg-green-600 text-white cursor-pointer hover:bg-green-700 transition-colors">
              💾 Save Snapshot
            </button>
          </div>

          {/* ── Weekly Sales Summary ── */}
          {activeReport === 'weekly-sales' && (
            <div className="space-y-4">
              <div className="print:block">
                <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100 print:text-black">Weekly Sales Summary</h3>
                <p className="text-xs text-gray-500 print:text-gray-700">{reportStart} — {reportEnd}</p>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 text-center print:border-gray-300">
                  <p className="text-[10px] font-semibold text-gray-500 uppercase">Orders</p>
                  <p className="text-xl font-bold text-gray-800 dark:text-gray-100">{totalOrders}</p>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 text-center">
                  <p className="text-[10px] font-semibold text-gray-500 uppercase">Revenue</p>
                  <p className="text-xl font-bold text-green-600">{fmtFull$(totalRevenue)}</p>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 text-center">
                  <p className="text-[10px] font-semibold text-gray-500 uppercase">Avg Order</p>
                  <p className="text-xl font-bold text-gray-800 dark:text-gray-100">{fmtFull$(avgOrderValue)}</p>
                </div>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">Orders by Day</h4>
                <table className="w-full text-sm">
                  <thead><tr className="border-b border-gray-200 dark:border-gray-700"><th className="py-1 px-2 text-left text-gray-500">Date</th><th className="py-1 px-2 text-right text-gray-500">Orders</th><th className="py-1 px-2 text-right text-gray-500">Revenue</th></tr></thead>
                  <tbody>
                    {ordersByDay.map(d => (
                      <tr key={d.date} className="border-b border-gray-50 dark:border-gray-800"><td className="py-1.5 px-2 text-gray-700 dark:text-gray-300">{d.date}</td><td className="py-1.5 px-2 text-right">{d.orders}</td><td className="py-1.5 px-2 text-right text-green-600 font-semibold">{fmtFull$(d.revenue)}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                  <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">Top 5 Products</h4>
                  {topProducts.slice(0, 5).map((p, i) => (
                    <div key={p.name} className="flex items-center justify-between py-1.5 border-b border-gray-50 dark:border-gray-800 last:border-0 text-xs">
                      <span className="text-gray-700 dark:text-gray-200">{i + 1}. {p.name}</span>
                      <span className="text-green-600 font-semibold">{fmtFull$(p.revenue)}</span>
                    </div>
                  ))}
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                  <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">Top 5 Customers</h4>
                  {customerAgg.slice(0, 5).map((c, i) => (
                    <div key={c.name} className="flex items-center justify-between py-1.5 border-b border-gray-50 dark:border-gray-800 last:border-0 text-xs">
                      <span className="text-gray-700 dark:text-gray-200 truncate">{i + 1}. {c.name}</span>
                      <span className="text-green-600 font-semibold">{fmtFull$(c.revenue)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── Monthly Customer Report ── */}
          {activeReport === 'monthly-customer' && (
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100">Monthly Customer Report</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-3 text-center"><p className="text-xl font-black text-green-600">{healthCounts.active}</p><p className="text-[10px] text-gray-500">Active</p></div>
                <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl p-3 text-center"><p className="text-xl font-black text-amber-600">{healthCounts.atRisk}</p><p className="text-[10px] text-gray-500">At Risk</p></div>
                <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-3 text-center"><p className="text-xl font-black text-red-600">{healthCounts.churned}</p><p className="text-[10px] text-gray-500">Churned</p></div>
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-3 text-center"><p className="text-xl font-black text-blue-600">{healthCounts.new}</p><p className="text-[10px] text-gray-500">New</p></div>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">Revenue by Customer</h4>
                <table className="w-full text-sm">
                  <thead><tr className="border-b border-gray-200 dark:border-gray-700"><th className="py-1 px-2 text-left text-gray-500">Customer</th><th className="py-1 px-2 text-right text-gray-500">Orders</th><th className="py-1 px-2 text-right text-gray-500">Revenue</th></tr></thead>
                  <tbody>
                    {customerAgg.map(c => (
                      <tr key={c.name} className="border-b border-gray-50 dark:border-gray-800"><td className="py-1.5 px-2 text-gray-700 dark:text-gray-200 truncate max-w-[200px]">{c.name}</td><td className="py-1.5 px-2 text-right">{c.orders}</td><td className="py-1.5 px-2 text-right text-green-600 font-semibold">{fmtFull$(c.revenue)}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── Product Performance Report ── */}
          {activeReport === 'product-performance' && (
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100">Product Performance Report</h3>
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                <table className="w-full text-sm">
                  <thead><tr className="border-b border-gray-200 dark:border-gray-700"><th className="py-1 px-2 text-left text-gray-500">Product</th><th className="py-1 px-2 text-right text-gray-500">Units</th><th className="py-1 px-2 text-right text-gray-500">Revenue</th></tr></thead>
                  <tbody>
                    {topProducts.map(p => (
                      <tr key={p.name} className="border-b border-gray-50 dark:border-gray-800"><td className="py-1.5 px-2 text-gray-700 dark:text-gray-200 truncate max-w-[200px]">{p.name}</td><td className="py-1.5 px-2 text-right">{p.units}</td><td className="py-1.5 px-2 text-right text-green-600 font-semibold">{fmtFull$(p.revenue)}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── P&L Report ── */}
          {activeReport === 'pnl' && (
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100">Profit & Loss Report</h3>
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 space-y-3">
                <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-700">
                  <span className="font-semibold text-gray-700 dark:text-gray-200">Revenue</span>
                  <span className="font-bold text-green-600">{fmtFull$(pnl.revenue)}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-700">
                  <span className="text-gray-600 dark:text-gray-300">Cost of Goods Sold</span>
                  <span className="text-red-500">{fmtFull$(pnl.cogs)}</span>
                </div>
                <div className={`flex justify-between py-2 border-b-2 ${pnl.grossProfit >= 0 ? 'border-green-200' : 'border-red-200'}`}>
                  <span className="font-bold text-gray-800 dark:text-gray-100">Gross Profit</span>
                  <span className={`font-bold ${pnl.grossProfit >= 0 ? 'text-green-600' : 'text-red-500'}`}>{fmtFull$(pnl.grossProfit)} ({pnl.grossMargin.toFixed(1)}%)</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-700">
                  <span className="text-gray-600 dark:text-gray-300">Operating Expenses</span>
                  <span className="text-red-500">{fmtFull$(pnl.opex)}</span>
                </div>
                <div className={`flex justify-between py-3 text-lg ${pnl.netProfit >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                  <span className="font-black">Net Profit</span>
                  <span className="font-black">{fmtFull$(pnl.netProfit)} ({pnl.netMargin.toFixed(1)}%)</span>
                </div>
                {Object.keys(pnl.catBreakdown).length > 0 && (
                  <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
                    <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">Cost Breakdown</h4>
                    {Object.entries(pnl.catBreakdown).sort(([, a], [, b]) => b - a).map(([cat, amt]) => (
                      <div key={cat} className="flex justify-between py-1 text-xs">
                        <span className="text-gray-600 dark:text-gray-300">{catLabel(cat)}</span>
                        <span className="text-gray-700 dark:text-gray-200 font-semibold">{fmtFull$(amt)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">Revenue by Customer</h4>
                {customerAgg.slice(0, 10).map(c => (
                  <div key={c.name} className="flex items-center justify-between py-1.5 border-b border-gray-50 dark:border-gray-800 last:border-0 text-xs">
                    <span className="text-gray-700 dark:text-gray-200 truncate">{c.name}</span>
                    <span className="text-green-600 font-semibold">{fmtFull$(c.revenue)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
