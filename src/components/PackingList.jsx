import { useState, useMemo, useCallback } from 'react';
import { PackingListSkeleton } from './ui/Skeletons';

// ── Helpers ─────────────────────────────────────────────────────────────────

function today() {
  return new Date().toISOString().split('T')[0];
}

function groupOrdersByCustomer(orders) {
  const map = {};
  for (const o of orders) {
    const key = o.customerName || o.customerId || 'Unknown';
    if (!map[key]) map[key] = { customer: key, orders: [], totalItems: 0 };
    map[key].orders.push(o);
    map[key].totalItems += (o.items?.length || 0);
  }
  return Object.values(map).sort((a, b) => a.customer.localeCompare(b.customer));
}

// ── LineItem checkbox row ───────────────────────────────────────────────────

function PackItem({ item, checked, onToggle }) {
  return (
    <label className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer select-none">
      <input
        type="checkbox"
        checked={checked}
        onChange={onToggle}
        className="w-5 h-5 rounded border-gray-300 dark:border-gray-600 text-green-600 focus:ring-green-500 cursor-pointer shrink-0"
      />
      <span className={`flex-1 text-sm ${checked ? 'line-through text-gray-400 dark:text-gray-500' : 'text-gray-700 dark:text-gray-200'}`}>
        {item.quantity}× {item.name}
      </span>
      {item.unit && (
        <span className="text-xs text-gray-400 dark:text-gray-500 shrink-0">{item.unit}</span>
      )}
    </label>
  );
}

// ── Customer packing card ───────────────────────────────────────────────────

function CustomerCard({ group, checkedItems, onToggleItem, onMarkAllPacked, packingInProgress }) {
  const allItemKeys = group.orders.flatMap(o =>
    (o.items || []).map((_, i) => `${o.id}-${i}`)
  );
  const allChecked = allItemKeys.length > 0 && allItemKeys.every(k => checkedItems[k]);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden print:break-inside-avoid">
      {/* Customer header */}
      <div className="px-4 py-3 bg-gray-50/50 dark:bg-gray-700/50 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
        <div>
          <p className="font-bold text-gray-800 dark:text-gray-100 text-sm">{group.customer}</p>
          <p className="text-xs text-gray-400 dark:text-gray-500">
            {group.orders.length} order{group.orders.length !== 1 ? 's' : ''} · {group.totalItems} items
          </p>
        </div>
        {allChecked ? (
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-green-100 text-green-700">
            ✓ All packed
          </span>
        ) : (
          <button
            onClick={() => onMarkAllPacked(allItemKeys)}
            disabled={packingInProgress}
            className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 cursor-pointer transition-colors print:hidden"
          >
            Pack All
          </button>
        )}
      </div>

      {/* Orders + items */}
      {group.orders.map(order => (
        <div key={order.id} className="border-b border-gray-50 dark:border-gray-800 last:border-b-0">
          {group.orders.length > 1 && (
            <div className="px-4 pt-2 pb-0.5">
              <p className="text-[10px] uppercase font-medium text-gray-400 dark:text-gray-500 tracking-wide">
                Order #{order.id.slice(-6)}
                {order.specialInstructions && (
                  <span className="ml-2 normal-case tracking-normal text-amber-500">
                    ⚠ {order.specialInstructions}
                  </span>
                )}
              </p>
            </div>
          )}
          {order.specialInstructions && group.orders.length <= 1 && (
            <div className="px-4 pt-2">
              <p className="text-xs text-amber-600 bg-amber-50 rounded-lg px-3 py-1.5">
                ⚠ {order.specialInstructions}
              </p>
            </div>
          )}
          <div className="divide-y divide-gray-50">
            {(order.items || []).map((item, i) => {
              const key = `${order.id}-${i}`;
              return (
                <PackItem
                  key={key}
                  item={item}
                  checked={!!checkedItems[key]}
                  onToggle={() => onToggleItem(key)}
                />
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Main Component ──────────────────────────────────────────────────────────

export default function PackingList({ orders = [], onAdvanceStatus, loading = false }) {
  const [selectedDate, setSelectedDate] = useState(today());
  const [checkedItems, setCheckedItems] = useState({});
  const [advancing, setAdvancing] = useState(false);

  if (loading) return <PackingListSkeleton />;

  // All orders that have been harvested and are ready for packing, or already packed
  const packableOrders = useMemo(() =>
    orders.filter(o =>
      ['harvesting', 'packed'].includes(o.status) &&
      o.requestedDeliveryDate === selectedDate
    ),
    [orders, selectedDate]
  );

  // Unique delivery dates for the selector
  const availableDates = useMemo(() => {
    const dates = new Set(
      orders
        .filter(o => ['harvesting', 'packed', 'confirmed'].includes(o.status))
        .map(o => o.requestedDeliveryDate)
        .filter(Boolean)
    );
    return [...dates].sort();
  }, [orders]);

  const customerGroups = useMemo(() => groupOrdersByCustomer(packableOrders), [packableOrders]);

  const toggleItem = useCallback((key) => {
    setCheckedItems(prev => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const markAllPacked = useCallback((keys) => {
    setCheckedItems(prev => {
      const next = { ...prev };
      for (const k of keys) next[k] = true;
      return next;
    });
  }, []);

  // Count totals
  const totalItems = packableOrders.reduce((sum, o) => sum + (o.items?.length || 0), 0);
  const checkedCount = Object.values(checkedItems).filter(Boolean).length;

  // Mark all visible orders as packed
  const handleAdvanceAll = useCallback(async () => {
    if (!onAdvanceStatus) return;
    setAdvancing(true);
    try {
      const toPack = packableOrders.filter(o => o.status === 'harvesting');
      for (const o of toPack) {
        await onAdvanceStatus(o.id, 'packed');
      }
    } catch (err) {
      console.error('Failed to advance orders:', err);
    } finally {
      setAdvancing(false);
    }
  }, [packableOrders, onAdvanceStatus]);

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-5">
        <div>
          <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">📦 Packing List</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {checkedCount}/{totalItems} items packed · {packableOrders.length} orders
          </p>
        </div>
        <button
          onClick={() => window.print()}
          className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 cursor-pointer transition-colors print:hidden"
        >
          🖨 Print
        </button>
      </div>

      {/* Date selector */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-4 -mx-1 px-1 print:hidden">
        {availableDates.map(d => (
          <button
            key={d}
            onClick={() => { setSelectedDate(d); setCheckedItems({}); }}
            className={`px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition-all cursor-pointer ${
              selectedDate === d
                ? 'bg-green-600 text-white shadow-sm dark:shadow-gray-900/30'
                : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-green-300'
            }`}
          >
            {d}
          </button>
        ))}
        {availableDates.length === 0 && (
          <p className="text-xs text-gray-400 dark:text-gray-500">No delivery dates with packable orders.</p>
        )}
      </div>

      {/* Empty state */}
      {customerGroups.length === 0 && (
        <div className="text-center py-20">
          <p className="text-4xl mb-3">📦</p>
          <p className="text-gray-500 dark:text-gray-400 text-sm">No orders ready to pack for {selectedDate}.</p>
          <p className="text-gray-400 dark:text-gray-500 text-xs mt-1">Orders move here after harvesting.</p>
        </div>
      )}

      {/* Customer packing cards */}
      <div className="space-y-4">
        {customerGroups.map(group => (
          <CustomerCard
            key={group.customer}
            group={group}
            checkedItems={checkedItems}
            onToggleItem={toggleItem}
            onMarkAllPacked={markAllPacked}
            packingInProgress={advancing}
          />
        ))}
      </div>

      {/* Mark All Packed button */}
      {packableOrders.some(o => o.status === 'harvesting') && checkedCount >= totalItems && (
        <div className="sticky bottom-4 mt-6 print:hidden">
          <button
            onClick={handleAdvanceAll}
            disabled={advancing}
            className="w-full py-3 rounded-xl font-bold text-white bg-green-600 hover:bg-green-700 disabled:opacity-50 cursor-pointer shadow-lg transition-colors"
          >
            {advancing ? 'Updating…' : `✓ Mark All ${packableOrders.filter(o => o.status === 'harvesting').length} Orders as Packed`}
          </button>
        </div>
      )}

      {/* Print styles (injected) */}
      <style>{`
        @media print {
          body * { visibility: hidden; }
          .max-w-3xl, .max-w-3xl * { visibility: visible; }
          .max-w-3xl { position: absolute; left: 0; top: 0; width: 100%; }
          .print\\:hidden { display: none !important; }
          .print\\:break-inside-avoid { break-inside: avoid; }
        }
      `}</style>
    </div>
  );
}
