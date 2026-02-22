/**
 * useNewOrderNotifier.js — Fires a toast + optional audio ding when a new
 * order appears in the orders array. Only runs for admin/manager roles.
 *
 * Works by tracking known order IDs and comparing on each render.
 * Skips the initial load so you don't get bombarded on page refresh.
 */
import { useEffect, useRef } from 'react';
import { useToast } from '../contexts/ToastContext';

const DING_URL = 'data:audio/wav;base64,UklGRl9vT19teleXNhbXBsZQ=='; // tiny placeholder

/**
 * @param {Array} orders — array of order objects from useOrders (admin mode)
 * @param {string} role — user role ('admin', 'manager', etc.)
 */
export function useNewOrderNotifier(orders, role) {
  const { addToast } = useToast();
  const knownIds = useRef(null); // null = not initialized yet (first load)

  useEffect(() => {
    // Only fire for admin/manager
    if (role !== 'admin' && role !== 'manager') return;
    if (!orders || orders.length === 0) return;

    const currentIds = new Set(orders.map((o) => o.id));

    if (knownIds.current === null) {
      // First load — seed the known set, don't fire toasts
      knownIds.current = currentIds;
      return;
    }

    // Find genuinely new orders
    const newOrders = orders.filter(
      (o) => !knownIds.current.has(o.id) && o.status === 'new'
    );

    if (newOrders.length > 0) {
      // Show toast for each new order
      for (const order of newOrders) {
        const name = order.customerName || order.customerEmail || 'A customer';
        const total = order.total ? ` — $${order.total.toFixed(2)}` : '';
        addToast({
          message: `🛒 New order from ${name}${total}`,
          icon: '🔔',
          duration: 8000,
        });
      }

      // Play a subtle ding sound
      try {
        const audio = new Audio('/notification.mp3');
        audio.volume = 0.4;
        audio.play().catch(() => {}); // ignore autoplay restrictions
      } catch {
        // No audio — that's fine
      }
    }

    // Update known set
    knownIds.current = currentIds;
  }, [orders, role, addToast]);
}
