import { useMemo } from 'react';
import { DeliverySkeleton } from './ui/Skeletons';

const STATUS_BADGE = {
  pending:   { cls: 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300', label: 'Pending' },
  delivered: { cls: 'bg-green-100 text-green-700', label: 'Delivered' },
  skipped:   { cls: 'bg-red-100 text-red-600', label: 'Skipped' },
};

const ROUTE_STATUS = {
  pending:     { cls: 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300', label: 'Pending' },
  in_progress: { cls: 'bg-blue-100 text-blue-700', label: 'In Progress' },
  completed:   { cls: 'bg-green-100 text-green-700', label: 'Completed' },
};

/**
 * DeliveryTracker — admin view showing delivery routes and stop progress.
 *
 * Props:
 *   deliveries — full array from useDeliveries
 *   loading    — show skeleton while Firestore is loading
 */
export default function DeliveryTracker({ deliveries = [], loading = false }) {
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  // Show today's deliveries first, then recent
  const sorted = useMemo(() => {
    const today = deliveries.filter((d) => d.date === todayStr);
    const other = deliveries.filter((d) => d.date !== todayStr);
    return [...today, ...other].slice(0, 20);
  }, [deliveries, todayStr]);

  // Global stats for today
  const todayRoutes = useMemo(() => deliveries.filter((d) => d.date === todayStr), [deliveries, todayStr]);
  const totalStops = todayRoutes.reduce((s, d) => s + (d.stops?.length || 0), 0);
  const deliveredStops = todayRoutes.reduce(
    (s, d) => s + (d.stops || []).filter((st) => st.deliveryStatus === 'delivered').length, 0
  );
  const activeCount = todayRoutes.filter((d) => d.status === 'in_progress').length;

  if (loading) return <DeliverySkeleton />;

  return (
    <div className="max-w-4xl mx-auto space-y-6">

      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">🚚 Delivery Tracker</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">EasyRoutes integration — real-time delivery progress</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Today's Routes", value: todayRoutes.length, color: 'text-gray-800 dark:text-gray-100' },
          { label: 'Active Now',     value: activeCount,        color: activeCount > 0 ? 'text-blue-700' : 'text-gray-400 dark:text-gray-500' },
          { label: 'Stops Delivered', value: deliveredStops,     color: deliveredStops > 0 ? 'text-green-700' : 'text-gray-400 dark:text-gray-500' },
          { label: 'Total Stops',    value: totalStops,          color: 'text-gray-600 dark:text-gray-300' },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-gray-700 text-center">
            <div className={`text-4xl font-black ${color}`}>{value}</div>
            <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 mt-1 leading-tight">{label}</div>
          </div>
        ))}
      </div>

      {/* Route cards */}
      {sorted.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-sm border border-gray-100 dark:border-gray-700 text-center">
          <div className="text-4xl mb-3">🚚</div>
          <h3 className="text-lg font-bold text-gray-700 dark:text-gray-200 mb-1">No active deliveries</h3>
          <p className="text-sm text-gray-400 dark:text-gray-500">Dispatch routes from EasyRoutes to see them here</p>
        </div>
      ) : (
        <div className="space-y-4">
          {sorted.map((delivery) => (
            <RouteCard key={delivery.id} delivery={delivery} todayStr={todayStr} />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Route Card ────────────────────────────────────────────────────────────────

function RouteCard({ delivery, todayStr }) {
  const stops = delivery.stops || [];
  const deliveredCount = stops.filter((s) => s.deliveryStatus === 'delivered').length;
  const pct = stops.length > 0 ? Math.round((deliveredCount / stops.length) * 100) : 0;
  const routeStatus = ROUTE_STATUS[delivery.status] || ROUTE_STATUS.pending;
  const isToday = delivery.date === todayStr;

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-2xl shadow-sm border overflow-hidden ${
      isToday ? 'border-sky-200' : 'border-gray-100 dark:border-gray-700'
    }`}>
      {/* Card header */}
      <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <span className="text-xl">🚚</span>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-gray-800 dark:text-gray-100 text-sm">
                {delivery.driverName || 'Unassigned'}
              </span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${routeStatus.cls}`}>
                {routeStatus.label}
              </span>
              {isToday && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-100 text-sky-700">
                  Today
                </span>
              )}
            </div>
            <span className="text-xs text-gray-400 dark:text-gray-500">{delivery.date} · {stops.length} stop{stops.length !== 1 ? 's' : ''}</span>
          </div>
        </div>
        <div className="text-right">
          <div className="text-lg font-black text-gray-800 dark:text-gray-100">{pct}%</div>
          <div className="text-[10px] text-gray-400 dark:text-gray-500 font-semibold">{deliveredCount}/{stops.length}</div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 bg-gray-100 dark:bg-gray-700">
        <div
          className={`h-full transition-all duration-500 rounded-full ${
            pct === 100 ? 'bg-green-500' : pct > 0 ? 'bg-sky-500' : 'bg-gray-200 dark:bg-gray-600'
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>

      {/* Stops list */}
      {stops.length > 0 && (
        <div className="divide-y divide-gray-50">
          {stops.map((stop, idx) => (
            <StopRow key={idx} stop={stop} index={idx} />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Stop Row ──────────────────────────────────────────────────────────────────

function StopRow({ stop, index }) {
  const badge = STATUS_BADGE[stop.deliveryStatus] || STATUS_BADGE.pending;
  const time = stop.deliveredAt
    ? new Date(stop.deliveredAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
    : null;

  return (
    <div className="px-5 py-3 flex items-center gap-3 hover:bg-gray-50/50 dark:hover:bg-gray-700/50 transition-colors">
      {/* Stop number */}
      <div className="w-6 h-6 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-[10px] font-bold text-gray-500 dark:text-gray-400 shrink-0">
        {index + 1}
      </div>

      {/* Customer name */}
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-gray-700 dark:text-gray-200 truncate">{stop.customerName || 'Unknown'}</div>
        {stop.orderId && (
          <div className="text-[10px] text-gray-400 dark:text-gray-500 truncate">Order: {stop.orderId}</div>
        )}
      </div>

      {/* Delivery time */}
      {time && (
        <span className="text-xs text-gray-400 dark:text-gray-500 shrink-0">{time}</span>
      )}

      {/* Status badge */}
      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${badge.cls}`}>
        {badge.label}
      </span>

      {/* Proof photo thumbnail */}
      {stop.proofPhotoUrl && (
        <a
          href={stop.proofPhotoUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0"
          title="View delivery proof"
        >
          <img
            src={stop.proofPhotoUrl}
            alt="Proof"
            className="w-8 h-8 rounded-lg object-cover border border-gray-200 dark:border-gray-700 hover:border-sky-400 transition-colors"
          />
        </a>
      )}
    </div>
  );
}
