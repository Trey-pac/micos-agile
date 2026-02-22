import { useState, useMemo } from 'react';
import { AlertTriangle, CheckCircle, Package, Download, Plus } from 'lucide-react';
import { queryDemand } from '../utils/demandUtils';
import { calculateSowingNeeds } from '../utils/sowingUtils';
import { InventorySkeleton } from './ui/Skeletons';
import { Button } from './ui/Button';
import { Card, CardContent } from './ui/Card';
import { Badge } from './ui/Badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/Dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from './ui/Tabs';
import SmartImport from './SmartImport';
import { inventoryImportConfig } from '../data/importConfigs';
import { importInventory } from '../services/importService';
import { Input } from './ui/Input';
import { Label } from './ui/Label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/Select';

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
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{item ? 'Edit Item' : 'Add Inventory Item'}</DialogTitle>
        </DialogHeader>

        <Input
          placeholder="Item name *"
          value={form.name}
          onChange={(e) => set('name', e.target.value)}
        />

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs">Category</Label>
            <Select value={form.category} onValueChange={(val) => set('category', val)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Unit (oz / lbs / bags…)</Label>
            <Input value={form.unit} onChange={(e) => set('unit', e.target.value)} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {[['currentQty', 'Current Qty'], ['parLevel', 'Par Level']].map(([k, label]) => (
            <div key={k}>
              <Label className="text-xs">{label}</Label>
              <Input type="number" min="0" step="0.01" value={form[k]}
                onChange={(e) => set(k, e.target.value)} />
            </div>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs">Supplier</Label>
            <Input value={form.supplier} onChange={(e) => set('supplier', e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">Cost / unit ($)</Label>
            <Input type="number" min="0" step="0.01" value={form.costPerUnit}
              onChange={(e) => set('costPerUnit', e.target.value)} />
          </div>
        </div>

        <Button onClick={handleSave} disabled={saving || !form.name.trim()} className="w-full">
          {saving ? 'Saving…' : item ? 'Save Changes' : 'Add Item'}
        </Button>
      </DialogContent>
    </Dialog>
  );
}

export default function InventoryAlerts({
  inventory = [], orders = [], activeBatches = [],
  onAdd, onEdit, onRemove,
  loading = false, farmId,
}) {
  const [modal,  setModal]  = useState(null);
  const [marking, setMarking] = useState(null);
  const [showImport, setShowImport] = useState(false);
  const [activeTab, setActiveTab] = useState('alerts');

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
                  Ã¢Å¡Â Ã¯Â¸Â Sowing needed
                </span>
              )}
            </div>
            <p className="text-sm text-red-600 font-semibold mt-0.5">
              {item.currentQty ?? 0} {item.unit} remaining Ã¢â‚¬â€ ORDER NEEDED
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Par: {item.parLevel ?? 0} {item.unit} Ã‚Â· Deficit: {deficit.toFixed(1)} {item.unit}
              {item.supplier ? ` Ã‚Â· ${item.supplier}` : ''}
              {item.lastOrderedDate ? ` Ã‚Â· Last ordered: ${item.lastOrderedDate}` : ''}
            </p>
          </div>
          <div className="flex gap-1.5 shrink-0">
            <button onClick={() => handleMarkOrdered(item)} disabled={marking === item.id}
              className="px-3 py-1.5 bg-green-600 text-white text-xs font-bold rounded-lg hover:bg-green-700 disabled:opacity-50 cursor-pointer">
              {marking === item.id ? 'Ã¢â‚¬Â¦' : 'Ordered'}
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
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setShowImport(true)}>
            <Download className="w-4 h-4 mr-1.5" /> Import CSV
          </Button>
          <Button onClick={() => setModal({ mode: 'add' })}>
            <Plus className="w-4 h-4 mr-1" /> Add Item
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="alerts">🚨 Alerts ({alertItems.length})</TabsTrigger>
          <TabsTrigger value="all">📦 All Items</TabsTrigger>
        </TabsList>

        <TabsContent value="alerts">
        <div className="space-y-3">
          {alertItems.length === 0
            ? <div className="text-center py-12"><CheckCircle className="w-12 h-12 mx-auto mb-3 text-gray-300 dark:text-gray-600" /><p className="text-gray-500 dark:text-gray-400 text-sm">All items are above par level.</p></div>
            : alertItems.map(renderAlertCard)}
        </div>
        </TabsContent>

        <TabsContent value="all">
        <Card>
          {inventory.length === 0
            ? <div className="text-center py-12"><Package className="w-12 h-12 mx-auto mb-3 text-gray-300 dark:text-gray-600" /><p className="text-gray-500 dark:text-gray-400 text-sm">No inventory items yet.</p></div>
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
                    <Button variant="outline" size="sm" onClick={() => setModal({ mode: 'edit', item })}>
                      Edit
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => onRemove(item.id)} className="text-red-400 hover:text-red-600">
                      ×
                    </Button>
                  </div>
                </div>
              );
            })}
        </Card>
        </TabsContent>
      </Tabs>

      {modal && (
        <ItemForm
          item={modal.mode === 'edit' ? modal.item : null}
          onSave={handleSave}
          onClose={() => setModal(null)}
        />
      )}

      <SmartImport
        isOpen={showImport}
        onClose={() => setShowImport(false)}
        config={inventoryImportConfig}
        onImport={(rows) => importInventory(farmId, rows)}
        existingCount={inventory.length}
      />
    </div>
  );
}
