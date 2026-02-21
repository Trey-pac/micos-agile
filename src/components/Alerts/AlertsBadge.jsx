/**
 * AlertsBadge.jsx — Nav bar alert count badge.
 *
 * Subscribes to farms/{farmId}/alerts where status == 'pending'.
 * Shows a red count badge. Clicking opens a dropdown with pending alerts.
 * Each alert has a "Dismiss" button that calls the dismiss API.
 *
 * INTEGRATION: Import and render in Layout.jsx header area.
 */

import { useState, useEffect, useRef } from 'react';
import { subscribePendingAlerts, dismissAlert as dismissAlertApi, dismissAllAlerts } from '../../services/alertService';

const ALERT_ICONS = {
  order_anomaly: '⚠️',
  yield_outlier: '📊',
};

const ALERT_COLORS = {
  order_anomaly: 'text-amber-600 dark:text-amber-400',
  yield_outlier: 'text-purple-600 dark:text-purple-400',
};

function timeAgo(dateStr) {
  if (!dateStr) return '';
  const d = dateStr.toDate ? dateStr.toDate() : new Date(dateStr);
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function alertDescription(alert) {
  if (alert.type === 'order_anomaly') {
    return `${alert.customerName || alert.customerId} ordered ${alert.quantity} ${alert.cropDisplayName || alert.cropId} — typically orders ~${alert.expectedMean}`;
  }
  if (alert.type === 'yield_outlier') {
    return `${alert.cropId} yield ${alert.yieldPerTray} oz/tray — expected ~${alert.expectedMean} oz/tray (z=${alert.zScore})`;
  }
  return alert.type;
}

export default function AlertsBadge({ farmId }) {
  const [alerts, setAlerts] = useState([]);
  const [open, setOpen] = useState(false);
  const [dismissing, setDismissing] = useState(new Set());
  const dropdownRef = useRef(null);

  // Subscribe to pending alerts
  useEffect(() => {
    if (!farmId) return;
    return subscribePendingAlerts(farmId, setAlerts, (err) => {
      console.error('Alerts subscription error:', err);
    });
  }, [farmId]);

  // Close dropdown on outside click
  useEffect(() => {
    if (!open) return;
    const handleClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  const dismissAlert = async (alertId) => {
    setDismissing(prev => new Set([...prev, alertId]));
    try {
      await dismissAlertApi(alertId);
    } catch (err) {
      // error already logged in service
    }
    setDismissing(prev => { const s = new Set(prev); s.delete(alertId); return s; });
  };

  const dismissAll = async () => {
    setDismissing(new Set(alerts.map(a => a.id)));
    try {
      await dismissAllAlerts();
    } catch (err) {
      // error already logged in service
    }
    setDismissing(new Set());
  };

  const count = alerts.length;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        title={`${count} pending alert${count !== 1 ? 's' : ''}`}
      >
        <span className="text-lg">🔔</span>
        {count > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center text-[10px] font-bold text-white bg-red-500 rounded-full px-1 animate-pulse">
            {count > 99 ? '99+' : count}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 z-50 max-h-[70vh] overflow-hidden flex flex-col">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-700">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
              Learning Engine Alerts
            </h3>
            {count > 0 && (
              <button
                onClick={dismissAll}
                className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
              >
                Dismiss all
              </button>
            )}
          </div>

          <div className="overflow-y-auto flex-1 divide-y divide-gray-100 dark:divide-gray-700">
            {count === 0 ? (
              <div className="p-6 text-center text-gray-400 dark:text-gray-500 text-sm">
                No pending alerts
              </div>
            ) : (
              alerts.map(alert => (
                <div
                  key={alert.id}
                  className={`px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors ${
                    dismissing.has(alert.id) ? 'opacity-50' : ''
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <span className="text-base mt-0.5">
                      {ALERT_ICONS[alert.type] || '🔔'}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium ${ALERT_COLORS[alert.type] || 'text-gray-900 dark:text-white'}`}>
                        {alert.type === 'order_anomaly' ? 'Unusual Order' : 'Yield Outlier'}
                      </p>
                      <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5 line-clamp-2">
                        {alertDescription(alert)}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] text-gray-400">{timeAgo(alert.createdAt)}</span>
                        {alert.zScore && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400">
                            z={alert.zScore}
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); dismissAlert(alert.id); }}
                      disabled={dismissing.has(alert.id)}
                      className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 px-2 py-1 rounded hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {count > 0 && (
            <div className="px-4 py-2 border-t border-gray-100 dark:border-gray-700">
              <a
                href="/alerts"
                className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
              >
                View all alerts →
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
