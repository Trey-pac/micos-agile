import { useNavigate } from 'react-router-dom';

const PRIO_DOT = { high: '🔴', medium: '🟡', low: '⚪' };

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

export default function MyTasksCard({ myTasks = [], ownerKey }) {
  const navigate = useNavigate();

  return (
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
  );
}
