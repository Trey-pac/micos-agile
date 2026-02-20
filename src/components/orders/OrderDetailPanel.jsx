/**
 * OrderDetailPanel.jsx — Slide-out right panel showing full order detail.
 *
 * Features:
 * - Customer info (name, email, restaurant)
 * - Status override dropdown
 * - Delivery info (requested date, address)
 * - Line items table with subtotal
 * - Special instructions (yellow bg)
 * - Order timeline with timestamps
 * - Admin notes (editable)
 * - Print Packing Slip button
 * - Cancel Order button
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FULFILLMENT_COLUMNS, STATUS_TIMESTAMP_KEY } from '../../services/orderService';

// ── Helpers ─────────────────────────────────────────────────────────────────

const STATUS_LABELS = {
  new: 'New',
  confirmed: 'Confirmed',
  harvesting: 'Harvesting',
  packed: 'Packed',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
};

const STATUS_COLORS = {
  new: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  confirmed: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300',
  harvesting: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  packed: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
  delivered: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  cancelled: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
};

function tsToDate(ts) {
  if (!ts) return null;
  if (ts.seconds) return new Date(ts.seconds * 1000);
  if (ts.toDate) return ts.toDate();
  const d = new Date(ts);
  return isNaN(d) ? null : d;
}

function formatDateTime(ts) {
  const d = tsToDate(ts);
  if (!d) return '—';
  return d.toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit',
  });
}

// ── Timeline ────────────────────────────────────────────────────────────────

function OrderTimeline({ order }) {
  const steps = [
    { key: 'new', label: 'Created', tsField: 'createdAt' },
    { key: 'confirmed', label: 'Confirmed', tsField: 'confirmedAt' },
    { key: 'harvesting', label: 'Harvesting', tsField: 'harvestingAt' },
    { key: 'packed', label: 'Packed', tsField: 'packedAt' },
    { key: 'delivered', label: 'Delivered', tsField: 'deliveredAt' },
  ];

  const currentIdx = FULFILLMENT_COLUMNS.indexOf(order.status);

  return (
    <div className="space-y-0">
      {steps.map((step, i) => {
        const ts = order[step.tsField];
        const done = i <= currentIdx && order.status !== 'cancelled';
        const isCurrent = i === currentIdx && order.status !== 'cancelled';
        return (
          <div key={step.key} className="flex items-start gap-3">
            {/* Dot + line */}
            <div className="flex flex-col items-center">
              <div
                className={`w-3 h-3 rounded-full border-2 mt-0.5 ${
                  done
                    ? 'bg-green-500 border-green-500'
                    : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600'
                } ${isCurrent ? 'ring-2 ring-green-300' : ''}`}
              />
              {i < steps.length - 1 && (
                <div className={`w-0.5 h-6 ${done ? 'bg-green-400' : 'bg-gray-200 dark:bg-gray-700'}`} />
              )}
            </div>
            {/* Label + timestamp */}
            <div className="flex-1 -mt-0.5 pb-2">
              <p className={`text-xs font-medium ${
                done ? 'text-gray-800 dark:text-gray-200' : 'text-gray-400 dark:text-gray-500'
              }`}>
                {step.label}
              </p>
              {ts && (
                <p className="text-[10px] text-gray-400 dark:text-gray-500">
                  {formatDateTime(ts)}
                </p>
              )}
            </div>
          </div>
        );
      })}
      {/* Show cancelled step if applicable */}
      {order.status === 'cancelled' && (
        <div className="flex items-start gap-3">
          <div className="flex flex-col items-center">
            <div className="w-3 h-3 rounded-full bg-red-500 border-2 border-red-500 mt-0.5" />
          </div>
          <div className="flex-1 -mt-0.5">
            <p className="text-xs font-medium text-red-600 dark:text-red-400">Cancelled</p>
            {order.cancelledAt && (
              <p className="text-[10px] text-gray-400">{formatDateTime(order.cancelledAt)}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Print Packing Slip ──────────────────────────────────────────────────────

function printPackingSlip(order) {
  const items = order.items || [];
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Packing Slip — ${order.customerName || 'Order'}</title>
      <style>
        body { font-family: -apple-system, sans-serif; padding: 24px; max-width: 600px; margin: 0 auto; }
        h1 { font-size: 18px; margin-bottom: 4px; }
        .subtitle { font-size: 12px; color: #666; margin-bottom: 16px; }
        table { width: 100%; border-collapse: collapse; margin-top: 12px; }
        th, td { text-align: left; padding: 6px 8px; border-bottom: 1px solid #eee; font-size: 13px; }
        th { border-bottom: 2px solid #333; font-weight: 600; }
        .total { text-align: right; font-weight: 700; font-size: 15px; margin-top: 12px; }
        .instructions { margin-top: 12px; padding: 8px; background: #fff9e6; border-radius: 6px; font-size: 12px; }
        @media print { body { padding: 0; } }
      </style>
    </head>
    <body>
      <h1>Packing Slip</h1>
      <p class="subtitle">${order.customerName || ''} · ${order.requestedDeliveryDate || 'No date'}</p>
      <table>
        <thead><tr><th>Product</th><th>Qty</th><th>Unit</th></tr></thead>
        <tbody>
          ${items.map(item => `
            <tr>
              <td>${item.name || item.title || item.productName || '—'}</td>
              <td>${item.quantity || item.qty || 0}</td>
              <td>${item.unit || 'ea'}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      ${order.total ? `<p class="total">Total: $${Number(order.total).toFixed(2)}</p>` : ''}
      ${order.specialInstructions ? `<div class="instructions"><strong>Notes:</strong> ${order.specialInstructions}</div>` : ''}
      <script>window.print();</script>
    </body>
    </html>
  `;
  const win = window.open('', '_blank');
  win.document.write(html);
  win.document.close();
}

// ── Main Panel ──────────────────────────────────────────────────────────────

export default function OrderDetailPanel({
  order,
  customerMap = {},
  onClose,
  onStatusChange,
  onCancel,
  onUpdateNotes,
  farmId,
}) {
  const [notes, setNotes] = useState(order.adminNotes || '');
  const [saving, setSaving] = useState(false);
  const notesTimer = useRef(null);

  // Sync notes when order changes
  useEffect(() => {
    setNotes(order.adminNotes || '');
  }, [order.id, order.adminNotes]);

  // Auto-save notes after 800ms idle
  const handleNotesChange = useCallback((e) => {
    const val = e.target.value;
    setNotes(val);
    if (notesTimer.current) clearTimeout(notesTimer.current);
    notesTimer.current = setTimeout(async () => {
      setSaving(true);
      await onUpdateNotes?.(order.id, val);
      setSaving(false);
    }, 800);
  }, [order.id, onUpdateNotes]);

  const items = order.items || [];
  const subtotal = items.reduce((sum, it) => {
    const price = it.price || it.pricePerUnit || 0;
    const qty = it.quantity || it.qty || 0;
    return sum + price * qty;
  }, 0);
  const customer = customerMap[(order.customerEmail || '').toLowerCase()] || {};

  return (
    <motion.div
      initial={{ x: 400, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 400, opacity: 0 }}
      transition={{ type: 'spring', damping: 25, stiffness: 300 }}
      className="w-[380px] lg:w-[420px] flex-shrink-0 border-l border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 overflow-y-auto h-[calc(100vh-140px)]"
    >
      <div className="p-4 space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100">
              {order.customerName || 'Unknown'}
            </h3>
            {customer.restaurant && (
              <p className="text-xs text-gray-500 dark:text-gray-400">{customer.restaurant}</p>
            )}
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
              {order.customerEmail || ''}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 min-h-[44px] min-w-[44px] rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 transition-colors cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Status + override */}
        <div className="flex items-center gap-2">
          <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${STATUS_COLORS[order.status] || STATUS_COLORS.new}`}>
            {STATUS_LABELS[order.status] || order.status}
          </span>
          <select
            value={order.status}
            onChange={(e) => onStatusChange?.(order.id, e.target.value)}
            className="text-xs bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-2 py-1.5 text-gray-600 dark:text-gray-300 cursor-pointer min-h-[36px]"
          >
            {FULFILLMENT_COLUMNS.map(s => (
              <option key={s} value={s}>{STATUS_LABELS[s]}</option>
            ))}
            <option value="cancelled">Cancelled</option>
          </select>
        </div>

        {/* Delivery info */}
        <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-3">
          <p className="text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">Delivery</p>
          <p className="text-sm text-gray-800 dark:text-gray-200">
            📅 {order.requestedDeliveryDate || 'Not scheduled'}
          </p>
          {(order.address || customer.address) && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              📍 {order.address || customer.address}
            </p>
          )}
        </div>

        {/* Special instructions */}
        {order.specialInstructions && (
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-3">
            <p className="text-xs font-semibold text-amber-700 dark:text-amber-300 mb-1">⚠ Special Instructions</p>
            <p className="text-sm text-amber-800 dark:text-amber-200">{order.specialInstructions}</p>
          </div>
        )}

        {/* Line items */}
        <div>
          <p className="text-xs font-semibold text-gray-600 dark:text-gray-300 mb-2">Items ({items.length})</p>
          <div className="space-y-1">
            {items.map((item, i) => {
              const name = item.name || item.title || item.productName || 'Unknown';
              const qty = item.quantity || item.qty || 0;
              const unit = item.unit || 'ea';
              const price = item.price || item.pricePerUnit || 0;
              return (
                <div key={i} className="flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800">
                  <div>
                    <p className="text-sm text-gray-800 dark:text-gray-200">{name}</p>
                    <p className="text-[10px] text-gray-400">{qty} {unit} × ${price.toFixed(2)}</p>
                  </div>
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    ${(qty * price).toFixed(2)}
                  </p>
                </div>
              );
            })}
          </div>
          {/* Total */}
          <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <span className="text-sm font-semibold text-gray-600 dark:text-gray-300">Total</span>
            <span className="text-lg font-bold text-gray-800 dark:text-gray-100">
              ${(order.total || subtotal).toFixed(2)}
            </span>
          </div>
        </div>

        {/* Order Timeline */}
        <div>
          <p className="text-xs font-semibold text-gray-600 dark:text-gray-300 mb-2">Timeline</p>
          <OrderTimeline order={order} />
        </div>

        {/* Admin notes */}
        <div>
          <div className="flex items-center gap-2 mb-1">
            <p className="text-xs font-semibold text-gray-600 dark:text-gray-300">Admin Notes</p>
            {saving && <span className="text-[10px] text-green-500">Saving...</span>}
          </div>
          <textarea
            value={notes}
            onChange={handleNotesChange}
            placeholder="Add notes about this order..."
            rows={3}
            className="w-full text-sm border border-gray-200 dark:border-gray-700 rounded-xl p-2.5 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 resize-none focus:outline-none focus:border-green-400 transition-colors"
          />
        </div>

        {/* Order source + ID */}
        <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-3 text-xs text-gray-400 dark:text-gray-500 space-y-1">
          <p>Order ID: {order.id}</p>
          {order.shopifyOrderId && <p>Shopify: #{order.shopifyOrderId}</p>}
          {order.source && <p>Source: {order.source}</p>}
          <p>Created: {formatDateTime(order.createdAt)}</p>
        </div>

        {/* Action buttons */}
        <div className="flex gap-2">
          <button
            onClick={() => printPackingSlip(order)}
            className="flex-1 min-h-[44px] rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-sm font-semibold hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors cursor-pointer"
          >
            🖨 Print Slip
          </button>
          {order.status !== 'cancelled' && (
            <button
              onClick={() => {
                if (window.confirm(`Cancel order for ${order.customerName || 'this customer'}?`)) {
                  onCancel?.(order.id);
                }
              }}
              className="min-h-[44px] px-4 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm font-semibold hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors cursor-pointer"
            >
              Cancel
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}
