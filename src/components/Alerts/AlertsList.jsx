/**
 * AlertsList.jsx — Full alert management page.
 *
 * Shows all alerts (pending + dismissed) with filters, bulk dismiss, and
 * links to relevant orders/harvests.
 *
 * Route: /alerts
 */

import { useState, useEffect, useMemo } from 'react';
import { collection, query, orderBy, onSnapshot, limit } from 'firebase/firestore';
import { getDb } from '../../firebase';

const ALERT_TYPE_OPTIONS = [
  { value: 'all', label: 'All Types' },
  { value: 'order_anomaly', label: 'Order Anomalies' },
  { value: 'yield_outlier', label: 'Yield Outliers' },
];

const STATUS_OPTIONS = [
  { value: 'all', label: 'All Statuses' },
  { value: 'pending', label: 'Pending' },
  { value: 'dismissed', label: 'Dismissed' },
];

const ALERT_ICONS = {
  order_anomaly: '⚠️',
  yield_outlier: '📊',
};

function formatDate(dateStr) {
  if (!dateStr) return '—';
  const d = dateStr.toDate ? dateStr.toDate() : new Date(dateStr);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit',
  });
}

function alertDescription(alert) {
  if (alert.type === 'order_anomaly') {
    const expected = alert.expectedRange
      ? `Expected range: ${alert.expectedRange.low}–${alert.expectedRange.high}`
      : `Expected mean: ~${alert.expectedMean}`;
    return `${alert.customerName || alert.customerId} ordered ${alert.quantity} of ${alert.cropDisplayName || alert.cropId}. ${expected}. Method: ${alert.method}${alert.zScore ? `, z-score: ${alert.zScore}` : ''}`;
  }
  if (alert.type === 'yield_outlier') {
    return `${alert.cropId} yield was ${alert.yieldPerTray} oz/tray (${alert.trayCount} trays). Expected ~${alert.expectedMean} oz/tray. Z-score: ${alert.zScore}`;
  }
  return JSON.stringify(alert);
}

export default function AlertsList({ farmId }) {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('pending');
  const [selected, setSelected] = useState(new Set());
  const [dismissing, setDismissing] = useState(false);

  // Subscribe to all alerts (latest 200)
  useEffect(() => {
    if (!farmId) return;
    setLoading(true);
    const q = query(
      collection(getDb(), 'farms', farmId, 'alerts'),
      orderBy('createdAt', 'desc'),
      limit(200)
    );
    const unsub = onSnapshot(q, (snap) => {
      setAlerts(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    }, (err) => {
      console.error('Alerts subscription error:', err);
      setLoading(false);
    });
    return unsub;
  }, [farmId]);

  // Filtered alerts
  const filtered = useMemo(() => {
    return alerts.filter(a => {
      if (typeFilter !== 'all' && a.type !== typeFilter) return false;
      if (statusFilter !== 'all' && a.status !== statusFilter) return false;
      return true;
    });
  }, [alerts, typeFilter, statusFilter]);

  const pendingCount = alerts.filter(a => a.status === 'pending').length;

  const toggleSelect = (id) => {
    setSelected(prev => {
      const s = new Set(prev);
      s.has(id) ? s.delete(id) : s.add(id);
      return s;
    });
  };

  const selectAll = () => {
    if (selected.size === filtered.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filtered.map(a => a.id)));
    }
  };

  const dismissSelected = async () => {
    if (selected.size === 0) return;
    setDismissing(true);
    try {
      await fetch('/api/learning-engine/dismiss-alert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ alertIds: [...selected] }),
      });
      setSelected(new Set());
    } catch (err) {
      console.error('Failed to dismiss alerts:', err);
    }
    setDismissing(false);
  };

  const dismissAll = async () => {
    setDismissing(true);
    try {
      await fetch('/api/learning-engine/dismiss-alert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dismissAll: true }),
      });
      setSelected(new Set());
    } catch (err) {
      console.error('Failed to dismiss all:', err);
    }
    setDismissing(false);
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            🔔 Learning Engine Alerts
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {pendingCount} pending · {alerts.length} total
          </p>
        </div>
        <div className="flex gap-2">
          {selected.size > 0 && (
            <button
              onClick={dismissSelected}
              disabled={dismissing}
              className="px-3 py-2 text-sm bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300 rounded-lg hover:bg-amber-200 dark:hover:bg-amber-900/50 transition-colors disabled:opacity-50"
            >
              Dismiss {selected.size} selected
            </button>
          )}
          {pendingCount > 0 && (
            <button
              onClick={dismissAll}
              disabled={dismissing}
              className="px-3 py-2 text-sm bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors disabled:opacity-50"
            >
              Dismiss all pending
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="px-3 py-2 text-sm border rounded-lg bg-white dark:bg-gray-800 dark:border-gray-600 text-gray-900 dark:text-white"
        >
          {ALERT_TYPE_OPTIONS.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 text-sm border rounded-lg bg-white dark:bg-gray-800 dark:border-gray-600 text-gray-900 dark:text-white"
        >
          {STATUS_OPTIONS.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <span className="text-sm text-gray-500 dark:text-gray-400">
          Showing {filtered.length} alert{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Alert list */}
      {filtered.length === 0 ? (
        <div className="p-12 text-center text-gray-400 dark:text-gray-500">
          <span className="text-4xl block mb-3">🎉</span>
          <p className="text-lg font-medium">No alerts match your filters</p>
          <p className="text-sm mt-1">All clear! The Learning Engine is monitoring your data.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {/* Select all */}
          <div className="flex items-center gap-3 px-2">
            <input
              type="checkbox"
              checked={selected.size === filtered.length && filtered.length > 0}
              onChange={selectAll}
              className="rounded border-gray-300 dark:border-gray-600"
            />
            <span className="text-xs text-gray-500 dark:text-gray-400">Select all</span>
          </div>

          {filtered.map(alert => (
            <div
              key={alert.id}
              className={`flex items-start gap-3 p-4 rounded-xl border transition-colors ${
                alert.status === 'pending'
                  ? 'bg-white dark:bg-gray-800 border-amber-200 dark:border-amber-800/50'
                  : 'bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700 opacity-60'
              }`}
            >
              <input
                type="checkbox"
                checked={selected.has(alert.id)}
                onChange={() => toggleSelect(alert.id)}
                className="mt-1 rounded border-gray-300 dark:border-gray-600"
              />
              <span className="text-xl">{ALERT_ICONS[alert.type] || '🔔'}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-semibold text-gray-900 dark:text-white">
                    {alert.type === 'order_anomaly' ? 'Order Anomaly' : 'Yield Outlier'}
                  </span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                    alert.status === 'pending'
                      ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                  }`}>
                    {alert.status}
                  </span>
                  {alert.confidence && (
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                      alert.confidence === 'high' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                      : alert.confidence === 'medium' ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                    }`}>
                      {alert.confidence} confidence
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  {alertDescription(alert)}
                </p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                  {formatDate(alert.createdAt)}
                  {alert.dismissedAt && ` · Dismissed ${formatDate(alert.dismissedAt)}`}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
