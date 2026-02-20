import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const SEGMENT_BADGE = {
  chef:         { label: '🍳 Chef',       cls: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300' },
  subscription: { label: '🔄 Subscriber', cls: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300' },
  retail:       { label: '🛒 Retail',     cls: 'bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-300' },
};

const FINANCIAL_CLS = {
  PAID:             'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300',
  PENDING:          'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300',
  AUTHORIZED:       'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300',
  VOIDED:           'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400',
  REFUNDED:         'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-300',
  PARTIALLY_PAID:   'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300',
};

const FULFILLMENT_CLS = {
  FULFILLED:   'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300',
  UNFULFILLED: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300',
  PARTIALLY_FULFILLED: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300',
};

function formatCurrency(val) {
  return '$' + (val || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch { return dateStr; }
}

function isInvoiceSent(order) {
  const status = (order.financialStatus || '').toUpperCase();
  return status === 'PENDING' || status === 'AUTHORIZED';
}

function OrderCard({ order, expanded, onToggle }) {
  const invoicePending = isInvoiceSent(order);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-white dark:bg-gray-800 rounded-xl border transition-all ${
        invoicePending
          ? 'border-amber-300 dark:border-amber-600 shadow-sm'
          : 'border-gray-200 dark:border-gray-700'
      }`}
    >
      <button
        onClick={onToggle}
        className="w-full text-left p-4 cursor-pointer"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-bold text-gray-500 dark:text-gray-400">
                {order.shopifyOrderName || order.shopifyDraftOrderName || '#—'}
              </span>
              {order.orderType === 'draft' && (
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300">
                  Draft
                </span>
              )}
              {invoicePending && (
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-300 animate-pulse">
                  ⚠️ Invoice Sent
                </span>
              )}
            </div>
            <p className="text-xs text-gray-400 dark:text-gray-500">
              {formatDate(order.createdAt)}
              {order.items && ` · ${order.items.length} items`}
            </p>
          </div>

          <div className="text-right shrink-0">
            <p className="text-sm font-bold text-gray-700 dark:text-gray-200">
              {formatCurrency(order.total)}
            </p>
            <div className="flex gap-1 mt-1 justify-end">
              {order.financialStatus && (
                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                  FINANCIAL_CLS[order.financialStatus.toUpperCase()] || 'bg-gray-100 dark:bg-gray-700 text-gray-500'
                }`}>
                  {order.financialStatus}
                </span>
              )}
              {order.fulfillmentStatus && (
                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                  FULFILLMENT_CLS[order.fulfillmentStatus.toUpperCase()] || 'bg-gray-100 dark:bg-gray-700 text-gray-500'
                }`}>
                  {order.fulfillmentStatus}
                </span>
              )}
            </div>
          </div>
        </div>
      </button>

      {/* Expanded: line items */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 border-t border-gray-100 dark:border-gray-700 pt-3">
              {order.items?.length > 0 ? (
                <div className="space-y-1.5">
                  {order.items.map((item, i) => (
                    <div key={i} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-gray-400 dark:text-gray-500 text-xs shrink-0">{item.quantity}×</span>
                        <span className="text-gray-700 dark:text-gray-200 truncate">{item.title}</span>
                        {item.variantTitle && item.variantTitle !== 'Default Title' && (
                          <span className="text-[10px] text-gray-400 dark:text-gray-500 truncate">({item.variantTitle})</span>
                        )}
                      </div>
                      <span className="text-gray-600 dark:text-gray-300 font-medium shrink-0">
                        {formatCurrency(item.lineTotal || (item.price * item.quantity))}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-gray-400 dark:text-gray-500">No line items</p>
              )}

              {order.note && (
                <p className="mt-3 text-xs text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-900/50 rounded-lg px-3 py-2">
                  Note: {order.note}
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default function ShopifyChefOrders({ shopifyOrders = [], loading = false }) {
  const [expandedId, setExpandedId] = useState(null);
  const [showInvoiceOnly, setShowInvoiceOnly] = useState(false);

  // Filter to chef orders, exclude replacements
  const chefOrders = useMemo(() => {
    let list = shopifyOrders.filter(o =>
      o.segment === 'chef' && !o.isReplacement
    );
    if (showInvoiceOnly) {
      list = list.filter(o => isInvoiceSent(o));
    }
    return list;
  }, [shopifyOrders, showInvoiceOnly]);

  // Group by restaurant/customer
  const grouped = useMemo(() => {
    const map = {};
    for (const order of chefOrders) {
      const key = order.restaurant || order.customerName || order.customerEmail || 'Unknown';
      if (!map[key]) map[key] = { name: key, orders: [], total: 0 };
      map[key].orders.push(order);
      map[key].total += order.total || 0;
    }
    // Sort by total descending
    return Object.values(map).sort((a, b) => b.total - a.total);
  }, [chefOrders]);

  const invoiceCount = useMemo(() =>
    chefOrders.filter(o => isInvoiceSent(o)).length,
    [chefOrders]
  );

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto p-4">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-48" />
          {[1, 2, 3].map(i => (
            <div key={i} className="h-24 bg-gray-200 dark:bg-gray-700 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-end justify-between mb-4">
        <div>
          <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">🍳 Chef Orders</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {chefOrders.length} orders from {grouped.length} restaurants
            {invoiceCount > 0 && (
              <span className="text-amber-600 dark:text-amber-400 font-semibold"> · {invoiceCount} awaiting payment</span>
            )}
          </p>
        </div>
        <button
          onClick={() => setShowInvoiceOnly(!showInvoiceOnly)}
          className={`px-4 py-2.5 min-h-[44px] rounded-xl text-sm font-semibold transition-all cursor-pointer ${
            showInvoiceOnly
              ? 'bg-amber-500 text-white shadow-sm'
              : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-amber-300'
          }`}
        >
          {showInvoiceOnly ? '⚠️ Invoices Only' : '⚠️ Show Invoices'}
        </button>
      </div>

      {/* Grouped by restaurant */}
      {grouped.length === 0 ? (
        <div className="text-center py-16 text-gray-400 dark:text-gray-500">
          <p className="text-3xl mb-2">🍳</p>
          <p className="text-sm">No chef orders found</p>
        </div>
      ) : (
        <div className="space-y-6">
          {grouped.map(group => (
            <div key={group.name}>
              {/* Restaurant header */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-lg">🏪</span>
                  <h3 className="text-base font-bold text-gray-800 dark:text-gray-100">{group.name}</h3>
                  <span className="text-xs text-gray-400 dark:text-gray-500">
                    {group.orders.length} orders
                  </span>
                </div>
                <span className="text-sm font-bold text-gray-700 dark:text-gray-200">
                  {formatCurrency(group.total)}
                </span>
              </div>

              {/* Orders for this restaurant */}
              <div className="space-y-2">
                {group.orders.map(order => (
                  <OrderCard
                    key={order.id}
                    order={order}
                    expanded={expandedId === order.id}
                    onToggle={() => setExpandedId(expandedId === order.id ? null : order.id)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
