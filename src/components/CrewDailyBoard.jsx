import { useState, useMemo } from 'react';
import { queryDemand } from '../utils/demandUtils';
import { calculateSowingNeeds } from '../utils/sowingUtils';
import {
  getBatchesNeedingStageAdvance,
  getBatchesInHarvestWindow,
  getTodaysSowingNeeds,
} from '../utils/pipelineUtils';

const STAGE_LABELS = {
  germination: 'Germination',
  blackout:    'Blackout',
  light:       'Light',
  ready:       'Ready',
  seedling:    'Seedling',
  transplant:  'Transplant',
  growing:     'Growing',
  inoculation: 'Inoculation',
  incubation:  'Incubation',
  pinning:     'Pinning',
  fruiting:    'Fruiting',
};

const URGENCY_TAG = {
  critical: { label: '🔴 CRITICAL — plant now',   cls: 'text-red-400' },
  warning:  { label: '🟡 Low supply — plant soon', cls: 'text-amber-400' },
  healthy:  { label: '✅ Routine restock',          cls: 'text-green-400' },
};

function SectionHeader({ emoji, title, badge }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <span className="text-2xl">{emoji}</span>
      <h2 className="text-xl font-black text-white">{title}</h2>
      <span className="ml-auto text-sm font-semibold text-gray-500">{badge}</span>
    </div>
  );
}

function EmptyState({ color, message }) {
  return (
    <div className="bg-gray-800 rounded-2xl p-6 text-center">
      <div className="text-4xl mb-2">✅</div>
      <div className={`font-bold ${color}`}>{message}</div>
    </div>
  );
}

/**
 * CrewDailyBoard — the single-screen crew-facing production board.
 *
 * Phone-first, dark mode, 56px+ touch targets.
 * Three sections stacked vertically — no tabs, no nav.
 *
 * Section 1: 🌱 Plant Today   — one-tap plant from sowing recommendations
 * Section 2: 🔄 Move Today    — one-tap stage advance for due batches
 * Section 3: ✂️ Harvest Today — two-tap (expand + confirm yield) harvest
 */
export default function CrewDailyBoard({
  orders = [],
  activeBatches = [],
  onPlantBatch,
  onAdvanceStage,
  onHarvestBatch,
  user,
}) {
  const userId = user?.uid ?? null;
  const crewName = user?.displayName?.split(' ')[0] || 'Crew';

  const today = useMemo(() => new Date().toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric',
  }), []);

  // ── Compute action lists ───────────────────────────────────────────────────
  const demandData   = useMemo(() => queryDemand(orders),                              [orders]);
  const sowingNeeds  = useMemo(() => calculateSowingNeeds(demandData, activeBatches),  [demandData, activeBatches]);
  const plantToday   = useMemo(() => getTodaysSowingNeeds(sowingNeeds),                [sowingNeeds]);
  const moveToday    = useMemo(() => getBatchesNeedingStageAdvance(activeBatches),     [activeBatches]);
  const harvestToday = useMemo(() => getBatchesInHarvestWindow(activeBatches),         [activeBatches]);

  // ── Optimistic UI state (hides cards after action) ─────────────────────────
  const [planted,  setPlanted]  = useState(new Set()); // Set<cropId>
  const [moved,    setMoved]    = useState(new Set()); // Set<batchId>
  const [harvested, setHarvested] = useState(new Set()); // Set<batchId>

  // Inline expand state for harvest section: batchId → { yieldValue: string }
  const [harvestExpanded, setHarvestExpanded] = useState({});

  // Per-action loading keys
  const [loading, setLoading] = useState({});
  const setLoad = (key, val) => setLoading(l => ({ ...l, [key]: val }));

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handlePlant = async (need) => {
    const key = `plant-${need.cropId}`;
    setLoad(key, true);
    try {
      await onPlantBatch?.(need, userId);
      setPlanted(s => new Set([...s, need.cropId]));
    } finally {
      setLoad(key, false);
    }
  };

  const handleMove = async (item) => {
    const key = `move-${item.batch.id}`;
    setLoad(key, true);
    try {
      await onAdvanceStage?.(item.batch, userId);
      setMoved(s => new Set([...s, item.batch.id]));
    } finally {
      setLoad(key, false);
    }
  };

  const toggleHarvestExpand = (item) => {
    setHarvestExpanded(prev => {
      const next = { ...prev };
      if (next[item.batch.id]) {
        delete next[item.batch.id];
      } else {
        next[item.batch.id] = { yieldValue: String(item.expectedYield || '') };
      }
      return next;
    });
  };

  const handleHarvestDone = async (item) => {
    const key = `harvest-${item.batch.id}`;
    setLoad(key, true);
    const yieldVal = parseFloat(harvestExpanded[item.batch.id]?.yieldValue) || 0;
    try {
      await onHarvestBatch?.(item.batch, yieldVal, userId);
      setHarvested(s => new Set([...s, item.batch.id]));
      setHarvestExpanded(prev => { const n = { ...prev }; delete n[item.batch.id]; return n; });
    } finally {
      setLoad(key, false);
    }
  };

  // Filter out cards that have been acted on this session
  const visiblePlant   = plantToday.filter(n => !planted.has(n.cropId));
  const visibleMove    = moveToday.filter(i => !moved.has(i.batch.id));
  const visibleHarvest = harvestToday.filter(i => !harvested.has(i.batch.id));

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="-m-3 sm:-m-4 min-h-screen bg-gray-900 text-white">

      {/* ── Summary header ── */}
      <div className="px-4 pt-5 pb-3">
        <div className="text-sm text-gray-500 font-medium">{today}</div>
        <div className="text-xl font-black text-white mt-0.5">Hey {crewName} 👋</div>
        <div className="flex gap-4 mt-2 text-sm font-bold">
          <span className="text-green-400">{visiblePlant.length} to plant</span>
          <span className="text-amber-400">{visibleMove.length} to move</span>
          <span className="text-sky-400">{visibleHarvest.length} to harvest</span>
        </div>
      </div>

      <div className="px-4 pb-10 space-y-8">

        {/* ══ SECTION 1: PLANT TODAY ══════════════════════════════════════════ */}
        <section>
          <SectionHeader emoji="🌱" title="PLANT TODAY" badge={`${visiblePlant.length} crops`} />
          {visiblePlant.length === 0 ? (
            <EmptyState color="text-green-400" message="Nothing to plant today" />
          ) : (
            <div className="space-y-3">
              {visiblePlant.map(need => {
                const key = `plant-${need.cropId}`;
                const urgency = URGENCY_TAG[need.urgency] || URGENCY_TAG.healthy;
                return (
                  <div key={need.cropId} className="bg-gray-800 rounded-2xl p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="text-xl font-black text-white">{need.cropName}</div>
                        <div className={`text-xs font-bold mt-0.5 ${urgency.cls}`}>{urgency.label}</div>
                      </div>
                      <div className="text-right shrink-0 ml-4">
                        <div className="text-5xl font-black text-white leading-none">{need.recommendedQty}</div>
                        <div className="text-xs text-gray-400">{need.batchUnit}s</div>
                      </div>
                    </div>
                    <div className="text-xs text-gray-500 mb-4">
                      Grows in {need.growDays}d
                      · {need.daysOfSupply >= 99 ? '14+d' : `${need.daysOfSupply}d`} supply left
                    </div>
                    <button
                      onClick={() => handlePlant(need)}
                      disabled={loading[key]}
                      className="w-full bg-green-600 hover:bg-green-500 active:bg-green-700 text-white font-black text-xl py-4 rounded-2xl disabled:opacity-50 transition-colors cursor-pointer"
                    >
                      {loading[key] ? 'Planting…' : '✓ Planted'}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* ══ SECTION 2: MOVE TODAY ═══════════════════════════════════════════ */}
        <section>
          <SectionHeader emoji="🔄" title="MOVE TODAY" badge={`${visibleMove.length} batches`} />
          {visibleMove.length === 0 ? (
            <EmptyState color="text-amber-400" message="No stage moves needed" />
          ) : (
            <div className="space-y-3">
              {visibleMove.map(item => {
                const key = `move-${item.batch.id}`;
                const batchLabel = item.batch.varietyName || item.batch.varietyId || 'Batch';
                const batchTag   = item.batch.id.slice(-4).toUpperCase();
                const curLabel   = STAGE_LABELS[item.batch.stage] || item.batch.stage;
                const nxtLabel   = item.suggestedNextStageLabel || item.suggestedNextStage;
                const trays      = item.batch.trayCount || item.batch.quantity || '?';
                return (
                  <div
                    key={item.batch.id}
                    className={`bg-gray-800 rounded-2xl p-4 ${item.isOverdue ? 'ring-2 ring-red-500' : ''}`}
                  >
                    {item.isOverdue && (
                      <div className="text-xs font-black text-red-400 mb-2 tracking-wide">⚠ OVERDUE</div>
                    )}
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="text-xl font-black text-white">{batchLabel}</div>
                        <div className="text-xs text-gray-500 mt-0.5">#{batchTag}</div>
                      </div>
                      <div className="text-right shrink-0 ml-4">
                        <div className="text-4xl font-black text-white leading-none">{trays}</div>
                        <div className="text-xs text-gray-400">trays</div>
                      </div>
                    </div>
                    {/* Stage arrow */}
                    <div className="flex items-center gap-2 mb-4 text-sm font-semibold">
                      <span className="bg-gray-700 text-gray-300 px-3 py-1.5 rounded-lg">{curLabel}</span>
                      <span className="text-gray-600">→</span>
                      <span className="bg-amber-900/60 text-amber-300 px-3 py-1.5 rounded-lg">{nxtLabel}</span>
                      <span className="ml-auto text-xs text-gray-500">
                        Day {item.daysInCurrentStage}/{item.expectedDays}
                      </span>
                    </div>
                    <button
                      onClick={() => handleMove(item)}
                      disabled={loading[key]}
                      className="w-full bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-gray-900 font-black text-xl py-4 rounded-2xl disabled:opacity-50 transition-colors cursor-pointer"
                    >
                      {loading[key] ? 'Moving…' : '✓ Moved'}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* ══ SECTION 3: HARVEST TODAY ════════════════════════════════════════ */}
        <section>
          <SectionHeader emoji="✂️" title="HARVEST TODAY" badge={`${visibleHarvest.length} batches`} />
          {visibleHarvest.length === 0 ? (
            <EmptyState color="text-sky-400" message="No harvests ready" />
          ) : (
            <div className="space-y-3">
              {visibleHarvest.map(item => {
                const key        = `harvest-${item.batch.id}`;
                const batchLabel = item.batch.varietyName || item.batch.varietyId || 'Batch';
                const batchTag   = item.batch.id.slice(-4).toUpperCase();
                const trays      = item.batch.trayCount || item.batch.quantity || '?';
                const isExpanded = !!harvestExpanded[item.batch.id];
                const expanded   = harvestExpanded[item.batch.id];
                return (
                  <div
                    key={item.batch.id}
                    className={`bg-gray-800 rounded-2xl p-4 ${item.isUrgent ? 'ring-2 ring-red-500' : ''}`}
                  >
                    {item.isUrgent && (
                      <div className="text-xs font-black text-red-400 mb-2 tracking-wide">🔴 HARVEST NOW</div>
                    )}
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="text-xl font-black text-white">{batchLabel}</div>
                        <div className="text-xs text-gray-500 mt-0.5">#{batchTag}</div>
                      </div>
                      <div className="text-right shrink-0 ml-4">
                        <div className="text-4xl font-black text-white leading-none">{trays}</div>
                        <div className="text-xs text-gray-400">trays</div>
                      </div>
                    </div>
                    <div className="text-xs text-gray-500 mb-4">
                      Expected: <span className="text-white font-bold">{item.expectedYield} oz</span>
                      &nbsp;· Day {item.daysInWindow + 1}/{item.harvestWindow} in window
                      {item.daysRemaining === 0 && (
                        <span className="text-red-400 font-bold"> — last day!</span>
                      )}
                    </div>

                    {!isExpanded ? (
                      <button
                        onClick={() => toggleHarvestExpand(item)}
                        className="w-full bg-sky-600 hover:bg-sky-500 active:bg-sky-700 text-white font-black text-xl py-4 rounded-2xl transition-colors cursor-pointer"
                      >
                        ✂️ Harvest
                      </button>
                    ) : (
                      <div className="space-y-3">
                        <div>
                          <label className="block text-xs font-bold text-gray-400 mb-1.5">
                            Actual yield (oz)
                          </label>
                          <input
                            type="number"
                            inputMode="decimal"
                            value={expanded.yieldValue}
                            onChange={e => setHarvestExpanded(prev => ({
                              ...prev,
                              [item.batch.id]: { yieldValue: e.target.value },
                            }))}
                            className="w-full bg-gray-700 text-white text-3xl font-black text-center rounded-2xl py-4 border-2 border-sky-500 outline-none focus:border-sky-400"
                          />
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => toggleHarvestExpand(item)}
                            className="flex-1 bg-gray-700 hover:bg-gray-600 text-gray-300 font-bold py-4 rounded-2xl transition-colors cursor-pointer"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => handleHarvestDone(item)}
                            disabled={loading[key]}
                            className="flex-[2] bg-sky-600 hover:bg-sky-500 text-white font-black text-lg py-4 rounded-2xl disabled:opacity-50 transition-colors cursor-pointer"
                          >
                            {loading[key] ? 'Saving…' : '✓ Done'}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>

      </div>
    </div>
  );
}
