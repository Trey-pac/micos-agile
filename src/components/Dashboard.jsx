import { useState, useMemo } from 'react';
import { useCountUp } from '../hooks/useCountUp';
import { useNavigate } from 'react-router-dom';
import { DashboardSkeleton } from './ui/Skeletons';
import { seedDatabase } from '../services/seedService';
import { ACTIVITY_TYPES } from '../services/activityService';
import { getAutoSelectedSprint } from '../utils/sprintUtils';
import { queryDemand } from '../utils/demandUtils';
import { calculateSowingNeeds } from '../utils/sowingUtils';
import { cropConfig } from '../data/cropConfig';

const FIRST_STAGE_IDS = new Set(
  Object.values(cropConfig).map(cat => cat.stages[0]?.id).filter(Boolean)
);

const TYPE_ICON = Object.fromEntries(ACTIVITY_TYPES.map(t => [t.id, t.icon]));

const STATUS_CLS = {
  'not-started': 'bg-gray-100 text-gray-600',
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
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#f3f4f6" strokeWidth={stroke} />
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
  user,
  loading = false,
}) {
  const navigate = useNavigate();
  if (loading) return <DashboardSkeleton />;
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

  // ── Animated counts (useCountUp — item 25) ────────────────────────────────
  const rawNS  = sprintTasks.filter(t => t.status === 'not-started').length;
  const rawIP  = sprintTasks.filter(t => t.status === 'in-progress').length;
  const rawRB  = sprintTasks.filter(t => t.status === 'roadblock').length;
  const animNS  = useCountUp(rawNS);
  const animIP  = useCountUp(rawIP);
  const animRB  = useCountUp(rawRB);
  const animDone = useCountUp(doneCount);
  const animPct  = useCountUp(pct);

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
          <h1 className="text-2xl font-bold text-gray-800">{greeting}, {firstName}</h1>
          <p className="text-sm text-gray-400 mt-0.5">{dateStr}</p>
        </div>
      </div>

      {/* ── Row 1: Active Sprint (ring) + My Tasks ────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        {/* Active Sprint — circular ring */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold text-gray-700">Active Sprint</h3>
            <button onClick={() => navigate('/kanban')} className="text-xs text-sky-600 hover:underline cursor-pointer">View →</button>
          </div>
          {activeSprint ? (
            <div className="flex items-center gap-5">
              {/* Ring */}
              <div className="relative shrink-0">
                <RingProgress pct={pct} color={ringColor} />
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-lg font-black text-gray-800">{animPct}%</span>
                </div>
              </div>
              {/* Details */}
              <div className="flex-1 min-w-0">
                <div className="text-base font-bold text-gray-900 mb-0.5">
                  Sprint {activeSprint.number}
                  {activeSprint.name && <span className="text-sm font-normal text-gray-400 ml-2">{activeSprint.name}</span>}
                </div>
                <div className="text-xs text-gray-500 mb-3">
                  {animDone}/{totalSprint} tasks done
                  {daysLeft !== null && (
                    <span className={`ml-2 font-semibold ${daysLeft < 3 ? 'text-red-600' : 'text-gray-500'}`}>
                      · {daysLeft}d left
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  {statusCounts.map(({ status, short, count }) => (
                    <div key={status} className={`rounded-lg px-2 py-1.5 text-center ${STATUS_CLS[status] || 'bg-gray-100 text-gray-600'}`}>
                      <div className="text-base font-black">{count}</div>
                      <div className="text-[9px] font-semibold leading-tight">{short}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-gray-400 text-sm py-8 text-center">No active sprint — create one in Planning</div>
          )}
        </div>

        {/* My Tasks */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold text-gray-700">My Tasks This Week</h3>
            <button onClick={() => navigate('/planning')} className="text-xs text-sky-600 hover:underline cursor-pointer">View all →</button>
          </div>
          {myTasks.length === 0 ? (
            <div className="text-gray-400 text-sm py-8 text-center">
              {ownerKey ? "You're all caught up! 🎉 Nothing due this week." : 'Sign in to see your tasks'}
            </div>
          ) : (
            <div className="space-y-1">
              {myTasks.map(t => (
                <div key={t.id} className="flex items-center gap-2 py-1.5 border-b border-gray-50 last:border-0">
                  <span className="text-[10px] shrink-0">{PRIO_DOT[t.priority] || ''}</span>
                  <span className="flex-1 text-sm text-gray-700 truncate">{t.title}</span>
                  <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full shrink-0 ${STATUS_CLS[t.status] || 'bg-gray-100 text-gray-600'}`}>
                    {STATUS_LABEL[t.status] || t.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Quick Links ─────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
        <h3 className="text-base font-semibold text-gray-700 mb-3">Quick Links</h3>
        <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
          {QUICK_LINKS.map(({ path, icon, label }) => (
            <button
              key={path}
              onClick={() => navigate(path)}
              className="flex flex-col items-center gap-1.5 py-3 rounded-xl bg-gray-50 hover:bg-sky-50 border border-gray-100 hover:border-sky-200 hover:scale-[1.03] active:scale-[0.97] transition-all duration-150 cursor-pointer"
            >
              <span className="text-xl">{icon}</span>
              <span className="text-[11px] font-semibold text-gray-600">{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Today's Crew ─────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl px-5 py-3.5 shadow-sm border border-gray-100 flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-4 text-sm font-bold">
          <span className="text-gray-500 font-semibold">Today's Crew</span>
          <span className="text-green-600">{crewSummary.planted} planted</span>
          <span className="text-amber-600">{crewSummary.moved} moved</span>
          <span className="text-sky-600">{crewSummary.harvested} harvested</span>
        </div>
        <div className="flex gap-3 shrink-0">
          <button onClick={() => navigate('/pipeline')} className="text-xs text-sky-600 hover:underline cursor-pointer font-semibold">Pipeline →</button>
          <button onClick={() => navigate('/reports')} className="text-xs text-sky-600 hover:underline cursor-pointer font-semibold">Report →</button>
        </div>
      </div>

      {/* ── Row 2: Pipeline Health + Recent Activity ──────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        {/* Pipeline Health */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-base font-semibold text-gray-700">Pipeline Health</h3>
            <button onClick={() => navigate('/pipeline')} className="text-xs text-sky-600 hover:underline cursor-pointer">View →</button>
          </div>
          {sowingNeeds.length === 0 ? (
            <div className="text-gray-400 text-sm py-4 text-center">No demand data yet — fulfill some orders first</div>
          ) : (
            <div className="space-y-2.5">
              {sowingNeeds.slice(0, 6).map(need => {
                const barPct   = Math.min(100, (need.daysOfSupply / 14) * 100);
                const barColor = need.daysOfSupply < 3 ? 'bg-red-500' : need.daysOfSupply < 7 ? 'bg-amber-400' : 'bg-green-500';
                const txtColor = need.urgency === 'critical' ? 'text-red-600 font-bold' : need.urgency === 'warning' ? 'text-amber-600 font-bold' : 'text-green-700';
                return (
                  <div key={need.cropId}>
                    <div className="flex justify-between text-xs mb-0.5">
                      <span className="text-gray-700 font-medium">{need.cropName}</span>
                      <span className={txtColor}>{need.daysOfSupply >= 99 ? '14+ d' : `${need.daysOfSupply}d`}</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${barPct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-base font-semibold text-gray-700">Recent Activity</h3>
            <button onClick={() => navigate('/activity')} className="text-xs text-sky-600 hover:underline cursor-pointer">View all →</button>
          </div>
          {recentActivity.length === 0 ? (
            <div className="text-gray-400 text-sm py-4 text-center">No activity yet — get building!</div>
          ) : (
            <div className="space-y-2">
              {recentActivity.map(a => (
                <div key={a.id} className="flex gap-2.5 py-1.5 border-b border-gray-50 last:border-0">
                  <span className="text-base shrink-0">{TYPE_ICON[a.type] || '📌'}</span>
                  <div className="min-w-0">
                    <div className="text-xs text-gray-700 truncate">{a.note}</div>
                    {a.taskTitle && (
                      <div className="text-[10px] text-gray-400 truncate">Re: {a.taskTitle}</div>
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
        <div className="p-5 bg-amber-50 border-2 border-amber-300 rounded-xl">
          <h3 className="text-base font-bold text-amber-800 mb-1">🌱 Seed Starter Data</h3>
          <p className="text-sm text-amber-700 mb-3">
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
                className="bg-gray-200 text-gray-700 font-semibold px-4 py-2.5 rounded-lg hover:bg-gray-300 transition-colors cursor-pointer text-sm"
              >Cancel</button>
            </div>
          )}
        </div>
      )}
      {seedResult && (
        <div className="p-4 bg-green-50 border-2 border-green-300 rounded-xl flex items-center justify-between">
          <p className="text-sm font-semibold text-green-800">
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
