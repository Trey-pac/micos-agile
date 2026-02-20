import { useState, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { NEXT_STATUS } from '../services/orderService';
import { OrderManagerSkeleton } from './ui/Skeletons';

const STATUS_TABS = [
  { key: 'new',        label: 'New',        color: 'bg-blue-100 text-blue-700' },
  { key: 'confirmed',  label: 'Confirmed',  color: 'bg-indigo-100 text-indigo-700' },
  { key: 'harvesting', label: 'Harvesting', color: 'bg-amber-100 text-amber-700' },
  { key: 'packed',     label: 'Packed',     color: 'bg-orange-100 text-orange-700' },
  { key: 'delivered',  label: 'Delivered',  color: 'bg-green-100 text-green-700' },
];

const NEXT_LABEL = {
  new: 'Confirm →',
  confirmed: 'Start Harvesting →',
  harvesting: 'Mark Packed →',
  packed: 'Mark Delivered →',
};

function formatDate(ts) {
  if (!ts) return '—';
  // Handle Firestore Timestamp, ISO string, or Date
  const date = ts?.seconds ? new Date(ts.seconds * 1000) : ts?.toDate ? ts.toDate() : new Date(ts);
  if (isNaN(date)) return '—';
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function itemSummary(items) {
  if (!items?.length) return 'No items';
  const preview = items.slice(0, 2).map((i) => `${i.quantity}× ${i.name || i.title}`).join(', ');
  return items.length > 2 ? `${preview} +${items.length - 2} more` : preview;
}

const SOURCE_BADGE = {
  shopify: { label: '🛍 Shopify', cls: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-200 dark:border-green-700' },
  manual:  { label: '✏️ Manual',  cls: 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-600' },
  app:     { label: '📱 App',     cls: 'bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-700' },
};

const SEGMENT_BADGE = {
  chef:         { label: '🍳 Chef',       cls: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-700' },
  subscription: { label: '🔄 Sub',        cls: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-700' },
  retail:       { label: '🛒 Retail',     cls: 'bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-700' },
};

function OrderCard({ order, onAdvance }) {
  const [loading, setLoading] = useState(false);
  const nextStatus = NEXT_STATUS[order.status];

  const handleAdvance = async () => {
    if (!nextStatus) return;
    setLoading(true);
    try { await onAdvance(order.id, nextStatus); } finally { setLoading(false); }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          {/* Customer + source badge */}
          <div className="flex items-center gap-2 mb-0.5">
            <p className="font-bold text-gray-800 dark:text-gray-100 text-sm truncate">
              {order.customerName || order.customerId}
            </p>
            {(() => {
              const badge = SOURCE_BADGE[order.source] || SOURCE_BADGE.app;
              return (
                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border shrink-0 ${badge.cls}`}>
                  {badge.label}
                </span>
              );
            })()}
            {order.shopifySegment && (() => {
              const seg = SEGMENT_BADGE[order.shopifySegment];
              return seg ? (
                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border shrink-0 ${seg.cls}`}>
                  {seg.label}
                </span>
              ) : null;
            })()}
            {order.shopifyOrderName && (
              <span className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 shrink-0">
                {order.shopifyOrderName}
              </span>
            )}
          </div>
          {order.customerEmail && (
            <p className="text-xs text-gray-400 dark:text-gray-500 truncate">{order.customerEmail}</p>
          )}
          {/* Items */}
          <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">{itemSummary(order.items)}</p>
          {/* Dates */}
          <div className="flex gap-3 mt-1">
            <span className="text-xs text-gray-400 dark:text-gray-500">Placed: {formatDate(order.createdAt)}</span>
            {order.requestedDeliveryDate && (
              <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                Deliver: {order.requestedDeliveryDate}
              </span>
            )}
          </div>
          {/* Special instructions */}
          {order.specialInstructions && (
            <p className="text-xs text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-800 rounded-lg px-3 py-1.5 mt-2">
              Note: {order.specialInstructions}
            </p>
          )}
        </div>

        {/* Total + advance */}
        <div className="text-right shrink-0">
          <p className="font-bold text-gray-800 dark:text-gray-100">${order.total?.toFixed(2)}</p>
          {nextStatus && (
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={handleAdvance}
              disabled={loading}
              className="mt-2 text-xs font-semibold bg-green-600 text-white px-4 py-2.5 min-h-[44px] rounded-lg hover:bg-green-700 disabled:opacity-50 cursor-pointer whitespace-nowrap"
            >
              {loading ? '…' : NEXT_LABEL[order.status]}
            </motion.button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function OrderManager({ orders = [], onAdvanceStatus, loading = false, shopifyOrders = [] }) {
  const [activeTab, setActiveTab] = useState('new');
  const [segmentFilter, setSegmentFilter] = useState('all');
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState(null);

  const handleShopifySync = useCallback(async () => {
    setSyncing(true);
    setSyncResult(null);
    try {
      const res = await fetch('/api/shopifySync?days=7');
      const data = await res.json();
      if (data.success) {
        setSyncResult({ ok: true, msg: `Synced ${data.created} new, ${data.updated} updated from ${data.fetched} Shopify orders` });
      } else {
        setSyncResult({ ok: false, msg: data.error || 'Sync failed' });
      }
    } catch (err) {
      setSyncResult({ ok: false, msg: err.message });
    } finally {
      setSyncing(false);
      setTimeout(() => setSyncResult(null), 6000);
    }
  }, []);

  // Build segment lookup from Shopify orders
  const segmentMap = useMemo(() => {
    const map = {};
    for (const so of shopifyOrders) {
      const email = (so.customerEmail || '').toLowerCase();
      if (email && so.segment) map[email] = so.segment;
    }
    return map;
  }, [shopifyOrders]);

  // Enrich orders with segment info
  const enrichedOrders = useMemo(() =>
    orders.map(o => ({
      ...o,
      shopifySegment: segmentMap[(o.customerEmail || '').toLowerCase()] || null,
    })),
    [orders, segmentMap]
  );

  if (loading) return <OrderManagerSkeleton />;

  const countByStatus = STATUS_TABS.reduce((acc, t) => {
    acc[t.key] = enrichedOrders.filter((o) => o.status === t.key).length;
    return acc;
  }, {});

  // Apply segment filter
  let filteredBySegment = enrichedOrders;
  if (segmentFilter !== 'all') {
    filteredBySegment = enrichedOrders.filter(o => o.shopifySegment === segmentFilter);
  }

  const visible = filteredBySegment.filter((o) => o.status === activeTab);

  const totalActive = enrichedOrders.filter(
    (o) => o.status !== 'delivered' && o.status !== 'cancelled'
  ).length;

  const shopifyCount = orders.filter(o => o.source === 'shopify').length;

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-end justify-between mb-5">
        <div>
          <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">Orders</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {totalActive} active · {orders.length} total
            {shopifyCount > 0 && <span className="text-green-600 dark:text-green-400"> · {shopifyCount} from Shopify</span>}
          </p>
        </div>
        <button
          onClick={handleShopifySync}
          disabled={syncing}
          className="flex items-center gap-1.5 px-4 py-2.5 min-h-[44px] rounded-xl text-sm font-semibold bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 cursor-pointer transition-all whitespace-nowrap"
        >
          {syncing ? (
            <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            '🛍'
          )}
          {syncing ? 'Syncing…' : 'Sync Shopify'}
        </button>
      </div>

      {/* Sync result toast */}
      {syncResult && (
        <div className={`mb-3 px-4 py-2.5 rounded-xl text-sm font-medium ${
          syncResult.ok
            ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-700'
            : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-700'
        }`}>
          {syncResult.ok ? '✅' : '❌'} {syncResult.msg}
        </div>
      )}

      {/* Status tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-4 -mx-1 px-1">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-1.5 px-4 py-2.5 min-h-[44px] rounded-xl text-sm font-semibold whitespace-nowrap transition-all cursor-pointer ${
              activeTab === tab.key
                ? 'bg-green-600 text-white shadow-sm dark:shadow-gray-900/30'
                : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-green-300'
            }`}
          >
            {tab.label}
            {countByStatus[tab.key] > 0 && (
              <span className={`text-xs font-bold rounded-full px-1.5 py-0.5 leading-none ${
                activeTab === tab.key ? 'bg-white/25 text-white' : tab.color
              }`}>
                {countByStatus[tab.key]}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Segment filter */}
      <div className="flex gap-1.5 mb-4">
        {[
          { key: 'all', label: 'All Segments' },
          { key: 'chef', label: '🍳 Chef' },
          { key: 'subscription', label: '🔄 Sub' },
          { key: 'retail', label: '🛒 Retail' },
        ].map(s => (
          <button
            key={s.key}
            onClick={() => setSegmentFilter(s.key)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              segmentFilter === s.key
                ? 'bg-gray-800 dark:bg-gray-200 text-white dark:text-gray-800'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* Order cards */}
      {visible.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-4xl mb-3">
            {activeTab === 'delivered' ? '✅' : '📭'}
          </p>
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            {activeTab === 'delivered'
              ? 'No delivered orders yet.'
              : `No ${activeTab} orders right now.`}
          </p>
        </div>
      ) : (
        <motion.div initial="hidden" animate="visible" variants={{ visible: { transition: { staggerChildren: 0.05 } } }} className="space-y-3">
          {visible.map((order) => (
            <motion.div key={order.id} variants={{ hidden: { opacity: 0, y: 8 }, visible: { opacity: 1, y: 0, transition: { duration: 0.2 } } }}>
              <OrderCard order={order} onAdvance={onAdvanceStatus} />
            </motion.div>
          ))}
        </motion.div>
      )}
    </div>
  );
}
