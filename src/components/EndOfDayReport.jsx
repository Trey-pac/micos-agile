import { useMemo, useState } from 'react';
import { cropConfig } from '../data/cropConfig';
import { queryDemand } from '../utils/demandUtils';
import { calculateSowingNeeds } from '../utils/sowingUtils';
import {
  getBatchesNeedingStageAdvance,
  getBatchesInHarvestWindow,
  getTodaysSowingNeeds,
} from '../utils/pipelineUtils';

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

function Section({ emoji, title, count, children }) {
  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
      <h3 className="font-bold text-gray-800 mb-3">
        {emoji} {title}
        {count !== undefined && <span className="ml-2 text-sm font-normal text-gray-400">({count})</span>}
      </h3>
      {children}
    </div>
  );
}

function Empty({ msg }) {
  return <p className="text-gray-400 text-sm text-center py-2">{msg}</p>;
}

function Row({ left, right }) {
  return (
    <div className="flex justify-between text-sm py-1 border-b border-gray-50 last:border-0">
      <span className="font-medium text-gray-800">{left}</span>
      <span className="text-gray-500">{right}</span>
    </div>
  );
}

/**
 * EndOfDayReport — auto-generated daily summary for the farm.
 *
 * Reads stageHistory from all batches (incl. harvested) to show what
 * actually happened today. Computes tomorrow's preview from pipeline.
 *
 * Print button uses window.print() — add @media print styles in index.css if needed.
 * Copy button puts a plain-text summary on the clipboard.
 */
export default function EndOfDayReport({ batches = [], orders = [] }) {
  const [copied, setCopied] = useState(false);

  const todayStr  = useMemo(() => new Date().toISOString().split('T')[0], []);
  const dateLabel = useMemo(() =>
    new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }), []);

  const activeBatches = useMemo(() => batches.filter(b => b.stage !== 'harvested'), [batches]);

  // ── Today's stageHistory entries across ALL batches ────────────────────────
  const todayEntries = useMemo(() => {
    const all = [];
    batches.forEach(b => {
      (b.stageHistory || []).forEach(h => {
        if (h.enteredAt?.startsWith(todayStr)) {
          all.push({
            ...h,
            batch:       b,
            varietyName: b.varietyName || b.varietyId || 'Batch',
            trays:       b.trayCount || b.quantity || 0,
          });
        }
      });
    });
    return all.sort((a, b) => a.enteredAt.localeCompare(b.enteredAt));
  }, [batches, todayStr]);

  const plantedToday   = todayEntries.filter(e => FIRST_STAGES.has(e.stage));
  const movedToday     = todayEntries.filter(e => !FIRST_STAGES.has(e.stage) && e.stage !== 'harvested');
  const harvestedToday = todayEntries.filter(e => e.stage === 'harvested');

  // ── Tomorrow's preview ─────────────────────────────────────────────────────
  const demandData      = useMemo(() => queryDemand(orders), [orders]);
  const sowingNeeds     = useMemo(() => calculateSowingNeeds(demandData, activeBatches), [demandData, activeBatches]);
  const plantTomorrow   = useMemo(() => getTodaysSowingNeeds(sowingNeeds), [sowingNeeds]);
  const moveTomorrow    = useMemo(() => getBatchesNeedingStageAdvance(activeBatches), [activeBatches]);
  const harvestTomorrow = useMemo(() => getBatchesInHarvestWindow(activeBatches), [activeBatches]);

  // ── Entering harvest window this week ──────────────────────────────────────
  const enteringHarvestSoon = useMemo(() => {
    const in7 = new Date();
    in7.setDate(in7.getDate() + 7);
    const in7str = in7.toISOString().split('T')[0];
    return activeBatches
      .filter(b => b.stage !== 'ready' && b.estimatedHarvestStart > todayStr && b.estimatedHarvestStart <= in7str)
      .sort((a, b) => a.estimatedHarvestStart.localeCompare(b.estimatedHarvestStart));
  }, [activeBatches, todayStr]);

  // ── Alerts ─────────────────────────────────────────────────────────────────
  const overdueMoves      = moveTomorrow.filter(i => i.isOverdue);
  const criticalCrops     = sowingNeeds.filter(n => n.urgency === 'critical');
  const pastHarvestWindow = harvestTomorrow.filter(i => i.daysRemaining === 0);
  const hasAlerts         = overdueMoves.length + criticalCrops.length + pastHarvestWindow.length > 0;

  const totalPlantedTrays   = plantedToday.reduce((s, e) => s + e.trays, 0);
  const totalHarvestedTrays = harvestedToday.reduce((s, e) => s + e.trays, 0);

  const handlePrint = () => window.print();

  const handleCopy = () => {
    const lines = [
      `End of Day Report — ${dateLabel}`,
      '',
      `Planted: ${plantedToday.length} batches (${totalPlantedTrays} trays)`,
      ...plantedToday.map(e => `  · ${e.varietyName} — ${e.trays} trays`),
      '',
      `Moved: ${movedToday.length} stage advances`,
      ...movedToday.map(e => `  · ${e.varietyName} → ${stageLabelFor(e.stage)}`),
      '',
      `Harvested: ${harvestedToday.length} batches (${totalHarvestedTrays} trays)`,
      ...harvestedToday.map(e => `  · ${e.varietyName}${e.batch.actualYield != null ? ` — ${e.batch.actualYield} oz` : ''}`),
      '',
      `Alerts: ${overdueMoves.length} overdue, ${criticalCrops.length} critical crops, ${pastHarvestWindow.length} past harvest window`,
    ].join('\n');
    navigator.clipboard.writeText(lines).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };

  return (
    <div className="max-w-3xl mx-auto space-y-4">

      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-800">End of Day Report</h2>
          <p className="text-sm text-gray-500">{dateLabel}</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleCopy}
            className="px-4 py-2 bg-white border border-gray-200 text-gray-600 font-semibold rounded-xl text-sm hover:bg-gray-50 cursor-pointer transition-colors"
          >
            {copied ? '✓ Copied!' : '📋 Copy'}
          </button>
          <button
            onClick={handlePrint}
            className="px-4 py-2 bg-green-600 text-white font-bold rounded-xl text-sm hover:bg-green-700 cursor-pointer transition-colors"
          >
            🖨️ Print
          </button>
        </div>
      </div>

      {/* Summary strip */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Planted',   value: totalPlantedTrays,   unit: 'trays',   color: 'text-green-700' },
          { label: 'Moved',     value: movedToday.length,   unit: 'batches', color: 'text-amber-600' },
          { label: 'Harvested', value: totalHarvestedTrays, unit: 'trays',   color: 'text-sky-700'   },
        ].map(({ label, value, unit, color }) => (
          <div key={label} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 text-center">
            <div className={`text-3xl font-black ${color}`}>{value}</div>
            <div className="text-xs font-semibold text-gray-400">{unit}</div>
            <div className="text-xs text-gray-500 mt-0.5">{label}</div>
          </div>
        ))}
      </div>

      {/* Planted Today */}
      <Section emoji="🌱" title="Planted Today" count={plantedToday.length}>
        {plantedToday.length === 0 ? <Empty msg="Nothing planted today" /> : (
          plantedToday.map((e, i) => (
            <Row
              key={i}
              left={e.varietyName}
              right={`${e.trays} trays${e.confirmedBy ? ` · ${e.confirmedBy.slice(0, 8)}` : ''}`}
            />
          ))
        )}
      </Section>

      {/* Moved Today */}
      <Section emoji="🔄" title="Moved Today" count={movedToday.length}>
        {movedToday.length === 0 ? <Empty msg="No stage advances today" /> : (
          movedToday.map((e, i) => (
            <Row key={i} left={e.varietyName} right={`→ ${stageLabelFor(e.stage)}`} />
          ))
        )}
      </Section>

      {/* Harvested Today */}
      <Section emoji="✂️" title="Harvested Today" count={harvestedToday.length}>
        {harvestedToday.length === 0 ? <Empty msg="No harvests today" /> : (
          harvestedToday.map((e, i) => {
            const actual   = e.batch.actualYield;
            const expected = e.batch.expectedYield;
            const variance = actual != null && expected != null
              ? Math.round((actual - expected) * 10) / 10
              : null;
            return (
              <div key={i} className="flex justify-between text-sm py-1 border-b border-gray-50 last:border-0">
                <span className="font-medium text-gray-800">{e.varietyName}</span>
                <span className="text-gray-500">
                  {actual != null ? `${actual} oz` : `${e.trays} trays`}
                  {variance != null && (
                    <span className={`ml-1 font-semibold ${variance >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                      ({variance >= 0 ? '+' : ''}{variance})
                    </span>
                  )}
                </span>
              </div>
            );
          })
        )}
      </Section>

      {/* Tomorrow's Preview */}
      <Section emoji="📅" title="Tomorrow's Preview">
        <div className="space-y-4">
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-1.5">To Plant ({plantTomorrow.length})</p>
            {plantTomorrow.length === 0
              ? <p className="text-xs text-gray-400">Nothing</p>
              : plantTomorrow.map(n => (
                  <div key={n.cropId} className="flex justify-between text-sm py-0.5">
                    <span className="text-gray-700">{n.cropName}</span>
                    <span className={`font-semibold ${n.urgency === 'critical' ? 'text-red-600' : n.urgency === 'warning' ? 'text-amber-600' : 'text-gray-600'}`}>
                      {n.recommendedQty} {n.batchUnit}s
                    </span>
                  </div>
                ))
            }
          </div>
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-1.5">To Move ({moveTomorrow.length})</p>
            {moveTomorrow.length === 0
              ? <p className="text-xs text-gray-400">Nothing</p>
              : moveTomorrow.slice(0, 5).map(i => (
                  <div key={i.batch.id} className="flex justify-between text-sm py-0.5">
                    <span className="text-gray-700">{i.batch.varietyName || i.batch.varietyId}</span>
                    <span className="text-gray-500">→ {i.suggestedNextStageLabel}</span>
                  </div>
                ))
            }
            {moveTomorrow.length > 5 && <p className="text-xs text-gray-400 mt-1">+{moveTomorrow.length - 5} more</p>}
          </div>
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-1.5">To Harvest ({harvestTomorrow.length})</p>
            {harvestTomorrow.length === 0
              ? <p className="text-xs text-gray-400">Nothing</p>
              : harvestTomorrow.map(i => (
                  <div key={i.batch.id} className="flex justify-between text-sm py-0.5">
                    <span className="text-gray-700">{i.batch.varietyName || i.batch.varietyId}</span>
                    <span className={`font-semibold ${i.daysRemaining === 0 ? 'text-red-600' : 'text-gray-500'}`}>
                      {i.daysRemaining === 0 ? 'Last day!' : `${i.daysRemaining}d left`}
                    </span>
                  </div>
                ))
            }
          </div>
        </div>
      </Section>

      {/* Entering Harvest Window This Week */}
      <Section emoji="🌿" title="Entering Harvest Window This Week" count={enteringHarvestSoon.length}>
        {enteringHarvestSoon.length === 0 ? <Empty msg="Nothing coming ready this week" /> : (
          enteringHarvestSoon.map(b => {
            const days = Math.round((new Date(b.estimatedHarvestStart) - new Date()) / 86400000);
            return (
              <Row
                key={b.id}
                left={b.varietyName || b.varietyId}
                right={`${days <= 0 ? 'Today' : `In ${days}d`} · ${b.trayCount || b.quantity || 0} trays`}
              />
            );
          })
        )}
      </Section>

      {/* Alerts */}
      {hasAlerts && (
        <Section emoji="🚨" title="Alerts">
          <div className="space-y-2">
            {overdueMoves.map(i => (
              <div key={i.batch.id} className="flex items-center gap-2 bg-red-50 border border-red-100 rounded-xl px-3 py-2 text-sm">
                <span className="text-red-500">⚠</span>
                <span className="font-semibold text-red-700">Overdue move:</span>
                <span className="text-red-600">{i.batch.varietyName} — {i.daysInCurrentStage - i.expectedDays}d overdue</span>
              </div>
            ))}
            {criticalCrops.map(n => (
              <div key={n.cropId} className="flex items-center gap-2 bg-red-50 border border-red-100 rounded-xl px-3 py-2 text-sm">
                <span>🔴</span>
                <span className="font-semibold text-red-700">Critical supply:</span>
                <span className="text-red-600">{n.cropName} — {n.daysOfSupply}d left</span>
              </div>
            ))}
            {pastHarvestWindow.map(i => (
              <div key={i.batch.id} className="flex items-center gap-2 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2 text-sm">
                <span>⏰</span>
                <span className="font-semibold text-amber-700">Harvest window closing:</span>
                <span className="text-amber-600">{i.batch.varietyName} — last day!</span>
              </div>
            ))}
          </div>
        </Section>
      )}
    </div>
  );
}
