import { useState, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { ShoppingBag, Pencil, Smartphone, UtensilsCrossed, RefreshCw, ShoppingCart, CheckCircle, MailX } from 'lucide-react';
import { Badge } from './ui/Badge';
import { Button } from './ui/Button';
import { Card, CardContent } from './ui/Card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from './ui/Tabs';
import { NEXT_STATUS } from '../services/orderService';
import { OrderManagerSkeleton } from './ui/Skeletons';
import { getAuth } from 'firebase/auth';

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

import { formatShort as formatDate } from '../utils/dateUtils';

function itemSummary(items) {
  if (!items?.length) return 'No items';
  const preview = items.slice(0, 2).map((i) => `${i.quantity}× ${i.name || i.title}`).join(', ');
  return items.length > 2 ? `${preview} +${items.length - 2} more` : preview;
}

const SOURCE_BADGE = {
  shopify: { label: 'Shopify', icon: ShoppingBag, cls: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-200 dark:border-green-700' },
  manual:  { label: 'Manual',  icon: Pencil,      cls: 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-600' },
  app:     { label: 'App',     icon: Smartphone,  cls: 'bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-700' },
};

const SEGMENT_BADGE = {
  chef:         { label: 'Chef',       icon: UtensilsCrossed, cls: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-700' },
  subscription: { label: 'Sub',        icon: RefreshCw,       cls: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-700' },
  retail:       { label: 'Retail',     icon: ShoppingCart,    cls: 'bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-700' },
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
    <Card className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          {/* Customer + source badge */}
          <div className="flex items-center gap-2 mb-0.5">
            <p className="font-bold text-gray-800 dark:text-gray-100 text-sm truncate">
              {order.customerName || order.customerId}
            </p>
            {(() => {
              const badge = SOURCE_BADGE[order.source] || SOURCE_BADGE.app;
              const IconComp = badge.icon;
              return (
                <Badge variant="outline" className={`text-[9px] ${badge.cls}`}>
                  <IconComp className="w-3 h-3 mr-0.5" />{badge.label}
                </Badge>
              );
            })()}
            {order.shopifySegment && (() => {
              const seg = SEGMENT_BADGE[order.shopifySegment];
              if (!seg) return null;
              const SegIcon = seg.icon;
              return (
                <Badge variant="outline" className={`text-[9px] ${seg.cls}`}>
                  <SegIcon className="w-3 h-3 mr-0.5" />{seg.label}
                </Badge>
              );
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
            <Button
              onClick={handleAdvance}
              disabled={loading}
              size="sm"
              className="mt-2 min-h-[44px] whitespace-nowrap"
            >
              {loading ? '…' : NEXT_LABEL[order.status]}
            </Button>
          )}
        </div>
      </div>
    </Card>
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
      const token = await getAuth().currentUser?.getIdToken();
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      // Sync orders, products, and customers in parallel via modern GraphQL endpoints
      const [ordersRes, productsRes, customersRes] = await Promise.all([
        fetch('/api/shopify-sync-orders', { headers }),
        fetch('/api/shopify-sync-products', { headers }),
        fetch('/api/shopify-sync-customers', { headers }),
      ]);
      const ordersData = await ordersRes.json();
      const productsData = await productsRes.json();
      const customersData = await customersRes.json();

      const parts = [];
      if (ordersData.success) parts.push(`${ordersData.count} orders + ${ordersData.draftCount} drafts`);
      if (productsData.success) parts.push(`${productsData.count || 0} products`);
      if (customersData.success) parts.push(`${customersData.count || 0} customers`);

      const anyFailed = !ordersData.success || !productsData.success || !customersData.success;
      if (parts.length > 0) {
        setSyncResult({ ok: !anyFailed, msg: `Synced: ${parts.join(', ')}${anyFailed ? ' (some failed)' : ''}` });
      } else {
        setSyncResult({ ok: false, msg: ordersData.error || 'Sync failed' });
      }
    } catch (err) {
      setSyncResult({ ok: false, msg: err.message });
    } finally {
      setSyncing(false);
      setTimeout(() => setSyncResult(null), 8000);
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
        <Button
          onClick={handleShopifySync}
          disabled={syncing}
          className="min-h-[44px] whitespace-nowrap"
        >
          {syncing ? (
            <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <ShoppingBag className="w-4 h-4 mr-1" />
          )}
          {syncing ? 'Syncing…' : 'Sync Shopify'}
        </Button>
      </div>

      {/* Sync result toast */}
      {syncResult && (
        <div className={`mb-3 px-4 py-2.5 rounded-xl text-sm font-medium ${
          syncResult.ok
            ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-700'
            : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-700'
        }`}>
          {syncResult.ok ? <CheckCircle className="w-4 h-4 inline mr-1" /> : <span>❌</span>} {syncResult.msg}
        </div>
      )}

      {/* Status tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-4">
        <TabsList className="overflow-x-auto pb-2 -mx-1 px-1 h-auto flex-wrap">
          {STATUS_TABS.map((tab) => (
            <TabsTrigger key={tab.key} value={tab.key} className="min-h-[44px] gap-1.5">
              {tab.label}
              {countByStatus[tab.key] > 0 && (
                <Badge variant="secondary" className={`text-xs ${activeTab === tab.key ? 'bg-white/25 text-white' : tab.color}`}>
                  {countByStatus[tab.key]}
                </Badge>
              )}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {/* Segment filter */}
      <div className="flex gap-1.5 mb-4">
        {[
          { key: 'all', label: 'All Segments' },
          { key: 'chef', label: 'Chef', icon: UtensilsCrossed },
          { key: 'subscription', label: 'Sub', icon: RefreshCw },
          { key: 'retail', label: 'Retail', icon: ShoppingCart },
        ].map(s => (
          <Button
            key={s.key}
            variant={segmentFilter === s.key ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSegmentFilter(s.key)}
            className={segmentFilter === s.key ? 'bg-gray-800 dark:bg-gray-200 text-white dark:text-gray-800' : ''}
          >
            {s.icon && <s.icon className="w-3 h-3 mr-1" />}
            {s.label}
          </Button>
        ))}
      </div>

      {/* Order cards */}
      {visible.length === 0 ? (
        <div className="text-center py-16">
          <div className="mb-3">
            {activeTab === 'delivered' ? <CheckCircle className="w-10 h-10 mx-auto text-green-400" /> : <MailX className="w-10 h-10 mx-auto text-gray-400" />}
          </div>
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
