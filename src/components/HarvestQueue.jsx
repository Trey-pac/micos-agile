import { useState, useMemo, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { saveHarvestChecklist, loadHarvestChecklist } from '../services/orderService';
import { HarvestQueueSkeleton } from './ui/Skeletons';

// ── Yield per tray (oz) — hardcoded reference ──────────────────────────────

const YIELD_PER_TRAY = {
  'Sunflower':   16,
  'Pea Shoots':  16,
  'Radish':      11,
  'Broccoli':    6.5,
  'Basil':       3.5,
  'Cilantro':    5,
  'Kale':        8,
  'Arugula':     10,
};

const DEFAULT_YIELD = 8; // fallback oz/tray for unknown products

// ── Helpers ─────────────────────────────────────────────────────────────────

function todayStr() {
  return new Date().toISOString().split('T')[0];
}

function relativeDay(dateStr) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(dateStr + 'T00:00:00');
  const diff = Math.round((d - today) / 86400000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  if (diff < 0) return `${Math.abs(diff)}d ago`;
  return `in ${diff}d`;
}

/**
 * Aggregate order line items by product for a set of orders.
 * Returns sorted array: [{ product, totalOz, yieldPerTray, traysNeeded, orders[] }]
 */
function aggregateByProduct(orders) {
  const map = {};
  for (const o of orders) {
    for (const item of (o.items || [])) {
      const name = item.name || item.title || item.productName || 'Unknown';
      const qty = Number(item.quantity || item.qty || 0);
      if (!map[name]) {
        map[name] = { product: name, totalOz: 0, orders: new Set() };
      }
      map[name].totalOz += qty;
      map[name].orders.add(o.customerName || o.customerId || 'Unknown');
    }
  }
  return Object.values(map)
    .map(p => {
      const yieldPerTray = YIELD_PER_TRAY[p.product] || DEFAULT_YIELD;
      const traysNeeded = Math.ceil((p.totalOz / yieldPerTray) * 1.15); // 15% buffer
      return {
        ...p,
        yieldPerTray,
        traysNeeded,
        orders: [...p.orders],
      };
    })
    .sort((a, b) => b.traysNeeded - a.traysNeeded);
}

function groupByDate(orders) {
  const map = {};
  for (const o of orders) {
    const d = o.requestedDeliveryDate || 'unscheduled';
    if (!map[d]) map[d] = [];
    map[d].push(o);
  }
  return Object.entries(map).sort(([a], [b]) => a.localeCompare(b));
}

// ── Product Row ─────────────────────────────────────────────────────────────

function ProductRow({ item, checked, onToggle }) {
  return (
    <label className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors cursor-pointer select-none">
      <input
        type="checkbox"
        checked={checked}
        onChange={onToggle}
        className="w-5 h-5 rounded border-gray-300 dark:border-gray-600 text-green-600 focus:ring-green-500 cursor-pointer shrink-0"
      />
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium ${checked ? 'line-through text-gray-400 dark:text-gray-500' : 'text-gray-800 dark:text-gray-100'}`}>
          {item.product}
        </p>
        <p className="text-xs text-gray-400 dark:text-gray-500">
          {item.orders.length} customer{item.orders.length !== 1 ? 's' : ''}
        </p>
      </div>
      <div className="flex items-center gap-3 shrink-0 text-right">
        <div>
          <p className="text-sm font-bold text-gray-700 dark:text-gray-200">{item.totalOz} oz</p>
          <p className="text-[10px] text-gray-400">{item.yieldPerTray} oz/tray</p>
        </div>
        <div className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 px-2.5 py-1 rounded-lg text-center min-w-[52px]">
          <p className="text-sm font-bold">{item.traysNeeded}</p>
          <p className="text-[9px] font-medium">trays</p>
        </div>
      </div>
    </label>
  );
}

// ── Date Group ──────────────────────────────────────────────────────────────

function DateGroup({ date, orders, products, checkedItems, onToggle, onMarkAll, marking }) {
  const checkedCount = products.filter(p => checkedItems[p.product]).length;
  const allChecked = products.length > 0 && checkedCount === products.length;
  const totalTrays = products.reduce((s, p) => s + p.traysNeeded, 0);

  return (
    <div className="mb-6">
      {/* Date header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <h3 className="font-bold text-gray-800 dark:text-gray-100">{date}</h3>
          <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 font-medium">
            {relativeDay(date)}
          </span>
          <span className="text-xs text-gray-400">
            {orders.length} orders · {totalTrays} trays
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400 dark:text-gray-500">{checkedCount}/{products.length}</span>
          {allChecked ? (
            <span className="text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300">
              ✓ All Harvested
            </span>
          ) : (
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={onMarkAll}
              disabled={marking}
              className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 cursor-pointer transition-colors min-h-[36px]"
            >
              {marking ? 'Marking…' : '✓ Mark All Harvested'}
            </motion.button>
          )}
        </div>
      </div>

      {/* Progress bar */}
      <div className="w-full h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full mb-3 overflow-hidden">
        <div
          className="h-full bg-green-500 rounded-full transition-all duration-300"
          style={{ width: `${products.length > 0 ? (checkedCount / products.length) * 100 : 0}%` }}
        />
      </div>

      {/* Product checklist */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden divide-y divide-gray-100 dark:divide-gray-700/50">
        {products.map(item => (
          <ProductRow
            key={item.product}
            item={item}
            checked={!!checkedItems[item.product]}
            onToggle={() => onToggle(item.product)}
          />
        ))}
        {products.length === 0 && (
          <p className="text-xs text-gray-400 dark:text-gray-500 text-center py-6">No items for this date.</p>
        )}
      </div>

      {/* Customer summary */}
      <div className="mt-2 flex gap-2 flex-wrap">
        {orders.map(o => (
          <span key={o.id} className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400">
            {o.customerName || 'Customer'} · {o.items?.length || 0} items
          </span>
        ))}
      </div>
    </div>
  );
}

// ── Main Component ──────────────────────────────────────────────────────────

export default function HarvestQueue({ farmId, orders = [], loading = false }) {
  const [selectedDate, setSelectedDate] = useState(todayStr());
  const [checkedItems, setCheckedItems] = useState({}); // { date: { product: bool } }
  const [marking, setMarking] = useState(false);
  const [datePickerOpen, setDatePickerOpen] = useState(false);

  if (loading) return <HarvestQueueSkeleton />;

  // Actionable orders (confirmed or harvesting)
  const actionableOrders = useMemo(() =>
    orders.filter(o => ['confirmed', 'harvesting'].includes(o.status)),
    [orders]
  );

  const dateGroups = useMemo(() => groupByDate(actionableOrders), [actionableOrders]);

  // Load checklist from Firestore when date changes
  useEffect(() => {
    if (!farmId) return;
    const dates = dateGroups.map(([d]) => d);
    // Load all visible dates
    for (const date of dates) {
      if (!checkedItems[date]) {
        loadHarvestChecklist(farmId, date).then(items => {
          if (Object.keys(items).length > 0) {
            setCheckedItems(prev => ({ ...prev, [date]: items }));
          }
        }).catch(console.error);
      }
    }
  }, [farmId, dateGroups.length]); // eslint-disable-line react-hooks/exhaustive-deps

  // Toggle a product checked state + persist
  const handleToggle = useCallback((date, product) => {
    setCheckedItems(prev => {
      const dateItems = { ...(prev[date] || {}) };
      dateItems[product] = !dateItems[product];
      // Persist to Firestore (fire-and-forget)
      if (farmId) saveHarvestChecklist(farmId, date, dateItems).catch(console.error);
      return { ...prev, [date]: dateItems };
    });
  }, [farmId]);

  // Mark all products for a date as harvested
  const handleMarkAll = useCallback(async (date, products) => {
    setMarking(true);
    const dateItems = {};
    for (const p of products) dateItems[p.product] = true;
    setCheckedItems(prev => ({ ...prev, [date]: dateItems }));
    if (farmId) {
      await saveHarvestChecklist(farmId, date, dateItems).catch(console.error);
    }
    setMarking(false);
  }, [farmId]);

  // Count totals
  const totalProducts = dateGroups.reduce((sum, [, ords]) => {
    return sum + aggregateByProduct(ords).length;
  }, 0);
  const totalChecked = Object.values(checkedItems).reduce((sum, dateMap) => {
    return sum + Object.values(dateMap).filter(Boolean).length;
  }, 0);

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-5">
        <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">🌱 Harvest Queue</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {totalChecked}/{totalProducts} products harvested · {actionableOrders.length} orders
        </p>
      </div>

      {/* Date picker */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-4 -mx-1 px-1">
        {dateGroups.map(([date]) => (
          <button
            key={date}
            onClick={() => setSelectedDate(date)}
            className={`px-4 py-2 min-h-[44px] rounded-xl text-sm font-semibold whitespace-nowrap transition-all cursor-pointer ${
              selectedDate === date
                ? 'bg-green-600 text-white shadow-sm'
                : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-green-300'
            }`}
          >
            {date}{' '}
            <span className="text-xs opacity-80">{relativeDay(date)}</span>
          </button>
        ))}
        {dateGroups.length === 0 && (
          <p className="text-xs text-gray-400 dark:text-gray-500 py-2">No delivery dates with orders awaiting harvest.</p>
        )}
      </div>

      {/* Empty state */}
      {dateGroups.length === 0 && (
        <div className="text-center py-20">
          <p className="text-4xl mb-3">📭</p>
          <p className="text-gray-500 dark:text-gray-400 text-sm">No confirmed or harvesting orders.</p>
          <p className="text-gray-400 dark:text-gray-500 text-xs mt-1">Orders will show here once confirmed.</p>
        </div>
      )}

      {/* Date groups */}
      {dateGroups
        .filter(([date]) => !selectedDate || date === selectedDate)
        .map(([date, dateOrders]) => {
          const products = aggregateByProduct(dateOrders);
          return (
            <DateGroup
              key={date}
              date={date}
              orders={dateOrders}
              products={products}
              checkedItems={checkedItems[date] || {}}
              onToggle={(product) => handleToggle(date, product)}
              onMarkAll={() => handleMarkAll(date, products)}
              marking={marking}
            />
          );
        })}
    </div>
  );
}
