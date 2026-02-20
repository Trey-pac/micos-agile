/**
 * BatchTracker.jsx — Unified batch list with upgraded stage flow.
 *
 * Stage flow:  planned → soaking → sown → germinating → growing → ready → harvested
 *
 * Features:
 *  - All active batches sorted by expected harvest (soonest first)
 *  - Progress bar per batch showing lifecycle position
 *  - Auto-suggest stage transition if dates have passed
 *  - Harvest yield entry + accuracy calculation
 *  - Color-coded by stage
 *  - Ready-stage batches flagged prominently
 */

import { useState, useMemo, useCallback } from 'react';

// ── Stage Config ────────────────────────────────────────────────────────────

const STAGES = [
  { id: 'planned',      label: 'Planned',      color: 'bg-gray-400',   text: 'text-gray-600 dark:text-gray-400',   bg: 'bg-gray-100 dark:bg-gray-700',   emoji: '📝', step: 0 },
  { id: 'soaking',      label: 'Soaking',      color: 'bg-blue-400',   text: 'text-blue-600 dark:text-blue-400',   bg: 'bg-blue-50 dark:bg-blue-900/30',  emoji: '💧', step: 1 },
  { id: 'sown',         label: 'Sown',         color: 'bg-green-400',  text: 'text-green-600 dark:text-green-400', bg: 'bg-green-50 dark:bg-green-900/30', emoji: '🌱', step: 2 },
  { id: 'germinating',  label: 'Germinating',  color: 'bg-lime-400',   text: 'text-lime-600 dark:text-lime-400',   bg: 'bg-lime-50 dark:bg-lime-900/30',  emoji: '🌿', step: 3 },
  { id: 'growing',      label: 'Growing',      color: 'bg-yellow-400', text: 'text-yellow-600 dark:text-yellow-400', bg: 'bg-yellow-50 dark:bg-yellow-900/30', emoji: '☀️', step: 4 },
  { id: 'ready',        label: 'Ready',        color: 'bg-red-400',    text: 'text-red-600 dark:text-red-400',     bg: 'bg-red-50 dark:bg-red-900/30',    emoji: '🌾', step: 5 },
  { id: 'harvested',    label: 'Harvested',    color: 'bg-purple-400', text: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-50 dark:bg-purple-900/30', emoji: '✅', step: 6 },
];

const STAGE_MAP = Object.fromEntries(STAGES.map((s) => [s.id, s]));

function getStageConfig(stageId) {
  return STAGE_MAP[stageId] || STAGE_MAP['planned'];
}

function getStageIndex(stageId) {
  const s = STAGE_MAP[stageId];
  return s ? s.step : 0;
}

function nextStageId(currentId) {
  const idx = STAGES.findIndex((s) => s.id === currentId);
  if (idx === -1 || idx >= STAGES.length - 1) return null;
  return STAGES[idx + 1].id;
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function todayStr() { return new Date().toISOString().split('T')[0]; }

function toDateStr(d) {
  if (!d) return null;
  if (typeof d === 'string') return d.split('T')[0];
  if (d.toDate) return d.toDate().toISOString().split('T')[0];
  if (d._seconds || d.seconds) return new Date((d._seconds || d.seconds) * 1000).toISOString().split('T')[0];
  return null;
}

function fmtShort(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function daysUntil(dateStr) {
  if (!dateStr) return null;
  const target = new Date(dateStr + 'T12:00:00');
  const now = new Date();
  now.setHours(12, 0, 0, 0);
  return Math.round((target - now) / 86400000);
}

// ── Suggestion Logic ────────────────────────────────────────────────────────

function getSuggestion(batch) {
  const today = todayStr();
  const stage = batch.stage || 'planned';
  const soakDate = toDateStr(batch.soakDate);
  const sowDate = toDateStr(batch.sowDate);
  const uncoverDate = toDateStr(batch.uncoverDate);
  const harvestDate = toDateStr(batch.expectedHarvestDate || batch.estimatedHarvestStart);

  if (stage === 'planned' && soakDate && soakDate <= today) return { next: 'soaking', msg: 'Ready to soak?' };
  if (stage === 'planned' && sowDate && sowDate <= today) return { next: 'sown', msg: 'Ready to sow?' };
  if (stage === 'soaking' && sowDate && sowDate <= today) return { next: 'sown', msg: 'Ready to sow?' };
  if (stage === 'sown' && uncoverDate && uncoverDate <= today) return { next: 'germinating', msg: 'Germination started?' };
  if (stage === 'germinating' && uncoverDate && uncoverDate <= today) return { next: 'growing', msg: 'Move to light?' };
  if (stage === 'growing' && harvestDate && harvestDate <= today) return { next: 'ready', msg: 'Ready to harvest?' };
  return null;
}

// ── Harvest Modal ───────────────────────────────────────────────────────────

function HarvestModal({ batch, onHarvest, onClose }) {
  const [actualOz, setActualOz] = useState('');

  const expectedOz = batch.totalOzTarget || 0;
  const actual = parseFloat(actualOz) || 0;
  const accuracy = expectedOz > 0 && actual > 0
    ? Math.round((actual / expectedOz) * 100)
    : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100">
            🌾 Harvest — {batch.cropName || batch.varietyName}
          </h3>
          <p className="text-sm text-gray-500">
            {batch.trayCount || batch.quantity || '?'} trays · Expected: {expectedOz}oz
          </p>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">Actual Yield (oz)</label>
            <input
              type="number"
              value={actualOz}
              onChange={(e) => setActualOz(e.target.value)}
              min="0" step="0.5"
              placeholder={expectedOz ? `Expected: ${expectedOz}oz` : 'Enter oz'}
              className="w-full px-3 py-2.5 min-h-[44px] rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200 text-sm focus:outline-none focus:border-green-400"
              autoFocus
            />
          </div>
          {accuracy !== null && (
            <div className={`text-center py-2 rounded-xl ${
              accuracy >= 90 ? 'bg-green-50 dark:bg-green-900/20 text-green-600' :
              accuracy >= 70 ? 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-600' :
              'bg-red-50 dark:bg-red-900/20 text-red-600'
            }`}>
              <span className="text-2xl font-bold">{accuracy}%</span>
              <span className="text-xs ml-1">accuracy</span>
            </div>
          )}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2.5 min-h-[44px] rounded-xl bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-sm font-semibold cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-600"
            >
              Cancel
            </button>
            <button
              onClick={() => onHarvest(batch, parseFloat(actualOz) || 0)}
              className="flex-1 px-4 py-2.5 min-h-[44px] rounded-xl bg-green-600 hover:bg-green-700 text-white text-sm font-bold cursor-pointer"
            >
              ✅ Harvest
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Batch Card ──────────────────────────────────────────────────────────────

function BatchCard({ batch, onAdvance, onHarvestClick }) {
  const stage = getStageConfig(batch.stage);
  const stageIdx = getStageIndex(batch.stage);
  const totalSteps = STAGES.length - 1; // exclude harvested from progress
  const progress = Math.min(100, Math.round((stageIdx / totalSteps) * 100));
  const suggestion = getSuggestion(batch);

  const harvestDate = toDateStr(batch.expectedHarvestDate || batch.estimatedHarvestStart);
  const daysLeft = daysUntil(harvestDate);
  const cropName = batch.cropName || batch.varietyName || 'Unknown';
  const trays = batch.trayCount || batch.quantity || '?';

  // Yield tracking for harvested batches
  const actualOz = batch.actualYieldOz || batch.actualYield || batch.harvestYield;
  const expectedOz = batch.totalOzTarget || batch.expectedYield;
  const yieldAccuracy = expectedOz > 0 && actualOz > 0 ? Math.round((actualOz / expectedOz) * 100) : null;

  return (
    <div className={`rounded-2xl border transition-all shadow-sm ${
      batch.stage === 'ready'
        ? 'border-red-300 dark:border-red-600 ring-2 ring-red-200 dark:ring-red-800'
        : 'border-gray-200 dark:border-gray-700'
    } bg-white dark:bg-gray-800`}>
      <div className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between mb-2">
          <div>
            <h3 className="font-bold text-gray-800 dark:text-gray-100 text-base flex items-center gap-1.5">
              <span>{stage.emoji}</span>
              {cropName}
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {trays} trays · {stage.label}
              {daysLeft !== null && batch.stage !== 'harvested' && (
                <span className={`ml-2 font-semibold ${
                  daysLeft <= 0 ? 'text-red-600' : daysLeft <= 2 ? 'text-amber-600' : 'text-gray-500'
                }`}>
                  {daysLeft <= 0 ? '🔴 NOW' : `${daysLeft}d to harvest`}
                </span>
              )}
            </p>
          </div>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${stage.bg} ${stage.text}`}>
            {stage.label}
          </span>
        </div>

        {/* Progress bar */}
        <div className="mb-3">
          <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${stage.color}`}
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex justify-between text-[10px] text-gray-400 mt-0.5">
            <span>Planted</span>
            <span>{progress}%</span>
            <span>Harvest</span>
          </div>
        </div>

        {/* Dates row */}
        <div className="flex flex-wrap gap-3 text-xs text-gray-500 dark:text-gray-400 mb-3">
          {batch.sowDate && <span>Sow: {fmtShort(toDateStr(batch.sowDate))}</span>}
          {harvestDate && <span>Harvest: {fmtShort(harvestDate)}</span>}
          {batch.deliveryDate && <span>Delivery: {fmtShort(toDateStr(batch.deliveryDate))}</span>}
        </div>

        {/* Yield info for harvested */}
        {batch.stage === 'harvested' && actualOz && (
          <div className="flex items-center gap-3 text-xs mb-3">
            <span className="text-gray-500">Yield: {actualOz}oz</span>
            {yieldAccuracy !== null && (
              <span className={`font-bold ${
                yieldAccuracy >= 90 ? 'text-green-600' : yieldAccuracy >= 70 ? 'text-amber-600' : 'text-red-600'
              }`}>
                {yieldAccuracy}% accuracy
              </span>
            )}
          </div>
        )}

        {/* Ready alert */}
        {batch.stage === 'ready' && (
          <div className="mb-3 p-2 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
            <p className="text-red-700 dark:text-red-300 text-xs font-bold">
              🌾 {trays} trays {cropName} ready to harvest!
            </p>
          </div>
        )}

        {/* Auto-suggestion */}
        {suggestion && batch.stage !== 'ready' && (
          <div className="mb-3 p-2 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
            <div className="flex items-center justify-between">
              <p className="text-amber-700 dark:text-amber-300 text-xs font-semibold">{suggestion.msg}</p>
              <button
                onClick={() => onAdvance(batch, suggestion.next)}
                className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-[10px] font-bold cursor-pointer"
              >
                Yes →
              </button>
            </div>
          </div>
        )}

        {/* Actions */}
        {batch.stage !== 'harvested' && (
          <div className="flex gap-2">
            {batch.stage === 'ready' ? (
              <button
                onClick={() => onHarvestClick(batch)}
                className="flex-1 px-4 py-2 min-h-[44px] rounded-xl bg-green-600 hover:bg-green-700 text-white text-xs font-bold cursor-pointer"
              >
                🌾 Record Harvest
              </button>
            ) : (
              <select
                value={batch.stage}
                onChange={(e) => onAdvance(batch, e.target.value)}
                className="flex-1 px-3 py-2 min-h-[44px] rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-700 dark:text-gray-200 text-xs font-semibold focus:outline-none focus:border-green-400 cursor-pointer"
              >
                {STAGES.filter((s) => s.id !== 'harvested').map((s) => (
                  <option key={s.id} value={s.id}>{s.emoji} {s.label}</option>
                ))}
              </select>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main Component ──────────────────────────────────────────────────────────

export default function BatchTracker({
  batches = [],
  loading = false,
  onEditBatch,
  onHarvestBatch,
}) {
  const [filter, setFilter] = useState('active'); // active | planned | ready | harvested | all
  const [search, setSearch] = useState('');
  const [harvestModal, setHarvestModal] = useState(null);

  const handleAdvance = useCallback((batch, newStage) => {
    if (!onEditBatch) return;
    const now = new Date().toISOString();
    const history = batch.stageHistory || [];
    onEditBatch(batch.id, {
      stage: newStage,
      stageHistory: [...history, { stage: newStage, enteredAt: now }],
      [`${newStage}At`]: now,
    });
  }, [onEditBatch]);

  const handleHarvest = useCallback((batch, actualOz) => {
    if (!onEditBatch) return;
    const now = new Date().toISOString();
    const history = batch.stageHistory || [];
    onEditBatch(batch.id, {
      stage: 'harvested',
      harvestedAt: now,
      actualYieldOz: actualOz,
      stageHistory: [...history, { stage: 'harvested', enteredAt: now }],
    });
    setHarvestModal(null);
  }, [onEditBatch]);

  const filtered = useMemo(() => {
    let list = batches;

    // Stage filter
    if (filter === 'active') list = list.filter((b) => b.stage !== 'harvested');
    else if (filter === 'planned') list = list.filter((b) => b.stage === 'planned');
    else if (filter === 'ready') list = list.filter((b) => b.stage === 'ready');
    else if (filter === 'harvested') list = list.filter((b) => b.stage === 'harvested');

    // Search
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((b) =>
        (b.cropName || b.varietyName || '').toLowerCase().includes(q) ||
        (b.stage || '').toLowerCase().includes(q)
      );
    }

    // Sort: ready first, then by expected harvest date (soonest first), then created
    return list.sort((a, b) => {
      // Ready batches bubble to top
      if (a.stage === 'ready' && b.stage !== 'ready') return -1;
      if (b.stage === 'ready' && a.stage !== 'ready') return 1;

      const aDate = toDateStr(a.expectedHarvestDate || a.estimatedHarvestStart) || '9999';
      const bDate = toDateStr(b.expectedHarvestDate || b.estimatedHarvestStart) || '9999';
      return aDate.localeCompare(bDate);
    });
  }, [batches, filter, search]);

  const readyCount = batches.filter((b) => b.stage === 'ready').length;
  const activeCount = batches.filter((b) => b.stage !== 'harvested').length;

  const FILTERS = [
    { key: 'active', label: `Active (${activeCount})` },
    { key: 'planned', label: 'Planned' },
    { key: 'ready', label: `Ready (${readyCount})` },
    { key: 'harvested', label: 'Harvested' },
    { key: 'all', label: 'All' },
  ];

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto animate-pulse space-y-4">
        <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded-xl w-48" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => <div key={i} className="h-36 bg-gray-200 dark:bg-gray-700 rounded-2xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">Batch Tracker</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {activeCount} active · {readyCount} ready to harvest
          </p>
        </div>
      </div>

      {/* Ready alert banner */}
      {readyCount > 0 && (
        <div className="mb-4 p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border-2 border-red-200 dark:border-red-700">
          <p className="text-red-700 dark:text-red-300 font-bold text-sm">
            🌾 {readyCount} batch{readyCount !== 1 ? 'es' : ''} ready to harvest!
          </p>
          <button
            onClick={() => setFilter('ready')}
            className="mt-1 text-red-600 dark:text-red-400 text-xs font-semibold underline cursor-pointer"
          >
            Show ready batches →
          </button>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-4">
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-3 py-2 min-h-[44px] rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                filter === f.key
                  ? 'bg-green-600 text-white shadow-sm'
                  : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-green-300'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search batches…"
          className="flex-1 min-w-[140px] px-3 py-2 min-h-[44px] rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 text-sm focus:outline-none focus:border-green-400"
        />
      </div>

      {/* Batch grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-4xl mb-3">🌱</p>
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            {batches.length === 0 ? 'No batches yet — use the Sowing Calculator to create some' : 'No batches match your filters'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {filtered.map((b) => (
            <BatchCard
              key={b.id}
              batch={b}
              onAdvance={handleAdvance}
              onHarvestClick={setHarvestModal}
            />
          ))}
        </div>
      )}

      {/* Harvest Modal */}
      {harvestModal && (
        <HarvestModal
          batch={harvestModal}
          onHarvest={handleHarvest}
          onClose={() => setHarvestModal(null)}
        />
      )}
    </div>
  );
}
