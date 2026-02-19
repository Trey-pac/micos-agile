import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { cropConfig, getVarietyById } from '../data/cropConfig';

/**
 * FarmDashboard — The unified "Farm View" production visualization.
 *
 * Four quadrants on desktop, stacked on mobile:
 *   TL: Stage Funnel     — horizontal bars showing total trays per growth stage
 *   TR: Harvest Forecast  — what's ready now, tomorrow, and next 3/7 days
 *   BL: Batch Timeline    — Gantt-style bars for every active batch
 *   BR: Quick Stats       — summary cards (active, total trays, overdue, ready)
 *
 * Props:
 *   activeBatches  — batches where stage !== 'harvested'
 *   readyBatches   — batches where stage === 'ready'
 *   loading        — skeleton state
 */

// ── Stage definitions (display order) ────────────────────────────────────────
const STAGE_META = [
  { id: 'germination', label: 'Germination', color: 'bg-lime-500',  colorBar: 'bg-lime-400',  text: 'text-lime-400' },
  { id: 'blackout',    label: 'Blackout',    color: 'bg-gray-500',  colorBar: 'bg-gray-400',  text: 'text-gray-400' },
  { id: 'seedling',    label: 'Seedling',    color: 'bg-emerald-500', colorBar: 'bg-emerald-400', text: 'text-emerald-400' },
  { id: 'transplant',  label: 'Transplant',  color: 'bg-teal-500',  colorBar: 'bg-teal-400',  text: 'text-teal-400' },
  { id: 'inoculation', label: 'Inoculation', color: 'bg-violet-500', colorBar: 'bg-violet-400', text: 'text-violet-400' },
  { id: 'incubation',  label: 'Incubation',  color: 'bg-purple-500', colorBar: 'bg-purple-400', text: 'text-purple-400' },
  { id: 'light',       label: 'Under Lights',color: 'bg-yellow-500', colorBar: 'bg-yellow-400', text: 'text-yellow-400' },
  { id: 'growing',     label: 'Growing',     color: 'bg-green-500', colorBar: 'bg-green-400', text: 'text-green-400' },
  { id: 'pinning',     label: 'Pinning',     color: 'bg-pink-500',  colorBar: 'bg-pink-400',  text: 'text-pink-400' },
  { id: 'fruiting',    label: 'Fruiting',    color: 'bg-orange-500', colorBar: 'bg-orange-400', text: 'text-orange-400' },
  { id: 'ready',       label: 'Ready to Harvest', color: 'bg-red-500', colorBar: 'bg-red-400', text: 'text-red-400' },
];

const stageColor = Object.fromEntries(STAGE_META.map(s => [s.id, s]));

// ── Helpers ──────────────────────────────────────────────────────────────────
function daysBetween(a, b) {
  return Math.round((new Date(b) - new Date(a)) / 86400000);
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function addDays(dateStr, n) {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

function formatShortDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// ── Component ────────────────────────────────────────────────────────────────
export default function FarmDashboard({ activeBatches = [], readyBatches = [], loading = false }) {

  // ── Stage funnel data ──
  const stageFunnel = useMemo(() => {
    const counts = {};
    for (const b of activeBatches) {
      const stage = b.stage || 'germination';
      const trays = b.trayCount || b.quantity || 0;
      if (!counts[stage]) counts[stage] = { trays: 0, batches: 0 };
      counts[stage].trays += trays;
      counts[stage].batches += 1;
    }
    const maxTrays = Math.max(1, ...Object.values(counts).map(c => c.trays));
    return STAGE_META
      .filter(s => counts[s.id])
      .map(s => ({ ...s, ...counts[s.id], pct: (counts[s.id].trays / maxTrays) * 100 }));
  }, [activeBatches]);

  // ── Harvest forecast ──
  const forecast = useMemo(() => {
    const t = today();
    const buckets = {
      now: [],       // stage === 'ready'
      tomorrow: [],  // harvestStart <= tomorrow
      next3: [],     // harvestStart <= +3d
      next7: [],     // harvestStart <= +7d
    };

    for (const b of activeBatches) {
      const trays = b.trayCount || b.quantity || 0;
      const name = b.varietyName || b.varietyId;
      const entry = { name, trays, unit: b.unit || 'tray', batchId: b.id };
      const hs = b.estimatedHarvestStart;

      if (b.stage === 'ready') {
        buckets.now.push(entry);
      }
      if (hs && hs <= addDays(t, 1) && b.stage !== 'ready' && b.stage !== 'harvested') {
        buckets.tomorrow.push(entry);
      }
      if (hs && hs <= addDays(t, 3) && b.stage !== 'ready' && b.stage !== 'harvested') {
        buckets.next3.push(entry);
      }
      if (hs && hs <= addDays(t, 7) && b.stage !== 'ready' && b.stage !== 'harvested') {
        buckets.next7.push(entry);
      }
    }
    return buckets;
  }, [activeBatches]);

  // ── Batch timeline entries (sorted by sow date) ──
  const timeline = useMemo(() => {
    if (activeBatches.length === 0) return { entries: [], minDate: today(), maxDate: addDays(today(), 14) };

    const entries = activeBatches
      .filter(b => b.sowDate && b.estimatedHarvestEnd)
      .map(b => {
        const variety = getVarietyById(b.varietyId);
        const trays = b.trayCount || b.quantity || 0;
        const daysGrown = daysBetween(b.sowDate, today());
        const totalDays = daysBetween(b.sowDate, b.estimatedHarvestEnd);
        return {
          id: b.id,
          name: b.varietyName || b.varietyId,
          trays,
          unit: b.unit || 'tray',
          stage: b.stage,
          sowDate: b.sowDate,
          harvestStart: b.estimatedHarvestStart,
          harvestEnd: b.estimatedHarvestEnd,
          growDays: variety?.growDays || totalDays,
          daysGrown,
          totalDays: Math.max(1, totalDays),
          pct: Math.min(100, (daysGrown / Math.max(1, totalDays)) * 100),
        };
      })
      .sort((a, b) => a.harvestStart?.localeCompare(b.harvestStart) || a.sowDate.localeCompare(b.sowDate));

    const allDates = entries.flatMap(e => [e.sowDate, e.harvestEnd]);
    const minDate = allDates.reduce((a, b) => a < b ? a : b, today());
    const maxDate = allDates.reduce((a, b) => a > b ? a : b, addDays(today(), 14));

    return { entries, minDate, maxDate };
  }, [activeBatches]);

  // ── Quick stats ──
  const stats = useMemo(() => {
    const totalTrays = activeBatches.reduce((s, b) => s + (b.trayCount || b.quantity || 0), 0);
    const overdue = activeBatches.filter(b => {
      if (!b.estimatedHarvestStart) return false;
      return b.estimatedHarvestStart < today() && b.stage !== 'ready';
    }).length;
    return {
      active: activeBatches.length,
      totalTrays,
      ready: readyBatches.length,
      overdue,
    };
  }, [activeBatches, readyBatches]);

  // ── Skeleton ──
  if (loading) {
    return (
      <div className="max-w-7xl mx-auto animate-pulse space-y-4">
        <div className="h-10 w-48 bg-gray-200 dark:bg-gray-700 rounded" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {[1,2,3,4].map(i => (
            <div key={i} className="h-64 bg-gray-200 dark:bg-gray-700 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  // ── Render ──
  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-black text-gray-900 dark:text-white">🌿 Farm Dashboard</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          {stats.active} active batches · {stats.totalTrays} trays in the pipeline
        </p>
      </div>

      {/* Quick stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Active Batches', value: stats.active, icon: '🌱', color: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' },
          { label: 'Total Trays',    value: stats.totalTrays, icon: '📦', color: 'bg-sky-50 dark:bg-sky-900/20 border-sky-200 dark:border-sky-800' },
          { label: 'Ready Now',      value: stats.ready, icon: '✂️', color: 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800' },
          { label: 'Overdue',        value: stats.overdue, icon: '⚠️', color: stats.overdue > 0 ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800' : 'bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700' },
        ].map(s => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`rounded-2xl border p-4 ${s.color}`}
          >
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xl">{s.icon}</span>
              <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">{s.label}</span>
            </div>
            <div className="text-3xl font-black text-gray-900 dark:text-white">{s.value}</div>
          </motion.div>
        ))}
      </div>

      {/* ── Two-column grid: Funnel + Forecast ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Stage Funnel */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5">
          <h3 className="text-sm font-bold text-gray-700 dark:text-gray-200 mb-4">📊 Trays by Growth Stage</h3>
          {stageFunnel.length === 0 ? (
            <div className="text-center py-8 text-gray-400 dark:text-gray-500 text-sm">No active batches</div>
          ) : (
            <div className="space-y-3">
              {stageFunnel.map((s, i) => (
                <motion.div
                  key={s.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold text-gray-600 dark:text-gray-300">{s.label}</span>
                    <span className="text-xs font-bold text-gray-900 dark:text-white">
                      {s.trays} trays <span className="text-gray-400 dark:text-gray-500">· {s.batches} batch{s.batches !== 1 ? 'es' : ''}</span>
                    </span>
                  </div>
                  <div className="h-6 bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden">
                    <motion.div
                      className={`h-full ${s.colorBar} rounded-lg`}
                      initial={{ width: 0 }}
                      animate={{ width: `${s.pct}%` }}
                      transition={{ duration: 0.6, delay: i * 0.05 }}
                    />
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>

        {/* Harvest Forecast */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5">
          <h3 className="text-sm font-bold text-gray-700 dark:text-gray-200 mb-4">🔮 Harvest Forecast</h3>
          <div className="space-y-4">
            {[
              { key: 'now',      label: 'Ready Now',  icon: '✂️', items: forecast.now,      accent: 'border-green-500 bg-green-50 dark:bg-green-900/20' },
              { key: 'tomorrow', label: 'Tomorrow',   icon: '📅', items: forecast.tomorrow, accent: 'border-amber-500 bg-amber-50 dark:bg-amber-900/20' },
              { key: 'next3',    label: 'Next 3 Days', icon: '📆', items: forecast.next3,    accent: 'border-sky-500 bg-sky-50 dark:bg-sky-900/20' },
              { key: 'next7',    label: 'Next 7 Days', icon: '🗓️', items: forecast.next7,    accent: 'border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800/50' },
            ].map(bucket => {
              const totalTrays = bucket.items.reduce((s, i) => s + i.trays, 0);
              // group by variety name
              const grouped = {};
              for (const item of bucket.items) {
                if (!grouped[item.name]) grouped[item.name] = { ...item, trays: 0 };
                grouped[item.name].trays += item.trays;
              }
              const varieties = Object.values(grouped).sort((a, b) => b.trays - a.trays);
              return (
                <div key={bucket.key} className={`rounded-xl border-l-4 p-3 ${bucket.accent}`}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-bold text-gray-800 dark:text-gray-100">
                      {bucket.icon} {bucket.label}
                    </span>
                    <span className="text-lg font-black text-gray-900 dark:text-white">
                      {totalTrays} <span className="text-xs font-semibold text-gray-400">trays</span>
                    </span>
                  </div>
                  {varieties.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                      {varieties.map(v => (
                        <span key={v.name} className="text-[11px] font-semibold bg-white/60 dark:bg-gray-700/60 text-gray-700 dark:text-gray-300 px-2 py-0.5 rounded-full">
                          {v.name}: {v.trays}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">Nothing scheduled</div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Batch Timeline (Gantt-style) ── */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5">
        <h3 className="text-sm font-bold text-gray-700 dark:text-gray-200 mb-4">
          📅 Batch Timeline
          <span className="ml-2 text-xs font-normal text-gray-400 dark:text-gray-500">
            Sow → Harvest window for each active batch
          </span>
        </h3>

        {timeline.entries.length === 0 ? (
          <div className="text-center py-12 text-gray-400 dark:text-gray-500 text-sm">
            No active batches to display
          </div>
        ) : (
          <div className="space-y-2 overflow-x-auto">
            {/* Date axis labels */}
            <div className="flex items-center justify-between text-[10px] text-gray-400 dark:text-gray-500 font-mono mb-2 min-w-[500px]">
              <span>{formatShortDate(timeline.minDate)}</span>
              <span>Today: {formatShortDate(today())}</span>
              <span>{formatShortDate(timeline.maxDate)}</span>
            </div>

            {timeline.entries.map((entry, i) => {
              const totalSpan = daysBetween(timeline.minDate, timeline.maxDate) || 1;
              const barStart = Math.max(0, (daysBetween(timeline.minDate, entry.sowDate) / totalSpan) * 100);
              const barWidth = Math.max(3, (entry.totalDays / totalSpan) * 100);
              const todayPos = (daysBetween(timeline.minDate, today()) / totalSpan) * 100;
              const stageMeta = stageColor[entry.stage] || stageColor.germination;

              // Harvest window highlight
              const harvestStartPct = entry.harvestStart ? Math.max(0, (daysBetween(timeline.minDate, entry.harvestStart) / totalSpan) * 100) : null;
              const harvestWidthPct = entry.harvestStart && entry.harvestEnd ? Math.max(1, (daysBetween(entry.harvestStart, entry.harvestEnd) / totalSpan) * 100) : 0;

              return (
                <motion.div
                  key={entry.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.02 }}
                  className="flex items-center gap-3 min-w-[500px]"
                >
                  {/* Label */}
                  <div className="w-36 shrink-0 text-right">
                    <div className="text-xs font-bold text-gray-700 dark:text-gray-200 truncate">{entry.name}</div>
                    <div className="text-[10px] text-gray-400 dark:text-gray-500">
                      {entry.trays} {entry.unit}s · Day {entry.daysGrown}/{entry.totalDays}
                    </div>
                  </div>

                  {/* Gantt bar area */}
                  <div className="flex-1 relative h-8 bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden">
                    {/* Batch bar */}
                    <div
                      className={`absolute top-1 bottom-1 rounded ${stageMeta.colorBar} opacity-70`}
                      style={{ left: `${barStart}%`, width: `${barWidth}%` }}
                    />
                    {/* Progress fill */}
                    <div
                      className={`absolute top-1 bottom-1 rounded ${stageMeta.color}`}
                      style={{ left: `${barStart}%`, width: `${barWidth * (entry.pct / 100)}%` }}
                    />
                    {/* Harvest window stripe */}
                    {harvestStartPct !== null && (
                      <div
                        className="absolute top-0 bottom-0 border-l-2 border-dashed border-green-500 bg-green-500/10"
                        style={{ left: `${harvestStartPct}%`, width: `${harvestWidthPct}%` }}
                      />
                    )}
                    {/* Today marker */}
                    <div
                      className="absolute top-0 bottom-0 w-px bg-red-500/60"
                      style={{ left: `${todayPos}%` }}
                    />
                    {/* Stage label inside bar */}
                    <div
                      className="absolute top-1/2 -translate-y-1/2 text-[9px] font-bold text-white/90 px-1.5 pointer-events-none whitespace-nowrap"
                      style={{ left: `${barStart + 0.5}%` }}
                    >
                      {stageMeta.label}
                    </div>
                  </div>

                  {/* Harvest date */}
                  <div className="w-20 shrink-0 text-[10px] text-gray-400 dark:text-gray-500">
                    {entry.harvestStart ? formatShortDate(entry.harvestStart) : '—'}
                  </div>
                </motion.div>
              );
            })}

            {/* Today marker legend */}
            <div className="flex items-center gap-2 mt-3 min-w-[500px] pl-[156px]">
              <div className="w-3 h-px bg-red-500" />
              <span className="text-[10px] text-gray-400 dark:text-gray-500">Today</span>
              <div className="w-3 h-2 border-l-2 border-dashed border-green-500 bg-green-500/10" />
              <span className="text-[10px] text-gray-400 dark:text-gray-500">Harvest window</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
