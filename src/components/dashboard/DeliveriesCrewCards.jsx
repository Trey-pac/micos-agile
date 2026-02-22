import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { cropConfig } from '../../data/cropConfig';

const FIRST_STAGE_IDS = new Set(
  Object.values(cropConfig).map(cat => cat.stages[0]?.id).filter(Boolean)
);

export default function DeliveriesCrewCards({ todayDeliveries = [], batches = [] }) {
  const navigate = useNavigate();

  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  const crewSummary = useMemo(() => {
    let planted = 0, moved = 0, harvested = 0;
    batches.forEach(b => {
      (b.stageHistory || []).forEach(h => {
        if (!h.enteredAt?.startsWith(todayStr)) return;
        if (FIRST_STAGE_IDS.has(h.stage)) planted++;
        else if (h.stage === 'harvested') harvested++;
        else moved++;
      });
    });
    return { planted, moved, harvested };
  }, [batches, todayStr]);

  return (
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
  );
}
