import { useState, useMemo } from 'react';
import { queryDemand } from '../utils/demandUtils';
import { calculateSowingNeeds } from '../utils/sowingUtils';
import { InventorySkeleton } from './ui/Skeletons';

const CATEGORIES = [
  { id: 'seeds',     label: 'Seeds' },
  { id: 'soil',      label: 'Soil / Media' },
  { id: 'packaging', label: 'Packaging' },
  { id: 'other',     label: 'Other' },
];

const today = () => new Date().toISOString().split('T')[0];

function ItemForm({ item, onSave, onClose }) {
  const [form, setForm] = useState({
    name:            item?.name            || '',
    category:        item?.category        || 'seeds',
    currentQty:      item?.currentQty      ?? '',
    unit:            item?.unit            || '',
    parLevel:        item?.parLevel        ?? '',
    supplier:        item?.supplier        || '',
    costPerUnit:     item?.costPerUnit     ?? '',
    lastOrderedDate: item?.lastOrderedDate || '',
  });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      await onSave({
        ...form,
        currentQty:  parseFloat(form.currentQty)  || 0,
        parLevel:    parseFloat(form.parLevel)     || 0,
        costPerUnit: parseFloat(form.costPerUnit)  || 0,
      });
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-md shadow-2xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100">{item ? 'Edit Item' : 'Add Inventory Item'}</h3>
          <button onClick={onClose} className="text-gray-400 dark:text-gray-500 hover:text-gray-600 text-2xl leading-none cursor-pointer">×</button>
        </div>

        <input
          placeholder="Item name *"
          value={form.name}
          onChange={(e) => set('name', e.target.value)}
          className="w-full border-2 border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5 text-sm focus:border-green-400 focus:outline-none"
        />

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold text-gray-600 dark:text-gray-300 block mb-1">Category</label>
            <select value={form.category} onChange={(e) => set('category', e.target.value)}
              className="w-full border-2 border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2.5 text-sm focus:border-green-400 focus:outline-none">
              {CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-600 dark:text-gray-300 block mb-1">Unit (oz / lbs / bags…)</label>
            <input value={form.unit} onChange={(e) => set('unit', e.target.value)}
              className="w-full border-2 border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2.5 text-sm focus:border-green-400 focus:outline-none" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {[['currentQty', 'Current Qty'], ['parLevel', 'Par Level']].map(([k, label]) => (
            <div key={k}>
              <label className="text-xs font-semibold text-gray-600 dark:text-gray-300 block mb-1">{label}</label>
              <input type="number" min="0" step="0.01" value={form[k]}
                onChange={(e) => set(k, e.target.value)}
                className="w-full border-2 border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2.5 text-sm focus:border-green-400 focus:outline-none" />
            </div>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold text-gray-600 dark:text-gray-300 block mb-1">Supplier</label>
            <input value={form.supplier} onChange={(e) => set('supplier', e.target.value)}
              className="w-full border-2 border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2.5 text-sm focus:border-green-400 focus:outline-none" />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-600 dark:text-gray-300 block mb-1">Cost / unit ($)</label>
            <input type="number" min="0" step="0.01" value={form.costPerUnit}
              onChange={(e) => set('costPerUnit', e.target.value)}
              className="w-full border-2 border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2.5 text-sm focus:border-green-400 focus:outline-none" />
          </div>
        </div>

        <button onClick={handleSave} disabled={saving || !form.name.trim()}
          className="w-full py-3 bg-green-600 text-white font-bold rounded-xl text-sm hover:bg-green-700 disabled:opacity-50 cursor-pointer">
          {saving ? 'Saving…' : item ? 'Save Changes' : 'Add Item'}
        </button>
      </div>
    </div>
  );
}

export default function InventoryAlerts({
  inventory = [], orders = [], activeBatches = [],
  onAdd, onEdit, onRemove,
  loading = false,
}) {
  const [tab,    setTab]    = useState('alerts');
  const [modal,  setModal]  = useState(null); // null | { mode:'add'|'edit', item? }
  const [marking, setMarking] = useState(null);

  // Cross-reference: find crops needing urgent sowing to warn on seed stock
  const demandData  = useMemo(() => queryDemand(orders),                            [orders]);
  const sowingNeeds = useMemo(() => calculateSowingNeeds(demandData, activeBatches), [demandData, activeBatches]);
  if (loading) return <InventorySkeleton />;
  const urgentCropNames = sowingNeeds
    .filter((n) => n.urgency !== 'healthy')
    .map((n) => n.cropName.toLowerCase());

  const hasSowingWarning = (item) => {
    if (item.category !== 'seeds') return false;
    const n = item.name.toLowerCase();
    return urgentCropNames.some((crop) => n.includes(crop) || crop.includes(n));
  };

  const alertItems = [...inventory]
    .filter((i) => (i.currentQty ?? 0) < (i.parLevel ?? 0))
    .sort((a, b) => (a.currentQty ?? 0) / (a.parLevel ?? 1) - (b.currentQty ?? 0) / (b.parLevel ?? 1));

  const handleSave = async (data) => {
    if (modal?.mode === 'edit') await onEdit(modal.item.id, data);
    else await onAdd(data);
    setModal(null);
  };

  const handleMarkOrdered = async (item) => {
    setMarking(item.id);
    try { await onEdit(item.id, { lastOrderedDate: today() }); }
    finally { setMarking(null); }
  };

  const renderAlertCard = (item) => {
    const deficit = (item.parLevel ?? 0) - (item.currentQty ?? 0);
    const sowWarn = hasSowingWarning(item);
    return (
      <div key={item.id} className="bg-white dark:bg-gray-800 rounded-2xl border border-red-200 p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-bold text-gray-800 dark:text-gray-100">{item.name}</p>
              {sowWarn && (
                <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-semibold border border-amber-200">
                  ⚠️ Sowing needed
                </span>
              )}
            </div>
            <p className="text-sm text-red-600 font-semibold mt-0.5">
              {item.currentQty ?? 0} {item.unit} remaining — ORDER NEEDED
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Par: {item.parLevel ?? 0} {item.unit} · Deficit: {deficit.toFixed(1)} {item.unit}
              {item.supplier ? ` · ${item.supplier}` : ''}
              {item.lastOrderedDate ? ` · Last ordered: ${item.lastOrderedDate}` : ''}
            </p>
          </div>
          <div className="flex gap-1.5 shrink-0">
            <button onClick={() => handleMarkOrdered(item)} disabled={marking === item.id}
              className="px-3 py-1.5 bg-green-600 text-white text-xs font-bold rounded-lg hover:bg-green-700 disabled:opacity-50 cursor-pointer">
              {marking === item.id ? '…' : 'Ordered'}
            </button>
            <button onClick={() => setModal({ mode: 'edit', item })}
              className="px-3 py-1.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs font-semibold rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 cursor-pointer">
              Edit
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div>
          <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">Inventory</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">{inventory.length} items · {alertItems.length} below par</p>
        </div>
        <button onClick={() => setModal({ mode: 'add' })}
          className="bg-green-600 text-white font-bold px-4 py-2 rounded-xl text-sm hover:bg-green-700 cursor-pointer">
          + Add Item
        </button>
      </div>

      <div className="flex gap-2 mb-5">
        {[{ key: 'alerts', label: `🚨 Alerts (${alertItems.length})` }, { key: 'all', label: '📦 All Items' }].map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold cursor-pointer transition-all ${tab === t.key ? 'bg-green-600 text-white' : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-green-300'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'alerts' && (
        <div className="space-y-3">
          {alertItems.length === 0
            ? <div className="text-center py-12"><p className="text-4xl mb-3">✅</p><p className="text-gray-500 dark:text-gray-400 text-sm">All items are above par level.</p></div>
            : alertItems.map(renderAlertCard)}
        </div>
      )}

      {tab === 'all' && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 divide-y divide-gray-100">
          {inventory.length === 0
            ? <div className="text-center py-12"><p className="text-4xl mb-3">📦</p><p className="text-gray-500 dark:text-gray-400 text-sm">No inventory items yet.</p></div>
            : inventory.map((item) => {
              const belowPar = (item.currentQty ?? 0) < (item.parLevel ?? 0);
              return (
                <div key={item.id} className="flex items-center justify-between px-4 py-3 gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-gray-800 dark:text-gray-100 text-sm truncate">{item.name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {item.currentQty ?? 0} / {item.parLevel ?? 0} {item.unit}
                      {belowPar && <span className="text-red-500 font-bold ml-1">↓</span>}
                      {item.category ? ` · ${CATEGORIES.find(c => c.id === item.category)?.label ?? item.category}` : ''}
                    </p>
                  </div>
                  <div className="flex gap-1.5 shrink-0">
                    <button onClick={() => setModal({ mode: 'edit', item })}
                      className="px-3 py-1.5 text-xs font-semibold text-gray-500 dark:text-gray-400 hover:text-gray-700 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer">
                      Edit
                    </button>
                    <button onClick={() => onRemove(item.id)}
                      className="px-3 py-1.5 text-xs font-semibold text-red-400 hover:text-red-600 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-red-50 cursor-pointer">
                      ×
                    </button>
                  </div>
                </div>
              );
            })}
        </div>
      )}

      {modal && (
        <ItemForm
          item={modal.mode === 'edit' ? modal.item : null}
          onSave={handleSave}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}
