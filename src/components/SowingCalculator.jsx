/**
 * SowingCalculator.jsx — Backward planning tool.
 *
 * Given a delivery date + crop quantities, calculates exactly when
 * to soak, sow, uncover, and harvest. Generates batch records and
 * daily task items from the timeline.
 */

import { useState, useMemo, useCallback } from 'react';
import { useStatsCollection } from '../hooks/useLearningEngine';
import TrustBadge from './ui/TrustBadge';
import { X, Brain, Package, Calendar, Check, Sprout, ClipboardList, Calculator } from 'lucide-react';
import { Button } from './ui/Button';
import { Card, CardContent } from './ui/Card';
import { Input } from './ui/Input';
import { Label } from './ui/Label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/Select';

// ── Helpers ─────────────────────────────────────────────────────────────────

/** Parse yield string like "8-10 oz" → lower bound number (8). */
function parseYield(str) {
  if (!str) return 0;
  if (typeof str === 'number') return str;
  const m = String(str).match(/([\d.]+)/);
  return m ? parseFloat(m[1]) : 0;
}

/** Add days to a YYYY-MM-DD string, return YYYY-MM-DD. */
function addDays(dateStr, days) {
  const d = new Date(dateStr + 'T12:00:00');
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

/** Format YYYY-MM-DD → "Mon Feb 10" */
function fmtDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

/** Get next Tuesday or Friday from today (example delivery days). */
function nextDeliveryDay() {
  const d = new Date();
  // Just pick 5 days from now as a sensible default
  d.setDate(d.getDate() + 5);
  return d.toISOString().split('T')[0];
}

const BUFFER_DEFAULT = 10; // 10% buffer

// ── Calculation Engine ──────────────────────────────────────────────────────

function calculateTimeline(crop, totalOz, deliveryDate, bufferPercent) {
  const yieldPerTray = parseYield(crop.yieldPerTray);
  if (!yieldPerTray || !totalOz || !deliveryDate) return null;

  const traysNeeded = Math.ceil((totalOz / yieldPerTray) * (1 + bufferPercent / 100));
  const dtm = crop.daysToMaturity || 10;
  const blackout = crop.blackoutDays || 3;
  const soakHours = crop.soakHours || 0;
  const harvestWindow = crop.harvestWindow || 2;

  // Light days = dtm - blackout (time from uncover to harvest-ready)
  const lightDays = Math.max(1, dtm - blackout);

  // Work backward from delivery
  const harvestDate = addDays(deliveryDate, -1); // harvest day before delivery
  const harvestWindowStart = addDays(harvestDate, -(harvestWindow - 1));
  const uncoverDate = addDays(harvestWindowStart, -lightDays);
  const sowDate = addDays(uncoverDate, -blackout);
  const soakDate = soakHours > 0 ? addDays(sowDate, -1) : null;

  return {
    cropName: crop.name,
    cropProfileId: crop.id,
    category: crop.category,
    totalOz,
    yieldPerTray,
    traysNeeded,
    bufferPercent,
    deliveryDate,
    harvestDate,
    harvestWindowStart,
    uncoverDate,
    sowDate,
    soakDate,
    soakHours,
    blackoutDays: blackout,
    lightDays,
    daysToMaturity: dtm,
  };
}

// ── Timeline Visual ─────────────────────────────────────────────────────────

function TimelineCard({ tl, onRemove }) {
  const steps = [];
  if (tl.soakDate) {
    steps.push({ date: tl.soakDate, label: `Soak ${tl.traysNeeded} trays (${tl.soakHours}hrs)`, color: 'text-blue-600 dark:text-blue-400' });
  }
  steps.push({ date: tl.sowDate, label: `Sow ${tl.traysNeeded} trays, stack weights`, color: 'text-green-600 dark:text-green-400' });
  steps.push({ date: tl.uncoverDate, label: 'Uncover, move to light', color: 'text-yellow-600 dark:text-yellow-400' });
  steps.push({ date: tl.harvestWindowStart, label: 'Harvest window opens', color: 'text-red-600 dark:text-red-400' });
  steps.push({ date: tl.deliveryDate, label: 'Delivery ✓', color: 'text-gray-700 dark:text-gray-300' });

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4 shadow-sm">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="font-bold text-gray-800 dark:text-gray-100 text-base">
            {tl.cropName}
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {tl.totalOz}oz needed → {tl.traysNeeded} trays ({tl.bufferPercent}% buffer)
          </p>
        </div>
        {onRemove && (
          <Button variant="ghost" size="icon" onClick={onRemove} className="text-gray-400 hover:text-red-500"><X className="w-4 h-4" /></Button>
        )}
      </div>

      <div className="space-y-0 ml-1">
        {steps.map((s, i) => {
          const isLast = i === steps.length - 1;
          return (
            <div key={i} className="flex items-start gap-3">
              <div className="flex flex-col items-center">
                <div className={`w-2.5 h-2.5 rounded-full mt-1.5 ${
                  isLast ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'
                }`} />
                {!isLast && <div className="w-px h-6 bg-gray-200 dark:bg-gray-700" />}
              </div>
              <div className="pb-1">
                <span className="text-xs font-bold text-gray-500 dark:text-gray-400 mr-2">{fmtDate(s.date)}</span>
                <span className={`text-sm font-medium ${s.color}`}>{s.label}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Crop Row Input ──────────────────────────────────────────────────────────

/** Normalize a crop profile name to match Learning Engine crop keys. */
function normalizeCropName(name) {
  if (!name) return '';
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
}

const TREND_ARROWS = { increasing: '↑', decreasing: '↓', stable: '→' };

function CropRow({ entry, profiles, onChange, onRemove, cropDemand }) {
  // Try to find EWMA demand for the selected crop
  const selectedProfile = profiles.find((p) => p.id === entry.cropId);
  const normalizedName = selectedProfile ? normalizeCropName(selectedProfile.name) : '';
  const demand = normalizedName ? cropDemand?.[normalizedName] : null;
  const showSuggestion = demand && demand.confidence >= 40;

  return (
    <div className="space-y-1">
      <div className="flex flex-wrap items-end gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700">
        <div className="flex-1 min-w-[150px]">
          <Label className="text-[10px] uppercase tracking-wide">Crop</Label>
          <Select value={entry.cropId} onValueChange={(val) => onChange({ ...entry, cropId: val })}>
            <SelectTrigger className="min-h-[44px]"><SelectValue placeholder="Select crop…" /></SelectTrigger>
            <SelectContent>
              {profiles.map((p) => (
                <SelectItem key={p.id} value={p.id}>{p.name} ({p.daysToMaturity} DTM)</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="w-28">
          <Label className="text-[10px] uppercase tracking-wide">Oz Needed</Label>
          <Input
            type="number"
            value={entry.ozNeeded}
            onChange={(e) => onChange({ ...entry, ozNeeded: e.target.value })}
            min="0" step="1"
            placeholder={showSuggestion ? `~${Math.round(demand.ewma)}` : '32'}
            className="min-h-[44px]"
          />
        </div>
        <Button
          variant="destructive"
          size="icon"
          onClick={onRemove}
          className="min-h-[44px] min-w-[44px]"
        >
          <X className="w-4 h-4" />
        </Button>
      </div>
      {/* EWMA suggestion from Learning Engine */}
      {showSuggestion && (
        <div className="flex items-center gap-2 px-3 text-[11px]">
          <TrustBadge confidence={demand.confidence} compact />
          <span className="text-gray-500 dark:text-gray-400">
            EWMA demand: <strong className="text-gray-700 dark:text-gray-200">{Math.round(demand.ewma)} qty</strong>
            {' '}{TREND_ARROWS[demand.trend] || '→'}
          </span>
          <span className="text-gray-400 dark:text-gray-500">
            ({demand.customers} customer{demand.customers !== 1 ? 's' : ''})
          </span>
          {demand.confidence >= 70 && selectedProfile?.yieldPerTray && (
            <span className="text-green-600 dark:text-green-400 font-semibold">
              → ~{Math.ceil(demand.ewma / parseYield(selectedProfile.yieldPerTray) * (1 + BUFFER_DEFAULT / 100))} trays
            </span>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main Component ──────────────────────────────────────────────────────────

export default function SowingCalculator({
  cropProfiles = [],
  shopifyOrders = [],
  onAddBatch,
  onAddTask,
  farmId,
  loading = false,
}) {
  const [deliveryDate, setDeliveryDate] = useState(nextDeliveryDay());
  const [bufferPercent, setBufferPercent] = useState(BUFFER_DEFAULT);
  const [rows, setRows] = useState([{ cropId: '', ozNeeded: '' }]);
  const [generated, setGenerated] = useState(false);
  const [batchesCreated, setBatchesCreated] = useState(0);
  const [tasksCreated, setTasksCreated] = useState(0);

  // Learning Engine: aggregate EWMA demand per crop (single subscription)
  const { ccsStats, yieldProfiles } = useStatsCollection(farmId);
  const cropDemand = useMemo(() => {
    const agg = {};
    for (const s of ccsStats) {
      const key = s.cropKey;
      if (!key) continue;
      if (!agg[key]) agg[key] = { ewma: 0, confidence: 0, trend: 'stable', count: 0, customers: 0 };
      agg[key].ewma += (s.ewma || 0);
      agg[key].confidence = Math.max(agg[key].confidence, s.confidence || 0);
      agg[key].trend = s.trend === 'increasing' ? 'increasing' : (s.trend === 'decreasing' && agg[key].trend !== 'increasing' ? 'decreasing' : agg[key].trend);
      agg[key].count += (s.count || 0);
      agg[key].customers += 1;
    }
    return agg;
  }, [ccsStats]);

  const activeProfiles = useMemo(() =>
    cropProfiles.filter((p) => p.active !== false).sort((a, b) => a.name.localeCompare(b.name)),
    [cropProfiles]
  );

  // Compute recommended buffer from yield profiles (Phase 4: buffer auto-adjustment)
  const suggestedBuffer = useMemo(() => {
    const selectedCropKeys = rows
      .filter(r => r.cropId)
      .map(r => {
        const p = activeProfiles.find(cp => cp.id === r.cropId);
        return p ? normalizeCropName(p.name) : null;
      })
      .filter(Boolean);
    if (selectedCropKeys.length === 0) return null;
    const buffers = selectedCropKeys
      .map(key => {
        const yp = yieldProfiles.get(key);
        return yp?.adjustedBuffer ?? null;
      })
      .filter(b => b !== null);
    if (buffers.length === 0) return null;
    return Math.round(buffers.reduce((a, b) => a + b, 0) / buffers.length);
  }, [rows, activeProfiles, yieldProfiles]);

  const addRow = () => setRows((r) => [...r, { cropId: '', ozNeeded: '' }]);
  const removeRow = (i) => setRows((r) => r.filter((_, idx) => idx !== i));
  const updateRow = (i, updated) => setRows((r) => r.map((e, idx) => idx === i ? updated : e));

  // Pull from confirmed orders for the selected delivery date
  const pullFromOrders = useCallback(() => {
    if (!shopifyOrders?.length || !deliveryDate) return;

    // Try to match orders whose delivery date matches
    // Check requestedDeliveryDate, deliveryDate, or createdAt
    const matching = shopifyOrders.filter((o) => {
      // Only confirmed / active orders
      const status = (o.status || '').toLowerCase();
      if (status === 'cancelled' || status === 'delivered') return false;

      const dd = o.requestedDeliveryDate || o.deliveryDate;
      if (dd === deliveryDate) return true;

      // Fuzzy: if no delivery date set, check if order is within a day
      if (!dd && o.createdAt) {
        const created = typeof o.createdAt === 'string' ? o.createdAt.split('T')[0] : '';
        return created === deliveryDate;
      }
      return false;
    });

    if (matching.length === 0) return;

    // Sum quantities by product name (best-effort match to crop profiles)
    const sums = {};
    for (const order of matching) {
      const items = order.lineItems || order.items || [];
      for (const item of items) {
        const name = (item.title || item.name || '').toLowerCase();
        const qty = parseFloat(item.quantity) || 1;
        // Try to figure out oz from variant title or just use qty
        const ozMatch = (item.variantTitle || '').match(/([\d.]+)\s*oz/i);
        const oz = ozMatch ? parseFloat(ozMatch[1]) * qty : qty;
        sums[name] = (sums[name] || 0) + oz;
      }
    }

    // Map to crop profile IDs
    const newRows = [];
    for (const [name, oz] of Object.entries(sums)) {
      const profile = activeProfiles.find((p) => p.name.toLowerCase().includes(name) || name.includes(p.name.toLowerCase()));
      if (profile) {
        newRows.push({ cropId: profile.id, ozNeeded: Math.ceil(oz).toString() });
      }
    }

    if (newRows.length > 0) {
      setRows(newRows);
    }
  }, [shopifyOrders, deliveryDate, activeProfiles]);

  // Calculate timelines for all valid rows
  const timelines = useMemo(() => {
    return rows
      .filter((r) => r.cropId && r.ozNeeded)
      .map((r) => {
        const crop = activeProfiles.find((p) => p.id === r.cropId);
        if (!crop) return null;
        return calculateTimeline(crop, parseFloat(r.ozNeeded), deliveryDate, bufferPercent);
      })
      .filter(Boolean);
  }, [rows, activeProfiles, deliveryDate, bufferPercent]);

  // Generate batch records
  const generateBatches = useCallback(async () => {
    if (!onAddBatch || timelines.length === 0) return;
    let count = 0;
    for (const tl of timelines) {
      // Learning Engine: find EWMA prediction for this crop (Phase 4 prediction tracking)
      const normalizedKey = normalizeCropName(tl.cropName);
      const demandData = normalizedKey ? cropDemand?.[normalizedKey] : null;

      await onAddBatch({
        cropProfileId: tl.cropProfileId,
        cropName: tl.cropName,
        cropCategory: tl.category || 'microgreens',
        varietyName: tl.cropName,
        trayCount: tl.traysNeeded,
        quantity: tl.traysNeeded,
        unit: 'tray',
        totalOzTarget: tl.totalOz,
        sowDate: tl.sowDate,
        soakDate: tl.soakDate,
        uncoverDate: tl.uncoverDate,
        expectedHarvestDate: tl.harvestWindowStart,
        estimatedHarvestStart: tl.harvestWindowStart,
        estimatedHarvestEnd: tl.harvestDate,
        deliveryDate: tl.deliveryDate,
        stage: 'planned',
        source: 'sowing-calculator',
        linkedOrderIds: [],
        actualYieldOz: null,
        // Phase 4: prediction tracking for feedback loop
        ewmaPredictedQty: demandData?.ewma ? Math.round(demandData.ewma) : null,
        ewmaConfidence: demandData?.confidence ?? null,
        bufferUsed: tl.bufferPercent,
        notes: `Auto-generated: ${tl.totalOz}oz target, ${tl.bufferPercent}% buffer${demandData?.ewma ? ` (EWMA: ~${Math.round(demandData.ewma)})` : ''}`,
      });
      count++;
    }
    setBatchesCreated(count);
    setGenerated(true);
  }, [onAddBatch, timelines, cropDemand]);

  // Generate daily tasks from timelines
  const generateTasks = useCallback(async () => {
    if (!onAddTask || timelines.length === 0) return;
    let count = 0;
    for (const tl of timelines) {
      const tasks = [];
      if (tl.soakDate) {
        tasks.push({
          title: `Soak ${tl.traysNeeded} trays ${tl.cropName} (${tl.soakHours}hrs)`,
          dueDate: tl.soakDate,
          category: 'growing',
          priority: 'high',
        });
      }
      tasks.push({
        title: `Sow ${tl.traysNeeded} trays ${tl.cropName}`,
        dueDate: tl.sowDate,
        category: 'growing',
        priority: 'high',
      });
      tasks.push({
        title: `Uncover ${tl.traysNeeded} trays ${tl.cropName} — move to light`,
        dueDate: tl.uncoverDate,
        category: 'growing',
        priority: 'medium',
      });
      tasks.push({
        title: `Harvest ${tl.traysNeeded} trays ${tl.cropName} (${tl.totalOz}oz target)`,
        dueDate: tl.harvestWindowStart,
        category: 'growing',
        priority: 'high',
      });

      for (const t of tasks) {
        await onAddTask({
          ...t,
          status: 'todo',
          source: 'sowing-calculator',
          sortOrder: Date.now(),
        });
        count++;
      }
    }
    setTasksCreated(count);
  }, [onAddTask, timelines]);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto animate-pulse space-y-4">
        <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded-xl w-64" />
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-96" />
        <div className="h-40 bg-gray-200 dark:bg-gray-700 rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">Sowing Calculator</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Work backward from delivery to plan soak, sow, uncover & harvest dates
        </p>
      </div>

      {/* Input Section */}
      <Card className="rounded-2xl mb-6">
        <CardContent className="p-5">
        {/* Delivery date + buffer */}
        <div className="flex flex-wrap gap-4 mb-4">
          <div className="flex-1 min-w-[180px]">
            <Label className="text-[10px] uppercase tracking-wide">Delivery Date</Label>
            <Input
              type="date"
              value={deliveryDate}
              onChange={(e) => setDeliveryDate(e.target.value)}
              className="min-h-[44px]"
            />
          </div>
          <div className="w-32">
            <Label className="text-[10px] uppercase tracking-wide">Buffer %</Label>
            <Input
              type="number"
              value={bufferPercent}
              onChange={(e) => setBufferPercent(Number(e.target.value))}
              min="0" max="50"
              className="min-h-[44px]"
            />
            {suggestedBuffer !== null && suggestedBuffer !== bufferPercent && (
              <Button variant="link" size="sm" onClick={() => setBufferPercent(suggestedBuffer)} className="text-[10px] text-indigo-600 dark:text-indigo-400 mt-0.5">
                <Brain className="w-3 h-3 mr-0.5" /> Yield data suggests {suggestedBuffer}%
              </Button>
            )}
          </div>
          <div className="flex items-end">
            <Button
              onClick={pullFromOrders}
              className="min-h-[44px]"
            >
              <Package className="w-4 h-4 mr-1" /> Pull from Orders
            </Button>
          </div>
        </div>

        {/* Crop rows */}
        <div className="space-y-2 mb-4">
          {rows.map((r, i) => (
            <CropRow
              key={i}
              entry={r}
              profiles={activeProfiles}
              onChange={(updated) => updateRow(i, updated)}
              onRemove={() => removeRow(i)}
              cropDemand={cropDemand}
            />
          ))}
        </div>

        <Button
          variant="outline"
          onClick={addRow}
          className="min-h-[44px]"
        >
          + Add Crop
        </Button>
      </CardContent>
      </Card>

      {/* Results */}
      {timelines.length > 0 && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100">
              📅 Growing Plan — {fmtDate(deliveryDate)} delivery
            </h3>
            <span className="text-xs text-gray-400">{timelines.length} crop(s)</span>
          </div>

          {/* Timeline cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {timelines.map((tl, i) => (
              <TimelineCard key={i} tl={tl} />
            ))}
          </div>

          {/* Summary table */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4 shadow-sm">
            <h4 className="font-bold text-gray-700 dark:text-gray-200 text-sm mb-3">Summary</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-xs text-gray-500 dark:text-gray-400">
                  <tr>
                    <th className="text-left py-1 pr-4">Crop</th>
                    <th className="text-right py-1 px-2">Oz</th>
                    <th className="text-right py-1 px-2">Trays</th>
                    <th className="text-left py-1 px-2">Sow</th>
                    <th className="text-left py-1 px-2">Harvest</th>
                  </tr>
                </thead>
                <tbody className="text-gray-700 dark:text-gray-300">
                  {timelines.map((tl, i) => (
                    <tr key={i} className="border-t border-gray-100 dark:border-gray-700/50">
                      <td className="py-1.5 pr-4 font-medium">{tl.cropName}</td>
                      <td className="py-1.5 px-2 text-right">{tl.totalOz}</td>
                      <td className="py-1.5 px-2 text-right font-bold">{tl.traysNeeded}</td>
                      <td className="py-1.5 px-2">{fmtDate(tl.sowDate)}</td>
                      <td className="py-1.5 px-2">{fmtDate(tl.harvestWindowStart)}</td>
                    </tr>
                  ))}
                  <tr className="border-t-2 border-gray-300 dark:border-gray-600 font-bold text-gray-800 dark:text-gray-100">
                    <td className="py-1.5 pr-4">Total</td>
                    <td className="py-1.5 px-2 text-right">{timelines.reduce((s, t) => s + t.totalOz, 0)}</td>
                    <td className="py-1.5 px-2 text-right">{timelines.reduce((s, t) => s + t.traysNeeded, 0)}</td>
                    <td colSpan={2} />
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap gap-3">
            <button
              onClick={generateBatches}
              disabled={generated}
              className="px-6 py-3 min-h-[52px] rounded-xl bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-sm font-bold cursor-pointer transition-colors shadow-md"
            >
              {batchesCreated > 0 ? <><Check className="w-4 h-4 inline mr-1" />{batchesCreated} Batches Created</> : <><Sprout className="w-4 h-4 inline mr-1" /> Generate Batches</>}
            </button>
            <button
              onClick={generateTasks}
              disabled={tasksCreated > 0}
              className="px-6 py-3 min-h-[52px] rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-bold cursor-pointer transition-colors shadow-md"
            >
              {tasksCreated > 0 ? <><Check className="w-4 h-4 inline mr-1" />{tasksCreated} Tasks Created</> : <><ClipboardList className="w-4 h-4 inline mr-1" /> Generate Daily Tasks</>}
            </button>
          </div>

          {(batchesCreated > 0 || tasksCreated > 0) && (
            <p className="text-sm text-green-600 dark:text-green-400 font-medium">
              {batchesCreated > 0 && `${batchesCreated} batch records created. `}
              {tasksCreated > 0 && `${tasksCreated} task items created. `}
              View them in Growth Tracker and Kanban Board.
            </p>
          )}
        </div>
      )}

      {timelines.length === 0 && rows.some((r) => r.cropId) && (
        <div className="text-center py-12">
          <p className="text-3xl mb-2">🧮</p>
          <p className="text-gray-500 dark:text-gray-400 text-sm">Enter oz needed for each crop to see the growing plan</p>
        </div>
      )}

      {!rows.some((r) => r.cropId) && (
        <div className="text-center py-12">
          <p className="text-3xl mb-2">🌱</p>
          <p className="text-gray-500 dark:text-gray-400 text-sm">Select crops above and enter quantities — or pull from pending orders</p>
        </div>
      )}
    </div>
  );
}
