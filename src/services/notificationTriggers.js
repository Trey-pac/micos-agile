/**
 * notificationTriggers.js — Order status → push notification mappings.
 *
 * Defines the notification templates for each order lifecycle event and
 * dispatches them via the /api/sendNotification Vercel serverless function.
 *
 * Usage: call notifyOrderStatusChange(farmId, order, newStatus) whenever
 * an order's status is advanced. It's fire-and-forget — failures are logged
 * but never block the UI.
 */

// ── Notification templates ──────────────────────────────────────────────────

const ORDER_NOTIFICATION_TEMPLATES = {
  confirmed: (order) => ({
    title: '✅ Order Confirmed',
    body: `Your order #${order.id.slice(-6).toUpperCase()} is confirmed for ${formatDate(order.requestedDeliveryDate)}.`,
    data: { url: '/my-orders', orderId: order.id, event: 'order_confirmed' },
  }),
  packed: (order) => ({
    title: '📦 Order Packed',
    body: `Your order #${order.id.slice(-6).toUpperCase()} is packed and ready for delivery!`,
    data: { url: '/my-orders', orderId: order.id, event: 'order_packed' },
  }),
  delivered: (order) => ({
    title: '🚚 Order Delivered',
    body: 'Your order has been delivered. Enjoy!',
    data: { url: '/my-orders', orderId: order.id, event: 'order_delivered' },
  }),
};

// Statuses that trigger an "out for delivery" notification
// (when order is on a route that's in_progress)
export function getOutForDeliveryNotification(order) {
  return {
    title: '🚚 Out for Delivery',
    body: `Your order #${order.id.slice(-6).toUpperCase()} is on its way!`,
    data: { url: '/my-orders', orderId: order.id, event: 'out_for_delivery' },
  };
}

// ── Dispatcher ──────────────────────────────────────────────────────────────

/**
 * Fire a push notification when an order status changes.
 * Fire-and-forget — errors are logged, never thrown.
 *
 * @param {string} farmId
 * @param {object} order  — full order doc (must have .id, .customerId)
 * @param {string} newStatus — the status being transitioned TO
 */
export async function notifyOrderStatusChange(farmId, order, newStatus) {
  if (!order?.customerId) return;

  const templateFn = ORDER_NOTIFICATION_TEMPLATES[newStatus];
  if (!templateFn) return; // no notification for this status

  const { title, body, data } = templateFn(order);

  try {
    const res = await fetch('/api/sendNotification', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        farmId,
        customerId: order.customerId,
        title,
        body,
        data,
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      console.warn(`[triggers] Notification API ${res.status}:`, err);
    } else {
      const result = await res.json();
      console.log(`[triggers] Notification sent for ${newStatus}:`, result);
    }
  } catch (err) {
    console.error(`[triggers] Failed to send ${newStatus} notification:`, err);
  }
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(dateStr) {
  if (!dateStr) return 'soon';
  try {
    return new Date(dateStr).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return dateStr;
  }
}
