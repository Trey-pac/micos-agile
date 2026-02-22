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

import { getAuth } from 'firebase/auth';

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
    const token = await getAuth().currentUser?.getIdToken();
    const res = await fetch('/api/sendNotification', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
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
      // Success — notification sent
    }
  } catch (err) {
    console.error(`[triggers] Failed to send ${newStatus} notification:`, err);
  }
}

/**
 * Fire a push notification to admin when a new order is placed.
 * Fire-and-forget. Sends to the farm owner (looks up admin UID from farm doc).
 */
export async function notifyNewOrder(farmId, order) {
  if (!farmId || !order) return;

  const customerName = order.customerName || order.customerEmail || 'A customer';
  const total = order.total ? `$${order.total.toFixed(2)}` : '';
  const items = order.items?.length || 0;

  try {
    const token = await getAuth().currentUser?.getIdToken();
    const res = await fetch('/api/sendNotification', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        farmId,
        topic: 'admin', // send to all admin devices
        title: '🛒 New Order Received',
        body: `${customerName} placed an order — ${items} items${total ? `, ${total}` : ''}`,
        data: { url: '/orders', orderId: order.id || '', event: 'new_order' },
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      console.warn('[triggers] New order notification failed:', err);
    }
  } catch (err) {
    console.error('[triggers] Failed to send new order notification:', err);
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
