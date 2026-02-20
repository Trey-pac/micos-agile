/**
 * PlantingSchedule.jsx — 14-day calendar grid.
 *
 * Each day cell shows what needs to happen based on batch dates:
 *   - Soak (blue)   — batch.soakDate
 *   - Sow (green)   — batch.sowDate
 *   - Uncover (yellow) — batch.uncoverDate
 *   - Harvest (red)  — batch.expectedHarvestDate / estimatedHarvestStart
 *
 * Filters: crop type, stage (active/planned/all), print-friendly view.
 * Click a day cell to see full detail.
 */

import { useState, useMemo } from 'react';

// ── Helpers ─────────────────────────────────────────────────────────────────

function toDateStr(d) {
  if (!d) return null;
  if (typeof d === 'string') return d.split('T')[0];
  if (d.toDate) return d.toDate().toISOString().split('T')[0];
  if (d._seconds || d.seconds) return new Date((d._seconds || d.seconds) * 1000).toISOString().split('T')[0];
  return null;
}

function fmtDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

function fmtShort(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function fmtWeekday(dateStr) {
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString('en-US', { weekday: 'short' });
}

function getDayRange(startDate, days) {
  const result = [];
  const start = new Date(startDate + 'T12:00:00');
  for (let i = 0; i < days; i++) {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    result.push(d.toISOString().split('T')[0]);
  }
  return result;
}

function todayStr() {
  return new Date().toISOString().split('T')[0];
}

// Action types with styling
const ACTION_TYPES = [
  { key: 'soak',    label: 'Soak',    field: 'soakDate',    bg: 'bg-blue-100 dark:bg-blue-900/40', text: 'text-blue-700 dark:text-blue-300', dot: 'bg-blue-500', emoji: '💧' },
  { key: 'sow',     label: 'Sow',     field: 'sowDate',     bg: 'bg-green-100 dark:bg-green-900/40', text: 'text-green-700 dark:text-green-300', dot: 'bg-green-500', emoji: '🌱' },
  { key: 'uncover', label: 'Uncover',  field: 'uncoverDate', bg: 'bg-yellow-100 dark:bg-yellow-900/40', text: 'text-yellow-700 dark:text-yellow-300', dot: 'bg-yellow-500', emoji: '☀️' },
  { key: 'harvest', label: 'Harvest',  field: null,          bg: 'bg-red-100 dark:bg-red-900/40', text: 'text-red-700 dark:text-red-300', dot: 'bg-red-500', emoji: '🌾' },
];

// ── Day Detail Modal ────────────────────────────────────────────────────────

function DayDetailModal({ date, actions, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 bg-white dark:bg-gray-800 px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100">{fmtDate(date)}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl cursor-pointer">✕</button>
        </div>
        <div className="p-6 space-y-3">
          {actions.length === 0 && (
            <p className="text-gray-400 text-sm text-center py-4">No actions scheduled</p>
          )}
          {actions.map((a, i) => {
            const at = ACTION_TYPES.find((t) => t.key === a.type) || ACTION_TYPES[1];
            return (
              <div key={i} className={`rounded-xl p-3 ${at.bg}`}>
                <div className="flex items-center gap-2">
                  <span className="text-base">{at.emoji}</span>
                  <span className={`font-bold text-sm ${at.text}`}>{at.label}</span>
                </div>
                <p className={`text-sm font-medium mt-1 ${at.text}`}>
                  {a.batch.trayCount || a.batch.quantity || '?'} trays — {a.batch.cropName || a.batch.varietyName || 'Unknown'}
                </p>
                {a.type === 'soak' && a.batch.soakHours && (
                  <p className="text-xs text-gray-500 mt-0.5">{a.batch.soakHours || '?'} hour soak</p>
                )}
                <p className="text-[10px] text-gray-400 mt-1">
                  Stage: {a.batch.stage || '?'} · Delivery: {fmtShort(toDateStr(a.batch.deliveryDate))}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Main Component ──────────────────────────────────────────────────────────

export default function PlantingSchedule({
  batches = [],
  cropProfiles = [],
  loading = false,
}) {
  const today = todayStr();
  const [startDate, setStartDate] = useState(today);
  const [cropFilter, setCropFilter] = useState('all');
  const [stageFilter, setStageFilter] = useState('active'); // all | active | planned
  const [printMode, setPrintMode] = useState(false);
  const [selectedDay, setSelectedDay] = useState(null);

  const days = useMemo(() => getDayRange(startDate, 14), [startDate]);

  // Unique crop names for filter
  const cropNames = useMemo(() => {
    const names = new Set();
    batches.forEach((b) => names.add(b.cropName || b.varietyName || 'Unknown'));
    return ['all', ...Array.from(names).sort()];
  }, [batches]);

  // Filter batches
  const filteredBatches = useMemo(() => {
    let list = batches;
    if (cropFilter !== 'all') {
      list = list.filter((b) => (b.cropName || b.varietyName) === cropFilter);
    }
    if (stageFilter === 'active') {
      list = list.filter((b) => b.stage !== 'harvested');
    } else if (stageFilter === 'planned') {
      list = list.filter((b) => b.stage === 'planned');
    }
    return list;
  }, [batches, cropFilter, stageFilter]);

  // Build day → actions map
  const dayActions = useMemo(() => {
    const map = {};
    for (const day of days) map[day] = [];

    for (const batch of filteredBatches) {
      // Get crop profile for soak info
      const profile = cropProfiles.find((p) => p.id === batch.cropProfileId);

      // Soak
      const soakDate = toDateStr(batch.soakDate);
      if (soakDate && map[soakDate]) {
        map[soakDate].push({ type: 'soak', batch: { ...batch, soakHours: profile?.soakHours || batch.soakHours } });
      }

      // Sow
      const sowDate = toDateStr(batch.sowDate);
      if (sowDate && map[sowDate]) {
        map[sowDate].push({ type: 'sow', batch });
      }

      // Uncover
      const uncoverDate = toDateStr(batch.uncoverDate);
      if (uncoverDate && map[uncoverDate]) {
        map[uncoverDate].push({ type: 'uncover', batch });
      }

      // Harvest
      const harvestDate = toDateStr(batch.expectedHarvestDate || batch.estimatedHarvestStart);
      if (harvestDate && map[harvestDate]) {
        map[harvestDate].push({ type: 'harvest', batch });
      }
    }

    return map;
  }, [days, filteredBatches, cropProfiles]);

  const shiftDays = (n) => {
    const d = new Date(startDate + 'T12:00:00');
    d.setDate(d.getDate() + n);
    setStartDate(d.toISOString().split('T')[0]);
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto animate-pulse space-y-4">
        <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded-xl w-64" />
        <div className="grid grid-cols-7 gap-2">
          {Array.from({ length: 14 }).map((_, i) => (
            <div key={i} className="h-28 bg-gray-200 dark:bg-gray-700 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={`max-w-6xl mx-auto ${printMode ? 'print-mode' : ''}`}>
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div>
          <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">Planting Schedule</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            14-day view · {filteredBatches.length} batches
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setPrintMode(!printMode)}
            className="px-3 py-2 min-h-[44px] rounded-xl bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs font-semibold hover:bg-gray-200 dark:hover:bg-gray-600 cursor-pointer transition-colors"
          >
            {printMode ? '🖥️ Normal View' : '🖨️ Print View'}
          </button>
        </div>
      </div>

      {/* Filters */}
      {!printMode && (
        <div className="flex flex-wrap gap-2 mb-4">
          {/* Crop filter */}
          <select
            value={cropFilter}
            onChange={(e) => setCropFilter(e.target.value)}
            className="px-3 py-2 min-h-[44px] rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 text-sm focus:outline-none focus:border-green-400"
          >
            {cropNames.map((n) => (
              <option key={n} value={n}>{n === 'all' ? 'All Crops' : n}</option>
            ))}
          </select>

          {/* Stage filter */}
          {['all', 'active', 'planned'].map((s) => (
            <button
              key={s}
              onClick={() => setStageFilter(s)}
              className={`px-3 py-2 min-h-[44px] rounded-xl text-xs font-semibold cursor-pointer transition-all ${
                stageFilter === s
                  ? 'bg-green-600 text-white shadow-sm'
                  : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-green-300'
              }`}
            >
              {s === 'all' ? 'All Stages' : s === 'active' ? 'Active' : 'Planned'}
            </button>
          ))}

          {/* Nav arrows */}
          <div className="flex items-center gap-1 ml-auto">
            <button
              onClick={() => shiftDays(-7)}
              className="px-3 py-2 min-h-[44px] rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 text-xs font-semibold cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              ← Week
            </button>
            <button
              onClick={() => setStartDate(todayStr())}
              className="px-3 py-2 min-h-[44px] rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 text-xs font-semibold cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              Today
            </button>
            <button
              onClick={() => shiftDays(7)}
              className="px-3 py-2 min-h-[44px] rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 text-xs font-semibold cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              Week →
            </button>
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="flex flex-wrap gap-3 mb-4">
        {ACTION_TYPES.map((at) => (
          <div key={at.key} className="flex items-center gap-1.5">
            <span className={`w-3 h-3 rounded-full ${at.dot}`} />
            <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">{at.emoji} {at.label}</span>
          </div>
        ))}
      </div>

      {/* Calendar Grid — 7 columns × 2 rows */}
      <div className="grid grid-cols-7 gap-2">
        {days.map((day) => {
          const actions = dayActions[day] || [];
          const isToday = day === today;
          const isPast = day < today;

          return (
            <button
              key={day}
              onClick={() => setSelectedDay(day)}
              className={`rounded-xl border p-2 text-left transition-all cursor-pointer min-h-[100px] ${
                isToday
                  ? 'border-green-400 dark:border-green-600 bg-green-50 dark:bg-green-900/20 ring-2 ring-green-300 dark:ring-green-700'
                  : isPast
                  ? 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 opacity-60'
                  : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-green-300 dark:hover:border-green-600'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className={`text-[10px] font-bold uppercase ${
                  isToday ? 'text-green-700 dark:text-green-300' : 'text-gray-400 dark:text-gray-500'
                }`}>
                  {fmtWeekday(day)}
                </span>
                <span className={`text-sm font-bold ${
                  isToday ? 'text-green-700 dark:text-green-300' : 'text-gray-700 dark:text-gray-200'
                }`}>
                  {fmtShort(day)}
                </span>
              </div>

              {/* Action pills */}
              <div className="space-y-1">
                {actions.slice(0, 4).map((a, i) => {
                  const at = ACTION_TYPES.find((t) => t.key === a.type) || ACTION_TYPES[1];
                  const name = a.batch.cropName || a.batch.varietyName || '?';
                  const qty = a.batch.trayCount || a.batch.quantity || '?';
                  return (
                    <div key={i} className={`rounded-lg px-1.5 py-0.5 ${at.bg}`}>
                      <span className={`text-[10px] font-bold ${at.text} leading-none`}>
                        {at.emoji} {qty}× {name.length > 8 ? name.slice(0, 8) + '…' : name}
                      </span>
                    </div>
                  );
                })}
                {actions.length > 4 && (
                  <span className="text-[10px] text-gray-400 font-medium">+{actions.length - 4} more</span>
                )}
                {actions.length === 0 && (
                  <span className="text-[10px] text-gray-300 dark:text-gray-600">—</span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Print styles */}
      {printMode && (
        <div className="mt-6 text-center">
          <button
            onClick={() => window.print()}
            className="px-6 py-3 min-h-[52px] rounded-xl bg-green-600 hover:bg-green-700 text-white text-sm font-bold cursor-pointer transition-colors print:hidden"
          >
            🖨️ Print This Schedule
          </button>
        </div>
      )}

      {/* Day Detail Modal */}
      {selectedDay && (
        <DayDetailModal
          date={selectedDay}
          actions={dayActions[selectedDay] || []}
          onClose={() => setSelectedDay(null)}
        />
      )}

      <style>{`
        @media print {
          .print-mode { max-width: 100% !important; }
          .print\\:hidden { display: none !important; }
          button { pointer-events: none; }
        }
      `}</style>
    </div>
  );
}
