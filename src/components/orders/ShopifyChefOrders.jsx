import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const FINANCIAL_CLS = {
  PAID:             'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300',
  PENDING:          'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300',
  AUTHORIZED:       'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300',
  VOIDED:           'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400',
  REFUNDED:         'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-300',
  PARTIALLY_PAID:   'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300',
};

function formatCurrency(val) {
  return '$' + (val || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch { return dateStr; }
}

function isInvoiceSent(order) {
  const status = (order.financialStatus || '').toUpperCase();
  return status === 'PENDING' || status === 'AUTHORIZED';
}

/** Build month options from order dates */
function getMonthOptions(orders) {
  const months = new Set();
  for (const o of orders) {
    if (!o.createdAt) continue;
    try {
      const d = new Date(o.createdAt);
      months.add(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
    } catch { /* skip */ }
  }
  return [...months].sort().reverse().map(m => {
    const [y, mo] = m.split('-');
    const label = new Date(+y, +mo - 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    return { value: m, label };
  });
}

/** Single order row inside an expanded restaurant */
function OrderRow({ order, expanded, onToggle }) {
  const invoicePending = isInvoiceSent(order);

  return (
    <div className={`border-b border-gray-100 dark:border-gray-700/50 last:border-0 ${
      invoicePending ? 'bg-amber-50/50 dark:bg-amber-900/10' : ''
    }`}>
      <button onClick={onToggle} className="w-full text-left px-4 py-3 flex items-center gap-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
        {/* Date */}
        <span className="text-xs text-gray-400 dark:text-gray-500 w-16 shrink-0">{formatDate(order.createdAt)}</span>

        {/* Order # */}
        <span className="text-xs font-semibold text-gray-600 dark:text-gray-300 w-20 shrink-0">
          {order.shopifyOrderName || order.shopifyDraftOrderName || '#—'}
        </span>

        {/* Items summary */}
        <span className="text-xs text-gray-500 dark:text-gray-400 flex-1 truncate">
          {order.items?.length || 0} items
        </span>

        {/* Badges */}
        {invoicePending && (
          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-300 shrink-0">
            ⚠️ Unpaid
          </span>
        )}
        {order.financialStatus && (
          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded shrink-0 ${
            FINANCIAL_CLS[order.financialStatus.toUpperCase()] || 'bg-gray-100 dark:bg-gray-700 text-gray-500'
          }`}>
            {order.financialStatus}
          </span>
        )}

        {/* Total */}
        <span className="text-sm font-bold text-gray-700 dark:text-gray-200 w-20 text-right shrink-0">
          {formatCurrency(order.total)}
        </span>

        {/* Chevron */}
        <svg className={`w-4 h-4 text-gray-400 transition-transform shrink-0 ${expanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Expanded line items */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-3 pl-10">
              {order.items?.length > 0 ? (
                <div className="space-y-1">
                  {order.items.map((item, i) => (
                    <div key={i} className="flex items-center justify-between text-xs">
                      <span className="text-gray-600 dark:text-gray-300 truncate">
                        {item.quantity}× {item.title}
                        {item.variantTitle && item.variantTitle !== 'Default Title' && (
                          <span className="text-gray-400 dark:text-gray-500"> ({item.variantTitle})</span>
                        )}
                      </span>
                      <span className="text-gray-500 dark:text-gray-400 font-medium shrink-0 ml-3">
                        {formatCurrency(item.lineTotal || (item.price * item.quantity))}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-gray-400 dark:text-gray-500">No line items</p>
              )}
              {order.note && (
                <p className="mt-2 text-[11px] text-gray-400 dark:text-gray-500 italic">Note: {order.note}</p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/** Accordion row for a restaurant — click to expand/collapse orders */
function RestaurantRow({ group, isOpen, onToggle, expandedOrderId, onToggleOrder }) {
  const invoiceCount = group.orders.filter(isInvoiceSent).length;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
      {/* Restaurant header — always visible */}
      <button
        onClick={onToggle}
        className="w-full text-left px-4 py-3.5 flex items-center gap-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors min-h-[52px]"
      >
        <span className="text-lg shrink-0">🏪</span>
        <div className="flex-1 min-w-0">
          <span className="font-bold text-gray-800 dark:text-gray-100 text-sm">{group.name}</span>
        </div>

        {invoiceCount > 0 && (
          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-300 shrink-0">
            ⚠️ {invoiceCount} unpaid
          </span>
        )}

        <span className="text-xs text-gray-400 dark:text-gray-500 shrink-0">
          {group.orders.length} {group.orders.length === 1 ? 'order' : 'orders'}
        </span>

        <span className="text-sm font-bold text-gray-700 dark:text-gray-200 shrink-0 w-20 text-right">
          {formatCurrency(group.total)}
        </span>

        <svg className={`w-4 h-4 text-gray-400 transition-transform shrink-0 ${isOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Expanded order list */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden border-t border-gray-100 dark:border-gray-700"
          >
            {group.orders.map(order => (
              <OrderRow
                key={order.id}
                order={order}
                expanded={expandedOrderId === order.id}
                onToggle={() => onToggleOrder(order.id)}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function ShopifyChefOrders({ shopifyOrders = [], loading = false }) {
  const [openRestaurant, setOpenRestaurant] = useState(null);
  const [expandedOrderId, setExpandedOrderId] = useState(null);
  const [search, setSearch] = useState('');
  const [monthFilter, setMonthFilter] = useState('all');
  const [showInvoiceOnly, setShowInvoiceOnly] = useState(false);

  // All chef orders (no replacements)
  const allChefOrders = useMemo(() =>
    shopifyOrders.filter(o => o.segment === 'chef' && !o.isReplacement),
    [shopifyOrders]
  );

  // Month options
  const monthOptions = useMemo(() => getMonthOptions(allChefOrders), [allChefOrders]);

  // Apply filters
  const filteredOrders = useMemo(() => {
    let list = allChefOrders;

    // Month filter
    if (monthFilter !== 'all') {
      list = list.filter(o => {
        if (!o.createdAt) return false;
        const d = new Date(o.createdAt);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        return key === monthFilter;
      });
    }

    // Invoice only
    if (showInvoiceOnly) {
      list = list.filter(isInvoiceSent);
    }

    return list;
  }, [allChefOrders, monthFilter, showInvoiceOnly]);

  // Group by restaurant, then apply name search
  const grouped = useMemo(() => {
    const map = {};
    for (const order of filteredOrders) {
      const key = order.restaurant || order.customerName || order.customerEmail || 'Unknown';
      if (!map[key]) map[key] = { name: key, orders: [], total: 0 };
      map[key].orders.push(order);
      map[key].total += order.total || 0;
    }
    let groups = Object.values(map).sort((a, b) => b.total - a.total);

    // Name search
    if (search.trim()) {
      const q = search.toLowerCase();
      groups = groups.filter(g => g.name.toLowerCase().includes(q));
    }

    return groups;
  }, [filteredOrders, search]);

  const totalInvoices = useMemo(() => filteredOrders.filter(isInvoiceSent).length, [filteredOrders]);

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto p-4">
        <div className="animate-pulse space-y-3">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-48" />
          <div className="h-12 bg-gray-200 dark:bg-gray-700 rounded-xl" />
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-14 bg-gray-200 dark:bg-gray-700 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-4">
        <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">🍳 Chef Orders</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {filteredOrders.length} orders · {grouped.length} restaurants
          {totalInvoices > 0 && (
            <span className="text-amber-600 dark:text-amber-400 font-semibold"> · {totalInvoices} unpaid</span>
          )}
        </p>
      </div>

      {/* Filters row */}
      <div className="flex flex-wrap gap-2 mb-4">
        {/* Search */}
        <div className="flex-1 min-w-[180px]">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search restaurant..."
            className="w-full px-3 py-2.5 min-h-[44px] rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 text-sm focus:outline-none focus:border-green-400 dark:focus:border-green-600 transition-colors"
          />
        </div>

        {/* Month filter */}
        <select
          value={monthFilter}
          onChange={(e) => setMonthFilter(e.target.value)}
          className="px-3 py-2.5 min-h-[44px] rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 text-sm cursor-pointer focus:outline-none focus:border-green-400"
        >
          <option value="all">All Months</option>
          {monthOptions.map(m => (
            <option key={m.value} value={m.value}>{m.label}</option>
          ))}
        </select>

        {/* Invoice toggle */}
        <button
          onClick={() => setShowInvoiceOnly(!showInvoiceOnly)}
          className={`px-4 py-2.5 min-h-[44px] rounded-xl text-sm font-semibold transition-all cursor-pointer whitespace-nowrap ${
            showInvoiceOnly
              ? 'bg-amber-500 text-white shadow-sm'
              : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-amber-300'
          }`}
        >
          ⚠️ Unpaid{totalInvoices > 0 ? ` (${totalInvoices})` : ''}
        </button>
      </div>

      {/* Restaurant list — accordion style */}
      {grouped.length === 0 ? (
        <div className="text-center py-16 text-gray-400 dark:text-gray-500">
          <p className="text-3xl mb-2">🍳</p>
          <p className="text-sm">{search ? 'No restaurants match your search' : 'No chef orders found'}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {grouped.map(group => (
            <RestaurantRow
              key={group.name}
              group={group}
              isOpen={openRestaurant === group.name}
              onToggle={() => {
                setOpenRestaurant(openRestaurant === group.name ? null : group.name);
                setExpandedOrderId(null);
              }}
              expandedOrderId={expandedOrderId}
              onToggleOrder={(id) => setExpandedOrderId(expandedOrderId === id ? null : id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
