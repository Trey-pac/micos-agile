import { useMemo } from 'react';
import { useCountUp } from '../hooks/useCountUp';
import { DashboardSkeleton } from './ui/Skeletons';
import { getAutoSelectedSprint } from '../utils/sprintUtils';
import RefreshBanner from './RefreshBanner';

import ActiveSprintCard from './dashboard/ActiveSprintCard';
import MyTasksCard from './dashboard/MyTasksCard';
import QuickLinksCard from './dashboard/QuickLinksCard';
import ShopifyOverviewCard from './dashboard/ShopifyOverviewCard';
import BusinessIntelCard from './dashboard/BusinessIntelCard';
import DeliveriesCrewCards from './dashboard/DeliveriesCrewCards';
import UpcomingHarvestsCard from './dashboard/UpcomingHarvestsCard';
import PipelineHealthCard from './dashboard/PipelineHealthCard';
import RecentActivityCard from './dashboard/RecentActivityCard';
import LearningEngineCard from './dashboard/LearningEngineCard';
import SeedBanner from './dashboard/SeedBanner';

const STATUS_LABEL = {
  'not-started': 'Not Started',
  'in-progress':  'In Progress',
  'roadblock':    'Roadblock',
  'done':         'Done',
};

export default function Dashboard({
  farmId,
  tasks = [], sprints = [], activities = [],
  orders = [], activeBatches = [], batches = [],
  todayDeliveries = [],
  shopifyCustomers = [], shopifyOrders = [],
  user,
  loading = false,
  refresh,
}) {
  // ── Greeting ──
  const { greeting, dateStr, firstName } = useMemo(() => {
    const hour = new Date().getHours();
    const g = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
    const d = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
    const fn = user?.displayName?.split(' ')[0] || 'there';
    return { greeting: g, dateStr: d, firstName: fn };
  }, [user]);

  // ── Active Sprint ──
  const activeSprint = useMemo(() => getAutoSelectedSprint(sprints), [sprints]);
  const sprintTasks  = useMemo(() => tasks.filter(t => t.sprintId === activeSprint?.id), [tasks, activeSprint]);
  const doneCount   = sprintTasks.filter(t => t.status === 'done').length;
  const totalSprint = sprintTasks.length;
  const pct = totalSprint ? Math.round((doneCount / totalSprint) * 100) : 0;
  const daysLeft = useMemo(() => {
    if (!activeSprint?.endDate) return null;
    return Math.max(0, Math.ceil((new Date(activeSprint.endDate) - new Date()) / 86400000));
  }, [activeSprint]);

  // ── My Tasks ──
  const ownerKey = user?.displayName?.split(' ')[0]?.toLowerCase();
  const endOfWeekStr = useMemo(() => {
    const d = new Date(); d.setDate(d.getDate() + 7);
    return d.toISOString().split('T')[0];
  }, []);
  const myTasks = useMemo(() =>
    tasks
      .filter(t => t.owner === ownerKey && t.status !== 'done' && (!t.dueDate || t.dueDate <= endOfWeekStr))
      .sort((a, b) => ({ high: 0, medium: 1, low: 2 }[a.priority] ?? 1) - ({ high: 0, medium: 1, low: 2 }[b.priority] ?? 1))
      .slice(0, 5),
    [tasks, ownerKey, endOfWeekStr]
  );

  // ── Animated counts ──
  const animNS   = useCountUp(sprintTasks.filter(t => t.status === 'not-started').length);
  const animIP   = useCountUp(sprintTasks.filter(t => t.status === 'in-progress').length);
  const animRB   = useCountUp(sprintTasks.filter(t => t.status === 'roadblock').length);
  const animDone = useCountUp(doneCount);
  const animPct  = useCountUp(pct);

  if (loading) return <DashboardSkeleton />;

  const animCounts = { 'not-started': animNS, 'in-progress': animIP, 'roadblock': animRB, 'done': animDone };
  const statusCounts = ['not-started', 'in-progress', 'roadblock', 'done'].map(s => ({
    status: s, label: STATUS_LABEL[s],
    short: s === 'not-started' ? 'Not Started' : s === 'in-progress' ? 'In Prog' : s === 'roadblock' ? 'Blocked' : 'Done',
    count: animCounts[s],
  }));
  const ringColor = pct >= 80 ? '#22c55e' : pct >= 40 ? '#f59e0b' : '#6366f1';

  return (
    <div className="max-w-5xl mx-auto space-y-4">
      {/* Greeting */}
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <ActiveSprintCard activeSprint={activeSprint} pct={pct} animPct={animPct}
          animDone={animDone} totalSprint={totalSprint} daysLeft={daysLeft}
          statusCounts={statusCounts} ringColor={ringColor} />
        <MyTasksCard myTasks={myTasks} ownerKey={ownerKey} />
      </div>

      <QuickLinksCard />
      <ShopifyOverviewCard shopifyCustomers={shopifyCustomers} shopifyOrders={shopifyOrders} />
      <BusinessIntelCard shopifyOrders={shopifyOrders} />
      <DeliveriesCrewCards todayDeliveries={todayDeliveries} batches={batches} />
      <UpcomingHarvestsCard orders={orders} />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <PipelineHealthCard orders={orders} activeBatches={activeBatches} />
        <RecentActivityCard activities={activities} />
      </div>

      <LearningEngineCard farmId={farmId} />
      <SeedBanner farmId={farmId} />
    </div>
  );
}
