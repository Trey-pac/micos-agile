import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const SEGMENTS = [
  { key: 'all',          label: 'All',         icon: '👥' },
  { key: 'chef',         label: 'Chefs',       icon: '🍳' },
  { key: 'subscription', label: 'Subscribers',  icon: '🔄' },
  { key: 'retail',       label: 'Retail',       icon: '🛒' },
];

const SEGMENT_BADGE = {
  chef:         { label: '🍳 Chef',         cls: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300' },
  subscription: { label: '🔄 Subscriber',   cls: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300' },
  retail:       { label: '🛒 Retail',        cls: 'bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-300' },
};

function formatCurrency(val) {
  return '$' + (val || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function CustomerCard({ customer, onSelect, isSelected }) {
  const badge = SEGMENT_BADGE[customer.segment] || SEGMENT_BADGE.retail;

  return (
    <motion.button
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      onClick={() => onSelect(customer)}
      className={`w-full text-left p-4 rounded-xl border transition-all cursor-pointer ${
        isSelected
          ? 'border-green-400 dark:border-green-600 bg-green-50 dark:bg-green-900/20 shadow-md'
          : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-green-300 dark:hover:border-green-700 hover:shadow-sm'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          {/* Name + segment badge */}
          <div className="flex items-center gap-2 mb-1">
            <span className="font-bold text-gray-800 dark:text-gray-100 text-sm truncate">
              {customer.segment === 'chef' && customer.restaurant
                ? customer.restaurant
                : customer.name || customer.email || 'Unknown'}
            </span>
            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded shrink-0 ${badge.cls}`}>
              {badge.label}
            </span>
          </div>

          {/* Chef: show contact name under restaurant */}
          {customer.segment === 'chef' && customer.restaurant && customer.name && (
            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{customer.name}</p>
          )}

          {/* Email */}
          {customer.email && (
            <p className="text-xs text-gray-400 dark:text-gray-500 truncate">{customer.email}</p>
          )}
        </div>

        {/* Stats */}
        <div className="text-right shrink-0">
          <p className="text-sm font-bold text-gray-700 dark:text-gray-200">
            {formatCurrency(customer.totalSpent)}
          </p>
          <p className="text-[10px] text-gray-400 dark:text-gray-500">
            {customer.ordersCount || 0} orders
          </p>
        </div>
      </div>
    </motion.button>
  );
}

function CustomerDetail({ customer, orders }) {
  if (!customer) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400 dark:text-gray-500 text-sm">
        Select a customer to view details
      </div>
    );
  }

  const badge = SEGMENT_BADGE[customer.segment] || SEGMENT_BADGE.retail;
  const customerOrders = orders.filter(o => {
    const orderEmail = (o.customerEmail || '').toLowerCase();
    const custEmail = (customer.email || '').toLowerCase();
    return orderEmail && custEmail && orderEmail === custEmail;
  });

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2 mb-2">
          <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100">
            {customer.segment === 'chef' && customer.restaurant
              ? customer.restaurant
              : customer.name || 'Unknown'}
          </h3>
          <span className={`text-xs font-bold px-2 py-0.5 rounded ${badge.cls}`}>{badge.label}</span>
        </div>

        <div className="grid grid-cols-2 gap-3 text-sm">
          {customer.name && customer.restaurant && (
            <div>
              <span className="text-gray-400 dark:text-gray-500 text-xs">Contact</span>
              <p className="text-gray-700 dark:text-gray-200 font-medium">{customer.name}</p>
            </div>
          )}
          {customer.email && (
            <div>
              <span className="text-gray-400 dark:text-gray-500 text-xs">Email</span>
              <p className="text-gray-700 dark:text-gray-200">{customer.email}</p>
            </div>
          )}
          {customer.phone && (
            <div>
              <span className="text-gray-400 dark:text-gray-500 text-xs">Phone</span>
              <p className="text-gray-700 dark:text-gray-200">{customer.phone}</p>
            </div>
          )}
          {customer.address?.city && (
            <div>
              <span className="text-gray-400 dark:text-gray-500 text-xs">Location</span>
              <p className="text-gray-700 dark:text-gray-200">
                {[customer.address.city, customer.address.province].filter(Boolean).join(', ')}
              </p>
            </div>
          )}
          <div>
            <span className="text-gray-400 dark:text-gray-500 text-xs">Total Spent</span>
            <p className="text-gray-700 dark:text-gray-200 font-bold">{formatCurrency(customer.totalSpent)}</p>
          </div>
          <div>
            <span className="text-gray-400 dark:text-gray-500 text-xs">Orders</span>
            <p className="text-gray-700 dark:text-gray-200 font-bold">{customer.ordersCount || 0}</p>
          </div>
        </div>

        {customer.tags?.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-3">
            {customer.tags.map((tag, i) => (
              <span key={i} className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Order History */}
      <div className="p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
        <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-3">
          Order History ({customerOrders.length})
        </h4>
        {customerOrders.length === 0 ? (
          <p className="text-sm text-gray-400 dark:text-gray-500">No orders found for this customer</p>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {customerOrders.slice(0, 50).map(o => (
              <div key={o.id} className="flex items-center justify-between py-2 border-b border-gray-50 dark:border-gray-700/50 last:border-0">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-gray-600 dark:text-gray-300">
                      {o.shopifyOrderName || o.shopifyDraftOrderName || o.id}
                    </span>
                    {o.orderType === 'draft' && (
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300">
                        Draft
                      </span>
                    )}
                    {o.isReplacement && (
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300">
                        Replacement
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 dark:text-gray-500">
                    {o.createdAt ? new Date(o.createdAt).toLocaleDateString() : '—'}
                    {o.items && ` · ${o.items.length} items`}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-bold text-gray-700 dark:text-gray-200">
                    {formatCurrency(o.total)}
                  </p>
                  <p className="text-[10px] text-gray-400 dark:text-gray-500">
                    {o.financialStatus || o.status || '—'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function CustomerSegments({ shopifyCustomers = [], shopifyOrders = [], loading = false }) {
  const [activeSegment, setActiveSegment] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState(null);

  // Segment counts
  const counts = useMemo(() => {
    const c = { all: shopifyCustomers.length, chef: 0, subscription: 0, retail: 0 };
    for (const cust of shopifyCustomers) {
      const seg = cust.segment || 'retail';
      if (c[seg] !== undefined) c[seg]++;
    }
    return c;
  }, [shopifyCustomers]);

  // Filtered + searched
  const filtered = useMemo(() => {
    let list = shopifyCustomers;
    if (activeSegment !== 'all') {
      list = list.filter(c => c.segment === activeSegment);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(c =>
        (c.name || '').toLowerCase().includes(q) ||
        (c.email || '').toLowerCase().includes(q) ||
        (c.restaurant || '').toLowerCase().includes(q) ||
        (c.firstName || '').toLowerCase().includes(q) ||
        (c.lastName || '').toLowerCase().includes(q)
      );
    }
    return list;
  }, [shopifyCustomers, activeSegment, searchQuery]);

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto p-4">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-48" />
          <div className="h-12 bg-gray-200 dark:bg-gray-700 rounded" />
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="h-20 bg-gray-200 dark:bg-gray-700 rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-4">
        <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">Customers</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {shopifyCustomers.length} total from Shopify
        </p>
      </div>

      {/* Segment Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-4 -mx-1 px-1">
        {SEGMENTS.map(({ key, label, icon }) => (
          <button
            key={key}
            onClick={() => { setActiveSegment(key); setSelectedCustomer(null); }}
            className={`flex items-center gap-1.5 px-4 py-2.5 min-h-[44px] rounded-xl text-sm font-semibold whitespace-nowrap transition-all cursor-pointer ${
              activeSegment === key
                ? 'bg-green-600 text-white shadow-sm'
                : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-green-300'
            }`}
          >
            <span>{icon}</span>
            <span>{label}</span>
            <span className={`text-xs px-1.5 py-0.5 rounded-full ${
              activeSegment === key
                ? 'bg-white/20 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
            }`}>
              {counts[key]}
            </span>
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="mb-4">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by name, email, or restaurant..."
          className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 text-sm focus:outline-none focus:border-green-400 dark:focus:border-green-600 transition-colors"
        />
      </div>

      {/* Main content: list + detail */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Customer List */}
        <div className="lg:col-span-2 space-y-2 max-h-[70vh] overflow-y-auto">
          <AnimatePresence mode="popLayout">
            {filtered.length === 0 ? (
              <div className="text-center py-12 text-gray-400 dark:text-gray-500 text-sm">
                {searchQuery ? 'No customers match your search' : 'No customers in this segment'}
              </div>
            ) : (
              filtered.map(c => (
                <CustomerCard
                  key={c.id}
                  customer={c}
                  onSelect={setSelectedCustomer}
                  isSelected={selectedCustomer?.id === c.id}
                />
              ))
            )}
          </AnimatePresence>
        </div>

        {/* Customer Detail */}
        <div className="lg:col-span-3 sticky top-4">
          <CustomerDetail customer={selectedCustomer} orders={shopifyOrders} />
        </div>
      </div>
    </div>
  );
}
