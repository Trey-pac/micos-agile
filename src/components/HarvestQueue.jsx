import { useState, useMemo, useCallback } from 'react';
import { generateHarvestPlan, autoCreateProductionTasks } from '../services/harvestPlanningService';
import { HarvestQueueSkeleton } from './ui/Skeletons';

// ── Helpers ─────────────────────────────────────────────────────────────────

function groupByDate(orders) {
  const map = {};
  for (const o of orders) {
    const d = o.requestedDeliveryDate || 'unscheduled';
    if (!map[d]) map[d] = [];
    map[d].push(o);
  }
  return Object.entries(map).sort(([a], [b]) => a.localeCompare(b));
}

function statusColor(status) {
  switch (status) {
    case 'confirmed': return 'bg-indigo-100 text-indigo-700';
    case 'harvesting': return 'bg-amber-100 text-amber-700';
    case 'packed': return 'bg-orange-100 text-orange-700';
    default: return 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300';
  }
}

function relativeDay(dateStr) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(dateStr + 'T00:00:00');
  const diff = Math.round((d - today) / 86400000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  if (diff < 0) return `${Math.abs(diff)}d ago`;
  return `in ${diff}d`;
}

// ── Sub-components ──────────────────────────────────────────────────────────

function PlanCard({ item, expanded, onToggle }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-3 text-left cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
      >
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-lg">{item.category === 'mushrooms' ? '🍄' : '🌱'}</span>
          <div className="min-w-0">
            <p className="font-semibold text-gray-800 dark:text-gray-100 text-sm truncate">{item.cropName}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {item.traysNeeded} trays · {item.totalOz} oz needed
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-green-100 text-green-700">
            {item.yieldPerTray} oz/tray
          </span>
          <span className="text-gray-400 dark:text-gray-500 text-xs">{expanded ? '▾' : '▸'}</span>
        </div>
      </button>
      {expanded && (
        <div className="px-4 pb-3 border-t border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-700/50">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2">
            {item.soakDate && (
              <div className="text-center p-2 bg-blue-50 rounded-lg">
                <p className="text-[10px] uppercase text-blue-500 font-medium">Soak</p>
                <p className="text-xs font-semibold text-blue-700">{item.soakDate}</p>
              </div>
            )}
            <div className="text-center p-2 bg-indigo-50 rounded-lg">
              <p className="text-[10px] uppercase text-indigo-500 font-medium">Sow</p>
              <p className="text-xs font-semibold text-indigo-700">{item.sowDate}</p>
            </div>
            <div className="text-center p-2 bg-amber-50 rounded-lg">
              <p className="text-[10px] uppercase text-amber-500 font-medium">Uncover</p>
              <p className="text-xs font-semibold text-amber-700">{item.uncoverDate}</p>
            </div>
            <div className="text-center p-2 bg-green-50 rounded-lg">
              <p className="text-[10px] uppercase text-green-500 font-medium">Harvest</p>
              <p className="text-xs font-semibold text-green-700">{item.harvestDate}</p>
            </div>
          </div>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
            Linked to {item.orders.length} order{item.orders.length !== 1 ? 's' : ''}
          </p>
        </div>
      )}
    </div>
  );
}

// ── Main Component ──────────────────────────────────────────────────────────

export default function HarvestQueue({ farmId, orders = [], loading = false }) {
  const [plans, setPlans] = useState({});       // deliveryDate → planArray
  const [generating, setGenerating] = useState(null); // deliveryDate being generated
  const [creating, setCreating] = useState(null);
  const [expanded, setExpanded] = useState({});  // `${date}-${cropId}` → bool
  const [message, setMessage] = useState(null);

  if (loading) return <HarvestQueueSkeleton />;

  // Only orders that matter for harvesting
  const actionableOrders = useMemo(() =>
    orders.filter(o => ['confirmed', 'harvesting'].includes(o.status)),
    [orders]
  );

  const dateGroups = useMemo(() => groupByDate(actionableOrders), [actionableOrders]);

  const handleGenerate = useCallback(async (deliveryDate) => {
    setGenerating(deliveryDate);
    setMessage(null);
    try {
      const plan = await generateHarvestPlan(farmId, deliveryDate);
      setPlans(prev => ({ ...prev, [deliveryDate]: plan }));
      if (plan.length === 0) setMessage({ type: 'info', text: `No items to plan for ${deliveryDate}` });
    } catch (err) {
      console.error(err);
      setMessage({ type: 'error', text: 'Failed to generate plan.' });
    } finally {
      setGenerating(null);
    }
  }, [farmId]);

  const handleCreateTasks = useCallback(async (deliveryDate) => {
    const plan = plans[deliveryDate];
    if (!plan?.length) return;
    setCreating(deliveryDate);
    setMessage(null);
    try {
      const result = await autoCreateProductionTasks(farmId, plan);
      setMessage({
        type: 'success',
        text: `Created ${result.scheduleEntries} sowing entries & ${result.crewTasks} crew tasks`,
      });
    } catch (err) {
      console.error(err);
      setMessage({ type: 'error', text: 'Failed to create tasks.' });
    } finally {
      setCreating(null);
    }
  }, [farmId, plans]);

  const toggleExpand = (key) => setExpanded(prev => ({ ...prev, [key]: !prev[key] }));

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-5">
        <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">🌱 Harvest Queue</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {actionableOrders.length} order{actionableOrders.length !== 1 ? 's' : ''} awaiting harvest
        </p>
      </div>

      {/* Toast */}
      {message && (
        <div className={`mb-4 px-4 py-2 rounded-xl text-sm font-medium ${
          message.type === 'error' ? 'bg-red-50 text-red-700' :
          message.type === 'success' ? 'bg-green-50 text-green-700' :
          'bg-blue-50 text-blue-700'
        }`}>
          {message.text}
        </div>
      )}

      {/* Empty state */}
      {dateGroups.length === 0 && (
        <div className="text-center py-20">
          <p className="text-4xl mb-3">📭</p>
          <p className="text-gray-500 dark:text-gray-400 text-sm">No confirmed or harvesting orders.</p>
          <p className="text-gray-400 dark:text-gray-500 text-xs mt-1">Orders will show here once confirmed.</p>
        </div>
      )}

      {/* Date groups */}
      {dateGroups.map(([date, dateOrders]) => {
        const plan = plans[date];
        const isGenerating = generating === date;
        const isCreating = creating === date;

        return (
          <div key={date} className="mb-6">
            {/* Date header */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-gray-800 dark:text-gray-100">{date}</h3>
                <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 font-medium">
                  {relativeDay(date)}
                </span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleGenerate(date)}
                  disabled={isGenerating}
                  className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 cursor-pointer transition-colors"
                >
                  {isGenerating ? 'Generating…' : '⚡ Generate Plan'}
                </button>
                {plan?.length > 0 && (
                  <button
                    onClick={() => handleCreateTasks(date)}
                    disabled={isCreating}
                    className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 cursor-pointer transition-colors"
                  >
                    {isCreating ? 'Creating…' : '📋 Create Tasks'}
                  </button>
                )}
              </div>
            </div>

            {/* Order summary */}
            <div className="flex gap-2 flex-wrap mb-3">
              {dateOrders.map(o => (
                <div key={o.id} className="flex items-center gap-1.5 text-xs px-2 py-1 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                  <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${statusColor(o.status)}`}>
                    {o.status}
                  </span>
                  <span className="text-gray-700 dark:text-gray-200 font-medium truncate max-w-[120px]">
                    {o.customerName || 'Customer'}
                  </span>
                  <span className="text-gray-400 dark:text-gray-500">
                    {o.items?.length || 0} items
                  </span>
                </div>
              ))}
            </div>

            {/* Generated plan */}
            {plan && plan.length > 0 && (
              <div className="space-y-2">
                {plan.map(item => {
                  const key = `${date}-${item.cropId}`;
                  return (
                    <PlanCard
                      key={key}
                      item={item}
                      expanded={!!expanded[key]}
                      onToggle={() => toggleExpand(key)}
                    />
                  );
                })}
              </div>
            )}

            {plan && plan.length === 0 && (
              <p className="text-xs text-gray-400 dark:text-gray-500 italic">No harvest items for this date.</p>
            )}
          </div>
        );
      })}
    </div>
  );
}
