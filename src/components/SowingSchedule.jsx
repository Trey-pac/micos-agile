import { useState, useMemo } from 'react';
import { cropConfig, getEstimatedHarvest } from '../data/cropConfig';
import { queryDemand } from '../utils/demandUtils';
import { calculateSowingNeeds } from '../utils/sowingUtils';

const URGENCY_STYLE = {
  critical: 'bg-red-100 text-red-700 border-red-200',
  warning:  'bg-amber-100 text-amber-700 border-amber-200',
  healthy:  'bg-green-100 text-green-700 border-green-200',
};
const URGENCY_LABEL = { critical: 'Critical', warning: 'Low Stock', healthy: 'Healthy' };

const PIPELINE_MAX_DAYS = 14; // bar width represents 0–14 days

function barColor(days) {
  if (days < 3) return 'bg-red-500';
  if (days < 7) return 'bg-amber-400';
  return 'bg-green-500';
}

function today() { return new Date().toISOString().split('T')[0]; }

export default function SowingSchedule({ orders = [], activeBatches = [], onAddBatch }) {
  const [tab,       setTab]       = useState('recs');
  const [dismissed, setDismissed] = useState([]);
  const [snoozed,   setSnoozed]   = useState(() => {
    const ids = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith('mico_snooze_')) {
        const until = parseInt(localStorage.getItem(key), 10);
        if (Date.now() < until) ids.push(key.replace('mico_snooze_', ''));
      }
    }
    return ids;
  });
  const [planting, setPlanting] = useState(null); // cropId currently being planted

  const demandData  = useMemo(() => queryDemand(orders),                        [orders]);
  const sowingNeeds = useMemo(() => calculateSowingNeeds(demandData, activeBatches), [demandData, activeBatches]);

  const visible = sowingNeeds.filter(
    (n) => !dismissed.includes(n.cropId) && !snoozed.includes(n.cropId)
  );
  const critCount = sowingNeeds.filter((n) => n.urgency === 'critical').length;
  const warnCount = sowingNeeds.filter((n) => n.urgency === 'warning').length;

  const handleSnooze = (cropId) => {
    localStorage.setItem(`mico_snooze_${cropId}`, Date.now() + 24 * 60 * 60 * 1000);
    setSnoozed((s) => [...s, cropId]);
  };

  const handlePlantNow = async (need) => {
    setPlanting(need.cropId);
    try {
      const catCfg      = cropConfig[need.cropCategory];
      const sowDate     = today();
      const harvestDates = getEstimatedHarvest(need.cropId, sowDate);
      await onAddBatch({
        cropCategory:          need.cropCategory,
        varietyId:             need.cropId,
        varietyName:           need.cropName,
        quantity:              need.recommendedQty || 1,
        unit:                  catCfg?.unit || need.batchUnit,
        sowDate,
        stage:                 catCfg?.stages[0]?.id || 'germination',
        estimatedHarvestStart: harvestDates?.harvestStart.toISOString().split('T')[0] || sowDate,
        estimatedHarvestEnd:   harvestDates?.harvestEnd.toISOString().split('T')[0]   || sowDate,
        harvestedAt:           null,
        harvestYield:          null,
        notes:                 'Auto-planted from sowing recommendation',
      });
      setDismissed((d) => [...d, need.cropId]);
    } finally {
      setPlanting(null);
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Sowing Schedule</h2>
          <p className="text-sm text-gray-500">
            {demandData.length} crops tracked · {sowingNeeds.filter(n => n.urgency !== 'healthy').length} below target
          </p>
        </div>
        <div className="flex gap-2">
          {critCount > 0 && (
            <span className="px-3 py-1 rounded-full bg-red-100 text-red-700 text-xs font-bold border border-red-200">
              🔴 {critCount} Critical
            </span>
          )}
          {warnCount > 0 && (
            <span className="px-3 py-1 rounded-full bg-amber-100 text-amber-700 text-xs font-bold border border-amber-200">
              🟡 {warnCount} Low Stock
            </span>
          )}
          {critCount === 0 && warnCount === 0 && sowingNeeds.length > 0 && (
            <span className="px-3 py-1 rounded-full bg-green-100 text-green-700 text-xs font-bold border border-green-200">
              ✅ All healthy
            </span>
          )}
        </div>
      </div>

      {/* Tab nav */}
      <div className="flex gap-2 mb-5">
        {[{ key: 'recs', label: '🌱 Recommendations' }, { key: 'pipeline', label: '📊 Pipeline' }].map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold cursor-pointer transition-all ${
              tab === t.key
                ? 'bg-green-600 text-white'
                : 'bg-white border border-gray-200 text-gray-600 hover:border-green-300'
            }`}
          >{t.label}</button>
        ))}
      </div>

      {/* ── Recommendations tab ── */}
      {tab === 'recs' && (
        <div className="space-y-3">
          {visible.length === 0 && (
            <div className="text-center py-12">
              <p className="text-4xl mb-3">🌿</p>
              <p className="text-gray-500 text-sm">
                {sowingNeeds.length === 0
                  ? 'No delivered orders yet — demand data will appear here once orders are fulfilled.'
                  : 'All crops are well-stocked or snoozed. Check back tomorrow!'}
              </p>
            </div>
          )}
          {visible.map((need) => (
            <div
              key={need.cropId}
              className={`bg-white rounded-2xl border p-4 ${URGENCY_STYLE[need.urgency]}`}
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-gray-800">{need.cropName}</p>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${URGENCY_STYLE[need.urgency]}`}>
                      {URGENCY_LABEL[need.urgency]}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {need.daysOfSupply < 99 ? `${need.daysOfSupply}d supply` : '∞ supply'} ·
                    Grows in {need.growDays}d
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-lg font-bold text-gray-800">{need.recommendedQty}</p>
                  <p className="text-xs text-gray-500">{need.batchUnit}s to plant</p>
                </div>
              </div>

              <p className="text-xs text-gray-500 mb-3 leading-relaxed">{need.reason}</p>

              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={() => handlePlantNow(need)}
                  disabled={planting === need.cropId}
                  className="flex-1 min-w-[100px] py-2.5 bg-green-600 text-white font-bold rounded-xl text-sm hover:bg-green-700 disabled:opacity-50 cursor-pointer transition-colors"
                >
                  {planting === need.cropId ? 'Planting…' : '🌱 Plant Now'}
                </button>
                <button
                  onClick={() => handleSnooze(need.cropId)}
                  className="px-4 py-2.5 bg-white border border-gray-200 text-gray-600 font-semibold rounded-xl text-sm hover:bg-gray-50 cursor-pointer"
                >
                  Snooze 24h
                </button>
                <button
                  onClick={() => setDismissed((d) => [...d, need.cropId])}
                  className="px-4 py-2.5 bg-white border border-gray-200 text-gray-400 font-semibold rounded-xl text-sm hover:bg-gray-50 cursor-pointer"
                >
                  Dismiss
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Pipeline visualization tab ── */}
      {tab === 'pipeline' && (
        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <h3 className="font-bold text-gray-700 text-sm mb-4">Days of Supply — Active Pipeline</h3>
          {sowingNeeds.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-8">No demand data yet.</p>
          ) : (
            <div className="space-y-4">
              {sowingNeeds.map((need) => {
                const pct = Math.min(100, (need.daysOfSupply / PIPELINE_MAX_DAYS) * 100);
                const days = need.daysOfSupply >= 99 ? '14+' : `${need.daysOfSupply}d`;
                return (
                  <div key={need.cropId}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-medium text-gray-700">{need.cropName}</span>
                      <span className={`font-bold ${need.urgency === 'critical' ? 'text-red-600' : need.urgency === 'warning' ? 'text-amber-600' : 'text-green-700'}`}>
                        {days}
                      </span>
                    </div>
                    <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${barColor(need.daysOfSupply)}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {need.currentPipeline} {need.batchUnit}s active · {need.weeklyDemand} {need.unit}/wk demand
                    </p>
                  </div>
                );
              })}
            </div>
          )}
          {/* Legend */}
          <div className="flex gap-4 mt-5 pt-4 border-t border-gray-100 text-xs text-gray-500">
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-green-500 inline-block" />7+ days</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-amber-400 inline-block" />3–6 days</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-red-500 inline-block" />0–2 days</span>
          </div>
        </div>
      )}
    </div>
  );
}
