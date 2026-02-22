import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { AlertCircle, AlertTriangle, CheckCircle, Sprout, RefreshCw, Scissors, Hand, Check } from 'lucide-react';
import { Badge } from './ui/Badge';
import { Button } from './ui/Button';
import { Card, CardContent } from './ui/Card';
import { Input } from './ui/Input';
import { Label } from './ui/Label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/Select';
import { queryDemand } from '../utils/demandUtils';
import { CrewSkeleton } from './ui/Skeletons';
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
  critical: { label: 'CRITICAL — plant now',   cls: 'text-red-400',   Icon: AlertCircle },
  warning:  { label: 'Low supply — plant soon', cls: 'text-amber-400', Icon: AlertTriangle },
  healthy:  { label: 'Routine restock',          cls: 'text-green-400', Icon: CheckCircle },
};

const LOSS_REASONS = [
  { value: 'mold',                label: 'Mold' },
  { value: 'pest',                label: 'Pest damage' },
  { value: 'germination-failure', label: 'Germination failure' },
  { value: 'other',               label: 'Other' },
];

function SectionHeader({ icon: IconComp, title, badge }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <IconComp className="w-6 h-6 text-muted-foreground" />
      <h2 className="text-xl font-black text-gray-900 dark:text-white">{title}</h2>
      <span className="ml-auto text-sm font-semibold text-gray-500 dark:text-gray-400">{badge}</span>
    </div>
  );
}

function EmptyState({ color, message }) {
  return (
    <div className="bg-gray-100 dark:bg-gray-800 rounded-2xl p-6 text-center">
      <CheckCircle className="w-10 h-10 mx-auto mb-2 text-green-400" />
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
 *
 * Loss tracking: "Report Loss" text link at bottom of each Move/Harvest card.
 * Expands inline — tray count input + reason dropdown. Writes to lossCount/lossReason.
 */
export default function CrewDailyBoard({
  orders = [],
  activeBatches = [],
  onPlantBatch,
  onAdvanceStage,
  onHarvestBatch,
  onEditBatch,
  user,
  error,
  loading: dataLoading = false,
}) {
  const userId   = user?.uid ?? null;
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
  const [planted,   setPlanted]   = useState(new Set()); // Set<cropId>
  const [moved,     setMoved]     = useState(new Set()); // Set<batchId>
  const [harvested, setHarvested] = useState(new Set()); // Set<batchId>

  // Plant inline expand: cropId → { qty: string }
  const [plantExpanded, setPlantExpanded] = useState({});

  // Harvest inline expand: batchId → { yieldValue: string }
  const [harvestExpanded, setHarvestExpanded] = useState({});

  // Loss inline expand: batchId → { trays: string, reason: string }
  const [lossExpanded, setLossExpanded] = useState({});

  // Per-action loading keys
  const [loading, setLoading] = useState({});
  if (dataLoading) return <CrewSkeleton />;
  const setLoad = (key, val) => setLoading(l => ({ ...l, [key]: val }));

  // ── Handlers ───────────────────────────────────────────────────────────────
  const togglePlantExpand = (need) => {
    setPlantExpanded(prev => {
      const next = { ...prev };
      if (next[need.cropId]) {
        delete next[need.cropId];
      } else {
        next[need.cropId] = { qty: String(need.recommendedQty || '') };
      }
      return next;
    });
  };

  const handlePlantConfirm = async (need) => {
    const key = `plant-${need.cropId}`;
    setLoad(key, true);
    const qty = parseInt(plantExpanded[need.cropId]?.qty) || need.recommendedQty;
    try {
      await onPlantBatch?.(need, userId, qty);
      navigator.vibrate?.(50);
      setPlanted(s => new Set([...s, need.cropId]));
      setPlantExpanded(prev => { const n = { ...prev }; delete n[need.cropId]; return n; });
    } finally {
      setLoad(key, false);
    }
  };

  const handleMove = async (item) => {
    const key = `move-${item.batch.id}`;
    setLoad(key, true);
    try {
      await onAdvanceStage?.(item.batch, userId);
      navigator.vibrate?.(50);
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
      navigator.vibrate?.(50);
      setHarvested(s => new Set([...s, item.batch.id]));
      setHarvestExpanded(prev => { const n = { ...prev }; delete n[item.batch.id]; return n; });
    } finally {
      setLoad(key, false);
    }
  };

  const toggleLossExpand = (batchId) => {
    setLossExpanded(prev => {
      const next = { ...prev };
      if (next[batchId]) {
        delete next[batchId];
      } else {
        next[batchId] = { trays: '', reason: 'mold' };
      }
      return next;
    });
  };

  const handleReportLoss = async (batchId) => {
    const key = `loss-${batchId}`;
    setLoad(key, true);
    const { trays, reason } = lossExpanded[batchId] || {};
    try {
      await onEditBatch?.(batchId, {
        lossCount:  Math.max(0, parseInt(trays) || 0),
        lossReason: reason,
      });
      setLossExpanded(prev => { const n = { ...prev }; delete n[batchId]; return n; });
    } finally {
      setLoad(key, false);
    }
  };

  // Filter out cards acted on this session
  const visiblePlant   = plantToday.filter(n => !planted.has(n.cropId));
  const visibleMove    = moveToday.filter(i => !moved.has(i.batch.id));
  const visibleHarvest = harvestToday.filter(i => !harvested.has(i.batch.id));

  // ── Loss Form (shared by Move and Harvest sections) ────────────────────────
  const LossForm = ({ batchId }) => (
    <div className="mt-3 bg-gray-200/50 dark:bg-gray-700/50 rounded-xl p-3 space-y-2">
      <div className="text-xs font-bold text-gray-500 dark:text-gray-400">Report Loss</div>
      <Input
        type="number"
        inputMode="numeric"
        placeholder="Trays lost"
        value={lossExpanded[batchId]?.trays ?? ''}
        onChange={e => setLossExpanded(prev => ({ ...prev, [batchId]: { ...prev[batchId], trays: e.target.value } }))}
      />
      <Select
        value={lossExpanded[batchId]?.reason ?? 'mold'}
        onValueChange={val => setLossExpanded(prev => ({ ...prev, [batchId]: { ...prev[batchId], reason: val } }))}
      >
        <SelectTrigger><SelectValue /></SelectTrigger>
        <SelectContent>
          {LOSS_REASONS.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
        </SelectContent>
      </Select>
      <div className="flex gap-2">
        <Button
          variant="secondary"
          onClick={() => toggleLossExpand(batchId)}
          className="flex-1 py-2"
        >Cancel</Button>
        <Button
          variant="destructive"
          onClick={() => handleReportLoss(batchId)}
          disabled={loading[`loss-${batchId}`]}
          className="flex-[2] py-2"
        >
          {loading[`loss-${batchId}`] ? 'Saving…' : 'Submit Loss'}
        </Button>
      </div>
    </div>
  );

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="-m-3 sm:-m-4 min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white">

      {/* ── Error banner ── */}
      {error && (
        <div className="mx-4 mt-4 p-3 bg-red-50 dark:bg-red-900/60 border border-red-300 dark:border-red-700 rounded-xl text-sm text-red-700 dark:text-red-200 text-center">
                    <AlertTriangle className="w-4 h-4 inline-block mr-1" /> Connection issue — data may be stale. Pull down to refresh.
        </div>
      )}

      {/* ── Summary header ── */}
      <div className="px-4 pt-5 pb-3">
        <div className="text-sm text-gray-500 dark:text-gray-400 font-medium">{today}</div>
        <div className="text-xl font-black text-gray-900 dark:text-white mt-0.5 flex items-center gap-1">Hey {crewName} <Hand className="w-5 h-5" /></div>
        <div className="flex gap-4 mt-2 text-sm font-bold">
          <span className="text-green-400">{visiblePlant.length} to plant</span>
          <span className="text-amber-400">{visibleMove.length} to move</span>
          <span className="text-sky-400">{visibleHarvest.length} to harvest</span>
        </div>
      </div>

      <div className="px-4 pb-10 space-y-8">

        {/* ══ SECTION 1: PLANT TODAY ══════════════════════════════════════════ */}
        <section>
          <SectionHeader icon={Sprout} title="PLANT TODAY" badge={`${visiblePlant.length} crops`} />
          {visiblePlant.length === 0 ? (
            <EmptyState color="text-green-400" message="Nothing to plant today" />
          ) : (
            <motion.div initial="hidden" animate="visible" variants={{ visible: { transition: { staggerChildren: 0.05 } } }} className="space-y-3">
              {visiblePlant.map(need => {
                const key     = `plant-${need.cropId}`;
                const urgency = URGENCY_TAG[need.urgency] || URGENCY_TAG.healthy;
                const isExpanded = !!plantExpanded[need.cropId];
                const expanded   = plantExpanded[need.cropId];
                return (
                  <motion.div key={need.cropId} variants={{ hidden: { opacity: 0, y: 8 }, visible: { opacity: 1, y: 0, transition: { duration: 0.2 } } }} className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm dark:shadow-none">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="text-xl font-black text-gray-900 dark:text-white">{need.cropName}</div>
                        <div className={`text-xs font-bold mt-0.5 ${urgency.cls} flex items-center gap-1`}><urgency.Icon className="w-3 h-3" />{urgency.label}</div>
                      </div>
                      <div className="text-right shrink-0 ml-4">
                        <div className="text-5xl font-black text-gray-900 dark:text-white leading-none">{need.recommendedQty}</div>
                        <div className="text-xs text-gray-400 dark:text-gray-500">{need.batchUnit}s</div>
                      </div>
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mb-4">
                      Grows in {need.growDays}d
                      · {need.daysOfSupply >= 99 ? '14+d' : `${need.daysOfSupply}d`} supply left
                    </div>

                    {!isExpanded ? (
                      <Button
                        onClick={() => togglePlantExpand(need)}
                        className="w-full font-black text-xl py-4 h-auto rounded-2xl"
                      >
                        <Sprout className="w-5 h-5 mr-1" /> Plant
                      </Button>
                    ) : (
                      <div className="space-y-3">
                        <div>
                          <Label className="block text-xs font-bold text-gray-400 dark:text-gray-500 mb-1.5">
                            How many {need.batchUnit}s planted?
                          </Label>
                          <Input
                            type="number"
                            inputMode="numeric"
                            value={expanded.qty}
                            onChange={e => setPlantExpanded(prev => ({
                              ...prev,
                              [need.cropId]: { qty: e.target.value },
                            }))}
                            className="w-full text-3xl font-black text-center py-4 h-auto border-2 border-green-500 focus:border-green-400"
                          />
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="secondary"
                            onClick={() => togglePlantExpand(need)}
                            className="flex-1 font-bold py-4 h-auto rounded-2xl"
                          >
                            Cancel
                          </Button>
                          <Button
                            onClick={() => handlePlantConfirm(need)}
                            disabled={loading[key]}
                            className="flex-[2] font-black text-lg py-4 h-auto rounded-2xl"
                          >
                            {loading[key] ? 'Planting…' : <><Check className="w-4 h-4 mr-1" /> Confirm {expanded.qty || 0}</>}
                          </Button>
                        </div>
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </motion.div>
          )}
        </section>

        {/* ══ SECTION 2: MOVE TODAY ═══════════════════════════════════════════ */}
        <section>
          <SectionHeader icon={RefreshCw} title="MOVE TODAY" badge={`${visibleMove.length} batches`} />
          {visibleMove.length === 0 ? (
            <EmptyState color="text-amber-400" message="No stage moves needed" />
          ) : (
            <motion.div initial="hidden" animate="visible" variants={{ visible: { transition: { staggerChildren: 0.05 } } }} className="space-y-3">
              {visibleMove.map(item => {
                const key        = `move-${item.batch.id}`;
                const batchLabel = item.batch.varietyName || item.batch.varietyId || 'Batch';
                const batchTag   = item.batch.id.slice(-4).toUpperCase();
                const curLabel   = STAGE_LABELS[item.batch.stage] || item.batch.stage;
                const nxtLabel   = item.suggestedNextStageLabel || item.suggestedNextStage;
                const trays      = item.batch.trayCount || item.batch.quantity || '?';
                const isLoss     = !!lossExpanded[item.batch.id];
                return (
                  <motion.div
                    key={item.batch.id}
                    variants={{ hidden: { opacity: 0, y: 8 }, visible: { opacity: 1, y: 0, transition: { duration: 0.2 } } }}
                    className={`bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm dark:shadow-none ${item.isOverdue ? 'ring-2 ring-red-500' : ''}`}
                  >
                    {item.isOverdue && (
                      <div className="text-xs font-black text-red-400 mb-2 tracking-wide flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> OVERDUE</div>
                    )}
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="text-xl font-black text-gray-900 dark:text-white">{batchLabel}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">#{batchTag}</div>
                      </div>
                      <div className="text-right shrink-0 ml-4">
                        <div className="text-4xl font-black text-gray-900 dark:text-white leading-none">{trays}</div>
                        <div className="text-xs text-gray-400 dark:text-gray-500">trays</div>
                      </div>
                    </div>
                    {/* Stage arrow */}
                    <div className="flex items-center gap-2 mb-4 text-sm font-semibold">
                      <span className="bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-3 py-1.5 rounded-lg">{curLabel}</span>
                      <span className="text-gray-600 dark:text-gray-300">→</span>
                      <span className="bg-amber-900/60 text-amber-300 px-3 py-1.5 rounded-lg">{nxtLabel}</span>
                      <span className="ml-auto text-xs text-gray-500 dark:text-gray-400">
                        Day {item.daysInCurrentStage}/{item.expectedDays}
                      </span>
                    </div>
                    <Button
                      onClick={() => handleMove(item)}
                      disabled={loading[key]}
                      className="w-full bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-gray-900 font-black text-xl py-4 h-auto rounded-2xl"
                    >
                      {loading[key] ? 'Moving…' : <><Check className="w-5 h-5 mr-1" /> Moved</>}
                    </Button>
                    {/* Loss tracking */}
                    {!isLoss ? (
                      <Button
                        variant="link"
                        onClick={() => toggleLossExpand(item.batch.id)}
                        className="mt-3 w-full text-center text-xs text-gray-600 dark:text-gray-300 hover:text-red-400"
                      >
                        Report Loss
                      </Button>
                    ) : (
                      <LossForm batchId={item.batch.id} />
                    )}
                  </motion.div>
                );
              })}
            </motion.div>
          )}
        </section>

        {/* ══ SECTION 3: HARVEST TODAY ════════════════════════════════════════ */}
        <section>
          <SectionHeader icon={Scissors} title="HARVEST TODAY" badge={`${visibleHarvest.length} batches`} />
          {visibleHarvest.length === 0 ? (
            <EmptyState color="text-sky-400" message="No harvests ready" />
          ) : (
            <motion.div initial="hidden" animate="visible" variants={{ visible: { transition: { staggerChildren: 0.05 } } }} className="space-y-3">
              {visibleHarvest.map(item => {
                const key        = `harvest-${item.batch.id}`;
                const batchLabel = item.batch.varietyName || item.batch.varietyId || 'Batch';
                const batchTag   = item.batch.id.slice(-4).toUpperCase();
                const trays      = item.batch.trayCount || item.batch.quantity || '?';
                const isExpanded = !!harvestExpanded[item.batch.id];
                const expanded   = harvestExpanded[item.batch.id];
                const isLoss     = !!lossExpanded[item.batch.id];
                return (
                  <motion.div
                    key={item.batch.id}
                    variants={{ hidden: { opacity: 0, y: 8 }, visible: { opacity: 1, y: 0, transition: { duration: 0.2 } } }}
                    className={`bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm dark:shadow-none ${item.isUrgent ? 'ring-2 ring-red-500' : ''}`}
                  >
                    {item.isUrgent && (
                      <div className="text-xs font-black text-red-400 mb-2 tracking-wide flex items-center gap-1"><AlertCircle className="w-3 h-3" /> HARVEST NOW</div>
                    )}
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="text-xl font-black text-gray-900 dark:text-white">{batchLabel}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">#{batchTag}</div>
                      </div>
                      <div className="text-right shrink-0 ml-4">
                        <div className="text-4xl font-black text-gray-900 dark:text-white leading-none">{trays}</div>
                        <div className="text-xs text-gray-400 dark:text-gray-500">trays</div>
                      </div>
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mb-4">
                      Expected: <span className="text-gray-900 dark:text-white font-bold">{item.expectedYield} oz</span>
                      &nbsp;· Day {item.daysInWindow + 1}/{item.harvestWindow} in window
                      {item.daysRemaining === 0 && (
                        <span className="text-red-400 font-bold"> — last day!</span>
                      )}
                    </div>

                    {!isExpanded ? (
                      <Button
                        onClick={() => toggleHarvestExpand(item)}
                        className="w-full bg-sky-600 hover:bg-sky-500 active:bg-sky-700 text-white font-black text-xl py-4 h-auto rounded-2xl"
                      >
                        <Scissors className="w-5 h-5 mr-1" /> Harvest
                      </Button>
                    ) : (
                      <div className="space-y-3">
                        <div>
                          <Label className="block text-xs font-bold text-gray-400 dark:text-gray-500 mb-1.5">
                            Actual yield (oz)
                          </Label>
                          <Input
                            type="number"
                            inputMode="decimal"
                            value={expanded.yieldValue}
                            onChange={e => setHarvestExpanded(prev => ({
                              ...prev,
                              [item.batch.id]: { yieldValue: e.target.value },
                            }))}
                            className="w-full text-3xl font-black text-center py-4 h-auto border-2 border-sky-500 focus:border-sky-400"
                          />
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="secondary"
                            onClick={() => toggleHarvestExpand(item)}
                            className="flex-1 font-bold py-4 h-auto rounded-2xl"
                          >
                            Cancel
                          </Button>
                          <Button
                            onClick={() => handleHarvestDone(item)}
                            disabled={loading[key]}
                            className="flex-[2] bg-sky-600 hover:bg-sky-500 text-white font-black text-lg py-4 h-auto rounded-2xl"
                          >
                            {loading[key] ? 'Saving…' : <><Check className="w-4 h-4 mr-1" /> Done</>}
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* Loss tracking — only when not in harvest flow */}
                    {!isExpanded && (
                      !isLoss ? (
                        <Button
                          variant="link"
                          onClick={() => toggleLossExpand(item.batch.id)}
                          className="mt-3 w-full text-center text-xs text-gray-600 dark:text-gray-300 hover:text-red-400"
                        >
                          Report Loss
                        </Button>
                      ) : (
                        <LossForm batchId={item.batch.id} />
                      )
                    )}
                  </motion.div>
                );
              })}
            </motion.div>
          )}
        </section>

      </div>
    </div>
  );
}
