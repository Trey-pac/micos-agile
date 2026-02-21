/**
 * OrderFulfillmentBoard.jsx — Kanban-style order fulfillment pipeline.
 *
 * Active Board (default): 4 columns — New → Confirmed → Harvesting → Packed
 *   Only shows active orders (not delivered / cancelled).
 *   Date filters use requestedDeliveryDate OR createdAt (whichever exists).
 *   "This Week" = Mon-Sun of the current week.
 *
 * Order History tab: searchable, filterable table of delivered + cancelled orders.
 *
 * Includes one-time migration button for un-migrated Shopify orders.
 */

import { useState, useMemo, useCallback, useEffect } from 'react';
import { AnimatePresence } from 'framer-motion';
import {
  DndContext,
  DragOverlay,
  useDroppable,
} from '@dnd-kit/core';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useDragSensors, kanbanCollisionDetection } from '../../hooks/useDragAndDrop';
import { useAlerts } from '../../contexts/AlertContext';
import OrderDetailPanel from './OrderDetailPanel';

// ── Column config — active board only shows 4 columns (not Delivered) ───────

const ACTIVE_COLUMNS = [
  { key: 'new',        label: 'New',        icon: '🆕', color: 'blue' },
  { key: 'confirmed',  label: 'Confirmed',  icon: '✅', color: 'indigo' },
  { key: 'harvesting', label: 'Harvesting', icon: '🌾', color: 'amber' },
  { key: 'packed',     label: 'Packed',     icon: '📦', color: 'orange' },
];

const ACTIVE_STATUSES = ['new', 'confirmed', 'harvesting', 'packed'];

const DATE_FILTERS = [
  { key: 'today',    label: 'Today' },
  { key: 'tomorrow', label: 'Tomorrow' },
  { key: 'week',     label: 'This Week' },
  { key: 'all',      label: 'All Active' },
];

const VIEWS = [
  { key: 'board',   label: '📋 Order Board' },
  { key: 'history', label: '📜 Order History' },
];

// ── Helpers ─────────────────────────────────────────────────────────────────

function toDateStr(d) {
  return d.toISOString().split('T')[0];
}

function getToday() { return toDateStr(new Date()); }

function getTomorrow() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return toDateStr(d);
}

function getStartOfWeek() {
  const d = new Date();
  const day = d.getDay(); // 0=Sun, 1=Mon …
  const diff = day === 0 ? 6 : day - 1; // align to Monday
  d.setDate(d.getDate() - diff);
  return toDateStr(d);
}

function getEndOfWeek() {
  const d = new Date();
  const day = d.getDay();
  const diff = day === 0 ? 0 : 7 - day; // align to Sunday
  d.setDate(d.getDate() + diff);
  return toDateStr(d);
}

/** Return a YYYY-MM-DD for the order's best available date. */
function getOrderDate(order) {
  if (order.requestedDeliveryDate) return order.requestedDeliveryDate;
  const raw = order.createdAt || order.shopifyCreatedAt;
  const d = tsToDate(raw);
  return d ? toDateStr(d) : null;
}

function tsToDate(ts) {
  if (!ts) return null;
  if (ts.seconds) return new Date(ts.seconds * 1000);
  if (ts.toDate) return ts.toDate();
  const d = new Date(ts);
  return isNaN(d) ? null : d;
}

function formatShort(ts) {
  const d = tsToDate(ts);
  if (!d) return '—';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function timeAgo(ts) {
  const d = tsToDate(ts);
  if (!d) return '';
  const mins = Math.floor((Date.now() - d.getTime()) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function isDeliveryUrgent(dateStr) {
  if (!dateStr) return false;
  const today = getToday();
  const tomorrow = getTomorrow();
  return dateStr === today || dateStr === tomorrow;
}

// ── Draggable Order Card ────────────────────────────────────────────────────

function SortableOrderCard({ order, onClick, anomalyAlert }) {
  const {
    attributes, listeners, setNodeRef, transform, transition, isDragging,
  } = useSortable({ id: order.id, data: { type: 'order', order } });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <OrderCardContent order={order} onClick={onClick} anomalyAlert={anomalyAlert} />
    </div>
  );
}

function OrderCardContent({ order, onClick, isDragOverlay = false, anomalyAlert }) {
  const urgent = isDeliveryUrgent(order.requestedDeliveryDate);
  return (
    <div
      onClick={() => onClick?.(order)}
      className={`bg-white dark:bg-gray-800 rounded-xl border p-3 cursor-pointer
        hover:shadow-md transition-shadow select-none
        ${isDragOverlay ? 'shadow-xl ring-2 ring-green-400/50' : ''}
        ${anomalyAlert ? 'border-orange-400 dark:border-orange-600' : ''}
        ${!anomalyAlert && urgent ? 'border-amber-300 dark:border-amber-600' : ''}
        ${!anomalyAlert && !urgent ? 'border-gray-200 dark:border-gray-700' : ''}`}
    >
      {/* Customer name + anomaly badge */}
      <div className="flex items-center gap-1.5">
        <p className="font-bold text-gray-800 dark:text-gray-100 text-sm truncate flex-1">
          {order.customerName || order.customerId || 'Unknown'}
        </p>
        {anomalyAlert && (
          <span
            title={anomalyAlert.message || 'Order anomaly detected'}
            className="shrink-0 text-orange-500 dark:text-orange-400 text-sm cursor-help"
          >
            ⚠️
          </span>
        )}
      </div>
      {/* Order date + time ago */}
      <div className="flex items-center gap-2 mt-1">
        <span className="text-[10px] text-gray-400 dark:text-gray-500">
          {formatShort(order.createdAt)}
        </span>
        <span className="text-[10px] text-gray-400 dark:text-gray-500">
          {timeAgo(order.createdAt)}
        </span>
      </div>
      {/* Delivery date */}
      {order.requestedDeliveryDate && (
        <p className={`text-xs mt-1 font-medium ${
          urgent
            ? 'text-amber-600 dark:text-amber-400'
            : 'text-gray-500 dark:text-gray-400'
        }`}>
          📅 {order.requestedDeliveryDate}
          {order.requestedDeliveryDate === getToday() && ' (Today)'}
          {order.requestedDeliveryDate === getTomorrow() && ' (Tomorrow)'}
        </p>
      )}
      {/* Items + total */}
      <div className="flex items-center justify-between mt-2">
        <span className="text-xs text-gray-500 dark:text-gray-400">
          {order.items?.length || 0} items
        </span>
        <span className="text-sm font-bold text-gray-700 dark:text-gray-200">
          ${(order.total || 0).toFixed(2)}
        </span>
      </div>
      {/* Special instructions hint */}
      {order.specialInstructions && (
        <div className="mt-1.5 px-2 py-1 rounded bg-amber-50 dark:bg-amber-900/30 text-[10px] text-amber-600 dark:text-amber-400 truncate">
          ⚠ {order.specialInstructions}
        </div>
      )}
    </div>
  );
}

// ── Droppable Column ────────────────────────────────────────────────────────

function KanbanColumn({ column, orders, onClickCard, orderAlerts }) {
  const { setNodeRef, isOver } = useDroppable({ id: column.key });

  return (
    <div
      ref={setNodeRef}
      className={`flex flex-col min-w-[260px] w-[260px] lg:w-auto lg:flex-1 rounded-2xl border transition-colors
        ${isOver
          ? 'border-green-400 dark:border-green-600 bg-green-50/50 dark:bg-green-900/10'
          : 'border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50'
        }`}
    >
      {/* Column header */}
      <div className="px-3 py-2.5 border-b border-gray-200 dark:border-gray-700 flex items-center gap-2">
        <span className="text-sm">{column.icon}</span>
        <h3 className="text-sm font-bold text-gray-700 dark:text-gray-200">{column.label}</h3>
        <span className={`ml-auto text-xs font-bold px-1.5 py-0.5 rounded-full
          bg-${column.color}-100 dark:bg-${column.color}-900/30
          text-${column.color}-700 dark:text-${column.color}-300`}>
          {orders.length}
        </span>
      </div>
      {/* Cards */}
      <div className="flex-1 p-2 space-y-2 overflow-y-auto max-h-[calc(100vh-280px)] min-h-[120px]">
        {orders.length === 0 && (
          <p className="text-xs text-gray-400 dark:text-gray-500 text-center py-8">No orders</p>
        )}
        {orders.map(order => (
          <SortableOrderCard key={order.id} order={order} onClick={onClickCard} anomalyAlert={orderAlerts?.get(order.id)} />
        ))}
      </div>
    </div>
  );
}

// ── Migration Panel — ALWAYS VISIBLE big amber button ───────────────────────

function MigrationPanel({ shopifyOrders }) {
  const [state, setState] = useState('idle'); // idle | running | done | error
  const [result, setResult] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

  const unmigratedCount = useMemo(() => {
    if (!shopifyOrders?.length) return 0;
    return shopifyOrders.filter(o => o.statusMigrated !== true).length;
  }, [shopifyOrders]);

  const runMigration = useCallback(async (force = false) => {
    if (state === 'running') return;
    setState('running');
    setResult(null);
    setErrorMsg(null);
    const url = force
      ? '/api/migrate-order-statuses?force=true'
      : '/api/migrate-order-statuses';
    try {
      const res = await fetch(url, { method: 'POST' });
      const text = await res.text();
      let data;
      try { data = JSON.parse(text); } catch { throw new Error(`Non-JSON response: ${text.slice(0, 300)}`); }
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      setResult(data);
      setState('done');
    } catch (e) {
      console.error('[Migration] Error:', e);
      setErrorMsg(e.message);
      setState('error');
    }
  }, [state]);

  // Done state — show results + run again button
  if (state === 'done' && result) {
    const bd = result.breakdown || {};
    return (
      <div className="mb-4 p-4 rounded-xl bg-green-100 dark:bg-green-900/30 border-2 border-green-400 dark:border-green-600">
        <p className="text-green-700 dark:text-green-300 font-bold text-base">
          ✅ Migration complete — {result.duration || '?'}
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2">
          <div className="bg-white/60 dark:bg-gray-800/60 rounded-lg p-2 text-center">
            <div className="text-lg font-bold text-gray-800 dark:text-gray-200">{result.total}</div>
            <div className="text-[10px] text-gray-500">Total</div>
          </div>
          <div className="bg-white/60 dark:bg-gray-800/60 rounded-lg p-2 text-center">
            <div className="text-lg font-bold text-green-600">{result.migrated}</div>
            <div className="text-[10px] text-gray-500">Migrated</div>
          </div>
          <div className="bg-white/60 dark:bg-gray-800/60 rounded-lg p-2 text-center">
            <div className="text-lg font-bold text-gray-400">{result.skipped}</div>
            <div className="text-[10px] text-gray-500">Skipped</div>
          </div>
          <div className="bg-white/60 dark:bg-gray-800/60 rounded-lg p-2 text-center">
            <div className="text-lg font-bold text-red-500">{result.errors}</div>
            <div className="text-[10px] text-gray-500">Errors</div>
          </div>
        </div>
        <p className="text-green-600 dark:text-green-400 text-xs mt-2">
          Breakdown: {bd.delivered || 0} delivered · {bd.cancelled || 0} cancelled · {bd.new || 0} new
        </p>
        <p className="text-green-600 dark:text-green-400 text-xs mt-1">
          Data is refreshing automatically via real-time sync.
        </p>
        <button
          onClick={() => runMigration(true)}
          className="mt-3 px-5 py-3 min-h-[48px] rounded-xl bg-green-600 hover:bg-green-700 text-white text-sm font-bold cursor-pointer shadow-md transition-all"
        >
          🔄 Run Again (Force)
        </button>
      </div>
    );
  }

  // Running state
  if (state === 'running') {
    return (
      <div className="mb-4 p-5 rounded-xl bg-amber-100 dark:bg-amber-900/30 border-2 border-amber-400 dark:border-amber-600">
        <div className="flex items-center gap-3">
          <span className="inline-block w-6 h-6 border-3 border-amber-600 border-t-transparent rounded-full animate-spin" />
          <div>
            <p className="text-amber-800 dark:text-amber-200 font-bold text-base">
              Migrating {shopifyOrders?.length || '?'} Shopify orders…
            </p>
            <p className="text-amber-700 dark:text-amber-300 text-xs mt-1">
              Processing batches of 500. This may take 15-45 seconds. Do not close the page.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Idle / error — ALWAYS show the big button
  return (
    <div className="mb-4 p-5 rounded-xl bg-amber-100 dark:bg-amber-900/30 border-2 border-amber-400 dark:border-amber-600">
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex-1 min-w-[200px]">
          <p className="text-amber-800 dark:text-amber-200 font-bold text-base">
            ⚠️ Order Status Migration
          </p>
          <p className="text-amber-700 dark:text-amber-300 text-xs mt-1">
            {shopifyOrders?.length || 0} orders loaded · {unmigratedCount} unmigrated
          </p>
          <p className="text-amber-700 dark:text-amber-300 text-[10px] mt-0.5">
            Maps Shopify fulfillment/financial fields → delivered / cancelled / new (14-day threshold)
          </p>
          {errorMsg && (
            <p className="text-red-600 dark:text-red-400 text-xs mt-2 font-semibold bg-red-50 dark:bg-red-900/30 rounded-lg px-3 py-2">
              ❌ Error: {errorMsg}
            </p>
          )}
        </div>
        <button
          onClick={runMigration}
          disabled={state === 'running'}
          className="px-8 py-4 min-h-[56px] rounded-xl bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white text-base font-bold shadow-lg hover:shadow-xl disabled:opacity-60 transition-all cursor-pointer flex items-center gap-2"
        >
          {state === 'error' ? '🔄 Retry Migration' : '🚀 Run Migration Now'}
        </button>
      </div>
    </div>
  );
}

// ── Order History Table ─────────────────────────────────────────────────────

const HISTORY_STATUSES = [
  { key: 'all',       label: 'All' },
  { key: 'delivered',  label: 'Delivered' },
  { key: 'cancelled',  label: 'Cancelled' },
];

function OrderHistoryTable({ orders, onClickOrder }) {
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const PER_PAGE = 50;

  const filtered = useMemo(() => {
    let list = orders;
    if (statusFilter !== 'all') list = list.filter(o => o.status === statusFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(o =>
        (o.customerName || '').toLowerCase().includes(q) ||
        (o.customerEmail || '').toLowerCase().includes(q) ||
        (o.orderNumber || o.id || '').toString().toLowerCase().includes(q)
      );
    }
    return list;
  }, [orders, statusFilter, search]);

  const totalPages = Math.ceil(filtered.length / PER_PAGE);
  const pageOrders = filtered.slice(page * PER_PAGE, (page + 1) * PER_PAGE);

  return (
    <div>
      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-4">
        <div className="flex gap-1.5">
          {HISTORY_STATUSES.map(s => (
            <button
              key={s.key}
              onClick={() => { setStatusFilter(s.key); setPage(0); }}
              className={`px-3 py-2 min-h-[44px] rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                statusFilter === s.key
                  ? 'bg-green-600 text-white shadow-sm'
                  : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-green-300'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
        <input
          type="text"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(0); }}
          placeholder="Search customer or order #..."
          className="flex-1 min-w-[180px] px-3 py-2 min-h-[44px] rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 text-sm focus:outline-none focus:border-green-400 transition-colors"
        />
        <span className="self-center text-xs text-gray-400">{filtered.length} orders</span>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400 text-xs">
            <tr>
              <th className="py-2 px-3 text-left font-semibold">Customer</th>
              <th className="py-2 px-3 text-left font-semibold">Date</th>
              <th className="py-2 px-3 text-left font-semibold">Items</th>
              <th className="py-2 px-3 text-right font-semibold">Total</th>
              <th className="py-2 px-3 text-center font-semibold">Status</th>
            </tr>
          </thead>
          <tbody>
            {pageOrders.map(o => (
              <tr
                key={o.id}
                onClick={() => onClickOrder?.(o)}
                className="border-t border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer transition-colors"
              >
                <td className="py-2 px-3 font-medium text-gray-800 dark:text-gray-200 truncate max-w-[200px]">
                  {o.customerName || o.customerEmail || 'Unknown'}
                </td>
                <td className="py-2 px-3 text-gray-500 dark:text-gray-400">
                  {formatShort(o.createdAt || o.shopifyCreatedAt)}
                </td>
                <td className="py-2 px-3 text-gray-500 dark:text-gray-400">
                  {o.items?.length || 0}
                </td>
                <td className="py-2 px-3 text-right font-medium text-gray-700 dark:text-gray-200">
                  ${(o.total || 0).toFixed(2)}
                </td>
                <td className="py-2 px-3 text-center">
                  <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-bold ${
                    o.status === 'delivered'
                      ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                      : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                  }`}>
                    {o.status === 'delivered' ? '🚚 Delivered' : '❌ Cancelled'}
                  </span>
                </td>
              </tr>
            ))}
            {pageOrders.length === 0 && (
              <tr>
                <td colSpan={5} className="py-8 text-center text-gray-400 dark:text-gray-500">No orders found</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-3">
          <button
            onClick={() => setPage(p => Math.max(0, p - 1))}
            disabled={page === 0}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 disabled:opacity-30 cursor-pointer"
          >
            ← Prev
          </button>
          <span className="text-xs text-gray-500">Page {page + 1} of {totalPages}</span>
          <button
            onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
            disabled={page >= totalPages - 1}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 disabled:opacity-30 cursor-pointer"
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}

// ── Main Component ──────────────────────────────────────────────────────────

export default function OrderFulfillmentBoard({
  orders = [],
  shopifyOrders = [],
  shopifyCustomers = [],
  onAdvanceStatus,
  onUpdateOrder,
  loading = false,
  farmId,
}) {
  const [view, setView] = useState('board');
  const [dateFilter, setDateFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [activeId, setActiveId] = useState(null);
  const sensors = useDragSensors();
  const { anomalyAlertsByOrder: orderAlerts } = useAlerts();

  // Build customer lookup for enriching order display
  const customerMap = useMemo(() => {
    const map = {};
    for (const c of shopifyCustomers) {
      if (c.email) map[c.email.toLowerCase()] = c;
      if (c.shopifyCustomerId) map[c.shopifyCustomerId] = c;
    }
    return map;
  }, [shopifyCustomers]);

  // Merge orders + shopifyOrders (dedupe by shopifyOrderId if present)
  const mergedOrders = useMemo(() => {
    const seen = new Set();
    const result = [];

    // Farm orders first (these are the editable ones with status)
    for (const o of orders) {
      result.push(o);
      if (o.shopifyOrderId) seen.add(o.shopifyOrderId);
    }
    // Shopify orders that don't have a matching farm order
    // Map them to the same shape so they show on the board
    for (const so of shopifyOrders) {
      if (so.shopifyOrderId && seen.has(so.shopifyOrderId)) continue;
      if (so.id && seen.has(so.id)) continue;
      // Enrich with customer data
      const cust = customerMap[(so.customerEmail || '').toLowerCase()] || {};
      result.push({
        ...so,
        id: so.id,
        status: so.status || 'new',
        customerName: so.customerName || cust.restaurant || cust.name || so.customerEmail,
        source: 'shopify',
        // Map Shopify line_items to our items[] shape
        items: so.lineItems || so.items || [],
        total: so.total || 0,
        requestedDeliveryDate: so.requestedDeliveryDate || null,
        specialInstructions: so.note || so.specialInstructions || '',
      });
      seen.add(so.shopifyOrderId || so.id);
    }
    return result;
  }, [orders, shopifyOrders, customerMap]);

  // Split into active vs historical
  const activeOrders = useMemo(() =>
    mergedOrders.filter(o => ACTIVE_STATUSES.includes(o.status || 'new'))
  , [mergedOrders]);

  const historicalOrders = useMemo(() => {
    const hist = mergedOrders.filter(o => o.status === 'delivered' || o.status === 'cancelled');
    return hist.sort((a, b) => {
      const aT = tsToDate(a.createdAt || a.shopifyCreatedAt)?.getTime() || 0;
      const bT = tsToDate(b.createdAt || b.shopifyCreatedAt)?.getTime() || 0;
      return bT - aT;
    });
  }, [mergedOrders]);

  // Date filter — uses getOrderDate (requestedDeliveryDate || createdAt)
  const dateFiltered = useMemo(() => {
    if (dateFilter === 'all') return activeOrders;
    const today = getToday();
    const tomorrow = getTomorrow();
    const weekStart = getStartOfWeek();
    const weekEnd = getEndOfWeek();

    return activeOrders.filter(o => {
      const dd = getOrderDate(o);
      if (!dd) return dateFilter === 'all'; // unscheduled only shows in All Active
      if (dateFilter === 'today') return dd === today;
      if (dateFilter === 'tomorrow') return dd === tomorrow;
      if (dateFilter === 'week') return dd >= weekStart && dd <= weekEnd;
      return true;
    });
  }, [activeOrders, dateFilter]);

  // Search filter
  const filtered = useMemo(() => {
    if (!search.trim()) return dateFiltered;
    const q = search.toLowerCase();
    return dateFiltered.filter(o =>
      (o.customerName || '').toLowerCase().includes(q) ||
      (o.customerEmail || '').toLowerCase().includes(q) ||
      (o.id || '').toLowerCase().includes(q)
    );
  }, [dateFiltered, search]);

  // Group by status for active columns
  const columnOrders = useMemo(() => {
    const groups = {};
    for (const col of ACTIVE_COLUMNS) groups[col.key] = [];
    for (const o of filtered) {
      if (o.status === 'cancelled' || o.status === 'delivered') continue;
      const col = ACTIVE_STATUSES.includes(o.status) ? o.status : 'new';
      groups[col].push(o);
    }
    // Sort each column by createdAt desc
    for (const col of ACTIVE_COLUMNS) {
      groups[col.key].sort((a, b) => {
        const aT = tsToDate(a.createdAt || a.shopifyCreatedAt)?.getTime() || 0;
        const bT = tsToDate(b.createdAt || b.shopifyCreatedAt)?.getTime() || 0;
        return bT - aT;
      });
    }
    return groups;
  }, [filtered]);

  // Find the drag overlay order
  const activeOrder = useMemo(() => {
    if (!activeId) return null;
    return filtered.find(o => o.id === activeId) || null;
  }, [activeId, filtered]);

  // DnD handlers
  const handleDragStart = useCallback((event) => {
    setActiveId(event.active.id);
  }, []);

  const handleDragEnd = useCallback(async (event) => {
    setActiveId(null);
    const { active, over } = event;
    if (!over || !active) return;

    const orderId = active.id;
    // Determine the target column
    let targetColumn = over.id;
    // If we dropped over another card, use that card's column
    if (over.data?.current?.order) {
      targetColumn = over.data.current.order.status;
    }
    // Validate target is a real active column
    if (!ACTIVE_STATUSES.includes(targetColumn)) return;

    // Find the order
    const order = filtered.find(o => o.id === orderId);
    if (!order || order.status === targetColumn) return;

    // Update status
    if (onAdvanceStatus) {
      await onAdvanceStatus(orderId, targetColumn);
    }
  }, [filtered, onAdvanceStatus]);

  const handleDragCancel = useCallback(() => {
    setActiveId(null);
  }, []);

  // Cancel order
  const handleCancelOrder = useCallback(async (orderId) => {
    if (onAdvanceStatus) {
      await onAdvanceStatus(orderId, 'cancelled');
    }
    if (selectedOrder?.id === orderId) setSelectedOrder(null);
  }, [onAdvanceStatus, selectedOrder]);

  // Status change from detail panel
  const handleStatusChange = useCallback(async (orderId, newStatus) => {
    if (onAdvanceStatus) {
      await onAdvanceStatus(orderId, newStatus);
    }
  }, [onAdvanceStatus]);

  // Notes update from detail panel
  const handleUpdateNotes = useCallback(async (orderId, notes) => {
    if (onUpdateOrder) {
      await onUpdateOrder(orderId, { adminNotes: notes });
    }
  }, [onUpdateOrder]);

  // Count active orders
  const activeCount = activeOrders.length;
  const historicalCount = historicalOrders.length;

  if (loading) {
    return (
      <div className="p-4">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-48" />
          <div className="h-12 bg-gray-200 dark:bg-gray-700 rounded-xl" />
          <div className="flex gap-4">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="flex-1 h-64 bg-gray-200 dark:bg-gray-700 rounded-2xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-0 h-full">
      {/* Main board area */}
      <div className={`flex-1 min-w-0 transition-all ${selectedOrder ? 'mr-0' : ''}`}>
        {/* Run Migration button — shown for admin when orders may need migration */}
        <MigrationPanel shopifyOrders={shopifyOrders} />

        {/* Header + view toggle */}
        <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">
              {view === 'board' ? '📋 Order Board' : '📜 Order History'}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {activeCount} active orders · {historicalCount} historical
            </p>
          </div>
          {/* View toggle */}
          <div className="flex gap-1.5">
            {VIEWS.map(v => (
              <button
                key={v.key}
                onClick={() => setView(v.key)}
                className={`px-3 py-2 min-h-[44px] rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  view === v.key
                    ? 'bg-green-600 text-white shadow-sm'
                    : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-green-300'
                }`}
              >
                {v.label}
              </button>
            ))}
          </div>
        </div>

        {/* ─── Board View ─── */}
        {view === 'board' && (
          <>
            {/* Filters row */}
            <div className="flex flex-wrap gap-2 mb-4">
              {/* Date filter */}
              <div className="flex gap-1.5">
                {DATE_FILTERS.map(f => (
                  <button
                    key={f.key}
                    onClick={() => setDateFilter(f.key)}
                    className={`px-3 py-2 min-h-[44px] rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                      dateFilter === f.key
                        ? 'bg-green-600 text-white shadow-sm'
                        : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-green-300'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
              {/* Search */}
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search customer..."
                className="flex-1 min-w-[180px] px-3 py-2 min-h-[44px] rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 text-sm focus:outline-none focus:border-green-400 transition-colors"
              />
            </div>

            {/* Kanban columns */}
            <DndContext
              sensors={sensors}
              collisionDetection={kanbanCollisionDetection}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
              onDragCancel={handleDragCancel}
            >
              <div className="flex gap-3 overflow-x-auto pb-4">
                {ACTIVE_COLUMNS.map(col => (
                  <KanbanColumn
                    key={col.key}
                    column={col}
                    orders={columnOrders[col.key] || []}
                    onClickCard={setSelectedOrder}
                    orderAlerts={orderAlerts}
                  />
                ))}
              </div>

              <DragOverlay>
                {activeOrder ? (
                  <div className="w-[260px]">
                    <OrderCardContent order={activeOrder} onClick={() => {}} isDragOverlay anomalyAlert={orderAlerts.get(activeOrder.id)} />
                  </div>
                ) : null}
              </DragOverlay>
            </DndContext>
          </>
        )}

        {/* ─── History View ─── */}
        {view === 'history' && (
          <OrderHistoryTable orders={historicalOrders} onClickOrder={setSelectedOrder} />
        )}
      </div>

      {/* Detail panel (slides in from right) */}
      <AnimatePresence>
        {selectedOrder && (
          <OrderDetailPanel
            order={selectedOrder}
            customerMap={customerMap}
            onClose={() => setSelectedOrder(null)}
            onStatusChange={handleStatusChange}
            onCancel={handleCancelOrder}
            onUpdateNotes={handleUpdateNotes}
            farmId={farmId}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
