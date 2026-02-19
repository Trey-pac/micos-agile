import { useState } from 'react';
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
  if (!ts?.seconds) return '—';
  return new Date(ts.seconds * 1000).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric',
  });
}

function itemSummary(items) {
  if (!items?.length) return 'No items';
  const preview = items.slice(0, 2).map((i) => `${i.quantity}× ${i.name}`).join(', ');
  return items.length > 2 ? `${preview} +${items.length - 2} more` : preview;
}

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
          {/* Customer */}
          <p className="font-bold text-gray-800 dark:text-gray-100 text-sm truncate">
            {order.customerName || order.customerId}
          </p>
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

export default function OrderManager({ orders = [], onAdvanceStatus, loading = false }) {
  const [activeTab, setActiveTab] = useState('new');
  if (loading) return <OrderManagerSkeleton />;

  const countByStatus = STATUS_TABS.reduce((acc, t) => {
    acc[t.key] = orders.filter((o) => o.status === t.key).length;
    return acc;
  }, {});

  const visible = orders.filter((o) => o.status === activeTab);

  const totalActive = orders.filter(
    (o) => o.status !== 'delivered' && o.status !== 'cancelled'
  ).length;

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-5">
        <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">Orders</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {totalActive} active order{totalActive !== 1 ? 's' : ''} · {orders.length} total
        </p>
      </div>

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
