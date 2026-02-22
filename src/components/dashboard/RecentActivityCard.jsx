import { useNavigate } from 'react-router-dom';
import { ACTIVITY_TYPES } from '../../services/activityService';

const TYPE_ICON = Object.fromEntries(ACTIVITY_TYPES.map(t => [t.id, t.icon]));

export default function RecentActivityCard({ activities = [] }) {
  const navigate = useNavigate();
  const recent = activities.slice(0, 5);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm dark:shadow-gray-900/30 border border-gray-100 dark:border-gray-700">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-base font-semibold text-gray-700 dark:text-gray-200">Recent Activity</h3>
        <button onClick={() => navigate('/activity')} className="text-xs text-sky-600 hover:underline cursor-pointer">View all →</button>
      </div>
      {recent.length === 0 ? (
        <div className="text-gray-400 dark:text-gray-500 text-sm py-4 text-center">No activity yet — get building!</div>
      ) : (
        <div className="space-y-2">
          {recent.map(a => (
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
  );
}
