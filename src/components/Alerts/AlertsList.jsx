/**
 * AlertsList.jsx — Full alert management page.
 *
 * Shows all alerts (pending + dismissed) with filters, bulk dismiss, and
 * links to relevant orders/harvests.
 *
 * Route: /alerts
 */

import { useState, useEffect, useMemo } from 'react';
import { subscribeAllAlerts, dismissAlert as dismissAlertApi, dismissAllAlerts as dismissAllAlertsApi } from '../../services/alertService';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../ui/Select';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Card } from '../ui/Card';
import { Bell, AlertTriangle, BarChart3, PartyPopper } from 'lucide-react';

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
  order_anomaly: AlertTriangle,
  yield_outlier: BarChart3,
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
    return subscribeAllAlerts(farmId, (data) => {
      setAlerts(data);
      setLoading(false);
    }, (err) => {
      console.error('Alerts subscription error:', err);
      setLoading(false);
    });
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
      await dismissAlertApi([...selected]);
      setSelected(new Set());
    } catch (err) {
      // error already logged in service
    }
    setDismissing(false);
  };

  const dismissAll = async () => {
    setDismissing(true);
    try {
      await dismissAllAlertsApi();
      setSelected(new Set());
    } catch (err) {
      // error already logged in service
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
            <Bell className="w-6 h-6" /> Learning Engine Alerts
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {pendingCount} pending · {alerts.length} total
          </p>
        </div>
        <div className="flex gap-2">
          {selected.size > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={dismissSelected}
              disabled={dismissing}
            >
              Dismiss {selected.size} selected
            </Button>
          )}
          {pendingCount > 0 && (
            <Button
              variant="destructive"
              size="sm"
              onClick={dismissAll}
              disabled={dismissing}
            >
              Dismiss all pending
            </Button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[180px] text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ALERT_TYPE_OPTIONS.map(o => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px] text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map(o => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-sm text-gray-500 dark:text-gray-400">
          Showing {filtered.length} alert{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Alert list */}
      {filtered.length === 0 ? (
        <div className="p-12 text-center text-gray-400 dark:text-gray-500">
          <PartyPopper className="w-10 h-10 mx-auto mb-3" />
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

          {filtered.map(alert => {
            const IconComp = ALERT_ICONS[alert.type] || Bell;
            return (
              <Card
                key={alert.id}
                className={`flex items-start gap-3 p-4 transition-colors ${
                  alert.status === 'pending'
                    ? 'border-amber-200 dark:border-amber-800/50'
                    : 'border-gray-200 dark:border-gray-700 opacity-60'
                }`}
              >
                <input
                  type="checkbox"
                  checked={selected.has(alert.id)}
                  onChange={() => toggleSelect(alert.id)}
                  className="mt-1 rounded border-gray-300 dark:border-gray-600"
                />
                <IconComp className={`w-5 h-5 mt-0.5 shrink-0 ${
                  alert.type === 'order_anomaly' ? 'text-amber-600' : 'text-purple-600'
                }`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-gray-900 dark:text-white">
                      {alert.type === 'order_anomaly' ? 'Order Anomaly' : 'Yield Outlier'}
                    </span>
                    <Badge variant={alert.status === 'pending' ? 'warning' : 'secondary'} className="text-[10px]">
                      {alert.status}
                    </Badge>
                    {alert.confidence && (
                      <Badge
                        variant={alert.confidence === 'high' ? 'success' : alert.confidence === 'medium' ? 'warning' : 'secondary'}
                        className="text-[10px]"
                      >
                        {alert.confidence} confidence
                      </Badge>
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
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
