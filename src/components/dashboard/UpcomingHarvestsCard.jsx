import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';

export default function UpcomingHarvestsCard({ orders = [] }) {
  const navigate = useNavigate();

  const harvestDates = useMemo(() => {
    const actionable = orders.filter(o => ['confirmed', 'harvesting'].includes(o.status) && o.requestedDeliveryDate);
    const map = {};
    for (const o of actionable) {
      if (!map[o.requestedDeliveryDate]) map[o.requestedDeliveryDate] = [];
      map[o.requestedDeliveryDate].push(o);
    }
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b));
  }, [orders]);

  if (!harvestDates.length) return null;

  return (
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
  );
}
