import { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Package, Printer, Check, AlertTriangle } from 'lucide-react';
import { Badge } from './ui/Badge';
import { Button } from './ui/Button';
import { Card } from './ui/Card';
import { PackingListSkeleton } from './ui/Skeletons';

// ── Helpers ─────────────────────────────────────────────────────────────────

function today() {
  return new Date().toISOString().split('T')[0];
}

function groupOrdersByCustomer(orders) {
  const map = {};
  for (const o of orders) {
    const key = o.customerName || o.customerId || 'Unknown';
    if (!map[key]) map[key] = { customer: key, orders: [], totalItems: 0, email: o.customerEmail };
    map[key].orders.push(o);
    map[key].totalItems += (o.items?.length || 0);
  }
  return Object.values(map).sort((a, b) => a.customer.localeCompare(b.customer));
}

function printAllSlips(customerGroups) {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Packing Slips — All Customers</title>
      <style>
        body { font-family: -apple-system, sans-serif; padding: 0; margin: 0; }
        .slip { padding: 24px; max-width: 600px; margin: 0 auto; page-break-after: always; }
        .slip:last-child { page-break-after: auto; }
        h2 { font-size: 16px; margin: 0 0 2px; }
        .subtitle { font-size: 12px; color: #666; margin-bottom: 14px; }
        table { width: 100%; border-collapse: collapse; }
        th, td { text-align: left; padding: 5px 8px; border-bottom: 1px solid #eee; font-size: 12px; }
        th { border-bottom: 2px solid #333; font-weight: 600; }
        .total { text-align: right; font-weight: 700; font-size: 14px; margin-top: 10px; }
        .instructions { margin-top: 10px; padding: 8px; background: #fff9e6; border-radius: 6px; font-size: 11px; }
      </style>
    </head>
    <body>
      ${customerGroups.map(g => `
        <div class="slip">
          <h2>Packing Slip — ${g.customer}</h2>
          <p class="subtitle">${g.orders[0]?.requestedDeliveryDate || 'No date'}</p>
          ${g.orders.map(o => `
            <table>
              <thead><tr><th>Product</th><th>Qty</th><th>Unit</th></tr></thead>
              <tbody>
                ${(o.items || []).map(item => `
                  <tr>
                    <td>${item.name || item.title || item.productName || '—'}</td>
                    <td>${item.quantity || item.qty || 0}</td>
                    <td>${item.unit || 'ea'}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
            ${o.total ? `<p class="total">Total: $${Number(o.total).toFixed(2)}</p>` : ''}
            ${o.specialInstructions ? `<div class="instructions"><strong>Notes:</strong> ${o.specialInstructions}</div>` : ''}
          `).join('<hr style="margin: 12px 0; border: none; border-top: 1px dashed #ccc;">')}
        </div>
      `).join('')}
      <script>window.print();</script>
    </body>
    </html>
  `;
  const win = window.open('', '_blank');
  win.document.write(html);
  win.document.close();
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
        {item.quantity || item.qty || 0}× {item.name || item.title || item.productName || 'Unknown'}
      </span>
      {item.unit && (
        <span className="text-xs text-gray-400 dark:text-gray-500 shrink-0">{item.unit}</span>
      )}
    </label>
  );
}

// ── Customer packing card (collapsible) ─────────────────────────────────────

function CustomerCard({ group, checkedItems, onToggleItem, onMarkCustomerPacked, expanded, onToggleExpand, advancing }) {
  const allItemKeys = group.orders.flatMap(o =>
    (o.items || []).map((_, i) => `${o.id}-${i}`)
  );
  const checkedCount = allItemKeys.filter(k => checkedItems[k]).length;
  const allChecked = allItemKeys.length > 0 && checkedCount === allItemKeys.length;
  const hasHarvestingOrders = group.orders.some(o => o.status === 'harvesting');

  return (
    <Card className="overflow-hidden print:break-inside-avoid">
      {/* Customer header (click to expand/collapse) */}
      <button
        onClick={onToggleExpand}
        className="w-full px-4 py-3 bg-gray-50/50 dark:bg-gray-700/50 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between cursor-pointer hover:bg-gray-100/50 dark:hover:bg-gray-700 transition-colors"
      >
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-gray-400 dark:text-gray-500 text-xs">{expanded ? '▾' : '▸'}</span>
          <div className="text-left min-w-0">
            <p className="font-bold text-gray-800 dark:text-gray-100 text-sm truncate">{group.customer}</p>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-xs text-gray-400 dark:text-gray-500">
                {group.orders.length} order{group.orders.length !== 1 ? 's' : ''} · {group.totalItems} items
              </span>
              {/* Mini progress */}
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                {checkedCount}/{allItemKeys.length}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
          {allChecked ? (
            <Badge variant="success">
              <Check className="w-3 h-3 mr-0.5" /> Packed
            </Badge>
          ) : (
            <div className="flex items-center gap-1.5">
              {/* Progress ring */}
              <div className="w-6 h-6 relative">
                <svg className="w-6 h-6 -rotate-90" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-200 dark:text-gray-700" />
                  <circle
                    cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="2"
                    className="text-green-500"
                    strokeDasharray={`${(checkedCount / Math.max(allItemKeys.length, 1)) * 62.83} 62.83`}
                    strokeLinecap="round"
                  />
                </svg>
              </div>
              {hasHarvestingOrders && allChecked === false && checkedCount === allItemKeys.length - 0 && (
                <Button
                  size="sm"
                  onClick={() => onMarkCustomerPacked(group)}
                  disabled={advancing}
                >
                  Mark Packed
                </Button>
              )}
            </div>
          )}
        </div>
      </button>

      {/* Collapsible content */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            {group.orders.map(order => (
              <div key={order.id} className="border-b border-gray-50 dark:border-gray-800 last:border-b-0">
                {group.orders.length > 1 && (
                  <div className="px-4 pt-2 pb-0.5">
                    <p className="text-[10px] uppercase font-medium text-gray-400 dark:text-gray-500 tracking-wide">
                      Order #{order.id.slice(-6)}
                    </p>
                  </div>
                )}
                {order.specialInstructions && (
                  <div className="px-4 pt-2">
                    <p className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/30 rounded-lg px-3 py-1.5 font-medium flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0" /> {order.specialInstructions}
                    </p>
                  </div>
                )}
                <div className="divide-y divide-gray-50 dark:divide-gray-800">
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

            {/* Per-customer Mark Packed */}
            {hasHarvestingOrders && !allChecked && (
              <div className="px-4 py-2 border-t border-gray-100 dark:border-gray-700 print:hidden">
                <Button
                  variant="link"
                  size="sm"
                  onClick={() => {
                    const unchecked = allItemKeys.filter(k => !checkedItems[k]);
                    for (const k of unchecked) onToggleItem(k);
                  }}
                  className="text-green-600 dark:text-green-400"
                >
                  <Check className="w-3 h-3 mr-0.5" /> Check All Items
                </Button>
              </div>
            )}

            {hasHarvestingOrders && allChecked && (
              <div className="px-4 py-3 border-t border-gray-100 dark:border-gray-700 print:hidden">
                <Button
                  onClick={() => onMarkCustomerPacked(group)}
                  disabled={advancing}
                  className="w-full"
                >
                  {advancing ? 'Updating…' : <><Check className="w-4 h-4 mr-1" /> Mark {group.customer} as Packed</>}
                </Button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}

// ── Main Component ──────────────────────────────────────────────────────────

export default function PackingList({ orders = [], onAdvanceStatus, loading = false }) {
  const [selectedDate, setSelectedDate] = useState(today());
  const [checkedItems, setCheckedItems] = useState({});
  const [advancing, setAdvancing] = useState(false);
  const [expandedCustomers, setExpandedCustomers] = useState({}); // customer → bool

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

  const toggleCustomerExpanded = useCallback((customer) => {
    setExpandedCustomers(prev => ({ ...prev, [customer]: !prev[customer] }));
  }, []);

  // Mark all orders for a customer as packed
  const markCustomerPacked = useCallback(async (group) => {
    if (!onAdvanceStatus) return;
    setAdvancing(true);
    try {
      const toPack = group.orders.filter(o => o.status === 'harvesting');
      for (const o of toPack) {
        await onAdvanceStatus(o.id, 'packed');
      }
    } catch (err) {
      console.error('Failed to mark customer packed:', err);
    } finally {
      setAdvancing(false);
    }
  }, [onAdvanceStatus]);

  // Count totals
  const totalItems = packableOrders.reduce((sum, o) => sum + (o.items?.length || 0), 0);
  const checkedCount = Object.values(checkedItems).filter(Boolean).length;
  const packedCustomers = customerGroups.filter(g => {
    const keys = g.orders.flatMap(o => (o.items || []).map((_, i) => `${o.id}-${i}`));
    return keys.length > 0 && keys.every(k => checkedItems[k]);
  }).length;

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
          <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2"><Package className="w-5 h-5" /> Packing List</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {packedCustomers}/{customerGroups.length} customers packed · {checkedCount}/{totalItems} items
          </p>
        </div>
        <div className="flex gap-2 print:hidden">
          <Button
            variant="outline"
            size="sm"
            onClick={() => printAllSlips(customerGroups)}
          >
            <Printer className="w-4 h-4 mr-1" /> Print All
          </Button>
        </div>
      </div>

      {/* Progress bar */}
      <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full mb-4 overflow-hidden">
        <div
          className="h-full bg-green-500 rounded-full transition-all duration-300"
          style={{ width: `${totalItems > 0 ? (checkedCount / totalItems) * 100 : 0}%` }}
        />
      </div>

      {/* Date selector */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-4 -mx-1 px-1 print:hidden">
        {availableDates.map(d => (
          <Button
            key={d}
            variant={selectedDate === d ? 'default' : 'outline'}
            onClick={() => { setSelectedDate(d); setCheckedItems({}); setExpandedCustomers({}); }}
            className="whitespace-nowrap min-h-[44px]"
          >
            {d}
          </Button>
        ))}
        {availableDates.length === 0 && (
          <p className="text-xs text-gray-400 dark:text-gray-500">No delivery dates with packable orders.</p>
        )}
      </div>

      {/* Empty state */}
      {customerGroups.length === 0 && (
        <div className="text-center py-20">
          <Package className="w-10 h-10 mx-auto mb-3 text-gray-300" />
          <p className="text-gray-500 dark:text-gray-400 text-sm">No orders ready to pack for {selectedDate}.</p>
          <p className="text-gray-400 dark:text-gray-500 text-xs mt-1">Orders move here after harvesting.</p>
        </div>
      )}

      {/* Customer packing cards */}
      <motion.div initial="hidden" animate="visible" variants={{ visible: { transition: { staggerChildren: 0.05 } } }} className="space-y-3">
        {customerGroups.map(group => (
          <motion.div key={group.customer} variants={{ hidden: { opacity: 0, y: 8 }, visible: { opacity: 1, y: 0, transition: { duration: 0.2 } } }}>
            <CustomerCard
              group={group}
              checkedItems={checkedItems}
              onToggleItem={toggleItem}
              onMarkCustomerPacked={markCustomerPacked}
              expanded={expandedCustomers[group.customer] !== false} // default expanded
              onToggleExpand={() => toggleCustomerExpanded(group.customer)}
              advancing={advancing}
            />
          </motion.div>
        ))}
      </motion.div>

      {/* Mark All Packed sticky button */}
      {packableOrders.some(o => o.status === 'harvesting') && checkedCount >= totalItems && totalItems > 0 && (
        <div className="sticky bottom-4 mt-6 print:hidden">
          <Button
            onClick={handleAdvanceAll}
            disabled={advancing}
            className="w-full py-3 h-auto shadow-lg"
          >
            {advancing ? 'Updating…' : <><Check className="w-4 h-4 mr-1" /> Mark All {packableOrders.filter(o => o.status === 'harvesting').length} Orders as Packed</>}
          </Button>
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
