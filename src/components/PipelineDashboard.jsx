import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ClipboardList, AlertTriangle, CheckCircle, Sprout, Scissors, RefreshCw } from 'lucide-react';
import { Button } from './ui/Button';
import { Card, CardContent } from './ui/Card';
import { PipelineSkeleton } from './ui/Skeletons';
import { cropConfig } from '../data/cropConfig';
import { queryDemand } from '../utils/demandUtils';
import { calculateSowingNeeds } from '../utils/sowingUtils';
import { getBatchesNeedingStageAdvance } from '../utils/pipelineUtils';

const STAGE_ORDER = [
  'germination', 'inoculation', 'blackout', 'incubation',
  'seedling', 'transplant', 'light', 'growing', 'pinning', 'fruiting', 'ready',
];

const FIRST_STAGES = new Set(
  Object.values(cropConfig).map(cat => cat.stages[0]?.id).filter(Boolean)
);

function stageLabelFor(stageId) {
  for (const cat of Object.values(cropConfig)) {
    const s = cat.stages.find(s => s.id === stageId);
    if (s) return s.label;
  }
  return stageId;
}

/**
 * PipelineDashboard — admin view of the full production pipeline.
 *
 * Props: batches (all — including harvested, for crew activity), orders
 *
 * Sections:
 *   1. Summary cards — active batches, trays, ready, overdue
 *   2. Pipeline funnel — horizontal bars per stage
 *   3. Days of Supply + Demand vs Pipeline (two-column)
 *   4. Crew Activity Today — stageHistory entries with today's date
 */
export default function PipelineDashboard({ batches = [], orders = [], loading = false }) {
  const navigate  = useNavigate();
  const todayStr  = useMemo(() => new Date().toISOString().split('T')[0], []);
  const activeBatches = useMemo(() => batches.filter(b => b.stage !== 'harvested'), [batches]);

  // ── Summary cards ──────────────────────────────────────────────────────────
  const totalTrays   = useMemo(() => activeBatches.reduce((s, b) => s + (b.trayCount || b.quantity || 0), 0), [activeBatches]);
  const readyCount   = useMemo(() => activeBatches.filter(b => b.stage === 'ready').length, [activeBatches]);
  const overdueCount = useMemo(() => getBatchesNeedingStageAdvance(activeBatches).filter(i => i.isOverdue).length, [activeBatches]);

  // ── Pipeline funnel ────────────────────────────────────────────────────────
  const stageData = useMemo(() => {
    const map = {};
    activeBatches.forEach(b => {
      if (!map[b.stage]) map[b.stage] = { count: 0, trays: 0 };
      map[b.stage].count++;
      map[b.stage].trays += b.trayCount || b.quantity || 0;
    });
    return STAGE_ORDER.filter(s => map[s]).map(s => ({ stage: s, ...map[s] }));
  }, [activeBatches]);
  const maxTrays = Math.max(1, ...stageData.map(s => s.trays));

  // ── Per-crop supply + demand ───────────────────────────────────────────────
  const demandData  = useMemo(() => queryDemand(orders), [orders]);
  const sowingNeeds = useMemo(() => calculateSowingNeeds(demandData, activeBatches), [demandData, activeBatches]);

  // ── Crew activity today ────────────────────────────────────────────────────
  const todayActivity = useMemo(() => {
    const entries = [];
    batches.forEach(b => {
      (b.stageHistory || []).forEach(h => {
        if (h.enteredAt?.startsWith(todayStr)) {
          entries.push({
            stage:       h.stage,
            enteredAt:   h.enteredAt,
            confirmedBy: h.confirmedBy,
            varietyName: b.varietyName || b.varietyId || 'Batch',
            trays:       b.trayCount || b.quantity || 0,
          });
        }
      });
    });
    return entries.sort((a, b) => b.enteredAt.localeCompare(a.enteredAt));
  }, [batches, todayStr]);

  const plantedCount   = todayActivity.filter(e => FIRST_STAGES.has(e.stage)).length;
  const movedCount     = todayActivity.filter(e => !FIRST_STAGES.has(e.stage) && e.stage !== 'harvested').length;
  const harvestedCount = todayActivity.filter(e => e.stage === 'harvested').length;

  if (loading) return <PipelineSkeleton />;
  return (
    <div className="max-w-4xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">Pipeline Dashboard</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">{activeBatches.length} active batches · {totalTrays} trays in pipeline</p>
        </div>
        <Button
          variant="link"
          onClick={() => navigate('/reports')}
          className="text-sm"
        >
          <ClipboardList className="w-4 h-4 mr-1" /> End of Day Report →
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Active Batches',    value: activeBatches.length, color: 'text-gray-800 dark:text-gray-100'  },
          { label: 'Trays in Pipeline', value: totalTrays,           color: 'text-sky-700'   },
          { label: 'Ready to Harvest',  value: readyCount,   color: readyCount   > 0 ? 'text-green-700' : 'text-gray-400 dark:text-gray-500' },
          { label: 'Overdue Moves',     value: overdueCount, color: overdueCount > 0 ? 'text-red-600'   : 'text-gray-400 dark:text-gray-500' },
        ].map(({ label, value, color }) => (
          <Card key={label} className="text-center">
            <CardContent className="p-4">
              <div className={`text-4xl font-black ${color}`}>{value}</div>
              <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 mt-1 leading-tight">{label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Pipeline Funnel */}
      <Card>
        <CardContent className="p-5">
        <h3 className="font-bold text-gray-800 dark:text-gray-100 mb-4">Pipeline Funnel</h3>
        {stageData.length === 0 ? (
          <p className="text-gray-400 dark:text-gray-500 text-sm text-center py-4">No active batches in pipeline</p>
        ) : (
          <div className="space-y-3">
            {stageData.map(({ stage, count, trays }) => {
              const label   = stageLabelFor(stage);
              const isReady = stage === 'ready';
              const pct     = Math.max(4, Math.round((trays / maxTrays) * 100));
              return (
                <div key={stage}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className={`font-semibold ${isReady ? 'text-green-700' : 'text-gray-700 dark:text-gray-200'}`}>{label}</span>
                    <span className="text-gray-500 dark:text-gray-400">
                      {count} batch{count !== 1 ? 'es' : ''} · {trays} tray{trays !== 1 ? 's' : ''}
                    </span>
                  </div>
                  <div className="h-4 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${isReady ? 'bg-green-500' : 'bg-sky-400'}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
        </CardContent>
      </Card>
      {/* Per-Crop Supply + Demand vs Pipeline */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        {/* Days of Supply */}
        <Card>
          <CardContent className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-gray-800 dark:text-gray-100">Days of Supply</h3>
            <Button variant="link" size="sm" onClick={() => navigate('/sowing')}>Sowing →</Button>
          </div>
          {sowingNeeds.length === 0 ? (
            <p className="text-gray-400 dark:text-gray-500 text-sm text-center py-4">No demand data yet</p>
          ) : (
            <div className="space-y-3">
              {sowingNeeds.map(need => {
                const pct = Math.min(100, (need.daysOfSupply / 14) * 100);
                const bar = need.daysOfSupply < 3 ? 'bg-red-500' : need.daysOfSupply < 7 ? 'bg-amber-400' : 'bg-green-500';
                const txt = need.urgency === 'critical' ? 'text-red-600 font-bold' : need.urgency === 'warning' ? 'text-amber-600 font-bold' : 'text-green-700';
                return (
                  <div key={need.cropId}>
                    <div className="flex justify-between text-xs mb-0.5">
                      <span className="font-medium text-gray-700 dark:text-gray-200">{need.cropName}</span>
                      <span className={txt}>{need.daysOfSupply >= 99 ? '14+d' : `${need.daysOfSupply}d`}</span>
                    </div>
                    <div className="h-2.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${bar}`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          <div className="flex gap-4 mt-4 pt-3 border-t border-gray-100 dark:border-gray-700 text-xs text-gray-400 dark:text-gray-500">
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-green-500 inline-block" />7+d</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block" />3–6d</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block" />0–2d</span>
          </div>
          </CardContent>
        </Card>

        {/* Demand vs Pipeline */}
        <Card>
          <CardContent className="p-5">
          <h3 className="font-bold text-gray-800 dark:text-gray-100 mb-4">Demand vs Pipeline</h3>
          {sowingNeeds.length === 0 ? (
            <p className="text-gray-400 dark:text-gray-500 text-sm text-center py-4">No demand data yet</p>
          ) : (
            <div className="space-y-2">
              {sowingNeeds.map(need => {
                const gap = need.currentPipeline < need.weeklyDemand;
                return (
                  <div key={need.cropId} className={`rounded-xl p-3 ${gap ? 'bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800' : 'bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-800'}`}>
                    <div className="flex justify-between items-center">
                      <span className="font-semibold text-sm text-gray-800 dark:text-gray-100">{need.cropName}</span>
                      {gap
                        ? <span className="text-xs font-bold text-red-600 flex items-center gap-0.5"><AlertTriangle className="w-3 h-3" /> Gap</span>
                        : <span className="text-xs font-bold text-green-600 flex items-center gap-0.5"><CheckCircle className="w-3 h-3" /> OK</span>}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      Pipeline: <span className="font-semibold text-gray-700 dark:text-gray-200">{need.currentPipeline} {need.batchUnit}s</span>
                      {' · '}Demand: <span className="font-semibold text-gray-700 dark:text-gray-200">{need.weeklyDemand} {need.unit}/wk</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          </CardContent>
        </Card>
      </div>
      {/* Crew Activity Today */}
      <Card>
        <CardContent className="p-5">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-bold text-gray-800 dark:text-gray-100">Crew Activity Today</h3>
          <Button variant="link" size="sm" onClick={() => navigate('/reports')}>Full report →</Button>
        </div>
        <div className="flex gap-4 text-sm font-bold mb-4">
          <span className="text-green-600">{plantedCount} planted</span>
          <span className="text-amber-600">{movedCount} moved</span>
          <span className="text-sky-600">{harvestedCount} harvested</span>
        </div>
        {todayActivity.length === 0 ? (
          <p className="text-gray-400 dark:text-gray-500 text-sm text-center py-4">No crew activity recorded yet today</p>
        ) : (
          <div className="space-y-1.5 max-h-60 overflow-y-auto">
            {todayActivity.map((e, i) => {
              const isFirst = FIRST_STAGES.has(e.stage);
              const isHarv  = e.stage === 'harvested';
              const clr     = isFirst ? 'text-green-600' : isHarv ? 'text-sky-600' : 'text-amber-600';
              const action  = isFirst ? 'Planted' : isHarv ? 'Harvested' : 'Moved';
              const ActionIcon = isFirst ? Sprout : isHarv ? Scissors : RefreshCw;
              const time    = new Date(e.enteredAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
              return (
                <div key={i} className="flex items-center gap-2 py-1 border-b border-gray-50 dark:border-gray-800 last:border-0 text-sm">
                  <span className={`font-semibold shrink-0 ${clr} flex items-center gap-1`}><ActionIcon className="w-3.5 h-3.5" />{action}</span>
                  <span className="text-gray-700 dark:text-gray-200 flex-1 truncate">{e.varietyName}</span>
                  {e.trays > 0 && <span className="text-gray-400 dark:text-gray-500 text-xs shrink-0">{e.trays} trays</span>}
                  <span className="text-gray-300 text-xs shrink-0 ml-1">{time}</span>
                </div>
              );
            })}
          </div>
        )}
        </CardContent>
      </Card>
    </div>
  );
}
