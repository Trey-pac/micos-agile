/**
 * OrderFulfillmentBoard.jsx — Kanban-style order fulfillment pipeline.
 *
 * 5 columns: New → Confirmed → Harvesting → Packed → Delivered
 * Drag-and-drop between columns updates order status + timestamps.
 * Click a card to open a detail panel on the right.
 * Supports date filter (Today / Tomorrow / This Week / All) and search.
 *
 * Data: merges farms/{farmId}/orders + shopifyOrders into one unified list.
 */

import { useState, useMemo, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  DndContext,
  DragOverlay,
  useDroppable,
  closestCorners,
} from '@dnd-kit/core';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useDragSensors, kanbanCollisionDetection } from '../../hooks/useDragAndDrop';
import { FULFILLMENT_COLUMNS, STATUS_TIMESTAMP_KEY } from '../../services/orderService';
import OrderDetailPanel from './OrderDetailPanel';

// ── Column config ───────────────────────────────────────────────────────────

const COLUMNS = [
  { key: 'new',        label: 'New',        icon: '🆕', color: 'blue' },
  { key: 'confirmed',  label: 'Confirmed',  icon: '✅', color: 'indigo' },
  { key: 'harvesting', label: 'Harvesting', icon: '🌾', color: 'amber' },
  { key: 'packed',     label: 'Packed',     icon: '📦', color: 'orange' },
  { key: 'delivered',  label: 'Delivered',  icon: '🚚', color: 'green' },
];

const DATE_FILTERS = [
  { key: 'today',    label: 'Today' },
  { key: 'tomorrow', label: 'Tomorrow' },
  { key: 'week',     label: 'This Week' },
  { key: 'all',      label: 'All' },
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

function getEndOfWeek() {
  const d = new Date();
  d.setDate(d.getDate() + (7 - d.getDay()));
  return toDateStr(d);
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

function SortableOrderCard({ order, onClick }) {
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
      <OrderCardContent order={order} onClick={onClick} />
    </div>
  );
}

function OrderCardContent({ order, onClick, isDragOverlay = false }) {
  const urgent = isDeliveryUrgent(order.requestedDeliveryDate);
  return (
    <div
      onClick={() => onClick?.(order)}
      className={`bg-white dark:bg-gray-800 rounded-xl border p-3 cursor-pointer
        hover:shadow-md transition-shadow select-none
        ${isDragOverlay ? 'shadow-xl ring-2 ring-green-400/50' : ''}
        ${urgent ? 'border-amber-300 dark:border-amber-600' : 'border-gray-200 dark:border-gray-700'}`}
    >
      {/* Customer name */}
      <p className="font-bold text-gray-800 dark:text-gray-100 text-sm truncate">
        {order.customerName || order.customerId || 'Unknown'}
      </p>
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

function KanbanColumn({ column, orders, onClickCard }) {
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
          <SortableOrderCard key={order.id} order={order} onClick={onClickCard} />
        ))}
      </div>
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
  const [dateFilter, setDateFilter] = useState('today');
  const [search, setSearch] = useState('');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [activeId, setActiveId] = useState(null);
  const sensors = useDragSensors();

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

  // Date filter
  const dateFiltered = useMemo(() => {
    if (dateFilter === 'all') return mergedOrders;
    const today = getToday();
    const tomorrow = getTomorrow();
    const weekEnd = getEndOfWeek();

    return mergedOrders.filter(o => {
      const dd = o.requestedDeliveryDate;
      if (!dd) return dateFilter === 'all'; // unscheduled only shows in All
      if (dateFilter === 'today') return dd === today;
      if (dateFilter === 'tomorrow') return dd === tomorrow;
      if (dateFilter === 'week') return dd >= today && dd <= weekEnd;
      return true;
    });
  }, [mergedOrders, dateFilter]);

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

  // Group by status for columns (exclude cancelled)
  const columnOrders = useMemo(() => {
    const groups = {};
    for (const col of FULFILLMENT_COLUMNS) groups[col] = [];
    for (const o of filtered) {
      if (o.status === 'cancelled') continue;
      const col = FULFILLMENT_COLUMNS.includes(o.status) ? o.status : 'new';
      groups[col].push(o);
    }
    // Sort each column by createdAt desc
    for (const col of FULFILLMENT_COLUMNS) {
      groups[col].sort((a, b) => {
        const aT = a.createdAt?.seconds || 0;
        const bT = b.createdAt?.seconds || 0;
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
    // Validate target is a real column
    if (!FULFILLMENT_COLUMNS.includes(targetColumn)) return;

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

  // Count active orders (not delivered/cancelled)
  const activeCount = filtered.filter(o =>
    o.status !== 'delivered' && o.status !== 'cancelled'
  ).length;

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
        {/* Header */}
        <div className="mb-4">
          <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">📋 Order Board</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {activeCount} active orders · {mergedOrders.length} total
          </p>
        </div>

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
            {COLUMNS.map(col => (
              <KanbanColumn
                key={col.key}
                column={col}
                orders={columnOrders[col.key] || []}
                onClickCard={setSelectedOrder}
              />
            ))}
          </div>

          <DragOverlay>
            {activeOrder ? (
              <div className="w-[260px]">
                <OrderCardContent order={activeOrder} onClick={() => {}} isDragOverlay />
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
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
