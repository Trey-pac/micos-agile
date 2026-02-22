import { useNavigate } from 'react-router-dom';
import { useLearningDashboard } from '../../hooks/useLearningEngine';
import { useAlerts } from '../../contexts/AlertContext';

export default function LearningEngineCard({ farmId }) {
  const navigate = useNavigate();
  const { dashboard: leDashboard } = useLearningDashboard(farmId);
  const { alertCount } = useAlerts();

  if (!leDashboard) return null;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm dark:shadow-gray-900/30 border border-gray-100 dark:border-gray-700">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-base font-semibold text-gray-700 dark:text-gray-200">🧠 Learning Engine</h3>
        <button onClick={() => navigate('/alerts')} className="text-xs text-sky-600 hover:underline cursor-pointer">
          Alerts{alertCount > 0 ? ` (${alertCount})` : ''} →
        </button>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="text-center p-3 rounded-xl bg-indigo-50 dark:bg-indigo-900/20">
          <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
            {leDashboard.avgMAPE != null ? `${(100 - leDashboard.avgMAPE).toFixed(0)}%` : '—'}
          </p>
          <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">Prediction Accuracy</p>
        </div>
        <div className="text-center p-3 rounded-xl bg-green-50 dark:bg-green-900/20">
          <p className="text-2xl font-bold text-green-600 dark:text-green-400">
            {leDashboard.activeCustomers ?? '—'}
          </p>
          <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">Active Customers</p>
        </div>
        <div className="text-center p-3 rounded-xl bg-amber-50 dark:bg-amber-900/20">
          <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">
            {leDashboard.avgConfidence != null ? `${Math.round(leDashboard.avgConfidence)}%` : '—'}
          </p>
          <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">Avg Confidence</p>
        </div>
        <div className="text-center p-3 rounded-xl bg-red-50 dark:bg-red-900/20">
          <p className={`text-2xl font-bold ${alertCount > 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-400 dark:text-gray-500'}`}>
            {alertCount}
          </p>
          <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">Pending Alerts</p>
        </div>
      </div>
      {leDashboard.topCrops?.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {leDashboard.topCrops.slice(0, 5).map((c, i) => (
            <span key={i} className="text-[10px] px-2 py-1 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
              {c.crop} <strong>~{Math.round(c.ewma)}</strong>
              <span className={`ml-1 ${c.trend === 'increasing' ? 'text-green-600' : c.trend === 'decreasing' ? 'text-red-500' : 'text-gray-400'}`}>
                {c.trend === 'increasing' ? '↑' : c.trend === 'decreasing' ? '↓' : '→'}
              </span>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
