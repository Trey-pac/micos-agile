/**
 * AlertsBadge.jsx — Nav bar alert count badge.
 *
 * Subscribes to farms/{farmId}/alerts where status == 'pending'.
 * Shows a red count badge. Clicking opens a dropdown with pending alerts.
 * Each alert has a "Dismiss" button that calls the dismiss API.
 *
 * INTEGRATION: Import and render in Layout.jsx header area.
 */

import { useState } from 'react';
import { useAlerts } from '../../contexts/AlertContext';
import { dismissAlert as dismissAlertApi, dismissAllAlerts } from '../../services/alertService';
import { Popover, PopoverTrigger, PopoverContent } from '../ui/Popover';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Bell, X, AlertTriangle, BarChart3 } from 'lucide-react';

const ALERT_ICONS = {
  order_anomaly: AlertTriangle,
  yield_outlier: BarChart3,
};

const ALERT_COLORS = {
  order_anomaly: 'text-amber-600 dark:text-amber-400',
  yield_outlier: 'text-purple-600 dark:text-purple-400',
};

import { timeAgo } from '../../utils/dateUtils';

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
  const { alerts } = useAlerts();
  const [open, setOpen] = useState(false);
  const [dismissing, setDismissing] = useState(new Set());

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
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className="relative p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          title={`${count} pending alert${count !== 1 ? 's' : ''}`}
        >
          <Bell className="w-5 h-5 text-gray-600 dark:text-gray-300" />
          {count > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center text-[10px] font-bold text-white bg-red-500 rounded-full px-1 animate-pulse">
              {count > 99 ? '99+' : count}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 sm:w-96 p-0 max-h-[70vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-700">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
            Learning Engine Alerts
          </h3>
          {count > 0 && (
            <Button variant="link" size="sm" onClick={dismissAll} className="text-xs h-auto p-0">
              Dismiss all
            </Button>
          )}
        </div>

        <div className="overflow-y-auto flex-1 divide-y divide-gray-100 dark:divide-gray-700">
          {count === 0 ? (
            <div className="p-6 text-center text-gray-400 dark:text-gray-500 text-sm">
              No pending alerts
            </div>
          ) : (
            alerts.map(alert => {
              const IconComp = ALERT_ICONS[alert.type] || Bell;
              return (
                <div
                  key={alert.id}
                  className={`px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors ${
                    dismissing.has(alert.id) ? 'opacity-50' : ''
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <IconComp className={`w-4 h-4 mt-0.5 shrink-0 ${ALERT_COLORS[alert.type] || 'text-gray-500'}`} />
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
                          <Badge variant="destructive" className="text-[10px]">
                            z={alert.zScore}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 shrink-0"
                      onClick={(e) => { e.stopPropagation(); dismissAlert(alert.id); }}
                      disabled={dismissing.has(alert.id)}
                    >
                      <X className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              );
            })
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
      </PopoverContent>
    </Popover>
  );
}
