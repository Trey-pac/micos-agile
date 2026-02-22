import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { queryDemand } from '../../utils/demandUtils';
import { calculateSowingNeeds } from '../../utils/sowingUtils';

export default function PipelineHealthCard({ orders = [], activeBatches = [] }) {
  const navigate = useNavigate();

  const sowingNeeds = useMemo(() => {
    const demandData = queryDemand(orders);
    return calculateSowingNeeds(demandData, activeBatches);
  }, [orders, activeBatches]);

  return (
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
            const barPct = Math.min(100, (need.daysOfSupply / 14) * 100);
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
  );
}
