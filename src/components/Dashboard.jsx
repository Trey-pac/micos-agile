import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useCountUp } from '../hooks/useCountUp';
import { useNavigate } from 'react-router-dom';
import { DashboardSkeleton } from './ui/Skeletons';
import { seedDatabase } from '../services/seedService';
import { ACTIVITY_TYPES } from '../services/activityService';
import { getAutoSelectedSprint } from '../utils/sprintUtils';
import { queryDemand } from '../utils/demandUtils';
import { calculateSowingNeeds } from '../utils/sowingUtils';
import { cropConfig } from '../data/cropConfig';
import RefreshBanner from './RefreshBanner';

const FIRST_STAGE_IDS = new Set(
  Object.values(cropConfig).map(cat => cat.stages[0]?.id).filter(Boolean)
);

const TYPE_ICON = Object.fromEntries(ACTIVITY_TYPES.map(t => [t.id, t.icon]));

const STATUS_CLS = {
  'not-started': 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300',
  'in-progress':  'bg-blue-100 text-blue-700',
  'roadblock':    'bg-red-100 text-red-700',
  'done':         'bg-green-100 text-green-700',
};
const STATUS_LABEL = {
  'not-started': 'Not Started',
  'in-progress':  'In Progress',
  'roadblock':    'Roadblock',
  'done':         'Done',
};
const PRIO_DOT = { high: '🔴', medium: '🟡', low: '⚪' };

const QUICK_LINKS = [
  { path: '/kanban',     icon: '📋', label: 'Kanban'     },
  { path: '/planning',   icon: '📐', label: 'Planning'   },
  { path: '/production', icon: '🌿', label: 'Production' },
  { path: '/orders',     icon: '📑', label: 'Orders'     },
  { path: '/budget',     icon: '💰', label: 'Budget'     },
  { path: '/sowing',     icon: '🌱', label: 'Sowing'     },
  { path: '/pipeline',   icon: '📊', label: 'Pipeline'   },
  { path: '/reports',    icon: '📄', label: 'Reports'    },
];

// SVG circular progress ring
function RingProgress({ pct, size = 88, stroke = 7, color = '#22c55e' }) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - pct / 100);
  return (
    <svg width={size} height={size} className="[transform:rotate(-90deg)]">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" className="stroke-gray-200 dark:stroke-gray-700" strokeWidth={stroke} />
      <circle
        cx={size / 2} cy={size / 2} r={r}
        fill="none" stroke={color} strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={circ}
        strokeDashoffset={offset}
        style={{ transition: 'stroke-dashoffset 600ms ease-out' }}
      />
    </svg>
  );
}

export default function Dashboard({
  farmId,
  tasks = [], sprints = [], activities = [],
  orders = [], activeBatches = [], batches = [],
  todayDeliveries = [],
  user,
  loading = false,
  refresh,
}) {
  const navigate = useNavigate();
  const [seeding,    setSeeding]    = useState(false);
  const [seedResult, setSeedResult] = useState(null);
  const [seedError,  setSeedError]  = useState(null);
  const [confirming, setConfirming] = useState(false);

  const handleSeed = async () => {
    setSeeding(true);
    setSeedError(null);
    try {
      const result = await seedDatabase(farmId);
      setSeedResult(result);
      setConfirming(false);
    } catch (err) {
      console.error('Seed error:', err);
      setSeedError(err.message);
    } finally {
      setSeeding(false);
    }
  };

  // ── Greeting ───────────────────────────────────────────────────────────────
  const { greeting, dateStr, firstName } = useMemo(() => {
    const hour = new Date().getHours();
    const g = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
    const d = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
    const fn = user?.displayName?.split(' ')[0] || 'there';
    return { greeting: g, dateStr: d, firstName: fn };
  }, [user]);

  // ── Active Sprint ──────────────────────────────────────────────────────────
  const activeSprint = useMemo(() => getAutoSelectedSprint(sprints), [sprints]);
  const sprintTasks  = useMemo(() =>
    tasks.filter(t => t.sprintId === activeSprint?.id),
    [tasks, activeSprint]
  );
  const doneCount   = sprintTasks.filter(t => t.status === 'done').length;
  const totalSprint = sprintTasks.length;
  const pct = totalSprint ? Math.round((doneCount / totalSprint) * 100) : 0;

  const daysLeft = useMemo(() => {
    if (!activeSprint?.endDate) return null;
    const diff = new Date(activeSprint.endDate) - new Date();
    return Math.max(0, Math.ceil(diff / 86400000));
  }, [activeSprint]);

  // ── My Tasks ───────────────────────────────────────────────────────────────
  const ownerKey = user?.displayName?.split(' ')[0]?.toLowerCase();
  const endOfWeekStr = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().split('T')[0];
  }, []);
  const myTasks = useMemo(() =>
    tasks
      .filter(t =>
        t.owner === ownerKey &&
        t.status !== 'done' &&
        (!t.dueDate || t.dueDate <= endOfWeekStr)
      )
      .sort((a, b) => ({ high: 0, medium: 1, low: 2 }[a.priority] ?? 1) - ({ high: 0, medium: 1, low: 2 }[b.priority] ?? 1))
      .slice(0, 5),
    [tasks, ownerKey, endOfWeekStr]
  );

  // ── Pipeline Health ────────────────────────────────────────────────────────
  const demandData  = useMemo(() => queryDemand(orders), [orders]);
  const sowingNeeds = useMemo(() => calculateSowingNeeds(demandData, activeBatches), [demandData, activeBatches]);

  // ── Today's Crew Summary ───────────────────────────────────────────────────
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  const crewSummary = useMemo(() => {
    let planted = 0, moved = 0, harvested = 0;
    batches.forEach(b => {
      (b.stageHistory || []).forEach(h => {
        if (!h.enteredAt?.startsWith(todayStr)) return;
        if (FIRST_STAGE_IDS.has(h.stage))   planted++;
        else if (h.stage === 'harvested')    harvested++;
        else                                 moved++;
      });
    });
    return { planted, moved, harvested };
  }, [batches, todayStr]);

  // ── Recent Activity ────────────────────────────────────────────────────────
  const recentActivity = activities.slice(0, 5);

  // ── Upcoming Harvests (orders needing harvest, grouped by delivery date) ──
  const harvestDates = useMemo(() => {
    const actionable = orders.filter(o => ['confirmed', 'harvesting'].includes(o.status) && o.requestedDeliveryDate);
    const map = {};
    for (const o of actionable) {
      if (!map[o.requestedDeliveryDate]) map[o.requestedDeliveryDate] = [];
      map[o.requestedDeliveryDate].push(o);
    }
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b));
  }, [orders]);

  // ── Animated counts (useCountUp — item 25) ────────────────────────────────
  const rawNS  = sprintTasks.filter(t => t.status === 'not-started').length;
  const rawIP  = sprintTasks.filter(t => t.status === 'in-progress').length;
  const rawRB  = sprintTasks.filter(t => t.status === 'roadblock').length;
  const animNS  = useCountUp(rawNS);
  const animIP  = useCountUp(rawIP);
  const animRB  = useCountUp(rawRB);
  const animDone = useCountUp(doneCount);
  const animPct  = useCountUp(pct);

  if (loading) return <DashboardSkeleton />;

  // ── Sprint status counts ───────────────────────────────────────────────────
  const animCounts = { 'not-started': animNS, 'in-progress': animIP, 'roadblock': animRB, 'done': animDone };
  const statusCounts = ['not-started', 'in-progress', 'roadblock', 'done'].map(s => ({
    status: s,
    label: STATUS_LABEL[s],
    short: s === 'not-started' ? 'Not Started' : s === 'in-progress' ? 'In Prog' : s === 'roadblock' ? 'Blocked' : 'Done',
    count: animCounts[s],
  }));

  const ringColor = pct >= 80 ? '#22c55e' : pct >= 40 ? '#f59e0b' : '#6366f1';

  return (
    <div className="max-w-5xl mx-auto space-y-4">

      {/* ── Greeting header ────────────────────────────────────────────────── */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">{greeting}, {firstName}</h1>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-0.5">{dateStr}</p>
        </div>
        {refresh && (
          <RefreshBanner
            refreshing={refresh.refreshing}
            returnedFromBg={refresh.returnedFromBg}
            secondsAgo={refresh.secondsAgo}
            onRefresh={refresh.triggerRefresh}
          />
        )}
      </div>

      {/* ── Row 1: Active Sprint (ring) + My Tasks ────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        {/* Active Sprint — circular ring */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm dark:shadow-gray-900/30 border border-gray-100 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold text-gray-700 dark:text-gray-200">Active Sprint</h3>
            <button onClick={() => navigate('/kanban')} className="text-xs text-sky-600 hover:underline cursor-pointer">View →</button>
          </div>
          {activeSprint ? (
            <div className="flex items-center gap-5">
              {/* Ring */}
              <div className="relative shrink-0">
                <RingProgress pct={pct} color={ringColor} />
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-lg font-black text-gray-800 dark:text-gray-100">{animPct}%</span>
                </div>
              </div>
              {/* Details */}
              <div className="flex-1 min-w-0">
                <div className="text-base font-bold text-gray-900 mb-0.5">
                  Sprint {activeSprint.number}
                  {activeSprint.name && <span className="text-sm font-normal text-gray-400 dark:text-gray-500 ml-2">{activeSprint.name}</span>}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                  {animDone}/{totalSprint} tasks done
                  {daysLeft !== null && (
                    <span className={`ml-2 font-semibold ${daysLeft < 3 ? 'text-red-600' : 'text-gray-500 dark:text-gray-400'}`}>
                      · {daysLeft}d left
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  {statusCounts.map(({ status, short, count }) => (
                    <div key={status} className={`rounded-lg px-2 py-1.5 text-center ${STATUS_CLS[status] || 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'}`}>
                      <div className="text-base font-black">{count}</div>
                      <div className="text-[9px] font-semibold leading-tight">{short}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-gray-400 dark:text-gray-500 text-sm py-8 text-center">No active sprint — create one in Planning</div>
          )}
        </div>

        {/* My Tasks */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm dark:shadow-gray-900/30 border border-gray-100 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold text-gray-700 dark:text-gray-200">My Tasks This Week</h3>
            <button onClick={() => navigate('/planning')} className="text-xs text-sky-600 hover:underline cursor-pointer">View all →</button>
          </div>
          {myTasks.length === 0 ? (
            <div className="text-gray-400 dark:text-gray-500 text-sm py-8 text-center">
              {ownerKey ? "You're all caught up! 🎉 Nothing due this week." : 'Sign in to see your tasks'}
            </div>
          ) : (
            <div className="space-y-1">
              {myTasks.map(t => (
                <div key={t.id} className="flex items-center gap-2 py-2.5 min-h-[44px] border-b border-gray-50 dark:border-gray-800 last:border-0">
                  <span className="text-[10px] shrink-0">{PRIO_DOT[t.priority] || ''}</span>
                  <span className="flex-1 text-sm text-gray-700 dark:text-gray-200 truncate">{t.title}</span>
                  {t.size && (
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded shrink-0 ${
                      t.size === 'L' ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-300' :
                      t.size === 'M' ? 'bg-sky-100 dark:bg-sky-900/30 text-sky-600 dark:text-sky-300' :
                      'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                    }`}>{t.size}</span>
                  )}
                  <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full shrink-0 ${STATUS_CLS[t.status] || 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'}`}>
                    {STATUS_LABEL[t.status] || t.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Quick Links ─────────────────────────────────────────────────────── */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm dark:shadow-gray-900/30 border border-gray-100 dark:border-gray-700">
        <h3 className="text-base font-semibold text-gray-700 dark:text-gray-200 mb-3">Quick Links</h3>
        <motion.div initial="hidden" animate="visible" variants={{ visible: { transition: { staggerChildren: 0.05 } } }} className="grid grid-cols-4 sm:grid-cols-8 gap-2">
          {QUICK_LINKS.map(({ path, icon, label }) => (
            <motion.button
              key={path}
              variants={{ hidden: { opacity: 0, y: 8 }, visible: { opacity: 1, y: 0, transition: { duration: 0.2 } } }}
              whileTap={{ scale: 0.97 }}
              onClick={() => navigate(path)}
              className="flex flex-col items-center gap-1.5 py-3 rounded-xl bg-gray-50 dark:bg-gray-700/50 hover:bg-sky-50 dark:hover:bg-sky-900/30 border border-gray-100 dark:border-gray-700 hover:border-sky-200 dark:hover:border-sky-600 hover:scale-[1.03] active:scale-[0.97] transition-all duration-150 cursor-pointer"
            >
              <span className="text-xl">{icon}</span>
              <span className="text-[11px] font-semibold text-gray-600 dark:text-gray-300">{label}</span>
            </motion.button>
          ))}
        </motion.div>
      </div>

      {/* ── Today's Deliveries + Crew ────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Deliveries widget */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl px-5 py-3.5 shadow-sm dark:shadow-gray-900/30 border border-gray-100 dark:border-gray-700">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-base font-semibold text-gray-700 dark:text-gray-200">Today's Deliveries</h3>
            <button onClick={() => navigate('/deliveries')} className="text-xs text-sky-600 hover:underline cursor-pointer font-semibold">View all →</button>
          </div>
          {todayDeliveries.length === 0 ? (
            <div className="text-gray-400 dark:text-gray-500 text-sm py-4 text-center">No deliveries dispatched today</div>
          ) : (
            <div className="space-y-2">
              {todayDeliveries.slice(0, 4).map(d => {
                const stops = d.stops || [];
                const delivered = stops.filter(s => s.deliveryStatus === 'delivered').length;
                const pct = stops.length > 0 ? Math.round((delivered / stops.length) * 100) : 0;
                return (
                  <div key={d.id} className="flex items-center gap-3">
                    <span className="text-sm">🚚</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-semibold text-gray-700 dark:text-gray-200 truncate">{d.driverName || 'Unassigned'}</div>
                      <div className="h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full mt-1 overflow-hidden">
                        <div className={`h-full rounded-full transition-all ${pct === 100 ? 'bg-green-500' : 'bg-sky-500'}`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                    <span className="text-xs text-gray-400 dark:text-gray-500 font-semibold shrink-0">{delivered}/{stops.length}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Crew summary */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl px-5 py-3.5 shadow-sm dark:shadow-gray-900/30 border border-gray-100 dark:border-gray-700">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-base font-semibold text-gray-700 dark:text-gray-200">Today's Crew</h3>
            <div className="flex gap-3 shrink-0">
              <button onClick={() => navigate('/pipeline')} className="text-xs text-sky-600 hover:underline cursor-pointer font-semibold">Pipeline →</button>
              <button onClick={() => navigate('/reports')} className="text-xs text-sky-600 hover:underline cursor-pointer font-semibold">Report →</button>
            </div>
          </div>
          <div className="flex items-center gap-4 text-sm font-bold py-2">
            <span className="text-green-600">{crewSummary.planted} planted</span>
            <span className="text-amber-600">{crewSummary.moved} moved</span>
            <span className="text-sky-600">{crewSummary.harvested} harvested</span>
          </div>
        </div>
      </div>

      {/* ── Upcoming Harvests Widget ──────────────────────────────────── */}
      {harvestDates.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl px-5 py-3.5 shadow-sm dark:shadow-gray-900/30 border border-gray-100 dark:border-gray-700">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-base font-semibold text-gray-700 dark:text-gray-200">Upcoming Harvests</h3>
            <button onClick={() => navigate('/harvest-queue')} className="text-xs text-sky-600 hover:underline cursor-pointer font-semibold">Queue →</button>
          </div>
          <div className="space-y-2">
            {harvestDates.slice(0, 4).map(([date, dateOrders]) => {
              const totalItems = dateOrders.reduce((s, o) => s + (o.items?.length || 0), 0);
              const today = new Date(); today.setHours(0,0,0,0);
              const d = new Date(date + 'T00:00:00');
              const diff = Math.round((d - today) / 86400000);
              const tag = diff === 0 ? 'Today' : diff === 1 ? 'Tomorrow' : `${diff}d`;
              const tagColor = diff <= 0 ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300' : diff <= 2 ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300' : 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300';
              return (
                <div key={date} className="flex items-center justify-between py-1.5 border-b border-gray-50 dark:border-gray-800 last:border-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm">🌾</span>
                    <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">{date}</span>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${tagColor}`}>{tag}</span>
                  </div>
                  <span className="text-xs text-gray-500 dark:text-gray-400">{dateOrders.length} orders · {totalItems} items</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Row 2: Pipeline Health + Recent Activity ──────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        {/* Pipeline Health */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm dark:shadow-gray-900/30 border border-gray-100 dark:border-gray-700">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-base font-semibold text-gray-700 dark:text-gray-200">Pipeline Health</h3>
            <button onClick={() => navigate('/pipeline')} className="text-xs text-sky-600 hover:underline cursor-pointer">View →</button>
          </div>
          {sowingNeeds.length === 0 ? (
            <div className="text-gray-400 dark:text-gray-500 text-sm py-4 text-center">No demand data yet — fulfill some orders first</div>
          ) : (
            <div className="space-y-2.5">
              {sowingNeeds.slice(0, 6).map(need => {
                const barPct   = Math.min(100, (need.daysOfSupply / 14) * 100);
                const barColor = need.daysOfSupply < 3 ? 'bg-red-500' : need.daysOfSupply < 7 ? 'bg-amber-400' : 'bg-green-500';
                const txtColor = need.urgency === 'critical' ? 'text-red-600 dark:text-red-400 font-bold' : need.urgency === 'warning' ? 'text-amber-600 dark:text-amber-400 font-bold' : 'text-green-700 dark:text-green-400';
                return (
                  <div key={need.cropId}>
                    <div className="flex justify-between text-xs mb-0.5">
                      <span className="text-gray-700 dark:text-gray-200 font-medium">{need.cropName}</span>
                      <span className={txtColor}>{need.daysOfSupply >= 99 ? '14+ d' : `${need.daysOfSupply}d`}</span>
                    </div>
                    <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${barPct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Recent Activity */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm dark:shadow-gray-900/30 border border-gray-100 dark:border-gray-700">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-base font-semibold text-gray-700 dark:text-gray-200">Recent Activity</h3>
            <button onClick={() => navigate('/activity')} className="text-xs text-sky-600 hover:underline cursor-pointer">View all →</button>
          </div>
          {recentActivity.length === 0 ? (
            <div className="text-gray-400 dark:text-gray-500 text-sm py-4 text-center">No activity yet — get building!</div>
          ) : (
            <div className="space-y-2">
              {recentActivity.map(a => (
                <div key={a.id} className="flex gap-2.5 py-1.5 border-b border-gray-50 dark:border-gray-800 last:border-0">
                  <span className="text-base shrink-0">{TYPE_ICON[a.type] || '📌'}</span>
                  <div className="min-w-0">
                    <div className="text-xs text-gray-700 dark:text-gray-200 truncate">{a.note}</div>
                    {a.taskTitle && (
                      <div className="text-[10px] text-gray-400 dark:text-gray-500 truncate">Re: {a.taskTitle}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Seed Banner (dev tool — bottom) ─────────────────────────────────── */}
      {!seedResult && (
        <div className="p-5 bg-amber-50 dark:bg-amber-900/20 border-2 border-amber-300 dark:border-amber-700 rounded-xl">
          <h3 className="text-base font-bold text-amber-800 dark:text-amber-300 mb-1">🌱 Seed Starter Data</h3>
          <p className="text-sm text-amber-700 dark:text-amber-400 mb-3">
            ⚠️ Resets all sprint, task, and vendor data to the latest starter dataset. Existing data will be wiped.
          </p>
          {seedError && <p className="text-sm text-red-600 mb-2 font-medium">Error: {seedError}</p>}
          {!confirming ? (
            <button
              onClick={() => setConfirming(true)}
              className="bg-green-600 text-white font-bold px-5 py-2.5 rounded-lg hover:bg-green-700 transition-colors cursor-pointer text-sm"
            >🌱 Seed Starter Data</button>
          ) : (
            <div className="flex items-center gap-3">
              <button
                onClick={handleSeed}
                disabled={seeding}
                className="bg-red-600 text-white font-bold px-5 py-2.5 rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors cursor-pointer text-sm"
              >{seeding ? 'Seeding…' : 'Yes, seed now'}</button>
              <button
                onClick={() => setConfirming(false)}
                disabled={seeding}
                className="bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 font-semibold px-4 py-2.5 rounded-lg hover:bg-gray-300 transition-colors cursor-pointer text-sm"
              >Cancel</button>
            </div>
          )}
        </div>
      )}
      {seedResult && (
        <div className="p-4 bg-green-50 dark:bg-green-900/20 border-2 border-green-300 dark:border-green-700 rounded-xl flex items-center justify-between">
          <p className="text-sm font-semibold text-green-800 dark:text-green-300">
            ✅ Seeded {seedResult.sprints} sprints, {seedResult.tasks} tasks, and {seedResult.vendors} vendors!
          </p>
          <button
            onClick={() => navigate('/kanban')}
            className="bg-green-600 text-white font-bold px-4 py-2 rounded-lg hover:bg-green-700 transition-colors cursor-pointer text-sm"
          >Go to Kanban →</button>
        </div>
      )}
    </div>
  );
}
