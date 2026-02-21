/**
 * AlertContext.jsx — Single Firestore subscription for pending alerts.
 *
 * Eliminates duplicate subscriptions that previously existed:
 *   - AlertsBadge (Layout nav bar) → subscribePendingAlerts
 *   - useAlertCount (Dashboard) → onSnapshot on alerts collection
 *   - useOrderAnomalyAlerts (OrderFulfillmentBoard) → onSnapshot on alerts collection
 *
 * All three now read from this one context instead of each opening its own listener.
 */
import { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { subscribePendingAlerts } from '../services/alertService';

const AlertContext = createContext({
  alerts: [],
  alertCount: 0,
  anomalyAlertsByOrder: new Map(),
});

export function AlertProvider({ farmId, children }) {
  const [alerts, setAlerts] = useState([]);

  useEffect(() => {
    if (!farmId) { setAlerts([]); return; }
    return subscribePendingAlerts(farmId, setAlerts, (err) => {
      console.error('[AlertContext] subscription error:', err);
    });
  }, [farmId]);

  const value = useMemo(() => {
    const anomalyAlertsByOrder = new Map();
    for (const a of alerts) {
      if (a.type === 'order_anomaly' && a.orderId) {
        anomalyAlertsByOrder.set(a.orderId, a);
      }
    }
    return { alerts, alertCount: alerts.length, anomalyAlertsByOrder };
  }, [alerts]);

  return (
    <AlertContext.Provider value={value}>
      {children}
    </AlertContext.Provider>
  );
}

export function useAlerts() {
  return useContext(AlertContext);
}
