/**
 * CustomerManager.jsx — Unified customer list from shopifyCustomers.
 *
 * Shopify is the source of truth. This component reads from shopifyCustomers
 * and lets admins edit farm-specific fields (deliveryZone, pricingTier, etc.).
 * Includes bulk re-categorize on Prospects tab (multi-select + Move to…).
 */

import { useState, useMemo, useCallback } from 'react';
import { updateShopifyCustomer } from '../services/shopifyCustomerService';
import { autoCategorizeCustomers } from '../services/customerCleanupService';
import { useStatsCollection } from '../hooks/useLearningEngine';
import TrustBadge from './ui/TrustBadge';

const TYPE_TABS = [
  { key: 'all',          label: 'All',         icon: '👥' },
  { key: 'chef',         label: 'Chefs',       icon: '🍳' },
  { key: 'retail',       label: 'Retail',       icon: '🛒' },
  { key: 'subscriber',   label: 'Subscribers',  icon: '🔄' },
  { key: 'prospect',     label: 'Prospects',    icon: '👤' },
];

const TYPE_BADGE = {
  chef:       { label: '🍳 Chef',       cls: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300' },
  subscriber: { label: '🔄 Subscriber', cls: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300' },
  retail:     { label: '🛒 Retail',     cls: 'bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-300' },
  prospect:   { label: '👤 Prospect',   cls: 'bg-gray-100 dark:bg-gray-700/50 text-gray-400 dark:text-gray-500' },
  unknown:    { label: '❓ Unknown',    cls: 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400' },
};

const MOVE_TO_OPTIONS = [
  { value: 'chef',       label: '🍳 Chef' },
  { value: 'retail',     label: '🛒 Retail' },
  { value: 'subscriber', label: '🔄 Subscriber' },
];

function formatCurrency(val) {
  return '$' + (val || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/** Editable farm-specific fields modal */
function EditCustomerModal({ customer, farmId, onClose, onSaved }) {
  const [form, setForm] = useState({
    deliveryZone: customer.deliveryZone || '',
    pricingTier: customer.pricingTier || '',
    paymentType: customer.paymentType || '',
    deliveryDays: customer.deliveryDays || '',
    notes: customer.notes || '',
    type: customer.type || customer.segment || 'unknown',
  });
  const [saving, setSaving] = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    setSaving(true);
    try {
      // When admin manually changes the type, flag it so auto-categorize won't override
      const updates = { ...form };
      if (form.type !== (customer.type || customer.segment || 'unknown')) {
        updates.typeManuallySet = true;
      }
      await updateShopifyCustomer(farmId, customer.id, updates);
      onSaved?.();
      onClose();
    } catch (err) {
      console.error('Failed to update customer:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-md shadow-2xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100">
            Edit: {customer.restaurant || customer.name || customer.email}
          </h3>
          <button onClick={onClose} className="text-gray-400 dark:text-gray-500 hover:text-gray-600 text-2xl leading-none cursor-pointer">×</button>
        </div>

        {/* Customer type */}
        <div>
          <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1 block">Customer Type</label>
          <select value={form.type} onChange={(e) => set('type', e.target.value)}
            className="w-full border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200 rounded-xl px-3 py-2.5 text-sm focus:border-green-400 focus:outline-none cursor-pointer">
            <option value="chef">🍳 Chef (B2B)</option>
            <option value="retail">🛒 Retail</option>
            <option value="subscriber">🔄 Subscriber</option>
            <option value="prospect">👤 Prospect</option>
            <option value="unknown">❓ Unknown</option>
          </select>
          {customer.typeManuallySet && (
            <p className="text-[10px] text-amber-500 mt-1">⚠️ Manually set — auto-categorize won't override this</p>
          )}
        </div>

        {/* Farm-specific fields */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1 block">Delivery Zone</label>
            <input value={form.deliveryZone} onChange={(e) => set('deliveryZone', e.target.value)}
              placeholder="e.g. Boise, Eagle, Meridian"
              className="w-full border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200 rounded-xl px-3 py-2.5 text-sm focus:border-green-400 focus:outline-none" />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1 block">Pricing Tier</label>
            <select value={form.pricingTier} onChange={(e) => set('pricingTier', e.target.value)}
              className="w-full border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200 rounded-xl px-3 py-2.5 text-sm focus:border-green-400 focus:outline-none cursor-pointer">
              <option value="">—</option>
              <option value="standard">Standard</option>
              <option value="wholesale">Wholesale</option>
              <option value="premium">Premium</option>
              <option value="custom">Custom</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1 block">Payment Type</label>
            <select value={form.paymentType} onChange={(e) => set('paymentType', e.target.value)}
              className="w-full border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200 rounded-xl px-3 py-2.5 text-sm focus:border-green-400 focus:outline-none cursor-pointer">
              <option value="">—</option>
              <option value="invoice">Invoice (Net Terms)</option>
              <option value="cod">Cash on Delivery</option>
              <option value="prepaid">Prepaid</option>
              <option value="credit">Credit Card on File</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1 block">Delivery Days</label>
            <input value={form.deliveryDays} onChange={(e) => set('deliveryDays', e.target.value)}
              placeholder="e.g. Mon, Wed, Fri"
              className="w-full border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200 rounded-xl px-3 py-2.5 text-sm focus:border-green-400 focus:outline-none" />
          </div>
        </div>

        <div>
          <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1 block">Notes</label>
          <textarea value={form.notes} onChange={(e) => set('notes', e.target.value)}
            placeholder="Delivery preferences, special instructions..."
            rows={2}
            className="w-full border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200 rounded-xl px-3 py-2.5 text-sm focus:border-green-400 focus:outline-none resize-none" />
        </div>

        <div className="flex gap-2 pt-1">
          <button onClick={handleSave} disabled={saving}
            className="flex-1 py-3 bg-green-600 text-white font-bold rounded-xl text-sm hover:bg-green-700 disabled:opacity-50 transition-colors cursor-pointer">
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
          <button onClick={onClose}
            className="px-4 py-3 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 font-semibold rounded-xl text-sm cursor-pointer">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

export default function CustomerManager({ shopifyCustomers = [], loading = false, farmId }) {
  const [activeType, setActiveType] = useState('all');
  const [search, setSearch] = useState('');
  const [editModal, setEditModal] = useState(null);

  // Bulk select state (only active on prospects tab)
  const [selected, setSelected] = useState(new Set());
  const [bulkMoving, setBulkMoving] = useState(false);

  // Re-categorize state
  const [recategorizing, setRecategorizing] = useState(false);
  const [recatResult, setRecatResult] = useState(null);

  // Learning Engine: per-customer ordering intelligence (single shared subscription)
  const { ccsStats } = useStatsCollection(farmId);
  const customerIntel = useMemo(() => {
    const byCustomer = {};
    for (const s of ccsStats) {
      // Parse doc ID: ccs_{customerKey}__{cropKey}
      const parts = s.id.replace(/^ccs_/, '').split('__');
      if (parts.length < 2) continue;
      const custKey = parts[0];
      const cropKey = parts.slice(1).join('__');
      if (!byCustomer[custKey]) byCustomer[custKey] = [];
      byCustomer[custKey].push({
        crop: cropKey.replace(/_/g, ' '),
        ewma: s.ewma || 0,
        confidence: s.confidence || 0,
        trend: s.trend || 'stable',
        count: s.count || 0,
        lastOrder: s.lastOrderDate || null,
        intervalMean: s.interval_mean || null,
      });
    }
    // Sort each customer's crops by EWMA descending, keep top 3
    for (const key of Object.keys(byCustomer)) {
      byCustomer[key].sort((a, b) => b.ewma - a.ewma);
      byCustomer[key] = byCustomer[key].slice(0, 3);
    }
    return byCustomer;
  }, [ccsStats]);

  // Count per type
  const counts = useMemo(() => {
    const c = { all: shopifyCustomers.length, chef: 0, retail: 0, subscriber: 0, prospect: 0, unknown: 0 };
    for (const cust of shopifyCustomers) {
      const t = cust.type || cust.segment || 'unknown';
      if (c[t] !== undefined) c[t]++;
      else c.unknown++;
    }
    return c;
  }, [shopifyCustomers]);

  // Filter
  const filtered = useMemo(() => {
    let list = shopifyCustomers;

    // Type filter
    if (activeType !== 'all') {
      list = list.filter(c => (c.type || c.segment || 'unknown') === activeType);
    }

    // Search
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(c =>
        (c.name || '').toLowerCase().includes(q) ||
        (c.email || '').toLowerCase().includes(q) ||
        (c.restaurant || '').toLowerCase().includes(q) ||
        (c.firstName || '').toLowerCase().includes(q) ||
        (c.lastName || '').toLowerCase().includes(q)
      );
    }

    // Sort by totalSpent desc
    return [...list].sort((a, b) => (b.totalSpent || 0) - (a.totalSpent || 0));
  }, [shopifyCustomers, activeType, search]);

  // Clear selection when switching tabs
  const handleTabSwitch = useCallback((key) => {
    setActiveType(key);
    setSelected(new Set());
  }, []);

  // Toggle individual checkbox
  const toggleSelect = useCallback((id) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  // Select / deselect all visible
  const toggleAll = useCallback(() => {
    if (selected.size === filtered.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filtered.map(c => c.id)));
    }
  }, [filtered, selected.size]);

  // Bulk move selected customers to a new type
  const handleBulkMove = useCallback(async (newType) => {
    if (!selected.size || !farmId) return;
    setBulkMoving(true);
    try {
      const promises = [...selected].map(id =>
        updateShopifyCustomer(farmId, id, { type: newType, typeManuallySet: true })
      );
      await Promise.all(promises);
      setSelected(new Set());
    } catch (err) {
      console.error('Bulk move failed:', err);
    } finally {
      setBulkMoving(false);
    }
  }, [selected, farmId]);

  const isProspectTab = activeType === 'prospect';

  // Run re-categorization on all customers
  const handleRecategorize = useCallback(async () => {
    if (!farmId) return;
    setRecategorizing(true);
    setRecatResult(null);
    try {
      const result = await autoCategorizeCustomers(farmId, { forceAll: true });
      setRecatResult(result);
    } catch (err) {
      console.error('Re-categorize failed:', err);
      setRecatResult({ error: err.message });
    } finally {
      setRecategorizing(false);
    }
  }, [farmId]);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-4">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-48" />
          <div className="h-12 bg-gray-200 dark:bg-gray-700 rounded-xl" />
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-16 bg-gray-200 dark:bg-gray-700 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-4">
        <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">👥 Customers</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {shopifyCustomers.length} customers from Shopify · {counts.chef} chefs · {counts.retail} retail · {counts.subscriber} subscribers · {counts.prospect} prospects
        </p>
      </div>

      {/* Type filter tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-4 -mx-1 px-1">
        {TYPE_TABS.map(({ key, label, icon }) => {
          const isProspect = key === 'prospect';
          return (
            <button
              key={key}
              onClick={() => handleTabSwitch(key)}
              className={`flex items-center gap-1.5 px-4 py-2.5 min-h-[44px] rounded-xl text-sm font-semibold whitespace-nowrap transition-all cursor-pointer ${
                activeType === key
                  ? isProspect
                    ? 'bg-gray-500 text-white shadow-sm'
                    : 'bg-green-600 text-white shadow-sm'
                  : isProspect
                    ? 'bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 text-gray-400 dark:text-gray-500 hover:border-gray-400'
                    : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-green-300'
              }`}
            >
              <span>{icon}</span>
              <span>{label}</span>
              <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                activeType === key ? 'bg-white/20 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
              }`}>{counts[key]}</span>
            </button>
          );
        })}
      </div>

      {/* Bulk actions bar (Prospects tab only) */}
      {isProspectTab && filtered.length > 0 && (
        <div className="flex items-center gap-3 mb-4 bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3">
          <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300 cursor-pointer">
            <input
              type="checkbox"
              checked={selected.size === filtered.length && filtered.length > 0}
              onChange={toggleAll}
              className="w-4 h-4 rounded border-gray-300 accent-green-600 cursor-pointer"
            />
            {selected.size > 0 ? `${selected.size} selected` : 'Select all'}
          </label>

          {selected.size > 0 && (
            <>
              <span className="text-gray-300 dark:text-gray-600">|</span>
              <span className="text-xs text-gray-500 dark:text-gray-400">Move to:</span>
              {MOVE_TO_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => handleBulkMove(opt.value)}
                  disabled={bulkMoving}
                  className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-green-50 dark:hover:bg-green-900/20 hover:border-green-300 disabled:opacity-50 transition-colors cursor-pointer"
                >
                  {opt.label}
                </button>
              ))}
              {bulkMoving && <span className="text-xs text-gray-400 animate-pulse">Moving…</span>}
            </>
          )}
        </div>
      )}

      {/* Search + Re-categorize toolbar */}
      <div className="flex gap-2 mb-4">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, email, or restaurant..."
          className="flex-1 px-4 py-3 min-h-[44px] rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 text-sm focus:outline-none focus:border-green-400 dark:focus:border-green-600 transition-colors"
        />
        <button
          onClick={handleRecategorize}
          disabled={recategorizing}
          className="px-4 py-3 min-h-[44px] rounded-xl text-xs font-semibold whitespace-nowrap
            bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800
            hover:bg-purple-100 dark:hover:bg-purple-900/50
            disabled:opacity-50 transition-colors cursor-pointer"
        >
          {recategorizing ? '⏳ Running…' : '🏷️ Re-categorize All'}
        </button>
      </div>

      {/* Re-categorize result */}
      {recatResult && (
        <div className={`mb-4 p-3 rounded-xl text-sm ${
          recatResult.error
            ? 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800'
            : 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800'
        }`}>
          {recatResult.error ? (
            <span>❌ {recatResult.error}</span>
          ) : (
            <span>
              ✅ Updated <strong>{recatResult.updated}</strong> of {recatResult.total} customers ·{' '}
              🍳{recatResult.counts.chef} 🛒{recatResult.counts.retail} 🔄{recatResult.counts.subscriber} 👤{recatResult.counts.prospect}
              {recatResult.counts.unknown > 0 && <> ❓{recatResult.counts.unknown}</>}
            </span>
          )}
          <button onClick={() => setRecatResult(null)} className="ml-2 text-xs opacity-50 hover:opacity-100 cursor-pointer">✕</button>
        </div>
      )}

      {/* Customer list */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400 dark:text-gray-500">
          <p className="text-3xl mb-2">👥</p>
          <p className="text-sm">{search ? 'No customers match your search' : 'No customers in this category'}</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          {filtered.map((customer, i) => {
            const badge = TYPE_BADGE[customer.type || customer.segment] || TYPE_BADGE.unknown;
            const isChecked = selected.has(customer.id);
            return (
              <div key={customer.id} className={`flex items-center gap-3 p-4 ${i > 0 ? 'border-t border-gray-100 dark:border-gray-700' : ''} ${isProspectTab ? 'opacity-75 hover:opacity-100 transition-opacity' : ''}`}>
                {/* Checkbox (prospect tab only) */}
                {isProspectTab && (
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => toggleSelect(customer.id)}
                    className="w-4 h-4 rounded border-gray-300 accent-green-600 shrink-0 cursor-pointer"
                  />
                )}

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-0.5">
                    <h3 className="font-bold text-gray-800 dark:text-gray-100 text-sm truncate">
                      {customer.restaurant || customer.name || customer.email || 'Unknown'}
                    </h3>
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded shrink-0 ${badge.cls}`}>{badge.label}</span>
                    {/* Trust tier badge from Learning Engine */}
                    {(() => {
                      const custKey = (customer.email || '').toLowerCase().trim();
                      const intel = custKey ? customerIntel[custKey] : null;
                      if (!intel || intel.length === 0) return null;
                      const maxConf = Math.max(...intel.map(c => c.confidence));
                      // Use earliest lastOrder as proxy for firstOrderDate
                      const earliest = intel.reduce((e, c) => c.lastOrder && (!e || c.lastOrder < e) ? c.lastOrder : e, null);
                      return <TrustBadge confidence={maxConf} firstOrderDate={earliest} compact />;
                    })()}
                    {customer.typeManuallySet && (
                      <span className="text-[9px] px-1 py-0.5 rounded bg-amber-50 dark:bg-amber-900/20 text-amber-500" title="Manually categorized">✋</span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                    {customer.name && customer.restaurant ? `${customer.name} · ` : ''}
                    {customer.email || ''}
                    {customer.phone ? ` · ${customer.phone}` : ''}
                  </p>
                  {/* Farm-specific info pills */}
                  <div className="flex flex-wrap gap-1 mt-1">
                    {customer.deliveryZone && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-300">📍 {customer.deliveryZone}</span>
                    )}
                    {customer.pricingTier && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-300">💲 {customer.pricingTier}</span>
                    )}
                    {customer.paymentType && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-300">💳 {customer.paymentType}</span>
                    )}
                    {customer.deliveryDays && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-300">📅 {customer.deliveryDays}</span>
                    )}
                  </div>
                  {/* Ordering Intelligence from Learning Engine */}
                  {(() => {
                    const custKey = (customer.email || '').toLowerCase().trim();
                    const intel = custKey ? customerIntel[custKey] : null;
                    if (!intel || intel.length === 0) return null;
                    const TREND_SYM = { increasing: '↑', decreasing: '↓', stable: '→' };
                    const TREND_CLR = { increasing: 'text-green-600 dark:text-green-400', decreasing: 'text-red-500 dark:text-red-400', stable: 'text-gray-400' };
                    // Predict next order from interval
                    const nextOrderDate = intel[0].lastOrder && intel[0].intervalMean
                      ? new Date(new Date(intel[0].lastOrder).getTime() + intel[0].intervalMean * 86400000).toISOString().split('T')[0]
                      : null;
                    return (
                      <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                        <span className="text-[9px] font-semibold text-gray-400 dark:text-gray-500">📊</span>
                        {intel.map((crop, ci) => (
                          <span key={ci} className="text-[9px] px-1.5 py-0.5 rounded bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-300">
                            {crop.crop} ~{Math.round(crop.ewma)}
                            <span className={`ml-0.5 ${TREND_CLR[crop.trend] || ''}`}>{TREND_SYM[crop.trend] || '→'}</span>
                          </span>
                        ))}
                        {nextOrderDate && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-sky-50 dark:bg-sky-900/20 text-sky-600 dark:text-sky-300">
                            Next ~{nextOrderDate}
                          </span>
                        )}
                      </div>
                    );
                  })()}
                </div>

                <div className="flex items-center gap-3 shrink-0 ml-3">
                  <div className="text-right">
                    <p className="text-sm font-bold text-gray-700 dark:text-gray-200">{formatCurrency(customer.totalSpent)}</p>
                    <p className="text-[10px] text-gray-400 dark:text-gray-500">{customer.ordersCount || 0} orders</p>
                  </div>
                  <button
                    onClick={() => setEditModal(customer)}
                    className="text-xs font-semibold text-gray-400 dark:text-gray-500 hover:text-gray-600 cursor-pointer px-3 py-2.5 min-h-[44px] rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    Edit
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Edit modal */}
      {editModal && (
        <EditCustomerModal
          customer={editModal}
          farmId={farmId}
          onClose={() => setEditModal(null)}
        />
      )}
    </div>
  );
}
